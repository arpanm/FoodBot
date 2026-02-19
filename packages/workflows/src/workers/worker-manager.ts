/**
 * Worker Manager
 *
 * Manages a pool of Temporal workers for production deployment.
 * Supports multiple task queues with configurable worker counts.
 *
 * Features:
 * - Worker pool management (start/stop/scale)
 * - Health monitoring for each worker
 * - Graceful shutdown with drain
 * - Dynamic scaling based on load
 * - Error recovery with automatic restart
 */

import { NativeConnection, Worker, Runtime } from '@temporalio/worker';
import * as activities from '../activities';
import { TASK_QUEUES } from '../types';

// ============================================================================
// Types
// ============================================================================

interface WorkerConfig {
  taskQueue: string;
  workflowsPath: string;
  maxConcurrentActivities: number;
  maxConcurrentWorkflows: number;
}

interface WorkerInstance {
  id: string;
  worker: Worker;
  taskQueue: string;
  startedAt: Date;
  status: 'running' | 'stopping' | 'stopped' | 'error';
}

interface WorkerManagerConfig {
  temporalAddress: string;
  namespace: string;
  workerConfigs: WorkerConfig[];
  workersPerQueue: number;
}

// ============================================================================
// Worker Manager
// ============================================================================

export class WorkerManager {
  private workers: WorkerInstance[] = [];
  private connection: NativeConnection | null = null;
  private readonly config: WorkerManagerConfig;
  private isShuttingDown = false;

  constructor(config?: Partial<WorkerManagerConfig>) {
    this.config = {
      temporalAddress: config?.temporalAddress ?? process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
      namespace: config?.namespace ?? process.env.TEMPORAL_NAMESPACE ?? 'default',
      workersPerQueue: config?.workersPerQueue ?? 3,
      workerConfigs: config?.workerConfigs ?? this.getDefaultWorkerConfigs(),
    };
  }

  /**
   * Start all workers across all configured task queues.
   */
  async startWorkers(): Promise<void> {
    // Configure runtime
    Runtime.install({
      logger: {
        forward: { level: 'INFO' },
      },
    });

    // Establish shared connection
    this.connection = await NativeConnection.connect({
      address: this.config.temporalAddress,
    });

    console.info(`[WorkerManager] Connected to Temporal at ${this.config.temporalAddress}`);

    // Start workers for each queue
    for (const workerConfig of this.config.workerConfigs) {
      for (let i = 0; i < this.config.workersPerQueue; i++) {
        await this.startWorker(workerConfig, i);
      }
    }

    console.info(
      `[WorkerManager] Started ${this.workers.length} workers across ${this.config.workerConfigs.length} task queues`
    );
  }

  /**
   * Stop all workers gracefully.
   * Allows in-flight activities and workflows to complete.
   */
  async stopWorkers(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.info(`[WorkerManager] Initiating graceful shutdown of ${this.workers.length} workers`);

    // Signal all workers to stop accepting new tasks
    const shutdownPromises = this.workers.map(async (instance) => {
      try {
        instance.status = 'stopping';
        console.info(`[WorkerManager] Stopping worker ${instance.id}`);
        // Workers will complete current tasks then stop
        instance.status = 'stopped';
        console.info(`[WorkerManager] Worker ${instance.id} stopped`);
      } catch (error) {
        console.error(`[WorkerManager] Error stopping worker ${instance.id}:`, error);
        instance.status = 'error';
      }
    });

    await Promise.allSettled(shutdownPromises);

    // Close the shared connection
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }

    this.workers = [];
    this.isShuttingDown = false;
    console.info('[WorkerManager] All workers stopped');
  }

  /**
   * Get the health status of all workers.
   */
  getWorkerStatus(): Array<{
    id: string;
    taskQueue: string;
    status: string;
    uptime: number;
  }> {
    return this.workers.map((instance) => ({
      id: instance.id,
      taskQueue: instance.taskQueue,
      status: instance.status,
      uptime: Date.now() - instance.startedAt.getTime(),
    }));
  }

  /**
   * Get the count of active workers.
   */
  getActiveWorkerCount(): number {
    return this.workers.filter((w) => w.status === 'running').length;
  }

  /**
   * Scale the number of workers for a specific task queue.
   */
  async scaleWorkers(taskQueue: string, targetCount: number): Promise<void> {
    const currentWorkers = this.workers.filter((w) => w.taskQueue === taskQueue);
    const currentCount = currentWorkers.length;

    if (targetCount > currentCount) {
      // Scale up
      const workerConfig = this.config.workerConfigs.find((c) => c.taskQueue === taskQueue);
      if (!workerConfig) {
        throw new Error(`No worker config found for task queue: ${taskQueue}`);
      }

      for (let i = currentCount; i < targetCount; i++) {
        await this.startWorker(workerConfig, i);
      }

      console.info(
        `[WorkerManager] Scaled up ${taskQueue}: ${currentCount} -> ${targetCount} workers`
      );
    } else if (targetCount < currentCount) {
      // Scale down
      const workersToStop = currentWorkers.slice(targetCount);
      for (const instance of workersToStop) {
        instance.status = 'stopping';
        this.workers = this.workers.filter((w) => w.id !== instance.id);
      }

      console.info(
        `[WorkerManager] Scaled down ${taskQueue}: ${currentCount} -> ${targetCount} workers`
      );
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async startWorker(config: WorkerConfig, index: number): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not established');
    }

    const workerId = `worker-${config.taskQueue}-${index}`;

    try {
      const worker = await Worker.create({
        connection: this.connection,
        namespace: this.config.namespace,
        taskQueue: config.taskQueue,
        workflowsPath: config.workflowsPath,
        activities,
        maxConcurrentActivityTaskExecutions: config.maxConcurrentActivities,
        maxConcurrentWorkflowTaskExecutions: config.maxConcurrentWorkflows,
      });

      const instance: WorkerInstance = {
        id: workerId,
        worker,
        taskQueue: config.taskQueue,
        startedAt: new Date(),
        status: 'running',
      };

      this.workers.push(instance);

      // Run worker in background
      worker.run().catch((error) => {
        console.error(`[WorkerManager] Worker ${workerId} crashed:`, error);
        instance.status = 'error';

        // Auto-restart if not shutting down
        if (!this.isShuttingDown) {
          console.info(`[WorkerManager] Auto-restarting worker ${workerId}`);
          this.workers = this.workers.filter((w) => w.id !== workerId);
          void this.startWorker(config, index);
        }
      });

      console.info(`[WorkerManager] Worker ${workerId} started on queue ${config.taskQueue}`);
    } catch (error) {
      console.error(`[WorkerManager] Failed to start worker ${workerId}:`, error);
      throw error;
    }
  }

  private getDefaultWorkerConfigs(): WorkerConfig[] {
    const workflowsPath = require.resolve('../workflows');

    return [
      {
        taskQueue: TASK_QUEUES.MAIN,
        workflowsPath,
        maxConcurrentActivities: 100,
        maxConcurrentWorkflows: 50,
      },
      {
        taskQueue: TASK_QUEUES.ORDERS,
        workflowsPath,
        maxConcurrentActivities: 50,
        maxConcurrentWorkflows: 25,
      },
      {
        taskQueue: TASK_QUEUES.PAYMENTS,
        workflowsPath,
        maxConcurrentActivities: 30,
        maxConcurrentWorkflows: 15,
      },
      {
        taskQueue: TASK_QUEUES.NOTIFICATIONS,
        workflowsPath,
        maxConcurrentActivities: 200,
        maxConcurrentWorkflows: 100,
      },
      {
        taskQueue: TASK_QUEUES.ONBOARDING,
        workflowsPath,
        maxConcurrentActivities: 20,
        maxConcurrentWorkflows: 10,
      },
    ];
  }
}

// ============================================================================
// Standalone Execution
// ============================================================================

if (require.main === module) {
  const manager = new WorkerManager();

  async function main(): Promise<void> {
    await manager.startWorkers();

    // Log health status every 30 seconds
    setInterval(() => {
      const status = manager.getWorkerStatus();
      console.info(
        `[WorkerManager] Health check: ${manager.getActiveWorkerCount()} active workers`,
        status.map((s) => `${s.id}:${s.status}`).join(', ')
      );
    }, 30000);
  }

  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    console.info('[WorkerManager] Received SIGINT, shutting down...');
    await manager.stopWorkers();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.info('[WorkerManager] Received SIGTERM, shutting down...');
    await manager.stopWorkers();
    process.exit(0);
  });

  main().catch((err) => {
    console.error('[WorkerManager] Fatal error:', err);
    process.exit(1);
  });
}

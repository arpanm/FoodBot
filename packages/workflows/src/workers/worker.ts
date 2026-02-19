/**
 * Temporal Worker - Main Entry Point
 *
 * Starts a Temporal worker that processes workflows and activities
 * from the FoodBot task queues.
 *
 * Configuration via environment variables:
 * - TEMPORAL_ADDRESS: Temporal server address (default: localhost:7233)
 * - TEMPORAL_NAMESPACE: Temporal namespace (default: default)
 * - TEMPORAL_TASK_QUEUE: Task queue name (default: foodbot-main-queue)
 * - WORKER_MAX_CONCURRENT_ACTIVITIES: Max concurrent activities (default: 100)
 * - WORKER_MAX_CONCURRENT_WORKFLOWS: Max concurrent workflows (default: 50)
 */

import { NativeConnection, Worker, Runtime } from '@temporalio/worker';
import * as activities from '../activities';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? 'default';
const TEMPORAL_TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE ?? 'foodbot-main-queue';
const MAX_CONCURRENT_ACTIVITIES = parseInt(
  process.env.WORKER_MAX_CONCURRENT_ACTIVITIES ?? '100',
  10
);
const MAX_CONCURRENT_WORKFLOWS = parseInt(
  process.env.WORKER_MAX_CONCURRENT_WORKFLOWS ?? '50',
  10
);

/**
 * Create and run a single Temporal worker.
 */
async function run(): Promise<void> {
  // Configure runtime telemetry
  Runtime.install({
    logger: {
      forward: { level: 'INFO' },
    },
  });

  // Establish connection to Temporal server
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  try {
    // Create the worker
    const worker = await Worker.create({
      connection,
      namespace: TEMPORAL_NAMESPACE,
      taskQueue: TEMPORAL_TASK_QUEUE,
      workflowsPath: require.resolve('../workflows'),
      activities,
      maxConcurrentActivityTaskExecutions: MAX_CONCURRENT_ACTIVITIES,
      maxConcurrentWorkflowTaskExecutions: MAX_CONCURRENT_WORKFLOWS,
      enableSDKTracing: false,
    });

    console.info(`[Worker] Starting Temporal worker`);
    console.info(`[Worker] Address: ${TEMPORAL_ADDRESS}`);
    console.info(`[Worker] Namespace: ${TEMPORAL_NAMESPACE}`);
    console.info(`[Worker] Task Queue: ${TEMPORAL_TASK_QUEUE}`);
    console.info(`[Worker] Max Concurrent Activities: ${MAX_CONCURRENT_ACTIVITIES}`);
    console.info(`[Worker] Max Concurrent Workflows: ${MAX_CONCURRENT_WORKFLOWS}`);

    // Run the worker until shutdown
    await worker.run();
  } finally {
    await connection.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.info('[Worker] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info('[Worker] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

run().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});

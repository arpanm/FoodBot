/**
 * Job Poller - Continuously polls for pending jobs and executes them
 */

import { Job, JobStatus } from '../shared/types';
import { ApiClient } from './api-client';
import { JobExecutor } from './job-executor';

interface PollerConfig {
  pollingInterval?: number;
  batchSize?: number;
  maxConcurrentJobs?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class JobPoller {
  private pollingInterval: number;
  private batchSize: number;
  private maxConcurrentJobs: number;
  private retryAttempts: number;
  private retryDelay: number;

  private isPolling = false;
  private pollingTimer: number | null = null;
  private currentJobs: Set<string> = new Set();

  private apiClient: ApiClient;
  private jobExecutor: JobExecutor;

  constructor(apiClient: ApiClient, config: PollerConfig = {}) {
    this.apiClient = apiClient;
    this.jobExecutor = new JobExecutor(apiClient);

    this.pollingInterval = config.pollingInterval || 2000; // 2 seconds
    this.batchSize = config.batchSize || 10;
    this.maxConcurrentJobs = config.maxConcurrentJobs || 3;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 5000; // 5 seconds
  }

  /**
   * Start polling for jobs
   */
  start(): void {
    if (this.isPolling) {
      console.log('[JobPoller] Already polling');
      return;
    }

    console.log('[JobPoller] Starting job polling', {
      interval: this.pollingInterval,
      batchSize: this.batchSize,
      maxConcurrent: this.maxConcurrentJobs,
    });

    this.isPolling = true;
    this.poll();
  }

  /**
   * Stop polling for jobs
   */
  stop(): void {
    if (!this.isPolling) {
      console.log('[JobPoller] Already stopped');
      return;
    }

    console.log('[JobPoller] Stopping job polling');
    this.isPolling = false;

    if (this.pollingTimer !== null) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Main polling loop
   */
  private async poll(): Promise<void> {
    if (!this.isPolling) {
      return;
    }

    try {
      // Check API health first
      const isHealthy = await this.apiClient.healthCheck();
      if (!isHealthy) {
        console.warn('[JobPoller] API unhealthy, skipping poll cycle');
        this.scheduleNextPoll();
        return;
      }

      // Check if we can accept more jobs
      const availableSlots = this.maxConcurrentJobs - this.currentJobs.size;
      if (availableSlots <= 0) {
        console.log('[JobPoller] Max concurrent jobs reached, waiting...');
        this.scheduleNextPoll();
        return;
      }

      // Fetch pending jobs
      const jobs = await this.apiClient.getPendingJobs(
        Math.min(availableSlots, this.batchSize)
      );

      if (jobs.length > 0) {
        console.log(`[JobPoller] Found ${jobs.length} pending jobs`);
        await this.processJobs(jobs);
      }
    } catch (error) {
      console.error('[JobPoller] Error during poll cycle:', error);
    } finally {
      this.scheduleNextPoll();
    }
  }

  /**
   * Schedule next poll cycle
   */
  private scheduleNextPoll(): void {
    if (this.isPolling) {
      this.pollingTimer = window.setTimeout(() => {
        this.poll();
      }, this.pollingInterval);
    }
  }

  /**
   * Process multiple jobs concurrently
   */
  private async processJobs(jobs: Job[]): Promise<void> {
    const promises = jobs.map((job) => this.processJob(job));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    // Check if job is already being processed
    if (this.currentJobs.has(job.id)) {
      console.log(`[JobPoller] Job ${job.id} already in progress, skipping`);
      return;
    }

    // Add to current jobs
    this.currentJobs.add(job.id);

    try {
      console.log(`[JobPoller] Processing job ${job.id}`, {
        action: job.action,
        platform: job.platform,
      });

      // Execute the job with retry logic
      await this.executeWithRetry(job);

      console.log(`[JobPoller] Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`[JobPoller] Job ${job.id} failed after retries:`, error);

      // Report final failure
      await this.apiClient.reportJobFailure(job.id, {
        code: 'MAX_RETRIES_EXCEEDED',
        message:
          error instanceof Error ? error.message : 'Job execution failed',
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          retryAttempts: this.retryAttempts,
        },
      });
    } finally {
      // Remove from current jobs
      this.currentJobs.delete(job.id);
    }
  }

  /**
   * Execute job with retry logic
   */
  private async executeWithRetry(job: Job): Promise<void> {
    let lastError: Error | null = null;
    const maxRetries = job.maxRetries || this.retryAttempts;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(
            `[JobPoller] Retrying job ${job.id} (attempt ${attempt}/${maxRetries})`
          );

          // Update status to retrying
          await this.apiClient.updateJobStatus(job.id, {
            status: JobStatus.RETRYING,
            currentStep: `Retry attempt ${attempt}`,
          });

          // Wait before retry
          await this.delay(this.retryDelay * attempt);
        }

        // Execute the job
        await this.jobExecutor.executeJob(job);

        // Success - exit retry loop
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `[JobPoller] Job ${job.id} attempt ${attempt} failed:`,
          lastError.message
        );

        // Don't retry on certain errors
        if (this.isNonRetriableError(lastError)) {
          console.log(
            `[JobPoller] Non-retriable error for job ${job.id}, stopping retries`
          );
          throw lastError;
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Job execution failed');
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetriableError(error: Error): boolean {
    const nonRetriableMessages = [
      'INVALID_PAYLOAD',
      'INVALID_ACTION',
      'AUTHENTICATION_FAILED',
      'PERMISSION_DENIED',
    ];

    return nonRetriableMessages.some((msg) =>
      error.message.toUpperCase().includes(msg)
    );
  }

  /**
   * Helper to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current poller status
   */
  getStatus(): {
    isPolling: boolean;
    currentJobs: number;
    maxConcurrentJobs: number;
  } {
    return {
      isPolling: this.isPolling,
      currentJobs: this.currentJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
    };
  }

  /**
   * Update polling configuration
   */
  updateConfig(config: Partial<PollerConfig>): void {
    if (config.pollingInterval !== undefined) {
      this.pollingInterval = config.pollingInterval;
    }
    if (config.batchSize !== undefined) {
      this.batchSize = config.batchSize;
    }
    if (config.maxConcurrentJobs !== undefined) {
      this.maxConcurrentJobs = config.maxConcurrentJobs;
    }
    if (config.retryAttempts !== undefined) {
      this.retryAttempts = config.retryAttempts;
    }
    if (config.retryDelay !== undefined) {
      this.retryDelay = config.retryDelay;
    }

    console.log('[JobPoller] Configuration updated', {
      pollingInterval: this.pollingInterval,
      batchSize: this.batchSize,
      maxConcurrentJobs: this.maxConcurrentJobs,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
    });
  }

  /**
   * Force poll immediately
   */
  async pollNow(): Promise<void> {
    console.log('[JobPoller] Force polling now');
    await this.poll();
  }
}

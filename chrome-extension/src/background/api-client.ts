/**
 * API Client for communicating with the Gateway API
 */

import {
  Job,
  JobStatus,
  StatusUpdate,
  JobError,
  APIResponse,
} from '../shared/types';

interface RequestOptions extends RequestInit {
  timeout?: number;
}

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout = 10000; // 10 seconds

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get pending jobs from the gateway API
   */
  async getPendingJobs(limit = 10): Promise<Job[]> {
    try {
      const response = await this.request<Job[]>(
        `/api/jobs/pending?limit=${limit}`,
        {
          method: 'GET',
          timeout: 5000,
        }
      );

      return response.data || [];
    } catch (error) {
      this.logError('Failed to fetch pending jobs', error);
      return [];
    }
  }

  /**
   * Get details of a specific job
   */
  async getJobDetails(jobId: string): Promise<Job | null> {
    try {
      const response = await this.request<Job>(`/api/jobs/${jobId}`, {
        method: 'GET',
        timeout: 5000,
      });

      return response.data || null;
    } catch (error) {
      this.logError(`Failed to fetch job details for ${jobId}`, error);
      return null;
    }
  }

  /**
   * Update job status with progress information
   */
  async updateJobStatus(jobId: string, update: StatusUpdate): Promise<void> {
    try {
      await this.request<void>(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(update),
        timeout: 5000,
      });

      console.log(`[ApiClient] Job ${jobId} status updated to ${update.status}`);
    } catch (error) {
      this.logError(`Failed to update job status for ${jobId}`, error);
      throw error;
    }
  }

  /**
   * Save job execution data/results
   */
  async saveJobData(
    jobId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.request<void>(`/api/jobs/${jobId}/data`, {
        method: 'POST',
        body: JSON.stringify({ data }),
        timeout: 5000,
      });

      console.log(`[ApiClient] Job ${jobId} data saved successfully`);
    } catch (error) {
      this.logError(`Failed to save job data for ${jobId}`, error);
      throw error;
    }
  }

  /**
   * Report job failure with error details
   */
  async reportJobFailure(jobId: string, error: JobError): Promise<void> {
    try {
      await this.updateJobStatus(jobId, {
        status: JobStatus.FAILED,
        error,
      });
    } catch (err) {
      this.logError(`Failed to report job failure for ${jobId}`, err);
    }
  }

  /**
   * Mark job as completed with optional result data
   */
  async completeJob(
    jobId: string,
    result?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.updateJobStatus(jobId, {
        status: JobStatus.COMPLETED,
        progress: 100,
        result,
      });
    } catch (error) {
      this.logError(`Failed to complete job ${jobId}`, error);
      throw error;
    }
  }

  /**
   * Generic request method with timeout and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const { timeout = this.defaultTimeout, ...fetchOptions } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(fetchOptions.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      const data = await response.json();

      return {
        success: true,
        data: data as T,
        timestamp: Date.now(),
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Log errors with context
   */
  private logError(message: string, error: unknown): void {
    console.error(`[ApiClient] ${message}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Health check for API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('/api/health', {
        method: 'GET',
        timeout: 3000,
      });

      return response.success && response.data?.status === 'ok';
    } catch (error) {
      this.logError('Health check failed', error);
      return false;
    }
  }

  /**
   * Update base URL (for configuration changes)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
    console.log(`[ApiClient] Base URL updated to ${url}`);
  }
}

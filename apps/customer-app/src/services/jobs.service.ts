/**
 * Jobs Service
 * API client for job-related operations
 */

import type { Job } from '../types/job.types';

import { apiClient } from './api/axios.config';

class JobsService {
  /**
   * Get job status by ID
   * @param jobId - Job ID to fetch
   * @returns Job status and details
   */
  async getJobStatus<TResult = unknown, TMetadata = unknown>(
    jobId: string
  ): Promise<Job<TResult, TMetadata>> {
    return apiClient.get<Job<TResult, TMetadata>>(`/jobs/${jobId}`);
  }

  /**
   * Cancel a job
   * @param jobId - Job ID to cancel
   * @returns Cancelled job
   */
  async cancelJob(jobId: string): Promise<Job> {
    return apiClient.post<Job>(`/jobs/${jobId}/cancel`);
  }

  /**
   * Get job history for current user
   * @param limit - Number of jobs to fetch
   * @returns Array of jobs
   */
  async getJobHistory(limit = 10): Promise<Job[]> {
    return apiClient.get<Job[]>('/jobs/history', {
      params: { limit },
    });
  }

  /**
   * Retry a failed job
   * @param jobId - Job ID to retry
   * @returns New job created for retry
   */
  async retryJob(jobId: string): Promise<Job> {
    return apiClient.post<Job>(`/jobs/${jobId}/retry`);
  }
}

export const jobsService = new JobsService();

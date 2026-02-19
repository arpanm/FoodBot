/**
 * useJobPoller Hook
 * Enhanced hook for polling job status with progress tracking
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { jobsService } from '../services/jobs.service';
import type {
  Job,
  JobError,
  JobPollingOptions,
  JobPollingState,
} from '../types/job.types';
import { isJobTerminal } from '../types/job.types';

const DEFAULT_POLLING_INTERVAL = 2000; // 2 seconds
const DEFAULT_MAX_ATTEMPTS = 150; // 5 minutes at 2s interval

/**
 * Hook for polling job status with automatic stop on completion
 * @param jobId - Job ID to poll (null to disable polling)
 * @param options - Polling configuration options
 * @returns Job polling state and control functions
 */
export function useJobPoller<TResult = unknown, TMetadata = unknown>(
  jobId: string | null,
  options: JobPollingOptions = {}
): JobPollingState & {
  retry: () => void;
  cancel: () => void;
  reset: () => void;
} {
  const {
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    enabled = true,
    onComplete,
    onError,
    onProgress,
  } = options;

  const [state, setState] = useState<JobPollingState>({
    job: null,
    isLoading: false,
    isPolling: false,
    error: null,
    attempts: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  /**
   * Clear polling interval
   */
  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({ ...prev, isPolling: false }));
  }, []);

  /**
   * Fetch job status
   */
  const fetchJobStatus = useCallback(async () => {
    if (!jobId || !isMountedRef.current) return;

    try {
      attemptsRef.current += 1;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        attempts: attemptsRef.current,
      }));

      const job = await jobsService.getJobStatus<TResult, TMetadata>(jobId);

      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        job,
        isLoading: false,
        error: null,
      }));

      // Notify progress
      if (onProgress && job.progress !== undefined) {
        onProgress(job.progress);
      }

      // Check if job is terminal
      if (isJobTerminal(job)) {
        clearPolling();

        if (job.status === 'completed') {
          onComplete?.(job);
        } else if (job.status === 'failed' && job.error) {
          setState((prev) => ({ ...prev, error: job.error ?? null }));
          onError?.(job.error);
        }
      }

      // Check max attempts
      if (attemptsRef.current >= maxAttempts) {
        clearPolling();
        const timeoutError: JobError = {
          code: 'JOB_TIMEOUT',
          message: 'Job polling exceeded maximum attempts',
          userMessage: 'This is taking longer than expected. Please try again later.',
          recoverable: true,
        };
        setState((prev) => ({ ...prev, error: timeoutError }));
        onError?.(timeoutError);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error: JobError = {
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch job status',
        userMessage: 'Unable to check job status. Please try again.',
        recoverable: true,
      };

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error,
      }));

      onError?.(error);
      clearPolling();
    }
  }, [jobId, maxAttempts, onComplete, onError, onProgress, clearPolling]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (!jobId || !enabled) return;

    setState((prev) => ({ ...prev, isPolling: true }));

    // Immediate fetch
    fetchJobStatus();

    // Set up interval for subsequent fetches
    intervalRef.current = setInterval(fetchJobStatus, pollingInterval);
  }, [jobId, enabled, pollingInterval, fetchJobStatus]);

  /**
   * Retry polling (reset attempts and start fresh)
   */
  const retry = useCallback(() => {
    attemptsRef.current = 0;
    setState((prev) => ({
      ...prev,
      error: null,
      attempts: 0,
    }));
    clearPolling();
    startPolling();
  }, [clearPolling, startPolling]);

  /**
   * Cancel job
   */
  const cancel = useCallback(async () => {
    if (!jobId) return;

    try {
      await jobsService.cancelJob(jobId);
      clearPolling();
      setState((prev) => ({
        ...prev,
        job: prev.job ? { ...prev.job, status: 'cancelled' } : null,
      }));
    } catch (err) {
      const error: JobError = {
        code: 'CANCEL_ERROR',
        message: err instanceof Error ? err.message : 'Failed to cancel job',
        userMessage: 'Unable to cancel the operation. Please try again.',
        recoverable: true,
      };
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
    }
  }, [jobId, clearPolling, onError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    clearPolling();
    attemptsRef.current = 0;
    setState({
      job: null,
      isLoading: false,
      isPolling: false,
      error: null,
      attempts: 0,
    });
  }, [clearPolling]);

  // Effect: Start/stop polling based on jobId and enabled
  useEffect(() => {
    isMountedRef.current = true;

    if (jobId && enabled) {
      startPolling();
    } else {
      clearPolling();
    }

    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, [jobId, enabled, startPolling, clearPolling]);

  return {
    ...state,
    retry,
    cancel,
    reset,
  };
}

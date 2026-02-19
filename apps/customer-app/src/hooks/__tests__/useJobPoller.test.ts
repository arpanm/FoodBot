/**
 * useJobPoller Hook Tests
 */

import { renderHook, waitFor } from '@testing-library/react';

import { jobsService } from '../../services/jobs.service';
import type { Job } from '../../types/job.types';

import { useJobPoller } from '../useJobPoller';

jest.mock('../../services/jobs.service');

const mockJobsService = jobsService as jest.Mocked<typeof jobsService>;

describe('useJobPoller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useJobPoller(null));

    expect(result.current.job).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.attempts).toBe(0);
  });

  it('should not poll when jobId is null', () => {
    renderHook(() => useJobPoller(null));

    jest.advanceTimersByTime(5000);

    expect(mockJobsService.getJobStatus).not.toHaveBeenCalled();
  });

  it('should not poll when enabled is false', () => {
    renderHook(() => useJobPoller('job-123', { enabled: false }));

    jest.advanceTimersByTime(5000);

    expect(mockJobsService.getJobStatus).not.toHaveBeenCalled();
  });

  it('should start polling when jobId is provided', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'in_progress',
      actionType: 'PLACE_ORDER',
      progress: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockJobsService.getJobStatus.mockResolvedValue(mockJob);

    const { result } = renderHook(() => useJobPoller('job-123'));

    expect(result.current.isPolling).toBe(true);

    await waitFor(() => {
      expect(result.current.job).toEqual(mockJob);
    });

    expect(mockJobsService.getJobStatus).toHaveBeenCalledWith('job-123');
  });

  it('should stop polling when job is completed', async () => {
    const mockCompletedJob: Job = {
      id: 'job-123',
      status: 'completed',
      actionType: 'PLACE_ORDER',
      progress: 100,
      result: { orderId: 'order-123' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
    };

    mockJobsService.getJobStatus.mockResolvedValue(mockCompletedJob);

    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useJobPoller('job-123', { onComplete })
    );

    await waitFor(() => {
      expect(result.current.job?.status).toBe('completed');
    });

    expect(result.current.isPolling).toBe(false);
    expect(onComplete).toHaveBeenCalledWith(mockCompletedJob);
  });

  it('should stop polling when job fails', async () => {
    const mockFailedJob: Job = {
      id: 'job-123',
      status: 'failed',
      actionType: 'PLACE_ORDER',
      progress: 75,
      error: {
        code: 'PAYMENT_FAILED',
        message: 'Payment processing failed',
        userMessage: 'Unable to process payment',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockJobsService.getJobStatus.mockResolvedValue(mockFailedJob);

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useJobPoller('job-123', { onError })
    );

    await waitFor(() => {
      expect(result.current.job?.status).toBe('failed');
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toEqual(mockFailedJob.error);
    expect(onError).toHaveBeenCalledWith(mockFailedJob.error);
  });

  it('should call onProgress callback when progress updates', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'in_progress',
      actionType: 'PLACE_ORDER',
      progress: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockJobsService.getJobStatus.mockResolvedValue(mockJob);

    const onProgress = jest.fn();
    renderHook(() => useJobPoller('job-123', { onProgress }));

    await waitFor(() => {
      expect(onProgress).toHaveBeenCalledWith(50);
    });
  });

  it('should poll at specified interval', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'in_progress',
      actionType: 'PLACE_ORDER',
      progress: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockJobsService.getJobStatus.mockResolvedValue(mockJob);

    renderHook(() =>
      useJobPoller('job-123', { pollingInterval: 1000 })
    );

    await waitFor(() => {
      expect(mockJobsService.getJobStatus).toHaveBeenCalledTimes(1);
    });

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockJobsService.getJobStatus).toHaveBeenCalledTimes(2);
    });

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockJobsService.getJobStatus).toHaveBeenCalledTimes(3);
    });
  });

  it('should stop polling after max attempts', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'in_progress',
      actionType: 'PLACE_ORDER',
      progress: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockJobsService.getJobStatus.mockResolvedValue(mockJob);

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useJobPoller('job-123', { maxAttempts: 3, onError })
    );

    // Wait for 3 attempts
    await waitFor(() => {
      expect(mockJobsService.getJobStatus).toHaveBeenCalledTimes(1);
    });

    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(mockJobsService.getJobStatus).toHaveBeenCalledTimes(2);
    });

    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(mockJobsService.getJobStatus).toHaveBeenCalledTimes(3);
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.error?.code).toBe('JOB_TIMEOUT');
    expect(onError).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockJobsService.getJobStatus.mockRejectedValue(
      new Error('Network error')
    );

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useJobPoller('job-123', { onError })
    );

    await waitFor(() => {
      expect(result.current.error?.code).toBe('FETCH_ERROR');
    });

    expect(result.current.isPolling).toBe(false);
    expect(onError).toHaveBeenCalled();
  });

  it('should retry polling when retry is called', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'in_progress',
      actionType: 'PLACE_ORDER',
      progress: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockJobsService.getJobStatus
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(mockJob);

    const { result } = renderHook(() => useJobPoller('job-123'));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.attempts).toBe(1);

    // Retry
    result.current.retry();

    await waitFor(() => {
      expect(result.current.job).toEqual(mockJob);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.attempts).toBe(1); // Reset
  });

  it('should cancel job when cancel is called', async () => {
    mockJobsService.cancelJob.mockResolvedValue({
      id: 'job-123',
      status: 'cancelled',
      actionType: 'PLACE_ORDER',
      progress: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useJobPoller('job-123'));

    await result.current.cancel();

    expect(mockJobsService.cancelJob).toHaveBeenCalledWith('job-123');
    expect(result.current.job?.status).toBe('cancelled');
    expect(result.current.isPolling).toBe(false);
  });

  it('should reset state when reset is called', () => {
    const { result } = renderHook(() => useJobPoller('job-123'));

    result.current.reset();

    expect(result.current.job).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.attempts).toBe(0);
  });

  it('should cleanup on unmount', async () => {
    const mockJob: Job = {
      id: 'job-123',
      status: 'in_progress',
      actionType: 'PLACE_ORDER',
      progress: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockJobsService.getJobStatus.mockResolvedValue(mockJob);

    const { unmount } = renderHook(() => useJobPoller('job-123'));

    await waitFor(() => {
      expect(mockJobsService.getJobStatus).toHaveBeenCalled();
    });

    const callCount = mockJobsService.getJobStatus.mock.calls.length;

    unmount();

    jest.advanceTimersByTime(5000);

    // Should not make more calls after unmount
    expect(mockJobsService.getJobStatus).toHaveBeenCalledTimes(callCount);
  });
});

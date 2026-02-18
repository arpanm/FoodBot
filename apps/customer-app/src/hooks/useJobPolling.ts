import { useEffect, useRef, useState } from 'react';
import { chatService } from '../services/chat.service';
import { Message } from '../types/models';

export interface UseJobPollingOptions {
  interval?: number;
  maxAttempts?: number;
  onComplete?: (result: Message) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for polling job status
 * @param jobId - Job ID to poll
 * @param options - Polling options
 */
export function useJobPolling(
  jobId: string | null,
  options: UseJobPollingOptions = {}
) {
  const {
    interval = 2000,
    maxAttempts = 60,
    onComplete,
    onError,
  } = options;

  const [status, setStatus] = useState<string>('IDLE');
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<Message | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const attempts = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        attempts.current++;

        if (attempts.current > maxAttempts) {
          const timeoutError = new Error('Job polling timeout');
          setError(timeoutError);
          onError?.(timeoutError);
          return;
        }

        const response = await chatService.getJobStatus(jobId);
        setStatus(response.status);
        setProgress(response.progress || 0);

        if (response.status === 'COMPLETED') {
          setResult(response.result);
          onComplete?.(response.result);
        } else if (response.status === 'FAILED') {
          const jobError = new Error(response.error || 'Job failed');
          setError(jobError);
          onError?.(jobError);
        } else {
          timeoutRef.current = setTimeout(poll, interval);
        }
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    };

    poll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [jobId, interval, maxAttempts, onComplete, onError]);

  return {
    status,
    progress,
    result,
    error,
    isPolling: status === 'PROCESSING' || status === 'QUEUED',
  };
}

/**
 * Types for the Dead Letter Queue (DLQ) module.
 *
 * Provides type definitions for managing failed events,
 * retry operations, and DLQ statistics.
 */

/** Status of a DLQ entry */
export type DLQEntryStatus = 'pending' | 'retrying' | 'retried' | 'discarded';

/** An entry in the Dead Letter Queue */
export interface DLQEntry {
  id: string;
  originalEvent: Record<string, unknown>;
  error: string;
  consumerGroup: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  lastRetryAt: Date | null;
  status: DLQEntryStatus;
}

/** Result of a retry operation */
export interface RetryResult {
  entryId: string;
  success: boolean;
  retryCount: number;
  error?: string;
}

/** Statistics about the DLQ */
export interface DLQStats {
  totalEntries: number;
  pendingEntries: number;
  retriedEntries: number;
  discardedEntries: number;
  retryingEntries: number;
  entriesByConsumerGroup: Record<string, number>;
}

/** Handler function for processing retried events */
export type RetryHandler = (event: Record<string, unknown>) => Promise<void>;

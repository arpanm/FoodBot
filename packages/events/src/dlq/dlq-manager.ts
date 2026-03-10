/**
 * Dead Letter Queue Manager for handling failed events.
 *
 * Provides in-memory DLQ storage with retry capabilities,
 * entry management, and statistics tracking.
 */

import {
  DLQEntry,
  DLQEntryStatus,
  DLQStats,
  RetryHandler,
  RetryResult,
} from './dlq.types';

/**
 * DLQManager manages failed events in an in-memory dead letter queue.
 * Supports retry, discard, and statistics operations.
 */
export class DLQManager {
  private readonly entries: Map<string, DLQEntry> = new Map();
  private entryIdCounter = 0;
  private retryHandler: RetryHandler | null = null;
  private readonly defaultMaxRetries: number;

  constructor(options?: DLQManagerOptions) {
    this.defaultMaxRetries = options?.maxRetries ?? 3;
  }

  /**
   * Set the handler to use when retrying events.
   */
  setRetryHandler(handler: RetryHandler): void {
    this.retryHandler = handler;
  }

  /**
   * Send a failed event to the DLQ.
   */
  sendToDlq(
    originalEvent: Record<string, unknown>,
    error: string,
    consumerGroup: string
  ): DLQEntry {
    this.entryIdCounter += 1;
    const id = `dlq-${this.entryIdCounter}`;

    const entry: DLQEntry = {
      id,
      originalEvent,
      error,
      consumerGroup,
      retryCount: 0,
      maxRetries: this.defaultMaxRetries,
      createdAt: new Date(),
      lastRetryAt: null,
      status: 'pending',
    };

    this.entries.set(id, entry);
    return entry;
  }

  /**
   * Get DLQ entries for a specific consumer group.
   */
  getDlqEntries(consumerGroup: string, limit?: number): DLQEntry[] {
    const groupEntries = Array.from(this.entries.values()).filter(
      (e) => e.consumerGroup === consumerGroup
    );

    if (limit !== undefined) {
      return groupEntries.slice(0, limit);
    }

    return groupEntries;
  }

  /**
   * Get a single DLQ entry by ID.
   */
  getEntry(entryId: string): DLQEntry | undefined {
    return this.entries.get(entryId);
  }

  /**
   * Retry processing a DLQ entry.
   */
  async retryEntry(entryId: string): Promise<RetryResult> {
    const entry = this.entries.get(entryId);

    if (!entry) {
      return {
        entryId,
        success: false,
        retryCount: 0,
        error: `DLQ entry not found: ${entryId}`,
      };
    }

    if (entry.status === 'discarded' || entry.status === 'retried') {
      return {
        entryId,
        success: false,
        retryCount: entry.retryCount,
        error: `Entry is already ${entry.status}`,
      };
    }

    if (entry.retryCount >= entry.maxRetries) {
      return {
        entryId,
        success: false,
        retryCount: entry.retryCount,
        error: `Max retries (${entry.maxRetries}) exceeded`,
      };
    }

    return this.executeRetry(entry);
  }

  /**
   * Discard a DLQ entry, marking it as permanently failed.
   */
  discardEntry(entryId: string): void {
    const entry = this.entries.get(entryId);
    if (entry) {
      entry.status = 'discarded';
    }
  }

  /**
   * Get statistics about the DLQ.
   */
  getDlqStats(): DLQStats {
    const allEntries = Array.from(this.entries.values());
    const entriesByConsumerGroup: Record<string, number> = {};

    for (const entry of allEntries) {
      const count = entriesByConsumerGroup[entry.consumerGroup] ?? 0;
      entriesByConsumerGroup[entry.consumerGroup] = count + 1;
    }

    return {
      totalEntries: allEntries.length,
      pendingEntries: this.countByStatus(allEntries, 'pending'),
      retriedEntries: this.countByStatus(allEntries, 'retried'),
      discardedEntries: this.countByStatus(allEntries, 'discarded'),
      retryingEntries: this.countByStatus(allEntries, 'retrying'),
      entriesByConsumerGroup,
    };
  }

  /**
   * Execute the retry for a DLQ entry.
   */
  private async executeRetry(entry: DLQEntry): Promise<RetryResult> {
    if (!this.retryHandler) {
      return {
        entryId: entry.id,
        success: false,
        retryCount: entry.retryCount,
        error: 'No retry handler configured',
      };
    }

    entry.status = 'retrying';
    entry.retryCount += 1;
    entry.lastRetryAt = new Date();

    try {
      await this.retryHandler(entry.originalEvent);
      entry.status = 'retried';
      return {
        entryId: entry.id,
        success: true,
        retryCount: entry.retryCount,
      };
    } catch (error) {
      entry.status = 'pending';
      entry.error = error instanceof Error ? error.message : String(error);
      return {
        entryId: entry.id,
        success: false,
        retryCount: entry.retryCount,
        error: entry.error,
      };
    }
  }

  /**
   * Count entries matching a specific status.
   */
  private countByStatus(
    entries: DLQEntry[],
    status: DLQEntryStatus
  ): number {
    return entries.filter((e) => e.status === status).length;
  }
}

/** Configuration options for DLQManager */
export interface DLQManagerOptions {
  maxRetries?: number;
}

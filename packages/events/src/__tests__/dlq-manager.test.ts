import { DLQManager } from '../dlq/dlq-manager';

describe('DLQManager', () => {
  let dlq: DLQManager;

  const sampleEvent = { orderId: 'order-1', type: 'OrderCreated' };

  beforeEach(() => {
    dlq = new DLQManager({ maxRetries: 3 });
  });

  describe('sendToDlq', () => {
    it('should create a DLQ entry', () => {
      const entry = dlq.sendToDlq(sampleEvent, 'Processing failed', 'order-processor');

      expect(entry.id).toBeDefined();
      expect(entry.originalEvent).toEqual(sampleEvent);
      expect(entry.error).toBe('Processing failed');
      expect(entry.consumerGroup).toBe('order-processor');
      expect(entry.retryCount).toBe(0);
      expect(entry.maxRetries).toBe(3);
      expect(entry.status).toBe('pending');
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.lastRetryAt).toBeNull();
    });

    it('should assign unique IDs to entries', () => {
      const e1 = dlq.sendToDlq(sampleEvent, 'Error 1', 'group-1');
      const e2 = dlq.sendToDlq(sampleEvent, 'Error 2', 'group-1');

      expect(e1.id).not.toBe(e2.id);
    });
  });

  describe('getDlqEntries', () => {
    it('should return entries for a specific consumer group', () => {
      dlq.sendToDlq(sampleEvent, 'Error 1', 'group-1');
      dlq.sendToDlq(sampleEvent, 'Error 2', 'group-2');
      dlq.sendToDlq(sampleEvent, 'Error 3', 'group-1');

      const entries = dlq.getDlqEntries('group-1');

      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.consumerGroup === 'group-1')).toBe(true);
    });

    it('should respect the limit parameter', () => {
      dlq.sendToDlq(sampleEvent, 'Error 1', 'group-1');
      dlq.sendToDlq(sampleEvent, 'Error 2', 'group-1');
      dlq.sendToDlq(sampleEvent, 'Error 3', 'group-1');

      const entries = dlq.getDlqEntries('group-1', 2);

      expect(entries).toHaveLength(2);
    });

    it('should return empty array for unknown group', () => {
      const entries = dlq.getDlqEntries('unknown-group');
      expect(entries).toEqual([]);
    });
  });

  describe('retryEntry', () => {
    it('should successfully retry when handler succeeds', async () => {
      dlq.setRetryHandler(async () => {
        // success
      });

      const entry = dlq.sendToDlq(sampleEvent, 'Error', 'group-1');
      const result = await dlq.retryEntry(entry.id);

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);

      const updated = dlq.getEntry(entry.id);
      expect(updated?.status).toBe('retried');
    });

    it('should increment retry count on failure', async () => {
      dlq.setRetryHandler(async () => {
        throw new Error('Still failing');
      });

      const entry = dlq.sendToDlq(sampleEvent, 'Error', 'group-1');
      const result = await dlq.retryEntry(entry.id);

      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(1);
      expect(result.error).toBe('Still failing');

      const updated = dlq.getEntry(entry.id);
      expect(updated?.status).toBe('pending');
    });

    it('should fail when entry not found', async () => {
      const result = await dlq.retryEntry('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail when no retry handler is set', async () => {
      const entry = dlq.sendToDlq(sampleEvent, 'Error', 'group-1');
      const result = await dlq.retryEntry(entry.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No retry handler');
    });

    it('should fail when max retries exceeded', async () => {
      const mgr = new DLQManager({ maxRetries: 1 });
      mgr.setRetryHandler(async () => {
        throw new Error('Failed');
      });

      const entry = mgr.sendToDlq(sampleEvent, 'Error', 'group-1');

      await mgr.retryEntry(entry.id);
      const result = await mgr.retryEntry(entry.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Max retries');
    });

    it('should fail when entry is discarded', async () => {
      dlq.setRetryHandler(async () => {
        // success
      });

      const entry = dlq.sendToDlq(sampleEvent, 'Error', 'group-1');
      dlq.discardEntry(entry.id);

      const result = await dlq.retryEntry(entry.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('discarded');
    });

    it('should fail when entry is already retried', async () => {
      dlq.setRetryHandler(async () => {
        // success
      });

      const entry = dlq.sendToDlq(sampleEvent, 'Error', 'group-1');
      await dlq.retryEntry(entry.id);

      const result = await dlq.retryEntry(entry.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('retried');
    });
  });

  describe('discardEntry', () => {
    it('should mark entry as discarded', () => {
      const entry = dlq.sendToDlq(sampleEvent, 'Error', 'group-1');
      dlq.discardEntry(entry.id);

      const updated = dlq.getEntry(entry.id);
      expect(updated?.status).toBe('discarded');
    });

    it('should handle discarding nonexistent entry gracefully', () => {
      expect(() => dlq.discardEntry('nonexistent')).not.toThrow();
    });
  });

  describe('getDlqStats', () => {
    it('should return correct statistics', () => {
      dlq.sendToDlq(sampleEvent, 'Error 1', 'group-1');
      dlq.sendToDlq(sampleEvent, 'Error 2', 'group-1');
      dlq.sendToDlq(sampleEvent, 'Error 3', 'group-2');

      const entry4 = dlq.sendToDlq(sampleEvent, 'Error 4', 'group-2');
      dlq.discardEntry(entry4.id);

      const stats = dlq.getDlqStats();

      expect(stats.totalEntries).toBe(4);
      expect(stats.pendingEntries).toBe(3);
      expect(stats.discardedEntries).toBe(1);
      expect(stats.retriedEntries).toBe(0);
      expect(stats.retryingEntries).toBe(0);
      expect(stats.entriesByConsumerGroup['group-1']).toBe(2);
      expect(stats.entriesByConsumerGroup['group-2']).toBe(2);
    });

    it('should return zeros when DLQ is empty', () => {
      const stats = dlq.getDlqStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.pendingEntries).toBe(0);
    });
  });
});

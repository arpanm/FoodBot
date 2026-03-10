import { EventReplayer } from '../replay/event-replayer';
import { StoredReplayEvent } from '../replay/replay.types';

describe('EventReplayer', () => {
  let replayer: EventReplayer;

  beforeEach(() => {
    replayer = new EventReplayer();
  });

  function addSampleEvents(): void {
    replayer.addEvent('order.events', 'OrderCreated', 'order-1', { total: 25 });
    replayer.addEvent('order.events', 'OrderConfirmed', 'order-1', {});
    replayer.addEvent('order.events', 'OrderCreated', 'order-2', { total: 30 });
    replayer.addEvent('payment.events', 'PaymentCompleted', 'pay-1', { amount: 25 });
    replayer.addEvent('order.events', 'OrderDelivered', 'order-1', {});
  }

  describe('addEvent', () => {
    it('should store events with incrementing offsets', () => {
      const e1 = replayer.addEvent('topic', 'Type1', 'entity-1', {});
      const e2 = replayer.addEvent('topic', 'Type2', 'entity-2', {});

      expect(e1.offset).toBe(0);
      expect(e2.offset).toBe(1);
      expect(replayer.getEventCount()).toBe(2);
    });
  });

  describe('replay', () => {
    it('should replay events within offset range for a topic', async () => {
      addSampleEvents();
      const replayed: StoredReplayEvent[] = [];

      const result = await replayer.replay(
        'order.events',
        0,
        2,
        async (event) => {
          replayed.push(event);
        }
      );

      expect(result.eventsReplayed).toBe(3);
      expect(result.topic).toBe('order.events');
      expect(replayed).toHaveLength(3);
    });

    it('should not replay events outside offset range', async () => {
      addSampleEvents();
      const replayed: StoredReplayEvent[] = [];

      await replayer.replay('order.events', 0, 0, async (event) => {
        replayed.push(event);
      });

      expect(replayed).toHaveLength(1);
      expect(replayed[0]?.eventType).toBe('OrderCreated');
    });

    it('should only replay events from the specified topic', async () => {
      addSampleEvents();
      const replayed: StoredReplayEvent[] = [];

      await replayer.replay('payment.events', 0, 100, async (event) => {
        replayed.push(event);
      });

      expect(replayed).toHaveLength(1);
      expect(replayed[0]?.eventType).toBe('PaymentCompleted');
    });

    it('should record errors without stopping replay', async () => {
      addSampleEvents();

      const result = await replayer.replay('order.events', 0, 4, async (event) => {
        if (event.eventType === 'OrderConfirmed') {
          throw new Error('Processing failed');
        }
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe('Processing failed');
      expect(result.eventsReplayed).toBe(3);
    });

    it('should respect maxEvents option', async () => {
      addSampleEvents();
      const replayed: StoredReplayEvent[] = [];

      const result = await replayer.replay(
        'order.events',
        0,
        100,
        async (event) => {
          replayed.push(event);
        },
        { maxEvents: 2 }
      );

      expect(replayed).toHaveLength(2);
      expect(result.eventsReplayed).toBe(2);
    });
  });

  describe('replayFromTimestamp', () => {
    it('should replay events from the given timestamp', async () => {
      const before = new Date();
      replayer.addEvent('order.events', 'OrderCreated', 'order-1', {});
      replayer.addEvent('order.events', 'OrderConfirmed', 'order-1', {});

      const replayed: StoredReplayEvent[] = [];
      const result = await replayer.replayFromTimestamp(
        'order.events',
        before,
        async (event) => {
          replayed.push(event);
        }
      );

      expect(result.eventsReplayed).toBe(2);
      expect(replayed).toHaveLength(2);
    });

    it('should return zero events for future timestamp', async () => {
      replayer.addEvent('order.events', 'OrderCreated', 'order-1', {});

      const future = new Date(Date.now() + 100000);
      const replayed: StoredReplayEvent[] = [];

      const result = await replayer.replayFromTimestamp(
        'order.events',
        future,
        async (event) => {
          replayed.push(event);
        }
      );

      expect(result.eventsReplayed).toBe(0);
    });
  });

  describe('selectiveReplay', () => {
    it('should filter by eventType', async () => {
      addSampleEvents();
      const replayed: StoredReplayEvent[] = [];

      const result = await replayer.selectiveReplay(
        'order.events',
        { eventType: 'OrderCreated' },
        async (event) => {
          replayed.push(event);
        }
      );

      expect(result.eventsReplayed).toBe(2);
      expect(replayed.every((e) => e.eventType === 'OrderCreated')).toBe(true);
    });

    it('should filter by entityId', async () => {
      addSampleEvents();
      const replayed: StoredReplayEvent[] = [];

      await replayer.selectiveReplay(
        'order.events',
        { entityId: 'order-1' },
        async (event) => {
          replayed.push(event);
        }
      );

      expect(replayed.every((e) => e.entityId === 'order-1')).toBe(true);
      expect(replayed.length).toBe(3);
    });

    it('should filter by date range', async () => {
      const before = new Date(Date.now() - 1);
      addSampleEvents();
      const after = new Date(Date.now() + 1);

      const replayed: StoredReplayEvent[] = [];

      await replayer.selectiveReplay(
        'order.events',
        { dateRange: { from: before, to: after } },
        async (event) => {
          replayed.push(event);
        }
      );

      expect(replayed.length).toBe(4);
    });

    it('should combine multiple filters', async () => {
      addSampleEvents();
      const replayed: StoredReplayEvent[] = [];

      await replayer.selectiveReplay(
        'order.events',
        { eventType: 'OrderCreated', entityId: 'order-2' },
        async (event) => {
          replayed.push(event);
        }
      );

      expect(replayed).toHaveLength(1);
      expect(replayed[0]?.entityId).toBe('order-2');
    });
  });
});

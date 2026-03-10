import { EventStore } from '../sourcing/event-store';
import { StoredEvent } from '../sourcing/sourcing.types';

describe('EventStore', () => {
  let store: EventStore;

  beforeEach(() => {
    store = new EventStore();
  });

  describe('append', () => {
    it('should store an event with incrementing version', () => {
      const e1 = store.append('agg-1', {
        eventType: 'OrderCreated',
        data: { orderId: 'order-1' },
      });

      const e2 = store.append('agg-1', {
        eventType: 'OrderConfirmed',
        data: { orderId: 'order-1' },
      });

      expect(e1.version).toBe(1);
      expect(e2.version).toBe(2);
      expect(e1.aggregateId).toBe('agg-1');
      expect(e1.timestamp).toBeInstanceOf(Date);
    });

    it('should maintain separate version sequences per aggregate', () => {
      store.append('agg-1', { eventType: 'E1', data: {} });
      store.append('agg-2', { eventType: 'E1', data: {} });
      store.append('agg-1', { eventType: 'E2', data: {} });

      const agg1Events = store.getEvents('agg-1');
      const agg2Events = store.getEvents('agg-2');

      expect(agg1Events).toHaveLength(2);
      expect(agg2Events).toHaveLength(1);
      expect(agg1Events[1]?.version).toBe(2);
      expect(agg2Events[0]?.version).toBe(1);
    });
  });

  describe('getEvents', () => {
    it('should return all events for an aggregate', () => {
      store.append('agg-1', { eventType: 'E1', data: { a: 1 } });
      store.append('agg-1', { eventType: 'E2', data: { b: 2 } });
      store.append('agg-1', { eventType: 'E3', data: { c: 3 } });

      const events = store.getEvents('agg-1');

      expect(events).toHaveLength(3);
      expect(events[0]?.eventType).toBe('E1');
      expect(events[2]?.eventType).toBe('E3');
    });

    it('should return events from a specific version', () => {
      store.append('agg-1', { eventType: 'E1', data: {} });
      store.append('agg-1', { eventType: 'E2', data: {} });
      store.append('agg-1', { eventType: 'E3', data: {} });

      const events = store.getEvents('agg-1', 2);

      expect(events).toHaveLength(2);
      expect(events[0]?.eventType).toBe('E2');
    });

    it('should return empty array for unknown aggregate', () => {
      const events = store.getEvents('nonexistent');
      expect(events).toEqual([]);
    });

    it('should return a copy to prevent mutation', () => {
      store.append('agg-1', { eventType: 'E1', data: {} });
      const events1 = store.getEvents('agg-1');
      const events2 = store.getEvents('agg-1');

      expect(events1).not.toBe(events2);
    });
  });

  describe('snapshots', () => {
    it('should return null when no snapshot exists', () => {
      expect(store.getSnapshot('agg-1')).toBeNull();
    });

    it('should create and retrieve a snapshot', () => {
      const state = { orderId: 'order-1', status: 'confirmed' };
      store.createSnapshot('agg-1', state, 5);

      const snapshot = store.getSnapshot('agg-1');

      expect(snapshot).not.toBeNull();
      expect(snapshot?.version).toBe(5);
      expect(snapshot?.state).toEqual(state);
      expect(snapshot?.createdAt).toBeInstanceOf(Date);
    });

    it('should overwrite previous snapshot', () => {
      store.createSnapshot('agg-1', { v: 1 }, 5);
      store.createSnapshot('agg-1', { v: 2 }, 10);

      const snapshot = store.getSnapshot('agg-1');

      expect(snapshot?.version).toBe(10);
      expect(snapshot?.state).toEqual({ v: 2 });
    });
  });

  describe('auto-snapshots', () => {
    it('should create snapshot every N events when builder is set', () => {
      const autoStore = new EventStore({ snapshotInterval: 3 });
      autoStore.setSnapshotStateBuilder((events: StoredEvent[]) => ({
        eventCount: events.length,
        lastEvent: events[events.length - 1]?.eventType,
      }));

      autoStore.append('agg-1', { eventType: 'E1', data: {} });
      autoStore.append('agg-1', { eventType: 'E2', data: {} });

      expect(autoStore.getSnapshot('agg-1')).toBeNull();

      autoStore.append('agg-1', { eventType: 'E3', data: {} });

      const snapshot = autoStore.getSnapshot('agg-1');
      expect(snapshot).not.toBeNull();
      expect(snapshot?.version).toBe(3);
      expect(snapshot?.state).toEqual({
        eventCount: 3,
        lastEvent: 'E3',
      });
    });

    it('should not create snapshot without builder', () => {
      const autoStore = new EventStore({ snapshotInterval: 2 });

      autoStore.append('agg-1', { eventType: 'E1', data: {} });
      autoStore.append('agg-1', { eventType: 'E2', data: {} });

      expect(autoStore.getSnapshot('agg-1')).toBeNull();
    });

    it('should create snapshot at default interval of 10', () => {
      store.setSnapshotStateBuilder((events: StoredEvent[]) => ({
        count: events.length,
      }));

      for (let i = 1; i <= 9; i++) {
        store.append('agg-1', { eventType: `E${i}`, data: {} });
      }
      expect(store.getSnapshot('agg-1')).toBeNull();

      store.append('agg-1', { eventType: 'E10', data: {} });
      expect(store.getSnapshot('agg-1')).not.toBeNull();
      expect(store.getSnapshot('agg-1')?.version).toBe(10);
    });
  });

  describe('getEventCount', () => {
    it('should return 0 for unknown aggregate', () => {
      expect(store.getEventCount('nonexistent')).toBe(0);
    });

    it('should return correct count', () => {
      store.append('agg-1', { eventType: 'E1', data: {} });
      store.append('agg-1', { eventType: 'E2', data: {} });

      expect(store.getEventCount('agg-1')).toBe(2);
    });
  });

  describe('getAggregateIds', () => {
    it('should return all aggregate IDs', () => {
      store.append('agg-1', { eventType: 'E1', data: {} });
      store.append('agg-2', { eventType: 'E1', data: {} });
      store.append('agg-3', { eventType: 'E1', data: {} });

      const ids = store.getAggregateIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain('agg-1');
      expect(ids).toContain('agg-2');
      expect(ids).toContain('agg-3');
    });
  });
});

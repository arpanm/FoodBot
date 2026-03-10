/**
 * In-memory Event Store for event sourcing.
 *
 * Provides append-only storage of events by aggregate ID,
 * with snapshot support and auto-snapshotting every N events.
 */

import { Snapshot, StoredEvent } from './sourcing.types';

/** Default number of events between automatic snapshots */
const AUTO_SNAPSHOT_INTERVAL = 10;

/**
 * EventStore provides in-memory event storage with snapshot support.
 * Auto-creates snapshots every 10 events per aggregate.
 */
export class EventStore {
  private readonly events: Map<string, StoredEvent[]> = new Map();
  private readonly snapshots: Map<string, Snapshot> = new Map();
  private readonly snapshotInterval: number;
  private snapshotStateBuilder:
    | ((events: StoredEvent[]) => Record<string, unknown>)
    | null = null;

  constructor(options?: EventStoreOptions) {
    this.snapshotInterval = options?.snapshotInterval ?? AUTO_SNAPSHOT_INTERVAL;
  }

  /**
   * Set the function used to build state for auto-snapshots.
   */
  setSnapshotStateBuilder(
    builder: (events: StoredEvent[]) => Record<string, unknown>
  ): void {
    this.snapshotStateBuilder = builder;
  }

  /**
   * Append an event to the store for a given aggregate.
   * Auto-creates a snapshot every N events.
   */
  append(
    aggregateId: string,
    event: { eventType: string; data: Record<string, unknown> }
  ): StoredEvent {
    const existing = this.events.get(aggregateId) ?? [];
    const version = existing.length + 1;

    const storedEvent: StoredEvent = {
      aggregateId,
      version,
      eventType: event.eventType,
      data: event.data,
      timestamp: new Date(),
    };

    const updated = [...existing, storedEvent];
    this.events.set(aggregateId, updated);

    this.maybeCreateAutoSnapshot(aggregateId, updated, version);

    return storedEvent;
  }

  /**
   * Get events for an aggregate, optionally starting from a version.
   */
  getEvents(aggregateId: string, fromVersion?: number): StoredEvent[] {
    const events = this.events.get(aggregateId) ?? [];

    if (fromVersion !== undefined) {
      return events.filter((e) => e.version >= fromVersion);
    }

    return [...events];
  }

  /**
   * Get the latest snapshot for an aggregate.
   */
  getSnapshot(aggregateId: string): Snapshot | null {
    return this.snapshots.get(aggregateId) ?? null;
  }

  /**
   * Manually create a snapshot for an aggregate.
   */
  createSnapshot(
    aggregateId: string,
    state: Record<string, unknown>,
    version: number
  ): Snapshot {
    const snapshot: Snapshot = {
      aggregateId,
      version,
      state,
      createdAt: new Date(),
    };

    this.snapshots.set(aggregateId, snapshot);
    return snapshot;
  }

  /**
   * Get the number of events stored for an aggregate.
   */
  getEventCount(aggregateId: string): number {
    const events = this.events.get(aggregateId);
    return events?.length ?? 0;
  }

  /**
   * Get all aggregate IDs in the store.
   */
  getAggregateIds(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Auto-create a snapshot if the event count hits the interval.
   */
  private maybeCreateAutoSnapshot(
    aggregateId: string,
    events: StoredEvent[],
    version: number
  ): void {
    if (version % this.snapshotInterval !== 0) {
      return;
    }

    if (!this.snapshotStateBuilder) {
      return;
    }

    const state = this.snapshotStateBuilder(events);
    this.createSnapshot(aggregateId, state, version);
  }
}

/** Configuration options for EventStore */
export interface EventStoreOptions {
  snapshotInterval?: number;
}

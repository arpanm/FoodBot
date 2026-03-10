/**
 * Event Replayer for replaying events from an in-memory store.
 *
 * Supports replaying by offset range, timestamp, and selective
 * filtering with throttling capabilities.
 */

import {
  ReplayError,
  ReplayFilter,
  ReplayHandler,
  ReplayOptions,
  ReplayResult,
  StoredReplayEvent,
} from './replay.types';

/**
 * EventReplayer replays events from an in-memory store.
 * Supports offset-based, timestamp-based, and selective replay.
 */
export class EventReplayer {
  private readonly events: StoredReplayEvent[] = [];
  private nextOffset = 0;

  /**
   * Store an event for later replay.
   */
  addEvent(
    topic: string,
    eventType: string,
    entityId: string,
    payload: Record<string, unknown>
  ): StoredReplayEvent {
    const event: StoredReplayEvent = {
      offset: this.nextOffset,
      topic,
      eventType,
      entityId,
      payload,
      timestamp: new Date(),
    };
    this.nextOffset += 1;
    this.events.push(event);
    return event;
  }

  /**
   * Replay events from a topic within an offset range.
   */
  async replay(
    topicName: string,
    fromOffset: number,
    toOffset: number,
    handler: ReplayHandler,
    options?: ReplayOptions
  ): Promise<ReplayResult> {
    const filtered = this.events.filter(
      (e) =>
        e.topic === topicName &&
        e.offset >= fromOffset &&
        e.offset <= toOffset
    );

    return this.processEvents(topicName, filtered, handler, options);
  }

  /**
   * Replay events from a topic starting from a timestamp.
   */
  async replayFromTimestamp(
    topicName: string,
    fromTimestamp: Date,
    handler: ReplayHandler,
    options?: ReplayOptions
  ): Promise<ReplayResult> {
    const filtered = this.events.filter(
      (e) =>
        e.topic === topicName &&
        e.timestamp >= fromTimestamp
    );

    return this.processEvents(topicName, filtered, handler, options);
  }

  /**
   * Replay events from a topic matching filter criteria.
   */
  async selectiveReplay(
    topicName: string,
    filter: ReplayFilter,
    handler: ReplayHandler,
    options?: ReplayOptions
  ): Promise<ReplayResult> {
    const filtered = this.events.filter(
      (e) => e.topic === topicName && this.matchesFilter(e, filter)
    );

    return this.processEvents(topicName, filtered, handler, options);
  }

  /**
   * Get the total number of stored events.
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Process a list of filtered events through the handler.
   */
  private async processEvents(
    topicName: string,
    events: StoredReplayEvent[],
    handler: ReplayHandler,
    options?: ReplayOptions
  ): Promise<ReplayResult> {
    const startedAt = new Date();
    const errors: ReplayError[] = [];
    const maxEvents = options?.maxEvents ?? events.length;
    const throttleMs = options?.throttleMs ?? 0;

    const eventsToProcess = events.slice(0, maxEvents);
    let processedCount = 0;

    for (const event of eventsToProcess) {
      try {
        await handler(event);
        processedCount += 1;
      } catch (error) {
        errors.push({
          offset: event.offset,
          error: error instanceof Error ? error.message : String(error),
          eventType: event.eventType,
        });
      }

      if (throttleMs > 0) {
        await this.delay(throttleMs);
      }
    }

    const firstEvent = eventsToProcess[0];
    const lastEvent = eventsToProcess[eventsToProcess.length - 1];

    return {
      topic: topicName,
      eventsReplayed: processedCount,
      startOffset: firstEvent?.offset ?? 0,
      endOffset: lastEvent?.offset ?? 0,
      startedAt,
      completedAt: new Date(),
      errors,
    };
  }

  /**
   * Check if an event matches the replay filter criteria.
   */
  private matchesFilter(
    event: StoredReplayEvent,
    filter: ReplayFilter
  ): boolean {
    if (filter.eventType && event.eventType !== filter.eventType) {
      return false;
    }

    if (filter.entityId && event.entityId !== filter.entityId) {
      return false;
    }

    if (filter.dateRange) {
      if (event.timestamp < filter.dateRange.from) {
        return false;
      }
      if (event.timestamp > filter.dateRange.to) {
        return false;
      }
    }

    return true;
  }

  /**
   * Delay execution for the specified milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

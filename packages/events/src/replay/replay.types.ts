/**
 * Types for the Event Replay module.
 *
 * Provides type definitions for replaying events from
 * an in-memory event store with filtering and throttling.
 */

/** A stored event in the replay store */
export interface StoredReplayEvent {
  offset: number;
  topic: string;
  eventType: string;
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

/** Options for controlling replay behavior */
export interface ReplayOptions {
  throttleMs?: number;
  maxEvents?: number;
}

/** Filter criteria for selective replay */
export interface ReplayFilter {
  eventType?: string;
  entityId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/** Result of a replay operation */
export interface ReplayResult {
  topic: string;
  eventsReplayed: number;
  startOffset: number;
  endOffset: number;
  startedAt: Date;
  completedAt: Date;
  errors: ReplayError[];
}

/** Error encountered during replay of a single event */
export interface ReplayError {
  offset: number;
  error: string;
  eventType: string;
}

/** Handler function for processing replayed events */
export type ReplayHandler = (event: StoredReplayEvent) => Promise<void>;

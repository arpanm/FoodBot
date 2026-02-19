import { Injectable, Logger } from '@nestjs/common';

import { KafkaService } from '../kafka.service';

/**
 * Event replay service for re-publishing historical events.
 *
 * Supports:
 * - Replaying events from a specific topic within a time range
 * - Replaying events for a specific entity (by partition key)
 * - Archiving events to external storage (S3 placeholder)
 */
@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);

  /** In-memory event archive for development / testing */
  private readonly eventArchive: Array<{
    topic: string;
    key: string;
    value: unknown;
    timestamp: string;
  }> = [];

  constructor(private readonly kafkaService: KafkaService) {}

  /**
   * Archive an event for later replay.
   * In production this would write to S3, GCS, or similar.
   */
  archiveEvent(topic: string, key: string, value: unknown): void {
    this.eventArchive.push({
      topic,
      key,
      value,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Replay events from the archive for a specific topic.
   */
  async replayByTopic(
    topic: string,
    options?: { fromTimestamp?: string; toTimestamp?: string },
  ): Promise<number> {
    let events = this.eventArchive.filter((e) => e.topic === topic);

    if (options?.fromTimestamp) {
      events = events.filter((e) => e.timestamp >= options.fromTimestamp!);
    }
    if (options?.toTimestamp) {
      events = events.filter((e) => e.timestamp <= options.toTimestamp!);
    }

    this.logger.info(`Replaying ${events.length} events from topic ${topic}`);

    for (const event of events) {
      await this.kafkaService.publish(
        event.topic,
        event.key,
        event.value,
        { 'x-replay': 'true', 'x-original-timestamp': event.timestamp },
      );
    }

    this.logger.info(`Replay complete for topic ${topic}: ${events.length} events`);
    return events.length;
  }

  /**
   * Replay events for a specific entity key across all topics.
   */
  async replayByKey(key: string): Promise<number> {
    const events = this.eventArchive.filter((e) => e.key === key);

    this.logger.info(`Replaying ${events.length} events for key ${key}`);

    for (const event of events) {
      await this.kafkaService.publish(
        event.topic,
        event.key,
        event.value,
        { 'x-replay': 'true', 'x-original-timestamp': event.timestamp },
      );
    }

    this.logger.info(`Replay complete for key ${key}: ${events.length} events`);
    return events.length;
  }

  /**
   * Get archive statistics.
   */
  getArchiveStats(): {
    totalEvents: number;
    topicCounts: Record<string, number>;
    oldestEvent: string | null;
    newestEvent: string | null;
  } {
    const topicCounts: Record<string, number> = {};
    for (const event of this.eventArchive) {
      topicCounts[event.topic] = (topicCounts[event.topic] || 0) + 1;
    }

    return {
      totalEvents: this.eventArchive.length,
      topicCounts,
      oldestEvent: this.eventArchive.length > 0 ? this.eventArchive[0]!.timestamp : null,
      newestEvent: this.eventArchive.length > 0
        ? this.eventArchive[this.eventArchive.length - 1]!.timestamp
        : null,
    };
  }

  /** Clear archive (for testing). */
  clearArchive(): void {
    this.eventArchive.length = 0;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { KafkaService } from '../kafka.service';

const DLQ_TOPIC = 'foodbot.dlq';

export interface DeadLetterMessage {
  id: string;
  originalTopic: string;
  originalKey: string;
  originalValue: unknown;
  error: string;
  errorStack?: string;
  retryCount: number;
  maxRetries: number;
  firstFailedAt: string;
  lastFailedAt: string;
  status: 'pending' | 'retrying' | 'exhausted' | 'resolved';
}

/**
 * Dead Letter Queue service for handling failed Kafka messages.
 *
 * Failed messages are sent to the `foodbot.dlq` topic with metadata
 * that includes the original topic, error details, and retry count.
 * An event replay mechanism allows re-processing of failed messages.
 */
@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private readonly maxRetries = 3;

  /** In-memory DLQ store for testing / development */
  private readonly dlqStore = new Map<string, DeadLetterMessage>();

  constructor(private readonly kafkaService: KafkaService) {}

  /**
   * Send a failed message to the Dead Letter Queue.
   */
  async sendToDlq(
    originalTopic: string,
    originalKey: string,
    originalValue: unknown,
    error: Error,
    retryCount = 0,
  ): Promise<string> {
    const dlqId = uuidv4();

    const dlqMessage: DeadLetterMessage = {
      id: dlqId,
      originalTopic,
      originalKey,
      originalValue,
      error: error.message,
      errorStack: error.stack,
      retryCount,
      maxRetries: this.maxRetries,
      firstFailedAt: new Date().toISOString(),
      lastFailedAt: new Date().toISOString(),
      status: retryCount >= this.maxRetries ? 'exhausted' : 'pending',
    };

    // Store locally for inspection
    this.dlqStore.set(dlqId, dlqMessage);

    // Publish to DLQ topic
    await this.kafkaService.publish(DLQ_TOPIC, dlqId, dlqMessage);

    this.logger.warn(
      `Message sent to DLQ: id=${dlqId} originalTopic=${originalTopic} retryCount=${retryCount}/${this.maxRetries}`,
    );

    return dlqId;
  }

  /**
   * Retry a specific failed message by re-publishing to its original topic.
   */
  async retryMessage(dlqId: string): Promise<boolean> {
    const message = this.dlqStore.get(dlqId);
    if (!message) {
      this.logger.warn(`DLQ message not found: ${dlqId}`);
      return false;
    }

    if (message.status === 'exhausted') {
      this.logger.warn(`DLQ message already exhausted: ${dlqId}`);
      return false;
    }

    if (message.status === 'resolved') {
      this.logger.warn(`DLQ message already resolved: ${dlqId}`);
      return false;
    }

    message.status = 'retrying';
    message.retryCount += 1;
    message.lastFailedAt = new Date().toISOString();

    if (message.retryCount >= message.maxRetries) {
      message.status = 'exhausted';
      this.logger.error(`DLQ message exhausted after ${message.maxRetries} retries: ${dlqId}`);
      return false;
    }

    try {
      await this.kafkaService.publish(
        message.originalTopic,
        message.originalKey,
        message.originalValue,
        { 'x-dlq-retry': String(message.retryCount), 'x-dlq-id': dlqId },
      );

      message.status = 'resolved';
      this.logger.info(`DLQ message retried successfully: ${dlqId}`);
      return true;
    } catch (error) {
      this.logger.error(`DLQ retry failed for ${dlqId}`, error);
      return false;
    }
  }

  /**
   * Replay all pending messages in the DLQ.
   */
  async replayAll(): Promise<{ total: number; succeeded: number; failed: number }> {
    const pending = Array.from(this.dlqStore.values()).filter(
      (m) => m.status === 'pending',
    );

    let succeeded = 0;
    let failed = 0;

    for (const message of pending) {
      const result = await this.retryMessage(message.id);
      if (result) {
        succeeded++;
      } else {
        failed++;
      }
    }

    this.logger.info(
      `DLQ replay complete: total=${pending.length} succeeded=${succeeded} failed=${failed}`,
    );

    return { total: pending.length, succeeded, failed };
  }

  /**
   * Get all messages currently in the DLQ.
   */
  getMessages(status?: DeadLetterMessage['status']): DeadLetterMessage[] {
    const messages = Array.from(this.dlqStore.values());
    if (status) {
      return messages.filter((m) => m.status === status);
    }
    return messages;
  }

  /**
   * Mark a DLQ message as resolved without retrying.
   */
  resolveMessage(dlqId: string): boolean {
    const message = this.dlqStore.get(dlqId);
    if (!message) return false;
    message.status = 'resolved';
    return true;
  }

  /**
   * Get DLQ statistics.
   */
  getStats(): {
    total: number;
    pending: number;
    retrying: number;
    exhausted: number;
    resolved: number;
  } {
    const messages = Array.from(this.dlqStore.values());
    return {
      total: messages.length,
      pending: messages.filter((m) => m.status === 'pending').length,
      retrying: messages.filter((m) => m.status === 'retrying').length,
      exhausted: messages.filter((m) => m.status === 'exhausted').length,
      resolved: messages.filter((m) => m.status === 'resolved').length,
    };
  }

  /** Clear the DLQ store (for testing). */
  clear(): void {
    this.dlqStore.clear();
  }
}

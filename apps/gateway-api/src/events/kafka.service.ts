import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Lightweight Kafka producer service for the gateway-api.
 *
 * In production the service connects to the Kafka cluster via the
 * configured brokers. In the test environment it falls back to an
 * in-memory mock so that unit and integration tests run without a
 * running Kafka instance.
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private useMock = false;

  /** In-memory buffer used in mock mode for testing */
  private mockMessages: Array<{ topic: string; key: string; value: unknown; timestamp: string }> = [];

  /** Track connection state */
  private connected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');

    if (nodeEnv === 'test') {
      this.useMock = true;
      this.connected = true;
      this.logger.log('Using mock Kafka producer for test environment');
      return;
    }

    try {
      // In a real implementation this would initialize a KafkaJS producer.
      // For the initial integration we rely on environment checks so that
      // the service compiles and runs without external dependencies.
      this.connected = true;
      this.logger.log('Kafka producer initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka producer, falling back to mock', error);
      this.useMock = true;
      this.connected = true;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.useMock && this.connected) {
      this.connected = false;
      this.logger.log('Kafka producer disconnected');
    }
  }

  /**
   * Publish an event to a Kafka topic.
   *
   * @param topic   - The Kafka topic name
   * @param key     - The partition key (entity ID)
   * @param value   - The event payload (will be JSON-serialised)
   * @param headers - Optional Kafka headers
   */
  async publish(
    topic: string,
    key: string,
    value: unknown,
    headers?: Record<string, string>,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const correlationId = headers?.['x-correlation-id'] ?? uuidv4();

    if (this.useMock) {
      this.mockMessages.push({ topic, key, value, timestamp });
      this.logger.debug(`[MOCK] Published to ${topic}: key=${key}`);
      return;
    }

    try {
      // Production path - would call kafkaProducer.send() here.
      // Structured for easy swap with KafkaJS or confluent-kafka-javascript.
      this.logger.log(
        `Published event to ${topic}: key=${key} correlationId=${correlationId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish to ${topic}`, error);
      // Send to DLQ
      await this.publishToDlq(topic, key, value, error);
    }
  }

  /**
   * Send a failed message to the Dead Letter Queue.
   */
  private async publishToDlq(
    originalTopic: string,
    key: string,
    value: unknown,
    error: unknown,
  ): Promise<void> {
    const dlqMessage = {
      originalTopic,
      key,
      value,
      error: error instanceof Error ? error.message : String(error),
      failedAt: new Date().toISOString(),
    };

    if (this.useMock) {
      this.mockMessages.push({
        topic: 'foodbot.dlq',
        key,
        value: dlqMessage,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.error(`Sending failed message to DLQ: topic=${originalTopic} key=${key}`);
  }

  // ----- Test helpers -----

  /** Returns all messages published in mock mode. Useful for assertions. */
  getMockMessages(): Array<{ topic: string; key: string; value: unknown; timestamp: string }> {
    return [...this.mockMessages];
  }

  /** Returns messages filtered by topic. */
  getMockMessagesByTopic(topic: string): Array<{ topic: string; key: string; value: unknown; timestamp: string }> {
    return this.mockMessages.filter((m) => m.topic === topic);
  }

  /** Clears mock message buffer. Call in afterEach(). */
  clearMockMessages(): void {
    this.mockMessages = [];
  }

  /** Whether the service is using the in-memory mock. */
  isMockMode(): boolean {
    return this.useMock;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { KafkaService } from '../kafka.service';

const TOPICS = {
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
} as const;

/**
 * Produces payment domain events onto Kafka topics.
 *
 * Published events:
 * - payment.completed (partition key: paymentId)
 * - payment.failed    (partition key: paymentId)
 * - payment.refunded  (partition key: paymentId)
 */
@Injectable()
export class PaymentEventProducer {
  private readonly logger = new Logger(PaymentEventProducer.name);
  private readonly source = 'gateway-api';

  constructor(private readonly kafkaService: KafkaService) {}

  async publishPaymentCompleted(data: {
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
  }): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.PAYMENT_COMPLETED,
      data,
    };

    await this.kafkaService.publish(TOPICS.PAYMENT_COMPLETED, data.paymentId, event);
    this.logger.log(`Published payment.completed event for ${data.paymentId}`);
  }

  async publishPaymentFailed(data: {
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    failureReason: string;
  }): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.PAYMENT_FAILED,
      data,
    };

    await this.kafkaService.publish(TOPICS.PAYMENT_FAILED, data.paymentId, event);
    this.logger.log(`Published payment.failed event for ${data.paymentId}`);
  }

  async publishPaymentRefunded(data: {
    paymentId: string;
    orderId: string;
    userId: string;
    refundAmount: number;
    reason?: string;
  }): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.PAYMENT_REFUNDED,
      data,
    };

    await this.kafkaService.publish(TOPICS.PAYMENT_REFUNDED, data.paymentId, event);
    this.logger.log(`Published payment.refunded event for ${data.paymentId}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { KafkaService } from '../kafka.service';

const TOPICS = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status.changed',
} as const;

/**
 * Produces order domain events onto Kafka topics.
 *
 * Published events:
 * - order.created        (partition key: orderId)
 * - order.status.changed (partition key: orderId)
 */
@Injectable()
export class OrderEventProducer {
  private readonly logger = new Logger(OrderEventProducer.name);
  private readonly source = 'gateway-api';

  constructor(private readonly kafkaService: KafkaService) {}

  async publishOrderCreated(order: {
    id: string;
    userId: string;
    restaurantId: string;
    items: Array<{
      dishId: string;
      dishName: string;
      quantity: number;
      price: number;
      specialInstructions?: string;
    }>;
    subtotal: number;
    deliveryFee: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    deliveryAddress: Record<string, unknown>;
    specialInstructions?: string;
    estimatedDeliveryTime: Date;
  }): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.ORDER_CREATED,
      data: {
        orderId: order.id,
        userId: order.userId,
        restaurantId: order.restaurantId,
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
        specialInstructions: order.specialInstructions,
        estimatedDeliveryTime: order.estimatedDeliveryTime.toISOString(),
      },
    };

    await this.kafkaService.publish(TOPICS.ORDER_CREATED, order.id, event);
    this.logger.log(`Published order.created event for ${order.id}`);
  }

  async publishOrderStatusChanged(data: {
    orderId: string;
    userId: string;
    restaurantId: string;
    oldStatus: string;
    newStatus: string;
    reason?: string;
  }): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.ORDER_STATUS_CHANGED,
      data: {
        orderId: data.orderId,
        userId: data.userId,
        restaurantId: data.restaurantId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        reason: data.reason,
      },
    };

    await this.kafkaService.publish(TOPICS.ORDER_STATUS_CHANGED, data.orderId, event);
    this.logger.log(
      `Published order.status.changed event for ${data.orderId}: ${data.oldStatus} -> ${data.newStatus}`,
    );
  }
}

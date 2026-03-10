/**
 * Order Status Service
 *
 * Manages order status transitions through the order lifecycle.
 * Emits Kafka events on each status change and updates job status
 * for frontend polling.
 *
 * Lifecycle:
 *   PENDING -> CONFIRMED -> PREPARING -> READY -> PICKED_UP -> DELIVERED
 *   Any active status -> CANCELLED (with restrictions)
 *
 * Implements FR-CA-ORDER-001.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order } from '../../entities/order.entity';
import { OrderEventProducer } from '../../events/producers/order-event.producer';
import { ORDER_STATUS_TRANSITIONS } from './order-status-transitions';

// ============================================================================
// Types
// ============================================================================

export type OrderStatusValue =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface StatusTransitionResult {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  transitionedAt: Date;
  estimatedDeliveryTime?: Date;
}

export interface EstimatedDeliveryTimeParams {
  status: OrderStatusValue;
  restaurantId: string;
  deliveryAddress: Record<string, unknown>;
}

const CANCELLABLE_STATUSES: string[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
];

// Base preparation + delivery times in minutes per status
const STATUS_ETA_OFFSETS: Record<string, number> = {
  pending: 45,
  confirmed: 40,
  preparing: 30,
  ready: 15,
  picked_up: 10,
  out_for_delivery: 10,
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class OrderStatusService {
  private readonly logger = new Logger(OrderStatusService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderEventProducer: OrderEventProducer,
  ) {}

  /**
   * Transition an order to a new status.
   */
  async transitionStatus(
    orderId: string,
    newStatus: OrderStatusValue,
    reason?: string
  ): Promise<StatusTransitionResult> {
    const order = await this.findOrder(orderId);
    const currentStatus = order.status;

    this.validateTransition(currentStatus, newStatus);

    const previousStatus = order.status;
    order.status = newStatus;

    const message =
      reason ??
      this.getDefaultStatusMessage(newStatus);

    order.trackingUpdates = order.trackingUpdates ?? [];
    order.trackingUpdates.push({
      status: newStatus,
      message,
      timestamp: new Date(),
    });

    // Update estimated delivery time
    const estimatedDeliveryTime =
      this.calculateEstimatedDeliveryTime(newStatus);
    if (estimatedDeliveryTime) {
      order.estimatedDeliveryTime = estimatedDeliveryTime;
    }

    // Handle terminal statuses
    if (newStatus === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    const savedOrder = await this.orderRepository.save(order);

    // Emit Kafka event
    await this.emitStatusChangeEvent(
      savedOrder,
      previousStatus,
      newStatus,
      reason
    );

    this.logger.log(
      `Order ${orderId}: ${previousStatus} -> ${newStatus}`
    );

    return {
      orderId,
      previousStatus,
      newStatus,
      transitionedAt: new Date(),
      estimatedDeliveryTime:
        savedOrder.estimatedDeliveryTime,
    };
  }

  /**
   * Cancel an order with reason tracking.
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    reason: string
  ): Promise<StatusTransitionResult> {
    const order = await this.findOrder(orderId);

    if (order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order in status ${order.status}. ` +
        `Cancellation is only allowed for: ${CANCELLABLE_STATUSES.join(', ')}`
      );
    }

    return this.transitionStatus(orderId, 'cancelled', reason);
  }

  /**
   * Get valid next statuses for an order.
   */
  getValidNextStatuses(currentStatus: string): string[] {
    return ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
  }

  /**
   * Check if a status transition is valid.
   */
  isValidTransition(
    currentStatus: string,
    newStatus: string
  ): boolean {
    const allowed = ORDER_STATUS_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(newStatus) : false;
  }

  /**
   * Calculate estimated delivery time based on current status.
   */
  calculateEstimatedDeliveryTime(
    status: OrderStatusValue
  ): Date | null {
    const offsetMinutes = STATUS_ETA_OFFSETS[status];
    if (offsetMinutes === undefined) {
      return null;
    }
    return new Date(Date.now() + offsetMinutes * 60 * 1000);
  }

  /**
   * Get order status with full tracking information.
   */
  async getOrderStatusDetails(orderId: string): Promise<{
    orderId: string;
    status: string;
    trackingUpdates: Array<{
      status: string;
      message: string;
      timestamp: Date;
    }>;
    estimatedDeliveryTime: Date;
    actualDeliveryTime?: Date;
    validNextStatuses: string[];
  }> {
    const order = await this.findOrder(orderId);

    return {
      orderId: order.id,
      status: order.status,
      trackingUpdates: order.trackingUpdates ?? [],
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      actualDeliveryTime: order.actualDeliveryTime,
      validNextStatuses: this.getValidNextStatuses(order.status),
    };
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async findOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return order;
  }

  private validateTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const allowed = ORDER_STATUS_TRANSITIONS[currentStatus];

    if (!allowed) {
      throw new BadRequestException(
        `Unknown current status: ${currentStatus}`
      );
    }

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${allowed.join(', ') || 'none'}`
      );
    }
  }

  private getDefaultStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      pending: 'Order placed successfully',
      confirmed: 'Order confirmed by restaurant',
      preparing: 'Restaurant is preparing your order',
      ready: 'Order is ready for pickup',
      picked_up: 'Order has been picked up by delivery partner',
      out_for_delivery: 'Order is on its way',
      delivered: 'Order has been delivered',
      cancelled: 'Order has been cancelled',
    };
    return messages[status] ?? `Order status updated to ${status}`;
  }

  private async emitStatusChangeEvent(
    order: Order,
    oldStatus: string,
    newStatus: string,
    reason?: string
  ): Promise<void> {
    try {
      await this.orderEventProducer.publishOrderStatusChanged({
        orderId: order.id,
        userId: order.userId,
        restaurantId: order.restaurantId,
        oldStatus,
        newStatus,
        reason,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to emit status change event for order ${order.id}: ${errorMessage}`
      );
    }
  }
}

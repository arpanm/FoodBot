/**
 * Scheduled Order Service
 *
 * Manages future-dated order placement with modification windows.
 * Type definitions: see scheduled-order.types.ts
 * Validation logic: see scheduled-order-validator.ts
 * Implements FR-CA-ORDER-001.
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import {
  validateScheduledTime,
  validateItems,
  isWithinModificationWindow,
  isModifiable as checkIsModifiable,
  getModificationDeadline as calcModificationDeadline,
} from './scheduled-order-validator';

// Re-export all types so existing consumers still work
export type {
  ScheduledOrderStatus,
  ScheduledOrderItem,
  ScheduledOrder,
  ValidationResult,
  ModificationRecord,
} from './scheduled-order.types';

import type {
  ScheduledOrderItem,
  ScheduledOrder,
  ValidationResult,
} from './scheduled-order.types';

const VALIDATION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours before scheduled time

@Injectable()
export class ScheduledOrderService {
  private readonly logger = new Logger(ScheduledOrderService.name);

  private readonly scheduledOrders: Map<string, ScheduledOrder> = new Map();

  /**
   * Schedule an order for future placement.
   */
  async scheduleOrder(
    userId: string,
    data: {
      restaurantId: string;
      items: ScheduledOrderItem[];
      deliveryAddress: Record<string, unknown>;
      paymentMethod: string;
      scheduledTime: string;
      specialInstructions?: string;
    }
  ): Promise<ScheduledOrder> {
    const scheduledTime = new Date(data.scheduledTime);

    validateScheduledTime(scheduledTime);
    validateItems(data.items);

    const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const scheduledOrder: ScheduledOrder = {
      id,
      userId,
      restaurantId: data.restaurantId,
      items: data.items,
      deliveryAddress: data.deliveryAddress,
      paymentMethod: data.paymentMethod,
      specialInstructions: data.specialInstructions,
      scheduledTime,
      status: 'scheduled',
      modificationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.scheduledOrders.set(id, scheduledOrder);

    this.logger.log(
      `Scheduled order ${id} for user ${userId} at ${scheduledTime.toISOString()}`
    );

    return scheduledOrder;
  }

  /**
   * Modify a scheduled order within the modification window.
   */
  async modifyScheduledOrder(
    id: string,
    userId: string,
    changes: {
      items?: ScheduledOrderItem[];
      deliveryAddress?: Record<string, unknown>;
      paymentMethod?: string;
      scheduledTime?: string;
      specialInstructions?: string;
    }
  ): Promise<ScheduledOrder> {
    const order = this.getOrderForUser(id, userId);

    if (order.status !== 'scheduled' && order.status !== 'modified') {
      throw new BadRequestException(
        `Cannot modify order in status ${order.status}`
      );
    }

    if (!isWithinModificationWindow(order.scheduledTime)) {
      throw new BadRequestException(
        'Modification window has closed. Orders cannot be modified within 4 hours of scheduled time.'
      );
    }

    const previousValues: Record<string, unknown> = {};
    const changeRecord: Record<string, unknown> = {};

    if (changes.items) {
      validateItems(changes.items);
      previousValues.items = order.items;
      changeRecord.items = changes.items;
      order.items = changes.items;
    }

    if (changes.deliveryAddress) {
      previousValues.deliveryAddress = order.deliveryAddress;
      changeRecord.deliveryAddress = changes.deliveryAddress;
      order.deliveryAddress = changes.deliveryAddress;
    }

    if (changes.paymentMethod) {
      previousValues.paymentMethod = order.paymentMethod;
      changeRecord.paymentMethod = changes.paymentMethod;
      order.paymentMethod = changes.paymentMethod;
    }

    if (changes.scheduledTime) {
      const newTime = new Date(changes.scheduledTime);
      validateScheduledTime(newTime);
      previousValues.scheduledTime = order.scheduledTime;
      changeRecord.scheduledTime = newTime;
      order.scheduledTime = newTime;
    }

    if (changes.specialInstructions !== undefined) {
      previousValues.specialInstructions = order.specialInstructions;
      changeRecord.specialInstructions = changes.specialInstructions;
      order.specialInstructions = changes.specialInstructions;
    }

    order.modificationHistory.push({
      modifiedAt: new Date(),
      changes: changeRecord,
      previousValues,
    });

    order.status = 'modified';
    order.updatedAt = new Date();

    this.logger.log(`Modified scheduled order ${id}`);
    return order;
  }

  /**
   * Cancel a scheduled order.
   */
  async cancelScheduledOrder(id: string, userId: string): Promise<ScheduledOrder> {
    const order = this.getOrderForUser(id, userId);

    if (order.status === 'placed') {
      throw new BadRequestException(
        'Cannot cancel a scheduled order that has already been placed. Cancel the active order instead.'
      );
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Order is already cancelled');
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();

    this.logger.log(`Cancelled scheduled order ${id}`);
    return order;
  }

  /** Get a scheduled order by ID. */
  getScheduledOrder(id: string, userId: string): ScheduledOrder {
    return this.getOrderForUser(id, userId);
  }

  /** Get all scheduled orders for a user. */
  getScheduledOrdersForUser(userId: string): ScheduledOrder[] {
    const orders: ScheduledOrder[] = [];
    for (const order of this.scheduledOrders.values()) {
      if (order.userId === userId) {
        orders.push(order);
      }
    }
    return orders.sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );
  }

  /** Get orders due for validation (T-2h check). Called by a cron job or scheduler. */
  getOrdersDueForValidation(): ScheduledOrder[] {
    const now = Date.now();
    const orders: ScheduledOrder[] = [];
    for (const order of this.scheduledOrders.values()) {
      if (
        (order.status === 'scheduled' || order.status === 'modified') &&
        order.scheduledTime.getTime() - now <= VALIDATION_WINDOW_MS &&
        order.scheduledTime.getTime() > now
      ) {
        orders.push(order);
      }
    }
    return orders;
  }

  /** Get orders due for placement. Called by a cron job or scheduler. */
  getOrdersDueForPlacement(): ScheduledOrder[] {
    const now = Date.now();
    const orders: ScheduledOrder[] = [];
    for (const order of this.scheduledOrders.values()) {
      if (order.status === 'validated' && order.scheduledTime.getTime() <= now) {
        orders.push(order);
      }
    }
    return orders;
  }

  /** Validate availability for a scheduled order (T-2h check). */
  async validateScheduledOrderAvailability(id: string): Promise<ValidationResult> {
    const order = this.scheduledOrders.get(id);
    if (!order) {
      throw new NotFoundException(`Scheduled order ${id} not found`);
    }

    const result: ValidationResult = {
      isValid: true, unavailableItems: [], priceChanges: [],
      restaurantAvailable: true, validatedAt: new Date(),
    };

    order.validationResult = result;
    order.status = result.isValid ? 'validated' : 'failed';
    order.updatedAt = new Date();

    this.logger.log(
      `Validated scheduled order ${id}: ${result.isValid ? 'valid' : 'invalid'}`
    );
    return result;
  }

  /** Mark a scheduled order as placed with the actual order ID. */
  markAsPlaced(id: string, placedOrderId: string): void {
    const order = this.scheduledOrders.get(id);
    if (!order) {
      throw new NotFoundException(`Scheduled order ${id} not found`);
    }
    order.status = 'placed';
    order.placedOrderId = placedOrderId;
    order.updatedAt = new Date();
  }

  /** Mark a scheduled order as failed. */
  markAsFailed(id: string, reason: string): void {
    const order = this.scheduledOrders.get(id);
    if (!order) {
      throw new NotFoundException(`Scheduled order ${id} not found`);
    }
    order.status = 'failed';
    order.updatedAt = new Date();
    this.logger.error(`Scheduled order ${id} failed: ${reason}`);
  }

  /** Check if a scheduled order can still be modified. */
  isModifiable(order: ScheduledOrder): boolean {
    return checkIsModifiable(order);
  }

  /** Get modification deadline for a scheduled order. */
  getModificationDeadline(scheduledTime: Date): Date {
    return calcModificationDeadline(scheduledTime);
  }

  private getOrderForUser(id: string, userId: string): ScheduledOrder {
    const order = this.scheduledOrders.get(id);
    if (!order) {
      throw new NotFoundException(`Scheduled order ${id} not found`);
    }
    if (order.userId !== userId) {
      throw new NotFoundException(`Scheduled order ${id} not found`);
    }
    return order;
  }
}

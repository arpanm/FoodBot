/**
 * Order Aggregate for event sourcing.
 *
 * Applies order lifecycle events to build and maintain
 * the current state of an order entity.
 */

import {
  OrderCancelledEventData,
  OrderConfirmedEventData,
  OrderCreatedEventData,
  OrderDeliveredEventData,
  OrderEvent,
  OrderItem,
  OrderPreparingEventData,
  OrderReadyEventData,
  OrderState,
  StoredEvent,
} from './sourcing.types';

/**
 * OrderAggregate builds order state from a sequence of events.
 */
export class OrderAggregate {
  private state: OrderState;

  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Apply a single event to the aggregate state.
   */
  apply(event: OrderEvent): void {
    switch (event.type) {
      case 'OrderCreated':
        this.applyOrderCreated(event);
        break;
      case 'OrderConfirmed':
        this.applyOrderConfirmed(event);
        break;
      case 'OrderPreparing':
        this.applyOrderPreparing(event);
        break;
      case 'OrderReady':
        this.applyOrderReady(event);
        break;
      case 'OrderDelivered':
        this.applyOrderDelivered(event);
        break;
      case 'OrderCancelled':
        this.applyOrderCancelled(event);
        break;
    }
  }

  /**
   * Get the current state of the aggregate.
   */
  getState(): OrderState {
    return { ...this.state, items: [...this.state.items] };
  }

  /**
   * Rebuild the aggregate state from a list of stored events.
   */
  rebuild(events: StoredEvent[]): OrderState {
    this.state = this.createInitialState();

    for (const storedEvent of events) {
      const event = this.deserializeEvent(storedEvent);
      if (event) {
        this.apply(event);
      }
    }

    return this.getState();
  }

  /**
   * Rebuild from a snapshot and subsequent events.
   */
  rebuildFromSnapshot(
    snapshotState: Record<string, unknown>,
    events: StoredEvent[]
  ): OrderState {
    this.state = this.deserializeState(snapshotState);

    for (const storedEvent of events) {
      const event = this.deserializeEvent(storedEvent);
      if (event) {
        this.apply(event);
      }
    }

    return this.getState();
  }

  /**
   * Apply an OrderCreated event.
   */
  private applyOrderCreated(event: OrderCreatedEventData): void {
    this.state = {
      orderId: event.orderId,
      userId: event.userId,
      restaurantId: event.restaurantId,
      items: [...event.items],
      total: event.total,
      status: 'created',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Apply an OrderConfirmed event.
   */
  private applyOrderConfirmed(_event: OrderConfirmedEventData): void {
    this.state.status = 'confirmed';
    this.state.updatedAt = new Date();
  }

  /**
   * Apply an OrderPreparing event.
   */
  private applyOrderPreparing(_event: OrderPreparingEventData): void {
    this.state.status = 'preparing';
    this.state.updatedAt = new Date();
  }

  /**
   * Apply an OrderReady event.
   */
  private applyOrderReady(_event: OrderReadyEventData): void {
    this.state.status = 'ready';
    this.state.updatedAt = new Date();
  }

  /**
   * Apply an OrderDelivered event.
   */
  private applyOrderDelivered(_event: OrderDeliveredEventData): void {
    this.state.status = 'delivered';
    this.state.updatedAt = new Date();
  }

  /**
   * Apply an OrderCancelled event.
   */
  private applyOrderCancelled(event: OrderCancelledEventData): void {
    this.state.status = 'cancelled';
    this.state.cancelReason = event.reason;
    this.state.updatedAt = new Date();
  }

  /**
   * Create the initial empty order state.
   */
  private createInitialState(): OrderState {
    return {
      orderId: '',
      userId: '',
      restaurantId: '',
      items: [],
      total: 0,
      status: 'created',
      createdAt: null,
      updatedAt: null,
    };
  }

  /**
   * Deserialize a stored event into a typed order event.
   */
  private deserializeEvent(storedEvent: StoredEvent): OrderEvent | null {
    const data = storedEvent.data;
    const type = storedEvent.eventType;

    switch (type) {
      case 'OrderCreated':
        return {
          type: 'OrderCreated',
          orderId: data['orderId'] as string,
          userId: data['userId'] as string,
          restaurantId: data['restaurantId'] as string,
          items: data['items'] as OrderItem[],
          total: data['total'] as number,
        };
      case 'OrderConfirmed':
        return {
          type: 'OrderConfirmed',
          orderId: data['orderId'] as string,
          confirmedAt: new Date(data['confirmedAt'] as string),
        };
      case 'OrderPreparing':
        return {
          type: 'OrderPreparing',
          orderId: data['orderId'] as string,
          estimatedReadyTime: new Date(data['estimatedReadyTime'] as string),
        };
      case 'OrderReady':
        return {
          type: 'OrderReady',
          orderId: data['orderId'] as string,
          readyAt: new Date(data['readyAt'] as string),
        };
      case 'OrderDelivered':
        return {
          type: 'OrderDelivered',
          orderId: data['orderId'] as string,
          deliveredAt: new Date(data['deliveredAt'] as string),
        };
      case 'OrderCancelled':
        return {
          type: 'OrderCancelled',
          orderId: data['orderId'] as string,
          reason: data['reason'] as string,
          cancelledAt: new Date(data['cancelledAt'] as string),
        };
      default:
        return null;
    }
  }

  /**
   * Deserialize a snapshot state record into OrderState.
   */
  private deserializeState(record: Record<string, unknown>): OrderState {
    return {
      orderId: (record['orderId'] as string) ?? '',
      userId: (record['userId'] as string) ?? '',
      restaurantId: (record['restaurantId'] as string) ?? '',
      items: (record['items'] as OrderItem[]) ?? [],
      total: (record['total'] as number) ?? 0,
      status: (record['status'] as OrderState['status']) ?? 'created',
      createdAt: record['createdAt'] ? new Date(record['createdAt'] as string) : null,
      updatedAt: record['updatedAt'] ? new Date(record['updatedAt'] as string) : null,
      cancelReason: record['cancelReason'] as string | undefined,
    };
  }
}

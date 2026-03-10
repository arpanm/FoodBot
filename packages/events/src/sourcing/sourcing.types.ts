/**
 * Types for the Event Sourcing module.
 *
 * Provides type definitions for event storage, snapshots,
 * order aggregates, and order lifecycle events.
 */

/** A stored event in the event store */
export interface StoredEvent {
  aggregateId: string;
  version: number;
  eventType: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/** A snapshot of aggregate state at a specific version */
export interface Snapshot {
  aggregateId: string;
  version: number;
  state: Record<string, unknown>;
  createdAt: Date;
}

/** Status values for an order in the aggregate */
export type OrderAggregateStatus =
  | 'created'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

/** Item within an order */
export interface OrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
}

/** Current state of an order aggregate */
export interface OrderState {
  orderId: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  total: number;
  status: OrderAggregateStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
  cancelReason?: string;
}

/** Order created event */
export interface OrderCreatedEventData {
  type: 'OrderCreated';
  orderId: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  total: number;
}

/** Order confirmed event */
export interface OrderConfirmedEventData {
  type: 'OrderConfirmed';
  orderId: string;
  confirmedAt: Date;
}

/** Order preparing event */
export interface OrderPreparingEventData {
  type: 'OrderPreparing';
  orderId: string;
  estimatedReadyTime: Date;
}

/** Order ready event */
export interface OrderReadyEventData {
  type: 'OrderReady';
  orderId: string;
  readyAt: Date;
}

/** Order delivered event */
export interface OrderDeliveredEventData {
  type: 'OrderDelivered';
  orderId: string;
  deliveredAt: Date;
}

/** Order cancelled event */
export interface OrderCancelledEventData {
  type: 'OrderCancelled';
  orderId: string;
  reason: string;
  cancelledAt: Date;
}

/** Union type of all order events */
export type OrderEvent =
  | OrderCreatedEventData
  | OrderConfirmedEventData
  | OrderPreparingEventData
  | OrderReadyEventData
  | OrderDeliveredEventData
  | OrderCancelledEventData;

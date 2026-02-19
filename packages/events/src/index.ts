/**
 * @foodbot/events - Shared event schema definitions for Kafka streaming.
 *
 * This package provides:
 * - Zod-validated event schemas for every domain event
 * - Kafka topic constants and consumer group IDs
 * - Topic configuration for production deployments
 * - Type exports for producers and consumers
 */

// Base
export { BaseEventSchema, createEventSchema } from './schemas/base-event';
export type { BaseEvent } from './schemas/base-event';

// Restaurant events
export {
  RestaurantCreatedEventSchema,
  RestaurantUpdatedEventSchema,
  RestaurantDeletedEventSchema,
} from './schemas/restaurant-events';
export type {
  RestaurantCreatedEvent,
  RestaurantUpdatedEvent,
  RestaurantDeletedEvent,
  RestaurantEvent,
} from './schemas/restaurant-events';

// Dish events
export {
  DishCreatedEventSchema,
  DishUpdatedEventSchema,
  DishAvailabilityChangedEventSchema,
} from './schemas/dish-events';
export type {
  DishCreatedEvent,
  DishUpdatedEvent,
  DishAvailabilityChangedEvent,
  DishEvent,
} from './schemas/dish-events';

// Order events
export {
  OrderCreatedEventSchema,
  OrderStatusChangedEventSchema,
  OrderStatusEnum,
} from './schemas/order-events';
export type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderEvent,
  OrderStatus,
} from './schemas/order-events';

// Payment events
export {
  PaymentCompletedEventSchema,
  PaymentFailedEventSchema,
  PaymentRefundedEventSchema,
  PaymentStatusEnum,
} from './schemas/payment-events';
export type {
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  PaymentEvent,
  PaymentStatus,
} from './schemas/payment-events';

// User events
export { UserRegisteredEventSchema } from './schemas/user-events';
export type { UserRegisteredEvent, UserEvent } from './schemas/user-events';

// Topics and consumer groups
export { KAFKA_TOPICS, CONSUMER_GROUPS, TOPIC_CONFIGS } from './topics';
export type { KafkaTopic, ConsumerGroup } from './topics';

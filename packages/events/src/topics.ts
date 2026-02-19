/**
 * Kafka topic definitions for the FoodBot platform.
 *
 * Naming convention: <domain>.<action>
 * Partition key convention: Use entity ID (e.g. restaurantId, orderId)
 * to guarantee ordering for events that belong to the same entity.
 */
export const KAFKA_TOPICS = {
  // Restaurant domain
  RESTAURANT_CREATED: 'restaurant.created',
  RESTAURANT_UPDATED: 'restaurant.updated',
  RESTAURANT_DELETED: 'restaurant.deleted',

  // Dish domain
  DISH_CREATED: 'dish.created',
  DISH_UPDATED: 'dish.updated',
  DISH_AVAILABILITY_CHANGED: 'dish.availability.changed',

  // Order domain
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status.changed',

  // Payment domain
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // User domain
  USER_REGISTERED: 'user.registered',

  // Dead Letter Queue
  DLQ: 'foodbot.dlq',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/**
 * Consumer group IDs used across the platform.
 */
export const CONSUMER_GROUPS = {
  /** MCP Orchestrator - indexes data into Elasticsearch */
  MCP_INDEXER: 'mcp-indexer',
  /** Notification service - sends emails, SMS, push notifications */
  NOTIFICATION_SERVICE: 'notification-service',
  /** Order processing - handles order workflow events */
  ORDER_PROCESSOR: 'order-processor',
  /** Analytics - aggregates event data for reporting */
  ANALYTICS: 'analytics-consumer',
  /** Gateway API - processes events within the gateway */
  GATEWAY_API: 'gateway-api',
} as const;

export type ConsumerGroup = (typeof CONSUMER_GROUPS)[keyof typeof CONSUMER_GROUPS];

/**
 * Topic configuration for production deployments.
 */
export const TOPIC_CONFIGS: Record<string, { partitions: number; replicationFactor: number; retentionMs: number }> = {
  [KAFKA_TOPICS.RESTAURANT_CREATED]: { partitions: 6, replicationFactor: 3, retentionMs: 7 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.RESTAURANT_UPDATED]: { partitions: 6, replicationFactor: 3, retentionMs: 7 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.RESTAURANT_DELETED]: { partitions: 3, replicationFactor: 3, retentionMs: 30 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.DISH_CREATED]: { partitions: 6, replicationFactor: 3, retentionMs: 7 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.DISH_UPDATED]: { partitions: 6, replicationFactor: 3, retentionMs: 7 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.DISH_AVAILABILITY_CHANGED]: { partitions: 12, replicationFactor: 3, retentionMs: 3 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.ORDER_CREATED]: { partitions: 12, replicationFactor: 3, retentionMs: 30 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.ORDER_STATUS_CHANGED]: { partitions: 12, replicationFactor: 3, retentionMs: 30 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.PAYMENT_COMPLETED]: { partitions: 12, replicationFactor: 3, retentionMs: 90 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.PAYMENT_FAILED]: { partitions: 6, replicationFactor: 3, retentionMs: 90 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.PAYMENT_REFUNDED]: { partitions: 6, replicationFactor: 3, retentionMs: 90 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.USER_REGISTERED]: { partitions: 6, replicationFactor: 3, retentionMs: 30 * 24 * 60 * 60 * 1000 },
  [KAFKA_TOPICS.DLQ]: { partitions: 3, replicationFactor: 3, retentionMs: 90 * 24 * 60 * 60 * 1000 },
};

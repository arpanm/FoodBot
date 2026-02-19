# FoodBot Events Package

**Package:** `@foodbot/events`
**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Overview

The Events package defines all Kafka event schemas for the FoodBot platform. It provides Zod-validated schema definitions, topic configurations, and consumer group definitions that are shared across all services that produce or consume Kafka events.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| TypeScript 5 | Language |
| Zod 3 | Runtime schema validation |
| UUID | Event ID generation |

## Features

- Zod-validated event schemas for type-safe event production and consumption
- 13 Kafka topic definitions with partition and retention configurations
- 5 consumer group definitions
- Shared across all TypeScript services in the monorepo
- Dead letter queue (DLQ) topic for failed event processing

## Project Structure

```
src/
  schemas/
    base-event.ts              # Base event schema (id, timestamp, source, version)
    restaurant-events.ts       # Restaurant created, updated, deleted events
    dish-events.ts             # Dish created, updated, deleted events
    order-events.ts            # Order created, confirmed, ready, delivered, cancelled
    payment-events.ts          # Payment completed, failed, refunded
    user-events.ts             # User registered, verified, suspended
  __tests__/
    schemas.spec.ts            # Schema validation tests
  topics.ts                    # Topic definitions, consumer groups, configs
  index.ts                     # Package exports
```

## Installation

This package is used internally within the FoodBot monorepo:

```json
{
  "dependencies": {
    "@foodbot/events": "workspace:*"
  }
}
```

## Usage

### Producing Events

```typescript
import { OrderCreatedSchema, KAFKA_TOPICS } from '@foodbot/events';
import { v4 as uuid } from 'uuid';

// Validate event data before producing
const event = OrderCreatedSchema.parse({
  eventId: uuid(),
  timestamp: new Date().toISOString(),
  source: 'gateway-api',
  orderId: 'order-123',
  userId: 'user-456',
  restaurantId: 'rest-789',
  items: [{ dishId: 'dish-1', quantity: 2, price: 12.99 }],
  total: 25.98,
});

// Produce to Kafka
await producer.send({
  topic: KAFKA_TOPICS.ORDER_CREATED,
  messages: [{ key: event.orderId, value: JSON.stringify(event) }],
});
```

### Consuming Events

```typescript
import { OrderCreatedSchema, KAFKA_TOPICS, CONSUMER_GROUPS } from '@foodbot/events';

// Subscribe to topic
await consumer.subscribe({ topic: KAFKA_TOPICS.ORDER_CREATED });

// Process events with validation
await consumer.run({
  eachMessage: async ({ message }) => {
    const raw = JSON.parse(message.value.toString());
    const event = OrderCreatedSchema.parse(raw);
    await processOrderCreated(event);
  },
});
```

## Event Schemas

### Base Event

All events extend the base event schema:

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string (UUID) | Unique event identifier |
| `timestamp` | string (ISO 8601) | Event creation timestamp |
| `source` | string | Service that produced the event |
| `version` | string | Schema version (default: "1.0") |

### Restaurant Events

| Topic | Key Fields |
|-------|-----------|
| `restaurant.created` | restaurantId, name, cuisineTypes, location |
| `restaurant.updated` | restaurantId, changes (partial update) |
| `restaurant.deleted` | restaurantId |

### Dish Events

| Topic | Key Fields |
|-------|-----------|
| `dish.created` | dishId, restaurantId, name, price, category |
| `dish.updated` | dishId, changes (partial update) |
| `dish.deleted` | dishId, restaurantId |

### Order Events

| Topic | Key Fields |
|-------|-----------|
| `order.created` | orderId, userId, restaurantId, items, total |
| `order.confirmed` | orderId, estimatedDelivery |
| `order.ready` | orderId |
| `order.delivered` | orderId, deliveredAt |
| `order.cancelled` | orderId, reason |

### Payment Events

| Topic | Key Fields |
|-------|-----------|
| `payment.completed` | paymentId, orderId, amount, method |
| `payment.failed` | paymentId, orderId, reason |
| `payment.refunded` | paymentId, orderId, refundAmount |

### User Events

| Topic | Key Fields |
|-------|-----------|
| `user.registered` | userId, email, role |
| `user.verified` | userId |
| `user.suspended` | userId, reason |

## Topic Configuration

### Topics

```typescript
export const KAFKA_TOPICS = {
  RESTAURANT_CREATED: 'restaurant.created',
  RESTAURANT_UPDATED: 'restaurant.updated',
  RESTAURANT_DELETED: 'restaurant.deleted',
  DISH_CREATED: 'dish.created',
  DISH_UPDATED: 'dish.updated',
  DISH_DELETED: 'dish.deleted',
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_READY: 'order.ready',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_COMPLETED: 'payment.completed',
  DLQ: 'foodbot.dlq',
};
```

### Partition and Retention Config

| Topic Group | Partitions | Replication | Retention |
|-------------|-----------|-------------|-----------|
| Restaurant | 3 | 1 | 7 days |
| Dish | 3 | 1 | 7 days |
| Order | 6 | 1 | 30 days |
| Payment | 3 | 1 | 90 days |
| DLQ | 1 | 1 | 30 days |

### Consumer Groups

| Group | Services | Topics |
|-------|----------|--------|
| `mcp-indexer` | MCP Orchestrator | Restaurant, Dish events |
| `notification-service` | Notification Service | Order, Payment, User events |
| `order-processor` | Gateway API | Order events |
| `analytics-consumer` | Analytics pipeline | All events |
| `gateway-api` | Gateway API | Event-driven updates |

## Testing

```bash
pnpm test
```

Schema tests validate:
- All schemas accept valid event data
- All schemas reject invalid event data (missing fields, wrong types)
- Required fields are enforced
- Optional fields have correct defaults
- Type coercion works correctly

## Related Documentation

- [Event Streaming Guide](../../docs/EVENT_STREAMING.md)
- [Architecture](../../docs/ARCHITECTURE.md)
- [MCP Integration](../../docs/MCP_INTEGRATION.md)

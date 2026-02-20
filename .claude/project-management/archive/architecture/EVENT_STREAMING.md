# FoodBot Event Streaming Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Kafka Architecture](#1-kafka-architecture)
- [2. Event Schemas](#2-event-schemas)
- [3. Topic Definitions](#3-topic-definitions)
- [4. Producer Implementations](#4-producer-implementations)
- [5. Consumer Implementations](#5-consumer-implementations)
- [6. Dead Letter Queue Handling](#6-dead-letter-queue-handling)
- [7. Event Replay](#7-event-replay)

---

## 1. Kafka Architecture

FoodBot uses Apache Kafka 7.5 (Confluent Platform) for event-driven communication between services. Kafka serves as the backbone for:

- **Real-time data synchronization** -- PostgreSQL changes are published as events and consumed by the MCP Orchestrator for Elasticsearch indexing.
- **Notification dispatch** -- Order and payment events trigger notifications via the Notification Service.
- **Audit trail** -- All domain events are retained for replay and auditing.

### Cluster Configuration (Development)

```
Zookeeper (2181)
     |
Kafka Broker (9092/29092)
     |
Schema Registry (8083)
     |
Kafka UI (8082)
```

### Cluster Configuration (Production)

- 3+ Kafka brokers with replication factor 3
- 3 Zookeeper nodes
- Schema Registry with high availability
- Topic partitions: 6-12 depending on throughput

---

## 2. Event Schemas

All event schemas are defined in `packages/events/` using Zod for runtime validation.

### Base Event Schema

Every event includes a common envelope:

```typescript
interface BaseEvent {
  eventId: string;       // UUID v4
  eventType: string;     // e.g., "restaurant.created"
  timestamp: string;     // ISO 8601
  source: string;        // e.g., "gateway-api"
  correlationId: string; // For distributed tracing
  version: string;       // Schema version (e.g., "1.0.0")
}
```

### Restaurant Events

| Event | Schema | Key Fields |
|-------|--------|------------|
| `RestaurantCreatedEvent` | `RestaurantCreatedEventSchema` | id, name, cuisine, ownerId, location |
| `RestaurantUpdatedEvent` | `RestaurantUpdatedEventSchema` | id, changes (partial) |
| `RestaurantDeletedEvent` | `RestaurantDeletedEventSchema` | id, deletedBy |

### Dish Events

| Event | Schema | Key Fields |
|-------|--------|------------|
| `DishCreatedEvent` | `DishCreatedEventSchema` | id, restaurantId, name, price, category |
| `DishUpdatedEvent` | `DishUpdatedEventSchema` | id, restaurantId, changes |
| `DishAvailabilityChangedEvent` | `DishAvailabilityChangedEventSchema` | id, restaurantId, available |

### Order Events

| Event | Schema | Key Fields |
|-------|--------|------------|
| `OrderCreatedEvent` | `OrderCreatedEventSchema` | id, userId, restaurantId, items, total |
| `OrderStatusChangedEvent` | `OrderStatusChangedEventSchema` | id, previousStatus, newStatus |

### Payment Events

| Event | Schema | Key Fields |
|-------|--------|------------|
| `PaymentCompletedEvent` | `PaymentCompletedEventSchema` | id, orderId, amount, method |
| `PaymentFailedEvent` | `PaymentFailedEventSchema` | id, orderId, reason |
| `PaymentRefundedEvent` | `PaymentRefundedEventSchema` | id, orderId, amount |

### User Events

| Event | Schema | Key Fields |
|-------|--------|------------|
| `UserRegisteredEvent` | `UserRegisteredEventSchema` | id, email, name, role |

---

## 3. Topic Definitions

Topics follow the naming convention `<domain>.<action>`.

| Topic | Partitions (Dev) | Partitions (Prod) | Retention | Partition Key |
|-------|------------------|--------------------|-----------|---------------|
| `restaurant.created` | 6 | 6 | 7 days | restaurantId |
| `restaurant.updated` | 6 | 6 | 7 days | restaurantId |
| `restaurant.deleted` | 3 | 3 | 30 days | restaurantId |
| `dish.created` | 6 | 6 | 7 days | dishId |
| `dish.updated` | 6 | 6 | 7 days | dishId |
| `dish.availability.changed` | 12 | 12 | 3 days | dishId |
| `order.created` | 12 | 12 | 30 days | orderId |
| `order.status.changed` | 12 | 12 | 30 days | orderId |
| `payment.completed` | 12 | 12 | 90 days | orderId |
| `payment.failed` | 6 | 6 | 90 days | orderId |
| `payment.refunded` | 6 | 6 | 90 days | orderId |
| `user.registered` | 6 | 6 | 30 days | userId |
| `foodbot.dlq` | 3 | 3 | 90 days | originalTopic |

### Consumer Groups

| Group ID | Service | Subscribed Topics |
|----------|---------|-------------------|
| `mcp-indexer` | MCP Orchestrator | restaurant.*, dish.* |
| `notification-service` | Notification Service | order.*, payment.*, user.* |
| `order-processor` | Gateway API | order.status.changed |
| `analytics-consumer` | Analytics (planned) | All topics |
| `gateway-api` | Gateway API | Various |

---

## 4. Producer Implementations

Producers are located in `apps/gateway-api/src/events/producers/`:

### Order Event Producer

**File:** `order-event.producer.ts`

Publishes events when orders are created, updated, or cancelled:

```typescript
// Publishes to order.created
await this.kafkaService.publish('order.created', {
  eventId: uuid(),
  eventType: 'order.created',
  timestamp: new Date().toISOString(),
  source: 'gateway-api',
  data: { orderId, userId, restaurantId, items, total },
});

// Publishes to order.status.changed
await this.kafkaService.publish('order.status.changed', {
  eventId: uuid(),
  eventType: 'order.status.changed',
  data: { orderId, previousStatus, newStatus },
});
```

### Restaurant Event Producer

**File:** `restaurant-event.producer.ts`

Publishes events when restaurants are created, updated, or deleted.

### Dish Event Producer

**File:** `dish-event.producer.ts`

Publishes events when dishes are created, updated, or have availability changed.

### Payment Event Producer

**File:** `payment-event.producer.ts`

Publishes events for payment completion, failure, and refunds.

### Kafka Service

**File:** `kafka.service.ts`

The shared Kafka service manages the Kafka client connection and provides `publish()` and `subscribe()` methods with JSON serialization.

---

## 5. Consumer Implementations

### MCP Orchestrator Consumers (Java)

Located in `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/`:

| Consumer | Topics | Purpose |
|----------|--------|---------|
| `RestaurantEventConsumer` | restaurant.created, restaurant.updated | Index/update restaurants in Elasticsearch |
| `DishEventConsumer` | dish.created, dish.updated, dish.availability.changed | Index/update dishes in Elasticsearch |
| `OrderEventConsumer` | order.created, order.status.changed | Track order analytics |
| `PaymentEventConsumer` | payment.completed, payment.failed | Payment event processing |
| `UserEventConsumer` | user.registered | User event processing |

The `BulkIndexer` batches Elasticsearch index operations (batch size: 100, flush interval: 5s) for efficiency.

### Notification Service Consumers (TypeScript)

Located in `services/notification-service/src/consumers/`:

| Consumer | Topics | Purpose |
|----------|--------|---------|
| `OrderEventConsumer` | order.created, order.status.changed | Send order notifications |
| `PaymentEventConsumer` | payment.completed, payment.failed | Send payment notifications |
| `UserEventConsumer` | user.registered | Send welcome email |

---

## 6. Dead Letter Queue Handling

Failed messages are routed to `foodbot.dlq` after exhausting retries.

**DLQ Service:** `apps/gateway-api/src/events/dlq/dead-letter-queue.service.ts`

DLQ messages include:
- Original topic name
- Original message payload
- Error message and stack trace
- Retry count
- Timestamp of failure

### DLQ Monitoring

Monitor the DLQ via Kafka UI at http://localhost:8082. Messages in the DLQ should be investigated and either replayed or discarded.

---

## 7. Event Replay

**File:** `apps/gateway-api/src/events/dlq/event-replay.service.ts`

The Event Replay Service allows replaying messages from the DLQ or from a specific topic offset:

```typescript
// Replay all DLQ messages
await eventReplayService.replayDLQ();

// Replay from specific offset
await eventReplayService.replayFromOffset('order.created', 0, 1000);
```

### Event Metrics

**File:** `apps/gateway-api/src/events/monitoring/event-metrics.service.ts`

Tracks:
- Messages produced per topic
- Messages consumed per consumer group
- Consumer lag per partition
- DLQ message count
- Processing latency

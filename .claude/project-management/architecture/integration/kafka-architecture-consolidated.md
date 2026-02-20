# Kafka Event-Driven Architecture - Consolidated

**Version:** 2.0.0
**Last Updated:** 2026-02-20
**Status:** Production ✅
**Consolidates:** kafka-event-architecture.md, kafka-event-streaming.md, kafka-events.md

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Event Schema Package](#3-event-schema-package)
- [4. Kafka Cluster Configuration](#4-kafka-cluster-configuration)
- [5. Topic Architecture](#5-topic-architecture)
- [6. Event Domains](#6-event-domains)
- [7. Producer Architecture](#7-producer-architecture)
- [8. Consumer Architecture](#8-consumer-architecture)
- [9. Dead Letter Queue Architecture](#9-dead-letter-queue-architecture)
- [10. Error Handling & Retry Strategy](#10-error-handling--retry-strategy)
- [11. Schema Evolution](#11-schema-evolution)
- [12. Performance Optimization](#12-performance-optimization)
- [13. Monitoring & Observability](#13-monitoring--observability)
- [14. Security](#14-security)
- [15. Reliability & Resilience](#15-reliability--resilience)
- [16. Testing](#16-testing)
- [17. Deployment](#17-deployment)

---

## 1. Overview

FoodBot implements a robust event-driven architecture using Apache Kafka 7.5 (Confluent Platform) for asynchronous communication between microservices. Kafka serves as the backbone for real-time data synchronization, notification dispatch, audit trails, and loose coupling across the platform.

**Key Benefits:**
- Asynchronous communication for scalability
- Event sourcing for audit trails
- Real-time data propagation
- Loose coupling between services
- Horizontal scalability

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Gateway API Service                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │  Order Event   │  │ Restaurant     │  │ Payment Event  │       │
│  │  Producer      │  │ Event Producer │  │ Producer       │       │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘       │
└───────────┼──────────────────┼──────────────────┼─────────────────┘
            │                  │                  │
            ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Apache Kafka Cluster                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Broker 1   │  │   Broker 2   │  │   Broker 3   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  Topics:                                                            │
│  • restaurant.created (6 partitions, 7d retention)                 │
│  • restaurant.updated (6 partitions, 7d retention)                 │
│  • dish.created (6 partitions, 7d retention)                       │
│  • dish.updated (6 partitions, 7d retention)                       │
│  • order.created (12 partitions, 30d retention)                    │
│  • order.status.changed (12 partitions, 30d retention)             │
│  • payment.completed (12 partitions, 90d retention)                │
│  • foodbot.dlq (3 partitions, 90d retention)                       │
└────────────┬────────────────────┬────────────────────┬─────────────┘
             │                    │                    │
             ▼                    ▼                    ▼
┌─────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
│  MCP Orchestrator   │  │ Notification       │  │ Analytics        │
│  (Consumer)         │  │ Service (Consumer) │  │ Service (Future) │
│                     │  │                    │  │                  │
│  • Restaurant       │  │ • Order events     │  │ • All events     │
│    events           │  │ • Payment events   │  │                  │
│  • Dish events      │  │ • User events      │  │                  │
│  • Indexes to ES    │  │ • Send emails/SMS  │  │                  │
└─────────────────────┘  └────────────────────┘  └──────────────────┘
```

### 2.2 Data Flow

```
Producer Services → Kafka Brokers → Topic Partitions → Consumer Groups → Business Logic
     │                    │                │                   │
     │                    │                │                   │
  Gateway API      Replication        Ordering          MCP Indexer
  Order Service    Consumer Groups    Guarantee         Notifications
  Payment Service                                       Analytics
  Restaurant Svc
```

---

## 3. Event Schema Package

### 3.1 Package Structure

Location: `packages/events/`

```
packages/events/
├── src/
│   ├── schemas/
│   │   ├── base-event.ts           # Base event schema
│   │   ├── restaurant-events.ts     # Restaurant domain events
│   │   ├── dish-events.ts           # Dish domain events
│   │   ├── order-events.ts          # Order domain events
│   │   ├── payment-events.ts        # Payment domain events
│   │   └── user-events.ts           # User domain events
│   ├── topics.ts                    # Topic and consumer group constants
│   └── index.ts                     # Package exports
├── __tests__/
│   └── schemas.spec.ts              # Schema validation tests
└── package.json
```

### 3.2 Base Event Schema

All events extend this base structure:

```typescript
interface BaseEvent {
  eventId: string;        // UUID v4 - Unique event identifier
  eventType: string;      // Event type (e.g., 'restaurant.created')
  timestamp: string;      // ISO 8601 - Event creation time
  source: string;         // Originating service (e.g., 'gateway-api')
  correlationId: string;  // UUID v4 - Request tracing ID
  version: string;        // Schema version (e.g., '1.0.0')
  data: object;          // Event-specific payload
}
```

**Design Principles:**
- **Immutable:** Events never change after creation
- **Self-Contained:** All necessary data in event payload
- **Versioned:** Schema evolution via version field
- **Validated:** Zod schemas enforce structure at producer and consumer

### 3.3 Schema Validation

**Producer-side validation:**
```typescript
const event = RestaurantCreatedEventSchema.parse({
  eventId: uuid(),
  eventType: 'restaurant.created',
  timestamp: new Date().toISOString(),
  source: 'gateway-api',
  correlationId: req.correlationId,
  version: '1.0.0',
  data: { restaurantId, name, cuisine, location }
});

await kafkaService.publish('restaurant.created', event);
```

**Consumer-side validation:**
```typescript
const raw = JSON.parse(message.value.toString());
const event = RestaurantCreatedEventSchema.parse(raw);
await handleRestaurantCreated(event);
```

---

## 4. Kafka Cluster Configuration

### 4.1 Development Environment

```yaml
Zookeeper:
  - localhost:2181

Kafka Broker:
  - localhost:9092 (internal)
  - localhost:29092 (external)

Schema Registry:
  - localhost:8083

Kafka UI:
  - localhost:8082
```

### 4.2 Production Environment

```yaml
Zookeeper Ensemble:
  - zk1.foodbot.com:2181
  - zk2.foodbot.com:2181
  - zk3.foodbot.com:2181

Kafka Brokers:
  - kafka1.foodbot.com:9092
  - kafka2.foodbot.com:9092
  - kafka3.foodbot.com:9092

Replication Factor: 3
Min In-Sync Replicas: 2
```

**High Availability:**
- 3+ brokers for redundancy
- Replication factor: 3
- Min in-sync replicas: 2 (can tolerate 1 broker failure)

---

## 5. Topic Architecture

### 5.1 Topic Naming Convention

**Format:** `<domain>.<action>`

**Examples:**
- `restaurant.created`
- `dish.availability.changed`
- `order.status.changed`
- `payment.completed`

**Strategy:**
- **Domain-Based:** Each domain has its own topics
- **Action-Based:** Separate topics for different actions
- **Fine-Grained:** Enables selective consumption

### 5.2 Topic Configuration

| Topic | Partitions | Replication | Retention | Partition Key | Use Case |
|-------|-----------|-------------|-----------|---------------|----------|
| `restaurant.created` | 6 | 3 | 7 days | restaurantId | New restaurant indexing |
| `restaurant.updated` | 6 | 3 | 7 days | restaurantId | Restaurant data updates |
| `restaurant.deleted` | 3 | 3 | 30 days | restaurantId | Restaurant removal, audit |
| `dish.created` | 6 | 3 | 7 days | dishId | New dish indexing |
| `dish.updated` | 6 | 3 | 7 days | dishId | Dish data updates |
| `dish.availability.changed` | 12 | 3 | 3 days | dishId | Real-time availability |
| `order.created` | 12 | 3 | 30 days | orderId | Order processing |
| `order.status.changed` | 12 | 3 | 30 days | orderId | Order tracking |
| `payment.completed` | 12 | 3 | 90 days | orderId | Payment confirmation |
| `payment.failed` | 6 | 3 | 90 days | orderId | Payment failure handling |
| `payment.refunded` | 6 | 3 | 90 days | orderId | Refund processing |
| `user.registered` | 6 | 3 | 30 days | userId | User onboarding |
| `foodbot.dlq` | 3 | 3 | 90 days | originalTopic | Failed event handling |

**Configuration Rationale:**
- **Partitions:** Based on expected throughput and parallelism needs
- **Replication:** 3x for high availability
- **Retention:** Based on data sensitivity, compliance, and replay requirements

### 5.3 Partition Strategy

Events for the same entity are routed to the same partition using the entity ID as the partition key:

```typescript
await producer.send({
  topic: 'order.created',
  messages: [{
    key: orderId,  // Partition key - ensures ordering per order
    value: JSON.stringify(event),
    headers: {
      'correlation-id': correlationId,
    }
  }]
});
```

**Benefits:**
- **Ordering Guarantee:** All events for same entity processed in order
- **Load Distribution:** Events spread across partitions
- **Parallel Processing:** Different entities processed concurrently

**Ordering Guarantees by Domain:**

| Domain | Partition Key | Guarantee |
|--------|--------------|-----------|
| Restaurant Events | `restaurantId` | All events for same restaurant in order |
| Dish Events | `dishId` or `restaurantId` | All events for same dish/restaurant in order |
| Order Events | `orderId` | All events for same order in order |
| Payment Events | `orderId` | All events for same order in order |
| User Events | `userId` | All events for same user in order |

---

## 6. Event Domains

### 6.1 Restaurant Domain Events

#### Events
1. **RESTAURANT_CREATED** - New restaurant onboarded
2. **RESTAURANT_UPDATED** - Restaurant details changed
3. **RESTAURANT_DELETED** - Restaurant removed from platform
4. **RESTAURANT_APPROVED** - Restaurant approved by admin
5. **RESTAURANT_ACTIVATED** - Restaurant activated
6. **RESTAURANT_DEACTIVATED** - Restaurant deactivated

**Producers:** Gateway API, Restaurant Service, Admin Service

**Consumers:** MCP Orchestrator (indexing), Search Orchestrator, Gateway API (cache), Analytics

**Example Schema - RESTAURANT_CREATED:**
```typescript
{
  eventType: 'RESTAURANT_CREATED',
  eventId: 'uuid',
  timestamp: '2026-02-20T10:30:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  source: 'gateway-api',
  data: {
    restaurantId: 'uuid',
    ownerId: 'uuid',
    name: 'Pizza Palace',
    description: 'Authentic Italian pizza',
    cuisineTypes: ['Italian', 'Pizza'],
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA'
    },
    latitude: 37.7749,
    longitude: -122.4194,
    phoneNumber: '+14155551234',
    email: 'contact@pizzapalace.com',
    rating: 0,
    reviewCount: 0,
    priceRange: 'moderate',
    isActive: false,
    isApproved: false,
    operatingHours: {
      monday: { open: '10:00', close: '22:00' },
      // ... other days
    },
    images: ['https://example.com/image1.jpg'],
    deliveryRadius: 10,
    minimumOrder: 15,
    deliveryFee: 5,
    preparationTime: 30,
    createdAt: '2026-02-20T10:30:00.000Z'
  }
}
```

**Use Cases:**
- Update Elasticsearch index for search
- Invalidate search cache
- Send welcome emails to restaurant owner
- Update analytics dashboards
- Notify admin dashboard

---

### 6.2 Dish Domain Events

#### Events
1. **DISH_CREATED** - New dish added to menu
2. **DISH_UPDATED** - Dish details changed
3. **DISH_AVAILABILITY_CHANGED** - Real-time availability updates
4. **DISH_PRICE_UPDATED** - Price change
5. **DISH_DELETED** - Dish removed

**Producers:** Gateway API, Restaurant Service

**Consumers:** MCP Orchestrator (indexing), Search Orchestrator, Gateway API (cache invalidation)

**High-Frequency Event:** `dish.availability.changed`
- Updated frequently during business hours
- Requires efficient processing
- Short retention (3 days)
- Used for real-time menu availability

**Use Cases:**
- Update menu search index
- Invalidate menu caches
- Notify users with dish in cart (if unavailable)
- Update restaurant dashboard

---

### 6.3 Order Domain Events

#### Events
1. **ORDER_CREATED** - New order placed
2. **ORDER_CONFIRMED** - Restaurant confirmed order
3. **ORDER_PREPARING** - Order is being prepared
4. **ORDER_READY** - Order ready for pickup/delivery
5. **ORDER_OUT_FOR_DELIVERY** - Order dispatched
6. **ORDER_DELIVERED** - Order delivered successfully
7. **ORDER_CANCELLED** - Order cancelled

**Producers:** Gateway API, Order Service

**Consumers:** Notification Service, Analytics, Temporal (fulfillment workflow), Order Processor

**Use Cases:**
- Trigger order fulfillment workflow
- Send status notifications to customer
- Send notifications to restaurant
- Update user order history
- Analytics and reporting
- Assign delivery partner

**Retention:** 30 days (order lifecycle tracking)

---

### 6.4 Payment Domain Events

#### Events
1. **PAYMENT_INITIATED** - Payment process started
2. **PAYMENT_PROCESSING** - Payment in progress
3. **PAYMENT_COMPLETED** - Payment successful
4. **PAYMENT_FAILED** - Payment declined/failed
5. **PAYMENT_REFUND_INITIATED** - Refund started
6. **PAYMENT_REFUNDED** - Refund processed

**Producers:** Gateway API, Payment Service

**Consumers:** Order Service, Analytics, Finance Service, Notification Service

**Use Cases:**
- Complete order placement after payment
- Financial reconciliation
- Fraud detection monitoring
- Revenue analytics
- Customer notifications
- Refund processing

**Retention:** 90 days (financial compliance requirement)

---

### 6.5 User Domain Events

#### Events
1. **USER_REGISTERED** - New user signed up
2. **USER_VERIFIED** - Email verified
3. **USER_PROFILE_UPDATED** - Profile changed
4. **PASSWORD_RESET_REQUESTED** - Password reset initiated
5. **PASSWORD_RESET_COMPLETED** - Password reset successful
6. **USER_SUSPENDED** - User suspended
7. **USER_ACTIVATED** - User activated

**Producers:** Gateway API, User Service

**Consumers:** Notification Service, Temporal (onboarding workflow), Analytics

**Use Cases:**
- Trigger user onboarding workflow
- Send welcome email
- Initialize user preferences
- Send verification emails
- Security alerts

**Retention:** 30 days

---

## 7. Producer Architecture

### 7.1 KafkaService Implementation

**Location:** `apps/gateway-api/src/events/kafka.service.ts`

```typescript
@Injectable()
export class KafkaService {
  private producer: Producer;

  async publish(topic: string, event: BaseEvent): Promise<void> {
    // Validate schema
    const validated = this.validateEventSchema(event);

    await this.producer.send({
      topic,
      messages: [{
        key: event.data.id,  // Partition key
        value: JSON.stringify(validated),
        headers: {
          'correlation-id': event.correlationId,
          'event-type': event.eventType,
          'event-version': event.version,
        }
      }]
    });
  }
}
```

### 7.2 Producer Configuration

**Location:** `apps/gateway-api/src/config/kafka.config.ts`

```typescript
{
  clientId: 'gateway-api',
  brokers: ['localhost:9092'],
  connectionTimeout: 30000,
  requestTimeout: 25000,
  retry: {
    retries: 5,
    initialRetryTime: 100,
    maxRetryTime: 30000,
    factor: 2,
    multiplier: 1.5,
    retryForever: false
  },
  // Production settings
  acks: 'all',          // Wait for all in-sync replicas
  idempotence: true,    // Prevent duplicate sends
  compression: 'snappy' // Reduce network bandwidth
}
```

### 7.3 Event Producers

| Producer | Location | Topics | Purpose |
|----------|----------|--------|---------|
| OrderEventProducer | `producers/order-event.producer.ts` | order.created, order.status.changed | Order lifecycle events |
| RestaurantEventProducer | `producers/restaurant-event.producer.ts` | restaurant.created, restaurant.updated, restaurant.deleted | Restaurant CRUD events |
| DishEventProducer | `producers/dish-event.producer.ts` | dish.created, dish.updated, dish.availability.changed | Dish CRUD events |
| PaymentEventProducer | `producers/payment-event.producer.ts` | payment.completed, payment.failed, payment.refunded | Payment lifecycle events |
| UserEventProducer | `producers/user-event.producer.ts` | user.registered | User lifecycle events |

### 7.4 Publishing Example

```typescript
import { OrderCreatedEventSchema, KAFKA_TOPICS } from '@foodbot/events';
import { v4 as uuidv4 } from 'uuid';

// Create event
const event = {
  eventId: uuidv4(),
  timestamp: new Date().toISOString(),
  source: 'gateway-api',
  correlationId: requestContext.correlationId,
  version: '1.0.0',
  type: 'order.created',
  data: {
    orderId: order.id,
    userId: order.userId,
    restaurantId: order.restaurantId,
    items: order.items,
    total: order.total,
  },
};

// Validate schema
const validated = OrderCreatedEventSchema.parse(event);

// Publish to Kafka
await producer.send({
  topic: KAFKA_TOPICS.ORDER_CREATED,
  messages: [{
    key: order.id,          // Partition key
    value: JSON.stringify(validated),
    headers: {
      'correlation-id': requestContext.correlationId,
    },
  }],
});
```

---

## 8. Consumer Architecture

### 8.1 Consumer Groups

| Group ID | Service | Subscribed Topics | Purpose | Concurrency |
|----------|---------|-------------------|---------|-------------|
| `mcp-indexer` | MCP Orchestrator | restaurant.*, dish.* | Elasticsearch indexing | 3-5 |
| `notification-service` | Notification Service | order.*, payment.*, user.* | Customer notifications | 5-10 |
| `order-processor` | Gateway API | order.status.changed | Order state updates | 3-5 |
| `analytics-consumer` | Analytics (planned) | All topics | Analytics pipeline | 2-4 |
| `gateway-api` | Gateway API | Various | Event-driven updates | 3-5 |

### 8.2 Consumer Implementation - MCP Orchestrator (Java)

**Location:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/`

```java
@KafkaListener(
    topics = {"restaurant.created", "restaurant.updated"},
    groupId = "mcp-indexer",
    containerFactory = "kafkaListenerContainerFactory"
)
public void consumeRestaurantEvent(ConsumerRecord<String, String> record) {
    RestaurantEvent event = objectMapper.readValue(record.value(), RestaurantEvent.class);

    // Validate schema
    validateEvent(event);

    // Index to Elasticsearch
    elasticsearchService.indexRestaurant(event.getData());

    // Invalidate cache
    cacheInvalidator.invalidateRestaurant(event.getData().getId());
}
```

**BulkIndexer:**
- Batches Elasticsearch index operations for efficiency
- Batch size: 100 documents
- Flush interval: 5 seconds
- Async processing with error handling
- Failed documents sent to DLQ

### 8.3 Consumer Implementation - Notification Service (TypeScript)

**Location:** `services/notification-service/src/consumers/`

```typescript
@Consumer({
  topics: ['order.created', 'order.status.changed'],
  groupId: 'notification-service'
})
export class OrderEventConsumer {
  async consume(message: KafkaMessage): Promise<void> {
    const event = OrderEventSchema.parse(JSON.parse(message.value));

    switch (event.eventType) {
      case 'order.created':
        await this.sendOrderConfirmation(event);
        break;
      case 'order.status.changed':
        await this.sendOrderStatusUpdate(event);
        break;
    }
  }
}
```

### 8.4 Consumer Configuration

**MCP Orchestrator (Java):**
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: mcp-orchestrator-group
      auto-offset-reset: earliest
      enable-auto-commit: false
      max-poll-records: 100
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
    listener:
      ack-mode: manual
      concurrency: 3
```

**Notification Service (TypeScript):**
```typescript
{
  clientId: 'notification-service',
  groupId: 'notification-service-group',
  brokers: ['localhost:9092'],
  connectionTimeout: 30000,
  sessionTimeout: 30000,
  enableAutoCommit: false,
  maxPollRecords: 100,
}
```

---

## 9. Dead Letter Queue Architecture

### 9.1 DLQ Flow

```
Event Processing Error
        ↓
Retry (max 3 times with exponential backoff)
        ↓
Still failing?
        ↓
Send to foodbot.dlq
        ↓
DLQ Monitor alerts ops team
        ↓
Manual investigation
        ↓
Fix issue & replay event
```

### 9.2 DLQ Message Structure

```typescript
interface DLQMessage {
  originalTopic: string;
  originalPartition: number;
  originalOffset: number;
  originalKey: string;
  originalValue: string;
  errorMessage: string;
  errorStackTrace: string;
  retryCount: number;
  failedAt: string;
  correlationId: string;
}
```

### 9.3 DLQ Service

**Location:** `apps/gateway-api/src/events/dlq/dead-letter-queue.service.ts`

```typescript
@Injectable()
export class DeadLetterQueueService {
  async sendToDLQ(message: ConsumeMessage, error: Error, retryCount: number): Promise<void> {
    const dlqMessage: DLQMessage = {
      originalTopic: message.topic,
      originalPartition: message.partition,
      originalOffset: message.offset,
      originalKey: message.key?.toString(),
      originalValue: message.value?.toString(),
      errorMessage: error.message,
      errorStackTrace: error.stack,
      retryCount,
      failedAt: new Date().toISOString(),
      correlationId: message.headers['correlation-id']
    };

    await this.kafkaService.publish('foodbot.dlq', dlqMessage);
  }
}
```

### 9.4 Event Replay Service

**Location:** `apps/gateway-api/src/events/dlq/event-replay.service.ts`

**Capabilities:**
- Replay all DLQ messages
- Replay messages from specific topic offset
- Replay messages by time range
- Replay specific message by ID

```typescript
@Injectable()
export class EventReplayService {
  // Replay all DLQ messages
  async replayDLQ(): Promise<ReplayResult> {
    const messages = await this.fetchDLQMessages();
    const results = await Promise.allSettled(
      messages.map(msg => this.replayMessage(msg))
    );
    return this.summarizeResults(results);
  }

  // Replay from specific offset
  async replayFromOffset(topic: string, partition: number, offset: number): Promise<void> {
    const consumer = this.createReplayConsumer();
    await consumer.seek({ topic, partition, offset });
    // ... replay logic
  }
}
```

**Monitoring:** Alert if DLQ message count > 100

---

## 10. Error Handling & Retry Strategy

### 10.1 Schema Validation Failures

**Handling:**
- Log validation error with full context
- Send to Dead Letter Queue (DLQ)
- Alert on high validation failure rate (>5%)

```typescript
const result = OrderCreatedEventSchema.safeParse(rawEvent);
if (!result.success) {
  logger.error('Schema validation failed', {
    errors: result.error.issues,
    rawEvent,
  });
  await sendToDLQ(message, result.error);
  return;
}
```

### 10.2 Processing Failures

**Retry Strategy:**
- **Transient Errors:** Retry with exponential backoff
- **Permanent Errors:** Send to DLQ after max retries

**Configuration:**
- **Max Retries:** 3 attempts
- **Backoff:** 1s, 2s, 4s (exponential)

```typescript
async consumeWithRetry(message: KafkaMessage): Promise<void> {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      await this.processMessage(message);
      return;
    } catch (error) {
      retries++;
      const backoff = Math.pow(2, retries) * 1000;  // Exponential backoff
      await sleep(backoff);
    }
  }

  // Send to DLQ after exhausting retries
  await this.dlqService.sendToDLQ(message, error, retries);
}
```

### 10.3 Circuit Breaker

Circuit breaker per consumer group prevents cascading failures:

```typescript
const circuitBreaker = new CircuitBreaker(this.processEvent, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000,
});

circuitBreaker.on('open', () => {
  logger.error('Circuit breaker opened for consumer group');
  metrics.increment('circuit_breaker_opened');
});
```

**States:**
- **CLOSED:** Normal operation
- **OPEN:** Fail fast without calling downstream
- **HALF_OPEN:** Testing recovery

---

## 11. Schema Evolution

### 11.1 Versioning Strategy

**Version Field:** `event.version`

**Compatibility Rules:**

1. **Backwards Compatible (No Version Bump):**
   - Add optional fields
   - Add new event types
   - Widen validation rules

2. **Breaking Changes (Version Bump):**
   - Remove fields
   - Change field types
   - Rename fields
   - Narrow validation rules

### 11.2 Consumer Handling

```typescript
if (event.version === '1.0.0') {
  handleV1Event(event);
} else if (event.version === '2.0.0') {
  handleV2Event(event);
} else {
  throw new UnsupportedVersionError(event.version);
}
```

### 11.3 Migration Strategy

- Deploy new consumers that handle both versions
- Gradually migrate producers to new version
- Monitor version distribution
- Deprecate old version after migration period

---

## 12. Performance Optimization

### 12.1 Producer Optimization

**Batch Production:**
```typescript
const messages = orders.map(order => ({
  key: order.id,
  value: JSON.stringify(createOrderEvent(order)),
}));

await producer.sendBatch({
  topicMessages: [{
    topic: KAFKA_TOPICS.ORDER_CREATED,
    messages,
  }],
});
```

**Configuration:**
```typescript
{
  compression: 'snappy',  // Reduce network bandwidth
  batchSize: 16384,       // Batch messages for efficiency (16KB)
  lingerMs: 10,           // Wait 10ms to accumulate batch
  bufferMemory: 33554432, // 32 MB buffer
}
```

### 12.2 Consumer Optimization

**Batch Consumption:**
```typescript
await consumer.run({
  eachBatch: async ({ batch }) => {
    await Promise.all(batch.messages.map(processMessage));
  },
  eachBatchAutoResolve: true,
  maxBatchSize: 100,
});
```

**Configuration:**
```typescript
{
  fetchMinBytes: 1024,    // Wait for 1KB before fetching
  fetchMaxWaitMs: 500,    // Max wait 500ms for data
  maxPartitionFetchBytes: 1048576,  // 1 MB per partition
}
```

### 12.3 Elasticsearch Bulk Indexing

- Bulk indexing with batch size 100
- Async indexing to prevent blocking
- 5-second flush interval
- Failed documents sent to DLQ

---

## 13. Monitoring & Observability

### 13.1 Event Metrics

**Location:** `apps/gateway-api/src/events/monitoring/event-metrics.service.ts`

**Tracked Metrics:**
- Messages produced per topic
- Messages consumed per consumer group
- Consumer lag per partition
- DLQ message count
- Processing latency (p50, p95, p99)
- Error rate per topic
- Producer throughput
- Consumer throughput
- Schema validation failure rate
- Circuit breaker state

**Producer Metrics:**
- `kafka.producer.messages_sent` (by topic)
- `kafka.producer.send_latency_ms` (p95, p99)
- `kafka.producer.errors` (by error type)

**Consumer Metrics:**
- `kafka.consumer.messages_consumed` (by topic, group)
- `kafka.consumer.processing_latency_ms`
- `kafka.consumer.lag` (by topic, partition)
- `kafka.consumer.errors` (by error type)

**Broker Metrics:**
- Topic partition count
- Replication health
- Disk usage
- Network throughput

**Metrics Endpoint:**
```
GET /actuator/prometheus
```

### 13.2 Health Checks

```typescript
@Injectable()
export class KafkaHealthIndicator {
  async check(): Promise<HealthIndicatorResult> {
    const isConnected = await this.kafkaService.isConnected();
    const consumerLag = await this.getConsumerLag();

    return {
      kafka: {
        status: isConnected && consumerLag < 1000 ? 'up' : 'down',
        connected: isConnected,
        consumerLag,
      }
    };
  }
}
```

### 13.3 Logging

**Producer Logs:**
- Event published (with event ID)
- Schema validation success/failure
- Send errors

**Consumer Logs:**
- Event received (with offset)
- Processing started/completed
- Processing errors with context

**Log Format (Structured JSON):**
```json
{
  "level": "info",
  "timestamp": "2026-02-20T10:30:00.000Z",
  "correlationId": "req-abc-123",
  "provider": "kafka",
  "operation": "consumeEvent",
  "topic": "order.created",
  "partition": 2,
  "offset": 12345,
  "duration": 145,
  "status": "success"
}
```

### 13.4 Alerts

- **High Consumer Lag:** > 1000 messages
- **DLQ Threshold:** > 100 messages
- **High Error Rate:** > 5% of messages
- **Broker Down:** Any broker offline
- **Circuit Breaker Open:** > 10 minutes
- **Schema Validation Failure:** > 5% of messages

### 13.5 Kafka UI

**Access:** `http://localhost:8082` (development)

**Features:**
- Topic browser
- Consumer group lag monitoring
- Message inspection
- Schema registry browser
- Cluster health metrics

---

## 14. Security

### 14.1 Authentication (Production)

**SASL/PLAIN with TLS:**
```yaml
security.protocol: SASL_SSL
sasl.mechanism: PLAIN
sasl.jaas.config: org.apache.kafka.common.security.plain.PlainLoginModule required
  username="${KAFKA_USERNAME}"
  password="${KAFKA_PASSWORD}";
```

### 14.2 Authorization (ACLs)

**Grant produce permission:**
```bash
kafka-acls --add --allow-principal User:gateway-api \
  --operation Write --topic restaurant.created
```

**Grant consume permission:**
```bash
kafka-acls --add --allow-principal User:mcp-orchestrator \
  --operation Read --topic restaurant.created \
  --group mcp-indexer
```

### 14.3 Encryption

- **In Transit:** TLS 1.3 for data in transit
- **At Rest:** Encryption at rest for persistent data
- **Payload:** No secrets in event payloads (use references)

---

## 15. Reliability & Resilience

### 15.1 At-Least-Once Delivery

**Producer Configuration:**
```typescript
{
  acks: 'all',        // Wait for all in-sync replicas
  retries: 3,
  idempotence: true,  // Prevent duplicate sends
}
```

**Consumer Configuration:**
```typescript
{
  enableAutoCommit: false,  // Manual offset commit
  maxPollRecords: 100,
  sessionTimeoutMs: 30000,
}
```

### 15.2 Idempotent Event Processing

All consumers must implement idempotent processing:

```typescript
async processEvent(event: RestaurantCreatedEvent): Promise<void> {
  // Check if already processed
  const alreadyProcessed = await this.cache.get(`processed:${event.eventId}`);
  if (alreadyProcessed) return;

  // Process event
  await this.indexRestaurant(event.data);

  // Mark as processed (TTL: 24 hours)
  await this.cache.set(`processed:${event.eventId}`, true, { ttl: 86400 });
}
```

### 15.3 Disaster Recovery

**Backup Strategy:**
- Kafka retains events per topic retention policy
- Long retention for audit topics (90 days)
- Mirror Maker 2 for cross-datacenter replication (production)

**Recovery Procedures:**
1. **Consumer Group Reset:** Reset consumer group offset to replay events
2. **DLQ Replay:** Replay failed events from DLQ
3. **Offset Rewind:** Rewind consumer offset to specific timestamp
4. **Full Rebuild:** Rebuild Elasticsearch index from Kafka (if needed)

---

## 16. Testing

### 16.1 Unit Tests

**Schema Validation Tests:**
```typescript
describe('Event Schemas', () => {
  it('should validate valid order.created event', () => {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: 'gateway-api',
      correlationId: uuidv4(),
      version: '1.0.0',
      type: 'order.created',
      data: {
        orderId: uuidv4(),
        userId: uuidv4(),
        // ... valid data
      },
    };

    const result = OrderCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('should reject invalid event', () => {
    const event = { /* missing required fields */ };
    const result = OrderCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});
```

**Coverage:** 100% (all schemas + validation paths)

### 16.2 Integration Tests

```typescript
describe('Kafka Integration', () => {
  it('should produce and consume event', async () => {
    const event = createOrderCreatedEvent();

    // Produce
    await producer.send({
      topic: KAFKA_TOPICS.ORDER_CREATED,
      messages: [{ key: event.data.orderId, value: JSON.stringify(event) }],
    });

    // Consume
    const consumed = await waitForMessage(consumer, KAFKA_TOPICS.ORDER_CREATED);
    expect(consumed).toMatchObject(event);
  });
});
```

---

## 17. Deployment

### 17.1 Development

```bash
# Start local Kafka
docker-compose up kafka zookeeper

# Create topics
npm run kafka:create-topics
```

### 17.2 Production

```bash
# Kafka cluster (managed)
KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092
KAFKA_SASL_USERNAME=foodbot-producer
KAFKA_SASL_PASSWORD=***
```

**High Availability:**
- 3+ brokers
- Replication factor: 3
- Min in-sync replicas: 2

---

## Related Documentation

- [Event Schemas Reference](../../requirements/workflows/EVENT-SCHEMAS.md)
- [Temporal Workflow Integration](./temporal-workflows-architecture-consolidated.md)
- [MCP Architecture](./mcp-architecture-consolidated.md)
- [Producer/Consumer Best Practices](./kafka-best-practices.md)

---

## Migration Notes

**This document consolidates:**
1. `kafka-event-architecture.md` - Event patterns, schemas, core concepts
2. `kafka-event-streaming.md` - Cluster configuration, DLQ, monitoring
3. `kafka-events.md` - Topic specifications, event schemas, consumers

**Deprecated files moved to:** `.claude/project-management/archive/architecture/integration/`

**Changes from originals:**
- Merged all unique content from 3 files
- Removed duplicate sections
- Standardized formatting
- Updated cross-references
- Added comprehensive table of contents

---

**Document Owner:** Backend Team, DevOps Team
**Reviewers:** Architecture Team
**Next Review:** 2026-03-20

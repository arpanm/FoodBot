# Kafka Event-Driven Architecture

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Implemented ✅

---

## Overview

FoodBot implements a robust event-driven architecture using Apache Kafka for asynchronous communication between microservices. This enables loose coupling, scalability, and real-time data propagation across the platform.

---

## Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│  Producer   │────────▶│    Kafka    │────────▶│  Consumers   │
│  Services   │         │   Brokers   │         │  (Multiple)  │
└─────────────┘         └─────────────┘         └──────────────┘
     │                        │                         │
     │                        │                         │
  Gateway API           Topic Partitions          MCP Indexer
  Order Service         Replication              Notification Svc
  Payment Service       Consumer Groups          Analytics
  Restaurant Svc                                  Order Processor
```

---

## Event Schema Package (`@foodbot/events`)

### Structure

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

---

## Core Concepts

### 1. Event Schema Design

**Base Event Structure:**
```typescript
{
  eventId: UUID,           // Unique event identifier
  timestamp: ISO8601,      // Event creation time
  source: string,          // Originating service
  correlationId: UUID,     // Request tracing ID
  version: number,         // Schema version
  type: string,            // Event type (e.g., 'order.created')
  data: object             // Event-specific payload
}
```

**Design Principles:**
- **Immutable:** Events never change after creation
- **Self-Contained:** All necessary data in event payload
- **Versioned:** Schema evolution via version field
- **Validated:** Zod schemas enforce structure

---

### 2. Topic Design

**Naming Convention:** `<domain>.<action>`

**Topic Strategy:**
- **Domain-Based:** Each domain has its own topics
- **Action-Based:** Separate topics for different actions
- **Fine-Grained:** Enables selective consumption

**Example Topics:**
- `restaurant.created`
- `dish.availability.changed`
- `order.status.changed`
- `payment.completed`

---

### 3. Partition Strategy

**Partition Key:** Entity ID (guarantees ordering)

**Examples:**
- Restaurant events → partitioned by `restaurantId`
- Order events → partitioned by `orderId`
- Payment events → partitioned by `paymentId`

**Benefits:**
- **Ordering Guarantee:** All events for same entity in order
- **Load Distribution:** Events spread across partitions
- **Parallel Processing:** Different entities processed concurrently

---

### 4. Consumer Groups

**Purpose:** Enable multiple consumers of same topic with load balancing

**FoodBot Consumer Groups:**

| Group ID | Purpose | Subscribed Topics |
|----------|---------|-------------------|
| `mcp-indexer` | Index data in Elasticsearch | Restaurant, dish events |
| `notification-service` | Send notifications | Order, payment events |
| `order-processor` | Process order workflows | Order events |
| `analytics-consumer` | Aggregate metrics | All events |
| `gateway-api` | Update internal state | User, order events |

---

## Topic Configuration

### Production Topology

| Topic | Partitions | Replication Factor | Retention | Use Case |
|-------|------------|-------------------|-----------|----------|
| `restaurant.created` | 6 | 3 | 7 days | Restaurant indexing |
| `restaurant.updated` | 6 | 3 | 7 days | Search cache invalidation |
| `restaurant.deleted` | 3 | 3 | 30 days | Cleanup and archival |
| `dish.created` | 6 | 3 | 7 days | Menu indexing |
| `dish.updated` | 6 | 3 | 7 days | Menu cache invalidation |
| `dish.availability.changed` | 12 | 3 | 3 days | Real-time availability |
| `order.created` | 12 | 3 | 30 days | Order processing |
| `order.status.changed` | 12 | 3 | 30 days | Status notifications |
| `payment.completed` | 12 | 3 | 90 days | Financial reconciliation |
| `payment.failed` | 6 | 3 | 90 days | Failure analysis |
| `payment.refunded` | 6 | 3 | 90 days | Refund tracking |
| `user.registered` | 6 | 3 | 30 days | User onboarding |
| `foodbot.dlq` | 3 | 3 | 90 days | Dead letter queue |

**Configuration Rationale:**
- **Partitions:** Based on expected throughput
- **Replication:** 3x for high availability
- **Retention:** Based on data sensitivity and compliance

---

## Event Domains

### 1. Restaurant Domain Events

#### Events:
1. `restaurant.created` - New restaurant onboarded
2. `restaurant.updated` - Restaurant details changed
3. `restaurant.deleted` - Restaurant removed from platform

**Producers:** Restaurant Service, Admin Service
**Consumers:** MCP Indexer, Gateway API, Analytics

**Use Cases:**
- Update Elasticsearch index
- Invalidate search cache
- Send welcome emails
- Update analytics dashboards

---

### 2. Dish Domain Events

#### Events:
1. `dish.created` - New dish added to menu
2. `dish.updated` - Dish details changed
3. `dish.availability.changed` - Real-time availability updates

**Producers:** Restaurant Service
**Consumers:** MCP Indexer, Gateway API (cache invalidation)

**Use Cases:**
- Update menu search index
- Invalidate menu caches
- Notify users with dish in cart (unavailable)

**High-Frequency Event:** `dish.availability.changed`
- Updated frequently during business hours
- Requires efficient processing
- Short retention (3 days)

---

### 3. Order Domain Events

#### Events:
1. `order.created` - New order placed
2. `order.status.changed` - Order status updated

**Producers:** Gateway API, Order Service
**Consumers:** Notification Service, Analytics, Temporal (fulfillment workflow)

**Use Cases:**
- Trigger order fulfillment workflow
- Send status notifications
- Update user order history
- Analytics and reporting

---

### 4. Payment Domain Events

#### Events:
1. `payment.completed` - Payment successful
2. `payment.failed` - Payment declined/failed
3. `payment.refunded` - Refund processed

**Producers:** Payment Service
**Consumers:** Order Service, Analytics, Finance Service

**Use Cases:**
- Complete order placement
- Financial reconciliation
- Fraud detection monitoring
- Revenue analytics

**Retention:** 90 days (financial compliance)

---

### 5. User Domain Events

#### Events:
1. `user.registered` - New user signed up

**Producers:** User Service, Gateway API
**Consumers:** Notification Service, Temporal (onboarding workflow), Analytics

**Use Cases:**
- Trigger user onboarding workflow
- Send welcome email
- Initialize user preferences

---

## Producer Implementation

### Example: Publishing an Event

```typescript
import { OrderCreatedEventSchema, KAFKA_TOPICS } from '@foodbot/events';
import { v4 as uuidv4 } from 'uuid';

// Create event
const event = {
  eventId: uuidv4(),
  timestamp: new Date().toISOString(),
  source: 'gateway-api',
  correlationId: requestContext.correlationId,
  version: 1,
  type: 'order.created',
  data: {
    orderId: order.id,
    userId: order.userId,
    restaurantId: order.restaurantId,
    items: order.items,
    total: order.total,
    // ... other fields
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

## Consumer Implementation

### Example: Consuming Events

```typescript
import { OrderCreatedEventSchema, CONSUMER_GROUPS } from '@foodbot/events';

const consumer = kafka.consumer({ groupId: CONSUMER_GROUPS.NOTIFICATION_SERVICE });

await consumer.subscribe({
  topics: [KAFKA_TOPICS.ORDER_CREATED],
  fromBeginning: false,
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      // Deserialize
      const rawEvent = JSON.parse(message.value.toString());

      // Validate
      const event = OrderCreatedEventSchema.parse(rawEvent);

      // Process
      await sendOrderConfirmation(event.data);

      // Commit offset (auto-commit or manual)
    } catch (error) {
      // Log error
      logger.error('Event processing failed', { error, message });

      // Send to DLQ after retries
      if (shouldSendToDLQ(error)) {
        await sendToDLQ(message);
      }
    }
  },
});
```

---

## Error Handling

### 1. Schema Validation Failures

**Handling:**
- Log validation error with full context
- Send to Dead Letter Queue (DLQ)
- Alert on high validation failure rate

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

---

### 2. Processing Failures

**Retry Strategy:**
- **Transient Errors:** Retry with exponential backoff
- **Permanent Errors:** Send to DLQ after max retries

**Max Retries:** 3 attempts
**Backoff:** 1s, 2s, 4s

---

### 3. Dead Letter Queue (DLQ)

**Topic:** `foodbot.dlq`

**DLQ Message Format:**
```typescript
{
  originalTopic: string,
  partition: number,
  offset: number,
  timestamp: string,
  error: {
    message: string,
    stack: string,
    type: 'validation' | 'processing',
  },
  originalMessage: object,
  retryCount: number,
}
```

**Monitoring:** Alert if DLQ message count > 100

---

## Schema Evolution

### Versioning Strategy

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

**Consumer Handling:**
```typescript
if (event.version === 1) {
  handleV1Event(event);
} else if (event.version === 2) {
  handleV2Event(event);
} else {
  throw new UnsupportedVersionError(event.version);
}
```

---

## Performance Optimization

### 1. Batch Production
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

### 2. Consumer Prefetching
```typescript
await consumer.run({
  eachBatch: async ({ batch }) => {
    await Promise.all(batch.messages.map(processMessage));
  },
  eachBatchAutoResolve: true,
  maxBatchSize: 100,
});
```

### 3. Compression
```typescript
await producer.send({
  topic,
  messages,
  compression: CompressionTypes.GZIP,
});
```

---

## Monitoring & Observability

### Metrics

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

### Logging

**Producer Logs:**
- Event published (with event ID)
- Schema validation success/failure
- Send errors

**Consumer Logs:**
- Event received (with offset)
- Processing started/completed
- Processing errors with context

### Alerts

- **High Consumer Lag:** > 1000 messages
- **DLQ Threshold:** > 100 messages
- **High Error Rate:** > 5% of messages
- **Broker Down:** Any broker offline

---

## Security

### 1. Authentication
- SASL/SCRAM for client authentication
- TLS for in-transit encryption

### 2. Authorization
- ACLs for topic access control
- Producer/consumer permissions per service

### 3. Data Encryption
- TLS for data in transit
- Encryption at rest (broker-level)

---

## Testing

### Unit Tests

```typescript
describe('Event Schemas', () => {
  it('should validate valid order.created event', () => {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: 'gateway-api',
      correlationId: uuidv4(),
      version: 1,
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

---

### Integration Tests

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

## Deployment

### Development
```bash
# Start local Kafka
docker-compose up kafka zookeeper

# Create topics
npm run kafka:create-topics
```

### Production
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
- [Temporal Workflow Integration](./temporal-workflows-architecture.md)
- [Producer/Consumer Best Practices](./kafka-best-practices.md)

---

**Authored By:** Integration Architecture Team
**Review Cycle:** Quarterly

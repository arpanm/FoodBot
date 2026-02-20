# Kafka Event Streaming Architecture

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Active

---

## Overview

FoodBot uses Apache Kafka 7.5 (Confluent Platform) for event-driven communication between microservices. Kafka serves as the backbone for real-time data synchronization, notification dispatch, and audit trails.

## Architecture Diagram

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

---

## Kafka Cluster Configuration

### Development Environment

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

### Production Environment

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

---

## Event Schema Architecture

### Base Event Schema

All events extend the base event schema defined in `packages/events/src/schemas/base-event.ts`:

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

### Event Schema Validation

Schemas are validated using Zod at both producer and consumer:

```typescript
// Producer side validation
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

// Consumer side validation
const raw = JSON.parse(message.value.toString());
const event = RestaurantCreatedEventSchema.parse(raw);
await handleRestaurantCreated(event);
```

---

## Topic Architecture

### Topic Naming Convention

Format: `<domain>.<action>`

Examples:
- `restaurant.created`
- `dish.availability.changed`
- `order.status.changed`
- `payment.completed`

### Topic Configuration

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

### Partition Strategy

Events for the same entity are routed to the same partition using the entity ID as the partition key:

```typescript
await producer.send({
  topic: 'order.created',
  messages: [{
    key: orderId,  // Ensures all events for this order go to same partition
    value: JSON.stringify(event)
  }]
});
```

Benefits:
- Maintains event ordering per entity
- Enables parallel processing across entities
- Scales horizontally by adding partitions

---

## Producer Architecture

### Producer Implementation

Location: `apps/gateway-api/src/events/`

**KafkaService** (`kafka.service.ts`):
- Manages Kafka client connection
- Provides `publish()` method for producing events
- Handles connection pooling and error handling
- Implements retry logic with exponential backoff

```typescript
@Injectable()
export class KafkaService {
  private producer: Producer;

  async publish(topic: string, event: BaseEvent): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{
        key: event.data.id,
        value: JSON.stringify(event),
        headers: {
          'correlation-id': event.correlationId,
          'event-type': event.eventType,
        }
      }]
    });
  }
}
```

### Event Producers

| Producer | Location | Topics | Purpose |
|----------|----------|--------|---------|
| OrderEventProducer | `producers/order-event.producer.ts` | order.created, order.status.changed | Order lifecycle events |
| RestaurantEventProducer | `producers/restaurant-event.producer.ts` | restaurant.created, restaurant.updated, restaurant.deleted | Restaurant CRUD events |
| DishEventProducer | `producers/dish-event.producer.ts` | dish.created, dish.updated, dish.availability.changed | Dish CRUD events |
| PaymentEventProducer | `producers/payment-event.producer.ts` | payment.completed, payment.failed, payment.refunded | Payment lifecycle events |
| UserEventProducer | `producers/user-event.producer.ts` | user.registered | User lifecycle events |

---

## Consumer Architecture

### Consumer Groups

| Group ID | Service | Subscribed Topics | Purpose |
|----------|---------|-------------------|---------|
| `mcp-indexer` | MCP Orchestrator | restaurant.*, dish.* | Elasticsearch indexing |
| `notification-service` | Notification Service | order.*, payment.*, user.* | Customer notifications |
| `order-processor` | Gateway API | order.status.changed | Order state updates |
| `analytics-consumer` | Analytics (planned) | All topics | Analytics pipeline |
| `gateway-api` | Gateway API | Various | Event-driven updates |

### Consumer Implementation - MCP Orchestrator (Java)

Location: `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/`

**RestaurantEventConsumer**:
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

**BulkIndexer**:
- Batches Elasticsearch index operations for efficiency
- Batch size: 100 documents
- Flush interval: 5 seconds
- Async processing with error handling
- Failed documents sent to DLQ

### Consumer Implementation - Notification Service (TypeScript)

Location: `services/notification-service/src/consumers/`

**OrderEventConsumer**:
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

---

## Dead Letter Queue (DLQ) Architecture

### DLQ Flow

```
Event Processing Error
        ↓
Retry (max 3 times)
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

### DLQ Message Structure

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

### DLQ Service

Location: `apps/gateway-api/src/events/dlq/dead-letter-queue.service.ts`

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

---

## Event Replay Architecture

### Event Replay Service

Location: `apps/gateway-api/src/events/dlq/event-replay.service.ts`

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

---

## Monitoring and Observability

### Event Metrics

Location: `apps/gateway-api/src/events/monitoring/event-metrics.service.ts`

**Tracked Metrics:**
- Messages produced per topic
- Messages consumed per consumer group
- Consumer lag per partition
- DLQ message count
- Processing latency (p50, p95, p99)
- Error rate per topic
- Producer throughput
- Consumer throughput

**Metrics Endpoint:**
```
GET /actuator/prometheus
```

### Health Checks

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

### Kafka UI

Access Kafka UI at: `http://localhost:8082` (development)

Features:
- Topic browser
- Consumer group lag monitoring
- Message inspection
- Schema registry browser
- Cluster health metrics

---

## Reliability and Resilience

### At-Least-Once Delivery

**Producer Configuration:**
```typescript
{
  acks: 'all',  // Wait for all in-sync replicas
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

### Idempotent Event Processing

All consumers must implement idempotent processing:

```typescript
async processEvent(event: RestaurantCreatedEvent): Promise<void> {
  // Check if already processed
  const alreadyProcessed = await this.cache.get(`processed:${event.eventId}`);
  if (alreadyProcessed) return;

  // Process event
  await this.indexRestaurant(event.data);

  // Mark as processed
  await this.cache.set(`processed:${event.eventId}`, true, { ttl: 86400 });
}
```

### Circuit Breaker

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

### Retry Strategy

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
      const backoff = Math.pow(2, retries) * 100;  // Exponential backoff
      await sleep(backoff);
    }
  }

  // Send to DLQ after exhausting retries
  await this.dlqService.sendToDLQ(message, error, retries);
}
```

---

## Security

### Authentication (Production)

```yaml
security.protocol: SASL_SSL
sasl.mechanism: PLAIN
sasl.jaas.config: org.apache.kafka.common.security.plain.PlainLoginModule required
  username="${KAFKA_USERNAME}"
  password="${KAFKA_PASSWORD}";
```

### Authorization (ACLs)

```bash
# Grant produce permission
kafka-acls --add --allow-principal User:gateway-api \
  --operation Write --topic restaurant.created

# Grant consume permission
kafka-acls --add --allow-principal User:mcp-orchestrator \
  --operation Read --topic restaurant.created \
  --group mcp-indexer
```

### Encryption

- TLS 1.3 for data in transit
- Encryption at rest for persistent data
- No secrets in event payloads

---

## Performance Optimization

### Producer Optimization

```typescript
{
  compression: 'snappy',  // Reduce network bandwidth
  batchSize: 16384,       // Batch messages for efficiency
  lingerMs: 10,           // Wait 10ms to accumulate batch
  bufferMemory: 33554432, // 32 MB buffer
}
```

### Consumer Optimization

```typescript
{
  fetchMinBytes: 1024,    // Wait for 1KB before fetching
  fetchMaxWaitMs: 500,    // Max wait 500ms for data
  maxPartitionFetchBytes: 1048576,  // 1 MB per partition
}
```

### Index Optimization (Elasticsearch)

- Bulk indexing with batch size 100
- Async indexing to prevent blocking
- 5-second flush interval
- Failed documents sent to DLQ

---

## Disaster Recovery

### Backup Strategy

- Kafka retains events per topic retention policy
- Long retention for audit topics (90 days)
- Mirror Maker 2 for cross-datacenter replication (production)

### Recovery Procedures

1. **Consumer Group Reset**: Reset consumer group offset to replay events
2. **DLQ Replay**: Replay failed events from DLQ
3. **Offset Rewind**: Rewind consumer offset to specific timestamp
4. **Full Rebuild**: Rebuild Elasticsearch index from Kafka (if needed)

---

## Related Documentation

- [Event Streaming Requirements](../../requirements/workflows/event-streaming-requirements.md)
- [Search Architecture](./elasticsearch-search.md)
- [System Architecture](../system-architecture.md)
- [packages/events README](../../../packages/events/README.md)

---

**Document Owner:** Backend Team, DevOps Team
**Reviewers:** Architecture Team
**Next Review:** 2026-03-20

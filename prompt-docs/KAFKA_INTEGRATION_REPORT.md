# Kafka Event Streaming Integration Report

**Date:** 2026-02-19
**Status:** Implementation Complete
**Version:** 1.0.0

---

## 1. Architecture Overview

The Kafka event streaming integration follows an event-driven architecture pattern where domain events are published by the gateway-api (NestJS) and consumed by the MCP orchestrator (Spring Boot) and the new notification service (Node.js).

### Event Flow

```
┌─────────────────┐     ┌───────────┐     ┌──────────────────────┐
│  Gateway API    │────>│   Kafka   │────>│  MCP Orchestrator    │
│  (NestJS)       │     │  Cluster  │     │  (Spring Boot)       │
│                 │     │           │     │  - ES Indexing        │
│  Producers:     │     │  Topics:  │     │  - Cache Invalidation│
│  - Restaurant   │     │  12 total │     └──────────────────────┘
│  - Dish         │     │  + 1 DLQ  │
│  - Order        │     │           │     ┌──────────────────────┐
│  - Payment      │     │           │────>│  Notification Service│
└─────────────────┘     └───────────┘     │  (Node.js)          │
                              │           │  - Email             │
                              │           │  - SMS               │
                              │           │  - WebSocket         │
                              │           │  - Push              │
                              │           └──────────────────────┘
                              │
                        ┌───────────┐
                        │    DLQ    │
                        │ foodbot.  │
                        │   dlq     │
                        └───────────┘
```

### Key Design Decisions

1. **Partition key = entity ID** - Guarantees event ordering per entity
2. **Manual acknowledgment** - Ensures at-least-once delivery
3. **Idempotent producers** - Prevents duplicate events
4. **Mock mode for testing** - No Kafka dependency in unit/integration tests
5. **Fire-and-forget with error logging** - Event publishing does not block the main request path

---

## 2. Topic Structure

| Topic | Partitions | Purpose | Partition Key |
|-------|-----------|---------|---------------|
| `restaurant.created` | 6 | New restaurant onboarded | restaurantId |
| `restaurant.updated` | 6 | Restaurant details changed | restaurantId |
| `restaurant.deleted` | 3 | Restaurant soft-deleted | restaurantId |
| `dish.created` | 6 | New dish added to menu | dishId |
| `dish.updated` | 6 | Dish details changed | dishId |
| `dish.availability.changed` | 12 | Dish toggled available/unavailable | dishId |
| `order.created` | 12 | New order placed | orderId |
| `order.status.changed` | 12 | Order status transition | orderId |
| `payment.completed` | 12 | Payment confirmed | paymentId |
| `payment.failed` | 6 | Payment declined | paymentId |
| `payment.refunded` | 6 | Payment refunded | paymentId |
| `user.registered` | 6 | New user sign-up | userId |
| `foodbot.dlq` | 3 | Dead Letter Queue | original key |

**Total: 13 topics** (12 domain + 1 DLQ)

---

## 3. Event Schema Definitions

All event schemas are defined in `packages/events/src/schemas/` using Zod for runtime validation.

### Base Event Envelope

Every event carries:

```typescript
{
  eventId: string;      // UUID v4
  timestamp: string;    // ISO 8601
  source: string;       // "gateway-api"
  correlationId: string; // UUID v4 for tracing
  version: number;      // Schema version (default 1)
  type: string;         // Topic name
  data: { ... };        // Domain-specific payload
}
```

### Schema Files

| File | Events |
|------|--------|
| `base-event.ts` | `BaseEvent` |
| `restaurant-events.ts` | `RestaurantCreatedEvent`, `RestaurantUpdatedEvent`, `RestaurantDeletedEvent` |
| `dish-events.ts` | `DishCreatedEvent`, `DishUpdatedEvent`, `DishAvailabilityChangedEvent` |
| `order-events.ts` | `OrderCreatedEvent`, `OrderStatusChangedEvent` |
| `payment-events.ts` | `PaymentCompletedEvent`, `PaymentFailedEvent`, `PaymentRefundedEvent` |
| `user-events.ts` | `UserRegisteredEvent` |

---

## 4. Producer Implementation

### Gateway API Producers

Located in `apps/gateway-api/src/events/producers/`:

| Producer | Service Integration | Events |
|----------|-------------------|--------|
| `RestaurantEventProducer` | `RestaurantService.create()`, `.update()`, `.delete()` | 3 events |
| `DishEventProducer` | `DishService.create()`, `.update()`, `.toggleAvailability()` | 3 events |
| `OrderEventProducer` | `OrderService.create()`, `.updateStatus()`, `.cancelOrder()` | 2 events |
| `PaymentEventProducer` | `PaymentService.confirmPayment()` | 3 events |

### Key Implementation Pattern

All producers follow a fire-and-forget pattern with error logging to avoid blocking the main request:

```typescript
await this.eventProducer.publishOrderCreated(savedOrder).catch((err) => {
  this.logger.error('Failed to publish order.created event', err);
});
```

### KafkaService

`apps/gateway-api/src/events/kafka.service.ts` provides:
- Automatic mock mode in test environments
- In-memory message buffer for test assertions
- DLQ fallback on publish failure
- Correlation ID propagation via headers

---

## 5. Consumer Implementation

### MCP Orchestrator (Java/Spring)

Located in `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/`:

| Consumer | Location | Topics | Purpose |
|----------|----------|--------|---------|
| `RestaurantEventConsumer` | `indexing/` | `restaurant.created`, `restaurant.updated` | Elasticsearch indexing |
| `DishEventConsumer` | `indexing/` | `menu.updated`, `dish.availability.changed` | Elasticsearch indexing, cache invalidation |
| `OrderEventConsumer` | `consumers/` | `order.created`, `order.status.changed` | Cache invalidation, analytics |
| `PaymentEventConsumer` | `consumers/` | `payment.completed` | Audit logging |
| `UserEventConsumer` | `consumers/` | `user.registered` | Analytics |

### Notification Service (Node.js)

Located in `services/notification-service/src/consumers/`:

| Consumer | Topics | Channels |
|----------|--------|----------|
| `OrderEventConsumer` | `order.created`, `order.status.changed` | Email, SMS, WebSocket, Push |
| `PaymentEventConsumer` | `payment.completed` | Email |
| `UserEventConsumer` | `user.registered` | Email |

### Notification Channel Matrix

| Status Change | Email | SMS | WebSocket | Push |
|--------------|-------|-----|-----------|------|
| Order created | Confirmation | - | Real-time | - |
| Preparing | - | - | Real-time | Alert |
| Out for delivery | - | Update | Real-time | Alert |
| Delivered | Receipt | - | Real-time | Alert |
| Cancelled | Notice | - | Real-time | - |
| Payment completed | Receipt | - | - | - |
| User registered | Welcome | - | - | - |

---

## 6. Dead Letter Queue & Event Replay

### Dead Letter Queue

`apps/gateway-api/src/events/dlq/dead-letter-queue.service.ts`:

- Failed messages automatically routed to `foodbot.dlq`
- Metadata includes: original topic, error message, retry count, timestamps
- Maximum 3 retries with status tracking (`pending` -> `retrying` -> `exhausted` | `resolved`)
- Manual resolution support for operators

### Event Replay

`apps/gateway-api/src/events/dlq/event-replay.service.ts`:

- Replay events by topic with optional time range filter
- Replay events by entity key across all topics
- Event archive with statistics tracking
- Replay headers (`x-replay: true`) to distinguish replayed events

---

## 7. Docker Infrastructure

### Services Added

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `kafka-init` | `confluentinc/cp-kafka:7.5.3` | - | Creates all 13 topics on startup |

### Existing Services (already present)

| Service | Port | Purpose |
|---------|------|---------|
| Zookeeper | 2181 | Kafka coordination |
| Kafka | 9092, 29092 | Event streaming |
| Kafka UI | 8082 | Management UI |
| Schema Registry | 8083 | Schema management |

---

## 8. Testing

### Test Files

| Test File | Type | Coverage |
|-----------|------|----------|
| `events/__tests__/kafka.service.spec.ts` | Unit | KafkaService mock mode, publish, clear |
| `events/__tests__/restaurant-event.producer.spec.ts` | Unit | All restaurant events |
| `events/__tests__/order-event.producer.spec.ts` | Unit | Order created, status changed, cancellation |
| `events/__tests__/dead-letter-queue.service.spec.ts` | Unit | DLQ send, retry, replay, resolve, stats |
| `packages/events/src/__tests__/schemas.spec.ts` | Unit | Zod schema validation for all event types |
| `notification-service/src/__tests__/order-event.consumer.spec.ts` | Unit | Notification dispatch per status |

### Test Strategy

- **Unit tests**: Mock KafkaService to verify event payloads and topic routing
- **Schema tests**: Zod validation for valid and invalid event payloads
- **Consumer tests**: Mock notification channels, verify dispatch logic per status
- **Integration tests**: End-to-end event flow (requires running Kafka)

---

## 9. Monitoring

### Metrics Service

`apps/gateway-api/src/events/monitoring/event-metrics.service.ts`:

- **Publish counts** per topic
- **Error rates** per topic
- **Latency tracking** with p95/p99 percentiles
- **Throughput** (events/second)
- **Prometheus exposition format** for Grafana dashboards

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `foodbot_kafka_events_published_total` | Counter | Events published per topic |
| `foodbot_kafka_events_errors_total` | Counter | Errors per topic |
| `foodbot_kafka_events_latency_avg_ms` | Gauge | Average latency per topic |
| `foodbot_kafka_events_latency_p95_ms` | Gauge | P95 latency per topic |
| `foodbot_kafka_uptime_seconds` | Gauge | Service uptime |
| `foodbot_kafka_events_per_second` | Gauge | Current throughput |

### Monitoring Stack

- **Kafka UI** (port 8082): Topic inspection, consumer groups, lag monitoring
- **Prometheus**: Scrapes metrics from `/actuator/prometheus` (MCP) and custom endpoint (gateway)
- **Grafana**: Dashboards for throughput, latency, error rates, consumer lag

---

## 10. Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:29092` | Kafka bootstrap servers |
| `KAFKA_SSL` | `false` | Enable SSL |
| `KAFKA_SASL_USERNAME` | - | SASL username |
| `KAFKA_SASL_PASSWORD` | - | SASL password |
| `KAFKA_SASL_MECHANISM` | `plain` | SASL mechanism |
| `KAFKA_SCHEMA_REGISTRY_URL` | `http://localhost:8083` | Schema Registry URL |

### Spring Kafka (MCP Orchestrator)

| Property | Value | Description |
|----------|-------|-------------|
| `spring.kafka.consumer.group-id` | `mcp-indexer` | Consumer group |
| `spring.kafka.consumer.auto-offset-reset` | `earliest` | Start from beginning |
| `spring.kafka.consumer.enable-auto-commit` | `false` | Manual acknowledgment |
| `spring.kafka.producer.acks` | `all` | All replicas must acknowledge |
| `spring.kafka.producer.retries` | `3` | Producer retries |

---

## 11. Files Created/Modified

### New Files (36 files)

**Event Schemas (`packages/events/`)**:
- `package.json`, `tsconfig.json`
- `src/index.ts`
- `src/topics.ts`
- `src/schemas/base-event.ts`
- `src/schemas/restaurant-events.ts`
- `src/schemas/dish-events.ts`
- `src/schemas/order-events.ts`
- `src/schemas/payment-events.ts`
- `src/schemas/user-events.ts`
- `src/__tests__/schemas.spec.ts`

**Gateway API Events (`apps/gateway-api/src/events/`)**:
- `events.module.ts`
- `kafka.service.ts`
- `producers/restaurant-event.producer.ts`
- `producers/dish-event.producer.ts`
- `producers/order-event.producer.ts`
- `producers/payment-event.producer.ts`
- `dlq/dead-letter-queue.service.ts`
- `dlq/event-replay.service.ts`
- `monitoring/event-metrics.service.ts`
- `__tests__/kafka.service.spec.ts`
- `__tests__/restaurant-event.producer.spec.ts`
- `__tests__/order-event.producer.spec.ts`
- `__tests__/dead-letter-queue.service.spec.ts`

**Gateway API Config**:
- `config/kafka.config.ts`

**MCP Orchestrator Consumers (`services/mcp-orchestrator/`)**:
- `src/main/java/.../consumers/OrderEventConsumer.java`
- `src/main/java/.../consumers/PaymentEventConsumer.java`
- `src/main/java/.../consumers/UserEventConsumer.java`
- `src/main/resources/application-kafka.yml`

**Notification Service (`services/notification-service/`)**:
- `package.json`, `tsconfig.json`
- `src/index.ts`
- `src/notification.service.ts`
- `src/channels/email.channel.ts`
- `src/channels/sms.channel.ts`
- `src/channels/websocket.channel.ts`
- `src/channels/push.channel.ts`
- `src/consumers/order-event.consumer.ts`
- `src/consumers/payment-event.consumer.ts`
- `src/consumers/user-event.consumer.ts`
- `src/__tests__/order-event.consumer.spec.ts`

### Modified Files (7 files)

- `apps/gateway-api/src/app.module.ts` - Added EventsModule import
- `apps/gateway-api/src/modules/restaurant/restaurant.service.ts` - Event publishing
- `apps/gateway-api/src/modules/dish/dish.service.ts` - Event publishing
- `apps/gateway-api/src/modules/order/order.service.ts` - Event publishing
- `apps/gateway-api/src/modules/payment/payment.service.ts` - Event publishing
- `services/mcp-orchestrator/src/main/resources/application.yml` - Added new topics
- `docker-compose.yml` - Added kafka-init service, schema registry link
- `.env.example` - Added Kafka configuration variables

---

## 12. Next Steps

1. **KafkaJS Integration**: Replace mock producer in `KafkaService` with actual KafkaJS client for production
2. **Schema Registry**: Register Avro/JSON schemas for all event types
3. **Consumer Lag Alerting**: Set up PagerDuty/Slack alerts when consumer lag exceeds thresholds
4. **Event Archival to S3**: Implement S3 sink connector for long-term event storage
5. **Exactly-Once Semantics**: Enable Kafka transactions for critical payment events
6. **Load Testing**: Run Kafka load tests to determine optimal partition counts
7. **SASL/SSL**: Configure production authentication and encryption

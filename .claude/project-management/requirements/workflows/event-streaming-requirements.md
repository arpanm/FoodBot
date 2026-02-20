# Event Streaming Requirements

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Active

---

## Overview

FoodBot uses Apache Kafka 7.5 for event-driven communication between microservices. Event streaming enables real-time data synchronization, notification dispatch, audit trails, and analytics processing.

## Business Requirements

### BR-ES-001: Real-Time Data Synchronization
**Priority:** High
**Description:** PostgreSQL database changes must be published as Kafka events and consumed by downstream services for real-time updates.

**Acceptance Criteria:**
- Database changes (INSERT, UPDATE, DELETE) published to Kafka within 100ms
- MCP Orchestrator consumes events and updates Elasticsearch index within 5 seconds
- Zero data loss during event transmission

### BR-ES-002: Notification Dispatch
**Priority:** High
**Description:** Order and payment events must trigger customer notifications via the Notification Service.

**Acceptance Criteria:**
- Order events trigger email/SMS/push notifications
- Payment events trigger payment confirmation notifications
- Notifications delivered within 30 seconds of event creation

### BR-ES-003: Audit Trail
**Priority:** Medium
**Description:** All domain events must be retained for audit and compliance purposes.

**Acceptance Criteria:**
- Events retained per topic retention policy (7-90 days)
- Events include full audit metadata (eventId, timestamp, source, correlationId)
- Events queryable for compliance reporting

### BR-ES-004: Event Replay
**Priority:** Medium
**Description:** Failed events must be replayable from the Dead Letter Queue or from specific offsets.

**Acceptance Criteria:**
- DLQ messages include original payload and error details
- Events replayable manually via admin tool
- Replay maintains idempotency

---

## Functional Requirements

### FR-ES-001: Event Schema Validation
**Priority:** High
**Source:** packages/events/src/schemas/

**Requirements:**
- All events must conform to Zod-validated schemas
- Schema validation enforced at producer and consumer
- Schema versioning supported (default: "1.0.0")
- Invalid events rejected with error logging

**Event Types:**
- Restaurant events: created, updated, deleted
- Dish events: created, updated, availability changed
- Order events: created, status changed
- Payment events: completed, failed, refunded
- User events: registered

### FR-ES-002: Kafka Topic Configuration
**Priority:** High
**Source:** packages/events/src/topics.ts

**Topic Requirements:**

| Topic | Partitions | Retention | Partition Key |
|-------|-----------|-----------|---------------|
| restaurant.created | 6 | 7 days | restaurantId |
| restaurant.updated | 6 | 7 days | restaurantId |
| restaurant.deleted | 3 | 30 days | restaurantId |
| dish.created | 6 | 7 days | dishId |
| dish.updated | 6 | 7 days | dishId |
| dish.availability.changed | 12 | 3 days | dishId |
| order.created | 12 | 30 days | orderId |
| order.status.changed | 12 | 30 days | orderId |
| payment.completed | 12 | 90 days | orderId |
| payment.failed | 6 | 90 days | orderId |
| payment.refunded | 6 | 90 days | orderId |
| user.registered | 6 | 30 days | userId |
| foodbot.dlq | 3 | 90 days | originalTopic |

### FR-ES-003: Event Producers
**Priority:** High
**Source:** apps/gateway-api/src/events/producers/

**Producer Requirements:**
- Producers implemented in Gateway API service
- Events published to Kafka with JSON serialization
- Correlation IDs propagated for distributed tracing
- Producer errors logged and metrics tracked

**Producers:**
- OrderEventProducer: order.created, order.status.changed
- RestaurantEventProducer: restaurant.created, restaurant.updated, restaurant.deleted
- DishEventProducer: dish.created, dish.updated, dish.availability.changed
- PaymentEventProducer: payment.completed, payment.failed, payment.refunded
- UserEventProducer: user.registered

### FR-ES-004: Event Consumers
**Priority:** High
**Source:** services/mcp-orchestrator/src/main/java/com/foodbot/mcp/

**Consumer Requirements:**

**MCP Orchestrator (Java):**
- RestaurantEventConsumer: consumes restaurant.* topics, indexes to Elasticsearch
- DishEventConsumer: consumes dish.* topics, indexes to Elasticsearch
- BulkIndexer: batches Elasticsearch operations (batch size: 100, flush interval: 5s)

**Notification Service (TypeScript):**
- OrderEventConsumer: consumes order.* topics, sends notifications
- PaymentEventConsumer: consumes payment.* topics, sends notifications
- UserEventConsumer: consumes user.* topics, sends welcome emails

**Consumer Groups:**
- mcp-indexer: MCP Orchestrator
- notification-service: Notification Service
- order-processor: Gateway API
- analytics-consumer: Analytics pipeline (future)
- gateway-api: Gateway API event-driven updates

### FR-ES-005: Dead Letter Queue (DLQ)
**Priority:** High
**Source:** apps/gateway-api/src/events/dlq/

**DLQ Requirements:**
- Failed messages routed to foodbot.dlq after exhausting retries
- DLQ messages include: original topic, original payload, error message, stack trace, retry count, timestamp
- DLQ monitored via Kafka UI at http://localhost:8082
- DLQ messages replayable via EventReplayService

### FR-ES-006: Event Metrics
**Priority:** Medium
**Source:** apps/gateway-api/src/events/monitoring/

**Metrics Requirements:**
- Messages produced per topic
- Messages consumed per consumer group
- Consumer lag per partition
- DLQ message count
- Processing latency (p50, p95, p99)
- Error rate per topic

---

## Technical Requirements

### TR-ES-001: Kafka Cluster Configuration
**Priority:** High

**Development:**
- Single-node Kafka broker (localhost:9092)
- Single Zookeeper node (localhost:2181)
- Schema Registry (localhost:8083)
- Kafka UI (localhost:8082)

**Production:**
- 3+ Kafka brokers with replication factor 3
- 3 Zookeeper nodes for high availability
- Schema Registry with HA
- Topic partitions: 6-12 depending on throughput

### TR-ES-002: Event Serialization
**Priority:** High

**Requirements:**
- JSON serialization for all events
- UTF-8 encoding
- Compact JSON (no pretty printing)
- Event size limit: 1 MB per message

### TR-ES-003: Consumer Reliability
**Priority:** High

**Requirements:**
- At-least-once delivery semantics
- Idempotent event processing
- Manual offset commit after successful processing
- Retry mechanism with exponential backoff (max 3 retries)
- Circuit breaker per consumer group

### TR-ES-004: Event Ordering
**Priority:** Medium

**Requirements:**
- Events for same entity (orderId, restaurantId) published to same partition
- Partition key based on entity ID
- Consumer processes events in order within partition
- No cross-partition ordering guarantees

### TR-ES-005: Performance Targets
**Priority:** High

**Requirements:**
- Event production latency: < 100ms (p95)
- Event consumption latency: < 5s (p95)
- Consumer lag: < 1000 messages
- Kafka cluster throughput: > 10,000 events/second

### TR-ES-006: Security
**Priority:** Medium

**Requirements:**
- SASL/PLAIN authentication in production
- TLS encryption for data in transit
- ACLs per topic and consumer group
- No secrets in event payloads

---

## Non-Functional Requirements

### NFR-ES-001: Scalability
**Requirements:**
- Kafka cluster scales horizontally by adding brokers
- Consumers scale by increasing partition count
- Topic partitions configurable per environment

### NFR-ES-002: Reliability
**Requirements:**
- Zero data loss with replication factor 3
- Automatic failover on broker failure
- Consumer group rebalancing on consumer failure

### NFR-ES-003: Observability
**Requirements:**
- Kafka UI for topic monitoring
- Prometheus metrics for consumer lag
- Distributed tracing with correlation IDs
- Structured JSON logs for all events

### NFR-ES-004: Maintainability
**Requirements:**
- Schema definitions in shared @foodbot/events package
- Consumer and producer implementations documented
- DLQ replay procedures documented
- Kafka operations runbooks available

---

## Implementation Status

### Completed
- ✅ Event schema definitions (packages/events)
- ✅ Kafka service implementation (apps/gateway-api/src/events/kafka.service.ts)
- ✅ Event producers (apps/gateway-api/src/events/producers/)
- ✅ MCP Orchestrator consumers (services/mcp-orchestrator)
- ✅ DLQ service (apps/gateway-api/src/events/dlq/)
- ✅ Event replay service (apps/gateway-api/src/events/dlq/event-replay.service.ts)
- ✅ Event metrics service (apps/gateway-api/src/events/monitoring/)

### In Progress
- 🚧 Notification Service consumers
- 🚧 Analytics consumer pipeline
- 🚧 Production Kafka cluster setup

### Planned
- 📋 Schema Registry integration
- 📋 Kafka Connect for CDC (Change Data Capture)
- 📋 Event versioning and migration strategy
- 📋 Multi-datacenter replication

---

## Dependencies

### External Systems
- Apache Kafka 7.5
- Zookeeper 3.8
- Schema Registry (Confluent)

### Internal Services
- Gateway API (producer)
- MCP Orchestrator (consumer)
- Notification Service (consumer)
- Analytics Service (consumer, future)

### Packages
- @foodbot/events (shared schemas)

---

## Testing Requirements

### Unit Tests
- Event schema validation tests
- Producer error handling tests
- Consumer error handling tests
- DLQ routing tests

### Integration Tests
- End-to-end event flow tests (producer → Kafka → consumer)
- Consumer group rebalancing tests
- DLQ replay tests
- Kafka connectivity tests

### Performance Tests
- Event throughput tests (10,000+ events/sec)
- Consumer lag tests under load
- Kafka cluster failover tests

---

## Documentation

### Developer Documentation
- [Event Streaming Guide](../../../docs/EVENT_STREAMING.md)
- [packages/events README](../../../packages/events/README.md)
- [Kafka Service Documentation](../../../apps/gateway-api/src/events/README.md)

### Operations Documentation
- Kafka cluster setup guide
- Topic creation and configuration guide
- DLQ monitoring and replay procedures
- Consumer lag monitoring and alerting

---

## Related Requirements
- [Workflow Requirements](./workflow-requirements.md)
- [MCP Layer Requirements](../mcp-layer/mcp-integration-requirements.md)
- [Technical Requirements](../technical-requirements.md)

---

**Document Owner:** Backend Team
**Reviewers:** Architecture Team, DevOps Team
**Next Review:** 2026-03-20

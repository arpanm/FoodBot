# TASK-ES-001: Event Streaming Enhancements - Full Production Implementation

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 18 days
**Component:** Kafka / Events Package / All Services
**Depends On:** None (existing Kafka infrastructure)
**Blocks:** Event sourcing, reliable data sync, audit trail
**Related Requirements:** event-streaming-requirements.md

---

## Overview

Enhance the existing Kafka event streaming infrastructure with schema registry integration, event replay mechanism, dead letter queue dashboard, event sourcing for orders, cross-service event choreography, exactly-once semantics, event versioning, consumer lag monitoring, and a comprehensive event management dashboard.

---

## Requirements

### Functional Requirements

1. **Schema Registry Integration (Confluent Schema Registry)**
   - Avro schema definitions for all event types
   - Schema versioning with compatibility checks (BACKWARD, FORWARD, FULL)
   - Auto-schema registration on producer startup
   - Consumer schema validation
   - Schema evolution rules enforcement
   - Schema registry UI integration
   - Schema migration tooling
   - Event type catalog with documentation

2. **Event Replay Mechanism**
   - Replay events from specific offset/timestamp
   - Topic-level and partition-level replay
   - Consumer group offset management
   - Replay with transformation (apply schema evolution)
   - Replay throttling (rate-limited replay)
   - Replay audit logging
   - Selective replay (filter by event type, entity ID)
   - Replay to different consumer group (shadow replay)

3. **Dead Letter Queue (DLQ) Management**
   - DLQ topic per consumer group
   - DLQ entry: original event, error details, retry count, timestamp
   - DLQ dashboard: view, retry, discard, bulk operations
   - Auto-retry with exponential backoff (3 attempts)
   - Manual retry from dashboard
   - DLQ alerting (threshold-based)
   - DLQ analytics (error categorization, trends)
   - Poisoned message detection and quarantine

4. **Event Sourcing for Orders**
   - Order aggregate from event stream
   - Events: OrderCreated, OrderConfirmed, OrderPreparing, OrderReady, OrderPickedUp, OrderDelivered, OrderCancelled, OrderModified, PaymentReceived, PaymentRefunded
   - Event store with append-only semantics
   - Snapshot optimization (every 10 events)
   - Aggregate rebuild from events
   - Temporal queries (what was order state at time T?)
   - Projection builders for read models
   - Event upcasting for schema evolution

5. **Exactly-Once Semantics**
   - Idempotent producers (enable.idempotence=true)
   - Transactional producers for multi-topic atomic writes
   - Consumer offset commit strategy (exactly-once with transactions)
   - Deduplication at consumer level (idempotency key in event)
   - Outbox pattern for DB→Kafka consistency

6. **Consumer Lag Monitoring**
   - Per-consumer-group lag tracking
   - Per-partition lag visibility
   - Lag threshold alerting (Prometheus + AlertManager)
   - Auto-scaling based on consumer lag (KEDA integration)
   - Consumer health dashboard
   - Throughput metrics (messages/sec per topic)

7. **Cross-Service Event Choreography**
   - Event-driven saga orchestration
   - Correlation ID propagation across events
   - Event chain visualization
   - Timeout detection for incomplete sagas
   - Compensation event triggering
   - Event flow documentation

8. **Event Management Dashboard**
   - Topic browser (list topics, partitions, messages)
   - Message inspector (view individual events)
   - Consumer group management
   - Schema registry browser
   - DLQ management
   - Lag monitoring
   - Throughput graphs
   - Event flow visualization

---

### Non-Functional Requirements

- Event processing latency < 50ms at p95
- Support 10,000 events/sec throughput per topic
- Event store retention: 30 days hot, 1 year cold (S3)
- Schema registry HA: 3 replicas
- DLQ retention: 7 days before auto-archive
- Dashboard response time < 1 second
- Zero data loss guarantee (acks=all, min.insync.replicas=2)

---

## Architecture

```
Event Streaming Architecture:
Producers → Schema Registry → Kafka Topics → Consumers
    ↓                                          ↓
  Outbox                                   DLQ Handler
  Pattern                                      ↓
    ↓                                    DLQ Dashboard
Transaction
  Log

Event Sourcing:
Commands → Event Store (Kafka) → Projections → Read Models
                                     ↓
                                 Snapshots
                                     ↓
                               Aggregate Cache

Components:
├── SchemaRegistryService
│   ├── SchemaRegistrar
│   ├── SchemaValidator
│   ├── CompatibilityChecker
│   └── SchemaMigrator
├── EventReplayService
│   ├── OffsetManager
│   ├── ReplayController
│   ├── ReplayThrottler
│   └── ReplayAuditor
├── DLQService
│   ├── DLQWriter
│   ├── DLQReader
│   ├── RetryManager
│   ├── QuarantineManager
│   └── DLQAnalytics
├── EventSourcingService
│   ├── EventStore
│   ├── AggregateRepository
│   ├── SnapshotManager
│   ├── ProjectionBuilder
│   └── EventUpcaster
├── ExactlyOnceService
│   ├── IdempotentProducer
│   ├── TransactionalProducer
│   ├── OutboxProcessor
│   └── DeduplicationFilter
├── LagMonitorService
│   ├── LagTracker
│   ├── AlertManager
│   ├── AutoScaler (KEDA)
│   └── MetricsExporter
└── ChoreographyService
    ├── CorrelationManager
    ├── SagaTracker
    ├── TimeoutDetector
    └── FlowVisualizer

Kafka Topics (Extended):
├── foodbot.orders.events (event sourced)
├── foodbot.orders.snapshots
├── foodbot.payments.events
├── foodbot.restaurants.events
├── foodbot.dishes.events
├── foodbot.users.events
├── foodbot.search.events
├── foodbot.analytics.events
├── foodbot.notifications.events
├── foodbot.*.dlq (per consumer group)
└── foodbot.outbox
```

---

## SDLC Phases

### Phase 1: Schema Registry & Event Versioning (Days 1-4)

**Objectives:** Stand up Confluent Schema Registry, define Avro schemas, integrate with producers/consumers.

**Tasks:**
1. Deploy Schema Registry (Docker + K8s manifests)
2. Define Avro schemas for all existing event types
3. Implement SchemaRegistrar service (auto-register on startup)
4. Implement SchemaValidator (consumer-side validation)
5. Add compatibility check enforcement (BACKWARD mode)
6. Schema migration tooling (CLI for evolving schemas)
7. Unit tests for schema registration and validation
8. Integration tests with Kafka + Schema Registry

**Deliverables:**
- Running Schema Registry instance
- Avro schemas for all event types
- Producer/consumer schema integration
- Schema migration CLI

### Phase 2: Event Replay & DLQ (Days 5-8)

**Objectives:** Build event replay mechanism and dead letter queue management.

**Tasks:**
1. Implement OffsetManager (seek to offset/timestamp)
2. Implement ReplayController (orchestrate replay)
3. Implement ReplayThrottler (rate-limited replay)
4. Implement selective replay (filter by type/entity)
5. Implement DLQ writer (capture failed events)
6. Implement DLQ auto-retry (exponential backoff)
7. Implement DLQ REST API (view, retry, discard)
8. DLQ alerting integration (Prometheus)
9. Unit + integration tests for replay and DLQ

**Deliverables:**
- Event replay service with selective replay
- DLQ capture, retry, and management API
- DLQ alerting

### Phase 3: Event Sourcing for Orders (Days 9-12)

**Objectives:** Implement full event sourcing for the order domain.

**Tasks:**
1. Define order event types (Created, Confirmed, Preparing, etc.)
2. Implement EventStore (append-only Kafka topic)
3. Implement AggregateRepository (rebuild order from events)
4. Implement SnapshotManager (snapshot every 10 events)
5. Implement ProjectionBuilder (build read models from events)
6. Implement temporal queries (state at time T)
7. Implement event upcasting (handle schema evolution)
8. Integrate with existing order service
9. Unit + integration tests for event sourcing

**Deliverables:**
- Order event sourcing with full lifecycle
- Snapshot optimization
- Projection builders for read models
- Temporal query support

### Phase 4: Exactly-Once & Choreography (Days 13-15)

**Objectives:** Achieve exactly-once semantics and cross-service event choreography.

**Tasks:**
1. Configure idempotent producers (enable.idempotence=true)
2. Implement transactional producers (multi-topic atomic writes)
3. Implement outbox pattern (DB→Kafka consistency)
4. Implement consumer deduplication filter
5. Implement correlation ID propagation
6. Implement saga tracker (cross-service workflow)
7. Implement timeout detection for incomplete sagas
8. Implement compensation event triggering
9. Unit + integration tests

**Deliverables:**
- Exactly-once semantics end-to-end
- Outbox pattern for DB consistency
- Saga tracking and compensation

### Phase 5: Monitoring, Dashboard & Load Testing (Days 16-18)

**Objectives:** Build monitoring, dashboard, and validate under load.

**Tasks:**
1. Implement consumer lag tracker (Prometheus metrics)
2. Configure lag threshold alerts (AlertManager)
3. Implement KEDA auto-scaling based on lag
4. Build event management dashboard (topic browser, message inspector)
5. Integrate DLQ management into dashboard
6. Add schema registry browser to dashboard
7. Add event flow visualization
8. Load test: 10,000 events/sec throughput validation
9. Performance tuning based on load test results
10. Documentation and runbooks

**Deliverables:**
- Consumer lag monitoring with alerts
- KEDA auto-scaling
- Event management dashboard
- Load test results and tuning

---

## Acceptance Criteria

- [ ] Schema Registry running with Avro schemas for all events
- [ ] Schema compatibility checks enforced (BACKWARD mode)
- [ ] Event replay from specific offset/timestamp working
- [ ] Selective replay by event type and entity ID
- [ ] DLQ capture with auto-retry (3 attempts, exponential backoff)
- [ ] DLQ dashboard with view, retry, discard operations
- [ ] Order event sourcing with full lifecycle events
- [ ] Aggregate rebuild from event stream
- [ ] Snapshot optimization (every 10 events)
- [ ] Exactly-once semantics with idempotent producers
- [ ] Outbox pattern for DB→Kafka consistency
- [ ] Consumer lag monitoring with Prometheus alerts
- [ ] KEDA auto-scaling based on lag
- [ ] Correlation ID propagation across services
- [ ] Event management dashboard
- [ ] Performance: event processing < 50ms p95
- [ ] 85%+ test coverage
- [ ] Load test: 10,000 events/sec throughput

---

## Files to Create/Modify

### Backend

- `packages/events/src/schema-registry/schema-registry.service.ts`
- `packages/events/src/schema-registry/schema-registrar.ts`
- `packages/events/src/schema-registry/schema-validator.ts`
- `packages/events/src/schema-registry/compatibility-checker.ts`
- `packages/events/src/schema-registry/schemas/order-created.avsc`
- `packages/events/src/schema-registry/schemas/order-confirmed.avsc`
- `packages/events/src/schema-registry/schemas/order-preparing.avsc`
- `packages/events/src/schema-registry/schemas/order-ready.avsc`
- `packages/events/src/schema-registry/schemas/order-delivered.avsc`
- `packages/events/src/schema-registry/schemas/order-cancelled.avsc`
- `packages/events/src/schema-registry/schemas/payment-received.avsc`
- `packages/events/src/schema-registry/schemas/payment-refunded.avsc`
- `packages/events/src/replay/event-replay.service.ts`
- `packages/events/src/replay/offset-manager.ts`
- `packages/events/src/replay/replay-controller.ts`
- `packages/events/src/replay/replay-throttler.ts`
- `packages/events/src/replay/replay-auditor.ts`
- `packages/events/src/dlq/dlq.service.ts`
- `packages/events/src/dlq/dlq.controller.ts`
- `packages/events/src/dlq/dlq-writer.ts`
- `packages/events/src/dlq/retry-manager.ts`
- `packages/events/src/dlq/quarantine-manager.ts`
- `packages/events/src/dlq/dlq-analytics.ts`
- `packages/events/src/sourcing/event-store.ts`
- `packages/events/src/sourcing/aggregate-repository.ts`
- `packages/events/src/sourcing/snapshot-manager.ts`
- `packages/events/src/sourcing/projection-builder.ts`
- `packages/events/src/sourcing/event-upcaster.ts`
- `packages/events/src/outbox/outbox-processor.ts`
- `packages/events/src/outbox/outbox-poller.ts`
- `packages/events/src/monitoring/lag-monitor.ts`
- `packages/events/src/monitoring/metrics-exporter.ts`
- `packages/events/src/choreography/saga-tracker.ts`
- `packages/events/src/choreography/correlation-manager.ts`
- `packages/events/src/choreography/timeout-detector.ts`
- `apps/gateway-api/src/events/order-event-sourcing.service.ts`

### Infrastructure

- `docker-compose.schema-registry.yml`
- `k8s/schema-registry-deployment.yaml`
- `k8s/schema-registry-service.yaml`
- `k8s/keda-scaled-objects.yaml`

### Tests

- `packages/events/src/__tests__/schema-registry.spec.ts`
- `packages/events/src/__tests__/event-replay.spec.ts`
- `packages/events/src/__tests__/dlq.spec.ts`
- `packages/events/src/__tests__/event-sourcing.spec.ts`
- `packages/events/src/__tests__/outbox.spec.ts`
- `packages/events/src/__tests__/lag-monitor.spec.ts`
- `packages/events/src/__tests__/saga-tracker.spec.ts`
- `packages/events/src/__tests__/load/throughput.spec.ts`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema Registry downtime blocks all producers | Medium | High | HA deployment (3 replicas), schema caching on client |
| Event replay floods downstream services | Medium | High | Replay throttling, dedicated consumer groups |
| Exactly-once semantics performance overhead | High | Medium | Benchmark and tune transaction batch sizes |
| DLQ growth from persistent failures | Medium | Medium | Auto-archive after 7 days, alerting thresholds |
| Event sourcing snapshot corruption | Low | High | Snapshot validation, rebuild from events fallback |

---

## Dependencies

- Confluent Schema Registry Docker image
- @kafkajs/confluent-schema-registry npm package
- KEDA (Kubernetes Event-Driven Autoscaling)
- Prometheus + AlertManager (existing)
- Grafana (existing, for dashboard)

---

**This document is a living guide. Update it as implementation progresses.**

# Event Streaming Enhancements - Pending Tasks

**Feature:** Kafka Event Streaming Enhancements
**Status:** Pending
**Priority:** Medium
**Last Updated:** 2026-02-20

---

## Pending Tasks

### 📋 TASK-ES-100: Schema Registry Integration
**Priority:** Medium
**Estimated Effort:** 2 days

**Description:**
Integrate Confluent Schema Registry for Avro schema management and evolution.

**Requirements:**
- Replace JSON serialization with Avro
- Register all event schemas in Schema Registry
- Implement schema versioning strategy
- Add schema compatibility checks
- Update producers and consumers to use Avro

**Benefits:**
- Schema evolution without breaking consumers
- Smaller message sizes (binary format)
- Centralized schema management
- Schema compatibility validation

**Technical Approach:**
```typescript
// Producer with Avro serialization
const producer = kafka.producer({
  serializer: new AvroSerializer({
    schemaRegistry: {
      api: {
        url: 'http://localhost:8083'
      }
    }
  })
});
```

**Acceptance Criteria:**
- All events serialized with Avro
- Schema Registry integration working
- Backward compatibility tests passing
- Documentation updated

---

### 📋 TASK-ES-101: Kafka Connect for Change Data Capture (CDC)
**Priority:** Medium
**Estimated Effort:** 3 days

**Description:**
Implement Kafka Connect with Debezium for PostgreSQL change data capture.

**Requirements:**
- Set up Debezium PostgreSQL connector
- Configure CDC for restaurants, dishes, orders, payments tables
- Transform CDC events to domain events
- Handle schema changes
- Monitor CDC lag

**Benefits:**
- Automatic event publishing on database changes
- No application-level event publishing
- Guaranteed event delivery
- Historical data replay capability

**Technical Approach:**
```json
{
  "name": "postgres-source-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "localhost",
    "database.port": "5432",
    "database.user": "postgres",
    "database.dbname": "foodbot",
    "table.include.list": "public.restaurants,public.dishes,public.orders",
    "transforms": "route",
    "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.route.regex": "([^.]+)\\.([^.]+)\\.([^.]+)",
    "transforms.route.replacement": "$3.$1"
  }
}
```

**Acceptance Criteria:**
- Debezium connector deployed and running
- CDC events published to Kafka
- Domain event transformation working
- Zero data loss during migration
- Performance impact < 10%

---

### 📋 TASK-ES-102: Multi-Datacenter Replication
**Priority:** Low
**Estimated Effort:** 5 days

**Description:**
Set up Kafka Mirror Maker 2 for multi-datacenter replication.

**Requirements:**
- Deploy Kafka clusters in 2+ datacenters
- Configure MirrorMaker 2 for active-passive replication
- Set up monitoring and alerting
- Test failover scenarios
- Document DR procedures

**Benefits:**
- High availability across datacenters
- Disaster recovery capability
- Reduced latency for geo-distributed consumers
- Business continuity

**Technical Approach:**
```properties
# MirrorMaker 2 configuration
clusters = us-east-1, us-west-2
us-east-1.bootstrap.servers = kafka-us-east-1:9092
us-west-2.bootstrap.servers = kafka-us-west-2:9092

us-east-1->us-west-2.enabled = true
us-east-1->us-west-2.topics = .*
us-east-1->us-west-2.groups = .*
```

**Acceptance Criteria:**
- Kafka clusters in 2 datacenters
- MirrorMaker 2 replicating all topics
- Failover tested and documented
- Replication lag < 5 seconds
- DR runbook created

---

### 📋 TASK-ES-103: Notification Service Kafka Consumers
**Priority:** High
**Estimated Effort:** 3 days

**Description:**
Implement Kafka consumers in Notification Service for sending customer notifications.

**Requirements:**
- Create Notification Service microservice
- Implement OrderEventConsumer for order notifications
- Implement PaymentEventConsumer for payment notifications
- Implement UserEventConsumer for user notifications
- Integrate with email/SMS/push notification providers

**Consumer Groups:**
- `notification-service` - Main notification consumer group

**Topics:**
- `order.created` → Send order confirmation email/SMS
- `order.status.changed` → Send status update notification
- `payment.completed` → Send payment confirmation
- `payment.failed` → Send payment failure notification
- `user.registered` → Send welcome email

**Acceptance Criteria:**
- Notification Service deployed
- All consumers implemented and tested
- Notifications sent within 30 seconds of event
- Error handling with retry and DLQ
- Idempotent notification delivery

---

### 📋 TASK-ES-104: Analytics Consumer Pipeline
**Priority:** Medium
**Estimated Effort:** 5 days

**Description:**
Implement analytics consumer pipeline for business intelligence.

**Requirements:**
- Create analytics consumer service
- Subscribe to all Kafka topics
- Stream events to data warehouse (e.g., Snowflake, BigQuery)
- Implement data transformations
- Set up analytics dashboards

**Consumer Group:**
- `analytics-consumer` - Analytics pipeline consumer group

**Use Cases:**
- Order volume analytics
- Restaurant performance metrics
- Customer behavior analysis
- Payment trends
- Real-time dashboards

**Technical Approach:**
```typescript
// Stream events to BigQuery
@KafkaListener(topics = "*", groupId = "analytics-consumer")
async consumeEvent(event: BaseEvent): Promise<void> {
  const transformed = this.transformForAnalytics(event);
  await this.bigQueryClient.insert('foodbot.events', transformed);
}
```

**Acceptance Criteria:**
- Analytics consumer deployed
- All events streamed to data warehouse
- Data transformations working
- Analytics dashboards created
- Consumer lag < 1000 messages

---

### 📋 TASK-ES-105: Event Versioning and Migration Strategy
**Priority:** Medium
**Estimated Effort:** 2 days

**Description:**
Define and implement event versioning and migration strategy for schema evolution.

**Requirements:**
- Define versioning scheme (semantic versioning)
- Implement version-aware consumers
- Create migration utilities for old events
- Document versioning guidelines
- Test backward/forward compatibility

**Versioning Strategy:**
```typescript
// v1.0.0
interface OrderCreatedEvent_v1 {
  version: '1.0.0';
  orderId: string;
  userId: string;
  total: number;
}

// v2.0.0 - Added items field
interface OrderCreatedEvent_v2 {
  version: '2.0.0';
  orderId: string;
  userId: string;
  items: OrderItem[];
  total: number;
}

// Version-aware consumer
if (event.version === '1.0.0') {
  await this.handleV1(event as OrderCreatedEvent_v1);
} else if (event.version === '2.0.0') {
  await this.handleV2(event as OrderCreatedEvent_v2);
}
```

**Acceptance Criteria:**
- Versioning scheme documented
- Version-aware consumers implemented
- Migration utilities created
- Backward compatibility tests passing
- Migration runbook created

---

### 📋 TASK-ES-106: Event Sourcing for Order Aggregate
**Priority:** Low
**Estimated Effort:** 5 days

**Description:**
Implement full event sourcing pattern for Order aggregate.

**Requirements:**
- Store all order events in event store
- Rebuild order state from events
- Implement snapshots for performance
- Add temporal queries (order state at time T)
- Handle event replay

**Benefits:**
- Complete audit trail
- Time travel queries
- Debugging capability
- Event replay for testing

**Technical Approach:**
```typescript
class OrderAggregate {
  private events: OrderEvent[] = [];

  apply(event: OrderEvent): void {
    this.events.push(event);
    this.applyEvent(event);
  }

  rebuild(events: OrderEvent[]): void {
    events.forEach(event => this.applyEvent(event));
  }

  getStateAtTime(timestamp: Date): OrderState {
    const eventsUntil = this.events.filter(e => e.timestamp <= timestamp);
    const aggregate = new OrderAggregate();
    aggregate.rebuild(eventsUntil);
    return aggregate.getState();
  }
}
```

**Acceptance Criteria:**
- Event store implemented
- Order aggregate rebuilt from events
- Snapshots working
- Temporal queries tested
- Performance acceptable (< 100ms to rebuild)

---

### 📋 TASK-ES-107: Kafka Cluster Production Setup
**Priority:** High
**Estimated Effort:** 3 days

**Description:**
Set up production Kafka cluster with high availability.

**Requirements:**
- Deploy 3+ Kafka brokers
- Set up 3 Zookeeper nodes
- Configure replication factor 3
- Enable SASL/PLAIN authentication
- Enable TLS encryption
- Set up monitoring and alerting
- Configure topic ACLs

**Cluster Configuration:**
```yaml
Kafka Brokers (3):
  - kafka1.foodbot.com:9092
  - kafka2.foodbot.com:9092
  - kafka3.foodbot.com:9092

Zookeeper Ensemble (3):
  - zk1.foodbot.com:2181
  - zk2.foodbot.com:2181
  - zk3.foodbot.com:2181

Replication Factor: 3
Min In-Sync Replicas: 2
```

**Acceptance Criteria:**
- Kafka cluster deployed in production
- High availability tested (node failure)
- Authentication and TLS working
- Monitoring dashboards created
- Performance meets targets (10K events/sec)

---

## Summary

**Total Pending Tasks:** 8
**Total Estimated Effort:** 28 days
**Priority Breakdown:**
- High: 2 tasks (6 days)
- Medium: 5 tasks (17 days)
- Low: 1 task (5 days)

---

## Related Documentation

- [Event Streaming Requirements](../../requirements/workflows/event-streaming-requirements.md)
- [Kafka Event Streaming Architecture](../../architecture/integration/kafka-event-streaming.md)
- [Completed Tasks](../completed/event-streaming-implementation.md)

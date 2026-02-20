# Event Schemas - Kafka Event Streaming

**Status:** Implemented ✅
**Priority:** High
**Category:** Integration - Event-Driven Architecture
**Package:** `@foodbot/events`

---

## Overview

Comprehensive event schema definitions for FoodBot's event-driven architecture. All events are Zod-validated, versioned, and published to Kafka topics for consumption by multiple services.

**Technology Stack:**
- **Schema Validation:** Zod
- **Message Broker:** Kafka
- **Serialization:** JSON
- **Partition Key:** Entity ID (for ordering guarantee)

---

## Base Event Schema

All FoodBot events extend a common base schema with metadata for tracing and correlation.

### Schema Definition

```typescript
const BaseEventSchema = z.object({
  eventId: z.string().uuid(),           // Unique event identifier
  timestamp: z.string().datetime(),     // ISO 8601 timestamp
  source: z.string().min(1),            // Originating service name
  correlationId: z.string().uuid(),     // Request correlation ID
  version: z.number().int().positive().default(1), // Schema version
});
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventId` | UUID | Yes | Unique identifier for this event |
| `timestamp` | ISO datetime | Yes | Event creation time |
| `source` | string | Yes | Service that emitted the event (e.g., "gateway-api") |
| `correlationId` | UUID | Yes | Correlation ID for tracing across services |
| `version` | number | No | Schema version (default: 1) |

---

## Event Domains

### 1. Restaurant Events

#### 1.1 restaurant.created

**Topic:** `restaurant.created`
**Partition Key:** `restaurantId`
**Retention:** 7 days

**Data Schema:**
```typescript
{
  restaurantId: string (UUID),
  ownerId: string (UUID),
  name: string,
  description: string,
  cuisineTypes: string[],
  address: Record<string, unknown>,
  phoneNumber: string,
  email: string (email format),
  rating: number (0-5),
  reviewCount: number (int >= 0),
  priceRange: string,
  isActive: boolean,
  isApproved: boolean,
  latitude: number,
  longitude: number,
  deliveryRadius: number (km),
  minimumOrder: number,
  deliveryFee: number,
  preparationTime: number (int, minutes)
}
```

**Use Cases:**
- Index restaurant in Elasticsearch (MCP)
- Send welcome email to owner
- Update analytics dashboard

---

#### 1.2 restaurant.updated

**Topic:** `restaurant.updated`
**Partition Key:** `restaurantId`
**Retention:** 7 days

**Data Schema:**
```typescript
{
  restaurantId: string (UUID),
  changes: Record<string, unknown>, // Changed fields
  updatedBy: string (UUID)           // User who made the change
}
```

**Use Cases:**
- Update Elasticsearch index
- Invalidate search cache
- Notify subscribed users

---

#### 1.3 restaurant.deleted

**Topic:** `restaurant.deleted`
**Partition Key:** `restaurantId`
**Retention:** 30 days

**Data Schema:**
```typescript
{
  restaurantId: string (UUID),
  deletedBy: string (UUID),
  reason?: string
}
```

**Use Cases:**
- Remove from Elasticsearch
- Archive data
- Notify affected orders

---

### 2. Dish Events

#### 2.1 dish.created

**Topic:** `dish.created`
**Partition Key:** `dishId`
**Retention:** 7 days

**Data Schema:**
```typescript
{
  dishId: string (UUID),
  restaurantId: string (UUID),
  name: string,
  description: string,
  category: string,
  price: number (>= 0),
  discountedPrice?: number (>= 0),
  images: string[],                  // Image URLs
  isVegetarian: boolean,
  isVegan: boolean,
  isGlutenFree: boolean,
  allergens: string[],
  spiceLevel: string,
  calories?: number (int),
  preparationTime: number (int, minutes),
  isAvailable: boolean,
  tags: string[]
}
```

**Use Cases:**
- Index dish in Elasticsearch
- Update restaurant menu cache
- Generate recommendations

---

#### 2.2 dish.updated

**Topic:** `dish.updated`
**Partition Key:** `dishId`
**Retention:** 7 days

**Data Schema:**
```typescript
{
  dishId: string (UUID),
  restaurantId: string (UUID),
  changes: Record<string, unknown>,
  updatedBy: string (UUID)
}
```

---

#### 2.3 dish.availability.changed

**Topic:** `dish.availability.changed`
**Partition Key:** `dishId`
**Retention:** 3 days
**High Frequency:** Yes (frequent updates)

**Data Schema:**
```typescript
{
  dishId: string (UUID),
  restaurantId: string (UUID),
  isAvailable: boolean,
  changedBy: string (UUID)
}
```

**Use Cases:**
- Real-time menu availability updates
- Invalidate search cache
- Notify users with dish in cart

---

### 3. Order Events

#### 3.1 order.created

**Topic:** `order.created`
**Partition Key:** `orderId`
**Retention:** 30 days

**Data Schema:**
```typescript
{
  orderId: string (UUID),
  userId: string (UUID),
  restaurantId: string (UUID),
  items: Array<{
    dishId: string (UUID),
    dishName: string,
    quantity: number (int > 0),
    price: number (>= 0),
    specialInstructions?: string
  }>,
  subtotal: number (>= 0),
  deliveryFee: number (>= 0),
  tax: number (>= 0),
  discount: number (>= 0),
  total: number (>= 0),
  paymentMethod: string,
  deliveryAddress: Record<string, unknown>,
  specialInstructions?: string,
  estimatedDeliveryTime: string (ISO datetime)
}
```

**Use Cases:**
- Update order analytics
- Trigger fulfillment workflow
- Send confirmation email
- Update user order history

---

#### 3.2 order.status.changed

**Topic:** `order.status.changed`
**Partition Key:** `orderId`
**Retention:** 30 days

**Data Schema:**
```typescript
{
  orderId: string (UUID),
  userId: string (UUID),
  restaurantId: string (UUID),
  oldStatus: OrderStatus,
  newStatus: OrderStatus,
  reason?: string
}
```

**Order Status Enum:**
- `pending`
- `confirmed`
- `preparing`
- `ready`
- `out_for_delivery`
- `delivered`
- `cancelled`

**Use Cases:**
- Send status update notifications
- Update delivery tracking
- Analytics and reporting

---

### 4. Payment Events

#### 4.1 payment.completed

**Topic:** `payment.completed`
**Partition Key:** `paymentId`
**Retention:** 90 days (financial data)

**Data Schema:**
```typescript
{
  paymentId: string (UUID),
  orderId: string (UUID),
  userId: string (UUID),
  amount: number (>= 0),
  paymentMethod: string,
  transactionId?: string
}
```

**Use Cases:**
- Financial reconciliation
- Revenue analytics
- Fraud detection monitoring

---

#### 4.2 payment.failed

**Topic:** `payment.failed`
**Partition Key:** `paymentId`
**Retention:** 90 days

**Data Schema:**
```typescript
{
  paymentId: string (UUID),
  orderId: string (UUID),
  userId: string (UUID),
  amount: number (>= 0),
  paymentMethod: string,
  failureReason: string
}
```

**Use Cases:**
- Failure analysis
- Retry logic trigger
- Customer support alerts

---

#### 4.3 payment.refunded

**Topic:** `payment.refunded`
**Partition Key:** `paymentId`
**Retention:** 90 days

**Data Schema:**
```typescript
{
  paymentId: string (UUID),
  orderId: string (UUID),
  userId: string (UUID),
  refundAmount: number (>= 0),
  reason?: string
}
```

**Use Cases:**
- Financial reconciliation
- Customer refund notifications
- Analytics

---

### 5. User Events

#### 5.1 user.registered

**Topic:** `user.registered`
**Partition Key:** `userId`
**Retention:** 30 days

**Data Schema:**
```typescript
{
  userId: string (UUID),
  email: string (email format),
  name: string,
  role: string,              // 'customer', 'restaurant_owner', 'admin'
  phoneNumber?: string
}
```

**Use Cases:**
- Trigger user onboarding workflow
- Send welcome email
- Initialize user preferences
- Analytics

---

## Kafka Topic Configuration

### Production Configuration

| Topic | Partitions | Replication Factor | Retention |
|-------|------------|-------------------|-----------|
| `restaurant.created` | 6 | 3 | 7 days |
| `restaurant.updated` | 6 | 3 | 7 days |
| `restaurant.deleted` | 3 | 3 | 30 days |
| `dish.created` | 6 | 3 | 7 days |
| `dish.updated` | 6 | 3 | 7 days |
| `dish.availability.changed` | 12 | 3 | 3 days |
| `order.created` | 12 | 3 | 30 days |
| `order.status.changed` | 12 | 3 | 30 days |
| `payment.completed` | 12 | 3 | 90 days |
| `payment.failed` | 6 | 3 | 90 days |
| `payment.refunded` | 6 | 3 | 90 days |
| `user.registered` | 6 | 3 | 30 days |
| `foodbot.dlq` | 3 | 3 | 90 days |

---

## Consumer Groups

| Consumer Group | Purpose | Consumes Topics |
|----------------|---------|-----------------|
| `mcp-indexer` | Index data into Elasticsearch | All restaurant/dish events |
| `notification-service` | Send notifications | Order/payment events |
| `order-processor` | Process order workflow events | Order events |
| `analytics-consumer` | Aggregate event data | All events |
| `gateway-api` | Process events within gateway | User events |

---

## Event Naming Convention

**Format:** `<domain>.<action>`

**Examples:**
- `restaurant.created` ✅
- `dish.availability.changed` ✅
- `order.status.changed` ✅

**Rules:**
- Use lowercase
- Use dots for hierarchy
- Use past tense for actions (`created`, not `create`)

---

## Partition Key Strategy

**Purpose:** Guarantee event ordering for the same entity

**Strategy:**
- Restaurant events: `restaurantId`
- Dish events: `dishId`
- Order events: `orderId`
- Payment events: `paymentId`
- User events: `userId`

**Benefit:** All events for same entity go to same partition, preserving order

---

## Schema Validation

All events validated using Zod schemas before publishing:

```typescript
const result = OrderCreatedEventSchema.safeParse(event);
if (!result.success) {
  throw new EventValidationError(result.error);
}
```

**Benefits:**
- Compile-time type safety
- Runtime validation
- Auto-generated TypeScript types
- Clear error messages

---

## Event Versioning

**Current Version:** 1 (all events)

**Version Strategy:**
- Additive changes: No version bump (backwards compatible)
- Breaking changes: Version bump + new schema
- Consumers handle multiple versions

**Example:**
```typescript
if (event.version === 1) {
  // Handle v1 schema
} else if (event.version === 2) {
  // Handle v2 schema
}
```

---

## Dead Letter Queue (DLQ)

**Topic:** `foodbot.dlq`
**Purpose:** Store failed event processing attempts

**Triggers:**
- Schema validation failure
- Consumer processing error after max retries
- Deserialization failure

**Monitoring:** Alert on DLQ message count > 100

---

## Testing

**Test File:** `packages/events/src/__tests__/schemas.spec.ts`

### Test Coverage
1. ✅ Valid event validation for all schemas
2. ✅ Invalid event rejection for all schemas
3. ✅ Missing required fields
4. ✅ Invalid data types
5. ✅ Email format validation
6. ✅ UUID format validation
7. ✅ Enum validation
8. ✅ Number constraints (min/max)

**Coverage:** 100%

---

## Producer Usage Example

```typescript
import { OrderCreatedEventSchema, KAFKA_TOPICS } from '@foodbot/events';
import { v4 as uuidv4 } from 'uuid';

// Create event
const event = {
  eventId: uuidv4(),
  timestamp: new Date().toISOString(),
  source: 'gateway-api',
  correlationId: request.correlationId,
  version: 1,
  type: 'order.created',
  data: {
    orderId: order.id,
    userId: order.userId,
    // ... other fields
  },
};

// Validate
const validated = OrderCreatedEventSchema.parse(event);

// Publish to Kafka
await kafka.producer.send({
  topic: KAFKA_TOPICS.ORDER_CREATED,
  messages: [{
    key: order.id, // Partition key
    value: JSON.stringify(validated),
  }],
});
```

---

## Consumer Usage Example

```typescript
import { OrderCreatedEventSchema } from '@foodbot/events';

await kafka.consumer.run({
  eachMessage: async ({ message }) => {
    // Deserialize
    const rawEvent = JSON.parse(message.value.toString());

    // Validate
    const event = OrderCreatedEventSchema.parse(rawEvent);

    // Process
    await processOrderCreated(event);
  },
});
```

---

## Monitoring & Observability

### Metrics
- `kafka.events.produced` - Events published by topic
- `kafka.events.consumed` - Events consumed by consumer group
- `kafka.events.validation_failed` - Schema validation failures
- `kafka.dlq.messages` - DLQ message count
- `kafka.consumer.lag` - Consumer lag by group/topic

### Alerts
- High validation failure rate (> 1%)
- Consumer lag > 1000 messages
- DLQ message count > 100
- Producer send failures

---

## Related Documentation

- [Kafka Architecture](../../architecture/integration/kafka-architecture.md)
- [Event-Driven Patterns](../../architecture/integration/event-driven-patterns.md)
- [Workflow Integration](../../architecture/integration/workflow-event-integration.md)

---

**Last Updated:** 2026-02-20
**Implemented By:** Events Package Team

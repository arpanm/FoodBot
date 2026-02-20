# Kafka Event Specifications - FoodBot Backend

> **⚠️ DEPRECATED - This file has been consolidated**
>
> **New Location:** `../integration/kafka-architecture-consolidated.md`
>
> This file was consolidated with `kafka-event-architecture.md` and `kafka-event-streaming.md` on 2026-02-20.
> Please refer to the consolidated document for the most up-to-date information.
>
> **Consolidation Summary:**
> - All unique content from this file has been preserved
> - Duplicate sections removed
> - Cross-references updated
> - Comprehensive table of contents added
>
> This file is kept for reference only and will be moved to archive.

---

**Message Broker:** Apache Kafka
**Client Libraries:** KafkaJS (TypeScript), Spring Kafka (Java)
**Message Format:** JSON
**Schema Registry:** Not implemented (future enhancement)
**Status:** Deprecated ⚠️

---

## Overview

FoodBot uses Apache Kafka for asynchronous event-driven communication between services. Events are published by the Gateway API and consumed by downstream services for indexing, notifications, analytics, and workflow orchestration.

---

## Kafka Configuration

### Gateway API (Producer)
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
  },
}
```

### MCP Orchestrator (Consumer)
**Location:** `services/mcp-orchestrator/src/main/resources/application-kafka.yml`

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: mcp-orchestrator-group
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "*"
```

### Notification Service (Consumer)
**Location:** `services/notification-service/src/index.ts`

```typescript
{
  clientId: 'notification-service',
  groupId: 'notification-service-group',
  brokers: ['localhost:9092'],
  connectionTimeout: 30000,
  sessionTimeout: 30000,
}
```

---

## Kafka Topics

### 1. `restaurant-events`

**Producer:** Gateway API
**Consumers:** MCP Orchestrator, Search Orchestrator

**Events:**
- `RESTAURANT_CREATED`
- `RESTAURANT_UPDATED`
- `RESTAURANT_DELETED`
- `RESTAURANT_APPROVED`
- `RESTAURANT_ACTIVATED`
- `RESTAURANT_DEACTIVATED`

**Partitions:** 3
**Replication Factor:** 1 (dev), 3 (prod)
**Retention:** 7 days

---

### 2. `dish-events`

**Producer:** Gateway API
**Consumers:** MCP Orchestrator, Search Orchestrator

**Events:**
- `DISH_CREATED`
- `DISH_UPDATED`
- `DISH_DELETED`
- `DISH_AVAILABILITY_CHANGED`
- `DISH_PRICE_UPDATED`

**Partitions:** 3
**Replication Factor:** 1 (dev), 3 (prod)
**Retention:** 7 days

---

### 3. `order-events`

**Producer:** Gateway API
**Consumers:** Notification Service, MCP Orchestrator, Analytics Service (future)

**Events:**
- `ORDER_CREATED`
- `ORDER_CONFIRMED`
- `ORDER_PREPARING`
- `ORDER_READY`
- `ORDER_OUT_FOR_DELIVERY`
- `ORDER_DELIVERED`
- `ORDER_CANCELLED`

**Partitions:** 5
**Replication Factor:** 1 (dev), 3 (prod)
**Retention:** 30 days

---

### 4. `payment-events`

**Producer:** Gateway API
**Consumers:** Notification Service, Finance Service (future)

**Events:**
- `PAYMENT_INITIATED`
- `PAYMENT_PROCESSING`
- `PAYMENT_COMPLETED`
- `PAYMENT_FAILED`
- `PAYMENT_REFUND_INITIATED`
- `PAYMENT_REFUNDED`

**Partitions:** 3
**Replication Factor:** 1 (dev), 3 (prod)
**Retention:** 90 days

---

### 5. `user-events`

**Producer:** Gateway API
**Consumers:** Notification Service, Analytics Service (future)

**Events:**
- `USER_REGISTERED`
- `USER_VERIFIED`
- `USER_PROFILE_UPDATED`
- `PASSWORD_RESET_REQUESTED`
- `PASSWORD_RESET_COMPLETED`
- `USER_SUSPENDED`
- `USER_ACTIVATED`

**Partitions:** 3
**Replication Factor:** 1 (dev), 3 (prod)
**Retention:** 30 days

---

## Event Schemas

### Restaurant Events

#### RESTAURANT_CREATED
```typescript
{
  eventType: 'RESTAURANT_CREATED',
  timestamp: '2026-02-20T10:30:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
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
      tuesday: { open: '10:00', close: '22:00' },
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

#### RESTAURANT_UPDATED
```typescript
{
  eventType: 'RESTAURANT_UPDATED',
  timestamp: '2026-02-20T10:35:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    restaurantId: 'uuid',
    changes: {
      name: { old: 'Pizza Palace', new: 'Pizza Palace & Pasta' },
      cuisineTypes: { old: ['Italian', 'Pizza'], new: ['Italian', 'Pizza', 'Pasta'] }
    },
    // ... full restaurant object with new values
    updatedAt: '2026-02-20T10:35:00.000Z'
  }
}
```

#### RESTAURANT_DELETED
```typescript
{
  eventType: 'RESTAURANT_DELETED',
  timestamp: '2026-02-20T10:40:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    restaurantId: 'uuid',
    ownerId: 'uuid',
    name: 'Pizza Palace',
    deletedAt: '2026-02-20T10:40:00.000Z',
    reason: 'Owner request'
  }
}
```

---

### Dish Events

#### DISH_CREATED
```typescript
{
  eventType: 'DISH_CREATED',
  timestamp: '2026-02-20T11:00:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    dishId: 'uuid',
    restaurantId: 'uuid',
    name: 'Margherita Pizza',
    description: 'Classic tomato, mozzarella, and basil',
    category: 'Main Course',
    price: 12.99,
    discountedPrice: null,
    images: ['https://example.com/margherita.jpg'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    allergens: ['Dairy', 'Gluten'],
    spiceLevel: 'none',
    calories: 800,
    preparationTime: 15,
    isAvailable: true,
    tags: ['pizza', 'italian', 'classic'],
    rating: 0,
    totalReviews: 0,
    ingredients: ['Dough', 'Tomato Sauce', 'Mozzarella', 'Basil'],
    portionSize: '12 inch',
    dietaryTags: ['Vegetarian'],
    createdAt: '2026-02-20T11:00:00.000Z'
  }
}
```

#### DISH_UPDATED
```typescript
{
  eventType: 'DISH_UPDATED',
  timestamp: '2026-02-20T11:05:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    dishId: 'uuid',
    restaurantId: 'uuid',
    changes: {
      price: { old: 12.99, new: 14.99 },
      isAvailable: { old: true, new: false }
    },
    // ... full dish object with new values
    updatedAt: '2026-02-20T11:05:00.000Z'
  }
}
```

#### DISH_AVAILABILITY_CHANGED
```typescript
{
  eventType: 'DISH_AVAILABILITY_CHANGED',
  timestamp: '2026-02-20T11:10:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    dishId: 'uuid',
    restaurantId: 'uuid',
    name: 'Margherita Pizza',
    isAvailable: false,
    reason: 'Out of stock',
    updatedAt: '2026-02-20T11:10:00.000Z'
  }
}
```

---

### Order Events

#### ORDER_CREATED
```typescript
{
  eventType: 'ORDER_CREATED',
  timestamp: '2026-02-20T12:00:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    orderId: 'uuid',
    userId: 'uuid',
    restaurantId: 'uuid',
    items: [
      {
        dishId: 'uuid',
        dishName: 'Margherita Pizza',
        quantity: 2,
        price: 12.99,
        specialInstructions: 'Extra cheese'
      }
    ],
    subtotal: 25.98,
    deliveryFee: 5.00,
    tax: 2.60,
    discount: 0,
    total: 33.58,
    status: 'pending',
    paymentMethod: 'card',
    paymentStatus: 'pending',
    deliveryAddress: {
      street: '456 Oak Ave',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      latitude: 37.7749,
      longitude: -122.4194
    },
    specialInstructions: 'Ring doorbell twice',
    estimatedDeliveryTime: '2026-02-20T12:45:00.000Z',
    createdAt: '2026-02-20T12:00:00.000Z'
  }
}
```

#### ORDER_CONFIRMED
```typescript
{
  eventType: 'ORDER_CONFIRMED',
  timestamp: '2026-02-20T12:02:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    orderId: 'uuid',
    userId: 'uuid',
    restaurantId: 'uuid',
    status: 'confirmed',
    estimatedPreparationTime: 30,
    estimatedDeliveryTime: '2026-02-20T12:45:00.000Z',
    confirmedAt: '2026-02-20T12:02:00.000Z'
  }
}
```

#### ORDER_PREPARING
```typescript
{
  eventType: 'ORDER_PREPARING',
  timestamp: '2026-02-20T12:05:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    orderId: 'uuid',
    status: 'preparing',
    preparationStartedAt: '2026-02-20T12:05:00.000Z'
  }
}
```

#### ORDER_OUT_FOR_DELIVERY
```typescript
{
  eventType: 'ORDER_OUT_FOR_DELIVERY',
  timestamp: '2026-02-20T12:35:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    orderId: 'uuid',
    status: 'out_for_delivery',
    driverId: 'uuid',
    driverName: 'John Driver',
    driverPhone: '+14155559876',
    vehicleNumber: 'CA-1234',
    trackingUrl: 'https://tracking.foodbot.com/order123',
    estimatedDeliveryTime: '2026-02-20T12:50:00.000Z',
    outForDeliveryAt: '2026-02-20T12:35:00.000Z'
  }
}
```

#### ORDER_DELIVERED
```typescript
{
  eventType: 'ORDER_DELIVERED',
  timestamp: '2026-02-20T12:48:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    orderId: 'uuid',
    status: 'delivered',
    actualDeliveryTime: '2026-02-20T12:48:00.000Z',
    deliveredBy: 'John Driver',
    deliveryNotes: 'Left at doorstep',
    deliveryProof: 'https://example.com/proof.jpg'
  }
}
```

#### ORDER_CANCELLED
```typescript
{
  eventType: 'ORDER_CANCELLED',
  timestamp: '2026-02-20T12:10:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    orderId: 'uuid',
    status: 'cancelled',
    cancelledBy: 'customer',
    reason: 'Changed mind',
    refundAmount: 33.58,
    refundStatus: 'pending',
    cancelledAt: '2026-02-20T12:10:00.000Z'
  }
}
```

---

### Payment Events

#### PAYMENT_COMPLETED
```typescript
{
  eventType: 'PAYMENT_COMPLETED',
  timestamp: '2026-02-20T12:01:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    paymentId: 'uuid',
    orderId: 'uuid',
    userId: 'uuid',
    amount: 33.58,
    method: 'card',
    status: 'completed',
    transactionId: 'txn_abc123xyz789',
    confirmationToken: 'conf_xyz789',
    completedAt: '2026-02-20T12:01:00.000Z'
  }
}
```

#### PAYMENT_FAILED
```typescript
{
  eventType: 'PAYMENT_FAILED',
  timestamp: '2026-02-20T12:01:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    paymentId: 'uuid',
    orderId: 'uuid',
    userId: 'uuid',
    amount: 33.58,
    method: 'card',
    status: 'failed',
    errorCode: 'INSUFFICIENT_FUNDS',
    errorMessage: 'Card declined - insufficient funds',
    failedAt: '2026-02-20T12:01:00.000Z'
  }
}
```

#### PAYMENT_REFUNDED
```typescript
{
  eventType: 'PAYMENT_REFUNDED',
  timestamp: '2026-02-20T12:15:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    paymentId: 'uuid',
    orderId: 'uuid',
    userId: 'uuid',
    refundAmount: 33.58,
    refundReason: 'Order cancelled',
    refundTransactionId: 'refund_abc123',
    status: 'refunded',
    refundedAt: '2026-02-20T12:15:00.000Z'
  }
}
```

---

### User Events

#### USER_REGISTERED
```typescript
{
  eventType: 'USER_REGISTERED',
  timestamp: '2026-02-20T09:00:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    userId: 'uuid',
    email: 'newuser@example.com',
    name: 'John Doe',
    phoneNumber: '+14155559999',
    role: 'customer',
    isEmailVerified: false,
    verificationToken: 'token_abc123',
    registeredAt: '2026-02-20T09:00:00.000Z'
  }
}
```

#### USER_VERIFIED
```typescript
{
  eventType: 'USER_VERIFIED',
  timestamp: '2026-02-20T09:05:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    userId: 'uuid',
    email: 'newuser@example.com',
    isEmailVerified: true,
    verifiedAt: '2026-02-20T09:05:00.000Z'
  }
}
```

#### PASSWORD_RESET_REQUESTED
```typescript
{
  eventType: 'PASSWORD_RESET_REQUESTED',
  timestamp: '2026-02-20T10:00:00.000Z',
  version: '1.0',
  correlationId: 'uuid',
  data: {
    userId: 'uuid',
    email: 'user@example.com',
    resetToken: 'reset_xyz789',
    tokenExpiresAt: '2026-02-20T10:15:00.000Z',
    requestedAt: '2026-02-20T10:00:00.000Z'
  }
}
```

---

## Event Consumers

### MCP Orchestrator

**Consumer Group:** `mcp-orchestrator-group`
**Topics:** `restaurant-events`, `dish-events`

**Purpose:**
- Index restaurants in Elasticsearch
- Index dishes in Elasticsearch
- Update search cache
- Sync with provider data

**Implementation:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/indexing/`

**Event Handlers:**
- `RestaurantEventConsumer.java`: Handles restaurant events
- `DishEventConsumer.java`: Handles dish events
- `BulkIndexer.java`: Bulk indexing operations

---

### Notification Service

**Consumer Group:** `notification-service-group`
**Topics:** `order-events`, `payment-events`, `user-events`

**Purpose:**
- Send email notifications
- Send SMS notifications (planned)
- Push notifications (planned)
- WebSocket real-time updates

**Implementation:** `services/notification-service/src/consumers/`

**Event Handlers:**
- `order-event.consumer.ts`: Handles order lifecycle events
- `payment-event.consumer.ts`: Handles payment events
- `user-event.consumer.ts`: Handles user account events

---

### Search Orchestrator (Planned)

**Consumer Group:** `search-orchestrator-group`
**Topics:** `restaurant-events`, `dish-events`

**Purpose:**
- Invalidate search cache
- Update result rankings
- Trigger re-indexing

---

## Error Handling & Retry Strategy

### Producer (Gateway API)

**Retry Configuration:**
```typescript
{
  retries: 5,
  initialRetryTime: 100,
  maxRetryTime: 30000,
  factor: 2, // Exponential backoff
  multiplier: 1.5,
  retryForever: false
}
```

**Error Handling:**
- Failed messages logged to database (`kafka_failures` table - planned)
- Manual replay capability via admin dashboard
- Dead Letter Queue (DLQ) for permanently failed messages

---

### Consumer (MCP Orchestrator, Notification Service)

**Retry Configuration:**
```yaml
spring:
  kafka:
    listener:
      ack-mode: manual
      concurrency: 3
    consumer:
      enable-auto-commit: false
      max-poll-records: 100
```

**Error Handling:**
- Retry failed messages up to 3 times
- Exponential backoff between retries (1s, 2s, 4s)
- Move to DLQ after max retries
- Alert on DLQ threshold

---

## Message Ordering Guarantees

### Restaurant Events
- **Partition Key:** `restaurantId`
- **Guarantee:** All events for same restaurant processed in order

### Dish Events
- **Partition Key:** `restaurantId`
- **Guarantee:** All events for same restaurant processed in order

### Order Events
- **Partition Key:** `orderId`
- **Guarantee:** All events for same order processed in order

### Payment Events
- **Partition Key:** `orderId`
- **Guarantee:** All events for same order processed in order

### User Events
- **Partition Key:** `userId`
- **Guarantee:** All events for same user processed in order

---

## Monitoring & Observability

### Metrics (Planned)

**Producer Metrics:**
- Messages published per topic
- Message publish latency
- Failed publish attempts
- Retry counts

**Consumer Metrics:**
- Messages consumed per topic
- Consumer lag (offset behind)
- Processing latency
- Error rate

**Tools:**
- Kafka Manager for cluster monitoring
- Prometheus + Grafana for metrics
- ELK Stack for log aggregation

---

## Future Enhancements

- [ ] Schema Registry (Confluent Schema Registry or Apache Avro)
- [ ] Event versioning strategy
- [ ] Event replay capability
- [ ] Dead Letter Queue (DLQ) processing
- [ ] Circuit breaker for consumer failures
- [ ] Event sourcing for audit trail
- [ ] CQRS pattern implementation
- [ ] Kafka Streams for real-time analytics
- [ ] Transactional outbox pattern for guaranteed delivery

---

**Last Updated:** 2026-02-20
**Total Topics:** 5
**Total Event Types:** 25+
**Total Consumers:** 2 (MCP Orchestrator, Notification Service)
**Related Documents:**
- `BACKEND_REVERSE_ENGINEERING_SUMMARY.md`
- `api-contracts.md`

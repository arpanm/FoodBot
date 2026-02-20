# Temporal Workflows Architecture

> **⚠️ DEPRECATED - This file has been consolidated**
>
> **New Location:** `temporal-workflows-architecture-consolidated.md`
>
> This file was consolidated with `../components/temporal-workflows-complete.md` on 2026-02-20.
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

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Deprecated ⚠️

---

## Overview

FoodBot uses Temporal for orchestrating complex, long-running business workflows with built-in reliability, observability, and state management. This document describes the architecture, patterns, and implementation details.

---

## Architecture Components

### 1. Workflows (`packages/workflows/src/workflows/`)

Workflow definitions containing business logic orchestration:
- `searchRestaurant.workflow.ts` - Restaurant discovery
- `placeOrder.workflow.ts` - Order placement with Saga pattern
- `processPayment.workflow.ts` - Payment processing
- `orderFulfillment.workflow.ts` - Order lifecycle management
- `userOnboarding.workflow.ts` - User engagement sequence
- `restaurantOnboarding.workflow.ts` - Partner onboarding

**Characteristics:**
- Deterministic execution
- Automatic retry and compensation
- State persistence
- Signal-driven state transitions
- Timeout handling

---

### 2. Activities (`packages/workflows/src/activities/`)

Side-effect operations called by workflows:

#### 2.1 Database Activities (`database.activities.ts`)
- CRUD operations
- Order management
- Repository pattern
- Connection pooling

**Key Functions:**
- `saveToDatabase(collection, data)`
- `loadFromDatabase(collection, id)`
- `updateDatabase(collection, id, data)`
- `createOrder(orderData)`
- `updateOrderStatus(orderId, status)`

---

#### 2.2 Payment Activities (`payment.activities.ts`)
- Payment gateway integration
- Refund processing
- Inventory management
- Cart validation

**Key Functions:**
- `processPayment(orderId, paymentDetails)`
- `refundPayment(paymentId)`
- `callPaymentGateway(details)`
- `validateCart(items)`
- `checkInventory(items)`
- `reserveItems(restaurantId, items)`
- `releaseItems(restaurantId)`

**Payment Gateway Interface:**
```typescript
interface PaymentGateway {
  charge(details: PaymentChargeRequest): Promise<PaymentGatewayResponse>;
  refund(paymentId: string, amount?: number): Promise<PaymentGatewayResponse>;
  verify(paymentId: string): Promise<PaymentGatewayResponse>;
}
```

---

#### 2.3 Notification Activities (`notification.activities.ts`)
- Multi-channel notifications
- Email, SMS, push, in-app

**Key Functions:**
- `sendEmail(to, subject, body)`
- `sendSMS(phone, message)`
- `sendPushNotification(payload)`
- `sendInAppNotification(userId, message)`
- `notifyRestaurant(orderId)`
- `notifyCustomer(userId, message)`

**Service Integrations:**
- Email: SendGrid / AWS SES
- SMS: Twilio
- Push: Firebase Cloud Messaging (FCM)
- In-App: WebSocket gateway

---

#### 2.4 External Service Activities (`external.activities.ts`)
- MCP search API
- Delivery services
- Cache operations
- Inventory services

**Key Functions:**
- `callMCPSearch(params)` - Semantic restaurant search
- `applyFilters(restaurants, filters)`
- `rankResults(restaurants, context)`
- `getFromCache(key)` - Redis cache
- `setInCache(key, value, ttl)`
- `callDeliveryService(orderId)`
- `assignDeliveryPartner(orderId)`
- `trackDelivery(orderId, partnerId)`

---

#### 2.5 LLM Activities (`llm.activities.ts`)
- Intent extraction
- Context enrichment
- Workflow generation
- Recommendations

**Key Functions:**
- `extractIntent(query, context)`
- `enrichWithContext(intent, context)`
- `generateWorkflow(intent)`
- `validateWorkflow(workflow)`
- `loadPreferenceGraph(userId)`
- `generateRecommendations(context)`
- `loadUserContext(userId)`

---

### 3. Worker Manager (`workers/worker-manager.ts`)

Production-grade worker pool management:

**Features:**
- Multi-queue worker pool
- Health monitoring
- Graceful shutdown with drain
- Dynamic scaling
- Auto-restart on crash

**Configuration:**
```typescript
interface WorkerManagerConfig {
  temporalAddress: string;
  namespace: string;
  workerConfigs: WorkerConfig[];
  workersPerQueue: number;
}
```

**Default Worker Pools:**
| Task Queue | Workers | Max Activities | Max Workflows |
|------------|---------|----------------|---------------|
| `foodbot-main-queue` | 3 | 100 | 50 |
| `foodbot-orders-queue` | 3 | 50 | 25 |
| `foodbot-payments-queue` | 3 | 30 | 15 |
| `foodbot-notifications-queue` | 3 | 200 | 100 |
| `foodbot-onboarding-queue` | 3 | 20 | 10 |

---

### 4. Types (`types/index.ts`)

Shared type definitions:
- User context
- Restaurant and dish models
- Cart and order types
- Payment types
- Notification payloads
- Delivery types
- Workflow inputs/outputs

---

### 5. Errors (`errors/index.ts`)

Structured error handling:
- `WorkflowError` - Base error class
- `PaymentError` - Payment-specific errors
- `OrderError` - Order-specific errors
- `ExternalServiceError` - External API errors
- `DatabaseError` - Database errors
- `NotificationError` - Notification errors

**Retry Policies:**
- `RETRY_POLICIES.DEFAULT` - 3 attempts, exponential backoff
- `RETRY_POLICIES.PAYMENT` - 5 attempts, aggressive retry
- `RETRY_POLICIES.EXTERNAL_API` - 5 attempts, conservative
- `RETRY_POLICIES.NO_RETRY` - Single attempt
- `RETRY_POLICIES.NOTIFICATION` - 10 attempts, generous
- `RETRY_POLICIES.CACHE` - 3 attempts, fast retry

---

## Workflow Patterns

### Pattern 1: Simple Sequential Workflow
**Example:** Search Restaurant Workflow

```
Load Context → Check Cache → MCP Search → Apply Filters → Rank → Cache → Return
```

**Characteristics:**
- Linear execution
- No branching
- Automatic retry on failure

---

### Pattern 2: Saga Pattern (Distributed Transaction)
**Example:** Place Order Workflow

```
Validate → Check Inventory → Reserve Items → Process Payment → Create Order
                                    ↓                ↓
                            Release Items     Refund Payment
                            (compensation)    (compensation)
```

**Characteristics:**
- Distributed transaction
- Compensation stack (LIFO)
- At-least-once execution
- Eventual consistency

---

### Pattern 3: Signal-Driven Long-Running Workflow
**Example:** Order Fulfillment Workflow

```
Preparing → [Wait for Signal: orderReady] → Assign Partner → [Wait for Signal: orderPickedUp] → Track Delivery → [Wait for Signal: orderDelivered] → Complete
```

**Characteristics:**
- Long-running (minutes to hours)
- External event-driven
- Timeout handling with escalation
- Periodic status polling

---

### Pattern 4: Multi-Day Time-Based Workflow
**Example:** User Onboarding Workflow

```
Day 0: Welcome → Day 1: Guide → Day 4: Discount → Day 11: Feedback
```

**Characteristics:**
- Long-running (days)
- Time-based progression
- Signal interruption (order placed)
- Conditional logic

---

## Activity Injection Pattern

Activities use dependency injection for testability and flexibility:

```typescript
// Initialize repositories at worker startup
initializeRepositories({
  orders: orderRepository,
  users: userRepository,
  payments: paymentRepository,
});

// Initialize external services
initializePaymentGateway(stripeGateway);
initializeNotificationServices({
  email: sendGridService,
  sms: twilioService,
  push: fcmService,
});
```

**Benefits:**
- Easy testing with mocks
- Swap implementations (dev vs prod)
- Lazy initialization

---

## Retry and Error Handling Strategy

### Retryable Errors
- Network timeouts
- Connection errors
- Rate limits
- Transient database errors
- External service unavailable

**Action:** Automatic retry with exponential backoff

---

### Non-Retryable Errors
- Validation errors
- Business logic errors
- Authorization errors
- Not found errors
- Fraud detection

**Action:** Fail immediately, no retry

---

### Error Classification Helper
```typescript
function isRetryableError(error: unknown): boolean {
  if (error instanceof WorkflowError) {
    return error.isRetryable;
  }
  // Check error message for transient patterns
  // Default: treat unknown errors as retryable
}
```

---

## State Management

### Workflow State
- **Persistence:** Temporal event log
- **Durability:** Survives worker crashes
- **Recovery:** Replay from beginning
- **Determinism:** Same inputs → same outputs

### Activity State
- **Idempotency:** Safe to retry
- **Side Effects:** Only in activities
- **Timeouts:** Per-activity configuration

---

## Testing Strategy

### Unit Tests
- Mock all activities
- Test workflow logic
- Verify compensation execution
- Test error handling

**Example:**
```typescript
mockProcessPayment.respondWith(failedPaymentResult);
mockReleaseItems.respondWith(undefined);

await expect(workflow.run()).rejects.toThrow();
expect(mockReleaseItems.getCallCount()).toBe(1); // Compensation called
```

---

### Integration Tests
- Real Temporal test environment
- Test activity implementations
- End-to-end workflow execution

**Test Environment:**
```typescript
const testEnv = await TestWorkflowEnvironment.createLocal();
const { client, nativeConnection } = testEnv;
```

---

## Deployment

### Development
```bash
# Start local Temporal server
temporal server start-dev

# Start workers
cd packages/workflows
npm run worker:manager
```

### Production
```bash
# Environment variables
TEMPORAL_ADDRESS=temporal.example.com:7233
TEMPORAL_NAMESPACE=production

# Start worker manager
npm run worker:manager
```

**Scaling:**
- Horizontal: Add more worker instances
- Vertical: Increase `workersPerQueue` config
- Dynamic: Call `workerManager.scaleWorkers(queue, count)`

---

## Monitoring & Observability

### Metrics
- Workflow execution duration
- Activity execution duration
- Success/failure rates
- Compensation execution rate
- Queue backlog depth
- Worker health status

### Logging
- Structured logs with correlation IDs
- Activity start/complete
- Error details with context
- Signal receipts

### Tracing
- Distributed tracing across workflows
- Activity call graphs
- Cross-service correlation

---

## Security Considerations

### Activity Security
- Input validation in all activities
- Parameterized database queries
- API key rotation
- Secrets via environment variables

### Workflow Security
- Validate workflow inputs
- Authorization checks in activities
- Audit logging for sensitive operations

---

## Performance Optimization

### Caching
- Redis for search results
- LLM response caching
- User context caching

### Batch Processing
- Batch notifications
- Batch database operations

### Parallel Execution
- Independent activities run concurrently
- Fan-out/fan-in pattern for parallel tasks

---

## Temporal Configuration

### Connection Settings
```typescript
const connection = await NativeConnection.connect({
  address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
});
```

### Worker Settings
```typescript
const worker = await Worker.create({
  connection,
  namespace: 'default',
  taskQueue: 'foodbot-main-queue',
  workflowsPath: require.resolve('./workflows'),
  activities,
  maxConcurrentActivityTaskExecutions: 100,
  maxConcurrentWorkflowTaskExecutions: 50,
});
```

---

## Migration and Versioning

### Workflow Versioning
- Use workflow patching for non-breaking changes
- Deploy new workflow versions alongside old
- Gradual migration of in-flight workflows

### Activity Versioning
- Backwards-compatible changes preferred
- Breaking changes require new activity name

---

## Related Documentation

- [Saga Pattern Implementation](./saga-pattern.md)
- [Temporal Signals](./temporal-signals.md)
- [Activity Testing Guide](./activity-testing.md)
- [Kafka Event Integration](./kafka-architecture.md)

---

**Authored By:** Workflows Architecture Team
**Review Cycle:** Quarterly

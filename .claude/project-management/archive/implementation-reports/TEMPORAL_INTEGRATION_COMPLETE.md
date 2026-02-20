# Temporal Workflow Integration - Complete Report

**Date:** 2026-02-19
**Status:** Complete
**Package:** `@foodbot/workflows`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Complete Workflow Catalog](#complete-workflow-catalog)
3. [Activity Implementations](#activity-implementations)
4. [Worker Setup Guide](#worker-setup-guide)
5. [Gateway API Integration](#gateway-api-integration)
6. [Error Handling & Retry Policies](#error-handling--retry-policies)
7. [Testing Strategy](#testing-strategy)
8. [Production Deployment Guide](#production-deployment-guide)
9. [Monitoring Setup](#monitoring-setup)
10. [File Inventory](#file-inventory)

---

## Executive Summary

This integration adds complete Temporal workflow orchestration to the FoodBot platform, covering the entire lifecycle from user onboarding through order fulfillment and delivery. The implementation includes:

- **6 workflows** covering all critical business processes
- **5 activity modules** organized by domain (database, payment, notification, external, LLM)
- **Worker infrastructure** with single-worker and pool-based manager
- **Gateway API integration** via `TemporalService` with typed methods for each workflow
- **Comprehensive error handling** with custom error hierarchy, retry policies, and compensation
- **Docker Compose** for Temporal server, UI, and admin tools
- **Test coverage** for all workflows and activity functions

---

## Complete Workflow Catalog

### 1. Search Restaurant Workflow (`searchRestaurantWorkflow`)

**File:** `packages/workflows/src/workflows/searchRestaurant.workflow.ts`
**Task Queue:** `foodbot-main-queue`
**Timeout:** 2 minutes

| Step | Activity | Description |
|------|----------|-------------|
| 1 | `loadUserContext` | Load user preferences from cache/Neo4j |
| 2 | `getFromCache` | Check for cached search results |
| 3 | `callMCPSearch` | Query MCP search API |
| 4 | `applyFilters` | Apply cuisine, price, rating filters |
| 5 | `rankResults` | Rank by user preferences and proximity |
| 6 | `setInCache` + `cacheResults` | Cache results for 30 minutes |

**Retry Policy:** 3 attempts, 1s initial interval, 2x backoff, 30s max interval

---

### 2. Place Order Workflow (`placeOrderWorkflow`)

**File:** `packages/workflows/src/workflows/placeOrder.workflow.ts`
**Task Queue:** `foodbot-orders-queue`
**Timeout:** 5 minutes
**Pattern:** Saga with compensation

| Step | Activity | Compensation |
|------|----------|-------------|
| 1 | `validateCart` | - |
| 2 | `checkInventory` | - |
| 3 | `reserveItems` | `releaseItems` |
| 4 | `processPayment` | `refundPayment` |
| 5 | `createOrder` | - |
| 6 | `updateOrderStatus` | - |
| 7 | `notifyRestaurant` + `notifyCustomer` | - |

**Compensation Order:** Reverse (refundPayment -> releaseItems)

---

### 3. Process Payment Workflow (`processPaymentWorkflow`)

**File:** `packages/workflows/src/workflows/processPayment.workflow.ts`
**Task Queue:** `foodbot-payments-queue`
**Timeout:** 5 minutes

| Step | Activity | Description |
|------|----------|-------------|
| 1 | `loadFromDatabase` | Idempotency check |
| 2 | Validate | Amount validation |
| 3 | `saveToDatabase` | Initial payment record |
| 4 | `callPaymentGateway` | Gateway charge |
| 5 | 3DS flow | `callPaymentGateway` (retry with 3DS) |
| 6 | `updateDatabase` | Record payment result |
| 7 | `notifyCustomer` | Success/failure notification |

**Features:** Idempotency, 3D Secure, partial authorization, fraud detection

---

### 4. Order Fulfillment Workflow (`orderFulfillmentWorkflow`)

**File:** `packages/workflows/src/workflows/orderFulfillment.workflow.ts`
**Task Queue:** `foodbot-orders-queue`
**Timeout:** 3 hours
**Pattern:** Signal-driven state machine

| Step | Activity | Wait Condition |
|------|----------|---------------|
| 1 | `updateOrderStatus('preparing')` | - |
| 2 | `notifyRestaurant` | Signal: `orderReady` (45m timeout) |
| 3 | `assignDeliveryPartner` | - |
| 4 | `callDeliveryService` | Signal: `orderPickedUp` (30m timeout) |
| 5 | `trackDelivery` (polling) | Signal: `orderDelivered` |
| 6 | `updateOrderStatus('delivered')` | - |

**Signals:**
- `orderReady` - Restaurant marks order as ready
- `orderPickedUp` - Delivery partner picks up order
- `orderDelivered` - Delivery partner confirms delivery

**Timeout Handling:**
- Preparation timeout (45m): Extended wait + cancellation
- Pickup timeout (30m): Delivery partner re-assignment

---

### 5. User Onboarding Workflow (`userOnboardingWorkflow`)

**File:** `packages/workflows/src/workflows/userOnboarding.workflow.ts`
**Task Queue:** `foodbot-onboarding-queue`
**Timeout:** 15 days
**Pattern:** Timer-based engagement sequence

| Step | Delay | Activity | Condition |
|------|-------|----------|-----------|
| 1 | Immediate | `sendEmail` (welcome) | - |
| 2 | 1 day | `sendEmail` (getting started) | - |
| 3 | 3 days | Check if order placed | - |
| 4 | - | `sendEmail` (20% discount) | Only if no order |
| 5 | 7 days | `sendEmail` (feedback) | - |

**Signal:** `orderPlaced(orderId)` - Skips discount step

---

### 6. Restaurant Onboarding Workflow (`restaurantOnboardingWorkflow`)

**File:** `packages/workflows/src/workflows/restaurantOnboarding.workflow.ts`
**Task Queue:** `foodbot-onboarding-queue`
**Timeout:** 30 days
**Pattern:** Human-in-the-loop approval

| Step | Activity | Wait Condition |
|------|----------|---------------|
| 1 | `sendEmail` (verification) | Signal: `emailVerified` (7d) |
| 2 | `sendEmail` (admin review) | Signal: `adminApproved`/`adminRejected` (14d) |
| 3 | `callExternalAPI` (Stripe Connect) | - |
| 4 | `sendEmail` (welcome kit) | - |
| 5 | `updateDatabase` (activate listing) | - |

**Signals:**
- `emailVerified` - Owner verifies email
- `adminApproved` - Admin approves restaurant
- `adminRejected(reason)` - Admin rejects with reason

---

## Activity Implementations

### Domain Organization

| Module | File | Activities |
|--------|------|-----------|
| **Database** | `activities/database.activities.ts` | `saveToDatabase`, `loadFromDatabase`, `updateDatabase`, `deleteFromDatabase`, `createOrder`, `updateOrderStatus`, `cancelOrder` |
| **Payment** | `activities/payment.activities.ts` | `processPayment`, `refundPayment`, `callPaymentGateway`, `validateCart`, `checkInventory`, `reserveItems`, `releaseItems` |
| **Notification** | `activities/notification.activities.ts` | `sendEmail`, `sendSMS`, `sendPushNotification`, `sendInAppNotification`, `notifyRestaurant`, `notifyCustomer` |
| **External** | `activities/external.activities.ts` | `callMCPSearch`, `applyFilters`, `rankResults`, `getFromCache`, `setInCache`, `invalidateCache`, `clearCachePattern`, `cacheResults`, `callDeliveryService`, `assignDeliveryPartner`, `trackDelivery`, `callInventoryService`, `callExternalAPI` |
| **LLM** | `activities/llm.activities.ts` | `extractIntent`, `enrichWithContext`, `generateWorkflow`, `validateWorkflow`, `callLLM`, `cacheLLMResponse`, `loadPreferenceGraph`, `generateRecommendations`, `updatePreferenceGraph`, `decayOldPreferences`, `cacheRecommendations`, `loadUserContext`, `searchDishes` |

### Service Initialization

Each activity module provides an initialization function for injecting real service instances at worker startup:

```typescript
// At worker startup
import { initializeRepositories } from './activities/database.activities';
import { initializePaymentGateway } from './activities/payment.activities';
import { initializeNotificationServices } from './activities/notification.activities';
import { initializeExternalServices } from './activities/external.activities';
import { initializeLLMService } from './activities/llm.activities';

// Inject real services
initializeRepositories({ orders: orderRepo, payments: paymentRepo });
initializePaymentGateway(stripeGateway);
initializeNotificationServices({ email: sendGridService, sms: twilioService });
initializeExternalServices({ mcp: mcpClient, delivery: deliveryAPI });
initializeLLMService(claudeService);
```

---

## Worker Setup Guide

### Single Worker (Development)

```bash
# Start Temporal server
docker-compose -f docker-compose.temporal.yml up -d

# Run single worker
cd packages/workflows
npm run worker

# Or with environment variables
TEMPORAL_ADDRESS=localhost:7233 \
TEMPORAL_TASK_QUEUE=foodbot-main-queue \
npm run worker
```

### Worker Pool (Production)

```bash
# Run worker manager (starts workers for all task queues)
npm run worker:manager

# Configuration via environment
TEMPORAL_ADDRESS=temporal:7233 \
TEMPORAL_NAMESPACE=production \
npm run worker:manager
```

### Task Queue Architecture

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `foodbot-main-queue` | Search, general | 100 activities / 50 workflows |
| `foodbot-orders-queue` | Order placement & fulfillment | 50 activities / 25 workflows |
| `foodbot-payments-queue` | Payment processing | 30 activities / 15 workflows |
| `foodbot-notifications-queue` | All notification delivery | 200 activities / 100 workflows |
| `foodbot-onboarding-queue` | User & restaurant onboarding | 20 activities / 10 workflows |

### Worker Manager API

```typescript
import { WorkerManager } from '@foodbot/workflows';

const manager = new WorkerManager({
  temporalAddress: 'localhost:7233',
  namespace: 'default',
  workersPerQueue: 3,
});

await manager.startWorkers();

// Health monitoring
const status = manager.getWorkerStatus();
const activeCount = manager.getActiveWorkerCount();

// Dynamic scaling
await manager.scaleWorkers('foodbot-orders-queue', 5);

// Graceful shutdown
await manager.stopWorkers();
```

---

## Gateway API Integration

### TemporalService

**File:** `apps/gateway-api/src/temporal/temporal.service.ts`

```typescript
import { TemporalService } from './temporal/temporal.service';

const temporal = new TemporalService('localhost:7233', 'default');
await temporal.connect();

// Search
const results = await temporal.executeSearchWorkflow({
  userId: 'user_123',
  query: 'Italian pizza',
  filters: { cuisine: ['Italian'] },
});

// Place Order
const orderResult = await temporal.executeOrderWorkflow({
  userId: 'user_123',
  restaurantId: 'rest_456',
  items: [{ dishId: 'dish_1', quantity: 2, price: 15 }],
  paymentDetails: { method: 'card', amount: 30, currency: 'USD' },
  deliveryAddress: '123 Main St',
});

// Start Fulfillment (long-running)
const { workflowId } = await temporal.startOrderFulfillmentWorkflow({
  orderId: 'order_789',
  restaurantId: 'rest_456',
  userId: 'user_123',
  deliveryAddress: '123 Main St',
});

// Signal order ready
await temporal.signalOrderReady(workflowId);

// Onboarding
await temporal.startUserOnboardingWorkflow({
  userId: 'user_new',
  email: 'new@example.com',
  name: 'New User',
});
```

### NestJS Module Integration

```typescript
import { TEMPORAL_SERVICE_PROVIDER } from './temporal/temporal.module';

@Module({
  providers: [TEMPORAL_SERVICE_PROVIDER],
})
export class AppModule {}
```

---

## Error Handling & Retry Policies

### Error Hierarchy

```
WorkflowError (base)
  PaymentError
    PaymentDeclinedError (non-retryable)
    PaymentTimeoutError (retryable)
    PaymentGatewayError (retryable)
    PaymentFraudError (non-retryable)
  OrderError
    OrderNotFoundError (non-retryable)
    InventoryUnavailableError (non-retryable)
    InvalidCartError (non-retryable)
  ExternalServiceError (retryable)
    MCPSearchError
    DeliveryServiceError
  DatabaseError (retryable)
  NotificationError (retryable)
```

### Retry Policies

| Policy | Initial | Backoff | Max Interval | Max Attempts |
|--------|---------|---------|-------------|-------------|
| DEFAULT | 1s | 2x | 30s | 3 |
| PAYMENT | 1s | 2x | 30s | 5 |
| EXTERNAL_API | 2s | 2x | 60s | 5 |
| NOTIFICATION | 5s | 2x | 120s | 10 |
| CACHE | 500ms | 1.5x | 5s | 3 |
| NO_RETRY | - | - | - | 1 |

### Compensation Logic (Saga Pattern)

The `placeOrderWorkflow` implements full saga compensation:

1. Items reserved -> Compensate: `releaseItems`
2. Payment processed -> Compensate: `refundPayment`
3. Order created -> (no compensation needed - can be cancelled)

Compensations execute in **reverse order** on any failure.

---

## Testing Strategy

### Test Files

| File | Type | Description |
|------|------|-------------|
| `__tests__/searchRestaurant.workflow.test.ts` | Integration | Search workflow with retry, cache, timeout |
| `__tests__/placeOrder.workflow.test.ts` | Integration | Order workflow with saga, compensation |
| `__tests__/processPayment.workflow.test.ts` | Integration | Payment with 3DS, retry, idempotency |
| `__tests__/orderFulfillment.workflow.test.ts` | Integration | Fulfillment with signals, timeouts |
| `__tests__/userOnboarding.workflow.test.ts` | Integration | Multi-day onboarding with signals |
| `__tests__/restaurantOnboarding.workflow.test.ts` | Integration | Approval flow with signals |
| `__tests__/activities.test.ts` | Unit | Direct activity function tests |

### Test Infrastructure

- **Test Environment:** `@temporalio/testing` `TestWorkflowEnvironment.createLocal()`
- **Mock Activities:** `test/mocks/activity-mocks.ts` with `MockActivity` class
- **Test Factories:** `test/factories/workflow-input.factory.ts`
- **Time Skipping:** Temporal test server auto-skips `sleep()` calls

### Running Tests

```bash
cd packages/workflows

# All tests
npm test

# Specific workflow
npm test -- --testPathPattern=orderFulfillment

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Production Deployment Guide

### Infrastructure Options

#### Option A: Self-Hosted Temporal (Docker Compose)

```bash
# Start with full stack
docker-compose -f docker-compose.yml up -d

# Or Temporal only
docker-compose -f docker-compose.temporal.yml up -d
```

**Requirements:**
- PostgreSQL 15+ (for Temporal persistence)
- 2 CPU cores, 4GB RAM minimum for Temporal server
- Additional resources per worker instance

#### Option B: Temporal Cloud

For production, consider Temporal Cloud:
- Managed service, no infrastructure overhead
- Built-in monitoring and alerting
- SLA guarantees

```typescript
import { Connection, Client } from '@temporalio/client';

const connection = await Connection.connect({
  address: 'your-namespace.tmprl.cloud:7233',
  tls: {
    clientCertPair: {
      crt: fs.readFileSync('client.pem'),
      key: fs.readFileSync('client.key'),
    },
  },
});
```

### Worker Scaling Strategy

| Metric | Action |
|--------|--------|
| Activity task latency > 5s | Scale up workers |
| Activity queue depth > 100 | Scale up activity workers |
| Workflow task latency > 1s | Scale up workflow workers |
| CPU utilization > 80% | Add worker nodes |
| Memory utilization > 70% | Add worker nodes |

### High Availability

1. **Multiple worker instances** per task queue (minimum 3)
2. **Health checks** via WorkerManager status API
3. **Auto-restart** on worker crash (built into WorkerManager)
4. **Connection pooling** with shared NativeConnection
5. **Graceful shutdown** with drain before termination

### Backup and Disaster Recovery

- Temporal persists all workflow state in PostgreSQL
- Standard database backup procedures apply
- Point-in-time recovery via PostgreSQL WAL
- Cross-region replication for DR

---

## Monitoring Setup

### Temporal UI Dashboard

- **URL:** `http://localhost:8088` (development)
- **Features:** Workflow list, execution history, task queue metrics

### Metrics (Prometheus)

Temporal server exposes metrics on port 7235:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'temporal'
    static_configs:
      - targets: ['temporal:7235']
```

### Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| `temporal_workflow_completed` | Completed workflows | - |
| `temporal_workflow_failed` | Failed workflows | > 5% failure rate |
| `temporal_activity_execution_latency` | Activity duration | p95 > 10s |
| `temporal_workflow_task_schedule_to_start_latency` | Queue wait time | > 5s |
| `temporal_activity_task_schedule_to_start_latency` | Activity queue wait | > 10s |

### Custom Monitoring (WorkerManager)

```typescript
// Health endpoint for load balancer
app.get('/health/workers', (req, res) => {
  const status = workerManager.getWorkerStatus();
  const activeCount = workerManager.getActiveWorkerCount();

  if (activeCount === 0) {
    return res.status(503).json({ status: 'unhealthy', workers: status });
  }

  return res.json({ status: 'healthy', activeWorkers: activeCount, workers: status });
});
```

---

## File Inventory

### New Files Created

```
docker-compose.temporal.yml                              # Temporal-only Docker Compose
packages/workflows/src/types/index.ts                    # Shared type definitions
packages/workflows/src/activities/database.activities.ts  # Database CRUD activities
packages/workflows/src/activities/payment.activities.ts   # Payment & cart activities
packages/workflows/src/activities/notification.activities.ts # Multi-channel notifications
packages/workflows/src/activities/external.activities.ts  # External APIs, cache, delivery
packages/workflows/src/activities/llm.activities.ts       # LLM, recommendations, context
packages/workflows/src/workflows/orderFulfillment.workflow.ts  # Order lifecycle workflow
packages/workflows/src/workflows/userOnboarding.workflow.ts    # User engagement workflow
packages/workflows/src/workflows/restaurantOnboarding.workflow.ts # Restaurant partner workflow
packages/workflows/src/workers/worker.ts                  # Single worker entry point
packages/workflows/src/workers/worker-manager.ts          # Worker pool manager
packages/workflows/src/errors/index.ts                    # Error hierarchy & retry policies
apps/gateway-api/src/temporal/temporal.service.ts         # API-to-Temporal client service
apps/gateway-api/src/temporal/temporal.module.ts          # NestJS module integration
packages/workflows/src/__tests__/orderFulfillment.workflow.test.ts
packages/workflows/src/__tests__/userOnboarding.workflow.test.ts
packages/workflows/src/__tests__/restaurantOnboarding.workflow.test.ts
packages/workflows/src/__tests__/activities.test.ts
```

### Modified Files

```
packages/workflows/src/activities/index.ts       # Re-exports from domain modules
packages/workflows/src/workflows/index.ts        # Exports new workflows + signals
packages/workflows/src/index.ts                  # Full package exports
packages/workflows/package.json                  # Worker scripts, ts-node dep
temporal-config/development-sql.yaml             # Dynamic config values
.env.example                                     # Temporal environment variables
```

---

## Summary

The Temporal integration is complete with:

- **6 production-ready workflows** covering search, orders, payments, fulfillment, and onboarding
- **40+ activity functions** organized across 5 domain modules
- **Worker infrastructure** supporting both single-instance and pooled deployments
- **Full saga pattern** implementation with compensation logic
- **Signal-driven workflows** for human-in-the-loop processes
- **Long-running workflows** with timer-based engagement (up to 30 days)
- **Comprehensive error handling** with typed errors and configurable retry policies
- **Gateway API integration** with typed methods for every workflow
- **Docker infrastructure** for local development and testing
- **Test coverage** for all workflow paths including happy paths, failures, and edge cases

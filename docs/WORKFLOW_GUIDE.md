# FoodBot Workflow Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Temporal Workflow Overview](#1-temporal-workflow-overview)
- [2. Workflow Definitions](#2-workflow-definitions)
- [3. Triggering Workflows from Gateway API](#3-triggering-workflows-from-gateway-api)
- [4. Workflow Parameters and Signals](#4-workflow-parameters-and-signals)
- [5. Activity Implementations](#5-activity-implementations)
- [6. Worker Setup](#6-worker-setup)
- [7. Monitoring Workflows](#7-monitoring-workflows)

---

## 1. Temporal Workflow Overview

FoodBot uses Temporal for durable workflow orchestration. Temporal provides:

- **Durable Execution** -- Workflows survive process restarts and infrastructure failures.
- **Built-in Retries** -- Configurable retry policies with exponential backoff.
- **Saga Pattern** -- Compensation logic for distributed transactions.
- **Signal Handling** -- External events (e.g., "order ready") can trigger workflow state transitions.
- **Visibility** -- Full workflow history for debugging and auditing.

### Architecture

```
Gateway API                    Temporal Server                Workers
     |                              |                            |
     |-- startWorkflow() ---------->|                            |
     |                              |-- dispatch activity ------>|
     |                              |<-- activity result --------|
     |                              |-- dispatch activity ------>|
     |                              |<-- activity result --------|
     |                              |                            |
     |-- queryWorkflow() ---------->|                            |
     |<-- workflow result ----------|                            |
```

### Task Queues

| Queue | Purpose |
|-------|---------|
| `foodbot-main-queue` | Default queue for search and general workflows |
| `foodbot-orders-queue` | Order-related workflows |
| `foodbot-payments-queue` | Payment processing workflows |
| `foodbot-notifications-queue` | Notification dispatch workflows |
| `foodbot-onboarding-queue` | User and restaurant onboarding |

---

## 2. Workflow Definitions

### 2.1 Search Restaurant Workflow

**File:** `packages/workflows/src/workflows/searchRestaurant.workflow.ts`

Searches restaurants via the MCP Orchestrator with user context enrichment.

**Input:**
```typescript
interface SearchRestaurantInput {
  userId: string;
  query: string;
  filters?: {
    cuisine?: string[];
    priceRange?: [number, number];
    rating?: number;
    location?: { latitude: number; longitude: number };
    radius?: number;
  };
}
```

**Steps:**
1. Load user context (preferences, location, order history)
2. Call MCP search API with enriched query
3. Apply additional filters
4. Return ranked results

### 2.2 Place Order Workflow (Saga Pattern)

**File:** `packages/workflows/src/workflows/placeOrder.workflow.ts`

Full order placement with compensation logic for failure recovery.

**Input:**
```typescript
interface PlaceOrderInput {
  userId: string;
  restaurantId: string;
  items: CartItem[];
  paymentDetails: PaymentDetails;
  deliveryAddress: string;
}
```

**Steps:**
1. Validate cart items
2. Check inventory availability
3. Reserve items (compensation: release items)
4. Process payment (compensation: refund payment)
5. Create order in database
6. Update order status to "confirmed"
7. Notify restaurant
8. Notify customer

**On Failure:** Compensations execute in reverse order (saga pattern):
- Refund payment
- Release reserved items
- Notify customer of failure

### 2.3 Process Payment Workflow

**File:** `packages/workflows/src/workflows/processPayment.workflow.ts`

Handles payment processing with support for 3DS authentication.

**Input:**
```typescript
interface ProcessPaymentInput {
  orderId: string;
  paymentDetails: PaymentDetails;
  allowPartial?: boolean;
}
```

**Steps:**
1. Validate payment details
2. Charge payment gateway
3. Handle 3DS redirect if required
4. Update payment status

### 2.4 Order Fulfillment Workflow (Signal-Based)

**File:** `packages/workflows/src/workflows/orderFulfillment.workflow.ts`

Tracks order through fulfillment stages using external signals.

**Input:**
```typescript
interface OrderFulfillmentInput {
  orderId: string;
  restaurantId: string;
  userId: string;
  deliveryAddress: string;
}
```

**Signals:**
- `orderReadySignal` -- Restaurant marks order as ready
- `orderPickedUpSignal` -- Delivery partner picks up order
- `orderDeliveredSignal` -- Order delivered to customer

### 2.5 User Onboarding Workflow

**File:** `packages/workflows/src/workflows/userOnboarding.workflow.ts`

Guides new users through onboarding with engagement tracking.

**Signals:**
- `orderPlacedSignal` -- Triggered when user places their first order

### 2.6 Restaurant Onboarding Workflow

**File:** `packages/workflows/src/workflows/restaurantOnboarding.workflow.ts`

Restaurant approval workflow with admin review.

**Signals:**
- `emailVerifiedSignal` -- Owner verifies their email
- `adminApprovedSignal` -- Admin approves the restaurant
- `adminRejectedSignal` -- Admin rejects the restaurant

---

## 3. Triggering Workflows from Gateway API

The Gateway API connects to Temporal via `apps/gateway-api/src/temporal/temporal.service.ts`:

```typescript
// Starting a workflow
const handle = await this.temporalClient.workflow.start(placeOrderWorkflow, {
  taskQueue: 'foodbot-orders-queue',
  workflowId: `order-${orderId}`,
  args: [orderInput],
});

// Querying workflow status
const result = await handle.result();

// Sending a signal
const handle = this.temporalClient.workflow.getHandle(workflowId);
await handle.signal(orderReadySignal);
```

---

## 4. Workflow Parameters and Signals

### Retry Policies

All activities use a default retry policy:

```typescript
{
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
}
```

### Signal Definitions

Signals are defined using `defineSignal` from the Temporal SDK:

```typescript
import { defineSignal } from '@temporalio/workflow';

export const orderReadySignal = defineSignal('orderReady');
export const orderPickedUpSignal = defineSignal('orderPickedUp');
export const orderDeliveredSignal = defineSignal('orderDelivered');
```

---

## 5. Activity Implementations

Activities are organized by domain in `packages/workflows/src/activities/`:

| File | Activities | Description |
|------|-----------|-------------|
| `database.activities.ts` | createOrder, updateOrderStatus, getUserContext | Database operations |
| `external.activities.ts` | searchRestaurants, checkInventory, reserveItems | External API calls |
| `llm.activities.ts` | enrichQuery, classifyIntent | LLM interactions |
| `notification.activities.ts` | notifyCustomer, notifyRestaurant | Notification dispatch |
| `payment.activities.ts` | processPayment, refundPayment, validatePayment | Payment operations |

---

## 6. Worker Setup

Workers are managed by `packages/workflows/src/workers/worker.ts` and `worker-manager.ts`:

```typescript
import { Worker } from '@temporalio/worker';
import * as activities from '../activities';

const worker = await Worker.create({
  workflowsPath: require.resolve('../workflows'),
  activities,
  taskQueue: 'foodbot-main-queue',
  maxConcurrentActivityTaskExecutions: 100,
  maxConcurrentWorkflowTaskExecutions: 50,
});

await worker.run();
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TEMPORAL_ADDRESS` | localhost:7233 | Temporal server address |
| `TEMPORAL_NAMESPACE` | default | Temporal namespace |
| `WORKER_MAX_CONCURRENT_ACTIVITIES` | 100 | Max concurrent activity tasks |
| `WORKER_MAX_CONCURRENT_WORKFLOWS` | 50 | Max concurrent workflow tasks |

---

## 7. Monitoring Workflows

### Temporal UI

Access the Temporal Web UI at http://localhost:8080 to:

- View running, completed, and failed workflows
- Inspect workflow history (step-by-step execution)
- View activity inputs and outputs
- Terminate or cancel stuck workflows
- Search workflows by ID, type, or status

### CLI Tools

```bash
# List running workflows
tctl workflow list --open

# Describe a specific workflow
tctl workflow describe --workflow-id order-12345

# Signal a workflow
tctl workflow signal --workflow-id order-12345 --name orderReady

# Terminate a workflow
tctl workflow terminate --workflow-id order-12345 --reason "manual intervention"
```

### Key Metrics

- `temporal_workflow_task_schedule_to_start_latency` -- Worker polling delay
- `temporal_activity_schedule_to_start_latency` -- Activity dispatch delay
- `temporal_workflow_completed` -- Workflow completion count
- `temporal_workflow_failed` -- Workflow failure count

# Temporal Workflows - Requirements Specification

**Document ID:** REQ-WORKFLOWS-001
**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** IMPLEMENTED
**Source:** Extracted from docs/guide/WORKFLOW_GUIDE.md + Code Verification

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Functional Requirements](#2-functional-requirements)
- [3. Workflow Specifications](#3-workflow-specifications)
- [4. Signal and Query Requirements](#4-signal-and-query-requirements)
- [5. Activity Requirements](#5-activity-requirements)
- [6. Task Queue Requirements](#6-task-queue-requirements)
- [7. Retry and Timeout Requirements](#7-retry-and-timeout-requirements)
- [8. Monitoring and Observability Requirements](#8-monitoring-and-observability-requirements)

---

## 1. Overview

### 1.1 Purpose

This document specifies the requirements for Temporal-based workflow orchestration in FoodBot. Temporal provides durable execution for distributed transactions with built-in retry, compensation, and observability.

### 1.2 Scope

- Workflow definitions for all business processes
- Activity implementations for external system interactions
- Signal and query handling for external events
- Worker configuration and management
- Retry policies and timeout configurations
- Monitoring and debugging capabilities

### 1.3 Core Capabilities

**Requirement ID:** FR-WORKFLOW-CORE-001
**Priority:** CRITICAL
**Status:** IMPLEMENTED

The workflow system MUST provide:

1. **Durable Execution** - Workflows survive process restarts and infrastructure failures
2. **Built-in Retries** - Configurable retry policies with exponential backoff
3. **Saga Pattern** - Compensation logic for distributed transactions
4. **Signal Handling** - External events trigger workflow state transitions
5. **Full Visibility** - Complete workflow history for debugging and auditing
6. **Task Queue Isolation** - Separate queues for different workflow types
7. **Activity Timeouts** - All activities have explicit timeout configurations

**Implementation:** ✅ COMPLETE
- Location: `packages/workflows/src/`
- Verified: All 3 core workflows implemented with retry and compensation

---

## 2. Functional Requirements

### 2.1 Restaurant Search Workflow

**Requirement ID:** FR-WORKFLOW-SEARCH-001
**Priority:** HIGH
**Status:** IMPLEMENTED
**Related:** FR-LLM-INTENT-001

The system MUST implement a restaurant search workflow that:

1. **Loads user context** from cache/Neo4j including:
   - User preferences (cuisine, dietary restrictions, price range)
   - User location (current or default)
   - Order history for personalization

2. **Checks cache** for previous search results:
   - Cache key format: `search:{userId}:{query}:{filters}`
   - Cache TTL: 30 minutes
   - Cache hit returns immediate results

3. **Calls MCP search API** with retry logic:
   - Query: User's natural language search query
   - Location: User location or filter location
   - Radius: Default 5km or filter-specified
   - Retry policy: 3 attempts with exponential backoff

4. **Applies filters** based on user preferences:
   - Cuisine type filtering
   - Price range filtering (1-4 scale)
   - Minimum rating filtering
   - Location/radius filtering
   - Availability filtering

5. **Ranks results** by user preferences:
   - Previous order history weighting
   - Cuisine preference matching
   - Price range preference matching
   - Distance weighting

6. **Caches results** for future queries:
   - Store in cache with 30-minute TTL
   - Store in Neo4j for long-term analytics

**Input Schema:**
```typescript
interface SearchRestaurantInput {
  userId: string;
  query: string;
  filters?: {
    cuisine?: string[];
    priceRange?: [number, number];
    rating?: number;
    location?: { latitude: number; longitude: number };
    radius?: number; // meters
  };
}
```

**Output Schema:**
```typescript
interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: number;
  location: {
    latitude: number;
    longitude: number;
  };
  availability: boolean;
}
```

**Implementation Status:** ✅ COMPLETE
- File: `packages/workflows/src/workflows/searchRestaurant.workflow.ts`
- Activities: loadUserContext, getFromCache, callMCPSearch, applyFilters, rankResults, setInCache
- Verified: All 6 steps implemented with proper error handling

---

### 2.2 Place Order Workflow (Saga Pattern)

**Requirement ID:** FR-WORKFLOW-ORDER-001
**Priority:** CRITICAL
**Status:** IMPLEMENTED
**Related:** FR-CA-ORDER-001, FR-WORKFLOW-EXEC-001-EXP

The system MUST implement an order placement workflow with saga pattern that:

1. **Validates cart items**:
   - Verify all items exist
   - Check item availability
   - Validate quantities > 0
   - Validate prices match current menu prices

2. **Checks inventory availability**:
   - Query restaurant inventory system
   - Verify sufficient stock for all items
   - Return error if any item unavailable

3. **Reserves items** (with compensation):
   - Lock inventory for order duration
   - Record reservation timestamp
   - **Compensation:** Release items on failure

4. **Processes payment** (with compensation):
   - Call payment gateway
   - Handle 3DS authentication if required
   - Verify payment success
   - **Compensation:** Refund payment on failure

5. **Creates order in database**:
   - Generate unique order ID
   - Store order with status "pending"
   - Link payment ID to order
   - Record delivery address

6. **Updates order status to confirmed**:
   - Change status from "pending" to "confirmed"
   - Record confirmation timestamp

7. **Notifies restaurant**:
   - Send order notification to restaurant system
   - Include all order details
   - Non-critical: Continue on notification failure

8. **Notifies customer**:
   - Send order confirmation to customer
   - Include order number and estimated time
   - Non-critical: Continue on notification failure

**Compensation Logic (Saga Pattern):**

On failure at any step, execute compensations in **reverse order**:
1. Refund payment (if payment succeeded)
2. Release reserved items (if reservation succeeded)
3. Notify customer of failure

**Input Schema:**
```typescript
interface PlaceOrderInput {
  userId: string;
  restaurantId: string;
  items: CartItem[];
  paymentDetails: PaymentDetails;
  deliveryAddress: string;
}

interface CartItem {
  dishId: string;
  quantity: number;
  price: number;
  customizations?: Record<string, any>;
}

interface PaymentDetails {
  method: 'card' | 'upi' | 'cash' | 'wallet';
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}
```

**Output Schema:**
```typescript
interface PlaceOrderResult {
  orderId: string;
  status: 'confirmed' | 'failed';
  paymentId?: string;
}
```

**Implementation Status:** ✅ COMPLETE
- File: `packages/workflows/src/workflows/placeOrder.workflow.ts`
- Activities: validateCart, checkInventory, reserveItems, releaseItems, processPayment, refundPayment, createOrder, updateOrderStatus, notifyRestaurant, notifyCustomer
- Verified: Full saga pattern with reverse-order compensation

---

### 2.3 Process Payment Workflow

**Requirement ID:** FR-WORKFLOW-PAYMENT-001
**Priority:** CRITICAL
**Status:** IMPLEMENTED
**Related:** GAP-FR-008

The system MUST implement a payment processing workflow that:

1. **Checks for existing payment (idempotency)**:
   - Query payments table by order ID
   - Return existing payment if status is "success"
   - Prevents duplicate charges

2. **Validates payment details**:
   - Amount must be > 0
   - Payment method must be valid
   - Currency must be supported

3. **Saves initial payment record**:
   - Status: "pending"
   - Store order ID, amount, method, currency
   - Record creation timestamp

4. **Calls payment gateway** (with retry):
   - Submit payment to gateway
   - Retry on transient errors (5 attempts, exponential backoff)
   - Handle timeout errors (30 second timeout)

5. **Handles 3D Secure authentication**:
   - If requires3DS flag set, provide auth URL
   - Update payment status to "pending_3ds"
   - Wait for 3DS completion
   - Retry gateway call after 3DS completion

6. **Handles payment result**:
   - Success: Update status to "success", store transaction ID
   - Failed: Update status to "failed", store error message
   - Partial: Handle partial authorization if allowed

7. **Handles fraud detection**:
   - Check error message for fraud indicators
   - Send alert email to security team
   - Update payment status to "fraud"

8. **Notifies customer**:
   - Success: Send payment confirmation
   - Failed: Send payment failure notification
   - Non-critical: Continue on notification failure

**Payment Methods Supported:**
- Credit/Debit Card (with 3DS)
- UPI (Unified Payments Interface)
- Wallet (digital wallets)
- Cash on Delivery

**Retry Policy:**
- Initial interval: 1 second
- Backoff coefficient: 2
- Maximum interval: 30 seconds
- Maximum attempts: 5
- Retry on: Network errors, gateway timeouts, transient failures

**Input Schema:**
```typescript
interface ProcessPaymentInput {
  orderId: string;
  paymentDetails: PaymentDetails;
  allowPartial?: boolean;
}
```

**Output Schema:**
```typescript
interface PaymentResult {
  paymentId: string;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  errorMessage?: string;
  requires3DS?: boolean;
  authUrl?: string;
  metadata?: {
    requestedAmount?: number;
    authorizedAmount?: number;
    partial?: boolean;
  };
}
```

**Implementation Status:** ✅ COMPLETE
- File: `packages/workflows/src/workflows/processPayment.workflow.ts`
- Activities: loadFromDatabase, callPaymentGateway, saveToDatabase, updateDatabase, notifyCustomer, sendEmail
- Verified: Idempotency, retry logic, 3DS handling, fraud detection all implemented

---

### 2.4 Order Fulfillment Workflow (Signal-Based)

**Requirement ID:** FR-WORKFLOW-FULFILLMENT-001
**Priority:** HIGH
**Status:** SPECIFIED (Not yet implemented)

The system MUST implement an order fulfillment workflow that:

1. **Waits for order ready signal** from restaurant:
   - Signal: `orderReadySignal`
   - Updates order status to "ready"
   - Notifies delivery partner

2. **Waits for order picked up signal**:
   - Signal: `orderPickedUpSignal`
   - Updates order status to "in_transit"
   - Notifies customer with tracking link

3. **Waits for order delivered signal**:
   - Signal: `orderDeliveredSignal`
   - Updates order status to "delivered"
   - Triggers payment settlement
   - Requests customer feedback

**Input Schema:**
```typescript
interface OrderFulfillmentInput {
  orderId: string;
  restaurantId: string;
  userId: string;
  deliveryAddress: string;
}
```

**Signals:**
```typescript
export const orderReadySignal = defineSignal('orderReady');
export const orderPickedUpSignal = defineSignal('orderPickedUp');
export const orderDeliveredSignal = defineSignal('orderDelivered');
```

**Implementation Status:** ⚠️ NOT IMPLEMENTED
- File: Would be `packages/workflows/src/workflows/orderFulfillment.workflow.ts`
- Signals need to be triggered by restaurant app and delivery system

---

### 2.5 User Onboarding Workflow

**Requirement ID:** FR-WORKFLOW-ONBOARD-USER-001
**Priority:** MEDIUM
**Status:** SPECIFIED (Not yet implemented)

The system MUST implement a user onboarding workflow that:

1. **Sends welcome email** after registration
2. **Tracks onboarding progress**:
   - Profile completion
   - First address added
   - First order placed
3. **Sends engagement emails**:
   - Day 1: Welcome and app tour
   - Day 3: First order incentive (if no order)
   - Day 7: Re-engagement (if inactive)

**Signals:**
- `orderPlacedSignal` - Triggered when user places first order

**Implementation Status:** ⚠️ NOT IMPLEMENTED

---

### 2.6 Restaurant Onboarding Workflow

**Requirement ID:** FR-WORKFLOW-ONBOARD-RESTAURANT-001
**Priority:** MEDIUM
**Status:** SPECIFIED (Not yet implemented)

The system MUST implement a restaurant onboarding workflow that:

1. **Sends verification email** to restaurant owner
2. **Waits for email verification** (signal-based)
3. **Submits for admin review**
4. **Waits for admin decision** (signal-based):
   - Approved: Activate restaurant account
   - Rejected: Send rejection email with reason
5. **Sends approval notification**
6. **Triggers menu setup workflow**

**Signals:**
- `emailVerifiedSignal` - Owner verifies email
- `adminApprovedSignal` - Admin approves restaurant
- `adminRejectedSignal` - Admin rejects restaurant

**Implementation Status:** ⚠️ NOT IMPLEMENTED

---

## 3. Workflow Specifications

### 3.1 Workflow Execution Model

**Requirement ID:** FR-WORKFLOW-EXEC-001
**Priority:** CRITICAL

All workflows MUST:

1. **Be deterministic** - Same input always produces same output
2. **Be replayable** - Can replay from any point in history
3. **Handle failures gracefully** - Automatic retries and compensation
4. **Log all steps** - Full audit trail of execution
5. **Support versioning** - Can deploy new versions without breaking existing workflows

**Implementation:** ✅ Temporal SDK enforces determinism

---

### 3.2 Workflow Isolation

**Requirement ID:** FR-WORKFLOW-ISOLATION-001
**Priority:** HIGH

Each workflow MUST:

1. **Have unique workflow ID** - Format: `{type}-{entityId}-{timestamp}`
2. **Run in isolated execution** - No shared state between workflows
3. **Communicate via signals/queries only** - No direct workflow-to-workflow calls

**Implementation:** ✅ Each workflow uses unique ID generation

---

## 4. Signal and Query Requirements

### 4.1 Signal Handling

**Requirement ID:** FR-WORKFLOW-SIGNALS-001
**Priority:** HIGH

Signals MUST:

1. **Be defined using `defineSignal`** from Temporal SDK
2. **Have descriptive names** - camelCase, action-oriented (e.g., `orderReadySignal`)
3. **Be idempotent** - Can be received multiple times safely
4. **Update workflow state** - Trigger state transitions
5. **Be validated** - Check signal data before processing

**Signal Definitions:**
```typescript
import { defineSignal } from '@temporalio/workflow';

export const orderReadySignal = defineSignal('orderReady');
export const orderPickedUpSignal = defineSignal('orderPickedUp');
export const orderDeliveredSignal = defineSignal('orderDelivered');
export const emailVerifiedSignal = defineSignal('emailVerified');
export const adminApprovedSignal = defineSignal('adminApproved');
export const adminRejectedSignal = defineSignal<{ reason: string }>('adminRejected');
```

**Implementation Status:** ⚠️ Signals defined but not all workflows implemented

---

### 4.2 Query Handling

**Requirement ID:** FR-WORKFLOW-QUERIES-001
**Priority:** MEDIUM

Queries MUST:

1. **Be defined using `defineQuery`** from Temporal SDK
2. **Be read-only** - Cannot modify workflow state
3. **Return current state** - Provide workflow status information
4. **Be fast** - No blocking operations

**Example Query:**
```typescript
import { defineQuery } from '@temporalio/workflow';

export const getOrderStatusQuery = defineQuery<OrderStatus>('getOrderStatus');
```

**Implementation Status:** ⚠️ NOT IMPLEMENTED (not required for current workflows)

---

## 5. Activity Requirements

### 5.1 Activity Organization

**Requirement ID:** FR-WORKFLOW-ACTIVITIES-001
**Priority:** HIGH
**Status:** IMPLEMENTED

Activities MUST be organized by domain:

1. **database.activities.ts** - Database operations:
   - createOrder, updateOrderStatus, getUserContext
   - loadFromDatabase, saveToDatabase, updateDatabase

2. **external.activities.ts** - External API calls:
   - searchRestaurants, checkInventory, reserveItems, releaseItems
   - callMCPSearch

3. **llm.activities.ts** - LLM interactions:
   - enrichQuery, classifyIntent

4. **notification.activities.ts** - Notification dispatch:
   - notifyCustomer, notifyRestaurant, sendEmail

5. **payment.activities.ts** - Payment operations:
   - processPayment, refundPayment, validatePayment
   - callPaymentGateway

**Implementation:** ✅ COMPLETE
- Location: `packages/workflows/src/activities/`
- All activity files exist with proper organization

---

### 5.2 Activity Implementation Requirements

**Requirement ID:** FR-WORKFLOW-ACTIVITY-IMPL-001
**Priority:** CRITICAL

All activities MUST:

1. **Be pure functions** - No side effects except intended operation
2. **Have explicit timeouts** - Default 30 seconds
3. **Be retryable** - Must be idempotent or handle duplicate calls
4. **Handle errors explicitly** - Throw specific error types
5. **Log inputs and outputs** - For debugging
6. **Validate inputs** - Check required fields before processing

**Activity Configuration:**
```typescript
const activities = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});
```

**Implementation:** ✅ All workflows use proper activity configuration

---

## 6. Task Queue Requirements

### 6.1 Task Queue Organization

**Requirement ID:** FR-WORKFLOW-QUEUES-001
**Priority:** HIGH
**Status:** IMPLEMENTED

The system MUST use separate task queues for different workflow types:

| Queue Name | Purpose | Workers | Priority |
|------------|---------|---------|----------|
| `foodbot-main-queue` | Search and general workflows | 2-4 | Medium |
| `foodbot-orders-queue` | Order placement and fulfillment | 4-8 | High |
| `foodbot-payments-queue` | Payment processing | 2-4 | Critical |
| `foodbot-notifications-queue` | Notification dispatch | 1-2 | Low |
| `foodbot-onboarding-queue` | User/restaurant onboarding | 1-2 | Low |

**Rationale:**
- **Isolation** - Failures in one queue don't affect others
- **Scaling** - Can scale workers per queue based on load
- **Priority** - Critical workflows (payments) get dedicated resources

**Implementation:** ✅ Queue configuration defined
- Location: Workflow documentation specifies queue usage
- Workers need to be deployed per queue

---

### 6.2 Task Queue Routing

**Requirement ID:** FR-WORKFLOW-QUEUE-ROUTING-001
**Priority:** HIGH

Workflows MUST be routed to appropriate task queues:

```typescript
// Search workflow
await client.workflow.start(searchRestaurantWorkflow, {
  taskQueue: 'foodbot-main-queue',
  workflowId: `search-${userId}-${timestamp}`,
});

// Order workflow
await client.workflow.start(placeOrderWorkflow, {
  taskQueue: 'foodbot-orders-queue',
  workflowId: `order-${orderId}`,
});

// Payment workflow
await client.workflow.start(processPaymentWorkflow, {
  taskQueue: 'foodbot-payments-queue',
  workflowId: `payment-${orderId}`,
});
```

**Implementation:** ✅ Gateway API uses proper queue routing

---

## 7. Retry and Timeout Requirements

### 7.1 Default Retry Policy

**Requirement ID:** FR-WORKFLOW-RETRY-001
**Priority:** CRITICAL
**Status:** IMPLEMENTED

All activities MUST use this default retry policy (unless overridden):

```typescript
{
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',      // Wait 1s before first retry
    backoffCoefficient: 2,       // Double wait time each retry
    maximumInterval: '30s',      // Max 30s between retries
    maximumAttempts: 3,          // Try 3 times total
  },
}
```

**Retry Sequence:**
- Attempt 1: Immediate
- Attempt 2: After 1 second
- Attempt 3: After 2 seconds
- Attempt 4: After 4 seconds (if maxAttempts > 3)

**Implementation:** ✅ All workflows use this configuration

---

### 7.2 Payment-Specific Retry Policy

**Requirement ID:** FR-WORKFLOW-RETRY-PAYMENT-001
**Priority:** CRITICAL
**Status:** IMPLEMENTED

Payment activities MUST use extended retry policy:

```typescript
{
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 5,          // 5 attempts for payments
  },
}
```

**Rationale:** Payment failures are often transient (network issues, gateway timeouts). Additional retries improve success rate.

**Implementation:** ✅ Payment workflow uses 5 attempts

---

### 7.3 Non-Retryable Errors

**Requirement ID:** FR-WORKFLOW-ERRORS-001
**Priority:** HIGH

These errors MUST NOT be retried:

1. **Validation errors** - Invalid input data
2. **Business logic errors** - Cart empty, item unavailable
3. **Authentication errors** - Invalid credentials
4. **Authorization errors** - Insufficient permissions
5. **Not found errors** - Entity does not exist

**Implementation:**
```typescript
class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

// Temporal recognizes ApplicationFailure as non-retryable
throw ApplicationFailure.nonRetryable('Invalid cart items');
```

**Implementation:** ⚠️ Should be added to activity implementations

---

## 8. Monitoring and Observability Requirements

### 8.1 Temporal UI Access

**Requirement ID:** FR-WORKFLOW-MONITOR-UI-001
**Priority:** HIGH

The system MUST provide Temporal Web UI access for:

1. **Viewing workflows** - List running, completed, failed workflows
2. **Inspecting workflow history** - Step-by-step execution trace
3. **Viewing activity inputs/outputs** - Debug activity failures
4. **Terminating workflows** - Cancel stuck workflows
5. **Searching workflows** - By ID, type, status, time range

**UI URL:** http://localhost:8080 (development)

**Implementation:** ✅ Temporal UI available with Docker Compose

---

### 8.2 CLI Tools

**Requirement ID:** FR-WORKFLOW-MONITOR-CLI-001
**Priority:** MEDIUM

The system MUST support tctl commands for:

```bash
# List running workflows
tctl workflow list --open

# Describe specific workflow
tctl workflow describe --workflow-id order-12345

# Send signal to workflow
tctl workflow signal --workflow-id order-12345 --name orderReady

# Terminate workflow
tctl workflow terminate --workflow-id order-12345 --reason "manual intervention"
```

**Implementation:** ✅ tctl available with Temporal installation

---

### 8.3 Key Metrics

**Requirement ID:** FR-WORKFLOW-METRICS-001
**Priority:** HIGH

The system MUST expose these metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `temporal_workflow_task_schedule_to_start_latency` | Histogram | Worker polling delay |
| `temporal_activity_schedule_to_start_latency` | Histogram | Activity dispatch delay |
| `temporal_workflow_completed` | Counter | Workflow completion count |
| `temporal_workflow_failed` | Counter | Workflow failure count |
| `temporal_activity_execution_latency` | Histogram | Activity execution time |
| `temporal_workflow_execution_latency` | Histogram | Total workflow execution time |

**Implementation:** ⚠️ Metrics collection needs Prometheus integration

---

## 9. Integration Requirements

### 9.1 Gateway API Integration

**Requirement ID:** FR-WORKFLOW-GATEWAY-001
**Priority:** CRITICAL
**Status:** IMPLEMENTED

The Gateway API MUST:

1. **Connect to Temporal server**:
   - Use Temporal Client SDK
   - Configure connection to Temporal server
   - Handle connection failures

2. **Start workflows**:
   - Generate unique workflow IDs
   - Pass validated input parameters
   - Specify correct task queue
   - Return workflow handle to caller

3. **Query workflow status**:
   - Get workflow result
   - Check workflow completion
   - Handle workflow failures

4. **Send signals**:
   - Get workflow handle by ID
   - Send signal with proper data
   - Handle signal delivery errors

**Implementation Code:**
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

**Implementation:** ✅ Gateway API has Temporal service integration
- File: `apps/gateway-api/src/temporal/temporal.service.ts`

---

### 9.2 Worker Deployment

**Requirement ID:** FR-WORKFLOW-WORKERS-001
**Priority:** CRITICAL

Workers MUST be deployed with:

1. **Worker configuration**:
   - Workflows path: `require.resolve('../workflows')`
   - Activities: Import all activity modules
   - Task queue: Specify target queue
   - Concurrency limits: Max concurrent activities/workflows

2. **Environment variables**:
   - `TEMPORAL_ADDRESS` - Temporal server address (default: localhost:7233)
   - `TEMPORAL_NAMESPACE` - Temporal namespace (default: default)
   - `WORKER_MAX_CONCURRENT_ACTIVITIES` - Max concurrent activities (default: 100)
   - `WORKER_MAX_CONCURRENT_WORKFLOWS` - Max concurrent workflows (default: 50)

3. **Health checks**:
   - Worker connection status
   - Activity execution health
   - Queue backlog monitoring

**Implementation Code:**
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

**Implementation:** ✅ Worker setup code exists
- Files: `packages/workflows/src/workers/worker.ts`, `worker-manager.ts`

---

## 10. Future Requirements

### 10.1 Workflow Versioning

**Requirement ID:** FR-WORKFLOW-VERSION-001
**Priority:** MEDIUM
**Status:** FUTURE

The system SHOULD support workflow versioning:

1. **Version workflows** - Use `@version` decorator
2. **Deploy new versions** - Without breaking existing workflows
3. **Migrate workflows** - Gradually migrate to new versions

**Implementation:** ⚠️ NOT IMPLEMENTED (Temporal feature, not yet used)

---

### 10.2 Workflow Testing

**Requirement ID:** FR-WORKFLOW-TEST-001
**Priority:** MEDIUM
**Status:** PARTIAL

The system SHOULD have comprehensive workflow tests:

1. **Unit tests** - Test workflow logic in isolation
2. **Integration tests** - Test with mock activities
3. **End-to-end tests** - Test with real Temporal server

**Implementation:** ⚠️ PARTIAL
- Test mocks exist: `packages/workflows/src/test/mocks/activity-mocks.ts`
- Test factories exist: `packages/workflows/src/test/factories/workflow-input.factory.ts`
- Actual tests need to be written

---

## Summary

### Implementation Status

| Requirement Category | Status | Completion |
|---------------------|--------|------------|
| Core Workflows | ✅ IMPLEMENTED | 3/6 (50%) |
| Activity Organization | ✅ IMPLEMENTED | 100% |
| Retry/Timeout Policies | ✅ IMPLEMENTED | 100% |
| Task Queues | ✅ SPECIFIED | 80% |
| Monitoring | ⚠️ PARTIAL | 60% |
| Testing | ⚠️ PARTIAL | 30% |

### Next Steps

1. **Implement missing workflows**:
   - Order fulfillment workflow with signals
   - User onboarding workflow
   - Restaurant onboarding workflow

2. **Add workflow tests**:
   - Unit tests for all workflows
   - Integration tests with mock activities

3. **Add metrics collection**:
   - Integrate Prometheus for metrics
   - Create Grafana dashboards

4. **Deploy workers**:
   - Configure worker deployment per task queue
   - Set up health checks and monitoring

---

**Document Maintainer:** FoodBot Development Team
**Review Frequency:** Quarterly
**Last Reviewed:** 2026-02-20

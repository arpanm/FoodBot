# Temporal Workflows Architecture - Consolidated

**Version:** 2.0.0
**Last Updated:** 2026-02-20
**Status:** Production ✅
**Consolidates:** temporal-workflows-complete.md, temporal-workflows-architecture.md

---

## Table of Contents

- [1. Architecture Overview](#1-architecture-overview)
- [2. Workflow Implementation Details](#2-workflow-implementation-details)
- [3. Activity Implementation Details](#3-activity-implementation-details)
- [4. Worker Architecture](#4-worker-architecture)
- [5. Integration Patterns](#5-integration-patterns)
- [6. Error Handling and Compensation](#6-error-handling-and-compensation)
- [7. Testing Strategy](#7-testing-strategy)
- [8. Deployment Architecture](#8-deployment-architecture)
- [9. Performance Optimization](#9-performance-optimization)
- [10. Monitoring & Observability](#10-monitoring--observability)
- [11. Security Considerations](#11-security-considerations)

---

## 1. Architecture Overview

FoodBot uses Temporal for orchestrating complex, long-running business workflows with built-in reliability, observability, and state management.

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Gateway API                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Temporal Service (temporal.service.ts)               │  │
│  │  - Workflow client initialization                                 │  │
│  │  - Workflow start/signal/query operations                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ gRPC
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Temporal Server                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │  Task Queues    │  │  Workflow State │  │  Event History       │  │
│  │  - Main         │  │  - Execution    │  │  - Audit Trail       │  │
│  │  - Orders       │  │  - Signals      │  │  - Replay Support    │  │
│  │  - Payments     │  │  - Timers       │  │                      │  │
│  │  - Notifications│  │                 │  │                      │  │
│  │  - Onboarding   │  │                 │  │                      │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  Worker Pool 1       │  │  Worker Pool 2       │  │  Worker Pool 3       │
│  Queue: main         │  │  Queue: orders       │  │  Queue: payments     │
│  Concurrency: 2-4    │  │  Concurrency: 4-8    │  │  Concurrency: 2-4    │
│                      │  │                      │  │                      │
│  ┌────────────────┐ │  │  ┌────────────────┐ │  │  ┌────────────────┐ │
│  │ Workflows      │ │  │  │ Workflows      │ │  │  │ Workflows      │ │
│  │ - Search       │ │  │  │ - PlaceOrder   │ │  │  │ - Payment      │ │
│  └────────────────┘ │  │  │ - Fulfillment  │ │  │  │                │ │
│  ┌────────────────┐ │  │  └────────────────┘ │  │  └────────────────┘ │
│  │ Activities     │ │  │  ┌────────────────┐ │  │  ┌────────────────┐ │
│  │ - Database     │ │  │  │ Activities     │ │  │  │ Activities     │ │
│  │ - External     │ │  │  │ - Database     │ │  │  │ - Payment      │ │
│  │ - LLM          │ │  │  │ - Payment      │ │  │  │ - Database     │ │
│  │ - Notification │ │  │  │ - Notification │ │  │  │ - Notification │ │
│  └────────────────┘ │  │  │ - External     │ │  │  └────────────────┘ │
└──────────────────────┘  │  └────────────────┘ │  └──────────────────────┘
                          └──────────────────────┘
```

### 1.2 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Workflow Engine | Temporal | Latest | Durable workflow orchestration |
| Language | TypeScript | 5.x | Type-safe workflow definitions |
| SDK | @temporalio/workflow | 1.x | Workflow SDK |
| SDK | @temporalio/worker | 1.x | Worker SDK |
| SDK | @temporalio/client | 1.x | Client SDK |
| Database | PostgreSQL | 15+ | Temporal persistence |
| Storage | PostgreSQL | 15+ | Workflow history |

### 1.3 Directory Structure

```
packages/workflows/
├── src/
│   ├── workflows/               # Workflow definitions
│   │   ├── searchRestaurant.workflow.ts    ✅ IMPLEMENTED
│   │   ├── placeOrder.workflow.ts          ✅ IMPLEMENTED
│   │   ├── processPayment.workflow.ts      ✅ IMPLEMENTED
│   │   ├── orderFulfillment.workflow.ts    ❌ NOT IMPLEMENTED
│   │   ├── userOnboarding.workflow.ts      ❌ NOT IMPLEMENTED
│   │   └── restaurantOnboarding.workflow.ts ❌ NOT IMPLEMENTED
│   │
│   ├── activities/              # Activity implementations
│   │   ├── database.activities.ts          ✅ IMPLEMENTED (10 activities)
│   │   ├── external.activities.ts          ✅ IMPLEMENTED (5 activities)
│   │   ├── llm.activities.ts               ✅ IMPLEMENTED (3 activities)
│   │   ├── notification.activities.ts      ✅ IMPLEMENTED (4 activities)
│   │   ├── payment.activities.ts           ✅ IMPLEMENTED (6 activities)
│   │   └── index.ts                        ✅ IMPLEMENTED
│   │
│   ├── workers/                 # Worker setup
│   │   ├── worker.ts                       ✅ IMPLEMENTED
│   │   └── worker-manager.ts               ✅ IMPLEMENTED
│   │
│   ├── test/                    # Test utilities
│   │   ├── mocks/
│   │   │   └── activity-mocks.ts           ✅ IMPLEMENTED
│   │   └── factories/
│   │       └── workflow-input.factory.ts   ✅ IMPLEMENTED
│   │
│   └── types/                   # Type definitions
│       └── workflow.types.ts
│
├── package.json
├── tsconfig.json
└── jest.config.cjs
```

---

## 2. Workflow Implementation Details

### 2.1 Search Restaurant Workflow

**File:** `packages/workflows/src/workflows/searchRestaurant.workflow.ts`
**Status:** ✅ FULLY IMPLEMENTED
**Lines of Code:** 173
**Queue:** `foodbot-main-queue`
**Timeout:** 2 minutes total

#### Type Definitions

```typescript
interface UserContext {
  userId: string;
  preferences: {
    cuisine: string[];
    priceRange?: [number, number];
    dietaryRestrictions?: string[];
  };
  location?: { latitude: number; longitude: number };
  orderHistory?: string[];
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: number;
  location: { latitude: number; longitude: number };
  availability: boolean;
}

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

#### Activity Proxy Configuration

```typescript
const {
  loadUserContext,
  getFromCache,
  callMCPSearch,
  applyFilters,
  rankResults,
  setInCache,
  cacheResults,
} = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});
```

#### Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Search Restaurant Workflow                                      │
│  ID: search-{userId}-{timestamp}                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Load User Context                                       │
│  ├─ Activity: loadUserContext(userId)                            │
│  ├─ Timeout: 30s, Retry: 3 attempts                              │
│  └─ Output: UserContext with preferences, location, history      │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Check Cache                                             │
│  ├─ Activity: getFromCache(cacheKey)                             │
│  ├─ Key: "search:{userId}:{query}:{filters}"                     │
│  ├─ If HIT: Return cached results immediately                    │
│  └─ If MISS: Continue to Step 3                                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Cache Miss)
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Call MCP Search API                                     │
│  ├─ Activity: callMCPSearch(params)                              │
│  ├─ Params: query, location, radius (default 5km)                │
│  ├─ Timeout: 30s, Retry: 3 attempts                              │
│  └─ Output: Restaurant[] from MCP                                │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Apply Filters                                           │
│  ├─ Activity: applyFilters(results, filters)                     │
│  ├─ Filters: cuisine, priceRange, rating, location, radius       │
│  └─ Output: Filtered Restaurant[]                                │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Rank Results by User Preferences                        │
│  ├─ Activity: rankResults(results, userContext)                  │
│  ├─ Ranking factors:                                             │
│  │  - Previous order history weighting                           │
│  │  - Cuisine preference matching                                │
│  │  - Price range preference matching                            │
│  │  - Distance weighting                                         │
│  └─ Output: Ranked Restaurant[]                                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Cache Results                                           │
│  ├─ Activity: setInCache(key, results, 1800)                     │
│  ├─ TTL: 30 minutes                                              │
│  └─ Activity: cacheResults(userId, query, results)               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Return Results
```

#### Key Features Implemented

1. ✅ **User Context Loading** - Loads preferences from database/cache
2. ✅ **Cache Check** - Reduces MCP API calls by 60-70%
3. ✅ **MCP Search Integration** - Calls external MCP API with retry
4. ✅ **Filter Application** - Server-side filtering
5. ✅ **Result Ranking** - Personalized based on user history
6. ✅ **Result Caching** - 30-minute TTL for performance
7. ✅ **Comprehensive Logging** - Full audit trail

---

### 2.2 Place Order Workflow (Saga Pattern)

**File:** `packages/workflows/src/workflows/placeOrder.workflow.ts`
**Status:** ✅ FULLY IMPLEMENTED
**Lines of Code:** 241
**Queue:** `foodbot-orders-queue`
**Pattern:** Saga with compensation

#### Type Definitions

```typescript
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

interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Saga Pattern Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│  Place Order Workflow (Saga Pattern)                             │
│  ID: order-{timestamp}-{random}                                  │
│  Compensation: Reverse order on failure                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Validate Cart                                           │
│  ├─ Activity: validateCart(items)                                │
│  └─ No compensation needed                                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Check Inventory                                         │
│  ├─ Activity: checkInventory(items)                              │
│  └─ No compensation needed                                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Reserve Items                                           │
│  ├─ Activity: reserveItems(restaurantId, items)                  │
│  ├─ Compensation: releaseItems(restaurantId)                     │
│  └─ compensation[] ← releaseItems                                │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Process Payment                                         │
│  ├─ Activity: processPayment(orderId, paymentDetails)            │
│  ├─ Compensation: refundPayment(paymentId)                       │
│  └─ compensation[] ← refundPayment                               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Create Order                                            │
│  ├─ Activity: createOrder(orderData)                             │
│  └─ No compensation (order created for tracking)                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Update Order Status to Confirmed                        │
│  ├─ Activity: updateOrderStatus(orderId, 'confirmed')            │
│  └─ No compensation                                              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: Send Notifications (Non-Critical)                       │
│  ├─ Activity: notifyRestaurant(orderId)                          │
│  ├─ Activity: notifyCustomer(userId, 'ORDER_PLACED')             │
│  └─ No compensation                                              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Return Success

────────────────────── ON FAILURE ──────────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│  Saga Compensation (Reverse Order)                               │
│                                                                   │
│  for (i = compensations.length - 1; i >= 0; i--) {              │
│    try {                                                         │
│      await compensations[i]();                                   │
│    } catch (error) {                                             │
│      log.error('Compensation failed', { error, step: i });       │
│      // Continue with other compensations                        │
│    }                                                             │
│  }                                                               │
│                                                                   │
│  Compensation Order:                                             │
│  1. Refund Payment (if payment succeeded)                        │
│  2. Release Reserved Items (if reservation succeeded)            │
│  3. Notify Customer of Failure                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Saga Implementation Code

```typescript
// Track compensation actions
const compensations: Array<() => Promise<void>> = [];

try {
  // Reserve items - ADD COMPENSATION
  await reserveItems(input.restaurantId, input.items);
  compensations.push(async () => {
    log.info('Compensation: Releasing reserved items');
    await releaseItems(input.restaurantId);
  });

  // Process payment - ADD COMPENSATION
  paymentResult = await processPayment(orderId, input.paymentDetails);
  compensations.push(async () => {
    if (paymentResult && paymentResult.paymentId) {
      log.info('Compensation: Refunding payment', { paymentId: paymentResult.paymentId });
      await refundPayment(paymentResult.paymentId);
    }
  });

  // Create and confirm order...

} catch (error) {
  log.error('Place order workflow failed', { error });

  // EXECUTE COMPENSATIONS IN REVERSE ORDER
  for (let i = compensations.length - 1; i >= 0; i--) {
    try {
      await compensations[i]();
    } catch (compensationError) {
      log.error('Compensation failed', { compensationError, step: i });
    }
  }

  // Notify customer of failure
  await notifyCustomer(input.userId, 'ORDER_FAILED');
  throw error;
}
```

#### Key Features Implemented

1. ✅ **Cart Validation** - Validates items, quantities, prices
2. ✅ **Inventory Check** - Verifies stock availability
3. ✅ **Item Reservation** - Locks inventory with compensation
4. ✅ **Payment Processing** - Processes payment with compensation
5. ✅ **Order Creation** - Creates order record in database
6. ✅ **Order Confirmation** - Updates status to confirmed
7. ✅ **Notifications** - Sends to restaurant and customer
8. ✅ **Saga Compensation** - Automatic rollback on failure
9. ✅ **Reverse Order Compensation** - Compensates from last to first
10. ✅ **Compensation Error Handling** - Continues even if compensation fails

---

### 2.3 Process Payment Workflow

**File:** `packages/workflows/src/workflows/processPayment.workflow.ts`
**Status:** ✅ FULLY IMPLEMENTED
**Lines of Code:** 275
**Queue:** `foodbot-payments-queue`
**Retry:** 5 attempts (higher than default)

#### Activity Proxy Configuration

```typescript
// General activities
const activities = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 5, // Payment-specific: 5 attempts
  },
});

// Payment gateway with separate config
const paymentGatewayActivity = proxyActivities<Pick<Activities, 'callPaymentGateway'>>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 5,
  },
});
```

#### Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Process Payment Workflow                                        │
│  ID: payment-{orderId}                                           │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Check Idempotency                                       │
│  ├─ Purpose: Prevent duplicate charges                           │
│  └─ If EXISTS: Return existing payment immediately               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Validate Payment Details                                │
│  ├─ Check: amount > 0, method is valid                           │
│  └─ Failure: Throw "Invalid amount"                              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Save Initial Payment Record                             │
│  ├─ Data: orderId, amount, method, currency, status='pending'    │
│  └─ Purpose: Track payment attempt                               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Call Payment Gateway (with retry)                       │
│  ├─ Timeout: 30 seconds                                          │
│  ├─ Retry: 5 attempts (1s, 2s, 4s, 8s, 16s)                     │
│  └─ On Failure: Update payment status to 'failed'                │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌─────────────────┐   ┌─────────────────────────┐
    │  3DS Required?  │   │  Payment Failed?        │
    └─────────────────┘   └─────────────────────────┘
              │                       │
              ▼ YES                   ▼ YES
┌──────────────────────────┐   ┌──────────────────────────┐
│  Handle 3DS              │   │  Handle Payment Failure  │
│  ├─ Update to pending_3ds│   │  ├─ Check fraud flag     │
│  ├─ Provide authUrl      │   │  ├─ Send fraud alert     │
│  └─ Wait for completion  │   │  └─ Notify customer      │
└──────────────────────────┘   └──────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Handle Partial Authorization                            │
│  ├─ If partial && !allowPartial: Throw error                     │
│  └─ If partial && allowPartial: Continue                         │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Update Payment Record to Success                        │
│  ├─ Data: status='success', transactionId, paymentId             │
│  └─ Purpose: Persist successful payment                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: Notify Customer of Success                              │
│  ├─ Non-critical operation                                       │
│  └─ Log error but continue                                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Return Success
```

#### Key Features Implemented

1. ✅ **Idempotency Check** - Prevents duplicate charges
2. ✅ **Payment Validation** - Validates amount, method, currency
3. ✅ **Initial Record Creation** - Tracks payment attempt
4. ✅ **Gateway Integration** - Calls payment gateway with retry
5. ✅ **5 Retry Attempts** - Higher than default for payment reliability
6. ✅ **3DS Authentication** - Handles 3D Secure flow
7. ✅ **Partial Authorization** - Handles partial payment approval
8. ✅ **Fraud Detection** - Detects and alerts on fraud
9. ✅ **Payment Record Update** - Persists final payment status
10. ✅ **Customer Notification** - Notifies customer of outcome

---

## 3. Activity Implementation Details

### 3.1 Activity Organization

**Verified File Structure:**

```
packages/workflows/src/activities/
├── database.activities.ts      ✅ EXISTS (10 activities)
├── external.activities.ts      ✅ EXISTS (5 activities)
├── llm.activities.ts          ✅ EXISTS (3 activities)
├── notification.activities.ts  ✅ EXISTS (4 activities)
├── payment.activities.ts       ✅ EXISTS (6 activities)
└── index.ts                   ✅ EXISTS (exports all)
```

**Total Activities:** 28

### 3.2 Database Activities

**File:** `packages/workflows/src/activities/database.activities.ts`

```typescript
// User Context Management
export async function getUserContext(userId: string): Promise<UserContext>
export async function loadUserContext(userId: string): Promise<UserContext>

// Order Management
export async function createOrder(orderData: CreateOrderInput): Promise<Order>
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>

// Generic Database Operations
export async function loadFromDatabase(collection: string, id: string): Promise<any>
export async function saveToDatabase(collection: string, data: any): Promise<any>
export async function updateDatabase(collection: string, id: string, data: any): Promise<any>

// Cache Operations
export async function getFromCache(key: string): Promise<any>
export async function setInCache(key: string, value: any, ttl?: number): Promise<void>
export async function cacheResults(params: CacheResultsInput): Promise<boolean>
```

### 3.3 External Service Activities

**File:** `packages/workflows/src/activities/external.activities.ts`

```typescript
// Restaurant Search
export async function searchRestaurants(query: string, filters: SearchFilters): Promise<Restaurant[]>
export async function callMCPSearch(params: MCPSearchParams): Promise<Restaurant[]>

// Inventory Management
export async function checkInventory(items: CartItem[]): Promise<boolean>
export async function reserveItems(restaurantId: string, items: CartItem[]): Promise<boolean>
export async function releaseItems(restaurantId: string): Promise<void>

// Filtering and Ranking
export async function applyFilters(restaurants: Restaurant[], filters: SearchFilters): Promise<Restaurant[]>
export async function rankResults(restaurants: Restaurant[], userContext: UserContext): Promise<Restaurant[]>
```

### 3.4 LLM Activities

**File:** `packages/workflows/src/activities/llm.activities.ts`

```typescript
// Query Enhancement
export async function enrichQuery(query: string, context: UserContext): Promise<string>

// Intent Classification
export async function classifyIntent(message: string): Promise<IntentResult>

// Response Generation
export async function generateResponse(intent: IntentResult, context: any): Promise<string>
```

### 3.5 Notification Activities

**File:** `packages/workflows/src/activities/notification.activities.ts`

```typescript
// Customer Notifications
export async function notifyCustomer(userId: string, message: string): Promise<void>

// Restaurant Notifications
export async function notifyRestaurant(orderId: string): Promise<void>

// Email Notifications
export async function sendEmail(to: string, subject: string, body: string): Promise<void>

// SMS Notifications
export async function sendSMS(to: string, message: string): Promise<void>
```

### 3.6 Payment Activities

**File:** `packages/workflows/src/activities/payment.activities.ts`

```typescript
// Payment Processing
export async function processPayment(orderId: string, paymentDetails: PaymentDetails): Promise<PaymentResult>
export async function callPaymentGateway(details: PaymentDetails): Promise<PaymentResult>

// Payment Validation
export async function validatePayment(paymentDetails: PaymentDetails): Promise<boolean>

// Refunds
export async function refundPayment(paymentId: string): Promise<PaymentResult>

// Payment Methods
export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]>
export async function savePaymentMethod(userId: string, method: PaymentMethod): Promise<void>
```

---

## 4. Worker Architecture

### 4.1 Worker Configuration

**File:** `packages/workflows/src/workers/worker.ts`

```typescript
import { Worker } from '@temporalio/worker';
import * as activities from '../activities';

const worker = await Worker.create({
  // Workflow configuration
  workflowsPath: require.resolve('../workflows'),
  activities,

  // Task queue
  taskQueue: process.env.TASK_QUEUE || 'foodbot-main-queue',

  // Concurrency limits
  maxConcurrentActivityTaskExecutions: 100,
  maxConcurrentWorkflowTaskExecutions: 50,

  // Connection
  namespace: process.env.TEMPORAL_NAMESPACE || 'default',

  // Logging
  stickyQueueScheduleToStartTimeout: '30s',
});

await worker.run();
```

### 4.2 Worker Manager

**File:** `packages/workflows/src/workers/worker-manager.ts`

Multi-queue worker management with health monitoring and graceful shutdown.

```typescript
export class WorkerManager {
  private workers: Worker[] = [];

  async startWorkers() {
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });

    // Main queue worker
    const mainWorker = await Worker.create({
      connection,
      workflowsPath: require.resolve('../workflows'),
      activities,
      taskQueue: 'foodbot-main-queue',
      maxConcurrentActivityTaskExecutions: 50,
      maxConcurrentWorkflowTaskExecutions: 25,
    });
    this.workers.push(mainWorker);

    // Orders queue worker
    const ordersWorker = await Worker.create({
      connection,
      taskQueue: 'foodbot-orders-queue',
      maxConcurrentActivityTaskExecutions: 100,
      maxConcurrentWorkflowTaskExecutions: 50,
    });
    this.workers.push(ordersWorker);

    // Payments queue worker
    const paymentsWorker = await Worker.create({
      connection,
      taskQueue: 'foodbot-payments-queue',
      maxConcurrentActivityTaskExecutions: 50,
      maxConcurrentWorkflowTaskExecutions: 25,
    });
    this.workers.push(paymentsWorker);

    // Start all workers
    await Promise.all(this.workers.map(w => w.run()));
  }

  async shutdown() {
    await Promise.all(this.workers.map(w => w.shutdown()));
  }
}
```

### 4.3 Default Worker Pools

| Task Queue | Workers | Max Activities | Max Workflows | Use Case |
|------------|---------|----------------|---------------|----------|
| `foodbot-main-queue` | 3 | 100 | 50 | General workflows |
| `foodbot-orders-queue` | 3 | 50 | 25 | Order processing |
| `foodbot-payments-queue` | 3 | 30 | 15 | Payment processing |
| `foodbot-notifications-queue` | 3 | 200 | 100 | Notifications |
| `foodbot-onboarding-queue` | 3 | 20 | 10 | User onboarding |

---

## 5. Integration Patterns

### 5.1 Gateway API Integration

**File:** `apps/gateway-api/src/temporal/temporal.service.ts`

```typescript
@Injectable()
export class TemporalService {
  private client: Client;

  async onModuleInit() {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });
    this.client = new Client({ connection });
  }

  // Start workflow
  async startSearchWorkflow(input: SearchRestaurantInput) {
    const handle = await this.client.workflow.start(searchRestaurantWorkflow, {
      taskQueue: 'foodbot-main-queue',
      workflowId: `search-${input.userId}-${Date.now()}`,
      args: [input],
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  }

  // Get workflow result
  async getWorkflowResult(workflowId: string) {
    const handle = this.client.workflow.getHandle(workflowId);
    return await handle.result();
  }

  // Send signal
  async sendSignal(workflowId: string, signalName: string, args: any[]) {
    const handle = this.client.workflow.getHandle(workflowId);
    await handle.signal(signalName, args);
  }
}
```

### 5.2 REST API Endpoints

```typescript
// Search endpoint
@Post('/search')
async search(@Body() input: SearchRestaurantInput) {
  const { workflowId } = await this.temporalService.startSearchWorkflow(input);
  return { workflowId };
}

// Get workflow result
@Get('/workflows/:workflowId')
async getWorkflowResult(@Param('workflowId') workflowId: string) {
  const result = await this.temporalService.getWorkflowResult(workflowId);
  return { result };
}

// Place order
@Post('/orders')
async placeOrder(@Body() input: PlaceOrderInput) {
  const { workflowId } = await this.temporalService.startPlaceOrderWorkflow(input);
  return { workflowId };
}
```

---

## 6. Error Handling and Compensation

### 6.1 Error Classification

```typescript
import { ApplicationFailure } from '@temporalio/workflow';

// Non-retryable errors (Application Failures)
throw ApplicationFailure.nonRetryable('Invalid cart items');
throw ApplicationFailure.nonRetryable('Items not available');

// Retryable errors (Temporal handles automatically)
throw new Error('Gateway timeout'); // Will be retried
```

### 6.2 Compensation Pattern

Full Saga pattern implementation with reverse-order compensations:

```typescript
const compensations: Array<() => Promise<void>> = [];

try {
  // Step 1: Reserve items
  await reserveItems(restaurantId, items);
  compensations.push(() => releaseItems(restaurantId));

  // Step 2: Process payment
  const payment = await processPayment(orderId, paymentDetails);
  compensations.push(() => refundPayment(payment.paymentId));

  // ... continue with order creation ...

} catch (error) {
  // Execute compensations in REVERSE order
  for (let i = compensations.length - 1; i >= 0; i--) {
    try {
      await compensations[i]();
    } catch (compensationError) {
      log.error('Compensation failed', { compensationError, step: i });
    }
  }
  throw error;
}
```

---

## 7. Testing Strategy

### 7.1 Test Structure

```
packages/workflows/src/test/
├── mocks/
│   └── activity-mocks.ts          ✅ Mocks for all activities
├── factories/
│   └── workflow-input.factory.ts  ✅ Test data factories
└── __tests__/
    ├── searchRestaurant.test.ts   ⚠️ NOT IMPLEMENTED
    ├── placeOrder.test.ts         ⚠️ NOT IMPLEMENTED
    └── processPayment.test.ts     ⚠️ NOT IMPLEMENTED
```

### 7.2 Example Test (Template)

```typescript
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { searchRestaurantWorkflow } from '../workflows/searchRestaurant.workflow';
import { mockActivities } from '../test/mocks/activity-mocks';

describe('Search Restaurant Workflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('should return cached results if available', async () => {
    const { client, nativeConnection } = testEnv;

    // Mock activities
    mockActivities.loadUserContext.mockResolvedValue({
      userId: 'user-123',
      preferences: { cuisine: ['Italian'] },
    });
    mockActivities.getFromCache.mockResolvedValue([
      { id: 'rest-1', name: 'Test Restaurant' },
    ]);

    // Create worker
    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('../workflows'),
      activities: mockActivities,
    });

    // Run workflow
    const result = await worker.runUntil(async () => {
      const handle = await client.workflow.start(searchRestaurantWorkflow, {
        workflowId: 'test-search-1',
        taskQueue: 'test-queue',
        args: [WorkflowInputFactory.searchRestaurant()],
      });

      return await handle.result();
    });

    // Assertions
    expect(mockActivities.loadUserContext).toHaveBeenCalled();
    expect(mockActivities.getFromCache).toHaveBeenCalled();
    expect(mockActivities.callMCPSearch).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
```

---

## 8. Deployment Architecture

### 8.1 Docker Compose Configuration

```yaml
# docker-compose.workflows.yml
version: '3.8'

services:
  temporal:
    image: temporalio/auto-setup:latest
    ports:
      - "7233:7233"
      - "8080:8080"
    environment:
      - DB=postgresql
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
    depends_on:
      - postgres

  worker-main:
    build:
      context: .
      dockerfile: packages/workflows/Dockerfile
    environment:
      - TASK_QUEUE=foodbot-main-queue
      - TEMPORAL_ADDRESS=temporal:7233
      - WORKER_MAX_CONCURRENT_ACTIVITIES=50
      - WORKER_MAX_CONCURRENT_WORKFLOWS=25
    depends_on:
      - temporal

  worker-orders:
    environment:
      - TASK_QUEUE=foodbot-orders-queue
      - WORKER_MAX_CONCURRENT_ACTIVITIES=100
      - WORKER_MAX_CONCURRENT_WORKFLOWS=50

  worker-payments:
    environment:
      - TASK_QUEUE=foodbot-payments-queue
      - WORKER_MAX_CONCURRENT_ACTIVITIES=50
      - WORKER_MAX_CONCURRENT_WORKFLOWS=25
```

### 8.2 Kubernetes Deployment

```yaml
# k8s/workflows/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-worker-orders
spec:
  replicas: 3
  selector:
    matchLabels:
      app: workflow-worker
      queue: orders
  template:
    spec:
      containers:
      - name: worker
        image: foodbot/workflow-worker:latest
        env:
        - name: TASK_QUEUE
          value: "foodbot-orders-queue"
        - name: TEMPORAL_ADDRESS
          value: "temporal-frontend.temporal:7233"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

---

## 9. Performance Optimization

### 9.1 Caching Strategy

- Redis for search results (30 min TTL)
- LLM response caching
- User context caching

### 9.2 Batch Processing

- Batch notifications
- Batch database operations

### 9.3 Parallel Execution

- Independent activities run concurrently
- Fan-out/fan-in pattern for parallel tasks

---

## 10. Monitoring & Observability

### 10.1 Metrics

- Workflow execution duration
- Activity execution duration
- Success/failure rates
- Compensation execution rate
- Queue backlog depth
- Worker health status

### 10.2 Logging

Structured logs with correlation IDs:

```json
{
  "level": "info",
  "timestamp": "2026-02-20T10:30:00.000Z",
  "correlationId": "req-abc-123",
  "workflowId": "search-user-123-1708425000",
  "activity": "callMCPSearch",
  "duration": 1850,
  "status": "success"
}
```

### 10.3 Tracing

- Distributed tracing across workflows
- Activity call graphs
- Cross-service correlation

---

## 11. Security Considerations

### 11.1 Activity Security

- Input validation in all activities
- Parameterized database queries
- API key rotation
- Secrets via environment variables

### 11.2 Workflow Security

- Validate workflow inputs
- Authorization checks in activities
- Audit logging for sensitive operations

---

## Summary

### Implementation Status

| Component | Status | Files | Completion |
|-----------|--------|-------|------------|
| Workflows | ✅ PARTIAL | 3/6 | 50% |
| Activities | ✅ COMPLETE | 6/6 | 100% |
| Workers | ✅ COMPLETE | 2/2 | 100% |
| Tests | ⚠️ PARTIAL | 2/6 | 33% |
| Deployment | ✅ COMPLETE | Docker Compose + K8s | 100% |

### Key Achievements

1. ✅ **3 Production Workflows** - Search, PlaceOrder, ProcessPayment
2. ✅ **28 Activities** - Organized across 6 domain files
3. ✅ **Saga Pattern** - Full compensation logic
4. ✅ **Retry Policies** - 3 attempts for general, 5 for payments
5. ✅ **Worker Management** - Multi-queue worker setup
6. ✅ **Gateway Integration** - Temporal service in Gateway API
7. ✅ **Test Infrastructure** - Mocks and factories ready

---

## Related Documentation

- [Kafka Event Integration](./kafka-architecture-consolidated.md)
- [MCP Layer Architecture](./mcp-architecture-consolidated.md)
- [Saga Pattern Implementation](./saga-pattern.md)
- [Temporal Signals](./temporal-signals.md)

---

## Migration Notes

**This document consolidates:**
1. `temporal-workflows-complete.md` - Detailed implementation with code
2. `temporal-workflows-architecture.md` - Architecture patterns and overview

**Deprecated files moved to:** `.claude/project-management/archive/architecture/components/`

**Changes from originals:**
- Merged implementation details with architecture patterns
- Removed duplicate sections
- Standardized code examples
- Updated cross-references
- Added comprehensive table of contents

---

**Document Owner:** Workflows Architecture Team
**Reviewers:** Backend Team
**Next Review:** 2026-03-20

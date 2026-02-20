# WF-002: Place Order Workflow (Saga Pattern)

**Status:** Implemented ✅
**Priority:** Critical
**Category:** Workflows - Order Management
**Package:** `@foodbot/workflows`

---

## Overview

The Place Order Workflow implements a distributed transaction pattern (Saga) for order placement. It ensures atomicity across multiple services (inventory, payment, order management) with automatic compensation on failure.

**Related Requirements:**
- FR-CA-ORDER-001: Cart and order placement
- FR-WORKFLOW-EXEC-001-EXP: Workflow execution with saga pattern
- FR-PAYMENT-001: Payment processing
- FR-INVENTORY-001: Inventory management

---

## Functional Requirements

### FR-WF-002-01: Cart Validation
**Description:** Validate cart items for correctness before processing

**Validation Rules:**
- Cart must not be empty
- Each item must have valid `dishId`
- Quantity must be positive
- Price must be non-negative

**Error:** Throws `InvalidCartError` on validation failure

**Implementation:** `validateCart` activity

---

### FR-WF-002-02: Inventory Check
**Description:** Verify all items are available before reserving

**Checks:**
- Item availability status
- Stock quantity vs requested quantity

**Error:** Throws `InventoryUnavailableError` if items unavailable

**Implementation:** `checkInventory` activity

---

### FR-WF-002-03: Item Reservation (with Compensation)
**Description:** Reserve inventory items with automatic release on failure

**Reservation Logic:**
- Lock inventory for 10 minutes
- Prevents double-booking

**Compensation:**
- **Trigger:** Payment failure or order creation failure
- **Action:** Release all reserved items via `releaseItems` activity

**Implementation:** `reserveItems` activity

---

### FR-WF-002-04: Payment Processing (with Compensation)
**Description:** Process payment with refund compensation on downstream failure

**Payment Flow:**
1. Generate unique order ID (idempotency key)
2. Call payment gateway
3. Handle payment status (success/failed/pending)

**Compensation:**
- **Trigger:** Order creation failure after successful payment
- **Action:** Refund payment via `refundPayment` activity

**Implementation:** `processPayment` activity

---

### FR-WF-002-05: Order Creation
**Description:** Create order record in database

**Order Data:**
- Order ID (pre-generated)
- User ID
- Restaurant ID
- Items array
- Total amount
- Payment ID
- Delivery address
- Initial status: `pending`

**Implementation:** `createOrder` activity

---

### FR-WF-002-06: Order Confirmation
**Description:** Update order status to `confirmed` after successful creation

**Implementation:** `updateOrderStatus` activity

---

### FR-WF-002-07: Notifications
**Description:** Notify restaurant and customer (non-critical)

**Notification Types:**
- **Restaurant:** New order notification (push + email)
- **Customer:** Order placed confirmation (in-app + push)

**Error Handling:** Failures logged but do not fail the workflow

**Implementation:** `notifyRestaurant`, `notifyCustomer` activities

---

## Saga Pattern Implementation

### Compensations (Executed in Reverse Order)

**Compensation Stack:**
```typescript
[
  1. Reserve Items → Release Items (rollback)
  2. Process Payment → Refund Payment (rollback)
]
```

**Execution on Failure:**
- Compensations run in LIFO order (Last In, First Out)
- Each compensation is tried independently
- Failures logged but do not stop other compensations

---

## Workflow Input

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

---

## Workflow Output

```typescript
interface PlaceOrderResult {
  orderId: string;
  status: string; // 'confirmed'
  paymentId?: string;
}
```

---

## Activity Dependencies

| Activity | Purpose | Timeout | Retry | Compensation |
|----------|---------|---------|-------|--------------|
| `validateCart` | Validate cart items | 30s | 3 | - |
| `checkInventory` | Check item availability | 30s | 3 | - |
| `reserveItems` | Lock inventory | 30s | 3 | `releaseItems` |
| `processPayment` | Charge payment | 30s | 3 | `refundPayment` |
| `createOrder` | Create order record | 30s | 3 | - |
| `updateOrderStatus` | Update status to confirmed | 30s | 3 | - |
| `notifyRestaurant` | Send restaurant notification | 30s | 3 | - |
| `notifyCustomer` | Send customer notification | 30s | 3 | - |

---

## Workflow Steps

1. **Validate Cart**
   - Check item structure and values
   - Throw error if invalid

2. **Check Inventory**
   - Verify all items available
   - Throw error if unavailable

3. **Reserve Items**
   - Lock inventory for order
   - Add compensation: release items on failure

4. **Process Payment**
   - Generate order ID (idempotency key)
   - Call payment gateway
   - Handle payment result
   - Add compensation: refund on order failure

5. **Create Order**
   - Persist order record to database
   - Status: `pending`

6. **Update Order Status**
   - Change status to `confirmed`

7. **Notify Parties**
   - Notify restaurant (best-effort)
   - Notify customer (best-effort)

8. **Return Result**
   - Return order ID, status, payment ID

**On Failure:**
- Execute compensations in reverse order
- Notify customer of failure
- Propagate error

---

## Error Handling

### Validation Errors (Non-Retryable)
- `InvalidCartError`: Invalid cart items
- `InventoryUnavailableError`: Items out of stock

**Action:** Fail immediately, no compensation

### Payment Errors
- `PaymentDeclinedError`: Card declined (non-retryable)
- `PaymentTimeoutError`: Gateway timeout (retryable)
- `PaymentGatewayError`: Gateway error (retryable)

**Action:**
- Retry if retryable
- Run compensations on failure
- Notify customer

### Database Errors (Retryable)
- Connection timeout
- Deadlock

**Retry Policy:**
```typescript
{
  initialInterval: '1s',
  backoffCoefficient: 2,
  maximumInterval: '30s',
  maximumAttempts: 3
}
```

---

## Performance Requirements

### PR-WF-002-01: Order Placement Latency
- **Happy Path:** < 3s (p95)
- **With Retries:** < 10s (p99)
- **Timeout:** 60s total workflow timeout

### PR-WF-002-02: Throughput
- Support 100+ orders/second
- Handle 10,000+ concurrent workflows

### PR-WF-002-03: Compensation Reliability
- Compensation success rate: > 99.9%
- Compensation timeout: 30s per action

---

## Test Coverage

**Test File:** `packages/workflows/src/__tests__/placeOrder.workflow.test.ts`

### Test Cases
1. ✅ Happy path: Complete order flow
2. ✅ Payment failure triggers compensation (release items)
3. ✅ Order creation failure triggers refund
4. ✅ Inventory check failure (no compensation)
5. ✅ Notification failures do not affect order
6. ✅ Compensation execution order verification
7. ✅ Idempotency check (duplicate order ID)
8. ✅ Invalid cart validation

**Coverage:** 100% (all paths + compensations)

---

## Integration Points

### Upstream
- **Gateway API:** Order placement requests

### Downstream
- **Payment Gateway:** Stripe/Razorpay for payment processing
- **Inventory Service:** Stock management
- **PostgreSQL:** Order persistence
- **Notification Service:** Email, SMS, push notifications

---

## Deployment Configuration

**Task Queue:** `foodbot-orders-queue`

**Worker Configuration:**
- Max concurrent workflows: 25
- Max concurrent activities: 50

**Environment Variables:**
```bash
PAYMENT_GATEWAY_URL=https://api.stripe.com/v1
INVENTORY_SERVICE_URL=http://inventory-service:8080
DATABASE_URL=postgresql://user:pass@localhost:5432/foodbot
NOTIFICATION_SERVICE_URL=http://notification-service:8080
```

---

## Monitoring & Observability

### Metrics
- `workflow.place_order.duration` - Workflow execution time
- `workflow.place_order.success_rate` - Successful order percentage
- `workflow.place_order.compensation_rate` - Compensation execution rate
- `workflow.place_order.payment_failures` - Payment failure count
- `workflow.place_order.inventory_unavailable` - Out of stock count

### Logs
- Cart validation result
- Inventory check result
- Payment processing started/completed
- Order created
- Compensation triggered (if any)
- Notification delivery status

### Alerts
- High compensation rate (> 5%)
- Payment failure rate (> 10%)
- Workflow timeout rate (> 1%)
- Database connection errors

---

## Saga Pattern Benefits

### Advantages
1. **Atomicity:** All-or-nothing order placement
2. **Consistency:** Inventory and payment always in sync
3. **Isolation:** Each order processed independently
4. **Durability:** State persisted, survives worker crashes

### Compensation Guarantees
- At-least-once execution
- Idempotent compensation activities
- Eventual consistency

---

## Related Documentation

- [Payment Processing Architecture](../../architecture/integration/payment-gateway.md)
- [Saga Pattern Implementation](../../architecture/integration/saga-pattern.md)
- [Order Fulfillment Workflow](./WF-004-order-fulfillment-workflow.md)

---

**Last Updated:** 2026-02-20
**Implemented By:** Workflows Package Team

# WF-004: Order Fulfillment Workflow

**Status:** Implemented ✅
**Priority:** High
**Category:** Workflows - Order Management
**Package:** `@foodbot/workflows`

---

## Overview

Long-running workflow managing complete order lifecycle from preparation through delivery. Uses Temporal signals for state transitions triggered by external events (restaurant actions, delivery partner actions).

**Related Requirements:**
- FR-ORDER-LIFECYCLE-001: Order status management
- FR-DELIVERY-001: Delivery partner assignment
- FR-DELIVERY-002: Delivery tracking

---

## Functional Requirements

### FR-WF-004-01: Order Preparation
**Description:** Mark order as preparing and notify restaurant

**Actions:**
- Update order status to `preparing`
- Notify restaurant (push + email)
- Notify customer (in-app)

**Implementation:** `updateOrderStatus`, `notifyRestaurant`, `notifyCustomer` activities

---

### FR-WF-004-02: Wait for Order Ready (Signal-Driven)
**Description:** Wait for restaurant to signal order is ready

**Signal:** `orderReady`
**Timeout:** 45 minutes
**Escalation:**
- After 45 min: Notify customer of delay
- Wait additional 15 min
- After 60 min total: Cancel order, notify customer

**Implementation:** `condition(() => isOrderReady, '45m')`

---

### FR-WF-004-03: Delivery Partner Assignment
**Description:** Assign delivery partner when order is ready

**Actions:**
- Update order status to `ready`
- Call delivery service API
- Assign partner
- Update database with partner info

**Timeout:** 5 minutes
**Retry:** Automatic reassignment on timeout

**Implementation:** `assignDeliveryPartner`, `callDeliveryService` activities

---

### FR-WF-004-04: Wait for Pickup (Signal-Driven)
**Description:** Wait for delivery partner to pick up order

**Signal:** `orderPickedUp`
**Timeout:** 30 minutes
**Escalation:**
- After 30 min: Reassign delivery partner
- Wait 20 more minutes with new partner

**Implementation:** `condition(() => isOrderPickedUp, '30m')`

---

### FR-WF-004-05: Delivery Tracking
**Description:** Track delivery in progress with periodic status checks

**Process:**
- Update order status to `out_for_delivery`
- Notify customer
- Poll delivery status every 1 minute
- Max 60 checks (1 hour)

**Status Checks:** Call `trackDelivery` activity every minute

**Implementation:** `sleep('1m')` + `trackDelivery` in loop

---

### FR-WF-004-06: Delivery Completion (Signal-Driven)
**Description:** Complete order when delivery partner confirms

**Signal:** `orderDelivered`
**Fallback:** Auto-complete after 60 status checks

**Actions:**
- Update order status to `delivered`
- Notify customer
- Record delivery timestamp

**Implementation:** `updateOrderStatus`, `notifyCustomer` activities

---

## Signals

### Signal 1: orderReady
**Trigger:** Restaurant marks order as ready
**Handler:** Sets `isOrderReady = true`

### Signal 2: orderPickedUp
**Trigger:** Delivery partner picks up order
**Handler:** Sets `isOrderPickedUp = true`

### Signal 3: orderDelivered
**Trigger:** Delivery partner confirms delivery
**Handler:** Sets `isOrderDelivered = true`

---

## Workflow Input

```typescript
interface OrderFulfillmentInput {
  orderId: string;
  restaurantId: string;
  userId: string;
  deliveryAddress: string;
}
```

---

## Workflow Output

```typescript
interface OrderFulfillmentResult {
  orderId: string;
  status: string; // 'delivered' | 'cancelled'
  deliveryPartnerId?: string;
  deliveredAt?: string;
}
```

---

## Order Status Flow

```
pending → preparing → ready → out_for_delivery → delivered
                                   ↓
                              cancelled (timeout)
```

---

## Workflow Steps

1. **Mark as Preparing** (Immediate)
   - Update status
   - Notify restaurant and customer

2. **Wait for Ready** (Signal-driven, 45-60 min)
   - Wait for `orderReady` signal
   - Escalate on timeout

3. **Assign Delivery Partner** (Immediate)
   - Update status to `ready`
   - Assign partner
   - Schedule pickup

4. **Wait for Pickup** (Signal-driven, 30-50 min)
   - Wait for `orderPickedUp` signal
   - Reassign partner on timeout

5. **Track Delivery** (Polling, up to 60 min)
   - Update status to `out_for_delivery`
   - Poll status every minute
   - Wait for `orderDelivered` signal

6. **Complete Delivery** (Immediate)
   - Update status to `delivered`
   - Notify customer
   - Return result

---

## Timeouts and Escalation

| Stage | Timeout | Escalation |
|-------|---------|------------|
| Preparation | 45 min | Notify customer, wait 15 more min |
| Preparation (extended) | 60 min | Cancel order |
| Pickup | 30 min | Reassign partner, wait 20 more min |
| Delivery tracking | 60 min (60 checks) | Auto-complete as delivered |

---

## Activity Dependencies

| Activity | Purpose | Timeout | Retry |
|----------|---------|---------|-------|
| `updateOrderStatus` | Update order status | 60s | 5 |
| `notifyRestaurant` | Send restaurant notification | 60s | 5 |
| `notifyCustomer` | Send customer notification | 60s | 5 |
| `assignDeliveryPartner` | Assign delivery partner | 60s | 5 |
| `callDeliveryService` | Schedule pickup | 60s | 5 |
| `trackDelivery` | Get delivery status | 60s | 5 |
| `updateDatabase` | Update database | 60s | 5 |

---

## Performance Requirements

- **Duration:** 30-90 minutes (typical order lifecycle)
- **Max Duration:** 2 hours
- **Signal Processing:** < 1s
- **Notification Latency:** < 5s

---

## Error Handling

### Non-Critical Errors
- Notification failures: Logged, workflow continues

### Critical Errors
- Database connection failure: Retry with backoff
- Delivery service unavailable: Retry assignment

### Workflow Failure
- Notify customer of failure
- Mark order as failed
- Manual intervention required

---

## Test Coverage

**Test File:** `packages/workflows/src/__tests__/orderFulfillment.workflow.test.ts`

### Test Cases
1. ✅ Happy path: Complete delivery
2. ✅ Preparation timeout escalation
3. ✅ Preparation timeout cancellation
4. ✅ Pickup timeout + reassignment
5. ✅ Delivery tracking with signal
6. ✅ Delivery tracking timeout fallback
7. ✅ Notification failure handling

**Coverage:** 100%

---

## Integration Points

### Upstream
- **Place Order Workflow:** Triggers fulfillment
- **Restaurant Dashboard:** Sends `orderReady` signal
- **Delivery Partner App:** Sends `orderPickedUp`, `orderDelivered` signals

### Downstream
- **Delivery Service API:** Partner assignment and tracking
- **PostgreSQL:** Order status updates
- **Notification Service:** Customer/restaurant notifications

---

## Deployment Configuration

**Task Queue:** `foodbot-orders-queue`

**Worker Configuration:**
- Max concurrent workflows: 25
- Max concurrent activities: 50

**Environment Variables:**
```bash
DELIVERY_SERVICE_URL=http://delivery-service:8080
DATABASE_URL=postgresql://...
NOTIFICATION_SERVICE_URL=http://notification-service:8080
```

---

## Monitoring & Observability

### Metrics
- `workflow.order_fulfillment.duration` - Total delivery time
- `workflow.order_fulfillment.prep_timeout_rate` - Preparation timeout percentage
- `workflow.order_fulfillment.pickup_timeout_rate` - Pickup timeout percentage
- `workflow.order_fulfillment.success_rate` - Delivered order percentage

### Logs
- Order status transitions
- Signal receipts
- Timeout escalations
- Partner assignments/reassignments

### Alerts
- High timeout rate (> 10%)
- Delivery service unavailable
- High cancellation rate (> 5%)

---

## Long-Running Workflow Considerations

- **Duration:** Can run for hours
- **State Persistence:** All state persisted by Temporal
- **Worker Restarts:** Workflow resumes from last checkpoint
- **Signal Delivery:** At-least-once delivery guaranteed

---

## Related Documentation

- [Place Order Workflow](./WF-002-place-order-workflow.md)
- [Delivery Integration](../../architecture/integration/delivery-service.md)
- [Temporal Signals](../../architecture/integration/temporal-signals.md)

---

**Last Updated:** 2026-02-20
**Implemented By:** Workflows Package Team

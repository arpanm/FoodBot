# TASK-MCP-004: Production MCP Order Placement System

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P0 (Critical)
**Estimated Effort:** 18 days
**Component:** MCP Adapter / Workflow / Gateway API
**Depends On:** TASK-OAUTH-002, TASK-DB-001
**Blocks:** Customer order flow, Payment processing, Order tracking
**Related Requirements:** FR-CA-ORDER-001, WF-002, WF-003, WF-004

---

## Overview

Implement the complete production-grade order placement system through MCP providers (Internal, Swiggy, Zomato, ONDC) with full workflow orchestration via Temporal, payment processing, real-time status updates, multi-restaurant ordering, error recovery, and order lifecycle management.

---

## Requirements

### Functional Requirements

1. **Order Initiation**
   - Validate cart (items availability, prices, restaurant open status)
   - Calculate final amounts (subtotal, taxes, delivery fee, discounts, promotions)
   - Reserve items (optimistic locking with TTL)
   - Create order record with PENDING status
   - Generate order number (ORD-YYYYMMDD-XXXXX format)

2. **Provider-Based Order Routing**
   - Route to Internal provider for in-house restaurants
   - Route to Swiggy MCP for Swiggy-sourced restaurants
   - Route to Zomato MCP for Zomato-sourced restaurants
   - Route to ONDC for ONDC network restaurants
   - Multi-provider order splitting (when cart has items from different sources)
   - Provider health check before routing
   - Automatic fallback if primary provider fails

3. **Payment Processing**
   - Payment initiation with multiple methods (Card, UPI, Wallet, COD)
   - Payment gateway integration (Razorpay/Stripe mock)
   - Payment verification and status polling
   - Automatic refund on order cancellation
   - Split payment support for multi-restaurant orders
   - Payment timeout handling (5-minute window)

4. **Order Lifecycle Management**
   - Status flow: PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
   - Cancellation with reason tracking (user-initiated, restaurant-rejected, system-timeout)
   - Partial cancellation (remove items from order)
   - Order modification before PREPARING status
   - Re-order functionality
   - Status webhook notifications to frontend

5. **Real-Time Status Updates**
   - Job-based status polling from frontend
   - Kafka events for each status change
   - Push notifications for critical status changes
   - Estimated delivery time updates
   - Delivery tracking coordinates (when available from provider)

6. **Multi-Restaurant Orders**
   - Split cart by restaurant/provider
   - Create parent order + child orders per restaurant
   - Independent status tracking per child order
   - Consolidated payment with split settlement
   - Delivery coordination across restaurants

7. **Scheduled Orders**
   - Future date/time order scheduling
   - Automatic order placement at scheduled time
   - Schedule modification and cancellation
   - Availability re-validation before placement
   - Reminder notifications

8. **Error Recovery**
   - Saga pattern for distributed transaction rollback
   - Compensating transactions for each step
   - Dead letter queue for failed orders
   - Manual retry for stuck orders
   - Automatic refund on unrecoverable failures
   - Admin dashboard for order issue resolution

### Architecture

```
Order Flow:
Frontend → POST /orders → Validate → Create Order → Start Temporal Workflow
  → processPayment Activity → Place via MCP Provider → Monitor Status
  → Update Job Status → Frontend Polls → Show Updates

Temporal Workflow: placeOrder
├── validateOrder (activity)
├── calculatePricing (activity)
├── reserveItems (activity)
├── initiatePayment (activity)
├── awaitPaymentConfirmation (signal)
├── routeToProvider (activity)
│   ├── internalProvider.placeOrder
│   ├── swiggyMCP.placeOrder
│   ├── zomatoMCP.placeOrder
│   └── ondcProtocol.placeOrder
├── confirmOrder (activity)
├── monitorFulfillment (activity, long-running)
├── handleDelivery (activity)
└── completeOrder (activity)

Saga Compensations:
├── cancelPayment ← payment fails after charge
├── releaseItems ← order rejected by restaurant
├── refundPayment ← delivery failed
└── notifyUser ← any failure

Multi-Restaurant Split:
POST /orders (multi-restaurant cart)
  → splitByProvider(cart)
  → createParentOrder()
  → for each provider:
      → createChildOrder()
      → startChildWorkflow()
  → consolidatePayment()
  → trackAllChildren()
```

### Acceptance Criteria
- [ ] Complete order placement through all 4 providers
- [ ] Payment processing with 3+ payment methods
- [ ] Saga-based rollback for all failure scenarios
- [ ] Multi-restaurant order splitting and tracking
- [ ] Scheduled order placement working
- [ ] Real-time status updates via job polling + Kafka events
- [ ] Order cancellation with automatic refund
- [ ] Re-order from previous orders
- [ ] Dead letter queue for failed orders
- [ ] Performance: order placement < 3 seconds
- [ ] Concurrent order handling (100+ simultaneous orders)
- [ ] 85%+ test coverage
- [ ] Integration tests for each provider
- [ ] E2E test: browse → cart → order → payment → delivery
- [ ] Load test: 500 orders/minute sustained

### SDLC Process
1. **Plan**: Order flow diagrams, provider routing rules, saga compensation matrix, payment flow design
2. **Code**: Order service, routing service, saga service, payment gateway, Temporal workflows and activities
3. **Test**: Unit tests for all business logic, integration tests for provider routing, saga rollback tests
4. **Fix**: Address test failures
5. **Code Review**: Architecture review of saga patterns, payment idempotency, provider routing
6. **Fix**: Address review findings
7. **Code Analysis**: Detect race conditions, deadlocks, missing error handling, type safety
8. **Fix**: Resolve analysis findings
9. **Security Analysis**: Payment data handling audit, PCI compliance check, injection prevention
10. **Fix**: Address security findings
11. **Performance Testing**: Load testing at 500 orders/min, latency profiling, database query optimization
12. **Fix**: Address performance bottlenecks

### Files to Create/Modify
- `apps/gateway-api/src/order/order.service.ts` (extend)
- `apps/gateway-api/src/order/order-routing.service.ts` (new)
- `apps/gateway-api/src/order/order-saga.service.ts` (new)
- `apps/gateway-api/src/order/scheduled-order.service.ts` (new)
- `apps/gateway-api/src/order/multi-restaurant-order.service.ts` (new)
- `apps/gateway-api/src/order/order-number-generator.ts` (new)
- `apps/gateway-api/src/payment/payment-gateway.service.ts` (extend)
- `apps/gateway-api/src/payment/payment-refund.service.ts` (new)
- `apps/gateway-api/src/payment/split-payment.service.ts` (new)
- `packages/workflows/src/workflows/placeOrder.workflow.ts` (extend)
- `packages/workflows/src/workflows/scheduledOrder.workflow.ts` (new)
- `packages/workflows/src/activities/order-activities.ts` (new)
- `packages/workflows/src/activities/payment-activities.ts` (new)
- `services/mcp-adapter/src/providers/internal/order.ts` (new)
- `services/mcp-adapter/src/providers/swiggy/order.ts` (new)
- `services/mcp-adapter/src/providers/zomato/order.ts` (new)
- `services/mcp-adapter/src/providers/ondc/order.ts` (new)
- `packages/events/src/schemas/order-events.ts` (extend)
- `packages/events/src/schemas/payment-events.ts` (extend)
- All corresponding test files

### Dependencies
- TASK-DB-001 (orders, order_items, payments, payment_refunds tables)
- TASK-OAUTH-002 (provider authentication tokens)
- Temporal server running
- Kafka cluster running
- Redis for distributed locks and caching
- Payment gateway sandbox credentials

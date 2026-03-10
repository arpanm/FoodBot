# TASK-PLANNER-003: Bulk Ordering System - Full Production Implementation

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 14 days
**Component:** Customer Agent / Gateway API / Cart / Orders
**Depends On:** TASK-DB-001, TASK-MCP-004
**Blocks:** Corporate ordering, event catering
**Related Requirements:** FR-CA-PLANNER-003

---

## Overview

Implement a production-grade bulk ordering system that handles large-quantity orders from single or multiple restaurants, with quantity tiers, restaurant capacity validation, advance scheduling, split delivery coordination, corporate account management, and special pricing negotiation.

---

## Requirements

### Functional Requirements

1. **Multi-Restaurant Cart**
   - Add items from multiple restaurants in single session
   - Per-restaurant sub-cart with independent totals
   - Quantity management: min/max per item, bulk quantity tiers
   - Restaurant capacity validation (can they handle 200 plates?)
   - Minimum order amount per restaurant
   - Maximum items per restaurant (kitchen capacity)
   - Cart persistence across sessions (24h TTL)
   - Cart sharing (generate link for team ordering)
   - Merge carts from multiple users (team ordering)

2. **Bulk Quantity Management**
   - Quantity tier pricing (10+, 25+, 50+, 100+ units)
   - Bulk discount auto-application
   - Per-item quantity limits based on restaurant capacity
   - Real-time availability check for bulk quantities
   - Substitute suggestions when quantity unavailable
   - Quantity adjustment with price recalculation
   - Custom packaging options for bulk orders

3. **Corporate Account Features**
   - Corporate account setup with billing
   - Department-level ordering with budgets
   - Approval workflow (requester → manager → finance)
   - Monthly invoicing instead of per-order payment
   - GST invoice generation
   - Expense categorization
   - Employee ordering on corporate account with limits

4. **Split Delivery Coordination**
   - Multiple delivery addresses per order
   - Staggered delivery times
   - Per-address item allocation
   - Delivery tracking per drop point
   - Special delivery instructions per address
   - Consolidation: combine nearby addresses

5. **Order Scheduling & Recurring Orders**
   - Schedule for future date/time
   - Recurring orders (daily, weekly, custom schedule)
   - Recurring order management (pause, skip, modify)
   - Auto-reorder with availability check
   - Holiday calendar integration (skip holidays)

6. **Pricing & Payment**
   - Bulk discount calculation
   - Multi-restaurant consolidated payment
   - Split payment between payers
   - Corporate billing (invoice)
   - Pre-payment for scheduled orders
   - Deposit + balance payment model
   - Tax calculation per restaurant (CGST + SGST)

### Architecture

```
Bulk Order Flow:
Multi-Restaurant Selection → Bulk Cart Builder → Capacity Validation
  → Pricing Calculation → Delivery Planning → Payment
  → Multi-Order Creation → Parallel Placement → Tracking

Components:
├── BulkCartService
│   ├── MultiRestaurantCartManager
│   ├── QuantityTierCalculator
│   ├── CapacityValidator
│   ├── CartShareManager
│   └── CartMergeService
├── BulkPricingService
│   ├── TierPriceCalculator
│   ├── BulkDiscountEngine
│   ├── TaxCalculator
│   └── InvoiceGenerator
├── CorporateAccountService
│   ├── AccountManager
│   ├── BudgetTracker
│   ├── ApprovalWorkflow
│   └── ExpenseManager
├── SplitDeliveryService
│   ├── AddressAllocator
│   ├── DeliveryTimeOptimizer
│   ├── ConsolidationEngine
│   └── MultiDropTracker
├── RecurringOrderService
│   ├── ScheduleManager
│   ├── RecurrenceEngine
│   ├── HolidayCalendar
│   └── AutoReorderService
└── BulkPaymentService
    ├── ConsolidatedPayment
    ├── SplitPayment
    ├── CorporateBilling
    └── DepositManager

API Endpoints:
POST   /api/v1/bulk-orders/cart           - Create bulk cart
PUT    /api/v1/bulk-orders/cart/:id       - Update cart
POST   /api/v1/bulk-orders/cart/:id/share - Share cart
POST   /api/v1/bulk-orders/cart/:id/merge - Merge carts
POST   /api/v1/bulk-orders/validate       - Validate capacity
GET    /api/v1/bulk-orders/pricing/:cartId - Get pricing
POST   /api/v1/bulk-orders/place          - Place bulk order
POST   /api/v1/bulk-orders/schedule       - Schedule bulk order
GET    /api/v1/bulk-orders/:id            - Get order details
PUT    /api/v1/bulk-orders/:id/delivery   - Update delivery plan
POST   /api/v1/corporate/accounts         - Setup corporate account
POST   /api/v1/corporate/orders/:id/approve - Approve order
GET    /api/v1/recurring-orders           - List recurring orders
PUT    /api/v1/recurring-orders/:id       - Update recurring order
```

### Frontend Components (Customer App)
```
BulkOrder/
├── BulkCartBuilder.tsx (multi-restaurant cart)
├── RestaurantSubCart.tsx (per-restaurant view)
├── QuantityTierDisplay.tsx (tier pricing info)
├── CapacityIndicator.tsx (availability status)
├── SplitDeliveryPlanner.tsx (multi-address setup)
├── CorporateOrderForm.tsx (corporate account ordering)
├── ApprovalWorkflow.tsx (manager approval UI)
├── RecurringOrderSetup.tsx (schedule configuration)
├── BulkPricingSummary.tsx (consolidated pricing)
└── BulkOrderTracker.tsx (multi-drop tracking)
```

### Acceptance Criteria
- [ ] Multi-restaurant cart with independent sub-carts
- [ ] Quantity tier pricing working
- [ ] Restaurant capacity validation
- [ ] Corporate account with approval workflow
- [ ] Split delivery to multiple addresses
- [ ] Recurring order management
- [ ] Consolidated payment for multi-restaurant orders
- [ ] GST invoice generation
- [ ] Cart sharing and merging
- [ ] Performance: capacity check < 3 seconds
- [ ] 85%+ test coverage
- [ ] E2E: add bulk items → validate → pay → track delivery

### SDLC Process
1. **Plan**: API design, database schema, pricing model design, UI wireframes
2. **Code**: Backend services, frontend components, payment integration, Temporal workflows
3. **Test**: Unit tests (services), integration tests (API), E2E tests (full flow)
4. **Fix**: Address test failures
5. **Code Review**: Architecture review, pricing logic review, security review
6. **Fix**: Address review findings
7. **Code Analysis**: Complexity analysis, performance profiling, dependency check
8. **Fix**: Optimize hot paths
9. **Security Analysis**: Payment security, authorization, corporate account isolation
10. **Fix**: Address security findings

### Files to Create/Modify
**Backend:**
- `apps/gateway-api/src/bulk-order/bulk-order.module.ts`
- `apps/gateway-api/src/bulk-order/bulk-order.controller.ts`
- `apps/gateway-api/src/bulk-order/bulk-order.service.ts`
- `apps/gateway-api/src/bulk-order/bulk-cart.service.ts`
- `apps/gateway-api/src/bulk-order/bulk-pricing.service.ts`
- `apps/gateway-api/src/bulk-order/capacity-validator.service.ts`
- `apps/gateway-api/src/bulk-order/split-delivery.service.ts`
- `apps/gateway-api/src/corporate/corporate.module.ts`
- `apps/gateway-api/src/corporate/corporate.controller.ts`
- `apps/gateway-api/src/corporate/corporate.service.ts`
- `apps/gateway-api/src/recurring-order/recurring-order.service.ts`
- `apps/gateway-api/src/entities/bulk-order.entity.ts`
- `apps/gateway-api/src/entities/corporate-account.entity.ts`
- `packages/workflows/src/workflows/bulkOrderPlacement.workflow.ts`
- `packages/workflows/src/workflows/recurringOrderScheduler.workflow.ts`
- `packages/workflows/src/activities/bulk-order-activities.ts`

**Frontend:**
- `apps/customer-app/src/components/BulkOrder/*.tsx` (10 files)
- `apps/customer-app/src/services/bulk-order.service.ts`
- `apps/customer-app/src/store/bulkOrderSlice.ts`

**Tests:**
- `apps/gateway-api/src/bulk-order/__tests__/*.spec.ts`
- `apps/gateway-api/src/bulk-order/__tests__/*.e2e-spec.ts`
- `apps/customer-app/src/components/BulkOrder/__tests__/*.spec.tsx`

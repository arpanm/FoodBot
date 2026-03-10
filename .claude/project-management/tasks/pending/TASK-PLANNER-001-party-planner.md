# TASK-PLANNER-001: Party Planner Feature - Full Production Implementation

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 20 days
**Component:** Customer Agent / Gateway API / Workflows
**Depends On:** TASK-DB-001, TASK-MCP-004
**Blocks:** Bulk ordering, scheduled order placement
**Related Requirements:** FR-CA-PLANNER-001

---

## Overview

Implement a complete AI-powered party planner feature that allows customers to plan food orders for future events/parties. The system collects event details (date, budget, guest count, veg/non-veg split, preferences, dietary restrictions), generates menu recommendations from multiple restaurants using LLM + preference data, allows interactive refinement, calculates costs across restaurants, and schedules multi-restaurant orders for future dates with automatic placement.

---

## Requirements

### Functional Requirements

1. **Event Setup Wizard (Conversational UI)**
   - Collect event name, date, time, venue/address
   - Guest count (total, veg, non-veg, vegan, jain, other dietary)
   - Budget (total, per-person options)
   - Cuisine preferences (multi-select: Indian, Chinese, Italian, etc.)
   - Course preferences (starters, mains, desserts, beverages)
   - Special requirements (nut-free, gluten-free, halal, kosher)
   - Event type (birthday, corporate, wedding, house party, etc.)
   - Service type (delivery only, buffet setup, live cooking stations)
   - Previous party templates (save & reuse)

2. **AI Menu Generation**
   - LLM analyzes event requirements and generates menu suggestions
   - Multi-restaurant sourcing for variety
   - Quantity calculation based on guest count + buffer (15%)
   - Budget optimization across restaurants
   - Dietary balance (ensure all dietary groups have options)
   - Course balance (proper ratio of starters:mains:desserts)
   - Price comparison across providers (Internal, Swiggy, Zomato)
   - Alternative suggestions for each item
   - Seasonal/trending dish suggestions

3. **Interactive Menu Refinement**
   - Chat-based refinement ("replace biryani with pulao", "add more desserts")
   - Drag-and-drop menu editor in card UI
   - Swap dishes within same category
   - Adjust quantities per dish
   - Add/remove restaurants
   - Real-time budget recalculation
   - Save multiple menu versions for comparison
   - Share menu with co-planners (via link)
   - Approval workflow for corporate events

4. **Cost Management**
   - Per-restaurant cost breakdown
   - Per-course cost breakdown
   - Per-person cost calculation
   - Tax and delivery fee estimation per restaurant
   - Promotion/coupon application
   - Budget alerts (over/under budget warnings)
   - Cost optimization suggestions
   - Payment splitting options (multiple payers)

5. **Order Scheduling**
   - Schedule order placement for future date/time
   - Staggered ordering (different restaurants at different times)
   - Pre-order confirmation with restaurants (T-24h, T-2h)
   - Availability re-validation before placement
   - Automatic order placement at scheduled time
   - Fallback restaurant selection if primary unavailable
   - Order modification window (up to T-4h)
   - Cancellation with refund policy

6. **Party Dashboard**
   - Overview of all planned parties
   - Status tracking per party (Planning, Confirmed, Ordered, Delivered)
   - Per-restaurant order status
   - Guest count adjustments (with auto menu recalculation)
   - Budget vs actual tracking
   - Order history for past parties
   - Party templates (save successful menus as templates)

### Architecture

```
Party Planner Flow:
Chat Input → LLM (event details extraction) → Party Plan Creation
  → Menu Generation (LLM + Search + Preferences) → User Refinement
  → Cost Calculation → Confirmation → Schedule Orders
  → Temporal Scheduled Workflow → Order Placement → Tracking

Components:
├── PartyPlannerService
│   ├── EventSetupManager
│   ├── MenuGenerator (LLM-powered)
│   ├── QuantityCalculator
│   ├── BudgetOptimizer
│   └── DietaryBalancer
├── MenuRefinementService
│   ├── ChatRefinementHandler
│   ├── DragDropMenuEditor
│   ├── VersionManager
│   └── ShareManager
├── CostCalculationService
│   ├── PerRestaurantCalculator
│   ├── TaxEstimator
│   ├── DeliveryFeeCalculator
│   ├── PromotionApplier
│   └── BudgetAlertSystem
├── OrderSchedulingService
│   ├── ScheduleManager
│   ├── AvailabilityValidator
│   ├── PreOrderConfirmer
│   ├── FallbackSelector
│   └── TemporalScheduler
├── PartyDashboardService
│   ├── StatusTracker
│   ├── TemplateManager
│   └── HistoryManager
└── Database Tables
    ├── party_plans
    ├── party_plan_orders
    ├── party_plan_menus
    ├── party_plan_guests
    └── party_templates

API Endpoints:
POST   /api/v1/party-plans                    - Create new party plan
GET    /api/v1/party-plans                    - List user's party plans
GET    /api/v1/party-plans/:id               - Get party plan details
PUT    /api/v1/party-plans/:id               - Update party plan
DELETE /api/v1/party-plans/:id               - Cancel party plan
POST   /api/v1/party-plans/:id/generate-menu - AI generate menu
PUT    /api/v1/party-plans/:id/menu          - Update menu
POST   /api/v1/party-plans/:id/confirm       - Confirm and schedule
GET    /api/v1/party-plans/:id/cost          - Get cost breakdown
POST   /api/v1/party-plans/:id/share         - Share with co-planners
POST   /api/v1/party-plans/templates         - Save as template
GET    /api/v1/party-plans/templates         - List templates

Temporal Workflows:
├── partyOrderScheduler.workflow.ts
│   ├── validateAvailability (T-24h)
│   ├── revalidateAvailability (T-2h)
│   ├── placeOrders (T-scheduled)
│   ├── trackOrders
│   └── notifyUser
└── Saga Compensations
    ├── cancelScheduledOrders
    ├── notifyRestaurants
    └── refundIfNeeded
```

### Frontend Components (Customer App)
```
PartyPlanner/
├── PartySetupWizard.tsx (conversational card-based setup)
├── MenuGenerationView.tsx (AI-generated menu display)
├── MenuEditor.tsx (drag-drop refinement)
├── CostBreakdown.tsx (detailed cost view)
├── PartyDashboard.tsx (all parties overview)
├── PartyTimeline.tsx (order scheduling timeline)
├── PartyShareModal.tsx (share with co-planners)
└── PartyTemplateSelector.tsx (reuse past menus)
```

### Acceptance Criteria
- [ ] Full event setup wizard with all fields (conversational + form)
- [ ] AI menu generation using LLM with multi-restaurant sourcing
- [ ] Quantity calculation with dietary group balancing
- [ ] Budget optimization across restaurants
- [ ] Interactive menu refinement (chat + drag-drop)
- [ ] Menu version comparison
- [ ] Per-restaurant and per-course cost breakdown
- [ ] Order scheduling with T-24h and T-2h validation
- [ ] Automatic order placement at scheduled time
- [ ] Fallback restaurant selection
- [ ] Party dashboard with status tracking
- [ ] Template save/reuse functionality
- [ ] Share menu with co-planners
- [ ] Performance: menu generation < 10 seconds
- [ ] 85%+ test coverage (unit + integration + E2E)
- [ ] Security: input validation, authorization per plan

### SDLC Process
1. **Plan**: API design, database schema, LLM prompt engineering, UI wireframes
2. **Code**: Backend services, frontend components, Temporal workflows, LLM integration
3. **Test**: Unit tests (services), integration tests (API), E2E tests (full flow)
4. **Fix**: Address test failures
5. **Code Review**: Architecture review, LLM prompt review, security review
6. **Fix**: Address review findings
7. **Code Analysis**: Complexity analysis, performance profiling, dependency check
8. **Fix**: Optimize hot paths
9. **Security Analysis**: Input validation, authorization, data access patterns
10. **Fix**: Address security findings

### Files to Create/Modify
**Backend:**
- `apps/gateway-api/src/party-planner/party-planner.module.ts`
- `apps/gateway-api/src/party-planner/party-planner.controller.ts`
- `apps/gateway-api/src/party-planner/party-planner.service.ts`
- `apps/gateway-api/src/party-planner/menu-generator.service.ts`
- `apps/gateway-api/src/party-planner/cost-calculator.service.ts`
- `apps/gateway-api/src/party-planner/order-scheduler.service.ts`
- `apps/gateway-api/src/party-planner/dto/*.ts`
- `apps/gateway-api/src/entities/party-plan.entity.ts`
- `apps/gateway-api/src/entities/party-plan-order.entity.ts`
- `packages/workflows/src/workflows/partyOrderScheduler.workflow.ts`
- `packages/workflows/src/activities/party-activities.ts`

**Frontend:**
- `apps/customer-app/src/components/PartyPlanner/*.tsx`
- `apps/customer-app/src/services/party-planner.service.ts`
- `apps/customer-app/src/store/partyPlannerSlice.ts`

**Tests:**
- `apps/gateway-api/src/party-planner/__tests__/*.spec.ts`
- `apps/gateway-api/src/party-planner/__tests__/*.e2e-spec.ts`
- `apps/customer-app/src/components/PartyPlanner/__tests__/*.spec.tsx`

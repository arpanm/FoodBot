# WORKFLOW_GUIDE.md - Relocated

**Status:** ARCHIVED AND RELOCATED
**Date:** 2026-02-20
**Reason:** Misclassified documentation - moved to proper project management structure

---

## New Locations

This guide has been split into properly categorized documentation:

### 1. **Requirements Documentation**
**Location:** `.claude/project-management/requirements/workflows/temporal-workflows-requirements.md`

**Contents:**
- Functional requirements for all workflows
- Workflow specifications (Search, PlaceOrder, ProcessPayment)
- Activity requirements
- Signal and query requirements
- Retry and timeout requirements
- Monitoring and observability requirements

**When to use:** When you need to understand WHAT the workflows should do and WHY.

---

### 2. **Architecture Documentation**
**Location:** `.claude/project-management/architecture/components/temporal-workflows-complete.md`

**Contents:**
- Complete architecture overview with diagrams
- Detailed workflow implementation analysis (code-verified)
- Activity implementation details
- Worker architecture and deployment
- Integration patterns
- Error handling and compensation patterns
- Testing strategy

**When to use:** When you need to understand HOW the workflows are implemented and their internal structure.

---

### 3. **Completed Tasks Documentation**
**Location:** `.claude/project-management/tasks/completed/workflows-implementation-tasks.md`

**Contents:**
- Record of all completed workflow implementations
- Task completion status for each workflow (3/6 done)
- Activity implementation status (100% complete)
- Worker infrastructure status (100% complete)
- Testing infrastructure status (33% complete)
- Integration status (80% complete)

**When to use:** When you need to track implementation progress and see what's done vs. what's remaining.

---

### 4. **Original Guide (Archived)**
**Location:** `.claude/project-management/archive/guides/WORKFLOW_GUIDE_ARCHIVED.md`

**Contents:** Original WORKFLOW_GUIDE.md preserved for reference

**When to use:** For historical reference only.

---

## Quick Reference

### Start a Search Workflow
```typescript
// Gateway API endpoint
POST /search
{
  "userId": "user-123",
  "query": "Italian restaurants near me",
  "filters": {
    "cuisine": ["Italian"],
    "priceRange": [2, 4],
    "rating": 4.0
  }
}
```

See: `.claude/project-management/requirements/workflows/temporal-workflows-requirements.md#22-place-order-workflow`

---

### Start an Order Workflow
```typescript
// Gateway API endpoint
POST /orders
{
  "userId": "user-123",
  "restaurantId": "rest-456",
  "items": [
    { "dishId": "dish-789", "quantity": 2, "price": 15.99 }
  ],
  "paymentDetails": {
    "method": "card",
    "amount": 31.98,
    "currency": "USD"
  },
  "deliveryAddress": "123 Main St"
}
```

See: `.claude/project-management/architecture/components/temporal-workflows-complete.md#22-place-order-workflow-saga-pattern`

---

### Send a Signal to Workflow
```typescript
// Gateway API endpoint
POST /orders/:orderId/ready

// Or via Temporal CLI
tctl workflow signal --workflow-id order-12345 --name orderReady
```

See: `.claude/project-management/requirements/workflows/temporal-workflows-requirements.md#41-signal-handling`

---

## Migration Summary

| Original Section | New Location |
|-----------------|--------------|
| Overview & Capabilities | Requirements Doc - Section 1 |
| Workflow Definitions | Requirements Doc - Section 3 |
| Triggering from Gateway | Architecture Doc - Section 5 |
| Retry Policies | Requirements Doc - Section 7 |
| Activity Implementations | Architecture Doc - Section 3 |
| Worker Setup | Architecture Doc - Section 4 |
| Monitoring | Requirements Doc - Section 8 |

---

**For questions or clarifications, refer to the new documentation locations above.**

**Document Type:** Redirect/Navigation
**Last Updated:** 2026-02-20

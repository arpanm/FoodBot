# Refactor Cart Workflow Complexity

**Task ID:** TD-001
**Priority:** High
**Status:** Open
**Created:** 2026-02-20
**Source:** MCP Code Review (2026-02-19)
**Estimated Effort:** 4-6 hours

---

## Issue Summary

The `processCartWorkflow` function in the Chrome Extension has excessive cyclomatic complexity (12), exceeding the maximum threshold of 10.

**File:** `/chrome-extension/src/content-scripts/workflows/cart-workflow.ts`
**Line:** 45
**Current Complexity:** 12
**Target Complexity:** ≤ 10

---

## Problem Description

### Current Code Structure

The function handles multiple responsibilities:
1. Cart item validation
2. Address selection/entry
3. Payment method selection
4. Coupon application
5. Order confirmation
6. Error handling for each step

**Example Pattern (simplified):**
```typescript
async function processCartWorkflow(items: CartItem[]) {
  if (items.length === 0) {
    throw new EmptyCartError();
  }

  if (!isAddressValid()) {
    if (savedAddresses.length > 0) {
      // Select saved address
    } else {
      // Prompt for new address
    }
  }

  if (!isPaymentMethodSelected()) {
    if (defaultPaymentMethod) {
      // Use default
    } else {
      // Prompt for payment method
    }
  }

  if (couponCode) {
    if (isCouponValid(couponCode)) {
      // Apply coupon
    } else {
      // Show coupon error
    }
  }

  // ... more nested conditionals
}
```

### Issues

1. **High Cyclomatic Complexity:** Makes function hard to test and maintain
2. **Mixed Concerns:** Address, payment, coupon logic mixed together
3. **Deep Nesting:** 4-5 levels of nested if statements
4. **Hard to Test:** Requires many test cases to cover all branches
5. **Poor Readability:** Difficult to understand control flow

---

## Proposed Solution

### Strategy: Extract Workflow Steps

Refactor into separate, focused functions following the **Step Pattern**:

```typescript
// Main workflow orchestrator
async function processCartWorkflow(items: CartItem[]): Promise<OrderResult> {
  await validateCartItems(items);
  const address = await ensureDeliveryAddress();
  const payment = await ensurePaymentMethod();
  const discount = await applyCouponIfAvailable();
  const order = await confirmOrder({ items, address, payment, discount });

  return order;
}

// Step 1: Validate cart items
async function validateCartItems(items: CartItem[]): Promise<void> {
  if (items.length === 0) {
    throw new EmptyCartError('Cart is empty');
  }

  const unavailableItems = items.filter(item => !item.available);
  if (unavailableItems.length > 0) {
    throw new ItemsUnavailableError(unavailableItems);
  }
}

// Step 2: Ensure delivery address
async function ensureDeliveryAddress(): Promise<Address> {
  const savedAddresses = await getSavedAddresses();

  if (savedAddresses.length > 0) {
    return selectFromSavedAddresses(savedAddresses);
  }

  return promptForNewAddress();
}

// Step 3: Ensure payment method
async function ensurePaymentMethod(): Promise<PaymentMethod> {
  const defaultPayment = await getDefaultPaymentMethod();

  if (defaultPayment && isPaymentMethodValid(defaultPayment)) {
    return defaultPayment;
  }

  return promptForPaymentMethod();
}

// Step 4: Apply coupon if available
async function applyCouponIfAvailable(): Promise<Discount | null> {
  const couponCode = getCouponCode();

  if (!couponCode) {
    return null;
  }

  if (!isCouponValid(couponCode)) {
    throw new InvalidCouponError(couponCode);
  }

  return applyCoupon(couponCode);
}

// Step 5: Confirm order
async function confirmOrder(details: OrderDetails): Promise<OrderResult> {
  const order = await submitOrder(details);
  await trackOrderPlaced(order);

  return order;
}
```

### Benefits

1. **Lower Complexity:** Each function has complexity ≤ 5
2. **Single Responsibility:** Each function does one thing
3. **Easy to Test:** Each step testable independently
4. **Better Readability:** Clear sequential flow
5. **Reusability:** Steps can be reused in other workflows

---

## Implementation Steps

### Step 1: Create New Functions (2 hours)

1. Create `cart-workflow-steps.ts` file
2. Extract each step into separate function
3. Add TypeScript types for inputs/outputs
4. Add JSDoc comments for each function

### Step 2: Update Main Workflow (1 hour)

1. Refactor `processCartWorkflow` to call new step functions
2. Add error handling at workflow level
3. Preserve existing behavior (no breaking changes)

### Step 3: Add Unit Tests (2 hours)

1. Write tests for each step function
2. Test happy path for each step
3. Test error cases for each step
4. Test edge cases (empty cart, no saved addresses, etc.)

### Step 4: Integration Testing (1 hour)

1. Test full workflow end-to-end
2. Verify on Swiggy and Zomato
3. Test error recovery
4. Validate performance (no regression)

---

## Testing Requirements

### Unit Tests (New)

```typescript
describe('validateCartItems', () => {
  it('should pass for valid cart items', async () => {
    const items = [{ id: '1', name: 'Pizza', available: true }];
    await expect(validateCartItems(items)).resolves.not.toThrow();
  });

  it('should throw EmptyCartError for empty cart', async () => {
    await expect(validateCartItems([])).rejects.toThrow(EmptyCartError);
  });

  it('should throw ItemsUnavailableError for unavailable items', async () => {
    const items = [{ id: '1', name: 'Pizza', available: false }];
    await expect(validateCartItems(items)).rejects.toThrow(ItemsUnavailableError);
  });
});

describe('ensureDeliveryAddress', () => {
  it('should return saved address if available', async () => {
    const savedAddresses = [{ id: '1', street: '123 Main St' }];
    mockGetSavedAddresses.mockResolvedValue(savedAddresses);

    const address = await ensureDeliveryAddress();
    expect(address).toEqual(savedAddresses[0]);
  });

  it('should prompt for new address if none saved', async () => {
    mockGetSavedAddresses.mockResolvedValue([]);
    mockPromptForNewAddress.mockResolvedValue({ id: '2', street: '456 Oak Ave' });

    const address = await ensureDeliveryAddress();
    expect(mockPromptForNewAddress).toHaveBeenCalled();
  });
});

// ... tests for other steps
```

### Integration Tests (Update Existing)

```typescript
describe('processCartWorkflow (Integration)', () => {
  it('should complete full workflow for valid cart', async () => {
    const items = [{ id: '1', name: 'Pizza', available: true, price: 10 }];
    const result = await processCartWorkflow(items);

    expect(result.orderId).toBeDefined();
    expect(result.status).toBe('confirmed');
  });

  it('should handle empty cart gracefully', async () => {
    await expect(processCartWorkflow([])).rejects.toThrow(EmptyCartError);
  });
});
```

---

## Acceptance Criteria

- [ ] Cyclomatic complexity of `processCartWorkflow` ≤ 10
- [ ] All extracted functions have complexity ≤ 5
- [ ] Unit tests added for each step function (80%+ coverage)
- [ ] Integration tests passing (no regressions)
- [ ] Code review approved
- [ ] No performance degradation (< 5% slower)
- [ ] Documentation updated

---

## Related Issues

- **Original Code Review:** `.claude/project-management/archive/quality-reports/MCP_CODE_REVIEW_2026-02-19.md` (Issue #1, Severity: High, Complexity: 12)
- **Similar Issue:** TD-002 (Extract OAuth Service duplication)

---

## Files to Modify

1. `/chrome-extension/src/content-scripts/workflows/cart-workflow.ts`
   - Refactor `processCartWorkflow` function

2. `/chrome-extension/src/content-scripts/workflows/cart-workflow-steps.ts` (NEW)
   - Create extracted step functions

3. `/chrome-extension/tests/workflows/cart-workflow.test.ts`
   - Add unit tests for step functions
   - Update integration tests

4. `/chrome-extension/src/content-scripts/workflows/types.ts`
   - Add types for OrderDetails, OrderResult

---

## Dependencies

- No external dependencies
- Can be done independently of other tasks

---

## Rollback Plan

If issues arise:
1. Revert commit (use git revert)
2. Restore original `cart-workflow.ts` from backup
3. Re-run test suite to verify no issues

---

## Notes

- Preserve existing behavior (no breaking changes)
- Consider adding workflow state machine in future (separate task)
- Consider adding retry logic for failed steps (separate task)

---

**Assigned To:** TBD
**Sprint:** TBD
**Story Points:** 5

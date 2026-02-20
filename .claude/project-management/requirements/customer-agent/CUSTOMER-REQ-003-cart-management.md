# Customer Requirement: Shopping Cart Management

**Requirement ID:** CUSTOMER-REQ-003
**Feature:** Shopping Cart System
**Status:** ✅ Implemented
**Priority:** High
**Implementation Date:** 2026-02-19

---

## Overview

Complete shopping cart system for adding, updating, and removing items before checkout.

## Implemented Features

### 1. Cart Components
**Location:** `/apps/customer-app/src/components/Cart/`

#### CartList.tsx
- List of all cart items
- Empty cart state
- Total price calculation
- Checkout button
- **Status:** ✅ Implemented
- **Test:** `CartList.test.tsx`

#### CartItem.tsx
- Dish name, image, price
- Quantity adjuster (+/- buttons)
- Remove item button
- Customization display
- Special instructions
- Subtotal calculation
- **Status:** ✅ Implemented
- **Test:** `CartItem.test.tsx`

#### CartSummary.tsx
- Subtotal
- Delivery fee
- Tax calculation
- Discounts/coupons
- Total amount
- Restaurant info
- **Status:** ✅ Implemented
- **Test:** `CartSummary.test.tsx`

### 2. Cart State Management
**Location:** `/apps/customer-app/src/store/slices/cartSlice.ts`

#### Redux Features
```typescript
interface CartState {
  items: CartItem[];
  total: number;
  loading: boolean;
  error: string | null;
}

// Actions
addItem(item: CartItem)          // Add item or increase quantity
removeItem(id: string)           // Remove item from cart
updateQuantity(id, quantity)     // Update item quantity
clearCart()                      // Empty cart
setError(message: string)        // Error handling
```

#### Automatic Calculations
- Subtotal per item (price × quantity)
- Total cart value
- Quantity updates recalculate subtotals
- **Status:** ✅ Implemented

### 3. Cart Service
**Location:** `/apps/customer-app/src/services/cart.service.ts`

#### API Methods
```typescript
- getCart(): Promise<Cart>
- addItem(item: CartItem): Promise<void>
- updateItem(id: string, quantity: number): Promise<void>
- removeItem(id: string): Promise<void>
- clearCart(): Promise<void>
- applyCoupon(code: string): Promise<Cart>
```
- **Status:** ✅ Implemented

### 4. Cart Data Models
**Location:** `/apps/customer-app/src/types/models.ts`

```typescript
interface CartItem {
  id: string;
  dishId: string;
  dishName: string;
  dishImage?: string;
  quantity: number;
  price: number;
  customizations: SelectedCustomization[];
  specialInstructions?: string;
  subtotal: number;  // price * quantity + customizations
}

interface SelectedCustomization {
  customizationId: string;
  customizationName: string;  // "Size"
  optionId: string;
  optionName: string;         // "Large"
  priceModifier: number;      // +2.00
}

interface Cart {
  items: CartItem[];
  restaurantId?: string;
  restaurantName?: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
}
```

## Cart Business Logic

### Adding Items
1. Check if item already exists in cart (by `dishId`)
2. If exists: Increase quantity, recalculate subtotal
3. If new: Add to items array
4. Recalculate cart total
5. Update Redux state

### Quantity Updates
1. Find item by ID
2. Update quantity
3. Recalculate item subtotal
4. Recalculate cart total
5. Update Redux state

### Removing Items
1. Filter out item by ID
2. Recalculate cart total
3. Update Redux state

### Total Calculation
```typescript
const calculateTotal = (items: CartItem[]): number => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = 5.00;
  const tax = subtotal * 0.08;  // 8% tax
  const discount = 0;

  return subtotal + deliveryFee + tax - discount;
};
```

## Cart Rules

### Restaurant Restriction
- Cart can only contain items from ONE restaurant
- Adding item from different restaurant:
  - Show confirmation dialog
  - Clear existing cart
  - Add new item

### Quantity Limits
- Minimum quantity: 1
- Maximum quantity: 10 per item
- UI disables increment/decrement at limits

### Price Calculations
- Item subtotal = (base price + customization fees) × quantity
- Cart subtotal = sum of all item subtotals
- Tax calculated on subtotal only
- Delivery fee fixed per restaurant
- Discount applied to subtotal

## Cart Persistence

### Local Storage
- Cart saved to localStorage on every update
- Cart loaded from localStorage on app init
- Keys: `foodbot_cart_items`, `foodbot_cart_restaurant`

### Session Continuity
- Cart persists across page refreshes
- Cart cleared after successful order
- Cart cleared after 24 hours (expiry)

## File Locations

```
apps/customer-app/src/
├── components/Cart/
│   ├── CartList.tsx
│   ├── CartItem.tsx
│   ├── CartSummary.tsx
│   └── __tests__/ (3 test files)
├── store/slices/
│   └── cartSlice.ts
├── services/
│   └── cart.service.ts
└── types/
    └── models.ts
```

## Test Coverage (3 tests)
- ✅ CartList.test.tsx
- ✅ CartItem.test.tsx
- ✅ CartSummary.test.tsx

## User Stories Covered

1. ✅ As a customer, I can add dishes to my cart
2. ✅ As a customer, I can increase/decrease item quantities
3. ✅ As a customer, I can remove items from cart
4. ✅ As a customer, I can see cart subtotal and total
5. ✅ As a customer, I can add customizations to items
6. ✅ As a customer, I can add special instructions
7. ✅ As a customer, my cart persists across sessions
8. ✅ As a customer, I can only order from one restaurant at a time

## Edge Cases Handled

- Empty cart state with CTA to browse restaurants
- Cart from different restaurant warning
- Maximum quantity reached
- Minimum quantity (can't go below 1)
- Item no longer available (show warning)
- Price changed since added (show update)

## Related Requirements

- [CUSTOMER-REQ-002: Restaurant Search](./CUSTOMER-REQ-002-restaurant-search.md)
- [CUSTOMER-REQ-004: Order Placement](./CUSTOMER-REQ-004-order-placement.md)
- [CUSTOMER-REQ-005: Dish Browsing](./CUSTOMER-REQ-005-dish-browsing.md)

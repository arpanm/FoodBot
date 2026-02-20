# Customer Requirement: Order Management & Tracking

**Requirement ID:** CUSTOMER-REQ-004
**Feature:** Order Placement and Tracking
**Status:** ✅ Implemented
**Priority:** High
**Implementation Date:** 2026-02-19

---

## Overview

Complete order management system from placement to delivery with real-time tracking.

## Implemented Features

### 1. Order Components
**Location:** `/apps/customer-app/src/components/Order/`

#### OrderList.tsx
- List of all user orders
- Filter by status (all, active, completed, cancelled)
- Sort by date (newest first)
- Pagination
- **Status:** ✅ Implemented
- **Test:** `OrderList.test.tsx`

#### OrderCard.tsx
- Order summary card
- Order number, date, status
- Restaurant name and logo
- Item count and total
- Quick actions (track, reorder, cancel)
- **Status:** ✅ Implemented
- **Test:** `OrderCard.test.tsx`

#### OrderDetail.tsx
- Full order information
- All items with quantities
- Delivery address
- Payment method
- Status history
- Contact restaurant button
- **Status:** ✅ Implemented
- **Test:** `OrderDetail.test.tsx`

#### OrderTracking.tsx
- Real-time order status
- Progress stepper (6 stages)
- Estimated delivery time
- Delivery person info (name, phone, photo)
- Live location map (optional)
- Status updates timeline
- **Status:** ✅ Implemented
- **Test:** `OrderTracking.test.tsx`

### 2. Status Components
**Location:** `/apps/customer-app/src/components/Status/`

#### StatusTracker.tsx
- Visual progress indicator
- Current status highlight
- Completed/pending stages
- **Status:** ✅ Implemented
- **Test:** `StatusTracker.test.tsx`

#### ProgressStepper.tsx
- Step-by-step progress UI
- Checkmarks for completed steps
- Active step indicator
- **Status:** ✅ Implemented
- **Test:** `ProgressStepper.test.tsx`

### 3. Order State Management
**Location:** `/apps/customer-app/src/store/slices/orderSlice.ts`

#### Redux Features
```typescript
interface OrderState {
  orders: Order[];
  activeOrder: Order | null;
  loading: boolean;
  error: string | null;
}

// Async Actions
fetchOrders()                      // Get all orders
fetchOrderById(id: string)         // Get single order
placeOrder(orderData)              // Create new order

// Sync Actions
setActiveOrder(order: Order | null)
updateOrderStatus(id, status)      // Real-time status updates
```
- **Status:** ✅ Implemented

### 4. Order Service
**Location:** `/apps/customer-app/src/services/order.service.ts`

#### API Methods
```typescript
- getAll(): Promise<Order[]>
- getById(id: string): Promise<Order>
- place(data: CreateOrderRequest): Promise<Order>
- cancel(id: string): Promise<void>
- track(id: string): Promise<TrackingInfo>
- submitFeedback(orderId, feedback): Promise<void>
- reorder(orderId: string): Promise<Cart>
```
- **Status:** ✅ Implemented

### 5. Order Data Models
**Location:** `/apps/customer-app/src/types/models.ts`

```typescript
type OrderStatus =
  | 'PENDING'           // Order placed, awaiting confirmation
  | 'CONFIRMED'         // Restaurant confirmed
  | 'PREPARING'         // Food being prepared
  | 'READY'             // Ready for pickup/delivery
  | 'OUT_FOR_DELIVERY'  // Delivery in progress
  | 'DELIVERED'         // Successfully delivered
  | 'CANCELLED'         // Cancelled by user/restaurant
  | 'REFUNDED';         // Payment refunded

type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

type PaymentMethod =
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'UPI'
  | 'WALLET'
  | 'COD';

interface Order {
  id: string;
  orderNumber: string;               // e.g., "ORD-20260219-001"
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLogo?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: Address;
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  placedAt: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
  trackingInfo?: TrackingInfo;
  contactInfo?: {
    phone: string;
    alternatePhone?: string;
  };
}

interface TrackingInfo {
  currentStatus: OrderStatus;
  statusHistory: TrackingStatus[];
  estimatedDeliveryTime: string;
  deliveryPersonInfo?: DeliveryPersonInfo;
  liveLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
}

interface DeliveryPersonInfo {
  name: string;
  phone: string;
  photo?: string;
  vehicleInfo?: {
    type: string;
    number: string;
  };
}
```

## Order Flow

### 1. Order Placement
1. User clicks "Checkout" from cart
2. Select delivery address
3. Choose payment method
4. Review order summary
5. Confirm order → `placeOrder()` API call
6. Order created with status: `PENDING`
7. Redirect to order tracking page

### 2. Order Tracking
1. Order confirmed by restaurant → status: `CONFIRMED`
2. Restaurant starts preparing → status: `PREPARING`
3. Order ready → status: `READY`
4. Delivery person assigned → status: `OUT_FOR_DELIVERY`
5. Order delivered → status: `DELIVERED`
6. User can submit feedback/rating

### 3. Status Updates (Real-time)
- WebSocket connection for live updates
- Redux action dispatched on status change
- UI automatically updates
- Push notifications (if enabled)

## Order API Endpoints

```
POST /api/orders
  Body: {
    restaurantId, items[], deliveryAddress,
    paymentMethod, contactInfo
  }
  Response: Order

GET /api/orders
  Query: ?status=active&page=1&limit=10
  Response: Order[]

GET /api/orders/:id
  Response: Order

GET /api/orders/:id/tracking
  Response: TrackingInfo

PUT /api/orders/:id/cancel
  Response: Order

POST /api/orders/:id/feedback
  Body: { rating, comment }
```

## Order Status Transitions

```
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
    ↓
CANCELLED (from any status except DELIVERED)
    ↓
REFUNDED (after cancellation)
```

## File Locations

```
apps/customer-app/src/
├── components/Order/
│   ├── OrderList.tsx
│   ├── OrderCard.tsx
│   ├── OrderDetail.tsx
│   ├── OrderTracking.tsx
│   └── __tests__/ (4 test files)
├── components/Status/
│   ├── StatusTracker.tsx
│   ├── ProgressStepper.tsx
│   └── __tests__/ (2 test files)
├── store/slices/
│   └── orderSlice.ts
├── services/
│   └── order.service.ts
└── types/
    └── models.ts
```

## Test Coverage (6 tests)
- ✅ OrderList.test.tsx
- ✅ OrderCard.test.tsx
- ✅ OrderDetail.test.tsx
- ✅ OrderTracking.test.tsx
- ✅ StatusTracker.test.tsx
- ✅ ProgressStepper.test.tsx

## User Stories Covered

1. ✅ As a customer, I can place an order from my cart
2. ✅ As a customer, I can view all my past orders
3. ✅ As a customer, I can track my active order in real-time
4. ✅ As a customer, I can see estimated delivery time
5. ✅ As a customer, I can cancel an order before it's prepared
6. ✅ As a customer, I can see delivery person details
7. ✅ As a customer, I can reorder from past orders
8. ✅ As a customer, I can submit feedback after delivery

## Business Rules

### Order Cancellation
- Can cancel: PENDING, CONFIRMED (within 5 mins)
- Cannot cancel: PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED
- Refund processed within 5-7 business days

### Estimated Delivery Time
- Calculated as: PrepTime + (Distance / AvgSpeed) + 5min buffer
- Updated in real-time based on traffic
- Shows range (e.g., "30-40 mins")

### Payment Processing
- Payment attempted immediately on order placement
- Failed payment → Order not created
- Successful payment → Order status: PENDING
- Refund initiated on cancellation

## Related Requirements

- [CUSTOMER-REQ-003: Cart Management](./CUSTOMER-REQ-003-cart-management.md)
- [CUSTOMER-REQ-006: Account Linking](./CUSTOMER-REQ-006-account-linking.md)

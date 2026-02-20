# TASK-MCP-002: Implement Order Placement for External Providers

**Task ID:** TASK-MCP-002
**Created:** 2026-02-20
**Status:** Pending
**Priority:** P0 (Critical)
**Assignee:** Backend Team
**Estimated Effort:** 8 days
**Depends On:** TASK-MCP-001 (OAuth implementation must be complete)

---

## Description

Implement order placement functionality for Swiggy and Zomato providers, allowing users to place orders through FoodBot that are fulfilled by external platforms.

## Requirements

- [REQ-PROVIDER-002](../../requirements/mcp-layer/provider-integration-requirements.md#req-provider-002-swiggy-provider) - Swiggy order placement
- [REQ-PROVIDER-003](../../requirements/mcp-layer/provider-integration-requirements.md#req-provider-003-zomato-provider) - Zomato order placement

## Current Status

**Completed:**
- ✅ Internal provider order placement
- ✅ Order data models
- ✅ Payment integration (Stripe)

**Pending:**
- ❌ Swiggy order placement API integration
- ❌ Zomato order placement API integration
- ❌ Cross-provider order tracking
- ❌ Order status synchronization

## Implementation Tasks

### 1. Swiggy Order Placement

**File:** `services/mcp-adapter/src/providers/swiggy/SwiggyAPIProvider.ts`

**API Endpoint:** `POST /mapi/order/place`

**Implementation:**
```typescript
async placeOrder(order: OrderRequest): Promise<OrderResponse> {
  // 1. Get user OAuth token
  const userContext = await this.swiggyAuth.getUserContext(order.userId, order.location);

  // 2. Prepare Swiggy order payload
  const swiggyOrder = this.mapToSwiggyOrder(order);

  // 3. Place order via Swiggy API
  const response = await this.swiggyClient.placeOrder(userContext, swiggyOrder);

  // 4. Map response to internal format
  return this.mapSwiggyOrderResponse(response);
}
```

**Required Swiggy Order Payload:**
```typescript
interface SwiggyOrderPayload {
  restaurant_id: string;
  items: Array<{
    item_id: string;
    quantity: number;
    customizations?: Array<{
      group_id: string;
      option_id: string;
    }>;
  }>;
  delivery_address: {
    latitude: number;
    longitude: number;
    address_line1: string;
    address_line2?: string;
    city: string;
    pincode: string;
  };
  payment_method: 'COD' | 'ONLINE';
  special_instructions?: string;
}
```

**Tasks:**
- [ ] Implement `placeOrder()` method
- [ ] Map FoodBot order to Swiggy format
- [ ] Handle payment method mapping
- [ ] Implement order confirmation handling
- [ ] Add error handling (payment failures, stock issues, etc.)
- [ ] Add unit tests

### 2. Zomato Order Placement

**File:** `services/mcp-adapter/src/providers/zomato/ZomatoAPIProvider.ts`

**API Endpoint:** `POST /api/v2.1/order`

**Implementation:**
```typescript
async placeOrder(order: OrderRequest): Promise<OrderResponse> {
  // 1. Get user OAuth token
  const userContext = await this.zomatoAuth.getUserContext(order.userId, order.location);

  // 2. Prepare Zomato order payload
  const zomatoOrder = this.mapToZomatoOrder(order);

  // 3. Place order via Zomato API
  const response = await this.zomatoClient.placeOrder(userContext, zomatoOrder);

  // 4. Map response to internal format
  return this.mapZomatoOrderResponse(response);
}
```

**Required Zomato Order Payload:**
```typescript
interface ZomatoOrderPayload {
  res_id: string;
  dishes: Array<{
    dish_id: string;
    quantity: number;
    variants?: Array<{
      variant_id: string;
      option_id: string;
    }>;
  }>;
  delivery_address: {
    lat: number;
    lon: number;
    address: string;
    locality: string;
    city: string;
    zipcode: string;
  };
  payment_mode: 'cash' | 'card' | 'upi';
  instructions?: string;
}
```

**Tasks:**
- [ ] Implement `placeOrder()` method
- [ ] Map FoodBot order to Zomato format
- [ ] Handle payment method mapping
- [ ] Implement order confirmation handling
- [ ] Add error handling
- [ ] Add unit tests

### 3. Order Status Synchronization

**File:** `services/mcp-adapter/src/providers/order-sync/OrderSyncService.ts`

**Purpose:** Keep order status in sync between FoodBot and external providers.

**Implementation:**
```typescript
export class OrderSyncService {
  async syncOrderStatus(orderId: string): Promise<OrderStatus> {
    // 1. Get order details from database
    const order = await this.orderRepository.findById(orderId);

    // 2. Fetch status from provider
    const providerStatus = await this.getProviderStatus(order);

    // 3. Update FoodBot database if changed
    if (providerStatus !== order.status) {
      await this.orderRepository.updateStatus(orderId, providerStatus);

      // 4. Notify user of status change
      await this.notificationService.sendStatusUpdate(order.userId, orderId, providerStatus);
    }

    return providerStatus;
  }

  private async getProviderStatus(order: Order): Promise<OrderStatus> {
    const provider = this.getProvider(order.provider);
    return provider.getOrderStatus(order.externalOrderId);
  }
}
```

**Status Mapping:**
| FoodBot Status | Swiggy Status | Zomato Status |
|----------------|---------------|---------------|
| pending | PLACED | placed |
| confirmed | CONFIRMED | accepted |
| preparing | PREPARING | food_ready |
| out_for_delivery | OUT_FOR_DELIVERY | out_for_delivery |
| delivered | DELIVERED | delivered |
| cancelled | CANCELLED | cancelled |

**Tasks:**
- [ ] Implement status synchronization
- [ ] Map provider statuses to FoodBot statuses
- [ ] Implement webhook handlers for provider status updates
- [ ] Add scheduled sync job (every 30 seconds for active orders)
- [ ] Add unit tests

### 4. Payment Integration

**Location:** `services/gateway-api/src/payments/`

**Challenge:** External providers have their own payment flows.

**Solution Approaches:**

**Option A: Proxy Payment (Recommended)**
- User pays FoodBot
- FoodBot places order with provider (COD or pre-paid account)
- FoodBot handles refunds/cancellations

**Option B: Direct Payment**
- Redirect user to provider's payment page
- Provider handles payment
- FoodBot receives confirmation webhook

**Tasks:**
- [ ] Decide on payment approach
- [ ] Implement payment proxy if needed
- [ ] Handle payment failures
- [ ] Implement refund flow
- [ ] Add payment reconciliation

### 5. Error Handling

**Common Errors:**
- Restaurant closed
- Item out of stock
- Invalid delivery address
- Payment failure
- Provider API timeout

**Error Response Format:**
```typescript
interface OrderError {
  code: OrderErrorCode;
  message: string;
  provider: ProviderName;
  retryable: boolean;
  details?: any;
}

enum OrderErrorCode {
  RESTAURANT_CLOSED = 'RESTAURANT_CLOSED',
  ITEM_OUT_OF_STOCK = 'ITEM_OUT_OF_STOCK',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
}
```

**Tasks:**
- [ ] Implement error mapping for each provider
- [ ] Add user-friendly error messages
- [ ] Implement retry logic for transient errors
- [ ] Log all order placement errors

### 6. Testing

**Unit Tests:**
- [ ] Swiggy order placement
- [ ] Zomato order placement
- [ ] Order status sync
- [ ] Payment flow
- [ ] Error scenarios

**Integration Tests:**
- [ ] End-to-end order placement (mock providers)
- [ ] Status synchronization
- [ ] Payment integration
- [ ] Cancellation flow

**Manual Tests:**
- [ ] Real order with Swiggy (sandbox/test account)
- [ ] Real order with Zomato (sandbox/test account)
- [ ] Order tracking
- [ ] Cancellation

## Configuration

**Environment Variables:**

```bash
# Swiggy
SWIGGY_ORDER_ENDPOINT=https://www.swiggy.com/mapi/order/place
SWIGGY_STATUS_ENDPOINT=https://www.swiggy.com/mapi/order/status

# Zomato
ZOMATO_ORDER_ENDPOINT=https://api.zomato.com/api/v2.1/order
ZOMATO_STATUS_ENDPOINT=https://api.zomato.com/api/v2.1/order/status

# Order Sync
ORDER_SYNC_INTERVAL=30000  # 30 seconds
ORDER_SYNC_ENABLED=true
```

## Dependencies

- OAuth implementation (TASK-MCP-001) must be complete
- Payment gateway integration (Stripe)
- Notification service (for status updates)
- Webhook infrastructure (for provider callbacks)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Provider order API changes | High | Version API calls; monitor provider docs |
| Payment failures | Critical | Implement comprehensive error handling and retries |
| Order status sync delays | Medium | Implement webhooks + polling; show estimated times |
| Provider downtime | High | Fallback to internal restaurants; show provider status |

## Success Criteria

- ✅ Users can place orders via Swiggy
- ✅ Users can place orders via Zomato
- ✅ Order status syncs in real-time
- ✅ Payment integration works end-to-end
- ✅ Errors are handled gracefully
- ✅ 85% test coverage for order flows

## Timeline

- **Day 1-3:** Swiggy order placement implementation
- **Day 4-6:** Zomato order placement implementation
- **Day 7:** Order status synchronization
- **Day 8:** Testing and bug fixes

## Related Tasks

- [TASK-MCP-001](../in-progress/TASK-MCP-001-complete-oauth-implementation.md) - OAuth implementation (prerequisite)
- [TASK-MCP-003](./TASK-MCP-003-implement-order-tracking.md) - Order tracking UI

## References

- [Provider Integration Requirements](../../requirements/mcp-layer/provider-integration-requirements.md)
- [MCP Architecture](../../architecture/integration/mcp-architecture.md)
- [Swiggy Order API Documentation](#) (to be added)
- [Zomato Order API Documentation](#) (to be added)

---

**Last Updated:** 2026-02-20
**Next Review:** 2026-02-27

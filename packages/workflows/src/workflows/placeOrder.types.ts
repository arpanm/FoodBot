/**
 * Place Order Workflow - Type Definitions
 *
 * Type definitions for the place order workflow including:
 * - Cart items
 * - Payment details and results
 * - Order model
 * - Workflow input/output
 * - Routing and pricing results
 * - Activity interface
 *
 * Extracted from placeOrder.workflow.ts for file-length compliance.
 *
 * Implements FR-CA-ORDER-001, FR-WORKFLOW-EXEC-001-EXP.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface CartItem {
  dishId: string;
  quantity: number;
  price: number;
  customizations?: Record<string, unknown>;
}

export interface PaymentDetails {
  method: 'card' | 'upi' | 'cash' | 'wallet';
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  paymentId: string;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  errorMessage?: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaceOrderInput {
  userId: string;
  restaurantId: string;
  items: CartItem[];
  paymentDetails: PaymentDetails;
  deliveryAddress: string;
  scheduledTime?: string;
  provider?: string;
}

export interface PlaceOrderResult {
  orderId: string;
  status: string;
  paymentId?: string;
  provider?: string;
  scheduledTime?: string;
}

export interface RoutingResult {
  provider: string;
  fallbackUsed: boolean;
  subOrderId: string;
}

export interface PricingResult {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

// ============================================================================
// Activity Interface
// ============================================================================

export interface Activities {
  validateCart(items: CartItem[]): Promise<boolean>;
  checkInventory(items: CartItem[]): Promise<boolean>;
  reserveItems(restaurantId: string, items: CartItem[]): Promise<boolean>;
  releaseItems(restaurantId: string): Promise<void>;
  processPayment(orderId: string, paymentDetails: PaymentDetails): Promise<PaymentResult>;
  refundPayment(paymentId: string): Promise<PaymentResult>;
  createOrder(orderData: Record<string, unknown>): Promise<Order>;
  updateOrderStatus(orderId: string, status: Order['status']): Promise<Order>;
  notifyRestaurant(orderId: string): Promise<void>;
  notifyCustomer(userId: string, message: string): Promise<void>;
  validateOrderActivity(
    restaurantId: string,
    items: CartItem[]
  ): Promise<{ valid: boolean; unavailableItems: string[] }>;
  calculatePricingActivity(
    items: CartItem[],
    deliveryAddress: string
  ): Promise<PricingResult>;
  routeToProviderActivity(
    restaurantId: string,
    items: CartItem[]
  ): Promise<RoutingResult>;
  monitorFulfillmentActivity(
    orderId: string,
    provider: string
  ): Promise<{ status: string; estimatedDeliveryTime: string }>;
  processRefundActivity(
    paymentId: string,
    amount: number,
    reason: string
  ): Promise<{ refundId: string; status: string }>;
}

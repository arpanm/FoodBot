/**
 * Place Order Workflow
 *
 * Implements FR-CA-ORDER-001, FR-WORKFLOW-EXEC-001-EXP: Order placement with saga pattern
 *
 * Features:
 * - Cart validation
 * - Inventory check and reservation
 * - Payment processing
 * - Order creation
 * - Notifications to restaurant and customer
 * - Saga pattern for compensation on failure
 *
 * Compensation logic (executed in reverse order):
 * - Refund payment if order creation fails
 * - Release inventory if payment fails
 * - Notify customer of failure
 */

import { proxyActivities, log } from '@temporalio/workflow';

// Type definitions
interface CartItem {
  dishId: string;
  quantity: number;
  price: number;
  customizations?: Record<string, any>;
}

interface PaymentDetails {
  method: 'card' | 'upi' | 'cash' | 'wallet';
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

interface PaymentResult {
  paymentId: string;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  errorMessage?: string;
}

interface Order {
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

interface PlaceOrderInput {
  userId: string;
  restaurantId: string;
  items: CartItem[];
  paymentDetails: PaymentDetails;
  deliveryAddress: string;
}

interface PlaceOrderResult {
  orderId: string;
  status: string;
  paymentId?: string;
}

// Activity interface
interface Activities {
  validateCart(items: CartItem[]): Promise<boolean>;
  checkInventory(items: CartItem[]): Promise<boolean>;
  reserveItems(restaurantId: string, items: CartItem[]): Promise<boolean>;
  releaseItems(restaurantId: string): Promise<void>;
  processPayment(orderId: string, paymentDetails: PaymentDetails): Promise<PaymentResult>;
  refundPayment(paymentId: string): Promise<PaymentResult>;
  createOrder(orderData: any): Promise<Order>;
  updateOrderStatus(orderId: string, status: Order['status']): Promise<Order>;
  notifyRestaurant(orderId: string): Promise<void>;
  notifyCustomer(userId: string, message: string): Promise<void>;
}

// Configure activity proxy
const {
  validateCart,
  checkInventory,
  reserveItems,
  releaseItems,
  processPayment,
  refundPayment,
  createOrder,
  updateOrderStatus,
  notifyRestaurant,
  notifyCustomer,
} = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

/**
 * Place Order Workflow with Saga Pattern
 *
 * Implements distributed transaction with compensation logic
 */
export async function placeOrderWorkflow(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  log.info('Starting place order workflow', { input });

  // Track compensation actions
  const compensations: Array<() => Promise<void>> = [];
  let paymentResult: PaymentResult | null = null;
  let order: Order | null = null;

  try {
    // Step 1: Validate cart
    log.info('Validating cart', { itemCount: input.items.length });
    await validateCart(input.items);
    log.info('Cart validated successfully');

    // Step 2: Check inventory
    log.info('Checking inventory availability');
    const inventoryAvailable = await checkInventory(input.items);

    if (!inventoryAvailable) {
      log.error('Inventory not available');
      throw new Error('Items not available');
    }
    log.info('Inventory check passed');

    // Step 3: Reserve items (add compensation)
    log.info('Reserving items', { restaurantId: input.restaurantId });
    await reserveItems(input.restaurantId, input.items);
    log.info('Items reserved successfully');

    // Add compensation: release items
    compensations.push(async () => {
      log.info('Compensation: Releasing reserved items');
      await releaseItems(input.restaurantId);
    });

    // Step 4: Process payment (add compensation)
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    log.info('Processing payment', { orderId });

    paymentResult = await processPayment(orderId, input.paymentDetails);

    if (paymentResult.status === 'failed') {
      log.error('Payment failed', { reason: paymentResult.errorMessage });
      throw new Error(`Payment failed: ${paymentResult.errorMessage}`);
    }

    log.info('Payment processed successfully', { paymentId: paymentResult.paymentId });

    // Add compensation: refund payment
    compensations.push(async () => {
      if (paymentResult && paymentResult.paymentId) {
        log.info('Compensation: Refunding payment', { paymentId: paymentResult.paymentId });
        await refundPayment(paymentResult.paymentId);
      }
    });

    // Step 5: Create order
    log.info('Creating order', { orderId });
    const orderData = {
      id: orderId,
      userId: input.userId,
      restaurantId: input.restaurantId,
      items: input.items,
      total: input.paymentDetails.amount,
      status: 'pending' as const,
      paymentId: paymentResult.paymentId,
      deliveryAddress: input.deliveryAddress,
    };

    order = await createOrder(orderData);
    log.info('Order created successfully', { orderId: order.id });

    // Step 6: Update order status to confirmed
    log.info('Updating order status to confirmed');
    order = await updateOrderStatus(order.id, 'confirmed');
    log.info('Order confirmed', { orderId: order.id });

    // Step 7: Send notifications (non-critical, handle errors gracefully)
    log.info('Sending notifications');

    try {
      await notifyRestaurant(order.id);
      log.info('Restaurant notified');
    } catch (error) {
      log.error('Failed to notify restaurant', { error });
      // Continue despite notification failure
    }

    try {
      await notifyCustomer(input.userId, 'ORDER_PLACED');
      log.info('Customer notified');
    } catch (error) {
      log.error('Failed to notify customer', { error });
      // Continue despite notification failure
    }

    log.info('Place order workflow completed successfully', {
      orderId: order.id,
      status: order.status,
    });

    return {
      orderId: order.id,
      status: order.status,
      paymentId: paymentResult.paymentId,
    };
  } catch (error) {
    log.error('Place order workflow failed', { error });

    // Execute compensations in reverse order (Saga pattern)
    log.info('Executing compensations', { count: compensations.length });
    for (let i = compensations.length - 1; i >= 0; i--) {
      try {
        await compensations[i]();
      } catch (compensationError) {
        log.error('Compensation failed', { compensationError, step: i });
        // Continue with other compensations even if one fails
      }
    }

    // Notify customer of failure
    try {
      await notifyCustomer(input.userId, 'ORDER_FAILED');
    } catch (notifyError) {
      log.error('Failed to notify customer of failure', { notifyError });
    }

    throw error;
  }
}

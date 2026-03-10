/**
 * Place Order Workflow
 *
 * Implements FR-CA-ORDER-001, FR-WORKFLOW-EXEC-001-EXP: Order placement with saga pattern.
 * Supports cart validation, inventory reservation, multi-provider routing,
 * payment processing, order creation, notifications, scheduled orders,
 * status signals, and fulfillment monitoring.
 *
 * Type definitions: see placeOrder.types.ts
 */

import {
  proxyActivities, defineSignal, defineQuery, setHandler,
  sleep, log, ApplicationFailure,
} from '@temporalio/workflow';

import type {
  Activities, PaymentResult, Order,
  PlaceOrderInput, PlaceOrderResult, RoutingResult,
} from './placeOrder.types';

// ============================================================================
// Activity Proxy Configuration
// ============================================================================

const {
  validateCart, checkInventory, reserveItems, releaseItems,
  processPayment, refundPayment, createOrder, updateOrderStatus,
  notifyRestaurant, notifyCustomer, validateOrderActivity,
  calculatePricingActivity, routeToProviderActivity,
  monitorFulfillmentActivity, processRefundActivity,
} = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

// ============================================================================
// Signal & Query Definitions
// ============================================================================

export const cancelOrderSignal = defineSignal('cancelOrder');
export const updateStatusSignal = defineSignal<[string]>('updateStatus');
export const getOrderStatusQuery = defineQuery<string>('getOrderStatus');

// ============================================================================
// Place Order Workflow with Saga Pattern
// ============================================================================

export async function placeOrderWorkflow(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  log.info('Starting place order workflow', { input });

  // Handle scheduled orders: wait until scheduled time
  if (input.scheduledTime) {
    const scheduledDate = new Date(input.scheduledTime);
    const delayMs = scheduledDate.getTime() - Date.now();
    if (delayMs > 0) {
      log.info('Scheduled order: waiting until trigger time', { scheduledTime: input.scheduledTime, delayMs });
      await sleep(delayMs);
      log.info('Scheduled order trigger time reached, proceeding');
    }
  }

  // Track compensation actions and workflow state
  const compensations: Array<() => Promise<void>> = [];
  let paymentResult: PaymentResult | null = null;
  let order: Order | null = null;
  let currentStatus = 'pending';
  let isCancelled = false;
  let routingResult: RoutingResult | null = null;

  // Register signal handlers
  setHandler(cancelOrderSignal, () => { log.info('Cancel signal received'); isCancelled = true; });
  setHandler(updateStatusSignal, (newStatus: string) => { log.info('Status update signal received', { newStatus }); currentStatus = newStatus; });
  setHandler(getOrderStatusQuery, () => currentStatus);

  try {
    if (isCancelled) {
      log.info('Order cancelled before processing');
      return { orderId: '', status: 'cancelled' };
    }

    // Step 1: Validate cart
    log.info('Validating cart', { itemCount: input.items.length });
    await validateCart(input.items);

    // Step 2: Enhanced order validation
    log.info('Validating order with provider');
    const validationResult = await validateOrderActivity(input.restaurantId, input.items);
    if (!validationResult.valid) {
      throw ApplicationFailure.nonRetryable(
        `Items not available: ${validationResult.unavailableItems.join(', ')}`, 'ITEMS_UNAVAILABLE'
      );
    }

    // Step 3: Calculate pricing
    log.info('Calculating pricing');
    const pricing = await calculatePricingActivity(input.items, input.deliveryAddress);
    log.info('Pricing calculated', { total: pricing.total });

    // Step 4: Check inventory
    log.info('Checking inventory availability');
    const inventoryAvailable = await checkInventory(input.items);
    if (!inventoryAvailable) {
      throw ApplicationFailure.nonRetryable('Items not available', 'INVENTORY_UNAVAILABLE');
    }

    // Step 5: Reserve items (add compensation)
    log.info('Reserving items', { restaurantId: input.restaurantId });
    await reserveItems(input.restaurantId, input.items);
    compensations.push(async () => {
      log.info('Compensation: Releasing reserved items');
      await releaseItems(input.restaurantId);
    });

    if (isCancelled) {
      throw ApplicationFailure.nonRetryable('Order cancelled by user', 'ORDER_CANCELLED');
    }

    // Step 6: Route to provider
    log.info('Routing order to provider');
    routingResult = await routeToProviderActivity(input.restaurantId, input.items);
    log.info('Order routed', { provider: routingResult.provider, fallbackUsed: routingResult.fallbackUsed });

    // Step 7: Process payment (add compensation)
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    log.info('Processing payment', { orderId });
    paymentResult = await processPayment(orderId, { ...input.paymentDetails, amount: pricing.total });

    if (paymentResult.status === 'failed') {
      throw ApplicationFailure.nonRetryable(
        `Payment failed: ${paymentResult.errorMessage}`, 'PAYMENT_FAILED'
      );
    }
    log.info('Payment processed successfully', { paymentId: paymentResult.paymentId });

    compensations.push(async () => {
      if (paymentResult && paymentResult.paymentId) {
        log.info('Compensation: Refunding payment', { paymentId: paymentResult.paymentId });
        await refundPayment(paymentResult.paymentId);
      }
    });

    // Step 8: Create order
    log.info('Creating order', { orderId });
    order = await createOrder({
      id: orderId, userId: input.userId, restaurantId: input.restaurantId,
      items: input.items, total: pricing.total, subtotal: pricing.subtotal,
      tax: pricing.tax, deliveryFee: pricing.deliveryFee, discount: pricing.discount,
      status: 'pending' as const, paymentId: paymentResult.paymentId,
      deliveryAddress: input.deliveryAddress, provider: routingResult.provider,
    });
    log.info('Order created successfully', { orderId: order.id });

    compensations.push(async () => {
      if (order) {
        log.info('Compensation: Cancelling order with provider');
        await updateOrderStatus(order.id, 'cancelled');
      }
    });

    // Step 9: Confirm order
    order = await updateOrderStatus(order.id, 'confirmed');
    currentStatus = 'confirmed';
    log.info('Order confirmed', { orderId: order.id });

    // Step 10: Send notifications (non-critical)
    try { await notifyRestaurant(order.id); } catch (error) { log.error('Failed to notify restaurant', { error }); }
    try { await notifyCustomer(input.userId, 'ORDER_PLACED'); } catch (error) { log.error('Failed to notify customer', { error }); }

    // Step 11: Start fulfillment monitoring (non-fatal)
    try {
      const fulfillmentStatus = await monitorFulfillmentActivity(order.id, routingResult.provider);
      log.info('Fulfillment status update', { status: fulfillmentStatus.status });
    } catch (error) {
      log.error('Fulfillment monitoring failed', { error });
    }

    log.info('Place order workflow completed successfully', {
      orderId: order.id, status: order.status, provider: routingResult.provider,
    });

    return {
      orderId: order.id, status: order.status, paymentId: paymentResult.paymentId,
      provider: routingResult.provider, scheduledTime: input.scheduledTime,
    };
  } catch (error) {
    log.error('Place order workflow failed', { error });

    // Execute compensations in reverse order (Saga pattern)
    for (let i = compensations.length - 1; i >= 0; i--) {
      try { await compensations[i](); } catch (compensationError) { log.error('Compensation failed', { compensationError, step: i }); }
    }

    try { await notifyCustomer(input.userId, 'ORDER_FAILED'); } catch (notifyError) { log.error('Failed to notify customer of failure', { notifyError }); }

    throw error;
  }
}

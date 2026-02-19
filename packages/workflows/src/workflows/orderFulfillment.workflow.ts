/**
 * Order Fulfillment Workflow
 *
 * Manages the complete order lifecycle from preparation through delivery.
 * Triggered after a successful order placement.
 *
 * Steps:
 * 1. Prepare order (update status, notify restaurant)
 * 2. Wait for restaurant to mark order as ready
 * 3. Assign delivery partner
 * 4. Track delivery in progress
 * 5. Complete order and send delivery confirmation
 *
 * Signals:
 * - orderReady: Restaurant marks order as ready for pickup
 * - orderPickedUp: Delivery partner picks up the order
 * - orderDelivered: Delivery partner confirms delivery
 *
 * Retry Policy:
 * - Initial interval: 2s
 * - Backoff coefficient: 2
 * - Maximum interval: 60s
 * - Maximum attempts: 5
 */

import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  log,
  sleep,
} from '@temporalio/workflow';

// Type definitions
interface OrderFulfillmentInput {
  orderId: string;
  restaurantId: string;
  userId: string;
  deliveryAddress: string;
}

interface OrderFulfillmentResult {
  orderId: string;
  status: string;
  deliveryPartnerId?: string;
  deliveredAt?: string;
}

// Activity interface
interface Activities {
  updateOrderStatus(orderId: string, status: string): Promise<Record<string, unknown>>;
  notifyRestaurant(orderId: string): Promise<void>;
  notifyCustomer(userId: string, message: string): Promise<void>;
  assignDeliveryPartner(orderId: string): Promise<Record<string, unknown>>;
  trackDelivery(orderId: string, partnerId: string): Promise<Record<string, unknown>>;
  callDeliveryService(orderId: string): Promise<Record<string, unknown>>;
  updateDatabase(collection: string, id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
}

// Configure activity proxy
const {
  updateOrderStatus,
  notifyRestaurant,
  notifyCustomer,
  assignDeliveryPartner,
  trackDelivery,
  callDeliveryService,
  updateDatabase,
} = proxyActivities<Activities>({
  startToCloseTimeout: '60s',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 5,
  },
});

// Signal definitions
export const orderReadySignal = defineSignal('orderReady');
export const orderPickedUpSignal = defineSignal('orderPickedUp');
export const orderDeliveredSignal = defineSignal('orderDelivered');

/**
 * Order Fulfillment Workflow
 *
 * Orchestrates the order from preparation through delivery completion.
 */
export async function orderFulfillmentWorkflow(
  input: OrderFulfillmentInput
): Promise<OrderFulfillmentResult> {
  const { orderId, restaurantId, userId, deliveryAddress } = input;
  log.info('Starting order fulfillment workflow', { orderId, restaurantId });

  let isOrderReady = false;
  let isOrderPickedUp = false;
  let isOrderDelivered = false;

  // Register signal handlers
  setHandler(orderReadySignal, () => {
    log.info('Signal received: order ready', { orderId });
    isOrderReady = true;
  });

  setHandler(orderPickedUpSignal, () => {
    log.info('Signal received: order picked up', { orderId });
    isOrderPickedUp = true;
  });

  setHandler(orderDeliveredSignal, () => {
    log.info('Signal received: order delivered', { orderId });
    isOrderDelivered = true;
  });

  try {
    // Step 1: Mark order as preparing
    log.info('Step 1: Updating order status to preparing', { orderId });
    await updateOrderStatus(orderId, 'preparing');

    // Notify restaurant about the new order
    try {
      await notifyRestaurant(orderId);
      log.info('Restaurant notified', { orderId });
    } catch (error) {
      log.error('Failed to notify restaurant', { error });
      // Continue despite notification failure
    }

    // Notify customer that order is being prepared
    try {
      await notifyCustomer(userId, 'ORDER_PREPARING');
    } catch (error) {
      log.error('Failed to notify customer', { error });
    }

    // Step 2: Wait for restaurant to mark order as ready (max 45 minutes)
    log.info('Step 2: Waiting for order to be ready', { orderId });
    const orderReadyTimeout = await condition(() => isOrderReady, '45m');

    if (!orderReadyTimeout) {
      log.warn('Order preparation timed out', { orderId });
      // Auto-escalate: notify admin and mark as delayed
      await updateOrderStatus(orderId, 'preparing');
      try {
        await notifyCustomer(userId, 'Your order is taking longer than expected. We are looking into it.');
      } catch (error) {
        log.error('Failed to notify customer about delay', { error });
      }

      // Wait an additional 15 minutes
      const extendedWait = await condition(() => isOrderReady, '15m');
      if (!extendedWait) {
        log.error('Order preparation exceeded maximum wait time', { orderId });
        await updateOrderStatus(orderId, 'cancelled');
        try {
          await notifyCustomer(userId, 'ORDER_FAILED');
        } catch (error) {
          log.error('Failed to notify customer about cancellation', { error });
        }
        return { orderId, status: 'cancelled' };
      }
    }

    // Step 3: Order is ready - update status and assign delivery partner
    log.info('Step 3: Order ready, assigning delivery partner', { orderId });
    await updateOrderStatus(orderId, 'ready');

    try {
      await notifyCustomer(userId, 'ORDER_READY');
    } catch (error) {
      log.error('Failed to notify customer about ready status', { error });
    }

    // Assign a delivery partner
    const assignment = await assignDeliveryPartner(orderId);
    const deliveryPartnerId = assignment.partnerId as string;
    log.info('Delivery partner assigned', { orderId, deliveryPartnerId });

    // Schedule delivery pickup
    await callDeliveryService(orderId);

    // Update order with delivery partner info
    await updateDatabase('orders', orderId, {
      deliveryPartnerId,
      status: 'ready',
      updatedAt: new Date(),
    });

    // Step 4: Wait for pickup (max 30 minutes)
    log.info('Step 4: Waiting for order pickup', { orderId });
    const pickupWait = await condition(() => isOrderPickedUp, '30m');

    if (!pickupWait) {
      log.warn('Pickup timed out, re-assigning delivery partner', { orderId });
      // Re-assign delivery partner on timeout
      const reassignment = await assignDeliveryPartner(orderId);
      const newPartnerId = reassignment.partnerId as string;
      log.info('New delivery partner assigned', { orderId, partnerId: newPartnerId });

      // Wait for the new partner to pick up
      await condition(() => isOrderPickedUp, '20m');
    }

    // Step 5: Order picked up - track delivery
    log.info('Step 5: Order picked up, tracking delivery', { orderId });
    await updateOrderStatus(orderId, 'out_for_delivery');

    try {
      await notifyCustomer(userId, 'ORDER_OUT_FOR_DELIVERY');
    } catch (error) {
      log.error('Failed to notify customer about delivery', { error });
    }

    // Track delivery with periodic status checks
    let deliveryCheckCount = 0;
    const MAX_DELIVERY_CHECKS = 60; // 60 checks * 1 minute = 1 hour max

    while (!isOrderDelivered && deliveryCheckCount < MAX_DELIVERY_CHECKS) {
      await sleep('1m');
      deliveryCheckCount++;

      try {
        const deliveryStatus = await trackDelivery(orderId, deliveryPartnerId);
        log.info('Delivery status update', { orderId, status: deliveryStatus.status });

        if (deliveryStatus.status === 'delivered') {
          isOrderDelivered = true;
        }
      } catch (error) {
        log.error('Failed to check delivery status', { error });
        // Continue tracking despite individual check failures
      }
    }

    // Step 6: Order delivered - complete fulfillment
    log.info('Step 6: Order delivered, completing fulfillment', { orderId });
    await updateOrderStatus(orderId, 'delivered');

    try {
      await notifyCustomer(userId, 'ORDER_DELIVERED');
    } catch (error) {
      log.error('Failed to notify customer about delivery', { error });
    }

    log.info('Order fulfillment workflow completed', { orderId });

    return {
      orderId,
      status: 'delivered',
      deliveryPartnerId,
      deliveredAt: new Date().toISOString(),
    };
  } catch (error) {
    log.error('Order fulfillment workflow failed', { error, orderId });

    // Attempt to notify customer about failure
    try {
      await notifyCustomer(userId, 'ORDER_FAILED');
    } catch (notifyError) {
      log.error('Failed to notify customer of fulfillment failure', { notifyError });
    }

    throw error;
  }
}

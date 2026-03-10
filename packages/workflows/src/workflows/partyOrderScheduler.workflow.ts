/**
 * Party Order Scheduler Workflow
 *
 * Manages the lifecycle of a party order from confirmation to delivery.
 *
 * Steps:
 * 1. Validate restaurant availability at T-24h
 * 2. Re-validate at T-2h
 * 3. Place orders at scheduled time for each restaurant
 * 4. Track order status across all restaurants
 * 5. Notify user of progress
 *
 * Saga Compensation:
 * If any step fails after partial ordering, cancel all placed orders
 * and notify restaurants/user of the failure.
 */

import {
  proxyActivities,
  defineSignal,
  setHandler,
  sleep,
  log,
} from '@temporalio/workflow';

import type {
  PartyOrderInput,
  PartyOrderResult,
  RestaurantOrder,
  PlacedOrder,
  PartyActivities,
} from './partyOrderScheduler.types';

export type {
  PartyOrderInput,
  PartyOrderResult,
  RestaurantOrder,
  PartyOrderItem,
} from './partyOrderScheduler.types';

const {
  validateRestaurantAvailability,
  placePartyOrder,
  notifyPartyStatus,
  cancelPartyOrder,
} = proxyActivities<PartyActivities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

export const cancelPartySignal = defineSignal('cancelParty');

export async function partyOrderSchedulerWorkflow(
  input: PartyOrderInput
): Promise<PartyOrderResult> {
  const { partyPlanId, userId, restaurantOrders } = input;
  let isCancelled = false;

  setHandler(cancelPartySignal, () => {
    log.info('Cancel signal received for party', { partyPlanId });
    isCancelled = true;
  });

  log.info('Starting party order scheduler', { partyPlanId });

  const timeUntilEvent = calculateTimeUntilEvent(input);

  const cancelled = await waitForValidationPhase(
    timeUntilEvent, () => isCancelled, partyPlanId, userId, restaurantOrders
  );
  if (cancelled) return buildCancelledResult(partyPlanId);

  const revalidationCancelled = await waitForRevalidationPhase(
    timeUntilEvent, () => isCancelled, partyPlanId, restaurantOrders
  );
  if (revalidationCancelled) return buildCancelledResult(partyPlanId);

  const orderResult = await placeOrdersPhase(
    partyPlanId, userId, restaurantOrders
  );

  return orderResult;
}

async function waitForValidationPhase(
  timeUntilEvent: number,
  isCancelled: () => boolean,
  partyPlanId: string,
  userId: string,
  restaurantOrders: RestaurantOrder[],
): Promise<boolean> {
  const sleepUntilValidation = Math.max(
    timeUntilEvent - 24 * 60 * 60 * 1000, 0
  );

  if (sleepUntilValidation > 0) {
    await sleep(sleepUntilValidation);
  }

  if (isCancelled()) return true;

  log.info('Running T-24h availability validation', { partyPlanId });
  const validationResults = await validateAllRestaurants(restaurantOrders);
  await notifyValidationResults(userId, partyPlanId, validationResults);

  return false;
}

async function waitForRevalidationPhase(
  timeUntilEvent: number,
  isCancelled: () => boolean,
  partyPlanId: string,
  restaurantOrders: RestaurantOrder[],
): Promise<boolean> {
  const sleepUntilRevalidation = Math.max(
    timeUntilEvent - 2 * 60 * 60 * 1000, 0
  );

  if (sleepUntilRevalidation > 0) {
    await sleep(sleepUntilRevalidation);
  }

  if (isCancelled()) return true;

  log.info('Running T-2h re-validation', { partyPlanId });
  await validateAllRestaurants(restaurantOrders);

  return false;
}

async function placeOrdersPhase(
  partyPlanId: string,
  userId: string,
  restaurantOrders: RestaurantOrder[],
): Promise<PartyOrderResult> {
  log.info('Placing orders for all restaurants', { partyPlanId });
  const orderResult = await placeAllOrders(
    restaurantOrders, userId, partyPlanId
  );

  await notifyOrderPlacement(userId, partyPlanId, orderResult);

  log.info('Party order scheduler completed', {
    partyPlanId,
    placedCount: orderResult.placedOrders.length,
    failedCount: orderResult.failedOrders.length,
  });

  return orderResult;
}

function calculateTimeUntilEvent(input: PartyOrderInput): number {
  const eventDateTime = new Date(
    `${input.eventDate}T${input.eventTime}`
  );
  return eventDateTime.getTime() - Date.now();
}

function buildCancelledResult(partyPlanId: string): PartyOrderResult {
  return {
    partyPlanId,
    status: 'cancelled',
    placedOrders: [],
    failedOrders: [],
  };
}

async function validateAllRestaurants(
  restaurantOrders: RestaurantOrder[]
): Promise<Array<{ restaurantId: string; available: boolean }>> {
  const results: Array<{ restaurantId: string; available: boolean }> = [];

  for (const order of restaurantOrders) {
    try {
      const result = await validateRestaurantAvailability(
        order.restaurantId, order.items
      );
      results.push({
        restaurantId: order.restaurantId,
        available: result.available,
      });
    } catch (error) {
      log.error('Validation failed for restaurant', {
        restaurantId: order.restaurantId, error,
      });
      results.push({ restaurantId: order.restaurantId, available: false });
    }
  }

  return results;
}

async function notifyValidationResults(
  userId: string,
  partyPlanId: string,
  results: Array<{ restaurantId: string; available: boolean }>
): Promise<void> {
  const allAvailable = results.every((r) => r.available);
  const message = allAvailable
    ? 'PARTY_ALL_RESTAURANTS_AVAILABLE'
    : 'PARTY_SOME_RESTAURANTS_UNAVAILABLE';

  try {
    await notifyPartyStatus(userId, message, { partyPlanId });
  } catch (error) {
    log.error('Failed to notify validation results', { error });
  }
}

async function placeAllOrders(
  restaurantOrders: RestaurantOrder[],
  userId: string,
  partyPlanId: string
): Promise<PartyOrderResult> {
  const placedOrders: PlacedOrder[] = [];
  const failedOrders: Array<{ restaurantId: string; reason: string }> = [];

  for (const order of restaurantOrders) {
    try {
      const result = await placePartyOrder(
        order.restaurantId, userId, order.items
      );
      placedOrders.push({
        restaurantId: order.restaurantId,
        orderId: result.orderId,
        status: result.status,
      });
    } catch (error) {
      failedOrders.push({
        restaurantId: order.restaurantId,
        reason: String(error),
      });
    }
  }

  if (failedOrders.length > 0 && placedOrders.length > 0) {
    log.warn('Initiating saga compensation', { partyPlanId });
    await compensatePlacedOrders(placedOrders, userId);
  }

  const status = failedOrders.length === 0 ? 'ordered' : 'partially_failed';
  return { partyPlanId, status, placedOrders, failedOrders };
}

async function compensatePlacedOrders(
  placedOrders: PlacedOrder[],
  userId: string
): Promise<void> {
  for (const order of placedOrders) {
    try {
      await cancelPartyOrder(order.orderId, 'Saga compensation');
    } catch (error) {
      log.error('Failed to cancel order during compensation', {
        orderId: order.orderId, error,
      });
    }
  }

  try {
    await notifyPartyStatus(userId, 'PARTY_ORDER_FAILED', {
      reason: 'Some restaurant orders failed. All orders cancelled.',
    });
  } catch (error) {
    log.error('Failed to notify compensation', { error });
  }
}

async function notifyOrderPlacement(
  userId: string,
  partyPlanId: string,
  result: PartyOrderResult
): Promise<void> {
  const message = result.status === 'ordered'
    ? 'PARTY_ORDERS_PLACED'
    : 'PARTY_ORDERS_PARTIALLY_FAILED';

  try {
    await notifyPartyStatus(userId, message, {
      partyPlanId,
      placedCount: result.placedOrders.length,
      failedCount: result.failedOrders.length,
    });
  } catch (error) {
    log.error('Failed to notify order placement', { error });
  }
}

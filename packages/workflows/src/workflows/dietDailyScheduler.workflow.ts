/**
 * Diet Daily Scheduler Workflow
 *
 * Runs daily per user to manage diet plan meal ordering.
 * Gets today's meals, validates availability, places orders at
 * correct times, and updates the nutrition log.
 */

import {
  proxyActivities,
  defineQuery,
  setHandler,
  sleep,
  log,
  ApplicationFailure,
} from '@temporalio/workflow';

import type { DietActivities } from './dietDailyScheduler.types';

// ============================================================================
// Activity Proxy Configuration
// ============================================================================

const {
  getMealsForToday,
  validateMealAvailability,
  placeMealOrder,
  updateNutritionLog,
} = proxyActivities<DietActivities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

// ============================================================================
// Query Definitions
// ============================================================================

export const getDietSchedulerStatusQuery = defineQuery<string>('getDietSchedulerStatus');

// ============================================================================
// Types
// ============================================================================

export interface DietDailySchedulerInput {
  userId: string;
  planId: string;
  date: string;
}

export interface DietDailySchedulerResult {
  userId: string;
  planId: string;
  date: string;
  mealsProcessed: number;
  mealsOrdered: number;
  mealsSkipped: number;
  mealsFailed: number;
}

// ============================================================================
// Diet Daily Scheduler Workflow
// ============================================================================

export async function dietDailySchedulerWorkflow(
  input: DietDailySchedulerInput,
): Promise<DietDailySchedulerResult> {
  log.info('Starting diet daily scheduler', { userId: input.userId, date: input.date });

  let currentStatus = 'fetching_meals';
  setHandler(getDietSchedulerStatusQuery, () => currentStatus);

  // Step 1: Get today's meals
  const meals = await getMealsForToday(input.planId, input.date);
  log.info('Retrieved meals for today', { count: meals.length });

  if (meals.length === 0) {
    log.info('No meals scheduled for today');
    return buildResult(input, 0, 0, 0, 0);
  }

  // Step 2: Validate meal availability
  currentStatus = 'validating_availability';
  const validatedMeals = await validateMealAvailability(meals);
  log.info('Validated meal availability', {
    available: validatedMeals.available.length,
    unavailable: validatedMeals.unavailable.length,
  });

  // Step 3: Place orders for each available meal at scheduled times
  currentStatus = 'placing_orders';
  let orderedCount = 0;
  let failedCount = 0;

  for (const meal of validatedMeals.available) {
    try {
      if (meal.waitMs > 0) {
        log.info('Waiting for meal order time', {
          mealType: meal.mealType,
          waitMs: meal.waitMs,
        });
        await sleep(meal.waitMs);
      }

      await placeMealOrder(input.userId, meal);
      orderedCount++;
      log.info('Meal order placed', { mealId: meal.mealId, mealType: meal.mealType });
    } catch (error) {
      failedCount++;
      log.error('Failed to place meal order', { mealId: meal.mealId, error });
    }
  }

  // Step 4: Update nutrition log
  currentStatus = 'updating_nutrition';
  try {
    await updateNutritionLog(input.planId, input.date, orderedCount);
    log.info('Nutrition log updated');
  } catch (error) {
    log.error('Failed to update nutrition log', { error });
  }

  currentStatus = 'completed';
  const skippedCount = validatedMeals.unavailable.length;

  log.info('Diet daily scheduler completed', {
    ordered: orderedCount,
    skipped: skippedCount,
    failed: failedCount,
  });

  return buildResult(input, meals.length, orderedCount, skippedCount, failedCount);
}

function buildResult(
  input: DietDailySchedulerInput,
  total: number,
  ordered: number,
  skipped: number,
  failed: number,
): DietDailySchedulerResult {
  return {
    userId: input.userId,
    planId: input.planId,
    date: input.date,
    mealsProcessed: total,
    mealsOrdered: ordered,
    mealsSkipped: skipped,
    mealsFailed: failed,
  };
}

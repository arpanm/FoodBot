/**
 * Diet Activities
 *
 * Temporal activities for diet plan management workflows.
 * These handle meal fetching, availability validation,
 * order placement, nutrition logging, and weekly meal generation.
 */

import type {
  ScheduledMeal,
  MealAvailabilityResult,
  AvailableMeal,
} from '../workflows/dietDailyScheduler.types';

// ============================================================================
// Activity Implementations
// ============================================================================

/**
 * Get meals scheduled for today from the diet plan.
 */
export async function getMealsForToday(
  planId: string,
  date: string,
): Promise<ScheduledMeal[]> {
  // In production, this would query the database
  // For now, returns mock data structure
  // eslint-disable-next-line no-console -- intentional operational log
  console.warn(`[DietActivities] Fetching meals for plan ${planId} on ${date}`);
  return [];
}

/**
 * Validate that meals are available at their respective restaurants.
 */
export async function validateMealAvailability(
  meals: ScheduledMeal[],
): Promise<MealAvailabilityResult> {
  // In production, this would check restaurant APIs
  const available: AvailableMeal[] = meals.map((meal) => ({
    ...meal,
    waitMs: 0,
  }));

  return {
    available,
    unavailable: [],
  };
}

/**
 * Place an order for a specific meal through the order service.
 */
export async function placeMealOrder(
  userId: string,
  meal: AvailableMeal,
): Promise<void> {
  // eslint-disable-next-line no-console -- intentional operational log
  console.warn(
    `[DietActivities] Placing order for user ${userId}: ${meal.dishName} from ${meal.restaurantName}`,
  );
}

/**
 * Update the nutrition log after meals are ordered.
 */
export async function updateNutritionLog(
  planId: string,
  date: string,
  mealsOrdered: number,
): Promise<void> {
  // eslint-disable-next-line no-console -- intentional operational log
  console.warn(
    `[DietActivities] Updating nutrition log for plan ${planId} on ${date}: ${mealsOrdered} meals`,
  );
}

/**
 * Generate weekly meals for a diet plan (used by renewal workflow).
 */
export async function generateWeeklyMeals(planId: string): Promise<boolean> {
  // eslint-disable-next-line no-console -- intentional operational log
  console.warn(`[DietActivities] Generating weekly meals for plan ${planId}`);
  return true;
}

/**
 * Notify user that their meal plan is ready for review.
 */
export async function notifyMealPlanReady(
  userId: string,
  planId: string,
): Promise<void> {
  // eslint-disable-next-line no-console -- intentional operational log
  console.warn(`[DietActivities] Notifying user ${userId} that plan ${planId} is ready`);
}

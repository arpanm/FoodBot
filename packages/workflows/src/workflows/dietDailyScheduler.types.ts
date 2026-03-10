/**
 * Type definitions for Diet Daily Scheduler Workflow activities.
 */

export interface ScheduledMeal {
  mealId: string;
  mealType: string;
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  calories: number;
  price: number;
  deliveryAddress: string | null;
  scheduledOrderTime: string | null;
}

export interface AvailableMeal extends ScheduledMeal {
  waitMs: number;
}

export interface MealAvailabilityResult {
  available: AvailableMeal[];
  unavailable: ScheduledMeal[];
}

export interface DietActivities {
  getMealsForToday(planId: string, date: string): Promise<ScheduledMeal[]>;
  validateMealAvailability(
    meals: ScheduledMeal[],
  ): Promise<MealAvailabilityResult>;
  placeMealOrder(userId: string, meal: AvailableMeal): Promise<void>;
  updateNutritionLog(
    planId: string,
    date: string,
    mealsOrdered: number,
  ): Promise<void>;
  generateWeeklyMeals(planId: string): Promise<boolean>;
  notifyMealPlanReady(userId: string, planId: string): Promise<void>;
}

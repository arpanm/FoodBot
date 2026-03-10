import { Injectable, Logger } from '@nestjs/common';

import type { DietPlanMeal, MealType } from '../entities/diet-plan-meal.entity';

export interface ScheduledOrderTime {
  mealId: string;
  mealType: MealType;
  dayOfWeek: number;
  scheduledOrderTime: Date;
  deliveryTime: Date;
}

/**
 * Order lead times in minutes before meal delivery time.
 * breakfast: 60 min, lunch/dinner: 45 min, snack: 30 min
 */
const LEAD_TIMES: Record<MealType, number> = {
  breakfast: 60,
  lunch: 45,
  snack: 30,
  dinner: 45,
};

/**
 * Default meal delivery times (hour of day in 24h format).
 */
const DEFAULT_MEAL_TIMES: Record<MealType, number> = {
  breakfast: 8,
  lunch: 13,
  snack: 16,
  dinner: 20,
};

@Injectable()
export class OrderSchedulerService {
  private readonly logger = new Logger(OrderSchedulerService.name);

  /**
   * Calculate scheduled order times for all meals in a plan.
   */
  calculateScheduledTimes(
    meals: DietPlanMeal[],
    weekStartDate: Date,
  ): ScheduledOrderTime[] {
    return meals
      .filter((meal) => !meal.isSkipped)
      .map((meal) => this.calculateMealOrderTime(meal, weekStartDate));
  }

  /**
   * Calculate the order time for a single meal.
   */
  private calculateMealOrderTime(
    meal: DietPlanMeal,
    weekStartDate: Date,
  ): ScheduledOrderTime {
    const deliveryTime = this.getDeliveryTime(
      weekStartDate,
      meal.dayOfWeek,
      meal.mealType,
    );
    const leadMinutes = LEAD_TIMES[meal.mealType];
    const scheduledOrderTime = new Date(
      deliveryTime.getTime() - leadMinutes * 60 * 1000,
    );

    return {
      mealId: meal.id,
      mealType: meal.mealType,
      dayOfWeek: meal.dayOfWeek,
      scheduledOrderTime,
      deliveryTime,
    };
  }

  /**
   * Get the delivery time for a meal on a specific day.
   */
  private getDeliveryTime(
    weekStartDate: Date,
    dayOfWeek: number,
    mealType: MealType,
  ): Date {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + dayOfWeek);
    date.setHours(DEFAULT_MEAL_TIMES[mealType], 0, 0, 0);
    return date;
  }

  /**
   * Get meals that need ordering for today.
   */
  getTodaysMeals(
    meals: DietPlanMeal[],
    weekStartDate: Date,
    today: Date,
  ): DietPlanMeal[] {
    const dayOfWeek = this.getDayOffset(weekStartDate, today);
    if (dayOfWeek < 0 || dayOfWeek > 6) return [];

    return meals.filter(
      (m) => m.dayOfWeek === dayOfWeek && !m.isSkipped,
    );
  }

  /**
   * Calculate the day offset from week start.
   */
  private getDayOffset(weekStartDate: Date, today: Date): number {
    const startMs = new Date(weekStartDate).setHours(0, 0, 0, 0);
    const todayMs = new Date(today).setHours(0, 0, 0, 0);
    const diffDays = Math.round((todayMs - startMs) / (24 * 60 * 60 * 1000));
    return diffDays;
  }

  /**
   * Check if an order should be placed now based on scheduled time.
   */
  shouldPlaceOrder(
    scheduledTime: Date,
    currentTime: Date,
    windowMinutes: number = 5,
  ): boolean {
    const diff = scheduledTime.getTime() - currentTime.getTime();
    const windowMs = windowMinutes * 60 * 1000;
    return diff >= 0 && diff <= windowMs;
  }

  /**
   * Filter meals for paused plans (returns empty).
   */
  getMealsForPausedPlan(): DietPlanMeal[] {
    return [];
  }
}

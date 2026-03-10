import { Injectable } from '@nestjs/common';

import type { DietPlanMeal } from '../entities/diet-plan-meal.entity';

import type {
  DailyNutritionDto,
  GoalProgressDto,
  NutritionReportDto,
  WeeklyNutritionDto,
} from './dto/diet-plan-response.dto';

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

@Injectable()
export class NutritionTrackerService {
  /**
   * Generate a full nutrition report for a diet plan.
   */
  generateReport(
    planId: string,
    meals: DietPlanMeal[],
    calorieTarget: number,
  ): NutritionReportDto {
    const dailyBreakdown = this.calculateDailyBreakdown(meals);
    const weeklyTotals = this.calculateWeeklyTotals(dailyBreakdown);
    const goalProgress = this.calculateGoalProgress(weeklyTotals, calorieTarget);
    const streak = this.calculateStreak(dailyBreakdown, calorieTarget);

    return {
      planId,
      dailyBreakdown,
      weeklyTotals,
      goalProgress,
      streak,
    };
  }

  /**
   * Calculate nutrition breakdown for each day of the week.
   */
  calculateDailyBreakdown(meals: DietPlanMeal[]): DailyNutritionDto[] {
    const breakdown: DailyNutritionDto[] = [];

    for (let day = 0; day < 7; day++) {
      const dayMeals = meals.filter((m) => m.dayOfWeek === day);
      breakdown.push(this.buildDayNutrition(day, dayMeals));
    }

    return breakdown;
  }

  /**
   * Build nutrition summary for a single day.
   */
  private buildDayNutrition(
    day: number,
    dayMeals: DietPlanMeal[],
  ): DailyNutritionDto {
    const activeMeals = dayMeals.filter((m) => !m.isSkipped);
    const skippedMeals = dayMeals.filter((m) => m.isSkipped);

    return {
      dayOfWeek: day,
      dayName: DAY_NAMES[day],
      calories: this.sumField(activeMeals, 'calories'),
      protein: this.sumField(activeMeals, 'protein'),
      carbs: this.sumField(activeMeals, 'carbs'),
      fats: this.sumField(activeMeals, 'fats'),
      mealsCompleted: activeMeals.length,
      mealsSkipped: skippedMeals.length,
    };
  }

  /**
   * Sum a numeric field across meals.
   */
  private sumField(
    meals: DietPlanMeal[],
    field: 'calories' | 'protein' | 'carbs' | 'fats',
  ): number {
    return Math.round(
      meals.reduce((sum, m) => sum + Number(m[field] || 0), 0) * 100,
    ) / 100;
  }

  /**
   * Calculate weekly aggregated nutrition totals.
   */
  calculateWeeklyTotals(daily: DailyNutritionDto[]): WeeklyNutritionDto {
    const daysWithMeals = daily.filter((d) => d.mealsCompleted > 0);
    const activeDayCount = Math.max(daysWithMeals.length, 1);

    const totalCalories = daily.reduce((s, d) => s + d.calories, 0);
    const totalProtein = daily.reduce((s, d) => s + d.protein, 0);
    const totalCarbs = daily.reduce((s, d) => s + d.carbs, 0);
    const totalFats = daily.reduce((s, d) => s + d.fats, 0);

    return {
      totalCalories: Math.round(totalCalories),
      avgDailyCalories: Math.round(totalCalories / activeDayCount),
      totalProtein: Math.round(totalProtein * 100) / 100,
      totalCarbs: Math.round(totalCarbs * 100) / 100,
      totalFats: Math.round(totalFats * 100) / 100,
      totalCost: 0,
    };
  }

  /**
   * Calculate goal progress (adherence to calorie target).
   */
  calculateGoalProgress(
    weeklyTotals: WeeklyNutritionDto,
    calorieTarget: number,
  ): GoalProgressDto {
    const targetVal = Math.max(calorieTarget, 1);
    const diff = Math.abs(weeklyTotals.avgDailyCalories - targetVal);
    const adherencePercentage = Math.max(
      0,
      Math.round((1 - diff / targetVal) * 100),
    );
    const onTrack = adherencePercentage >= 80;

    return {
      calorieTarget: targetVal,
      actualAverage: weeklyTotals.avgDailyCalories,
      adherencePercentage,
      onTrack,
    };
  }

  /**
   * Calculate consecutive days meeting calorie target (within 15%).
   */
  calculateStreak(
    daily: DailyNutritionDto[],
    calorieTarget: number,
  ): number {
    let streak = 0;
    const tolerance = 0.15;
    const lower = calorieTarget * (1 - tolerance);
    const upper = calorieTarget * (1 + tolerance);

    for (const day of daily) {
      if (day.mealsCompleted === 0) break;
      if (day.calories >= lower && day.calories <= upper) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}

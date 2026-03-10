import { Injectable } from '@nestjs/common';

import type {
  Gender,
  ActivityLevel,
  HealthGoal,
} from '../entities/health-profile.entity';

export interface CalorieProfile {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  healthGoal: HealthGoal;
}

export interface CalorieResult {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

export interface MacroRatios {
  proteinRatio: number;
  carbRatio: number;
  fatRatio: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<HealthGoal, number> = {
  weight_loss: -500,
  weight_gain: 500,
  maintenance: 0,
  muscle_building: 300,
};

const CALORIES_PER_GRAM_PROTEIN = 4;
const CALORIES_PER_GRAM_CARB = 4;
const CALORIES_PER_GRAM_FAT = 9;

const DEFAULT_MACROS: MacroRatios = {
  proteinRatio: 0.3,
  carbRatio: 0.4,
  fatRatio: 0.3,
};

@Injectable()
export class CalorieCalculatorService {
  /**
   * Calculate BMR using Mifflin-St Jeor equation.
   * Male:   10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
   * Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
   * Other:  average of male and female
   */
  calculateBmr(weight: number, height: number, age: number, gender: Gender): number {
    const base = 10 * weight + 6.25 * height - 5 * age;

    if (gender === 'male') {
      return Math.round(base + 5);
    }
    if (gender === 'female') {
      return Math.round(base - 161);
    }
    // 'other' uses the average of male and female
    return Math.round(base + (5 + -161) / 2);
  }

  /**
   * Calculate TDEE (Total Daily Energy Expenditure).
   * TDEE = BMR * activity_multiplier
   */
  calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
    return Math.round(bmr * multiplier);
  }

  /**
   * Apply goal adjustment to TDEE.
   */
  applyGoalAdjustment(tdee: number, healthGoal: HealthGoal): number {
    const adjustment = GOAL_ADJUSTMENTS[healthGoal];
    return Math.max(1200, Math.round(tdee + adjustment));
  }

  /**
   * Calculate macro grams from daily calories and ratios.
   */
  calculateMacros(
    dailyCalories: number,
    ratios: MacroRatios = DEFAULT_MACROS,
  ): { proteinGrams: number; carbGrams: number; fatGrams: number } {
    const proteinGrams = Math.round(
      (dailyCalories * ratios.proteinRatio) / CALORIES_PER_GRAM_PROTEIN,
    );
    const carbGrams = Math.round(
      (dailyCalories * ratios.carbRatio) / CALORIES_PER_GRAM_CARB,
    );
    const fatGrams = Math.round(
      (dailyCalories * ratios.fatRatio) / CALORIES_PER_GRAM_FAT,
    );
    return { proteinGrams, carbGrams, fatGrams };
  }

  /**
   * Full calculation pipeline: BMR -> TDEE -> goal-adjusted -> macros.
   */
  calculateDailyNeeds(
    profile: CalorieProfile,
    customMacros?: MacroRatios,
  ): CalorieResult {
    const bmr = this.calculateBmr(
      profile.weight,
      profile.height,
      profile.age,
      profile.gender,
    );
    const tdee = this.calculateTdee(bmr, profile.activityLevel);
    const dailyCalories = this.applyGoalAdjustment(tdee, profile.healthGoal);
    const macros = this.calculateMacros(dailyCalories, customMacros);

    return {
      bmr,
      tdee,
      dailyCalories,
      ...macros,
    };
  }

  /**
   * Distribute daily calories across meal types.
   * Breakfast 25%, Lunch 35%, Snack 10%, Dinner 30%
   */
  getMealCalorieDistribution(dailyCalories: number): Record<string, number> {
    return {
      breakfast: Math.round(dailyCalories * 0.25),
      lunch: Math.round(dailyCalories * 0.35),
      snack: Math.round(dailyCalories * 0.10),
      dinner: Math.round(dailyCalories * 0.30),
    };
  }
}

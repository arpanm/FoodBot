import { Injectable, Logger } from '@nestjs/common';

import type { MealType } from '../entities/diet-plan-meal.entity';
import type { DietaryPreference } from '../entities/health-profile.entity';

import { CalorieCalculatorService } from './calorie-calculator.service';
import { MOCK_DISH_DATABASE, type MockDish } from './mock-dish-database';

export interface MealPlanInput {
  dailyCalories: number;
  proteinRatio: number;
  carbRatio: number;
  fatRatio: number;
  dietaryPreference: DietaryPreference;
  allergies: string[];
  dailyBudget: number | null;
  mealFrequency: number;
}

export interface GeneratedMeal {
  dayOfWeek: number;
  mealType: MealType;
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  price: number;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const DAYS_IN_WEEK = 7;
const NO_REPEAT_WITHIN_DAYS = 3;
const CALORIE_TOLERANCE = 0.3;

@Injectable()
export class MealPlanGeneratorService {
  private readonly logger = new Logger(MealPlanGeneratorService.name);

  constructor(private readonly calorieCalculator: CalorieCalculatorService) {}

  /** Generate a full 7-day meal plan based on dietary requirements. */
  generateWeeklyPlan(input: MealPlanInput): GeneratedMeal[] {
    const meals: GeneratedMeal[] = [];
    const distribution = this.calorieCalculator.getMealCalorieDistribution(input.dailyCalories);
    const eligible = this.filterEligibleDishes(input.dietaryPreference, input.allergies);

    for (let day = 0; day < DAYS_IN_WEEK; day++) {
      const dayMeals = this.generateDayMeals(day, distribution, eligible, meals, input);
      meals.push(...dayMeals);
    }
    return meals;
  }

  private generateDayMeals(
    day: number, distribution: Record<string, number>,
    eligible: MockDish[], existingMeals: GeneratedMeal[], input: MealPlanInput,
  ): GeneratedMeal[] {
    const dayMeals: GeneratedMeal[] = [];
    const activeMealTypes = this.getActiveMealTypes(input.mealFrequency);

    for (const mealType of activeMealTypes) {
      const targetCalories = distribution[mealType] || 0;
      const dish = this.selectDish(
        eligible, mealType, targetCalories, day, existingMeals, dayMeals, input.dailyBudget,
      );
      if (dish) {
        dayMeals.push(this.createMealFromDish(day, mealType, dish));
      }
    }
    return dayMeals;
  }

  private getActiveMealTypes(mealFrequency: number): MealType[] {
    if (mealFrequency <= 2) return ['lunch', 'dinner'];
    if (mealFrequency === 3) return ['breakfast', 'lunch', 'dinner'];
    return MEAL_TYPES;
  }

  private selectDish(
    eligible: MockDish[], mealType: MealType, targetCalories: number,
    day: number, existingMeals: GeneratedMeal[],
    dayMeals: GeneratedMeal[], dailyBudget: number | null,
  ): MockDish | null {
    const candidates = this.filterCandidates(
      eligible, mealType, targetCalories, day, existingMeals, dayMeals, dailyBudget,
    );
    if (candidates.length === 0) {
      this.logger.warn(`No suitable dish found for day ${day} ${mealType}`);
      return this.getFallbackDish(eligible, mealType);
    }
    return this.pickBestCandidate(candidates, targetCalories);
  }

  private filterCandidates(
    eligible: MockDish[], mealType: MealType, targetCalories: number,
    day: number, existingMeals: GeneratedMeal[],
    dayMeals: GeneratedMeal[], dailyBudget: number | null,
  ): MockDish[] {
    const recentDishIds = this.getRecentDishIds(day, existingMeals);
    const dayRestaurantIds = dayMeals.map((m) => m.restaurantId);
    const daySpent = dayMeals.reduce((sum, m) => sum + m.price, 0);

    return eligible.filter((dish) => {
      if (!dish.mealTypes.includes(mealType)) return false;
      if (recentDishIds.has(dish.id)) return false;
      if (this.isCalorieOutOfRange(dish.calories, targetCalories)) return false;
      if (dailyBudget && daySpent + dish.price > dailyBudget) return false;
      if (dayRestaurantIds.length >= 2 && dayRestaurantIds.includes(dish.restaurantId)) {
        return false;
      }
      return true;
    });
  }

  private isCalorieOutOfRange(dishCalories: number, target: number): boolean {
    const lower = target * (1 - CALORIE_TOLERANCE);
    const upper = target * (1 + CALORIE_TOLERANCE);
    return dishCalories < lower || dishCalories > upper;
  }

  private getRecentDishIds(currentDay: number, existingMeals: GeneratedMeal[]): Set<string> {
    const startDay = Math.max(0, currentDay - NO_REPEAT_WITHIN_DAYS);
    return new Set(
      existingMeals
        .filter((m) => m.dayOfWeek >= startDay && m.dayOfWeek < currentDay)
        .map((m) => m.dishId),
    );
  }

  private pickBestCandidate(candidates: MockDish[], targetCalories: number): MockDish {
    return candidates.reduce((best, dish) => {
      const bestDiff = Math.abs(best.calories - targetCalories);
      const dishDiff = Math.abs(dish.calories - targetCalories);
      return dishDiff < bestDiff ? dish : best;
    });
  }

  private getFallbackDish(eligible: MockDish[], mealType: MealType): MockDish | null {
    return eligible.find((d) => d.mealTypes.includes(mealType)) || null;
  }

  private filterEligibleDishes(preference: DietaryPreference, allergies: string[]): MockDish[] {
    return MOCK_DISH_DATABASE.filter((dish) => {
      if (!this.matchesDietaryPreference(dish, preference)) return false;
      if (this.hasAllergens(dish, allergies)) return false;
      return true;
    });
  }

  private matchesDietaryPreference(dish: MockDish, preference: DietaryPreference): boolean {
    const tags = dish.dietaryTags;
    switch (preference) {
      case 'veg': return tags.includes('veg');
      case 'vegan': return tags.includes('vegan');
      case 'eggetarian': return tags.includes('veg') || tags.includes('eggetarian');
      case 'keto': return tags.includes('keto');
      case 'paleo': return tags.includes('paleo');
      case 'non_veg': return true;
      default: return true;
    }
  }

  private hasAllergens(dish: MockDish, allergies: string[]): boolean {
    if (allergies.length === 0) return false;
    const lower = allergies.map((a) => a.toLowerCase());
    return dish.allergens.some((a) => lower.includes(a.toLowerCase()));
  }

  private createMealFromDish(day: number, mealType: MealType, dish: MockDish): GeneratedMeal {
    return {
      dayOfWeek: day, mealType,
      dishId: dish.id, dishName: dish.name,
      restaurantId: dish.restaurantId, restaurantName: dish.restaurantName,
      calories: dish.calories, protein: dish.protein,
      carbs: dish.carbs, fats: dish.fats, price: dish.price,
    };
  }

  /** Get replacement suggestions for a meal slot. */
  getReplacements(
    mealType: MealType, targetCalories: number, preference: DietaryPreference,
    allergies: string[], maxPrice?: number, limit: number = 5,
  ): MockDish[] {
    const eligible = this.filterEligibleDishes(preference, allergies);
    return eligible
      .filter((d) => d.mealTypes.includes(mealType))
      .filter((d) => !maxPrice || d.price <= maxPrice)
      .sort((a, b) => Math.abs(a.calories - targetCalories) - Math.abs(b.calories - targetCalories))
      .slice(0, limit);
  }
}

import type { MealType } from '../../entities/diet-plan-meal.entity';
import type { DietPlanStatus } from '../../entities/diet-plan.entity';

export interface MealResponseDto {
  id: string;
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
  isSkipped: boolean;
  isLocked: boolean;
  specialInstructions: string | null;
  scheduledOrderTime: string | null;
}

export interface DayPlanResponseDto {
  dayOfWeek: number;
  dayName: string;
  meals: MealResponseDto[];
  totalCalories: number;
  totalCost: number;
}

export interface DietPlanResponseDto {
  id: string;
  userId: string;
  healthProfileId: string;
  weekStartDate: string;
  weekEndDate: string;
  status: DietPlanStatus;
  totalCalories: number;
  totalCost: number;
  autoRenewal: boolean;
  calendar: DayPlanResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface NutritionReportDto {
  planId: string;
  dailyBreakdown: DailyNutritionDto[];
  weeklyTotals: WeeklyNutritionDto;
  goalProgress: GoalProgressDto;
  streak: number;
}

export interface DailyNutritionDto {
  dayOfWeek: number;
  dayName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealsCompleted: number;
  mealsSkipped: number;
}

export interface WeeklyNutritionDto {
  totalCalories: number;
  avgDailyCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  totalCost: number;
}

export interface GoalProgressDto {
  calorieTarget: number;
  actualAverage: number;
  adherencePercentage: number;
  onTrack: boolean;
}

import type { DietPlanMeal } from '../../entities/diet-plan-meal.entity';

import { NutritionTrackerService } from '../nutrition-tracker.service';

describe('NutritionTrackerService', () => {
  let service: NutritionTrackerService;

  beforeEach(() => {
    service = new NutritionTrackerService();
  });

  function createMockMeal(overrides?: Partial<DietPlanMeal>): DietPlanMeal {
    return {
      id: 'meal-1',
      dietPlanId: 'plan-1',
      dayOfWeek: 0,
      mealType: 'lunch',
      dishId: 'dish-1',
      dishName: 'Test Dish',
      restaurantId: 'rest-1',
      restaurantName: 'Test Restaurant',
      calories: 500,
      protein: 30,
      carbs: 50,
      fats: 20,
      price: 200,
      deliveryAddress: null,
      isSkipped: false,
      isLocked: false,
      specialInstructions: null,
      scheduledOrderTime: null,
      createdAt: new Date(),
      dietPlan: {} as DietPlanMeal['dietPlan'],
      ...overrides,
    } as DietPlanMeal;
  }

  function createWeekMeals(): DietPlanMeal[] {
    const meals: DietPlanMeal[] = [];
    for (let day = 0; day < 7; day++) {
      meals.push(
        createMockMeal({ id: `b-${day}`, dayOfWeek: day, mealType: 'breakfast', calories: 400, protein: 15, carbs: 50, fats: 12, price: 150 }),
        createMockMeal({ id: `l-${day}`, dayOfWeek: day, mealType: 'lunch', calories: 600, protein: 35, carbs: 60, fats: 20, price: 250 }),
        createMockMeal({ id: `s-${day}`, dayOfWeek: day, mealType: 'snack', calories: 200, protein: 10, carbs: 20, fats: 8, price: 100 }),
        createMockMeal({ id: `d-${day}`, dayOfWeek: day, mealType: 'dinner', calories: 500, protein: 30, carbs: 45, fats: 22, price: 220 }),
      );
    }
    return meals;
  }

  describe('calculateDailyBreakdown', () => {
    it('should return 7 days of breakdown', () => {
      const meals = createWeekMeals();
      const breakdown = service.calculateDailyBreakdown(meals);
      expect(breakdown).toHaveLength(7);
    });

    it('should calculate correct daily calories', () => {
      const meals = createWeekMeals();
      const breakdown = service.calculateDailyBreakdown(meals);

      // Each day: 400 + 600 + 200 + 500 = 1700
      for (const day of breakdown) {
        expect(day.calories).toBe(1700);
      }
    });

    it('should calculate correct daily macros', () => {
      const meals = createWeekMeals();
      const breakdown = service.calculateDailyBreakdown(meals);

      // Each day protein: 15 + 35 + 10 + 30 = 90
      for (const day of breakdown) {
        expect(day.protein).toBe(90);
        expect(day.carbs).toBe(175); // 50 + 60 + 20 + 45
        expect(day.fats).toBe(62);   // 12 + 20 + 8 + 22
      }
    });

    it('should exclude skipped meals from totals', () => {
      const meals = [
        createMockMeal({ dayOfWeek: 0, calories: 500, isSkipped: false }),
        createMockMeal({ id: 'skipped', dayOfWeek: 0, calories: 300, isSkipped: true }),
      ];
      const breakdown = service.calculateDailyBreakdown(meals);
      expect(breakdown[0].calories).toBe(500);
      expect(breakdown[0].mealsCompleted).toBe(1);
      expect(breakdown[0].mealsSkipped).toBe(1);
    });

    it('should show correct day names', () => {
      const meals = createWeekMeals();
      const breakdown = service.calculateDailyBreakdown(meals);
      expect(breakdown[0].dayName).toBe('Sunday');
      expect(breakdown[1].dayName).toBe('Monday');
      expect(breakdown[6].dayName).toBe('Saturday');
    });

    it('should handle empty meals for a day', () => {
      const meals: DietPlanMeal[] = [];
      const breakdown = service.calculateDailyBreakdown(meals);
      expect(breakdown[0].calories).toBe(0);
      expect(breakdown[0].mealsCompleted).toBe(0);
    });
  });

  describe('calculateWeeklyTotals', () => {
    it('should calculate correct weekly totals', () => {
      const meals = createWeekMeals();
      const breakdown = service.calculateDailyBreakdown(meals);
      const totals = service.calculateWeeklyTotals(breakdown);

      // 7 days * 1700 calories = 11900
      expect(totals.totalCalories).toBe(11900);
      expect(totals.avgDailyCalories).toBe(1700);
    });

    it('should calculate average from days with meals only', () => {
      const meals = [
        createMockMeal({ dayOfWeek: 0, calories: 2000, protein: 80, carbs: 200, fats: 60 }),
        createMockMeal({ dayOfWeek: 1, calories: 1800, protein: 70, carbs: 180, fats: 55 }),
      ];
      const breakdown = service.calculateDailyBreakdown(meals);
      const totals = service.calculateWeeklyTotals(breakdown);

      // Only 2 days have meals
      expect(totals.totalCalories).toBe(3800);
      expect(totals.avgDailyCalories).toBe(1900);
    });

    it('should handle all zeros gracefully', () => {
      const breakdown = service.calculateDailyBreakdown([]);
      const totals = service.calculateWeeklyTotals(breakdown);

      expect(totals.totalCalories).toBe(0);
      expect(totals.avgDailyCalories).toBe(0);
    });
  });

  describe('calculateGoalProgress', () => {
    it('should show 100% adherence when at target', () => {
      const weeklyTotals = {
        totalCalories: 14000,
        avgDailyCalories: 2000,
        totalProtein: 700,
        totalCarbs: 1400,
        totalFats: 467,
        totalCost: 5000,
      };
      const progress = service.calculateGoalProgress(weeklyTotals, 2000);

      expect(progress.adherencePercentage).toBe(100);
      expect(progress.onTrack).toBe(true);
      expect(progress.calorieTarget).toBe(2000);
      expect(progress.actualAverage).toBe(2000);
    });

    it('should show less than 100% adherence when off target', () => {
      const weeklyTotals = {
        totalCalories: 10500,
        avgDailyCalories: 1500,
        totalProtein: 525,
        totalCarbs: 1050,
        totalFats: 350,
        totalCost: 3500,
      };
      const progress = service.calculateGoalProgress(weeklyTotals, 2000);

      expect(progress.adherencePercentage).toBe(75);
      expect(progress.onTrack).toBe(false);
    });

    it('should be on track when adherence >= 80%', () => {
      const weeklyTotals = {
        totalCalories: 12600,
        avgDailyCalories: 1800,
        totalProtein: 630,
        totalCarbs: 1260,
        totalFats: 420,
        totalCost: 4200,
      };
      const progress = service.calculateGoalProgress(weeklyTotals, 2000);

      expect(progress.adherencePercentage).toBe(90);
      expect(progress.onTrack).toBe(true);
    });

    it('should handle edge case with zero calorie target', () => {
      const weeklyTotals = {
        totalCalories: 0, avgDailyCalories: 0,
        totalProtein: 0, totalCarbs: 0, totalFats: 0, totalCost: 0,
      };
      const progress = service.calculateGoalProgress(weeklyTotals, 0);
      // Should not throw, calorieTarget is clamped to at least 1
      expect(progress.calorieTarget).toBe(1);
    });
  });

  describe('calculateStreak', () => {
    it('should return streak of days meeting target', () => {
      const meals = createWeekMeals();
      const breakdown = service.calculateDailyBreakdown(meals);
      // Each day has 1700 calories, target 1700 -> all within 15%
      const streak = service.calculateStreak(breakdown, 1700);
      expect(streak).toBe(7);
    });

    it('should break streak when day is out of tolerance', () => {
      const meals = [
        createMockMeal({ dayOfWeek: 0, calories: 2000 }),
        createMockMeal({ dayOfWeek: 1, calories: 2000 }),
        createMockMeal({ dayOfWeek: 2, calories: 500 }), // Way below target
        createMockMeal({ dayOfWeek: 3, calories: 2000 }),
      ];
      const breakdown = service.calculateDailyBreakdown(meals);
      const streak = service.calculateStreak(breakdown, 2000);

      expect(streak).toBe(2);
    });

    it('should return 0 for empty plan', () => {
      const breakdown = service.calculateDailyBreakdown([]);
      const streak = service.calculateStreak(breakdown, 2000);
      expect(streak).toBe(0);
    });

    it('should return 0 when first day is out of range', () => {
      const meals = [
        createMockMeal({ dayOfWeek: 0, calories: 100 }), // Way below
      ];
      const breakdown = service.calculateDailyBreakdown(meals);
      const streak = service.calculateStreak(breakdown, 2000);
      expect(streak).toBe(0);
    });
  });

  describe('generateReport', () => {
    it('should return complete nutrition report', () => {
      const meals = createWeekMeals();
      const report = service.generateReport('plan-1', meals, 1700);

      expect(report.planId).toBe('plan-1');
      expect(report.dailyBreakdown).toHaveLength(7);
      expect(report.weeklyTotals.totalCalories).toBe(11900);
      expect(report.goalProgress.onTrack).toBe(true);
      expect(report.streak).toBe(7);
    });

    it('should handle empty meals in report', () => {
      const report = service.generateReport('plan-1', [], 2000);

      expect(report.dailyBreakdown).toHaveLength(7);
      expect(report.weeklyTotals.totalCalories).toBe(0);
      expect(report.streak).toBe(0);
    });
  });
});

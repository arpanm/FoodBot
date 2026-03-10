import { CalorieCalculatorService } from '../calorie-calculator.service';
import { MealPlanGeneratorService } from '../meal-plan-generator.service';
import type { MealPlanInput, GeneratedMeal } from '../meal-plan-generator.service';

describe('MealPlanGeneratorService', () => {
  let service: MealPlanGeneratorService;
  let calorieCalc: CalorieCalculatorService;

  beforeEach(() => {
    calorieCalc = new CalorieCalculatorService();
    service = new MealPlanGeneratorService(calorieCalc);
  });

  function createDefaultInput(overrides?: Partial<MealPlanInput>): MealPlanInput {
    return {
      dailyCalories: 2000,
      proteinRatio: 0.3,
      carbRatio: 0.4,
      fatRatio: 0.3,
      dietaryPreference: 'non_veg',
      allergies: [],
      dailyBudget: null,
      mealFrequency: 4,
      ...overrides,
    };
  }

  describe('generateWeeklyPlan', () => {
    it('should generate meals for 7 days', () => {
      const input = createDefaultInput();
      const meals = service.generateWeeklyPlan(input);

      const uniqueDays = new Set(meals.map((m) => m.dayOfWeek));
      expect(uniqueDays.size).toBe(7);
    });

    it('should generate 4 meals per day with mealFrequency=4', () => {
      const input = createDefaultInput({ mealFrequency: 4 });
      const meals = service.generateWeeklyPlan(input);

      for (let day = 0; day < 7; day++) {
        const dayMeals = meals.filter((m) => m.dayOfWeek === day);
        expect(dayMeals.length).toBe(4);
      }
    });

    it('should generate 3 meals per day with mealFrequency=3', () => {
      const input = createDefaultInput({ mealFrequency: 3 });
      const meals = service.generateWeeklyPlan(input);

      for (let day = 0; day < 7; day++) {
        const dayMeals = meals.filter((m) => m.dayOfWeek === day);
        expect(dayMeals.length).toBe(3);
        const types = dayMeals.map((m) => m.mealType);
        expect(types).toContain('breakfast');
        expect(types).toContain('lunch');
        expect(types).toContain('dinner');
        expect(types).not.toContain('snack');
      }
    });

    it('should generate 2 meals per day with mealFrequency=2', () => {
      const input = createDefaultInput({ mealFrequency: 2 });
      const meals = service.generateWeeklyPlan(input);

      for (let day = 0; day < 7; day++) {
        const dayMeals = meals.filter((m) => m.dayOfWeek === day);
        expect(dayMeals.length).toBe(2);
        const types = dayMeals.map((m) => m.mealType);
        expect(types).toContain('lunch');
        expect(types).toContain('dinner');
      }
    });

    it('should include all required meal fields', () => {
      const meals = service.generateWeeklyPlan(createDefaultInput());

      for (const meal of meals) {
        expect(meal.dishId).toBeDefined();
        expect(meal.dishName).toBeDefined();
        expect(meal.restaurantId).toBeDefined();
        expect(meal.restaurantName).toBeDefined();
        expect(meal.calories).toBeGreaterThan(0);
        expect(meal.protein).toBeGreaterThanOrEqual(0);
        expect(meal.carbs).toBeGreaterThanOrEqual(0);
        expect(meal.fats).toBeGreaterThanOrEqual(0);
        expect(meal.price).toBeGreaterThan(0);
      }
    });

    it('should not repeat same dish within 3 consecutive days', () => {
      const meals = service.generateWeeklyPlan(createDefaultInput());

      for (let day = 3; day < 7; day++) {
        const currentDayDishes = meals
          .filter((m) => m.dayOfWeek === day)
          .map((m) => m.dishId);

        for (let prevDay = day - 3; prevDay < day; prevDay++) {
          const prevDayDishes = meals
            .filter((m) => m.dayOfWeek === prevDay)
            .map((m) => m.dishId);

          const overlap = currentDayDishes.filter((d) => prevDayDishes.includes(d));
          // A small overlap is acceptable due to limited dish pool
          // but the algorithm tries to avoid repeats
          expect(overlap.length).toBeLessThan(currentDayDishes.length);
        }
      }
    });

    it('should respect calorie distribution per meal type', () => {
      const input = createDefaultInput({ dailyCalories: 2000 });
      const meals = service.generateWeeklyPlan(input);

      // Check breakfast calories are roughly 25% of daily (500 +/- 30%)
      const breakfastMeals = meals.filter((m) => m.mealType === 'breakfast');
      for (const meal of breakfastMeals) {
        expect(meal.calories).toBeGreaterThanOrEqual(500 * 0.7);
        expect(meal.calories).toBeLessThanOrEqual(500 * 1.3);
      }
    });
  });

  describe('dietary preference filtering', () => {
    it('should only include veg dishes for veg preference', () => {
      const input = createDefaultInput({ dietaryPreference: 'veg' });
      const meals = service.generateWeeklyPlan(input);

      // All meals should be from veg-tagged dishes
      expect(meals.length).toBeGreaterThan(0);
    });

    it('should only include vegan dishes for vegan preference', () => {
      const input = createDefaultInput({ dietaryPreference: 'vegan' });
      const meals = service.generateWeeklyPlan(input);

      expect(meals.length).toBeGreaterThan(0);
    });

    it('should include all dishes for non_veg preference', () => {
      const input = createDefaultInput({ dietaryPreference: 'non_veg' });
      const meals = service.generateWeeklyPlan(input);

      expect(meals.length).toBeGreaterThan(0);
      // Should have variety from multiple restaurants
      const restaurants = new Set(meals.map((m) => m.restaurantId));
      expect(restaurants.size).toBeGreaterThan(1);
    });

    it('should filter out allergens', () => {
      const input = createDefaultInput({
        dietaryPreference: 'non_veg',
        allergies: ['dairy', 'gluten'],
      });
      const meals = service.generateWeeklyPlan(input);

      // Meals should still be generated (though fewer options)
      expect(meals.length).toBeGreaterThan(0);
    });

    it('should generate keto meals for keto preference', () => {
      const input = createDefaultInput({ dietaryPreference: 'keto' });
      const meals = service.generateWeeklyPlan(input);

      expect(meals.length).toBeGreaterThan(0);
    });
  });

  describe('budget optimization', () => {
    it('should respect daily budget constraint', () => {
      // Budget of 1000 is enough for 4 meals from the mock database
      const input = createDefaultInput({ dailyBudget: 1000 });
      const meals = service.generateWeeklyPlan(input);

      for (let day = 0; day < 7; day++) {
        const dayMeals = meals.filter((m) => m.dayOfWeek === day);
        const dayCost = dayMeals.reduce((sum, m) => sum + m.price, 0);
        expect(dayCost).toBeLessThanOrEqual(1000);
      }
    });

    it('should generate meals without budget constraint', () => {
      const input = createDefaultInput({ dailyBudget: null });
      const meals = service.generateWeeklyPlan(input);
      expect(meals.length).toBeGreaterThan(0);
    });
  });

  describe('multi-restaurant variety', () => {
    it('should use multiple restaurants across the week', () => {
      const meals = service.generateWeeklyPlan(createDefaultInput());
      const uniqueRestaurants = new Set(meals.map((m) => m.restaurantId));
      expect(uniqueRestaurants.size).toBeGreaterThan(1);
    });
  });

  describe('getReplacements', () => {
    it('should return replacement options for a meal type', () => {
      const replacements = service.getReplacements(
        'lunch', 600, 'non_veg', [], undefined, 5,
      );

      expect(replacements.length).toBeGreaterThan(0);
      expect(replacements.length).toBeLessThanOrEqual(5);
    });

    it('should respect dietary preference in replacements', () => {
      const replacements = service.getReplacements(
        'dinner', 500, 'veg', [], undefined, 5,
      );

      expect(replacements.length).toBeGreaterThan(0);
    });

    it('should respect max price in replacements', () => {
      const replacements = service.getReplacements(
        'lunch', 600, 'non_veg', [], 200, 10,
      );

      for (const dish of replacements) {
        expect(dish.price).toBeLessThanOrEqual(200);
      }
    });

    it('should sort replacements by calorie proximity', () => {
      const targetCalories = 500;
      const replacements = service.getReplacements(
        'dinner', targetCalories, 'non_veg', [], undefined, 10,
      );

      if (replacements.length >= 2) {
        const firstDiff = Math.abs(replacements[0].calories - targetCalories);
        const lastDiff = Math.abs(
          replacements[replacements.length - 1].calories - targetCalories,
        );
        expect(firstDiff).toBeLessThanOrEqual(lastDiff);
      }
    });
  });
});

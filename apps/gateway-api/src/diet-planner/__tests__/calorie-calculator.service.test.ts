import { CalorieCalculatorService } from '../calorie-calculator.service';
import type { CalorieProfile, MacroRatios } from '../calorie-calculator.service';

describe('CalorieCalculatorService', () => {
  let service: CalorieCalculatorService;

  beforeEach(() => {
    service = new CalorieCalculatorService();
  });

  describe('calculateBmr', () => {
    it('should calculate BMR for male using Mifflin-St Jeor', () => {
      // Male: 10 * 80 + 6.25 * 175 - 5 * 30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75 -> 1749
      const result = service.calculateBmr(80, 175, 30, 'male');
      expect(result).toBe(1749);
    });

    it('should calculate BMR for female using Mifflin-St Jeor', () => {
      // Female: 10 * 65 + 6.25 * 160 - 5 * 28 - 161 = 650 + 1000 - 140 - 161 = 1349
      const result = service.calculateBmr(65, 160, 28, 'female');
      expect(result).toBe(1349);
    });

    it('should calculate BMR for other gender (average)', () => {
      // Other: 10 * 70 + 6.25 * 170 - 5 * 25 + (5 + -161) / 2
      // = 700 + 1062.5 - 125 + (-78) = 1559.5 -> 1560
      const result = service.calculateBmr(70, 170, 25, 'other');
      expect(result).toBe(1560);
    });

    it('should handle edge case for very low weight', () => {
      const result = service.calculateBmr(40, 150, 20, 'female');
      // 10 * 40 + 6.25 * 150 - 5 * 20 - 161 = 400 + 937.5 - 100 - 161 = 1076.5 -> 1077
      expect(result).toBe(1077);
    });

    it('should handle edge case for very high weight', () => {
      const result = service.calculateBmr(150, 190, 45, 'male');
      // 10 * 150 + 6.25 * 190 - 5 * 45 + 5 = 1500 + 1187.5 - 225 + 5 = 2467.5 -> 2468
      expect(result).toBe(2468);
    });

    it('should handle elderly profile', () => {
      const result = service.calculateBmr(70, 165, 70, 'male');
      // 10 * 70 + 6.25 * 165 - 5 * 70 + 5 = 700 + 1031.25 - 350 + 5 = 1386.25 -> 1386
      expect(result).toBe(1386);
    });
  });

  describe('calculateTdee', () => {
    it('should apply sedentary multiplier (1.2)', () => {
      const result = service.calculateTdee(1700, 'sedentary');
      expect(result).toBe(Math.round(1700 * 1.2));
    });

    it('should apply moderate multiplier (1.55)', () => {
      const result = service.calculateTdee(1700, 'moderate');
      expect(result).toBe(Math.round(1700 * 1.55));
    });

    it('should apply active multiplier (1.725)', () => {
      const result = service.calculateTdee(1700, 'active');
      expect(result).toBe(Math.round(1700 * 1.725));
    });

    it('should apply very_active multiplier (1.9)', () => {
      const result = service.calculateTdee(1700, 'very_active');
      expect(result).toBe(Math.round(1700 * 1.9));
    });
  });

  describe('applyGoalAdjustment', () => {
    it('should subtract 500 for weight loss', () => {
      const result = service.applyGoalAdjustment(2500, 'weight_loss');
      expect(result).toBe(2000);
    });

    it('should add 500 for weight gain', () => {
      const result = service.applyGoalAdjustment(2500, 'weight_gain');
      expect(result).toBe(3000);
    });

    it('should keep same for maintenance', () => {
      const result = service.applyGoalAdjustment(2500, 'maintenance');
      expect(result).toBe(2500);
    });

    it('should add 300 for muscle building', () => {
      const result = service.applyGoalAdjustment(2500, 'muscle_building');
      expect(result).toBe(2800);
    });

    it('should enforce minimum of 1200 calories', () => {
      const result = service.applyGoalAdjustment(1400, 'weight_loss');
      expect(result).toBe(1200);
    });

    it('should return 1200 when TDEE minus adjustment is below minimum', () => {
      const result = service.applyGoalAdjustment(1000, 'weight_loss');
      expect(result).toBe(1200);
    });
  });

  describe('calculateMacros', () => {
    it('should calculate default macro grams correctly', () => {
      const result = service.calculateMacros(2000);
      // protein: (2000 * 0.3) / 4 = 150
      // carbs: (2000 * 0.4) / 4 = 200
      // fats: (2000 * 0.3) / 9 = 66.67 -> 67
      expect(result.proteinGrams).toBe(150);
      expect(result.carbGrams).toBe(200);
      expect(result.fatGrams).toBe(67);
    });

    it('should calculate custom macro ratios', () => {
      const customRatios: MacroRatios = { proteinRatio: 0.4, carbRatio: 0.3, fatRatio: 0.3 };
      const result = service.calculateMacros(2000, customRatios);
      // protein: (2000 * 0.4) / 4 = 200
      // carbs: (2000 * 0.3) / 4 = 150
      // fats: (2000 * 0.3) / 9 = 66.67 -> 67
      expect(result.proteinGrams).toBe(200);
      expect(result.carbGrams).toBe(150);
      expect(result.fatGrams).toBe(67);
    });

    it('should handle keto-style ratios', () => {
      const ketoRatios: MacroRatios = { proteinRatio: 0.25, carbRatio: 0.05, fatRatio: 0.7 };
      const result = service.calculateMacros(2000, ketoRatios);
      // protein: (2000 * 0.25) / 4 = 125
      // carbs: (2000 * 0.05) / 4 = 25
      // fats: (2000 * 0.7) / 9 = 155.56 -> 156
      expect(result.proteinGrams).toBe(125);
      expect(result.carbGrams).toBe(25);
      expect(result.fatGrams).toBe(156);
    });
  });

  describe('calculateDailyNeeds', () => {
    it('should return full calculation for male weight loss', () => {
      const profile: CalorieProfile = {
        weight: 85, height: 178, age: 32,
        gender: 'male', activityLevel: 'moderate', healthGoal: 'weight_loss',
      };
      const result = service.calculateDailyNeeds(profile);

      expect(result.bmr).toBeGreaterThan(0);
      expect(result.tdee).toBeGreaterThan(result.bmr);
      expect(result.dailyCalories).toBeLessThan(result.tdee);
      expect(result.dailyCalories).toBeGreaterThanOrEqual(1200);
      expect(result.proteinGrams).toBeGreaterThan(0);
      expect(result.carbGrams).toBeGreaterThan(0);
      expect(result.fatGrams).toBeGreaterThan(0);
    });

    it('should return full calculation for female maintenance', () => {
      const profile: CalorieProfile = {
        weight: 60, height: 162, age: 28,
        gender: 'female', activityLevel: 'active', healthGoal: 'maintenance',
      };
      const result = service.calculateDailyNeeds(profile);

      expect(result.bmr).toBeGreaterThan(0);
      expect(result.tdee).toBeGreaterThan(result.bmr);
      expect(result.dailyCalories).toBe(result.tdee);
    });

    it('should use custom macros when provided', () => {
      const profile: CalorieProfile = {
        weight: 75, height: 170, age: 30,
        gender: 'male', activityLevel: 'sedentary', healthGoal: 'maintenance',
      };
      const customMacros: MacroRatios = { proteinRatio: 0.35, carbRatio: 0.45, fatRatio: 0.2 };
      const result = service.calculateDailyNeeds(profile, customMacros);

      const expectedProtein = Math.round((result.dailyCalories * 0.35) / 4);
      expect(result.proteinGrams).toBe(expectedProtein);
    });
  });

  describe('getMealCalorieDistribution', () => {
    it('should distribute calories: 25% breakfast, 35% lunch, 10% snack, 30% dinner', () => {
      const result = service.getMealCalorieDistribution(2000);

      expect(result.breakfast).toBe(500);
      expect(result.lunch).toBe(700);
      expect(result.snack).toBe(200);
      expect(result.dinner).toBe(600);
    });

    it('should handle non-standard calorie counts', () => {
      const result = service.getMealCalorieDistribution(1800);

      expect(result.breakfast).toBe(450);
      expect(result.lunch).toBe(630);
      expect(result.snack).toBe(180);
      expect(result.dinner).toBe(540);
    });

    it('should sum to approximately total calories', () => {
      const total = 2200;
      const result = service.getMealCalorieDistribution(total);
      const sum = result.breakfast + result.lunch + result.snack + result.dinner;
      // Rounding may cause +-1 deviation
      expect(Math.abs(sum - total)).toBeLessThanOrEqual(2);
    });
  });
});

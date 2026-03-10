import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { DietPlanMeal } from '../../entities/diet-plan-meal.entity';
import type { DietPlan } from '../../entities/diet-plan.entity';
import type { HealthProfile } from '../../entities/health-profile.entity';
import { CalorieCalculatorService } from '../calorie-calculator.service';
import { DietPlannerService } from '../diet-planner.service';
import { MealPlanGeneratorService } from '../meal-plan-generator.service';
import { NutritionTrackerService } from '../nutrition-tracker.service';
import { OrderSchedulerService } from '../order-scheduler.service';

describe('DietPlannerService', () => {
  let service: DietPlannerService;
  let healthProfileRepo: Record<string, jest.Mock>;
  let dietPlanRepo: Record<string, jest.Mock>;
  let mealRepo: Record<string, jest.Mock>;
  let calorieCalc: CalorieCalculatorService;
  let mealGenerator: MealPlanGeneratorService;
  let nutritionTracker: NutritionTrackerService;
  let orderScheduler: OrderSchedulerService;

  const mockUserId = 'user-123';
  const otherUserId = 'user-999';

  function createMockProfile(overrides?: Partial<HealthProfile>): HealthProfile {
    return {
      id: 'profile-1', userId: mockUserId, weight: 75, targetWeight: 70,
      height: 175, age: 30, gender: 'male', activityLevel: 'moderate',
      healthGoal: 'weight_loss', medicalConditions: [], allergies: [],
      dietaryPreference: 'non_veg', calorieTarget: null,
      proteinRatio: 0.3, carbRatio: 0.4, fatRatio: 0.3,
      mealFrequency: 4, dailyBudget: null,
      createdAt: new Date(), updatedAt: new Date(), user: {} as HealthProfile['user'],
      ...overrides,
    } as HealthProfile;
  }

  function createMockPlan(overrides?: Partial<DietPlan>): DietPlan {
    return {
      id: 'plan-1', userId: mockUserId, healthProfileId: 'profile-1',
      weekStartDate: new Date('2026-02-23'), weekEndDate: new Date('2026-03-01'),
      status: 'active', totalCalories: 0, totalCost: 0,
      autoRenewal: false, meals: [],
      createdAt: new Date(), updatedAt: new Date(),
      user: {} as DietPlan['user'], healthProfile: {} as DietPlan['healthProfile'],
      ...overrides,
    } as DietPlan;
  }

  beforeEach(() => {
    healthProfileRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data: unknown) => data),
      save: jest.fn((data: unknown) => Promise.resolve(data)),
    };

    dietPlanRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data: unknown) => data),
      save: jest.fn((data: unknown) => Promise.resolve(data)),
      update: jest.fn(),
      remove: jest.fn(),
    };

    mealRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: unknown) => data),
      save: jest.fn((data: unknown) => Promise.resolve(Array.isArray(data) ? data : [data])),
      remove: jest.fn(),
    };

    calorieCalc = new CalorieCalculatorService();
    mealGenerator = new MealPlanGeneratorService(calorieCalc);
    nutritionTracker = new NutritionTrackerService();
    orderScheduler = new OrderSchedulerService();

    service = new DietPlannerService(
      healthProfileRepo as never,
      dietPlanRepo as never,
      mealRepo as never,
      calorieCalc,
      mealGenerator,
      nutritionTracker,
      orderScheduler,
    );
  });

  describe('Health Profile CRUD', () => {
    it('should create a health profile', async () => {
      healthProfileRepo.findOne.mockResolvedValue(null);
      const dto = {
        weight: 75, targetWeight: 70, height: 175, age: 30,
        gender: 'male' as const, activityLevel: 'moderate' as const,
        healthGoal: 'weight_loss' as const, dietaryPreference: 'non_veg' as const,
      };

      const result = await service.createHealthProfile(mockUserId, dto);
      expect(healthProfileRepo.create).toHaveBeenCalled();
      expect(healthProfileRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw if profile already exists', async () => {
      healthProfileRepo.findOne.mockResolvedValue(createMockProfile());

      await expect(
        service.createHealthProfile(mockUserId, {} as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get existing health profile', async () => {
      const profile = createMockProfile();
      healthProfileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getHealthProfile(mockUserId);
      expect(result).toEqual(profile);
    });

    it('should throw NotFoundException for missing profile', async () => {
      healthProfileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getHealthProfile(mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update health profile', async () => {
      healthProfileRepo.findOne.mockResolvedValue(createMockProfile());

      const result = await service.updateHealthProfile(mockUserId, { weight: 72 });
      expect(healthProfileRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Diet Plan CRUD', () => {
    it('should create a diet plan', async () => {
      healthProfileRepo.findOne.mockResolvedValue(createMockProfile());

      const result = await service.createDietPlan(mockUserId, {
        healthProfileId: 'profile-1',
      });

      expect(dietPlanRepo.create).toHaveBeenCalled();
      expect(dietPlanRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw if profile not owned by user', async () => {
      healthProfileRepo.findOne.mockResolvedValue(
        createMockProfile({ userId: otherUserId }),
      );

      await expect(
        service.createDietPlan(mockUserId, { healthProfileId: 'profile-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should list user diet plans', async () => {
      dietPlanRepo.find.mockResolvedValue([createMockPlan()]);

      const result = await service.listDietPlans(mockUserId);
      expect(result).toHaveLength(1);
    });

    it('should get diet plan with authorization', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan());

      const result = await service.getDietPlan(mockUserId, 'plan-1');
      expect(result.id).toBe('plan-1');
    });

    it('should throw ForbiddenException for other user plan', async () => {
      dietPlanRepo.findOne.mockResolvedValue(
        createMockPlan({ userId: otherUserId }),
      );

      await expect(
        service.getDietPlan(mockUserId, 'plan-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for missing plan', async () => {
      dietPlanRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getDietPlan(mockUserId, 'plan-nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update diet plan settings', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan());

      const result = await service.updateDietPlan(
        mockUserId, 'plan-1', { autoRenewal: true },
      );

      expect(dietPlanRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should delete diet plan', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan());

      await service.deleteDietPlan(mockUserId, 'plan-1');
      expect(dietPlanRepo.remove).toHaveBeenCalled();
    });
  });

  describe('Plan Actions', () => {
    it('should pause an active plan', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan({ status: 'active' }));

      const result = await service.pausePlan(mockUserId, 'plan-1');
      expect(result.status).toBe('paused');
    });

    it('should resume a paused plan', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan({ status: 'paused' }));

      const result = await service.resumePlan(mockUserId, 'plan-1');
      expect(result.status).toBe('active');
    });

    it('should throw when resuming non-paused plan', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan({ status: 'active' }));

      await expect(
        service.resumePlan(mockUserId, 'plan-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should confirm a plan', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan());

      const result = await service.confirmPlan(mockUserId, 'plan-1');
      expect(result.status).toBe('active');
    });
  });

  describe('Meal Operations', () => {
    it('should skip a meal', async () => {
      const meal = { id: 'meal-1', dietPlanId: 'plan-1', isSkipped: false } as DietPlanMeal;
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan());
      mealRepo.findOne.mockResolvedValue(meal);
      mealRepo.save.mockResolvedValue({ ...meal, isSkipped: true });

      const result = await service.skipMeal(mockUserId, 'plan-1', 'meal-1');
      expect(mealRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing meal', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan());
      mealRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateMeal(mockUserId, 'plan-1', 'meal-nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Generate Meals', () => {
    it('should generate meals for a plan', async () => {
      dietPlanRepo.findOne.mockResolvedValue(createMockPlan());
      healthProfileRepo.findOne.mockResolvedValue(createMockProfile());
      mealRepo.find.mockResolvedValue([]);
      mealRepo.save.mockImplementation(
        (data: unknown) => Promise.resolve(Array.isArray(data) ? data : [data]),
      );

      const result = await service.generateMeals(mockUserId, 'plan-1');
      expect(result.length).toBeGreaterThan(0);
      expect(dietPlanRepo.update).toHaveBeenCalled();
    });
  });
});

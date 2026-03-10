import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DietPlanMeal } from '../entities/diet-plan-meal.entity';
import { DietPlan } from '../entities/diet-plan.entity';
import { HealthProfile } from '../entities/health-profile.entity';

import { CalorieCalculatorService } from './calorie-calculator.service';
import { CreateDietPlanDto, UpdateDietPlanDto } from './dto/create-diet-plan.dto';
import { CreateHealthProfileDto } from './dto/create-health-profile.dto';
import type { NutritionReportDto } from './dto/diet-plan-response.dto';
import type { UpdateMealDto } from './dto/update-meal.dto';
import { MealPlanGeneratorService } from './meal-plan-generator.service';
import type { MockDish } from './mock-dish-database';
import { NutritionTrackerService } from './nutrition-tracker.service';
import { OrderSchedulerService } from './order-scheduler.service';

@Injectable()
export class DietPlannerService {
  private readonly logger = new Logger(DietPlannerService.name);

  constructor(
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
    @InjectRepository(DietPlan)
    private readonly dietPlanRepo: Repository<DietPlan>,
    @InjectRepository(DietPlanMeal)
    private readonly mealRepo: Repository<DietPlanMeal>,
    private readonly calorieCalc: CalorieCalculatorService,
    private readonly mealGenerator: MealPlanGeneratorService,
    private readonly nutritionTracker: NutritionTrackerService,
    private readonly orderScheduler: OrderSchedulerService,
  ) {}

  // ====================================================================
  // Health Profile CRUD
  // ====================================================================

  async createHealthProfile(
    userId: string,
    dto: CreateHealthProfileDto,
  ): Promise<HealthProfile> {
    const existing = await this.healthProfileRepo.findOne({ where: { userId } });
    if (existing) {
      throw new BadRequestException('Health profile already exists. Use PUT to update.');
    }
    const profile = this.healthProfileRepo.create({ userId, ...dto });
    return this.healthProfileRepo.save(profile);
  }

  async getHealthProfile(userId: string): Promise<HealthProfile> {
    const profile = await this.healthProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Health profile not found');
    }
    return profile;
  }

  async updateHealthProfile(
    userId: string,
    dto: Partial<CreateHealthProfileDto>,
  ): Promise<HealthProfile> {
    const profile = await this.getHealthProfile(userId);
    this.applyHealthProfileUpdates(profile, dto);
    return this.healthProfileRepo.save(profile);
  }

  // ====================================================================
  // Diet Plan CRUD
  // ====================================================================

  async createDietPlan(userId: string, dto: CreateDietPlanDto): Promise<DietPlan> {
    await this.verifyProfileOwnership(userId, dto.healthProfileId);
    const weekStart = dto.weekStartDate
      ? new Date(dto.weekStartDate)
      : this.getNextMonday();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const plan = this.dietPlanRepo.create({
      userId,
      healthProfileId: dto.healthProfileId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      autoRenewal: dto.autoRenewal ?? false,
      status: 'active',
    });

    return this.dietPlanRepo.save(plan);
  }

  async listDietPlans(userId: string): Promise<DietPlan[]> {
    return this.dietPlanRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getDietPlan(userId: string, planId: string): Promise<DietPlan> {
    const plan = await this.dietPlanRepo.findOne({
      where: { id: planId },
      relations: ['meals'],
    });
    if (!plan) throw new NotFoundException('Diet plan not found');
    if (plan.userId !== userId) throw new ForbiddenException('Forbidden resource');
    return plan;
  }

  async updateDietPlan(
    userId: string,
    planId: string,
    dto: UpdateDietPlanDto,
  ): Promise<DietPlan> {
    const plan = await this.getDietPlan(userId, planId);
    if (dto.autoRenewal !== undefined) plan.autoRenewal = dto.autoRenewal;
    return this.dietPlanRepo.save(plan);
  }

  async deleteDietPlan(userId: string, planId: string): Promise<void> {
    const plan = await this.getDietPlan(userId, planId);
    await this.dietPlanRepo.remove(plan);
  }

  // ====================================================================
  // Meal Generation & Management
  // ====================================================================

  async generateMeals(userId: string, planId: string): Promise<DietPlanMeal[]> {
    const plan = await this.getDietPlan(userId, planId);
    const profile = await this.getHealthProfile(userId);
    const calorieResult = this.calorieCalc.calculateDailyNeeds({
      weight: Number(profile.weight),
      height: Number(profile.height),
      age: profile.age,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
      healthGoal: profile.healthGoal,
    });

    const dailyCalories = profile.calorieTarget || calorieResult.dailyCalories;
    await this.removeExistingUnlockedMeals(planId);
    const generated = this.mealGenerator.generateWeeklyPlan({
      dailyCalories,
      proteinRatio: Number(profile.proteinRatio),
      carbRatio: Number(profile.carbRatio),
      fatRatio: Number(profile.fatRatio),
      dietaryPreference: profile.dietaryPreference,
      allergies: profile.allergies || [],
      dailyBudget: profile.dailyBudget ? Number(profile.dailyBudget) : null,
      mealFrequency: profile.mealFrequency,
    });

    const meals = generated.map((g) =>
      this.mealRepo.create({ dietPlanId: planId, ...g }),
    );
    const saved = await this.mealRepo.save(meals);
    await this.updatePlanTotals(planId, saved);
    return saved;
  }

  async updateMeal(
    userId: string,
    planId: string,
    mealId: string,
    updates: UpdateMealDto,
  ): Promise<DietPlanMeal> {
    await this.getDietPlan(userId, planId);
    const meal = await this.mealRepo.findOne({ where: { id: mealId, dietPlanId: planId } });
    if (!meal) throw new NotFoundException('Meal not found');
    if (updates.dishId !== undefined) meal.dishId = updates.dishId;
    if (updates.dishName !== undefined) meal.dishName = updates.dishName;
    if (updates.restaurantId !== undefined) meal.restaurantId = updates.restaurantId;
    if (updates.restaurantName !== undefined) meal.restaurantName = updates.restaurantName;
    if (updates.calories !== undefined) meal.calories = updates.calories;
    if (updates.protein !== undefined) meal.protein = updates.protein;
    if (updates.carbs !== undefined) meal.carbs = updates.carbs;
    if (updates.fats !== undefined) meal.fats = updates.fats;
    if (updates.price !== undefined) meal.price = updates.price;
    if (updates.deliveryAddress !== undefined) meal.deliveryAddress = updates.deliveryAddress;
    if (updates.isLocked !== undefined) meal.isLocked = updates.isLocked;
    if (updates.specialInstructions !== undefined) meal.specialInstructions = updates.specialInstructions;
    return this.mealRepo.save(meal);
  }

  async skipMeal(userId: string, planId: string, mealId: string): Promise<DietPlanMeal> {
    await this.getDietPlan(userId, planId);
    const meal = await this.mealRepo.findOne({ where: { id: mealId, dietPlanId: planId } });
    if (!meal) throw new NotFoundException('Meal not found');
    meal.isSkipped = true;
    return this.mealRepo.save(meal);
  }

  async getReplacements(
    userId: string,
    planId: string,
    mealId: string,
    maxPrice?: number,
  ): Promise<MockDish[]> {
    await this.getDietPlan(userId, planId);
    const meal = await this.mealRepo.findOne({ where: { id: mealId, dietPlanId: planId } });
    if (!meal) throw new NotFoundException('Meal not found');

    const profile = await this.getHealthProfile(userId);
    const distribution = this.calorieCalc.getMealCalorieDistribution(
      profile.calorieTarget || 2000,
    );
    const targetCal = distribution[meal.mealType] || 500;

    return this.mealGenerator.getReplacements(
      meal.mealType,
      targetCal,
      profile.dietaryPreference,
      profile.allergies || [],
      maxPrice,
    );
  }

  // ====================================================================
  // Plan Actions
  // ====================================================================

  async confirmPlan(userId: string, planId: string): Promise<DietPlan> {
    const plan = await this.getDietPlan(userId, planId);
    plan.status = 'active';
    return this.dietPlanRepo.save(plan);
  }

  async pausePlan(userId: string, planId: string): Promise<DietPlan> {
    const plan = await this.getDietPlan(userId, planId);
    plan.status = 'paused';
    return this.dietPlanRepo.save(plan);
  }

  async resumePlan(userId: string, planId: string): Promise<DietPlan> {
    const plan = await this.getDietPlan(userId, planId);
    if (plan.status !== 'paused') {
      throw new BadRequestException('Plan is not paused');
    }
    plan.status = 'active';
    return this.dietPlanRepo.save(plan);
  }

  async getNutritionReport(userId: string, planId: string): Promise<NutritionReportDto> {
    const plan = await this.getDietPlan(userId, planId);
    const profile = await this.getHealthProfile(userId);
    const calorieTarget = profile.calorieTarget || 2000;

    return this.nutritionTracker.generateReport(planId, plan.meals || [], calorieTarget);
  }

  // ====================================================================
  // Helpers
  // ====================================================================

  private static readonly SAFE_PROFILE_FIELDS: ReadonlyArray<keyof CreateHealthProfileDto> = [
    'weight', 'targetWeight', 'height', 'age', 'gender',
    'activityLevel', 'healthGoal', 'medicalConditions', 'allergies',
    'dietaryPreference', 'calorieTarget', 'proteinRatio', 'carbRatio',
    'fatRatio', 'mealFrequency', 'dailyBudget',
  ] as const;

  private applyHealthProfileUpdates(
    profile: HealthProfile,
    dto: Partial<CreateHealthProfileDto>,
  ): void {
    for (const field of DietPlannerService.SAFE_PROFILE_FIELDS) {
      if (dto[field] !== undefined) {
        (profile as Record<string, unknown>)[field] = dto[field] ?? null;
      }
    }
  }

  private async verifyProfileOwnership(
    userId: string,
    profileId: string,
  ): Promise<void> {
    const profile = await this.healthProfileRepo.findOne({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException('Health profile not found');
    if (profile.userId !== userId) throw new ForbiddenException('Forbidden resource');
  }

  private getNextMonday(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  private async removeExistingUnlockedMeals(planId: string): Promise<void> {
    const existing = await this.mealRepo.find({ where: { dietPlanId: planId } });
    const unlocked = existing.filter((m) => !m.isLocked);
    if (unlocked.length > 0) {
      await this.mealRepo.remove(unlocked);
    }
  }

  private async updatePlanTotals(
    planId: string,
    meals: DietPlanMeal[],
  ): Promise<void> {
    const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
    const totalCost = meals.reduce((s, m) => s + Number(m.price), 0);
    await this.dietPlanRepo.update(planId, { totalCalories, totalCost });
  }
}

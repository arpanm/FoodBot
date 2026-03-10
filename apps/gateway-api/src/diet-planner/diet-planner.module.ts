import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DietPlanMeal } from '../entities/diet-plan-meal.entity';
import { DietPlan } from '../entities/diet-plan.entity';
import { HealthProfile } from '../entities/health-profile.entity';
import { AuthModule } from '../modules/auth/auth.module';

import { CalorieCalculatorService } from './calorie-calculator.service';
import { DietPlannerController } from './diet-planner.controller';
import { DietPlannerService } from './diet-planner.service';
import { MealPlanGeneratorService } from './meal-plan-generator.service';
import { NutritionTrackerService } from './nutrition-tracker.service';
import { OrderSchedulerService } from './order-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthProfile, DietPlan, DietPlanMeal]),
    AuthModule,
  ],
  controllers: [DietPlannerController],
  providers: [
    DietPlannerService,
    CalorieCalculatorService,
    MealPlanGeneratorService,
    NutritionTrackerService,
    OrderSchedulerService,
  ],
  exports: [
    DietPlannerService,
    CalorieCalculatorService,
    MealPlanGeneratorService,
    NutritionTrackerService,
    OrderSchedulerService,
  ],
})
export class DietPlannerModule {}

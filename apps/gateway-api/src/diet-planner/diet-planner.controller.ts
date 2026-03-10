import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

import { DietPlanMeal } from '../entities/diet-plan-meal.entity';
import { DietPlan } from '../entities/diet-plan.entity';
import { HealthProfile } from '../entities/health-profile.entity';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

import { CreateDietPlanDto, UpdateDietPlanDto } from './dto/create-diet-plan.dto';
import { CreateHealthProfileDto } from './dto/create-health-profile.dto';
import { NutritionReportDto } from './dto/diet-plan-response.dto';
import { ReplaceMealDto } from './dto/update-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { DietPlannerService } from './diet-planner.service';
import type { MockDish } from './mock-dish-database';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('diet-plans')
@UseGuards(JwtAuthGuard)
export class DietPlannerController {
  constructor(private readonly dietPlannerService: DietPlannerService) {}

  // =================================================================
  // Health Profile Endpoints
  // =================================================================

  @Post('health-profiles')
  createHealthProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateHealthProfileDto,
  ): Promise<HealthProfile> {
    return this.dietPlannerService.createHealthProfile(req.user.userId, dto);
  }

  @Get('health-profiles')
  getHealthProfile(@Req() req: AuthenticatedRequest): Promise<HealthProfile> {
    return this.dietPlannerService.getHealthProfile(req.user.userId);
  }

  @Put('health-profiles')
  updateHealthProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: Partial<CreateHealthProfileDto>,
  ): Promise<HealthProfile> {
    return this.dietPlannerService.updateHealthProfile(req.user.userId, dto);
  }

  // =================================================================
  // Diet Plan CRUD Endpoints
  // =================================================================

  @Post()
  createDietPlan(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDietPlanDto,
  ): Promise<DietPlan> {
    return this.dietPlannerService.createDietPlan(req.user.userId, dto);
  }

  @Get()
  listDietPlans(@Req() req: AuthenticatedRequest): Promise<DietPlan[]> {
    return this.dietPlannerService.listDietPlans(req.user.userId);
  }

  @Get(':id')
  getDietPlan(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DietPlan> {
    return this.dietPlannerService.getDietPlan(req.user.userId, id);
  }

  @Put(':id')
  updateDietPlan(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDietPlanDto,
  ): Promise<DietPlan> {
    return this.dietPlannerService.updateDietPlan(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDietPlan(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.dietPlannerService.deleteDietPlan(req.user.userId, id);
  }

  // =================================================================
  // Meal Generation & Management Endpoints
  // =================================================================

  @Post(':id/generate')
  generateMeals(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DietPlanMeal[]> {
    return this.dietPlannerService.generateMeals(req.user.userId, id);
  }

  @Put(':id/meals/:mealId')
  updateMeal(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('mealId') mealId: string,
    @Body() dto: UpdateMealDto,
  ): Promise<DietPlanMeal> {
    return this.dietPlannerService.updateMeal(
      req.user.userId, id, mealId, dto,
    );
  }

  @Post(':id/meals/:mealId/skip')
  @HttpCode(HttpStatus.OK)
  skipMeal(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('mealId') mealId: string,
  ): Promise<DietPlanMeal> {
    return this.dietPlannerService.skipMeal(req.user.userId, id, mealId);
  }

  @Post(':id/meals/:mealId/replace')
  @HttpCode(HttpStatus.OK)
  getReplacements(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('mealId') mealId: string,
    @Body() dto: ReplaceMealDto,
  ): Promise<MockDish[]> {
    return this.dietPlannerService.getReplacements(
      req.user.userId, id, mealId, dto.maxPrice,
    );
  }

  // =================================================================
  // Plan Action Endpoints
  // =================================================================

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmPlan(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DietPlan> {
    return this.dietPlannerService.confirmPlan(req.user.userId, id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pausePlan(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DietPlan> {
    return this.dietPlannerService.pausePlan(req.user.userId, id);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resumePlan(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DietPlan> {
    return this.dietPlannerService.resumePlan(req.user.userId, id);
  }

  @Get(':id/nutrition')
  getNutritionReport(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<NutritionReportDto> {
    return this.dietPlannerService.getNutritionReport(req.user.userId, id);
  }
}

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

import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

import { CostCalculatorService } from './cost-calculator.service';
import { CreatePartyPlanDto } from './dto/create-party-plan.dto';
import { GenerateMenuDto } from './dto/generate-menu.dto';
import {
  CostBreakdownResponse,
  PartyPlanResponse,
  MenuItemResponse,
} from './dto/party-plan-response.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdatePartyPlanDto } from './dto/update-party-plan.dto';
import { MenuGeneratorService } from './menu-generator.service';
import {
  OrderSchedulerService,
  ScheduleResult,
} from './order-scheduler.service';
import { PartyPlannerService } from './party-planner.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('party-plans')
@UseGuards(JwtAuthGuard)
export class PartyPlannerController {
  constructor(
    private readonly partyPlannerService: PartyPlannerService,
    private readonly menuGeneratorService: MenuGeneratorService,
    private readonly costCalculatorService: CostCalculatorService,
    private readonly orderSchedulerService: OrderSchedulerService,
  ) {}

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePartyPlanDto
  ): Promise<PartyPlanResponse> {
    return this.partyPlannerService.create(req.user.userId, dto);
  }

  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest
  ): Promise<PartyPlanResponse[]> {
    return this.partyPlannerService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<PartyPlanResponse> {
    return this.partyPlannerService.findById(id, req.user.userId);
  }

  @Put(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePartyPlanDto
  ): Promise<PartyPlanResponse> {
    return this.partyPlannerService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<PartyPlanResponse> {
    return this.partyPlannerService.cancel(id, req.user.userId);
  }

  @Post(':id/generate-menu')
  async generateMenu(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: GenerateMenuDto
  ): Promise<MenuItemResponse[]> {
    const plan = await this.partyPlannerService.getPlanWithAuth(
      id, req.user.userId
    );
    const generatedItems = this.menuGeneratorService.generateMenu(plan, dto);
    return this.partyPlannerService.saveMenuItems(
      id, req.user.userId, generatedItems
    );
  }

  @Put(':id/menu')
  async updateMenu(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() items: UpdateMenuItemDto[]
  ): Promise<MenuItemResponse[]> {
    return this.partyPlannerService.saveMenuItems(
      id, req.user.userId, items
    );
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<ScheduleResult> {
    await this.partyPlannerService.getPlanWithAuth(id, req.user.userId);
    return this.orderSchedulerService.confirmAndSchedule(id);
  }

  @Get(':id/cost')
  async getCostBreakdown(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<CostBreakdownResponse> {
    const plan = await this.partyPlannerService.getPlanWithAuth(
      id, req.user.userId
    );
    const menuItems = await this.partyPlannerService.getMenuItemsByPlanId(id);
    return this.costCalculatorService.calculateCostBreakdown(plan, menuItems);
  }
}

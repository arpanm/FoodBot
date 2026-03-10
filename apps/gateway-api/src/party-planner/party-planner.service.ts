import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PartyPlanMenu } from '../entities/party-plan-menu.entity';
import { PartyPlan, PartyPlanStatus } from '../entities/party-plan.entity';

import { CreatePartyPlanDto } from './dto/create-party-plan.dto';
import { MenuItemResponse, PartyPlanResponse } from './dto/party-plan-response.dto';
import { UpdatePartyPlanDto } from './dto/update-party-plan.dto';

@Injectable()
export class PartyPlannerService {
  private readonly logger = new Logger(PartyPlannerService.name);

  constructor(
    @InjectRepository(PartyPlan)
    private readonly planRepository: Repository<PartyPlan>,
    @InjectRepository(PartyPlanMenu)
    private readonly menuRepository: Repository<PartyPlanMenu>,
  ) {}

  async create(
    userId: string,
    dto: CreatePartyPlanDto
  ): Promise<PartyPlanResponse> {
    this.validateGuestCounts(dto.guestCount);

    const plan = this.planRepository.create({
      userId,
      eventName: dto.eventName,
      eventDate: dto.eventDate,
      eventTime: dto.eventTime,
      venueAddress: dto.venueAddress,
      guestCount: dto.guestCount,
      budget: dto.budget,
      cuisinePreferences: dto.cuisinePreferences,
      coursePreferences: dto.coursePreferences,
      specialRequirements: dto.specialRequirements ?? null,
      eventType: dto.eventType,
      serviceType: dto.serviceType,
      status: PartyPlanStatus.PLANNING,
    });

    const saved = await this.planRepository.save(plan);
    this.logger.log(`Party plan ${saved.id} created by user ${userId}`);
    return this.toResponse(saved, []);
  }

  async findAllByUser(userId: string): Promise<PartyPlanResponse[]> {
    const plans = await this.planRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const responses: PartyPlanResponse[] = [];
    for (const plan of plans) {
      const menuItems = await this.menuRepository.find({
        where: { partyPlanId: plan.id },
      });
      responses.push(this.toResponse(plan, menuItems));
    }

    return responses;
  }

  async findById(
    planId: string,
    userId: string
  ): Promise<PartyPlanResponse> {
    const plan = await this.getPlanWithAuth(planId, userId);
    const menuItems = await this.menuRepository.find({
      where: { partyPlanId: plan.id },
    });
    return this.toResponse(plan, menuItems);
  }

  async update(
    planId: string,
    userId: string,
    dto: UpdatePartyPlanDto
  ): Promise<PartyPlanResponse> {
    const plan = await this.getPlanWithAuth(planId, userId);

    if (plan.status !== PartyPlanStatus.PLANNING) {
      throw new BadRequestException(
        'Can only update plans in planning status'
      );
    }

    if (dto.guestCount) {
      const merged = { ...plan.guestCount, ...dto.guestCount };
      this.validateGuestCounts(merged);
    }

    this.applyUpdates(plan, dto);
    const saved = await this.planRepository.save(plan);

    const menuItems = await this.menuRepository.find({
      where: { partyPlanId: saved.id },
    });

    this.logger.log(`Party plan ${planId} updated by user ${userId}`);
    return this.toResponse(saved, menuItems);
  }

  async cancel(planId: string, userId: string): Promise<PartyPlanResponse> {
    const plan = await this.getPlanWithAuth(planId, userId);

    if (plan.status === PartyPlanStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered plan');
    }
    if (plan.status === PartyPlanStatus.CANCELLED) {
      throw new BadRequestException('Plan is already cancelled');
    }

    plan.status = PartyPlanStatus.CANCELLED;
    const saved = await this.planRepository.save(plan);

    const menuItems = await this.menuRepository.find({
      where: { partyPlanId: saved.id },
    });

    this.logger.log(`Party plan ${planId} cancelled by user ${userId}`);
    return this.toResponse(saved, menuItems);
  }

  async saveMenuItems(
    planId: string,
    userId: string,
    items: Partial<PartyPlanMenu>[]
  ): Promise<MenuItemResponse[]> {
    await this.getPlanWithAuth(planId, userId);

    await this.menuRepository.delete({ partyPlanId: planId });

    const menuItems: PartyPlanMenu[] = [];
    for (const item of items) {
      const entity = this.menuRepository.create({
        ...item,
        partyPlanId: planId,
        version: 1,
      });
      const saved = await this.menuRepository.save(entity);
      menuItems.push(saved);
    }

    return menuItems.map(this.toMenuItemResponse);
  }

  async getMenuItemsByPlanId(planId: string): Promise<PartyPlanMenu[]> {
    return this.menuRepository.find({ where: { partyPlanId: planId } });
  }

  async getPlanWithAuth(
    planId: string,
    userId: string
  ): Promise<PartyPlan> {
    const plan = await this.planRepository.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Party plan not found');
    }

    if (plan.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this party plan'
      );
    }

    return plan;
  }

  private validateGuestCounts(guestCount: {
    total: number;
    veg: number;
    nonVeg: number;
    vegan: number;
  }): void {
    const sum = guestCount.veg + guestCount.nonVeg + guestCount.vegan;
    if (sum > guestCount.total) {
      throw new BadRequestException(
        'Sum of veg, nonVeg, and vegan guests cannot exceed total'
      );
    }
  }

  private applyUpdates(
    plan: PartyPlan,
    dto: UpdatePartyPlanDto
  ): void {
    if (dto.eventName !== undefined) plan.eventName = dto.eventName;
    if (dto.eventDate !== undefined) plan.eventDate = dto.eventDate;
    if (dto.eventTime !== undefined) plan.eventTime = dto.eventTime;
    if (dto.venueAddress !== undefined) plan.venueAddress = dto.venueAddress;
    if (dto.cuisinePreferences !== undefined) {
      plan.cuisinePreferences = dto.cuisinePreferences;
    }
    if (dto.coursePreferences !== undefined) {
      plan.coursePreferences = dto.coursePreferences;
    }
    if (dto.specialRequirements !== undefined) {
      plan.specialRequirements = dto.specialRequirements;
    }
    if (dto.eventType !== undefined) plan.eventType = dto.eventType;
    if (dto.serviceType !== undefined) plan.serviceType = dto.serviceType;
    if (dto.guestCount !== undefined) {
      plan.guestCount = { ...plan.guestCount, ...dto.guestCount };
    }
    if (dto.budget !== undefined) {
      plan.budget = { ...plan.budget, ...dto.budget };
    }
  }

  private toResponse(
    plan: PartyPlan,
    menuItems: PartyPlanMenu[]
  ): PartyPlanResponse {
    return {
      id: plan.id,
      userId: plan.userId,
      eventName: plan.eventName,
      eventDate: plan.eventDate,
      eventTime: plan.eventTime,
      venueAddress: plan.venueAddress,
      guestCount: plan.guestCount,
      budget: plan.budget,
      cuisinePreferences: plan.cuisinePreferences,
      coursePreferences: plan.coursePreferences,
      specialRequirements: plan.specialRequirements,
      eventType: plan.eventType,
      serviceType: plan.serviceType,
      status: plan.status,
      menuItems: menuItems.map(this.toMenuItemResponse),
      createdAt: plan.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: plan.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  private toMenuItemResponse(item: PartyPlanMenu): MenuItemResponse {
    return {
      id: item.id,
      dishId: item.dishId,
      dishName: item.dishName,
      restaurantId: item.restaurantId,
      restaurantName: item.restaurantName,
      quantity: item.quantity,
      pricePerUnit: Number(item.pricePerUnit),
      totalPrice: Number(item.totalPrice),
      category: item.category,
      dietaryType: item.dietaryType,
      version: item.version,
    };
  }
}

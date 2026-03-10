import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PartyPlanMenu } from '../entities/party-plan-menu.entity';
import { PartyPlan, PartyPlanStatus } from '../entities/party-plan.entity';

export interface ScheduleResult {
  partyPlanId: string;
  scheduledOrderTime: string;
  validationTime: string;
  status: string;
  restaurantOrders: RestaurantOrderSummary[];
}

export interface RestaurantOrderSummary {
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
  estimatedTotal: number;
}

@Injectable()
export class OrderSchedulerService {
  private readonly logger = new Logger(OrderSchedulerService.name);

  constructor(
    @InjectRepository(PartyPlan)
    private readonly partyPlanRepository: Repository<PartyPlan>,
    @InjectRepository(PartyPlanMenu)
    private readonly menuRepository: Repository<PartyPlanMenu>,
  ) {}

  async confirmAndSchedule(planId: string): Promise<ScheduleResult> {
    const plan = await this.partyPlanRepository.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('Party plan not found');
    }

    this.validatePlanForConfirmation(plan);

    const menuItems = await this.menuRepository.find({
      where: { partyPlanId: planId },
    });

    if (menuItems.length === 0) {
      throw new BadRequestException(
        'Cannot confirm a plan without menu items'
      );
    }

    plan.status = PartyPlanStatus.CONFIRMED;
    await this.partyPlanRepository.save(plan);

    const scheduledTime = this.calculateScheduledOrderTime(plan);
    const validationTime = this.calculateValidationTime(plan);
    const restaurantOrders = this.buildRestaurantOrders(menuItems);

    this.logger.log(
      `Plan ${planId} confirmed. Scheduled for ${scheduledTime}`
    );

    return {
      partyPlanId: plan.id,
      scheduledOrderTime: scheduledTime,
      validationTime,
      status: 'confirmed',
      restaurantOrders,
    };
  }

  async cancelScheduledPlan(planId: string): Promise<PartyPlan> {
    const plan = await this.partyPlanRepository.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('Party plan not found');
    }

    if (plan.status === PartyPlanStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered plan');
    }

    if (plan.status === PartyPlanStatus.CANCELLED) {
      throw new BadRequestException('Plan is already cancelled');
    }

    plan.status = PartyPlanStatus.CANCELLED;
    const saved = await this.partyPlanRepository.save(plan);

    this.logger.log(`Plan ${planId} has been cancelled`);
    return saved;
  }

  validatePlanForConfirmation(plan: PartyPlan): void {
    if (plan.status !== PartyPlanStatus.PLANNING) {
      throw new BadRequestException(
        `Cannot confirm a plan with status '${plan.status}'`
      );
    }

    const eventDate = new Date(`${plan.eventDate}T${plan.eventTime}`);
    const now = new Date();
    const hoursUntilEvent =
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24) {
      throw new BadRequestException(
        'Event must be at least 24 hours in the future to confirm'
      );
    }
  }

  calculateScheduledOrderTime(plan: PartyPlan): string {
    const eventDate = new Date(`${plan.eventDate}T${plan.eventTime}`);
    const orderTime = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
    return orderTime.toISOString();
  }

  calculateValidationTime(plan: PartyPlan): string {
    const eventDate = new Date(`${plan.eventDate}T${plan.eventTime}`);
    const validationTime = new Date(
      eventDate.getTime() - 24 * 60 * 60 * 1000
    );
    return validationTime.toISOString();
  }

  buildRestaurantOrders(
    menuItems: PartyPlanMenu[]
  ): RestaurantOrderSummary[] {
    const restaurantMap = new Map<string, RestaurantOrderSummary>();

    for (const item of menuItems) {
      const existing = restaurantMap.get(item.restaurantId);
      if (existing) {
        existing.itemCount += 1;
        existing.estimatedTotal += Number(item.totalPrice);
      } else {
        restaurantMap.set(item.restaurantId, {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          itemCount: 1,
          estimatedTotal: Number(item.totalPrice),
        });
      }
    }

    return Array.from(restaurantMap.values()).map((summary) => ({
      ...summary,
      estimatedTotal: Math.round(summary.estimatedTotal * 100) / 100,
    }));
  }
}

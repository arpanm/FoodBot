import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PartyPlanMenu } from '../entities/party-plan-menu.entity';
import { PartyPlan } from '../entities/party-plan.entity';
import { AuthModule } from '../modules/auth/auth.module';

import { CostCalculatorService } from './cost-calculator.service';
import { MenuGeneratorService } from './menu-generator.service';
import { OrderSchedulerService } from './order-scheduler.service';
import { PartyPlannerController } from './party-planner.controller';
import { PartyPlannerService } from './party-planner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartyPlan, PartyPlanMenu]),
    AuthModule,
  ],
  controllers: [PartyPlannerController],
  providers: [
    PartyPlannerService,
    MenuGeneratorService,
    CostCalculatorService,
    OrderSchedulerService,
  ],
  exports: [PartyPlannerService, OrderSchedulerService],
})
export class PartyPlannerModule {}

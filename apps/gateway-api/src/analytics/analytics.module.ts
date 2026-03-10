import { Module } from '@nestjs/common';

import { AuthModule } from '../modules/auth/auth.module';

import { AnalyticsAggregatorService } from './analytics-aggregator.service';
import { AnalyticsController } from './analytics.controller';
import { CustomerAnalyticsService } from './customer-analytics.service';
import { MenuAnalyticsService } from './menu-analytics.service';
import { OrderAnalyticsService } from './order-analytics.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [
    RevenueAnalyticsService,
    OrderAnalyticsService,
    CustomerAnalyticsService,
    MenuAnalyticsService,
    AnalyticsAggregatorService,
  ],
  exports: [
    RevenueAnalyticsService,
    OrderAnalyticsService,
    CustomerAnalyticsService,
    MenuAnalyticsService,
    AnalyticsAggregatorService,
  ],
})
export class AnalyticsModule {}

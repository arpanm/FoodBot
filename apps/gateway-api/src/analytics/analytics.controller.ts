import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';

import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

import { AnalyticsAggregatorService } from './analytics-aggregator.service';
import { CustomerAnalyticsService } from './customer-analytics.service';
import { MenuAnalyticsService } from './menu-analytics.service';
import { OrderAnalyticsService } from './order-analytics.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import {
  AnalyticsReport,
  CustomerMetrics,
  DateRange,
  MenuMetrics,
  OrderMetrics,
  OrderRecord,
  RevenueMetrics,
} from './types/analytics.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly revenueAnalytics: RevenueAnalyticsService,
    private readonly orderAnalytics: OrderAnalyticsService,
    private readonly customerAnalytics: CustomerAnalyticsService,
    private readonly menuAnalytics: MenuAnalyticsService,
    private readonly aggregator: AnalyticsAggregatorService
  ) {}

  @Get('revenue')
  getRevenueAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('restaurantId') restaurantId: string
  ): RevenueMetrics {
    this.logger.log('Revenue analytics requested');
    const dateRange = this.parseDateRange(startDate, endDate);
    const orders = this.getOrdersForRestaurant(restaurantId);
    return this.revenueAnalytics.calculateRevenue(orders, dateRange);
  }

  @Get('orders')
  getOrderAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('restaurantId') restaurantId: string
  ): OrderMetrics {
    this.logger.log('Order analytics requested');
    const dateRange = this.parseDateRange(startDate, endDate);
    const orders = this.getOrdersForRestaurant(restaurantId);
    return this.orderAnalytics.calculateOrderMetrics(orders, dateRange);
  }

  @Get('customers')
  getCustomerAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('restaurantId') restaurantId: string
  ): CustomerMetrics {
    this.logger.log('Customer analytics requested');
    const dateRange = this.parseDateRange(startDate, endDate);
    const orders = this.getOrdersForRestaurant(restaurantId);
    return this.customerAnalytics.calculateCustomerMetrics(orders, dateRange);
  }

  @Get('menu')
  getMenuAnalytics(
    @Query('restaurantId') restaurantId: string
  ): MenuMetrics {
    this.logger.log('Menu analytics requested');
    const orders = this.getOrdersForRestaurant(restaurantId);
    return this.menuAnalytics.calculateMenuMetrics(orders, 10);
  }

  @Get('report')
  getFullReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('restaurantId') restaurantId: string
  ): AnalyticsReport {
    this.logger.log('Full analytics report requested');
    const dateRange = this.parseDateRange(startDate, endDate);
    const orders = this.getOrdersForRestaurant(restaurantId);
    return this.aggregator.generateReport(restaurantId, orders, dateRange);
  }

  @Get('export')
  exportReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('restaurantId') restaurantId: string,
    @Query('format') format: string
  ): string {
    this.logger.log(`Export requested in ${format} format`);
    const dateRange = this.parseDateRange(startDate, endDate);
    const orders = this.getOrdersForRestaurant(restaurantId);
    const report = this.aggregator.generateReport(
      restaurantId,
      orders,
      dateRange
    );
    const exportFormat = format === 'csv' ? 'csv' : 'json';
    return this.aggregator.exportReport(report, exportFormat);
  }

  private parseDateRange(startDate: string, endDate: string): DateRange {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  }

  private getOrdersForRestaurant(_restaurantId: string): OrderRecord[] {
    return [];
  }
}

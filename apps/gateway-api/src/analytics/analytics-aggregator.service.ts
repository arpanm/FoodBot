import { Injectable, Logger } from '@nestjs/common';

import { CustomerAnalyticsService } from './customer-analytics.service';
import { MenuAnalyticsService } from './menu-analytics.service';
import { OrderAnalyticsService } from './order-analytics.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { AnalyticsReport, DateRange, OrderRecord } from './types/analytics.types';

type ExportFormat = 'json' | 'csv';

@Injectable()
export class AnalyticsAggregatorService {
  private readonly logger = new Logger(AnalyticsAggregatorService.name);

  constructor(
    private readonly revenueAnalytics: RevenueAnalyticsService,
    private readonly orderAnalytics: OrderAnalyticsService,
    private readonly customerAnalytics: CustomerAnalyticsService,
    private readonly menuAnalytics: MenuAnalyticsService
  ) {}

  generateReport(
    restaurantId: string,
    orders: OrderRecord[],
    dateRange: DateRange
  ): AnalyticsReport {
    this.logger.log(
      `Generating analytics report for restaurant ${restaurantId}`
    );

    const restaurantOrders = orders.filter(
      (o) => o.restaurantId === restaurantId
    );

    return {
      restaurantId,
      dateRange,
      generatedAt: new Date(),
      revenue: this.revenueAnalytics.calculateRevenue(restaurantOrders, dateRange),
      orders: this.orderAnalytics.calculateOrderMetrics(restaurantOrders, dateRange),
      customers: this.customerAnalytics.calculateCustomerMetrics(
        restaurantOrders,
        dateRange
      ),
      menu: this.menuAnalytics.calculateMenuMetrics(restaurantOrders, 10),
    };
  }

  exportReport(
    report: AnalyticsReport,
    format: ExportFormat
  ): string {
    this.logger.log(
      `Exporting report for restaurant ${report.restaurantId} as ${format}`
    );

    if (format === 'csv') {
      return this.exportAsCsv(report);
    }
    return this.exportAsJson(report);
  }

  private exportAsJson(report: AnalyticsReport): string {
    return JSON.stringify(report, null, 2);
  }

  private exportAsCsv(report: AnalyticsReport): string {
    const lines: string[] = [];

    lines.push('Section,Metric,Value');
    lines.push(...this.revenueToCsv(report));
    lines.push(...this.ordersToCsv(report));
    lines.push(...this.customersToCsv(report));
    lines.push(...this.menuToCsv(report));

    return lines.join('\n');
  }

  private revenueToCsv(report: AnalyticsReport): string[] {
    const lines: string[] = [];
    lines.push(`Revenue,Total Revenue,${report.revenue.totalRevenue}`);
    lines.push(
      `Revenue,Average Order Value,${report.revenue.averageOrderValue}`
    );
    for (const day of report.revenue.revenueByDay) {
      lines.push(`Revenue by Day,${day.date},${day.revenue}`);
    }
    return lines;
  }

  private ordersToCsv(report: AnalyticsReport): string[] {
    const lines: string[] = [];
    lines.push(`Orders,Total Orders,${report.orders.totalOrders}`);
    lines.push(`Orders,Completed Orders,${report.orders.completedOrders}`);
    lines.push(`Orders,Cancelled Orders,${report.orders.cancelledOrders}`);
    lines.push(
      `Orders,Average Prep Time,${report.orders.averagePrepTime ?? 'N/A'}`
    );
    lines.push(
      `Orders,Average Delivery Time,${report.orders.averageDeliveryTime ?? 'N/A'}`
    );
    return lines;
  }

  private customersToCsv(report: AnalyticsReport): string[] {
    const lines: string[] = [];
    lines.push(`Customers,Total Customers,${report.customers.totalCustomers}`);
    lines.push(`Customers,New Customers,${report.customers.newCustomers}`);
    lines.push(
      `Customers,Returning Customers,${report.customers.returningCustomers}`
    );
    lines.push(
      `Customers,Retention Rate,${report.customers.customerRetentionRate}`
    );
    return lines;
  }

  private menuToCsv(report: AnalyticsReport): string[] {
    const lines: string[] = [];
    for (const dish of report.menu.topSellingDishes) {
      lines.push(
        `Top Selling,${dish.dishName},${dish.quantitySold}`
      );
    }
    return lines;
  }
}

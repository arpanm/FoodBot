import { Injectable, Logger } from '@nestjs/common';

import {
  DateRange,
  OrderRecord,
  RevenueByCategory,
  RevenueByDay,
  RevenueByDish,
  RevenueComparison,
  RevenueMetrics,
} from './types/analytics.types';

@Injectable()
export class RevenueAnalyticsService {
  private readonly logger = new Logger(RevenueAnalyticsService.name);

  calculateRevenue(orders: OrderRecord[], dateRange: DateRange): RevenueMetrics {
    const filtered = this.filterByDateRange(
      this.filterCompleted(orders),
      dateRange
    );

    this.logger.log(`Calculating revenue for ${filtered.length} completed orders`);

    return {
      totalRevenue: this.computeTotalRevenue(filtered),
      averageOrderValue: this.computeAverageOrderValue(filtered),
      revenueByDay: this.computeRevenueByDay(filtered),
      revenueByDish: this.computeRevenueByDish(filtered),
      revenueByCategory: this.computeRevenueByCategory(filtered),
    };
  }

  revenueByDish(orders: OrderRecord[], dateRange: DateRange): RevenueByDish[] {
    const filtered = this.filterByDateRange(
      this.filterCompleted(orders),
      dateRange
    );
    return this.computeRevenueByDish(filtered);
  }

  revenueByCategory(orders: OrderRecord[], dateRange: DateRange): RevenueByCategory[] {
    const filtered = this.filterByDateRange(
      this.filterCompleted(orders),
      dateRange
    );
    return this.computeRevenueByCategory(filtered);
  }

  revenueComparison(
    orders: OrderRecord[],
    period1: DateRange,
    period2: DateRange
  ): RevenueComparison {
    const completed = this.filterCompleted(orders);
    const period1Revenue = this.computeTotalRevenue(
      this.filterByDateRange(completed, period1)
    );
    const period2Revenue = this.computeTotalRevenue(
      this.filterByDateRange(completed, period2)
    );
    const changeAmount = period2Revenue - period1Revenue;
    const changePercentage =
      period1Revenue === 0 ? 0 : (changeAmount / period1Revenue) * 100;

    return {
      period1Revenue: this.roundToTwo(period1Revenue),
      period2Revenue: this.roundToTwo(period2Revenue),
      changeAmount: this.roundToTwo(changeAmount),
      changePercentage: this.roundToTwo(changePercentage),
    };
  }

  averageOrderValue(orders: OrderRecord[], dateRange: DateRange): number {
    const filtered = this.filterByDateRange(
      this.filterCompleted(orders),
      dateRange
    );
    return this.computeAverageOrderValue(filtered);
  }

  private filterCompleted(orders: OrderRecord[]): OrderRecord[] {
    return orders.filter((order) => order.status === 'completed');
  }

  private filterByDateRange(orders: OrderRecord[], dateRange: DateRange): OrderRecord[] {
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    });
  }

  private computeTotalRevenue(orders: OrderRecord[]): number {
    const total = orders.reduce((sum, order) => sum + order.total, 0);
    return this.roundToTwo(total);
  }

  private computeAverageOrderValue(orders: OrderRecord[]): number {
    if (orders.length === 0) {
      return 0;
    }
    const total = this.computeTotalRevenue(orders);
    return this.roundToTwo(total / orders.length);
  }

  private computeRevenueByDay(orders: OrderRecord[]): RevenueByDay[] {
    const dayMap = new Map<string, number>();

    for (const order of orders) {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0] as string;
      const existing = dayMap.get(dateKey) ?? 0;
      dayMap.set(dateKey, existing + order.total);
    }

    return Array.from(dayMap.entries())
      .map(([date, revenue]) => ({ date, revenue: this.roundToTwo(revenue) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private computeRevenueByDish(orders: OrderRecord[]): RevenueByDish[] {
    const dishMap = new Map<string, RevenueByDish>();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = dishMap.get(item.dishId);
        if (existing) {
          existing.revenue += item.price * item.quantity;
          existing.quantitySold += item.quantity;
        } else {
          dishMap.set(item.dishId, {
            dishId: item.dishId,
            dishName: item.dishName,
            revenue: item.price * item.quantity,
            quantitySold: item.quantity,
          });
        }
      }
    }

    return Array.from(dishMap.values())
      .map((dish) => ({ ...dish, revenue: this.roundToTwo(dish.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private computeRevenueByCategory(orders: OrderRecord[]): RevenueByCategory[] {
    const categoryMap = new Map<string, RevenueByCategory>();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = categoryMap.get(item.category);
        if (existing) {
          existing.revenue += item.price * item.quantity;
          existing.quantitySold += item.quantity;
        } else {
          categoryMap.set(item.category, {
            category: item.category,
            revenue: item.price * item.quantity,
            quantitySold: item.quantity,
          });
        }
      }
    }

    return Array.from(categoryMap.values())
      .map((cat) => ({ ...cat, revenue: this.roundToTwo(cat.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

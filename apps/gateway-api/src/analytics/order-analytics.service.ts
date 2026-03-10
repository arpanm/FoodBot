import { Injectable, Logger } from '@nestjs/common';

import {
  AnalyticsPeriod,
  DateRange,
  OrderMetrics,
  OrderRecord,
  PeakHour,
} from './types/analytics.types';

interface OrderVolumeTrend {
  period: string;
  orderCount: number;
}

interface CancellationAnalysis {
  totalCancelled: number;
  cancellationRate: number;
}

interface PrepTimeAnalysis {
  averagePrepTime: number | null;
  minPrepTime: number | null;
  maxPrepTime: number | null;
}

@Injectable()
export class OrderAnalyticsService {
  private readonly logger = new Logger(OrderAnalyticsService.name);

  calculateOrderMetrics(orders: OrderRecord[], dateRange: DateRange): OrderMetrics {
    const filtered = this.filterByDateRange(orders, dateRange);

    this.logger.log(`Calculating order metrics for ${filtered.length} orders`);

    const completed = filtered.filter((o) => o.status === 'completed');
    const cancelled = filtered.filter((o) => o.status === 'cancelled');

    return {
      totalOrders: filtered.length,
      completedOrders: completed.length,
      cancelledOrders: cancelled.length,
      averagePrepTime: this.computeAveragePrepTime(completed),
      averageDeliveryTime: this.computeAverageDeliveryTime(completed),
      peakHours: this.computePeakHours(filtered),
    };
  }

  orderVolumeTrends(
    orders: OrderRecord[],
    period: AnalyticsPeriod
  ): OrderVolumeTrend[] {
    const periodMap = new Map<string, number>();

    for (const order of orders) {
      const key = this.getPeriodKey(new Date(order.createdAt), period);
      const existing = periodMap.get(key) ?? 0;
      periodMap.set(key, existing + 1);
    }

    return Array.from(periodMap.entries())
      .map(([periodKey, orderCount]) => ({ period: periodKey, orderCount }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  peakHourAnalysis(orders: OrderRecord[]): PeakHour[] {
    return this.computePeakHours(orders);
  }

  completionRate(orders: OrderRecord[]): number {
    if (orders.length === 0) {
      return 0;
    }
    const completed = orders.filter((o) => o.status === 'completed').length;
    return this.roundToTwo((completed / orders.length) * 100);
  }

  cancellationAnalysis(orders: OrderRecord[]): CancellationAnalysis {
    const totalCancelled = orders.filter((o) => o.status === 'cancelled').length;
    const cancellationRate =
      orders.length === 0
        ? 0
        : this.roundToTwo((totalCancelled / orders.length) * 100);

    return { totalCancelled, cancellationRate };
  }

  prepTimeAnalysis(orders: OrderRecord[]): PrepTimeAnalysis {
    const prepTimes = orders
      .filter((o) => o.prepTimeMinutes !== null)
      .map((o) => o.prepTimeMinutes as number);

    if (prepTimes.length === 0) {
      return { averagePrepTime: null, minPrepTime: null, maxPrepTime: null };
    }

    return {
      averagePrepTime: this.roundToTwo(
        prepTimes.reduce((sum, t) => sum + t, 0) / prepTimes.length
      ),
      minPrepTime: Math.min(...prepTimes),
      maxPrepTime: Math.max(...prepTimes),
    };
  }

  private filterByDateRange(orders: OrderRecord[], dateRange: DateRange): OrderRecord[] {
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    });
  }

  private computeAveragePrepTime(orders: OrderRecord[]): number | null {
    const prepTimes = orders
      .filter((o) => o.prepTimeMinutes !== null)
      .map((o) => o.prepTimeMinutes as number);

    if (prepTimes.length === 0) {
      return null;
    }

    return this.roundToTwo(
      prepTimes.reduce((sum, t) => sum + t, 0) / prepTimes.length
    );
  }

  private computeAverageDeliveryTime(orders: OrderRecord[]): number | null {
    const deliveryTimes = orders
      .filter((o) => o.deliveryTimeMinutes !== null)
      .map((o) => o.deliveryTimeMinutes as number);

    if (deliveryTimes.length === 0) {
      return null;
    }

    return this.roundToTwo(
      deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
    );
  }

  private computePeakHours(orders: OrderRecord[]): PeakHour[] {
    const hourMap = new Map<number, number>();

    for (const order of orders) {
      const hour = new Date(order.createdAt).getUTCHours();
      const existing = hourMap.get(hour) ?? 0;
      hourMap.set(hour, existing + 1);
    }

    return Array.from(hourMap.entries())
      .map(([hour, orderCount]) => ({ hour, orderCount }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }

  private getPeriodKey(date: Date, period: AnalyticsPeriod): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (period) {
      case 'daily':
        return `${year}-${month}-${day}`;
      case 'weekly':
        return this.getWeekKey(date);
      case 'monthly':
        return `${year}-${month}`;
      case 'yearly':
        return `${year}`;
    }
  }

  private getWeekKey(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diffMs = date.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((dayOfYear + 1) / 7);
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

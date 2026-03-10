import { Injectable, Logger } from '@nestjs/common';

import {
  CustomerMetrics,
  DateRange,
  OrderRecord,
  TopCustomer,
} from './types/analytics.types';

interface CustomerSegment {
  segment: string;
  customerCount: number;
  totalSpent: number;
}

interface CustomerLifetimeValue {
  customerId: string;
  totalSpent: number;
  orderCount: number;
  averageOrderValue: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
}

@Injectable()
export class CustomerAnalyticsService {
  private readonly logger = new Logger(CustomerAnalyticsService.name);

  calculateCustomerMetrics(
    orders: OrderRecord[],
    dateRange: DateRange
  ): CustomerMetrics {
    const filtered = this.filterByDateRange(orders, dateRange);
    const completedOrders = filtered.filter((o) => o.status === 'completed');

    this.logger.log(
      `Calculating customer metrics for ${completedOrders.length} completed orders`
    );

    const customerIds = this.getUniqueCustomerIds(completedOrders);
    const allTimeCustomerIds = this.getUniqueCustomerIds(
      orders.filter((o) => o.status === 'completed')
    );
    const returningIds = this.findReturningCustomers(completedOrders);

    return {
      totalCustomers: customerIds.size,
      newCustomers: this.countNewCustomers(orders, dateRange),
      returningCustomers: returningIds.size,
      customerRetentionRate: this.computeRetentionRate(
        allTimeCustomerIds.size,
        returningIds.size
      ),
      topCustomers: this.computeTopCustomers(completedOrders, 10),
    };
  }

  customerSegmentation(orders: OrderRecord[]): CustomerSegment[] {
    const completed = orders.filter((o) => o.status === 'completed');
    const customerSpending = this.buildCustomerSpendingMap(completed);

    const segments: Map<string, CustomerSegment> = new Map([
      ['high-value', { segment: 'high-value', customerCount: 0, totalSpent: 0 }],
      ['medium-value', { segment: 'medium-value', customerCount: 0, totalSpent: 0 }],
      ['low-value', { segment: 'low-value', customerCount: 0, totalSpent: 0 }],
    ]);

    for (const [, totalSpent] of customerSpending) {
      const segment = this.classifyCustomer(totalSpent);
      const segmentData = segments.get(segment);
      if (segmentData) {
        segmentData.customerCount += 1;
        segmentData.totalSpent = this.roundToTwo(segmentData.totalSpent + totalSpent);
      }
    }

    return Array.from(segments.values());
  }

  customerLifetimeValue(orders: OrderRecord[]): CustomerLifetimeValue[] {
    const completed = orders.filter((o) => o.status === 'completed');
    const customerOrders = this.groupByCustomer(completed);

    return Array.from(customerOrders.entries()).map(
      ([customerId, custOrders]) => {
        const totalSpent = custOrders.reduce((sum, o) => sum + o.total, 0);
        const dates = custOrders.map((o) => new Date(o.createdAt));
        const sorted = dates.sort((a, b) => a.getTime() - b.getTime());

        return {
          customerId,
          totalSpent: this.roundToTwo(totalSpent),
          orderCount: custOrders.length,
          averageOrderValue: this.roundToTwo(totalSpent / custOrders.length),
          firstOrderDate: sorted[0] as Date,
          lastOrderDate: sorted[sorted.length - 1] as Date,
        };
      }
    );
  }

  retentionRate(orders: OrderRecord[], dateRange: DateRange): number {
    const allTimeCompleted = orders.filter((o) => o.status === 'completed');
    const allTimeCustomerIds = this.getUniqueCustomerIds(allTimeCompleted);
    const filtered = this.filterByDateRange(allTimeCompleted, dateRange);
    const returningIds = this.findReturningCustomers(filtered);

    return this.computeRetentionRate(allTimeCustomerIds.size, returningIds.size);
  }

  newVsReturning(
    orders: OrderRecord[],
    dateRange: DateRange
  ): { newCustomers: number; returningCustomers: number } {
    const filtered = this.filterByDateRange(
      orders.filter((o) => o.status === 'completed'),
      dateRange
    );

    return {
      newCustomers: this.countNewCustomers(orders, dateRange),
      returningCustomers: this.findReturningCustomers(filtered).size,
    };
  }

  topCustomers(orders: OrderRecord[], limit: number): TopCustomer[] {
    const completed = orders.filter((o) => o.status === 'completed');
    return this.computeTopCustomers(completed, limit);
  }

  private filterByDateRange(orders: OrderRecord[], dateRange: DateRange): OrderRecord[] {
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    });
  }

  private getUniqueCustomerIds(orders: OrderRecord[]): Set<string> {
    return new Set(orders.map((o) => o.customerId));
  }

  private findReturningCustomers(orders: OrderRecord[]): Set<string> {
    const customerOrderCounts = new Map<string, number>();
    for (const order of orders) {
      const count = customerOrderCounts.get(order.customerId) ?? 0;
      customerOrderCounts.set(order.customerId, count + 1);
    }

    const returning = new Set<string>();
    for (const [customerId, count] of customerOrderCounts) {
      if (count > 1) {
        returning.add(customerId);
      }
    }
    return returning;
  }

  private countNewCustomers(orders: OrderRecord[], dateRange: DateRange): number {
    const completed = orders.filter((o) => o.status === 'completed');
    const firstOrderDates = new Map<string, Date>();

    for (const order of completed) {
      const existing = firstOrderDates.get(order.customerId);
      const orderDate = new Date(order.createdAt);
      if (!existing || orderDate < existing) {
        firstOrderDates.set(order.customerId, orderDate);
      }
    }

    let newCount = 0;
    for (const [, firstDate] of firstOrderDates) {
      if (firstDate >= dateRange.startDate && firstDate <= dateRange.endDate) {
        newCount += 1;
      }
    }
    return newCount;
  }

  private computeRetentionRate(
    totalCustomers: number,
    returningCustomers: number
  ): number {
    if (totalCustomers === 0) {
      return 0;
    }
    return this.roundToTwo((returningCustomers / totalCustomers) * 100);
  }

  private computeTopCustomers(
    orders: OrderRecord[],
    limit: number
  ): TopCustomer[] {
    const customerMap = new Map<string, TopCustomer>();

    for (const order of orders) {
      const existing = customerMap.get(order.customerId);
      if (existing) {
        existing.totalSpent += order.total;
        existing.orderCount += 1;
      } else {
        customerMap.set(order.customerId, {
          customerId: order.customerId,
          totalSpent: order.total,
          orderCount: 1,
        });
      }
    }

    return Array.from(customerMap.values())
      .map((c) => ({ ...c, totalSpent: this.roundToTwo(c.totalSpent) }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  private buildCustomerSpendingMap(orders: OrderRecord[]): Map<string, number> {
    const spending = new Map<string, number>();
    for (const order of orders) {
      const existing = spending.get(order.customerId) ?? 0;
      spending.set(order.customerId, existing + order.total);
    }
    return spending;
  }

  private classifyCustomer(totalSpent: number): string {
    if (totalSpent >= 200) {
      return 'high-value';
    }
    if (totalSpent >= 50) {
      return 'medium-value';
    }
    return 'low-value';
  }

  private groupByCustomer(orders: OrderRecord[]): Map<string, OrderRecord[]> {
    const grouped = new Map<string, OrderRecord[]>();
    for (const order of orders) {
      const existing = grouped.get(order.customerId) ?? [];
      existing.push(order);
      grouped.set(order.customerId, existing);
    }
    return grouped;
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

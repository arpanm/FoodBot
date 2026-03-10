import { CustomerAnalyticsService } from '../customer-analytics.service';
import { DateRange, OrderRecord } from '../types/analytics.types';

function createOrderRecord(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order-1',
    restaurantId: 'restaurant-1',
    customerId: 'customer-1',
    items: [
      {
        dishId: 'dish-1',
        dishName: 'Burger',
        category: 'Main Course',
        quantity: 2,
        price: 10,
        cost: 4,
      },
    ],
    subtotal: 20,
    total: 22,
    status: 'completed',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    completedAt: new Date('2024-01-15T12:30:00Z'),
    prepTimeMinutes: 15,
    deliveryTimeMinutes: 20,
    ...overrides,
  };
}

describe('CustomerAnalyticsService', () => {
  let service: CustomerAnalyticsService;
  let dateRange: DateRange;

  beforeEach(() => {
    service = new CustomerAnalyticsService();
    dateRange = {
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-31T23:59:59Z'),
    };
  });

  describe('calculateCustomerMetrics', () => {
    it('should calculate total unique customers', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1' }),
        createOrderRecord({ id: 'o-2', customerId: 'c-1' }),
        createOrderRecord({ id: 'o-3', customerId: 'c-2' }),
        createOrderRecord({ id: 'o-4', customerId: 'c-3' }),
      ];

      const result = service.calculateCustomerMetrics(orders, dateRange);

      expect(result.totalCustomers).toBe(3);
    });

    it('should identify returning customers', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1' }),
        createOrderRecord({ id: 'o-2', customerId: 'c-1' }),
        createOrderRecord({ id: 'o-3', customerId: 'c-2' }),
      ];

      const result = service.calculateCustomerMetrics(orders, dateRange);

      expect(result.returningCustomers).toBe(1);
    });

    it('should count new customers in date range', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          customerId: 'c-1',
          createdAt: new Date('2023-12-15T12:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-2',
          customerId: 'c-1',
          createdAt: new Date('2024-01-15T12:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-3',
          customerId: 'c-2',
          createdAt: new Date('2024-01-10T12:00:00Z'),
        }),
      ];

      const result = service.calculateCustomerMetrics(orders, dateRange);

      expect(result.newCustomers).toBe(1);
    });

    it('should return top customers sorted by total spent', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1', total: 100 }),
        createOrderRecord({ id: 'o-2', customerId: 'c-1', total: 50 }),
        createOrderRecord({ id: 'o-3', customerId: 'c-2', total: 200 }),
      ];

      const result = service.calculateCustomerMetrics(orders, dateRange);

      expect(result.topCustomers).toHaveLength(2);
      expect(result.topCustomers[0]?.customerId).toBe('c-2');
      expect(result.topCustomers[0]?.totalSpent).toBe(200);
      expect(result.topCustomers[1]?.customerId).toBe('c-1');
      expect(result.topCustomers[1]?.totalSpent).toBe(150);
    });

    it('should exclude cancelled orders from customer counts', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1', status: 'completed' }),
        createOrderRecord({ id: 'o-2', customerId: 'c-2', status: 'cancelled' }),
      ];

      const result = service.calculateCustomerMetrics(orders, dateRange);

      expect(result.totalCustomers).toBe(1);
    });

    it('should return empty metrics for no orders', () => {
      const result = service.calculateCustomerMetrics([], dateRange);

      expect(result.totalCustomers).toBe(0);
      expect(result.newCustomers).toBe(0);
      expect(result.returningCustomers).toBe(0);
      expect(result.customerRetentionRate).toBe(0);
      expect(result.topCustomers).toHaveLength(0);
    });

    it('should calculate retention rate', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1' }),
        createOrderRecord({ id: 'o-2', customerId: 'c-1' }),
        createOrderRecord({ id: 'o-3', customerId: 'c-2' }),
        createOrderRecord({ id: 'o-4', customerId: 'c-3' }),
      ];

      const result = service.calculateCustomerMetrics(orders, dateRange);

      expect(result.customerRetentionRate).toBe(
        Math.round((1 / 3) * 100 * 100) / 100
      );
    });
  });

  describe('customerSegmentation', () => {
    it('should segment customers by spending', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1', total: 250 }),
        createOrderRecord({ id: 'o-2', customerId: 'c-2', total: 75 }),
        createOrderRecord({ id: 'o-3', customerId: 'c-3', total: 20 }),
      ];

      const result = service.customerSegmentation(orders);

      const highValue = result.find((s) => s.segment === 'high-value');
      const mediumValue = result.find((s) => s.segment === 'medium-value');
      const lowValue = result.find((s) => s.segment === 'low-value');

      expect(highValue?.customerCount).toBe(1);
      expect(mediumValue?.customerCount).toBe(1);
      expect(lowValue?.customerCount).toBe(1);
    });

    it('should return all segments even when empty', () => {
      const result = service.customerSegmentation([]);

      expect(result).toHaveLength(3);
      for (const segment of result) {
        expect(segment.customerCount).toBe(0);
      }
    });
  });

  describe('customerLifetimeValue', () => {
    it('should calculate lifetime value per customer', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          customerId: 'c-1',
          total: 50,
          createdAt: new Date('2024-01-10T12:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-2',
          customerId: 'c-1',
          total: 30,
          createdAt: new Date('2024-01-20T12:00:00Z'),
        }),
      ];

      const result = service.customerLifetimeValue(orders);

      expect(result).toHaveLength(1);
      expect(result[0]?.customerId).toBe('c-1');
      expect(result[0]?.totalSpent).toBe(80);
      expect(result[0]?.orderCount).toBe(2);
      expect(result[0]?.averageOrderValue).toBe(40);
      expect(result[0]?.firstOrderDate).toEqual(new Date('2024-01-10T12:00:00Z'));
      expect(result[0]?.lastOrderDate).toEqual(new Date('2024-01-20T12:00:00Z'));
    });

    it('should exclude cancelled orders', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1', total: 50 }),
        createOrderRecord({ id: 'o-2', customerId: 'c-1', total: 30, status: 'cancelled' }),
      ];

      const result = service.customerLifetimeValue(orders);

      expect(result).toHaveLength(1);
      expect(result[0]?.totalSpent).toBe(50);
    });
  });

  describe('retentionRate', () => {
    it('should calculate retention rate within date range', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1' }),
        createOrderRecord({ id: 'o-2', customerId: 'c-1' }),
        createOrderRecord({ id: 'o-3', customerId: 'c-2' }),
      ];

      const result = service.retentionRate(orders, dateRange);

      expect(result).toBe(50);
    });

    it('should return zero when no customers', () => {
      const result = service.retentionRate([], dateRange);

      expect(result).toBe(0);
    });
  });

  describe('newVsReturning', () => {
    it('should distinguish new from returning customers', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          customerId: 'c-1',
          createdAt: new Date('2023-12-15T12:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-2',
          customerId: 'c-1',
          createdAt: new Date('2024-01-10T12:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-3',
          customerId: 'c-1',
          createdAt: new Date('2024-01-20T12:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-4',
          customerId: 'c-2',
          createdAt: new Date('2024-01-10T12:00:00Z'),
        }),
      ];

      const result = service.newVsReturning(orders, dateRange);

      // c-2 is new (first order in Jan), c-1 is not new (first order in Dec)
      expect(result.newCustomers).toBe(1);
      // c-1 has 2 orders in range, so they are returning
      expect(result.returningCustomers).toBe(1);
    });
  });

  describe('topCustomers', () => {
    it('should return top customers by spending', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1', total: 100 }),
        createOrderRecord({ id: 'o-2', customerId: 'c-2', total: 200 }),
        createOrderRecord({ id: 'o-3', customerId: 'c-3', total: 50 }),
      ];

      const result = service.topCustomers(orders, 2);

      expect(result).toHaveLength(2);
      expect(result[0]?.customerId).toBe('c-2');
      expect(result[1]?.customerId).toBe('c-1');
    });

    it('should respect the limit parameter', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', customerId: 'c-1', total: 100 }),
        createOrderRecord({ id: 'o-2', customerId: 'c-2', total: 200 }),
        createOrderRecord({ id: 'o-3', customerId: 'c-3', total: 50 }),
      ];

      const result = service.topCustomers(orders, 1);

      expect(result).toHaveLength(1);
      expect(result[0]?.customerId).toBe('c-2');
    });
  });
});

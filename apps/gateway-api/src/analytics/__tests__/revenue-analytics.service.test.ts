import { RevenueAnalyticsService } from '../revenue-analytics.service';
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

describe('RevenueAnalyticsService', () => {
  let service: RevenueAnalyticsService;
  let dateRange: DateRange;

  beforeEach(() => {
    service = new RevenueAnalyticsService();
    dateRange = {
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-31T23:59:59Z'),
    };
  });

  describe('calculateRevenue', () => {
    it('should calculate total revenue from completed orders', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', total: 22 }),
        createOrderRecord({ id: 'o-2', total: 35 }),
        createOrderRecord({ id: 'o-3', total: 18, status: 'cancelled' }),
      ];

      const result = service.calculateRevenue(orders, dateRange);

      expect(result.totalRevenue).toBe(57);
    });

    it('should return zero for no orders', () => {
      const result = service.calculateRevenue([], dateRange);

      expect(result.totalRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.revenueByDay).toHaveLength(0);
      expect(result.revenueByDish).toHaveLength(0);
      expect(result.revenueByCategory).toHaveLength(0);
    });

    it('should calculate average order value', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', total: 20 }),
        createOrderRecord({ id: 'o-2', total: 30 }),
      ];

      const result = service.calculateRevenue(orders, dateRange);

      expect(result.averageOrderValue).toBe(25);
    });

    it('should group revenue by day', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          total: 20,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-2',
          total: 30,
          createdAt: new Date('2024-01-15T14:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-3',
          total: 15,
          createdAt: new Date('2024-01-16T10:00:00Z'),
        }),
      ];

      const result = service.calculateRevenue(orders, dateRange);

      expect(result.revenueByDay).toHaveLength(2);
      expect(result.revenueByDay[0]).toEqual({ date: '2024-01-15', revenue: 50 });
      expect(result.revenueByDay[1]).toEqual({ date: '2024-01-16', revenue: 15 });
    });

    it('should filter orders outside date range', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          total: 20,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-2',
          total: 30,
          createdAt: new Date('2024-02-15T10:00:00Z'),
        }),
      ];

      const result = service.calculateRevenue(orders, dateRange);

      expect(result.totalRevenue).toBe(20);
    });

    it('should group revenue by dish', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 2, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Side', quantity: 1, price: 5, cost: 2 },
          ],
          total: 25,
        }),
        createOrderRecord({
          id: 'o-2',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 1, price: 10, cost: 4 },
          ],
          total: 10,
        }),
      ];

      const result = service.calculateRevenue(orders, dateRange);

      expect(result.revenueByDish).toHaveLength(2);
      const burger = result.revenueByDish.find((d) => d.dishId === 'd-1');
      expect(burger).toEqual({
        dishId: 'd-1',
        dishName: 'Burger',
        revenue: 30,
        quantitySold: 3,
      });
    });

    it('should group revenue by category', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main Course', quantity: 2, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Sides', quantity: 1, price: 5, cost: 2 },
          ],
          total: 25,
        }),
      ];

      const result = service.calculateRevenue(orders, dateRange);

      expect(result.revenueByCategory).toHaveLength(2);
      const main = result.revenueByCategory.find((c) => c.category === 'Main Course');
      expect(main).toEqual({
        category: 'Main Course',
        revenue: 20,
        quantitySold: 2,
      });
    });
  });

  describe('revenueByDish', () => {
    it('should return revenue grouped by dish', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Pizza', category: 'Main', quantity: 3, price: 12, cost: 5 },
          ],
          total: 36,
        }),
      ];

      const result = service.revenueByDish(orders, dateRange);

      expect(result).toHaveLength(1);
      expect(result[0]?.revenue).toBe(36);
    });
  });

  describe('revenueByCategory', () => {
    it('should return revenue grouped by category', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Pizza', category: 'Italian', quantity: 1, price: 15, cost: 6 },
            { dishId: 'd-2', dishName: 'Pasta', category: 'Italian', quantity: 1, price: 12, cost: 5 },
          ],
          total: 27,
        }),
      ];

      const result = service.revenueByCategory(orders, dateRange);

      expect(result).toHaveLength(1);
      expect(result[0]?.category).toBe('Italian');
      expect(result[0]?.revenue).toBe(27);
      expect(result[0]?.quantitySold).toBe(2);
    });
  });

  describe('revenueComparison', () => {
    it('should compare revenue between two periods', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          total: 100,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-2',
          total: 150,
          createdAt: new Date('2024-02-15T10:00:00Z'),
        }),
      ];

      const period1: DateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
      };
      const period2: DateRange = {
        startDate: new Date('2024-02-01T00:00:00Z'),
        endDate: new Date('2024-02-29T23:59:59Z'),
      };

      const result = service.revenueComparison(orders, period1, period2);

      expect(result.period1Revenue).toBe(100);
      expect(result.period2Revenue).toBe(150);
      expect(result.changeAmount).toBe(50);
      expect(result.changePercentage).toBe(50);
    });

    it('should handle zero revenue in first period', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          total: 100,
          createdAt: new Date('2024-02-15T10:00:00Z'),
        }),
      ];

      const period1: DateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
      };
      const period2: DateRange = {
        startDate: new Date('2024-02-01T00:00:00Z'),
        endDate: new Date('2024-02-29T23:59:59Z'),
      };

      const result = service.revenueComparison(orders, period1, period2);

      expect(result.period1Revenue).toBe(0);
      expect(result.changePercentage).toBe(0);
    });
  });

  describe('averageOrderValue', () => {
    it('should calculate average order value for completed orders', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', total: 20 }),
        createOrderRecord({ id: 'o-2', total: 40 }),
        createOrderRecord({ id: 'o-3', total: 30, status: 'cancelled' }),
      ];

      const result = service.averageOrderValue(orders, dateRange);

      expect(result).toBe(30);
    });

    it('should return zero when no completed orders', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', total: 30, status: 'cancelled' }),
      ];

      const result = service.averageOrderValue(orders, dateRange);

      expect(result).toBe(0);
    });
  });
});

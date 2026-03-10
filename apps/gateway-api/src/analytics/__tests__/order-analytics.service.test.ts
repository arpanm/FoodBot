import { OrderAnalyticsService } from '../order-analytics.service';
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

describe('OrderAnalyticsService', () => {
  let service: OrderAnalyticsService;
  let dateRange: DateRange;

  beforeEach(() => {
    service = new OrderAnalyticsService();
    dateRange = {
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-31T23:59:59Z'),
    };
  });

  describe('calculateOrderMetrics', () => {
    it('should calculate order metrics correctly', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', status: 'completed' }),
        createOrderRecord({ id: 'o-2', status: 'completed' }),
        createOrderRecord({ id: 'o-3', status: 'cancelled' }),
        createOrderRecord({ id: 'o-4', status: 'pending' }),
      ];

      const result = service.calculateOrderMetrics(orders, dateRange);

      expect(result.totalOrders).toBe(4);
      expect(result.completedOrders).toBe(2);
      expect(result.cancelledOrders).toBe(1);
    });

    it('should calculate average prep time from completed orders', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', prepTimeMinutes: 10 }),
        createOrderRecord({ id: 'o-2', prepTimeMinutes: 20 }),
        createOrderRecord({ id: 'o-3', prepTimeMinutes: 30 }),
      ];

      const result = service.calculateOrderMetrics(orders, dateRange);

      expect(result.averagePrepTime).toBe(20);
    });

    it('should return null average prep time when no data', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', prepTimeMinutes: null }),
      ];

      const result = service.calculateOrderMetrics(orders, dateRange);

      expect(result.averagePrepTime).toBeNull();
    });

    it('should calculate average delivery time', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', deliveryTimeMinutes: 25 }),
        createOrderRecord({ id: 'o-2', deliveryTimeMinutes: 35 }),
      ];

      const result = service.calculateOrderMetrics(orders, dateRange);

      expect(result.averageDeliveryTime).toBe(30);
    });

    it('should return null average delivery time when no data', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', deliveryTimeMinutes: null }),
      ];

      const result = service.calculateOrderMetrics(orders, dateRange);

      expect(result.averageDeliveryTime).toBeNull();
    });

    it('should identify peak hours', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', createdAt: new Date('2024-01-15T12:00:00Z') }),
        createOrderRecord({ id: 'o-2', createdAt: new Date('2024-01-15T12:30:00Z') }),
        createOrderRecord({ id: 'o-3', createdAt: new Date('2024-01-15T18:00:00Z') }),
      ];

      const result = service.calculateOrderMetrics(orders, dateRange);

      expect(result.peakHours.length).toBeGreaterThan(0);
      expect(result.peakHours[0]?.hour).toBe(12);
      expect(result.peakHours[0]?.orderCount).toBe(2);
    });

    it('should filter orders by date range', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          createdAt: new Date('2024-01-15T12:00:00Z'),
        }),
        createOrderRecord({
          id: 'o-2',
          createdAt: new Date('2024-03-15T12:00:00Z'),
        }),
      ];

      const result = service.calculateOrderMetrics(orders, dateRange);

      expect(result.totalOrders).toBe(1);
    });

    it('should return empty metrics for no orders', () => {
      const result = service.calculateOrderMetrics([], dateRange);

      expect(result.totalOrders).toBe(0);
      expect(result.completedOrders).toBe(0);
      expect(result.cancelledOrders).toBe(0);
      expect(result.peakHours).toHaveLength(0);
    });
  });

  describe('orderVolumeTrends', () => {
    it('should calculate daily volume trends', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', createdAt: new Date('2024-01-15T10:00:00Z') }),
        createOrderRecord({ id: 'o-2', createdAt: new Date('2024-01-15T14:00:00Z') }),
        createOrderRecord({ id: 'o-3', createdAt: new Date('2024-01-16T10:00:00Z') }),
      ];

      const result = service.orderVolumeTrends(orders, 'daily');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ period: '2024-01-15', orderCount: 2 });
      expect(result[1]).toEqual({ period: '2024-01-16', orderCount: 1 });
    });

    it('should calculate monthly volume trends', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', createdAt: new Date('2024-01-15T10:00:00Z') }),
        createOrderRecord({ id: 'o-2', createdAt: new Date('2024-02-15T10:00:00Z') }),
      ];

      const result = service.orderVolumeTrends(orders, 'monthly');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ period: '2024-01', orderCount: 1 });
      expect(result[1]).toEqual({ period: '2024-02', orderCount: 1 });
    });

    it('should calculate yearly volume trends', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', createdAt: new Date('2024-01-15T10:00:00Z') }),
        createOrderRecord({ id: 'o-2', createdAt: new Date('2024-06-15T10:00:00Z') }),
      ];

      const result = service.orderVolumeTrends(orders, 'yearly');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ period: '2024', orderCount: 2 });
    });
  });

  describe('peakHourAnalysis', () => {
    it('should return peak hours sorted by order count', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', createdAt: new Date('2024-01-15T12:00:00Z') }),
        createOrderRecord({ id: 'o-2', createdAt: new Date('2024-01-15T12:30:00Z') }),
        createOrderRecord({ id: 'o-3', createdAt: new Date('2024-01-15T18:00:00Z') }),
        createOrderRecord({ id: 'o-4', createdAt: new Date('2024-01-15T18:15:00Z') }),
        createOrderRecord({ id: 'o-5', createdAt: new Date('2024-01-15T18:45:00Z') }),
        createOrderRecord({ id: 'o-6', createdAt: new Date('2024-01-15T09:00:00Z') }),
      ];

      const result = service.peakHourAnalysis(orders);

      expect(result[0]?.hour).toBe(18);
      expect(result[0]?.orderCount).toBe(3);
      expect(result[1]?.hour).toBe(12);
      expect(result[1]?.orderCount).toBe(2);
    });
  });

  describe('completionRate', () => {
    it('should calculate completion rate', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', status: 'completed' }),
        createOrderRecord({ id: 'o-2', status: 'completed' }),
        createOrderRecord({ id: 'o-3', status: 'cancelled' }),
        createOrderRecord({ id: 'o-4', status: 'pending' }),
      ];

      const result = service.completionRate(orders);

      expect(result).toBe(50);
    });

    it('should return zero for empty orders', () => {
      const result = service.completionRate([]);

      expect(result).toBe(0);
    });
  });

  describe('cancellationAnalysis', () => {
    it('should calculate cancellation analysis', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', status: 'completed' }),
        createOrderRecord({ id: 'o-2', status: 'cancelled' }),
        createOrderRecord({ id: 'o-3', status: 'cancelled' }),
        createOrderRecord({ id: 'o-4', status: 'pending' }),
      ];

      const result = service.cancellationAnalysis(orders);

      expect(result.totalCancelled).toBe(2);
      expect(result.cancellationRate).toBe(50);
    });

    it('should handle empty orders', () => {
      const result = service.cancellationAnalysis([]);

      expect(result.totalCancelled).toBe(0);
      expect(result.cancellationRate).toBe(0);
    });
  });

  describe('prepTimeAnalysis', () => {
    it('should calculate prep time statistics', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', prepTimeMinutes: 10 }),
        createOrderRecord({ id: 'o-2', prepTimeMinutes: 20 }),
        createOrderRecord({ id: 'o-3', prepTimeMinutes: 30 }),
      ];

      const result = service.prepTimeAnalysis(orders);

      expect(result.averagePrepTime).toBe(20);
      expect(result.minPrepTime).toBe(10);
      expect(result.maxPrepTime).toBe(30);
    });

    it('should return nulls when no prep time data', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({ id: 'o-1', prepTimeMinutes: null }),
      ];

      const result = service.prepTimeAnalysis(orders);

      expect(result.averagePrepTime).toBeNull();
      expect(result.minPrepTime).toBeNull();
      expect(result.maxPrepTime).toBeNull();
    });
  });
});

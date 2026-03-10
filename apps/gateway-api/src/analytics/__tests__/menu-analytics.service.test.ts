import { MenuAnalyticsService } from '../menu-analytics.service';
import { OrderRecord } from '../types/analytics.types';

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

describe('MenuAnalyticsService', () => {
  let service: MenuAnalyticsService;

  beforeEach(() => {
    service = new MenuAnalyticsService();
  });

  describe('calculateMenuMetrics', () => {
    it('should calculate all menu metrics', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 5, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Side', quantity: 3, price: 5, cost: 2 },
          ],
        }),
        createOrderRecord({
          id: 'o-2',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 2, price: 10, cost: 4 },
            { dishId: 'd-3', dishName: 'Salad', category: 'Side', quantity: 1, price: 8, cost: 3 },
          ],
        }),
      ];

      const result = service.calculateMenuMetrics(orders, 10);

      expect(result.topSellingDishes.length).toBeGreaterThan(0);
      expect(result.worstPerformingDishes.length).toBeGreaterThan(0);
      expect(result.dishProfitability.length).toBeGreaterThan(0);
    });

    it('should exclude cancelled orders', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          status: 'completed',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 5, price: 10, cost: 4 },
          ],
        }),
        createOrderRecord({
          id: 'o-2',
          status: 'cancelled',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 10, price: 10, cost: 4 },
          ],
        }),
      ];

      const result = service.calculateMenuMetrics(orders, 10);

      expect(result.topSellingDishes[0]?.quantitySold).toBe(5);
    });

    it('should return empty metrics for no orders', () => {
      const result = service.calculateMenuMetrics([], 10);

      expect(result.topSellingDishes).toHaveLength(0);
      expect(result.worstPerformingDishes).toHaveLength(0);
      expect(result.dishProfitability).toHaveLength(0);
      expect(result.frequentCombinations).toHaveLength(0);
    });
  });

  describe('topSellingDishes', () => {
    it('should return dishes sorted by quantity sold descending', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 3, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Side', quantity: 10, price: 5, cost: 2 },
          ],
        }),
        createOrderRecord({
          id: 'o-2',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 2, price: 10, cost: 4 },
          ],
        }),
      ];

      const result = service.topSellingDishes(orders, 2);

      expect(result[0]?.dishId).toBe('d-2');
      expect(result[0]?.quantitySold).toBe(10);
      expect(result[1]?.dishId).toBe('d-1');
      expect(result[1]?.quantitySold).toBe(5);
    });

    it('should respect the limit parameter', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 5, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Side', quantity: 3, price: 5, cost: 2 },
            { dishId: 'd-3', dishName: 'Salad', category: 'Side', quantity: 1, price: 8, cost: 3 },
          ],
        }),
      ];

      const result = service.topSellingDishes(orders, 2);

      expect(result).toHaveLength(2);
    });
  });

  describe('worstPerforming', () => {
    it('should return dishes sorted by quantity sold ascending', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 10, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Side', quantity: 1, price: 5, cost: 2 },
          ],
        }),
      ];

      const result = service.worstPerforming(orders, 2);

      expect(result[0]?.dishId).toBe('d-2');
      expect(result[0]?.quantitySold).toBe(1);
      expect(result[1]?.dishId).toBe('d-1');
    });
  });

  describe('dishProfitability', () => {
    it('should calculate profit and margin for each dish', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 2, price: 10, cost: 4 },
          ],
        }),
      ];

      const result = service.dishProfitability(orders);

      expect(result).toHaveLength(1);
      expect(result[0]?.dishId).toBe('d-1');
      expect(result[0]?.revenue).toBe(20);
      expect(result[0]?.cost).toBe(8);
      expect(result[0]?.profit).toBe(12);
      expect(result[0]?.profitMargin).toBe(60);
    });

    it('should sort by profit descending', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 1, price: 10, cost: 9 },
            { dishId: 'd-2', dishName: 'Pizza', category: 'Main', quantity: 1, price: 15, cost: 5 },
          ],
        }),
      ];

      const result = service.dishProfitability(orders);

      expect(result[0]?.dishId).toBe('d-2');
      expect(result[0]?.profit).toBe(10);
      expect(result[1]?.dishId).toBe('d-1');
      expect(result[1]?.profit).toBe(1);
    });

    it('should handle zero revenue dish', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Free Sample', category: 'Promo', quantity: 1, price: 0, cost: 2 },
          ],
        }),
      ];

      const result = service.dishProfitability(orders);

      expect(result[0]?.profitMargin).toBe(0);
    });
  });

  describe('frequentCombinations', () => {
    it('should find frequently ordered dish combinations', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 1, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Side', quantity: 1, price: 5, cost: 2 },
          ],
        }),
        createOrderRecord({
          id: 'o-2',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 1, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Side', quantity: 1, price: 5, cost: 2 },
          ],
        }),
        createOrderRecord({
          id: 'o-3',
          items: [
            { dishId: 'd-3', dishName: 'Salad', category: 'Side', quantity: 1, price: 8, cost: 3 },
          ],
        }),
      ];

      const result = service.frequentCombinations(orders);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.dishes).toEqual(['Burger', 'Fries']);
      expect(result[0]?.frequency).toBe(2);
    });

    it('should exclude single-item orders from combinations', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 1, price: 10, cost: 4 },
          ],
        }),
      ];

      const result = service.frequentCombinations(orders);

      expect(result).toHaveLength(0);
    });

    it('should only include combinations with frequency > 1', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 1, price: 10, cost: 4 },
            { dishId: 'd-2', dishName: 'Fries', category: 'Side', quantity: 1, price: 5, cost: 2 },
          ],
        }),
        createOrderRecord({
          id: 'o-2',
          items: [
            { dishId: 'd-3', dishName: 'Pizza', category: 'Main', quantity: 1, price: 15, cost: 6 },
            { dishId: 'd-4', dishName: 'Salad', category: 'Side', quantity: 1, price: 8, cost: 3 },
          ],
        }),
      ];

      const result = service.frequentCombinations(orders);

      expect(result).toHaveLength(0);
    });
  });

  describe('priceOptimization', () => {
    it('should suggest price increase for low-margin dishes', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 1, price: 10, cost: 9 },
          ],
        }),
      ];

      const result = service.priceOptimization(orders);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.dishId).toBe('d-1');
      expect(result[0]?.suggestedPrice).toBe(11.5);
      expect(result[0]?.reason).toContain('Low profit margin');
    });

    it('should not suggest changes for healthy-margin dishes', () => {
      const orders: OrderRecord[] = [
        createOrderRecord({
          id: 'o-1',
          items: [
            { dishId: 'd-1', dishName: 'Burger', category: 'Main', quantity: 1, price: 10, cost: 3 },
          ],
        }),
      ];

      const result = service.priceOptimization(orders);

      expect(result).toHaveLength(0);
    });
  });
});

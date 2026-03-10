import { ZomatoProvider, ZomatoProviderError } from '../zomato/zomato-provider';
import type { DeliveryDetails, OrderItem } from '../types/provider.types';

describe('ZomatoProvider', () => {
  const noDelay = async (): Promise<void> => {};
  const noRandomError = (): number => 0.99;

  function createProvider(randomFn?: () => number): ZomatoProvider {
    return new ZomatoProvider(randomFn ?? noRandomError, noDelay);
  }

  const testLocation = { latitude: 12.9716, longitude: 77.5946 };

  const testDelivery: DeliveryDetails = {
    address: '456 Park Ave, Bangalore',
    location: testLocation,
    contactNumber: '+919876543210',
  };

  const testItems: OrderItem[] = [
    { menuItemId: 'zm-001', name: 'Butter Chicken', quantity: 1, price: 320 },
    { menuItemId: 'zm-004', name: 'Naan Basket', quantity: 2, price: 120 },
  ];

  describe('searchRestaurants', () => {
    it('should return restaurants matching name query', async () => {
      const provider = createProvider();
      const results = await provider.searchRestaurants('spice', testLocation);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name.toLowerCase().includes('spice'))).toBe(true);
    });

    it('should return restaurants matching cuisine query', async () => {
      const provider = createProvider();
      const results = await provider.searchRestaurants('italian', testLocation);

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) => r.cuisine.some((c) => c.toLowerCase().includes('italian')))
      ).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const provider = createProvider();
      const results = await provider.searchRestaurants('nonexistent-food-xyz', testLocation);
      expect(results).toEqual([]);
    });

    it('should throw error when random failure occurs', async () => {
      const alwaysFail = (): number => 0.01;
      const provider = createProvider(alwaysFail);

      await expect(
        provider.searchRestaurants('indian', testLocation)
      ).rejects.toThrow(ZomatoProviderError);
    });
  });

  describe('getMenu', () => {
    it('should return menu for valid restaurant', async () => {
      const provider = createProvider();
      const menu = await provider.getMenu('zomato-r-001');

      expect(menu.length).toBeGreaterThan(0);
      expect(menu[0]).toHaveProperty('id');
      expect(menu[0]).toHaveProperty('name');
      expect(menu[0]).toHaveProperty('price');
    });

    it('should throw error for invalid restaurant', async () => {
      const provider = createProvider();

      await expect(
        provider.getMenu('invalid-restaurant')
      ).rejects.toThrow(ZomatoProviderError);
    });
  });

  describe('placeOrder', () => {
    it('should place order successfully', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('zomato-r-001', testItems, testDelivery);

      expect(order.id).toMatch(/^zomato-ord-/);
      expect(order.status).toBe('placed');
      expect(order.total).toBe(560);
      expect(order.items).toEqual(testItems);
      expect(order.trackingUrl).toContain('zomato.com/track');
    });

    it('should throw error for invalid restaurant', async () => {
      const provider = createProvider();

      await expect(
        provider.placeOrder('invalid-restaurant', testItems, testDelivery)
      ).rejects.toThrow(ZomatoProviderError);
    });

    it('should assign unique order IDs', async () => {
      const provider = createProvider();
      const order1 = await provider.placeOrder('zomato-r-001', testItems, testDelivery);
      const order2 = await provider.placeOrder('zomato-r-001', testItems, testDelivery);

      expect(order1.id).not.toBe(order2.id);
    });
  });

  describe('getOrderStatus', () => {
    it('should return order status for placed order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('zomato-r-001', testItems, testDelivery);
      const status = await provider.getOrderStatus(order.id);

      expect(status.id).toBe(order.id);
      expect(status.status).toBe('placed');
    });

    it('should throw error for non-existent order', async () => {
      const provider = createProvider();

      await expect(
        provider.getOrderStatus('non-existent-order')
      ).rejects.toThrow(ZomatoProviderError);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a placed order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('zomato-r-001', testItems, testDelivery);
      const result = await provider.cancelOrder(order.id);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(order.id);
      expect(result.refundAmount).toBe(560);
    });

    it('should throw error for non-existent order', async () => {
      const provider = createProvider();

      await expect(
        provider.cancelOrder('non-existent-order')
      ).rejects.toThrow(ZomatoProviderError);
    });

    it('should not cancel already cancelled order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('zomato-r-001', testItems, testDelivery);

      await provider.cancelOrder(order.id);
      const secondCancel = await provider.cancelOrder(order.id);

      expect(secondCancel.success).toBe(false);
      expect(secondCancel.refundAmount).toBe(0);
    });
  });

  describe('getHealth', () => {
    it('should return active status', async () => {
      const provider = createProvider();
      const health = await provider.getHealth();
      expect(health).toBe('active');
    });
  });
});

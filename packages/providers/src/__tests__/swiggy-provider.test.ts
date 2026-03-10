import { SwiggyProvider, SwiggyProviderError } from '../swiggy/swiggy-provider';
import type { DeliveryDetails, OrderItem } from '../types/provider.types';

describe('SwiggyProvider', () => {
  const noDelay = async (): Promise<void> => {};
  const noRandomError = (): number => 0.99;

  function createProvider(randomFn?: () => number): SwiggyProvider {
    return new SwiggyProvider(randomFn ?? noRandomError, noDelay);
  }

  const testLocation = { latitude: 12.9716, longitude: 77.5946 };

  const testDelivery: DeliveryDetails = {
    address: '123 Main St, Bangalore',
    location: testLocation,
    contactNumber: '+919876543210',
  };

  const testItems: OrderItem[] = [
    { menuItemId: 'sm-001', name: 'Chicken Biryani', quantity: 2, price: 280 },
    { menuItemId: 'sm-004', name: 'Raita', quantity: 1, price: 60 },
  ];

  describe('searchRestaurants', () => {
    it('should return restaurants matching name query', async () => {
      const provider = createProvider();
      const results = await provider.searchRestaurants('biryani', testLocation);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name.toLowerCase().includes('biryani'))).toBe(true);
    });

    it('should return restaurants matching cuisine query', async () => {
      const provider = createProvider();
      const results = await provider.searchRestaurants('pizza', testLocation);

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) => r.cuisine.some((c) => c.toLowerCase().includes('pizza')))
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
        provider.searchRestaurants('biryani', testLocation)
      ).rejects.toThrow(SwiggyProviderError);
    });
  });

  describe('getMenu', () => {
    it('should return menu for valid restaurant', async () => {
      const provider = createProvider();
      const menu = await provider.getMenu('swiggy-r-001');

      expect(menu.length).toBeGreaterThan(0);
      expect(menu[0]).toHaveProperty('id');
      expect(menu[0]).toHaveProperty('name');
      expect(menu[0]).toHaveProperty('price');
    });

    it('should throw error for invalid restaurant', async () => {
      const provider = createProvider();

      await expect(
        provider.getMenu('invalid-restaurant')
      ).rejects.toThrow(SwiggyProviderError);
    });
  });

  describe('placeOrder', () => {
    it('should place order successfully', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('swiggy-r-001', testItems, testDelivery);

      expect(order.id).toMatch(/^swiggy-ord-/);
      expect(order.status).toBe('placed');
      expect(order.total).toBe(620);
      expect(order.items).toEqual(testItems);
      expect(order.trackingUrl).toContain('swiggy.com/track');
    });

    it('should throw error for invalid restaurant', async () => {
      const provider = createProvider();

      await expect(
        provider.placeOrder('invalid-restaurant', testItems, testDelivery)
      ).rejects.toThrow(SwiggyProviderError);
    });

    it('should assign unique order IDs', async () => {
      const provider = createProvider();
      const order1 = await provider.placeOrder('swiggy-r-001', testItems, testDelivery);
      const order2 = await provider.placeOrder('swiggy-r-001', testItems, testDelivery);

      expect(order1.id).not.toBe(order2.id);
    });
  });

  describe('getOrderStatus', () => {
    it('should return order status for placed order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('swiggy-r-001', testItems, testDelivery);
      const status = await provider.getOrderStatus(order.id);

      expect(status.id).toBe(order.id);
      expect(status.status).toBe('placed');
    });

    it('should throw error for non-existent order', async () => {
      const provider = createProvider();

      await expect(
        provider.getOrderStatus('non-existent-order')
      ).rejects.toThrow(SwiggyProviderError);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a placed order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('swiggy-r-001', testItems, testDelivery);
      const result = await provider.cancelOrder(order.id);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(order.id);
      expect(result.refundAmount).toBe(620);
    });

    it('should throw error for non-existent order', async () => {
      const provider = createProvider();

      await expect(
        provider.cancelOrder('non-existent-order')
      ).rejects.toThrow(SwiggyProviderError);
    });

    it('should not cancel already cancelled order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('swiggy-r-001', testItems, testDelivery);

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

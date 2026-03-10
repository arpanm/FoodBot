import { OndcProvider, OndcProviderError } from '../ondc/ondc-provider';
import type { DeliveryDetails, OrderItem } from '../types/provider.types';

describe('OndcProvider', () => {
  const noDelay = async (): Promise<void> => {};
  const deterministicRandom = (): number => 0.5;

  function createProvider(randomFn?: () => number): OndcProvider {
    return new OndcProvider(randomFn ?? deterministicRandom, noDelay);
  }

  const testLocation = { latitude: 12.9716, longitude: 77.5946 };

  const testDelivery: DeliveryDetails = {
    address: '789 MG Road, Bangalore',
    location: testLocation,
    contactNumber: '+919876543210',
  };

  const testItems: OrderItem[] = [
    { menuItemId: 'om-001', name: 'South Indian Thali', quantity: 2, price: 180 },
    { menuItemId: 'om-005', name: 'Curd Rice', quantity: 1, price: 80 },
  ];

  describe('searchRestaurants', () => {
    it('should return restaurants matching name query', async () => {
      const provider = createProvider();
      const results = await provider.searchRestaurants('annapurna', testLocation);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name.toLowerCase().includes('annapurna'))).toBe(true);
    });

    it('should return restaurants matching cuisine query', async () => {
      const provider = createProvider();
      const results = await provider.searchRestaurants('healthy', testLocation);

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) => r.cuisine.some((c) => c.toLowerCase().includes('healthy')))
      ).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const provider = createProvider();
      const results = await provider.searchRestaurants('nonexistent-food-xyz', testLocation);
      expect(results).toEqual([]);
    });
  });

  describe('getMenu', () => {
    it('should return menu for valid restaurant', async () => {
      const provider = createProvider();
      const menu = await provider.getMenu('ondc-r-001');

      expect(menu.length).toBeGreaterThan(0);
      expect(menu[0]).toHaveProperty('id');
      expect(menu[0]).toHaveProperty('name');
      expect(menu[0]).toHaveProperty('price');
    });

    it('should throw error for invalid restaurant', async () => {
      const provider = createProvider();

      await expect(
        provider.getMenu('invalid-restaurant')
      ).rejects.toThrow(OndcProviderError);
    });
  });

  describe('placeOrder', () => {
    it('should place order with ONDC multi-step flow', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('ondc-r-001', testItems, testDelivery);

      expect(order.id).toMatch(/^ondc-ord-/);
      expect(order.status).toBe('confirmed');
      expect(order.total).toBe(440);
      expect(order.items).toEqual(testItems);
      expect(order.trackingUrl).toContain('ondc.org/track');
    });

    it('should throw error for invalid restaurant', async () => {
      const provider = createProvider();

      await expect(
        provider.placeOrder('invalid-restaurant', testItems, testDelivery)
      ).rejects.toThrow(OndcProviderError);
    });

    it('should assign unique order IDs', async () => {
      const provider = createProvider();
      const order1 = await provider.placeOrder('ondc-r-001', testItems, testDelivery);
      const order2 = await provider.placeOrder('ondc-r-001', testItems, testDelivery);

      expect(order1.id).not.toBe(order2.id);
    });
  });

  describe('getOrderStatus', () => {
    it('should return order status for placed order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('ondc-r-001', testItems, testDelivery);
      const status = await provider.getOrderStatus(order.id);

      expect(status.id).toBe(order.id);
      expect(status.status).toBe('confirmed');
    });

    it('should throw error for non-existent order', async () => {
      const provider = createProvider();

      await expect(
        provider.getOrderStatus('non-existent-order')
      ).rejects.toThrow(OndcProviderError);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a confirmed order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('ondc-r-001', testItems, testDelivery);
      const result = await provider.cancelOrder(order.id);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(order.id);
      expect(result.refundAmount).toBe(440);
    });

    it('should throw error for non-existent order', async () => {
      const provider = createProvider();

      await expect(
        provider.cancelOrder('non-existent-order')
      ).rejects.toThrow(OndcProviderError);
    });

    it('should not cancel already cancelled order', async () => {
      const provider = createProvider();
      const order = await provider.placeOrder('ondc-r-001', testItems, testDelivery);

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

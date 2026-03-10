import { ProviderManager, ProviderManagerError } from '../manager/provider-manager';
import type { IFoodProvider } from '../types/provider-interface';
import type {
  CancelResult,
  DeliveryDetails,
  Location,
  OrderItem,
  ProviderConfig,
  ProviderMenuItem,
  ProviderOrder,
  ProviderRestaurant,
  ProviderStatus,
} from '../types/provider.types';

function createMockProvider(
  overrides?: Partial<IFoodProvider>
): IFoodProvider {
  return {
    searchRestaurants: jest.fn().mockResolvedValue([]),
    getMenu: jest.fn().mockResolvedValue([]),
    placeOrder: jest.fn().mockResolvedValue({
      id: 'ord-1',
      status: 'placed',
      items: [],
      total: 100,
      estimatedDelivery: 30,
      trackingUrl: 'https://example.com',
    } satisfies ProviderOrder),
    getOrderStatus: jest.fn().mockResolvedValue({
      id: 'ord-1',
      status: 'placed',
      items: [],
      total: 100,
      estimatedDelivery: 30,
      trackingUrl: 'https://example.com',
    } satisfies ProviderOrder),
    cancelOrder: jest.fn().mockResolvedValue({
      success: true,
      orderId: 'ord-1',
      refundAmount: 100,
    } satisfies CancelResult),
    getHealth: jest.fn().mockResolvedValue('active' as ProviderStatus),
    ...overrides,
  };
}

function createConfig(
  overrides?: Partial<ProviderConfig>
): ProviderConfig {
  return {
    name: 'swiggy',
    baseUrl: 'https://api.swiggy.com',
    apiKey: 'test-key',
    rateLimit: 100,
    enabled: true,
    priority: 1,
    ...overrides,
  };
}

describe('ProviderManager', () => {
  const testLocation: Location = { latitude: 12.9716, longitude: 77.5946 };

  describe('registerProvider', () => {
    it('should register a provider successfully', () => {
      const manager = new ProviderManager();
      const provider = createMockProvider();
      const config = createConfig();

      manager.registerProvider(config, provider);

      expect(manager.getProvider('swiggy')).toBe(provider);
    });

    it('should throw error when registering duplicate provider', () => {
      const manager = new ProviderManager();
      const provider = createMockProvider();
      const config = createConfig();

      manager.registerProvider(config, provider);

      expect(() => manager.registerProvider(config, provider)).toThrow(
        ProviderManagerError
      );
    });
  });

  describe('getProvider', () => {
    it('should return registered provider', () => {
      const manager = new ProviderManager();
      const provider = createMockProvider();
      const config = createConfig();

      manager.registerProvider(config, provider);

      expect(manager.getProvider('swiggy')).toBe(provider);
    });

    it('should throw error for unregistered provider', () => {
      const manager = new ProviderManager();

      expect(() => manager.getProvider('swiggy')).toThrow(ProviderManagerError);
    });
  });

  describe('getAllProviders', () => {
    it('should return all registered providers', () => {
      const manager = new ProviderManager();
      const swiggy = createMockProvider();
      const zomato = createMockProvider();

      manager.registerProvider(createConfig({ name: 'swiggy' }), swiggy);
      manager.registerProvider(createConfig({ name: 'zomato' }), zomato);

      const providers = manager.getAllProviders();
      expect(providers).toHaveLength(2);
      expect(providers).toContain(swiggy);
      expect(providers).toContain(zomato);
    });

    it('should return empty array when no providers registered', () => {
      const manager = new ProviderManager();
      expect(manager.getAllProviders()).toEqual([]);
    });
  });

  describe('getHealthyProviders', () => {
    it('should return only healthy providers', async () => {
      const manager = new ProviderManager();

      const healthy = createMockProvider({
        getHealth: jest.fn().mockResolvedValue('active' as ProviderStatus),
      });
      const down = createMockProvider({
        getHealth: jest.fn().mockResolvedValue('down' as ProviderStatus),
      });

      manager.registerProvider(createConfig({ name: 'swiggy' }), healthy);
      manager.registerProvider(createConfig({ name: 'zomato' }), down);

      const results = await manager.getHealthyProviders();
      expect(results).toHaveLength(1);
      expect(results).toContain(healthy);
    });

    it('should exclude disabled providers', async () => {
      const manager = new ProviderManager();
      const provider = createMockProvider();

      manager.registerProvider(
        createConfig({ name: 'swiggy', enabled: false }),
        provider
      );

      const results = await manager.getHealthyProviders();
      expect(results).toHaveLength(0);
    });

    it('should exclude providers with health check errors', async () => {
      const manager = new ProviderManager();
      const provider = createMockProvider({
        getHealth: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      manager.registerProvider(createConfig({ name: 'swiggy' }), provider);

      const results = await manager.getHealthyProviders();
      expect(results).toHaveLength(0);
    });

    it('should include degraded providers', async () => {
      const manager = new ProviderManager();
      const degraded = createMockProvider({
        getHealth: jest.fn().mockResolvedValue('degraded' as ProviderStatus),
      });

      manager.registerProvider(createConfig({ name: 'swiggy' }), degraded);

      const results = await manager.getHealthyProviders();
      expect(results).toHaveLength(1);
    });
  });

  describe('searchAcrossProviders', () => {
    it('should aggregate results from all enabled providers', async () => {
      const manager = new ProviderManager();

      const swiggyResults: ProviderRestaurant[] = [
        {
          id: 'swg-1',
          name: 'Biryani Blues',
          cuisine: ['Biryani'],
          rating: 4.3,
          deliveryTime: 30,
          minimumOrder: 150,
          isOpen: true,
          location: testLocation,
        },
      ];

      const zomatoResults: ProviderRestaurant[] = [
        {
          id: 'zmt-1',
          name: 'Biryani House',
          cuisine: ['Biryani'],
          rating: 4.1,
          deliveryTime: 35,
          minimumOrder: 200,
          isOpen: true,
          location: testLocation,
        },
      ];

      const swiggy = createMockProvider({
        searchRestaurants: jest.fn().mockResolvedValue(swiggyResults),
      });
      const zomato = createMockProvider({
        searchRestaurants: jest.fn().mockResolvedValue(zomatoResults),
      });

      manager.registerProvider(createConfig({ name: 'swiggy', priority: 1 }), swiggy);
      manager.registerProvider(createConfig({ name: 'zomato', priority: 2 }), zomato);

      const results = await manager.searchAcrossProviders('biryani', testLocation);

      expect(results.totalResults).toBe(2);
      expect(results.providers).toContain('swiggy');
      expect(results.providers).toContain('zomato');
      expect(results.restaurants).toHaveLength(2);
      expect(results.restaurants[0]?.providerName).toBeDefined();
    });

    it('should skip disabled providers', async () => {
      const manager = new ProviderManager();
      const swiggy = createMockProvider({
        searchRestaurants: jest.fn().mockResolvedValue([
          {
            id: 'swg-1',
            name: 'Test',
            cuisine: ['Indian'],
            rating: 4.0,
            deliveryTime: 30,
            minimumOrder: 100,
            isOpen: true,
            location: testLocation,
          },
        ] satisfies ProviderRestaurant[]),
      });
      const disabled = createMockProvider();

      manager.registerProvider(createConfig({ name: 'swiggy', enabled: true }), swiggy);
      manager.registerProvider(
        createConfig({ name: 'zomato', enabled: false }),
        disabled
      );

      const results = await manager.searchAcrossProviders('test', testLocation);

      expect(results.providers).toEqual(['swiggy']);
      expect(disabled.searchRestaurants).not.toHaveBeenCalled();
    });

    it('should handle provider errors gracefully', async () => {
      const manager = new ProviderManager();
      const working = createMockProvider({
        searchRestaurants: jest.fn().mockResolvedValue([
          {
            id: 'swg-1',
            name: 'Working Restaurant',
            cuisine: ['Indian'],
            rating: 4.0,
            deliveryTime: 30,
            minimumOrder: 100,
            isOpen: true,
            location: testLocation,
          },
        ] satisfies ProviderRestaurant[]),
      });
      const failing = createMockProvider({
        searchRestaurants: jest.fn().mockRejectedValue(new Error('API Error')),
      });

      manager.registerProvider(createConfig({ name: 'swiggy', priority: 1 }), working);
      manager.registerProvider(createConfig({ name: 'zomato', priority: 2 }), failing);

      const results = await manager.searchAcrossProviders('food', testLocation);

      expect(results.totalResults).toBe(1);
      expect(results.providers).toEqual(['swiggy']);
    });

    it('should return empty results when no providers available', async () => {
      const manager = new ProviderManager();

      const results = await manager.searchAcrossProviders('food', testLocation);

      expect(results.totalResults).toBe(0);
      expect(results.restaurants).toEqual([]);
      expect(results.providers).toEqual([]);
    });

    it('should respect rate limits', async () => {
      let currentTime = 1000000;
      const mockClock = (): number => currentTime;

      const manager = new ProviderManager(mockClock);
      const provider = createMockProvider({
        searchRestaurants: jest.fn().mockResolvedValue([
          {
            id: 'swg-1',
            name: 'Test',
            cuisine: ['Indian'],
            rating: 4.0,
            deliveryTime: 30,
            minimumOrder: 100,
            isOpen: true,
            location: testLocation,
          },
        ] satisfies ProviderRestaurant[]),
      });

      manager.registerProvider(
        createConfig({ name: 'swiggy', rateLimit: 2 }),
        provider
      );

      // First two should work
      await manager.searchAcrossProviders('food', testLocation);
      await manager.searchAcrossProviders('food', testLocation);

      // Third should fail due to rate limit (provider silently excluded)
      const results = await manager.searchAcrossProviders('food', testLocation);
      expect(results.totalResults).toBe(0);
    });
  });
});

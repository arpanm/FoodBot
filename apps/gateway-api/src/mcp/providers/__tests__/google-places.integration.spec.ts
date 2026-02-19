import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../../services/redis.service';
import { GooglePlacesMapper } from '../google-places/google-places.mapper';
import { GooglePlacesProvider } from '../google-places/google-places.provider';
import { ProviderOrchestratorService } from '../provider-orchestrator.service';
import { MockRestaurantProvider } from '../mock/mock.provider';

describe('Google Places Integration Tests', () => {
  let orchestrator: ProviderOrchestratorService;
  let googlePlacesProvider: GooglePlacesProvider;
  let mockProvider: MockRestaurantProvider;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderOrchestratorService,
        GooglePlacesProvider,
        GooglePlacesMapper,
        MockRestaurantProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'GOOGLE_PLACES_API_KEY') return 'test-key';
              if (key === 'GOOGLE_PLACES_ENABLED') return false; // Disabled for integration tests
              if (key === 'PROVIDER_STRATEGY') return 'fallback';
              return defaultValue;
            }),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            keys: jest.fn(),
          },
        },
      ],
    }).compile();

    orchestrator = module.get<ProviderOrchestratorService>(ProviderOrchestratorService);
    googlePlacesProvider = module.get<GooglePlacesProvider>(GooglePlacesProvider);
    mockProvider = module.get<MockRestaurantProvider>(MockRestaurantProvider);
    redisService = module.get<RedisService>(RedisService);

    googlePlacesProvider.onModuleInit();
  });

  describe('End-to-End Restaurant Search', () => {
    it('should search restaurants using mock provider', async () => {
      const results = await orchestrator.searchNearby(37.7749, -122.4194, 10000);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('location');
      expect(results[0].source).toBe('mock');
    });

    it('should search by query text', async () => {
      const results = await orchestrator.searchByQuery('pizza');

      expect(results.length).toBeGreaterThan(0);
      const pizzaResults = results.filter((r) =>
        r.name.toLowerCase().includes('pizza') ||
        r.cuisineTypes.some((c) => c.toLowerCase().includes('pizza'))
      );
      expect(pizzaResults.length).toBeGreaterThan(0);
    });

    it('should get restaurant details by ID', async () => {
      const searchResults = await orchestrator.searchNearby(37.7749, -122.4194, 10000);
      expect(searchResults.length).toBeGreaterThan(0);

      const restaurantId = searchResults[0].id;
      const details = await orchestrator.getRestaurantDetails(restaurantId);

      expect(details).not.toBeNull();
      expect(details!.id).toBe(restaurantId);
      expect(details!.name).toBe(searchResults[0].name);
    });

    it('should apply filters correctly', async () => {
      const results = await orchestrator.searchNearby(37.7749, -122.4194, 10000, {
        minRating: 4.5,
      });

      for (const restaurant of results) {
        expect(restaurant.rating).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('should filter by cuisine types', async () => {
      const results = await orchestrator.searchByQuery('', { lat: 37.7749, lng: -122.4194 }, {
        cuisineTypes: ['Italian'],
      });

      for (const restaurant of results) {
        expect(restaurant.cuisineTypes).toContain('Italian');
      }
    });

    it('should filter by price range', async () => {
      const results = await orchestrator.searchNearby(37.7749, -122.4194, 10000, {
        priceRange: ['budget'],
      });

      for (const restaurant of results) {
        expect(restaurant.priceRange).toBe('budget');
      }
    });

    it('should handle empty search results gracefully', async () => {
      const results = await orchestrator.searchByQuery('nonexistentrestaurant123456');

      expect(results).toEqual([]);
    });
  });

  describe('Caching Integration', () => {
    it('should use cache for repeated searches', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce(null);
      jest.spyOn(redisService, 'set').mockResolvedValue();

      // First search - should hit provider
      const results1 = await orchestrator.searchNearby(37.7749, -122.4194, 5000);

      // Second search with same params - should try cache
      const cachedData = JSON.stringify(results1);
      jest.spyOn(redisService, 'get').mockResolvedValueOnce(cachedData);

      const results2 = await orchestrator.searchNearby(37.7749, -122.4194, 5000);

      expect(results2).toEqual(results1);
    });
  });

  describe('Provider Fallback', () => {
    it('should fallback to mock provider when Google Places is disabled', async () => {
      const results = await orchestrator.searchNearby(37.7749, -122.4194, 10000);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source).toBe('mock');
    });

    it('should handle provider failures gracefully', async () => {
      // Mock a provider failure
      jest.spyOn(mockProvider, 'searchNearby').mockRejectedValueOnce(new Error('Provider error'));

      const results = await orchestrator.searchNearby(37.7749, -122.4194, 10000);

      // Should return empty array instead of throwing
      expect(results).toEqual([]);
    });
  });

  describe('Health Checks', () => {
    it('should perform health check on all providers', async () => {
      const isHealthy = await orchestrator.healthCheck();

      expect(typeof isHealthy).toBe('boolean');
    });

    it('should report provider status', () => {
      const stats = orchestrator.getProviderStats();

      expect(stats).toHaveProperty('google_places');
      expect(stats).toHaveProperty('mock');
      expect(stats.mock.enabled).toBe(true);
    });
  });

  describe('Distance Calculations', () => {
    it('should return restaurants within specified radius', async () => {
      const centerLat = 37.7749;
      const centerLng = -122.4194;
      const radius = 5000; // 5km

      const results = await orchestrator.searchNearby(centerLat, centerLng, radius);

      for (const restaurant of results) {
        const distance = calculateDistance(
          centerLat,
          centerLng,
          restaurant.location.lat,
          restaurant.location.lng,
        );

        // Distance should be within radius (with some tolerance)
        expect(distance).toBeLessThanOrEqual(radius / 1000 + 1); // +1km tolerance
      }
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent data structure', async () => {
      const results = await orchestrator.searchNearby(37.7749, -122.4194, 10000);

      for (const restaurant of results) {
        // Required fields
        expect(restaurant).toHaveProperty('id');
        expect(restaurant).toHaveProperty('name');
        expect(restaurant).toHaveProperty('location');
        expect(restaurant).toHaveProperty('address');
        expect(restaurant).toHaveProperty('rating');
        expect(restaurant).toHaveProperty('reviewCount');
        expect(restaurant).toHaveProperty('priceRange');
        expect(restaurant).toHaveProperty('cuisineTypes');
        expect(restaurant).toHaveProperty('source');

        // Type validation
        expect(typeof restaurant.id).toBe('string');
        expect(typeof restaurant.name).toBe('string');
        expect(typeof restaurant.rating).toBe('number');
        expect(typeof restaurant.reviewCount).toBe('number');
        expect(Array.isArray(restaurant.cuisineTypes)).toBe(true);
      }
    });
  });
});

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

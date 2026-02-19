import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { Restaurant } from '../../interfaces/restaurant-provider.interface';
import { ProviderStrategy } from '../../config/providers.config';
import { GooglePlacesProvider } from '../google-places/google-places.provider';
import { MockRestaurantProvider } from '../mock/mock.provider';
import { ProviderOrchestratorService } from '../provider-orchestrator.service';

describe('ProviderOrchestratorService', () => {
  let orchestrator: ProviderOrchestratorService;
  let googlePlacesProvider: GooglePlacesProvider;
  let mockProvider: MockRestaurantProvider;

  const mockRestaurant: Restaurant = {
    id: 'test-1',
    externalId: 'test-1',
    name: 'Test Restaurant',
    description: 'Test',
    address: { formattedAddress: '123 Test St' },
    location: { lat: 37.7749, lng: -122.4194 },
    phoneNumber: '+1234567890',
    email: 'test@test.com',
    rating: 4.5,
    reviewCount: 100,
    priceRange: 'moderate',
    cuisineTypes: ['Test'],
    images: [],
    isActive: true,
    isApproved: true,
    source: 'mock',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderOrchestratorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'PROVIDER_STRATEGY') return ProviderStrategy.FALLBACK;
              if (key === 'GOOGLE_PLACES_ENABLED') return false;
              return defaultValue;
            }),
          },
        },
        {
          provide: GooglePlacesProvider,
          useValue: {
            searchNearby: jest.fn(),
            searchByQuery: jest.fn(),
            getRestaurantDetails: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
        {
          provide: MockRestaurantProvider,
          useValue: {
            searchNearby: jest.fn(),
            searchByQuery: jest.fn(),
            getRestaurantDetails: jest.fn(),
            healthCheck: jest.fn(),
          },
        },
      ],
    }).compile();

    orchestrator = module.get<ProviderOrchestratorService>(ProviderOrchestratorService);
    googlePlacesProvider = module.get<GooglePlacesProvider>(GooglePlacesProvider);
    mockProvider = module.get<MockRestaurantProvider>(MockRestaurantProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchNearby', () => {
    it('should use fallback strategy by default', async () => {
      jest.spyOn(mockProvider, 'searchNearby').mockResolvedValue([mockRestaurant]);

      const results = await orchestrator.searchNearby(37.7749, -122.4194, 5000);

      expect(results).toHaveLength(1);
      expect(mockProvider.searchNearby).toHaveBeenCalled();
    });

    it('should try next provider if first fails', async () => {
      // Enable Google Places for this test
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'GOOGLE_PLACES_ENABLED') return true;
          if (key === 'PROVIDER_STRATEGY') return ProviderStrategy.FALLBACK;
          return undefined;
        }),
      };

      const testOrchestrator = new ProviderOrchestratorService(
        mockConfig as unknown as ConfigService,
        googlePlacesProvider,
        mockProvider,
      );

      jest.spyOn(googlePlacesProvider, 'searchNearby').mockRejectedValue(new Error('Provider error'));
      jest.spyOn(mockProvider, 'searchNearby').mockResolvedValue([mockRestaurant]);

      const results = await testOrchestrator.searchNearby(37.7749, -122.4194, 5000);

      expect(results).toHaveLength(1);
      expect(googlePlacesProvider.searchNearby).toHaveBeenCalled();
      expect(mockProvider.searchNearby).toHaveBeenCalled();
    });

    it('should skip provider if it returns empty results', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'GOOGLE_PLACES_ENABLED') return true;
          if (key === 'PROVIDER_STRATEGY') return ProviderStrategy.FALLBACK;
          return undefined;
        }),
      };

      const testOrchestrator = new ProviderOrchestratorService(
        mockConfig as unknown as ConfigService,
        googlePlacesProvider,
        mockProvider,
      );

      jest.spyOn(googlePlacesProvider, 'searchNearby').mockResolvedValue([]);
      jest.spyOn(mockProvider, 'searchNearby').mockResolvedValue([mockRestaurant]);

      const results = await testOrchestrator.searchNearby(37.7749, -122.4194, 5000);

      expect(results).toHaveLength(1);
      expect(googlePlacesProvider.searchNearby).toHaveBeenCalled();
      expect(mockProvider.searchNearby).toHaveBeenCalled();
    });

    it('should return empty array if all providers fail', async () => {
      jest.spyOn(mockProvider, 'searchNearby').mockRejectedValue(new Error('Provider error'));

      const results = await orchestrator.searchNearby(37.7749, -122.4194, 5000);

      expect(results).toEqual([]);
    });
  });

  describe('searchByQuery', () => {
    it('should search by query using enabled providers', async () => {
      jest.spyOn(mockProvider, 'searchByQuery').mockResolvedValue([mockRestaurant]);

      const results = await orchestrator.searchByQuery('pizza');

      expect(results).toHaveLength(1);
      expect(mockProvider.searchByQuery).toHaveBeenCalledWith('pizza', undefined, undefined);
    });

    it('should pass location and filters to provider', async () => {
      jest.spyOn(mockProvider, 'searchByQuery').mockResolvedValue([mockRestaurant]);

      const location = { lat: 37.7749, lng: -122.4194 };
      const filters = { minRating: 4.0 };

      await orchestrator.searchByQuery('pizza', location, filters);

      expect(mockProvider.searchByQuery).toHaveBeenCalledWith('pizza', location, filters);
    });
  });

  describe('getRestaurantDetails', () => {
    it('should route to correct provider based on ID prefix', async () => {
      jest.spyOn(mockProvider, 'getRestaurantDetails').mockResolvedValue(mockRestaurant);

      const result = await orchestrator.getRestaurantDetails('mock-123');

      expect(result).toEqual(mockRestaurant);
      expect(mockProvider.getRestaurantDetails).toHaveBeenCalledWith('mock-123');
    });

    it('should try all providers if ID format is unknown', async () => {
      jest.spyOn(mockProvider, 'getRestaurantDetails').mockResolvedValue(mockRestaurant);

      const result = await orchestrator.getRestaurantDetails('unknown-id');

      expect(result).toEqual(mockRestaurant);
      expect(mockProvider.getRestaurantDetails).toHaveBeenCalled();
    });

    it('should return null if restaurant not found', async () => {
      jest.spyOn(mockProvider, 'getRestaurantDetails').mockResolvedValue(null);

      const result = await orchestrator.getRestaurantDetails('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return true if any provider is healthy', async () => {
      jest.spyOn(mockProvider, 'healthCheck').mockResolvedValue(true);

      const result = await orchestrator.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false if all providers are unhealthy', async () => {
      jest.spyOn(mockProvider, 'healthCheck').mockResolvedValue(false);

      const result = await orchestrator.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('getEnabledProviders', () => {
    it('should return list of enabled providers', () => {
      const providers = orchestrator.getEnabledProviders();

      expect(providers).toContain('mock');
      expect(providers).toHaveLength(1);
    });
  });

  describe('getProviderStats', () => {
    it('should return provider statistics', () => {
      const stats = orchestrator.getProviderStats();

      expect(stats).toHaveProperty('mock');
      expect(stats.mock.enabled).toBe(true);
      expect(stats).toHaveProperty('google_places');
      expect(stats.google_places.enabled).toBe(false);
    });
  });

  describe('strategy: ALL', () => {
    it('should query all providers and merge results', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'GOOGLE_PLACES_ENABLED') return true;
          if (key === 'PROVIDER_STRATEGY') return ProviderStrategy.ALL;
          return undefined;
        }),
      };

      const testOrchestrator = new ProviderOrchestratorService(
        mockConfig as unknown as ConfigService,
        googlePlacesProvider,
        mockProvider,
      );

      const googleResult = { ...mockRestaurant, id: 'gp_1', source: 'google_places' as const };
      const mockResult = { ...mockRestaurant, id: 'mock-1', source: 'mock' as const };

      jest.spyOn(googlePlacesProvider, 'searchNearby').mockResolvedValue([googleResult]);
      jest.spyOn(mockProvider, 'searchNearby').mockResolvedValue([mockResult]);

      const results = await testOrchestrator.searchNearby(37.7749, -122.4194, 5000);

      expect(results).toHaveLength(2);
      expect(googlePlacesProvider.searchNearby).toHaveBeenCalled();
      expect(mockProvider.searchNearby).toHaveBeenCalled();
    });

    it('should deduplicate restaurants with same name and location', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'GOOGLE_PLACES_ENABLED') return true;
          if (key === 'PROVIDER_STRATEGY') return ProviderStrategy.ALL;
          return undefined;
        }),
      };

      const testOrchestrator = new ProviderOrchestratorService(
        mockConfig as unknown as ConfigService,
        googlePlacesProvider,
        mockProvider,
      );

      const restaurant1 = { ...mockRestaurant, reviewCount: 50 };
      const restaurant2 = { ...mockRestaurant, reviewCount: 100 };

      jest.spyOn(googlePlacesProvider, 'searchNearby').mockResolvedValue([restaurant1]);
      jest.spyOn(mockProvider, 'searchNearby').mockResolvedValue([restaurant2]);

      const results = await testOrchestrator.searchNearby(37.7749, -122.4194, 5000);

      // Should keep the one with more reviews
      expect(results).toHaveLength(1);
      expect(results[0].reviewCount).toBe(100);
    });
  });
});

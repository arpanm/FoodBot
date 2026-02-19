import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../../services/redis.service';
import { GooglePlacesStatus } from '../../interfaces/google-places.types';
import {
  GooglePlacesApiKeyError,
  GooglePlacesTimeoutError,
  GooglePlacesNetworkError,
  GooglePlacesRateLimitError,
  GooglePlacesInvalidRequestError,
} from '../google-places/google-places.errors';
import { GooglePlacesMapper } from '../google-places/google-places.mapper';
import { GooglePlacesProvider } from '../google-places/google-places.provider';

describe('GooglePlacesProvider', () => {
  let provider: GooglePlacesProvider;
  let configService: ConfigService;
  let redisService: RedisService;
  let mapper: GooglePlacesMapper;

  const mockApiKey = 'test-api-key-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GooglePlacesProvider,
        GooglePlacesMapper,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'GOOGLE_PLACES_API_KEY') return mockApiKey;
              if (key === 'GOOGLE_PLACES_ENABLED') return true;
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

    provider = module.get<GooglePlacesProvider>(GooglePlacesProvider);
    configService = module.get<ConfigService>(ConfigService);
    redisService = module.get<RedisService>(RedisService);
    mapper = module.get<GooglePlacesMapper>(GooglePlacesMapper);

    // Initialize provider
    provider.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      expect(configService.get).toHaveBeenCalledWith('GOOGLE_PLACES_API_KEY');
      expect(provider).toBeDefined();
    });

    it('should disable provider if API key is missing', () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'GOOGLE_PLACES_API_KEY') return null;
          if (key === 'GOOGLE_PLACES_ENABLED') return true;
          return undefined;
        }),
      };

      const testProvider = new GooglePlacesProvider(
        mockConfig as unknown as ConfigService,
        redisService,
        mapper,
      );

      testProvider.onModuleInit();

      expect(mockConfig.get).toHaveBeenCalledWith('GOOGLE_PLACES_API_KEY');
    });
  });

  describe('searchNearby', () => {
    const mockSearchResponse = {
      status: GooglePlacesStatus.OK,
      results: [
        {
          place_id: 'ChIJ123',
          name: 'Test Restaurant',
          formatted_address: '123 Main St, San Francisco, CA',
          geometry: {
            location: { lat: 37.7749, lng: -122.4194 },
          },
          rating: 4.5,
          user_ratings_total: 100,
          price_level: 2,
          types: ['restaurant', 'food'],
          business_status: 'OPERATIONAL',
        },
      ],
      html_attributions: [],
    };

    it('should search restaurants near location', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const results = await provider.searchNearby(37.7749, -122.4194, 5000);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Restaurant');
      expect(results[0].source).toBe('google_places');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return cached results if available', async () => {
      const cachedResults = [
        {
          id: 'gp_ChIJ123',
          name: 'Cached Restaurant',
          source: 'google_places',
        },
      ];

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(cachedResults));

      const results = await provider.searchNearby(37.7749, -122.4194, 5000);

      expect(results).toEqual(cachedResults);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error for invalid coordinates', async () => {
      await expect(provider.searchNearby(100, -122.4194, 5000)).rejects.toThrow(GooglePlacesInvalidRequestError);

      await expect(provider.searchNearby(37.7749, 200, 5000)).rejects.toThrow(GooglePlacesInvalidRequestError);
    });

    it('should throw error for invalid radius', async () => {
      await expect(provider.searchNearby(37.7749, -122.4194, 0)).rejects.toThrow(GooglePlacesInvalidRequestError);

      await expect(provider.searchNearby(37.7749, -122.4194, 100000)).rejects.toThrow(
        GooglePlacesInvalidRequestError,
      );
    });

    it('should apply filters correctly', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const results = await provider.searchNearby(37.7749, -122.4194, 5000, {
        minRating: 4.0,
      });

      expect(results).toHaveLength(1);
      expect(results[0].rating).toBeGreaterThanOrEqual(4.0);
    });

    it('should handle network errors', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      await expect(provider.searchNearby(37.7749, -122.4194, 5000)).rejects.toThrow(GooglePlacesNetworkError);
    });

    it('should handle timeout errors', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(global, 'fetch').mockImplementation(() => {
        const error = new Error('AbortError') as Error & { name: string };
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(provider.searchNearby(37.7749, -122.4194, 5000)).rejects.toThrow(GooglePlacesTimeoutError);
    });

    it('should handle rate limit errors', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: GooglePlacesStatus.OVER_QUERY_LIMIT,
          error_message: 'Rate limit exceeded',
        }),
      } as Response);

      await expect(provider.searchNearby(37.7749, -122.4194, 5000)).rejects.toThrow(GooglePlacesRateLimitError);
    });
  });

  describe('searchByQuery', () => {
    const mockQueryResponse = {
      status: GooglePlacesStatus.OK,
      results: [
        {
          place_id: 'ChIJ456',
          name: 'Pizza Place',
          formatted_address: '456 Oak St, San Francisco, CA',
          geometry: {
            location: { lat: 37.7850, lng: -122.4183 },
          },
          rating: 4.8,
          user_ratings_total: 200,
          price_level: 2,
          types: ['restaurant', 'food', 'pizza'],
          business_status: 'OPERATIONAL',
        },
      ],
      html_attributions: [],
    };

    it('should search restaurants by query', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockQueryResponse,
      } as Response);

      const results = await provider.searchByQuery('pizza');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Pizza Place');
    });

    it('should throw error for empty query', async () => {
      await expect(provider.searchByQuery('')).rejects.toThrow(GooglePlacesInvalidRequestError);

      await expect(provider.searchByQuery('   ')).rejects.toThrow(GooglePlacesInvalidRequestError);
    });

    it('should return empty array for zero results', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: GooglePlacesStatus.ZERO_RESULTS,
          results: [],
        }),
      } as Response);

      const results = await provider.searchByQuery('nonexistent');

      expect(results).toEqual([]);
    });

    it('should include location in search if provided', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue();
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockQueryResponse,
      } as Response);

      await provider.searchByQuery('pizza', { lat: 37.7749, lng: -122.4194 });

      expect(fetchSpy).toHaveBeenCalled();
      const callUrl = (fetchSpy.mock.calls[0][0] as string);
      expect(callUrl).toContain('location=37.7749');
    });
  });

  describe('getRestaurantDetails', () => {
    const mockDetailsResponse = {
      status: GooglePlacesStatus.OK,
      result: {
        place_id: 'ChIJ789',
        name: 'Detailed Restaurant',
        formatted_address: '789 Mission St, San Francisco, CA',
        geometry: {
          location: { lat: 37.7799, lng: -122.4077 },
        },
        rating: 4.3,
        user_ratings_total: 150,
        price_level: 3,
        types: ['restaurant', 'food'],
        business_status: 'OPERATIONAL',
        formatted_phone_number: '+1 415-555-0100',
        website: 'https://example.com',
      },
      html_attributions: [],
    };

    it('should get restaurant details by ID', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockDetailsResponse,
      } as Response);

      const result = await provider.getRestaurantDetails('gp_ChIJ789');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Detailed Restaurant');
      expect(result!.phoneNumber).toBe('+1 415-555-0100');
    });

    it('should handle place_id without prefix', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockDetailsResponse,
      } as Response);

      const result = await provider.getRestaurantDetails('ChIJ789');

      expect(result).not.toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: GooglePlacesStatus.ZERO_RESULTS,
        }),
      } as Response);

      const result = await provider.getRestaurantDetails('invalid-id');

      expect(result).toBeNull();
    });

    it('should return cached details if available', async () => {
      const cachedDetail = {
        id: 'gp_ChIJ789',
        name: 'Cached Detail',
        source: 'google_places',
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(cachedDetail));

      const result = await provider.getRestaurantDetails('gp_ChIJ789');

      expect(result).toEqual(cachedDetail);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: GooglePlacesStatus.OK,
          results: [],
        }),
      } as Response);

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when provider is disabled', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'GOOGLE_PLACES_API_KEY') return null;
          if (key === 'GOOGLE_PLACES_ENABLED') return false;
          return undefined;
        }),
      };

      const testProvider = new GooglePlacesProvider(
        mockConfig as unknown as ConfigService,
        redisService,
        mapper,
      );

      testProvider.onModuleInit();

      const result = await testProvider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: GooglePlacesStatus.OK,
          results: [],
        }),
      } as Response);

      // Make 100 requests (rate limit)
      const promises = Array.from({ length: 100 }, () => provider.searchNearby(37.7749, -122.4194, 5000));

      await Promise.all(promises);

      // 101st request should fail
      await expect(provider.searchNearby(37.7749, -122.4194, 5000)).rejects.toThrow(GooglePlacesRateLimitError);
    });
  });

  describe('error handling', () => {
    it('should handle API key errors', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: GooglePlacesStatus.REQUEST_DENIED,
          error_message: 'Invalid API key',
        }),
      } as Response);

      await expect(provider.searchNearby(37.7749, -122.4194, 5000)).rejects.toThrow(GooglePlacesApiKeyError);
    });

    it('should handle invalid request errors', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: GooglePlacesStatus.INVALID_REQUEST,
          error_message: 'Invalid parameters',
        }),
      } as Response);

      await expect(provider.searchNearby(37.7749, -122.4194, 5000)).rejects.toThrow(
        GooglePlacesInvalidRequestError,
      );
    });
  });
});

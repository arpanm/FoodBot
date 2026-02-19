import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../../services/redis.service';
import {
  GooglePlacesSearchResponse,
  GooglePlaceDetailsResponse,
  GooglePlacesStatus,
  GooglePlace,
} from '../../interfaces/google-places.types';
import { IRestaurantProvider, Restaurant, Location, SearchFilters } from '../../interfaces/restaurant-provider.interface';

import {
  GooglePlacesApiKeyError,
  GooglePlacesTimeoutError,
  GooglePlacesNetworkError,
  GooglePlacesRateLimitError,
  GooglePlacesInvalidRequestError,
  GooglePlacesZeroResultsError,
  GooglePlacesUnexpectedError,
} from './google-places.errors';
import { GooglePlacesMapper } from './google-places.mapper';

/**
 * Google Places API Provider
 * Implements restaurant search using Google Places API
 */
@Injectable()
export class GooglePlacesProvider implements IRestaurantProvider, OnModuleInit {
  private readonly logger = new Logger(GooglePlacesProvider.name);
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private readonly defaultTimeout = 5000; // 5 seconds
  private readonly cacheEnabled = true;

  // Cache TTLs (in seconds)
  private readonly SEARCH_CACHE_TTL = 3600; // 1 hour
  private readonly DETAILS_CACHE_TTL = 7200; // 2 hours

  private apiKey: string | null = null;
  private isEnabled = false;

  // Rate limiting
  private requestCount = 0;
  private requestWindowStart = Date.now();
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxRequestsPerWindow = 100;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: RedisService,
    private readonly dataMapper: GooglePlacesMapper,
  ) {}

  onModuleInit(): void {
    this.apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY') || null;
    this.isEnabled = this.configService.get<boolean>('GOOGLE_PLACES_ENABLED', false);

    if (!this.apiKey && this.isEnabled) {
      this.logger.warn('Google Places API key not configured. Provider disabled.');
      this.isEnabled = false;
    } else if (this.isEnabled) {
      this.logger.log('Google Places provider initialized successfully');
    }
  }

  /**
   * Search restaurants near a location
   */
  async searchNearby(lat: number, lng: number, radius: number, filters?: SearchFilters): Promise<Restaurant[]> {
    this.validateEnabled();
    this.validateCoordinates(lat, lng);
    this.validateRadius(radius);

    const cacheKey = this.buildCacheKey('nearby', { lat, lng, radius, filters });

    // Check cache
    if (this.cacheEnabled) {
      const cached = await this.getCachedResult<Restaurant[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for nearby search: ${cacheKey}`);
        return cached;
      }
    }

    // Call API
    const url = `${this.baseUrl}/nearbysearch/json`;
    const params: Record<string, string> = {
      location: `${lat},${lng}`,
      radius: radius.toString(),
      type: 'restaurant',
      key: this.apiKey!,
    };

    // Add optional filters
    if (filters?.query) {
      params.keyword = filters.query;
    }
    if (filters?.minRating) {
      params.minprice = '0';
      params.maxprice = '4';
    }

    const response = await this.makeRequest<GooglePlacesSearchResponse>(url, params);

    if (response.status !== GooglePlacesStatus.OK) {
      this.handleApiError(response.status, response.error_message);
    }

    // Map results
    const restaurants = response.results.map((place) => this.dataMapper.toRestaurant(place));

    // Apply additional filters not supported by API
    let filtered = restaurants;
    if (filters?.minRating) {
      filtered = filtered.filter((r) => r.rating >= filters.minRating!);
    }
    if (filters?.cuisineTypes && filters.cuisineTypes.length > 0) {
      filtered = filtered.filter((r) => filters.cuisineTypes!.some((c) => r.cuisineTypes.includes(c)));
    }
    if (filters?.priceRange && filters.priceRange.length > 0) {
      filtered = filtered.filter((r) => filters.priceRange!.includes(r.priceRange));
    }

    // Cache results
    if (this.cacheEnabled) {
      await this.cacheResult(cacheKey, filtered, this.SEARCH_CACHE_TTL);
    }

    return filtered;
  }

  /**
   * Search restaurants by query string
   */
  async searchByQuery(query: string, location?: Location, filters?: SearchFilters): Promise<Restaurant[]> {
    this.validateEnabled();

    if (!query || query.trim().length === 0) {
      throw new GooglePlacesInvalidRequestError('Query cannot be empty');
    }

    const cacheKey = this.buildCacheKey('query', { query, location, filters });

    // Check cache
    if (this.cacheEnabled) {
      const cached = await this.getCachedResult<Restaurant[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for query search: ${cacheKey}`);
        return cached;
      }
    }

    // Call API
    const url = `${this.baseUrl}/textsearch/json`;
    const params: Record<string, string> = {
      query: `${query} restaurant`,
      key: this.apiKey!,
    };

    if (location) {
      params.location = `${location.lat},${location.lng}`;
      params.radius = (filters?.radius || 5000).toString();
    }

    const response = await this.makeRequest<GooglePlacesSearchResponse>(url, params);

    if (response.status === GooglePlacesStatus.ZERO_RESULTS) {
      return [];
    }

    if (response.status !== GooglePlacesStatus.OK) {
      this.handleApiError(response.status, response.error_message);
    }

    // Map results
    const restaurants = response.results.map((place) => this.dataMapper.toRestaurant(place));

    // Apply filters
    let filtered = restaurants;
    if (filters?.minRating) {
      filtered = filtered.filter((r) => r.rating >= filters.minRating!);
    }
    if (filters?.cuisineTypes && filters.cuisineTypes.length > 0) {
      filtered = filtered.filter((r) => filters.cuisineTypes!.some((c) => r.cuisineTypes.includes(c)));
    }
    if (filters?.priceRange && filters.priceRange.length > 0) {
      filtered = filtered.filter((r) => filters.priceRange!.includes(r.priceRange));
    }

    // Cache results
    if (this.cacheEnabled) {
      await this.cacheResult(cacheKey, filtered, this.SEARCH_CACHE_TTL);
    }

    return filtered;
  }

  /**
   * Get restaurant details by Place ID
   */
  async getRestaurantDetails(id: string): Promise<Restaurant | null> {
    this.validateEnabled();

    // Extract place_id from internal ID (format: gp_PLACE_ID)
    const placeId = id.startsWith('gp_') ? id.substring(3) : id;

    const cacheKey = this.buildCacheKey('details', { placeId });

    // Check cache
    if (this.cacheEnabled) {
      const cached = await this.getCachedResult<Restaurant>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for details: ${cacheKey}`);
        return cached;
      }
    }

    // Call API
    const url = `${this.baseUrl}/details/json`;
    const params: Record<string, string> = {
      place_id: placeId,
      key: this.apiKey!,
      fields: 'place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,types,opening_hours,photos,business_status,formatted_phone_number,website,address_components',
    };

    const response = await this.makeRequest<GooglePlaceDetailsResponse>(url, params);

    if (response.status === GooglePlacesStatus.ZERO_RESULTS) {
      return null;
    }

    if (response.status !== GooglePlacesStatus.OK) {
      this.handleApiError(response.status, response.error_message);
    }

    // Map result
    const restaurant = this.dataMapper.toRestaurant(response.result);

    // Cache result
    if (this.cacheEnabled) {
      await this.cacheResult(cacheKey, restaurant, this.DETAILS_CACHE_TTL);
    }

    return restaurant;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled || !this.apiKey) {
      return false;
    }

    try {
      // Try a simple search to verify API key
      const url = `${this.baseUrl}/nearbysearch/json`;
      const params = {
        location: '37.7749,-122.4194', // San Francisco
        radius: '100',
        type: 'restaurant',
        key: this.apiKey,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json()) as GooglePlacesSearchResponse;

      return data.status === GooglePlacesStatus.OK || data.status === GooglePlacesStatus.ZERO_RESULTS;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  private async makeRequest<T>(url: string, params: Record<string, string>): Promise<T> {
    // Rate limiting
    this.checkRateLimit();

    const fullUrl = `${url}?${new URLSearchParams(params)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

      this.logger.debug(`Making request to: ${url}`);

      const response = await fetch(fullUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new GooglePlacesNetworkError(`HTTP ${response.status}: ${response.statusText}`, url);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError') {
        throw new GooglePlacesTimeoutError(url, this.defaultTimeout);
      }
      if (error instanceof GooglePlacesNetworkError) {
        throw error;
      }
      throw new GooglePlacesNetworkError((error as Error).message, url);
    }
  }

  /**
   * Handle API error responses
   */
  private handleApiError(status: string, errorMessage?: string): never {
    switch (status) {
      case GooglePlacesStatus.ZERO_RESULTS:
        throw new GooglePlacesZeroResultsError(errorMessage);
      case GooglePlacesStatus.OVER_QUERY_LIMIT:
        throw new GooglePlacesRateLimitError(errorMessage);
      case GooglePlacesStatus.REQUEST_DENIED:
        throw new GooglePlacesApiKeyError(errorMessage);
      case GooglePlacesStatus.INVALID_REQUEST:
        throw new GooglePlacesInvalidRequestError(errorMessage || 'Invalid request parameters');
      default:
        throw new GooglePlacesUnexpectedError(errorMessage || 'Unknown error', status as GooglePlacesStatus);
    }
  }

  /**
   * Validate provider is enabled
   */
  private validateEnabled(): void {
    if (!this.isEnabled) {
      throw new GooglePlacesApiKeyError('Google Places provider is not enabled');
    }
  }

  /**
   * Validate coordinates
   */
  private validateCoordinates(lat: number, lng: number): void {
    if (lat < -90 || lat > 90) {
      throw new GooglePlacesInvalidRequestError('Latitude must be between -90 and 90', { lat });
    }
    if (lng < -180 || lng > 180) {
      throw new GooglePlacesInvalidRequestError('Longitude must be between -180 and 180', { lng });
    }
  }

  /**
   * Validate radius
   */
  private validateRadius(radius: number): void {
    if (radius < 1 || radius > 50000) {
      throw new GooglePlacesInvalidRequestError('Radius must be between 1 and 50000 meters', { radius });
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const windowElapsed = now - this.requestWindowStart;

    // Reset window if expired
    if (windowElapsed >= this.rateLimitWindow) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    // Check limit
    if (this.requestCount >= this.maxRequestsPerWindow) {
      throw new GooglePlacesRateLimitError(
        `Rate limit exceeded: ${this.maxRequestsPerWindow} requests per ${this.rateLimitWindow / 1000} seconds`,
      );
    }

    this.requestCount++;
  }

  /**
   * Build cache key
   */
  private buildCacheKey(type: string, params: Record<string, unknown>): string {
    const paramsStr = JSON.stringify(params);
    return `google_places:${type}:${paramsStr}`;
  }

  /**
   * Get cached result
   */
  private async getCachedResult<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheService.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.logger.error(`Failed to get cached result: ${key}`, error);
    }
    return null;
  }

  /**
   * Cache result
   */
  private async cacheResult(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await this.cacheService.set(key, JSON.stringify(data), ttl);
      this.logger.debug(`Cached result: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to cache result: ${key}`, error);
    }
  }
}

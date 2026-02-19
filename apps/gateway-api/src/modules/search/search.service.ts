import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../services/redis.service';

interface McpSearchResponse {
  restaurants?: McpRestaurant[];
  dishes?: McpDish[];
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queryTimeMs: number;
  provider: string;
}

interface McpRestaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  priceRange: number;
  deliveryTime: number;
  deliveryFee: number;
  minimumOrder: number;
  available: boolean;
  imageUrl: string;
  address: string;
  tags: string[];
  features: string[];
}

interface McpDish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  ingredients: string[];
  dietaryTags: string[];
  available: boolean;
  rating: number;
  imageUrl: string;
}

interface SearchRestaurantsParams {
  q?: string;
  cuisine?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  minRating?: number;
  priceRange?: number;
  maxDeliveryTime?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

interface SearchDishesParams {
  q?: string;
  dietary?: string[];
  category?: string;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Search Orchestrator request/response types used for the unified search API.
 */
interface OrchestratedSearchRequest {
  query: string;
  filters?: Record<string, unknown>;
  sort?: { field: string; order: string };
  page: number;
  pageSize: number;
  strategy?: string;
  userId?: string;
}

interface OrchestratedSearchResponse {
  results: Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    score: number;
    source: string;
    restaurant?: Record<string, unknown>;
    dish?: Record<string, unknown>;
  }>;
  metadata: {
    totalResults: number;
    page: number;
    pageSize: number;
    totalPages: number;
    queryTimeMs: number;
    sources: Array<{ name: string; latencyMs: number; resultCount: number; status: string }>;
    strategy: string;
    cacheHit: boolean;
    requestId: string;
  };
}

interface AutocompleteResponse {
  suggestions: Array<{ text: string; type: string; id?: string }>;
  queryTimeMs: number;
}

interface PopularSearchResponse {
  searches: Array<{ query: string; count: number; trending: boolean }>;
}

/**
 * Service that proxies search requests to the Search Orchestrator and MCP Orchestrator.
 * Includes Redis caching, timeout handling, and support for orchestrated multi-source search.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly mcpBaseUrl: string;
  private readonly searchOrchestratorUrl: string;

  private static readonly SEARCH_CACHE_TTL = 600;
  private static readonly SUGGESTIONS_CACHE_TTL = 300;
  private static readonly REQUEST_TIMEOUT_MS = 5000;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.mcpBaseUrl = this.configService.get<string>(
      'MCP_ORCHESTRATOR_URL',
      'http://localhost:8081/mcp/v1',
    );
    this.searchOrchestratorUrl = this.configService.get<string>(
      'SEARCH_ORCHESTRATOR_URL',
      'http://localhost:3002',
    );
  }

  /**
   * Searches restaurants via the MCP Orchestrator search endpoint with Redis caching.
   */
  async searchRestaurants(params: SearchRestaurantsParams): Promise<McpSearchResponse> {
    const cacheKey = this.buildCacheKey('search:restaurants', params);
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set('q', params.q);
    if (params.cuisine) queryParams.set('cuisine', params.cuisine);
    if (params.lat !== undefined) queryParams.set('lat', String(params.lat));
    if (params.lon !== undefined) queryParams.set('lon', String(params.lon));
    if (params.radius !== undefined) queryParams.set('radius', String(params.radius));
    if (params.minRating !== undefined) queryParams.set('minRating', String(params.minRating));
    if (params.priceRange !== undefined) queryParams.set('priceRange', String(params.priceRange));
    if (params.maxDeliveryTime !== undefined) {
      queryParams.set('maxDeliveryTime', String(params.maxDeliveryTime));
    }
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.page !== undefined) queryParams.set('page', String(params.page));
    if (params.pageSize !== undefined) queryParams.set('pageSize', String(params.pageSize));

    const url = `${this.mcpBaseUrl}/api/v1/search/restaurants?${queryParams.toString()}`;
    const result = await this.fetchWithTimeout<McpSearchResponse>(url);

    await this.cacheResult(cacheKey, result, SearchService.SEARCH_CACHE_TTL);
    return result;
  }

  /**
   * Searches dishes via the MCP Orchestrator search endpoint with Redis caching.
   */
  async searchDishes(params: SearchDishesParams): Promise<McpSearchResponse> {
    const cacheKey = this.buildCacheKey('search:dishes', params);
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set('q', params.q);
    if (params.dietary) {
      params.dietary.forEach((d) => queryParams.append('dietary', d));
    }
    if (params.category) queryParams.set('category', params.category);
    if (params.maxPrice !== undefined) queryParams.set('maxPrice', String(params.maxPrice));
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.page !== undefined) queryParams.set('page', String(params.page));
    if (params.pageSize !== undefined) queryParams.set('pageSize', String(params.pageSize));

    const url = `${this.mcpBaseUrl}/api/v1/search/dishes?${queryParams.toString()}`;
    const result = await this.fetchWithTimeout<McpSearchResponse>(url);

    await this.cacheResult(cacheKey, result, SearchService.SEARCH_CACHE_TTL);
    return result;
  }

  /**
   * Gets autocomplete suggestions via the MCP Orchestrator.
   */
  async getRestaurantSuggestions(prefix: string): Promise<string[]> {
    const cacheKey = `search:suggestions:${prefix.toLowerCase()}`;
    const cachedRaw = await this.redisService.get(cacheKey);
    if (cachedRaw) {
      return JSON.parse(cachedRaw) as string[];
    }

    const url = `${this.mcpBaseUrl}/api/v1/search/restaurants/suggestions?prefix=${encodeURIComponent(prefix)}`;
    const result = await this.fetchWithTimeout<string[]>(url);

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      SearchService.SUGGESTIONS_CACHE_TTL,
    );

    return result;
  }

  /**
   * Searches nearby restaurants via the MCP Orchestrator.
   */
  async searchNearbyRestaurants(
    lat: number,
    lon: number,
    radius: number,
    page: number,
    pageSize: number,
  ): Promise<McpSearchResponse> {
    const cacheKey = `search:nearby:${lat}:${lon}:${radius}:${page}:${pageSize}`;
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    const url =
      `${this.mcpBaseUrl}/api/v1/search/restaurants/nearby` +
      `?lat=${lat}&lon=${lon}&radius=${radius}&page=${page}&pageSize=${pageSize}`;
    const result = await this.fetchWithTimeout<McpSearchResponse>(url);

    await this.cacheResult(cacheKey, result, SearchService.SEARCH_CACHE_TTL);
    return result;
  }

  /**
   * Gets similar dishes via the MCP Orchestrator.
   */
  async getSimilarDishes(dishId: string): Promise<McpSearchResponse> {
    const cacheKey = `search:similar:${dishId}`;
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${this.mcpBaseUrl}/api/v1/search/dishes/similar/${dishId}`;
    const result = await this.fetchWithTimeout<McpSearchResponse>(url);

    await this.cacheResult(cacheKey, result, SearchService.SEARCH_CACHE_TTL);
    return result;
  }

  /**
   * Orchestrated search: routes the search through the Search Orchestrator service
   * which queries Elasticsearch, MCP Adapter, and PostgreSQL in parallel.
   */
  async orchestratedSearch(
    request: OrchestratedSearchRequest,
  ): Promise<OrchestratedSearchResponse> {
    const cacheKey = this.buildCacheKey('orch:search', request);
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      return cached as unknown as OrchestratedSearchResponse;
    }

    const url = `${this.searchOrchestratorUrl}/search`;
    const result = await this.postWithTimeout<OrchestratedSearchResponse>(url, request);

    await this.cacheResult(
      cacheKey,
      result as unknown as McpSearchResponse,
      SearchService.SEARCH_CACHE_TTL,
    );
    return result;
  }

  /**
   * Orchestrated autocomplete: uses the Search Orchestrator's fast autocomplete.
   */
  async orchestratedAutocomplete(
    prefix: string,
    limit?: number,
  ): Promise<AutocompleteResponse> {
    const cacheKey = `orch:autocomplete:${prefix.toLowerCase()}:${limit ?? 10}`;
    const cachedRaw = await this.redisService.get(cacheKey);
    if (cachedRaw) {
      return JSON.parse(cachedRaw) as AutocompleteResponse;
    }

    const url =
      `${this.searchOrchestratorUrl}/search/autocomplete` +
      `?prefix=${encodeURIComponent(prefix)}&limit=${limit ?? 10}`;
    const result = await this.fetchWithTimeout<AutocompleteResponse>(url);

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      SearchService.SUGGESTIONS_CACHE_TTL,
    );
    return result;
  }

  /**
   * Gets popular searches from the Search Orchestrator.
   */
  async getPopularSearches(): Promise<PopularSearchResponse> {
    const cacheKey = 'orch:popular-searches';
    const cachedRaw = await this.redisService.get(cacheKey);
    if (cachedRaw) {
      return JSON.parse(cachedRaw) as PopularSearchResponse;
    }

    const url = `${this.searchOrchestratorUrl}/search/popular`;
    const result = await this.fetchWithTimeout<PopularSearchResponse>(url);

    await this.redisService.set(cacheKey, JSON.stringify(result), 600);
    return result;
  }

  /**
   * Gets the health status of the Search Orchestrator and its sources.
   */
  async getSearchOrchestratorHealth(): Promise<Record<string, unknown>> {
    const url = `${this.searchOrchestratorUrl}/health`;
    return this.fetchWithTimeout<Record<string, unknown>>(url);
  }

  private async postWithTimeout<T>(url: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      SearchService.REQUEST_TIMEOUT_MS,
    );

    try {
      this.logger.debug(`POST ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Search orchestrator request failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Search orchestrator request timed out: ${url}`);
        throw new Error('Search request timed out');
      }
      this.logger.error(`Search orchestrator request failed: ${url}`, error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchWithTimeout<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      SearchService.REQUEST_TIMEOUT_MS,
    );

    try {
      this.logger.debug(`Fetching: ${url}`);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`MCP search request failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`MCP search request timed out: ${url}`);
        throw new Error('Search request timed out');
      }
      this.logger.error(`MCP search request failed: ${url}`, error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildCacheKey(prefix: string, params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          if (params[key] !== undefined && params[key] !== null) {
            acc[key] = params[key];
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );
    return `${prefix}:${JSON.stringify(sorted)}`;
  }

  private async getCachedResult(cacheKey: string): Promise<McpSearchResponse | null> {
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return JSON.parse(cached) as McpSearchResponse;
      }
    } catch (error) {
      this.logger.warn(`Cache read error: ${cacheKey}`, error);
    }
    return null;
  }

  private async cacheResult(
    cacheKey: string,
    result: McpSearchResponse,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), ttlSeconds);
      this.logger.debug(`Cached: ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`Cache write error: ${cacheKey}`, error);
    }
  }
}

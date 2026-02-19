/**
 * Swiggy API Provider implementation.
 * Uses session-proxied API calls to Swiggy's internal endpoints.
 */

import type {
  Provider,
  SearchQuery,
  SearchResult,
  RestaurantDetails,
  Menu,
  Dish,
  AvailabilityStatus,
  OrderRequest,
  OrderResponse,
  ProviderHealth,
} from '../../types/provider.types.js';
import type { ProviderName } from '../../types/common.types.js';
import { SwiggyClient } from './swiggyClient.js';
import { SwiggyAuth } from './swiggyAuth.js';
import { CacheManager } from '../../cache/CacheManager.js';
import { loadSwiggyConfig, type SwiggyConfig } from '../../config/swiggy.config.js';
import {
  mapSwiggyRestaurant,
  mapSwiggyMenu,
  mapSwiggyAvailability,
} from './swiggyMapper.js';
import type { SwiggyRestaurantWrapper, SwiggyMenuCategory } from '../../types/swiggy.types.js';

export class SwiggyAPIProvider implements Provider {
  readonly name: ProviderName = 'swiggy';
  private readonly client: SwiggyClient;
  private readonly auth: SwiggyAuth;
  private readonly cache: CacheManager;
  private readonly config: SwiggyConfig;

  constructor(auth: SwiggyAuth, cache: CacheManager, config?: SwiggyConfig) {
    this.config = config ?? loadSwiggyConfig();
    this.client = new SwiggyClient(this.config);
    this.auth = auth;
    this.cache = cache;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const isHealthy = await this.client.healthCheck();
      return {
        provider: 'swiggy',
        status: isHealthy ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: isHealthy ? 'Swiggy API reachable' : 'Swiggy API unreachable',
        circuitBreakerState: 'closed',
      };
    } catch (error) {
      return {
        provider: 'swiggy',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        circuitBreakerState: 'closed',
      };
    }
  }

  async searchRestaurants(query: SearchQuery): Promise<SearchResult> {
    const cacheKey = this.cache.buildSearchKey(
      'swiggy',
      query.query,
      query.location.lat,
      query.location.lng
    );

    const cached = await this.cache.get<SearchResult>(cacheKey);
    if (cached) {
      return {
        ...cached.data,
        metadata: {
          ...cached.data.metadata,
          source: 'cache',
          freshness: 'stale',
          cachedAt: new Date(cached.cachedAt).toISOString(),
        },
      };
    }

    const userContext = await this.auth.getUserContext(
      query.userId ?? 'anonymous',
      query.location
    );

    const response = await this.client.searchRestaurants(
      {
        sessionToken: userContext.sessionToken,
        lat: query.location.lat,
        lng: query.location.lng,
      },
      query.query,
      (query.pagination.page - 1) * query.pagination.pageSize,
      query.sortBy ?? 'relevance'
    );

    const restaurants = this.extractRestaurants(response.data?.cards ?? []);
    const mapped = restaurants.map((r) =>
      mapSwiggyRestaurant(r.info, query.location)
    );

    const result: SearchResult = {
      restaurants: mapped,
      totalCount: mapped.length,
      page: query.pagination.page,
      pageSize: query.pagination.pageSize,
      hasMore: response.data?.pageOffset?.nextOffset !== undefined,
      metadata: {
        source: 'swiggy',
        freshness: 'live',
        cachedAt: null,
        nextRefreshAt: new Date(
          Date.now() + this.config.cacheTTLMs.search
        ).toISOString(),
        queryTimeMs: 0,
        provider: 'swiggy',
      },
    };

    await this.cache.set(cacheKey, result, this.config.cacheTTLMs.search);
    return result;
  }

  async getRestaurantDetails(id: string): Promise<RestaurantDetails | null> {
    const externalId = id.replace('swiggy-', '');
    const cacheKey = this.cache.buildRestaurantKey('swiggy', externalId);

    const cached = await this.cache.get<RestaurantDetails>(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Swiggy doesn't have a separate details endpoint; fetch menu which includes details
    return null;
  }

  async getMenu(restaurantId: string): Promise<Menu | null> {
    const externalId = restaurantId.replace('swiggy-', '');
    const cacheKey = this.cache.buildMenuKey('swiggy', externalId);

    const cached = await this.cache.get<Menu>(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Menu requires user context for location-based pricing
    // For anonymous access, use a default location
    try {
      const response = await this.client.getRestaurantMenu(
        {
          sessionToken: '',
          lat: 12.9716,
          lng: 77.5946,
        },
        externalId
      );

      const categories = this.extractMenuCategories(response.data?.cards ?? []);
      const menu = mapSwiggyMenu(categories, externalId, '');

      await this.cache.set(cacheKey, menu, this.config.cacheTTLMs.menu);
      return menu;
    } catch {
      return null;
    }
  }

  async getDishDetails(_dishId: string): Promise<Dish | null> {
    // Swiggy doesn't expose individual dish endpoints
    // Dishes are fetched as part of the menu
    return null;
  }

  async checkAvailability(restaurantId: string): Promise<AvailabilityStatus> {
    const externalId = restaurantId.replace('swiggy-', '');
    const cacheKey = this.cache.buildAvailabilityKey('swiggy', externalId);

    const cached = await this.cache.get<AvailabilityStatus>(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Default availability when we can't check
    return {
      restaurantId,
      isOpen: false,
      isAcceptingOrders: false,
      estimatedDeliveryMinutes: 0,
      nextOpenTime: null,
      message: 'Unable to check availability. Please try again.',
    };
  }

  async placeOrder(_order: OrderRequest): Promise<OrderResponse> {
    // Order placement requires deep session integration
    // This is a complex flow that involves cart management
    throw new Error(
      'Swiggy order placement is not yet implemented. ' +
        'This requires cart management and payment integration.'
    );
  }

  private extractRestaurants(
    cards: Array<{ card: { card: Record<string, unknown> } }>
  ): SwiggyRestaurantWrapper[] {
    const restaurants: SwiggyRestaurantWrapper[] = [];

    for (const card of cards) {
      const innerCard = card.card?.card;
      const gridElements = innerCard?.gridElements as
        | { infoWithStyle?: { restaurants?: SwiggyRestaurantWrapper[] } }
        | undefined;

      if (gridElements?.infoWithStyle?.restaurants) {
        restaurants.push(...gridElements.infoWithStyle.restaurants);
      }
    }

    return restaurants;
  }

  private extractMenuCategories(
    cards: Array<{ card: { card: Record<string, unknown> } }>
  ): SwiggyMenuCategory[] {
    const categories: SwiggyMenuCategory[] = [];

    for (const card of cards) {
      const innerCard = card.card?.card;
      if (innerCard?.categories) {
        categories.push(
          ...(innerCard.categories as SwiggyMenuCategory[])
        );
      }
    }

    return categories;
  }
}

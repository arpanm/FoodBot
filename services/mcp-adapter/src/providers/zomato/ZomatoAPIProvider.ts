/**
 * Zomato API Provider implementation.
 * Dual-strategy: Legacy API key (read-only) + Session-based (full access).
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
  Restaurant,
} from '../../types/provider.types.js';
import type { ProviderName } from '../../types/common.types.js';
import { ZomatoClient } from './zomatoClient.js';
import { ZomatoAuth, ZomatoNotLinkedError } from './zomatoAuth.js';
import { CacheManager } from '../../cache/CacheManager.js';
import { loadZomatoConfig, type ZomatoConfig } from '../../config/zomato.config.js';
import {
  mapZomatoRestaurant,
  mapZomatoMenu,
  mapZomatoReview,
  mapZomatoAvailability,
} from './zomatoMapper.js';

export class ZomatoAPIProvider implements Provider {
  readonly name: ProviderName = 'zomato';
  private readonly client: ZomatoClient;
  private readonly auth: ZomatoAuth;
  private readonly cache: CacheManager;
  private readonly config: ZomatoConfig;

  constructor(auth: ZomatoAuth, cache: CacheManager, config?: ZomatoConfig) {
    this.config = config ?? loadZomatoConfig();
    this.client = new ZomatoClient(this.config);
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
      const usage = this.client.getDailyUsage();
      return {
        provider: 'zomato',
        status: isHealthy ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: isHealthy
          ? `Zomato API reachable. Daily usage: ${usage.used}/${usage.limit}`
          : 'Zomato API unreachable',
        circuitBreakerState: 'closed',
      };
    } catch (error) {
      return {
        provider: 'zomato',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: `Health check failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        circuitBreakerState: 'closed',
      };
    }
  }

  async searchRestaurants(query: SearchQuery): Promise<SearchResult> {
    const cacheKey = this.cache.buildSearchKey(
      'zomato',
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

    // Strategy A: Try legacy API key first (no user session needed)
    try {
      const response = await this.client.searchRestaurantsLegacy(
        query.query,
        query.location.lat,
        query.location.lng,
        {
          count: query.pagination.pageSize,
          start: (query.pagination.page - 1) * query.pagination.pageSize,
          sort: this.mapSortOption(query.sortBy),
          radius: query.radiusKm * 1000,
        }
      );

      const restaurants: Restaurant[] = (response.restaurants ?? []).map(
        (wrapper) => mapZomatoRestaurant(wrapper.restaurant, query.location)
      );

      const result: SearchResult = {
        restaurants,
        totalCount: response.results_found ?? restaurants.length,
        page: query.pagination.page,
        pageSize: query.pagination.pageSize,
        hasMore:
          (response.results_start ?? 0) + (response.results_shown ?? 0) <
          (response.results_found ?? 0),
        metadata: {
          source: 'zomato-api',
          freshness: 'live',
          cachedAt: null,
          nextRefreshAt: new Date(
            Date.now() + this.config.cacheTTLMs.search
          ).toISOString(),
          queryTimeMs: 0,
          provider: 'zomato',
        },
      };

      await this.cache.set(cacheKey, result, this.config.cacheTTLMs.search);
      return result;
    } catch {
      // Strategy A failed, try Strategy B (session-based)
    }

    // Strategy B: Try session-based API
    try {
      const userContext = await this.auth.getUserContext(
        query.userId ?? 'anonymous',
        query.location
      );

      // Session-based search would go through internal APIs
      // For now, return empty result as session search implementation
      // requires deeper Zomato internal API reverse engineering
      return {
        restaurants: [],
        totalCount: 0,
        page: query.pagination.page,
        pageSize: query.pagination.pageSize,
        hasMore: false,
        metadata: {
          source: 'zomato-session',
          freshness: 'live',
          cachedAt: null,
          nextRefreshAt: null,
          queryTimeMs: 0,
          provider: 'zomato',
        },
      };
    } catch (error) {
      if (error instanceof ZomatoNotLinkedError) {
        // No session available, return empty
        return {
          restaurants: [],
          totalCount: 0,
          page: query.pagination.page,
          pageSize: query.pagination.pageSize,
          hasMore: false,
          metadata: {
            source: 'zomato-api',
            freshness: 'live',
            cachedAt: null,
            nextRefreshAt: null,
            queryTimeMs: 0,
            provider: 'zomato',
          },
        };
      }
      throw error;
    }
  }

  async getRestaurantDetails(id: string): Promise<RestaurantDetails | null> {
    const externalId = id.replace('zomato-', '');
    const cacheKey = this.cache.buildRestaurantKey('zomato', externalId);

    const cached = await this.cache.get<RestaurantDetails>(cacheKey);
    if (cached) {
      return cached.data;
    }

    try {
      const response = await this.client.getRestaurantLegacy(externalId);
      const restaurant = mapZomatoRestaurant(response.restaurant);

      // Fetch reviews separately
      let reviews: ReturnType<typeof mapZomatoReview>[] = [];
      try {
        const reviewsResponse = await this.client.getReviewsLegacy(externalId);
        reviews = (reviewsResponse.user_reviews ?? []).map(mapZomatoReview);
      } catch {
        reviews = [];
      }

      const details: RestaurantDetails = {
        ...restaurant,
        description: '',
        phone: response.restaurant.phone_numbers ?? '',
        email: '',
        website: response.restaurant.url ?? '',
        menuCategories: [],
        photos: response.restaurant.featured_image
          ? [response.restaurant.featured_image]
          : [],
        reviews,
      };

      await this.cache.set(
        cacheKey,
        details,
        this.config.cacheTTLMs.restaurant
      );
      return details;
    } catch {
      return null;
    }
  }

  async getMenu(restaurantId: string): Promise<Menu | null> {
    const externalId = restaurantId.replace('zomato-', '');
    const cacheKey = this.cache.buildMenuKey('zomato', externalId);

    const cached = await this.cache.get<Menu>(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Menu requires session-based access
    try {
      const userContext = await this.auth.getUserContext('system');
      const response = await this.client.getMenuSession(
        externalId,
        userContext.sessionToken
      );

      const sections =
        response.pages?.[0]?.order?.menuList ?? [];
      const menu = mapZomatoMenu(
        sections,
        externalId,
        response.restaurant?.name ?? ''
      );

      await this.cache.set(cacheKey, menu, this.config.cacheTTLMs.menu);
      return menu;
    } catch {
      return null;
    }
  }

  async getDishDetails(_dishId: string): Promise<Dish | null> {
    return null;
  }

  async checkAvailability(restaurantId: string): Promise<AvailabilityStatus> {
    const externalId = restaurantId.replace('zomato-', '');
    const cacheKey = this.cache.buildAvailabilityKey('zomato', externalId);

    const cached = await this.cache.get<AvailabilityStatus>(cacheKey);
    if (cached) {
      return cached.data;
    }

    try {
      const response = await this.client.getRestaurantLegacy(externalId);
      const availability = mapZomatoAvailability(response.restaurant);

      await this.cache.set(
        cacheKey,
        availability,
        this.config.cacheTTLMs.availability
      );
      return availability;
    } catch {
      return {
        restaurantId,
        isOpen: false,
        isAcceptingOrders: false,
        estimatedDeliveryMinutes: 0,
        nextOpenTime: null,
        message: 'Unable to check availability.',
      };
    }
  }

  async placeOrder(_order: OrderRequest): Promise<OrderResponse> {
    throw new Error(
      'Zomato order placement is not yet implemented. ' +
        'Requires session-based cart and payment integration.'
    );
  }

  private mapSortOption(
    sortBy?: string
  ): string {
    const mapping: Record<string, string> = {
      relevance: 'relevance',
      rating: 'rating',
      delivery_time: 'real_distance',
      distance: 'real_distance',
      price_low_to_high: 'cost',
      price_high_to_low: 'cost',
      popularity: 'popularity',
    };
    return mapping[sortBy ?? 'relevance'] ?? 'relevance';
  }
}

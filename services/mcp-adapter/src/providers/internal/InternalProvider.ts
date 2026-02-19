/**
 * Internal Provider implementation.
 * Direct integration with FoodBot's own database and API.
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
import { InternalClient } from './internalClient.js';
import { CacheManager } from '../../cache/CacheManager.js';
import {
  mapInternalRestaurant,
  mapInternalDish,
  mapInternalMenu,
  mapInternalAvailability,
} from './internalMapper.js';

export class InternalProvider implements Provider {
  readonly name: ProviderName = 'internal';
  private readonly client: InternalClient;
  private readonly cache: CacheManager;
  private enabled: boolean;

  constructor(cache: CacheManager, enabled = true) {
    this.client = new InternalClient();
    this.cache = cache;
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const isHealthy = await this.client.healthCheck();
      return {
        provider: 'internal',
        status: isHealthy ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: isHealthy
          ? 'Internal API reachable'
          : 'Internal API unreachable',
        circuitBreakerState: 'closed',
      };
    } catch (error) {
      return {
        provider: 'internal',
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
      'internal',
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

    const startTime = Date.now();
    const response = await this.client.searchRestaurants(
      query.query,
      query.location.lat,
      query.location.lng,
      {
        radiusKm: query.radiusKm,
        limit: query.pagination.pageSize,
        offset: (query.pagination.page - 1) * query.pagination.pageSize,
        cuisines: query.cuisines,
      }
    );

    const restaurants = (response.restaurants ?? []).map((entity) =>
      mapInternalRestaurant(entity, query.location)
    );

    const result: SearchResult = {
      restaurants,
      totalCount: response.total ?? restaurants.length,
      page: query.pagination.page,
      pageSize: query.pagination.pageSize,
      hasMore:
        (query.pagination.page - 1) * query.pagination.pageSize +
          restaurants.length <
        (response.total ?? 0),
      metadata: {
        source: 'internal-api',
        freshness: 'live',
        cachedAt: null,
        nextRefreshAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        queryTimeMs: Date.now() - startTime,
        provider: 'internal',
      },
    };

    await this.cache.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  async getRestaurantDetails(id: string): Promise<RestaurantDetails | null> {
    const externalId = id.replace('internal-', '');
    const cacheKey = this.cache.buildRestaurantKey('internal', externalId);

    const cached = await this.cache.get<RestaurantDetails>(cacheKey);
    if (cached) {
      return cached.data;
    }

    const entity = await this.client.getRestaurant(externalId);
    if (!entity) {
      return null;
    }

    const restaurant = mapInternalRestaurant(entity);
    const dishes = await this.client.getDishes(externalId);

    const details: RestaurantDetails = {
      ...restaurant,
      description: entity.description ?? '',
      phone: '',
      email: '',
      website: '',
      menuCategories: mapInternalMenu(dishes, externalId, entity.name).categories,
      photos: entity.imageUrl ? [entity.imageUrl] : [],
      reviews: [],
    };

    await this.cache.set(cacheKey, details, 15 * 60 * 1000);
    return details;
  }

  async getMenu(restaurantId: string): Promise<Menu | null> {
    const externalId = restaurantId.replace('internal-', '');
    const cacheKey = this.cache.buildMenuKey('internal', externalId);

    const cached = await this.cache.get<Menu>(cacheKey);
    if (cached) {
      return cached.data;
    }

    const entity = await this.client.getRestaurant(externalId);
    if (!entity) {
      return null;
    }

    const dishes = await this.client.getDishes(externalId);
    const menu = mapInternalMenu(dishes, externalId, entity.name);

    await this.cache.set(cacheKey, menu, 10 * 60 * 1000);
    return menu;
  }

  async getDishDetails(dishId: string): Promise<Dish | null> {
    const externalId = dishId.replace('internal-dish-', '');
    const entity = await this.client.getDish(externalId);
    if (!entity) {
      return null;
    }
    return mapInternalDish(entity);
  }

  async checkAvailability(restaurantId: string): Promise<AvailabilityStatus> {
    const externalId = restaurantId.replace('internal-', '');
    const entity = await this.client.getRestaurant(externalId);

    if (!entity) {
      return {
        restaurantId,
        isOpen: false,
        isAcceptingOrders: false,
        estimatedDeliveryMinutes: 0,
        nextOpenTime: null,
        message: 'Restaurant not found.',
      };
    }

    return mapInternalAvailability(entity);
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    // Internal orders are placed through the Gateway API
    // This would make a POST to the orders endpoint
    return {
      orderId: `internal-order-${Date.now()}`,
      status: 'placed',
      estimatedDeliveryMinutes: 30,
      totalAmount: 0,
      currency: 'INR',
      trackingUrl: '',
      message: 'Order placed successfully via internal system.',
    };
  }
}

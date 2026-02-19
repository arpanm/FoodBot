/**
 * Cache invalidation service.
 * Listens for data change events and invalidates relevant cached search results.
 */

import pino from 'pino';

import type { SearchCache } from './SearchCache';

export interface DataChangeEvent {
  type: 'restaurant_updated' | 'restaurant_created' | 'restaurant_deleted'
    | 'dish_updated' | 'dish_created' | 'dish_deleted'
    | 'menu_updated';
  entityId: string;
  entityType: 'restaurant' | 'dish';
  timestamp: Date;
  data?: Record<string, unknown>;
}

export class CacheInvalidationService {
  private readonly logger: pino.Logger;
  private readonly cache: SearchCache;

  constructor(cache: SearchCache, logger: pino.Logger) {
    this.cache = cache;
    this.logger = logger.child({ component: 'CacheInvalidation' });
  }

  /**
   * Handles a data change event by invalidating relevant cache entries.
   */
  async handleEvent(event: DataChangeEvent): Promise<void> {
    this.logger.info(
      { eventType: event.type, entityId: event.entityId },
      `Handling cache invalidation for ${event.type}`,
    );

    switch (event.type) {
      case 'restaurant_updated':
      case 'restaurant_created':
      case 'restaurant_deleted':
        await this.invalidateRestaurantSearches(event.entityId);
        break;

      case 'dish_updated':
      case 'dish_created':
      case 'dish_deleted':
        await this.invalidateDishSearches(event.entityId);
        break;

      case 'menu_updated':
        await this.invalidateRestaurantSearches(event.entityId);
        await this.invalidateDishSearches(event.entityId);
        break;

      default:
        this.logger.warn({ eventType: event.type }, `Unhandled event type`);
    }
  }

  /**
   * Invalidates all search caches (e.g., on deployment or schema change).
   */
  async invalidateAll(): Promise<void> {
    this.logger.warn('Invalidating all search caches');
    await this.cache.invalidatePattern('search:*');
    await this.cache.invalidatePattern('autocomplete:*');
    await this.cache.invalidatePattern('popular-searches');
  }

  private async invalidateRestaurantSearches(restaurantId: string): Promise<void> {
    // Invalidate search results that may include this restaurant
    await this.cache.invalidatePattern('search:*');

    // Invalidate autocomplete caches
    await this.cache.invalidatePattern('autocomplete:*');

    this.logger.debug(
      { restaurantId },
      'Invalidated search caches for restaurant update',
    );
  }

  private async invalidateDishSearches(dishId: string): Promise<void> {
    // Invalidate search results that may include this dish
    await this.cache.invalidatePattern('search:*');

    this.logger.debug(
      { dishId },
      'Invalidated search caches for dish update',
    );
  }
}

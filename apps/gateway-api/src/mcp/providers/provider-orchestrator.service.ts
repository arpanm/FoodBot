import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IRestaurantProvider, Restaurant, Location, SearchFilters } from '../interfaces/restaurant-provider.interface';
import { ProviderStrategy } from '../config/providers.config';

import { GooglePlacesProvider } from './google-places/google-places.provider';
import { MockRestaurantProvider } from './mock/mock.provider';

/**
 * Provider Orchestrator Service
 * Manages multiple restaurant providers and implements fallback strategies
 */
@Injectable()
export class ProviderOrchestratorService implements IRestaurantProvider {
  private readonly logger = new Logger(ProviderOrchestratorService.name);
  private readonly strategy: ProviderStrategy;
  private readonly providers: Array<{ provider: IRestaurantProvider; name: string; enabled: boolean }> = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly googlePlacesProvider: GooglePlacesProvider,
    private readonly mockProvider: MockRestaurantProvider,
  ) {
    // Initialize strategy
    this.strategy =
      (this.configService.get<string>('PROVIDER_STRATEGY') as ProviderStrategy) || ProviderStrategy.FALLBACK;

    // Register providers in priority order
    this.providers = [
      {
        provider: this.googlePlacesProvider,
        name: 'google_places',
        enabled: this.configService.get<boolean>('GOOGLE_PLACES_ENABLED', false),
      },
      {
        provider: this.mockProvider,
        name: 'mock',
        enabled: true, // Always enabled as fallback
      },
    ];

    this.logger.log(`Provider orchestrator initialized with strategy: ${this.strategy}`);
    this.logger.log(`Enabled providers: ${this.providers.filter((p) => p.enabled).map((p) => p.name).join(', ')}`);
  }

  /**
   * Search restaurants near a location
   */
  async searchNearby(lat: number, lng: number, radius: number, filters?: SearchFilters): Promise<Restaurant[]> {
    return this.executeWithStrategy(async (provider) => provider.searchNearby(lat, lng, radius, filters));
  }

  /**
   * Search restaurants by query
   */
  async searchByQuery(query: string, location?: Location, filters?: SearchFilters): Promise<Restaurant[]> {
    return this.executeWithStrategy(async (provider) => provider.searchByQuery(query, location, filters));
  }

  /**
   * Get restaurant details
   */
  async getRestaurantDetails(id: string): Promise<Restaurant | null> {
    // Try to determine which provider should handle this based on ID format
    if (id.startsWith('gp_')) {
      try {
        return await this.googlePlacesProvider.getRestaurantDetails(id);
      } catch (error) {
        this.logger.error(`Google Places provider failed for ID: ${id}`, error);
      }
    }

    if (id.startsWith('mock-')) {
      return this.mockProvider.getRestaurantDetails(id);
    }

    // Try all providers
    for (const { provider, name, enabled } of this.providers) {
      if (!enabled) continue;

      try {
        const result = await provider.getRestaurantDetails(id);
        if (result) {
          this.logger.debug(`Found restaurant ${id} using provider: ${name}`);
          return result;
        }
      } catch (error) {
        this.logger.error(`Provider ${name} failed for getRestaurantDetails`, error);
      }
    }

    return null;
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<boolean> {
    const results = await Promise.allSettled(
      this.providers
        .filter((p) => p.enabled)
        .map(async ({ provider, name }) => {
          const healthy = await provider.healthCheck();
          this.logger.debug(`Provider ${name} health check: ${healthy ? 'healthy' : 'unhealthy'}`);
          return healthy;
        }),
    );

    return results.some((r) => r.status === 'fulfilled' && r.value);
  }

  /**
   * Execute provider call with configured strategy
   */
  private async executeWithStrategy<T>(providerCall: (provider: IRestaurantProvider) => Promise<T>): Promise<T> {
    switch (this.strategy) {
      case ProviderStrategy.PRIMARY:
        return this.executePrimary(providerCall);

      case ProviderStrategy.FALLBACK:
        return this.executeFallback(providerCall);

      case ProviderStrategy.ALL:
        return this.executeAll(providerCall);

      case ProviderStrategy.FASTEST:
        return this.executeFastest(providerCall);

      default:
        return this.executeFallback(providerCall);
    }
  }

  /**
   * Execute only primary provider
   */
  private async executePrimary<T>(providerCall: (provider: IRestaurantProvider) => Promise<T>): Promise<T> {
    const primary = this.providers.find((p) => p.enabled);

    if (!primary) {
      throw new Error('No providers enabled');
    }

    this.logger.debug(`Executing primary provider: ${primary.name}`);
    return providerCall(primary.provider);
  }

  /**
   * Execute with fallback to next provider on failure
   */
  private async executeFallback<T>(providerCall: (provider: IRestaurantProvider) => Promise<T>): Promise<T> {
    const enabledProviders = this.providers.filter((p) => p.enabled);

    if (enabledProviders.length === 0) {
      throw new Error('No providers enabled');
    }

    for (const { provider, name } of enabledProviders) {
      try {
        this.logger.debug(`Trying provider: ${name}`);
        const result = await providerCall(provider);

        // Check if result is empty array
        if (Array.isArray(result) && result.length === 0) {
          this.logger.debug(`Provider ${name} returned empty results, trying next provider`);
          continue;
        }

        this.logger.debug(`Provider ${name} succeeded`);
        return result;
      } catch (error) {
        this.logger.error(`Provider ${name} failed, trying next provider`, error);
        continue;
      }
    }

    // If all providers failed, return empty array or null based on return type
    this.logger.warn('All providers failed');
    return [] as T;
  }

  /**
   * Execute all providers and merge results
   */
  private async executeAll<T>(providerCall: (provider: IRestaurantProvider) => Promise<T>): Promise<T> {
    const enabledProviders = this.providers.filter((p) => p.enabled);

    if (enabledProviders.length === 0) {
      throw new Error('No providers enabled');
    }

    const results = await Promise.allSettled(
      enabledProviders.map(async ({ provider, name }) => {
        this.logger.debug(`Executing provider: ${name}`);
        return providerCall(provider);
      }),
    );

    // Merge all successful results
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (successfulResults.length === 0) {
      this.logger.warn('All providers failed');
      return [] as T;
    }

    // If results are arrays, merge and deduplicate
    if (Array.isArray(successfulResults[0])) {
      const merged = successfulResults.flat();
      const deduplicated = this.deduplicateRestaurants(merged as unknown as Restaurant[]);
      return deduplicated as T;
    }

    // Return first successful result
    return successfulResults[0];
  }

  /**
   * Execute all providers and return first successful result
   */
  private async executeFastest<T>(providerCall: (provider: IRestaurantProvider) => Promise<T>): Promise<T> {
    const enabledProviders = this.providers.filter((p) => p.enabled);

    if (enabledProviders.length === 0) {
      throw new Error('No providers enabled');
    }

    return Promise.race(
      enabledProviders.map(({ provider, name }) => {
        this.logger.debug(`Racing provider: ${name}`);
        return providerCall(provider);
      }),
    );
  }

  /**
   * Deduplicate restaurants by name and location
   */
  private deduplicateRestaurants(restaurants: Restaurant[]): Restaurant[] {
    const seen = new Map<string, Restaurant>();

    for (const restaurant of restaurants) {
      const key = `${restaurant.name}-${restaurant.location.lat}-${restaurant.location.lng}`;

      if (!seen.has(key)) {
        seen.set(key, restaurant);
      } else {
        // Keep the one with more reviews or higher rating
        const existing = seen.get(key)!;
        if (
          restaurant.reviewCount > existing.reviewCount ||
          (restaurant.reviewCount === existing.reviewCount && restaurant.rating > existing.rating)
        ) {
          seen.set(key, restaurant);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders(): string[] {
    return this.providers.filter((p) => p.enabled).map((p) => p.name);
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): Record<string, { enabled: boolean }> {
    const stats: Record<string, { enabled: boolean }> = {};

    for (const { name, enabled } of this.providers) {
      stats[name] = { enabled };
    }

    return stats;
  }
}

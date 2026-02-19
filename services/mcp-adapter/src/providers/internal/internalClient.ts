/**
 * Client for FoodBot's internal REST API and database.
 */

import type {
  InternalRestaurantEntity,
  InternalDishEntity,
} from './internalMapper.js';

export interface InternalClientConfig {
  apiBaseUrl: string;
  serviceToken: string;
  timeoutMs: number;
}

const DEFAULT_CONFIG: InternalClientConfig = {
  apiBaseUrl: process.env['INTERNAL_API_BASE_URL'] ?? 'http://localhost:3000/api',
  serviceToken: process.env['INTERNAL_SERVICE_TOKEN'] ?? '',
  timeoutMs: 3000,
};

export class InternalClient {
  private readonly config: InternalClientConfig;

  constructor(config?: Partial<InternalClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search restaurants via internal API.
   */
  async searchRestaurants(
    query: string,
    lat: number,
    lng: number,
    options?: { radiusKm?: number; limit?: number; offset?: number; cuisines?: string[] }
  ): Promise<{ restaurants: InternalRestaurantEntity[]; total: number }> {
    const url = new URL('/restaurants/search', this.config.apiBaseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lng', String(lng));
    if (options?.radiusKm) {
      url.searchParams.set('radius', String(options.radiusKm));
    }
    if (options?.limit) {
      url.searchParams.set('limit', String(options.limit));
    }
    if (options?.offset) {
      url.searchParams.set('offset', String(options.offset));
    }
    if (options?.cuisines?.length) {
      url.searchParams.set('cuisines', options.cuisines.join(','));
    }

    return this.makeRequest<{ restaurants: InternalRestaurantEntity[]; total: number }>(
      url.toString()
    );
  }

  /**
   * Get restaurant by ID.
   */
  async getRestaurant(id: string): Promise<InternalRestaurantEntity | null> {
    try {
      return await this.makeRequest<InternalRestaurantEntity>(
        `${this.config.apiBaseUrl}/restaurants/${id}`
      );
    } catch {
      return null;
    }
  }

  /**
   * Get dishes for a restaurant.
   */
  async getDishes(restaurantId: string): Promise<InternalDishEntity[]> {
    try {
      const response = await this.makeRequest<{ dishes: InternalDishEntity[] }>(
        `${this.config.apiBaseUrl}/restaurants/${restaurantId}/menu`
      );
      return response.dishes ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Get a specific dish.
   */
  async getDish(dishId: string): Promise<InternalDishEntity | null> {
    try {
      return await this.makeRequest<InternalDishEntity>(
        `${this.config.apiBaseUrl}/dishes/${dishId}`
      );
    } catch {
      return null;
    }
  }

  /**
   * Health check.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.config.apiBaseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async makeRequest<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      if (this.config.serviceToken) {
        headers['Authorization'] = `Bearer ${this.config.serviceToken}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new InternalApiError(
          response.status,
          `Internal API returned ${response.status}`,
          url
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof InternalApiError) {
        throw error;
      }

      throw new InternalApiError(
        500,
        `Internal API request failed: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }
}

export class InternalApiError extends Error {
  readonly statusCode: number;
  readonly url: string;

  constructor(statusCode: number, message: string, url: string) {
    super(message);
    this.name = 'InternalApiError';
    this.statusCode = statusCode;
    this.url = url;
  }
}

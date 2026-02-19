/**
 * HTTP client for Swiggy's internal APIs.
 * Makes authenticated requests using the user's session token.
 */

import type { SwiggyConfig } from '../../config/swiggy.config.js';
import type {
  SwiggyRestaurantListResponse,
  SwiggyMenuResponse,
  SwiggySearchResponse,
} from '../../types/swiggy.types.js';

export interface SwiggyClientOptions {
  sessionToken: string;
  lat: number;
  lng: number;
}

export class SwiggyClient {
  private readonly config: SwiggyConfig;

  constructor(config: SwiggyConfig) {
    this.config = config;
  }

  /**
   * Search restaurants by location.
   */
  async searchRestaurants(
    options: SwiggyClientOptions,
    query: string,
    offset = 0,
    sortBy = 'relevance'
  ): Promise<SwiggyRestaurantListResponse> {
    const url = new URL(
      this.config.searchEndpoint,
      this.config.baseUrl
    );
    url.searchParams.set('lat', String(options.lat));
    url.searchParams.set('lng', String(options.lng));
    url.searchParams.set('page_type', 'DESKTOP_WEB_LISTING');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('sortBy', sortBy);
    if (query) {
      url.searchParams.set('str', query);
    }

    return this.makeRequest<SwiggyRestaurantListResponse>(
      url.toString(),
      options.sessionToken
    );
  }

  /**
   * Fetch restaurant menu.
   */
  async getRestaurantMenu(
    options: SwiggyClientOptions,
    restaurantId: string
  ): Promise<SwiggyMenuResponse> {
    const url = new URL(this.config.menuEndpoint, this.config.baseUrl);
    url.searchParams.set('page-type', 'REGULAR_MENU');
    url.searchParams.set('complete-menu', 'true');
    url.searchParams.set('lat', String(options.lat));
    url.searchParams.set('lng', String(options.lng));
    url.searchParams.set('restaurantId', restaurantId);

    return this.makeRequest<SwiggyMenuResponse>(
      url.toString(),
      options.sessionToken
    );
  }

  /**
   * Search dishes across restaurants.
   */
  async searchDishes(
    options: SwiggyClientOptions,
    query: string
  ): Promise<SwiggySearchResponse> {
    const url = new URL(
      this.config.dishSearchEndpoint,
      this.config.baseUrl
    );
    url.searchParams.set('lat', String(options.lat));
    url.searchParams.set('lng', String(options.lng));
    url.searchParams.set('str', query);
    url.searchParams.set('submitAction', 'ENTER');

    return this.makeRequest<SwiggySearchResponse>(
      url.toString(),
      options.sessionToken
    );
  }

  /**
   * Health check - verify Swiggy APIs are reachable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(this.config.baseUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 301 || response.status === 302;
    } catch {
      return false;
    }
  }

  private async makeRequest<T>(url: string, sessionToken: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Cookie: `_session_tid=${sessionToken}`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://www.swiggy.com/',
          Origin: 'https://www.swiggy.com',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new SwiggyApiError(
          response.status,
          `Swiggy API returned ${response.status}: ${response.statusText}`,
          url
        );
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof SwiggyApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new SwiggyApiError(
          504,
          `Swiggy API request timed out after ${this.config.timeoutMs}ms`,
          url
        );
      }

      throw new SwiggyApiError(
        500,
        `Swiggy API request failed: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }
}

export class SwiggyApiError extends Error {
  readonly statusCode: number;
  readonly url: string;

  constructor(statusCode: number, message: string, url: string) {
    super(message);
    this.name = 'SwiggyApiError';
    this.statusCode = statusCode;
    this.url = url;
  }
}

/**
 * HTTP client for Zomato APIs.
 * Supports both legacy API key auth and session-based auth.
 */

import type { ZomatoConfig } from '../../config/zomato.config.js';
import type {
  ZomatoSearchResponse,
  ZomatoRestaurantWrapper,
  ZomatoReviewsResponse,
  ZomatoCollectionsResponse,
  ZomatoMenuResponse,
} from '../../types/zomato.types.js';

export type ZomatoAuthMode = 'api-key' | 'session';

export interface ZomatoRequestOptions {
  authMode: ZomatoAuthMode;
  apiKey?: string;
  sessionToken?: string;
}

export class ZomatoClient {
  private readonly config: ZomatoConfig;
  private dailyUsage = 0;
  private lastUsageReset: number = Date.now();

  constructor(config: ZomatoConfig) {
    this.config = config;
  }

  /**
   * Search restaurants via legacy API (Strategy A).
   */
  async searchRestaurantsLegacy(
    query: string,
    lat: number,
    lon: number,
    options?: { radius?: number; cuisines?: string; sort?: string; count?: number; start?: number }
  ): Promise<ZomatoSearchResponse> {
    this.checkDailyLimit();

    const url = new URL('/search', this.config.legacyApiBaseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    if (options?.radius) {
      url.searchParams.set('radius', String(options.radius));
    }
    if (options?.cuisines) {
      url.searchParams.set('cuisines', options.cuisines);
    }
    if (options?.sort) {
      url.searchParams.set('sort', options.sort);
    }
    if (options?.count) {
      url.searchParams.set('count', String(options.count));
    }
    if (options?.start) {
      url.searchParams.set('start', String(options.start));
    }

    const response = await this.makeLegacyRequest<ZomatoSearchResponse>(url.toString());
    this.dailyUsage++;
    return response;
  }

  /**
   * Get restaurant details via legacy API (Strategy A).
   */
  async getRestaurantLegacy(restaurantId: string): Promise<ZomatoRestaurantWrapper> {
    this.checkDailyLimit();

    const url = new URL('/restaurant', this.config.legacyApiBaseUrl);
    url.searchParams.set('res_id', restaurantId);

    const response = await this.makeLegacyRequest<ZomatoRestaurantWrapper>(url.toString());
    this.dailyUsage++;
    return response;
  }

  /**
   * Get reviews via legacy API (Strategy A).
   */
  async getReviewsLegacy(
    restaurantId: string,
    start = 0,
    count = 10
  ): Promise<ZomatoReviewsResponse> {
    this.checkDailyLimit();

    const url = new URL('/reviews', this.config.legacyApiBaseUrl);
    url.searchParams.set('res_id', restaurantId);
    url.searchParams.set('start', String(start));
    url.searchParams.set('count', String(count));

    const response = await this.makeLegacyRequest<ZomatoReviewsResponse>(url.toString());
    this.dailyUsage++;
    return response;
  }

  /**
   * Get collections via legacy API (Strategy A).
   */
  async getCollectionsLegacy(
    lat: number,
    lon: number
  ): Promise<ZomatoCollectionsResponse> {
    this.checkDailyLimit();

    const url = new URL('/collections', this.config.legacyApiBaseUrl);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));

    const response = await this.makeLegacyRequest<ZomatoCollectionsResponse>(url.toString());
    this.dailyUsage++;
    return response;
  }

  /**
   * Get restaurant menu via session API (Strategy B).
   */
  async getMenuSession(
    restaurantId: string,
    sessionToken: string
  ): Promise<ZomatoMenuResponse> {
    const url = new URL('/getPage', this.config.internalApiBaseUrl);
    url.searchParams.set('res_id', restaurantId);
    url.searchParams.set('page_type', 'ORDER_MENU');

    return this.makeSessionRequest<ZomatoMenuResponse>(
      url.toString(),
      sessionToken
    );
  }

  /**
   * Health check.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(this.config.legacyApiBaseUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status < 500;
    } catch {
      return false;
    }
  }

  /**
   * Get remaining daily API key budget.
   */
  getDailyUsage(): { used: number; remaining: number; limit: number } {
    this.resetDailyUsageIfNeeded();
    return {
      used: this.dailyUsage,
      remaining: this.config.dailyApiKeyLimit - this.dailyUsage,
      limit: this.config.dailyApiKeyLimit,
    };
  }

  private async makeLegacyRequest<T>(url: string): Promise<T> {
    if (!this.config.apiKey) {
      throw new ZomatoApiError(
        401,
        'Zomato API key not configured. Set ZOMATO_API_KEY env variable.',
        url
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'user-key': this.config.apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ZomatoApiError(
          response.status,
          `Zomato legacy API returned ${response.status}: ${response.statusText}`,
          url
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ZomatoApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ZomatoApiError(
          504,
          `Zomato API request timed out after ${this.config.timeoutMs}ms`,
          url
        );
      }

      throw new ZomatoApiError(
        500,
        `Zomato API request failed: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }

  private async makeSessionRequest<T>(
    url: string,
    sessionToken: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Cookie: `zomato_session=${sessionToken}`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://www.zomato.com/',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ZomatoApiError(
          response.status,
          `Zomato session API returned ${response.status}`,
          url
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ZomatoApiError) {
        throw error;
      }

      throw new ZomatoApiError(
        500,
        `Zomato session request failed: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }

  private checkDailyLimit(): void {
    this.resetDailyUsageIfNeeded();
    if (this.dailyUsage >= this.config.dailyApiKeyLimit) {
      throw new ZomatoApiError(
        429,
        `Zomato daily API key limit reached (${this.config.dailyApiKeyLimit}/day)`,
        ''
      );
    }
  }

  private resetDailyUsageIfNeeded(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (now - this.lastUsageReset >= oneDayMs) {
      this.dailyUsage = 0;
      this.lastUsageReset = now;
    }
  }
}

export class ZomatoApiError extends Error {
  readonly statusCode: number;
  readonly url: string;

  constructor(statusCode: number, message: string, url: string) {
    super(message);
    this.name = 'ZomatoApiError';
    this.statusCode = statusCode;
    this.url = url;
  }
}

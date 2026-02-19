/**
 * MCP Adapter data source.
 * Queries Swiggy, Zomato, and internal restaurant data via the mcp-adapter service.
 * Supports longer timeouts (2s) for external API aggregation.
 */

import pino from 'pino';

import type { McpAdapterConfig } from '../config/source.config';
import type {
  SearchRequest,
  UnifiedSearchResult,
  AutocompleteRequest,
  AutocompleteSuggestion,
  RestaurantResult,
  DishResult,
} from '../types/search.types';
import type { SourceConfig, SourceQueryResult } from '../types/source.types';

import { BaseSource } from './BaseSource';

interface McpSearchPayload {
  query: string;
  filters?: Record<string, unknown>;
  pagination: { page: number; pageSize: number };
  sort?: { field: string; order: string };
}

interface McpSearchResult {
  results: McpResultItem[];
  total: number;
  providers: string[];
  queryTimeMs: number;
}

interface McpResultItem {
  id: string;
  type: 'restaurant' | 'dish';
  provider: string;
  data: Record<string, unknown>;
  relevanceScore: number;
}

export class MCPAdapterSource extends BaseSource {
  readonly name = 'mcp-adapter' as const;
  private readonly mcpConfig: McpAdapterConfig;

  constructor(
    sourceConfig: SourceConfig,
    mcpConfig: McpAdapterConfig,
    logger: pino.Logger,
  ) {
    super(sourceConfig, logger);
    this.mcpConfig = mcpConfig;
  }

  protected async executeSearch(request: SearchRequest): Promise<SourceQueryResult> {
    const payload = this.buildPayload(request);
    const url = `${this.mcpConfig.baseUrl}/search`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.mcpConfig.requestTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`MCP adapter returned ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as McpSearchResult;
      const results = data.results.map((item) => this.mapToUnifiedResult(item));

      return {
        source: 'mcp-adapter',
        results,
        totalCount: data.total,
        latencyMs: data.queryTimeMs,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  protected async executeAutocomplete(
    request: AutocompleteRequest,
  ): Promise<AutocompleteSuggestion[]> {
    const url =
      `${this.mcpConfig.baseUrl}/search/autocomplete` +
      `?prefix=${encodeURIComponent(request.prefix)}` +
      `&limit=${request.limit ?? 10}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.mcpConfig.requestTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      return (await response.json()) as AutocompleteSuggestion[];
    } finally {
      clearTimeout(timeout);
    }
  }

  protected async executeHealthCheck(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${this.mcpConfig.baseUrl}/health`, {
        signal: controller.signal,
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        throw new Error(`MCP adapter health check failed: ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPayload(request: SearchRequest): McpSearchPayload {
    const filters: Record<string, unknown> = {};

    if (request.filters?.cuisines) {
      filters.cuisines = request.filters.cuisines;
    }
    if (request.filters?.priceRange) {
      filters.priceRange = request.filters.priceRange;
    }
    if (request.filters?.minRating !== undefined) {
      filters.minRating = request.filters.minRating;
    }
    if (request.filters?.maxDeliveryTime !== undefined) {
      filters.maxDeliveryTime = request.filters.maxDeliveryTime;
    }
    if (request.filters?.location) {
      filters.location = request.filters.location;
      filters.radiusKm = request.filters.radiusKm ?? 5;
    }
    if (request.filters?.isAvailable !== undefined) {
      filters.isAvailable = request.filters.isAvailable;
    }
    if (request.filters?.dietary) {
      filters.dietary = request.filters.dietary;
    }
    if (request.filters?.category) {
      filters.category = request.filters.category;
    }

    return {
      query: request.query,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      pagination: { page: request.page, pageSize: request.pageSize },
      sort: request.sort
        ? { field: request.sort.field, order: request.sort.order }
        : undefined,
    };
  }

  private mapToUnifiedResult(item: McpResultItem): UnifiedSearchResult {
    const data = item.data;

    if (item.type === 'restaurant') {
      const restaurant: RestaurantResult = {
        id: item.id,
        name: (data.name as string) ?? '',
        description: (data.description as string) ?? '',
        cuisineTypes: (data.cuisineTypes as string[]) ?? (data.cuisine as string[]) ?? [],
        rating: (data.rating as number) ?? 0,
        reviewCount: (data.reviewCount as number) ?? 0,
        priceRange: (data.priceRange as string) ?? 'moderate',
        deliveryTime: (data.deliveryTime as number) ?? 30,
        deliveryFee: (data.deliveryFee as number) ?? 0,
        minimumOrder: (data.minimumOrder as number) ?? 0,
        isAvailable: (data.available as boolean) ?? (data.isAvailable as boolean) ?? true,
        imageUrl: data.imageUrl as string | undefined,
        address: (data.address as string) ?? '',
        location: data.location
          ? {
              lat: (data.location as Record<string, number>).lat,
              lon: (data.location as Record<string, number>).lon,
            }
          : undefined,
        tags: (data.tags as string[]) ?? [],
        features: (data.features as string[]) ?? [],
      };

      return {
        id: item.id,
        type: 'restaurant',
        name: restaurant.name,
        description: restaurant.description,
        score: item.relevanceScore,
        source: `mcp-adapter:${item.provider}`,
        restaurant,
      };
    }

    const dish: DishResult = {
      id: item.id,
      restaurantId: (data.restaurantId as string) ?? '',
      restaurantName: data.restaurantName as string | undefined,
      name: (data.name as string) ?? '',
      description: (data.description as string) ?? '',
      category: (data.category as string) ?? '',
      price: (data.price as number) ?? 0,
      discountedPrice: data.discountedPrice as number | undefined,
      ingredients: (data.ingredients as string[]) ?? [],
      dietaryTags: (data.dietaryTags as string[]) ?? [],
      isAvailable: (data.available as boolean) ?? (data.isAvailable as boolean) ?? true,
      rating: (data.rating as number) ?? 0,
      imageUrl: data.imageUrl as string | undefined,
    };

    return {
      id: item.id,
      type: 'dish',
      name: dish.name,
      description: dish.description,
      score: item.relevanceScore,
      source: `mcp-adapter:${item.provider}`,
      dish,
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.mcpConfig.apiKey) {
      headers['X-API-Key'] = this.mcpConfig.apiKey;
    }

    return headers;
  }
}

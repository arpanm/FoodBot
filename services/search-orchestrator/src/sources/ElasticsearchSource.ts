/**
 * Elasticsearch data source.
 * Queries the local Elasticsearch index for restaurant and dish data.
 * Optimized for fast (<200ms) full-text search with geo-distance support.
 */

import pino from 'pino';

import type { ElasticsearchConfig } from '../config/source.config';
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

interface EsHit {
  _id: string;
  _score: number;
  _source: Record<string, unknown>;
  _index: string;
}

interface EsSearchResponse {
  hits: {
    total: { value: number };
    hits: EsHit[];
  };
  suggest?: Record<string, Array<{ options: Array<{ text: string; _source?: Record<string, unknown> }> }>>;
}

export class ElasticsearchSource extends BaseSource {
  readonly name = 'elasticsearch' as const;
  private readonly esConfig: ElasticsearchConfig;

  constructor(
    sourceConfig: SourceConfig,
    esConfig: ElasticsearchConfig,
    logger: pino.Logger,
  ) {
    super(sourceConfig, logger);
    this.esConfig = esConfig;
  }

  protected async executeSearch(request: SearchRequest): Promise<SourceQueryResult> {
    const body = this.buildSearchQuery(request);
    const url = `${this.esConfig.node}/${this.esConfig.index}/_search`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.esConfig.requestTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Elasticsearch returned ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as EsSearchResponse;
      const results = data.hits.hits.map((hit) => this.mapHitToResult(hit));

      return {
        source: 'elasticsearch',
        results,
        totalCount: data.hits.total.value,
        latencyMs: 0,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  protected async executeAutocomplete(
    request: AutocompleteRequest,
  ): Promise<AutocompleteSuggestion[]> {
    const body = {
      suggest: {
        restaurant_suggest: {
          prefix: request.prefix,
          completion: {
            field: 'name_suggest',
            size: request.limit ?? 10,
            fuzzy: { fuzziness: 'AUTO' },
          },
        },
      },
    };

    const url = `${this.esConfig.node}/${this.esConfig.index}/_search`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.esConfig.requestTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as EsSearchResponse;
      const suggestions = data.suggest?.restaurant_suggest?.[0]?.options ?? [];

      return suggestions.map((opt) => ({
        text: opt.text,
        type: 'restaurant' as const,
        id: (opt._source?.id as string) ?? undefined,
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  protected async executeHealthCheck(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${this.esConfig.node}/_cluster/health`, {
        signal: controller.signal,
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Elasticsearch health check failed: ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildSearchQuery(request: SearchRequest): Record<string, unknown> {
    const must: Record<string, unknown>[] = [];
    const filter: Record<string, unknown>[] = [];

    if (request.query) {
      must.push({
        multi_match: {
          query: request.query,
          fields: ['name^3', 'description^2', 'cuisineTypes', 'tags'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    if (request.filters?.cuisines && request.filters.cuisines.length > 0) {
      filter.push({
        terms: { cuisineTypes: request.filters.cuisines },
      });
    }

    if (request.filters?.minRating !== undefined) {
      filter.push({
        range: { rating: { gte: request.filters.minRating } },
      });
    }

    if (request.filters?.maxDeliveryTime !== undefined) {
      filter.push({
        range: { deliveryTime: { lte: request.filters.maxDeliveryTime } },
      });
    }

    if (request.filters?.isAvailable !== undefined) {
      filter.push({
        term: { isAvailable: request.filters.isAvailable },
      });
    }

    if (request.filters?.priceRange) {
      const priceFilter: Record<string, unknown> = {};
      if (request.filters.priceRange.min !== undefined) {
        priceFilter.gte = request.filters.priceRange.min;
      }
      if (request.filters.priceRange.max !== undefined) {
        priceFilter.lte = request.filters.priceRange.max;
      }
      filter.push({ range: { price: priceFilter } });
    }

    if (request.filters?.location && request.filters?.radiusKm) {
      filter.push({
        geo_distance: {
          distance: `${request.filters.radiusKm}km`,
          location: {
            lat: request.filters.location.lat,
            lon: request.filters.location.lon,
          },
        },
      });
    }

    const query: Record<string, unknown> = {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    };

    const sort = this.buildSort(request);

    return {
      query,
      sort,
      from: (request.page - 1) * request.pageSize,
      size: request.pageSize,
    };
  }

  private buildSort(request: SearchRequest): Array<Record<string, unknown>> {
    const sortField = request.sort?.field ?? 'relevance';
    const order = request.sort?.order ?? 'desc';

    switch (sortField) {
      case 'rating':
        return [{ rating: { order } }];
      case 'deliveryTime':
        return [{ deliveryTime: { order: order === 'asc' ? 'asc' : 'desc' } }];
      case 'price':
        return [{ price: { order } }];
      case 'distance':
        if (request.filters?.location) {
          return [
            {
              _geo_distance: {
                location: {
                  lat: request.filters.location.lat,
                  lon: request.filters.location.lon,
                },
                order,
                unit: 'km',
              },
            },
          ];
        }
        return [{ _score: { order: 'desc' } }];
      case 'popularity':
        return [{ reviewCount: { order: 'desc' } }];
      default:
        return [{ _score: { order: 'desc' } }];
    }
  }

  private mapHitToResult(hit: EsHit): UnifiedSearchResult {
    const source = hit._source;
    const isRestaurant = this.isRestaurantDoc(source);

    if (isRestaurant) {
      const restaurant = this.mapToRestaurant(hit);
      return {
        id: hit._id,
        type: 'restaurant',
        name: (source.name as string) ?? '',
        description: (source.description as string) ?? '',
        score: hit._score ?? 0,
        source: 'elasticsearch',
        restaurant,
      };
    }

    const dish = this.mapToDish(hit);
    return {
      id: hit._id,
      type: 'dish',
      name: (source.name as string) ?? '',
      description: (source.description as string) ?? '',
      score: hit._score ?? 0,
      source: 'elasticsearch',
      dish,
    };
  }

  private isRestaurantDoc(source: Record<string, unknown>): boolean {
    return 'cuisineTypes' in source || 'deliveryRadius' in source;
  }

  private mapToRestaurant(hit: EsHit): RestaurantResult {
    const s = hit._source;
    return {
      id: hit._id,
      name: (s.name as string) ?? '',
      description: (s.description as string) ?? '',
      cuisineTypes: (s.cuisineTypes as string[]) ?? [],
      rating: (s.rating as number) ?? 0,
      reviewCount: (s.reviewCount as number) ?? 0,
      priceRange: (s.priceRange as string) ?? 'moderate',
      deliveryTime: (s.deliveryTime as number) ?? 30,
      deliveryFee: (s.deliveryFee as number) ?? 0,
      minimumOrder: (s.minimumOrder as number) ?? 0,
      isAvailable: (s.isAvailable as boolean) ?? true,
      imageUrl: s.imageUrl as string | undefined,
      address: (s.address as string) ?? '',
      location: s.location
        ? { lat: (s.location as Record<string, number>).lat, lon: (s.location as Record<string, number>).lon }
        : undefined,
      tags: (s.tags as string[]) ?? [],
      features: (s.features as string[]) ?? [],
    };
  }

  private mapToDish(hit: EsHit): DishResult {
    const s = hit._source;
    return {
      id: hit._id,
      restaurantId: (s.restaurantId as string) ?? '',
      restaurantName: s.restaurantName as string | undefined,
      name: (s.name as string) ?? '',
      description: (s.description as string) ?? '',
      category: (s.category as string) ?? '',
      price: (s.price as number) ?? 0,
      discountedPrice: s.discountedPrice as number | undefined,
      ingredients: (s.ingredients as string[]) ?? [],
      dietaryTags: (s.dietaryTags as string[]) ?? [],
      isAvailable: (s.isAvailable as boolean) ?? true,
      rating: (s.rating as number) ?? 0,
      imageUrl: s.imageUrl as string | undefined,
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.esConfig.auth) {
      const credentials = Buffer.from(
        `${this.esConfig.auth.username}:${this.esConfig.auth.password}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }
}

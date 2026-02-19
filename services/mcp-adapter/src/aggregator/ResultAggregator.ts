/**
 * Result Aggregator - queries multiple providers in parallel and combines results.
 */

import type {
  Provider,
  SearchQuery,
  SearchResult,
  Restaurant,
} from '../types/provider.types.js';
import type { ProviderName, ResponseMetadata } from '../types/common.types.js';
import { ResultDeduplicator } from './ResultDeduplicator.js';
import { ResultRanker } from './ResultRanker.js';

export class ResultAggregator {
  private readonly providers: Map<ProviderName, Provider> = new Map();
  private readonly deduplicator: ResultDeduplicator;
  private readonly ranker: ResultRanker;

  constructor() {
    this.deduplicator = new ResultDeduplicator();
    this.ranker = new ResultRanker();
  }

  registerProvider(provider: Provider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Search all enabled providers in parallel and aggregate results.
   */
  async searchAll(
    query: SearchQuery,
    providerNames?: ProviderName[]
  ): Promise<AggregatedSearchResult> {
    const startTime = Date.now();
    const targetProviders = this.getTargetProviders(providerNames);

    // Query all providers in parallel
    const providerResults = await Promise.allSettled(
      targetProviders.map(async (provider) => {
        const result = await provider.searchRestaurants(query);
        return { provider: provider.name, result };
      })
    );

    // Collect successful results and errors
    const allRestaurants: Restaurant[] = [];
    const providerStatuses: ProviderSearchStatus[] = [];

    for (const outcome of providerResults) {
      if (outcome.status === 'fulfilled') {
        allRestaurants.push(...outcome.value.result.restaurants);
        providerStatuses.push({
          provider: outcome.value.provider,
          status: 'success',
          resultCount: outcome.value.result.restaurants.length,
          metadata: outcome.value.result.metadata,
        });
      } else {
        const providerName = this.extractProviderFromError(outcome.reason);
        providerStatuses.push({
          provider: providerName,
          status: 'error',
          resultCount: 0,
          error: outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason),
        });
      }
    }

    // Deduplicate
    const deduplicated = this.deduplicator.deduplicate(allRestaurants);

    // Rank
    const ranked = this.ranker.rank(deduplicated, query);

    // Paginate
    const start = (query.pagination.page - 1) * query.pagination.pageSize;
    const paginated = ranked.slice(start, start + query.pagination.pageSize);

    return {
      restaurants: paginated,
      totalCount: ranked.length,
      page: query.pagination.page,
      pageSize: query.pagination.pageSize,
      hasMore: start + query.pagination.pageSize < ranked.length,
      providerStatuses,
      aggregationTimeMs: Date.now() - startTime,
      deduplicatedCount: allRestaurants.length - deduplicated.length,
    };
  }

  private getTargetProviders(providerNames?: ProviderName[]): Provider[] {
    if (providerNames?.length) {
      return providerNames
        .map((name) => this.providers.get(name))
        .filter((p): p is Provider => p !== undefined && p.isEnabled());
    }

    return Array.from(this.providers.values()).filter((p) => p.isEnabled());
  }

  private extractProviderFromError(_error: unknown): ProviderName {
    return 'mock';
  }
}

export interface ProviderSearchStatus {
  provider: ProviderName;
  status: 'success' | 'error';
  resultCount: number;
  metadata?: ResponseMetadata;
  error?: string;
}

export interface AggregatedSearchResult {
  restaurants: Restaurant[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  providerStatuses: ProviderSearchStatus[];
  aggregationTimeMs: number;
  deduplicatedCount: number;
}

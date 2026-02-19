/**
 * Main Search Orchestrator.
 * Coordinates searches across all data sources, applies strategies,
 * handles caching, aggregation, and ranking.
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

import type {
  SearchRequest,
  SearchResponse,
  AutocompleteRequest,
  AutocompleteResponse,
  PopularSearch,
  SearchMetadata,
  SourceMetadata,
} from '../types/search.types';
import type { SearchSource, SourceQueryResult } from '../types/source.types';
import type { RankingContext } from '../types/result.types';
import { ResultAggregator } from '../aggregation/ResultAggregator';
import { Ranker } from '../aggregation/Ranker';
import { SearchCache } from '../cache/SearchCache';
import { generateCacheKey } from '../cache/cacheKeyGenerator';
import { StrategySelector } from '../strategies/StrategySelector';
import type { OrchestratorConfig } from '../config/orchestrator.config';

import { FallbackHandler } from './FallbackHandler';
import { ParallelExecutor } from './ParallelExecutor';
import { TimeoutManager } from './TimeoutManager';

export class SearchOrchestrator {
  private readonly logger: pino.Logger;
  private readonly sources: SearchSource[];
  private readonly parallelExecutor: ParallelExecutor;
  private readonly fallbackHandler: FallbackHandler;
  private readonly timeoutManager: TimeoutManager;
  private readonly aggregator: ResultAggregator;
  private readonly ranker: Ranker;
  private readonly cache: SearchCache;
  private readonly strategySelector: StrategySelector;
  private readonly config: OrchestratorConfig;

  constructor(
    sources: SearchSource[],
    cache: SearchCache,
    config: OrchestratorConfig,
    logger: pino.Logger,
  ) {
    this.sources = sources;
    this.cache = cache;
    this.config = config;
    this.logger = logger.child({ component: 'SearchOrchestrator' });

    const perSourceTimeoutMs = new Map<string, number>();
    for (const source of sources) {
      perSourceTimeoutMs.set(source.name, this.getSourceTimeout(source.name));
    }

    this.timeoutManager = new TimeoutManager(
      {
        globalTimeoutMs: config.maxTotalTimeoutMs,
        perSourceTimeoutMs,
      },
      logger,
    );

    this.parallelExecutor = new ParallelExecutor(this.timeoutManager, logger);
    this.fallbackHandler = new FallbackHandler(this.timeoutManager, logger);
    this.aggregator = new ResultAggregator(logger);
    this.ranker = new Ranker(config.scoring, logger);
    this.strategySelector = new StrategySelector(sources, this.parallelExecutor, this.fallbackHandler, logger);
  }

  /**
   * Main search endpoint. Orchestrates the full search pipeline:
   * 1. Check cache
   * 2. Select strategy
   * 3. Execute search across sources
   * 4. Aggregate and deduplicate results
   * 5. Apply filters, score, and rank
   * 6. Cache and return results
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const requestId = request.requestId ?? uuidv4();
    const enrichedRequest: SearchRequest = { ...request, requestId };

    this.logger.info(
      { requestId, query: request.query, strategy: request.strategy },
      'Starting search orchestration',
    );

    const startTime = Date.now();

    // 1. Check cache
    const cacheKey = generateCacheKey(enrichedRequest);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.info({ requestId, cacheKey }, 'Cache hit');
      return { ...cached, metadata: { ...cached.metadata, cacheHit: true } };
    }

    // 2. Select strategy and execute
    const strategy = request.strategy ?? this.config.defaultStrategy;
    const sourceResults = await this.strategySelector.execute(strategy, enrichedRequest);

    // 3. Aggregate results
    const aggregated = this.aggregator.aggregate(sourceResults, enrichedRequest);

    // 4. Build ranking context
    const rankingContext: RankingContext = {
      userLocation: request.filters?.location,
      filters: request.filters,
    };

    // 5. Score and rank
    const ranked = this.ranker.rank(aggregated.results, rankingContext);

    // 6. Paginate
    const pageStart = 0;
    const pageEnd = request.pageSize;
    const paginatedResults = ranked.slice(pageStart, pageEnd);

    // 7. Build metadata
    const queryTimeMs = Date.now() - startTime;
    const metadata = this.buildMetadata(
      enrichedRequest,
      sourceResults,
      aggregated.totalFromAllSources,
      queryTimeMs,
      strategy,
    );

    const response: SearchResponse = {
      results: paginatedResults,
      metadata,
    };

    // 8. Cache results
    await this.cache.set(cacheKey, response, this.config.cacheTtlSeconds);

    this.logger.info(
      {
        requestId,
        queryTimeMs,
        totalResults: metadata.totalResults,
        returnedResults: paginatedResults.length,
        strategy,
      },
      'Search orchestration completed',
    );

    return response;
  }

  /**
   * Autocomplete endpoint. Queries sources in parallel for quick suggestions.
   */
  async autocomplete(request: AutocompleteRequest): Promise<AutocompleteResponse> {
    const startTime = Date.now();
    const cacheKey = `autocomplete:${request.prefix.toLowerCase()}:${request.limit ?? 10}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached as unknown as AutocompleteResponse;
    }

    const availableSources = this.sources.filter((s) => s.isAvailable());
    const promises = availableSources.map((source) => source.autocomplete(request));

    const results = await Promise.allSettled(promises);
    const allSuggestions = results
      .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer U> ? U : never> =>
        r.status === 'fulfilled',
      )
      .flatMap((r) => r.value);

    // Deduplicate suggestions by text
    const seen = new Set<string>();
    const uniqueSuggestions = allSuggestions.filter((s) => {
      const key = s.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const limited = uniqueSuggestions.slice(0, request.limit ?? 10);
    const queryTimeMs = Date.now() - startTime;

    const response: AutocompleteResponse = {
      suggestions: limited,
      queryTimeMs,
    };

    await this.cache.set(
      cacheKey,
      response as unknown as SearchResponse,
      this.config.suggestionsCacheTtlSeconds,
    );

    return response;
  }

  /**
   * Returns popular search terms (from cache).
   */
  async getPopularSearches(): Promise<PopularSearch[]> {
    const cacheKey = 'popular-searches';
    const cached = await this.cache.getRaw(cacheKey);

    if (cached) {
      return JSON.parse(cached) as PopularSearch[];
    }

    // Return default popular searches if none cached
    return [
      { query: 'pizza', count: 1250, trending: true },
      { query: 'biryani', count: 980, trending: true },
      { query: 'burger', count: 870, trending: false },
      { query: 'sushi', count: 650, trending: true },
      { query: 'pasta', count: 580, trending: false },
    ];
  }

  /**
   * Health check for all sources.
   */
  async healthCheck(): Promise<Record<string, unknown>> {
    const sourceHealth = await Promise.allSettled(
      this.sources.map(async (source) => {
        const health = await source.healthCheck();
        return { name: source.name, ...health };
      }),
    );

    const healthResults = sourceHealth.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        name: 'unknown',
        status: 'unavailable',
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      };
    });

    const allHealthy = healthResults.every(
      (h) => h.status === 'healthy' || h.status === 'degraded',
    );

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      sources: healthResults,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns metrics for all sources.
   */
  getMetrics(): Record<string, unknown> {
    return {
      cache: this.cache.getStats(),
      sources: this.sources.map((source) => {
        if ('getMetrics' in source && typeof source.getMetrics === 'function') {
          return (source as unknown as { getMetrics(): Record<string, unknown> }).getMetrics();
        }
        return { name: source.name, status: 'metrics_unavailable' };
      }),
    };
  }

  private getSourceTimeout(sourceName: string): number {
    switch (sourceName) {
      case 'elasticsearch':
        return 200;
      case 'mcp-adapter':
        return 2000;
      case 'database':
        return 500;
      default:
        return 1000;
    }
  }

  private buildMetadata(
    request: SearchRequest,
    sourceResults: SourceQueryResult[],
    totalResults: number,
    queryTimeMs: number,
    strategy: string,
  ): SearchMetadata {
    const sources: SourceMetadata[] = sourceResults.map((result) => ({
      name: result.source,
      latencyMs: result.latencyMs,
      resultCount: result.results.length,
      status: result.error
        ? result.error.code === 'TIMEOUT'
          ? 'timeout'
          : 'error'
        : 'success',
      errorMessage: result.error?.message,
    }));

    return {
      totalResults,
      page: request.page,
      pageSize: request.pageSize,
      totalPages: Math.ceil(totalResults / request.pageSize),
      queryTimeMs,
      sources,
      strategy: (strategy as SearchMetadata['strategy']),
      cacheHit: false,
      requestId: request.requestId ?? 'unknown',
    };
  }
}

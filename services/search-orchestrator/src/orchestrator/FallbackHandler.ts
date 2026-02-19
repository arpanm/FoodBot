/**
 * Fallback handler for managing source failures.
 * Implements automatic fallback chains when primary sources fail.
 */

import pino from 'pino';

import type { SearchRequest, SearchResponse, SearchMetadata } from '../types/search.types';
import type { SearchSource, SourceQueryResult } from '../types/source.types';

import { TimeoutManager } from './TimeoutManager';

export interface FallbackChain {
  primary: SearchSource[];
  fallback: SearchSource[];
}

export class FallbackHandler {
  private readonly logger: pino.Logger;
  private readonly timeoutManager: TimeoutManager;

  constructor(timeoutManager: TimeoutManager, logger: pino.Logger) {
    this.timeoutManager = timeoutManager;
    this.logger = logger.child({ component: 'FallbackHandler' });
  }

  /**
   * Executes the fallback strategy: tries primary sources first,
   * falls back to secondary sources if all primary sources fail.
   */
  async executeWithFallback(
    chain: FallbackChain,
    request: SearchRequest,
  ): Promise<SourceQueryResult[]> {
    const primaryResults = await this.tryPrimarySources(chain.primary, request);

    if (this.hasValidResults(primaryResults)) {
      this.logger.debug('Primary sources returned results, skipping fallback');
      return primaryResults;
    }

    this.logger.warn('Primary sources failed, trying fallback sources');
    const fallbackResults = await this.tryFallbackSources(chain.fallback, request);

    return [...primaryResults, ...fallbackResults];
  }

  /**
   * Checks if any source returned error results and recommends whether
   * to show partial results or trigger a full fallback.
   */
  shouldTriggerFallback(results: SourceQueryResult[]): boolean {
    const successfulWithResults = results.filter(
      (r) => !r.error && r.results.length > 0,
    );

    return successfulWithResults.length === 0;
  }

  /**
   * Creates a degraded response with error information when all sources fail.
   */
  createDegradedResponse(
    request: SearchRequest,
    errors: SourceQueryResult[],
  ): SearchResponse {
    const metadata: SearchMetadata = {
      totalResults: 0,
      page: request.page,
      pageSize: request.pageSize,
      totalPages: 0,
      queryTimeMs: 0,
      sources: errors.map((e) => ({
        name: e.source,
        latencyMs: e.latencyMs,
        resultCount: 0,
        status: e.error ? 'error' : 'success',
        errorMessage: e.error?.message,
      })),
      strategy: request.strategy ?? 'comprehensive',
      cacheHit: false,
      requestId: request.requestId ?? 'unknown',
    };

    return {
      results: [],
      metadata,
    };
  }

  private async tryPrimarySources(
    sources: SearchSource[],
    request: SearchRequest,
  ): Promise<SourceQueryResult[]> {
    const results: SourceQueryResult[] = [];

    const promises = sources
      .filter((source) => source.isAvailable())
      .map(async (source) => {
        const fallback: SourceQueryResult = {
          source: source.name,
          results: [],
          totalCount: 0,
          latencyMs: 0,
        };

        const { value } = await this.timeoutManager.withSourceTimeout(
          source.name,
          () => source.search(request),
          fallback,
        );

        return value;
      });

    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    return results;
  }

  private async tryFallbackSources(
    sources: SearchSource[],
    request: SearchRequest,
  ): Promise<SourceQueryResult[]> {
    const results: SourceQueryResult[] = [];

    for (const source of sources) {
      if (!source.isAvailable()) {
        continue;
      }

      try {
        const fallback: SourceQueryResult = {
          source: source.name,
          results: [],
          totalCount: 0,
          latencyMs: 0,
        };

        const { value } = await this.timeoutManager.withSourceTimeout(
          source.name,
          () => source.search(request),
          fallback,
        );

        results.push(value);

        if (value.results.length > 0 && !value.error) {
          this.logger.info(`Fallback source ${source.name} returned results`);
          break;
        }
      } catch (error) {
        this.logger.error(
          { error, source: source.name },
          `Fallback source ${source.name} failed`,
        );
      }
    }

    return results;
  }

  private hasValidResults(results: SourceQueryResult[]): boolean {
    return results.some((r) => !r.error && r.results.length > 0);
  }
}

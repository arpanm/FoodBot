/**
 * Strategy selector that picks the appropriate search strategy
 * based on the request type and available sources.
 */

import pino from 'pino';

import type { SearchRequest, SearchStrategyType } from '../types/search.types';
import type { SearchSource, SourceQueryResult } from '../types/source.types';
import type { ParallelExecutor } from '../orchestrator/ParallelExecutor';
import type { FallbackHandler } from '../orchestrator/FallbackHandler';

import { FastSearchStrategy } from './FastSearchStrategy';
import { ComprehensiveStrategy } from './ComprehensiveStrategy';
import { FallbackStrategy } from './FallbackStrategy';

export class StrategySelector {
  private readonly logger: pino.Logger;
  private readonly fastStrategy: FastSearchStrategy;
  private readonly comprehensiveStrategy: ComprehensiveStrategy;
  private readonly fallbackStrategy: FallbackStrategy;

  constructor(
    sources: SearchSource[],
    executor: ParallelExecutor,
    fallbackHandler: FallbackHandler,
    logger: pino.Logger,
  ) {
    this.logger = logger.child({ component: 'StrategySelector' });
    this.fastStrategy = new FastSearchStrategy(sources, executor);
    this.comprehensiveStrategy = new ComprehensiveStrategy(sources, executor);
    this.fallbackStrategy = new FallbackStrategy(sources, fallbackHandler);
  }

  /**
   * Selects and executes the appropriate strategy.
   */
  async execute(
    strategy: SearchStrategyType,
    request: SearchRequest,
  ): Promise<SourceQueryResult[]> {
    this.logger.info({ strategy, query: request.query }, `Executing ${strategy} strategy`);

    switch (strategy) {
      case 'fast':
        return this.fastStrategy.execute(request);
      case 'comprehensive':
        return this.comprehensiveStrategy.execute(request);
      case 'fallback':
        return this.fallbackStrategy.execute(request);
      default:
        this.logger.warn({ strategy }, `Unknown strategy '${strategy}', using comprehensive`);
        return this.comprehensiveStrategy.execute(request);
    }
  }

  /**
   * Auto-selects strategy based on the request characteristics.
   */
  autoSelect(request: SearchRequest): SearchStrategyType {
    // Short queries (1-2 chars) use fast strategy for autocomplete
    if (request.query.length <= 2) {
      return 'fast';
    }

    // If user is filtering heavily, use comprehensive for better results
    if (this.hasMultipleFilters(request)) {
      return 'comprehensive';
    }

    // Default to comprehensive
    return 'comprehensive';
  }

  private hasMultipleFilters(request: SearchRequest): boolean {
    if (!request.filters) return false;

    let filterCount = 0;
    if (request.filters.cuisines && request.filters.cuisines.length > 0) filterCount++;
    if (request.filters.priceRange) filterCount++;
    if (request.filters.minRating !== undefined) filterCount++;
    if (request.filters.maxDeliveryTime !== undefined) filterCount++;
    if (request.filters.location) filterCount++;
    if (request.filters.dietary && request.filters.dietary.length > 0) filterCount++;

    return filterCount >= 2;
  }
}

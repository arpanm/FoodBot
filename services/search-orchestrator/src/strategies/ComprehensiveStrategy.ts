/**
 * Comprehensive search strategy - queries all sources in parallel.
 * Total timeout of up to 500ms. Returns partial results if some sources timeout.
 */

import type { SearchRequest } from '../types/search.types';
import type { SearchSource, SourceQueryResult } from '../types/source.types';
import type { ParallelExecutor } from '../orchestrator/ParallelExecutor';

export class ComprehensiveStrategy {
  private readonly sources: SearchSource[];
  private readonly executor: ParallelExecutor;

  constructor(sources: SearchSource[], executor: ParallelExecutor) {
    this.sources = sources;
    this.executor = executor;
  }

  async execute(request: SearchRequest): Promise<SourceQueryResult[]> {
    const availableSources = this.sources.filter((s) => s.isAvailable());

    if (availableSources.length === 0) {
      return [];
    }

    const executionResult = await this.executor.executeAll(availableSources, request);
    return executionResult.results;
  }
}

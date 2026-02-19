/**
 * Fast search strategy - Elasticsearch only, guaranteed <100ms.
 * Used for autocomplete and instant search scenarios.
 */

import type { SearchRequest } from '../types/search.types';
import type { SearchSource, SourceQueryResult } from '../types/source.types';
import type { ParallelExecutor } from '../orchestrator/ParallelExecutor';

export class FastSearchStrategy {
  private readonly sources: SearchSource[];
  private readonly executor: ParallelExecutor;

  constructor(sources: SearchSource[], executor: ParallelExecutor) {
    // Fast strategy only uses Elasticsearch
    this.sources = sources.filter((s) => s.name === 'elasticsearch');
    this.executor = executor;
  }

  async execute(request: SearchRequest): Promise<SourceQueryResult[]> {
    const availableSources = this.sources.filter((s) => s.isAvailable());

    if (availableSources.length === 0) {
      return [];
    }

    const result = await this.executor.executeFirst(availableSources, request);
    return [result];
  }
}

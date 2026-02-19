/**
 * Fallback search strategy - DB only, used when Elasticsearch and MCP fail.
 * Provides degraded but functional search experience.
 */

import type { SearchRequest } from '../types/search.types';
import type { SearchSource, SourceQueryResult } from '../types/source.types';
import type { FallbackHandler } from '../orchestrator/FallbackHandler';

export class FallbackStrategy {
  private readonly sources: SearchSource[];
  private readonly fallbackHandler: FallbackHandler;

  constructor(sources: SearchSource[], fallbackHandler: FallbackHandler) {
    this.sources = sources;
    this.fallbackHandler = fallbackHandler;
  }

  async execute(request: SearchRequest): Promise<SourceQueryResult[]> {
    const primarySources = this.sources.filter(
      (s) => s.name === 'elasticsearch' || s.name === 'mcp-adapter',
    );
    const fallbackSources = this.sources.filter((s) => s.name === 'database');

    return this.fallbackHandler.executeWithFallback(
      {
        primary: primarySources,
        fallback: fallbackSources,
      },
      request,
    );
  }
}

/**
 * Cache metrics tracker for monitoring hit/miss rates,
 * latency, and estimated token savings per tier.
 */

import type { CacheStats, CacheTier } from '../types/cache.types.js';

const DEFAULT_TOKENS_PER_CACHE_HIT = 500;

export class CacheMetrics {
  private exactHits = 0;
  private vectorHits = 0;
  private misses = 0;
  private totalLatencyMs = 0;
  private requestCount = 0;
  private tokensPerHit: number;

  constructor(tokensPerHit: number = DEFAULT_TOKENS_PER_CACHE_HIT) {
    this.tokensPerHit = tokensPerHit;
  }

  recordHit(tier: CacheTier, latencyMs: number): void {
    this.requestCount++;
    this.totalLatencyMs += latencyMs;

    switch (tier) {
      case 'exact':
        this.exactHits++;
        break;
      case 'vector':
        this.vectorHits++;
        break;
      case 'miss':
        this.misses++;
        break;
    }
  }

  getStats(): CacheStats {
    const total = this.requestCount;
    if (total === 0) {
      return this.emptyStats();
    }

    const totalHits = this.exactHits + this.vectorHits;

    return {
      totalRequests: total,
      exactHits: this.exactHits,
      vectorHits: this.vectorHits,
      misses: this.misses,
      exactHitRate: this.exactHits / total,
      vectorHitRate: this.vectorHits / total,
      overallHitRate: totalHits / total,
      avgLatencyMs: this.totalLatencyMs / total,
      estimatedTokenSavings: totalHits * this.tokensPerHit,
    };
  }

  reset(): void {
    this.exactHits = 0;
    this.vectorHits = 0;
    this.misses = 0;
    this.totalLatencyMs = 0;
    this.requestCount = 0;
  }

  private emptyStats(): CacheStats {
    return {
      totalRequests: 0,
      exactHits: 0,
      vectorHits: 0,
      misses: 0,
      exactHitRate: 0,
      vectorHitRate: 0,
      overallHitRate: 0,
      avgLatencyMs: 0,
      estimatedTokenSavings: 0,
    };
  }
}

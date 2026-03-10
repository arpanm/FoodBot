/**
 * Semantic cache types for multi-tier caching system.
 */

export type CacheTier = 'exact' | 'vector' | 'miss';

export interface CacheResult<T = unknown> {
  hit: boolean;
  tier: CacheTier;
  data: T | null;
  score: number;
  latencyMs: number;
  key: string;
}

export interface CacheEntry<T = unknown> {
  key: string;
  hash: string;
  data: T;
  vector: number[];
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  lastAccessedAt: number;
  metadata: Record<string, unknown>;
}

export interface CacheStats {
  totalRequests: number;
  exactHits: number;
  vectorHits: number;
  misses: number;
  exactHitRate: number;
  vectorHitRate: number;
  overallHitRate: number;
  avgLatencyMs: number;
  estimatedTokenSavings: number;
}

export interface CacheOrchestratorConfig {
  similarityThreshold: number;
  exactMatchTtlMs: number;
  vectorMatchTtlMs: number;
  maxExactEntries: number;
  maxVectorEntries: number;
  collectionName: string;
}

export interface SemanticCacheConfig {
  dimension: number;
  similarityThreshold: number;
  maxEntries: number;
  ttlMs: number;
}

/**
 * Three-tier cache orchestrator:
 *   1. Exact match (in-memory Map by normalized prompt hash)
 *   2. Semantic match (Vector DB similarity search)
 *   3. Miss (cache miss, caller must compute)
 */

import type {
  CacheResult,
  CacheEntry,
  CacheOrchestratorConfig,
} from '../types/cache.types.js';
import type { VectorStore } from '../types/vector-store.types.js';
import type { EmbeddingProvider } from '../types/embedding.types.js';
import { hashPrompt, normalizePrompt } from './prompt-hasher.js';
import { CacheMetrics } from './cache-metrics.js';

const DEFAULT_CONFIG: CacheOrchestratorConfig = {
  similarityThreshold: 0.92,
  exactMatchTtlMs: 3600000,
  vectorMatchTtlMs: 7200000,
  maxExactEntries: 10000,
  maxVectorEntries: 50000,
  collectionName: 'semantic_cache',
};

export class CacheOrchestrator<T = unknown> {
  private readonly exactCache: Map<string, CacheEntry<T>> = new Map();
  private readonly store: VectorStore;
  private readonly embedder: EmbeddingProvider;
  private readonly config: CacheOrchestratorConfig;
  private readonly metrics: CacheMetrics;

  constructor(
    store: VectorStore,
    embedder: EmbeddingProvider,
    config?: Partial<CacheOrchestratorConfig>
  ) {
    this.store = store;
    this.embedder = embedder;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = new CacheMetrics();
  }

  async lookup(prompt: string): Promise<CacheResult<T>> {
    const start = Date.now();
    const hash = hashPrompt(prompt);

    const exactResult = this.lookupExact(hash, start);
    if (exactResult) return exactResult;

    const vectorResult = await this.lookupVector(prompt, hash, start);
    if (vectorResult) return vectorResult;

    return this.buildMiss(hash, start);
  }

  async storeEntry(prompt: string, data: T): Promise<void> {
    const hash = hashPrompt(prompt);
    const embedding = await this.embedder.embed(normalizePrompt(prompt));
    const now = Date.now();

    this.storeExact(hash, data, embedding.vector, now);
    await this.storeVector(hash, data, embedding.vector, now);
  }

  async invalidate(prompt: string): Promise<void> {
    const hash = hashPrompt(prompt);
    this.exactCache.delete(hash);
    try {
      await this.store.deletePoints(this.config.collectionName, [hash]);
    } catch {
      // Ignore deletion errors for non-existent points
    }
  }

  getMetrics(): ReturnType<CacheMetrics['getStats']> {
    return this.metrics.getStats();
  }

  resetMetrics(): void {
    this.metrics.reset();
  }

  clearExactCache(): void {
    this.exactCache.clear();
  }

  private lookupExact(
    hash: string,
    start: number
  ): CacheResult<T> | null {
    const entry = this.exactCache.get(hash);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.exactCache.delete(hash);
      return null;
    }

    entry.hitCount++;
    entry.lastAccessedAt = Date.now();
    const latencyMs = Date.now() - start;
    this.metrics.recordHit('exact', latencyMs);

    return {
      hit: true,
      tier: 'exact',
      data: entry.data,
      score: 1.0,
      latencyMs,
      key: hash,
    };
  }

  private async lookupVector(
    prompt: string,
    hash: string,
    start: number
  ): Promise<CacheResult<T> | null> {
    try {
      const normalized = normalizePrompt(prompt);
      const embedding = await this.embedder.embed(normalized);

      const results = await this.store.search(
        this.config.collectionName,
        embedding.vector,
        {
          limit: 1,
          scoreThreshold: this.config.similarityThreshold,
          withPayload: true,
        }
      );

      const top = results[0];
      if (!top) return null;

      const latencyMs = Date.now() - start;
      this.metrics.recordHit('vector', latencyMs);

      const data = top.payload['data'] as T;

      return {
        hit: true,
        tier: 'vector',
        data,
        score: top.score,
        latencyMs,
        key: hash,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- intentional operational log
      console.warn('[CacheOrchestrator] Vector lookup failed:', error);
      return null;
    }
  }

  private buildMiss(hash: string, start: number): CacheResult<T> {
    const latencyMs = Date.now() - start;
    this.metrics.recordHit('miss', latencyMs);

    return {
      hit: false,
      tier: 'miss',
      data: null,
      score: 0,
      latencyMs,
      key: hash,
    };
  }

  private storeExact(
    hash: string,
    data: T,
    vector: number[],
    now: number
  ): void {
    if (this.exactCache.size >= this.config.maxExactEntries) {
      this.evictOldestExact();
    }

    this.exactCache.set(hash, {
      key: hash,
      hash,
      data,
      vector,
      createdAt: now,
      expiresAt: now + this.config.exactMatchTtlMs,
      hitCount: 0,
      lastAccessedAt: now,
      metadata: {},
    });
  }

  private async storeVector(
    hash: string,
    data: T,
    vector: number[],
    now: number
  ): Promise<void> {
    try {
      await this.store.upsertPoints(this.config.collectionName, [
        {
          id: hash,
          vector,
          payload: {
            data: data as unknown,
            createdAt: now,
            expiresAt: now + this.config.vectorMatchTtlMs,
          },
        },
      ]);
    } catch (error) {
      console.warn('Failed to write to vector store:', error);
    }
  }

  private evictOldestExact(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.exactCache.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.exactCache.delete(oldestKey);
    }
  }
}

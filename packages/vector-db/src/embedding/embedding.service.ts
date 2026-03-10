/**
 * Multi-provider embedding service with fallback chain
 * and caching support.
 */

import type {
  EmbeddingProvider,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingServiceConfig,
} from '../types/embedding.types.js';
import { EmbeddingCache } from './embedding-cache.js';

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_CACHE_TTL_MS = 3600000;

export class EmbeddingService {
  private readonly providers: EmbeddingProvider[];
  private readonly cache: EmbeddingCache;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(config: Partial<EmbeddingServiceConfig>) {
    this.providers = config.providers ?? [];
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cache = new EmbeddingCache({
      ttlMs: config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
    });
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const cached = this.cache.get(text);
    if (cached) return cached;

    const result = await this.embedWithFallback(text);
    this.cache.set(text, result);
    return result;
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const { cached, uncachedTexts, uncachedIndices } =
      this.partitionCached(texts);

    if (uncachedTexts.length === 0) {
      return this.buildBatchResult(cached, []);
    }

    const freshResults = await this.embedBatchWithFallback(uncachedTexts);
    this.cacheNewResults(uncachedTexts, freshResults.embeddings);

    return this.mergeBatchResults(
      texts,
      cached,
      freshResults,
      uncachedIndices
    );
  }

  getActiveProvider(): EmbeddingProvider | undefined {
    return this.providers[0];
  }

  getCacheStats(): { size: number; maxEntries: number; ttlMs: number } {
    return this.cache.getStats();
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async embedWithFallback(text: string): Promise<EmbeddingResult> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          return await this.withTimeout(provider.embed(text));
        } catch (error) {
          errors.push(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    }

    throw new Error(
      `All embedding providers failed: ${errors.map((e) => e.message).join('; ')}`
    );
  }

  private async embedBatchWithFallback(
    texts: string[]
  ): Promise<BatchEmbeddingResult> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      try {
        return await this.withTimeout(provider.embedBatch(texts));
      } catch (error) {
        errors.push(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    throw new Error(
      `All embedding providers failed for batch: ${errors.map((e) => e.message).join('; ')}`
    );
  }

  private partitionCached(texts: string[]): {
    cached: Map<number, EmbeddingResult>;
    uncachedTexts: string[];
    uncachedIndices: number[];
  } {
    const cached = new Map<number, EmbeddingResult>();
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (text === undefined) continue;
      const cachedResult = this.cache.get(text);
      if (cachedResult) {
        cached.set(i, cachedResult);
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(i);
      }
    }

    return { cached, uncachedTexts, uncachedIndices };
  }

  private cacheNewResults(
    texts: string[],
    embeddings: EmbeddingResult[]
  ): void {
    for (let i = 0; i < embeddings.length; i++) {
      const text = texts[i];
      const embedding = embeddings[i];
      if (text && embedding) {
        this.cache.set(text, embedding);
      }
    }
  }

  private buildBatchResult(
    cached: Map<number, EmbeddingResult>,
    failedIndices: number[]
  ): BatchEmbeddingResult {
    const embeddings = Array.from(cached.values());
    const model = embeddings[0]?.model ?? 'unknown';
    const totalTokens = embeddings.reduce((s, e) => s + e.tokenCount, 0);

    return { embeddings, model, totalTokens, failedIndices };
  }

  private mergeBatchResults(
    _originalTexts: string[],
    cached: Map<number, EmbeddingResult>,
    fresh: BatchEmbeddingResult,
    uncachedIndices: number[]
  ): BatchEmbeddingResult {
    const allEmbeddings: EmbeddingResult[] = [];
    let freshIdx = 0;

    const totalSize = cached.size + fresh.embeddings.length;
    for (let i = 0; i < totalSize; i++) {
      const cachedEntry = cached.get(i);
      if (cachedEntry) {
        allEmbeddings.push(cachedEntry);
      } else if (freshIdx < fresh.embeddings.length) {
        const embedding = fresh.embeddings[freshIdx];
        if (embedding) {
          allEmbeddings.push(embedding);
        }
        freshIdx++;
      }
    }

    const model = allEmbeddings[0]?.model ?? 'unknown';
    const totalTokens = allEmbeddings.reduce((s, e) => s + e.tokenCount, 0);
    const failedIndices = fresh.failedIndices.map(
      (fi) => uncachedIndices[fi] ?? fi
    );

    return { embeddings: allEmbeddings, model, totalTokens, failedIndices };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Embedding timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs
      );
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (error) {
      clearTimeout(timer!);
      throw error;
    }
  }
}

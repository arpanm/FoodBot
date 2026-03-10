/**
 * Hybrid search combining keyword results and semantic results
 * using Reciprocal Rank Fusion (RRF).
 */

import type { SearchResult, VectorStore } from '../types/vector-store.types.js';
import type { EmbeddingProvider } from '../types/embedding.types.js';

const DEFAULT_K = 60;
const DEFAULT_TIMEOUT_MS = 5000;

export interface HybridSearchConfig {
  store: VectorStore;
  embedder: EmbeddingProvider;
  keywordWeight: number;
  semanticWeight: number;
  rrfK: number;
  timeoutMs: number;
}

export interface KeywordSearchFn {
  (query: string, limit: number): Promise<SearchResult[]>;
}

export interface HybridSearchResult {
  id: string;
  score: number;
  keywordRank: number | null;
  semanticRank: number | null;
  payload: Record<string, unknown>;
}

export class HybridSearch {
  private readonly store: VectorStore;
  private readonly embedder: EmbeddingProvider;
  private readonly keywordWeight: number;
  private readonly semanticWeight: number;
  private readonly rrfK: number;
  private readonly timeoutMs: number;

  constructor(config: HybridSearchConfig) {
    this.store = config.store;
    this.embedder = config.embedder;
    this.keywordWeight = config.keywordWeight;
    this.semanticWeight = config.semanticWeight;
    this.rrfK = config.rrfK;
    this.timeoutMs = config.timeoutMs;
  }

  async search(
    collection: string,
    query: string,
    keywordSearchFn: KeywordSearchFn,
    limit: number
  ): Promise<HybridSearchResult[]> {
    const fetchLimit = limit * 3;

    const [keywordResults, semanticResults] = await Promise.all([
      this.withTimeout(keywordSearchFn(query, fetchLimit)),
      this.semanticSearch(collection, query, fetchLimit),
    ]);

    return this.fuseResults(keywordResults, semanticResults, limit);
  }

  fuseResults(
    keywordResults: SearchResult[],
    semanticResults: SearchResult[],
    limit: number
  ): HybridSearchResult[] {
    const keywordRanks = this.buildRankMap(keywordResults);
    const semanticRanks = this.buildRankMap(semanticResults);
    const allIds = this.collectUniqueIds(keywordResults, semanticResults);
    const payloads = this.buildPayloadMap(keywordResults, semanticResults);

    const fused: HybridSearchResult[] = [];

    for (const id of allIds) {
      const score = this.computeRrfScore(
        keywordRanks.get(id) ?? null,
        semanticRanks.get(id) ?? null
      );

      fused.push({
        id,
        score,
        keywordRank: keywordRanks.get(id) ?? null,
        semanticRank: semanticRanks.get(id) ?? null,
        payload: payloads.get(id) ?? {},
      });
    }

    fused.sort((a, b) => b.score - a.score);
    return fused.slice(0, limit);
  }

  private computeRrfScore(
    keywordRank: number | null,
    semanticRank: number | null
  ): number {
    let score = 0;

    if (keywordRank !== null) {
      score += this.keywordWeight * (1 / (this.rrfK + keywordRank));
    }

    if (semanticRank !== null) {
      score += this.semanticWeight * (1 / (this.rrfK + semanticRank));
    }

    return score;
  }

  private buildRankMap(results: SearchResult[]): Map<string, number> {
    const ranks = new Map<string, number>();
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result) {
        ranks.set(result.id, i + 1);
      }
    }
    return ranks;
  }

  private collectUniqueIds(
    ...resultSets: SearchResult[][]
  ): string[] {
    const ids = new Set<string>();
    for (const results of resultSets) {
      for (const result of results) {
        ids.add(result.id);
      }
    }
    return Array.from(ids);
  }

  private buildPayloadMap(
    ...resultSets: SearchResult[][]
  ): Map<string, Record<string, unknown>> {
    const payloads = new Map<string, Record<string, unknown>>();
    for (const results of resultSets) {
      for (const result of results) {
        if (!payloads.has(result.id)) {
          payloads.set(result.id, result.payload);
        }
      }
    }
    return payloads;
  }

  private async semanticSearch(
    collection: string,
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    const embedding = await this.embedder.embed(query);
    return this.store.search(collection, embedding.vector, {
      limit,
      withPayload: true,
    });
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Hybrid search timed out after ${this.timeoutMs}ms`)),
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

export function createHybridSearch(
  store: VectorStore,
  embedder: EmbeddingProvider,
  config?: Partial<Omit<HybridSearchConfig, 'store' | 'embedder'>>
): HybridSearch {
  return new HybridSearch({
    store,
    embedder,
    keywordWeight: config?.keywordWeight ?? 0.4,
    semanticWeight: config?.semanticWeight ?? 0.6,
    rrfK: config?.rrfK ?? DEFAULT_K,
    timeoutMs: config?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
}

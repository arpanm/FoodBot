/**
 * Search engine providing ANN search with filtering
 * and recommendation capabilities.
 */

import type {
  VectorStore,
  SearchResult,
  SearchOptions,
  RecommendOptions,
  FilterCondition,
} from '../types/vector-store.types.js';

const DEFAULT_TIMEOUT_MS = 5000;

export interface SearchEngineConfig {
  store: VectorStore;
  defaultLimit: number;
  defaultThreshold: number;
  timeoutMs: number;
}

export class SearchEngine {
  private readonly store: VectorStore;
  private readonly defaultLimit: number;
  private readonly defaultThreshold: number;
  private readonly timeoutMs: number;

  constructor(config: SearchEngineConfig) {
    this.store = config.store;
    this.defaultLimit = config.defaultLimit;
    this.defaultThreshold = config.defaultThreshold;
    this.timeoutMs = config.timeoutMs;
  }

  async search(
    collection: string,
    vector: number[],
    options?: Partial<SearchOptions>
  ): Promise<SearchResult[]> {
    const fullOptions = this.buildSearchOptions(options);
    return this.withTimeout(
      this.store.search(collection, vector, fullOptions),
      this.timeoutMs
    );
  }

  async filteredSearch(
    collection: string,
    vector: number[],
    filter: FilterCondition,
    options?: Partial<SearchOptions>
  ): Promise<SearchResult[]> {
    const fullOptions = this.buildSearchOptions({ ...options, filter });
    return this.withTimeout(
      this.store.search(collection, vector, fullOptions),
      this.timeoutMs
    );
  }

  async recommend(
    collection: string,
    options: RecommendOptions
  ): Promise<SearchResult[]> {
    const positivePoints = await this.store.getPoints(
      collection,
      options.positive
    );

    if (positivePoints.length === 0) {
      return [];
    }

    const avgVector = this.averageVectors(
      positivePoints.map((p) => p.vector)
    );

    const negativeVector = await this.computeNegativeAdjustment(
      collection,
      options.negative
    );

    const queryVector = negativeVector
      ? this.subtractVectors(avgVector, negativeVector)
      : avgVector;

    const normalized = this.normalizeVector(queryVector);

    return this.search(collection, normalized, {
      limit: options.limit,
      scoreThreshold: options.scoreThreshold,
      filter: options.filter,
    });
  }

  private async computeNegativeAdjustment(
    collection: string,
    negativeIds?: string[]
  ): Promise<number[] | null> {
    if (!negativeIds || negativeIds.length === 0) {
      return null;
    }

    const negativePoints = await this.store.getPoints(
      collection,
      negativeIds
    );

    if (negativePoints.length === 0) {
      return null;
    }

    const avgNegative = this.averageVectors(
      negativePoints.map((p) => p.vector)
    );

    return avgNegative.map((v) => v * 0.5);
  }

  private buildSearchOptions(
    partial?: Partial<SearchOptions>
  ): SearchOptions {
    return {
      limit: partial?.limit ?? this.defaultLimit,
      scoreThreshold: partial?.scoreThreshold ?? this.defaultThreshold,
      filter: partial?.filter,
      withPayload: partial?.withPayload ?? true,
      withVector: partial?.withVector ?? false,
      offset: partial?.offset ?? 0,
    };
  }

  private averageVectors(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0]?.length ?? 0;
    const avg = new Array<number>(dim).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        avg[i] = (avg[i] ?? 0) + (vec[i] ?? 0);
      }
    }

    return avg.map((v) => v / vectors.length);
  }

  private subtractVectors(a: number[], b: number[]): number[] {
    return a.map((v, i) => v - (b[i] ?? 0));
  }

  private normalizeVector(vector: number[]): number[] {
    let norm = 0;
    for (const v of vector) {
      norm += v * v;
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return vector;
    return vector.map((v) => v / norm);
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number
  ): Promise<T> {
    const timeoutMs = ms > 0 ? ms : DEFAULT_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Search timed out after ${timeoutMs}ms`)),
        timeoutMs
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

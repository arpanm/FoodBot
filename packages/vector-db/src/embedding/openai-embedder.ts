/**
 * OpenAI embedding provider (text-embedding-3-small, 1536 dims).
 * Uses mockable API call pattern for testing.
 */

import type {
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingResult,
  BatchEmbeddingResult,
} from '../types/embedding.types.js';

const OPENAI_DIMENSION = 1536;
const MODEL_NAME = 'text-embedding-3-small';
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_BATCH_SIZE = 100;

export interface OpenAiApiClient {
  createEmbedding(
    input: string[],
    model: string
  ): Promise<OpenAiEmbeddingResponse>;
}

export interface OpenAiEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number };
  model: string;
}

export class OpenAiEmbedder implements EmbeddingProvider {
  readonly config: EmbeddingProviderConfig;
  private readonly apiClient: OpenAiApiClient;

  constructor(apiClient: OpenAiApiClient, timeoutMs?: number) {
    this.apiClient = apiClient;
    this.config = {
      name: MODEL_NAME,
      dimension: OPENAI_DIMENSION,
      maxBatchSize: MAX_BATCH_SIZE,
      timeoutMs: timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await this.withTimeout(
      this.apiClient.createEmbedding([text], MODEL_NAME)
    );

    const embedding = response.data[0];
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    return {
      vector: embedding.embedding,
      model: response.model,
      dimension: embedding.embedding.length,
      tokenCount: response.usage.total_tokens,
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const chunks = this.chunkArray(texts, MAX_BATCH_SIZE);
    const allEmbeddings: EmbeddingResult[] = [];
    const failedIndices: number[] = [];
    let totalTokens = 0;
    let globalIndex = 0;

    for (const chunk of chunks) {
      try {
        const result = await this.processChunk(chunk, globalIndex);
        allEmbeddings.push(...result.embeddings);
        failedIndices.push(...result.failedIndices);
        totalTokens += result.totalTokens;
      } catch (error) {
        // eslint-disable-next-line no-console -- operational log for failed batch chunk
        console.warn('[OpenAiEmbedder] Batch chunk failed:', error instanceof Error ? error.message : 'unknown');
        for (let i = 0; i < chunk.length; i++) {
          failedIndices.push(globalIndex + i);
        }
      }
      globalIndex += chunk.length;
    }

    return {
      embeddings: allEmbeddings,
      model: MODEL_NAME,
      totalTokens,
      failedIndices,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.withTimeout(
        this.apiClient.createEmbedding(['test'], MODEL_NAME)
      );
      return true;
    } catch {
      return false;
    }
  }

  private async processChunk(
    texts: string[],
    _startIndex: number
  ): Promise<{
    embeddings: EmbeddingResult[];
    failedIndices: number[];
    totalTokens: number;
  }> {
    const response = await this.withTimeout(
      this.apiClient.createEmbedding(texts, MODEL_NAME)
    );

    const embeddings: EmbeddingResult[] = response.data.map((d) => ({
      vector: d.embedding,
      model: response.model,
      dimension: d.embedding.length,
      tokenCount: Math.ceil(response.usage.total_tokens / response.data.length),
    }));

    return {
      embeddings,
      failedIndices: [],
      totalTokens: response.usage.total_tokens,
    };
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`OpenAI embedding timed out after ${this.config.timeoutMs}ms`)),
        this.config.timeoutMs
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

/**
 * Embedding provider types for multi-provider embedding with fallback.
 */

export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimension: number;
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  model: string;
  totalTokens: number;
  failedIndices: number[];
}

export interface EmbeddingProviderConfig {
  name: string;
  dimension: number;
  maxBatchSize: number;
  timeoutMs: number;
}

export interface EmbeddingProvider {
  readonly config: EmbeddingProviderConfig;
  embed(text: string): Promise<EmbeddingResult>;
  embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;
  isAvailable(): Promise<boolean>;
}

export interface EmbeddingServiceConfig {
  providers: EmbeddingProvider[];
  cacheTtlMs: number;
  maxRetries: number;
  timeoutMs: number;
}

export interface EmbeddingCacheEntry {
  key: string;
  result: EmbeddingResult;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
}

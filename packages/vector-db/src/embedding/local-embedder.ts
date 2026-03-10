/**
 * Local embedding provider for testing and fallback.
 * Generates deterministic vectors from text using hash-based approach.
 */

import { createHash } from 'crypto';
import type {
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingResult,
  BatchEmbeddingResult,
} from '../types/embedding.types.js';

const LOCAL_DIMENSION = 384;
const MODEL_NAME = 'local-hash-384';

export class LocalEmbedder implements EmbeddingProvider {
  readonly config: EmbeddingProviderConfig;

  constructor(dimension: number = LOCAL_DIMENSION) {
    this.config = {
      name: MODEL_NAME,
      dimension,
      maxBatchSize: 100,
      timeoutMs: 1000,
    };
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const vector = this.generateVector(text);
    return {
      vector,
      model: MODEL_NAME,
      dimension: this.config.dimension,
      tokenCount: this.estimateTokens(text),
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const embeddings: EmbeddingResult[] = [];
    const failedIndices: number[] = [];
    let totalTokens = 0;

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (text === undefined || text.trim().length === 0) {
        failedIndices.push(i);
        continue;
      }
      const result = await this.embed(text);
      embeddings.push(result);
      totalTokens += result.tokenCount;
    }

    return {
      embeddings,
      model: MODEL_NAME,
      totalTokens,
      failedIndices,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private generateVector(text: string): number[] {
    const hash = createHash('sha256').update(text).digest('hex');
    const vector: number[] = [];

    for (let i = 0; i < this.config.dimension; i++) {
      const charIndex = i % hash.length;
      const charCode = hash.charCodeAt(charIndex);
      const seed = (charCode * (i + 1) * 7919) % 10000;
      vector.push((seed / 10000) * 2 - 1);
    }

    return this.normalize(vector);
  }

  private normalize(vector: number[]): number[] {
    let norm = 0;
    for (const v of vector) {
      norm += v * v;
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return vector;
    return vector.map((v) => v / norm);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
}

/**
 * Intent matcher using exact hash or semantic similarity.
 * Matches user prompts to cached intents with a 0.92 similarity threshold.
 */

import type { EmbeddingProvider } from '../types/embedding.types.js';
import type { VectorStore, SearchResult } from '../types/vector-store.types.js';
import { hashPrompt, normalizePrompt } from '../cache/prompt-hasher.js';

const DEFAULT_SIMILARITY_THRESHOLD = 0.92;
const DEFAULT_COLLECTION = 'intents';
const DEFAULT_TIMEOUT_MS = 5000;

export interface IntentEntry {
  id: string;
  name: string;
  description: string;
  examples: string[];
  metadata: Record<string, unknown>;
}

export interface IntentMatchResult {
  matched: boolean;
  intent: IntentEntry | null;
  score: number;
  matchType: 'exact' | 'semantic' | 'none';
  latencyMs: number;
}

export class IntentMatcher {
  private readonly store: VectorStore;
  private readonly embedder: EmbeddingProvider;
  private readonly exactIndex: Map<string, IntentEntry> = new Map();
  private readonly threshold: number;
  private readonly collection: string;
  private readonly timeoutMs: number;

  constructor(
    store: VectorStore,
    embedder: EmbeddingProvider,
    config?: {
      threshold?: number;
      collection?: string;
      timeoutMs?: number;
    }
  ) {
    this.store = store;
    this.embedder = embedder;
    this.threshold = config?.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
    this.collection = config?.collection ?? DEFAULT_COLLECTION;
    this.timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async registerIntent(intent: IntentEntry): Promise<void> {
    for (const example of intent.examples) {
      const hash = hashPrompt(example);
      this.exactIndex.set(hash, intent);
    }

    await this.indexIntentVectors(intent);
  }

  async match(prompt: string): Promise<IntentMatchResult> {
    const start = Date.now();

    const exactResult = this.matchExact(prompt, start);
    if (exactResult.matched) return exactResult;

    return this.matchSemantic(prompt, start);
  }

  async removeIntent(intentId: string): Promise<void> {
    const keysToRemove: string[] = [];
    for (const [hash, intent] of this.exactIndex.entries()) {
      if (intent.id === intentId) {
        keysToRemove.push(hash);
      }
    }
    for (const key of keysToRemove) {
      this.exactIndex.delete(key);
    }

    try {
      await this.store.deletePoints(this.collection, [intentId]);
    } catch {
      // Ignore if not found
    }
  }

  private matchExact(prompt: string, start: number): IntentMatchResult {
    const hash = hashPrompt(prompt);
    const intent = this.exactIndex.get(hash);

    if (intent) {
      return {
        matched: true,
        intent,
        score: 1.0,
        matchType: 'exact',
        latencyMs: Date.now() - start,
      };
    }

    return {
      matched: false,
      intent: null,
      score: 0,
      matchType: 'none',
      latencyMs: Date.now() - start,
    };
  }

  private async matchSemantic(
    prompt: string,
    start: number
  ): Promise<IntentMatchResult> {
    try {
      const normalized = normalizePrompt(prompt);
      const embedding = await this.embedder.embed(normalized);

      const results = await this.withTimeout(
        this.store.search(this.collection, embedding.vector, {
          limit: 1,
          scoreThreshold: this.threshold,
          withPayload: true,
        })
      );

      const top = results[0];
      if (!top) {
        return this.noMatch(start);
      }

      const intent = this.extractIntent(top);
      return {
        matched: true,
        intent,
        score: top.score,
        matchType: 'semantic',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- operational log for failed semantic match
      console.warn('[IntentMatcher] Semantic match failed:', error instanceof Error ? error.message : 'unknown');
      return this.noMatch(start);
    }
  }

  private extractIntent(result: SearchResult): IntentEntry {
    return {
      id: result.id,
      name: (result.payload['name'] as string) ?? '',
      description: (result.payload['description'] as string) ?? '',
      examples: (result.payload['examples'] as string[]) ?? [],
      metadata: (result.payload['metadata'] as Record<string, unknown>) ?? {},
    };
  }

  private async indexIntentVectors(intent: IntentEntry): Promise<void> {
    const text = `${intent.name} ${intent.description} ${intent.examples.join(' ')}`;
    const normalized = normalizePrompt(text);
    const embedding = await this.embedder.embed(normalized);

    await this.store.upsertPoints(this.collection, [
      {
        id: intent.id,
        vector: embedding.vector,
        payload: {
          name: intent.name,
          description: intent.description,
          examples: intent.examples,
          metadata: intent.metadata,
        },
      },
    ]);
  }

  private noMatch(start: number): IntentMatchResult {
    return {
      matched: false,
      intent: null,
      score: 0,
      matchType: 'none',
      latencyMs: Date.now() - start,
    };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Intent match timed out after ${this.timeoutMs}ms`)),
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

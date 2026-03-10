/**
 * Cache for computed embeddings to avoid redundant computation.
 * Uses in-memory Map with TTL-based expiration.
 */

import { createHash } from 'crypto';
import type {
  EmbeddingResult,
  EmbeddingCacheEntry,
} from '../types/embedding.types.js';

export interface EmbeddingCacheConfig {
  maxEntries: number;
  ttlMs: number;
}

const DEFAULT_MAX_ENTRIES = 10000;
const DEFAULT_TTL_MS = 3600000; // 1 hour

export class EmbeddingCache {
  private readonly cache: Map<string, EmbeddingCacheEntry> = new Map();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(config?: Partial<EmbeddingCacheConfig>) {
    this.maxEntries = config?.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.ttlMs = config?.ttlMs ?? DEFAULT_TTL_MS;
  }

  get(text: string): EmbeddingResult | null {
    const key = this.computeKey(text);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.result;
  }

  set(text: string, result: EmbeddingResult): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    const key = this.computeKey(text);
    const now = Date.now();

    this.cache.set(key, {
      key,
      result,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      hitCount: 0,
    });
  }

  has(text: string): boolean {
    const key = this.computeKey(text);
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(text: string): boolean {
    const key = this.computeKey(text);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxEntries: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
    };
  }

  private computeKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private isExpired(entry: EmbeddingCacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

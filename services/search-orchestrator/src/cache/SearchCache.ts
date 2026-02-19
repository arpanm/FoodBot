/**
 * Redis-based search cache with TTL support and metrics tracking.
 * Falls back to in-memory cache when Redis is unavailable.
 */

import pino from 'pino';

import type { SearchResponse } from '../types/search.types';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
}

export interface RedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

export class SearchCache {
  private readonly logger: pino.Logger;
  private readonly redisClient: RedisClient | null;
  private readonly memoryCache: Map<string, CacheEntry>;
  private hits = 0;
  private misses = 0;

  private static readonly MAX_MEMORY_ENTRIES = 1000;

  constructor(redisClient: RedisClient | null, logger: pino.Logger) {
    this.redisClient = redisClient;
    this.logger = logger.child({ component: 'SearchCache' });
    this.memoryCache = new Map();
  }

  async get(key: string): Promise<SearchResponse | null> {
    const raw = await this.getRaw(key);
    if (raw) {
      this.hits++;
      try {
        return JSON.parse(raw) as SearchResponse;
      } catch (error) {
        this.logger.warn({ key, error }, 'Failed to parse cached value');
        return null;
      }
    }

    this.misses++;
    return null;
  }

  async getRaw(key: string): Promise<string | null> {
    // Try Redis first
    if (this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          return value;
        }
      } catch (error) {
        this.logger.warn({ key, error }, 'Redis get failed, trying memory cache');
      }
    }

    // Fall back to memory cache
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.value;
      }
      this.memoryCache.delete(key);
    }

    return null;
  }

  async set(key: string, value: SearchResponse, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.setRaw(key, serialized, ttlSeconds);
  }

  async setRaw(key: string, value: string, ttlSeconds: number): Promise<void> {
    // Store in Redis
    if (this.redisClient) {
      try {
        await this.redisClient.setex(key, ttlSeconds, value);
      } catch (error) {
        this.logger.warn({ key, error }, 'Redis set failed, using memory cache only');
      }
    }

    // Also store in memory cache
    this.evictIfNeeded();
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async invalidate(key: string): Promise<void> {
    // Remove from Redis
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        this.logger.warn({ key, error }, 'Redis delete failed');
      }
    }

    // Remove from memory
    this.memoryCache.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate from Redis
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        for (const key of keys) {
          await this.redisClient.del(key);
        }
      } catch (error) {
        this.logger.warn({ pattern, error }, 'Redis pattern invalidation failed');
      }
    }

    // Invalidate from memory
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      totalKeys: this.memoryCache.size,
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  clear(): void {
    this.memoryCache.clear();
    this.resetStats();
  }

  private evictIfNeeded(): void {
    if (this.memoryCache.size >= SearchCache.MAX_MEMORY_ENTRIES) {
      // Remove expired entries first
      const now = Date.now();
      for (const [key, entry] of this.memoryCache) {
        if (now >= entry.expiresAt) {
          this.memoryCache.delete(key);
        }
      }

      // If still over limit, remove oldest entries
      if (this.memoryCache.size >= SearchCache.MAX_MEMORY_ENTRIES) {
        const entries = Array.from(this.memoryCache.entries());
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);

        const toRemove = entries.slice(0, Math.floor(SearchCache.MAX_MEMORY_ENTRIES * 0.2));
        for (const [key] of toRemove) {
          this.memoryCache.delete(key);
        }
      }
    }
  }
}

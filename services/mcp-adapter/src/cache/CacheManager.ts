/**
 * Cache manager for the MCP Adapter.
 * Provides a unified caching interface with TTL support.
 */

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  key: string;
}

export interface CacheBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * In-memory cache backend for development and testing.
 */
export class InMemoryCacheBackend implements CacheBackend {
  private readonly store: Map<string, { value: string; expiresAt: number }> =
    new Map();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export interface CacheTTLConfig {
  searchResultsMs: number;
  restaurantDetailsMs: number;
  menuDataMs: number;
  dishAvailabilityMs: number;
  reviewsMs: number;
  collectionsMs: number;
}

const DEFAULT_TTL_CONFIG: CacheTTLConfig = {
  searchResultsMs: 5 * 60 * 1000,      // 5 minutes
  restaurantDetailsMs: 15 * 60 * 1000,  // 15 minutes
  menuDataMs: 10 * 60 * 1000,           // 10 minutes
  dishAvailabilityMs: 1 * 60 * 1000,    // 1 minute
  reviewsMs: 30 * 60 * 1000,            // 30 minutes
  collectionsMs: 60 * 60 * 1000,        // 60 minutes
};

export class CacheManager {
  private readonly backend: CacheBackend;
  private readonly ttlConfig: CacheTTLConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(backend: CacheBackend, ttlConfig?: Partial<CacheTTLConfig>) {
    this.backend = backend;
    this.ttlConfig = { ...DEFAULT_TTL_CONFIG, ...ttlConfig };
  }

  /**
   * Get a cached value.
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const raw = await this.backend.get(key);
    if (!raw) {
      this.metrics.misses++;
      return null;
    }

    try {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      this.metrics.hits++;
      return entry;
    } catch {
      this.metrics.misses++;
      await this.backend.del(key);
      return null;
    }
  }

  /**
   * Set a cached value with TTL.
   */
  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttlMs,
      key,
    };

    const ttlSeconds = Math.ceil(ttlMs / 1000);
    await this.backend.set(key, JSON.stringify(entry), ttlSeconds);
    this.metrics.sets++;
  }

  /**
   * Delete a cached value.
   */
  async del(key: string): Promise<void> {
    await this.backend.del(key);
    this.metrics.deletes++;
  }

  /**
   * Check if a key exists in cache.
   */
  async has(key: string): Promise<boolean> {
    return this.backend.has(key);
  }

  /**
   * Convenience method: get or compute.
   * Returns cached value if present; otherwise computes, caches, and returns.
   */
  async getOrCompute<T>(
    key: string,
    ttlMs: number,
    compute: () => Promise<T>
  ): Promise<{ data: T; fromCache: boolean; cachedAt: number | null }> {
    const cached = await this.get<T>(key);
    if (cached) {
      return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
    }

    const data = await compute();
    await this.set(key, data, ttlMs);
    return { data, fromCache: false, cachedAt: null };
  }

  /**
   * Build a cache key for search results.
   */
  buildSearchKey(
    provider: string,
    query: string,
    lat: number,
    lng: number
  ): string {
    const locationHash = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const queryNorm = query.toLowerCase().trim().replace(/\s+/g, '-');
    return `${provider}:search:${locationHash}:${queryNorm}`;
  }

  /**
   * Build a cache key for restaurant details.
   */
  buildRestaurantKey(provider: string, restaurantId: string): string {
    return `${provider}:restaurant:${restaurantId}`;
  }

  /**
   * Build a cache key for menu data.
   */
  buildMenuKey(provider: string, restaurantId: string): string {
    return `${provider}:menu:${restaurantId}`;
  }

  /**
   * Build a cache key for availability.
   */
  buildAvailabilityKey(provider: string, restaurantId: string): string {
    return `${provider}:avail:${restaurantId}`;
  }

  getTTLConfig(): CacheTTLConfig {
    return { ...this.ttlConfig };
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

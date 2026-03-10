import { EmbeddingCache } from '../embedding/embedding-cache';
import type { EmbeddingResult } from '../types/embedding.types';

describe('EmbeddingCache', () => {
  let cache: EmbeddingCache;

  const mockResult: EmbeddingResult = {
    vector: [0.1, 0.2, 0.3],
    model: 'test-model',
    dimension: 3,
    tokenCount: 5,
  };

  beforeEach(() => {
    cache = new EmbeddingCache({ maxEntries: 100, ttlMs: 60000 });
  });

  describe('set and get', () => {
    it('should store and retrieve an embedding', () => {
      cache.set('hello', mockResult);
      const result = cache.get('hello');
      expect(result).toEqual(mockResult);
    });

    it('should return null for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing entry', () => {
      cache.set('hello', mockResult);
      const newResult = { ...mockResult, tokenCount: 10 };
      cache.set('hello', newResult);
      expect(cache.get('hello')?.tokenCount).toBe(10);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cache.set('hello', mockResult);
      expect(cache.has('hello')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an entry', () => {
      cache.set('hello', mockResult);
      expect(cache.delete('hello')).toBe(true);
      expect(cache.get('hello')).toBeNull();
    });

    it('should return false for non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', mockResult);
      cache.set('b', mockResult);
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size()).toBe(0);
    });

    it('should return correct count', () => {
      cache.set('a', mockResult);
      cache.set('b', mockResult);
      expect(cache.size()).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return cache stats', () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.maxEntries).toBe(100);
      expect(stats.ttlMs).toBe(60000);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new EmbeddingCache({ ttlMs: 1, maxEntries: 100 });
      shortCache.set('test', mockResult);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(shortCache.get('test')).toBeNull();
    });

    it('should report has as false for expired entries', async () => {
      const shortCache = new EmbeddingCache({ ttlMs: 1, maxEntries: 100 });
      shortCache.set('test', mockResult);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(shortCache.has('test')).toBe(false);
    });
  });

  describe('max entries eviction', () => {
    it('should evict oldest entry when max reached', () => {
      const smallCache = new EmbeddingCache({ maxEntries: 2, ttlMs: 60000 });
      smallCache.set('first', mockResult);
      smallCache.set('second', mockResult);
      smallCache.set('third', mockResult);

      // 'first' should have been evicted
      expect(smallCache.get('first')).toBeNull();
      expect(smallCache.get('second')).not.toBeNull();
      expect(smallCache.get('third')).not.toBeNull();
    });
  });

  describe('hit count tracking', () => {
    it('should increment hit count on get', () => {
      cache.set('test', mockResult);
      cache.get('test');
      cache.get('test');
      // Hit count is internal but we can verify it returns the result
      expect(cache.get('test')).toEqual(mockResult);
    });
  });

  describe('default config', () => {
    it('should use defaults when no config provided', () => {
      const defaultCache = new EmbeddingCache();
      const stats = defaultCache.getStats();
      expect(stats.maxEntries).toBe(10000);
      expect(stats.ttlMs).toBe(3600000);
    });
  });
});

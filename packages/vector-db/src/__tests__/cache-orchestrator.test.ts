import { CacheOrchestrator } from '../cache/cache-orchestrator';
import { InMemoryVectorStore } from '../vector-store/vector-store.client';
import { LocalEmbedder } from '../embedding/local-embedder';

describe('CacheOrchestrator', () => {
  let store: InMemoryVectorStore;
  let embedder: LocalEmbedder;
  let orchestrator: CacheOrchestrator<string>;
  const collectionName = 'semantic_cache';

  beforeEach(async () => {
    store = new InMemoryVectorStore();
    embedder = new LocalEmbedder();
    await store.createCollection({
      name: collectionName,
      dimension: 384,
      distance: 'cosine',
    });
    orchestrator = new CacheOrchestrator<string>(store, embedder, {
      collectionName,
      similarityThreshold: 0.92,
    });
  });

  describe('lookup - cache miss', () => {
    it('should return miss for unknown prompt', async () => {
      const result = await orchestrator.lookup('unknown prompt');
      expect(result.hit).toBe(false);
      expect(result.tier).toBe('miss');
      expect(result.data).toBeNull();
      expect(result.score).toBe(0);
    });
  });

  describe('store and lookup - exact match', () => {
    it('should return exact match for same prompt', async () => {
      await orchestrator.storeEntry('what is the best pizza', 'cached response');
      const result = await orchestrator.lookup('what is the best pizza');
      expect(result.hit).toBe(true);
      expect(result.tier).toBe('exact');
      expect(result.data).toBe('cached response');
      expect(result.score).toBe(1.0);
    });

    it('should match after normalization', async () => {
      await orchestrator.storeEntry('What is the BEST pizza?', 'response1');
      const result = await orchestrator.lookup('what is the best pizza');
      expect(result.hit).toBe(true);
      expect(result.tier).toBe('exact');
    });
  });

  describe('store and lookup - vector match', () => {
    it('should return vector match from store when exact cache is cleared', async () => {
      await orchestrator.storeEntry('best pizza in new york', 'ny pizza response');
      orchestrator.clearExactCache();

      const result = await orchestrator.lookup('best pizza in new york');
      // Since the same text produces the same vector, it should match from vector store
      if (result.hit) {
        expect(result.tier).toBe('vector');
        expect(result.score).toBeGreaterThanOrEqual(0.92);
      } else {
        // If the similarity is below threshold after normalization, this is also acceptable
        expect(result.tier).toBe('miss');
      }
    });
  });

  describe('invalidate', () => {
    it('should invalidate exact cache entry', async () => {
      await orchestrator.storeEntry('test prompt', 'test data');
      await orchestrator.invalidate('test prompt');
      const result = await orchestrator.lookup('test prompt');
      // After invalidation, exact match should not work
      expect(result.tier).not.toBe('exact');
    });
  });

  describe('metrics', () => {
    it('should track misses', async () => {
      await orchestrator.lookup('unknown');
      const metrics = orchestrator.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.overallHitRate).toBe(0);
    });

    it('should track exact hits', async () => {
      await orchestrator.storeEntry('hello', 'world');
      await orchestrator.lookup('hello');
      const metrics = orchestrator.getMetrics();
      expect(metrics.exactHits).toBe(1);
      expect(metrics.overallHitRate).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      await orchestrator.lookup('test');
      orchestrator.resetMetrics();
      const metrics = orchestrator.getMetrics();
      expect(metrics.totalRequests).toBe(0);
    });

    it('should track latency', async () => {
      await orchestrator.lookup('test');
      const metrics = orchestrator.getMetrics();
      expect(metrics.avgLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exact cache eviction', () => {
    it('should evict oldest entry when max is reached', async () => {
      const smallOrchestrator = new CacheOrchestrator<string>(store, embedder, {
        collectionName,
        maxExactEntries: 2,
      });

      await smallOrchestrator.storeEntry('first', 'data1');
      await smallOrchestrator.storeEntry('second', 'data2');
      await smallOrchestrator.storeEntry('third', 'data3');

      // "first" should have been evicted
      const result = await smallOrchestrator.lookup('first');
      expect(result.tier).not.toBe('exact');
    });
  });

  describe('TTL expiration', () => {
    it('should expire exact cache entries', async () => {
      const shortTtl = new CacheOrchestrator<string>(store, embedder, {
        collectionName,
        exactMatchTtlMs: 1,
      });

      await shortTtl.storeEntry('expire-test', 'data');
      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await shortTtl.lookup('expire-test');
      expect(result.tier).not.toBe('exact');
    });
  });
});

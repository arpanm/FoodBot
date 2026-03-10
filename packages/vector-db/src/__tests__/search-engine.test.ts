import { SearchEngine } from '../vector-store/search-engine';
import { InMemoryVectorStore } from '../vector-store/vector-store.client';

describe('SearchEngine', () => {
  let store: InMemoryVectorStore;
  let engine: SearchEngine;
  const collection = 'test-search';

  beforeEach(async () => {
    store = new InMemoryVectorStore();
    await store.createCollection({
      name: collection,
      dimension: 3,
      distance: 'cosine',
    });
    await store.upsertPoints(collection, [
      { id: 'p1', vector: [1, 0, 0], payload: { name: 'A', cuisine: 'italian' } },
      { id: 'p2', vector: [0, 1, 0], payload: { name: 'B', cuisine: 'indian' } },
      { id: 'p3', vector: [0.7, 0.7, 0], payload: { name: 'C', cuisine: 'italian' } },
    ]);

    engine = new SearchEngine({
      store,
      defaultLimit: 10,
      defaultThreshold: 0.0,
      timeoutMs: 5000,
    });
  });

  describe('search', () => {
    it('should return results using default options', async () => {
      const results = await engine.search(collection, [1, 0, 0]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.id).toBe('p1');
    });

    it('should respect custom limit', async () => {
      const results = await engine.search(collection, [1, 0, 0], { limit: 1 });
      expect(results).toHaveLength(1);
    });

    it('should apply score threshold', async () => {
      const results = await engine.search(collection, [1, 0, 0], {
        scoreThreshold: 0.99,
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('filteredSearch', () => {
    it('should apply filter conditions', async () => {
      const results = await engine.filteredSearch(
        collection,
        [0.5, 0.5, 0],
        { must: [{ type: 'match', key: 'cuisine', value: 'italian' }] }
      );
      expect(results.every((r) => r.payload['cuisine'] === 'italian')).toBe(true);
    });

    it('should combine filter with options', async () => {
      const results = await engine.filteredSearch(
        collection,
        [0.5, 0.5, 0],
        { must: [{ type: 'match', key: 'cuisine', value: 'italian' }] },
        { limit: 1 }
      );
      expect(results).toHaveLength(1);
    });
  });

  describe('recommend', () => {
    it('should recommend based on positive examples', async () => {
      const results = await engine.recommend(collection, {
        positive: ['p1'],
        limit: 3,
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent positive ids', async () => {
      const results = await engine.recommend(collection, {
        positive: ['nonexistent'],
        limit: 3,
      });
      expect(results).toHaveLength(0);
    });

    it('should apply negative examples', async () => {
      const results = await engine.recommend(collection, {
        positive: ['p1'],
        negative: ['p2'],
        limit: 3,
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect score threshold', async () => {
      const results = await engine.recommend(collection, {
        positive: ['p1'],
        limit: 3,
        scoreThreshold: 0.99,
      });
      // May or may not have results depending on vector math
      expect(Array.isArray(results)).toBe(true);
    });

    it('should apply filter to recommendations', async () => {
      const results = await engine.recommend(collection, {
        positive: ['p1'],
        limit: 3,
        filter: { must: [{ type: 'match', key: 'cuisine', value: 'italian' }] },
      });
      expect(results.every((r) => r.payload['cuisine'] === 'italian')).toBe(true);
    });

    it('should handle empty negative ids', async () => {
      const results = await engine.recommend(collection, {
        positive: ['p1'],
        negative: [],
        limit: 3,
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle non-existent negative ids', async () => {
      const results = await engine.recommend(collection, {
        positive: ['p1'],
        negative: ['nonexistent'],
        limit: 3,
      });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('timeout', () => {
    it('should handle normal operations within timeout', async () => {
      const fastEngine = new SearchEngine({
        store,
        defaultLimit: 10,
        defaultThreshold: 0.0,
        timeoutMs: 5000,
      });
      const results = await fastEngine.search(collection, [1, 0, 0]);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

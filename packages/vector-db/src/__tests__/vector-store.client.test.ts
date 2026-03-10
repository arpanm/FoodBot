import { InMemoryVectorStore } from '../vector-store/vector-store.client';
import type { CollectionConfig, VectorPoint } from '../types/vector-store.types';

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;

  const testConfig: CollectionConfig = {
    name: 'test-collection',
    dimension: 3,
    distance: 'cosine',
  };

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  describe('createCollection', () => {
    it('should create a new collection', async () => {
      await store.createCollection(testConfig);
      const collections = await store.listCollections();
      expect(collections).toContain('test-collection');
    });

    it('should throw if collection already exists', async () => {
      await store.createCollection(testConfig);
      await expect(store.createCollection(testConfig)).rejects.toThrow(
        "Collection 'test-collection' already exists"
      );
    });
  });

  describe('deleteCollection', () => {
    it('should delete an existing collection', async () => {
      await store.createCollection(testConfig);
      await store.deleteCollection('test-collection');
      const collections = await store.listCollections();
      expect(collections).not.toContain('test-collection');
    });

    it('should not throw when deleting non-existent collection', async () => {
      await expect(store.deleteCollection('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('listCollections', () => {
    it('should return empty array initially', async () => {
      const collections = await store.listCollections();
      expect(collections).toEqual([]);
    });

    it('should list all created collections', async () => {
      await store.createCollection(testConfig);
      await store.createCollection({ ...testConfig, name: 'other' });
      const collections = await store.listCollections();
      expect(collections).toHaveLength(2);
    });
  });

  describe('upsertPoints', () => {
    beforeEach(async () => {
      await store.createCollection(testConfig);
    });

    it('should insert new points', async () => {
      const points: VectorPoint[] = [
        { id: 'p1', vector: [1, 0, 0], payload: { name: 'a' } },
        { id: 'p2', vector: [0, 1, 0], payload: { name: 'b' } },
      ];
      await store.upsertPoints('test-collection', points);
      const results = await store.getPoints('test-collection', ['p1', 'p2']);
      expect(results).toHaveLength(2);
    });

    it('should update existing points', async () => {
      await store.upsertPoints('test-collection', [
        { id: 'p1', vector: [1, 0, 0], payload: { name: 'original' } },
      ]);
      await store.upsertPoints('test-collection', [
        { id: 'p1', vector: [0, 1, 0], payload: { name: 'updated' } },
      ]);
      const results = await store.getPoints('test-collection', ['p1']);
      expect(results[0]?.payload['name']).toBe('updated');
    });

    it('should throw for dimension mismatch', async () => {
      await expect(
        store.upsertPoints('test-collection', [
          { id: 'p1', vector: [1, 0], payload: {} },
        ])
      ).rejects.toThrow('Vector dimension mismatch');
    });

    it('should throw for non-existent collection', async () => {
      await expect(
        store.upsertPoints('nonexistent', [
          { id: 'p1', vector: [1, 0, 0], payload: {} },
        ])
      ).rejects.toThrow("Collection 'nonexistent' does not exist");
    });
  });

  describe('deletePoints', () => {
    beforeEach(async () => {
      await store.createCollection(testConfig);
      await store.upsertPoints('test-collection', [
        { id: 'p1', vector: [1, 0, 0], payload: {} },
        { id: 'p2', vector: [0, 1, 0], payload: {} },
      ]);
    });

    it('should delete specified points', async () => {
      await store.deletePoints('test-collection', ['p1']);
      const results = await store.getPoints('test-collection', ['p1', 'p2']);
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('p2');
    });
  });

  describe('getPoints', () => {
    beforeEach(async () => {
      await store.createCollection(testConfig);
      await store.upsertPoints('test-collection', [
        { id: 'p1', vector: [1, 0, 0], payload: { val: 1 } },
      ]);
    });

    it('should return matching points', async () => {
      const results = await store.getPoints('test-collection', ['p1']);
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('p1');
    });

    it('should skip non-existent points', async () => {
      const results = await store.getPoints('test-collection', ['p1', 'missing']);
      expect(results).toHaveLength(1);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await store.createCollection(testConfig);
      await store.upsertPoints('test-collection', [
        { id: 'p1', vector: [1, 0, 0], payload: { cuisine: 'italian', price: 15 } },
        { id: 'p2', vector: [0, 1, 0], payload: { cuisine: 'indian', price: 12 } },
        { id: 'p3', vector: [0.7, 0.7, 0], payload: { cuisine: 'italian', price: 20 } },
      ]);
    });

    it('should return results sorted by score', async () => {
      const results = await store.search('test-collection', [1, 0, 0], {
        limit: 3,
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.id).toBe('p1');
    });

    it('should respect limit', async () => {
      const results = await store.search('test-collection', [1, 0, 0], {
        limit: 1,
      });
      expect(results).toHaveLength(1);
    });

    it('should apply score threshold', async () => {
      const results = await store.search('test-collection', [1, 0, 0], {
        limit: 10,
        scoreThreshold: 0.99,
      });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('p1');
    });

    it('should filter by match condition', async () => {
      const results = await store.search('test-collection', [0.5, 0.5, 0], {
        limit: 10,
        filter: {
          must: [{ type: 'match', key: 'cuisine', value: 'italian' }],
        },
      });
      expect(results.every((r) => r.payload['cuisine'] === 'italian')).toBe(true);
    });

    it('should filter by range condition', async () => {
      const results = await store.search('test-collection', [0.5, 0.5, 0], {
        limit: 10,
        filter: {
          must: [{ type: 'range', key: 'price', gte: 15 }],
        },
      });
      expect(results.every((r) => (r.payload['price'] as number) >= 15)).toBe(true);
    });

    it('should handle must_not filter', async () => {
      const results = await store.search('test-collection', [0.5, 0.5, 0], {
        limit: 10,
        filter: {
          must_not: [{ type: 'match', key: 'cuisine', value: 'indian' }],
        },
      });
      expect(results.every((r) => r.payload['cuisine'] !== 'indian')).toBe(true);
    });

    it('should handle should filter', async () => {
      const results = await store.search('test-collection', [0.5, 0.5, 0], {
        limit: 10,
        filter: {
          should: [
            { type: 'match', key: 'cuisine', value: 'italian' },
            { type: 'match', key: 'cuisine', value: 'indian' },
          ],
        },
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should apply offset', async () => {
      const all = await store.search('test-collection', [0.5, 0.5, 0], {
        limit: 3,
      });
      const offset = await store.search('test-collection', [0.5, 0.5, 0], {
        limit: 3,
        offset: 1,
      });
      expect(offset[0]?.id).toBe(all[1]?.id);
    });

    it('should handle keyword filter', async () => {
      const results = await store.search('test-collection', [0.5, 0.5, 0], {
        limit: 10,
        filter: {
          must: [{ type: 'keyword', key: 'cuisine', values: ['italian'] }],
        },
      });
      expect(results.every((r) => r.payload['cuisine'] === 'italian')).toBe(true);
    });
  });

  describe('search with distance metrics', () => {
    it('should work with euclidean distance', async () => {
      const eucConfig: CollectionConfig = {
        name: 'euc',
        dimension: 3,
        distance: 'euclidean',
      };
      await store.createCollection(eucConfig);
      await store.upsertPoints('euc', [
        { id: 'p1', vector: [1, 0, 0], payload: {} },
        { id: 'p2', vector: [0, 1, 0], payload: {} },
      ]);
      const results = await store.search('euc', [1, 0, 0], { limit: 2 });
      expect(results[0]?.id).toBe('p1');
    });

    it('should work with dot product distance', async () => {
      const dotConfig: CollectionConfig = {
        name: 'dot',
        dimension: 3,
        distance: 'dot',
      };
      await store.createCollection(dotConfig);
      await store.upsertPoints('dot', [
        { id: 'p1', vector: [1, 0, 0], payload: {} },
        { id: 'p2', vector: [0, 1, 0], payload: {} },
      ]);
      const results = await store.search('dot', [1, 0, 0], { limit: 2 });
      expect(results[0]?.id).toBe('p1');
    });
  });

  describe('geo filter', () => {
    it('should filter by geo radius', async () => {
      const geoConfig: CollectionConfig = {
        name: 'geo',
        dimension: 3,
        distance: 'cosine',
      };
      await store.createCollection(geoConfig);
      await store.upsertPoints('geo', [
        { id: 'near', vector: [1, 0, 0], payload: { loc: { lat: 40.7128, lon: -74.0060 } } },
        { id: 'far', vector: [0, 1, 0], payload: { loc: { lat: 51.5074, lon: -0.1278 } } },
      ]);

      const results = await store.search('geo', [0.5, 0.5, 0], {
        limit: 10,
        filter: {
          must: [{
            type: 'geo',
            key: 'loc',
            center: { lat: 40.7128, lon: -74.0060 },
            radiusKm: 100,
          }],
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('near');
    });
  });
});

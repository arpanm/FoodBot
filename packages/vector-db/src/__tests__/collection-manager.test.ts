import { CollectionManager } from '../vector-store/collection-manager';
import { InMemoryVectorStore } from '../vector-store/vector-store.client';
import type { CollectionConfig } from '../types/vector-store.types';

describe('CollectionManager', () => {
  let store: InMemoryVectorStore;
  let manager: CollectionManager;

  const testConfig: CollectionConfig = {
    name: 'test-col',
    dimension: 128,
    distance: 'cosine',
  };

  beforeEach(() => {
    store = new InMemoryVectorStore();
    manager = new CollectionManager(store);
  });

  describe('createCollection', () => {
    it('should create collection in the store', async () => {
      await manager.createCollection(testConfig);
      const list = await store.listCollections();
      expect(list).toContain('test-col');
    });

    it('should save config for later retrieval', async () => {
      await manager.createCollection(testConfig);
      const config = manager.getConfig('test-col');
      expect(config).toEqual(testConfig);
    });

    it('should throw for empty name', async () => {
      await expect(
        manager.createCollection({ ...testConfig, name: '' })
      ).rejects.toThrow('Collection name must not be empty');
    });

    it('should throw for whitespace-only name', async () => {
      await expect(
        manager.createCollection({ ...testConfig, name: '   ' })
      ).rejects.toThrow('Collection name must not be empty');
    });

    it('should throw for non-positive dimension', async () => {
      await expect(
        manager.createCollection({ ...testConfig, dimension: 0 })
      ).rejects.toThrow('Dimension must be a positive integer');
    });

    it('should throw for negative dimension', async () => {
      await expect(
        manager.createCollection({ ...testConfig, dimension: -5 })
      ).rejects.toThrow('Dimension must be a positive integer');
    });

    it('should throw for non-integer dimension', async () => {
      await expect(
        manager.createCollection({ ...testConfig, dimension: 3.5 })
      ).rejects.toThrow('Dimension must be a positive integer');
    });

    it('should throw for invalid distance metric', async () => {
      await expect(
        manager.createCollection({ ...testConfig, distance: 'invalid' as 'cosine' })
      ).rejects.toThrow('Invalid distance metric');
    });
  });

  describe('deleteCollection', () => {
    it('should remove collection from store', async () => {
      await manager.createCollection(testConfig);
      await manager.deleteCollection('test-col');
      const list = await store.listCollections();
      expect(list).not.toContain('test-col');
    });

    it('should remove saved config', async () => {
      await manager.createCollection(testConfig);
      await manager.deleteCollection('test-col');
      expect(manager.getConfig('test-col')).toBeUndefined();
    });
  });

  describe('ensureCollection', () => {
    it('should create collection if it does not exist', async () => {
      await manager.ensureCollection(testConfig);
      const list = await store.listCollections();
      expect(list).toContain('test-col');
    });

    it('should not throw if collection already exists', async () => {
      await manager.createCollection(testConfig);
      await expect(manager.ensureCollection(testConfig)).resolves.toBeUndefined();
    });
  });

  describe('listCollections', () => {
    it('should return empty list initially', async () => {
      const list = await manager.listCollections();
      expect(list).toEqual([]);
    });

    it('should return all created collections', async () => {
      await manager.createCollection(testConfig);
      await manager.createCollection({ ...testConfig, name: 'other' });
      const list = await manager.listCollections();
      expect(list).toHaveLength(2);
    });
  });

  describe('getConfig', () => {
    it('should return undefined for unknown collection', () => {
      expect(manager.getConfig('nonexistent')).toBeUndefined();
    });
  });
});

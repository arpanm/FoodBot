/**
 * Collection manager for creating/managing vector store collections
 * with configurable dimensions and distance metrics.
 */

import type {
  CollectionConfig,
  VectorStore,
} from '../types/vector-store.types.js';

export interface CollectionInfo {
  name: string;
  dimension: number;
  distance: string;
  pointCount: number;
}

export class CollectionManager {
  private readonly store: VectorStore;
  private readonly configs: Map<string, CollectionConfig> = new Map();

  constructor(store: VectorStore) {
    this.store = store;
  }

  async createCollection(config: CollectionConfig): Promise<void> {
    this.validateConfig(config);
    await this.store.createCollection(config);
    this.configs.set(config.name, config);
  }

  async deleteCollection(name: string): Promise<void> {
    await this.store.deleteCollection(name);
    this.configs.delete(name);
  }

  async ensureCollection(config: CollectionConfig): Promise<void> {
    const collections = await this.store.listCollections();
    if (!collections.includes(config.name)) {
      await this.createCollection(config);
    }
  }

  async listCollections(): Promise<string[]> {
    return this.store.listCollections();
  }

  getConfig(name: string): CollectionConfig | undefined {
    return this.configs.get(name);
  }

  private validateConfig(config: CollectionConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Collection name must not be empty');
    }
    if (config.dimension <= 0 || !Number.isInteger(config.dimension)) {
      throw new Error('Dimension must be a positive integer');
    }
    const validDistances = ['cosine', 'euclidean', 'dot'];
    if (!validDistances.includes(config.distance)) {
      throw new Error(
        `Invalid distance metric: ${config.distance}. Must be one of: ${validDistances.join(', ')}`
      );
    }
  }
}

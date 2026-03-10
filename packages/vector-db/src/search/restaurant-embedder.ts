/**
 * Generates embedding text from restaurant metadata and stores
 * restaurant vectors for semantic search.
 */

import type { EmbeddingProvider } from '../types/embedding.types.js';
import type { VectorStore, VectorPoint } from '../types/vector-store.types.js';

const DEFAULT_COLLECTION = 'restaurants';
const DEFAULT_TIMEOUT_MS = 5000;

export interface RestaurantData {
  id: string;
  name: string;
  description: string;
  cuisines: string[];
  location: { lat: number; lon: number; address: string };
  rating?: number;
  priceRange?: number;
  isOpen?: boolean;
  metadata?: Record<string, unknown>;
}

export class RestaurantEmbedder {
  private readonly store: VectorStore;
  private readonly embedder: EmbeddingProvider;
  private readonly collection: string;
  private readonly timeoutMs: number;

  constructor(
    store: VectorStore,
    embedder: EmbeddingProvider,
    config?: { collection?: string; timeoutMs?: number }
  ) {
    this.store = store;
    this.embedder = embedder;
    this.collection = config?.collection ?? DEFAULT_COLLECTION;
    this.timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async embedRestaurant(restaurant: RestaurantData): Promise<VectorPoint> {
    const text = this.buildEmbeddingText(restaurant);
    const embedding = await this.withTimeout(this.embedder.embed(text));

    const point: VectorPoint = {
      id: restaurant.id,
      vector: embedding.vector,
      payload: this.buildPayload(restaurant),
    };

    await this.store.upsertPoints(this.collection, [point]);
    return point;
  }

  async embedRestaurants(
    restaurants: RestaurantData[]
  ): Promise<VectorPoint[]> {
    const points: VectorPoint[] = [];

    for (const restaurant of restaurants) {
      const point = await this.embedRestaurant(restaurant);
      points.push(point);
    }

    return points;
  }

  async removeRestaurant(restaurantId: string): Promise<void> {
    await this.store.deletePoints(this.collection, [restaurantId]);
  }

  buildEmbeddingText(restaurant: RestaurantData): string {
    const parts = [
      restaurant.name,
      restaurant.description,
      `cuisines: ${restaurant.cuisines.join(', ')}`,
      `location: ${restaurant.location.address}`,
    ];

    if (restaurant.rating !== undefined) {
      parts.push(`rating: ${restaurant.rating}`);
    }
    if (restaurant.priceRange !== undefined) {
      parts.push(`price range: ${restaurant.priceRange}`);
    }

    return parts.join(' ').toLowerCase();
  }

  private buildPayload(restaurant: RestaurantData): Record<string, unknown> {
    return {
      name: restaurant.name,
      description: restaurant.description,
      cuisines: restaurant.cuisines,
      location: restaurant.location,
      rating: restaurant.rating ?? 0,
      priceRange: restaurant.priceRange ?? 0,
      isOpen: restaurant.isOpen ?? true,
      ...(restaurant.metadata ?? {}),
    };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `Restaurant embedding timed out after ${this.timeoutMs}ms`
            )
          ),
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

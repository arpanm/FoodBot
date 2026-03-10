/**
 * Generates embedding text from dish metadata and stores
 * dish vectors for semantic search.
 */

import type { EmbeddingProvider } from '../types/embedding.types.js';
import type { VectorStore, VectorPoint } from '../types/vector-store.types.js';

const DEFAULT_COLLECTION = 'dishes';
const DEFAULT_TIMEOUT_MS = 5000;

export interface DishData {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  ingredients: string[];
  price: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  spiceLevel?: number;
  restaurantId?: string;
  metadata?: Record<string, unknown>;
}

export class DishEmbedder {
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

  async embedDish(dish: DishData): Promise<VectorPoint> {
    const text = this.buildEmbeddingText(dish);
    const embedding = await this.withTimeout(this.embedder.embed(text));

    const point: VectorPoint = {
      id: dish.id,
      vector: embedding.vector,
      payload: this.buildPayload(dish),
    };

    await this.store.upsertPoints(this.collection, [point]);
    return point;
  }

  async embedDishes(dishes: DishData[]): Promise<VectorPoint[]> {
    const points: VectorPoint[] = [];

    for (const dish of dishes) {
      const point = await this.embedDish(dish);
      points.push(point);
    }

    return points;
  }

  async removeDish(dishId: string): Promise<void> {
    await this.store.deletePoints(this.collection, [dishId]);
  }

  buildEmbeddingText(dish: DishData): string {
    const parts = [
      dish.name,
      dish.description,
      `cuisine: ${dish.cuisine}`,
      `ingredients: ${dish.ingredients.join(', ')}`,
    ];

    if (dish.isVegetarian) parts.push('vegetarian');
    if (dish.isVegan) parts.push('vegan');
    if (dish.spiceLevel !== undefined) {
      parts.push(`spice level: ${dish.spiceLevel}`);
    }

    return parts.join(' ').toLowerCase();
  }

  private buildPayload(dish: DishData): Record<string, unknown> {
    return {
      name: dish.name,
      description: dish.description,
      cuisine: dish.cuisine,
      ingredients: dish.ingredients,
      price: dish.price,
      isVegetarian: dish.isVegetarian ?? false,
      isVegan: dish.isVegan ?? false,
      spiceLevel: dish.spiceLevel ?? 0,
      restaurantId: dish.restaurantId ?? '',
      ...(dish.metadata ?? {}),
    };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Dish embedding timed out after ${this.timeoutMs}ms`)),
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

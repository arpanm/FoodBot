import { DishEmbedder } from '../search/dish-embedder';
import type { DishData } from '../search/dish-embedder';
import { InMemoryVectorStore } from '../vector-store/vector-store.client';
import { LocalEmbedder } from '../embedding/local-embedder';

describe('DishEmbedder', () => {
  let store: InMemoryVectorStore;
  let embedder: LocalEmbedder;
  let dishEmbedder: DishEmbedder;
  const collection = 'dishes';

  const testDish: DishData = {
    id: 'dish-1',
    name: 'Margherita Pizza',
    description: 'Classic Italian pizza with tomato sauce and mozzarella',
    cuisine: 'Italian',
    ingredients: ['tomato sauce', 'mozzarella', 'basil', 'olive oil'],
    price: 12.99,
    isVegetarian: true,
    isVegan: false,
    spiceLevel: 1,
    restaurantId: 'rest-1',
  };

  const spicyDish: DishData = {
    id: 'dish-2',
    name: 'Chicken Tikka Masala',
    description: 'Creamy spiced chicken curry',
    cuisine: 'Indian',
    ingredients: ['chicken', 'yogurt', 'tomato', 'spices', 'cream'],
    price: 15.99,
    spiceLevel: 4,
  };

  beforeEach(async () => {
    store = new InMemoryVectorStore();
    embedder = new LocalEmbedder();
    await store.createCollection({
      name: collection,
      dimension: 384,
      distance: 'cosine',
    });
    dishEmbedder = new DishEmbedder(store, embedder, { collection });
  });

  describe('embedDish', () => {
    it('should embed a dish and store it', async () => {
      const point = await dishEmbedder.embedDish(testDish);
      expect(point.id).toBe('dish-1');
      expect(point.vector).toHaveLength(384);
      expect(point.payload['name']).toBe('Margherita Pizza');
    });

    it('should store dish in vector store', async () => {
      await dishEmbedder.embedDish(testDish);
      const points = await store.getPoints(collection, ['dish-1']);
      expect(points).toHaveLength(1);
      expect(points[0]?.payload['cuisine']).toBe('Italian');
    });

    it('should include all payload fields', async () => {
      const point = await dishEmbedder.embedDish(testDish);
      expect(point.payload['price']).toBe(12.99);
      expect(point.payload['isVegetarian']).toBe(true);
      expect(point.payload['isVegan']).toBe(false);
      expect(point.payload['spiceLevel']).toBe(1);
      expect(point.payload['restaurantId']).toBe('rest-1');
    });

    it('should handle dish without optional fields', async () => {
      const minimalDish: DishData = {
        id: 'dish-3',
        name: 'Salad',
        description: 'Fresh garden salad',
        cuisine: 'American',
        ingredients: ['lettuce', 'tomato', 'cucumber'],
        price: 8.99,
      };
      const point = await dishEmbedder.embedDish(minimalDish);
      expect(point.payload['isVegetarian']).toBe(false);
      expect(point.payload['isVegan']).toBe(false);
      expect(point.payload['spiceLevel']).toBe(0);
      expect(point.payload['restaurantId']).toBe('');
    });
  });

  describe('embedDishes', () => {
    it('should embed multiple dishes', async () => {
      const points = await dishEmbedder.embedDishes([testDish, spicyDish]);
      expect(points).toHaveLength(2);
    });
  });

  describe('removeDish', () => {
    it('should remove dish from store', async () => {
      await dishEmbedder.embedDish(testDish);
      await dishEmbedder.removeDish('dish-1');
      const points = await store.getPoints(collection, ['dish-1']);
      expect(points).toHaveLength(0);
    });
  });

  describe('buildEmbeddingText', () => {
    it('should include name, description, cuisine, ingredients', () => {
      const text = dishEmbedder.buildEmbeddingText(testDish);
      expect(text).toContain('margherita pizza');
      expect(text).toContain('classic italian pizza');
      expect(text).toContain('cuisine: italian');
      expect(text).toContain('mozzarella');
    });

    it('should include vegetarian flag', () => {
      const text = dishEmbedder.buildEmbeddingText(testDish);
      expect(text).toContain('vegetarian');
    });

    it('should include spice level', () => {
      const text = dishEmbedder.buildEmbeddingText(spicyDish);
      expect(text).toContain('spice level: 4');
    });

    it('should include vegan flag when true', () => {
      const veganDish: DishData = {
        ...testDish,
        isVegan: true,
      };
      const text = dishEmbedder.buildEmbeddingText(veganDish);
      expect(text).toContain('vegan');
    });
  });
});

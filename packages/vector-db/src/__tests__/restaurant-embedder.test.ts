import { RestaurantEmbedder } from '../search/restaurant-embedder';
import type { RestaurantData } from '../search/restaurant-embedder';
import { InMemoryVectorStore } from '../vector-store/vector-store.client';
import { LocalEmbedder } from '../embedding/local-embedder';

describe('RestaurantEmbedder', () => {
  let store: InMemoryVectorStore;
  let embedder: LocalEmbedder;
  let restaurantEmbedder: RestaurantEmbedder;
  const collection = 'restaurants';

  const testRestaurant: RestaurantData = {
    id: 'rest-1',
    name: 'Pizza Palace',
    description: 'Authentic Italian pizzeria',
    cuisines: ['Italian', 'Mediterranean'],
    location: { lat: 40.7128, lon: -74.006, address: '123 Main St, New York' },
    rating: 4.5,
    priceRange: 2,
    isOpen: true,
  };

  const indianRestaurant: RestaurantData = {
    id: 'rest-2',
    name: 'Spice Garden',
    description: 'Traditional Indian cuisine',
    cuisines: ['Indian', 'South Asian'],
    location: { lat: 40.7300, lon: -73.990, address: '456 Curry Ln, New York' },
    rating: 4.2,
    priceRange: 3,
  };

  beforeEach(async () => {
    store = new InMemoryVectorStore();
    embedder = new LocalEmbedder();
    await store.createCollection({
      name: collection,
      dimension: 384,
      distance: 'cosine',
    });
    restaurantEmbedder = new RestaurantEmbedder(store, embedder, { collection });
  });

  describe('embedRestaurant', () => {
    it('should embed a restaurant and store it', async () => {
      const point = await restaurantEmbedder.embedRestaurant(testRestaurant);
      expect(point.id).toBe('rest-1');
      expect(point.vector).toHaveLength(384);
      expect(point.payload['name']).toBe('Pizza Palace');
    });

    it('should store restaurant in vector store', async () => {
      await restaurantEmbedder.embedRestaurant(testRestaurant);
      const points = await store.getPoints(collection, ['rest-1']);
      expect(points).toHaveLength(1);
    });

    it('should include all payload fields', async () => {
      const point = await restaurantEmbedder.embedRestaurant(testRestaurant);
      expect(point.payload['cuisines']).toEqual(['Italian', 'Mediterranean']);
      expect(point.payload['rating']).toBe(4.5);
      expect(point.payload['priceRange']).toBe(2);
      expect(point.payload['isOpen']).toBe(true);
    });

    it('should handle restaurant without optional fields', async () => {
      const minimal: RestaurantData = {
        id: 'rest-3',
        name: 'Minimal Cafe',
        description: 'A simple cafe',
        cuisines: ['Cafe'],
        location: { lat: 0, lon: 0, address: 'Somewhere' },
      };
      const point = await restaurantEmbedder.embedRestaurant(minimal);
      expect(point.payload['rating']).toBe(0);
      expect(point.payload['priceRange']).toBe(0);
      expect(point.payload['isOpen']).toBe(true);
    });
  });

  describe('embedRestaurants', () => {
    it('should embed multiple restaurants', async () => {
      const points = await restaurantEmbedder.embedRestaurants([
        testRestaurant,
        indianRestaurant,
      ]);
      expect(points).toHaveLength(2);
    });
  });

  describe('removeRestaurant', () => {
    it('should remove restaurant from store', async () => {
      await restaurantEmbedder.embedRestaurant(testRestaurant);
      await restaurantEmbedder.removeRestaurant('rest-1');
      const points = await store.getPoints(collection, ['rest-1']);
      expect(points).toHaveLength(0);
    });
  });

  describe('buildEmbeddingText', () => {
    it('should include name, description, cuisines, location', () => {
      const text = restaurantEmbedder.buildEmbeddingText(testRestaurant);
      expect(text).toContain('pizza palace');
      expect(text).toContain('authentic italian pizzeria');
      expect(text).toContain('cuisines: italian, mediterranean');
      expect(text).toContain('location: 123 main st, new york');
    });

    it('should include rating when present', () => {
      const text = restaurantEmbedder.buildEmbeddingText(testRestaurant);
      expect(text).toContain('rating: 4.5');
    });

    it('should include price range when present', () => {
      const text = restaurantEmbedder.buildEmbeddingText(testRestaurant);
      expect(text).toContain('price range: 2');
    });
  });
});

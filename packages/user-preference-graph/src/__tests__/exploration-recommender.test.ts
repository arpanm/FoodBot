import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { OrderHistoryImporter } from '../preference/order-history-importer';
import { ExplorationRecommender } from '../recommendation/exploration-recommender';
import { NodeType, RelationshipType } from '../types/graph.types';
import { OrderHistoryRecord } from '../types/preference.types';

function createOrder(overrides?: Partial<OrderHistoryRecord>): OrderHistoryRecord {
  return {
    orderId: 'order-1', userId: 'user-1', restaurantId: 'r1', restaurantName: 'Spice Garden',
    restaurantLatitude: 12, restaurantLongitude: 77, restaurantCuisine: 'Indian', restaurantRating: 4,
    items: [{ dishId: 'd1', dishName: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, categoryId: 'cat-indian', categoryName: 'Indian' }],
    orderDate: new Date().toISOString(), dayOfWeek: 'Friday', timeSlot: 'dinner', rating: 4,
    ...overrides,
  };
}

describe('ExplorationRecommender', () => {
  let graph: InMemoryGraph;
  let recommender: ExplorationRecommender;
  let importer: OrderHistoryImporter;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    recommender = new ExplorationRecommender(graph);
    importer = new OrderHistoryImporter(graph);
  });

  afterEach(() => {
    graph.close();
  });

  describe('suggestNewCategories', () => {
    it('should suggest categories user has not tried', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [
        createOrder({ orderId: 'o2', userId: 'bob', restaurantId: 'r2', restaurantName: 'Pasta Place', restaurantCuisine: 'Italian',
          items: [{ dishId: 'd2', dishName: 'Pasta', price: 400, cuisine: 'Italian', isVegetarian: true, categoryId: 'cat-italian', categoryName: 'Italian' }],
        }),
      ]);

      const suggestions = recommender.suggestNewCategories('alice');
      const italianSuggestion = suggestions.find((s) => s.name === 'Italian');
      expect(italianSuggestion).toBeDefined();
    });

    it('should not suggest categories user already likes', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [createOrder({ orderId: 'o2', userId: 'bob' })]);

      const suggestions = recommender.suggestNewCategories('alice');
      const indianSuggestion = suggestions.find((s) => s.name === 'Indian');
      expect(indianSuggestion).toBeUndefined();
    });

    it('should rank by popularity', () => {
      importer.importOrders('alice', [createOrder()]);
      // Two other users like Italian, one likes Chinese
      importer.importOrders('bob', [
        createOrder({ orderId: 'o2', userId: 'bob', restaurantId: 'r2', restaurantName: 'Pasta',
          items: [{ dishId: 'd2', dishName: 'Pasta', price: 400, cuisine: 'Italian', isVegetarian: true, categoryId: 'cat-italian', categoryName: 'Italian' }],
        }),
      ]);
      importer.importOrders('charlie', [
        createOrder({ orderId: 'o3', userId: 'charlie', restaurantId: 'r2', restaurantName: 'Pasta',
          items: [{ dishId: 'd2', dishName: 'Pasta', price: 400, cuisine: 'Italian', isVegetarian: true, categoryId: 'cat-italian', categoryName: 'Italian' }],
        }),
      ]);
      importer.importOrders('dave', [
        createOrder({ orderId: 'o4', userId: 'dave', restaurantId: 'r3', restaurantName: 'Dragon',
          items: [{ dishId: 'd3', dishName: 'Noodles', price: 200, cuisine: 'Chinese', isVegetarian: true, categoryId: 'cat-chinese', categoryName: 'Chinese' }],
        }),
      ]);

      const suggestions = recommender.suggestNewCategories('alice');
      if (suggestions.length >= 2) {
        expect(suggestions[0]?.score).toBeGreaterThanOrEqual(suggestions[1]?.score ?? 0);
      }
    });

    it('should respect limit parameter', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [
        createOrder({ orderId: 'o2', userId: 'bob', restaurantId: 'r2', restaurantName: 'P1',
          items: [{ dishId: 'd2', dishName: 'P', price: 400, cuisine: 'Italian', isVegetarian: true, categoryId: 'cat-it', categoryName: 'Italian' }],
        }),
      ]);

      const suggestions = recommender.suggestNewCategories('alice', 1);
      expect(suggestions.length).toBeLessThanOrEqual(1);
    });

    it('should return empty when no untried categories exist', () => {
      importer.importOrders('alice', [createOrder()]);
      const suggestions = recommender.suggestNewCategories('alice');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('suggestNewRestaurants', () => {
    it('should suggest restaurants user has not visited', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [
        createOrder({ orderId: 'o2', userId: 'bob', restaurantId: 'r2', restaurantName: 'Dragon Palace', restaurantCuisine: 'Chinese' }),
      ]);

      const suggestions = recommender.suggestNewRestaurants('alice');
      const dragonSuggestion = suggestions.find((s) => s.name === 'Dragon Palace');
      expect(dragonSuggestion).toBeDefined();
    });

    it('should not suggest restaurants user already visits', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [createOrder({ orderId: 'o2', userId: 'bob' })]);

      const suggestions = recommender.suggestNewRestaurants('alice');
      const spiceSuggestion = suggestions.find((s) => s.name === 'Spice Garden');
      expect(spiceSuggestion).toBeUndefined();
    });

    it('should include metadata in suggestions', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [
        createOrder({ orderId: 'o2', userId: 'bob', restaurantId: 'r2', restaurantName: 'Dragon', restaurantCuisine: 'Chinese', restaurantRating: 4.2 }),
      ]);

      const suggestions = recommender.suggestNewRestaurants('alice');
      if (suggestions.length > 0) {
        expect(suggestions[0]?.metadata['cuisine']).toBeDefined();
      }
    });

    it('should respect limit parameter', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [
        createOrder({ orderId: 'o2', userId: 'bob', restaurantId: 'r2', restaurantName: 'R2' }),
      ]);
      const suggestions = recommender.suggestNewRestaurants('alice', 1);
      expect(suggestions.length).toBeLessThanOrEqual(1);
    });

    it('should return empty when no untried restaurants exist', () => {
      importer.importOrders('alice', [createOrder()]);
      const suggestions = recommender.suggestNewRestaurants('alice');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle user with no orders', () => {
      graph.addNode({
        id: 'user-newuser',
        label: NodeType.USER,
        properties: { userId: 'newuser', name: 'New', latitude: null, longitude: null, createdAt: '' },
      });

      // Create some popular categories/restaurants from other users
      importer.importOrders('bob', [createOrder({ orderId: 'o1', userId: 'bob' })]);

      const catSuggestions = recommender.suggestNewCategories('newuser');
      expect(catSuggestions.length).toBeGreaterThan(0);

      const restSuggestions = recommender.suggestNewRestaurants('newuser');
      expect(restSuggestions.length).toBeGreaterThan(0);
    });

    it('should skip categories with zero popularity', () => {
      // Create category without any user liking it
      graph.addNode({
        id: 'category-orphan',
        label: NodeType.CATEGORY,
        properties: { categoryId: 'orphan-cat', name: 'Orphan' },
      });
      graph.addNode({
        id: 'user-tester',
        label: NodeType.USER,
        properties: { userId: 'tester', name: 'T', latitude: null, longitude: null, createdAt: '' },
      });

      const suggestions = recommender.suggestNewCategories('tester');
      const orphanSuggestion = suggestions.find((s) => s.name === 'Orphan');
      expect(orphanSuggestion).toBeUndefined();
    });

    it('should skip restaurants with zero popularity', () => {
      graph.addNode({
        id: 'restaurant-orphan',
        label: NodeType.RESTAURANT,
        properties: { restaurantId: 'orphan-r', name: 'Orphan Restaurant', latitude: 0, longitude: 0, cuisine: 'X', rating: 0 },
      });
      graph.addNode({
        id: 'user-tester2',
        label: NodeType.USER,
        properties: { userId: 'tester2', name: 'T', latitude: null, longitude: null, createdAt: '' },
      });

      const suggestions = recommender.suggestNewRestaurants('tester2');
      const orphanSuggestion = suggestions.find((s) => s.name === 'Orphan Restaurant');
      expect(orphanSuggestion).toBeUndefined();
    });

    it('should sort restaurant suggestions by popularity', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [
        createOrder({ orderId: 'o2', userId: 'bob', restaurantId: 'r2', restaurantName: 'Dragon' }),
      ]);
      importer.importOrders('charlie', [
        createOrder({ orderId: 'o3', userId: 'charlie', restaurantId: 'r2', restaurantName: 'Dragon' }),
      ]);
      importer.importOrders('dave', [
        createOrder({ orderId: 'o4', userId: 'dave', restaurantId: 'r3', restaurantName: 'Unpopular', restaurantCuisine: 'Other' }),
      ]);

      const suggestions = recommender.suggestNewRestaurants('alice');
      if (suggestions.length >= 2) {
        expect(suggestions[0]?.score).toBeGreaterThanOrEqual(suggestions[1]?.score ?? 0);
      }
    });

    it('should use fallback values for category with null properties', () => {
      graph.addNode({
        id: 'user-tester3',
        label: NodeType.USER,
        properties: { userId: 'tester3', name: 'T', latitude: null, longitude: null, createdAt: '' },
      });
      // Create a category with null categoryId and null name
      graph.addNode({
        id: 'category-nullcat',
        label: NodeType.CATEGORY,
        properties: { categoryId: null as unknown as string, name: null as unknown as string },
      });
      // Make another user like this category so it has popularity
      graph.addNode({
        id: 'user-other',
        label: NodeType.USER,
        properties: { userId: 'other', name: 'O', latitude: null, longitude: null, createdAt: '' },
      });
      graph.addRelationship({
        id: 'likescat-other-nullcat', sourceId: 'user-other', targetId: 'category-nullcat',
        type: RelationshipType.LIKES_CATEGORY, properties: { weight: 0.5, orderCount: 1 },
      });

      const suggestions = recommender.suggestNewCategories('tester3');
      const nullSuggestion = suggestions.find((s) => s.id === 'category-nullcat');
      expect(nullSuggestion).toBeDefined();
      expect(nullSuggestion?.name).toBe('Unknown');
    });

    it('should use fallback values for restaurant with null properties', () => {
      graph.addNode({
        id: 'user-tester4',
        label: NodeType.USER,
        properties: { userId: 'tester4', name: 'T', latitude: null, longitude: null, createdAt: '' },
      });
      // Create a restaurant with null restaurantId and null name
      graph.addNode({
        id: 'restaurant-nullrest',
        label: NodeType.RESTAURANT,
        properties: { restaurantId: null as unknown as string, name: null as unknown as string, latitude: 0, longitude: 0, cuisine: null as unknown as string, rating: null as unknown as number },
      });
      // Make another user frequent this restaurant so it has popularity
      graph.addNode({
        id: 'user-other2',
        label: NodeType.USER,
        properties: { userId: 'other2', name: 'O', latitude: null, longitude: null, createdAt: '' },
      });
      graph.addRelationship({
        id: 'frequents-other2-nullrest', sourceId: 'user-other2', targetId: 'restaurant-nullrest',
        type: RelationshipType.FREQUENTS, properties: { weight: 0.5, orderCount: 1 },
      });

      const suggestions = recommender.suggestNewRestaurants('tester4');
      const nullSuggestion = suggestions.find((s) => s.id === 'restaurant-nullrest');
      expect(nullSuggestion).toBeDefined();
      expect(nullSuggestion?.name).toBe('Unknown');
    });
  });
});

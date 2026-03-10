import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { OrderHistoryImporter } from '../preference/order-history-importer';
import { CollaborativeFilter } from '../recommendation/collaborative-filter';
import { NodeType } from '../types/graph.types';
import { OrderHistoryRecord } from '../types/preference.types';

function createOrder(overrides?: Partial<OrderHistoryRecord>): OrderHistoryRecord {
  return {
    orderId: 'order-1',
    userId: 'user-1',
    restaurantId: 'r1',
    restaurantName: 'Spice Garden',
    restaurantLatitude: 12.97,
    restaurantLongitude: 77.59,
    restaurantCuisine: 'Indian',
    restaurantRating: 4.5,
    items: [
      {
        dishId: 'd1',
        dishName: 'Biryani',
        price: 300,
        cuisine: 'Indian',
        isVegetarian: false,
        categoryId: 'cat-indian',
        categoryName: 'Indian',
      },
    ],
    orderDate: new Date().toISOString(),
    dayOfWeek: 'Friday',
    timeSlot: 'dinner',
    rating: 4,
    ...overrides,
  };
}

describe('CollaborativeFilter', () => {
  let graph: InMemoryGraph;
  let filter: CollaborativeFilter;
  let importer: OrderHistoryImporter;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    filter = new CollaborativeFilter(graph);
    importer = new OrderHistoryImporter(graph);
  });

  afterEach(() => {
    graph.close();
  });

  function setupTwoUsersWithSharedCategories(): void {
    // User 1 likes Indian and Chinese
    importer.importOrders('alice', [
      createOrder({
        orderId: 'o1',
        userId: 'alice',
        items: [{ dishId: 'd1', dishName: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, categoryId: 'cat-indian', categoryName: 'Indian' }],
      }),
      createOrder({
        orderId: 'o2',
        userId: 'alice',
        restaurantId: 'r2',
        restaurantName: 'Dragon',
        restaurantCuisine: 'Chinese',
        items: [{ dishId: 'd3', dishName: 'Noodles', price: 200, cuisine: 'Chinese', isVegetarian: true, categoryId: 'cat-chinese', categoryName: 'Chinese' }],
      }),
    ]);

    // User 2 likes Indian and Italian
    importer.importOrders('bob', [
      createOrder({
        orderId: 'o3',
        userId: 'bob',
        items: [{ dishId: 'd1', dishName: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, categoryId: 'cat-indian', categoryName: 'Indian' }],
      }),
      createOrder({
        orderId: 'o4',
        userId: 'bob',
        restaurantId: 'r3',
        restaurantName: 'Pasta Place',
        restaurantCuisine: 'Italian',
        items: [{ dishId: 'd4', dishName: 'Pasta', price: 400, cuisine: 'Italian', isVegetarian: true, categoryId: 'cat-italian', categoryName: 'Italian' }],
      }),
    ]);
  }

  describe('findSimilarUsers', () => {
    it('should find similar users based on shared categories', () => {
      setupTwoUsersWithSharedCategories();

      const similar = filter.findSimilarUsers('alice');
      expect(similar).toHaveLength(1);
      expect(similar[0]?.userId).toBe('bob');
      expect(similar[0]?.similarityScore).toBeGreaterThan(0);
    });

    it('should compute Jaccard similarity correctly', () => {
      setupTwoUsersWithSharedCategories();

      const similar = filter.findSimilarUsers('alice');
      // Alice: {Indian, Chinese}, Bob: {Indian, Italian}
      // Intersection: {Indian} = 1, Union: {Indian, Chinese, Italian} = 3
      // Jaccard = 1/3
      expect(similar[0]?.similarityScore).toBeCloseTo(1 / 3, 2);
    });

    it('should include shared categories in result', () => {
      setupTwoUsersWithSharedCategories();

      const similar = filter.findSimilarUsers('alice');
      expect(similar[0]?.sharedCategories).toContain('category-cat-indian');
    });

    it('should return empty for user with no categories', () => {
      graph.addNode({
        id: 'user-lonely',
        label: NodeType.USER,
        properties: { userId: 'lonely', name: 'Lonely', latitude: null, longitude: null, createdAt: '' },
      });

      const similar = filter.findSimilarUsers('lonely');
      expect(similar).toHaveLength(0);
    });

    it('should respect limit parameter', () => {
      setupTwoUsersWithSharedCategories();

      // Add a third user
      importer.importOrders('charlie', [
        createOrder({
          orderId: 'o5',
          userId: 'charlie',
          items: [{ dishId: 'd1', dishName: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, categoryId: 'cat-indian', categoryName: 'Indian' }],
        }),
      ]);

      const similar = filter.findSimilarUsers('alice', 1);
      expect(similar).toHaveLength(1);
    });

    it('should sort by similarity score descending', () => {
      setupTwoUsersWithSharedCategories();

      importer.importOrders('charlie', [
        createOrder({
          orderId: 'o5',
          userId: 'charlie',
          items: [{ dishId: 'd1', dishName: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, categoryId: 'cat-indian', categoryName: 'Indian' }],
        }),
        createOrder({
          orderId: 'o6',
          userId: 'charlie',
          restaurantId: 'r2',
          restaurantName: 'Dragon',
          restaurantCuisine: 'Chinese',
          items: [{ dishId: 'd3', dishName: 'Noodles', price: 200, cuisine: 'Chinese', isVegetarian: true, categoryId: 'cat-chinese', categoryName: 'Chinese' }],
        }),
      ]);

      const similar = filter.findSimilarUsers('alice');
      // Charlie shares both Indian + Chinese (Jaccard = 2/2 = 1.0)
      // Bob shares only Indian (Jaccard = 1/3)
      for (let i = 1; i < similar.length; i++) {
        const prev = similar[i - 1];
        const curr = similar[i];
        if (prev && curr) {
          expect(prev.similarityScore).toBeGreaterThanOrEqual(curr.similarityScore);
        }
      }
    });
  });

  describe('getCollaborativeRecommendations', () => {
    it('should recommend dishes from similar users', () => {
      setupTwoUsersWithSharedCategories();

      const recommendations = filter.getCollaborativeRecommendations('alice');
      // Alice has Biryani and Noodles. Bob has Biryani and Pasta.
      // Should recommend Pasta to Alice (from Bob)
      const pastaRec = recommendations.find((r) => r.name === 'Pasta');
      expect(pastaRec).toBeDefined();
    });

    it('should not recommend dishes user already has', () => {
      setupTwoUsersWithSharedCategories();

      const recommendations = filter.getCollaborativeRecommendations('alice');
      const biryaniRec = recommendations.find((r) => r.name === 'Biryani');
      expect(biryaniRec).toBeUndefined();
    });

    it('should return empty for user with no similar users', () => {
      graph.addNode({
        id: 'user-lonely',
        label: NodeType.USER,
        properties: { userId: 'lonely', name: 'Lonely', latitude: null, longitude: null, createdAt: '' },
      });

      const recommendations = filter.getCollaborativeRecommendations('lonely');
      expect(recommendations).toHaveLength(0);
    });

    it('should respect limit parameter', () => {
      setupTwoUsersWithSharedCategories();

      const recommendations = filter.getCollaborativeRecommendations('alice', 1);
      expect(recommendations.length).toBeLessThanOrEqual(1);
    });

    it('should include reason in recommendations', () => {
      setupTwoUsersWithSharedCategories();

      const recommendations = filter.getCollaborativeRecommendations('alice');
      if (recommendations.length > 0) {
        expect(recommendations[0]?.reason).toContain('similar tastes');
      }
    });

    it('should return type as dish', () => {
      setupTwoUsersWithSharedCategories();

      const recommendations = filter.getCollaborativeRecommendations('alice');
      for (const rec of recommendations) {
        expect(rec.type).toBe('dish');
      }
    });
  });
});

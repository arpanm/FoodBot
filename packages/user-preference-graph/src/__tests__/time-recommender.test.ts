import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { OrderHistoryImporter } from '../preference/order-history-importer';
import { TimeAwareRecommender } from '../recommendation/time-aware-recommender';
import { NodeType, RelationshipType } from '../types/graph.types';
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

describe('TimeAwareRecommender', () => {
  let graph: InMemoryGraph;
  let recommender: TimeAwareRecommender;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    recommender = new TimeAwareRecommender(graph);
  });

  afterEach(() => {
    graph.close();
  });

  describe('getTimeSlotFromHour', () => {
    it('should return breakfast for 7am', () => {
      expect(recommender.getTimeSlotFromHour(7)).toBe('breakfast');
    });

    it('should return lunch for 12pm', () => {
      expect(recommender.getTimeSlotFromHour(12)).toBe('lunch');
    });

    it('should return snack for 3pm', () => {
      expect(recommender.getTimeSlotFromHour(15)).toBe('snack');
    });

    it('should return dinner for 7pm', () => {
      expect(recommender.getTimeSlotFromHour(19)).toBe('dinner');
    });

    it('should return late-night for 11pm', () => {
      expect(recommender.getTimeSlotFromHour(23)).toBe('late-night');
    });

    it('should return late-night for 2am', () => {
      expect(recommender.getTimeSlotFromHour(2)).toBe('late-night');
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations for user with history', () => {
      const importer = new OrderHistoryImporter(graph);
      const orders = [
        createOrder({ orderId: 'o1', dayOfWeek: 'Friday', timeSlot: 'dinner' }),
        createOrder({ orderId: 'o2', restaurantId: 'r2', restaurantName: 'Dragon Palace', restaurantCuisine: 'Chinese', dayOfWeek: 'Friday', timeSlot: 'dinner' }),
      ];
      importer.importOrders('user-1', orders);

      const results = recommender.getRecommendations('user-1', {
        dayOfWeek: 'Friday',
        hour: 19,
        timeSlot: 'dinner',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.type).toBe('restaurant');
    });

    it('should boost score for matching day and time', () => {
      const importer = new OrderHistoryImporter(graph);
      const orders = [
        createOrder({ orderId: 'o1', dayOfWeek: 'Friday', timeSlot: 'dinner' }),
      ];
      importer.importOrders('user-1', orders);

      const matchingResults = recommender.getRecommendations('user-1', {
        dayOfWeek: 'Friday',
        hour: 19,
        timeSlot: 'dinner',
      });

      const nonMatchingResults = recommender.getRecommendations('user-1', {
        dayOfWeek: 'Monday',
        hour: 8,
        timeSlot: 'breakfast',
      });

      const matchingScore = matchingResults[0]?.score ?? 0;
      const nonMatchingScore = nonMatchingResults[0]?.score ?? 0;
      expect(matchingScore).toBeGreaterThanOrEqual(nonMatchingScore);
    });

    it('should return empty array for user with no history', () => {
      graph.addNode({
        id: 'user-user-new',
        label: NodeType.USER,
        properties: { userId: 'user-new', name: 'New', latitude: null, longitude: null, createdAt: '' },
      });

      const results = recommender.getRecommendations('user-new', {
        dayOfWeek: 'Friday',
        hour: 19,
        timeSlot: 'dinner',
      });

      expect(results).toHaveLength(0);
    });

    it('should respect limit parameter', () => {
      const importer = new OrderHistoryImporter(graph);
      const orders = [
        createOrder({ orderId: 'o1', restaurantId: 'r1', restaurantName: 'R1' }),
        createOrder({ orderId: 'o2', restaurantId: 'r2', restaurantName: 'R2' }),
        createOrder({ orderId: 'o3', restaurantId: 'r3', restaurantName: 'R3' }),
      ];
      importer.importOrders('user-1', orders);

      const results = recommender.getRecommendations(
        'user-1',
        { dayOfWeek: 'Friday', hour: 19, timeSlot: 'dinner' },
        2
      );

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should sort results by score descending', () => {
      const importer = new OrderHistoryImporter(graph);
      const orders = [
        createOrder({ orderId: 'o1', restaurantId: 'r1', restaurantName: 'R1' }),
        createOrder({ orderId: 'o2', restaurantId: 'r2', restaurantName: 'R2' }),
      ];
      importer.importOrders('user-1', orders);

      const results = recommender.getRecommendations('user-1', {
        dayOfWeek: 'Friday',
        hour: 19,
        timeSlot: 'dinner',
      });

      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        if (prev && curr) {
          expect(prev.score).toBeGreaterThanOrEqual(curr.score);
        }
      }
    });

    it('should include metadata in results', () => {
      const importer = new OrderHistoryImporter(graph);
      importer.importOrders('user-1', [createOrder()]);

      const results = recommender.getRecommendations('user-1', {
        dayOfWeek: 'Friday',
        hour: 19,
        timeSlot: 'dinner',
      });

      expect(results[0]?.metadata).toBeDefined();
      expect(results[0]?.metadata['cuisine']).toBe('Indian');
    });
  });
});

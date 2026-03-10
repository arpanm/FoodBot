import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { OrderHistoryImporter } from '../preference/order-history-importer';
import { GdprDeleter } from '../admin/gdpr-deleter';
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

describe('GdprDeleter', () => {
  let graph: InMemoryGraph;
  let deleter: GdprDeleter;
  let importer: OrderHistoryImporter;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    deleter = new GdprDeleter(graph);
    importer = new OrderHistoryImporter(graph);
  });

  afterEach(() => {
    graph.close();
  });

  describe('deleteUserData', () => {
    it('should delete user node', () => {
      importer.importOrders('alice', [createOrder()]);

      const result = deleter.deleteUserData('alice');

      expect(graph.getNode('user-alice')).toBeUndefined();
      expect(result.nodesDeleted).toBeGreaterThan(0);
    });

    it('should delete all user relationships', () => {
      importer.importOrders('alice', [createOrder()]);

      const result = deleter.deleteUserData('alice');

      expect(result.relationshipsDeleted).toBeGreaterThan(0);

      // Verify no relationships reference the user
      const allRels = graph.getAllRelationships();
      const userRels = allRels.filter(
        (r) => r.sourceId === 'user-alice' || r.targetId === 'user-alice'
      );
      expect(userRels).toHaveLength(0);
    });

    it('should return audit entry with all deleted IDs', () => {
      importer.importOrders('alice', [createOrder()]);

      const result = deleter.deleteUserData('alice');

      expect(result.userId).toBe('alice');
      expect(result.timestamp).toBeTruthy();
      expect(result.deletedNodeIds.length).toBeGreaterThan(0);
      expect(result.deletedRelationshipIds.length).toBeGreaterThan(0);
    });

    it('should not delete other users data', () => {
      importer.importOrders('alice', [createOrder({ orderId: 'o1' })]);
      importer.importOrders('bob', [
        createOrder({
          orderId: 'o2',
          restaurantId: 'r2',
          restaurantName: 'Pasta Place',
          items: [{ dishId: 'd2', dishName: 'Pasta', price: 400, cuisine: 'Italian', isVegetarian: true, categoryId: 'cat-it', categoryName: 'Italian' }],
        }),
      ]);

      deleter.deleteUserData('alice');

      expect(graph.getNode('user-bob')).toBeDefined();
      const bobRels = graph.getAllRelationships().filter((r) => r.sourceId === 'user-bob');
      expect(bobRels.length).toBeGreaterThan(0);
    });

    it('should handle non-existent user gracefully', () => {
      const result = deleter.deleteUserData('non-existent');

      expect(result.nodesDeleted).toBe(0);
      expect(result.relationshipsDeleted).toBe(0);
      expect(result.deletedNodeIds).toHaveLength(0);
      expect(result.deletedRelationshipIds).toHaveLength(0);
    });

    it('should preserve shared restaurant and dish nodes', () => {
      // Both users order from same restaurant
      importer.importOrders('alice', [createOrder({ orderId: 'o1' })]);
      importer.importOrders('bob', [createOrder({ orderId: 'o2' })]);

      deleter.deleteUserData('alice');

      // Restaurant node should still exist (shared)
      expect(graph.getNode('restaurant-r1')).toBeDefined();
      expect(graph.getNode('dish-d1')).toBeDefined();
    });

    it('should include timestamp in audit entry', () => {
      importer.importOrders('alice', [createOrder()]);

      const before = new Date().toISOString();
      const result = deleter.deleteUserData('alice');

      expect(result.timestamp).toBeTruthy();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime() - 1000
      );
    });

    it('should delete FREQUENTS relationships', () => {
      importer.importOrders('alice', [createOrder()]);
      deleter.deleteUserData('alice');

      const frequents = graph.getAllRelationships()
        .filter((r) => r.type === RelationshipType.FREQUENTS && r.sourceId === 'user-alice');
      expect(frequents).toHaveLength(0);
    });

    it('should delete LIKES_CATEGORY relationships', () => {
      importer.importOrders('alice', [createOrder()]);
      deleter.deleteUserData('alice');

      const likes = graph.getAllRelationships()
        .filter((r) => r.type === RelationshipType.LIKES_CATEGORY && r.sourceId === 'user-alice');
      expect(likes).toHaveLength(0);
    });

    it('should delete FAVORITE_DISH relationships', () => {
      importer.importOrders('alice', [createOrder()]);
      deleter.deleteUserData('alice');

      const favs = graph.getAllRelationships()
        .filter((r) => r.type === RelationshipType.FAVORITE_DISH && r.sourceId === 'user-alice');
      expect(favs).toHaveLength(0);
    });
  });
});

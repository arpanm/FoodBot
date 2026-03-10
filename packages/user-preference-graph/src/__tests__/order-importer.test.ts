import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { OrderHistoryImporter } from '../preference/order-history-importer';
import { NodeType, RelationshipType } from '../types/graph.types';
import { OrderHistoryRecord } from '../types/preference.types';

function createTestOrder(overrides?: Partial<OrderHistoryRecord>): OrderHistoryRecord {
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
        dishName: 'Butter Chicken',
        price: 350,
        cuisine: 'Indian',
        isVegetarian: false,
        categoryId: 'cat-indian',
        categoryName: 'Indian',
      },
    ],
    orderDate: new Date().toISOString(),
    dayOfWeek: 'Monday',
    timeSlot: 'dinner',
    rating: 4,
    ...overrides,
  };
}

describe('OrderHistoryImporter', () => {
  let graph: InMemoryGraph;
  let importer: OrderHistoryImporter;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schemaManager = new SchemaManager(graph);
    schemaManager.initializeSchema();
    importer = new OrderHistoryImporter(graph);
  });

  afterEach(() => {
    graph.close();
  });

  describe('importOrders', () => {
    it('should create user node', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const userNode = graph.getNode('user-user-1');
      expect(userNode).toBeDefined();
      expect(userNode?.label).toBe(NodeType.USER);
    });

    it('should create restaurant node', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const restaurantNode = graph.getNode('restaurant-r1');
      expect(restaurantNode).toBeDefined();
      expect(restaurantNode?.properties['name']).toBe('Spice Garden');
    });

    it('should create dish node', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const dishNode = graph.getNode('dish-d1');
      expect(dishNode).toBeDefined();
      expect(dishNode?.properties['name']).toBe('Butter Chicken');
    });

    it('should create category node', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const catNode = graph.getNode('category-cat-indian');
      expect(catNode).toBeDefined();
      expect(catNode?.properties['name']).toBe('Indian');
    });

    it('should create FREQUENTS relationship', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const rels = graph.getRelationshipsBetween(
        'user-user-1',
        'restaurant-r1',
        RelationshipType.FREQUENTS
      );
      expect(rels).toHaveLength(1);
    });

    it('should create FAVORITE_DISH relationship', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const rels = graph.getRelationshipsBetween(
        'user-user-1',
        'dish-d1',
        RelationshipType.FAVORITE_DISH
      );
      expect(rels).toHaveLength(1);
    });

    it('should create LIKES_CATEGORY relationship', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const rels = graph.getRelationshipsBetween(
        'user-user-1',
        'category-cat-indian',
        RelationshipType.LIKES_CATEGORY
      );
      expect(rels).toHaveLength(1);
    });

    it('should create ORDERS_ON relationship with day node', () => {
      const order = createTestOrder({ dayOfWeek: 'Monday' });
      importer.importOrders('user-1', [order]);

      const rels = graph.getRelationshipsBetween(
        'user-user-1',
        'day-monday',
        RelationshipType.ORDERS_ON
      );
      expect(rels).toHaveLength(1);
    });

    it('should create ORDERS_AT relationship with time slot', () => {
      const order = createTestOrder({ timeSlot: 'dinner' });
      importer.importOrders('user-1', [order]);

      const rels = graph.getRelationshipsBetween(
        'user-user-1',
        'timeslot-dinner',
        RelationshipType.ORDERS_AT
      );
      expect(rels).toHaveLength(1);
    });

    it('should create SERVED_AT relationship', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const rels = graph.getRelationshipsBetween(
        'dish-d1',
        'restaurant-r1',
        RelationshipType.SERVED_AT
      );
      expect(rels).toHaveLength(1);
    });

    it('should create BELONGS_TO relationship', () => {
      const order = createTestOrder();
      importer.importOrders('user-1', [order]);

      const rels = graph.getRelationshipsBetween(
        'dish-d1',
        'category-cat-indian',
        RelationshipType.BELONGS_TO
      );
      expect(rels).toHaveLength(1);
    });

    it('should return correct import counts', () => {
      const order = createTestOrder();
      const result = importer.importOrders('user-1', [order]);

      expect(result.nodesCreated).toBeGreaterThan(0);
      expect(result.relationshipsCreated).toBeGreaterThan(0);
    });

    it('should not duplicate nodes for multiple orders at same restaurant', () => {
      const order1 = createTestOrder({ orderId: 'o1' });
      const order2 = createTestOrder({ orderId: 'o2' });
      importer.importOrders('user-1', [order1, order2]);

      const restaurants = graph.getNodesByLabel(NodeType.RESTAURANT);
      expect(restaurants.filter((r) => r.properties['restaurantId'] === 'r1')).toHaveLength(1);
    });

    it('should handle multiple items in a single order', () => {
      const order = createTestOrder({
        items: [
          { dishId: 'd1', dishName: 'Butter Chicken', price: 350, cuisine: 'Indian', isVegetarian: false, categoryId: 'cat-indian', categoryName: 'Indian' },
          { dishId: 'd2', dishName: 'Naan', price: 50, cuisine: 'Indian', isVegetarian: true, categoryId: 'cat-bread', categoryName: 'Bread' },
        ],
      });
      importer.importOrders('user-1', [order]);

      expect(graph.getNode('dish-d1')).toBeDefined();
      expect(graph.getNode('dish-d2')).toBeDefined();
      expect(graph.getNode('category-cat-indian')).toBeDefined();
      expect(graph.getNode('category-cat-bread')).toBeDefined();
    });

    it('should not recreate user node on second import', () => {
      const order1 = createTestOrder({ orderId: 'o1' });
      const result1 = importer.importOrders('user-1', [order1]);

      const order2 = createTestOrder({ orderId: 'o2', restaurantId: 'r2', restaurantName: 'New Place' });
      const result2 = importer.importOrders('user-1', [order2]);

      const users = graph.getNodesByLabel(NodeType.USER);
      expect(users).toHaveLength(1);
      expect(result1.nodesCreated).toBeGreaterThan(result2.nodesCreated);
    });
  });
});

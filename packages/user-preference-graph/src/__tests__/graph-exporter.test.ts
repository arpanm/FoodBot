import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { OrderHistoryImporter } from '../preference/order-history-importer';
import { GraphExporter } from '../admin/graph-exporter';
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

describe('GraphExporter', () => {
  let graph: InMemoryGraph;
  let exporter: GraphExporter;
  let importer: OrderHistoryImporter;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    exporter = new GraphExporter(graph);
    importer = new OrderHistoryImporter(graph);
  });

  afterEach(() => {
    graph.close();
  });

  describe('exportUserGraph', () => {
    it('should export user graph with connected nodes', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportUserGraph('alice');

      expect(exported.userId).toBe('alice');
      expect(exported.nodes.length).toBeGreaterThan(0);
      expect(exported.relationships.length).toBeGreaterThan(0);
    });

    it('should include stats in export', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportUserGraph('alice');

      expect(exported.stats.totalNodes).toBeGreaterThan(0);
      expect(exported.stats.totalRelationships).toBeGreaterThan(0);
      expect(exported.stats.nodesByLabel).toBeDefined();
      expect(exported.stats.relationshipsByType).toBeDefined();
    });

    it('should include exportedAt timestamp', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportUserGraph('alice');
      expect(exported.exportedAt).toBeTruthy();
      expect(new Date(exported.exportedAt).getTime()).toBeGreaterThan(0);
    });

    it('should include node properties in export', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportUserGraph('alice');
      const userNode = exported.nodes.find((n) => n.label === NodeType.USER);
      expect(userNode?.properties['userId']).toBe('alice');
    });

    it('should include relationship properties in export', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportUserGraph('alice');
      const frequents = exported.relationships.find((r) => r.type === RelationshipType.FREQUENTS);
      expect(frequents?.properties['weight']).toBeDefined();
    });

    it('should include connected nodes via BFS traversal', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportUserGraph('alice');

      // Alice's directly connected nodes should be included
      const userNode = exported.nodes.find((n) => n.properties['userId'] === 'alice');
      expect(userNode).toBeDefined();

      const restaurantNode = exported.nodes.find((n) => n.properties['restaurantId'] === 'r1');
      expect(restaurantNode).toBeDefined();

      const dishNode = exported.nodes.find((n) => n.properties['dishId'] === 'd1');
      expect(dishNode).toBeDefined();
    });

    it('should count nodes by label', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportUserGraph('alice');
      expect(exported.stats.nodesByLabel[NodeType.USER]).toBe(1);
    });
  });

  describe('exportFullGraph', () => {
    it('should export full graph with all nodes', () => {
      importer.importOrders('alice', [createOrder()]);
      importer.importOrders('bob', [
        createOrder({ orderId: 'o2', userId: 'bob', restaurantId: 'r2', restaurantName: 'Other' }),
      ]);

      const exported = exporter.exportFullGraph();

      expect(exported.userId).toBe('*');
      expect(exported.nodes.length).toBeGreaterThan(5);
      expect(exported.relationships.length).toBeGreaterThan(0);
    });

    it('should include all relationship types in stats', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportFullGraph();
      expect(Object.keys(exported.stats.relationshipsByType).length).toBeGreaterThan(0);
    });

    it('should have consistent node and relationship counts', () => {
      importer.importOrders('alice', [createOrder()]);

      const exported = exporter.exportFullGraph();
      expect(exported.stats.totalNodes).toBe(exported.nodes.length);
      expect(exported.stats.totalRelationships).toBe(exported.relationships.length);
    });
  });
});

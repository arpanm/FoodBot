import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { GraphPruner } from '../sync/graph-pruner';
import { NodeType, RelationshipType } from '../types/graph.types';

describe('GraphPruner', () => {
  let graph: InMemoryGraph;
  let pruner: GraphPruner;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    pruner = new GraphPruner(graph);
  });

  afterEach(() => {
    graph.close();
  });

  function addUserAndRestaurant(): void {
    graph.addNode({
      id: 'user-alice',
      label: NodeType.USER,
      properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' },
    });
    graph.addNode({
      id: 'restaurant-r1',
      label: NodeType.RESTAURANT,
      properties: { restaurantId: 'r1', name: 'Spice Garden', latitude: 12.97, longitude: 77.59, cuisine: 'Indian', rating: 4 },
    });
  }

  describe('prune', () => {
    it('should prune edges with weight below threshold and old date', () => {
      addUserAndRestaurant();
      const oldDate = new Date('2023-01-01').toISOString();

      graph.addRelationship({
        id: 'rel-1',
        sourceId: 'user-alice',
        targetId: 'restaurant-r1',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.01, lastUpdated: oldDate },
      });

      const now = new Date('2024-06-01');
      const result = pruner.prune(now);

      expect(result.edgesPruned).toBe(1);
      expect(graph.getRelationship('rel-1')).toBeUndefined();
    });

    it('should not prune edges with weight above threshold', () => {
      addUserAndRestaurant();

      graph.addRelationship({
        id: 'rel-1',
        sourceId: 'user-alice',
        targetId: 'restaurant-r1',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.8, lastUpdated: new Date().toISOString() },
      });

      const result = pruner.prune(new Date());

      expect(result.edgesPruned).toBe(0);
      expect(graph.getRelationship('rel-1')).toBeDefined();
    });

    it('should not prune edges with low weight but recent date', () => {
      addUserAndRestaurant();
      const recentDate = new Date().toISOString();

      graph.addRelationship({
        id: 'rel-1',
        sourceId: 'user-alice',
        targetId: 'restaurant-r1',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.02, lastUpdated: recentDate },
      });

      const result = pruner.prune(new Date());

      expect(result.edgesPruned).toBe(0);
    });

    it('should prune edges without lastUpdated when weight is below threshold', () => {
      addUserAndRestaurant();

      graph.addRelationship({
        id: 'rel-1',
        sourceId: 'user-alice',
        targetId: 'restaurant-r1',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.01, lastUpdated: null },
      });

      const result = pruner.prune(new Date());
      expect(result.edgesPruned).toBe(1);
    });

    it('should not prune non-weighted relationship types', () => {
      addUserAndRestaurant();
      graph.addNode({
        id: 'dish-d1',
        label: NodeType.DISH,
        properties: { dishId: 'd1', name: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, restaurantId: 'r1' },
      });

      graph.addRelationship({
        id: 'rel-served',
        sourceId: 'dish-d1',
        targetId: 'restaurant-r1',
        type: RelationshipType.SERVED_AT,
        properties: { lastUpdated: '2020-01-01' },
      });

      const result = pruner.prune(new Date('2024-06-01'));
      expect(graph.getRelationship('rel-served')).toBeDefined();
      expect(result.edgesPruned).toBe(0);
    });

    it('should remove orphaned nodes after pruning', () => {
      graph.addNode({
        id: 'orphan-cat',
        label: NodeType.CATEGORY,
        properties: { categoryId: 'orphan', name: 'Orphan' },
      });

      const result = pruner.prune(new Date());
      expect(result.orphanedNodesRemoved).toBeGreaterThan(0);
    });

    it('should not remove nodes that still have relationships', () => {
      addUserAndRestaurant();

      graph.addRelationship({
        id: 'rel-1',
        sourceId: 'user-alice',
        targetId: 'restaurant-r1',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.8, lastUpdated: new Date().toISOString() },
      });

      const result = pruner.prune(new Date());
      expect(graph.getNode('user-alice')).toBeDefined();
      expect(graph.getNode('restaurant-r1')).toBeDefined();
      expect(result.orphanedNodesRemoved).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty graph', () => {
      // Clear the schema-created nodes first
      graph.clear();
      const result = pruner.prune(new Date());
      expect(result.edgesPruned).toBe(0);
      expect(result.orphanedNodesRemoved).toBe(0);
    });

    it('should prune multiple stale edges at once', () => {
      addUserAndRestaurant();
      graph.addNode({
        id: 'restaurant-r2',
        label: NodeType.RESTAURANT,
        properties: { restaurantId: 'r2', name: 'R2', latitude: 0, longitude: 0, cuisine: 'Chinese', rating: 3 },
      });

      const oldDate = '2023-01-01';
      graph.addRelationship({
        id: 'rel-1',
        sourceId: 'user-alice',
        targetId: 'restaurant-r1',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.01, lastUpdated: oldDate },
      });
      graph.addRelationship({
        id: 'rel-2',
        sourceId: 'user-alice',
        targetId: 'restaurant-r2',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.02, lastUpdated: oldDate },
      });

      const result = pruner.prune(new Date('2024-06-01'));
      expect(result.edgesPruned).toBe(2);
    });

    it('should use custom config for threshold', () => {
      const customPruner = new GraphPruner(graph, { minimumWeight: 0.5 });
      addUserAndRestaurant();

      graph.addRelationship({
        id: 'rel-1',
        sourceId: 'user-alice',
        targetId: 'restaurant-r1',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.3, lastUpdated: '2023-01-01' },
      });

      const result = customPruner.prune(new Date('2024-06-01'));
      expect(result.edgesPruned).toBe(1);
    });
  });
});

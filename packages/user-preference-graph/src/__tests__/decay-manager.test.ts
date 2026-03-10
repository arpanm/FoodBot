import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { DecayManager } from '../preference/decay-manager';
import { NodeType, RelationshipType } from '../types/graph.types';

describe('DecayManager', () => {
  let graph: InMemoryGraph;
  let decayManager: DecayManager;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    decayManager = new DecayManager(graph);
  });

  afterEach(() => {
    graph.close();
  });

  function addUserRestaurantWithRelationship(weight: number, lastUpdated: string): void {
    graph.addNode({ id: 'user-alice', label: NodeType.USER, properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'restaurant-r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R1', latitude: 0, longitude: 0, cuisine: 'Indian', rating: 4 } });
    graph.addRelationship({
      id: 'rel-freq-1', sourceId: 'user-alice', targetId: 'restaurant-r1',
      type: RelationshipType.FREQUENTS,
      properties: { weight, lastUpdated },
    });
  }

  describe('applyDecayToAll', () => {
    it('should apply decay to weighted relationships', () => {
      addUserRestaurantWithRelationship(0.8, '2024-01-01');
      const result = decayManager.applyDecayToAll(new Date('2024-02-01'));

      expect(result.updatedCount).toBeGreaterThanOrEqual(1);
      const rel = graph.getRelationship('rel-freq-1');
      expect((rel?.properties['weight'] as number)).toBeLessThan(0.8);
    });

    it('should prune very old low-weight edges', () => {
      addUserRestaurantWithRelationship(0.01, '2022-01-01');
      const result = decayManager.applyDecayToAll(new Date('2024-06-01'));

      expect(result.prunedCount).toBeGreaterThanOrEqual(1);
      expect(graph.getRelationship('rel-freq-1')).toBeUndefined();
    });

    it('should not modify non-weighted relationships', () => {
      graph.addNode({ id: 'dish-d1', label: NodeType.DISH, properties: { dishId: 'd1', name: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, restaurantId: 'r1' } });
      graph.addNode({ id: 'restaurant-r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R1', latitude: 0, longitude: 0, cuisine: 'Indian', rating: 4 } });
      graph.addRelationship({
        id: 'rel-served', sourceId: 'dish-d1', targetId: 'restaurant-r1',
        type: RelationshipType.SERVED_AT,
        properties: { lastUpdated: '2023-01-01' },
      });

      decayManager.applyDecayToAll(new Date('2024-06-01'));
      expect(graph.getRelationship('rel-served')).toBeDefined();
    });

    it('should skip relationships without lastUpdated', () => {
      graph.addNode({ id: 'user-alice', label: NodeType.USER, properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'restaurant-r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R1', latitude: 0, longitude: 0, cuisine: 'Indian', rating: 4 } });
      graph.addRelationship({
        id: 'rel-freq-1', sourceId: 'user-alice', targetId: 'restaurant-r1',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.5, lastUpdated: null },
      });

      const result = decayManager.applyDecayToAll(new Date());
      // Should be skipped, not updated or pruned
      expect(graph.getRelationship('rel-freq-1')).toBeDefined();
    });

    it('should handle FAVORITE_DISH relationship decay', () => {
      graph.addNode({ id: 'user-alice', label: NodeType.USER, properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'dish-d1', label: NodeType.DISH, properties: { dishId: 'd1', name: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, restaurantId: 'r1' } });
      graph.addRelationship({
        id: 'rel-fav', sourceId: 'user-alice', targetId: 'dish-d1',
        type: RelationshipType.FAVORITE_DISH,
        properties: { weight: 0.9, lastUpdated: '2024-01-01' },
      });

      decayManager.applyDecayToAll(new Date('2024-03-01'));
      const rel = graph.getRelationship('rel-fav');
      expect((rel?.properties['weight'] as number)).toBeLessThan(0.9);
    });
  });

  describe('pruneStaleEdges', () => {
    it('should prune edges below threshold with old dates', () => {
      addUserRestaurantWithRelationship(0.01, '2023-01-01');
      const pruned = decayManager.pruneStaleEdges(new Date('2024-06-01'));
      expect(pruned).toBe(1);
    });

    it('should not prune edges above threshold', () => {
      addUserRestaurantWithRelationship(0.8, '2023-01-01');
      const pruned = decayManager.pruneStaleEdges(new Date('2024-06-01'));
      expect(pruned).toBe(0);
    });

    it('should not prune recent low-weight edges', () => {
      addUserRestaurantWithRelationship(0.02, new Date().toISOString());
      const pruned = decayManager.pruneStaleEdges(new Date());
      expect(pruned).toBe(0);
    });
  });
});

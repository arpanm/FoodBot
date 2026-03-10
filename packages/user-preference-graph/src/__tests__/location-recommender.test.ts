import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { LocationAwareRecommender } from '../recommendation/location-aware-recommender';
import { NodeType, RelationshipType } from '../types/graph.types';

describe('LocationAwareRecommender', () => {
  let graph: InMemoryGraph;
  let recommender: LocationAwareRecommender;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    recommender = new LocationAwareRecommender(graph);

    graph.addNode({ id: 'user-alice', label: NodeType.USER, properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'restaurant-r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'Nearby Indian', latitude: 12.971, longitude: 77.591, cuisine: 'Indian', rating: 4.5 } });
    graph.addNode({ id: 'restaurant-r2', label: NodeType.RESTAURANT, properties: { restaurantId: 'r2', name: 'Far Chinese', latitude: 13.1, longitude: 77.8, cuisine: 'Chinese', rating: 3.5 } });
    graph.addNode({ id: 'restaurant-r3', label: NodeType.RESTAURANT, properties: { restaurantId: 'r3', name: 'Very Far', latitude: 28.61, longitude: 77.20, cuisine: 'Italian', rating: 4.0 } });

    graph.addRelationship({
      id: 'freq-1', sourceId: 'user-alice', targetId: 'restaurant-r1',
      type: RelationshipType.FREQUENTS,
      properties: { weight: 0.9, orderCount: 10, lastUpdated: new Date().toISOString() },
    });
    graph.addRelationship({
      id: 'freq-2', sourceId: 'user-alice', targetId: 'restaurant-r2',
      type: RelationshipType.FREQUENTS,
      properties: { weight: 0.4, orderCount: 3, lastUpdated: new Date().toISOString() },
    });
  });

  afterEach(() => {
    graph.close();
  });

  describe('getRecommendations', () => {
    it('should return nearby restaurants', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 5 });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should score closer restaurants higher', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 50 });
      const nearbyResult = results.find((r) => r.id === 'r1');
      const farResult = results.find((r) => r.id === 'r2');

      if (nearbyResult && farResult) {
        expect(nearbyResult.score).toBeGreaterThan(farResult.score);
      }
    });

    it('should include distance in metadata', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 50 });
      expect(results[0]?.metadata['distanceKm']).toBeDefined();
    });

    it('should use default weight for unvisited restaurants', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 5000 });
      const veryFar = results.find((r) => r.id === 'r3');
      if (veryFar) {
        expect(veryFar.score).toBeGreaterThan(0);
      }
    });

    it('should respect limit parameter', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 5000 }, 1);
      expect(results).toHaveLength(1);
    });

    it('should return empty for no restaurants in radius', () => {
      const results = recommender.getRecommendations('alice', { latitude: 0, longitude: 0, radiusKm: 1 });
      expect(results).toHaveLength(0);
    });

    it('should sort by score descending', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 50 });
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        if (prev && curr) {
          expect(prev.score).toBeGreaterThanOrEqual(curr.score);
        }
      }
    });

    it('should include cuisine in metadata', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 50 });
      const indianResult = results.find((r) => r.id === 'r1');
      expect(indianResult?.metadata['cuisine']).toBe('Indian');
    });

    it('should include reason text', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 50 });
      expect(results[0]?.reason).toContain('preferences');
    });

    it('should return type as restaurant', () => {
      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 50 });
      for (const r of results) {
        expect(r.type).toBe('restaurant');
      }
    });

    it('should handle restaurant at exact same location (distance = 0)', () => {
      // Add a restaurant at exactly the query coordinates
      graph.addNode({
        id: 'restaurant-r-same', label: NodeType.RESTAURANT,
        properties: { restaurantId: 'r-same', name: 'Same Spot', latitude: 12.97, longitude: 77.59, cuisine: 'Fusion', rating: 5 },
      });
      graph.addRelationship({
        id: 'freq-same', sourceId: 'user-alice', targetId: 'restaurant-r-same',
        type: RelationshipType.FREQUENTS,
        properties: { weight: 0.8, orderCount: 5, lastUpdated: new Date().toISOString() },
      });

      const results = recommender.getRecommendations('alice', { latitude: 12.97, longitude: 77.59, radiusKm: 5 });
      const sameLoc = results.find((r) => r.id === 'r-same');
      expect(sameLoc).toBeDefined();
      // Distance factor should be 1.0 when distance <= 0
      expect(sameLoc?.score).toBeCloseTo(0.8, 1);
    });
  });
});

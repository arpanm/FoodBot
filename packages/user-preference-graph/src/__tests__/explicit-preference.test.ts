import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { ExplicitPreferenceHandler } from '../preference/explicit-preference-handler';
import { NodeType, RelationshipType } from '../types/graph.types';
import { ExplicitPreference } from '../types/preference.types';

describe('ExplicitPreferenceHandler', () => {
  let graph: InMemoryGraph;
  let handler: ExplicitPreferenceHandler;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    handler = new ExplicitPreferenceHandler(graph);

    graph.addNode({ id: 'user-alice', label: NodeType.USER, properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'category-cat-indian', label: NodeType.CATEGORY, properties: { categoryId: 'cat-indian', name: 'Indian' } });
    graph.addNode({ id: 'dish-d1', label: NodeType.DISH, properties: { dishId: 'd1', name: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, restaurantId: 'r1' } });
    graph.addNode({ id: 'restaurant-r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'Spice Garden', latitude: 12, longitude: 77, cuisine: 'Indian', rating: 4 } });
  });

  afterEach(() => {
    graph.close();
  });

  describe('applyPreference', () => {
    it('should create like preference for category', () => {
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      };

      const result = handler.applyPreference(pref);
      expect(result.applied).toBe(true);
      expect(result.newWeight).toBeGreaterThan(0);
      expect(result.previousWeight).toBeNull();
    });

    it('should boost weight by 0.3 for like preference', () => {
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      };

      const result = handler.applyPreference(pref);
      expect(result.newWeight).toBeCloseTo(0.8, 2); // base 0.5 + 0.3 boost
    });

    it('should set negative weight for dislike', () => {
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'dislike', timestamp: new Date().toISOString(),
      };

      const result = handler.applyPreference(pref);
      expect(result.newWeight).toBe(-1.0);
    });

    it('should update existing preference', () => {
      const likePref: ExplicitPreference = {
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      };
      handler.applyPreference(likePref);

      const dislikePref: ExplicitPreference = {
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'dislike', timestamp: new Date().toISOString(),
      };
      const result = handler.applyPreference(dislikePref);

      expect(result.previousWeight).toBeCloseTo(0.8, 2);
      expect(result.newWeight).toBe(-1.0);
    });

    it('should handle dish preference', () => {
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'd1', targetType: 'dish',
        sentiment: 'like', timestamp: new Date().toISOString(),
      };

      const result = handler.applyPreference(pref);
      expect(result.applied).toBe(true);
    });

    it('should handle restaurant preference', () => {
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'r1', targetType: 'restaurant',
        sentiment: 'like', timestamp: new Date().toISOString(),
      };

      const result = handler.applyPreference(pref);
      expect(result.applied).toBe(true);
    });

    it('should use DISLIKES_CATEGORY for category dislike', () => {
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'dislike', timestamp: new Date().toISOString(),
      };

      handler.applyPreference(pref);
      const rel = graph.getRelationship(`explicit-category-alice-cat-indian`);
      expect(rel?.type).toBe(RelationshipType.DISLIKES_CATEGORY);
    });

    it('should cap like weight at 1.0', () => {
      // Apply like twice
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      };
      handler.applyPreference(pref);
      const result = handler.applyPreference(pref);
      expect(result.newWeight).toBeLessThanOrEqual(1.0);
    });
  });

  describe('getExplicitPreferences', () => {
    it('should return all explicit preferences for user', () => {
      handler.applyPreference({
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      });

      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs.length).toBe(1);
      expect(prefs[0]?.sentiment).toBe('like');
    });

    it('should return empty for user with no explicit prefs', () => {
      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs).toHaveLength(0);
    });

    it('should parse target type correctly', () => {
      handler.applyPreference({
        userId: 'alice', targetId: 'd1', targetType: 'dish',
        sentiment: 'like', timestamp: new Date().toISOString(),
      });

      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs[0]?.targetType).toBe('dish');
    });
  });

  describe('removePreference', () => {
    it('should remove an existing preference', () => {
      handler.applyPreference({
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      });

      const removed = handler.removePreference('alice', 'cat-indian', 'category');
      expect(removed).toBe(true);
    });

    it('should return false for non-existent preference', () => {
      const removed = handler.removePreference('alice', 'cat-indian', 'category');
      expect(removed).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle restaurant preference with dislike', () => {
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'r1', targetType: 'restaurant',
        sentiment: 'dislike', timestamp: new Date().toISOString(),
      };

      const result = handler.applyPreference(pref);
      expect(result.newWeight).toBe(-1.0);
    });

    it('should handle multiple explicit preferences for same user', () => {
      handler.applyPreference({
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      });
      handler.applyPreference({
        userId: 'alice', targetId: 'd1', targetType: 'dish',
        sentiment: 'like', timestamp: new Date().toISOString(),
      });
      handler.applyPreference({
        userId: 'alice', targetId: 'r1', targetType: 'restaurant',
        sentiment: 'like', timestamp: new Date().toISOString(),
      });

      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs.length).toBe(3);
    });

    it('should return correct target types in preferences list', () => {
      handler.applyPreference({
        userId: 'alice', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      });
      handler.applyPreference({
        userId: 'alice', targetId: 'r1', targetType: 'restaurant',
        sentiment: 'dislike', timestamp: new Date().toISOString(),
      });

      const prefs = handler.getExplicitPreferences('alice');
      const types = prefs.map((p) => p.targetType);
      expect(types).toContain('category');
      expect(types).toContain('restaurant');
    });

    it('should skip relationships belonging to other users', () => {
      // Create a preference for bob
      graph.addNode({ id: 'user-bob', label: NodeType.USER, properties: { userId: 'bob', name: 'Bob', latitude: null, longitude: null, createdAt: '' } });
      handler.applyPreference({
        userId: 'bob', targetId: 'cat-indian', targetType: 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      });

      // Getting alice's preferences should not include bob's
      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs).toHaveLength(0);
    });

    it('should skip non-explicit relationships in getExplicitPreferences', () => {
      // Add a non-explicit relationship directly
      graph.addRelationship({
        id: 'non-explicit-rel', sourceId: 'user-alice', targetId: 'category-cat-indian',
        type: RelationshipType.LIKES_CATEGORY,
        properties: { weight: 0.5, explicitlySet: false },
      });

      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs).toHaveLength(0);
    });

    it('should skip relationship with invalid sentiment value', () => {
      // Add a relationship with explicitlySet=true but invalid sentiment
      graph.addRelationship({
        id: 'explicit-category-alice-bad', sourceId: 'user-alice', targetId: 'category-cat-indian',
        type: RelationshipType.LIKES_CATEGORY,
        properties: { weight: 0.5, explicitlySet: true, sentiment: 'neutral', lastUpdated: new Date().toISOString() },
      });

      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs).toHaveLength(0);
    });

    it('should skip relationship with null sentiment', () => {
      graph.addRelationship({
        id: 'explicit-category-alice-null', sourceId: 'user-alice', targetId: 'category-cat-indian',
        type: RelationshipType.LIKES_CATEGORY,
        properties: { weight: 0.5, explicitlySet: true, sentiment: null, lastUpdated: new Date().toISOString() },
      });

      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs).toHaveLength(0);
    });

    it('should use fallback target type for unknown relationship id pattern', () => {
      // Add a relationship with an ID that does not contain -dish-, -category-, or -restaurant-
      graph.addRelationship({
        id: 'explicit-unknown-alice-thing', sourceId: 'user-alice', targetId: 'category-cat-indian',
        type: RelationshipType.LIKES_CATEGORY,
        properties: { weight: 0.5, explicitlySet: true, sentiment: 'like', lastUpdated: new Date().toISOString() },
      });

      const prefs = handler.getExplicitPreferences('alice');
      expect(prefs.length).toBe(1);
      // Should fall back to 'category' since inferTargetType returns 'category' as default
      expect(prefs[0]?.targetType).toBe('category');
    });

    it('should handle unknown target type in buildTargetNodeId with fallback', () => {
      // Use an unknown targetType to hit the ?? fallback in buildTargetNodeId
      graph.addNode({ id: 'cuisine-c1', label: NodeType.CATEGORY, properties: { categoryId: 'c1', name: 'C1' } });
      const pref: ExplicitPreference = {
        userId: 'alice', targetId: 'c1', targetType: 'cuisine' as 'category',
        sentiment: 'like', timestamp: new Date().toISOString(),
      };

      const result = handler.applyPreference(pref);
      expect(result.applied).toBe(true);
    });
  });
});

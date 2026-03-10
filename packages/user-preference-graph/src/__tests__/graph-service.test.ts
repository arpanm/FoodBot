import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { NodeType, RelationshipType } from '../types/graph.types';

describe('InMemoryGraph', () => {
  let graph: InMemoryGraph;

  beforeEach(() => {
    graph = new InMemoryGraph();
  });

  afterEach(() => {
    graph.close();
  });

  describe('Node CRUD', () => {
    it('should add and retrieve a node', () => {
      graph.addNode({
        id: 'user-1',
        label: NodeType.USER,
        properties: { userId: 'u1', name: 'Alice', latitude: null, longitude: null, createdAt: '2024-01-01' },
      });

      const node = graph.getNode('user-1');
      expect(node).toBeDefined();
      expect(node?.properties['name']).toBe('Alice');
    });

    it('should return undefined for non-existent node', () => {
      expect(graph.getNode('non-existent')).toBeUndefined();
    });

    it('should get nodes by label', () => {
      graph.addNode({ id: 'user-1', label: NodeType.USER, properties: { userId: 'u1', name: 'A', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'user-2', label: NodeType.USER, properties: { userId: 'u2', name: 'B', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'restaurant-1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R', latitude: 0, longitude: 0, cuisine: '', rating: 4 } });

      const users = graph.getNodesByLabel(NodeType.USER);
      expect(users).toHaveLength(2);
    });

    it('should remove a node and its relationships', () => {
      graph.addNode({ id: 'user-1', label: NodeType.USER, properties: { userId: 'u1', name: 'A', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'restaurant-1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R', latitude: 0, longitude: 0, cuisine: '', rating: 4 } });
      graph.addRelationship({ id: 'rel-1', sourceId: 'user-1', targetId: 'restaurant-1', type: RelationshipType.FREQUENTS, properties: { weight: 0.5 } });

      graph.removeNode('user-1');

      expect(graph.getNode('user-1')).toBeUndefined();
      expect(graph.getRelationship('rel-1')).toBeUndefined();
    });

    it('should update node properties', () => {
      graph.addNode({ id: 'user-1', label: NodeType.USER, properties: { userId: 'u1', name: 'A', latitude: null, longitude: null, createdAt: '' } });
      graph.updateNodeProperties('user-1', { name: 'Updated' });

      const node = graph.getNode('user-1');
      expect(node?.properties['name']).toBe('Updated');
    });

    it('should do nothing when updating non-existent node', () => {
      graph.updateNodeProperties('non-existent', { name: 'test' });
      expect(graph.getNode('non-existent')).toBeUndefined();
    });
  });

  describe('Relationship CRUD', () => {
    beforeEach(() => {
      graph.addNode({ id: 'user-1', label: NodeType.USER, properties: { userId: 'u1', name: 'A', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'restaurant-1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R', latitude: 0, longitude: 0, cuisine: '', rating: 4 } });
    });

    it('should add and retrieve a relationship', () => {
      graph.addRelationship({ id: 'rel-1', sourceId: 'user-1', targetId: 'restaurant-1', type: RelationshipType.FREQUENTS, properties: { weight: 0.8 } });

      const rel = graph.getRelationship('rel-1');
      expect(rel).toBeDefined();
      expect(rel?.properties['weight']).toBe(0.8);
    });

    it('should get relationships between two nodes', () => {
      graph.addRelationship({ id: 'rel-1', sourceId: 'user-1', targetId: 'restaurant-1', type: RelationshipType.FREQUENTS, properties: { weight: 0.8 } });

      const rels = graph.getRelationshipsBetween('user-1', 'restaurant-1', RelationshipType.FREQUENTS);
      expect(rels).toHaveLength(1);
    });

    it('should return empty array when no matching relationships', () => {
      const rels = graph.getRelationshipsBetween('user-1', 'restaurant-1', RelationshipType.FREQUENTS);
      expect(rels).toHaveLength(0);
    });

    it('should remove a relationship', () => {
      graph.addRelationship({ id: 'rel-1', sourceId: 'user-1', targetId: 'restaurant-1', type: RelationshipType.FREQUENTS, properties: { weight: 0.8 } });
      graph.removeRelationship('rel-1');

      expect(graph.getRelationship('rel-1')).toBeUndefined();
    });

    it('should handle removing non-existent relationship gracefully', () => {
      graph.removeRelationship('non-existent');
      expect(graph.getRelationship('non-existent')).toBeUndefined();
    });

    it('should update relationship properties', () => {
      graph.addRelationship({ id: 'rel-1', sourceId: 'user-1', targetId: 'restaurant-1', type: RelationshipType.FREQUENTS, properties: { weight: 0.5 } });
      graph.updateRelationshipProperties('rel-1', { weight: 0.9 });

      const rel = graph.getRelationship('rel-1');
      expect(rel?.properties['weight']).toBe(0.9);
    });

    it('should do nothing when updating non-existent relationship', () => {
      graph.updateRelationshipProperties('non-existent', { weight: 0.5 });
      expect(graph.getRelationship('non-existent')).toBeUndefined();
    });
  });

  describe('Query neighbors', () => {
    beforeEach(() => {
      graph.addNode({ id: 'user-1', label: NodeType.USER, properties: { userId: 'u1', name: 'A', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'restaurant-1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R1', latitude: 0, longitude: 0, cuisine: '', rating: 4 } });
      graph.addNode({ id: 'restaurant-2', label: NodeType.RESTAURANT, properties: { restaurantId: 'r2', name: 'R2', latitude: 0, longitude: 0, cuisine: '', rating: 3 } });
      graph.addRelationship({ id: 'rel-1', sourceId: 'user-1', targetId: 'restaurant-1', type: RelationshipType.FREQUENTS, properties: { weight: 0.8 } });
      graph.addRelationship({ id: 'rel-2', sourceId: 'user-1', targetId: 'restaurant-2', type: RelationshipType.FREQUENTS, properties: { weight: 0.3 } });
    });

    it('should find outgoing neighbors', () => {
      const result = graph.queryNeighbors({ nodeId: 'user-1', direction: 'outgoing' });
      expect(result.nodes).toHaveLength(2);
      expect(result.relationships).toHaveLength(2);
    });

    it('should find incoming neighbors', () => {
      const result = graph.queryNeighbors({ nodeId: 'restaurant-1', direction: 'incoming' });
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]?.id).toBe('user-1');
    });

    it('should filter by relationship type', () => {
      graph.addNode({ id: 'category-1', label: NodeType.CATEGORY, properties: { categoryId: 'c1', name: 'Indian' } });
      graph.addRelationship({ id: 'rel-3', sourceId: 'user-1', targetId: 'category-1', type: RelationshipType.LIKES_CATEGORY, properties: { weight: 0.5 } });

      const result = graph.queryNeighbors({
        nodeId: 'user-1',
        relationshipType: RelationshipType.FREQUENTS,
        direction: 'outgoing',
      });
      expect(result.nodes).toHaveLength(2);
    });

    it('should respect limit parameter', () => {
      const result = graph.queryNeighbors({ nodeId: 'user-1', direction: 'outgoing', limit: 1 });
      expect(result.relationships).toHaveLength(1);
    });

    it('should find both-direction neighbors', () => {
      const result = graph.queryNeighbors({ nodeId: 'user-1', direction: 'both' });
      expect(result.relationships.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Geo distance queries', () => {
    beforeEach(() => {
      graph.addNode({ id: 'r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'Near', latitude: 12.97, longitude: 77.59, cuisine: 'Indian', rating: 4 } });
      graph.addNode({ id: 'r2', label: NodeType.RESTAURANT, properties: { restaurantId: 'r2', name: 'Far', latitude: 28.61, longitude: 77.20, cuisine: 'Chinese', rating: 3 } });
    });

    it('should find restaurants within radius', () => {
      const results = graph.queryByGeoDistance({ latitude: 12.97, longitude: 77.59, radiusKm: 5, nodeLabel: NodeType.RESTAURANT });
      expect(results).toHaveLength(1);
      expect(results[0]?.properties['name']).toBe('Near');
    });

    it('should return empty for no matches within radius', () => {
      const results = graph.queryByGeoDistance({ latitude: 0, longitude: 0, radiusKm: 1 });
      expect(results).toHaveLength(0);
    });

    it('should skip nodes without geo coordinates', () => {
      graph.addNode({ id: 'user-1', label: NodeType.USER, properties: { userId: 'u1', name: 'A', latitude: null, longitude: null, createdAt: '' } });
      const results = graph.queryByGeoDistance({ latitude: 12.97, longitude: 77.59, radiusKm: 1000 });
      expect(results.every((n) => n.properties['latitude'] !== null)).toBe(true);
    });
  });

  describe('getAllNodes / getAllRelationships / clear', () => {
    it('should return all nodes', () => {
      graph.addNode({ id: 'n1', label: NodeType.USER, properties: { userId: 'u1', name: 'A', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'n2', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'B', latitude: 0, longitude: 0, cuisine: '', rating: 4 } });
      expect(graph.getAllNodes()).toHaveLength(2);
    });

    it('should return all relationships', () => {
      graph.addNode({ id: 'n1', label: NodeType.USER, properties: {} });
      graph.addNode({ id: 'n2', label: NodeType.RESTAURANT, properties: {} });
      graph.addRelationship({ id: 'r1', sourceId: 'n1', targetId: 'n2', type: RelationshipType.FREQUENTS, properties: {} });
      expect(graph.getAllRelationships()).toHaveLength(1);
    });

    it('should clear all data', () => {
      graph.addNode({ id: 'n1', label: NodeType.USER, properties: {} });
      graph.clear();
      expect(graph.getAllNodes()).toHaveLength(0);
      expect(graph.getAllRelationships()).toHaveLength(0);
    });
  });
});

describe('SchemaManager', () => {
  let graph: InMemoryGraph;
  let schemaManager: SchemaManager;

  beforeEach(() => {
    graph = new InMemoryGraph();
    schemaManager = new SchemaManager(graph);
  });

  afterEach(() => {
    graph.close();
  });

  it('should initialize schema with time nodes', () => {
    schemaManager.initializeSchema();

    const dayNodes = graph.getNodesByLabel(NodeType.DAY_OF_WEEK);
    expect(dayNodes).toHaveLength(7);

    const timeSlotNodes = graph.getNodesByLabel(NodeType.TIME_SLOT);
    expect(timeSlotNodes).toHaveLength(5);
  });

  it('should create constraints', () => {
    schemaManager.initializeSchema();
    const constraints = schemaManager.getConstraints();
    expect(constraints.length).toBeGreaterThan(0);
  });

  it('should create indexes', () => {
    schemaManager.initializeSchema();
    const indexes = schemaManager.getIndexes();
    expect(indexes.length).toBeGreaterThan(0);
  });

  it('should create day nodes with proper properties', () => {
    schemaManager.initializeSchema();
    const monday = graph.getNode('day-monday');
    expect(monday).toBeDefined();
    expect(monday?.properties['day']).toBe('Monday');
    expect(monday?.properties['dayIndex']).toBe(0);
  });

  it('should create time slot nodes with proper properties', () => {
    schemaManager.initializeSchema();
    const lunch = graph.getNode('timeslot-lunch');
    expect(lunch).toBeDefined();
    expect(lunch?.properties['startHour']).toBe(11);
    expect(lunch?.properties['endHour']).toBe(15);
  });
});

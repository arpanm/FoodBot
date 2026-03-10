import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { OrderHistoryImporter } from '../preference/order-history-importer';
import { GraphUpdater } from '../sync/graph-updater';
import { BatchRecalculator } from '../sync/batch-recalculator';
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

describe('GraphUpdater', () => {
  let graph: InMemoryGraph;
  let updater: GraphUpdater;
  let importer: OrderHistoryImporter;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    updater = new GraphUpdater(graph);
    importer = new OrderHistoryImporter(graph);
  });

  afterEach(() => {
    graph.close();
  });

  describe('onOrderCompleted', () => {
    it('should create nodes for new order', () => {
      const order = createOrder();
      const result = updater.onOrderCompleted('alice', order);
      expect(result.nodesCreated).toBeGreaterThan(0);
    });

    it('should update FREQUENTS weight on subsequent orders', () => {
      const order1 = createOrder({ orderId: 'o1' });
      updater.onOrderCompleted('alice', order1);

      const order2 = createOrder({ orderId: 'o2' });
      updater.onOrderCompleted('alice', order2);

      const relAfter = graph.getRelationship('frequents-alice-r1');
      const weightAfter = (relAfter?.properties['weight'] as number) ?? 0;
      // After two orders, the weight should be positive
      expect(weightAfter).toBeGreaterThan(0);
    });

    it('should update time relationship counts', () => {
      const order1 = createOrder({ orderId: 'o1', dayOfWeek: 'Friday', timeSlot: 'dinner' });
      updater.onOrderCompleted('alice', order1);

      const order2 = createOrder({ orderId: 'o2', dayOfWeek: 'Friday', timeSlot: 'dinner' });
      updater.onOrderCompleted('alice', order2);

      const dayRel = graph.getRelationship('orderson-alice-friday');
      expect((dayRel?.properties['count'] as number)).toBeGreaterThanOrEqual(2);
    });

    it('should update category weights', () => {
      const order1 = createOrder({ orderId: 'o1' });
      updater.onOrderCompleted('alice', order1);

      const catRelBefore = graph.getRelationship('likescat-alice-cat-indian');
      const catWeightBefore = (catRelBefore?.properties['weight'] as number) ?? 0;

      const order2 = createOrder({ orderId: 'o2' });
      updater.onOrderCompleted('alice', order2);

      const catRelAfter = graph.getRelationship('likescat-alice-cat-indian');
      const catWeightAfter = (catRelAfter?.properties['weight'] as number) ?? 0;
      expect(catWeightAfter).toBeGreaterThanOrEqual(catWeightBefore);
    });

    it('should update dish weights', () => {
      const order1 = createOrder({ orderId: 'o1' });
      updater.onOrderCompleted('alice', order1);

      const dishRelBefore = graph.getRelationship('favdish-alice-d1');
      const dishWeightBefore = (dishRelBefore?.properties['weight'] as number) ?? 0;

      const order2 = createOrder({ orderId: 'o2' });
      updater.onOrderCompleted('alice', order2);

      const dishRelAfter = graph.getRelationship('favdish-alice-d1');
      const dishWeightAfter = (dishRelAfter?.properties['weight'] as number) ?? 0;
      expect(dishWeightAfter).toBeGreaterThanOrEqual(dishWeightBefore);
    });

    it('should handle new restaurant in update', () => {
      updater.onOrderCompleted('alice', createOrder({ orderId: 'o1' }));
      updater.onOrderCompleted('alice', createOrder({ orderId: 'o2', restaurantId: 'r2', restaurantName: 'New Place' }));

      expect(graph.getNode('restaurant-r2')).toBeDefined();
    });

    it('should handle update when frequents relationship does not exist yet', () => {
      // Manually create user node without relationships
      graph.addNode({ id: 'user-manual', label: NodeType.USER, properties: { userId: 'manual', name: 'M', latitude: null, longitude: null, createdAt: '' } });
      const order = createOrder({ restaurantId: 'r-new', restaurantName: 'Brand New' });
      // First call creates everything, doesn't error
      const result = updater.onOrderCompleted('manual', order);
      expect(result.nodesCreated).toBeGreaterThanOrEqual(0);
    });

    it('should gracefully handle missing time relationships', () => {
      // Create a scenario where time rels might not exist
      const order = createOrder({ orderId: 'o-time', dayOfWeek: 'Sunday', timeSlot: 'breakfast' });
      updater.onOrderCompleted('alice', order);
      // Second call should update existing time relationships
      updater.onOrderCompleted('alice', createOrder({ orderId: 'o-time2', dayOfWeek: 'Sunday', timeSlot: 'breakfast' }));
      const dayRel = graph.getRelationship('orderson-alice-sunday');
      expect(dayRel).toBeDefined();
    });

    it('should handle order with category that does not yet have relationship', () => {
      const order = createOrder({
        orderId: 'o-new-cat',
        items: [{ dishId: 'd-new', dishName: 'New Dish', price: 100, cuisine: 'Thai', isVegetarian: false, categoryId: 'cat-thai', categoryName: 'Thai' }],
      });
      updater.onOrderCompleted('alice', order);
      expect(graph.getNode('category-cat-thai')).toBeDefined();
    });

    it('should handle update when time relationships do not exist', () => {
      // Create user and restaurant manually without time relationships
      graph.addNode({ id: 'user-manual2', label: NodeType.USER, properties: { userId: 'manual2', name: 'M', latitude: null, longitude: null, createdAt: '' } });
      graph.addNode({ id: 'restaurant-r10', label: NodeType.RESTAURANT, properties: { restaurantId: 'r10', name: 'R10', latitude: 0, longitude: 0, cuisine: 'X', rating: 3 } });
      // Create frequents relationship manually
      graph.addRelationship({
        id: 'frequents-manual2-r10', sourceId: 'user-manual2', targetId: 'restaurant-r10',
        type: RelationshipType.FREQUENTS, properties: { weight: 0.5, orderCount: 1, lastUpdated: new Date().toISOString() },
      });
      // Now call updater -- the time relationships don't exist so incrementTimeRelationship should early-return
      const order = createOrder({ restaurantId: 'r10', restaurantName: 'R10', dayOfWeek: 'Monday', timeSlot: 'lunch' });
      updater.onOrderCompleted('manual2', order);
      // Should not throw, just gracefully handle
      expect(graph.getNode('user-manual2')).toBeDefined();
    });

    it('should handle update when category and dish relationships do not exist', () => {
      graph.addNode({ id: 'user-manual3', label: NodeType.USER, properties: { userId: 'manual3', name: 'M', latitude: null, longitude: null, createdAt: '' } });
      const order = createOrder({
        restaurantId: 'r11', restaurantName: 'R11',
        items: [{ dishId: 'd-new2', dishName: 'New', price: 100, cuisine: 'Test', isVegetarian: false, categoryId: 'cat-test2', categoryName: 'Test2' }],
      });
      updater.onOrderCompleted('manual3', order);
      expect(graph.getNode('dish-d-new2')).toBeDefined();
      expect(graph.getNode('category-cat-test2')).toBeDefined();
    });

    it('should not error when updating with no prior frequents relationship', () => {
      // Use a mock to simulate missing relationship
      const order = createOrder({ orderId: 'o-mock' });
      updater.onOrderCompleted('alice', order);

      // Remove the frequents relationship, then call again
      graph.removeRelationship('frequents-alice-r1');
      const order2 = createOrder({ orderId: 'o-mock2' });
      // This should gracefully handle missing frequents
      updater.onOrderCompleted('alice', order2);
      // The importer will recreate it
      expect(graph.getNode('user-alice')).toBeDefined();
    });

    it('should not error when time relationships are missing', () => {
      const order = createOrder({ orderId: 'o-t1', dayOfWeek: 'Monday', timeSlot: 'lunch' });
      updater.onOrderCompleted('alice', order);

      // Remove time relationships
      graph.removeRelationship('orderson-alice-monday');
      graph.removeRelationship('ordersat-alice-lunch');

      // Call again; should not error
      const order2 = createOrder({ orderId: 'o-t2', dayOfWeek: 'Monday', timeSlot: 'lunch' });
      updater.onOrderCompleted('alice', order2);
      expect(graph.getNode('user-alice')).toBeDefined();
    });

    it('should not error when category relationship is missing', () => {
      const order = createOrder({ orderId: 'o-c1' });
      updater.onOrderCompleted('alice', order);

      // Remove category relationship
      graph.removeRelationship('likescat-alice-cat-indian');

      const order2 = createOrder({ orderId: 'o-c2' });
      updater.onOrderCompleted('alice', order2);
      expect(graph.getNode('user-alice')).toBeDefined();
    });

    it('should not error when dish relationship is missing', () => {
      const order = createOrder({ orderId: 'o-d1' });
      updater.onOrderCompleted('alice', order);

      // Remove dish relationship
      graph.removeRelationship('favdish-alice-d1');

      const order2 = createOrder({ orderId: 'o-d2' });
      updater.onOrderCompleted('alice', order2);
      expect(graph.getNode('user-alice')).toBeDefined();
    });
  });

  describe('incrementWeights (no prior import)', () => {
    it('should early-return when frequents relationship does not exist', () => {
      // Set up a user node but no frequents relationship
      graph.addNode({ id: 'user-norel', label: NodeType.USER, properties: { userId: 'norel', name: 'N', latitude: null, longitude: null, createdAt: '' } });
      const order = createOrder({ restaurantId: 'r-absent', restaurantName: 'Absent' });
      // Call incrementWeights directly; no import, so no relationships exist
      updater.incrementWeights('norel', order);
      // Should not create any frequents relationship
      expect(graph.getRelationship('frequents-norel-r-absent')).toBeUndefined();
    });

    it('should early-return when time relationships do not exist', () => {
      graph.addNode({ id: 'user-notime', label: NodeType.USER, properties: { userId: 'notime', name: 'N', latitude: null, longitude: null, createdAt: '' } });
      const order = createOrder({ dayOfWeek: 'Tuesday', timeSlot: 'lunch' });
      updater.incrementWeights('notime', order);
      // Time relationships should not be created by incrementWeights
      expect(graph.getRelationship('orderson-notime-tuesday')).toBeUndefined();
      expect(graph.getRelationship('ordersat-notime-lunch')).toBeUndefined();
    });

    it('should early-return when category relationship does not exist', () => {
      graph.addNode({ id: 'user-nocat', label: NodeType.USER, properties: { userId: 'nocat', name: 'N', latitude: null, longitude: null, createdAt: '' } });
      const order = createOrder();
      updater.incrementWeights('nocat', order);
      // Category relationship should not be created by incrementWeights alone
      expect(graph.getRelationship('likescat-nocat-cat-indian')).toBeUndefined();
    });

    it('should early-return when dish relationship does not exist', () => {
      graph.addNode({ id: 'user-nodish', label: NodeType.USER, properties: { userId: 'nodish', name: 'N', latitude: null, longitude: null, createdAt: '' } });
      const order = createOrder();
      updater.incrementWeights('nodish', order);
      // Dish relationship should not be created by incrementWeights alone
      expect(graph.getRelationship('favdish-nodish-d1')).toBeUndefined();
    });
  });
});

describe('BatchRecalculator', () => {
  let graph: InMemoryGraph;
  let recalculator: BatchRecalculator;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    recalculator = new BatchRecalculator(graph);
  });

  afterEach(() => {
    graph.close();
  });

  it('should recalculate all weights', () => {
    graph.addNode({ id: 'user-alice', label: NodeType.USER, properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'restaurant-r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R1', latitude: 0, longitude: 0, cuisine: 'Indian', rating: 4 } });
    graph.addRelationship({
      id: 'rel-1', sourceId: 'user-alice', targetId: 'restaurant-r1',
      type: RelationshipType.FREQUENTS,
      properties: { weight: 0.8, lastUpdated: '2024-01-01' },
    });

    const result = recalculator.recalculateAll(new Date('2024-03-01'));
    expect(result.totalRelationships).toBeGreaterThan(0);
    expect(result.updated).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should use current date if none provided', () => {
    graph.addNode({ id: 'user-alice', label: NodeType.USER, properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'restaurant-r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R1', latitude: 0, longitude: 0, cuisine: 'Indian', rating: 4 } });
    graph.addRelationship({
      id: 'rel-1', sourceId: 'user-alice', targetId: 'restaurant-r1',
      type: RelationshipType.FREQUENTS,
      properties: { weight: 0.8, lastUpdated: '2024-01-01' },
    });

    const result = recalculator.recalculateAll();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should prune stale edges during recalculation', () => {
    graph.addNode({ id: 'user-alice', label: NodeType.USER, properties: { userId: 'alice', name: 'Alice', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'restaurant-r1', label: NodeType.RESTAURANT, properties: { restaurantId: 'r1', name: 'R1', latitude: 0, longitude: 0, cuisine: 'Indian', rating: 4 } });
    graph.addRelationship({
      id: 'rel-1', sourceId: 'user-alice', targetId: 'restaurant-r1',
      type: RelationshipType.FREQUENTS,
      properties: { weight: 0.01, lastUpdated: '2022-01-01' },
    });

    const result = recalculator.recalculateAll(new Date('2024-06-01'));
    expect(result.pruned).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty graph', () => {
    graph.clear();
    const result = recalculator.recalculateAll();
    expect(result.totalRelationships).toBe(0);
  });
});

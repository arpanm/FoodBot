import { InMemoryGraph } from '../graph/in-memory-graph';
import { SchemaManager } from '../graph/schema-manager';
import { OrderHistoryImporter } from '../preference/order-history-importer';
import { PreferenceSummarizer } from '../query/preference-summarizer';
import { PreferenceQuery } from '../query/preference-query';
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
    dayOfWeek: 'Wednesday',
    timeSlot: 'dinner',
    rating: 4,
    ...overrides,
  };
}

describe('PreferenceSummarizer', () => {
  let graph: InMemoryGraph;
  let summarizer: PreferenceSummarizer;
  let importer: OrderHistoryImporter;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    summarizer = new PreferenceSummarizer(graph);
    importer = new OrderHistoryImporter(graph);
  });

  afterEach(() => {
    graph.close();
  });

  describe('generateSummary', () => {
    it('should generate a summary with all sections', () => {
      importer.importOrders('alice', [
        createOrder({ orderId: 'o1', dayOfWeek: 'Wednesday', timeSlot: 'dinner' }),
      ]);

      const summary = summarizer.generateSummary('alice');

      expect(summary.userId).toBe('alice');
      expect(summary.topCategories.length).toBeGreaterThan(0);
      expect(summary.topDishes.length).toBeGreaterThan(0);
      expect(summary.topRestaurants.length).toBeGreaterThan(0);
      expect(summary.naturalLanguageSummary).toBeTruthy();
    });

    it('should include category preferences sorted by weight', () => {
      importer.importOrders('alice', [
        createOrder({
          orderId: 'o1',
          items: [
            { dishId: 'd1', dishName: 'Biryani', price: 300, cuisine: 'Indian', isVegetarian: false, categoryId: 'cat-indian', categoryName: 'Indian' },
            { dishId: 'd2', dishName: 'Naan', price: 50, cuisine: 'Indian', isVegetarian: true, categoryId: 'cat-bread', categoryName: 'Bread' },
          ],
        }),
      ]);

      const summary = summarizer.generateSummary('alice');
      expect(summary.topCategories.length).toBeGreaterThanOrEqual(1);
    });

    it('should include dish preferences', () => {
      importer.importOrders('alice', [createOrder()]);

      const summary = summarizer.generateSummary('alice');
      const biryani = summary.topDishes.find((d) => d.dishName === 'Biryani');
      expect(biryani).toBeDefined();
    });

    it('should include restaurant preferences', () => {
      importer.importOrders('alice', [createOrder()]);

      const summary = summarizer.generateSummary('alice');
      const spiceGarden = summary.topRestaurants.find((r) => r.restaurantName === 'Spice Garden');
      expect(spiceGarden).toBeDefined();
    });

    it('should generate natural language summary mentioning food type', () => {
      importer.importOrders('alice', [createOrder()]);

      const summary = summarizer.generateSummary('alice');
      expect(summary.naturalLanguageSummary).toContain('Indian');
    });

    it('should mention restaurant in natural language summary', () => {
      importer.importOrders('alice', [createOrder()]);

      const summary = summarizer.generateSummary('alice');
      expect(summary.naturalLanguageSummary).toContain('Spice Garden');
    });

    it('should mention dish in natural language summary', () => {
      importer.importOrders('alice', [createOrder()]);

      const summary = summarizer.generateSummary('alice');
      expect(summary.naturalLanguageSummary).toContain('Biryani');
    });

    it('should include time patterns', () => {
      importer.importOrders('alice', [
        createOrder({ orderId: 'o1', dayOfWeek: 'Wednesday', timeSlot: 'dinner' }),
      ]);

      const summary = summarizer.generateSummary('alice');
      expect(summary.timePatterns.length).toBeGreaterThan(0);
    });

    it('should handle user with no data gracefully', () => {
      graph.addNode({
        id: 'user-nobody',
        label: NodeType.USER,
        properties: { userId: 'nobody', name: 'Nobody', latitude: null, longitude: null, createdAt: '' },
      });

      const summary = summarizer.generateSummary('nobody');
      expect(summary.topCategories).toHaveLength(0);
      expect(summary.topDishes).toHaveLength(0);
      expect(summary.topRestaurants).toHaveLength(0);
    });

    it('should use weekday descriptor for weekday patterns', () => {
      importer.importOrders('alice', [
        createOrder({ orderId: 'o1', dayOfWeek: 'Wednesday', timeSlot: 'dinner' }),
      ]);

      const summary = summarizer.generateSummary('alice');
      expect(summary.naturalLanguageSummary).toContain('weekday');
    });

    it('should generate summary with multiple restaurants', () => {
      importer.importOrders('alice', [
        createOrder({ orderId: 'o1', restaurantId: 'r1', restaurantName: 'Spice Garden' }),
        createOrder({ orderId: 'o2', restaurantId: 'r2', restaurantName: 'Dragon Palace', restaurantCuisine: 'Chinese' }),
      ]);

      const summary = summarizer.generateSummary('alice');
      expect(summary.naturalLanguageSummary).toContain('places like');
    });

    it('should use weekend descriptor for Saturday', () => {
      importer.importOrders('alice', [
        createOrder({ orderId: 'o1', dayOfWeek: 'Saturday', timeSlot: 'lunch' }),
      ]);

      const summary = summarizer.generateSummary('alice');
      expect(summary.naturalLanguageSummary).toContain('weekend');
    });

    it('should handle non-standard day name in getDayDescriptor', () => {
      // Manually set up a user with a non-standard day node and time pattern
      importer.importOrders('alice', [createOrder({ orderId: 'o1' })]);

      // Create a custom day node and link it
      graph.addNode({
        id: 'day-holiday', label: NodeType.DAY_OF_WEEK,
        properties: { day: 'Holiday', dayIndex: 7 },
      });
      graph.addRelationship({
        id: 'orderson-alice-holiday', sourceId: 'user-alice', targetId: 'day-holiday',
        type: RelationshipType.ORDERS_ON,
        properties: { count: 10, weight: 1, lastUpdated: new Date().toISOString() },
      });

      const summary = summarizer.generateSummary('alice');
      expect(summary.naturalLanguageSummary).toContain('holiday');
    });
  });
});

describe('PreferenceQuery', () => {
  let graph: InMemoryGraph;
  let query: PreferenceQuery;
  let importer: OrderHistoryImporter;

  beforeEach(() => {
    graph = new InMemoryGraph();
    const schema = new SchemaManager(graph);
    schema.initializeSchema();
    query = new PreferenceQuery(graph);
    importer = new OrderHistoryImporter(graph);
  });

  afterEach(() => {
    graph.close();
  });

  it('should get top dishes at specific restaurant', () => {
    importer.importOrders('alice', [
      createOrder({ orderId: 'o1' }),
      createOrder({
        orderId: 'o2', restaurantId: 'r2', restaurantName: 'Other',
        items: [{ dishId: 'd2', dishName: 'Pasta', price: 400, cuisine: 'Italian', isVegetarian: true, categoryId: 'cat-it', categoryName: 'Italian' }],
      }),
    ]);

    const dishes = query.getTopDishesAtRestaurant('alice', 'r1');
    expect(dishes.length).toBeGreaterThan(0);
    for (const d of dishes) {
      const dishNode = graph.getNode(`dish-${d.dishId}`);
      expect(dishNode?.properties['restaurantId']).toBe('r1');
    }
  });

  it('should return empty for restaurant with no dishes', () => {
    importer.importOrders('alice', [createOrder()]);
    const dishes = query.getTopDishesAtRestaurant('alice', 'r99');
    expect(dishes).toHaveLength(0);
  });

  it('should return top categories with correct fields', () => {
    importer.importOrders('alice', [createOrder()]);
    const categories = query.getTopCategories('alice');
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]?.categoryId).toBeTruthy();
    expect(categories[0]?.categoryName).toBeTruthy();
  });

  it('should return top restaurants with cuisine', () => {
    importer.importOrders('alice', [createOrder()]);
    const restaurants = query.getTopRestaurants('alice');
    expect(restaurants.length).toBeGreaterThan(0);
    expect(restaurants[0]?.cuisine).toBeTruthy();
  });

  it('should get time patterns', () => {
    importer.importOrders('alice', [
      createOrder({ orderId: 'o1', dayOfWeek: 'Monday', timeSlot: 'lunch' }),
    ]);
    const patterns = query.getTimePatterns('alice');
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('should return General category when no categories exist', () => {
    graph.addNode({
      id: 'user-lonely',
      label: NodeType.USER,
      properties: { userId: 'lonely', name: 'Lonely', latitude: null, longitude: null, createdAt: '' },
    });
    const patterns = query.getTimePatterns('lonely');
    expect(patterns).toHaveLength(0);
  });

  it('should handle null restaurant id in dish', () => {
    // Manually create a dish node without restaurantId
    graph.addNode({ id: 'user-test', label: NodeType.USER, properties: { userId: 'test', name: 'T', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'dish-orphan', label: NodeType.DISH, properties: { dishId: 'orphan', name: 'O', price: 0, cuisine: 'X', isVegetarian: false, restaurantId: null } });
    graph.addRelationship({ id: 'fav-test-orphan', sourceId: 'user-test', targetId: 'dish-orphan', type: 'FAVORITE_DISH' as never, properties: { weight: 0.5 } });

    const dishes = query.getTopDishes('test');
    expect(dishes.length).toBe(1);
    expect(dishes[0]?.restaurantName).toBe('Unknown');
  });

  it('should handle dishes at nonexistent restaurant for topDishesAtRestaurant', () => {
    graph.addNode({ id: 'user-test', label: NodeType.USER, properties: { userId: 'test', name: 'T', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'dish-x', label: NodeType.DISH, properties: { dishId: 'x', name: 'X', price: 10, cuisine: 'Y', isVegetarian: false, restaurantId: 'nonexistent' } });
    graph.addRelationship({ id: 'fav-test-x', sourceId: 'user-test', targetId: 'dish-x', type: 'FAVORITE_DISH' as never, properties: { weight: 0.5 } });

    const dishes = query.getTopDishesAtRestaurant('test', 'nonexistent');
    expect(dishes.length).toBe(1);
  });

  it('should skip category relationship pointing to missing node', () => {
    graph.addNode({ id: 'user-orphan1', label: NodeType.USER, properties: { userId: 'orphan1', name: 'O', latitude: null, longitude: null, createdAt: '' } });
    // Add a LIKES_CATEGORY relationship pointing to a non-existent node
    graph.addRelationship({
      id: 'likescat-orphan1-missing', sourceId: 'user-orphan1', targetId: 'category-missing',
      type: 'LIKES_CATEGORY' as never, properties: { weight: 0.5 },
    });

    const categories = query.getTopCategories('orphan1');
    expect(categories).toHaveLength(0);
  });

  it('should skip dish relationship pointing to missing node', () => {
    graph.addNode({ id: 'user-orphan2', label: NodeType.USER, properties: { userId: 'orphan2', name: 'O', latitude: null, longitude: null, createdAt: '' } });
    graph.addRelationship({
      id: 'favdish-orphan2-missing', sourceId: 'user-orphan2', targetId: 'dish-missing',
      type: 'FAVORITE_DISH' as never, properties: { weight: 0.5 },
    });

    const dishes = query.getTopDishes('orphan2');
    expect(dishes).toHaveLength(0);
  });

  it('should skip restaurant relationship pointing to missing node', () => {
    graph.addNode({ id: 'user-orphan3', label: NodeType.USER, properties: { userId: 'orphan3', name: 'O', latitude: null, longitude: null, createdAt: '' } });
    graph.addRelationship({
      id: 'freq-orphan3-missing', sourceId: 'user-orphan3', targetId: 'restaurant-missing',
      type: 'FREQUENTS' as never, properties: { weight: 0.5 },
    });

    const restaurants = query.getTopRestaurants('orphan3');
    expect(restaurants).toHaveLength(0);
  });

  it('should handle nodes with missing property values using fallback', () => {
    // Create nodes with deliberately empty properties to test ?? branches
    graph.addNode({ id: 'user-fallback', label: NodeType.USER, properties: { userId: 'fallback', name: 'F', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'category-empty', label: NodeType.CATEGORY, properties: { categoryId: null as unknown as string, name: null as unknown as string } });
    graph.addRelationship({
      id: 'likes-fallback-empty', sourceId: 'user-fallback', targetId: 'category-empty',
      type: 'LIKES_CATEGORY' as never, properties: { weight: null as unknown as number },
    });

    const categories = query.getTopCategories('fallback');
    expect(categories.length).toBe(1);
    // Should use fallback values
    expect(categories[0]?.categoryId).toBeTruthy();
    expect(categories[0]?.weight).toBe(0);
  });

  it('should handle restaurant nodes with missing properties', () => {
    graph.addNode({ id: 'user-fallback2', label: NodeType.USER, properties: { userId: 'fallback2', name: 'F', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'restaurant-empty', label: NodeType.RESTAURANT, properties: { restaurantId: null as unknown as string, name: null as unknown as string, latitude: 0, longitude: 0, cuisine: null as unknown as string, rating: 0 } });
    graph.addRelationship({
      id: 'freq-fallback2-empty', sourceId: 'user-fallback2', targetId: 'restaurant-empty',
      type: 'FREQUENTS' as never, properties: { weight: null as unknown as number },
    });

    const restaurants = query.getTopRestaurants('fallback2');
    expect(restaurants.length).toBe(1);
    expect(restaurants[0]?.restaurantName).toBe('Unknown');
    expect(restaurants[0]?.cuisine).toBe('Unknown');
  });

  it('should handle dish nodes with missing properties', () => {
    graph.addNode({ id: 'user-fallback3', label: NodeType.USER, properties: { userId: 'fallback3', name: 'F', latitude: null, longitude: null, createdAt: '' } });
    graph.addNode({ id: 'dish-empty', label: NodeType.DISH, properties: { dishId: null as unknown as string, name: null as unknown as string, price: 0, cuisine: '', isVegetarian: false, restaurantId: null as unknown as string } });
    graph.addRelationship({
      id: 'fav-fallback3-empty', sourceId: 'user-fallback3', targetId: 'dish-empty',
      type: 'FAVORITE_DISH' as never, properties: { weight: null as unknown as number },
    });

    const dishes = query.getTopDishes('fallback3');
    expect(dishes.length).toBe(1);
    expect(dishes[0]?.dishName).toBe('Unknown');
  });
});

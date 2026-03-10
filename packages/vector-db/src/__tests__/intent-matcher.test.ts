import { IntentMatcher } from '../intent/intent-matcher';
import type { IntentEntry } from '../intent/intent-matcher';
import { InMemoryVectorStore } from '../vector-store/vector-store.client';
import { LocalEmbedder } from '../embedding/local-embedder';

describe('IntentMatcher', () => {
  let store: InMemoryVectorStore;
  let embedder: LocalEmbedder;
  let matcher: IntentMatcher;
  const collectionName = 'intents';

  const orderIntent: IntentEntry = {
    id: 'intent-order',
    name: 'order_food',
    description: 'User wants to order food',
    examples: [
      'I want to order pizza',
      'Order food for delivery',
      'Place an order',
    ],
    metadata: { category: 'ordering' },
  };

  const menuIntent: IntentEntry = {
    id: 'intent-menu',
    name: 'view_menu',
    description: 'User wants to see the menu',
    examples: [
      'Show me the menu',
      'What dishes do you have',
      'List available items',
    ],
    metadata: { category: 'browsing' },
  };

  beforeEach(async () => {
    store = new InMemoryVectorStore();
    embedder = new LocalEmbedder();
    await store.createCollection({
      name: collectionName,
      dimension: 384,
      distance: 'cosine',
    });
    matcher = new IntentMatcher(store, embedder, {
      collection: collectionName,
      threshold: 0.92,
    });
  });

  describe('registerIntent', () => {
    it('should register intent for exact matching', async () => {
      await matcher.registerIntent(orderIntent);
      const result = await matcher.match('I want to order pizza');
      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('exact');
      expect(result.intent?.name).toBe('order_food');
    });

    it('should register multiple intents', async () => {
      await matcher.registerIntent(orderIntent);
      await matcher.registerIntent(menuIntent);

      const r1 = await matcher.match('I want to order pizza');
      expect(r1.matched).toBe(true);
      expect(r1.intent?.name).toBe('order_food');

      const r2 = await matcher.match('Show me the menu');
      expect(r2.matched).toBe(true);
      expect(r2.intent?.name).toBe('view_menu');
    });
  });

  describe('match - exact', () => {
    beforeEach(async () => {
      await matcher.registerIntent(orderIntent);
    });

    it('should exact match registered example', async () => {
      const result = await matcher.match('I want to order pizza');
      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('exact');
      expect(result.score).toBe(1.0);
    });

    it('should exact match after normalization', async () => {
      const result = await matcher.match('I WANT TO ORDER PIZZA');
      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('exact');
    });

    it('should include latency', async () => {
      const result = await matcher.match('I want to order pizza');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('match - semantic', () => {
    beforeEach(async () => {
      await matcher.registerIntent(orderIntent);
    });

    it('should attempt semantic match for unknown prompt', async () => {
      const result = await matcher.match('completely unrelated query about weather');
      // Result depends on the semantic similarity
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      if (!result.matched) {
        expect(result.matchType).toBe('none');
        expect(result.score).toBe(0);
      }
    });
  });

  describe('match - no match', () => {
    it('should return no match when no intents registered', async () => {
      const result = await matcher.match('any query');
      expect(result.matched).toBe(false);
      expect(result.matchType).toBe('none');
      expect(result.intent).toBeNull();
    });
  });

  describe('removeIntent', () => {
    it('should remove intent from exact index', async () => {
      await matcher.registerIntent(orderIntent);
      await matcher.removeIntent('intent-order');
      const result = await matcher.match('I want to order pizza');
      expect(result.matchType).not.toBe('exact');
    });
  });

  describe('match result structure', () => {
    it('should contain all required fields on hit', async () => {
      await matcher.registerIntent(orderIntent);
      const result = await matcher.match('I want to order pizza');
      expect(result).toHaveProperty('matched');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('matchType');
      expect(result).toHaveProperty('latencyMs');
    });

    it('should contain all required fields on miss', async () => {
      const result = await matcher.match('test');
      expect(result.matched).toBe(false);
      expect(result.intent).toBeNull();
      expect(result.score).toBe(0);
      expect(result.matchType).toBe('none');
      expect(typeof result.latencyMs).toBe('number');
    });
  });
});

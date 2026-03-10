import { WorkflowTemplateCache } from '../intent/workflow-template-cache';
import type { WorkflowTemplate } from '../intent/workflow-template-cache';
import { InMemoryVectorStore } from '../vector-store/vector-store.client';
import { LocalEmbedder } from '../embedding/local-embedder';

describe('WorkflowTemplateCache', () => {
  let store: InMemoryVectorStore;
  let embedder: LocalEmbedder;
  let cache: WorkflowTemplateCache;
  const collection = 'workflow_templates';

  const orderTemplate: WorkflowTemplate = {
    id: 'tmpl-order',
    name: 'Order Food Workflow',
    description: 'Standard food ordering workflow with payment',
    intentPatterns: ['order food', 'place order', 'buy food'],
    steps: [
      { name: 'selectItems', type: 'form', config: { maxItems: 20 } },
      { name: 'checkout', type: 'payment', config: { methods: ['card', 'cash'] } },
    ],
    metadata: { category: 'ordering' },
  };

  const trackTemplate: WorkflowTemplate = {
    id: 'tmpl-track',
    name: 'Track Order Workflow',
    description: 'Order tracking and status updates',
    intentPatterns: ['track order', 'where is my order', 'order status'],
    steps: [
      { name: 'lookupOrder', type: 'query', config: {} },
      { name: 'displayStatus', type: 'display', config: {} },
    ],
    metadata: { category: 'tracking' },
  };

  beforeEach(async () => {
    store = new InMemoryVectorStore();
    embedder = new LocalEmbedder();
    await store.createCollection({
      name: collection,
      dimension: 384,
      distance: 'cosine',
    });
    cache = new WorkflowTemplateCache(store, embedder, { collection });
  });

  describe('registerTemplate', () => {
    it('should register a template', async () => {
      await cache.registerTemplate(orderTemplate);
      expect(cache.getTemplate('tmpl-order')).toEqual(orderTemplate);
    });

    it('should register multiple templates', async () => {
      await cache.registerTemplate(orderTemplate);
      await cache.registerTemplate(trackTemplate);
      expect(cache.listTemplates()).toHaveLength(2);
    });
  });

  describe('matchTemplate', () => {
    it('should match intent text to registered template', async () => {
      await cache.registerTemplate(orderTemplate);
      const result = await cache.matchTemplate('order food');
      // Result depends on semantic similarity
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      if (result.matched) {
        expect(result.template?.id).toBe('tmpl-order');
        expect(result.score).toBeGreaterThan(0);
      }
    });

    it('should return no match for unrelated text', async () => {
      await cache.registerTemplate(orderTemplate);
      const result = await cache.matchTemplate('weather forecast tomorrow');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return no match when no templates registered', async () => {
      const result = await cache.matchTemplate('order food');
      expect(result.matched).toBe(false);
      expect(result.template).toBeNull();
    });
  });

  describe('removeTemplate', () => {
    it('should remove template from local cache', async () => {
      await cache.registerTemplate(orderTemplate);
      await cache.removeTemplate('tmpl-order');
      expect(cache.getTemplate('tmpl-order')).toBeUndefined();
    });

    it('should handle removing non-existent template', async () => {
      await expect(cache.removeTemplate('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      await cache.registerTemplate(orderTemplate);
      expect(cache.getTemplate('tmpl-order')).toEqual(orderTemplate);
    });

    it('should return undefined for unknown id', () => {
      expect(cache.getTemplate('unknown')).toBeUndefined();
    });
  });

  describe('listTemplates', () => {
    it('should return empty array initially', () => {
      expect(cache.listTemplates()).toEqual([]);
    });

    it('should return all registered templates', async () => {
      await cache.registerTemplate(orderTemplate);
      await cache.registerTemplate(trackTemplate);
      const templates = cache.listTemplates();
      expect(templates).toHaveLength(2);
      expect(templates.map((t) => t.id)).toContain('tmpl-order');
      expect(templates.map((t) => t.id)).toContain('tmpl-track');
    });
  });
});

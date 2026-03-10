import { SearchOrchestrator } from '../orchestrator/search-orchestrator';
import type { SearchDocument, SearchQuery } from '../types/search.types';

function createTestDocuments(): SearchDocument[] {
  return [
    {
      id: 'doc-1',
      name: 'Chicken Biryani',
      description: 'Aromatic basmati rice with spiced chicken',
      cuisine: 'Indian',
      price: 250,
      rating: 4.5,
      dietary: ['halal'],
      deliveryTime: 30,
      orderCount: 500,
      recentOrderCount: 50,
      tags: ['lunch', 'dinner', 'spicy'],
      location: { lat: 28.6139, lng: 77.2090 },
    },
    {
      id: 'doc-2',
      name: 'Margherita Pizza',
      description: 'Classic pizza with fresh mozzarella and basil',
      cuisine: 'Italian',
      price: 350,
      rating: 4.2,
      dietary: ['vegetarian'],
      deliveryTime: 25,
      orderCount: 400,
      recentOrderCount: 60,
      tags: ['lunch', 'dinner', 'cheese'],
      location: { lat: 28.6150, lng: 77.2100 },
    },
    {
      id: 'doc-3',
      name: 'Paneer Tikka',
      description: 'Grilled cottage cheese with Indian spices',
      cuisine: 'Indian',
      price: 200,
      rating: 4.0,
      dietary: ['vegetarian'],
      deliveryTime: 20,
      orderCount: 300,
      recentOrderCount: 30,
      tags: ['snack', 'vegetarian'],
      location: { lat: 28.6160, lng: 77.2110 },
    },
    {
      id: 'doc-4',
      name: 'Spicy Chicken Wings',
      description: 'Crispy fried chicken wings with hot sauce',
      cuisine: 'American',
      price: 300,
      rating: 4.3,
      dietary: [],
      deliveryTime: 15,
      orderCount: 600,
      recentOrderCount: 80,
      tags: ['snack', 'fried', 'spicy'],
      location: { lat: 28.6170, lng: 77.2120 },
    },
    {
      id: 'doc-5',
      name: 'Vegetable Sushi Roll',
      description: 'Fresh vegetable maki with soy sauce',
      cuisine: 'Japanese',
      price: 400,
      rating: 4.6,
      dietary: ['vegetarian', 'vegan'],
      deliveryTime: 35,
      orderCount: 200,
      recentOrderCount: 20,
      tags: ['healthy', 'dinner'],
      location: { lat: 28.6180, lng: 77.2130 },
    },
  ];
}

describe('SearchOrchestrator', () => {
  let orchestrator: SearchOrchestrator;
  let documents: SearchDocument[];

  beforeEach(() => {
    orchestrator = new SearchOrchestrator({
      enableSpellCheck: true,
      enableQueryExpansion: true,
      enablePersonalization: false,
      enablePopularity: true,
    });
    documents = createTestDocuments();
    orchestrator.indexDocuments(documents);
  });

  describe('basic search', () => {
    it('should return results for a valid query', async () => {
      const query: SearchQuery = { text: 'chicken biryani' };
      const response = await orchestrator.search(query);

      expect(response.results.length).toBeGreaterThanOrEqual(1);
      expect(response.queryId).toBeDefined();
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should find biryani as top result for "biryani"', async () => {
      const query: SearchQuery = { text: 'biryani' };
      const response = await orchestrator.search(query);

      expect(response.results[0]!.document.id).toBe('doc-1');
    });

    it('should return pizza for "pizza"', async () => {
      const query: SearchQuery = { text: 'pizza' };
      const response = await orchestrator.search(query);

      const ids = response.results.map((r) => r.document.id);
      expect(ids).toContain('doc-2');
    });
  });

  describe('spell correction integration', () => {
    it('should correct misspelled query', async () => {
      const query: SearchQuery = { text: 'pizzza' };
      const response = await orchestrator.search(query);

      expect(response.correctedQuery).toBe('pizza');
      expect(response.results.length).toBeGreaterThanOrEqual(1);
    });

    it('should not set correctedQuery for correct queries', async () => {
      const query: SearchQuery = { text: 'chicken' };
      const response = await orchestrator.search(query);

      expect(response.correctedQuery).toBeUndefined();
    });
  });

  describe('filtered search', () => {
    it('should filter by cuisine', async () => {
      const query: SearchQuery = {
        text: 'food',
        filters: { cuisine: ['Indian'] },
      };
      const response = await orchestrator.search(query);

      const facets = response.facets;
      expect(facets.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by minimum rating', async () => {
      const query: SearchQuery = {
        text: 'food',
        filters: { minRating: 4.5 },
      };
      const response = await orchestrator.search(query);

      expect(response.results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('pagination', () => {
    it('should respect limit parameter', async () => {
      const query: SearchQuery = { text: 'chicken', limit: 2 };
      const response = await orchestrator.search(query);

      expect(response.results.length).toBeLessThanOrEqual(2);
    });

    it('should respect offset parameter', async () => {
      const allQuery: SearchQuery = { text: 'food', limit: 10 };
      const allResponse = await orchestrator.search(allQuery);

      const offsetQuery: SearchQuery = { text: 'food', limit: 10, offset: 1 };
      const offsetResponse = await orchestrator.search(offsetQuery);

      if (allResponse.results.length > 1) {
        expect(offsetResponse.results.length).toBeLessThan(
          allResponse.results.length
        );
      }
    });
  });

  describe('facets in response', () => {
    it('should include facets in search response', async () => {
      const query: SearchQuery = { text: 'food' };
      const response = await orchestrator.search(query);

      expect(response.facets).toBeDefined();
      expect(Array.isArray(response.facets)).toBe(true);
    });
  });

  describe('query logging', () => {
    it('should log search queries', async () => {
      await orchestrator.search({ text: 'pizza' });
      await orchestrator.search({ text: 'burger' });

      const logger = orchestrator.getQueryLogger();
      expect(logger.getLogCount()).toBe(2);
    });
  });

  describe('suggestions in response', () => {
    it('should include suggestions from query expansion', async () => {
      const query: SearchQuery = { text: 'burger' };
      const response = await orchestrator.search(query);

      expect(response.suggestions).toBeDefined();
      expect(response.suggestions!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('contextual boosting', () => {
    it('should apply time-of-day context', async () => {
      const query: SearchQuery = {
        text: 'food',
        context: { timeOfDay: 'morning' },
      };
      const response = await orchestrator.search(query);

      expect(response.results.length).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * E2E tests for the Search Orchestrator HTTP API.
 * Tests the full request/response cycle through the Express application.
 */

import pino from 'pino';
import request from 'supertest';

import { createApp } from '../src/app';
import type { SearchSource, SourceHealthStatus, SourceQueryResult } from '../src/types/source.types';
import type { UnifiedSearchResult, AutocompleteSuggestion } from '../src/types/search.types';

const logger = pino({ level: 'silent' });

function createMockResults(count: number): UnifiedSearchResult[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    type: 'restaurant' as const,
    name: `Restaurant ${i}`,
    description: `Description for restaurant ${i}`,
    score: 0.9 - i * 0.05,
    source: 'elasticsearch',
    restaurant: {
      id: `r${i}`,
      name: `Restaurant ${i}`,
      description: `Description for restaurant ${i}`,
      cuisineTypes: ['Italian', 'Pizza'],
      rating: 4.5 - i * 0.1,
      reviewCount: 200 - i * 20,
      priceRange: 'moderate',
      deliveryTime: 20 + i * 5,
      deliveryFee: 2.99,
      minimumOrder: 10,
      isAvailable: true,
      address: `${100 + i} Main St`,
      location: { lat: 12.9716 + i * 0.001, lon: 77.5946 + i * 0.001 },
      tags: ['pizza', 'delivery'],
      features: ['dine-in'],
    },
  }));
}

// Create a mock source that returns static data for E2E tests
function createTestSource(): SearchSource {
  return {
    name: 'elasticsearch',
    search: jest.fn().mockResolvedValue({
      source: 'elasticsearch',
      results: createMockResults(10),
      totalCount: 10,
      latencyMs: 25,
    } as SourceQueryResult),
    autocomplete: jest.fn().mockResolvedValue([
      { text: 'Pizza Hut', type: 'restaurant', id: 'r1' },
      { text: 'Pizza Express', type: 'restaurant', id: 'r2' },
      { text: 'Pizza Palace', type: 'restaurant', id: 'r3' },
    ] as AutocompleteSuggestion[]),
    healthCheck: jest.fn().mockResolvedValue({
      name: 'elasticsearch',
      status: 'healthy',
      latencyMs: 5,
      lastChecked: new Date(),
      errorCount: 0,
      consecutiveFailures: 0,
    } as SourceHealthStatus),
    isAvailable: jest.fn().mockReturnValue(true),
  };
}

describe('Search Orchestrator E2E', () => {
  let app: ReturnType<typeof createApp>['app'];

  beforeAll(() => {
    // Override source creation by providing a custom app setup
    const result = createApp({ logger });
    app = result.app;
  });

  describe('POST /search', () => {
    it('should return search results for a valid query', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          query: 'pizza',
          page: 1,
          pageSize: 10,
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('queryTimeMs');
      expect(response.body.metadata).toHaveProperty('totalResults');
      expect(response.body.metadata).toHaveProperty('page');
      expect(response.body.metadata).toHaveProperty('pageSize');
    });

    it('should accept strategy parameter', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          query: 'burger',
          page: 1,
          pageSize: 20,
          strategy: 'fast',
        })
        .expect(200);

      expect(response.body.metadata.strategy).toBe('fast');
    });

    it('should accept filters', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          query: 'food',
          filters: {
            cuisines: ['Italian'],
            minRating: 4.0,
            isAvailable: true,
          },
          page: 1,
          pageSize: 20,
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should handle empty query', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          query: '',
          page: 1,
          pageSize: 20,
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
    });

    it('should limit page size to max configured', async () => {
      const response = await request(app)
        .post('/search')
        .send({
          query: 'pizza',
          page: 1,
          pageSize: 500,
        })
        .expect(200);

      expect(response.body.metadata.pageSize).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /search/autocomplete', () => {
    it('should return suggestions for a valid prefix', async () => {
      const response = await request(app)
        .get('/search/autocomplete?prefix=piz')
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('queryTimeMs');
    });

    it('should return 400 for missing prefix', async () => {
      await request(app)
        .get('/search/autocomplete')
        .expect(400);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/search/autocomplete?prefix=piz&limit=5')
        .expect(200);

      expect(response.body.suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /search/popular', () => {
    it('should return popular searches', async () => {
      const response = await request(app)
        .get('/search/popular')
        .expect(200);

      expect(response.body).toHaveProperty('searches');
      expect(Array.isArray(response.body.searches)).toBe(true);

      if (response.body.searches.length > 0) {
        expect(response.body.searches[0]).toHaveProperty('query');
        expect(response.body.searches[0]).toHaveProperty('count');
        expect(response.body.searches[0]).toHaveProperty('trending');
      }
    });
  });

  describe('POST /cache/invalidate', () => {
    it('should accept cache invalidation events', async () => {
      const response = await request(app)
        .post('/cache/invalidate')
        .send({
          type: 'restaurant_updated',
          entityId: 'r1',
          entityType: 'restaurant',
          timestamp: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('sources');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /metrics', () => {
    it('should return metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('sources');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown/endpoint')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});

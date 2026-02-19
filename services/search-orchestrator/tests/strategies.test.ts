/**
 * Unit tests for search strategies:
 * - FastSearchStrategy
 * - ComprehensiveStrategy
 * - FallbackStrategy
 * - StrategySelector
 * Also tests caching components:
 * - SearchCache
 * - cacheKeyGenerator
 * - CacheInvalidationService
 * And filter components:
 * - CuisineFilter, PriceRangeFilter, RatingFilter, LocationFilter, AvailabilityFilter
 */

import pino from 'pino';

import { FastSearchStrategy } from '../src/strategies/FastSearchStrategy';
import { ComprehensiveStrategy } from '../src/strategies/ComprehensiveStrategy';
import { FallbackStrategy } from '../src/strategies/FallbackStrategy';
import { StrategySelector } from '../src/strategies/StrategySelector';
import { ParallelExecutor } from '../src/orchestrator/ParallelExecutor';
import { FallbackHandler } from '../src/orchestrator/FallbackHandler';
import { TimeoutManager } from '../src/orchestrator/TimeoutManager';
import { SearchCache } from '../src/cache/SearchCache';
import { generateCacheKey } from '../src/cache/cacheKeyGenerator';
import { CacheInvalidationService } from '../src/cache/cacheInvalidation';
import { CuisineFilter } from '../src/filters/CuisineFilter';
import { PriceRangeFilter } from '../src/filters/PriceRangeFilter';
import { RatingFilter } from '../src/filters/RatingFilter';
import { LocationFilter } from '../src/filters/LocationFilter';
import { AvailabilityFilter } from '../src/filters/AvailabilityFilter';
import type { SearchRequest, UnifiedSearchResult } from '../src/types/search.types';
import type { SearchSource, SourceQueryResult, SourceHealthStatus } from '../src/types/source.types';

const logger = pino({ level: 'silent' });

function createMockSource(
  name: string,
  resultCount: number,
): SearchSource {
  const results: UnifiedSearchResult[] = Array.from({ length: resultCount }, (_, i) => ({
    id: `${name}-${i}`,
    type: 'restaurant' as const,
    name: `Restaurant ${i}`,
    description: `Description ${i}`,
    score: 0.8,
    source: name,
    restaurant: {
      id: `${name}-${i}`,
      name: `Restaurant ${i}`,
      description: `Description ${i}`,
      cuisineTypes: ['Italian'],
      rating: 4.0,
      reviewCount: 50,
      priceRange: 'moderate',
      deliveryTime: 25,
      deliveryFee: 2.99,
      minimumOrder: 10,
      isAvailable: true,
      address: '123 Main St',
      location: { lat: 12.9716, lon: 77.5946 },
      tags: [],
      features: [],
    },
  }));

  return {
    name: name as SearchSource['name'],
    search: jest.fn().mockResolvedValue({
      source: name,
      results,
      totalCount: resultCount,
      latencyMs: 50,
    } as SourceQueryResult),
    autocomplete: jest.fn().mockResolvedValue([]),
    healthCheck: jest.fn().mockResolvedValue({
      name,
      status: 'healthy',
      latencyMs: 5,
      lastChecked: new Date(),
      errorCount: 0,
      consecutiveFailures: 0,
    } as SourceHealthStatus),
    isAvailable: jest.fn().mockReturnValue(true),
  };
}

function createSearchRequest(overrides?: Partial<SearchRequest>): SearchRequest {
  return { query: 'pizza', page: 1, pageSize: 20, ...overrides };
}

const timeoutManager = new TimeoutManager(
  {
    globalTimeoutMs: 3000,
    perSourceTimeoutMs: new Map([
      ['elasticsearch', 200],
      ['mcp-adapter', 2000],
      ['database', 500],
    ]),
  },
  logger,
);

const executor = new ParallelExecutor(timeoutManager, logger);
const fallbackHandler = new FallbackHandler(timeoutManager, logger);

describe('FastSearchStrategy', () => {
  it('should only use elasticsearch source', async () => {
    const esSource = createMockSource('elasticsearch', 5);
    const mcpSource = createMockSource('mcp-adapter', 3);

    const strategy = new FastSearchStrategy([esSource, mcpSource], executor);
    const results = await strategy.execute(createSearchRequest());

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.source).toBe('elasticsearch');
    expect(esSource.search).toHaveBeenCalled();
  });

  it('should return empty when elasticsearch is unavailable', async () => {
    const esSource = createMockSource('elasticsearch', 5);
    (esSource.isAvailable as jest.Mock).mockReturnValue(false);

    const strategy = new FastSearchStrategy([esSource], executor);
    const results = await strategy.execute(createSearchRequest());

    expect(results).toHaveLength(0);
  });
});

describe('ComprehensiveStrategy', () => {
  it('should query all available sources', async () => {
    const esSource = createMockSource('elasticsearch', 5);
    const mcpSource = createMockSource('mcp-adapter', 3);
    const dbSource = createMockSource('database', 2);

    const strategy = new ComprehensiveStrategy([esSource, mcpSource, dbSource], executor);
    const results = await strategy.execute(createSearchRequest());

    expect(results).toHaveLength(3);
    expect(esSource.search).toHaveBeenCalled();
    expect(mcpSource.search).toHaveBeenCalled();
    expect(dbSource.search).toHaveBeenCalled();
  });

  it('should skip unavailable sources', async () => {
    const esSource = createMockSource('elasticsearch', 5);
    const mcpSource = createMockSource('mcp-adapter', 3);
    (mcpSource.isAvailable as jest.Mock).mockReturnValue(false);

    const strategy = new ComprehensiveStrategy([esSource, mcpSource], executor);
    const results = await strategy.execute(createSearchRequest());

    expect(results).toHaveLength(1);
    expect(esSource.search).toHaveBeenCalled();
  });
});

describe('FallbackStrategy', () => {
  it('should use fallback handler', async () => {
    const esSource = createMockSource('elasticsearch', 5);
    const dbSource = createMockSource('database', 2);

    const strategy = new FallbackStrategy([esSource, dbSource], fallbackHandler);
    const results = await strategy.execute(createSearchRequest());

    expect(results.length).toBeGreaterThan(0);
  });
});

describe('StrategySelector', () => {
  it('should execute fast strategy', async () => {
    const esSource = createMockSource('elasticsearch', 5);
    const selector = new StrategySelector([esSource], executor, fallbackHandler, logger);

    const results = await selector.execute('fast', createSearchRequest());
    expect(results.length).toBeGreaterThan(0);
  });

  it('should execute comprehensive strategy', async () => {
    const esSource = createMockSource('elasticsearch', 5);
    const selector = new StrategySelector([esSource], executor, fallbackHandler, logger);

    const results = await selector.execute('comprehensive', createSearchRequest());
    expect(results.length).toBeGreaterThan(0);
  });

  it('should execute fallback strategy', async () => {
    const dbSource = createMockSource('database', 2);
    const selector = new StrategySelector([dbSource], executor, fallbackHandler, logger);

    const results = await selector.execute('fallback', createSearchRequest());
    expect(results.length).toBeGreaterThan(0);
  });

  it('should default to comprehensive for unknown strategies', async () => {
    const esSource = createMockSource('elasticsearch', 5);
    const selector = new StrategySelector([esSource], executor, fallbackHandler, logger);

    const results = await selector.execute('unknown' as SearchRequest['strategy']!, createSearchRequest());
    expect(results.length).toBeGreaterThan(0);
  });

  it('should auto-select fast for short queries', () => {
    const selector = new StrategySelector([], executor, fallbackHandler, logger);
    expect(selector.autoSelect(createSearchRequest({ query: 'pi' }))).toBe('fast');
  });

  it('should auto-select comprehensive for normal queries', () => {
    const selector = new StrategySelector([], executor, fallbackHandler, logger);
    expect(selector.autoSelect(createSearchRequest({ query: 'pizza' }))).toBe('comprehensive');
  });
});

describe('SearchCache', () => {
  it('should store and retrieve results', async () => {
    const cache = new SearchCache(null, logger);

    const response = {
      results: [],
      metadata: {
        totalResults: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        queryTimeMs: 10,
        sources: [],
        strategy: 'comprehensive' as const,
        cacheHit: false,
        requestId: 'test',
      },
    };

    await cache.set('test-key', response, 60);

    const cached = await cache.get('test-key');
    expect(cached).toBeDefined();
    expect(cached!.metadata.requestId).toBe('test');
  });

  it('should return null for missing keys', async () => {
    const cache = new SearchCache(null, logger);

    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should track cache stats', async () => {
    const cache = new SearchCache(null, logger);

    const response = {
      results: [],
      metadata: {
        totalResults: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        queryTimeMs: 10,
        sources: [],
        strategy: 'comprehensive' as const,
        cacheHit: false,
        requestId: 'test',
      },
    };

    await cache.set('key1', response, 60);
    await cache.get('key1'); // hit
    await cache.get('key2'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('should invalidate specific keys', async () => {
    const cache = new SearchCache(null, logger);

    const response = {
      results: [],
      metadata: {
        totalResults: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        queryTimeMs: 10,
        sources: [],
        strategy: 'comprehensive' as const,
        cacheHit: false,
        requestId: 'test',
      },
    };

    await cache.set('to-delete', response, 60);
    await cache.invalidate('to-delete');

    const result = await cache.get('to-delete');
    expect(result).toBeNull();
  });

  it('should invalidate by pattern', async () => {
    const cache = new SearchCache(null, logger);

    const response = {
      results: [],
      metadata: {
        totalResults: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        queryTimeMs: 10,
        sources: [],
        strategy: 'comprehensive' as const,
        cacheHit: false,
        requestId: 'test',
      },
    };

    await cache.set('search:r1', response, 60);
    await cache.set('search:r2', response, 60);
    await cache.set('other:r3', response, 60);

    await cache.invalidatePattern('search:*');

    expect(await cache.get('search:r1')).toBeNull();
    expect(await cache.get('search:r2')).toBeNull();
    expect(await cache.get('other:r3')).not.toBeNull();
  });

  it('should clear all entries', async () => {
    const cache = new SearchCache(null, logger);

    const response = {
      results: [],
      metadata: {
        totalResults: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        queryTimeMs: 10,
        sources: [],
        strategy: 'comprehensive' as const,
        cacheHit: false,
        requestId: 'test',
      },
    };

    await cache.set('key1', response, 60);
    await cache.set('key2', response, 60);
    cache.clear();

    expect(await cache.get('key1')).toBeNull();
    expect(await cache.get('key2')).toBeNull();
    expect(cache.getStats().totalKeys).toBe(0);
  });
});

describe('cacheKeyGenerator', () => {
  it('should generate deterministic keys', () => {
    const request = createSearchRequest({ query: 'pizza' });
    const key1 = generateCacheKey(request);
    const key2 = generateCacheKey(request);

    expect(key1).toBe(key2);
  });

  it('should include query in key', () => {
    const key = generateCacheKey(createSearchRequest({ query: 'pizza' }));
    expect(key).toContain('q:pizza');
  });

  it('should include filters in key', () => {
    const key = generateCacheKey(
      createSearchRequest({
        filters: { cuisines: ['Italian', 'Chinese'], minRating: 4.0 },
      }),
    );

    expect(key).toContain('c:Chinese,Italian');
    expect(key).toContain('r:4');
  });

  it('should include pagination in key', () => {
    const key = generateCacheKey(createSearchRequest({ page: 2, pageSize: 10 }));
    expect(key).toContain('p:2:10');
  });

  it('should normalize query to lowercase', () => {
    const key1 = generateCacheKey(createSearchRequest({ query: 'Pizza' }));
    const key2 = generateCacheKey(createSearchRequest({ query: 'pizza' }));

    expect(key1).toBe(key2);
  });

  it('should sort filter arrays for determinism', () => {
    const key1 = generateCacheKey(
      createSearchRequest({ filters: { cuisines: ['Italian', 'Chinese'] } }),
    );
    const key2 = generateCacheKey(
      createSearchRequest({ filters: { cuisines: ['Chinese', 'Italian'] } }),
    );

    expect(key1).toBe(key2);
  });

  it('should include strategy in key', () => {
    const key = generateCacheKey(createSearchRequest({ strategy: 'fast' }));
    expect(key).toContain('s:fast');
  });
});

describe('CacheInvalidationService', () => {
  it('should invalidate caches on restaurant update', async () => {
    const cache = new SearchCache(null, logger);
    const invalidator = new CacheInvalidationService(cache, logger);

    const spy = jest.spyOn(cache, 'invalidatePattern');

    await invalidator.handleEvent({
      type: 'restaurant_updated',
      entityId: 'r1',
      entityType: 'restaurant',
      timestamp: new Date(),
    });

    expect(spy).toHaveBeenCalledWith('search:*');
    expect(spy).toHaveBeenCalledWith('autocomplete:*');
  });

  it('should invalidate caches on dish update', async () => {
    const cache = new SearchCache(null, logger);
    const invalidator = new CacheInvalidationService(cache, logger);

    const spy = jest.spyOn(cache, 'invalidatePattern');

    await invalidator.handleEvent({
      type: 'dish_created',
      entityId: 'd1',
      entityType: 'dish',
      timestamp: new Date(),
    });

    expect(spy).toHaveBeenCalledWith('search:*');
  });

  it('should invalidate all caches', async () => {
    const cache = new SearchCache(null, logger);
    const invalidator = new CacheInvalidationService(cache, logger);

    const spy = jest.spyOn(cache, 'invalidatePattern');

    await invalidator.invalidateAll();

    expect(spy).toHaveBeenCalledWith('search:*');
    expect(spy).toHaveBeenCalledWith('autocomplete:*');
    expect(spy).toHaveBeenCalledWith('popular-searches');
  });
});

describe('Filters', () => {
  const createResult = (overrides: Partial<UnifiedSearchResult> = {}): UnifiedSearchResult => ({
    id: 'r1',
    type: 'restaurant',
    name: 'Test Restaurant',
    description: 'Test',
    score: 0.8,
    source: 'elasticsearch',
    restaurant: {
      id: 'r1',
      name: 'Test Restaurant',
      description: 'Test',
      cuisineTypes: ['Italian'],
      rating: 4.0,
      reviewCount: 50,
      priceRange: 'moderate',
      deliveryTime: 25,
      deliveryFee: 2.99,
      minimumOrder: 10,
      isAvailable: true,
      address: '123 Main St',
      location: { lat: 12.9716, lon: 77.5946 },
      tags: [],
      features: [],
    },
    ...overrides,
  });

  describe('CuisineFilter', () => {
    const filter = new CuisineFilter();

    it('should filter by cuisine type', () => {
      const results = [
        createResult(),
        createResult({
          id: 'r2',
          restaurant: {
            ...createResult().restaurant!,
            id: 'r2',
            cuisineTypes: ['Japanese'],
          },
        }),
      ];

      const filtered = filter.apply(results, ['Italian']);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('r1');
    });

    it('should be case insensitive', () => {
      const results = [createResult()];
      const filtered = filter.apply(results, ['italian']);
      expect(filtered).toHaveLength(1);
    });

    it('should return all results for empty filter', () => {
      const results = [createResult(), createResult({ id: 'r2' })];
      const filtered = filter.apply(results, []);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('PriceRangeFilter', () => {
    const filter = new PriceRangeFilter();

    it('should filter dishes by price range', () => {
      const dish: UnifiedSearchResult = {
        id: 'd1',
        type: 'dish',
        name: 'Pizza',
        description: 'Cheese pizza',
        score: 0.8,
        source: 'elasticsearch',
        dish: {
          id: 'd1',
          restaurantId: 'r1',
          name: 'Pizza',
          description: 'Cheese pizza',
          category: 'Main',
          price: 15.99,
          ingredients: [],
          dietaryTags: [],
          isAvailable: true,
          rating: 4.0,
        },
      };

      const cheap: UnifiedSearchResult = {
        ...dish,
        id: 'd2',
        dish: { ...dish.dish!, id: 'd2', price: 5.99 },
      };

      const filtered = filter.apply([dish, cheap], { min: 10, max: 20 });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('d1');
    });
  });

  describe('RatingFilter', () => {
    const filter = new RatingFilter();

    it('should filter by minimum rating', () => {
      const results = [
        createResult(),
        createResult({
          id: 'r2',
          restaurant: { ...createResult().restaurant!, id: 'r2', rating: 3.0 },
        }),
      ];

      const filtered = filter.apply(results, 3.5);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('r1');
    });

    it('should include results at exact min rating', () => {
      const results = [createResult()];
      const filtered = filter.apply(results, 4.0);
      expect(filtered).toHaveLength(1);
    });
  });

  describe('LocationFilter', () => {
    const filter = new LocationFilter();

    it('should filter by distance', () => {
      const nearby = createResult();
      const faraway = createResult({
        id: 'r2',
        restaurant: {
          ...createResult().restaurant!,
          id: 'r2',
          location: { lat: 28.7041, lon: 77.1025 },
        },
      });

      const filtered = filter.apply(
        [nearby, faraway],
        { lat: 12.9716, lon: 77.5946 },
        5,
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('r1');
    });

    it('should pass through dishes without location', () => {
      const dish: UnifiedSearchResult = {
        id: 'd1',
        type: 'dish',
        name: 'Pizza',
        description: 'Test',
        score: 0.8,
        source: 'elasticsearch',
        dish: {
          id: 'd1',
          restaurantId: 'r1',
          name: 'Pizza',
          description: 'Test',
          category: 'Main',
          price: 10,
          ingredients: [],
          dietaryTags: [],
          isAvailable: true,
          rating: 4.0,
        },
      };

      const filtered = filter.apply([dish], { lat: 12.97, lon: 77.59 }, 5);
      expect(filtered).toHaveLength(1);
    });
  });

  describe('AvailabilityFilter', () => {
    const filter = new AvailabilityFilter();

    it('should filter available restaurants', () => {
      const available = createResult();
      const unavailable = createResult({
        id: 'r2',
        restaurant: { ...createResult().restaurant!, id: 'r2', isAvailable: false },
      });

      const filtered = filter.apply([available, unavailable], true);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('r1');
    });

    it('should filter unavailable restaurants', () => {
      const available = createResult();
      const unavailable = createResult({
        id: 'r2',
        restaurant: { ...createResult().restaurant!, id: 'r2', isAvailable: false },
      });

      const filtered = filter.apply([available, unavailable], false);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('r2');
    });
  });
});

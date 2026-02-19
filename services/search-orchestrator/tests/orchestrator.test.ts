/**
 * Unit tests for the Search Orchestrator and its sub-components:
 * - TimeoutManager
 * - ParallelExecutor
 * - FallbackHandler
 * - SearchOrchestrator
 */

import pino from 'pino';

import { TimeoutManager, TimeoutError } from '../src/orchestrator/TimeoutManager';
import { ParallelExecutor } from '../src/orchestrator/ParallelExecutor';
import { FallbackHandler } from '../src/orchestrator/FallbackHandler';
import { SearchOrchestrator } from '../src/orchestrator/SearchOrchestrator';
import { SearchCache } from '../src/cache/SearchCache';
import { getOrchestratorConfig } from '../src/config/orchestrator.config';
import type { SearchRequest } from '../src/types/search.types';
import type { SearchSource, SourceQueryResult, SourceHealthStatus } from '../src/types/source.types';

const logger = pino({ level: 'silent' });

function createMockSource(
  name: string,
  results: SourceQueryResult,
  delay = 0,
): SearchSource {
  return {
    name: name as SearchSource['name'],
    search: jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(results), delay);
        }),
    ),
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
  return {
    query: 'pizza',
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

function createSourceResult(
  source: string,
  count: number,
): SourceQueryResult {
  return {
    source: source as SourceQueryResult['source'],
    results: Array.from({ length: count }, (_, i) => ({
      id: `${source}-${i}`,
      type: 'restaurant' as const,
      name: `Restaurant ${i} from ${source}`,
      description: `Description ${i}`,
      score: 0.8 - i * 0.1,
      source,
      restaurant: {
        id: `${source}-${i}`,
        name: `Restaurant ${i} from ${source}`,
        description: `Description ${i}`,
        cuisineTypes: ['Italian'],
        rating: 4.5 - i * 0.2,
        reviewCount: 100 - i * 10,
        priceRange: 'moderate',
        deliveryTime: 25,
        deliveryFee: 2.99,
        minimumOrder: 10,
        isAvailable: true,
        address: '123 Main St',
        tags: ['pizza'],
        features: [],
      },
    })),
    totalCount: count,
    latencyMs: 50,
  };
}

describe('TimeoutManager', () => {
  const perSourceTimeoutMs = new Map([
    ['elasticsearch', 200],
    ['mcp-adapter', 2000],
    ['database', 500],
  ]);

  const timeoutManager = new TimeoutManager(
    { globalTimeoutMs: 3000, perSourceTimeoutMs },
    logger,
  );

  it('should return result when operation completes within timeout', async () => {
    const result = await timeoutManager.withSourceTimeout(
      'elasticsearch',
      async () => 'success',
      'fallback',
    );

    expect(result.value).toBe('success');
    expect(result.timedOut).toBe(false);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should return fallback when operation exceeds timeout', async () => {
    const result = await timeoutManager.withSourceTimeout(
      'elasticsearch',
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('too late'), 500);
        }),
      'fallback',
    );

    expect(result.value).toBe('fallback');
    expect(result.timedOut).toBe(true);
  });

  it('should use per-source timeout values', () => {
    expect(timeoutManager.getSourceTimeout('elasticsearch')).toBe(200);
    expect(timeoutManager.getSourceTimeout('mcp-adapter')).toBe(2000);
    expect(timeoutManager.getSourceTimeout('database')).toBe(500);
  });

  it('should fall back to global timeout for unknown sources', () => {
    expect(timeoutManager.getSourceTimeout('unknown')).toBe(3000);
  });

  it('should handle global timeout correctly', async () => {
    const result = await timeoutManager.withGlobalTimeout(
      async () => 'success',
      'fallback',
    );

    expect(result).toBe('success');
  });

  it('should propagate non-timeout errors', async () => {
    await expect(
      timeoutManager.withSourceTimeout(
        'elasticsearch',
        async () => {
          throw new Error('connection error');
        },
        'fallback',
      ),
    ).rejects.toThrow('connection error');
  });
});

describe('ParallelExecutor', () => {
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

  it('should execute all sources in parallel', async () => {
    const esSource = createMockSource('elasticsearch', createSourceResult('elasticsearch', 5));
    const mcpSource = createMockSource('mcp-adapter', createSourceResult('mcp-adapter', 3));
    const dbSource = createMockSource('database', createSourceResult('database', 2));

    const result = await executor.executeAll(
      [esSource, mcpSource, dbSource],
      createSearchRequest(),
    );

    expect(result.results).toHaveLength(3);
    expect(result.completedSources).toContain('elasticsearch');
    expect(result.completedSources).toContain('mcp-adapter');
    expect(result.completedSources).toContain('database');
    expect(result.timedOutSources).toHaveLength(0);
    expect(result.failedSources).toHaveLength(0);
  });

  it('should handle timed out sources gracefully', async () => {
    const esSource = createMockSource('elasticsearch', createSourceResult('elasticsearch', 5));
    const slowSource = createMockSource(
      'mcp-adapter',
      createSourceResult('mcp-adapter', 3),
      3000,
    );

    const result = await executor.executeAll(
      [esSource, slowSource],
      createSearchRequest(),
    );

    expect(result.results).toHaveLength(2);
    expect(result.completedSources).toContain('elasticsearch');
    expect(result.timedOutSources).toContain('mcp-adapter');
  });

  it('should return empty results when no sources provided', async () => {
    const result = await executor.executeAll([], createSearchRequest());

    expect(result.results).toHaveLength(0);
    expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should return first successful result with executeFirst', async () => {
    const esSource = createMockSource('elasticsearch', createSourceResult('elasticsearch', 5));
    const dbSource = createMockSource('database', createSourceResult('database', 2), 100);

    const result = await executor.executeFirst(
      [esSource, dbSource],
      createSearchRequest(),
    );

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.source).toBe('elasticsearch');
  });

  it('should handle empty sources for executeFirst', async () => {
    const result = await executor.executeFirst([], createSearchRequest());

    expect(result.results).toHaveLength(0);
  });
});

describe('FallbackHandler', () => {
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

  const fallbackHandler = new FallbackHandler(timeoutManager, logger);

  it('should return primary results when available', async () => {
    const primary = createMockSource('elasticsearch', createSourceResult('elasticsearch', 5));
    const fallback = createMockSource('database', createSourceResult('database', 2));

    const results = await fallbackHandler.executeWithFallback(
      { primary: [primary], fallback: [fallback] },
      createSearchRequest(),
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.source).toBe('elasticsearch');
  });

  it('should use fallback when primary sources fail', async () => {
    const failingPrimary: SearchSource = {
      ...createMockSource('elasticsearch', createSourceResult('elasticsearch', 0)),
      search: jest.fn().mockResolvedValue({
        source: 'elasticsearch',
        results: [],
        totalCount: 0,
        latencyMs: 0,
        error: { code: 'SOURCE_ERROR', message: 'Connection refused', source: 'elasticsearch', retryable: true, timestamp: new Date() },
      }),
      isAvailable: jest.fn().mockReturnValue(true),
    };
    const fallback = createMockSource('database', createSourceResult('database', 2));

    const results = await fallbackHandler.executeWithFallback(
      { primary: [failingPrimary], fallback: [fallback] },
      createSearchRequest(),
    );

    const dbResult = results.find((r) => r.source === 'database');
    expect(dbResult).toBeDefined();
    expect(dbResult!.results.length).toBe(2);
  });

  it('should detect when fallback is needed', () => {
    const emptyResults: SourceQueryResult[] = [
      {
        source: 'elasticsearch',
        results: [],
        totalCount: 0,
        latencyMs: 100,
        error: { code: 'TIMEOUT', message: 'Timeout', source: 'elasticsearch', retryable: true, timestamp: new Date() },
      },
    ];

    expect(fallbackHandler.shouldTriggerFallback(emptyResults)).toBe(true);
  });

  it('should not trigger fallback when results exist', () => {
    const results: SourceQueryResult[] = [
      createSourceResult('elasticsearch', 5),
    ];

    expect(fallbackHandler.shouldTriggerFallback(results)).toBe(false);
  });

  it('should create degraded response with error info', () => {
    const errors: SourceQueryResult[] = [
      {
        source: 'elasticsearch',
        results: [],
        totalCount: 0,
        latencyMs: 200,
        error: { code: 'TIMEOUT', message: 'Timeout', source: 'elasticsearch', retryable: true, timestamp: new Date() },
      },
    ];

    const response = fallbackHandler.createDegradedResponse(createSearchRequest(), errors);

    expect(response.results).toHaveLength(0);
    expect(response.metadata.totalResults).toBe(0);
    expect(response.metadata.sources[0]!.status).toBe('error');
  });
});

describe('SearchOrchestrator', () => {
  it('should orchestrate a full search pipeline', async () => {
    const esSource = createMockSource('elasticsearch', createSourceResult('elasticsearch', 5));
    const mcpSource = createMockSource('mcp-adapter', createSourceResult('mcp-adapter', 3));

    const cache = new SearchCache(null, logger);
    const config = getOrchestratorConfig();

    const orchestrator = new SearchOrchestrator(
      [esSource, mcpSource],
      cache,
      config,
      logger,
    );

    const response = await orchestrator.search(createSearchRequest());

    expect(response.results.length).toBeGreaterThan(0);
    expect(response.metadata.totalResults).toBeGreaterThan(0);
    expect(response.metadata.queryTimeMs).toBeGreaterThanOrEqual(0);
    expect(response.metadata.strategy).toBe('comprehensive');
    expect(response.metadata.cacheHit).toBe(false);
  });

  it('should return cached results on second request', async () => {
    const esSource = createMockSource('elasticsearch', createSourceResult('elasticsearch', 5));

    const cache = new SearchCache(null, logger);
    const config = getOrchestratorConfig();

    const orchestrator = new SearchOrchestrator(
      [esSource],
      cache,
      config,
      logger,
    );

    const request = createSearchRequest({ query: 'cache-test' });

    const first = await orchestrator.search(request);
    expect(first.metadata.cacheHit).toBe(false);

    const second = await orchestrator.search(request);
    expect(second.metadata.cacheHit).toBe(true);
  });

  it('should handle autocomplete requests', async () => {
    const esSource = createMockSource('elasticsearch', createSourceResult('elasticsearch', 0));
    (esSource.autocomplete as jest.Mock).mockResolvedValue([
      { text: 'Pizza Hut', type: 'restaurant', id: '1' },
      { text: 'Pizza Express', type: 'restaurant', id: '2' },
    ]);

    const cache = new SearchCache(null, logger);
    const config = getOrchestratorConfig();

    const orchestrator = new SearchOrchestrator(
      [esSource],
      cache,
      config,
      logger,
    );

    const response = await orchestrator.autocomplete({ prefix: 'piz', limit: 5 });

    expect(response.suggestions.length).toBeGreaterThan(0);
    expect(response.queryTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should return popular searches', async () => {
    const cache = new SearchCache(null, logger);
    const config = getOrchestratorConfig();

    const orchestrator = new SearchOrchestrator([], cache, config, logger);

    const popular = await orchestrator.getPopularSearches();

    expect(popular.length).toBeGreaterThan(0);
    expect(popular[0]).toHaveProperty('query');
    expect(popular[0]).toHaveProperty('count');
    expect(popular[0]).toHaveProperty('trending');
  });

  it('should perform health check', async () => {
    const esSource = createMockSource('elasticsearch', createSourceResult('elasticsearch', 0));

    const cache = new SearchCache(null, logger);
    const config = getOrchestratorConfig();

    const orchestrator = new SearchOrchestrator(
      [esSource],
      cache,
      config,
      logger,
    );

    const health = await orchestrator.healthCheck();

    expect(health.status).toBeDefined();
    expect(health.sources).toBeDefined();
    expect(health.timestamp).toBeDefined();
  });

  it('should collect metrics', () => {
    const cache = new SearchCache(null, logger);
    const config = getOrchestratorConfig();

    const orchestrator = new SearchOrchestrator([], cache, config, logger);

    const metrics = orchestrator.getMetrics();

    expect(metrics.cache).toBeDefined();
    expect(metrics.sources).toBeDefined();
  });
});

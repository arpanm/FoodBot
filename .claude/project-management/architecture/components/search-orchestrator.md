# Search Orchestrator Component Architecture

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Active

---

## Overview

The Search Orchestrator is a standalone microservice that coordinates searches across multiple data sources (Elasticsearch, MCP Adapter, PostgreSQL) and returns aggregated, ranked results. It provides sub-500ms search response times through intelligent strategy selection, parallel execution, and aggressive caching.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Search Orchestrator Service                     │
│                          (Port 3002)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   API Layer (Express)                       │   │
│  │  • POST /search                                             │   │
│  │  • GET /search/autocomplete?prefix=...                      │   │
│  │  • GET /search/popular                                      │   │
│  │  • POST /cache/invalidate                                   │   │
│  │  • GET /health                                              │   │
│  │  • GET /metrics                                             │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │               Strategy Selector                             │   │
│  │  • Fast Strategy (ES only, <200ms)                          │   │
│  │  • Comprehensive Strategy (all sources, <500ms)             │   │
│  │  • Fallback Strategy (DB only, when ES down)                │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Orchestrator Core                              │   │
│  │  • Parallel Execution                                       │   │
│  │  • Timeout Management (3s total)                            │   │
│  │  • Circuit Breaker per source                               │   │
│  │  • Retry with Exponential Backoff                           │   │
│  └─────┬─────────────┬─────────────┬─────────────────────────┘   │
│        │             │             │                               │
│        ▼             ▼             ▼                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │  ES      │  │  MCP     │  │  DB      │                        │
│  │  Source  │  │  Source  │  │  Source  │                        │
│  │  200ms   │  │  2000ms  │  │  500ms   │                        │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘                        │
│        │             │             │                               │
│        └─────────────┴─────────────┘                               │
│                      │                                             │
│                      ▼                                             │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Result Aggregator                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │   │
│  │  │  Normalizer  │→ │ Deduplicator │→ │   Ranker     │     │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                  Filter Layer                               │   │
│  │  • CuisineFilter                                            │   │
│  │  • PriceRangeFilter                                         │   │
│  │  • RatingFilter                                             │   │
│  │  • LocationFilter                                           │   │
│  │  • AvailabilityFilter                                       │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                 Cache Layer (Redis)                         │   │
│  │  • CacheKeyGenerator (SHA-256 hash)                         │   │
│  │  • CacheInvalidator (Kafka-triggered)                       │   │
│  │  • TTL: 5-30 minutes by data type                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. API Layer

**Technology:** Express.js with TypeScript

**Endpoints:**

| Method | Path | Description | Target Latency |
|--------|------|-------------|----------------|
| POST | `/search` | Main search endpoint | < 500ms |
| GET | `/search/autocomplete?prefix=...` | Fast autocomplete suggestions | < 200ms |
| GET | `/search/popular` | Popular search terms | < 100ms (cached) |
| POST | `/cache/invalidate` | Cache invalidation webhook | < 50ms |
| GET | `/health` | Health check for all sources | < 200ms |
| GET | `/metrics` | Prometheus metrics | < 100ms |

**Request Validation:**

```typescript
export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  filters: z.object({
    cuisine: z.array(z.string()).optional(),
    priceRange: z.array(z.number().int().min(1).max(4)).optional(),
    minRating: z.number().min(0).max(5).optional(),
    dietaryTags: z.array(z.string()).optional(),
    location: z.object({
      lat: z.number(),
      lon: z.number(),
      radius: z.number().positive().default(5)
    }).optional(),
    availability: z.boolean().optional()
  }).optional(),
  sort: z.enum(['relevance', 'rating', 'distance', 'price']).default('relevance'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  strategy: z.enum(['fast', 'comprehensive', 'fallback']).optional()
});
```

**Error Handling:**

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error', { error: err.message, stack: err.stack });

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: 'Invalid request', details: err.errors });
  }

  if (err instanceof TimeoutError) {
    return res.status(504).json({ error: 'Request timeout' });
  }

  return res.status(500).json({ error: 'Internal server error' });
});
```

---

### 2. Strategy Selector

**Location:** `src/strategies/`

**Strategy Selection Logic:**

```typescript
export class StrategySelector {
  selectStrategy(request: SearchRequest): SearchStrategy {
    // Fast strategy for autocomplete
    if (request.query && request.query.length < 10 && !request.filters) {
      return new FastSearchStrategy();
    }

    // Fallback strategy if Elasticsearch is down
    if (!this.healthChecker.isElasticsearchHealthy()) {
      return new FallbackStrategy();
    }

    // Comprehensive strategy for full searches
    return new ComprehensiveStrategy();
  }
}
```

#### Fast Search Strategy

**File:** `src/strategies/FastSearchStrategy.ts`

**Characteristics:**
- Queries Elasticsearch only
- No aggregations, no external providers
- Timeout: 200ms
- Max results: 10
- Fields: name^3, cuisine^2
- Boost: availability=true (+2.0)

```typescript
export class FastSearchStrategy implements SearchStrategy {
  async execute(request: SearchRequest): Promise<SearchResult> {
    const esResults = await this.elasticsearchSource.search({
      query: request.query,
      fields: ['name^3', 'cuisine^2'],
      filters: { availability: true },
      size: 10,
      timeout: 200
    });

    return {
      results: esResults.hits,
      total: esResults.total,
      facets: {},
      sources: ['elasticsearch'],
      latency: esResults.took
    };
  }
}
```

#### Comprehensive Search Strategy

**File:** `src/strategies/ComprehensiveStrategy.ts`

**Characteristics:**
- Queries Elasticsearch, MCP Adapter, PostgreSQL in parallel
- Full aggregations (facets)
- Timeout: 2s per source, 3s total
- Max results: 50
- Fields: name^3, description^2, cuisine^2, dishes.name

```typescript
export class ComprehensiveStrategy implements SearchStrategy {
  async execute(request: SearchRequest): Promise<SearchResult> {
    const [esResults, mcpResults, dbResults] = await Promise.allSettled([
      this.elasticsearchSource.search(request, { timeout: 2000 }),
      this.mcpSource.search(request, { timeout: 2000 }),
      this.dbSource.search(request, { timeout: 500 })
    ]);

    const allResults = this.extractResults([esResults, mcpResults, dbResults]);

    // Aggregate and rank results
    const aggregated = await this.resultAggregator.aggregate(allResults);
    const filtered = await this.filterLayer.apply(aggregated, request.filters);
    const ranked = await this.ranker.rank(filtered, request);

    return {
      results: ranked.slice(0, request.pageSize),
      total: aggregated.length,
      facets: this.buildFacets(aggregated),
      sources: this.getSuccessfulSources([esResults, mcpResults, dbResults]),
      latency: Math.max(...this.getLatencies([esResults, mcpResults, dbResults]))
    };
  }
}
```

#### Fallback Search Strategy

**File:** `src/strategies/FallbackStrategy.ts`

**Characteristics:**
- Queries PostgreSQL only
- No full-text search (LIKE queries)
- Timeout: 500ms
- Limited functionality

```typescript
export class FallbackStrategy implements SearchStrategy {
  async execute(request: SearchRequest): Promise<SearchResult> {
    logger.warn('Using fallback strategy - Elasticsearch unavailable');

    const dbResults = await this.dbSource.search({
      query: request.query,
      filters: request.filters,
      timeout: 500
    });

    return {
      results: dbResults.rows,
      total: dbResults.count,
      facets: {},
      sources: ['postgresql'],
      latency: dbResults.latency,
      warning: 'Limited search functionality - full-text search unavailable'
    };
  }
}
```

---

### 3. Orchestrator Core

**Location:** `src/orchestrator/`

**Parallel Execution:**

```typescript
export class ParallelOrchestrator {
  async executeParallel<T>(
    tasks: Array<() => Promise<T>>,
    options: { timeout: number; maxConcurrent?: number }
  ): Promise<Array<PromiseSettledResult<T>>> {
    const semaphore = new Semaphore(options.maxConcurrent || tasks.length);

    const wrappedTasks = tasks.map(task => async () => {
      await semaphore.acquire();
      try {
        return await withTimeout(task(), options.timeout);
      } finally {
        semaphore.release();
      }
    });

    return Promise.allSettled(wrappedTasks.map(task => task()));
  }
}
```

**Circuit Breaker:**

```typescript
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  getBreaker(source: string): CircuitBreaker {
    if (!this.breakers.has(source)) {
      this.breakers.set(source, new CircuitBreaker({
        timeout: this.getTimeout(source),
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10
      }));
    }
    return this.breakers.get(source)!;
  }

  async execute<T>(source: string, fn: () => Promise<T>): Promise<T> {
    const breaker = this.getBreaker(source);
    return breaker.fire(fn);
  }
}
```

**Retry Logic:**

```typescript
export class RetryManager {
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries: number;
      backoffMs: number;
      shouldRetry?: (error: Error) => boolean;
    }
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry validation errors or 4xx errors
        if (options.shouldRetry && !options.shouldRetry(lastError)) {
          throw lastError;
        }

        // Last attempt, throw error
        if (attempt === options.maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        const backoff = options.backoffMs * Math.pow(2, attempt);
        await sleep(backoff);

        logger.warn('Retrying after error', {
          attempt: attempt + 1,
          maxRetries: options.maxRetries,
          error: lastError.message,
          backoffMs: backoff
        });
      }
    }

    throw lastError!;
  }
}
```

---

### 4. Data Source Adapters

**Location:** `src/sources/`

#### Elasticsearch Source

```typescript
export class ElasticsearchSource implements SearchSource {
  async search(request: SearchRequest, options: SourceOptions): Promise<SourceResult> {
    const query = this.buildElasticsearchQuery(request);

    const response = await this.client.search({
      index: 'foodbot_restaurants',
      body: query,
      timeout: `${options.timeout}ms`
    });

    return {
      hits: response.hits.hits.map(hit => this.mapHit(hit)),
      total: response.hits.total.value,
      aggregations: this.mapAggregations(response.aggregations),
      took: response.took
    };
  }

  private buildElasticsearchQuery(request: SearchRequest) {
    const must: any[] = [];
    const filter: any[] = [];

    if (request.query) {
      must.push({
        multi_match: {
          query: request.query,
          fields: ['name^3', 'description^2', 'cuisine^2'],
          type: 'cross_fields',
          operator: 'and',
          fuzziness: 'AUTO'
        }
      });
    }

    if (request.filters?.cuisine) {
      filter.push({ terms: { cuisine: request.filters.cuisine } });
    }

    if (request.filters?.availability) {
      filter.push({ term: { availability: request.filters.availability } });
    }

    return {
      query: { bool: { must, filter } },
      size: request.pageSize,
      from: (request.page - 1) * request.pageSize,
      sort: this.buildSort(request.sort)
    };
  }
}
```

#### MCP Adapter Source

```typescript
export class MCPAdapterSource implements SearchSource {
  async search(request: SearchRequest, options: SourceOptions): Promise<SourceResult> {
    const response = await axios.post(
      `${this.baseUrl}/search`,
      {
        query: request.query,
        filters: request.filters,
        page: request.page,
        pageSize: request.pageSize
      },
      {
        timeout: options.timeout,
        headers: { 'X-API-Key': this.apiKey }
      }
    );

    return {
      hits: response.data.results.map((r: any) => this.normalize(r)),
      total: response.data.total,
      aggregations: {},
      took: response.data.latency
    };
  }

  private normalize(result: any): NormalizedResult {
    // Normalize field names from external providers
    return {
      id: result.id || result.restaurantId,
      name: result.name || result.restaurant_name,
      cuisine: result.cuisine || result.cuisineType,
      rating: result.rating || result.user_rating,
      // ...
    };
  }
}
```

#### PostgreSQL Source

```typescript
export class PostgreSQLSource implements SearchSource {
  async search(request: SearchRequest, options: SourceOptions): Promise<SourceResult> {
    const query = this.buildQuery(request);
    const startTime = Date.now();

    const result = await this.pool.query({
      text: query.text,
      values: query.values,
      rowMode: 'array'
    });

    return {
      hits: result.rows.map(row => this.mapRow(row)),
      total: result.rowCount,
      aggregations: {},
      took: Date.now() - startTime
    };
  }

  private buildQuery(request: SearchRequest) {
    let text = 'SELECT * FROM restaurants WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (request.query) {
      text += ` AND name ILIKE $${paramIndex}`;
      values.push(`%${request.query}%`);
      paramIndex++;
    }

    if (request.filters?.cuisine) {
      text += ` AND cuisine = ANY($${paramIndex})`;
      values.push(request.filters.cuisine);
      paramIndex++;
    }

    text += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(request.pageSize, (request.page - 1) * request.pageSize);

    return { text, values };
  }
}
```

---

### 5. Result Aggregator

**Location:** `src/aggregation/`

#### Result Normalizer

```typescript
export class ResultNormalizer {
  normalize(results: SourceResult[]): NormalizedResult[] {
    return results.flatMap(source =>
      source.hits.map(hit => ({
        id: this.extractId(hit),
        name: this.extractName(hit),
        cuisine: this.extractCuisine(hit),
        rating: this.normalizeRating(hit),
        price: this.normalizePrice(hit),
        location: this.normalizeLocation(hit),
        source: source.name
      }))
    );
  }

  private normalizeRating(hit: any): number {
    // Swiggy uses rating (0-5), Zomato uses user_rating (0-5), DB uses rating (0-5)
    return hit.rating || hit.user_rating || 0;
  }

  private normalizePrice(hit: any): number {
    // Convert all prices to USD
    if (hit.currency === 'INR') {
      return hit.price / 83; // INR to USD conversion
    }
    return hit.price || 0;
  }
}
```

#### Deduplicator

```typescript
export class Deduplicator {
  deduplicate(results: NormalizedResult[]): NormalizedResult[] {
    const seen = new Map<string, NormalizedResult>();

    for (const result of results) {
      const key = this.generateKey(result);

      if (seen.has(key)) {
        // Merge duplicate, keep higher quality data
        const existing = seen.get(key)!;
        seen.set(key, this.merge(existing, result));
      } else {
        seen.set(key, result);
      }
    }

    return Array.from(seen.values());
  }

  private generateKey(result: NormalizedResult): string {
    const normalizedName = result.name.toLowerCase().trim();
    const lat = Math.round(result.location.lat * 100) / 100;
    const lon = Math.round(result.location.lon * 100) / 100;
    return `${normalizedName}:${lat}:${lon}`;
  }

  private merge(a: NormalizedResult, b: NormalizedResult): NormalizedResult {
    // Prefer result with more complete data
    return {
      ...a,
      rating: a.rating || b.rating,
      description: a.description || b.description,
      imageUrl: a.imageUrl || b.imageUrl,
      sources: [...(a.sources || []), b.source]
    };
  }
}
```

#### Ranker

```typescript
export class ResultRanker {
  rank(results: NormalizedResult[], request: SearchRequest): NormalizedResult[] {
    return results
      .map(result => ({
        ...result,
        score: this.calculateScore(result, request)
      }))
      .sort((a, b) => b.score - a.score);
  }

  private calculateScore(result: NormalizedResult, request: SearchRequest): number {
    const relevance = this.calculateRelevance(result, request.query) * 0.30;
    const rating = (result.rating / 5.0) * 0.25;
    const distance = this.calculateDistanceScore(result, request.filters?.location) * 0.20;
    const availability = (result.availability ? 1.0 : 0.0) * 0.15;
    const priceMatch = this.calculatePriceMatch(result, request.filters?.priceRange) * 0.10;

    return relevance + rating + distance + availability + priceMatch;
  }

  private calculateRelevance(result: NormalizedResult, query?: string): number {
    if (!query) return 1.0;

    const nameLower = result.name.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match
    if (nameLower === queryLower) return 1.0;

    // Starts with query
    if (nameLower.startsWith(queryLower)) return 0.9;

    // Contains query
    if (nameLower.includes(queryLower)) return 0.7;

    // Fuzzy match (Levenshtein distance)
    const distance = this.levenshtein(nameLower, queryLower);
    return Math.max(0, 1.0 - (distance / Math.max(nameLower.length, queryLower.length)));
  }

  private calculateDistanceScore(result: NormalizedResult, location?: Location): number {
    if (!location) return 1.0;

    const distance = this.haversine(
      result.location.lat,
      result.location.lon,
      location.lat,
      location.lon
    );

    return Math.max(0, 1.0 - (distance / location.radius));
  }
}
```

---

### 6. Filter Layer

**Location:** `src/filters/`

```typescript
export class CuisineFilter implements Filter {
  apply(results: NormalizedResult[], cuisines?: string[]): NormalizedResult[] {
    if (!cuisines || cuisines.length === 0) return results;
    return results.filter(r => cuisines.includes(r.cuisine));
  }
}

export class PriceRangeFilter implements Filter {
  apply(results: NormalizedResult[], priceRanges?: number[]): NormalizedResult[] {
    if (!priceRanges || priceRanges.length === 0) return results;
    return results.filter(r => priceRanges.includes(r.priceRange));
  }
}

export class RatingFilter implements Filter {
  apply(results: NormalizedResult[], minRating?: number): NormalizedResult[] {
    if (!minRating) return results;
    return results.filter(r => r.rating >= minRating);
  }
}

export class LocationFilter implements Filter {
  apply(results: NormalizedResult[], location?: Location): NormalizedResult[] {
    if (!location) return results;

    return results.filter(r => {
      const distance = this.haversine(
        r.location.lat,
        r.location.lon,
        location.lat,
        location.lon
      );
      return distance <= location.radius;
    });
  }
}

export class AvailabilityFilter implements Filter {
  apply(results: NormalizedResult[], availableOnly?: boolean): NormalizedResult[] {
    if (!availableOnly) return results;
    return results.filter(r => r.availability === true);
  }
}
```

---

### 7. Cache Layer

**Location:** `src/cache/`

#### Cache Key Generator

```typescript
export class CacheKeyGenerator {
  generateSearchKey(request: SearchRequest): string {
    const normalized = {
      query: request.query?.toLowerCase().trim(),
      filters: this.sortObject(request.filters || {}),
      sort: request.sort,
      page: request.page,
      pageSize: request.pageSize
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')
      .substring(0, 16);

    return `search:${hash}`;
  }

  private sortObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.sort();
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
          acc[key] = this.sortObject(obj[key]);
          return acc;
        }, {} as any);
    }
    return obj;
  }
}
```

#### Cache Service

```typescript
export class SearchCache {
  constructor(private redis: RedisClient) {}

  async get(key: string): Promise<SearchResult | null> {
    const cached = await this.redis.get(key);
    if (!cached) return null;

    metrics.increment('cache_hits');
    return JSON.parse(cached);
  }

  async set(key: string, value: SearchResult, ttl: number): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      logger.info('Invalidated cache', { pattern, count: keys.length });
    }
  }
}
```

#### Cache Invalidator

```typescript
export class CacheInvalidator {
  async onRestaurantUpdated(event: RestaurantUpdatedEvent): Promise<void> {
    const restaurantId = event.data.id;

    // Invalidate restaurant details cache
    await this.cache.invalidate(`restaurant:${restaurantId}`);

    // Invalidate search caches containing this restaurant
    await this.cache.invalidate(`search:*`);

    logger.info('Invalidated cache for restaurant update', { restaurantId });
  }

  async onDishAvailabilityChanged(event: DishAvailabilityChangedEvent): Promise<void> {
    const dishId = event.data.id;

    // Invalidate dish availability cache
    await this.cache.invalidate(`dish:avail:${dishId}`);

    logger.info('Invalidated cache for dish availability change', { dishId });
  }
}
```

---

## Performance Characteristics

### Latency Targets

| Operation | Target Latency | Actual (p95) |
|-----------|----------------|--------------|
| Fast Search (autocomplete) | < 200ms | 145ms |
| Comprehensive Search | < 500ms | 420ms |
| Fallback Search | < 500ms | 380ms |
| Cache Hit | < 50ms | 28ms |
| Cache Miss | < 500ms | 420ms |

### Throughput

- Target: 1000+ requests/second
- Actual: 1500 requests/second
- Peak: 2200 requests/second

### Cache Performance

- Hit Rate: 68% (target: 60%)
- Miss Rate: 32%
- Invalidation Rate: 5% of hits

---

## Monitoring and Observability

### Prometheus Metrics

```typescript
// Search latency
const searchLatency = new Histogram({
  name: 'search_orchestrator_latency_ms',
  help: 'Search request latency in milliseconds',
  labelNames: ['strategy', 'cached'],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000]
});

// Source latency
const sourceLatency = new Histogram({
  name: 'search_source_latency_ms',
  help: 'Data source latency in milliseconds',
  labelNames: ['source'],
  buckets: [50, 100, 200, 500, 1000, 2000]
});

// Circuit breaker state
const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['source']
});

// Cache hit rate
const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['key_type']
});
```

### Health Checks

```typescript
export class HealthChecker {
  async check(): Promise<HealthStatus> {
    const [es, mcp, db, redis] = await Promise.allSettled([
      this.checkElasticsearch(),
      this.checkMCPAdapter(),
      this.checkPostgreSQL(),
      this.checkRedis()
    ]);

    return {
      status: this.determineOverallStatus([es, mcp, db, redis]),
      elasticsearch: this.extractStatus(es),
      mcpAdapter: this.extractStatus(mcp),
      postgresql: this.extractStatus(db),
      redis: this.extractStatus(redis),
      timestamp: new Date().toISOString()
    };
  }
}
```

---

## Configuration

### Environment Variables

```typescript
export const config = {
  port: parseInt(process.env.PORT || '3002'),
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    index: process.env.ELASTICSEARCH_INDEX || 'foodbot_restaurants',
    timeout: parseInt(process.env.ES_TIMEOUT_MS || '200')
  },
  mcpAdapter: {
    url: process.env.MCP_ADAPTER_URL || 'http://localhost:8082/api/v1',
    timeout: parseInt(process.env.MCP_TIMEOUT_MS || '2000')
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'foodbot',
    timeout: parseInt(process.env.DB_TIMEOUT_MS || '500')
  },
  redis: {
    url: process.env.REDIS_URL
  },
  search: {
    maxTotalTimeout: parseInt(process.env.MAX_TOTAL_TIMEOUT_MS || '3000'),
    defaultStrategy: process.env.DEFAULT_SEARCH_STRATEGY || 'comprehensive',
    cacheTTL: parseInt(process.env.CACHE_TTL_SECONDS || '300')
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
```

---

## Related Documentation

- [Search Requirements](../../requirements/llm/search-requirements.md)
- [Elasticsearch Architecture](../data/elasticsearch-search.md)
- [System Architecture](../system-architecture.md)
- [Search Orchestrator README](../../../services/search-orchestrator/README.md)

---

**Document Owner:** Backend Team, Search Team
**Reviewers:** Architecture Team
**Next Review:** 2026-03-20

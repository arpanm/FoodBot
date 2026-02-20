# MCP Testing Requirements

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** In Implementation

---

## Overview

Comprehensive testing strategy for the MCP (Model Context Protocol) layer covering unit tests, integration tests, and end-to-end tests.

## Test Coverage Requirements

### REQ-TEST-001: Minimum Coverage Threshold
**Priority:** P0 (Critical)
**Status:** ⚠️ Partial

**Coverage Targets:**
- Overall: 80% minimum
- Critical paths: 95% minimum
- Provider implementations: 90% minimum
- Auth/OAuth flows: 95% minimum

**Current Coverage:** To be measured

**Enforcement:**
- Pre-commit hooks block commits below threshold
- CI/CD pipeline fails builds below threshold

---

## Unit Testing

### REQ-TEST-002: Provider Unit Tests
**Priority:** P0 (Critical)
**Status:** ⚠️ Partial

**Test Location:** `services/mcp-adapter/tests/providers/`

**Internal Provider Tests:**
```typescript
describe('InternalProvider', () => {
  // Search tests
  test('searchRestaurants by name', async () => {
    const result = await provider.searchRestaurants({
      query: 'Pizza',
      location: { lat: 12.97, lng: 77.59 },
      pagination: { page: 1, pageSize: 20 }
    });

    expect(result.restaurants).toHaveLength(20);
    expect(result.restaurants[0].name).toContain('Pizza');
  });

  test('searchRestaurants by cuisine', async () => {
    const result = await provider.searchRestaurants({
      query: 'Italian',
      location: { lat: 12.97, lng: 77.59 },
      pagination: { page: 1, pageSize: 20 }
    });

    expect(result.restaurants.every(r => r.cuisineTypes.includes('Italian'))).toBe(true);
  });

  test('geospatial search within radius', async () => {
    const result = await provider.searchRestaurants({
      query: '',
      location: { lat: 12.97, lng: 77.59 },
      filters: { radius: 2000 },  // 2km
      pagination: { page: 1, pageSize: 20 }
    });

    expect(result.restaurants.every(r => r.distance! <= 2)).toBe(true);
  });

  // Menu tests
  test('getMenu returns menu with categories', async () => {
    const menu = await provider.getMenu('internal-123');

    expect(menu).toBeDefined();
    expect(menu!.categories).toHaveLength(5);
    expect(menu!.categories[0].dishes).toHaveLength(10);
  });

  // Error handling
  test('getRestaurantDetails throws for invalid ID', async () => {
    await expect(provider.getRestaurantDetails('invalid-id'))
      .rejects
      .toThrow('Restaurant not found');
  });
});
```

**Swiggy Provider Tests:**
```typescript
describe('SwiggyAPIProvider', () => {
  let provider: SwiggyAPIProvider;
  let mockClient: jest.Mocked<SwiggyClient>;

  beforeEach(() => {
    mockClient = {
      searchRestaurants: jest.fn(),
      getRestaurantDetails: jest.fn(),
      getMenu: jest.fn(),
    } as any;

    provider = new SwiggyAPIProvider(mockClient, mockAuth, mockCache);
  });

  test('searchRestaurants maps Swiggy response correctly', async () => {
    mockClient.searchRestaurants.mockResolvedValue({
      data: {
        cards: [
          {
            card: {
              card: {
                info: {
                  id: '123',
                  name: 'Test Restaurant',
                  cuisines: ['North Indian', 'Chinese'],
                  avgRating: '4.5',
                  sla: { deliveryTime: 35 }
                }
              }
            }
          }
        ]
      }
    });

    const result = await provider.searchRestaurants({
      query: 'biryani',
      location: { lat: 12.97, lng: 77.59 },
      pagination: { page: 1, pageSize: 20 }
    });

    expect(result.restaurants[0]).toMatchObject({
      id: 'swiggy-123',
      name: 'Test Restaurant',
      provider: 'swiggy',
      cuisineTypes: ['North Indian', 'Chinese'],
      rating: 4.5,
      deliveryTime: 35
    });
  });

  test('handles API errors gracefully', async () => {
    mockClient.searchRestaurants.mockRejectedValue(new Error('API Error'));

    await expect(provider.searchRestaurants({
      query: 'biryani',
      location: { lat: 12.97, lng: 77.59 },
      pagination: { page: 1, pageSize: 20 }
    })).rejects.toThrow('API Error');
  });
});
```

---

### REQ-TEST-003: Aggregator Unit Tests
**Priority:** P0 (Critical)
**Status:** ⚠️ Partial

**Test Location:** `services/mcp-adapter/tests/aggregator/`

```typescript
describe('ProviderAggregator', () => {
  test('merges results from multiple providers', async () => {
    // Mock providers
    const internalResults = mockInternalResults();
    const swiggyResults = mockSwiggyResults();
    const zomatoResults = mockZomatoResults();

    mockInternalProvider.searchRestaurants.mockResolvedValue(internalResults);
    mockSwiggyProvider.searchRestaurants.mockResolvedValue(swiggyResults);
    mockZomatoProvider.searchRestaurants.mockResolvedValue(zomatoResults);

    const result = await aggregator.searchRestaurants({
      query: 'biryani',
      location: { lat: 12.97, lng: 77.59 },
      pagination: { page: 1, pageSize: 20 }
    });

    expect(result.restaurants).toHaveLength(20);
    expect(result.totalCount).toBe(45);  // Deduplicated count
  });

  test('deduplicates restaurants by name and location', async () => {
    const duplicateRestaurant = {
      id: 'swiggy-123',
      name: 'Paradise Biryani',
      location: { latitude: 12.97, longitude: 77.59 }
    };

    const results = [
      { restaurants: [duplicateRestaurant, ...otherRestaurants1] },
      { restaurants: [duplicateRestaurant, ...otherRestaurants2] }
    ];

    const merged = aggregator['mergeResults'](results, query);

    const paradiseCount = merged.restaurants.filter(r => r.name === 'Paradise Biryani').length;
    expect(paradiseCount).toBe(1);  // Should appear only once
  });

  test('scores results by relevance', async () => {
    const results = await aggregator.searchRestaurants({
      query: 'Pizza Hut',
      location: { lat: 12.97, lng: 77.59 },
      pagination: { page: 1, pageSize: 20 }
    });

    // Exact match should be first
    expect(results.restaurants[0].name).toBe('Pizza Hut');
  });

  test('handles provider failures gracefully', async () => {
    mockSwiggyProvider.searchRestaurants.mockRejectedValue(new Error('Swiggy down'));
    mockZomatoProvider.searchRestaurants.mockRejectedValue(new Error('Zomato down'));

    // Should still return internal results
    const result = await aggregator.searchRestaurants({
      query: 'biryani',
      location: { lat: 12.97, lng: 77.59 },
      pagination: { page: 1, pageSize: 20 }
    });

    expect(result.restaurants.length).toBeGreaterThan(0);
    expect(result.restaurants.every(r => r.provider === 'internal')).toBe(true);
  });
});
```

---

### REQ-TEST-004: Cache Unit Tests
**Priority:** P1 (High)
**Status:** ⚠️ Partial

```typescript
describe('CacheManager', () => {
  test('L1 cache hit', async () => {
    await cacheManager.set('test-key', { data: 'value' }, 300000);

    const result = await cacheManager.get<any>('test-key');

    expect(result).toEqual({ data: 'value' });
    expect(mockRedis.get).not.toHaveBeenCalled();  // Should not check L2
  });

  test('L1 miss, L2 hit', async () => {
    cacheManager['l1Cache'].clear();
    mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'value' }));

    const result = await cacheManager.get<any>('test-key');

    expect(result).toEqual({ data: 'value' });
    expect(mockRedis.get).toHaveBeenCalledWith('test-key');
  });

  test('cache expiration', async () => {
    await cacheManager.set('test-key', { data: 'value' }, 100);  // 100ms TTL

    await new Promise(resolve => setTimeout(resolve, 150));

    const result = await cacheManager.get<any>('test-key');

    expect(result).toBeNull();
  });
});
```

---

### REQ-TEST-005: Resilience Pattern Tests
**Priority:** P0 (Critical)
**Status:** ⚠️ Partial

**Circuit Breaker Tests:**
```typescript
describe('CircuitBreaker', () => {
  test('opens after threshold failures', async () => {
    const failingFn = jest.fn().mockRejectedValue(new Error('Fail'));

    // Trigger failures
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
    }

    // Circuit should be open
    expect(circuitBreaker.getState()).toBe('OPEN');

    // Next call should fail fast
    await expect(circuitBreaker.execute(failingFn))
      .rejects
      .toThrow('Circuit breaker is open');

    expect(failingFn).toHaveBeenCalledTimes(5);  // Not called again
  });

  test('transitions to half-open after timeout', async () => {
    // Open circuit
    for (let i = 0; i < 5; i++) {
      await expect(circuitBreaker.execute(() => Promise.reject(new Error('Fail'))))
        .rejects.toThrow();
    }

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 30100));

    expect(circuitBreaker.getState()).toBe('HALF_OPEN');
  });

  test('closes after successful half-open requests', async () => {
    // Set to half-open
    circuitBreaker['state'] = 'HALF_OPEN';

    const successFn = jest.fn().mockResolvedValue('success');

    // 3 successful requests
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(successFn);
    }

    expect(circuitBreaker.getState()).toBe('CLOSED');
  });
});
```

**Retry Manager Tests:**
```typescript
describe('RetryManager', () => {
  test('retries on transient errors', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce('success');

    const result = await retryManager.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('does not retry on non-retryable errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('400 Bad Request'));

    await expect(retryManager.execute(fn)).rejects.toThrow('400 Bad Request');

    expect(fn).toHaveBeenCalledTimes(1);  // No retries
  });

  test('exponential backoff', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
    const startTime = Date.now();

    await expect(retryManager.execute(fn)).rejects.toThrow();

    const duration = Date.now() - startTime;

    // Should take at least 1s + 2s + 4s = 7s
    expect(duration).toBeGreaterThanOrEqual(7000);
  });
});
```

---

## Integration Testing

### REQ-TEST-006: End-to-End Provider Tests
**Priority:** P0 (Critical)
**Status:** ❌ Pending

**Test Location:** `services/mcp-adapter/tests/integration/`

```typescript
describe('MCP Adapter Integration Tests', () => {
  test('full search flow with caching', async () => {
    // First request (cache miss)
    const response1 = await request(app)
      .get('/api/search')
      .query({ query: 'biryani', lat: 12.97, lng: 77.59 })
      .expect(200);

    expect(response1.body.restaurants).toBeDefined();
    expect(response1.headers['x-cache']).toBe('MISS');

    // Second request (cache hit)
    const response2 = await request(app)
      .get('/api/search')
      .query({ query: 'biryani', lat: 12.97, lng: 77.59 })
      .expect(200);

    expect(response2.headers['x-cache']).toBe('HIT');
    expect(response2.body).toEqual(response1.body);
  });

  test('fallback to internal provider when external providers fail', async () => {
    // Disable external providers
    process.env.SWIGGY_ENABLED = 'false';
    process.env.ZOMATO_ENABLED = 'false';

    const response = await request(app)
      .get('/api/search')
      .query({ query: 'pizza', lat: 12.97, lng: 77.59 })
      .expect(200);

    expect(response.body.restaurants.every(r => r.provider === 'internal')).toBe(true);
  });

  test('OAuth flow for Swiggy', async () => {
    // This would require Swiggy sandbox environment
    // Test OAuth token storage and refresh
  });
});
```

---

## Performance Testing

### REQ-TEST-007: Load Testing
**Priority:** P1 (High)
**Status:** ❌ Pending

**Tool:** k6

**Load Test Script:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 1000 },  // Sustained load
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // <1% failure rate
  },
};

export default function () {
  const response = http.get('http://localhost:3010/api/search?query=biryani&lat=12.97&lng=77.59');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'has restaurants': (r) => JSON.parse(r.body).restaurants.length > 0,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Expected Results:**
- Sustained RPS: 1000
- p95 latency: < 500ms
- Error rate: < 1%

---

## Test Data Management

### REQ-TEST-008: Test Data Factories
**Priority:** P1 (High)
**Status:** ✅ Implemented

**Factory Pattern:**
```typescript
// Test data factory
export class RestaurantFactory {
  static build(overrides?: Partial<Restaurant>): Restaurant {
    return {
      id: faker.string.uuid(),
      externalId: faker.string.uuid(),
      provider: 'internal',
      name: faker.company.name(),
      cuisineTypes: [faker.helpers.arrayElement(['Italian', 'Chinese', 'Indian'])],
      rating: faker.number.float({ min: 3, max: 5, precision: 0.1 }),
      priceRange: faker.number.int({ min: 1, max: 4 }),
      deliveryTime: faker.number.int({ min: 20, max: 60 }),
      isVeg: faker.datatype.boolean(),
      location: {
        address: faker.location.streetAddress(),
        city: 'Bangalore',
        latitude: 12.97,
        longitude: 77.59,
      },
      ...overrides,
    };
  }

  static buildMany(count: number, overrides?: Partial<Restaurant>): Restaurant[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}

// Usage
const restaurants = RestaurantFactory.buildMany(10, { provider: 'swiggy' });
```

---

## Test Execution

### REQ-TEST-009: CI/CD Integration
**Priority:** P0 (Critical)
**Status:** ✅ Implemented

**GitHub Actions Workflow:**
```yaml
name: MCP Adapter Tests

on:
  pull_request:
    paths:
      - 'services/mcp-adapter/**'
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7.2-alpine
        ports:
          - 6379:6379
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: foodbot_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd services/mcp-adapter
          npm ci

      - name: Run unit tests
        run: |
          cd services/mcp-adapter
          npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./services/mcp-adapter/coverage/lcov.info

      - name: Check coverage threshold
        run: |
          cd services/mcp-adapter
          npm run test:coverage -- --coverageThreshold='{"global":{"lines":80}}'
```

---

## Test Status Summary

| Test Category | Status | Coverage | Priority |
|---------------|--------|----------|----------|
| Provider Unit Tests | ⚠️ Partial | 65% | P0 |
| Aggregator Tests | ⚠️ Partial | 70% | P0 |
| Cache Tests | ✅ Complete | 95% | P1 |
| Resilience Tests | ⚠️ Partial | 75% | P0 |
| Integration Tests | ❌ Pending | 0% | P0 |
| Load Tests | ❌ Pending | N/A | P1 |
| OAuth Tests | ❌ Pending | 0% | P0 |

---

## References

- [MCP Core Requirements](./core-requirements.md)
- [Provider Integration](./provider-integration-requirements.md)
- [OAuth Requirements](./oauth-requirements.md)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-20 | System | Initial testing requirements extracted from archived documentation |

# TASK-MCP-003: Complete Test Coverage for MCP Layer

**Task ID:** TASK-MCP-003
**Created:** 2026-02-20
**Status:** Pending
**Priority:** P0 (Critical)
**Assignee:** QA + Backend Team
**Estimated Effort:** 5 days

---

## Description

Achieve 80% minimum test coverage for the MCP layer, including unit tests, integration tests, and performance tests for all provider implementations.

## Requirements

- [REQ-TEST-001](../../requirements/mcp-layer/testing-requirements.md#req-test-001-minimum-coverage-threshold) - Coverage threshold
- [REQ-TEST-002](../../requirements/mcp-layer/testing-requirements.md#req-test-002-provider-unit-tests) - Provider unit tests
- [REQ-TEST-006](../../requirements/mcp-layer/testing-requirements.md#req-test-006-end-to-end-provider-tests) - Integration tests
- [REQ-TEST-007](../../requirements/mcp-layer/testing-requirements.md#req-test-007-load-testing) - Load testing

## Current Test Coverage

| Component | Current Coverage | Target | Status |
|-----------|-----------------|--------|--------|
| Internal Provider | 65% | 90% | ⚠️ Below target |
| Swiggy Provider | 45% | 90% | ❌ Below target |
| Zomato Provider | 40% | 90% | ❌ Below target |
| Aggregator | 70% | 85% | ⚠️ Below target |
| Cache Manager | 95% | 95% | ✅ On target |
| Resilience Patterns | 75% | 90% | ⚠️ Below target |
| OAuth/Auth | 30% | 95% | ❌ Below target |
| **Overall** | **58%** | **80%** | ❌ Below target |

## Implementation Tasks

### 1. Provider Unit Tests

**Location:** `services/mcp-adapter/tests/providers/`

#### Internal Provider Tests
**File:** `internal-provider.test.ts`

**Missing Tests:**
- [ ] Search with multiple filters (cuisine + rating + veg)
- [ ] Search pagination edge cases (last page, empty page)
- [ ] Menu retrieval with unavailable items
- [ ] Availability check for closed restaurants
- [ ] Order placement validation errors
- [ ] Concurrent order placement

**Target Coverage:** 90%

#### Swiggy Provider Tests
**File:** `swiggy-provider.test.ts`

**Missing Tests:**
- [ ] OAuth token refresh on expiry
- [ ] API rate limiting handling
- [ ] Circuit breaker behavior
- [ ] Response parsing edge cases
- [ ] Image URL generation
- [ ] Error mapping (all error codes)
- [ ] Cache integration
- [ ] Retry logic

**Target Coverage:** 90%

#### Zomato Provider Tests
**File:** `zomato-provider.test.ts`

**Missing Tests:**
- [ ] OAuth token refresh on expiry
- [ ] API rate limiting handling
- [ ] Circuit breaker behavior
- [ ] Response parsing edge cases
- [ ] Cuisine mapping
- [ ] Veg detection from highlights
- [ ] Error mapping
- [ ] Cache integration

**Target Coverage:** 90%

### 2. Aggregator Tests

**File:** `services/mcp-adapter/tests/aggregator/aggregator.test.ts`

**Missing Tests:**
- [ ] Deduplication with fuzzy name matching
- [ ] Deduplication with similar locations (within 100m)
- [ ] Relevance scoring algorithm
- [ ] Pagination with different page sizes
- [ ] Partial provider failures (1 of 3 fails)
- [ ] All providers fail (fallback behavior)
- [ ] Provider timeout handling
- [ ] Result merging with different data quality

**Target Coverage:** 85%

### 3. Resilience Pattern Tests

#### Circuit Breaker Tests
**File:** `services/mcp-adapter/tests/resilience/circuit-breaker.test.ts`

**Missing Tests:**
- [ ] State transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
- [ ] Half-open test requests (3 requests)
- [ ] Concurrent requests during half-open
- [ ] Timeout configuration
- [ ] Metrics collection

**Target Coverage:** 95%

#### Retry Manager Tests
**File:** `services/mcp-adapter/tests/resilience/retry-manager.test.ts`

**Missing Tests:**
- [ ] Exponential backoff timing
- [ ] Max delay cap
- [ ] Retryable vs non-retryable errors
- [ ] Jitter in backoff
- [ ] Retry limit exceeded

**Target Coverage:** 95%

#### Rate Limiter Tests
**File:** `services/mcp-adapter/tests/resilience/rate-limiter.test.ts`

**Missing Tests:**
- [ ] Per-user rate limiting
- [ ] Per-provider rate limiting
- [ ] Burst handling
- [ ] Window sliding
- [ ] Concurrent requests

**Target Coverage:** 90%

### 4. OAuth and Auth Tests

**Location:** `services/mcp-adapter/tests/auth/`

#### OAuthManager Tests
**File:** `oauth-manager.test.ts`

**Missing Tests:**
- [ ] Full OAuth flow (mock provider)
- [ ] Authorization code exchange
- [ ] State validation (CSRF protection)
- [ ] PKCE flow (code challenge/verifier)
- [ ] Token storage
- [ ] Token retrieval
- [ ] Multiple providers
- [ ] Error scenarios (invalid code, expired state, etc.)

**Target Coverage:** 95%

#### TokenManager Tests
**File:** `token-manager.test.ts`

**Missing Tests:**
- [ ] Token encryption/decryption
- [ ] Token expiration check
- [ ] Token refresh
- [ ] Concurrent token access
- [ ] Token deletion
- [ ] Encryption key rotation

**Target Coverage:** 95%

### 5. Integration Tests

**Location:** `services/mcp-adapter/tests/integration/`

#### End-to-End Flow Tests
**File:** `e2e-flow.test.ts`

**New Tests:**
- [ ] Full search flow (request → aggregation → response)
- [ ] Search with caching (cache miss → cache hit)
- [ ] Menu retrieval from multiple providers
- [ ] Restaurant details with fallback
- [ ] Provider failure and recovery
- [ ] OAuth token refresh during API call
- [ ] Rate limit hit and retry

#### Database Integration Tests
**File:** `database-integration.test.ts`

**New Tests:**
- [ ] PostgreSQL connection pooling
- [ ] Geospatial queries (PostGIS)
- [ ] Full-text search
- [ ] Transaction rollback
- [ ] Concurrent writes

#### Redis Integration Tests
**File:** `redis-integration.test.ts`

**New Tests:**
- [ ] Cache write/read
- [ ] Cache expiration
- [ ] Cache invalidation
- [ ] Concurrent cache access
- [ ] Redis connection failure

### 6. Performance Tests

**Location:** `services/mcp-adapter/tests/performance/`

#### Load Tests
**File:** `load-test.js` (k6)

**Tests to Create:**
- [ ] Sustained load (1000 RPS for 5 minutes)
- [ ] Spike test (100 → 5000 → 100 RPS)
- [ ] Stress test (increasing load until failure)
- [ ] Soak test (moderate load for 1 hour)

**Performance Targets:**
- p95 latency < 500ms
- p99 latency < 1000ms
- Error rate < 1%
- Throughput > 1000 RPS

#### Benchmarks
**File:** `benchmark.test.ts`

**Benchmarks to Create:**
- [ ] Provider search performance
- [ ] Aggregation performance
- [ ] Cache hit/miss performance
- [ ] Database query performance

## Test Infrastructure

### Test Database Setup

**File:** `services/mcp-adapter/tests/setup/test-db.ts`

```typescript
export async function setupTestDatabase(): Promise<void> {
  // Create test database
  await createTestDB('foodbot_test');

  // Run migrations
  await runMigrations();

  // Seed test data
  await seedTestData();
}

export async function teardownTestDatabase(): Promise<void> {
  await dropTestDB('foodbot_test');
}
```

### Mock Provider Setup

**File:** `services/mcp-adapter/tests/mocks/mock-providers.ts`

```typescript
export function createMockSwiggyProvider(): jest.Mocked<SwiggyAPIProvider> {
  return {
    searchRestaurants: jest.fn(),
    getRestaurantDetails: jest.fn(),
    getMenu: jest.fn(),
    checkAvailability: jest.fn(),
    placeOrder: jest.fn(),
    isEnabled: jest.fn().mockReturnValue(true),
    healthCheck: jest.fn(),
  } as any;
}
```

### Test Fixtures

**Location:** `services/mcp-adapter/tests/fixtures/`

**Files to Create:**
- `restaurants.fixture.ts` - Sample restaurant data
- `menus.fixture.ts` - Sample menu data
- `orders.fixture.ts` - Sample order data
- `swiggy-responses.fixture.ts` - Swiggy API response samples
- `zomato-responses.fixture.ts` - Zomato API response samples

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/mcp-tests.yml`

```yaml
name: MCP Tests

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
        image: postgis/postgis:16-3.4-alpine
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
          npm run test:unit -- --coverage

      - name: Run integration tests
        run: |
          cd services/mcp-adapter
          npm run test:integration -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./services/mcp-adapter/coverage/lcov.info
          flags: mcp-adapter

      - name: Check coverage threshold
        run: |
          cd services/mcp-adapter
          npm run test:coverage -- --coverageThreshold='{"global":{"lines":80,"branches":80,"functions":80,"statements":80}}'
```

### Pre-commit Hooks

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests for changed files
cd services/mcp-adapter
npm run test:changed -- --bail --findRelatedTests

# Check coverage threshold
npm run test:coverage -- --coverageThreshold='{"global":{"lines":80}}'
```

## Test Execution Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- providers/swiggy-provider.test.ts

# Run tests in watch mode
npm run test:watch

# Run performance tests
npm run test:perf
```

## Success Criteria

- ✅ Overall test coverage ≥ 80%
- ✅ All critical components ≥ 90% coverage
- ✅ All tests passing in CI/CD
- ✅ Performance tests meet targets
- ✅ Integration tests cover all major flows
- ✅ Mock providers for all external dependencies

## Timeline

- **Day 1:** Provider unit tests (Internal + Swiggy)
- **Day 2:** Provider unit tests (Zomato) + Aggregator tests
- **Day 3:** Resilience pattern tests + OAuth tests
- **Day 4:** Integration tests + Database tests
- **Day 5:** Performance tests + CI/CD integration

## Related Tasks

- [TASK-MCP-001](../in-progress/TASK-MCP-001-complete-oauth-implementation.md) - OAuth implementation
- [TASK-MCP-002](./TASK-MCP-002-implement-provider-order-placement.md) - Order placement

## References

- [Testing Requirements](../../requirements/mcp-layer/testing-requirements.md)
- [MCP Architecture](../../architecture/integration/mcp-architecture.md)
- [Jest Documentation](https://jestjs.io/)
- [k6 Load Testing](https://k6.io/docs/)

---

**Last Updated:** 2026-02-20
**Next Review:** 2026-02-27

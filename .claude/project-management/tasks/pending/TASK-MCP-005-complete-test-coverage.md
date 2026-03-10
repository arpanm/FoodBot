# TASK-MCP-005: Complete MCP Layer Test Coverage

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P0 (Critical)
**Estimated Effort:** 10 days
**Component:** MCP Adapter / MCP Orchestrator
**Depends On:** None (can run parallel with other tasks)
**Blocks:** Production readiness, CI/CD gates
**Related Requirements:** testing-requirements.md

---

## Overview

Achieve comprehensive test coverage across the entire MCP layer including unit tests, integration tests, E2E tests, contract tests, and performance tests for all providers (Internal, Swiggy, Zomato, ONDC, Mock), the orchestration layer, circuit breaker, caching, OAuth, and the REST API.

---

## Requirements

### Test Coverage Targets
- Unit tests: 90%+ line coverage
- Integration tests: 85%+ path coverage
- E2E tests: All critical user journeys
- Contract tests: All provider interfaces
- Performance tests: Baseline benchmarks

### Unit Tests Required (Per Module)

1. **MCP Client** (15 tests)
   - Connection establishment and teardown
   - Message serialization/deserialization
   - Request/response correlation
   - Timeout handling
   - Error parsing and categorization
   - Reconnection logic

2. **Provider Implementations** (20 tests per provider x 5 providers = 100 tests)
   - Search restaurants
   - Search dishes
   - Get restaurant details
   - Get dish details
   - Place order
   - Get order status
   - Cancel order
   - Error handling per operation
   - Response mapping to internal types
   - Rate limiting compliance

3. **Circuit Breaker** (12 tests)
   - Closed state (normal operation)
   - Open state (after threshold failures)
   - Half-open state (probe request)
   - State transitions
   - Timeout-based reset
   - Per-provider isolation
   - Concurrent request handling
   - Metrics emission

4. **Cache Manager** (10 tests)
   - Cache hit/miss
   - TTL expiration
   - Cache invalidation
   - Key generation consistency
   - Concurrent access
   - Memory limits
   - Cache warming

5. **OAuth Manager** (15 tests)
   - Token acquisition
   - Token refresh
   - Token encryption/decryption
   - Concurrent refresh lock
   - Expired token handling
   - Revocation
   - Provider-specific flows

6. **REST Server** (12 tests)
   - All endpoints return correct status codes
   - Input validation
   - Authentication required
   - Rate limiting
   - Error response format
   - CORS headers

### Integration Tests (30 tests)
- Provider orchestrator with multiple providers
- Search aggregation across providers
- Order placement through provider chain
- OAuth flow with mock OAuth server
- Cache integration with Redis
- Circuit breaker with simulated failures
- Kafka event emission on state changes
- Elasticsearch query integration

### E2E Tests (10 scenarios)
- Search restaurants → get details → place order (per provider)
- Multi-provider search aggregation
- Provider failover scenario
- OAuth flow → API call → token refresh
- High-load concurrent search test
- Order placement with payment mock

### Contract Tests (5 per provider)
- Response schema validation
- Error format compliance
- Rate limit header compliance
- Pagination format
- Authentication header format

### Performance Tests (5 benchmarks)
- Search latency p50/p95/p99
- Order placement latency
- Concurrent connection handling (100 connections)
- Cache hit ratio under load
- Circuit breaker response time

### Architecture

```
Test Structure:
services/mcp-adapter/src/__tests__/
├── unit/
│   ├── mcp-client.spec.ts
│   ├── providers/
│   │   ├── internal-provider.spec.ts
│   │   ├── swiggy-provider.spec.ts
│   │   ├── zomato-provider.spec.ts
│   │   ├── ondc-provider.spec.ts
│   │   └── mock-provider.spec.ts
│   ├── circuit-breaker.spec.ts
│   ├── cache-manager.spec.ts
│   ├── oauth-manager.spec.ts
│   └── rest-server.spec.ts
├── integration/
│   ├── provider-orchestrator.spec.ts
│   ├── search-aggregation.spec.ts
│   ├── order-placement.spec.ts
│   ├── oauth-flow.spec.ts
│   ├── cache-redis.spec.ts
│   ├── circuit-breaker-simulation.spec.ts
│   ├── kafka-events.spec.ts
│   └── elasticsearch-query.spec.ts
├── e2e/
│   ├── search-to-order.spec.ts
│   ├── multi-provider-search.spec.ts
│   ├── provider-failover.spec.ts
│   ├── oauth-lifecycle.spec.ts
│   └── load-test.spec.ts
├── contract/
│   ├── internal-contract.spec.ts
│   ├── swiggy-contract.spec.ts
│   ├── zomato-contract.spec.ts
│   ├── ondc-contract.spec.ts
│   └── mock-contract.spec.ts
├── performance/
│   ├── search-latency.spec.ts
│   ├── order-latency.spec.ts
│   ├── concurrent-connections.spec.ts
│   ├── cache-hit-ratio.spec.ts
│   └── circuit-breaker-overhead.spec.ts
├── factories/
│   ├── restaurant.factory.ts
│   ├── dish.factory.ts
│   ├── order.factory.ts
│   ├── user.factory.ts
│   └── token.factory.ts
├── mocks/
│   ├── mock-mcp-server.ts
│   ├── mock-oauth-server.ts
│   ├── mock-payment-gateway.ts
│   ├── mock-redis.ts
│   └── mock-kafka.ts
└── helpers/
    ├── test-setup.ts
    ├── test-database.ts
    ├── assertion-helpers.ts
    └── wait-helpers.ts
```

### Acceptance Criteria
- [ ] 90%+ unit test coverage (lines)
- [ ] 85%+ integration test coverage (paths)
- [ ] All E2E scenarios passing
- [ ] Contract tests for all providers
- [ ] Performance baselines documented
- [ ] No flaky tests (run 3x, 100% deterministic)
- [ ] Test execution time < 5 minutes (unit), < 15 minutes (integration)
- [ ] Mock servers for all external dependencies
- [ ] Test data factories for all entities
- [ ] CI/CD integration (tests block merge on failure)
- [ ] Coverage reports generated and published
- [ ] All tests use deterministic data (no Date.now(), no Math.random())
- [ ] Test isolation (no shared state between tests)
- [ ] Parallel test execution support

### SDLC Process
1. **Plan**: Test strategy document, coverage gap analysis, mock server design
2. **Code**: Test factories, mock servers, test helpers, unit tests
3. **Verify**: Run all unit tests, verify 90%+ coverage
4. **Code**: Integration tests with testcontainers for Redis/Kafka/PostgreSQL
5. **Verify**: Run integration tests, verify 85%+ path coverage
6. **Code**: E2E tests, contract tests, performance benchmarks
7. **Verify**: Run full test suite, validate no flaky tests (3x run)
8. **Code Review**: Review test quality, coverage gaps, assertion completeness
9. **Fix**: Address review findings, add missing edge cases
10. **CI/CD Integration**: Configure test gates, coverage thresholds, reporting

### Files to Create/Modify
- `services/mcp-adapter/src/__tests__/unit/*.spec.ts` (20+ files)
- `services/mcp-adapter/src/__tests__/integration/*.spec.ts` (10+ files)
- `services/mcp-adapter/src/__tests__/e2e/*.spec.ts` (5+ files)
- `services/mcp-adapter/src/__tests__/contract/*.spec.ts` (5 files)
- `services/mcp-adapter/src/__tests__/performance/*.spec.ts` (5 files)
- `services/mcp-adapter/src/__tests__/factories/*.ts` (entity factories)
- `services/mcp-adapter/src/__tests__/mocks/*.ts` (mock providers)
- `services/mcp-adapter/src/__tests__/helpers/*.ts` (test utilities)
- `services/mcp-adapter/jest.config.ts` (update coverage thresholds)
- `services/mcp-adapter/jest.integration.config.ts` (new)
- `services/mcp-adapter/jest.e2e.config.ts` (new)

### Dependencies
- Jest 29+ with TypeScript support
- @faker-js/faker for test data generation
- testcontainers for integration test infrastructure
- supertest for HTTP endpoint testing
- nock for HTTP mocking
- Redis mock or testcontainers Redis
- Kafka mock or testcontainers Kafka

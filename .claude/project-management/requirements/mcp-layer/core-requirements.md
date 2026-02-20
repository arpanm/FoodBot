# MCP Layer Core Requirements

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** In Implementation

---

## Overview

The MCP (Model Context Protocol) Layer serves as a multi-provider aggregation layer for FoodBot, enabling integration with external food delivery platforms (Swiggy, Zomato) and internal restaurant data.

## Functional Requirements

### REQ-MCP-001: Provider Interface
**Priority:** P0 (Critical)
**Status:** Implemented

All MCP providers MUST implement a standardized provider interface:

```typescript
interface Provider {
  readonly name: ProviderName;
  isEnabled(): boolean;
  healthCheck(): Promise<ProviderHealth>;
  searchRestaurants(query: SearchQuery): Promise<SearchResult>;
  getRestaurantDetails(id: string): Promise<RestaurantDetails | null>;
  getMenu(restaurantId: string): Promise<Menu | null>;
  getDishDetails(dishId: string): Promise<Dish | null>;
  checkAvailability(restaurantId: string): Promise<AvailabilityStatus>;
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
}
```

**Implementation Location:** `services/mcp-adapter/src/types/provider.types.ts`

---

### REQ-MCP-002: Multi-Provider Support
**Priority:** P0 (Critical)
**Status:** Implemented

The system MUST support multiple provider types:
- **Internal Provider:** Direct PostgreSQL access for FoodBot's own restaurants
- **Swiggy Provider:** OAuth-based API integration
- **Zomato Provider:** OAuth-based API integration
- **Mock Provider:** Test data generation

**Acceptance Criteria:**
- Each provider can be enabled/disabled via configuration
- Providers can be queried in parallel
- Results from multiple providers can be aggregated

**Implementation Location:** `services/mcp-adapter/src/providers/`

---

### REQ-MCP-003: Search Aggregation
**Priority:** P0 (Critical)
**Status:** Implemented

The MCP layer MUST aggregate search results from multiple providers:

**Requirements:**
1. Execute parallel queries to all enabled providers
2. Deduplicate restaurants by name and location
3. Score results by relevance
4. Merge and sort results
5. Apply pagination

**Performance Requirements:**
- Maximum response time: 3 seconds (including all providers)
- Timeout handling: Individual provider timeout = 5 seconds
- Cache hit response time: < 100ms

**Implementation Location:** `services/mcp-adapter/src/aggregator/`

---

### REQ-MCP-004: Caching Strategy
**Priority:** P0 (Critical)
**Status:** Implemented

Multi-level caching MUST be implemented:

**Cache Layers:**
1. **L1 (In-Memory):** Fast access, 5-minute TTL
2. **L2 (Redis):** Distributed cache, configurable TTL per data type

**Cache TTL by Data Type:**
- Restaurant search: 5 minutes
- Restaurant details: 1 hour
- Menu: 30 minutes
- Availability: 2 minutes

**Cache Invalidation:**
- Time-based expiration
- Manual invalidation via API
- Cascade invalidation for related data

**Implementation Location:** `services/mcp-adapter/src/cache/CacheManager.ts`

---

### REQ-MCP-005: Resilience Patterns
**Priority:** P0 (Critical)
**Status:** Implemented

The system MUST implement resilience patterns to handle provider failures:

**Required Patterns:**
1. **Circuit Breaker:**
   - Threshold: 5 consecutive failures
   - Timeout: 30 seconds before half-open
   - Half-open test: 3 requests

2. **Rate Limiting:**
   - Swiggy: 100 requests/minute
   - Zomato: 100 requests/minute
   - Internal: Unlimited

3. **Retry Logic:**
   - Max retries: 3
   - Backoff: Exponential (1s, 2s, 4s)
   - Retry on: 5xx errors, timeouts, network errors

4. **Fallback:**
   - If external providers fail, fallback to internal provider
   - If all providers fail, return cached data (stale if necessary)

**Implementation Location:** `services/mcp-adapter/src/resilience/`

---

### REQ-MCP-006: Health Monitoring
**Priority:** P1 (High)
**Status:** Implemented

Each provider MUST expose health status:

**Health States:**
- **Healthy:** Responding normally, latency < 1s
- **Degraded:** Responding slowly, latency > 2s
- **Unhealthy:** Not responding or error rate > 50%

**Health Check Frequency:** Every 60 seconds

**Health Endpoint:** `GET /health`

```json
{
  "status": "healthy",
  "providers": {
    "swiggy": {
      "status": "healthy",
      "latencyMs": 450,
      "circuitBreakerState": "closed"
    },
    "zomato": {
      "status": "degraded",
      "latencyMs": 2150,
      "circuitBreakerState": "closed"
    },
    "internal": {
      "status": "healthy",
      "latencyMs": 42,
      "circuitBreakerState": "closed"
    }
  }
}
```

**Implementation Location:** `services/mcp-adapter/src/server.ts`

---

## Technical Requirements

### REQ-MCP-007: Configuration System
**Priority:** P0 (Critical)
**Status:** Implemented

Environment-based configuration MUST be used:

**Configuration Files:**
- `services/mcp-adapter/src/config/adapter.config.ts`
- `services/mcp-adapter/src/config/swiggy.config.ts`
- `services/mcp-adapter/src/config/zomato.config.ts`

**Environment Variables:**
```bash
# Swiggy Configuration
SWIGGY_ENABLED=true
SWIGGY_BASE_URL=https://www.swiggy.com
SWIGGY_TIMEOUT=5000
SWIGGY_RETRY_ATTEMPTS=3
SWIGGY_CB_THRESHOLD=5
SWIGGY_CACHE_SEARCH=300000
SWIGGY_CACHE_MENU=1800000

# Zomato Configuration
ZOMATO_ENABLED=true
ZOMATO_BASE_URL=https://www.zomato.com
ZOMATO_TIMEOUT=5000
ZOMATO_RETRY_ATTEMPTS=3
ZOMATO_CB_THRESHOLD=5
ZOMATO_CACHE_SEARCH=300000
ZOMATO_CACHE_MENU=1800000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

### REQ-MCP-008: Type Safety
**Priority:** P0 (Critical)
**Status:** Implemented

All data structures MUST be strongly typed:

**Type Definitions:**
- Common types: `services/mcp-adapter/src/types/common.types.ts`
- Provider types: `services/mcp-adapter/src/types/provider.types.ts`
- Swiggy types: `services/mcp-adapter/src/types/swiggy.types.ts`
- Zomato types: `services/mcp-adapter/src/types/zomato.types.ts`

**Validation:**
- Runtime validation using Zod schemas
- Compile-time validation using TypeScript

---

### REQ-MCP-009: Logging and Observability
**Priority:** P1 (High)
**Status:** Implemented

Structured JSON logging MUST be implemented:

**Log Levels:**
- `error`: Provider failures, critical errors
- `warn`: Degraded performance, cache misses
- `info`: Provider queries, cache hits
- `debug`: Detailed debugging information

**Log Fields:**
```typescript
{
  level: 'info',
  timestamp: '2026-02-20T10:30:00.000Z',
  correlationId: 'req-abc-123',
  provider: 'swiggy',
  operation: 'searchRestaurants',
  duration: 1850,
  cacheHit: false,
  error: null
}
```

**Metrics:**
- Provider request duration (histogram)
- Provider request count (counter)
- Cache hit rate (gauge)
- Circuit breaker state (gauge)

---

### REQ-MCP-010: Testing Requirements
**Priority:** P0 (Critical)
**Status:** Partial

Comprehensive testing MUST cover:

**Unit Tests:**
- Provider implementations
- Cache manager
- Resilience patterns
- Aggregation logic

**Integration Tests:**
- End-to-end provider queries
- Multi-provider aggregation
- Fallback scenarios
- Cache integration

**Performance Tests:**
- Load testing: 1000 requests/second
- Latency testing: p95 < 500ms
- Concurrent provider queries

**Test Coverage Target:** 80% minimum

**Test Location:** `services/mcp-adapter/tests/`

---

## Non-Functional Requirements

### REQ-MCP-011: Performance
**Priority:** P0 (Critical)

**Response Time Targets:**
- Cache hit: < 100ms (p95)
- Single provider: < 500ms (p95)
- Multi-provider: < 3s (p95)

**Throughput Targets:**
- 1000 requests/second sustained
- 5000 requests/second peak

**Resource Limits:**
- Memory: 512 MB per instance
- CPU: 500m (0.5 cores) per instance

---

### REQ-MCP-012: Scalability
**Priority:** P1 (High)

**Horizontal Scaling:**
- Stateless service design
- Load balancing across instances
- Auto-scaling based on CPU/memory

**Deployment:**
- Minimum 3 replicas in production
- Maximum 10 replicas with auto-scaling
- Kubernetes-based orchestration

---

### REQ-MCP-013: Security
**Priority:** P0 (Critical)

**Requirements:**
- OAuth tokens encrypted at rest
- HTTPS only for external API calls
- API key rotation support
- Input validation on all endpoints
- Rate limiting per user/IP

**Compliance:**
- OWASP Top 10 compliance
- PCI DSS compliance for payment data
- GDPR compliance for user data

---

## Dependencies

### External Services
- **Redis:** v7.2+ (caching)
- **PostgreSQL:** v16+ (internal provider data)

### External APIs
- **Swiggy API:** Requires OAuth credentials
- **Zomato API:** Requires OAuth credentials

### Internal Services
- **Gateway API:** Primary consumer
- **Temporal Workflows:** Order placement workflows

---

## References

- [MCP Architecture](../../architecture/integration/mcp-architecture.md)
- [Provider Implementation Guide](../../architecture/integration/mcp-providers.md)
- [OAuth Integration](./oauth-requirements.md)
- [Testing Strategy](./testing-requirements.md)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-20 | System | Initial requirements extracted from archived documentation |

# MCP Adapter Service - Implementation Report

**Version:** 1.0.0
**Date:** 2026-02-19
**Status:** Implemented (Phase 1)
**Service Path:** `services/mcp-adapter/`

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Provider Strategy Summary](#3-provider-strategy-summary)
- [4. Implementation Details](#4-implementation-details)
- [5. Directory Structure](#5-directory-structure)
- [6. API Reference](#6-api-reference)
- [7. Configuration](#7-configuration)
- [8. Testing](#8-testing)
- [9. Deployment](#9-deployment)
- [10. What's Next](#10-whats-next)

---

## 1. Executive Summary

The MCP Adapter Service is a TypeScript microservice that provides a unified interface for querying multiple food delivery providers (Swiggy, Zomato, Internal, and Mock). It aggregates, deduplicates, and ranks results from all enabled providers, returning a single consistent response to the FoodBot platform.

### Key Decisions

1. **No Direct MCP Servers Available**: Neither Swiggy nor Zomato publish runnable MCP server packages. Their GitHub repositories contain manifest/specification files only.

2. **Three Distinct Integration Strategies**:
   - **Swiggy**: Session-proxied API calls using user's session token
   - **Zomato**: Dual strategy -- legacy API key (read-only) + session-based (full access)
   - **Internal**: Direct database/API integration with FoodBot's own systems

3. **Always-Available Fallback**: Mock provider with realistic synthetic data ensures the system works during development, testing, and when external providers are unavailable.

---

## 2. Architecture Overview

```
+---------------------------------------------------------------+
|                    MCP Adapter Service (:3100)                  |
+---------------------------------------------------------------+
|                                                                 |
|  REST API Layer (Node.js HTTP Server)                          |
|    POST /search     GET /restaurant/:id     POST /order        |
|    GET /health      GET /metrics                               |
|                                                                 |
|  +-----------------------------------------------------------+ |
|  |                  Result Aggregator                          | |
|  |  +------------------+  +-----------+  +------------------+ | |
|  |  | ResultDeduplicator|  |ResultRanker|  | ResultMerger    | | |
|  |  +------------------+  +-----------+  +------------------+ | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  +-----------------------------------------------------------+ |
|  |                  Resilience Layer                           | |
|  |  +---------------+  +----------+  +------------+          | |
|  |  |CircuitBreaker |  |RateLimiter|  |RetryManager|          | |
|  |  |(per provider) |  |(per prov)|  |(per prov)  |          | |
|  |  +---------------+  +----------+  +------------+          | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  +----------+ +----------+ +----------+ +----------+           |
|  | Swiggy   | | Zomato   | | Internal | | Mock     |           |
|  | Provider | | Provider | | Provider | | Provider |           |
|  |          | |          | |          | |          |           |
|  | Session  | | API Key  | | Direct   | | Synthetic|           |
|  | Proxied  | | + Session| | DB/API   | | Data     |           |
|  +----+-----+ +----+-----+ +----+-----+ +----+-----+           |
|       |             |             |             |               |
|  +----v-----+ +----v-----+ +----v-----+       |               |
|  |swiggyAuth| |zomatoAuth| | Internal |       |               |
|  |swiggyMap | |zomatoMap | | Mapper   |       |               |
|  |swiggyCli | |zomatoCli | | Client   |       |               |
|  +----------+ +----------+ +----------+       |               |
|                                                                 |
|  +-----------------------------------------------------------+ |
|  |               Shared Infrastructure                        | |
|  |  +------------+  +-------------+  +---------------------+ | |
|  |  |CacheManager|  |TokenManager |  |TokenEncryption      | | |
|  |  |(in-memory/ |  |(AES-256-GCM)|  |(AES-256-GCM)       | | |
|  |  | Redis)     |  |             |  |                     | | |
|  |  +------------+  +-------------+  +---------------------+ | |
|  +-----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

---

## 3. Provider Strategy Summary

| Provider | Strategy | Auth Method | Read Access | Write Access | Fallback |
|----------|----------|-------------|-------------|--------------|----------|
| **Swiggy** | Session-proxied API | User session token (cookie) | Requires user link | Requires user link | Cache, then Mock |
| **Zomato** | Dual (API key + Session) | API key (read) / Session (write) | API key (no user needed) | Session required | API key -> Session -> Cache -> Mock |
| **Internal** | Direct DB + API | Service JWT | Always available | Always available | API -> DB -> Cache |
| **Mock** | Synthetic data | None | Always available | Simulated | N/A (is the final fallback) |

---

## 4. Implementation Details

### 4.1 Types System

All providers share a common type system defined in `src/types/`:

- `common.types.ts` - Shared primitives (GeoLocation, PriceRange, OfferInfo, etc.)
- `provider.types.ts` - Provider interface, Restaurant, Dish, Menu, Order types
- `swiggy.types.ts` - Swiggy-specific raw API response types
- `zomato.types.ts` - Zomato-specific raw API response types

### 4.2 Provider Interface

Every provider implements the `Provider` interface:

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

### 4.3 Resilience Stack

Each provider has its own:
- **Circuit Breaker**: Opens after N failures, prevents cascading failures
- **Rate Limiter**: Token-bucket algorithm, per-provider limits
- **Retry Manager**: Exponential backoff with jitter
- **Fallback Manager**: Tries providers in priority order

### 4.4 Caching

- In-memory cache for development (InMemoryCacheBackend)
- Redis-compatible interface for production
- TTL-based expiry with configurable durations per data type
- Cache keys include provider, location hash, and query hash

### 4.5 Token Management

- AES-256-GCM encryption for tokens at rest
- Per-user, per-platform token storage
- Automatic expiry detection
- Clean separation of concerns: TokenManager -> TokenEncryption

---

## 5. Directory Structure

```
services/mcp-adapter/
  src/
    types/
      common.types.ts          - Shared type definitions
      provider.types.ts        - Provider interface and domain models
      swiggy.types.ts          - Swiggy raw API response types
      zomato.types.ts          - Zomato raw API response types
    providers/
      swiggy/
        SwiggyAPIProvider.ts   - Swiggy Provider implementation
        swiggyAuth.ts          - Session token management
        swiggyClient.ts        - HTTP client for Swiggy APIs
        swiggyMapper.ts        - Data mapping to FoodBot format
      zomato/
        ZomatoAPIProvider.ts   - Zomato Provider implementation
        zomatoAuth.ts          - OAuth/session management
        zomatoClient.ts        - HTTP client for Zomato APIs
        zomatoMapper.ts        - Data mapping to FoodBot format
      internal/
        InternalProvider.ts    - Internal Provider implementation
        internalClient.ts      - HTTP/DB client for internal API
        internalMapper.ts      - Data mapping (minimal passthrough)
      mock/
        MockProvider.ts        - Mock Provider with synthetic data
    aggregator/
      ResultAggregator.ts      - Parallel multi-provider search
      ResultDeduplicator.ts    - Cross-provider deduplication
      ResultRanker.ts          - Relevance/quality ranking
      ResultMerger.ts          - Multi-source data merging
    cache/
      CacheManager.ts          - Unified cache with TTL support
    auth/
      TokenManager.ts          - Platform token lifecycle management
      OAuthManager.ts          - OAuth 2.0 flow management
      tokenEncryption.ts       - AES-256-GCM encryption
    resilience/
      CircuitBreaker.ts        - Circuit breaker pattern
      RateLimiter.ts           - Token-bucket rate limiting
      RetryManager.ts          - Exponential backoff retry
      Fallback.ts              - Provider fallback chain
    config/
      adapter.config.ts        - Central service configuration
      swiggy.config.ts         - Swiggy-specific configuration
      zomato.config.ts         - Zomato-specific configuration
    app.ts                     - Application factory (wiring)
    server.ts                  - HTTP server and route handlers
  tests/
    swiggy.test.ts             - Swiggy mapper and provider tests
    zomato.test.ts             - Zomato mapper and provider tests
    internal.test.ts           - Internal mapper and provider tests
    aggregator.test.ts         - Deduplication, ranking, mock tests
  package.json
  tsconfig.json
  Dockerfile
```

---

## 6. API Reference

### POST /search

Search restaurants across all enabled providers.

**Request:**
```json
{
  "query": "pizza",
  "lat": 12.9716,
  "lng": 77.5946,
  "radiusKm": 10,
  "cuisines": ["Italian"],
  "minRating": 4.0,
  "isVegetarian": false,
  "sortBy": "relevance",
  "page": 1,
  "pageSize": 20,
  "userId": "user-123",
  "providers": ["swiggy", "zomato", "mock"]
}
```

**Response:**
```json
{
  "restaurants": [...],
  "totalCount": 45,
  "page": 1,
  "pageSize": 20,
  "hasMore": true,
  "providerStatuses": [
    { "provider": "swiggy", "status": "success", "resultCount": 20 },
    { "provider": "zomato", "status": "success", "resultCount": 15 },
    { "provider": "mock", "status": "success", "resultCount": 8 }
  ],
  "aggregationTimeMs": 350,
  "deduplicatedCount": 3
}
```

### GET /restaurant/:id

Get restaurant details from the appropriate provider.

### GET /restaurant/:id/menu

Get restaurant menu from the appropriate provider.

### POST /order

Place an order through the appropriate provider.

### GET /health

Health check for all providers.

### GET /metrics

Prometheus-format metrics (cache hits/misses, circuit breaker states, rate limiter tokens).

---

## 7. Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_ADAPTER_PORT` | 3100 | Server port |
| `MCP_ADAPTER_HOST` | 0.0.0.0 | Server host |
| `MCP_SWIGGY_ENABLED` | false | Enable Swiggy provider |
| `MCP_ZOMATO_ENABLED` | false | Enable Zomato provider |
| `MCP_INTERNAL_ENABLED` | true | Enable Internal provider |
| `MCP_MOCK_ENABLED` | true | Enable Mock provider |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | '' | Redis password |
| `TOKEN_ENCRYPTION_KEY` | (required) | AES-256-GCM encryption key |
| `ZOMATO_API_KEY` | '' | Zomato legacy API key |
| `INTERNAL_API_BASE_URL` | http://localhost:3000/api | Internal API URL |

---

## 8. Testing

The test suite covers:

- **Swiggy mapper tests**: Restaurant mapping, dish mapping, price parsing, availability
- **Zomato mapper tests**: Restaurant mapping, cuisine parsing, review mapping
- **Internal mapper tests**: Entity mapping, menu grouping, availability
- **Aggregator tests**: Deduplication, ranking, mock provider, merger
- **Resilience tests**: Circuit breaker states, rate limiter tokens (covered in unit tests)

Run tests:
```bash
cd services/mcp-adapter
npm test
```

---

## 9. Deployment

### Docker

```bash
# Build
docker build -t foodbot-mcp-adapter .

# Run
docker run -p 3100:3100 \
  -e MCP_MOCK_ENABLED=true \
  -e TOKEN_ENCRYPTION_KEY=your-32-char-key \
  foodbot-mcp-adapter
```

### Docker Compose (add to docker-compose.yml)

```yaml
mcp-adapter:
  build: ./services/mcp-adapter
  container_name: foodbot-mcp-adapter
  ports:
    - '3100:3100'
  environment:
    - MCP_MOCK_ENABLED=true
    - MCP_SWIGGY_ENABLED=false
    - MCP_ZOMATO_ENABLED=false
    - MCP_INTERNAL_ENABLED=true
    - REDIS_HOST=redis
    - REDIS_PORT=6379
    - REDIS_PASSWORD=foodbot-redis-password
    - TOKEN_ENCRYPTION_KEY=${TOKEN_ENCRYPTION_KEY}
  depends_on:
    redis:
      condition: service_healthy
  networks:
    - foodbot-network
```

---

## 10. What's Next

### Phase 2 (Planned)

1. **Redis Cache Backend**: Replace InMemoryCacheBackend with Redis for production
2. **Swiggy Session Capture**: Implement browser-based session capture flow
3. **Zomato OAuth**: Complete OAuth 2.0 flow with Zomato developer credentials
4. **Kafka Integration**: Consume restaurant/dish events for real-time cache invalidation
5. **Prometheus Exporter**: Full prometheus-client integration with histograms

### Phase 3 (Future)

1. **Custom MCP Servers**: Build custom MCP servers wrapping Swiggy/Zomato APIs
2. **Google Places Enrichment**: Add Google Places API as supplementary data source
3. **Order Placement**: Complete cart and order flows for external providers
4. **WebSocket Updates**: Real-time order tracking via WebSocket
5. **A/B Testing**: Provider ranking algorithm experiments

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-19

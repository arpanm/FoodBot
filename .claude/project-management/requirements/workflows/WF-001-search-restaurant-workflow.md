# WF-001: Restaurant Search Workflow

**Status:** Implemented ✅
**Priority:** High
**Category:** Workflows - Core Business Logic
**Package:** `@foodbot/workflows`

---

## Overview

The Restaurant Search Workflow orchestrates the restaurant discovery process with intelligent caching, user preference personalization, and MCP (Model Context Protocol) integration for semantic search capabilities.

**Related Requirements:**
- FR-LLM-INTENT-001: Intent detection and restaurant search workflow
- FR-SEARCH-001: Restaurant search functionality
- FR-CACHE-001: Caching strategy for search results

---

## Functional Requirements

### FR-WF-001-01: User Context Loading
**Description:** Load user preferences and context from cache (Redis) or graph database (Neo4j)

**Inputs:**
- `userId`: string (UUID)

**Outputs:**
- User context containing:
  - Cuisine preferences
  - Price range preferences
  - Dietary restrictions
  - Location data
  - Order history

**Implementation:** `loadUserContext` activity

---

### FR-WF-001-02: Search Result Caching
**Description:** Cache search results to improve response time and reduce external API calls

**Cache Strategy:**
- **Key Format:** `search:{userId}:{query}:{filters_json}`
- **TTL:** 30 minutes (1800 seconds)
- **Cache Miss:** Falls through to MCP search API

**Implementation:** `getFromCache` and `setInCache` activities

---

### FR-WF-001-03: MCP Search Integration
**Description:** Call MCP search API with retry logic for restaurant discovery

**Search Parameters:**
- Query string
- Location (latitude/longitude)
- Radius (default: 5km)
- Additional filters

**Retry Policy:**
- Initial interval: 1s
- Backoff coefficient: 2
- Maximum interval: 30s
- Maximum attempts: 3

**Implementation:** `callMCPSearch` activity

---

### FR-WF-001-04: Filter Application
**Description:** Apply user-specified filters to search results

**Supported Filters:**
- Cuisine type (array)
- Price range (min/max)
- Rating threshold
- Availability status
- Location radius

**Implementation:** `applyFilters` activity

---

### FR-WF-001-05: Result Ranking
**Description:** Rank restaurants based on user preferences and context

**Ranking Factors:**
- Cuisine match (+10 points)
- Rating (x2 multiplier)
- Availability (+5 points)
- Price range match (+3 points)
- Proximity (distance-based scoring)

**Implementation:** `rankResults` activity

---

### FR-WF-001-06: Result Persistence
**Description:** Store search results in vector database for future semantic queries

**Implementation:** `cacheResults` activity

---

## Workflow Input

```typescript
interface SearchRestaurantInput {
  userId: string;
  query: string;
  filters?: {
    cuisine?: string[];
    priceRange?: [number, number];
    rating?: number;
    location?: { latitude: number; longitude: number };
    radius?: number;
  };
}
```

---

## Workflow Output

```typescript
Restaurant[] // Array of ranked restaurants
```

**Restaurant Schema:**
```typescript
interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: number;
  location: { latitude: number; longitude: number };
  availability: boolean;
}
```

---

## Activity Dependencies

| Activity | Purpose | Timeout | Retry |
|----------|---------|---------|-------|
| `loadUserContext` | Load user preferences from cache/DB | 30s | 3 attempts |
| `getFromCache` | Check for cached search results | 30s | 3 attempts |
| `callMCPSearch` | Query MCP API for restaurants | 30s | 3 attempts |
| `applyFilters` | Filter results by criteria | 30s | 3 attempts |
| `rankResults` | Rank by user preferences | 30s | 3 attempts |
| `setInCache` | Cache results | 30s | 3 attempts |
| `cacheResults` | Persist to vector DB | 30s | 3 attempts |

---

## Workflow Steps

1. **Load User Context**
   - Retrieve user preferences and location
   - Used for ranking and personalization

2. **Check Cache**
   - Generate cache key from userId + query + filters
   - Return cached results if available (cache hit)

3. **Call MCP Search** (on cache miss)
   - Execute semantic search via MCP API
   - Automatic retry on transient failures

4. **Apply Filters**
   - Filter by cuisine, price, rating, location

5. **Rank Results**
   - Apply personalization scoring algorithm
   - Sort by relevance score (highest first)

6. **Cache Results**
   - Store in Redis (30 min TTL)
   - Store in vector DB for semantic search

7. **Return Results**
   - Return ranked list of restaurants

---

## Error Handling

### Retryable Errors
- Network timeouts
- MCP API rate limits
- Redis connection issues
- Database connection errors

**Retry Policy:**
```typescript
{
  initialInterval: '1s',
  backoffCoefficient: 2,
  maximumInterval: '30s',
  maximumAttempts: 3
}
```

### Non-Retryable Errors
- Invalid userId
- Malformed query
- Invalid filter parameters

**Response:** Return empty array `[]`

---

## Performance Requirements

### PR-WF-001-01: Search Latency
- **Cache Hit:** < 100ms
- **Cache Miss:** < 2s (p95)
- **Timeout:** 30s total workflow timeout

### PR-WF-001-02: Throughput
- Support 1000+ concurrent searches
- MCP API rate limit: 100 requests/second

---

## Test Coverage

**Test File:** `packages/workflows/src/__tests__/searchRestaurant.workflow.test.ts`

### Test Cases
1. ✅ Happy path with cache miss
2. ✅ Cache hit returns results immediately
3. ✅ Empty results handled gracefully
4. ✅ MCP API failure with retry
5. ✅ Filter application correctness
6. ✅ Ranking algorithm accuracy
7. ✅ Timeout handling

**Coverage:** 100% (all paths covered)

---

## Integration Points

### Upstream
- **Gateway API:** Triggers workflow from user search requests

### Downstream
- **MCP Service:** Restaurant search API
- **Redis:** Result caching
- **Vector DB:** Semantic search persistence
- **Neo4j:** User preference graph

---

## Deployment Configuration

**Task Queue:** `foodbot-main-queue`

**Worker Configuration:**
- Max concurrent workflows: 50
- Max concurrent activities: 100

**Environment Variables:**
```bash
MCP_API_URL=https://mcp-service:8080
REDIS_URL=redis://localhost:6379
NEO4J_URI=bolt://localhost:7687
```

---

## Monitoring & Observability

### Metrics
- `workflow.search_restaurant.duration` - Workflow execution time
- `workflow.search_restaurant.cache_hit_rate` - Cache hit percentage
- `workflow.search_restaurant.mcp_api_calls` - MCP API invocations
- `workflow.search_restaurant.results_count` - Number of results returned

### Logs
- User context loaded
- Cache hit/miss
- MCP search initiated
- Filters applied
- Results ranked
- Results cached

### Alerts
- High MCP API error rate (> 5%)
- Cache connection failures
- Workflow timeout rate (> 1%)

---

## Related Documentation

- [MCP Integration Architecture](../../architecture/integration/mcp-integration.md)
- [Caching Strategy](../../architecture/integration/caching-strategy.md)
- [Activity Implementations](../../architecture/integration/temporal-activities.md)

---

**Last Updated:** 2026-02-20
**Implemented By:** Workflows Package Team

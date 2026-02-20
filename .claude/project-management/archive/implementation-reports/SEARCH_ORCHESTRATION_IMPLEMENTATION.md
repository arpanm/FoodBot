# Search Orchestration Implementation Report

**Date:** 2026-02-19
**Service:** `services/search-orchestrator/`
**Integration:** `apps/gateway-api/src/modules/search/`

## Overview

The Search Orchestrator Service is a standalone microservice that aggregates search results
from multiple data sources (Elasticsearch, MCP Adapter, PostgreSQL) into a unified,
ranked response. It integrates with the existing Gateway API search module.

## Architecture Decision

### Why a Separate Service?

1. **Independent scaling** - Search traffic patterns differ from transactional traffic
2. **Source isolation** - Circuit breakers and timeouts prevent cascading failures
3. **Strategy flexibility** - Different search strategies for different use cases
4. **Cache efficiency** - Centralized caching across all search entry points

### Data Flow

```
Client -> Gateway API -> Search Orchestrator -> [ES, MCP, DB] -> Aggregate -> Rank -> Response
```

## Implementation Details

### Core Components

#### 1. Search Orchestrator (`src/orchestrator/SearchOrchestrator.ts`)
- Main coordinator that manages the full search pipeline
- Handles cache check, strategy selection, aggregation, ranking, and response building
- Generates request IDs for distributed tracing

#### 2. Parallel Executor (`src/orchestrator/ParallelExecutor.ts`)
- Executes queries across sources concurrently using `Promise.allSettled`
- Tracks completed, timed out, and failed sources
- Supports `executeFirst` for fast-return scenarios

#### 3. Timeout Manager (`src/orchestrator/TimeoutManager.ts`)
- Per-source timeouts: ES 200ms, MCP 2000ms, DB 500ms
- Global timeout: 3000ms
- Returns fallback values on timeout instead of throwing

#### 4. Fallback Handler (`src/orchestrator/FallbackHandler.ts`)
- Primary/fallback chain execution
- Automatic fallback when primary sources fail
- Degraded response creation for total failure scenarios

### Data Sources

#### Elasticsearch Source (`src/sources/ElasticsearchSource.ts`)
- Full-text search with BM25 scoring
- Geo-distance queries for location-based search
- Completion suggester for autocomplete
- Multi-match across name, description, cuisine, tags

#### MCP Adapter Source (`src/sources/MCPAdapterSource.ts`)
- Proxies to Swiggy, Zomato, and internal restaurant APIs
- POST-based search with structured filter payload
- Longer timeout (2s) to accommodate external API latency

#### Database Source (`src/sources/DatabaseSource.ts`)
- PostgreSQL LIKE-based search as fallback
- Parameterized queries for SQL injection prevention
- Dynamic connection via `pg` pool

### Aggregation Pipeline

1. **Merge** - Combine results from all sources
2. **Deduplicate** - Remove duplicates using ID match and name similarity (Levenshtein)
3. **Filter** - Apply business filters (cuisine, price, rating, location, availability)
4. **Score** - Calculate weighted final score
5. **Rank** - Sort by final score descending

### Scoring Algorithm

```
finalScore = relevance * 0.35 + rating * 0.20 + proximity * 0.15
           + availability * 0.10 + deliveryTime * 0.08
           + userPreference * 0.07 + popularity * 0.05
```

Boosts: available now (1.5x), high rating (1.3x), nearby (1.4x), preferred cuisine (1.2x)
Penalties: long delivery (0.7x), low rating (0.5x), far distance (0.6x)

### Search Strategies

| Strategy | Sources | Max Latency | Use Case |
|----------|---------|-------------|----------|
| Fast | ES only | <100ms | Autocomplete, instant search |
| Comprehensive | ES + MCP + DB | <500ms | Full search page |
| Fallback | DB only | <500ms | When ES and MCP are down |

### Caching

- Redis-based with in-memory fallback
- Deterministic cache keys from query + filters + sort + pagination
- 5-minute TTL for search results, 3-minute for autocomplete
- Pattern-based invalidation on restaurant/dish updates
- Kafka event listener integration for cache invalidation

### Circuit Breaker

Each source has an independent circuit breaker:
- **Closed** (normal): requests pass through
- **Open** (after 5 failures): requests blocked for 30s
- **Half-Open** (after reset): 3 test requests allowed

## Gateway API Integration

### New Endpoints Added

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/search/orchestrated` | Multi-source orchestrated search |
| GET | `/api/v1/search/orchestrated/autocomplete` | Orchestrated autocomplete |
| GET | `/api/v1/search/orchestrated/popular` | Popular searches |
| GET | `/api/v1/search/orchestrated/health` | Orchestrator health |

### Files Modified

- `apps/gateway-api/src/modules/search/search.controller.ts` - Added orchestrated endpoints
- `apps/gateway-api/src/modules/search/search.service.ts` - Added orchestrator proxy methods
- `apps/gateway-api/src/modules/search/dto/search-query.dto.ts` - Added OrchestratedSearchDto
- `.env.example` - Added SEARCH_ORCHESTRATOR_URL config

## File Inventory

### New Files (services/search-orchestrator/)

```
package.json
tsconfig.json
Dockerfile
README.md
src/
  types/search.types.ts
  types/source.types.ts
  types/result.types.ts
  config/orchestrator.config.ts
  config/source.config.ts
  sources/BaseSource.ts
  sources/ElasticsearchSource.ts
  sources/MCPAdapterSource.ts
  sources/DatabaseSource.ts
  orchestrator/SearchOrchestrator.ts
  orchestrator/ParallelExecutor.ts
  orchestrator/FallbackHandler.ts
  orchestrator/TimeoutManager.ts
  aggregation/ResultAggregator.ts
  aggregation/Deduplicator.ts
  aggregation/ScoreCalculator.ts
  aggregation/Ranker.ts
  strategies/FastSearchStrategy.ts
  strategies/ComprehensiveStrategy.ts
  strategies/FallbackStrategy.ts
  strategies/StrategySelector.ts
  cache/SearchCache.ts
  cache/cacheKeyGenerator.ts
  cache/cacheInvalidation.ts
  filters/CuisineFilter.ts
  filters/PriceRangeFilter.ts
  filters/RatingFilter.ts
  filters/LocationFilter.ts
  filters/AvailabilityFilter.ts
  app.ts
  server.ts
tests/
  orchestrator.test.ts
  aggregation.test.ts
  strategies.test.ts
  e2e.test.ts
```

## Test Coverage

### Unit Tests (orchestrator.test.ts)
- TimeoutManager: timeout behavior, per-source timeouts, error propagation
- ParallelExecutor: parallel execution, timeout handling, empty sources
- FallbackHandler: primary/fallback chains, degraded responses
- SearchOrchestrator: full pipeline, caching, autocomplete, health check, metrics

### Unit Tests (aggregation.test.ts)
- Deduplicator: ID dedup, name similarity, data merging, cross-type handling
- ScoreCalculator: rating boost, proximity boost, availability, user preferences
- Ranker: score-based ordering, edge cases
- ResultAggregator: multi-source merge, filter application, error source handling

### Unit Tests (strategies.test.ts)
- FastSearchStrategy, ComprehensiveStrategy, FallbackStrategy
- StrategySelector: strategy routing, auto-selection
- SearchCache: CRUD, stats, pattern invalidation
- CacheKeyGenerator: determinism, normalization
- CacheInvalidationService: event handling
- All five filters: cuisine, price, rating, location, availability

### E2E Tests (e2e.test.ts)
- POST /search with various parameters
- GET /search/autocomplete validation
- GET /search/popular
- POST /cache/invalidate
- GET /health
- GET /metrics
- 404 handling

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| p95 latency (fast) | <100ms | ES only |
| p95 latency (comprehensive) | <500ms | Parallel with timeouts |
| Cache hit rate | >60% | 5-min TTL, popular query warming |
| Source availability | >99.5% | Circuit breaker, fallback |

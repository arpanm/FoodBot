# Search Requirements

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Active

---

## Overview

FoodBot implements full-text search powered by Elasticsearch 8.11.3 with multi-source aggregation orchestrated by the Search Orchestrator Service. Search enables customers to discover restaurants and dishes with sub-500ms response times.

## Business Requirements

### BR-SEARCH-001: Fast Restaurant Discovery
**Priority:** Critical
**Description:** Customers must be able to search for restaurants by name, cuisine, location, and rating with minimal latency.

**Acceptance Criteria:**
- Search response time < 500ms (p95)
- Autocomplete suggestions < 200ms
- Results ranked by relevance, rating, distance, and availability
- Support for 10,000+ concurrent searches

### BR-SEARCH-002: Dish Search
**Priority:** High
**Description:** Customers must be able to search for specific dishes across all restaurants.

**Acceptance Criteria:**
- Search dishes by name, ingredients, category, and dietary tags
- Filter by price range, dietary preferences (veg, vegan, gluten-free)
- Include restaurant details with dish results

### BR-SEARCH-003: Geo-Spatial Search
**Priority:** High
**Description:** Search results must be filtered by customer location and delivery radius.

**Acceptance Criteria:**
- Filter restaurants within delivery radius (default: 5km)
- Results sorted by distance from customer
- Support for lat/lon coordinates
- Handle location-based availability

### BR-SEARCH-004: Faceted Filtering
**Priority:** Medium
**Description:** Customers must be able to filter search results by multiple criteria.

**Acceptance Criteria:**
- Filter by cuisine types (Italian, Chinese, Indian, etc.)
- Filter by price range (1-4 dollar signs)
- Filter by rating (minimum rating threshold)
- Filter by dietary tags (vegetarian, vegan, gluten-free)
- Filter by availability (currently open)

### BR-SEARCH-005: Search Relevance
**Priority:** High
**Description:** Search results must be ranked by a composite score considering multiple factors.

**Acceptance Criteria:**
- Relevance score based on text match quality (BM25)
- Rating boost for highly-rated restaurants
- Distance boost for nearby restaurants
- Availability boost for currently open restaurants
- Price match boost for user's preferred price range
- Popularity boost based on review count

---

## Functional Requirements

### FR-SEARCH-001: Elasticsearch Index Configuration
**Priority:** Critical
**Source:** services/mcp-orchestrator/src/main/resources/elasticsearch/

**Restaurant Index Requirements:**

| Field | Type | Purpose |
|-------|------|---------|
| id | keyword | Unique identifier |
| name | text (standard analyzer) | Full-text search |
| description | text | Full-text search |
| cuisine | keyword | Faceted filtering |
| rating | float | Range filtering, sorting |
| location | geo_point | Geo-spatial queries |
| priceRange | integer | Range filtering |
| availability | boolean | Active filter |
| operatingHours | nested | Operating hours filtering |

**Dish Index Requirements:**

| Field | Type | Purpose |
|-------|------|---------|
| id | keyword | Unique identifier |
| restaurantId | keyword | Restaurant association |
| name | text (standard analyzer) | Full-text search |
| description | text | Full-text search |
| category | keyword | Faceted filtering |
| price | float | Range filtering |
| availability | boolean | Active filter |
| dietaryTags | keyword | Faceted filtering |
| ingredients | text | Full-text search |

**Index Configuration:**
- Primary Shards: 5
- Replica Shards: 1
- Refresh Interval: 1s
- Max Result Window: 10,000

### FR-SEARCH-002: Search Strategies
**Priority:** High
**Source:** services/search-orchestrator/src/strategies/

**Fast Search Strategy:**
- Used for autocomplete and real-time suggestions
- Queries only keyword and prefix fields
- Elasticsearch only (no MCP adapter or database)
- Timeout: 200ms
- Max Results: 10
- Fields: name^3, cuisine^2
- Boost: availability=true (+2.0)

**Comprehensive Search Strategy:**
- Used for full search results pages
- Queries all text fields with faceted aggregations
- Parallel queries to Elasticsearch, MCP Adapter, PostgreSQL
- Timeout: 2s per source, 3s total
- Max Results: 50
- Fields: name^3, description^2, cuisine^2, dishes.name
- Aggregations: cuisine, priceRange, rating, dietaryTags

**Fallback Search Strategy:**
- Used when Elasticsearch is unavailable
- Falls back to PostgreSQL LIKE queries
- Timeout: 500ms
- Limited functionality (no full-text search)

### FR-SEARCH-003: Result Aggregation
**Priority:** High
**Source:** services/search-orchestrator/src/aggregation/

**Aggregation Pipeline:**
```
Provider Results → Normalizer → Deduplicator → Ranker → Final Results
```

**ResultNormalizer:**
- Normalizes field names across providers (Swiggy, Zomato, local DB)
- Converts price formats to common currency
- Standardizes location coordinates

**DuplicationRemover:**
- Detects duplicate restaurants by name + location proximity
- Merges metadata from multiple sources
- Keeps entry with highest data quality

**ResultRanker:**
- Applies weighted scoring algorithm
- Factors: relevance (30%), rating (25%), distance (20%), availability (15%), price match (10%)
- Returns results sorted by composite score

### FR-SEARCH-004: Cache Strategy
**Priority:** High
**Source:** services/search-orchestrator/src/cache/

**Cache Layers:**

| Data | Cache Key Pattern | TTL | Invalidation |
|------|------------------|-----|-------------|
| Search Results | `search:{hash(query+filters)}` | 10 min | Kafka event |
| Restaurant Details | `restaurant:{id}` | 15 min | Kafka event |
| Dish Availability | `dish:avail:{id}` | 5 min | Kafka event |
| Filter Options | `filters:{type}` | 30 min | Kafka event |

**CacheKeyGenerator:**
- Generates deterministic cache keys by hashing query parameters, filters, sort options
- Uses SHA-256 hash of JSON-serialized query object

**CacheInvalidator:**
- Kafka event consumers trigger cache invalidation
- restaurant.updated → Invalidate restaurant:{id} and related search caches
- dish.availability.changed → Invalidate dish:avail:{id}
- restaurant.deleted → Invalidate all caches for restaurant

### FR-SEARCH-005: Search Filters
**Priority:** Medium
**Source:** services/search-orchestrator/src/filters/

**Filter Types:**
- CuisineFilter: Filter by cuisine types (Italian, Chinese, Indian, etc.)
- PriceRangeFilter: Filter by price range (1-4)
- RatingFilter: Filter by minimum rating (0-5)
- LocationFilter: Filter by distance from user location
- AvailabilityFilter: Filter by currently open restaurants

### FR-SEARCH-006: Real-Time Indexing
**Priority:** High
**Source:** services/mcp-orchestrator/src/main/java/com/foodbot/mcp/

**Kafka Event Consumers:**
- RestaurantEventConsumer: consumes restaurant.created, restaurant.updated
- DishEventConsumer: consumes dish.created, dish.updated, dish.availability.changed

**BulkIndexer:**
- Batch size: 100 documents
- Flush interval: 5 seconds
- Async indexing with error handling
- Failed documents sent to DLQ

---

## Technical Requirements

### TR-SEARCH-001: Elasticsearch Cluster Configuration
**Priority:** Critical

**Development:**
- Single-node Elasticsearch (localhost:9200)
- 512 MB heap size
- Security disabled

**Production:**
- 3 master nodes + 6 data nodes
- 8 GB heap size per node
- X-Pack security enabled
- SSL/TLS for transport layer

### TR-SEARCH-002: Search Performance
**Priority:** Critical

**Performance Targets:**

| Query Type | Target Latency |
|------------|---------------|
| Autocomplete | < 200ms |
| Full search | < 500ms |
| Geo search | < 500ms |
| Faceted search | < 800ms |
| Bulk index (100 docs) | < 2s |

**Optimizations:**
- Index-level: 5 primary shards, 1 replica for horizontal read scaling
- Query-level: Use filter context for boolean fields (cached by Elasticsearch)
- Bulk indexing: Batch size of 100 with 5-second flush interval
- Field mapping: keyword for exact-match fields, text only for full-text search
- Connection pooling: Max 20 connections, 10 per route

### TR-SEARCH-003: Search Orchestrator Configuration
**Priority:** High
**Source:** services/search-orchestrator/

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3002 | Service port |
| ELASTICSEARCH_NODE | http://localhost:9200 | Elasticsearch URL |
| ELASTICSEARCH_INDEX | foodbot_restaurants | ES index name |
| MCP_ADAPTER_URL | http://localhost:8082/api/v1 | MCP Adapter URL |
| DB_HOST | localhost | PostgreSQL host |
| REDIS_URL | (none) | Redis URL for caching |
| ES_TIMEOUT_MS | 200 | Elasticsearch timeout |
| MCP_TIMEOUT_MS | 2000 | MCP Adapter timeout |
| DB_TIMEOUT_MS | 500 | Database timeout |
| MAX_TOTAL_TIMEOUT_MS | 3000 | Global search timeout |
| CACHE_TTL_SECONDS | 300 | Cache TTL |

### TR-SEARCH-004: Ranking Algorithm
**Priority:** High

**Composite Score Calculation:**
```
score = (relevance_score * 0.30)
      + (rating_score * 0.25)
      + (distance_score * 0.20)
      + (availability_bonus * 0.15)
      + (price_match_score * 0.10)
```

**Score Components:**

| Component | Weight | Calculation |
|-----------|--------|-------------|
| Relevance | 0.30 | Elasticsearch BM25 score normalized to 0-1 |
| Rating | 0.25 | restaurant_rating / 5.0 |
| Distance | 0.20 | 1.0 - (distance_km / max_radius_km) |
| Availability | 0.15 | 1.0 if open, 0.0 if closed |
| Price Match | 0.10 | 1.0 if within range, 0.5 otherwise |

### TR-SEARCH-005: Resilience Patterns
**Priority:** High

**Circuit Breaker:**
- Per-source circuit breaker (Elasticsearch, MCP Adapter, PostgreSQL)
- Failure threshold: 50% over 10 requests
- Open state duration: 60 seconds
- Half-open state: test with single request

**Timeouts:**
- Elasticsearch: 200ms
- MCP Adapter: 2000ms
- PostgreSQL: 500ms
- Total search timeout: 3000ms

**Retry Strategy:**
- Max retries: 3
- Exponential backoff: 100ms, 200ms, 400ms
- Retry on: network errors, timeouts
- No retry on: validation errors, 4xx errors

---

## Non-Functional Requirements

### NFR-SEARCH-001: Scalability
**Requirements:**
- Elasticsearch cluster scales horizontally by adding data nodes
- Search Orchestrator scales horizontally by adding service instances
- Support for 10,000+ concurrent searches
- Handle 1M+ documents in Elasticsearch

### NFR-SEARCH-002: Availability
**Requirements:**
- 99.9% uptime for search service
- Automatic failover to fallback strategy
- Graceful degradation on source failures

### NFR-SEARCH-003: Observability
**Requirements:**
- Prometheus metrics for search latency, throughput, error rate
- Health checks for all data sources (Elasticsearch, MCP, DB)
- Distributed tracing with correlation IDs
- Query logging for search analytics

### NFR-SEARCH-004: Maintainability
**Requirements:**
- Search strategies configurable via environment variables
- Index mappings versioned and documented
- Search orchestrator code well-tested (80%+ coverage)
- Elasticsearch queries optimized and documented

---

## Implementation Status

### Completed
- ✅ Elasticsearch index mappings (restaurant, dish)
- ✅ Search Orchestrator service (services/search-orchestrator)
- ✅ Search strategies (Fast, Comprehensive, Fallback)
- ✅ Result aggregation (Normalizer, Deduplicator, Ranker)
- ✅ Cache layer (Redis with invalidation)
- ✅ Search filters (Cuisine, Price, Rating, Location, Availability)
- ✅ Real-time indexing (Kafka consumers in MCP Orchestrator)
- ✅ BulkIndexer (batch indexing with 100 docs, 5s flush)

### In Progress
- 🚧 Production Elasticsearch cluster setup
- 🚧 Search analytics and monitoring
- 🚧 A/B testing for ranking algorithm

### Planned
- 📋 Personalized search ranking based on user history
- 📋 Search suggestions based on trending searches
- 📋 Voice search support
- 📋 Multi-language search support

---

## Dependencies

### External Systems
- Elasticsearch 8.11.3
- Redis 7.x (for caching)
- PostgreSQL (fallback)
- Apache Kafka (for real-time indexing)

### Internal Services
- MCP Orchestrator (indexing, search)
- Search Orchestrator (multi-source aggregation)
- Gateway API (search API endpoint)

---

## Testing Requirements

### Unit Tests
- Search strategy tests (Fast, Comprehensive, Fallback)
- Aggregation tests (Normalizer, Deduplicator, Ranker)
- Filter tests (Cuisine, Price, Rating, Location, Availability)
- Cache tests (key generation, invalidation)

### Integration Tests
- End-to-end search tests (query → Elasticsearch → results)
- Real-time indexing tests (Kafka event → Elasticsearch)
- Cache invalidation tests (Kafka event → cache cleared)
- Multi-source aggregation tests

### Performance Tests
- Search latency tests (p50, p95, p99)
- Throughput tests (10,000+ concurrent searches)
- Elasticsearch bulk indexing performance
- Cache hit rate tests (target: 60%+)

---

## Documentation

### Developer Documentation
- [Search Architecture Guide](../../../docs/SEARCH_ARCHITECTURE.md)
- [Search Orchestrator README](../../../services/search-orchestrator/README.md)
- [MCP Orchestrator README](../../../services/mcp-orchestrator/README.md)
- [Elasticsearch Mapping Documentation](../../../services/mcp-orchestrator/src/main/resources/elasticsearch/)

### Operations Documentation
- Elasticsearch cluster setup guide
- Index creation and mapping guide
- Search performance tuning guide
- Cache invalidation monitoring

---

## Related Requirements
- [Event Streaming Requirements](../workflows/event-streaming-requirements.md)
- [MCP Layer Requirements](../mcp-layer/mcp-integration-requirements.md)
- [Technical Requirements](../technical-requirements.md)

---

**Document Owner:** Backend Team, Search Team
**Reviewers:** Architecture Team, Product Team
**Next Review:** 2026-03-20

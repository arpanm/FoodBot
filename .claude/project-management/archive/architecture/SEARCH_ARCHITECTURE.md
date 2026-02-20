# FoodBot Search Architecture

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Elasticsearch Setup](#1-elasticsearch-setup)
- [2. Search Strategies](#2-search-strategies)
- [3. Result Aggregation](#3-result-aggregation)
- [4. Ranking Algorithm](#4-ranking-algorithm)
- [5. Cache Strategy](#5-cache-strategy)
- [6. Performance Tuning](#6-performance-tuning)

---

## 1. Elasticsearch Setup

### Cluster Configuration

| Setting | Development | Production |
|---------|-------------|------------|
| Nodes | 1 (single-node) | 3 master + 6 data |
| Heap Size | 512 MB | 8 GB |
| Version | 8.11.3 | 8.11.3 |
| Security | Disabled | X-Pack enabled |

### Index Definitions

#### Restaurant Index

**File:** `services/mcp-orchestrator/src/main/resources/elasticsearch/restaurant-mapping.json`

| Field | Type | Purpose |
|-------|------|---------|
| `id` | keyword | Unique identifier |
| `name` | text (standard analyzer) | Full-text search |
| `description` | text | Full-text search |
| `cuisine` | keyword | Faceted filtering |
| `rating` | float | Range filtering and sorting |
| `location` | geo_point | Geo-spatial queries |
| `priceRange` | integer | Range filtering |
| `availability` | boolean | Active filter |
| `operatingHours` | nested | Operating hours filtering |

#### Dish Index

**File:** `services/mcp-orchestrator/src/main/resources/elasticsearch/dish-mapping.json`

| Field | Type | Purpose |
|-------|------|---------|
| `id` | keyword | Unique identifier |
| `restaurantId` | keyword | Restaurant association |
| `name` | text (standard analyzer) | Full-text search |
| `description` | text | Full-text search |
| `category` | keyword | Faceted filtering |
| `price` | float | Range filtering |
| `availability` | boolean | Active filter |
| `dietaryTags` | keyword | Faceted filtering (veg, vegan, etc.) |
| `ingredients` | text | Full-text search |

### Index Configuration

| Setting | Value |
|---------|-------|
| Primary Shards | 5 |
| Replica Shards | 1 |
| Refresh Interval | 1s |
| Max Result Window | 10000 |

---

## 2. Search Strategies

The MCP Orchestrator implements three search strategies:

### Fast Search

Used for real-time suggestions and autocomplete. Queries only keyword and prefix fields.

```
Query: "pizza"
Fields: name^3, cuisine^2
Boost: availability=true (+2.0)
Timeout: 200ms
Max Results: 10
```

### Comprehensive Search

Used for full search results pages. Queries all text fields with faceted aggregations.

```
Query: "italian restaurant with pasta"
Fields: name^3, description^2, cuisine^2, dishes.name
Filters: cuisine=italian, availability=true
Aggregations: cuisine, priceRange, rating, dietaryTags
Timeout: 2s
Max Results: 50
```

### Fallback Search

Used when Elasticsearch is unavailable. Falls back to PostgreSQL LIKE queries or mock data.

---

## 3. Result Aggregation

The MCP Orchestrator aggregates results from multiple providers:

### Aggregation Pipeline

```
Provider Results ──> Normalizer ──> Deduplicator ──> Ranker ──> Final Results
```

### Components

**ResultNormalizer** (`aggregator/ResultNormalizer.java`):
- Normalizes field names across providers (Swiggy uses `rating`, Zomato uses `user_rating`)
- Converts price formats to a common currency
- Standardizes location coordinates

**DuplicationRemover** (`aggregator/DuplicationRemover.java`):
- Detects duplicate restaurants across providers by name + location proximity
- Merges metadata from multiple sources
- Keeps the entry with the highest data quality

**ResultRanker** (`aggregator/ResultRanker.java`):
- Applies a weighted scoring algorithm
- Factors: relevance score, rating, distance, availability, price match
- Returns results sorted by composite score

---

## 4. Ranking Algorithm

### Composite Score Calculation

```
score = (relevance_score * 0.3)
      + (rating_score * 0.25)
      + (distance_score * 0.2)
      + (availability_bonus * 0.15)
      + (price_match_score * 0.1)
```

### Score Components

| Component | Weight | Calculation |
|-----------|--------|-------------|
| Relevance | 0.30 | Elasticsearch BM25 score normalized to 0-1 |
| Rating | 0.25 | (restaurant_rating / 5.0) |
| Distance | 0.20 | 1.0 - (distance_km / max_radius_km), clamped to 0-1 |
| Availability | 0.15 | 1.0 if currently open, 0.0 if closed |
| Price Match | 0.10 | 1.0 if within user's preferred price range, 0.5 otherwise |

---

## 5. Cache Strategy

### Cache Layers

| Data | Cache Key Pattern | TTL | Invalidation |
|------|------------------|-----|-------------|
| Search Results | `search:{hash(query+filters)}` | 10 min | Kafka event |
| Restaurant Details | `restaurant:{id}` | 15 min | Kafka event |
| Dish Availability | `dish:avail:{id}` | 5 min | Kafka event |
| Filter Options | `filters:{type}` | 30 min | Kafka event |

### Cache Key Generator

**File:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/cache/CacheKeyGenerator.java`

Generates deterministic cache keys by hashing the query parameters, filters, and sort options.

### Cache Invalidation

**File:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/cache/CacheInvalidator.java`

Kafka event consumers trigger cache invalidation:

- `restaurant.updated` -> Invalidate `restaurant:{id}` and related search caches
- `dish.availability.changed` -> Invalidate `dish:avail:{id}`
- `restaurant.deleted` -> Invalidate all caches for that restaurant

---

## 6. Performance Tuning

### Elasticsearch Optimizations

- **Index-level:** 5 primary shards, 1 replica for horizontal read scaling.
- **Query-level:** Use `filter` context for boolean fields (cached by Elasticsearch).
- **Bulk indexing:** Batch size of 100 with 5-second flush interval.
- **Field mapping:** `keyword` for exact-match fields, `text` only for full-text search.

### Connection Pooling

```yaml
elasticsearch:
  pool:
    max-connections: 20
    max-connections-per-route: 10
```

### Query Performance Targets

| Query Type | Target Latency |
|------------|---------------|
| Autocomplete | < 200ms |
| Full search | < 500ms |
| Geo search | < 500ms |
| Faceted search | < 800ms |
| Bulk index (100 docs) | < 2s |

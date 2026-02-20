# Elasticsearch Search Architecture

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Active

---

## Overview

FoodBot uses Elasticsearch 8.11.3 for full-text search across restaurants and dishes. Elasticsearch provides sub-500ms search response times, faceted filtering, geo-spatial search, and relevance-based ranking.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Customer Search Query                         │
│                    "italian pizza near me"                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Gateway API Service                            │
│                   /api/v1/search/restaurants                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Search Orchestrator Service                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Strategy     │  │  Result      │  │   Cache      │             │
│  │ Selector     │──│  Aggregator  │──│   Layer      │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└───────┬─────────────────┬─────────────────┬─────────────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Elasticsearch│  │ MCP Adapter  │  │ PostgreSQL   │
│   (Primary)  │  │  (External)  │  │  (Fallback)  │
└──────────────┘  └──────────────┘  └──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Elasticsearch Cluster                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Master 1   │  │   Master 2   │  │   Master 3   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Data 1     │  │   Data 2     │  │   Data 3     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  Indexes:                                                           │
│  • foodbot_restaurants (5 shards, 1 replica)                       │
│  • foodbot_dishes (5 shards, 1 replica)                            │
└─────────────────────────────────────────────────────────────────────┘
        ▲
        │
        │ (Real-time indexing via Kafka)
        │
┌─────────────────────────────────────────────────────────────────────┐
│                    MCP Orchestrator Service                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │   Kafka          │  │   Bulk Indexer   │  │   Cache          │ │
│  │   Consumers      │──│   (batch 100,    │──│   Invalidator    │ │
│  │                  │  │    flush 5s)     │  │                  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cluster Configuration

### Development Environment

```yaml
Elasticsearch:
  - Node: localhost:9200
  - Type: Single-node cluster
  - Heap Size: 512 MB
  - Security: Disabled
  - Version: 8.11.3
```

### Production Environment

```yaml
Elasticsearch:
  Master Nodes (3):
    - es-master-1.foodbot.com:9200
    - es-master-2.foodbot.com:9200
    - es-master-3.foodbot.com:9200

  Data Nodes (6):
    - es-data-1.foodbot.com:9200
    - es-data-2.foodbot.com:9200
    - es-data-3.foodbot.com:9200
    - es-data-4.foodbot.com:9200
    - es-data-5.foodbot.com:9200
    - es-data-6.foodbot.com:9200

  Heap Size: 8 GB per node
  Security: X-Pack enabled
  TLS: Enabled
  Version: 8.11.3
```

---

## Index Architecture

### Restaurant Index

**Index Name:** `foodbot_restaurants`

**Mapping:**

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "description": { "type": "text", "analyzer": "standard" },
      "cuisine": { "type": "keyword" },
      "rating": { "type": "float" },
      "location": { "type": "geo_point" },
      "priceRange": { "type": "integer" },
      "availability": { "type": "boolean" },
      "operatingHours": {
        "type": "nested",
        "properties": {
          "day": { "type": "keyword" },
          "openTime": { "type": "keyword" },
          "closeTime": { "type": "keyword" }
        }
      },
      "address": {
        "type": "object",
        "properties": {
          "street": { "type": "text" },
          "city": { "type": "keyword" },
          "state": { "type": "keyword" },
          "zipCode": { "type": "keyword" }
        }
      },
      "reviewCount": { "type": "integer" },
      "deliveryTime": { "type": "integer" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

**Index Settings:**

```json
{
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "refresh_interval": "1s",
    "max_result_window": 10000,
    "analysis": {
      "analyzer": {
        "standard": {
          "type": "standard",
          "stopwords": "_english_"
        }
      }
    }
  }
}
```

### Dish Index

**Index Name:** `foodbot_dishes`

**Mapping:**

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "restaurantId": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "description": { "type": "text", "analyzer": "standard" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "availability": { "type": "boolean" },
      "dietaryTags": { "type": "keyword" },
      "ingredients": { "type": "text", "analyzer": "standard" },
      "allergens": { "type": "keyword" },
      "calories": { "type": "integer" },
      "preparationTime": { "type": "integer" },
      "popularity": { "type": "integer" },
      "imageUrl": { "type": "keyword", "index": false },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

**Index Settings:**

```json
{
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "refresh_interval": "1s",
    "max_result_window": 10000
  }
}
```

---

## Search Strategies

### Fast Search Strategy

**Use Case:** Autocomplete, real-time suggestions

**Configuration:**
- Target: Elasticsearch only
- Timeout: 200ms
- Max Results: 10
- Fields: name^3, cuisine^2
- Boost: availability=true (+2.0)

**Query:**

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "pizza",
            "fields": ["name^3", "cuisine^2"],
            "type": "best_fields",
            "fuzziness": "AUTO"
          }
        }
      ],
      "filter": [
        { "term": { "availability": true } }
      ]
    }
  },
  "size": 10,
  "timeout": "200ms"
}
```

### Comprehensive Search Strategy

**Use Case:** Full search results page

**Configuration:**
- Targets: Elasticsearch, MCP Adapter, PostgreSQL (parallel)
- Timeout: 2s per source, 3s total
- Max Results: 50
- Fields: name^3, description^2, cuisine^2, dishes.name
- Aggregations: cuisine, priceRange, rating, dietaryTags

**Query:**

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "italian restaurant with pasta",
            "fields": ["name^3", "description^2", "cuisine^2"],
            "type": "cross_fields",
            "operator": "and",
            "fuzziness": "AUTO"
          }
        }
      ],
      "filter": [
        { "term": { "cuisine": "italian" } },
        { "term": { "availability": true } },
        { "range": { "rating": { "gte": 4.0 } } }
      ],
      "should": [
        {
          "geo_distance": {
            "distance": "5km",
            "location": { "lat": 40.7128, "lon": -74.0060 }
          }
        }
      ]
    }
  },
  "aggs": {
    "cuisines": { "terms": { "field": "cuisine", "size": 20 } },
    "priceRanges": { "terms": { "field": "priceRange" } },
    "ratingBuckets": { "histogram": { "field": "rating", "interval": 0.5 } }
  },
  "size": 50,
  "timeout": "2s"
}
```

### Fallback Search Strategy

**Use Case:** Elasticsearch unavailable

**Configuration:**
- Target: PostgreSQL only
- Timeout: 500ms
- Limited functionality (LIKE queries, no full-text search)

**Query:**

```sql
SELECT * FROM restaurants
WHERE name ILIKE '%pizza%'
  AND availability = true
  AND rating >= 4.0
ORDER BY rating DESC, review_count DESC
LIMIT 50;
```

---

## Ranking Algorithm

### Composite Score Calculation

```
final_score = (relevance_score * 0.30)
            + (rating_score * 0.25)
            + (distance_score * 0.20)
            + (availability_bonus * 0.15)
            + (price_match_score * 0.10)
```

### Score Components

**Relevance Score (30%):**
- Elasticsearch BM25 score normalized to 0-1
- Considers term frequency, inverse document frequency
- Boosts exact matches and prefix matches

**Rating Score (25%):**
```
rating_score = restaurant_rating / 5.0
```

**Distance Score (20%):**
```
distance_score = max(0, 1.0 - (distance_km / max_radius_km))
```

**Availability Bonus (15%):**
```
availability_bonus = 1.0 if currently_open else 0.0
```

**Price Match Score (10%):**
```
price_match_score = 1.0 if within_preferred_range else 0.5
```

### Function Score Query

```json
{
  "query": {
    "function_score": {
      "query": { "multi_match": { ... } },
      "functions": [
        {
          "field_value_factor": {
            "field": "rating",
            "factor": 0.25,
            "missing": 0
          }
        },
        {
          "gauss": {
            "location": {
              "origin": { "lat": 40.7128, "lon": -74.0060 },
              "scale": "5km",
              "decay": 0.5
            }
          },
          "weight": 0.20
        },
        {
          "filter": { "term": { "availability": true } },
          "weight": 0.15
        }
      ],
      "score_mode": "sum",
      "boost_mode": "replace"
    }
  }
}
```

---

## Real-Time Indexing

### Kafka Event-Driven Indexing

**Flow:**

```
Database Change → Kafka Event → MCP Orchestrator → Elasticsearch Index
```

**Kafka Consumers (MCP Orchestrator):**

**RestaurantEventConsumer:**
```java
@KafkaListener(
    topics = {"restaurant.created", "restaurant.updated"},
    groupId = "mcp-indexer"
)
public void consumeRestaurantEvent(ConsumerRecord<String, String> record) {
    RestaurantEvent event = parseEvent(record.value());

    // Add to bulk indexer queue
    bulkIndexer.add(IndexRequest.of(req -> req
        .index("foodbot_restaurants")
        .id(event.getData().getId())
        .document(event.getData())
    ));
}
```

**DishEventConsumer:**
```java
@KafkaListener(
    topics = {"dish.created", "dish.updated", "dish.availability.changed"},
    groupId = "mcp-indexer"
)
public void consumeDishEvent(ConsumerRecord<String, String> record) {
    DishEvent event = parseEvent(record.value());

    // Add to bulk indexer queue
    bulkIndexer.add(IndexRequest.of(req -> req
        .index("foodbot_dishes")
        .id(event.getData().getId())
        .document(event.getData())
    ));
}
```

### Bulk Indexer

**Configuration:**
- Batch Size: 100 documents
- Flush Interval: 5 seconds
- Concurrent Requests: 4
- Retry on Failure: 3 times with exponential backoff

**Implementation:**

```java
@Component
public class BulkIndexer {
    private final BulkProcessor bulkProcessor;

    public BulkIndexer(ElasticsearchClient esClient) {
        this.bulkProcessor = BulkProcessor.builder(
            (request, bulkListener) -> esClient.bulk(request, bulkListener),
            new BulkListener()
        )
        .setBulkActions(100)
        .setFlushInterval(TimeValue.timeValueSeconds(5))
        .setConcurrentRequests(4)
        .setBackoffPolicy(
            BackoffPolicy.exponentialBackoff(
                TimeValue.timeValueMillis(100), 3
            )
        )
        .build();
    }

    public void add(IndexRequest<?> request) {
        bulkProcessor.add(request);
    }
}
```

**Error Handling:**
- Failed documents logged with error details
- Failed documents sent to Dead Letter Queue (Kafka)
- Metrics tracked for failure rate

---

## Cache Strategy

### Cache Layers

| Data Type | Cache Key Pattern | TTL | Invalidation Trigger |
|-----------|------------------|-----|---------------------|
| Search Results | `search:{hash(query+filters)}` | 10 min | Kafka event |
| Restaurant Details | `restaurant:{id}` | 15 min | restaurant.updated |
| Dish Availability | `dish:avail:{id}` | 5 min | dish.availability.changed |
| Filter Options | `filters:{type}` | 30 min | Daily refresh |

### Cache Key Generator

```typescript
export class CacheKeyGenerator {
  generateSearchKey(query: SearchQuery): string {
    const normalized = {
      query: query.text?.toLowerCase().trim(),
      filters: this.sortObject(query.filters),
      sort: query.sort,
      location: query.location
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')
      .substring(0, 16);

    return `search:${hash}`;
  }
}
```

### Cache Invalidation

**Kafka-Triggered Invalidation:**

```java
@Component
public class CacheInvalidator {

    @KafkaListener(topics = "restaurant.updated", groupId = "cache-invalidator")
    public void onRestaurantUpdated(RestaurantUpdatedEvent event) {
        String restaurantId = event.getData().getId();

        // Invalidate restaurant details cache
        redisClient.del("restaurant:" + restaurantId);

        // Invalidate related search caches
        redisClient.delByPattern("search:*restaurant*" + restaurantId + "*");

        logger.info("Invalidated cache for restaurant: {}", restaurantId);
    }

    @KafkaListener(topics = "dish.availability.changed", groupId = "cache-invalidator")
    public void onDishAvailabilityChanged(DishAvailabilityChangedEvent event) {
        String dishId = event.getData().getId();

        // Invalidate dish availability cache
        redisClient.del("dish:avail:" + dishId);

        logger.info("Invalidated availability cache for dish: {}", dishId);
    }
}
```

---

## Performance Optimization

### Query Optimization

**Filter Context vs Query Context:**
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "name": "pizza" } }  // Query context (scored)
      ],
      "filter": [
        { "term": { "availability": true } },  // Filter context (cached, not scored)
        { "range": { "rating": { "gte": 4.0 } } }
      ]
    }
  }
}
```

**Index-Only Fields:**
```json
{
  "imageUrl": {
    "type": "keyword",
    "index": false  // Don't index, only store
  }
}
```

**Field Data Type Selection:**
- Use `keyword` for exact matching (cuisine, category)
- Use `text` for full-text search (name, description)
- Use `integer`/`float` for numeric filtering (price, rating)
- Use `boolean` for binary flags (availability)

### Connection Pooling

```yaml
elasticsearch:
  rest:
    connection-timeout: 5000
    socket-timeout: 10000
  pool:
    max-connections: 20
    max-connections-per-route: 10
```

### Index Performance

**Refresh Interval:**
```json
{
  "settings": {
    "refresh_interval": "1s"  // Faster for dev, "5s" for prod
  }
}
```

**Replica Configuration:**
- Development: 1 replica
- Production: 2 replicas for high availability

---

## Monitoring and Observability

### Elasticsearch Metrics

**Cluster Health:**
```bash
GET /_cluster/health
```

**Index Stats:**
```bash
GET /foodbot_restaurants/_stats
GET /foodbot_dishes/_stats
```

**Node Stats:**
```bash
GET /_nodes/stats
```

**Search Performance:**
- Query latency (p50, p95, p99)
- Indexing rate (docs/sec)
- Bulk indexing latency
- Cache hit rate

### Prometheus Metrics

```java
// Search latency
@Timed(value = "elasticsearch.search.duration", percentiles = {0.5, 0.95, 0.99})
public SearchResponse<Restaurant> searchRestaurants(SearchQuery query) {
    // ...
}

// Index operations
@Counted(value = "elasticsearch.index.operations", extraTags = {"index", "restaurants"})
public void indexRestaurant(Restaurant restaurant) {
    // ...
}
```

### Health Checks

```typescript
@Injectable()
export class ElasticsearchHealthIndicator {
  async check(): Promise<HealthIndicatorResult> {
    const health = await this.esClient.cluster.health();

    return {
      elasticsearch: {
        status: health.status === 'green' || health.status === 'yellow' ? 'up' : 'down',
        clusterStatus: health.status,
        numberOfNodes: health.number_of_nodes,
        activeShards: health.active_shards,
      }
    };
  }
}
```

---

## Disaster Recovery

### Index Snapshots

**Snapshot Configuration:**
```json
{
  "type": "s3",
  "settings": {
    "bucket": "foodbot-es-snapshots",
    "region": "us-east-1",
    "compress": true
  }
}
```

**Snapshot Schedule:**
- Full snapshot: Daily at 2 AM
- Incremental snapshot: Every 6 hours
- Retention: 30 days

**Restore Procedure:**
```bash
# List snapshots
GET /_snapshot/s3_repository/_all

# Restore snapshot
POST /_snapshot/s3_repository/snapshot_2026_02_20/_restore
{
  "indices": "foodbot_restaurants,foodbot_dishes",
  "ignore_unavailable": true
}
```

### Rebuild Strategy

**Full Rebuild from PostgreSQL:**

```bash
# Step 1: Create temporary index
PUT /foodbot_restaurants_rebuild

# Step 2: Bulk index from database
POST /_bulk
{ "index": { "_index": "foodbot_restaurants_rebuild", "_id": "1" } }
{ "id": "1", "name": "Pizza Palace", ... }
...

# Step 3: Create alias
POST /_aliases
{
  "actions": [
    { "remove": { "index": "foodbot_restaurants", "alias": "restaurants" } },
    { "add": { "index": "foodbot_restaurants_rebuild", "alias": "restaurants" } }
  ]
}

# Step 4: Delete old index
DELETE /foodbot_restaurants
```

---

## Security

### Authentication

**API Key Authentication:**
```bash
curl -H "Authorization: ApiKey ${API_KEY}" \
  http://localhost:9200/_search
```

### Authorization

**Role-Based Access Control:**
```json
{
  "roles": {
    "search_user": {
      "cluster": [],
      "indices": [
        {
          "names": ["foodbot_*"],
          "privileges": ["read"]
        }
      ]
    },
    "indexer": {
      "cluster": ["manage_index_templates"],
      "indices": [
        {
          "names": ["foodbot_*"],
          "privileges": ["write", "create_index"]
        }
      ]
    }
  }
}
```

### TLS Encryption

```yaml
xpack.security.http.ssl:
  enabled: true
  keystore.path: /etc/elasticsearch/certs/http.p12
  truststore.path: /etc/elasticsearch/certs/http.p12

xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: /etc/elasticsearch/certs/transport.p12
  truststore.path: /etc/elasticsearch/certs/transport.p12
```

---

## Related Documentation

- [Search Requirements](../../requirements/llm/search-requirements.md)
- [Search Orchestrator Architecture](../components/search-orchestrator.md)
- [Kafka Event Streaming](../integration/kafka-event-streaming.md)
- [System Architecture](../system-architecture.md)

---

**Document Owner:** Backend Team, Search Team
**Reviewers:** Architecture Team, DevOps Team
**Next Review:** 2026-03-20

# Internal System Integration Strategy

**Version:** 1.0.0
**Date:** 2026-02-19
**Status:** Active
**Platform:** FoodBot Internal (Direct Database + API)

---

## Table of Contents

- [1. Feasibility Analysis](#1-feasibility-analysis)
- [2. Chosen Approach](#2-chosen-approach)
- [3. Architecture Diagram](#3-architecture-diagram)
- [4. Authentication Flow](#4-authentication-flow)
- [5. API Endpoints](#5-api-endpoints)
- [6. Data Mapping](#6-data-mapping)
- [7. Rate Limiting](#7-rate-limiting)
- [8. Error Handling](#8-error-handling)
- [9. Caching Strategy](#9-caching-strategy)
- [10. Cost Analysis](#10-cost-analysis)
- [11. Legal Considerations](#11-legal-considerations)
- [12. Fallback Strategy](#12-fallback-strategy)

---

## 1. Feasibility Analysis

### 1.1 Can We Use Direct Integration?

**Answer: Yes -- full direct integration is possible and recommended.**

The Internal system is FoodBot's own restaurant management platform. Unlike Swiggy and Zomato, we have:

| Check | Result | Details |
|-------|--------|---------|
| Direct database access | Available | PostgreSQL via TypeORM |
| REST API | Available | NestJS Gateway API |
| Authentication | Full control | JWT-based, service-to-service |
| Data model | Owned | We define the schema |
| Rate limiting | Our control | Configurable |
| Reliability | High | Internal infrastructure |

### 1.2 What Is the Internal System?

The Internal system represents restaurants that have directly partnered with FoodBot, bypassing third-party delivery platforms. This includes:

1. **Direct restaurant partners** who use FoodBot as their ordering platform
2. **Internal test restaurants** for development and QA
3. **White-label restaurants** managed through FoodBot's admin panel
4. **Mock/demo restaurants** for showcasing capabilities

### 1.3 Integration Options

| Option | Feasibility | Selected |
|--------|------------|----------|
| Direct database query | Fully available | **Yes (Primary for reads)** |
| Internal REST API | Fully available | **Yes (Primary for writes)** |
| Event-driven (Kafka) | Fully available | **Yes (Real-time updates)** |
| MCP protocol (custom) | Can be built | **Yes (Future: MCP server)** |

---

## 2. Chosen Approach

### Direct API + Database Integration

The Internal provider uses a combination of:

1. **Direct REST API calls** to the FoodBot Gateway API for CRUD operations
2. **Direct database queries** via a shared repository layer for high-performance reads
3. **Kafka event consumption** for real-time updates (menu changes, availability)
4. **Future: Custom MCP Server** wrapping internal APIs for protocol consistency

### Why This Approach?

- **Lowest latency**: No external network hops, no third-party rate limits
- **Highest reliability**: Internal infrastructure with full observability
- **Full control**: We own the data model, auth, and rate limits
- **Consistent interface**: Implements the same Provider interface as Swiggy/Zomato
- **Event-driven freshness**: Kafka events provide real-time data updates

---

## 3. Architecture Diagram

```
+==================================================================+
|                    FoodBot MCP Adapter - Internal                  |
+==================================================================+
|                                                                    |
|  +---------------------+                                          |
|  | InternalProvider     |                                          |
|  | (implements Provider)|                                          |
|  +----------+----------+                                          |
|             |                                                      |
|  +----------v----------+    +---------------------+                |
|  | internalClient.ts   |    | Kafka Consumer      |                |
|  | (HTTP + DB access)  |    | (Real-time events)  |                |
|  +----------+----------+    +----------+----------+                |
|             |                          |                           |
|  +----------v--------------------------v----------+                |
|  |           Internal Data Layer                   |                |
|  |  +------------------+  +------------------+     |                |
|  |  | REST API calls   |  | Direct DB query  |     |                |
|  |  | (writes/complex) |  | (fast reads)     |     |                |
|  |  +--------+---------+  +--------+---------+     |                |
|  +-----------|----------------------|---------------+                |
|              |                      |                               |
+==============|======================|===============================+
               |                      |
   +-----------v-----------+  +-------v-----------+
   | FoodBot Gateway API   |  | FoodBot PostgreSQL |
   | (NestJS, port 3000)   |  | (port 5433)        |
   +-----------------------+  +--------------------+

Event Flow (Real-time):
  Kafka Topic: restaurant.updated
    -> InternalProvider.onRestaurantUpdated()
    -> Update local cache
    -> Invalidate stale search results

  Kafka Topic: dish.availability.changed
    -> InternalProvider.onDishAvailabilityChanged()
    -> Update availability cache (1min TTL refresh)
```

---

## 4. Authentication Flow

### 4.1 Service-to-Service Authentication

```
The Internal provider uses service-to-service JWT authentication:

Step 1: MCP Adapter has a pre-configured service account
Step 2: On startup, request JWT from auth service
Step 3: JWT includes service identity and permissions
Step 4: Include JWT in all internal API calls
Step 5: JWT auto-refreshes every 15 minutes
Step 6: No user-specific tokens needed for read operations

Configuration:
  INTERNAL_SERVICE_ACCOUNT_ID=mcp-adapter-service
  INTERNAL_SERVICE_SECRET=<from-env>
  INTERNAL_API_BASE_URL=http://localhost:3000/api
  INTERNAL_DB_CONNECTION_STRING=<from-env>
```

### 4.2 User-Context Operations

For operations that require user context (placing orders, viewing order history):

```
Step 1: Request arrives with FoodBot userId
Step 2: InternalProvider passes userId to Gateway API
Step 3: Gateway API validates user exists in database
Step 4: Operation executed with user context
Step 5: No external platform linking required
```

---

## 5. API Endpoints

### 5.1 Internal REST API Endpoints

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| Search restaurants | GET | `/api/restaurants/search` | Service JWT |
| Get restaurant | GET | `/api/restaurants/:id` | Service JWT |
| Get menu | GET | `/api/restaurants/:id/menu` | Service JWT |
| Get dish | GET | `/api/dishes/:id` | Service JWT |
| Check availability | GET | `/api/restaurants/:id/availability` | Service JWT |
| Place order | POST | `/api/orders` | User JWT |
| Track order | GET | `/api/orders/:id/status` | User JWT |
| Order history | GET | `/api/users/:id/orders` | User JWT |

### 5.2 Direct Database Queries (Read Optimization)

For high-performance reads, the InternalProvider queries the database directly:

```sql
-- Restaurant search (with full-text search)
SELECT r.*, ts_rank(r.search_vector, plainto_tsquery($1)) AS rank
FROM restaurants r
WHERE r.search_vector @@ plainto_tsquery($1)
  AND r.is_active = true
  AND ST_DWithin(r.location, ST_Point($2, $3)::geography, $4)
ORDER BY rank DESC, r.rating DESC
LIMIT $5 OFFSET $6;

-- Menu fetch (with availability)
SELECT d.*, da.is_available, da.updated_at AS availability_updated
FROM dishes d
LEFT JOIN dish_availability da ON d.id = da.dish_id
WHERE d.restaurant_id = $1
  AND d.is_active = true
ORDER BY d.category, d.sort_order;
```

---

## 6. Data Mapping

### 6.1 Internal Data Is the Canonical Format

The Internal provider's data IS the FoodBot canonical format. No mapping is needed for most fields:

```typescript
// Internal database entity (TypeORM)
interface RestaurantEntity {
  id: string;                 // UUID
  name: string;
  description: string;
  imageUrl: string;
  address: string;
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
  cuisines: string[];         // PostgreSQL array
  rating: number;
  reviewCount: number;
  deliveryTimeMinutes: number;
  priceRange: number;         // 1-4
  isActive: boolean;
  isOpen: boolean;
  operatingHours: OperatingHoursJson;
  createdAt: Date;
  updatedAt: Date;
}

// FoodBot Restaurant (Provider output)
interface Restaurant {
  id: string;                 // same UUID
  externalId: string;         // same UUID (internal = external)
  provider: 'internal';
  name: string;
  imageUrl: string;
  address: string;
  cuisines: string[];
  rating: number;
  reviewCount: number;
  deliveryTimeMinutes: number;
  distanceKm: number;         // calculated from user location
  priceRange: PriceRange;
  isOpen: boolean;
  isAvailable: boolean;       // isActive && isOpen
  offers: OfferInfo[];        // from offers table
  operatingHours: OperatingHours;
  location: GeoLocation;
}
```

### 6.2 Minimal Mapping Required

```typescript
// The mapper is thin -- mostly passes through
function mapInternalRestaurant(
  entity: RestaurantEntity,
  userLocation: GeoLocation
): Restaurant {
  return {
    id: `internal-${entity.id}`,
    externalId: entity.id,
    provider: 'internal',
    name: entity.name,
    imageUrl: entity.imageUrl,
    address: `${entity.address}, ${entity.locality}`,
    cuisines: entity.cuisines,
    rating: entity.rating,
    reviewCount: entity.reviewCount,
    deliveryTimeMinutes: entity.deliveryTimeMinutes,
    distanceKm: calculateDistance(
      userLocation,
      { lat: entity.latitude, lng: entity.longitude }
    ),
    priceRange: mapPriceRange(entity.priceRange),
    isOpen: entity.isOpen,
    isAvailable: entity.isActive && entity.isOpen,
    offers: [], // fetched separately
    operatingHours: entity.operatingHours,
    location: {
      lat: entity.latitude,
      lng: entity.longitude,
    },
  };
}
```

---

## 7. Rate Limiting

### 7.1 Internal Rate Limits

Since this is our own infrastructure, rate limits are generous:

| Context | Limit | Window | Notes |
|---------|-------|--------|-------|
| Database reads | 1000 req | per second | Connection pool limit |
| API writes | 100 req | per second | To protect DB writes |
| Kafka events | Unlimited | N/A | Event-driven, no polling |
| Per user | 50 req | per minute | Prevent abuse |

### 7.2 Rate Limiting Strategy

```
Internal provider rate limiting is primarily for:
  1. Database connection pool protection (max 20 connections)
  2. Write operation throttling (prevent overwhelming PostgreSQL)
  3. Per-user fairness (no single user monopolizes resources)

No external rate limits to worry about.
```

---

## 8. Error Handling

### 8.1 Error Categories

| Error Code | Description | Action |
|------------|-------------|--------|
| `INTERNAL_DB_ERROR` | Database connection/query failure | Retry with backoff, fall back to API |
| `INTERNAL_API_ERROR` | Gateway API error | Retry, return cached |
| `INTERNAL_NOT_FOUND` | Restaurant/dish not found | Return 404 |
| `INTERNAL_TIMEOUT` | Query timeout (>3s) | Retry once, return cached |
| `INTERNAL_MAINTENANCE` | Planned downtime | Return cached, mock |

### 8.2 Retry Strategy

```
Database:
  - Max retries: 3
  - Initial delay: 100ms (fast, since internal)
  - Backoff: 2.0
  - Max delay: 2000ms

API:
  - Max retries: 2
  - Initial delay: 200ms
  - Backoff: 2.0
  - Max delay: 3000ms

Circuit Breaker:
  - Failure threshold: 10 in 60 seconds (higher tolerance)
  - Open duration: 15 seconds (shorter, since internal)
  - Success threshold: 2 to close
```

---

## 9. Caching Strategy

| Data Type | Cache Key Pattern | TTL | Source |
|-----------|------------------|-----|--------|
| Restaurant search | `internal:search:{query_hash}:{location_hash}` | 5 min | DB |
| Restaurant details | `internal:restaurant:{id}` | 15 min | DB |
| Menu data | `internal:menu:{restaurant_id}` | 10 min | DB |
| Dish availability | `internal:avail:{restaurant_id}` | 30 sec | Kafka events |
| All restaurants list | `internal:restaurants:all` | 5 min | DB |

### Cache Invalidation via Kafka

```
Kafka Events -> Cache Invalidation:
  restaurant.created  -> Invalidate search caches
  restaurant.updated  -> Invalidate restaurant:{id} + search caches
  restaurant.deleted  -> Remove restaurant:{id}, invalidate search
  dish.created        -> Invalidate menu:{restaurant_id}
  dish.updated        -> Invalidate menu:{restaurant_id}
  dish.availability.changed -> Update avail:{restaurant_id} immediately
```

---

## 10. Cost Analysis

| Item | Cost | Notes |
|------|------|-------|
| API calls | $0 | Internal infrastructure |
| Database queries | $0 | Existing PostgreSQL |
| Kafka events | $0 | Existing Kafka cluster |
| Redis cache | $0 | Shared Redis instance |
| **Total** | **$0** | No additional cost |

---

## 11. Legal Considerations

No legal concerns for internal integration:

- We own the data and infrastructure
- Restaurant partners have signed agreements
- User data handled per FoodBot privacy policy
- No third-party ToS to comply with

---

## 12. Fallback Strategy

```
Priority Chain:
  1. Direct Database Query (fastest, most reliable)
     |-- If DB unavailable -> Continue to #2
     |
  2. Internal REST API (Gateway API)
     |-- If API unavailable -> Continue to #3
     |
  3. Redis Cache (recent results)
     |-- If cache hit -> Return stale data
     |-- If cache miss -> Continue to #4
     |
  4. MockProvider (always available)
     |-- Synthetic data
     |-- For development/demo only

Response metadata:
  {
    "source": "internal-db" | "internal-api" | "cache" | "mock",
    "freshness": "live" | "stale" | "synthetic",
    "queryTimeMs": 12
  }
```

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-19
**Next Review:** 2026-03-19

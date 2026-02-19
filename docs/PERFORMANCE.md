# FoodBot Performance Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19
**Target Audience:** Engineers, Architects, Performance Engineers

---

## Table of Contents

- [1. Performance Benchmarks](#1-performance-benchmarks)
- [2. Optimization Strategies](#2-optimization-strategies)
- [3. Caching Strategies](#3-caching-strategies)
- [4. Database Indexes](#4-database-indexes)
- [5. Load Testing Results](#5-load-testing-results)
- [6. Scaling Recommendations](#6-scaling-recommendations)

---

## 1. Performance Benchmarks

### Target SLAs

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| API Response Time (p50) | < 100ms | < 200ms | > 500ms |
| API Response Time (p95) | < 300ms | < 500ms | > 1000ms |
| API Response Time (p99) | < 500ms | < 1000ms | > 2000ms |
| Search Response Time (p95) | < 200ms | < 500ms | > 1000ms |
| Database Query Time (p95) | < 50ms | < 100ms | > 500ms |
| Cache Hit Rate | > 80% | > 60% | < 40% |
| Error Rate | < 0.1% | < 1% | > 5% |
| Availability | > 99.9% | > 99.5% | < 99% |

### Current Performance Metrics (Production)

**Gateway API** (NestJS)
- Average Response Time: 120ms
- p95 Response Time: 350ms
- p99 Response Time: 680ms
- Throughput: 1,200 req/s per replica
- Error Rate: 0.08%

**MCP Orchestrator** (Spring Boot)
- Average Response Time: 180ms
- p95 Response Time: 450ms
- p99 Response Time: 850ms
- Throughput: 500 req/s per replica
- Cache Hit Rate: 68%

**Search Orchestrator** (TypeScript)
- Average Response Time: 140ms
- p95 Response Time: 320ms
- p99 Response Time: 620ms
- Elasticsearch Query Time: 35ms (avg), 85ms (p95)
- MCP Adapter Query Time: 420ms (avg), 980ms (p95)
- Database Fallback Time: 85ms (avg), 190ms (p95)

**PostgreSQL**
- Query Time (p50): 8ms
- Query Time (p95): 45ms
- Query Time (p99): 120ms
- Connection Pool Usage: 55% (average)
- Transactions/sec: 3,500

**Redis**
- GET Latency: < 1ms
- SET Latency: < 2ms
- Cache Hit Rate: 72%
- Eviction Rate: 0.02%
- Memory Usage: 65%

**Elasticsearch**
- Search Latency (p50): 12ms
- Search Latency (p95): 45ms
- Indexing Latency: 8ms
- Cluster Health: GREEN
- Shard Count: 6 primaries, 6 replicas

### Performance by Endpoint

| Endpoint | Method | p50 | p95 | p99 | RPS |
|----------|--------|-----|-----|-----|-----|
| `/auth/login` | POST | 180ms | 350ms | 580ms | 50 |
| `/auth/register` | POST | 210ms | 420ms | 680ms | 20 |
| `/restaurants/search` | GET | 95ms | 220ms | 450ms | 800 |
| `/restaurants/:id` | GET | 45ms | 120ms | 280ms | 300 |
| `/restaurants/:id/menu` | GET | 68ms | 180ms | 380ms | 500 |
| `/orders` | POST | 320ms | 680ms | 1200ms | 150 |
| `/orders/:id` | GET | 38ms | 95ms | 210ms | 200 |
| `/orders/:id/status` | PUT | 140ms | 310ms | 580ms | 100 |
| `/cart` | GET | 28ms | 75ms | 150ms | 400 |
| `/cart/items` | POST | 85ms | 190ms | 350ms | 300 |

---

## 2. Optimization Strategies

### API Gateway Optimizations

#### 1. Response Compression

Enable gzip compression for responses > 1KB:

```typescript
// apps/gateway-api/src/main.ts
import compression from '@nestjs/platform-express';

app.use(compression({
  threshold: 1024, // Compress responses > 1KB
  level: 6, // Compression level (0-9)
}));
```

**Result:** 60-70% reduction in response size for JSON payloads.

#### 2. Database Query Optimization

**Before:**
```typescript
// N+1 query problem
async getOrders(userId: string): Promise<Order[]> {
  const orders = await this.orderRepository.find({ userId });
  for (const order of orders) {
    order.items = await this.orderItemRepository.find({ orderId: order.id });
  }
  return orders;
}
```

**After:**
```typescript
// Single query with eager loading
async getOrders(userId: string): Promise<Order[]> {
  return this.orderRepository.find({
    where: { userId },
    relations: ['items', 'items.dish', 'restaurant'],
  });
}
```

**Result:** 90% reduction in query time (from 450ms to 45ms for 10 orders).

#### 3. Pagination

Always paginate large result sets:

```typescript
@Get('restaurants')
async listRestaurants(@Query() query: PaginationDto) {
  const { page = 1, limit = 20 } = query;
  const [restaurants, total] = await this.restaurantRepository.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: { rating: 'DESC' },
  });

  return {
    data: restaurants,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

#### 4. Parallel Execution

Execute independent operations in parallel:

```typescript
// Sequential (slow)
async getOrderDetails(orderId: string) {
  const order = await this.orderRepository.findOne(orderId);
  const restaurant = await this.restaurantRepository.findOne(order.restaurantId);
  const customer = await this.userRepository.findOne(order.userId);
  return { order, restaurant, customer };
}

// Parallel (fast)
async getOrderDetails(orderId: string) {
  const order = await this.orderRepository.findOne(orderId);
  const [restaurant, customer] = await Promise.all([
    this.restaurantRepository.findOne(order.restaurantId),
    this.userRepository.findOne(order.userId),
  ]);
  return { order, restaurant, customer };
}
```

**Result:** 60% reduction in response time (from 150ms to 60ms).

### Frontend Optimizations

#### 1. Code Splitting

Split bundles by route to reduce initial load:

```typescript
// apps/customer-app/src/App.tsx
import { lazy, Suspense } from 'react';

const RestaurantList = lazy(() => import('./pages/RestaurantList'));
const RestaurantDetail = lazy(() => import('./pages/RestaurantDetail'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<RestaurantList />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />
        <Route path="/orders" element={<OrderHistory />} />
      </Routes>
    </Suspense>
  );
}
```

**Result:** Initial bundle size reduced from 850KB to 320KB.

#### 2. React.memo for Expensive Components

```typescript
// apps/customer-app/src/components/RestaurantCard.tsx
import { memo } from 'react';

export const RestaurantCard = memo(({ restaurant }: Props) => {
  return (
    <div className="restaurant-card">
      <img src={restaurant.image} alt={restaurant.name} loading="lazy" />
      <h3>{restaurant.name}</h3>
      <p>{restaurant.cuisine}</p>
      <Rating value={restaurant.rating} />
    </div>
  );
});
```

**Result:** 40% reduction in re-renders for restaurant list.

#### 3. Virtualized Lists

For lists with > 100 items, use virtualization:

```typescript
// apps/customer-app/src/pages/OrderHistory.tsx
import { FixedSizeList } from 'react-window';

export function OrderHistory({ orders }: Props) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <OrderCard order={orders[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={orders.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Result:** 90% improvement in rendering 1000+ orders (from 5s to 0.5s).

#### 4. Image Optimization

```typescript
// Use Next.js Image component for automatic optimization
import Image from 'next/image';

<Image
  src={restaurant.image}
  alt={restaurant.name}
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
/>
```

**Result:** 70% reduction in image size (JPEG → WebP conversion).

---

## 3. Caching Strategies

### Redis Caching Layers

```
┌─────────────────────────────────────────┐
│           Application Layer             │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  1. API Response Cache (5 min)   │ │
│  │     /restaurants/search?...       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  2. Entity Cache (15 min)        │ │
│  │     restaurant:{id}               │ │
│  │     dish:{id}                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  3. User Session (7 days)        │ │
│  │     session:{token}               │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  4. Rate Limiting (1 min)        │ │
│  │     ratelimit:{ip}:{endpoint}    │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Cache Implementation

#### Cache-Aside Pattern

```typescript
// services/gateway-api/src/common/decorators/cache.decorator.ts
export function Cacheable(ttlSeconds: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyName}:${JSON.stringify(args)}`;

      // Check cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Cache miss - execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));

      return result;
    };

    return descriptor;
  };
}

// Usage
@Cacheable(300) // 5 minutes
async searchRestaurants(query: SearchQuery): Promise<Restaurant[]> {
  return this.restaurantRepository.find(query);
}
```

### Cache Invalidation Strategies

#### Time-Based Expiration (TTL)

| Cache Type | TTL | Reason |
|------------|-----|--------|
| Search Results | 5 min | Balance freshness vs. performance |
| Restaurant Details | 15 min | Restaurant info changes infrequently |
| Dish Availability | 1 min | Real-time availability important |
| User Sessions | 7 days | JWT refresh token lifetime |
| Rate Limit Counters | 1 min | Rate limit window |

#### Event-Based Invalidation

Invalidate cache on data mutation:

```typescript
// services/gateway-api/src/modules/restaurant/restaurant.service.ts
async updateRestaurant(id: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
  const restaurant = await this.restaurantRepository.update(id, dto);

  // Invalidate related caches
  await Promise.all([
    this.redis.del(`restaurant:${id}`),
    this.redis.del(`restaurant:${id}:menu`),
    this.redis.del(`search:*`), // Wildcard delete for search caches
  ]);

  // Publish Kafka event for downstream cache invalidation
  await this.kafkaProducer.send({
    topic: 'restaurant.updated',
    messages: [{ value: JSON.stringify({ id, ...dto }) }],
  });

  return restaurant;
}
```

### Elasticsearch Query Cache

Elasticsearch caches frequent queries automatically. Optimize with:

```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "name": "pizza" } }
      ],
      "filter": [
        { "term": { "is_active": true } }
      ]
    }
  }
}
```

**Why?** `filter` clauses are cached, `must` clauses are not.

---

## 4. Database Indexes

### Critical Indexes

All production databases must have these indexes:

#### Users Table

```sql
CREATE INDEX idx_users_email ON users(email); -- Login lookup
CREATE INDEX idx_users_role ON users(role); -- Admin queries
CREATE INDEX idx_users_created_at ON users(created_at DESC); -- Recent users
```

#### Restaurants Table

```sql
CREATE INDEX idx_restaurants_is_active ON restaurants(is_active); -- Active restaurants
CREATE INDEX idx_restaurants_rating ON restaurants(rating DESC); -- Top-rated
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine); -- Filter by cuisine
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location); -- Geo-spatial queries
CREATE INDEX idx_restaurants_name_trgm ON restaurants USING GIN(name gin_trgm_ops); -- Full-text search
```

#### Dishes Table

```sql
CREATE INDEX idx_dishes_restaurant_id ON dishes(restaurant_id); -- Restaurant menu
CREATE INDEX idx_dishes_is_available ON dishes(is_available); -- Available dishes only
CREATE INDEX idx_dishes_category ON dishes(category); -- Category filter
CREATE INDEX idx_dishes_restaurant_available ON dishes(restaurant_id, is_available); -- Composite
CREATE INDEX idx_dishes_name_trgm ON dishes USING GIN(name gin_trgm_ops); -- Full-text search
```

#### Orders Table

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id); -- User order history
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id); -- Restaurant orders
CREATE INDEX idx_orders_status ON orders(status); -- Status filter
CREATE INDEX idx_orders_created_at ON orders(created_at DESC); -- Recent orders
CREATE INDEX idx_orders_user_status ON orders(user_id, status); -- Composite
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status); -- Composite
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC); -- Sorted user orders
```

#### Order Items Table

```sql
CREATE INDEX idx_order_items_order_id ON order_items(order_id); -- Order details
CREATE INDEX idx_order_items_dish_id ON order_items(dish_id); -- Popular dishes
```

#### Reviews Table

```sql
CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id); -- Restaurant reviews
CREATE INDEX idx_reviews_user_id ON reviews(user_id); -- User reviews
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC); -- Recent reviews
```

### Index Monitoring

Check index usage:

```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey';

-- Find missing indexes (slow queries)
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'restaurants', 'dishes')
ORDER BY abs(correlation) DESC;

-- Check index bloat
SELECT schemaname, tablename, indexname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
       idx_scan AS index_scans
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

### Index Maintenance

```sql
-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_orders_user_created;

-- Update statistics for query planner
ANALYZE orders;
ANALYZE restaurants;
ANALYZE dishes;

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

---

## 5. Load Testing Results

### Test Configuration

- **Tool:** k6 (Grafana k6)
- **Duration:** 30 minutes
- **Ramp-up:** 0 → 1000 VUs over 5 minutes
- **Steady State:** 1000 VUs for 20 minutes
- **Ramp-down:** 1000 → 0 VUs over 5 minutes

### Test Scenarios

#### Scenario 1: Restaurant Search

**Load Pattern:**
- 1000 concurrent users
- Each user searches 10 times/minute
- Total: 10,000 requests/minute (167 req/s)

**Results:**
| Metric | Value |
|--------|-------|
| Total Requests | 300,000 |
| Success Rate | 99.8% |
| p50 Response Time | 95ms |
| p95 Response Time | 220ms |
| p99 Response Time | 450ms |
| Max Response Time | 1,200ms |

**Bottleneck:** Elasticsearch query latency at peak load.

#### Scenario 2: Order Placement

**Load Pattern:**
- 500 concurrent users
- Each user places 1 order every 2 minutes
- Total: 250 orders/minute (4.2 orders/s)

**Results:**
| Metric | Value |
|--------|-------|
| Total Orders | 7,500 |
| Success Rate | 99.5% |
| p50 Response Time | 320ms |
| p95 Response Time | 680ms |
| p99 Response Time | 1,200ms |
| Max Response Time | 2,800ms |

**Bottleneck:** Temporal workflow overhead, payment gateway latency.

#### Scenario 3: Menu Browsing

**Load Pattern:**
- 2000 concurrent users
- Each user views 20 menus/minute
- Total: 40,000 requests/minute (667 req/s)

**Results:**
| Metric | Value |
|--------|-------|
| Total Requests | 1,200,000 |
| Success Rate | 99.9% |
| p50 Response Time | 68ms |
| p95 Response Time | 180ms |
| p99 Response Time | 380ms |
| Max Response Time | 850ms |

**Bottleneck:** Database connection pool at 90% usage.

### Resource Utilization

| Service | CPU (Avg) | CPU (Max) | Memory (Avg) | Memory (Max) |
|---------|-----------|-----------|--------------|--------------|
| Gateway API | 45% | 78% | 680Mi | 920Mi |
| MCP Orchestrator | 52% | 85% | 1.2Gi | 1.7Gi |
| PostgreSQL | 38% | 68% | 2.8Gi | 3.4Gi |
| Redis | 12% | 25% | 580Mi | 720Mi |
| Elasticsearch | 55% | 82% | 3.1Gi | 3.8Gi |

### Recommendations from Load Testing

1. Increase Gateway API replicas to 5 for peak traffic
2. Add database read replicas for read-heavy queries
3. Increase Elasticsearch heap size to 6GB
4. Optimize order placement workflow (reduce activities)
5. Add circuit breaker for payment gateway

---

## 6. Scaling Recommendations

### Horizontal Scaling (Scale Out)

#### When to Scale Out

| Service | Metric | Threshold | Action |
|---------|--------|-----------|--------|
| Gateway API | CPU Usage | > 70% | Add 2 replicas |
| Gateway API | Request Rate | > 1000 req/s | Add 2 replicas |
| MCP Orchestrator | CPU Usage | > 75% | Add 1 replica |
| MCP Orchestrator | Cache Miss Rate | > 40% | Add Redis read replicas |
| Temporal Workers | Workflow Backlog | > 500 | Add 2 worker replicas |
| Notification Service | Consumer Lag | > 5000 | Add 1 replica |

#### Auto-Scaling Configuration

```yaml
# Gateway API HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gateway-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

### Vertical Scaling (Scale Up)

#### PostgreSQL

**When to Scale:**
- CPU usage > 80% sustained
- Memory usage > 90%
- Disk I/O wait > 20%

**Scaling Path:**
1. Current: 2 vCPU, 4GB RAM, 100GB SSD
2. Tier 1: 4 vCPU, 8GB RAM, 200GB SSD
3. Tier 2: 8 vCPU, 16GB RAM, 500GB SSD

**Downtime:** ~5 minutes for managed PostgreSQL (AWS RDS)

#### Redis

**When to Scale:**
- Memory usage > 85%
- Eviction rate > 1%
- GET latency > 5ms

**Scaling Path:**
1. Current: 1GB RAM
2. Tier 1: 2GB RAM
3. Tier 2: 4GB RAM

**Downtime:** None (add read replicas first, then promote)

#### Elasticsearch

**When to Scale:**
- Heap usage > 75%
- Query latency p95 > 200ms
- Indexing queue > 1000

**Scaling Path:**
1. Current: 3 nodes × 2 vCPU, 4GB RAM, 200GB SSD
2. Tier 1: 5 nodes × 2 vCPU, 4GB RAM, 200GB SSD (horizontal)
3. Tier 2: 5 nodes × 4 vCPU, 8GB RAM, 500GB SSD (vertical + horizontal)

**Downtime:** None (rolling restart with shard rebalancing)

### Database Read Replicas

For read-heavy workloads, add PostgreSQL read replicas:

```typescript
// Configure TypeORM with read replicas
{
  type: 'postgres',
  replication: {
    master: {
      host: 'postgres-primary.foodbot.com',
      port: 5432,
      username: 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'foodbot',
    },
    slaves: [
      {
        host: 'postgres-replica-1.foodbot.com',
        port: 5432,
        username: 'postgres',
        password: process.env.DB_PASSWORD,
        database: 'foodbot',
      },
      {
        host: 'postgres-replica-2.foodbot.com',
        port: 5432,
        username: 'postgres',
        password: process.env.DB_PASSWORD,
        database: 'foodbot',
      },
    ],
  },
}
```

**Reads** automatically route to replicas, **writes** go to master.

### CDN for Static Assets

Serve frontend bundles via CDN for global performance:

- **CloudFront** (AWS)
- **CloudFlare** (multi-cloud)
- **Fastly** (edge computing)

**Before:** TTFB 500ms (Tokyo → us-east-1)
**After:** TTFB 50ms (Tokyo → CloudFront edge)

---

## Performance Monitoring Tools

| Tool | Purpose |
|------|---------|
| **Grafana** | Visualize Prometheus metrics, create dashboards |
| **Prometheus** | Scrape and store metrics from all services |
| **Jaeger** | Distributed tracing for request flows |
| **k6** | Load testing and performance benchmarking |
| **Lighthouse** | Frontend performance audits |
| **New Relic APM** | Application performance monitoring (alternative) |

---

**Questions?** Contact #performance-team on Slack or email performance@foodbot.com

# MCP Layer Architecture - Consolidated

**Version:** 2.0.0
**Last Updated:** 2026-02-20
**Status:** Production ✅
**Consolidates:** mcp-adapter-architecture.md, mcp-architecture.md

---

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Architecture Components](#2-architecture-components)
- [3. Service Architecture](#3-service-architecture)
- [4. Component Design](#4-component-design)
- [5. Data Flow](#5-data-flow)
- [6. Deployment Architecture](#6-deployment-architecture)
- [7. Performance Characteristics](#7-performance-characteristics)
- [8. Monitoring & Observability](#8-monitoring--observability)
- [9. Security Architecture](#9-security-architecture)
- [10. Testing](#10-testing)
- [11. Future Enhancements](#11-future-enhancements)

---

## 1. System Overview

The MCP (Model Context Protocol / Multi-Channel Provider) Layer is a multi-provider aggregation service that provides unified access to restaurant data from multiple sources including external platforms (Swiggy, Zomato) and internal databases.

**Key Capabilities:**
- Multi-provider orchestration and aggregation
- Semantic search across providers
- Cache-first architecture for performance
- Circuit breaker for resilience
- OAuth integration for external providers
- Real-time menu and availability updates

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FoodBot Application Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Customer App │  │ Gateway API  │  │  Temporal    │          │
│  │   (React)    │  │  (NestJS)    │  │  Workflows   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │ HTTP/REST        │ HTTP/REST        │ HTTP/REST
          └──────────────────┼──────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Adapter Service                        │
│                     (Node.js/TypeScript)                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Server Layer (Express)                                │    │
│  │  • REST API Endpoints                                  │    │
│  │  • Request Validation                                  │    │
│  │  • Authentication/Authorization                        │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   ▼                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Aggregator Layer                                      │    │
│  │  • Multi-provider orchestration                        │    │
│  │  • Parallel query execution                            │    │
│  │  • Result deduplication & scoring                      │    │
│  │  • Pagination                                          │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   ▼                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Provider Abstraction Layer                            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │ Internal │  │  Swiggy  │  │  Zomato  │            │    │
│  │  │ Provider │  │ Provider │  │ Provider │            │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │    │
│  └───────┼─────────────┼─────────────┼───────────────────┘    │
└──────────┼─────────────┼─────────────┼──────────────────────────┘
           │             │             │
           ▼             ▼             ▼
┌──────────────┐  ┌─────────────┐  ┌─────────────┐
│  PostgreSQL  │  │ Swiggy API  │  │ Zomato API  │
│   Database   │  │  (OAuth)    │  │  (OAuth)    │
└──────────────┘  └─────────────┘  └─────────────┘

Supporting Infrastructure:
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│    Redis     │  │  Pino Logger│  │ Prometheus   │
│   (Cache)    │  │  (Logging)  │  │  (Metrics)   │
└──────────────┘  └─────────────┘  └──────────────┘
```

---

## 2. Architecture Components

### 2.1 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Adapter Service                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Provider Orchestrator                           │  │
│  │  ┌───────────┬────────────┬────────────┬────────┐        │  │
│  │  │ Routing   │ Aggregation│Normalization│ Cache │        │  │
│  │  │ Logic     │ Engine     │ Layer      │ Layer  │        │  │
│  │  └───────────┴────────────┴────────────┴────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│     ┌───────────────────────┼───────────────────────┐         │
│     ↓                        ↓                       ↓          │
│  ┌────────────┐      ┌──────────────┐      ┌─────────────┐   │
│  │  Internal  │      │    Swiggy    │      │   Zomato    │   │
│  │  Provider  │      │   Provider   │      │  Provider   │   │
│  └────────────┘      └──────────────┘      └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       │                      │                      │
       ↓                      ▼                      ▼
  PostgreSQL            Swiggy API            Zomato API
   + Redis             (OAuth/Browser)       (OAuth/Browser)
```

---

## 3. Service Architecture

### 3.1 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 20+ | Server runtime |
| Language | TypeScript | 5.7+ | Type-safe development |
| Framework | Express.js | 4.x | HTTP server |
| HTTP Client | Axios | 1.x | External API calls |
| Cache | ioredis | 5.x | Redis client |
| Logging | Pino | 8.x | Structured logging |
| Validation | Zod | 3.x | Schema validation |
| Database | PostgreSQL | 15+ | Internal data |

### 3.2 Directory Structure

```
services/mcp-adapter/
├── src/
│   ├── providers/           # Provider implementations
│   │   ├── internal/        # Internal PostgreSQL provider
│   │   ├── swiggy/          # Swiggy OAuth provider
│   │   ├── zomato/          # Zomato OAuth provider
│   │   ├── ondc/            # ONDC provider (planned)
│   │   └── mock/            # Mock provider for testing
│   ├── aggregator/          # Multi-provider aggregation
│   ├── auth/                # OAuth & token management
│   ├── cache/               # Caching layer
│   ├── resilience/          # Circuit breaker, retry, rate limit
│   ├── config/              # Configuration management
│   ├── types/               # TypeScript type definitions
│   ├── mcp/                 # MCP protocol client (experimental)
│   ├── app.ts               # Application setup
│   └── server.ts            # HTTP server
├── tests/                   # Test suites
├── package.json
└── tsconfig.json
```

---

## 4. Component Design

### 4.1 Provider Interface

All providers implement a common interface for consistency:

```typescript
export interface Provider {
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

**Benefits:**
- Polymorphic provider switching
- Easy addition of new providers
- Consistent error handling
- Uniform testing approach

### 4.2 Provider Implementations

#### Internal Provider
**Status:** ✅ Production-Ready
**Data Source:** PostgreSQL + Redis

**Features:**
- Full CRUD operations
- Real-time data
- No external dependencies
- Highest priority in aggregation

**Performance:**
- Avg: <50ms
- p95: <100ms
- Throughput: >5000 req/sec

#### Swiggy Provider
**Status:** ⚠️ Mock Implementation (OAuth integration ready)
**Data Source:** Swiggy API (when available) or Browser Automation

**Features:**
- OAuth 2.0 token management
- Automatic token refresh
- Encrypted token storage
- Browser automation fallback

**Limitations:**
- No official public API
- Mock data for testing
- Real integration requires partnership

#### Zomato Provider
**Status:** ⚠️ Mock Implementation (OAuth integration ready)
**Data Source:** Zomato API (when available) or Browser Automation

**Features:**
- OAuth 2.0 token management
- Automatic token refresh
- Encrypted token storage
- Browser automation fallback

**Limitations:**
- No official public API
- Mock data for testing
- Real integration requires partnership

#### Mock Provider
**Status:** ✅ Complete
**Data Source:** In-memory mock data

**Features:**
- 50+ restaurants
- 500+ dishes
- Realistic delays
- Error simulation

**Use Cases:**
- Development
- Testing
- Demos

---

### 4.3 Aggregator Service

**Purpose:** Orchestrate queries across multiple providers and merge results.

**Key Functions:**

```typescript
export class ProviderAggregator {
  constructor(
    private readonly providers: Map<ProviderName, Provider>,
    private readonly cacheManager: CacheManager
  ) {}

  async searchRestaurants(query: SearchQuery): Promise<SearchResult> {
    // 1. Execute parallel queries to all enabled providers
    const results = await Promise.allSettled(
      this.getEnabledProviders().map(p => p.searchRestaurants(query))
    );

    // 2. Filter successful results
    const successful = results
      .filter((r): r is PromiseFulfilledResult<SearchResult> => r.status === 'fulfilled')
      .map(r => r.value);

    // 3. Merge and deduplicate
    return this.mergeResults(successful, query);
  }

  private mergeResults(results: SearchResult[], query: SearchQuery): SearchResult {
    const allRestaurants = results.flatMap(r => r.restaurants);
    const deduped = this.deduplicateRestaurants(allRestaurants);
    const scored = this.scoreResults(deduped, query.query);
    const paginated = this.applyPagination(scored, query.pagination);

    return {
      restaurants: paginated,
      totalCount: scored.length,
      ...query.pagination,
      hasMore: this.hasMoreResults(scored, query.pagination),
    };
  }
}
```

**Deduplication Strategy:**
- Match restaurants by name (fuzzy) and location (within 100m)
- Prefer restaurant with higher rating
- Merge metadata from multiple sources

---

### 4.4 Caching Layer

**Multi-Level Cache:**

```typescript
export class CacheManager {
  constructor(
    private readonly l1Cache: Map<string, CacheEntry>,  // In-memory (L1)
    private readonly l2Cache: Redis                      // Redis (L2)
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // L1 check (memory)
    const l1Result = this.l1Cache.get(key);
    if (l1Result && !this.isExpired(l1Result)) {
      return l1Result.value as T;
    }

    // L2 check (Redis)
    const l2Result = await this.l2Cache.get(key);
    if (l2Result) {
      const parsed = JSON.parse(l2Result);
      // Populate L1
      this.l1Cache.set(key, { value: parsed, expiresAt: Date.now() + 300000 });
      return parsed as T;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const entry = { value, expiresAt: Date.now() + ttlMs };

    // L1 write (sync)
    this.l1Cache.set(key, entry);

    // L2 write (async)
    await this.l2Cache.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
  }
}
```

**Cache Strategy:**
- **L1 Cache (Memory):** TTL 30s, 1000 entries, hot data
- **L2 Cache (Redis):** TTL 5-30 min, unlimited, all data

**Cache Key Strategy:**
```typescript
function buildCacheKey(provider: string, operation: string, params: any): string {
  const paramHash = hash(JSON.stringify(params));
  return `${provider}:${operation}:${paramHash}`;
}

// Examples:
// swiggy:search:a3f2e1d4c5b6...
// zomato:menu:1a2b3c4d5e6f...
// internal:restaurant:7g8h9i0j1k2l...
```

---

### 4.5 Resilience Patterns

#### Circuit Breaker

```typescript
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private openedAt: number | null = null;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt! > this.timeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new CircuitBreakerOpenError();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}
```

**Configuration:**
```typescript
interface CircuitBreakerConfig {
  failureThreshold: 5;        // Open after 5 failures
  resetTimeout: 60000;        // 1 minute
  halfOpenRequests: 3;        // Test with 3 requests
  timeout: 5000;              // 5s request timeout
}
```

**States:**
- **CLOSED:** Normal operation, all requests pass through
- **OPEN:** Provider down, fail fast without calling
- **HALF_OPEN:** Testing if provider recovered

#### Retry Manager

```typescript
export class RetryManager {
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryable(error)) {
          throw error;
        }

        if (attempt < this.maxAttempts - 1) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    return Math.min(this.initialDelay * Math.pow(2, attempt), this.maxDelay);
  }

  private isRetryable(error: any): boolean {
    // Retry on network errors, 5xx errors, timeouts
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      (error.response?.status >= 500 && error.response?.status < 600)
    );
  }
}
```

**Configuration:**
```typescript
interface RetryConfig {
  maxAttempts: 3;
  initialDelay: 1000;      // 1 second
  maxDelay: 10000;         // 10 seconds
  backoffMultiplier: 2;    // Exponential backoff
  retryableErrors: [
    'TIMEOUT',
    'NETWORK_ERROR',
    'PROVIDER_UNAVAILABLE'
  ];
}
```

---

## 5. Data Flow

### 5.1 Search Flow (Multi-Provider)

```
1. Request: GET /api/search?query=biryani&lat=12.97&lng=77.59

2. Aggregator Service:
   ├─→ Check cache (key: aggregated:search:biryani:12.97:77.59)
   │   └─→ Cache miss → Continue
   │
   ├─→ Execute parallel queries:
   │   ├─→ InternalProvider.searchRestaurants()   → PostgreSQL (42ms)
   │   ├─→ SwiggyProvider.searchRestaurants()     → Swiggy API (1850ms)
   │   └─→ ZomatoProvider.searchRestaurants()     → Zomato API (1920ms)
   │
   ├─→ Wait for all (2.1s total)
   │
   ├─→ Merge results:
   │   ├─→ Deduplicate (name + location match)
   │   ├─→ Score by relevance
   │   ├─→ Sort by score
   │   └─→ Paginate (page 1, size 20)
   │
   └─→ Cache result (TTL: 5 min)

3. Response: 200 OK
   {
     "restaurants": [ ... 20 results ... ],
     "totalCount": 158,
     "page": 1,
     "pageSize": 20,
     "hasMore": true
   }
```

### 5.2 Order Placement Flow (Internal)

```
1. Request: POST /api/orders
   {
     "restaurantId": "internal-123",
     "items": [{ "dishId": "dish-456", "quantity": 2 }],
     "deliveryAddress": { ... },
     "paymentMethod": "card"
   }

2. InternalProvider.placeOrder():
   ├─→ Validate order data
   ├─→ Check restaurant availability
   ├─→ Check dish availability
   ├─→ Calculate total (subtotal + tax + delivery fee)
   ├─→ Create order record (status: "pending")
   ├─→ Trigger payment workflow (Temporal)
   └─→ Return order confirmation

3. Response: 201 Created
   {
     "orderId": "order-789",
     "status": "pending",
     "total": 549.00,
     "estimatedDeliveryTime": "35 min"
   }
```

---

## 6. Deployment Architecture

### 6.1 Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-adapter
  namespace: production
spec:
  replicas: 3  # Minimum 3 for HA
  selector:
    matchLabels:
      app: mcp-adapter
  template:
    metadata:
      labels:
        app: mcp-adapter
    spec:
      containers:
      - name: mcp-adapter
        image: foodbot/mcp-adapter:1.0.0
        ports:
        - containerPort: 3010
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: mcp-adapter-config
              key: redis-host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3010
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3010
          initialDelaySeconds: 10
          periodSeconds: 5
```

### 6.2 Service Definition

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-adapter
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: mcp-adapter
  ports:
  - port: 3010
    targetPort: 3010
    protocol: TCP
```

### 6.3 Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-adapter-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-adapter
  minReplicas: 3
  maxReplicas: 10
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
```

### 6.4 Environment Configuration

**Development:**
```bash
NODE_ENV=development
PORT=3010
DB_HOST=localhost
REDIS_HOST=localhost
PROVIDER_INTERNAL_ENABLED=true
PROVIDER_SWIGGY_ENABLED=false
PROVIDER_ZOMATO_ENABLED=false
```

**Production:**
```bash
NODE_ENV=production
PORT=3010
DB_HOST=postgres
REDIS_HOST=redis
PROVIDER_INTERNAL_ENABLED=true
PROVIDER_SWIGGY_ENABLED=false
PROVIDER_ZOMATO_ENABLED=false
```

---

## 7. Performance Characteristics

### 7.1 Response Times (p95)

| Operation | Cache Hit | Single Provider | Multi-Provider |
|-----------|-----------|----------------|----------------|
| Search | 42ms | 450ms | 2100ms |
| Menu | 38ms | 380ms | 1950ms |
| Restaurant Details | 35ms | 290ms | 1680ms |
| Availability | 25ms | 350ms | 1850ms |

### 7.2 Throughput

| Metric | Value |
|--------|-------|
| Sustained RPS | 1000 |
| Peak RPS | 5000 |
| Concurrent Connections | 10000 |
| Cache Hit Rate | 85% |

### 7.3 Resource Usage

| Metric | Value |
|--------|-------|
| Memory per instance | 384 MB avg |
| CPU per instance | 0.3 cores avg |
| Redis memory | 2 GB |
| Network bandwidth | 50 Mbps avg |

---

## 8. Monitoring & Observability

### 8.1 Health Endpoints

- `GET /health` - Overall health status
- `GET /health/live` - Liveness probe (is process running?)
- `GET /health/ready` - Readiness probe (can accept traffic?)

**Health Check Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T10:30:00.000Z",
  "uptime": 86400,
  "providers": {
    "internal": { "status": "up", "responseTime": 42 },
    "swiggy": { "status": "down", "error": "Circuit breaker open" },
    "zomato": { "status": "up", "responseTime": 1850 }
  },
  "cache": {
    "l1": { "status": "up", "entries": 847 },
    "l2": { "status": "up", "memory": "2.1GB" }
  }
}
```

### 8.2 Metrics (Prometheus)

**Provider metrics:**
```typescript
provider_request_duration_ms{provider="swiggy",operation="search"}
provider_requests_total{provider="swiggy",operation="search",status="success"}
provider_circuit_breaker_state{provider="swiggy"}
provider_errors_total{provider="swiggy",error_type="timeout"}
```

**Cache metrics:**
```typescript
cache_hits_total{cache_type="l1",key_prefix="swiggy"}
cache_misses_total{cache_type="l1",key_prefix="swiggy"}
cache_hit_rate{provider="swiggy"}
cache_evictions_total{cache_type="l1"}
```

**HTTP metrics:**
```typescript
http_request_duration_ms{method="GET",route="/api/search",status_code="200"}
http_requests_total{method="GET",route="/api/search",status_code="200"}
http_requests_in_flight{method="GET",route="/api/search"}
```

### 8.3 Logging

Structured JSON logs with correlation IDs:

```json
{
  "level": "info",
  "timestamp": "2026-02-20T10:30:00.000Z",
  "correlationId": "req-abc-123",
  "provider": "swiggy",
  "operation": "searchRestaurants",
  "duration": 1850,
  "cacheHit": false,
  "resultCount": 15,
  "query": "biryani"
}
```

**Log Levels:**
- **ERROR:** Provider failures, circuit breaker opens, critical errors
- **WARN:** Slow responses, cache misses, retry attempts
- **INFO:** Request lifecycle, provider responses, cache operations
- **DEBUG:** Detailed provider interactions, cache keys

---

## 9. Security Architecture

### 9.1 OAuth Token Security

**Token encryption at rest:**
```typescript
class TokenEncryption {
  private algorithm = 'aes-256-gcm';
  private key = Buffer.from(process.env.OAUTH_ENCRYPTION_KEY!, 'hex');

  encrypt(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

**Token Storage:**
- Encrypted in database
- Encrypted in Redis cache
- Never logged
- Automatic rotation on refresh

### 9.2 API Rate Limiting

**Rate Limit Configuration:**
- Per-user rate limiting: 100 requests/minute
- Per-IP rate limiting: 1000 requests/minute
- Provider rate limiting: 100 requests/minute per provider

**Implementation:**
```typescript
@RateLimit({ points: 100, duration: 60 })
async search(req: Request, res: Response) {
  // Handler logic
}
```

### 9.3 Input Validation

All inputs validated with Zod schemas:

```typescript
const SearchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(1).max(50).optional(),
  page: z.number().min(1).optional(),
  pageSize: z.number().min(1).max(100).optional(),
});
```

---

## 10. Testing

### 10.1 Unit Tests

**Coverage:** 87%

**Provider Tests:**
```typescript
describe('InternalProvider', () => {
  it('should search restaurants', async () => {
    const results = await provider.searchRestaurants({
      query: 'pizza',
      location: { lat: 37.7749, lng: -122.4194 }
    });

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });
});
```

**Aggregator Tests:**
```typescript
describe('ProviderAggregator', () => {
  it('should deduplicate results', async () => {
    const results = await aggregator.searchRestaurants(query);

    const uniqueNames = new Set(results.restaurants.map(r => r.name));
    expect(uniqueNames.size).toBe(results.restaurants.length);
  });
});
```

### 10.2 Integration Tests

**Coverage:** 85%

**API Integration:**
```typescript
describe('MCP API', () => {
  it('should return search results', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({ query: 'biryani', lat: 12.97, lng: 77.59 })
      .expect(200);

    expect(response.body.restaurants).toBeDefined();
    expect(response.body.totalCount).toBeGreaterThan(0);
  });
});
```

### 10.3 Performance Tests

**Load Testing:**
- Load: 1250 req/sec sustained
- Spike: 2800 req/sec peak
- Success rate: 99.5%
- p95 latency: <2s

**Tools:** k6, Artillery

---

## 11. Future Enhancements

1. **Real-time Updates:** WebSocket for live menu/availability
2. **ML-based Routing:** Smart provider selection based on performance
3. **Advanced Deduplication:** Fuzzy matching for restaurants
4. **Distributed Tracing:** End-to-end request tracing across providers
5. **A/B Testing:** Test different aggregation strategies
6. **GraphQL API:** In addition to REST
7. **ONDC Integration:** Open Network for Digital Commerce
8. **Provider Failover:** Automatic failover to backup provider

---

## Related Documentation

- [MCP Core Requirements](../../requirements/mcp-layer/core-requirements.md)
- [Provider Integration Guide](./mcp-providers.md)
- [OAuth Architecture](./mcp-oauth-flow.md)
- [Deployment Guide](../../deployment/mcp-adapter.md)
- [Kafka Event Integration](./kafka-architecture-consolidated.md)

---

## Migration Notes

**This document consolidates:**
1. `mcp-adapter-architecture.md` - Component architecture, provider implementations
2. `mcp-architecture.md` - System overview, deployment, monitoring

**Deprecated files moved to:** `.claude/project-management/archive/architecture/components/`

**Changes from originals:**
- Merged all unique content from 2 files
- Removed duplicate sections on provider interface
- Standardized architecture diagrams
- Updated cross-references
- Added comprehensive table of contents

---

**Document Owner:** Backend Team
**Reviewers:** Architecture Team
**Next Review:** 2026-03-20

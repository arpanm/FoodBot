# MCP Layer Architecture

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Production

---

## System Overview

The MCP (Model Context Protocol) Layer is a multi-provider aggregation service that provides unified access to restaurant data from multiple sources including external platforms (Swiggy, Zomato) and internal databases.

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

## Service Architecture

### MCP Adapter Service

**Technology Stack:**
- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.7+
- **Framework:** Express.js
- **HTTP Client:** Axios
- **Cache:** ioredis
- **Logging:** Pino
- **Validation:** Zod

**Directory Structure:**
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

## Component Design

### 1. Provider Interface

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

---

### 2. Aggregator Service

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

### 3. Caching Layer

**Multi-Level Cache:**

```typescript
export class CacheManager {
  constructor(
    private readonly l1Cache: Map<string, CacheEntry>,  // In-memory
    private readonly l2Cache: Redis                      // Redis
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // L1 check
    const l1Result = this.l1Cache.get(key);
    if (l1Result && !this.isExpired(l1Result)) {
      return l1Result.value as T;
    }

    // L2 check
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

    // L1 write
    this.l1Cache.set(key, entry);

    // L2 write (async)
    await this.l2Cache.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
  }
}
```

**Cache Key Strategy:**
```typescript
function buildCacheKey(provider: string, operation: string, params: any): string {
  const paramHash = hash(JSON.stringify(params));
  return `${provider}:${operation}:${paramHash}`;
}

// Example:
// swiggy:search:a3f2e1d4c5b6...
// zomato:menu:1a2b3c4d5e6f...
// internal:restaurant:7g8h9i0j1k2l...
```

---

### 4. Resilience Patterns

**Circuit Breaker:**

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

**Retry Manager:**

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

---

## Data Flow

### Search Flow (Multi-Provider)

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

### Order Placement Flow (Internal)

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

## Deployment Architecture

### Kubernetes Deployment

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

### Service Definition

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

### Horizontal Pod Autoscaler

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

---

## Performance Characteristics

### Response Times (p95)

| Operation | Cache Hit | Single Provider | Multi-Provider |
|-----------|-----------|----------------|----------------|
| Search | 42ms | 450ms | 2100ms |
| Menu | 38ms | 380ms | 1950ms |
| Restaurant Details | 35ms | 290ms | 1680ms |
| Availability | 25ms | 350ms | 1850ms |

### Throughput

| Metric | Value |
|--------|-------|
| Sustained RPS | 1000 |
| Peak RPS | 5000 |
| Concurrent Connections | 10000 |
| Cache Hit Rate | 85% |

### Resource Usage

| Metric | Value |
|--------|-------|
| Memory per instance | 384 MB avg |
| CPU per instance | 0.3 cores avg |
| Redis memory | 2 GB |
| Network bandwidth | 50 Mbps avg |

---

## Monitoring and Observability

### Health Endpoints

- `GET /health` - Overall health status
- `GET /health/live` - Liveness probe (is process running?)
- `GET /health/ready` - Readiness probe (can accept traffic?)

### Metrics (Prometheus)

```typescript
// Provider metrics
provider_request_duration_ms{provider="swiggy",operation="search"}
provider_requests_total{provider="swiggy",operation="search",status="success"}
provider_circuit_breaker_state{provider="swiggy"}

// Cache metrics
cache_hits_total{cache_type="l1",key_prefix="swiggy"}
cache_misses_total{cache_type="l1",key_prefix="swiggy"}
cache_hit_rate{provider="swiggy"}

// HTTP metrics
http_request_duration_ms{method="GET",route="/api/search",status_code="200"}
http_requests_total{method="GET",route="/api/search",status_code="200"}
```

### Logging

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
  "resultCount": 15
}
```

---

## Security Architecture

### OAuth Token Security

```typescript
// Token encryption at rest
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

### API Rate Limiting

- Per-user rate limiting: 100 requests/minute
- Per-IP rate limiting: 1000 requests/minute
- Provider rate limiting: 100 requests/minute per provider

---

## References

- [MCP Core Requirements](../../requirements/mcp-layer/core-requirements.md)
- [Provider Integration Guide](./mcp-providers.md)
- [OAuth Architecture](./mcp-oauth-flow.md)
- [Deployment Guide](../../deployment/mcp-adapter.md)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-20 | System | Initial architecture documentation extracted from archived files |

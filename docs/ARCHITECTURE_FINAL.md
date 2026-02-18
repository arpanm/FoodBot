# FoodBot Architecture Documentation

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Component Descriptions](#component-descriptions)
- [Component Interactions](#component-interactions)
- [Data Flow](#data-flow)
- [Technology Choices and Rationale](#technology-choices-and-rationale)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Resilience Patterns](#resilience-patterns)
- [Future Architecture Evolution](#future-architecture-evolution)

---

## System Overview

FoodBot follows a **microservices-oriented monorepo architecture** with clear separation of concerns across four primary layers:

1. **Presentation Layer** -- React-based customer application with Redux state management
2. **API Gateway Layer** -- NestJS-based REST API with authentication, authorization, and business logic
3. **Orchestration Layer** -- Temporal workflow engine for durable, multi-step business processes
4. **Data/Integration Layer** -- MCP orchestrator for multi-provider aggregation, backed by Redis, Elasticsearch, Kafka, and PostgreSQL

---

## Architecture Diagram

### High-Level System Architecture

```
+================================================================+
|                        CLIENT LAYER                             |
+================================================================+
|                                                                 |
|  +-------------------+   +-------------------+   +-----------+ |
|  | Customer App      |   | Restaurant App    |   | Admin     | |
|  | (React + Redux)   |   | (Planned)         |   | Dashboard | |
|  | Port: 3001        |   |                   |   | (Planned) | |
|  +---------+---------+   +-------------------+   +-----------+ |
|            |                                                    |
+============|====================================================+
             | HTTP/REST (JSON)
+============|====================================================+
|            v           API GATEWAY LAYER                        |
+================================================================+
|                                                                 |
|  +----------------------------------------------------------+  |
|  |                    Gateway API (NestJS)                   |  |
|  |                    Port: 3000                             |  |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  |  +-------+  +-----------+  +------+  +-------+          |  |
|  |  | Auth  |  | Restaurant|  | Dish |  | Cart  |          |  |
|  |  | Module|  | Module    |  |Module|  | Module|          |  |
|  |  +-------+  +-----------+  +------+  +-------+          |  |
|  |                                                          |  |
|  |  +-------+  +-----------+  +--------+  +-------+        |  |
|  |  | Order |  | Payment   |  |Feedback|  | User  |        |  |
|  |  | Module|  | Module    |  |Module  |  | Module|        |  |
|  |  +-------+  +-----------+  +--------+  +-------+        |  |
|  |                                                          |  |
|  |  +-------+  +-----------+                                |  |
|  |  | Chat  |  | Admin     |                                |  |
|  |  | Module|  | Module    |                                |  |
|  |  +-------+  +-----------+                                |  |
|  |                                                          |  |
|  |  +--------------------+  +------------------+            |  |
|  |  | JWT Auth Guard     |  | Validation Filter|            |  |
|  |  | Role-Based Guards  |  | Exception Filter |            |  |
|  |  +--------------------+  +------------------+            |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                 |
+============|========|========|==================================+
             |        |        |
+============|========|========|==================================+
|            v        v        v   ORCHESTRATION LAYER            |
+================================================================+
|                                                                 |
|  +-----------------------+   +------------------------------+   |
|  |   Temporal Server     |   |   Temporal Workers           |   |
|  |   Port: 7233 (gRPC)  |   |                              |   |
|  |   Port: 7234 (HTTP)  |   |   +------------------------+ |   |
|  |   Port: 7235 (metrics)|  |   | searchRestaurant       | |   |
|  +-----------+-----------+   |   | Workflow               | |   |
|              |               |   +------------------------+ |   |
|  +-----------+-----------+   |   | placeOrder             | |   |
|  |   Temporal UI         |   |   | Workflow (Saga)        | |   |
|  |   Port: 8080          |   |   +------------------------+ |   |
|  +-----------------------+   |   | processPayment         | |   |
|                              |   | Workflow               | |   |
|                              |   +------------------------+ |   |
|                              |                              |   |
|                              |   Activities:                |   |
|                              |   - loadUserContext          |   |
|                              |   - callMCPSearch            |   |
|                              |   - processPayment           |   |
|                              |   - createOrder              |   |
|                              |   - notifyCustomer           |   |
|                              |   - cacheResults             |   |
|                              |   ... (30+ activities)       |   |
|                              +------------------------------+   |
|                                                                 |
+============|====================================================+
             |
+============|====================================================+
|            v           DATA / INTEGRATION LAYER                 |
+================================================================+
|                                                                 |
|  +------------------------------+  +------------------------+  |
|  | MCP Orchestrator (Java/Spring)|  | Redis 7               |  |
|  | Port: 8088                    |  | Port: 6379            |  |
|  |                               |  |                        |  |
|  | +----------+ +-----------+   |  | - Session management   |  |
|  | | Swiggy   | | Zomato    |   |  | - Token blacklisting   |  |
|  | | Provider | | Provider  |   |  | - Rate limiting        |  |
|  | +----------+ +-----------+   |  | - Search result cache  |  |
|  | +----------+ +-----------+   |  | - Refresh tokens       |  |
|  | | Mock     | | Provider  |   |  +------------------------+  |
|  | | Provider | | Router    |   |                               |
|  | +----------+ +-----------+   |  +------------------------+  |
|  | +-----------+ +----------+   |  | Elasticsearch 8        |  |
|  | | Search    | | Cache    |   |  | Port: 9200             |  |
|  | | Services  | | Service  |   |  |                        |  |
|  | +-----------+ +----------+   |  | - Restaurant index     |  |
|  | +-----------+ +----------+   |  | - Dish index           |  |
|  | | Resilience| | Indexing |   |  | - Geo-spatial search   |  |
|  | | (CB/Retry)| | Service  |   |  | - Faceted filtering    |  |
|  | +-----------+ +----------+   |  +------------------------+  |
|  +------------------------------+                               |
|                                                                 |
|  +------------------------------+  +------------------------+  |
|  | Apache Kafka                  |  | PostgreSQL 15          |  |
|  | Port: 9092                    |  | Port: 5432             |  |
|  |                               |  |                        |  |
|  | - Restaurant events           |  | - Temporal persistence |  |
|  | - Dish events                 |  | - Workflow state       |  |
|  | - Order events                |  | - Activity history     |  |
|  | - Schema Registry (8083)      |  +------------------------+  |
|  +------------------------------+                               |
|                                                                 |
+================================================================+
```

### Module Dependency Diagram

```
AppModule (root)
  |
  +-- ConfigModule (global)
  |
  +-- AuthModule
  |     +-- JwtModule
  |     +-- PassportModule
  |     +-- RedisService
  |     +-- EmailService
  |
  +-- ChatModule
  |     +-- ChatService
  |
  +-- RestaurantModule
  |     +-- RestaurantService
  |     +-- AuthModule (imports AuthService)
  |
  +-- DishModule
  |     +-- DishService
  |
  +-- CartModule
  |     +-- CartService
  |
  +-- OrderModule
  |     +-- OrderService
  |
  +-- PaymentModule
  |     +-- PaymentService
  |
  +-- FeedbackModule
  |     +-- FeedbackService
  |
  +-- UserModule
  |     +-- AuthService (shared)
  |     +-- RedisService
  |
  +-- AdminModule
        +-- AdminService
        +-- AuthService (shared)
        +-- RestaurantService (shared)
```

---

## Component Descriptions

### 1. Customer App (`apps/customer-app`)

A React single-page application providing the customer-facing interface.

| Aspect | Details |
|--------|---------|
| **Framework** | React with TypeScript |
| **State Management** | Redux Toolkit with slices for each domain (chat, restaurant, dish, cart, order, user) |
| **API Client** | Axios with centralized configuration |
| **Custom Hooks** | `useRedux`, `useJobPolling`, `useDebounce`, `useInfiniteScroll` |
| **Component Groups** | Chat, Restaurant, Dish, Cart, Order, Status, Common |
| **Testing** | Jest with React Testing Library |

### 2. Gateway API (`apps/gateway-api`)

The primary backend service handling all client requests.

| Aspect | Details |
|--------|---------|
| **Framework** | NestJS 11 with Express adapter |
| **Authentication** | JWT with Passport.js (access + refresh tokens) |
| **Authorization** | Role-based guards (customer, restaurant_owner, admin) |
| **Validation** | class-validator with class-transformer |
| **Error Handling** | Global ValidationExceptionFilter for consistent error responses |
| **Session** | Redis-backed token blacklisting and rate limiting |
| **Modules** | Auth, Chat, Restaurant, Dish, Cart, Order, Payment, Feedback, User, Admin |

### 3. Temporal Workflows (`packages/workflows`)

Durable workflow definitions for complex business processes.

| Workflow | Purpose | Pattern |
|----------|---------|---------|
| `searchRestaurantWorkflow` | Restaurant search with caching and personalization | Cache-aside with retry |
| `placeOrderWorkflow` | Order placement with inventory, payment, and notifications | Saga with compensation |
| `processPaymentWorkflow` | Payment processing with idempotency and 3DS support | Retry with exponential backoff |

### 4. MCP Orchestrator (`services/mcp-orchestrator`)

A Java/Spring Boot service for aggregating food delivery provider data.

| Component | Purpose |
|-----------|---------|
| **Provider Router** | Routes requests to available providers with failover |
| **Provider Clients** | Swiggy, Zomato, and Mock data providers |
| **Search Services** | Elasticsearch-powered full-text, geo, and faceted search |
| **Cache Service** | Redis-based caching with TTL and invalidation |
| **Result Aggregator** | Merges, normalizes, deduplicates, and ranks results |
| **Resilience** | Circuit breaker, retry, rate limiter, bulkhead patterns |
| **Indexing** | Kafka consumers for real-time Elasticsearch indexing |

---

## Component Interactions

### Authentication Flow

```
Client                  Gateway API               Redis
  |                         |                       |
  |  POST /auth/register    |                       |
  |------------------------>|                       |
  |                         | Hash password (bcrypt) |
  |                         | Generate JWT tokens    |
  |                         | Store verification token|
  |                         |----------------------->|
  |                         | Send verification email |
  |  { accessToken, user }  |                       |
  |<------------------------|                       |
  |                         |                       |
  |  POST /auth/login       |                       |
  |------------------------>|                       |
  |                         | Check rate limit       |
  |                         |----------------------->|
  |                         | Validate credentials   |
  |                         | Store refresh token    |
  |                         |----------------------->|
  |  { accessToken, user }  |                       |
  |<------------------------|                       |
  |                         |                       |
  |  GET /auth/me           |                       |
  |  Authorization: Bearer  |                       |
  |------------------------>|                       |
  |                         | Verify JWT             |
  |                         | Check blacklist        |
  |                         |----------------------->|
  |  { user }               |                       |
  |<------------------------|                       |
```

### Chat and Job Processing Flow

```
Client              Gateway API         Chat Service         Temporal
  |                     |                    |                   |
  |  POST /chat         |                    |                   |
  |-------------------->|                    |                   |
  |                     | Validate user      |                   |
  |                     |------------------->|                   |
  |                     |                    | Create job         |
  |                     |                    | Start async proc.  |
  |  { jobId, QUEUED }  |                    |                   |
  |<--------------------|                    |                   |
  |                     |                    |                   |
  |  GET /jobs/:id/status                    |                   |
  |-------------------->|                    |                   |
  |                     |------------------->|                   |
  |                     |                    | Check job status   |
  |  { status, result } |                    |                   |
  |<--------------------|                    |                   |
```

### Order Placement Flow (Saga Pattern)

```
placeOrderWorkflow
  |
  +-- 1. validateCart(items)
  |       |-- Fails: throw error (no compensation needed)
  |
  +-- 2. checkInventory(items)
  |       |-- Fails: throw error (no compensation needed)
  |
  +-- 3. reserveItems(restaurantId, items)
  |       |-- Success: register compensation -> releaseItems()
  |       |-- Fails: throw error
  |
  +-- 4. processPayment(orderId, paymentDetails)
  |       |-- Success: register compensation -> refundPayment()
  |       |-- Fails: execute compensations in reverse order
  |
  +-- 5. createOrder(orderData)
  |       |-- Fails: execute compensations (refund, release)
  |
  +-- 6. updateOrderStatus(orderId, 'confirmed')
  |
  +-- 7. notifyRestaurant(orderId)     [non-critical]
  |
  +-- 8. notifyCustomer(userId)         [non-critical]
  |
  +-- Return { orderId, status, paymentId }
```

---

## Data Flow

### Restaurant Search Data Flow

```
User Query
  |
  v
Gateway API (/restaurants/search)
  |
  v
RestaurantService.search()
  |
  +--> [Option A: Direct] Return in-memory filtered results
  |
  +--> [Option B: Workflow] Start searchRestaurantWorkflow
       |
       +-- Load user context (Redis/Neo4j)
       +-- Check cache (Redis)
       |   +-- Cache hit: return cached results
       +-- Call MCP Search API
       |   +-- MCP Orchestrator routes to providers
       |   +-- Aggregator merges + deduplicates results
       +-- Apply filters (cuisine, price, rating, location)
       +-- Rank by user preferences
       +-- Cache results (Redis, 30min TTL)
       +-- Return ranked results
```

### Payment Processing Data Flow

```
Payment Request
  |
  v
Gateway API (POST /payments/initiate)
  |
  v
PaymentService.initiatePayment()
  |
  v
processPaymentWorkflow
  |
  +-- Check for existing payment (idempotency)
  +-- Validate payment details
  +-- Save initial payment record (status: pending)
  +-- Call payment gateway (with retry)
  |   +-- Handle 3D Secure if required
  +-- Handle result:
  |   +-- Success: update record, notify customer
  |   +-- Failed: update record, fraud check, notify
  |   +-- Partial: accept or reject based on config
  +-- Return PaymentResult
```

---

## Technology Choices and Rationale

### NestJS for Gateway API

**Choice**: NestJS with TypeScript over plain Express or Fastify

**Rationale**:
- Module-based architecture aligns with domain-driven design
- Built-in dependency injection simplifies testing and modularity
- First-class TypeScript support with decorators for clean controller definitions
- Passport.js integration for JWT authentication
- class-validator integration for request validation
- Active ecosystem with extensive middleware support

### Temporal for Workflow Orchestration

**Choice**: Temporal over AWS Step Functions, Camunda, or custom queue-based solutions

**Rationale**:
- Durable execution guarantees -- workflows survive process restarts
- Built-in retry policies with exponential backoff
- Saga pattern support through activity compensation
- TypeScript SDK for type-safe workflow definitions
- Deterministic replay for debugging and testing
- Visual workflow monitoring through Temporal UI
- No vendor lock-in (self-hosted)

### Redis for Caching and Session Management

**Choice**: Redis 7 over Memcached or application-level caching

**Rationale**:
- Sub-millisecond latency for session lookups
- TTL-based expiration for token blacklisting and rate limiting
- Append-only file (AOF) persistence for durability
- Rich data structures (strings, sets, hashes) for diverse caching needs
- Cluster support for horizontal scaling

### Elasticsearch for Search

**Choice**: Elasticsearch 8 over PostgreSQL full-text search or Algolia

**Rationale**:
- Advanced full-text search with relevance scoring
- Geo-spatial queries for location-based restaurant search
- Faceted search for filtering by cuisine, price range, ratings
- Near-real-time indexing via Kafka consumers
- Horizontal scaling through sharding
- Self-hosted for data sovereignty

### Kafka for Event Streaming

**Choice**: Apache Kafka over RabbitMQ or AWS SQS

**Rationale**:
- High-throughput event streaming for real-time data indexing
- Topic-based publish/subscribe for decoupled architecture
- Durable message storage with configurable retention
- Schema Registry for event schema evolution
- Consumer groups for parallel processing
- Replay capability for reprocessing events

### React + Redux Toolkit for Frontend

**Choice**: React with Redux Toolkit over Next.js, Vue, or Angular

**Rationale**:
- Component-based architecture for reusable UI elements
- Redux Toolkit eliminates boilerplate and enforces best practices
- TypeScript integration for type safety across the stack
- Rich ecosystem for chat interfaces and real-time updates
- Slice-based state management maps cleanly to domain modules

---

## Security Architecture

### Authentication

- **JWT Access Tokens**: Short-lived (15 minutes), signed with HMAC secret
- **JWT Refresh Tokens**: Long-lived (7 days), separate secret
- **Token Blacklisting**: Redis-backed blacklist for logout invalidation
- **Password Hashing**: bcrypt with salt rounds of 10

### Authorization

- **Role-Based Access Control (RBAC)**: Three roles -- customer, restaurant_owner, admin
- **Guard-Based Enforcement**: `JwtAuthGuard` for authentication, `RolesGuard` for authorization
- **Public Routes**: Explicitly marked with `@Public()` decorator
- **Resource Ownership**: Controllers verify user ownership before operations

### Rate Limiting

- **Login Attempts**: Maximum 5 attempts per email, 15-minute cooldown
- **Password Reset**: Maximum 5 requests per email per hour
- **Implementation**: Redis-backed counters with TTL expiration

### Input Validation

- **DTO Validation**: class-validator decorators on all request DTOs
- **Global Filter**: ValidationExceptionFilter for consistent error response format
- **Sanitization**: Input length limits, format validation (email, phone)

---

## Scalability Considerations

### Horizontal Scaling

| Component | Scaling Strategy |
|-----------|-----------------|
| Gateway API | Stateless -- scale with load balancer (round-robin) |
| Temporal Workers | Add workers to increase workflow throughput |
| MCP Orchestrator | Stateless -- scale behind load balancer |
| Redis | Redis Cluster for sharding across nodes |
| Elasticsearch | Index sharding across nodes |
| Kafka | Partition-based scaling with consumer groups |
| PostgreSQL | Read replicas for Temporal persistence |

### Caching Strategy

- **Search Results**: Redis cache with 30-minute TTL
- **User Context**: Redis cache for frequently accessed user preferences
- **Session Data**: Redis-backed JWT token management
- **MCP Results**: MCP Orchestrator caches provider responses

### Database Partitioning

- **Elasticsearch**: Time-based and location-based index partitioning
- **Kafka**: Topic partitioning by entity type (restaurants, dishes, orders)
- **PostgreSQL**: Temporal handles its own partitioning for workflow state

---

## Resilience Patterns

### Circuit Breaker (MCP Orchestrator)

```
States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
- Failure threshold triggers OPEN state
- Timeout period before HALF_OPEN probe
- Successful probes restore CLOSED state
- Applied to external provider calls
```

### Retry with Exponential Backoff (Temporal Workflows)

```
Retry Policy:
  - Initial interval: 1 second
  - Backoff coefficient: 2
  - Maximum interval: 30 seconds
  - Maximum attempts: 3-5 (varies by activity)
```

### Saga Pattern (Order Workflow)

```
Compensation chain (executed in reverse on failure):
  1. releaseItems()    -- reverse of reserveItems()
  2. refundPayment()   -- reverse of processPayment()
  3. notifyCustomer()  -- inform of failure
```

### Failover (Provider Router)

```
Provider priority: Primary -> Secondary -> Mock
- Health monitoring via periodic probes
- Automatic failover on provider unavailability
- Result aggregation across available providers
```

---

## Future Architecture Evolution

### Planned Enhancements

1. **Neo4j Graph Database**: User preference graph for personalized recommendations with temporal decay
2. **LLM Router Package**: Multi-provider LLM routing (Claude, GPT, Gemini) with cost optimization
3. **WebSocket Support**: Real-time order tracking and chat updates
4. **Restaurant App**: Dedicated dashboard for restaurant owners
5. **Admin Dashboard**: Full-featured admin portal with analytics
6. **Vector Database**: Pinecone/Weaviate for semantic search and LLM memory
7. **API Gateway**: Kong or similar for rate limiting, API versioning, and monitoring
8. **Kubernetes**: Migration from Docker Compose to K8s for production orchestration
9. **Observability**: OpenTelemetry tracing, Prometheus metrics, Grafana dashboards
10. **Event Sourcing**: Full event sourcing for order lifecycle with CQRS read models

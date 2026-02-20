# FoodBot System Architecture

**Version:** 2.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. System Architecture Diagram](#2-system-architecture-diagram)
- [3. Service Descriptions](#3-service-descriptions)
- [4. Data Flow Diagrams](#4-data-flow-diagrams)
- [5. Technology Stack](#5-technology-stack)
- [6. Design Decisions and Rationale](#6-design-decisions-and-rationale)
- [7. Scalability Strategy](#7-scalability-strategy)

---

## 1. Overview

FoodBot is an AI-orchestrated restaurant commerce platform built as a monorepo with microservices architecture. It combines a conversational user interface, multi-LLM reasoning, multi-provider food delivery aggregation (via MCP -- Model Context Protocol), and deterministic workflow execution using Temporal.

### Architecture Principles

1. **Microservices Architecture** -- Services are loosely coupled, independently deployable, and organized by business domain.
2. **Event-Driven Communication** -- Kafka-based asynchronous messaging for cross-service data synchronization.
3. **API-First Design** -- Well-defined REST APIs with typed DTOs and validation.
4. **Resilience by Design** -- Circuit breakers, retries, bulkheads, and timeouts at every external boundary.
5. **Spec-Driven Development** -- Machine-readable specifications and guardrails govern all code generation and review.
6. **AI-Orchestrated** -- LLMs drive intent understanding and workflow generation; Temporal provides durable execution.

### Key Patterns

- **API Gateway Pattern** -- Single NestJS entry point for all client requests.
- **Saga Pattern** -- Distributed transactions using Temporal workflows with compensation logic.
- **CQRS** -- Writes go to PostgreSQL; reads served from Elasticsearch and Redis caches.
- **Event Sourcing** -- Kafka event log for audit, replay, and real-time indexing.
- **Circuit Breaker** -- Resilience4j (Java) prevents cascading failures across MCP providers.
- **Cache-Aside** -- Redis caching for frequently accessed restaurant, dish, and search data.

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------+
|                            CLIENT LAYER                                |
|                                                                        |
|   +------------------------+       +---------------------------+      |
|   |    Customer App        |       |   Restaurant App          |      |
|   |    (React + Redux)     |       |   (React + Redux)         |      |
|   |    - Chat UI           |       |   - Order Management      |      |
|   |    - Restaurant Browse |       |   - Menu Management       |      |
|   |    - Cart & Checkout   |       |   - Analytics Dashboard   |      |
|   |    - Order Tracking    |       |   - Settings              |      |
|   +----------+-------------+       +------------+--------------+      |
|              |                                   |                     |
+--------------+-----------------------------------+---------------------+
               |           HTTP/REST               |
               |                                   |
+--------------v-----------------------------------v---------------------+
|                       GATEWAY API LAYER (NestJS)                       |
|                                                                        |
|   +--------------------+  +-------------------+  +-----------------+  |
|   | Auth Module        |  | Restaurant Module |  | Order Module    |  |
|   | - JWT Auth         |  | - CRUD            |  | - Create/Track  |  |
|   | - Rate Limiting    |  | - Search Proxy    |  | - Status Mgmt   |  |
|   | - RBAC Guards      |  | - Approval        |  | - Cancel/Refund |  |
|   +--------------------+  +-------------------+  +-----------------+  |
|   +--------------------+  +-------------------+  +-----------------+  |
|   | Chat Module        |  | Dish Module       |  | Payment Module  |  |
|   | - Message Handler  |  | - CRUD            |  | - Process       |  |
|   | - Job Polling      |  | - Availability    |  | - Webhook       |  |
|   +--------------------+  +-------------------+  +-----------------+  |
|   +--------------------+  +-------------------+  +-----------------+  |
|   | Cart Module        |  | Feedback Module   |  | Admin Module    |  |
|   | - Add/Remove Items |  | - Ratings         |  | - User Mgmt     |  |
|   | - Calculate Total  |  | - Reviews         |  | - Approvals     |  |
|   +--------------------+  +-------------------+  +-----------------+  |
|   +--------------------+  +-------------------+                       |
|   | User Module        |  | Health Module     |                       |
|   | - Profile          |  | - Liveness        |                       |
|   | - Addresses        |  | - Readiness       |                       |
|   +--------------------+  +-------------------+                       |
|                                                                        |
|   +---------------------+  +--------------------+                     |
|   | Kafka Producers     |  | Temporal Client    |                     |
|   | - Order Events      |  | - Start Workflows  |                     |
|   | - Restaurant Events |  | - Query Status     |                     |
|   | - Payment Events    |  | - Send Signals     |                     |
|   | - Dish Events       |  |                    |                     |
|   +---------------------+  +--------------------+                     |
|                                                                        |
+--------+--------------------------+-----------------------------------+
         |                          |
         | Kafka Events             | Temporal gRPC
         |                          |
+--------v---------+   +------------v----------------------------------+
| NOTIFICATION     |   |        WORKFLOW LAYER (Temporal)               |
| SERVICE          |   |                                                |
| - Email Channel  |   |  +-------------------------------------------+|
| - SMS Channel    |   |  | searchRestaurantWorkflow                  ||
| - Push Channel   |   |  |   - Load user context                     ||
| - WebSocket      |   |  |   - Call MCP search                       ||
|                  |   |  |   - Apply filters, return results          ||
| Kafka Consumer:  |   |  +-------------------------------------------+|
| - order.*        |   |  | placeOrderWorkflow (Saga Pattern)         ||
| - payment.*      |   |  |   - Validate cart                         ||
| - user.*         |   |  |   - Check/reserve inventory               ||
|                  |   |  |   - Process payment                        ||
+------------------+   |  |   - Create order                           ||
                       |  |   - Notify restaurant + customer           ||
                       |  |   - Compensate on failure                  ||
                       |  +-------------------------------------------+|
                       |  | processPaymentWorkflow                    ||
                       |  |   - Validate payment details               ||
                       |  |   - Charge payment gateway                 ||
                       |  |   - Handle 3DS if required                 ||
                       |  +-------------------------------------------+|
                       |  | orderFulfillmentWorkflow (Signal-based)    ||
                       |  |   - Wait for order ready signal            ||
                       |  |   - Assign delivery partner                ||
                       |  |   - Track delivery status                  ||
                       |  +-------------------------------------------+|
                       |  | userOnboardingWorkflow                    ||
                       |  | restaurantOnboardingWorkflow              ||
                       |  +-------------------------------------------+|
                       |                                                |
                       |  Activities: database, external, LLM,         |
                       |    notification, payment                       |
                       +--+---------------------------------------------+
                          |
                          | HTTP/REST
                          |
+-------------------------v--------------------------------------------+
|              MCP ORCHESTRATOR (Spring Boot / Java 17)                 |
|                                                                       |
|  +------------------+  +------------------+  +--------------------+  |
|  | Provider Router  |  | Result Aggregator|  | Search Service     |  |
|  | - Mock Client    |  | - Normalizer     |  | - Full-Text Search |  |
|  | - Swiggy Client  |  | - Deduplicator   |  | - Faceted Search   |  |
|  | - Zomato Client  |  | - Ranker         |  | - Geo Search       |  |
|  | - Health Monitor |  |                  |  | - Query Builder    |  |
|  | - Failover Mgr   |  |                  |  |                    |  |
|  +------------------+  +------------------+  +--------------------+  |
|  +------------------+  +------------------+  +--------------------+  |
|  | Cache Service    |  | Resilience Layer |  | Indexing Service   |  |
|  | - Redis Cache    |  | - Circuit Breaker|  | - Kafka Consumer   |  |
|  | - Key Generator  |  | - Rate Limiter   |  | - Bulk Indexer     |  |
|  | - Invalidation   |  | - Bulkhead       |  | - Event Consumers  |  |
|  +------------------+  | - Retry          |  +--------------------+  |
|                         +------------------+                          |
+--+-------------------+-------------------+---------------------------+
   |                   |                   |
   v                   v                   v
+------+  +-----------+  +------------------------------------------+
|Redis |  |Elasticsrch|  |            PostgreSQL                     |
|7     |  |8.11       |  |  +-------------+  +-------------------+  |
|      |  |           |  |  | foodbot DB  |  | temporal DB       |  |
|Cache |  |restaurants|  |  | - users     |  | - workflow state  |  |
|Store |  |dishes     |  |  | - orders    |  | - task queues     |  |
|      |  |           |  |  | - carts     |  | - visibility      |  |
+------+  +-----------+  |  | - payments  |  |                   |  |
                          |  | - dishes    |  |                   |  |
   +------+               |  | - addresses |  |                   |  |
   |Kafka |               |  | - feedback  |  |                   |  |
   |7.5   |               |  | - workflows |  |                   |  |
   |      |               |  +-------------+  +-------------------+  |
   |Events|               +------------------------------------------+
   +------+
```

---

## 3. Service Descriptions

### 3.1 Gateway API (NestJS)

**Location:** `apps/gateway-api/`
**Port:** 3000
**Language:** TypeScript

The Gateway API is the primary backend service. It serves as the single entry point for all client requests and is responsible for:

- **Authentication and Authorization** -- JWT-based authentication with three roles: customer, restaurant_owner, admin. Guards enforce role-based access on every endpoint.
- **Rate Limiting** -- Configurable per-endpoint throttling using `@nestjs/throttler` (e.g., login: 5 req/min, register: 10 req/min).
- **Input Validation** -- class-validator DTOs validate every request body.
- **Business Logic** -- Services implement domain logic for users, restaurants, dishes, carts, orders, payments, feedback, chat, and admin operations.
- **Event Publishing** -- Kafka producers emit domain events (order.created, restaurant.updated, etc.) for downstream consumers.
- **Temporal Integration** -- Temporal client starts workflows and queries their status.
- **Caching** -- Redis service provides caching for frequently accessed data.

**Modules:**
| Module | Endpoints | Description |
|--------|-----------|-------------|
| Auth | `/auth/*` | Register, login, logout, refresh, forgot/reset password, verify email |
| Chat | `/chat/*` | Send messages, get conversation history, job polling |
| Restaurant | `/restaurants/*` | CRUD, search, menu retrieval |
| Dish | `/dishes/*` | CRUD, availability toggle, search |
| Cart | `/cart/*` | Add/remove/update items, get cart |
| Order | `/orders/*` | Create, list, track, cancel, update status |
| Payment | `/payments/*` | Process payment, webhook handler |
| Feedback | `/feedback/*` | Create feedback/rating, list by restaurant |
| User | `/users/*` | Profile management, address CRUD |
| Admin | `/admin/*` | User management, restaurant approval, dashboard stats |
| Health | `/health` | Liveness and readiness probes |
| Search | `/search/*` | Proxy to MCP Orchestrator search |

### 3.2 MCP Orchestrator (Spring Boot)

**Location:** `services/mcp-orchestrator/`
**Port:** 8081
**Language:** Java 17
**Context Path:** `/mcp/v1`

The MCP Orchestrator aggregates restaurant and dish data from multiple food delivery providers using the Model Context Protocol. It is responsible for:

- **Provider Routing** -- Routes requests to enabled providers (Mock, Swiggy, Zomato) with health monitoring and automatic failover.
- **Result Aggregation** -- Merges results from multiple providers, deduplicates, normalizes, and ranks them.
- **Elasticsearch Search** -- Full-text search, faceted filtering, geo-spatial queries for restaurants and dishes.
- **Real-Time Indexing** -- Kafka consumers listen for restaurant.*, dish.*, order.*, payment.*, and user.* events and index data into Elasticsearch.
- **Caching** -- Redis cache for search results (10 min TTL), restaurant details (15 min), dish availability (5 min).
- **Resilience** -- Resilience4j circuit breakers, rate limiters, bulkheads, and retries per provider.

**Controllers:**
| Controller | Path | Description |
|------------|------|-------------|
| SearchController | `/search` | Unified search across all providers |
| RestaurantSearchController | `/restaurants/search` | Restaurant-specific search |
| DishSearchController | `/dishes/search` | Dish-specific search |
| RestaurantController | `/restaurants` | Restaurant CRUD via providers |
| DishController | `/dishes` | Dish operations via providers |
| FilterController | `/filters` | Available filter options |
| HealthController | `/health` | Service health and provider status |

### 3.3 Notification Service

**Location:** `services/notification-service/`
**Language:** TypeScript

A standalone microservice that consumes Kafka events and dispatches notifications through multiple channels:

- **Email Channel** -- Order confirmations, status updates, welcome emails.
- **SMS Channel** -- Delivery updates, OTP verification.
- **WebSocket Channel** -- Real-time UI updates for order tracking.
- **Push Notification Channel** -- Mobile notifications for order status changes.

**Kafka Consumer Group:** `notification-service`
**Subscribed Topics:** `order.*`, `payment.*`, `user.*`

### 3.4 Workflow Package (Temporal)

**Location:** `packages/workflows/`
**Language:** TypeScript
**Task Queues:** `foodbot-main-queue`, `foodbot-orders-queue`, `foodbot-payments-queue`, `foodbot-notifications-queue`, `foodbot-onboarding-queue`

Temporal workflows implement durable, long-running business processes with automatic retry and compensation:

| Workflow | Description | Pattern |
|----------|-------------|---------|
| `searchRestaurantWorkflow` | Searches restaurants via MCP with user context enrichment | Request-Reply |
| `placeOrderWorkflow` | Full order placement with inventory, payment, notifications | Saga (compensation) |
| `processPaymentWorkflow` | Payment processing with 3DS support | Request-Reply |
| `orderFulfillmentWorkflow` | Delivery tracking with signal-based state transitions | Signal-Driven |
| `userOnboardingWorkflow` | New user welcome flow with engagement tracking | Signal-Driven |
| `restaurantOnboardingWorkflow` | Restaurant approval with admin signals | Signal-Driven |

**Activities:** database, external API, LLM, notification, payment

### 3.5 Events Package

**Location:** `packages/events/`
**Language:** TypeScript

Shared Kafka event schema definitions using Zod validation:

- Base event schema with correlation ID, timestamp, source
- Domain-specific event schemas: Restaurant, Dish, Order, Payment, User
- Topic constants and consumer group IDs
- Production topic configuration (partitions, replication, retention)

### 3.6 Customer App (React)

**Location:** `apps/customer-app/`
**Language:** TypeScript/React
**State Management:** Redux Toolkit

The customer-facing single-page application with:

- **Chat Interface** -- Conversational UI for restaurant discovery via natural language.
- **Restaurant Browse** -- Search, filter, and browse restaurants and dishes.
- **Cart and Checkout** -- Add items, manage cart, proceed to payment.
- **Order Tracking** -- Real-time order status with progress stepper.
- **User Profile** -- Address management, order history, account linking.

**Components:** Cart, Chat, Dish, Order, Restaurant, Search, Status, Common
**Services:** account-linking, cart, chat, dish, order, restaurant, search, user
**Store Slices:** accountLinking, cart, chat, dish, order, restaurant, user

### 3.7 Restaurant App (React)

**Location:** `apps/restaurant-app/`
**Language:** TypeScript/React
**Status:** Scaffolded (configuration complete, UI implementation planned)

Dashboard for restaurant owners to manage orders, menus, and analytics.

---

## 4. Data Flow Diagrams

### 4.1 Restaurant Search Flow

```
Customer App          Gateway API           Temporal          MCP Orchestrator
     |                    |                    |                    |
     |-- POST /chat ----->|                    |                    |
     |                    |-- Start Workflow -->|                    |
     |<-- jobId ----------|                    |                    |
     |                    |                    |-- Load Context --->|
     |                    |                    |                    |
     |                    |                    |-- Search --------->|
     |                    |                    |                   [ES]
     |                    |                    |<-- Results --------|
     |                    |                    |                    |
     |-- GET /chat/job -->|                    |                    |
     |<-- Results --------|<-- Complete -------|                    |
```

### 4.2 Order Placement Flow (Saga Pattern)

```
Customer App     Gateway API     Temporal Workflow     Services
     |                |                |                   |
     |-- POST /order->|                |                   |
     |                |-- Start ------>|                   |
     |<-- orderId ----|                |                   |
     |                |                |-- validateCart --> |
     |                |                |-- checkInventory->|
     |                |                |-- reserveItems -->|
     |                |                |-- processPayment->|
     |                |                |-- createOrder --->|
     |                |                |-- notifyRestaurant|
     |                |                |-- notifyCustomer->|
     |                |                |                   |
     |                |                | ON FAILURE:       |
     |                |                |-- refundPayment ->|
     |                |                |-- releaseItems -->|
     |                |                |-- notifyCustomer->|
```

### 4.3 Event-Driven Indexing Flow

```
Gateway API         Kafka            MCP Orchestrator     Elasticsearch
     |                |                    |                    |
     |-- Produce ---->|                    |                    |
     | restaurant.    |                    |                    |
     | created        |-- Consume -------->|                    |
     |                |                    |-- Index ---------->|
     |                |                    |                    |
     |-- Produce ---->|                    |                    |
     | dish.updated   |-- Consume -------->|                    |
     |                |                    |-- Update Index --->|
     |                |                    |                    |
     |                |    Notification    |                    |
     |                |    Service         |                    |
     |-- Produce ---->|                    |                    |
     | order.created  |-- Consume -------->|                    |
     |                |   [Email/SMS/Push] |                    |
```

---

## 5. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18+ | UI library |
| **State Management** | Redux Toolkit | 2.0+ | Centralized state management |
| **HTTP Client** | Axios | 1.7+ | API communication |
| **Build Tool** | Vite | 5+ | Fast build and HMR |
| **Backend API** | NestJS | 11+ | REST API gateway |
| **Backend Runtime** | Node.js | 20+ | JavaScript runtime |
| **MCP Service** | Spring Boot | 3+ | Java orchestration layer |
| **MCP Runtime** | Java | 17+ | JVM runtime |
| **Workflows** | Temporal | 1.22+ | Durable workflow orchestration |
| **Primary Database** | PostgreSQL | 15-16 | Relational data storage |
| **Cache** | Redis | 7 | Caching, sessions, rate limiting |
| **Search Engine** | Elasticsearch | 8.11 | Full-text search, geo-search |
| **Message Broker** | Apache Kafka | 7.5 (Confluent) | Event streaming |
| **Schema Registry** | Confluent Schema Registry | 7.5 | Kafka schema management |
| **ORM** | TypeORM | 0.3+ | Database access (NestJS) |
| **Validation** | class-validator, Zod | Latest | Input validation and event schemas |
| **Auth** | Passport + JWT | Latest | Authentication |
| **Security** | Helmet, bcrypt | Latest | HTTP headers, password hashing |
| **Resilience** | Resilience4j | Latest | Circuit breaker, rate limiter |
| **Testing** | Jest, Playwright, Supertest | Latest | Unit, E2E, integration testing |
| **Code Quality** | ESLint, Prettier, SonarQube | Latest | Linting, formatting, analysis |
| **Package Manager** | pnpm | 8+ | Monorepo dependency management |
| **Containerization** | Docker, Docker Compose | Latest | Development infrastructure |
| **CI/CD** | GitHub Actions | Latest | Continuous integration |
| **Language** | TypeScript | 5.7+ | Type-safe development |

---

## 6. Design Decisions and Rationale

### ADR-001: Monorepo with pnpm Workspaces

**Decision:** Organize all services, apps, and packages in a single monorepo managed by pnpm workspaces.

**Rationale:** Enables shared types, consistent tooling, atomic commits across services, and simplified CI/CD. The `packages/` directory holds shared code (events, workflows) consumed by multiple services.

### ADR-002: NestJS for Gateway API

**Decision:** Use NestJS (not plain Express) for the gateway API.

**Rationale:** NestJS provides a structured, opinionated framework with built-in dependency injection, module system, guards, interceptors, and decorators that align well with enterprise patterns. TypeORM integration, Passport authentication, and Throttler rate limiting are first-class citizens.

### ADR-003: Spring Boot for MCP Orchestrator

**Decision:** Use Java/Spring Boot for the MCP Orchestrator instead of Node.js.

**Rationale:** The MCP Orchestrator requires high-throughput concurrent HTTP calls to multiple providers, complex aggregation logic, and mature resilience patterns. Spring Boot with WebClient (reactive), Resilience4j, and the mature Elasticsearch Java client provides better concurrency handling and a richer ecosystem for these requirements.

### ADR-004: Temporal for Workflow Orchestration

**Decision:** Use Temporal instead of custom state machines or Kafka-based orchestration.

**Rationale:** Temporal provides durable execution (workflows survive process restarts), built-in retries with configurable backoff, workflow history for debugging, signals for external events, and a developer-friendly TypeScript SDK. The saga pattern for order placement is naturally expressed as sequential code with try/catch compensation.

### ADR-005: Kafka for Event Streaming

**Decision:** Use Apache Kafka for asynchronous inter-service communication.

**Rationale:** Kafka provides durable, ordered, replayable event streams. It decouples producers (Gateway API) from consumers (MCP Orchestrator indexing, Notification Service) and enables real-time data synchronization between PostgreSQL and Elasticsearch.

### ADR-006: Elasticsearch for Search

**Decision:** Use Elasticsearch for restaurant and dish search instead of PostgreSQL full-text search.

**Rationale:** Elasticsearch provides sub-second full-text search with typo tolerance, faceted filtering (cuisine, price range, dietary tags), geo-spatial queries (nearby restaurants), and relevance scoring. These capabilities far exceed PostgreSQL's `tsvector` search.

---

## 7. Scalability Strategy

### Horizontal Scaling Targets

| Component | Min | Max | Scaling Metric |
|-----------|-----|-----|----------------|
| Gateway API | 3 | 20 | CPU > 70% |
| MCP Orchestrator | 2 | 10 | CPU > 70% |
| Temporal Workers | 3 | 15 | Pending task count |
| Notification Service | 2 | 5 | Kafka consumer lag |

### Database Scaling

- **PostgreSQL:** Read replicas (2-5), PgBouncer connection pooling (max 1000), table partitioning for orders by date.
- **Redis:** Cluster mode (3 masters, 3 replicas), LRU eviction for cache keys.
- **Elasticsearch:** 3 master nodes, 6 data nodes, 5 primary shards + 1 replica per index.
- **Kafka:** Topic partitioning (6-12 partitions per topic), 3x replication factor in production.

### Caching Strategy

| Data | Cache | TTL | Target Hit Rate |
|------|-------|-----|-----------------|
| Search Results | Redis | 10 min | 50% |
| Restaurant Details | Redis | 15 min | 80% |
| Dish Availability | Redis | 5 min | 60% |
| User Context | Redis | 30 min | 90% |
| Filter Options | Redis | 30 min | 80% |

### Performance Targets

| Metric | Target |
|--------|--------|
| API Latency (p95) | < 500ms |
| API Latency (p99) | < 1s |
| Search Query | < 500ms |
| Workflow Execution | < 10s |
| Page Load Time | < 2s |

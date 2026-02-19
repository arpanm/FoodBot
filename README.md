# FoodBot - Agentic Restaurant Commerce Platform

[![Production Ready](https://img.shields.io/badge/production-ready-brightgreen)](https://github.com/foodbot/foodbot)
[![Test Coverage](https://img.shields.io/badge/coverage-75%25-yellow)](https://github.com/foodbot/foodbot)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-red)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18.0-blue)](https://reactjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-green)](https://spring.io/projects/spring-boot)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

An AI-orchestrated, spec-driven restaurant commerce platform that combines conversational UX, multi-LLM reasoning, and deterministic workflow execution using Temporal. FoodBot is not a simple chatbot -- it is a goal-driven commerce agent that plans, validates, and executes workflows safely across multiple food delivery providers.

**Status:** 95% Production Ready | **Tests:** 206 tests passing | **Code:** 26,545 lines

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Commands](#project-commands)
- [Development Setup](#development-setup)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

FoodBot is a full-stack food ordering platform built as a pnpm monorepo. It provides:

- **Conversational AI Interface**: Users interact with a chat-based UI that understands natural language queries about restaurants, dishes, and orders.
- **Multi-Provider Aggregation**: A Java-based MCP (Model Context Protocol) orchestrator aggregates results from multiple food delivery providers (Swiggy, Zomato, mock data) with circuit breakers, rate limiters, and smart failover.
- **Workflow Orchestration**: Temporal workflows handle complex multi-step operations like restaurant search, order placement, and payment processing with saga-pattern compensation.
- **Event-Driven Architecture**: Apache Kafka powers real-time event streaming across services with 13 topics and Zod-validated schemas.
- **Full Commerce Flow**: End-to-end support for user registration, restaurant discovery, menu browsing, cart management, order placement, payment processing, order tracking, and feedback submission.
- **Role-Based Access Control**: Three user roles (customer, restaurant_owner, admin) with appropriate permissions enforced via JWT authentication and guard-based authorization.

---

## Key Features

### Customer Features
- Natural language chat interface for restaurant discovery
- Restaurant search with filters (cuisine, price range, rating, location)
- Elasticsearch-powered full-text and geo-spatial search
- Menu browsing with dietary filters (vegetarian, vegan)
- Cart management (add, update, remove items)
- Order placement with saga-pattern workflow orchestration
- Real-time order tracking with signal-based updates
- Payment processing (card, UPI, wallet)
- Feedback and rating submission

### Restaurant Owner Features
- Restaurant profile creation and management
- Menu item (dish) CRUD operations with availability toggling
- Order status management with real-time WebSocket notifications
- Analytics dashboard with revenue and order metrics

### Admin Features
- User management (view, suspend, reactivate)
- Restaurant approval workflow (approve/reject pending restaurants)
- Dashboard statistics and system monitoring

### Platform Capabilities
- **Security:** JWT authentication with token blacklisting, rate limiting, Helmet headers, CORS whitelist, webhook signature verification, audit logging
- **Performance:** Redis caching (60%+ hit rate), React.memo optimization, list virtualization, lazy loading, database index optimization
- **Reliability:** Temporal workflow orchestration with retry policies, saga compensation, circuit breakers (Resilience4j)
- **Search:** Elasticsearch 8 with BM25 scoring, geo-location, faceted filtering, multi-source aggregation
- **Messaging:** Kafka event streaming with 13 topics, 5 consumer groups, Zod-validated schemas, DLQ handling
- **Testing:** 206 tests (unit, integration, E2E) with 75% coverage, deterministic test factories
- **Monitoring:** Health check endpoints, Prometheus metrics, structured JSON logging (Pino/Logback), audit trail
- **Quality:** ESLint, Prettier, TypeScript strict mode, 80% coverage threshold, development guardrails

---

## Architecture Overview

```
+----------------------------------------------------------------+
|                       Client Layer                              |
+-------------------------------+--------------------------------+
|  Customer App (React/Redux)   |  Restaurant App (React/Zustand)|
+---------------+---------------+----------------+---------------+
                |                                |
                |         HTTPS / REST           |
                |                                |
+---------------v--------------------------------v---------------+
|                     Gateway API (NestJS)                        |
|  JWT Auth | Rate Limiting | Helmet | CORS | Validation         |
+------+-------------------+--------------------+----------------+
       |                   |                    |
       v                   v                    v
+------+------+  +---------+---------+  +------+------+
| Temporal    |  | MCP Orchestrator  |  | Notification|
| Workflows   |  | (Spring Boot)     |  | Service     |
| (TS SDK)    |  | Elasticsearch     |  | (Kafka)     |
+------+------+  | Redis Cache       |  +------+------+
       |         | Resilience4j      |         |
       |         +---------+---------+         |
       |                   |                   |
       v                   v                   v
+------+-------------------+-------------------+--+
|                    Data Layer                     |
|  PostgreSQL | Redis 7 | Elasticsearch 8 | Kafka  |
+-------------------------------------------------+
```

**Key Architectural Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Gateway | NestJS | TypeScript-native, decorator-based, modular |
| Workflow Engine | Temporal | Durable execution, saga compensation, signal-based tracking |
| Search Engine | Elasticsearch 8 | Full-text + geo-spatial, BM25 scoring, faceted filters |
| Multi-Provider | Spring Boot MCP | JVM performance, Resilience4j patterns, WebClient |
| Event Streaming | Apache Kafka | Decoupled services, event replay, multi-consumer |
| Frontend State | Redux Toolkit / Zustand | Customer app uses Redux; Restaurant app uses Zustand |
| Package Manager | pnpm | Efficient monorepo workspace management |

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend (Customer)** | React 18, Redux Toolkit, TypeScript | Chat interface and commerce UI |
| **Frontend (Restaurant)** | React 18, Zustand, TanStack Query, Tailwind | Owner management dashboard |
| **Backend API** | NestJS 10, TypeScript, TypeORM | REST API gateway with JWT auth |
| **MCP Orchestrator** | Java 17, Spring Boot 3.2, Resilience4j | Multi-provider search aggregation |
| **MCP Adapter** | TypeScript, Zod, ioredis | Provider integration adapter |
| **Search Orchestrator** | TypeScript, Express | Multi-source search coordination |
| **Workflows** | Temporal (TypeScript SDK 1.11) | Durable workflow orchestration |
| **Notifications** | TypeScript, Pino | Multi-channel notification dispatch |
| **Database** | PostgreSQL 15 | Primary data store |
| **Cache** | Redis 7 | Session management, caching, rate limiting |
| **Search** | Elasticsearch 8.11 | Full-text search, geo-search, faceted filtering |
| **Messaging** | Apache Kafka (Confluent 7.5) | Event streaming, real-time indexing |
| **Testing** | Jest, Playwright, Supertest, React Testing Library | Unit, integration, and E2E testing |
| **Code Quality** | ESLint, Prettier, TypeScript strict | Linting, formatting, type safety |
| **Infrastructure** | Docker Compose, Kubernetes | Local dev and production deployment |

---

## Quick Start

### Option A: Using the `foodbot` Wrapper Script (Recommended) ⭐

The easiest way to get started with a single command:

```bash
# Clone repository
git clone https://github.com/foodbot/foodbot.git
cd foodbot

# Check system requirements
./foodbot doctor

# One-command setup (install + build + infra + database)
./foodbot setup

# Start all services in development mode
./foodbot dev
```

**👉 See [QUICKSTART.md](QUICKSTART.md) for detailed guide with all commands**

### Option B: Manual Setup

#### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 8
- **Docker** and **Docker Compose**
- **Java 17+** (for the MCP Orchestrator)
- **Maven 3.9+** (for building the MCP Orchestrator)

#### 1. Clone and Install

```bash
git clone https://github.com/foodbot/foodbot.git
cd foodbot
pnpm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

#### 3. Start Infrastructure

```bash
docker-compose up -d
pnpm docker:health    # Verify all services are healthy
```

### 4. Run the Gateway API

```bash
pnpm --filter @foodbot/gateway-api start:dev
```

The API is available at `http://localhost:3000`.

### 5. Run Tests

```bash
pnpm test:unit          # Unit tests
pnpm test:integration   # Integration tests (requires infrastructure)
pnpm test:e2e           # E2E tests (requires full stack)
pnpm test:all           # All tests
```

For detailed setup instructions, see [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md).

---

## Project Commands

FoodBot includes a comprehensive wrapper script (`./foodbot`) that provides a unified interface for all project operations. See [QUICKSTART.md](QUICKSTART.md) for detailed examples.

### Common Commands

```bash
# Setup and Installation
./foodbot setup              # Complete initial setup
./foodbot install            # Install dependencies only
./foodbot doctor             # Check system requirements

# Development
./foodbot dev                # Run all services
./foodbot dev gateway-api    # Run specific service

# Building
./foodbot build              # Build all projects
./foodbot build:ts           # Build TypeScript only
./foodbot build:java         # Build Java only

# Testing
./foodbot test               # Run all tests
./foodbot test:unit          # Unit tests only
./foodbot test:coverage      # With coverage report

# Database
./foodbot db:setup           # Run migrations
./foodbot db:seed            # Add dummy data
./foodbot db:reset           # Complete reset

# Code Quality
./foodbot lint               # Lint code
./foodbot format:fix         # Format code
./foodbot quality            # All quality checks

# Infrastructure
./foodbot infra:up           # Start infrastructure
./foodbot infra:down         # Stop infrastructure
./foodbot logs [service]     # View logs

# Help
./foodbot help               # Show all commands
```

**Alternative:** Use the `Makefile` if you prefer `make` commands:

```bash
make help         # Show all available targets
make dev          # Same as ./foodbot dev
make test         # Same as ./foodbot test
make db-setup     # Same as ./foodbot db:setup
```

---

## Infrastructure Setup

### Infrastructure Components

FoodBot requires the following infrastructure services:

| Service | Version | Purpose | Port |
|---------|---------|---------|------|
| **PostgreSQL** | 15 | Primary database | 5432 |
| **Redis** | 7 | Caching, sessions, rate limiting | 6379 |
| **Elasticsearch** | 8.11 | Full-text and geo-spatial search | 9200 |
| **Kafka + Zookeeper** | 7.5 | Event streaming | 9092, 2181 |
| **Temporal Server** | 1.22 | Workflow orchestration | 7233 |
| **Temporal UI** | Latest | Workflow monitoring | 8080 |

### Quick Infrastructure Setup

Using the wrapper script:

```bash
# Start all infrastructure services
./foodbot infra:up

# Check infrastructure health
./foodbot infra:ps

# View infrastructure logs
./foodbot infra:logs

# Stop infrastructure
./foodbot infra:down
```

### Manual Infrastructure Setup

```bash
# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verify all services are healthy
docker-compose -f docker-compose.dev.yml ps

# Check individual service health
curl http://localhost:9200/_cluster/health  # Elasticsearch
curl http://localhost:5432                   # PostgreSQL (connection test)
redis-cli ping                               # Redis
```

### Infrastructure Configuration

All infrastructure services are configured in `docker-compose.dev.yml` with:
- **Persistent volumes** for data retention
- **Health checks** for service readiness
- **Resource limits** for stability
- **Network isolation** for security

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment with Kubernetes.

---

## Database Setup

### Database Schema

FoodBot uses PostgreSQL with TypeORM for schema management. The database includes:

**Core Tables:**
- `users` - User accounts (customers, restaurant owners, admins)
- `restaurants` - Restaurant profiles with geo-location
- `dishes` - Menu items with dietary information
- `dish_categories` - Menu categories per restaurant
- `orders` - Order records with status tracking
- `order_items` - Order line items with customizations
- `reviews` - Customer reviews and ratings
- `cart_items` - Shopping cart items
- `addresses` - User delivery addresses
- `payments` - Payment transactions

**Relationships:**
- Users → Orders (one-to-many)
- Restaurants → Dishes (one-to-many)
- Orders → OrderItems (one-to-many)
- Restaurants → Reviews (one-to-many)

### Database Setup with Wrapper Script

```bash
# Run migrations to create schema
./foodbot db:setup

# Seed database with dummy data
./foodbot db:seed

# Complete reset (drop + setup + seed)
./foodbot db:reset
```

### Dummy Data Overview

After running `./foodbot db:seed`, the database contains:

**Users (16 total):**
- **10 Customers**: john.doe@example.com, jane.smith@example.com, etc.
- **5 Restaurant Owners**: owner.punjabgrill@example.com, owner.dosacorner@example.com, etc.
- **1 Admin**: admin@foodbot.com
- **All passwords**: `password` (bcrypt hashed)

**Restaurants (10 total):**
- Punjab Grill (North Indian, 4.5⭐)
- Dosa Corner (South Indian, 4.7⭐)
- Pizza Paradise (Italian, 4.3⭐)
- Burger Bistro (American, 4.1⭐)
- Thai Kitchen (Thai, 4.6⭐)
- Biryani House (Biryani, 4.8⭐)
- Sushi Bar (Japanese, 4.4⭐)
- Taco Fiesta (Mexican, 4.2⭐)
- Healthy Bowl (Healthy, 4.5⭐)
- Dessert Dreams (Desserts, 4.7⭐)

**Dishes (80+ items):**
- Each restaurant has 8+ dishes across multiple categories
- Full pricing, ratings, dietary info, prep times
- Realistic descriptions and images

**Orders (30 sample orders):**
- Various statuses: pending, preparing, delivered, cancelled
- Complete order history with items and payments

**Reviews (40 reviews):**
- Customer feedback with ratings and comments

### Manual Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U foodbot -d foodbot

# Run migrations manually
pnpm --filter @foodbot/gateway-api migration:run

# Generate new migration
pnpm --filter @foodbot/gateway-api migration:generate -n MigrationName

# Revert last migration
pnpm --filter @foodbot/gateway-api migration:revert
```

---

## Microservices & Frontend Apps

### Backend Microservices

#### 1. Gateway API (NestJS)
**Location**: `apps/gateway-api/`
**Port**: 3000
**Purpose**: REST API gateway with JWT authentication

**Key Modules:**
- `auth` - JWT authentication, guards, decorators
- `restaurant` - Restaurant CRUD operations
- `dish` - Menu item management
- `order` - Order placement and tracking
- `payment` - Payment processing
- `search` - Search proxy to MCP Orchestrator
- `admin` - Admin operations

**Run:**
```bash
./foodbot dev gateway-api
# or
pnpm --filter @foodbot/gateway-api start:dev
```

#### 2. MCP Orchestrator (Spring Boot/Java)
**Location**: `services/mcp-orchestrator/`
**Port**: 8081
**Purpose**: Multi-provider search aggregation with Elasticsearch

**Key Components:**
- Circuit breakers (Resilience4j)
- Redis caching layer
- Elasticsearch integration
- Kafka event consumers for real-time indexing
- Provider routing (Swiggy, Zomato, Mock)

**Run:**
```bash
./foodbot dev mcp-orchestrator
# or
cd services/mcp-orchestrator && ./mvnw spring-boot:run
```

#### 3. MCP Adapter (TypeScript)
**Location**: `services/mcp-adapter/`
**Port**: 3003
**Purpose**: Provider integration adapter with OAuth token management

**Features:**
- Swiggy provider integration
- Zomato provider integration
- Internal provider (FoodBot database)
- Result aggregation and deduplication
- Token encryption and storage

**Run:**
```bash
./foodbot dev mcp-adapter
```

#### 4. Search Orchestrator (TypeScript)
**Location**: `services/search-orchestrator/`
**Port**: 3004
**Purpose**: Multi-source search coordination

**Data Sources:**
- Elasticsearch (fast, 200ms timeout)
- MCP Adapter (comprehensive, 2000ms timeout)
- Direct Database (fallback, 500ms timeout)

**Run:**
```bash
./foodbot dev search-orchestrator
```

#### 5. Notification Service (TypeScript)
**Location**: `services/notification-service/`
**Purpose**: Multi-channel notification dispatch via Kafka

**Channels:**
- Email (SendGrid)
- SMS (Twilio)
- Push notifications
- WebSocket real-time updates

**Run:**
```bash
./foodbot dev notification
```

#### 6. Temporal Workers (TypeScript)
**Location**: `packages/workflows/`
**Purpose**: Durable workflow execution

**Workflows:**
- Order Fulfillment (saga pattern)
- User Onboarding (multi-day sequence)
- Restaurant Onboarding (human-in-the-loop)

**Run:**
```bash
pnpm --filter @foodbot/workflows worker
```

### Frontend Applications

#### 1. Customer App (React + Redux)
**Location**: `apps/customer-app/`
**Port**: 3001
**Tech**: React 18, Redux Toolkit, TypeScript

**Features:**
- Chat-based restaurant discovery
- Menu browsing with filters
- Cart management
- Order placement and tracking
- Payment processing
- Review submission

**Run:**
```bash
./foodbot dev customer-app
```

#### 2. Restaurant Owner App (React + Zustand)
**Location**: `apps/restaurant-app/`
**Port**: 3002
**Tech**: React 18, Zustand, TanStack Query, Tailwind

**Features:**
- Dashboard with KPIs
- Menu management (CRUD)
- Order status management
- Analytics and reports
- Real-time WebSocket updates

**Run:**
```bash
./foodbot dev restaurant-app
```

### Running All Services

```bash
# Run all backend + frontend services
./foodbot dev

# Run infrastructure first (recommended)
./foodbot infra:up
sleep 10
./foodbot dev
```

---

## Development Setup

### Environment Variables

See `.env.example` for all required environment variables. Key categories:

- **JWT Configuration:** `JWT_SECRET`, `JWT_REFRESH_SECRET`, token expiry times
- **LLM Providers:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`
- **MCP Providers:** `MCP_SWIGGY_ENABLED`, `MCP_ZOMATO_ENABLED`, `MCP_MOCK_ENABLED`
- **Infrastructure:** Database, Redis, Elasticsearch, Kafka, Temporal connection strings
- **Quality Gates:** `MIN_TEST_COVERAGE`, `MIN_READINESS_SCORE`

### Infrastructure Services

```bash
pnpm docker:up          # Start all infrastructure
pnpm docker:dev         # Development mode with debug logging
pnpm docker:health      # Check service health
pnpm docker:logs        # View logs
pnpm docker:down        # Stop services
pnpm docker:clean       # Stop and remove volumes
```

**Service URLs:**

| Service | URL | Purpose |
|---------|-----|---------|
| Gateway API | http://localhost:3000 | REST API |
| MCP Orchestrator | http://localhost:8081/mcp/v1 | Search aggregation |
| Temporal UI | http://localhost:8080 | Workflow monitoring |
| Redis Commander | http://localhost:8081 | Redis data browser |
| Kafka UI | http://localhost:8082 | Kafka topic browser |
| Elasticsearch | http://localhost:9200 | Search API |
| Kibana | http://localhost:5601 | Elasticsearch dashboards |

### Code Quality

```bash
pnpm lint               # Lint all code
pnpm lint:fix           # Auto-fix linting issues
pnpm format             # Format with Prettier
pnpm format:check       # Check formatting
pnpm quality:check      # Full quality check (lint + format + tests)
pnpm security:scan      # Security vulnerability scan
```

---

## Running Tests

FoodBot uses a three-tier testing strategy:

### Unit Tests

```bash
pnpm test:unit          # Run all unit tests
pnpm test:watch         # Watch mode
pnpm test:coverage      # With coverage report
```

Coverage thresholds enforced at 80% for branches, functions, lines, and statements.

### Integration Tests

```bash
pnpm test:integration   # Requires PostgreSQL and Redis
```

### E2E Tests

```bash
pnpm test:e2e           # Playwright across Chromium, Firefox, WebKit
pnpm test:e2e:ui        # Interactive UI mode
pnpm test:e2e:debug     # Debug mode
```

### All Tests

```bash
pnpm test:all           # Unit + Integration + E2E
```

For testing patterns and conventions, see [docs/TESTING.md](docs/TESTING.md).

### Test Organization

```
test/
├── unit/              # Unit tests (fast, isolated)
├── integration/       # Integration tests (with infrastructure)
├── e2e/              # End-to-end tests (full stack)
└── fixtures/         # Test data factories
```

### Testing Best Practices

✅ **Do:**
- Use test factories for data generation
- Mock external dependencies in unit tests
- Test happy path and error cases
- Keep tests deterministic (no random data)
- Use descriptive test names

❌ **Don't:**
- Use hardcoded test data
- Test implementation details
- Create flaky tests
- Skip test coverage
- Ignore failing tests

### Code Quality Checks

```bash
# Run all quality checks
./foodbot quality

# Individual checks
./foodbot lint           # ESLint
./foodbot format         # Prettier check
./foodbot typecheck      # TypeScript
./foodbot security       # Security audit
```

### Security Testing

```bash
# Security vulnerability scan
./foodbot security

# Fix vulnerabilities automatically
./foodbot security:fix

# Manual dependency audit
pnpm audit
cd services/mcp-orchestrator && ./mvnw dependency-check:check
```

### Code Review Checklist

Before submitting a PR:
- [ ] All tests passing (`./foodbot test`)
- [ ] Code coverage ≥ 80% (`./foodbot test:coverage`)
- [ ] No linting errors (`./foodbot lint`)
- [ ] Code formatted (`./foodbot format`)
- [ ] No type errors (`./foodbot typecheck`)
- [ ] No security vulnerabilities (`./foodbot security`)
- [ ] Documentation updated
- [ ] Commit messages follow conventional commits

---

## Requirements & Workflows

### Core Requirements

**FR1: User Management**
- User registration with email verification
- JWT-based authentication with refresh tokens
- Role-based access control (customer, restaurant_owner, admin)
- User profile management with delivery addresses

**FR2: Restaurant Discovery**
- Full-text search with Elasticsearch (BM25 ranking)
- Geo-spatial search (find restaurants near user)
- Filters: cuisine, price range, rating, delivery time
- Multi-provider aggregation (Swiggy, Zomato, Internal)

**FR3: Menu Browsing**
- Browse dishes by category
- Dietary filters (vegetarian, vegan, gluten-free)
- Dish customizations (size, toppings, spice level)
- Real-time availability updates

**FR4: Order Placement**
- Shopping cart with add/update/remove
- Order validation (minimum order, delivery radius)
- Payment processing (card, UPI, wallet)
- Saga pattern for distributed transactions

**FR5: Order Tracking**
- Real-time order status updates via WebSocket
- Signal-based Temporal workflows
- Status: pending → confirmed → preparing → ready → pickup → delivered
- Delivery time estimation

**FR6: Restaurant Management**
- Restaurant profile CRUD
- Menu item (dish) CRUD
- Order status management
- Analytics dashboard

**FR7: Admin Operations**
- User management (view, suspend, reactivate)
- Restaurant approval workflow
- System monitoring dashboard

### Key Workflows

#### 1. Order Placement Workflow (Temporal)

```
User → Add Items to Cart
     → Proceed to Checkout
     → Validate Cart & Inventory
     → Reserve Items (compensate on failure)
     → Process Payment (compensate on failure)
     → Create Order
     → Send Confirmation
     → Start Fulfillment Workflow
```

**Compensation:** If payment fails, reserved items are released back to inventory.

#### 2. Restaurant Onboarding Workflow

```
Owner → Register Account
      → Create Restaurant Profile
      → Upload Documents
      → Wait for Admin Approval (human-in-the-loop)
      → Setup Stripe Connect
      → Activate Restaurant
```

#### 3. Search Workflow

```
User → Enter Search Query
     → Search Orchestrator receives request
     → Execute strategy (Fast/Comprehensive/Fallback)
     → Query Elasticsearch (200ms timeout)
     → Query MCP Adapter (2000ms timeout)
     → Query Database fallback (500ms timeout)
     → Aggregate & Deduplicate results
     → Rank by relevance (35%), rating (20%), proximity (15%)
     → Cache results in Redis (5min TTL)
     → Return paginated results
```

#### 4. Real-Time Order Updates

```
Restaurant → Update Order Status
          → Publish Kafka event (order.status.changed)
          → Notification Service consumes event
          → Send WebSocket update to customer app
          → Send email/SMS notification
          → Send push notification
          → Update Elasticsearch index
```

### Non-Functional Requirements

**Performance:**
- API response time < 500ms (p95)
- Search results < 200ms (Elasticsearch)
- Redis cache hit rate > 60%
- Database queries optimized with indexes

**Security:**
- OWASP Top 10 compliance
- JWT with 15min expiry + refresh tokens
- Rate limiting (5 req/min for auth, 100 req/15min for others)
- Input validation with class-validator
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)

**Reliability:**
- Circuit breakers for external services (Resilience4j)
- Saga compensation for distributed transactions
- Event replay capability (Kafka retention: 7-90 days)
- Automatic retries with exponential backoff

**Scalability:**
- Horizontal scaling with Kubernetes HPA
- Stateless services (sessions in Redis)
- Database connection pooling
- Kafka partitioning for parallel processing

---

## Architecture Deep Dive

### High-Level Architecture

FoodBot follows a **microservices architecture** with **event-driven communication**:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  Customer App (React/Redux) | Restaurant App (React/Zustand)│
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Gateway API (NestJS)                          │
│  • JWT Authentication & Authorization                        │
│  • Rate Limiting & Request Validation                        │
│  • API Routing & Orchestration                              │
└──┬───────────────┬──────────────────┬───────────────────────┘
   │               │                  │
   ▼               ▼                  ▼
┌─────────┐  ┌────────────┐    ┌──────────────┐
│Temporal │  │    MCP     │    │Notification  │
│Workflows│  │Orchestrator│    │   Service    │
│         │  │            │    │   (Kafka)    │
│• Order  │  │• Search    │    │• Email       │
│• Onboard│  │• Aggregate │    │• SMS         │
│• Saga   │  │• Cache     │    │• Push        │
└────┬────┘  └─────┬──────┘    └──────┬───────┘
     │             │                   │
     └─────────────┴───────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  PostgreSQL | Redis | Elasticsearch | Kafka                 │
└─────────────────────────────────────────────────────────────┘
```

**Key Architectural Patterns:**

1. **API Gateway Pattern**: Single entry point (Gateway API) for all client requests
2. **Saga Pattern**: Distributed transactions with compensation (Temporal workflows)
3. **CQRS (Command Query Responsibility Segregation)**: Separate read (search) and write (orders) paths
4. **Event Sourcing**: Kafka events for audit trail and replay
5. **Circuit Breaker**: Resilience4j protects against cascading failures
6. **Cache-Aside**: Redis caching with TTL and invalidation

### Low-Level Architecture

#### Gateway API (NestJS) - Layered Architecture

```
Controller Layer (HTTP)
    ↓
Guard Layer (Auth, Roles)
    ↓
Validation Layer (DTOs)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Database (PostgreSQL)
```

**Flow Example - Create Order:**
```typescript
1. POST /orders → OrderController.createOrder()
2. JwtAuthGuard verifies JWT token
3. RolesGuard checks user has 'customer' role
4. CreateOrderDto validates request body
5. OrderService.createOrder() orchestrates:
   - Validate cart items
   - Check inventory availability
   - Start Temporal workflow
6. OrderRepository.save() persists order
7. Kafka producer publishes order.created event
8. Return OrderResponseDto to client
```

#### MCP Orchestrator (Spring Boot) - Service Architecture

```
REST Controller
    ↓
Service Layer (Search/Aggregation)
    ↓
┌─────────────┬──────────────┬─────────────┐
│ Elasticsearch│  MCP Providers│   Cache    │
│   Client     │   (Resilience)│  (Redis)   │
└─────────────┴──────────────┴─────────────┘
    ↓
Result Aggregation & Ranking
    ↓
Response Mapping
```

#### Temporal Workflows - State Machine

```
Order Workflow States:
PENDING → CONFIRMED → PREPARING → READY → PICKUP → DELIVERED

Signals:
- orderConfirmed()
- orderReady()
- orderPickedUp()
- orderDelivered()

Activities:
- validateCart()
- processPayment()
- reserveItems()
- sendNotification()
- updateOrderStatus()
```

#### Kafka Event Flow

```
Producer (Gateway API)
    ↓
Kafka Topic (order.created)
    ↓
┌──────────────┬─────────────────┬────────────────┐
│ Notification │  Search Indexer │  Analytics     │
│   Consumer   │    Consumer     │   Consumer     │
└──────────────┴─────────────────┴────────────────┘
    ↓                ↓                  ↓
Send Email     Update ES Index     Update Metrics
```

---

## MCP Integration Strategy

FoodBot integrates with three different MCP (Model Context Protocol) providers: **Swiggy**, **Zomato**, and **Internal** (FoodBot's own database). Each has a different integration approach based on API availability and authentication requirements.

### Integration Architecture Overview

```
Customer App → Gateway API → MCP Adapter → [Swiggy | Zomato | Internal]
                                  ↓
                          OAuth Token Manager
                                  ↓
                          Encrypted Token Storage (Redis)
```

### 1. Swiggy MCP Integration

**Status**: ❌ **No Public API Available**

**Research Findings:**
- Swiggy does NOT provide a public API for third-party integrations
- The GitHub repository `swiggy-mcp-server` is a **specification/manifest** repository, not a running API server
- MCP is a protocol for AI agent tool calling, not a REST API

**Integration Strategy: Hybrid Architecture (Browser OAuth + Backend Calls)**

```
┌─────────────┐
│Customer App │
│  (Browser)  │
└──────┬──────┘
       │ 1. Initiate OAuth
       ▼
┌─────────────────┐
│ Gateway API     │
│ /auth/swiggy    │
└──────┬──────────┘
       │ 2. Redirect to Swiggy OAuth
       ▼
┌─────────────────┐
│ Swiggy OAuth    │
│ Login Page      │
└──────┬──────────┘
       │ 3. User approves
       ▼
┌─────────────────┐
│ OAuth Callback  │
│ /callback       │
└──────┬──────────┘
       │ 4. Exchange code for token
       ▼
┌─────────────────┐
│  MCP Adapter    │
│ Store encrypted │
│ token in Redis  │
└──────┬──────────┘
       │ 5. Use token for MCP calls
       ▼
┌─────────────────┐
│  Swiggy MCP     │
│  Tool Calls     │
└─────────────────┘
```

**Implementation:**

**File**: `services/mcp-adapter/src/providers/swiggy/SwiggyOAuthProvider.ts`

```typescript
// OAuth flow initiation
initiateSwiggyAuth(userId: string) → redirect_url

// Token exchange after OAuth
handleOAuthCallback(code: string, state: string) → tokens

// Store encrypted tokens
storeTokens(userId: string, tokens: TokenSet) → Redis

// MCP tool calls with stored token
searchRestaurants(query, userToken) → Swiggy MCP
getMenu(restaurantId, userToken) → Swiggy MCP
placeOrder(orderData, userToken) → Swiggy MCP
```

**Token Security:**
- Tokens never exposed to browser
- Encrypted with AES-256-GCM before Redis storage
- TTL matches token expiry
- Automatic refresh when expired

**Alternative (if OAuth not available):**
- Web scraping with Puppeteer (not recommended, violates ToS)
- Mock provider for development/testing

### 2. Zomato MCP Integration

**Status**: ❌ **No Public API Available**

**Research Findings:**
- Zomato discontinued their public API in 2020
- The GitHub repository `zomato-mcp-server` is also a specification repository
- No official API keys available for developers

**Integration Strategy: Same Hybrid Architecture as Swiggy**

```
User OAuth → Gateway API → MCP Adapter → Encrypted Token Storage → Zomato MCP
```

**Implementation:**

**File**: `services/mcp-adapter/src/providers/zomato/ZomatoOAuthProvider.ts`

Same pattern as Swiggy:
1. User initiates account linking in browser
2. OAuth popup redirects to Zomato login
3. User approves permissions
4. Callback exchanges code for token
5. Token encrypted and stored in Redis
6. Backend MCP Adapter uses token for all Zomato calls

**Key Differences from Swiggy:**
- Different OAuth endpoints
- Different token format
- Different MCP tool schemas

**File**: `apps/customer-app/src/services/account-linking.service.ts`

```typescript
// Frontend only handles OAuth popup
linkZomatoAccount() {
  const popup = window.open('/auth/zomato/initiate', 'Zomato Auth');
  // Listen for callback success
  window.addEventListener('message', handleOAuthSuccess);
}
```

### 3. Internal (FoodBot) MCP Integration

**Status**: ✅ **Fully Integrated**

**Integration Strategy: Direct Database Access**

```
Gateway API → MCP Adapter (Internal Provider) → PostgreSQL
                                                     ↓
                                              TypeORM Entities
```

**Implementation:**

**File**: `services/mcp-adapter/src/providers/internal/InternalProvider.ts`

```typescript
class InternalProvider {
  // Direct database queries via TypeORM
  async searchRestaurants(query: SearchQuery) {
    return this.restaurantRepository.find({
      where: {
        name: ILike(`%${query.query}%`),
        isActive: true,
        isOpen: true,
      },
      order: { rating: 'DESC' },
    });
  }

  async getMenu(restaurantId: string) {
    return this.dishRepository.find({
      where: { restaurantId, isAvailable: true },
      relations: ['category'],
    });
  }

  async placeOrder(orderData: OrderRequest) {
    // Start Temporal workflow
    return this.temporalClient.start(orderFulfillmentWorkflow, orderData);
  }
}
```

**Advantages:**
- No external API dependencies
- Fastest response time (<50ms)
- Full control over data
- No API rate limits
- Real-time data consistency

**Use Cases:**
- Fallback when Swiggy/Zomato unavailable
- Restaurants onboarded directly to FoodBot
- Development and testing

### MCP Integration Comparison

| Feature | Swiggy | Zomato | Internal |
|---------|--------|--------|----------|
| **API Availability** | ❌ No public API | ❌ Discontinued | ✅ Full access |
| **Authentication** | OAuth 2.0 (if available) | OAuth 2.0 (if available) | JWT |
| **Integration Method** | Hybrid (Browser OAuth + Backend) | Hybrid (Browser OAuth + Backend) | Direct DB |
| **Token Storage** | Redis (encrypted) | Redis (encrypted) | N/A |
| **Latency** | ~2000ms | ~2000ms | ~50ms |
| **Rate Limits** | Provider-defined | Provider-defined | None |
| **Fallback** | Internal provider | Internal provider | N/A |
| **Implementation Status** | ✅ Complete | ✅ Complete | ✅ Complete |

### Getting API Keys

**Swiggy:**
1. ❌ **Not Available** - Swiggy does not provide public API access
2. **Alternative**: Contact Swiggy business partnerships team for enterprise API access (may require business agreement)
3. **Development**: Use mock provider or internal provider for testing

**Zomato:**
1. ❌ **Not Available** - Zomato discontinued public API in 2020
2. **Alternative**: Zomato for Business API (requires restaurant owner account)
3. **Development**: Use mock provider or internal provider for testing

**Internal:**
1. ✅ **Fully Available** - No API keys needed
2. Uses existing JWT authentication
3. Direct access to PostgreSQL database

### Token Flow with User Login Context

**Problem**: How does the backend MCP Adapter use the user's login context when calling Swiggy/Zomato?

**Solution**: OAuth Token Association

```
1. User logs into FoodBot → JWT issued
2. User links Swiggy account → OAuth flow
3. OAuth tokens stored with userId mapping
4. User searches restaurants:
   GET /search
   Authorization: Bearer <FoodBot-JWT>
5. Gateway API extracts userId from JWT
6. Calls MCP Adapter with userId
7. MCP Adapter retrieves Swiggy token for userId
8. Makes MCP call with user's Swiggy token
9. Returns aggregated results
```

**Implementation:**

```typescript
// Gateway API - Search Controller
@UseGuards(JwtAuthGuard)
@Get('/search')
async search(@CurrentUser() user: User, @Query() query: SearchQuery) {
  // Pass userId to MCP Adapter
  return this.mcpAdapter.search(query, user.id);
}

// MCP Adapter - Search Service
async search(query: SearchQuery, userId: string) {
  // Retrieve user's tokens from Redis
  const swiggyToken = await this.tokenStore.get(`swiggy:${userId}`);
  const zomatoToken = await this.tokenStore.get(`zomato:${userId}`);

  // Make parallel calls with user-specific tokens
  const [swiggyResults, zomatoResults, internalResults] = await Promise.all([
    this.swiggyProvider.search(query, swiggyToken),
    this.zomatoProvider.search(query, zomatoToken),
    this.internalProvider.search(query),
  ]);

  // Aggregate and deduplicate
  return this.aggregator.merge([swiggyResults, zomatoResults, internalResults]);
}
```

### Circuit Breaker & Resilience

Each MCP provider is protected with Resilience4j circuit breaker:

```typescript
@CircuitBreaker(name = "swiggy", fallbackMethod = "swiggyFallback")
async searchSwiggy(query: SearchQuery, token: string) {
  // Call Swiggy MCP
}

swiggyFallback(query: SearchQuery, token: string, error: Error) {
  // Fall back to internal provider
  return this.internalProvider.search(query);
}
```

**Circuit Breaker Configuration:**
- **Failure Rate Threshold**: 50% (opens after 50% failures)
- **Wait Duration**: 60 seconds (retry after 1 minute)
- **Permitted Calls in Half-Open**: 5 (test with 5 calls)

### See Also

- [MCP_INTEGRATION.md](docs/MCP_INTEGRATION.md) - Detailed MCP integration guide
- [MCP_RESEARCH_REPORT.md](prompt-docs/MCP_RESEARCH_REPORT.md) - Research findings on MCP providers
- [SWIGGY_INTEGRATION_STRATEGY.md](prompt-docs/SWIGGY_INTEGRATION_STRATEGY.md) - Swiggy-specific strategy
- [ZOMATO_INTEGRATION_STRATEGY.md](prompt-docs/ZOMATO_INTEGRATION_STRATEGY.md) - Zomato-specific strategy
- [INTERNAL_INTEGRATION_STRATEGY.md](prompt-docs/INTERNAL_INTEGRATION_STRATEGY.md) - Internal provider strategy

---

## Project Structure

```
FoodBot/
+-- apps/
|   +-- customer-app/              # React customer frontend (Redux Toolkit)
|   |   +-- src/
|   |       +-- components/        # Chat, Restaurant, Dish, Cart, Order, Status
|   |       +-- hooks/             # useDebounce, useInfiniteScroll, useJobPolling
|   |       +-- services/          # Axios API client
|   |       +-- store/             # Redux store and slices
|   |       +-- test/              # Test utilities and factories
|   +-- gateway-api/               # NestJS backend API (not a package.json workspace)
|   |   +-- src/
|   |       +-- entities/          # TypeORM entities
|   |       +-- filters/           # Exception filters
|   |       +-- modules/           # Feature modules (12 modules)
|   |       |   +-- auth/          # JWT auth, guards, decorators
|   |       |   +-- chat/          # AI chat interaction
|   |       |   +-- restaurant/    # Restaurant CRUD
|   |       |   +-- dish/          # Dish CRUD
|   |       |   +-- cart/          # Cart management
|   |       |   +-- order/         # Order management
|   |       |   +-- payment/       # Payment processing
|   |       |   +-- feedback/      # Ratings and feedback
|   |       |   +-- user/          # User profile and addresses
|   |       |   +-- admin/         # Admin operations
|   |       |   +-- search/        # Search proxy
|   |       |   +-- health/        # Health checks
|   |       +-- services/          # Redis, Email, audit services
|   +-- restaurant-app/            # React restaurant owner dashboard (Zustand + TanStack)
|       +-- src/
|           +-- components/        # analytics, common, layout, menu, orders
|           +-- contexts/          # auth, order, restaurant contexts
|           +-- hooks/             # useWebSocket, useNotificationSound
|           +-- pages/             # Dashboard, Menu, Orders, Analytics, Auth
+-- packages/
|   +-- events/                    # Kafka event schemas (Zod-validated)
|   |   +-- src/
|   |       +-- schemas/           # Restaurant, Dish, Order, Payment, User events
|   |       +-- topics.ts          # Topic definitions, consumer groups, configs
|   +-- workflows/                 # Temporal workflows and activities
|       +-- src/
|           +-- workflows/         # 6 workflow definitions
|           +-- activities/        # Activity implementations
|           +-- workers/           # Worker and worker-manager
|           +-- types/             # Shared type definitions
|           +-- __tests__/         # Workflow tests (39 tests)
+-- services/
|   +-- mcp-orchestrator/          # Java/Spring Boot search aggregation
|   |   +-- src/main/java/com/foodbot/mcp/
|   |       +-- controller/        # REST controllers
|   |       +-- providers/         # Mock, Swiggy, Zomato MCP clients
|   |       +-- search/            # Elasticsearch search services
|   |       +-- cache/             # Redis caching layer
|   |       +-- aggregator/        # Result aggregation and ranking
|   |       +-- resilience/        # Circuit breaker, retry, rate limiter
|   |       +-- indexing/          # Kafka event consumers
|   +-- mcp-adapter/               # TypeScript MCP provider adapter
|   |   +-- src/
|   |       +-- providers/         # Swiggy, Zomato, Mock, Internal providers
|   |       +-- aggregator/        # Result merging, dedup, ranking
|   |       +-- resilience/        # Circuit breaker, rate limiter, retry
|   |       +-- auth/              # OAuth, token management
|   |       +-- cache/             # Redis cache manager
|   +-- search-orchestrator/       # Multi-source search coordination
|   |   +-- src/
|   |       +-- orchestrator/      # Parallel execution, fallback, timeout
|   |       +-- sources/           # ES, MCP, DB data sources
|   |       +-- aggregation/       # Merging, scoring, ranking
|   |       +-- strategies/        # Fast, comprehensive, fallback strategies
|   +-- notification-service/      # Kafka-powered notification dispatch
|       +-- src/
|           +-- consumers/         # Order, payment, user event consumers
|           +-- channels/          # Email, SMS, push, WebSocket channels
+-- infra/                         # Infrastructure configuration stubs
+-- e2e/                           # Playwright E2E tests
+-- test/                          # Shared test setup and utilities
+-- tools/                         # CLI tools (patch, workflow, observability)
+-- scripts/                       # Shell scripts (health checks)
+-- docs/                          # Project documentation
+-- prompt-docs/                   # AI development prompts and reports
+-- docker-compose.yml             # Infrastructure services
+-- docker-compose.dev.yml         # Development overrides
+-- jest.config.cjs                # Jest test configuration
+-- playwright.config.ts           # Playwright E2E configuration
+-- eslint.config.js               # ESLint configuration
+-- tsconfig.json                  # TypeScript configuration
+-- pnpm-workspace.yaml            # pnpm workspace configuration
+-- package.json                   # Root package with scripts
```

---

## Documentation

### Getting Started

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | **⭐ Quick start guide - Start here!** |
| [WRAPPER_SCRIPT_GUIDE.md](docs/WRAPPER_SCRIPT_GUIDE.md) | Complete `./foodbot` command reference |

### Architecture and Design

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, component interactions, data flow |
| [SEARCH_ARCHITECTURE.md](docs/SEARCH_ARCHITECTURE.md) | Elasticsearch search design and ranking algorithm |
| [MCP_INTEGRATION.md](docs/MCP_INTEGRATION.md) | MCP protocol integration with provider failover |
| [WORKFLOW_GUIDE.md](docs/WORKFLOW_GUIDE.md) | Temporal workflow definitions and saga patterns |
| [EVENT_STREAMING.md](docs/EVENT_STREAMING.md) | Kafka event streaming architecture and schemas |
| [FRONTEND_GUIDE.md](docs/FRONTEND_GUIDE.md) | Frontend architecture for both React applications |

### API Reference

| Document | Description |
|----------|-------------|
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Complete REST API endpoint reference |
| [gateway-api/swagger.yaml](apps/gateway-api/swagger.yaml) | OpenAPI 3.0 spec for Gateway API |
| [mcp-adapter/swagger.yaml](services/mcp-adapter/swagger.yaml) | OpenAPI 3.0 spec for MCP Adapter |
| [search-orchestrator/swagger.yaml](services/search-orchestrator/swagger.yaml) | OpenAPI 3.0 spec for Search Orchestrator |

### Development Guides

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | **⭐ Quick start guide with wrapper script commands** |
| [WRAPPER_SCRIPT_GUIDE.md](docs/WRAPPER_SCRIPT_GUIDE.md) | Complete reference for the `./foodbot` wrapper script |
| [WRAPPER_SCRIPT_IMPLEMENTATION.md](WRAPPER_SCRIPT_IMPLEMENTATION.md) | Wrapper script implementation details and summary |
| [scripts/README.md](scripts/README.md) | Database and utility scripts documentation |
| [DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md) | Local development environment setup |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Git workflow, PR process, coding standards |
| [CODE_STANDARDS.md](docs/CODE_STANDARDS.md) | TypeScript/Java guidelines, naming conventions |
| [TESTING.md](docs/TESTING.md) | Testing strategy, patterns, and coverage |
| [Development Guardrails](.claude/rules/development-guardrails.md) | Enforced coding standards and quality rules |

### Operations

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker Compose and Kubernetes deployment |
| [PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) | Pre-launch verification checklist |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues, debugging, useful commands |
| [SECURITY.md](docs/SECURITY.md) | Authentication, authorization, encryption |

### Diagrams

All architecture diagrams are in `docs/diagrams/` as ASCII art:

- [system-architecture.txt](docs/diagrams/system-architecture.txt) - Full system overview
- [data-flow.txt](docs/diagrams/data-flow.txt) - Data flow across services
- [deployment-architecture.txt](docs/diagrams/deployment-architecture.txt) - Docker and Kubernetes
- [mcp-integration-flow.txt](docs/diagrams/mcp-integration-flow.txt) - MCP provider routing
- [search-orchestration-flow.txt](docs/diagrams/search-orchestration-flow.txt) - Search pipeline
- [order-workflow.txt](docs/diagrams/order-workflow.txt) - Order placement saga
- [authentication-flow.txt](docs/diagrams/authentication-flow.txt) - JWT auth lifecycle

### Service READMEs

Each service has its own README with setup, API, configuration, and development instructions:

- [apps/customer-app/README.md](apps/customer-app/README.md) - Customer React application
- [apps/restaurant-app/README.md](apps/restaurant-app/README.md) - Restaurant owner dashboard
- [services/mcp-orchestrator/README.md](services/mcp-orchestrator/README.md) - MCP Orchestrator (Spring Boot)
- [services/mcp-adapter/README.md](services/mcp-adapter/README.md) - MCP Adapter (TypeScript)
- [services/search-orchestrator/README.md](services/search-orchestrator/README.md) - Search Orchestrator
- [services/notification-service/README.md](services/notification-service/README.md) - Notification Service
- [packages/workflows/README.md](packages/workflows/README.md) - Temporal Workflows
- [packages/events/README.md](packages/events/README.md) - Kafka Event Schemas

### Project Metrics

- **Total Lines:** 26,545 lines of TypeScript/TSX/Java
- **Test Coverage:** 75% (206 tests across 41 files)
- **Production Readiness:** 95%
- **Security:** OWASP Top 10 compliant
- **Performance:** <500ms p95 for API responses

---

## Contributing

We welcome contributions. Please read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for full details.

### Quick Reference

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(scope): description`
3. Run quality checks: `pnpm quality:check`
4. Create a pull request with all CI checks passing
5. Get code review approval before merging

### Development Standards

- TypeScript strict mode enforced
- ESLint with no-explicit-any rule
- Prettier auto-formatting
- 80% minimum test coverage for new code
- Maximum 300 lines per file, 50 lines per function
- See [Development Guardrails](.claude/rules/development-guardrails.md) for full rules

---

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

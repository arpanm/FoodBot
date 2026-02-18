# FoodBot - Agentic Restaurant Commerce Platform

An AI-orchestrated, spec-driven restaurant commerce platform that combines conversational UX, multi-LLM reasoning, and deterministic workflow execution using Temporal. FoodBot is not a simple chatbot -- it is a goal-driven commerce agent that plans, validates, and executes workflows safely across multiple food delivery providers.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [License](#license)

---

## Project Overview

FoodBot is a full-stack food ordering platform built as a monorepo. It provides:

- **Conversational AI Interface**: Users interact with a chat-based UI that understands natural language queries about restaurants, dishes, and orders.
- **Multi-Provider Aggregation**: A Java-based MCP (Model Context Protocol) orchestrator aggregates results from multiple food delivery providers (Swiggy, Zomato, mock data).
- **Workflow Orchestration**: Temporal workflows handle complex multi-step operations like restaurant search, order placement, and payment processing with saga-pattern compensation.
- **Full Commerce Flow**: End-to-end support for user registration, restaurant discovery, menu browsing, cart management, order placement, payment processing, order tracking, and feedback submission.
- **Role-Based Access Control**: Three user roles (customer, restaurant_owner, admin) with appropriate permissions enforced via JWT authentication and guard-based authorization.

---

## Key Features

### Customer Features
- Natural language chat interface for restaurant discovery
- Restaurant search with filters (cuisine, price range, rating, location)
- Menu browsing with dietary filters (vegetarian, vegan)
- Cart management (add, update, remove items)
- Order placement and real-time tracking
- Payment processing (card, UPI, wallet)
- Feedback and rating submission

### Restaurant Owner Features
- Restaurant profile creation and management
- Menu item (dish) CRUD operations
- Dish availability toggling
- Order status management

### Admin Features
- User management (view, suspend, reactivate)
- Restaurant approval workflow (approve/reject pending restaurants)
- Dashboard statistics
- System monitoring

### Platform Features
- JWT-based authentication with token refresh and blacklisting
- Email verification and password reset flows
- Rate limiting on login and password reset
- Redis-backed session management and caching
- Elasticsearch-powered search with geo-location support
- Kafka event streaming for real-time data indexing
- Temporal workflow orchestration with retry policies and saga patterns
- Comprehensive test coverage (unit, integration, E2E)

---

## Architecture Overview

```
                          +------------------+
                          |  Customer App    |
                          |  (React + Redux) |
                          +--------+---------+
                                   |
                                   | HTTP/REST
                                   v
                          +------------------+
                          |  Gateway API     |
                          |  (NestJS)        |
                          +--------+---------+
                                   |
                    +--------------+---------------+
                    |              |                |
                    v              v                v
            +-------+----+  +-----+------+  +------+--------+
            |   Redis    |  |  Temporal  |  | MCP           |
            |  (Cache/   |  | (Workflow  |  | Orchestrator  |
            |   Session) |  |  Engine)   |  | (Java/Spring) |
            +------------+  +-----+------+  +------+--------+
                                  |                |
                           +------+------+    +----+----+
                           | Workflows   |    | Providers|
                           | - Search    |    | - Swiggy |
                           | - Order     |    | - Zomato |
                           | - Payment   |    | - Mock   |
                           +-------------+    +---------+
                                              |
                                    +---------+---------+
                                    |         |         |
                                    v         v         v
                               +------+ +--------+ +------+
                               |Kafka | |Elastic | |Neo4j |
                               +------+ |Search  | +------+
                                        +--------+
```

For a detailed architecture breakdown, see [docs/ARCHITECTURE_FINAL.md](docs/ARCHITECTURE_FINAL.md).

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React, Redux Toolkit, TypeScript | Customer-facing chat interface and commerce UI |
| **Backend API** | NestJS (Node.js), TypeScript | REST API gateway with JWT auth |
| **MCP Orchestrator** | Java, Spring Boot | Multi-provider search aggregation and indexing |
| **Workflows** | Temporal (TypeScript SDK) | Durable workflow orchestration |
| **Database** | PostgreSQL | Temporal persistence backend |
| **Cache** | Redis 7 | Session management, caching, rate limiting |
| **Search** | Elasticsearch 8 | Full-text search, geo-search, faceted filtering |
| **Messaging** | Apache Kafka | Event streaming, real-time data indexing |
| **Graph DB** | Neo4j (planned) | User preference graph for recommendations |
| **Testing** | Jest, Playwright, Supertest | Unit, integration, and E2E testing |
| **Code Quality** | ESLint, Prettier, SonarQube, Snyk | Linting, formatting, static analysis, security |
| **Infrastructure** | Docker Compose | Local development environment |
| **Package Manager** | pnpm (workspaces) | Monorepo dependency management |

---

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 8
- **Docker** and **Docker Compose** (for infrastructure services)
- **Java 17+** (for the MCP Orchestrator service)

### 1. Clone the Repository

```bash
git clone https://github.com/foodbot/foodbot.git
cd foodbot
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 4. Start Infrastructure Services

```bash
docker-compose up -d
```

Verify all services are running:

```bash
pnpm docker:health
```

### 5. Run the Application

The Gateway API is the primary backend service. Start it with:

```bash
# The gateway-api uses NestJS and listens on port 3000 by default
cd apps/gateway-api
pnpm start:dev
```

### 6. Run Tests

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests (requires infrastructure)
pnpm test:e2e

# All tests
pnpm test:all
```

---

## Development Setup

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# LLM Configuration
LLM_CLAUDE_ENABLED=true
LLM_OPENAI_ENABLED=true
LLM_GEMINI_ENABLED=true
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
GEMINI_API_KEY=your-key-here

# MCP Providers
MCP_SWIGGY_ENABLED=true
MCP_ZOMATO_ENABLED=false
MCP_MOCK_ENABLED=true

# Infrastructure
TEMPORAL_GATEWAY=http://localhost:8088
REDIS_URL=redis://localhost:6379
GRAPHDB_URL=bolt://localhost:7687
ELASTICSEARCH_URL=http://localhost:9200
KAFKA_BROKERS=localhost:9092

# Quality Gates
MIN_TEST_COVERAGE=80
MIN_READINESS_SCORE=0.85
SECURITY_BLOCK_ON_HIGH=true
```

### Docker Infrastructure

FoodBot relies on several infrastructure services. Start them all:

```bash
# Production-like setup
pnpm docker:up

# Development mode (with debug logging)
pnpm docker:dev

# Check health of all services
pnpm docker:health

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down

# Stop and remove volumes
pnpm docker:clean
```

**Infrastructure Service URLs:**

| Service | URL | Purpose |
|---------|-----|---------|
| Temporal UI | http://localhost:8080 | Workflow monitoring |
| Redis Commander | http://localhost:8081 | Redis data browser |
| Kafka UI | http://localhost:8082 | Kafka topic browser |
| Schema Registry | http://localhost:8083 | Kafka schema management |
| Kibana | http://localhost:5601 | Elasticsearch dashboards |
| Elasticsearch | http://localhost:9200 | Search API |

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Run full quality check (lint + format + tests)
pnpm quality:check

# Security scan
pnpm security:scan
```

---

## Running Tests

FoodBot has a comprehensive testing strategy organized into three levels:

### Unit Tests

Unit tests use Jest with ts-jest and cover individual components, services, and utilities. Test files use the `.test.ts` / `.test.tsx` extension.

```bash
pnpm test:unit
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage report
```

Coverage thresholds are enforced at 80% for branches, functions, lines, and statements.

### Integration Tests

Integration tests use Jest with NestJS testing utilities and Supertest for HTTP endpoint testing. Test files use the `.spec.ts` extension.

```bash
pnpm test:integration
```

### E2E Tests

End-to-end tests use Playwright and cover multi-browser scenarios (Chromium, Firefox, WebKit) and mobile viewports.

```bash
pnpm test:e2e
pnpm test:e2e:ui      # Interactive UI mode
pnpm test:e2e:debug   # Debug mode
```

### All Tests

```bash
pnpm test:all         # Unit + Integration + E2E
```

---

## Deployment

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Quick overview:

1. Set up infrastructure services (PostgreSQL, Redis, Elasticsearch, Kafka, Temporal)
2. Configure environment variables for the target environment
3. Build and deploy the Gateway API (NestJS)
4. Build and deploy the MCP Orchestrator (Spring Boot)
5. Build and deploy the Customer App (React)
6. Start Temporal workers for workflow execution

---

## Project Structure

```
FoodBot/
├── apps/
│   ├── customer-app/          # React frontend (chat UI, commerce flows)
│   │   └── src/
│   │       ├── components/    # UI components (Chat, Restaurant, Dish, Cart, Order, Status)
│   │       ├── hooks/         # Custom React hooks
│   │       ├── services/      # API client services
│   │       ├── store/         # Redux store and slices
│   │       └── test/          # Test utilities and factories
│   ├── gateway-api/           # NestJS backend API
│   │   └── src/
│   │       ├── entities/      # Data entities
│   │       ├── filters/       # Exception filters
│   │       ├── modules/       # Feature modules
│   │       │   ├── auth/      # Authentication (JWT, guards, decorators)
│   │       │   ├── chat/      # Chat / AI interaction
│   │       │   ├── restaurant/# Restaurant CRUD
│   │       │   ├── dish/      # Dish CRUD
│   │       │   ├── cart/      # Cart management
│   │       │   ├── order/     # Order management
│   │       │   ├── payment/   # Payment processing
│   │       │   ├── feedback/  # Feedback / ratings
│   │       │   ├── user/      # User profile / addresses
│   │       │   └── admin/     # Admin operations
│   │       ├── services/      # Shared services (Redis, Email)
│   │       └── test/          # Test utilities and factories
│   └── restaurant-app/        # Restaurant owner dashboard (planned)
├── packages/
│   ├── workflows/             # Temporal workflows and activities
│   │   └── src/
│   │       ├── activities/    # Activity implementations
│   │       ├── workflows/     # Workflow definitions
│   │       └── __tests__/     # Workflow tests
│   ├── llm-router/            # LLM provider routing (planned)
│   ├── ui-schema/             # Shared UI schemas (planned)
│   └── workflow-schema/       # Workflow definition schemas (planned)
├── services/
│   ├── mcp-orchestrator/      # Java/Spring Boot MCP aggregation service
│   │   └── src/main/java/com/foodbot/mcp/
│   │       ├── controller/    # REST controllers
│   │       ├── providers/     # MCP provider clients (Swiggy, Zomato, Mock)
│   │       ├── search/        # Elasticsearch search services
│   │       ├── cache/         # Redis caching layer
│   │       ├── router/        # Provider routing and failover
│   │       ├── aggregator/    # Result aggregation and ranking
│   │       ├── resilience/    # Circuit breaker, retry, rate limiter
│   │       ├── indexing/      # Kafka event consumers for indexing
│   │       ├── config/        # Spring configuration
│   │       └── model/         # Domain models
│   ├── mcp-adapter/           # MCP protocol adapter (planned)
│   ├── orchestration/         # Orchestration service (planned)
│   └── search-orchestrator/   # Search orchestration service (planned)
├── infra/                     # Infrastructure configuration stubs
│   ├── elasticsearch/
│   ├── graphdb/
│   ├── kafka/
│   ├── redis/
│   └── temporal/
├── e2e/                       # Playwright E2E tests
├── test/                      # Shared test setup and utilities
├── tools/                     # CLI tools (patch, workflow, observability)
├── scripts/                   # Shell scripts (health checks)
├── docs/                      # Project documentation
├── prompt-docs/               # AI development prompts and reports
├── docker-compose.yml         # Infrastructure services
├── docker-compose.dev.yml     # Development overrides
├── jest.config.cjs            # Jest test configuration
├── playwright.config.ts       # Playwright E2E configuration
├── eslint.config.js           # ESLint configuration
├── tsconfig.json              # TypeScript configuration
├── sonar-project.properties   # SonarQube configuration
└── package.json               # Root package (pnpm workspace)
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file -- project overview and quick start |
| [docs/ARCHITECTURE_FINAL.md](docs/ARCHITECTURE_FINAL.md) | System architecture, component interactions, data flow |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | API endpoint reference with examples |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Developer onboarding, coding standards, workflows |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment prerequisites, configuration, and procedures |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user feature guide and workflows |
| [prompt-docs/PROJECT_SUMMARY.md](prompt-docs/PROJECT_SUMMARY.md) | Comprehensive project summary and metrics |

---

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

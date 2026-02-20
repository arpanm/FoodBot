# FoodBot Tech Stack

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Overview

FoodBot uses a polyglot architecture combining TypeScript (Node.js) and Java (Spring Boot) services, with React frontends and enterprise-grade infrastructure. This document catalogs every technology, framework, library, and tool used in the project.

---

## Languages

| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | 5.7+ | Gateway API, Frontend apps, Workflows, Events, Notifications, MCP Adapter, Search Orchestrator |
| Java | 17 | MCP Orchestrator (Spring Boot) |
| SQL | -- | PostgreSQL queries, TypeORM migrations |
| YAML | -- | Docker Compose, CI/CD, Spring Boot config |
| JSON | -- | Package configs, ESLint, TypeScript, Jest configs |

---

## Frontend

### Customer App

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI component framework |
| Redux Toolkit | 2.0 | Global state management |
| React Redux | 9.0 | React-Redux bindings |
| React Router DOM | 6.20 | Client-side routing |
| Axios | 1.6 | HTTP client |
| TypeScript | 5.7 | Type safety |

### Restaurant App

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI component framework |
| Zustand | 4.4 | Lightweight state management |
| TanStack Query | 5.17 | Server state management and caching |
| React Router DOM | 6.20 | Client-side routing |
| Recharts | 2.10 | Data visualization |
| Axios | 1.6 | HTTP client |
| Tailwind CSS | 3.4 | Utility-first CSS framework |
| Vite | 5.0 | Build tool and dev server |
| PostCSS | 8.4 | CSS processing |
| Autoprefixer | 10.4 | CSS vendor prefixing |
| TypeScript | 5.7 | Type safety |

### Frontend Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| Jest | 29.7 | Test runner |
| React Testing Library | 14.1 | React component testing |
| @testing-library/jest-dom | 6.1 | Custom DOM matchers |
| @testing-library/user-event | 14.5 | User interaction simulation |
| ts-jest | 29.2 | TypeScript Jest transformer |
| jest-environment-jsdom | 29.7 | Browser-like test environment |

---

## Backend

### Gateway API (NestJS)

| Technology | Version | Purpose |
|-----------|---------|---------|
| NestJS | 10.x | Backend framework |
| TypeORM | 0.3.x | Object-relational mapping |
| Passport | 0.7.x | Authentication middleware |
| passport-jwt | 4.0.x | JWT strategy for Passport |
| @nestjs/jwt | 10.x | JWT token management |
| @nestjs/throttler | 5.x | Rate limiting |
| bcrypt | 5.x | Password hashing |
| class-validator | 0.14.x | DTO validation |
| class-transformer | 0.5.x | DTO transformation |
| helmet | 7.x | HTTP security headers |
| Pino | 9.x | Structured JSON logging |
| TypeScript | 5.7 | Type safety |

### MCP Orchestrator (Spring Boot)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Spring Boot | 3.2.2 | Application framework |
| Spring WebFlux | 6.x | Reactive HTTP client (WebClient) |
| Spring Data Elasticsearch | 3.2.x | Elasticsearch integration |
| Spring Data Redis | 3.2.x | Redis caching |
| Spring Kafka | 3.1.x | Kafka consumer |
| Resilience4j | 2.2.0 | Circuit breaker, rate limiter, bulkhead, retry |
| Jackson | 2.16.1 | JSON serialization |
| Lombok | 1.18.x | Java boilerplate reduction |
| Maven | 3.9+ | Build tool |
| JUnit 5 | 5.10+ | Testing framework |
| Mockito | 5.x | Mocking framework |

### MCP Adapter

| Technology | Version | Purpose |
|-----------|---------|---------|
| Zod | 3.23 | Runtime schema validation |
| ioredis | 5.9 | Redis client |
| Pino | 9.4 | Structured JSON logging |
| dotenv | 16.4 | Environment variables |
| tsx | 4.7 | TypeScript execution with hot reload |

### Notification Service

| Technology | Version | Purpose |
|-----------|---------|---------|
| Pino | 9.4 | Structured JSON logging |
| UUID | 9.0 | Notification ID generation |

---

## Workflow Engine

| Technology | Version | Purpose |
|-----------|---------|---------|
| Temporal Server | 1.22 | Workflow orchestration engine |
| @temporalio/workflow | 1.11.3 | Workflow definitions |
| @temporalio/activity | 1.11.3 | Activity implementations |
| @temporalio/client | 1.11.3 | Temporal client SDK |
| @temporalio/worker | 1.11.3 | Worker runtime |
| @temporalio/testing | 1.11.3 | Test environment |

---

## Data Stores

| Technology | Version | Purpose | Port |
|-----------|---------|---------|------|
| PostgreSQL | 15 | Primary relational database (app data) | 5433 |
| PostgreSQL | 15 | Temporal persistence backend | 5432 |
| Redis | 7 | Caching, sessions, rate limiting, token blacklist | 6379 |
| Elasticsearch | 8.11 | Full-text search, geo-spatial queries | 9200 |

---

## Messaging

| Technology | Version | Purpose | Port |
|-----------|---------|---------|------|
| Apache Kafka | 7.5 (Confluent) | Event streaming | 9092 |
| Zookeeper | 7.5 (Confluent) | Kafka coordination | 2181 |
| Schema Registry | 7.5 (Confluent) | Schema management | 8083 |

---

## Event Schemas

| Technology | Version | Purpose |
|-----------|---------|---------|
| Zod | 3.23 | Runtime schema validation for Kafka events |
| UUID | 9.0 | Event ID generation |

---

## Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| Jest | 29.7 | Unit and integration test runner |
| Playwright | latest | E2E browser testing |
| Supertest | latest | HTTP endpoint testing |
| React Testing Library | 14.1 | React component testing |
| @faker-js/faker | latest | Deterministic test data generation |
| JUnit 5 | 5.10+ | Java test runner |
| Mockito | 5.x | Java mocking framework |

---

## Code Quality

| Technology | Purpose |
|-----------|---------|
| ESLint | JavaScript/TypeScript linting |
| @typescript-eslint | TypeScript-specific lint rules |
| Prettier | Code formatting |
| TypeScript strict mode | Compile-time type checking |
| Checkstyle (Maven) | Java code style checking |
| SpotBugs (Maven) | Java static analysis |
| Snyk | Dependency vulnerability scanning |

---

## Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker | Container runtime |
| Docker Compose | Multi-container orchestration |
| pnpm | Monorepo package management |
| pnpm workspaces | Workspace-based dependency management |
| GitHub Actions | CI/CD pipeline |

---

## Monitoring and Observability

| Technology | Purpose |
|-----------|---------|
| Prometheus | Metrics collection (via Spring Actuator) |
| Pino | Structured JSON logging (Node.js services) |
| Logback | Structured logging (Java services) |
| Temporal UI | Workflow monitoring dashboard |
| Redis Commander | Redis data visualization |
| Kafka UI | Kafka topic monitoring |
| Kibana | Elasticsearch dashboards |

---

## AI and LLM

| Technology | Purpose |
|-----------|---------|
| Anthropic Claude | Primary LLM for chat interactions |
| OpenAI GPT | Secondary LLM provider |
| Google Gemini | Tertiary LLM provider |

---

## Security

| Technology | Purpose |
|-----------|---------|
| JWT (HS256) | Stateless authentication |
| bcrypt (10 rounds) | Password hashing |
| Helmet | HTTP security headers |
| CORS whitelist | Cross-origin protection |
| AES-256-GCM | Data encryption at rest |
| HMAC-SHA256 | Webhook signature verification |
| crypto.timingSafeEqual | Timing-safe comparison |

---

## Development Tools

| Tool | Purpose |
|------|---------|
| VS Code | Primary IDE |
| ESLint Extension | Real-time linting |
| Prettier Extension | Auto-formatting on save |
| Docker Desktop | Local container management |
| Postman / Insomnia | API testing |
| pgAdmin / DBeaver | Database management |
| Redis Commander | Redis data browser |

---

## Dependency Summary

| Category | Count |
|----------|-------|
| Production npm dependencies | ~40 |
| Development npm dependencies | ~25 |
| Maven dependencies | ~15 |
| Docker images | 10 |
| Total unique technologies | 50+ |

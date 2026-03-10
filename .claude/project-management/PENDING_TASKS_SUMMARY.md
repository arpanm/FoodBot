# Pending Tasks - Complete Summary

**Last Updated:** 2026-02-23
**Total Pending Tasks:** 7 legacy task groups + 22 new batched tasks (60+ subtasks)

---

## Overview

This document tracks all pending work for the FoodBot project, organized into:

1. **Legacy Pending Tasks** - 7 task groups from the original planning (retained for reference)
2. **New Batched Tasks** - 22 new tasks organized into 5 execution batches

**Total Estimated Effort:** ~347 days sequential / ~100 days with 5-task parallelism per batch.

---

## 🔥 Critical Priority (P0) - Legacy Tasks (3 Tasks)

### 1. Gateway API Implementation - BLOCKING MVP

**File:** [gateway-api-implementation-tasks.md](./tasks/pending/gateway-api-implementation-tasks.md)
**Priority:** P0 - Critical
**Estimated Effort:** 3-4 weeks (25.5 days)
**Status:** Not Started
**Blocking:** Entire backend functionality, MVP launch

**Subtasks (17 total):**

**Authentication & Authorization (3 tasks, 4.5 days):**
1. JWT authentication service (1.5 days)
2. Auth guards and decorators (1 day)
3. Role-based access control (2 days)

**Core API Modules (8 tasks, 12 days):**
4. Restaurant module CRUD (1.5 days)
5. Dish module CRUD (1.5 days)
6. Cart module (add, update, remove) (1.5 days)
7. Order module (create, track, update) (2 days)
8. Payment module (process, verify, refund) (2 days)
9. User module (profile, addresses) (1.5 days)
10. Admin module (user mgmt, approval) (1 day)
11. Search module (proxy to orchestrator) (1 day)

**Infrastructure (3 tasks, 4 days):**
12. Database connection & TypeORM setup (1.5 days)
13. Redis integration (cache, sessions) (1.5 days)
14. Exception filters & validation (1 day)

**Testing (3 tasks, 5 days):**
15. Unit tests for all modules (2 days)
16. Integration tests for API endpoints (2 days)
17. E2E tests for critical flows (1 day)

**Why Critical:**
- Gateway API is the entry point for all frontend applications
- Without it, no backend functionality works
- Currently only 15% complete (scaffolding only)
- Estimated 3-4 weeks is optimistic with 1 developer

**Recommended Approach:**
1. Start with authentication module (day 1-3)
2. Implement core modules in parallel (day 4-14)
3. Add infrastructure layer (day 15-18)
4. Write comprehensive tests (day 19-25)

---

### 2. MCP Order Placement Implementation (Legacy)

**File:** [TASK-MCP-002-implement-provider-order-placement.md](./tasks/pending/TASK-MCP-002-implement-provider-order-placement.md)
**Priority:** P0 - Critical
**Estimated Effort:** 8 days
**Status:** Pending
**Dependencies:** TASK-MCP-001 (OAuth implementation) must complete first
**Blocking:** Order fulfillment, end-to-end ordering flow

**Description:**
Implement order placement functionality for external providers (Swiggy, Zomato) through the MCP adapter.

**Key Components:**
1. Order placement API endpoints
2. Provider-specific order format transformation
3. Error handling and retry logic
4. Order status tracking
5. Webhook integration for order updates
6. Testing with mock and real providers

**Requirements:**
- FR-MCP-PROVIDER-001: Multi-Provider Integration
- FR-CA-ORDER-001: Order Placement Workflow

**Why Critical:**
- Core functionality of the platform
- Users cannot complete orders without this
- Depends on OAuth completion (40% done)

---

### 3. Complete MCP Test Coverage (Legacy)

**File:** [TASK-MCP-003-complete-test-coverage.md](./tasks/pending/TASK-MCP-003-complete-test-coverage.md)
**Priority:** P0 - Critical
**Estimated Effort:** 5 days
**Status:** Pending
**Current Coverage:** 60%
**Target Coverage:** 80%

**Test Categories:**

**Unit Tests (2 days):**
- Provider classes (Swiggy, Zomato, Internal)
- Aggregator logic
- Cache manager
- OAuth service
- Result ranking algorithm

**Integration Tests (2 days):**
- End-to-end search flow
- Provider failover scenarios
- Cache hit/miss scenarios
- Error handling paths
- Timeout scenarios

**Performance Tests (1 day):**
- Load testing with 1000 concurrent requests
- Response time validation (< 500ms p95)
- Cache hit rate validation (> 60%)
- Circuit breaker activation testing

**Why Critical:**
- Current 60% coverage below 80% minimum threshold
- MCP layer is core to platform functionality
- Need confidence before production deployment

---

## 🟠 High Priority (P1) - Legacy Tasks (2 Tasks)

### 4. Docker Build Automation

**File:** [TASK-DEPLOY-001-docker-build-automation.md](./tasks/pending/TASK-DEPLOY-001-docker-build-automation.md)
**Priority:** High
**Estimated Effort:** 4 hours
**Status:** Pending

**Objective:**
Create automated Docker build script for all services with multi-stage builds, optimization, and CI integration.

**Requirements:**
- Multi-stage builds for all TypeScript services
- Java/Maven builds for MCP Orchestrator
- Build caching and optimization
- CI/CD integration
- Multi-platform support (amd64, arm64)

**Deliverables:**
- `scripts/docker-build.sh` - Build all images
- `scripts/docker-push.sh` - Push to registry
- Updated Dockerfiles with optimization
- CI/CD workflow updates

---

### 5. Kubernetes Deployment Automation

**File:** [TASK-DEPLOY-002-kubernetes-deployment-automation.md](./tasks/pending/TASK-DEPLOY-002-kubernetes-deployment-automation.md)
**Priority:** High
**Estimated Effort:** 8 hours
**Status:** Pending
**Dependencies:** TASK-DEPLOY-001

**Objective:**
Automate Kubernetes deployment with rolling updates, health checks, and zero-downtime deployments.

**Requirements:**
- Deployment manifests for all services
- ConfigMaps and Secrets management
- Service mesh configuration (Istio)
- HPA (Horizontal Pod Autoscaling)
- Ingress and load balancer setup
- Monitoring and logging integration

**Deliverables:**
- `k8s/` directory with all manifests
- `scripts/k8s-deploy.sh` - Deployment automation
- `scripts/k8s-rollback.sh` - Rollback automation
- CI/CD workflow for production deployment

---

## 🟡 Medium Priority (P2) - Legacy Tasks (2 Task Groups)

### 6. Search Enhancements

**File:** [search-enhancements.md](./tasks/pending/search-enhancements.md)
**Priority:** Medium
**Status:** Pending

**Pending Subtasks (5 total):**

**TASK-SEARCH-100: Personalized Search Ranking (5 days, High)**
- User preference learning
- Collaborative filtering
- A/B testing framework
- Performance monitoring

**TASK-SEARCH-101: Semantic Search with Embeddings (7 days, High)**
- Integrate vector database (Pinecone/Weaviate)
- Generate embeddings for restaurants/dishes
- Semantic similarity search
- Hybrid search (keyword + semantic)

**TASK-SEARCH-102: Voice Search Support (3 days, Medium)**
- Speech-to-text integration
- Natural language query processing
- Voice-optimized results

**TASK-SEARCH-103: Search Analytics Dashboard (4 days, Medium)**
- Query analytics
- Result quality metrics
- User behavior tracking
- Performance monitoring

**TASK-SEARCH-104: Advanced Filters (3 days, Low)**
- Dietary restrictions (gluten-free, nut-free)
- Delivery time windows
- Price range sliders
- Rating thresholds

**Total Effort:** 22 days

---

### 7. Event Streaming Enhancements

**File:** [event-streaming-enhancements.md](./tasks/pending/event-streaming-enhancements.md)
**Priority:** Medium
**Status:** Pending

**Pending Subtasks (5 total):**

**TASK-ES-100: Schema Registry Integration (2 days, Medium)**
- Set up Confluent Schema Registry
- Migrate schemas to Avro/Protobuf
- Versioning and compatibility
- Auto-registration on publish

**TASK-ES-101: Event Replay Mechanism (3 days, Medium)**
- Replay API for debugging
- Time-based replay
- Filter-based replay
- Replay monitoring

**TASK-ES-102: Dead Letter Queue Dashboard (2 days, Low)**
- DLQ monitoring UI
- Error analysis
- Retry mechanism
- Alert integration

**TASK-ES-103: Event Sourcing for Orders (5 days, High)**
- Event-sourced order aggregate
- Event store implementation
- Snapshot mechanism
- Projection rebuilding

**TASK-ES-104: Cross-Region Replication (4 days, Medium)**
- Multi-region Kafka setup
- Replication monitoring
- Failover mechanism
- Consistency guarantees

**Total Effort:** 16 days

---

---

## 🆕 New Batched Tasks (22 Tasks, ~347 Days Total)

---

### Batch 1: Critical/High - Foundation (5 Tasks, ~64 Days)

> **Goal:** Establish core infrastructure, authentication, and production-ready MCP.
> **Start Date:** 2026-02-23
> **Target Completion:** 2026-03-16 (with parallelism)
> **Parallelism:** 5 tasks, dependencies noted below.

| # | ID | Title | Priority | Estimate | Dependencies | Status |
|---|-----|-------|----------|----------|--------------|--------|
| 1 | TASK-DB-001 | Complete Database Schema & Migrations | P0 | 12 days | None | Pending |
| 2 | TASK-OAUTH-002 | Complete OAuth 2.1 & Provider Auth | P0 | 14 days | None | Pending |
| 3 | TASK-MCP-004 | Production MCP Order Placement | P0 | 18 days | TASK-OAUTH-002 | Pending |
| 4 | TASK-MCP-005 | Complete MCP Test Coverage | P0 | 10 days | None | Pending |
| 5 | TASK-DEPLOY-003 | Production Docker & K8s Deployment | P1 | 10 days | TASK-DB-001 | Pending |

**TASK-DB-001: Complete Database Schema & Migrations (P0, 12 days)**
- PostgreSQL schema design for all entities (users, restaurants, dishes, orders, payments, addresses)
- Migration scripts with up/down support
- Elasticsearch index mappings for search
- Kafka topic provisioning and configuration
- Seed data scripts for development and testing
- TypeORM entity definitions synchronized with migrations

**TASK-OAUTH-002: Complete OAuth 2.1 & Provider Auth (P0, 14 days)**
- Full OAuth 2.1 authorization code flow with PKCE
- Token exchange implementation for Swiggy and Zomato
- AES-256-GCM encrypted token storage
- Automatic token refresh with exponential backoff retry
- Multi-tenant provider authentication support
- Comprehensive OAuth testing with mock providers

**TASK-MCP-004: Production MCP Order Placement (P0, 18 days)**
- Order creation API through MCP adapter
- Provider-specific order format transformations (Swiggy JSON, Zomato JSON)
- Circuit breaker and retry logic for provider calls
- Order status tracking via polling and webhooks
- Real-time order update notifications
- Error handling with user-friendly messages
- Integration testing with mock and sandbox providers

**TASK-MCP-005: Complete MCP Test Coverage (P0, 10 days)**
- Unit tests for all 3 provider classes (Swiggy, Zomato, Internal)
- Integration tests for end-to-end search and order flows
- Performance tests: 1000 concurrent requests, <500ms p95
- Circuit breaker activation and recovery testing
- Cache hit/miss scenario coverage
- Target: 80% minimum coverage across all MCP packages

**TASK-DEPLOY-003: Production Docker & K8s Deployment (P1, 10 days)**
- Multi-stage Docker builds for all TypeScript and Java services
- Kubernetes deployment manifests with resource limits
- Helm charts for environment-specific configuration
- Horizontal Pod Autoscaling (HPA) configuration
- Health check endpoints, readiness/liveness probes
- Rolling update strategy with zero downtime
- CI/CD integration for automated deployment

---

### Batch 2: High - Data & Search (5 Tasks, ~95 Days)

> **Goal:** Enhance data layer with vector/graph databases, improve search, add planning features.
> **Start Date:** 2026-03-16 (after Batch 1 core)
> **Target Completion:** 2026-04-13 (with parallelism)
> **Parallelism:** TASK-VECTOR-001 and TASK-GRAPH-001 in parallel; others follow.

| # | ID | Title | Priority | Estimate | Dependencies | Status |
|---|-----|-------|----------|----------|--------------|--------|
| 6 | TASK-VECTOR-001 | Vector DB & Semantic Caching | P1 | 14 days | TASK-DB-001 | Pending |
| 7 | TASK-GRAPH-001 | Neo4j User Preference Graph | P1 | 14 days | TASK-DB-001 | Pending |
| 8 | TASK-SEARCH-002 | Production Search Enhancements | P1 | 22 days | TASK-VECTOR-001 | Pending |
| 9 | TASK-PLANNER-001 | Party Planner Feature | P2 | 20 days | TASK-SEARCH-002 | Pending |
| 10 | TASK-PLANNER-002 | Diet Planner Feature | P2 | 25 days | TASK-GRAPH-001 | Pending |

**TASK-VECTOR-001: Vector DB & Semantic Caching (P1, 14 days)**
- Pinecone or Weaviate instance provisioning and configuration
- Embedding generation pipeline for restaurant and dish data
- Semantic similarity search API
- Hybrid search combining keyword (Elasticsearch) + semantic (Vector DB)
- Semantic caching layer for frequently queried results
- Embedding update pipeline for new/modified data

**TASK-GRAPH-001: Neo4j User Preference Graph (P1, 14 days)**
- Neo4j database setup and schema design
- User preference graph modeling (user -> cuisine, restaurant, dish relationships)
- Collaborative filtering via graph traversal algorithms
- Recommendation engine powered by graph queries
- Real-time preference updates on order completion
- Graph analytics for trend detection

**TASK-SEARCH-002: Production Search Enhancements (P1, 22 days)**
- Personalized search ranking using user preference data
- Semantic search integration with vector embeddings
- Voice search support via speech-to-text
- Search analytics dashboard (query patterns, click-through rates)
- Advanced filters: dietary restrictions, delivery windows, price ranges, ratings
- A/B testing framework for search ranking algorithms

**TASK-PLANNER-001: Party Planner Feature (P2, 20 days)**
- Group ordering support with shared carts
- Menu curation for events (cuisine themes, dietary mix)
- Budget splitting and per-person cost management
- Guest preference aggregation and conflict resolution
- Timeline-based delivery scheduling for events
- Event template library

**TASK-PLANNER-002: Diet Planner Feature (P2, 25 days)**
- Nutritional tracking and calorie analysis per dish
- Weekly/monthly meal plan generation
- Dietary restriction management (allergies, preferences, medical)
- Macro and micronutrient tracking
- Health goal integration (weight loss, muscle gain, maintenance)
- Smart meal suggestions based on remaining daily targets

---

### Batch 3: Medium - Features (5 Tasks, ~95 Days)

> **Goal:** Expand feature set with bulk ordering, analytics, mobile, and real providers.
> **Start Date:** 2026-04-13 (after Batch 2 core)
> **Target Completion:** 2026-05-11 (with parallelism)
> **Parallelism:** Most tasks can run in parallel.

| # | ID | Title | Priority | Estimate | Dependencies | Status |
|---|-----|-------|----------|----------|--------------|--------|
| 11 | TASK-PLANNER-003 | Bulk Ordering System | P2 | 14 days | TASK-MCP-004 | Pending |
| 12 | TASK-RA-001 | Restaurant Analytics Platform | P2 | 20 days | TASK-DB-001 | Pending |
| 13 | TASK-ES-001 | Event Streaming Enhancements | P2 | 18 days | TASK-DB-001 | Pending |
| 14 | TASK-MOBILE-001 | Capacitor Native Mobile Apps | P1 | 18 days | TASK-DEPLOY-003 | Pending |
| 15 | TASK-PROVIDER-001 | Real Provider Integration | P2 | 25 days | TASK-OAUTH-002, TASK-MCP-004 | Pending |

**TASK-PLANNER-003: Bulk Ordering System (P2, 14 days)**
- Bulk order creation API and management UI
- Corporate ordering support with approval workflows
- Volume discount calculation and pricing tiers
- Multi-delivery coordination for large orders
- Order splitting across multiple providers for capacity
- Invoice generation for corporate accounts

**TASK-RA-001: Restaurant Analytics Platform (P2, 20 days)**
- Restaurant performance dashboard (orders, revenue, ratings)
- Order analytics with time-series trends
- Revenue and cost analysis with breakdown by dish/category
- Customer feedback aggregation and sentiment analysis
- Competitive benchmarking against area restaurants
- Export and reporting capabilities

**TASK-ES-001: Event Streaming Enhancements (P2, 18 days)**
- Confluent Schema Registry integration
- Event replay mechanism for debugging and recovery
- Dead Letter Queue monitoring dashboard
- Event sourcing implementation for order aggregates
- Cross-region Kafka replication setup
- Event versioning and backward compatibility

**TASK-MOBILE-001: Capacitor Native Mobile Apps (P1, 18 days)**
- iOS native project initialization and configuration
- Android native project initialization and configuration
- Push notification integration (FCM/APNS)
- Native camera and location API access
- App Store and Play Store build pipeline
- Deep linking and universal links

**TASK-PROVIDER-001: Real Provider Integration (P2, 25 days)**
- Real Swiggy API integration (menu, search, order)
- Real Zomato API integration (menu, search, order)
- Provider health monitoring and status dashboard
- Automatic failover and fallback handling
- Provider onboarding automation and configuration
- Rate limiting and quota management per provider

---

### Batch 4: Platform (5 Tasks, ~76 Days)

> **Goal:** Build platform capabilities, workflow engine, automation, notifications.
> **Start Date:** 2026-05-11 (after Batch 3 core)
> **Target Completion:** 2026-06-01 (with parallelism)
> **Parallelism:** TASK-CICD-001 and TASK-NOTIF-001 can start early.

| # | ID | Title | Priority | Estimate | Dependencies | Status |
|---|-----|-------|----------|----------|--------------|--------|
| 16 | TASK-WF-001 | Multi-Mode Workflow Engine | P1 | 22 days | TASK-DB-001 | Pending |
| 17 | TASK-BROWSER-001 | Browser Automation Engine | P2 | 18 days | TASK-MCP-004 | Pending |
| 18 | TASK-ML-001 | ML Provider Routing | P3 | 14 days | TASK-GRAPH-001 | Pending |
| 19 | TASK-CICD-001 | Complete CI/CD Pipeline | P1 | 10 days | TASK-DEPLOY-003 | Pending |
| 20 | TASK-NOTIF-001 | Notification Service | P1 | 12 days | TASK-DB-001 | Pending |

**TASK-WF-001: Multi-Mode Workflow Engine (P1, 22 days)**
- Preference learning workflow (track and adapt to user behavior)
- Analytics aggregation workflow (periodic data rollups)
- Recommendation generation workflow (batch + real-time)
- Multi-step workflow orchestration with Temporal
- Workflow monitoring dashboard with retry visibility
- Workflow versioning and backward compatibility

**TASK-BROWSER-001: Browser Automation Engine (P2, 18 days)**
- Headless browser automation using Playwright
- Provider page scraping for menu and pricing data
- Order placement via browser automation (fallback path)
- Anti-detection measures and rate limiting
- Session management, cookie handling, and CAPTCHA support
- Proxy rotation and IP management

**TASK-ML-001: ML Provider Routing (P3, 14 days)**
- ML model for intelligent provider selection
- Feature engineering: latency, quality score, cost, availability
- A/B testing framework for routing strategies
- Model training pipeline with historical order data
- Real-time scoring and routing decisions
- Model performance monitoring and drift detection

**TASK-CICD-001: Complete CI/CD Pipeline (P1, 10 days)**
- GitHub Actions workflows for lint, test, build on all services
- Automated testing gates on pull requests
- Staging environment deployment pipeline
- Production deployment with manual approval gate
- Rollback automation with one-click recovery
- Secret management integration (GitHub Secrets / Vault)

**TASK-NOTIF-001: Notification Service (P1, 12 days)**
- Email notification provider configuration (SendGrid/SES)
- SMS provider integration (Twilio)
- Push notification service (FCM/APNS)
- In-app notification system with read/unread tracking
- Notification preferences and opt-out management
- Template engine for notification content

---

### Batch 5: Quality (2 Tasks, ~26 Days)

> **Goal:** Resolve technical debt and harden security posture.
> **Start Date:** 2026-06-01 (after Batch 4)
> **Target Completion:** 2026-06-15 (with parallelism)
> **Parallelism:** Both tasks can run in parallel.

| # | ID | Title | Priority | Estimate | Dependencies | Status |
|---|-----|-------|----------|----------|--------------|--------|
| 21 | TASK-TD-001 | Technical Debt Resolution | P2 | 12 days | All Batch 1-4 | Pending |
| 22 | TASK-SEC-001 | Security Audit & Hardening | P1 | 14 days | All Batch 1-4 | Pending |

**TASK-TD-001: Technical Debt Resolution (P2, 12 days)**
- Cart workflow complexity refactoring (extract state machine)
- OAuth service extraction (separate from MCP adapter)
- Code duplication cleanup across packages
- Dependency updates (audit and upgrade all packages)
- Documentation debt resolution (API docs, architecture docs)
- Performance optimization pass (profiling and bottleneck removal)

**TASK-SEC-001: Security Audit & Hardening (P1, 14 days)**
- OWASP Top 10 compliance audit across all services
- Penetration testing (internal and external attack surfaces)
- Secret scanning and credential rotation
- Input validation hardening (all API endpoints)
- Rate limiting and DDoS protection configuration
- Security monitoring, alerting, and incident response plan
- Dependency vulnerability scanning (Snyk/Dependabot)

---

## 📊 Combined Pending Tasks Summary

### By Priority:

```
Critical (P0):    7 tasks  (~72 days total)
  - 3 legacy + 4 new (TASK-DB-001, TASK-OAUTH-002, TASK-MCP-004, TASK-MCP-005)
High (P1):       11 tasks (~166 days total)
  - 2 legacy + 9 new
Medium (P2):     10 tasks (~193 days total)
  - 2 legacy + 8 new
Low (P3):         1 task  (~14 days total)
  - 1 new (TASK-ML-001)
────────────────────────────────────────────
Total:           29 task groups (7 legacy + 22 new)
Total Effort:    ~347 days new + ~80 days legacy = ~427 days sequential
Parallel Estimate: ~100 days new + ~30 days legacy = ~130 days
```

### By Batch:

| Batch | Tasks | Sequential Effort | Parallel Estimate | Priority Mix |
|-------|-------|-------------------|-------------------|--------------|
| Batch 1 (Foundation) | 5 | 64 days | ~14 days | 4x P0, 1x P1 |
| Batch 2 (Data/Search) | 5 | 95 days | ~25 days | 2x P1, 1x P1, 2x P2 |
| Batch 3 (Features) | 5 | 95 days | ~25 days | 1x P1, 4x P2 |
| Batch 4 (Platform) | 5 | 76 days | ~22 days | 3x P1, 1x P2, 1x P3 |
| Batch 5 (Quality) | 2 | 26 days | ~14 days | 1x P1, 1x P2 |
| **Total** | **22** | **~347 days** | **~100 days** | - |

### By Component:

| Component | Task IDs | Effort | Priority |
|-----------|----------|--------|----------|
| Database | TASK-DB-001 | 12 days | P0 |
| OAuth/Auth | TASK-OAUTH-002 | 14 days | P0 |
| MCP Layer | TASK-MCP-004, TASK-MCP-005 | 28 days | P0 |
| Deployment | TASK-DEPLOY-003 | 10 days | P1 |
| Vector DB | TASK-VECTOR-001 | 14 days | P1 |
| Graph DB | TASK-GRAPH-001 | 14 days | P1 |
| Search | TASK-SEARCH-002 | 22 days | P1 |
| Planners | TASK-PLANNER-001, 002, 003 | 59 days | P2 |
| Analytics | TASK-RA-001 | 20 days | P2 |
| Events | TASK-ES-001 | 18 days | P2 |
| Mobile | TASK-MOBILE-001 | 18 days | P1 |
| Providers | TASK-PROVIDER-001 | 25 days | P2 |
| Workflows | TASK-WF-001 | 22 days | P1 |
| Browser | TASK-BROWSER-001 | 18 days | P2 |
| ML | TASK-ML-001 | 14 days | P3 |
| CI/CD | TASK-CICD-001 | 10 days | P1 |
| Notifications | TASK-NOTIF-001 | 12 days | P1 |
| Tech Debt | TASK-TD-001 | 12 days | P2 |
| Security | TASK-SEC-001 | 14 days | P1 |

---

## 🚀 Execution Plan

### Phase 1: Batch 1 - Foundation (Weeks 1-3)

```
Week 1:
  TASK-DB-001 ─────── Schema design, PostgreSQL migrations
  TASK-OAUTH-002 ──── Token exchange flow
  TASK-MCP-005 ────── Unit test coverage
  Gateway API ─────── Continue legacy pending work

Week 2:
  TASK-DB-001 ─────── ES mappings, Kafka topics
  TASK-OAUTH-002 ──── Encrypted storage, refresh
  TASK-MCP-004 ────── Order placement API (OAUTH-002 unblocked)
  TASK-DEPLOY-003 ── Docker builds

Week 3:
  TASK-MCP-004 ────── Provider transforms, testing
  TASK-MCP-005 ────── Integration & perf tests
  TASK-DEPLOY-003 ── K8s manifests, Helm charts
  Integration testing across Batch 1
```

### Phase 2: Batch 2 - Data & Search (Weeks 4-7)

```
Week 4-5:
  TASK-VECTOR-001 ── Vector DB setup, embeddings
  TASK-GRAPH-001 ─── Neo4j setup, preference graph
  (Run in parallel)

Week 5-7:
  TASK-SEARCH-002 ── Search enhancements (after VECTOR-001)
  TASK-PLANNER-002 ─ Diet planner (after GRAPH-001)

Week 7:
  TASK-PLANNER-001 ─ Party planner (after SEARCH-002)
```

### Phase 3: Batch 3 - Features (Weeks 8-11)

```
Week 8-9:
  TASK-PLANNER-003 ─ Bulk ordering
  TASK-RA-001 ────── Restaurant analytics
  TASK-ES-001 ────── Event streaming
  TASK-MOBILE-001 ── Mobile apps
  (All in parallel)

Week 10-11:
  TASK-PROVIDER-001 ─ Real provider integration
  Continue mobile and analytics work
```

### Phase 4: Batch 4 - Platform (Weeks 12-15)

```
Week 12-13:
  TASK-WF-001 ────── Workflow engine
  TASK-CICD-001 ──── CI/CD pipeline
  TASK-NOTIF-001 ─── Notification service
  (In parallel)

Week 14-15:
  TASK-BROWSER-001 ─ Browser automation
  TASK-ML-001 ────── ML provider routing
```

### Phase 5: Batch 5 - Quality (Weeks 16-17)

```
Week 16-17:
  TASK-TD-001 ────── Technical debt resolution
  TASK-SEC-001 ───── Security audit & hardening
  (In parallel)
```

---

## 📋 Task Dependencies Graph

```
                    ┌─ TASK-MCP-004 ──────────────────┐
TASK-OAUTH-002 ────┤                                   ├─ TASK-PROVIDER-001
                    └──────────────────────────────────┘
                                                        ├─ TASK-PLANNER-003
                                                        └─ TASK-BROWSER-001

                    ┌─ TASK-DEPLOY-003 ── TASK-CICD-001
                    │                  └── TASK-MOBILE-001
TASK-DB-001 ───────┤
                    ├─ TASK-VECTOR-001 ── TASK-SEARCH-002 ── TASK-PLANNER-001
                    ├─ TASK-GRAPH-001 ─── TASK-PLANNER-002
                    │                 └── TASK-ML-001
                    ├─ TASK-WF-001
                    ├─ TASK-NOTIF-001
                    ├─ TASK-RA-001
                    └─ TASK-ES-001

TASK-MCP-005 ────── (no downstream dependencies)

All Batch 1-4 ───── TASK-TD-001
                └── TASK-SEC-001
```

---

## ⚠️ Risks & Mitigation

### Risk 1: Batch 1 Delays Cascade to All Batches

**Risk:** Foundation tasks (DB, OAuth) are on the critical path for 15+ downstream tasks.
**Mitigation:**
- Start TASK-DB-001 and TASK-OAUTH-002 immediately (no dependencies)
- Assign dedicated resources to critical path tasks
- Use mock services to unblock dependent tasks early
- Weekly progress reviews with escalation path

### Risk 2: Scope Creep in Planner Features

**Risk:** Party/Diet/Bulk planner features (59 days combined) could expand significantly.
**Mitigation:**
- Define strict MVP scope for each planner
- Use feature flags to ship incrementally
- Push advanced features to future batches

### Risk 3: Real Provider API Availability

**Risk:** Swiggy/Zomato may not provide stable APIs for TASK-PROVIDER-001.
**Mitigation:**
- Browser automation (TASK-BROWSER-001) as fallback
- Mock providers for development and testing
- Internal provider as guaranteed fallback

### Risk 4: Test Coverage Target (80%)

**Risk:** Achieving 80% coverage across all new code within estimates.
**Mitigation:**
- Write tests alongside feature code (TDD where possible)
- Batch 5 includes dedicated tech debt time for coverage gaps
- Automated coverage reporting on every PR

---

## 📌 Next Actions

### Immediate (This Week - Feb 23-Mar 1):
- [ ] Begin TASK-DB-001: Database schema design
- [ ] Begin TASK-OAUTH-002: Token exchange implementation
- [ ] Begin TASK-MCP-005: Unit test coverage expansion
- [ ] Continue Gateway API implementation (legacy)
- [ ] Continue TASK-MCP-001 (OAuth - in progress at 40%)

### Short-term (Next 2 Weeks - Mar 1-15):
- [ ] Complete TASK-DB-001 migrations
- [ ] Complete TASK-OAUTH-002 (enabling TASK-MCP-004)
- [ ] Begin TASK-MCP-004: Production order placement
- [ ] Begin TASK-DEPLOY-003: Docker & K8s setup
- [ ] Complete TASK-MCP-005: Full test coverage

### Medium-term (Next 4 Weeks - Mar 15 - Apr 13):
- [ ] Complete all Batch 1 tasks
- [ ] Begin Batch 2: Vector DB, Neo4j, Search enhancements
- [ ] MVP candidate ready for internal testing

### Long-term (Post-MVP - Apr 13+):
- [ ] Batch 3: Feature expansion (Planners, Analytics, Mobile, Providers)
- [ ] Batch 4: Platform capabilities (Workflows, Browser, ML, CI/CD, Notifications)
- [ ] Batch 5: Quality pass (Tech Debt, Security Audit)

---

**For detailed task descriptions, see individual task files in [tasks/pending/](./tasks/pending/)**
**For batch task tracking, see [tasks/index.md](./tasks/index.md)**

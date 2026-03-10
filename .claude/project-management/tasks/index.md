# Tasks - Master Task List

**Last Updated:** 2026-02-23
**Status:** Active

---

## 📋 Quick Links

| Category | Count | Status |
|----------|-------|--------|
| **Completed** | 8 | ✅ Done |
| **In Progress** | 1 | 🚧 Active |
| **Pending (Existing)** | 7 | 🟡 Ready to start |
| **New Tasks (Batched)** | 22 | 🆕 Planned |
| **Backlog** | 2 | 📦 Future |
| **Technical Debt** | 2 | ⚠️ Needs attention |
| **Technical Tasks** | 2 | 📝 Test specifications |
| **Bug Fixes** | 1 | 🐛 Needs fixing |
| **Total** | **45** | - |

---

## 📊 Task Summary

### Overall Progress

```
Total Tasks: 45
├── Completed: 8 (18%)
├── In Progress: 1 (2%)
├── Pending (Existing): 7 (16%)
├── New Batched Tasks: 22 (49%)
├── Backlog: 2 (4%)
├── Technical Debt: 2 (4%)
├── Technical Tasks: 2 (4%)
└── Bug Fixes: 1 (2%)
```

### By Priority

| Priority | Count | Percentage |
|----------|-------|------------|
| **Critical (P0)** | 7 | 16% |
| **High (P1)** | 17 | 38% |
| **Medium (P2)** | 15 | 33% |
| **Low (P3)** | 6 | 13% |

---

## 🔥 Critical Path & Blockers

### 🚨 Critical Blocker (In Progress)

| ID | Title | Status | Priority | Blocking |
|----|-------|--------|----------|----------|
| [TASK-MCP-001](./in-progress/TASK-MCP-001-complete-oauth-implementation.md) | Complete OAuth Implementation | 🚧 40% | P0 Critical | Real MCP provider integration |

**Impact:** Blocking Swiggy/Zomato real provider integration
**Estimate:** 1-2 weeks
**Dependencies:** None
**Next Steps:** Token exchange flow, encrypted storage, refresh mechanism

---

### ⚠️ Critical Pending (Not Started)

| ID | Title | Priority | Estimate | Blocking |
|----|-------|----------|----------|----------|
| [gateway-api-implementation-tasks.md](./pending/gateway-api-implementation-tasks.md) | Gateway API Implementation | P0 Critical | 3-4 weeks | Entire backend MVP |
| [database-migrations.md](./pending/database-migrations.md) | Database Schema Migrations | P0 Critical | 1 week | Data persistence |
| [TASK-MCP-002](./pending/TASK-MCP-002-implement-provider-order-placement.md) | Provider Order Placement | P0 Critical | 2 weeks | Order fulfillment |
| TASK-DB-001 | Complete Database Schema & Migrations | P0 Critical | 12 days | Data persistence |
| TASK-OAUTH-002 | Complete OAuth 2.1 & Provider Auth | P0 Critical | 14 days | Provider integration |
| TASK-MCP-004 | Production MCP Order Placement | P0 Critical | 18 days | Order fulfillment |
| TASK-MCP-005 | Complete MCP Test Coverage | P0 Critical | 10 days | Production readiness |

**Impact:** Backend non-functional, cannot launch MVP
**Immediate Action Required:** Start Batch 1 (Foundation) tasks

---

## 📂 Tasks by Status

### ✅ Completed Tasks (8)

| ID | Title | Completed | Impact |
|----|-------|-----------|--------|
| TASK-001 | MCP Adapter Implementation | 2026-02-15 | High - Core MCP functionality |
| TASK-SEARCH-001 | Search Orchestrator Implementation | 2026-02-18 | High - Multi-source search |
| TASK-EVENTS-001 | Events Package Implementation | 2026-02-17 | High - Kafka event schemas |
| TASK-WORKFLOWS-001 | Workflows Package Implementation | 2026-02-16 | High - Temporal workflows |
| TASK-FRONTEND-001 | Customer App Implementation | 2026-02-19 | High - User interface |
| TASK-FRONTEND-002 | Restaurant App Implementation | 2026-02-19 | High - Owner dashboard |
| TASK-CHROME-001 | Chrome Extension Implementation | 2026-02-14 | Medium - Browser automation |
| OPS-001 | Monitoring Stack Setup | 2026-02-18 | Medium - Observability |

**Total Completed:** 8 major tasks

---

### 🚧 In Progress Tasks (1)

| ID | Title | Progress | Priority | Owner | Est. Completion |
|----|-------|----------|----------|-------|----------------|
| [TASK-MCP-001](./in-progress/TASK-MCP-001-complete-oauth-implementation.md) | Complete OAuth 2.1 Implementation | 40% | P0 | - | 1-2 weeks |

**Current Work:**
- ✅ OAuth flow design complete
- ✅ Provider configuration complete
- 🚧 Token exchange implementation (in progress)
- ⏸️ Encrypted token storage (blocked)
- ⏸️ Token refresh mechanism (blocked)
- ⏸️ OAuth testing (blocked)

---

### 🟡 Pending Tasks (7) - Legacy

High-priority tasks ready to start (from previous planning):

| ID | Title | Priority | Estimate | Dependencies |
|----|-------|----------|----------|--------------|
| [gateway-api-implementation-tasks.md](./pending/gateway-api-implementation-tasks.md) | **Gateway API Implementation** | P0 Critical | 3-4 weeks | None |
| [database-migrations.md](./pending/database-migrations.md) | **Database Schema Migrations** | P0 Critical | 1 week | None |
| [TASK-MCP-002](./pending/TASK-MCP-002-implement-provider-order-placement.md) | Provider Order Placement | P0 Critical | 2 weeks | TASK-MCP-001 |
| [TASK-MCP-003](./pending/TASK-MCP-003-complete-test-coverage.md) | Complete MCP Test Coverage | P1 High | 1 week | None |
| [TASK-DEPLOY-001](./pending/TASK-DEPLOY-001-docker-build-automation.md) | Docker Build Automation | P1 High | 3 days | None |
| [TASK-DEPLOY-002](./pending/TASK-DEPLOY-002-kubernetes-deployment.md) | Kubernetes Deployment | P1 High | 1 week | TASK-DEPLOY-001 |
| [TASK-SEARCH-002](./pending/TASK-SEARCH-002-search-enhancements.md) | Search Enhancements | P2 Medium | 1 week | None |

**Recommended Start Order:**
1. Gateway API (blocking everything)
2. Database Migrations (blocking data persistence)
3. Complete OAuth (blocking MCP providers)
4. Provider Order Placement (blocking order fulfillment)

---

## 🆕 New Batched Tasks (22 Tasks, ~347 Days Total Effort)

> **Execution Model:** 5 tasks running in parallel per batch.
> **Total Estimated Effort:** ~347 days (significantly reduced with parallelism).

---

### Batch 1: Critical/High - Foundation (5 Tasks, ~64 Days)

> **Focus:** Core infrastructure, authentication, MCP production readiness.
> **Parallelism:** All 5 tasks can begin in parallel where dependencies allow.

| # | ID | Title | Priority | Estimate | Dependencies |
|---|-----|-------|----------|----------|--------------|
| 1 | TASK-DB-001 | Complete Database Schema & Migrations | P0 Critical | 12 days | None |
| 2 | TASK-OAUTH-002 | Complete OAuth 2.1 & Provider Auth | P0 Critical | 14 days | None |
| 3 | TASK-MCP-004 | Production MCP Order Placement | P0 Critical | 18 days | TASK-OAUTH-002 |
| 4 | TASK-MCP-005 | Complete MCP Test Coverage | P0 Critical | 10 days | None |
| 5 | TASK-DEPLOY-003 | Production Docker & K8s Deployment | P1 High | 10 days | TASK-DB-001 |

**Batch 1 Details:**

- **TASK-DB-001** - Complete Database Schema & Migrations (P0, 12 days)
  - PostgreSQL schema design & migrations for all entities
  - Elasticsearch index mappings
  - Kafka topic provisioning
  - Seed data and migration scripts
  - Blocks: TASK-DEPLOY-003, all data persistence

- **TASK-OAUTH-002** - Complete OAuth 2.1 & Provider Auth (P0, 14 days)
  - Full OAuth 2.1 token exchange flow
  - Encrypted token storage (AES-256-GCM)
  - Token refresh mechanism with retry
  - Provider-specific auth (Swiggy, Zomato)
  - Multi-tenant auth support
  - Blocks: TASK-MCP-004

- **TASK-MCP-004** - Production MCP Order Placement (P0, 18 days)
  - Order placement API via MCP adapter
  - Provider-specific order format transformations
  - Error handling, retry, and circuit breaker
  - Order status tracking and webhook integration
  - Real provider integration testing
  - Depends on: TASK-OAUTH-002

- **TASK-MCP-005** - Complete MCP Test Coverage (P0, 10 days)
  - Unit tests for all provider classes
  - Integration tests for end-to-end flows
  - Performance tests (1000 concurrent, <500ms p95)
  - Coverage target: 80% minimum
  - Circuit breaker and failover testing

- **TASK-DEPLOY-003** - Production Docker & K8s Deployment (P1, 10 days)
  - Multi-stage Docker builds for all services
  - Kubernetes manifests with HPA
  - Helm charts for environment management
  - CI/CD pipeline for production deployment
  - Health checks, readiness probes, rolling updates
  - Depends on: TASK-DB-001

---

### Batch 2: High - Data & Search (5 Tasks, ~95 Days)

> **Focus:** Data layer enhancements, semantic capabilities, planning features.
> **Parallelism:** TASK-VECTOR-001 and TASK-GRAPH-001 can run in parallel.

| # | ID | Title | Priority | Estimate | Dependencies |
|---|-----|-------|----------|----------|--------------|
| 6 | TASK-VECTOR-001 | Vector DB & Semantic Caching | P1 High | 14 days | TASK-DB-001 |
| 7 | TASK-GRAPH-001 | Neo4j User Preference Graph | P1 High | 14 days | TASK-DB-001 |
| 8 | TASK-SEARCH-002 | Production Search Enhancements | P1 High | 22 days | TASK-VECTOR-001 |
| 9 | TASK-PLANNER-001 | Party Planner Feature | P2 Medium | 20 days | TASK-SEARCH-002 |
| 10 | TASK-PLANNER-002 | Diet Planner Feature | P2 Medium | 25 days | TASK-GRAPH-001 |

**Batch 2 Details:**

- **TASK-VECTOR-001** - Vector DB & Semantic Caching (P1, 14 days)
  - Pinecone/Weaviate integration
  - Embedding generation for restaurants and dishes
  - Semantic similarity search
  - Hybrid search (keyword + semantic)
  - Semantic caching layer for query results
  - Depends on: TASK-DB-001

- **TASK-GRAPH-001** - Neo4j User Preference Graph (P1, 14 days)
  - Neo4j schema design and setup
  - User preference graph modeling
  - Collaborative filtering via graph traversal
  - Recommendation engine integration
  - Real-time preference updates
  - Depends on: TASK-DB-001

- **TASK-SEARCH-002** - Production Search Enhancements (P1, 22 days)
  - Personalized search ranking (user preference learning)
  - Semantic search with embeddings
  - Voice search support (speech-to-text)
  - Search analytics dashboard
  - Advanced filters (dietary, delivery time, price, rating)
  - Depends on: TASK-VECTOR-001

- **TASK-PLANNER-001** - Party Planner Feature (P2, 20 days)
  - Group ordering support
  - Menu curation for events
  - Budget splitting and management
  - Guest preference aggregation
  - Timeline and delivery scheduling
  - Depends on: TASK-SEARCH-002

- **TASK-PLANNER-002** - Diet Planner Feature (P2, 25 days)
  - Nutritional tracking and analysis
  - Meal plan generation (weekly/monthly)
  - Dietary restriction management
  - Calorie and macro tracking
  - Health goal integration
  - Depends on: TASK-GRAPH-001

---

### Batch 3: Medium - Features (5 Tasks, ~95 Days)

> **Focus:** Feature expansion, analytics, mobile, and provider integration.
> **Parallelism:** Most tasks can run in parallel.

| # | ID | Title | Priority | Estimate | Dependencies |
|---|-----|-------|----------|----------|--------------|
| 11 | TASK-PLANNER-003 | Bulk Ordering System | P2 Medium | 14 days | TASK-MCP-004 |
| 12 | TASK-RA-001 | Restaurant Analytics Platform | P2 Medium | 20 days | TASK-DB-001 |
| 13 | TASK-ES-001 | Event Streaming Enhancements | P2 Medium | 18 days | TASK-DB-001 |
| 14 | TASK-MOBILE-001 | Capacitor Native Mobile Apps | P1 High | 18 days | TASK-DEPLOY-003 |
| 15 | TASK-PROVIDER-001 | Real Provider Integration | P2 Medium | 25 days | TASK-OAUTH-002, TASK-MCP-004 |

**Batch 3 Details:**

- **TASK-PLANNER-003** - Bulk Ordering System (P2, 14 days)
  - Bulk order creation and management
  - Corporate ordering support
  - Volume discounts and pricing tiers
  - Delivery coordination for large orders
  - Order splitting across providers
  - Depends on: TASK-MCP-004

- **TASK-RA-001** - Restaurant Analytics Platform (P2, 20 days)
  - Restaurant performance dashboard
  - Order analytics and trends
  - Revenue and cost analysis
  - Customer feedback aggregation
  - Competitive benchmarking
  - Depends on: TASK-DB-001

- **TASK-ES-001** - Event Streaming Enhancements (P2, 18 days)
  - Schema Registry integration (Confluent)
  - Event replay mechanism
  - Dead Letter Queue dashboard
  - Event sourcing for orders
  - Cross-region replication
  - Depends on: TASK-DB-001

- **TASK-MOBILE-001** - Capacitor Native Mobile Apps (P1, 18 days)
  - iOS native initialization and configuration
  - Android native initialization and configuration
  - Push notification integration
  - Native camera/location access
  - App Store/Play Store build pipeline
  - Depends on: TASK-DEPLOY-003

- **TASK-PROVIDER-001** - Real Provider Integration (P2, 25 days)
  - Real Swiggy API integration
  - Real Zomato API integration
  - Provider health monitoring
  - Failover and fallback handling
  - Provider onboarding automation
  - Depends on: TASK-OAUTH-002, TASK-MCP-004

---

### Batch 4: Platform (5 Tasks, ~76 Days)

> **Focus:** Platform capabilities, workflow engine, automation, CI/CD.
> **Parallelism:** TASK-CICD-001 and TASK-NOTIF-001 can start early.

| # | ID | Title | Priority | Estimate | Dependencies |
|---|-----|-------|----------|----------|--------------|
| 16 | TASK-WF-001 | Multi-Mode Workflow Engine | P1 High | 22 days | TASK-DB-001 |
| 17 | TASK-BROWSER-001 | Browser Automation Engine | P2 Medium | 18 days | TASK-MCP-004 |
| 18 | TASK-ML-001 | ML Provider Routing | P3 Low | 14 days | TASK-GRAPH-001 |
| 19 | TASK-CICD-001 | Complete CI/CD Pipeline | P1 High | 10 days | TASK-DEPLOY-003 |
| 20 | TASK-NOTIF-001 | Notification Service | P1 High | 12 days | TASK-DB-001 |

**Batch 4 Details:**

- **TASK-WF-001** - Multi-Mode Workflow Engine (P1, 22 days)
  - Preference learning workflow
  - Analytics workflow
  - Recommendation workflow
  - Multi-step workflow orchestration
  - Workflow monitoring and retry logic
  - Depends on: TASK-DB-001

- **TASK-BROWSER-001** - Browser Automation Engine (P2, 18 days)
  - Headless browser automation (Playwright)
  - Provider page scraping and interaction
  - Order placement via browser automation
  - Anti-detection and rate limiting
  - Session management and cookies
  - Depends on: TASK-MCP-004

- **TASK-ML-001** - ML Provider Routing (P3, 14 days)
  - ML model for provider selection
  - Feature engineering (latency, quality, cost)
  - A/B testing framework for routing
  - Model training pipeline
  - Real-time scoring and routing
  - Depends on: TASK-GRAPH-001

- **TASK-CICD-001** - Complete CI/CD Pipeline (P1, 10 days)
  - GitHub Actions workflows for all services
  - Automated testing on PR
  - Staging and production deployment pipelines
  - Rollback automation
  - Secret management integration
  - Depends on: TASK-DEPLOY-003

- **TASK-NOTIF-001** - Notification Service (P1, 12 days)
  - Email notification provider configuration
  - SMS provider integration
  - Push notification service
  - In-app notification system
  - Notification preferences and opt-out
  - Depends on: TASK-DB-001

---

### Batch 5: Quality (2 Tasks, ~26 Days)

> **Focus:** Technical debt resolution and security hardening.
> **Parallelism:** Both tasks can run in parallel.

| # | ID | Title | Priority | Estimate | Dependencies |
|---|-----|-------|----------|----------|--------------|
| 21 | TASK-TD-001 | Technical Debt Resolution | P2 Medium | 12 days | All Batch 1-4 |
| 22 | TASK-SEC-001 | Security Audit & Hardening | P1 High | 14 days | All Batch 1-4 |

**Batch 5 Details:**

- **TASK-TD-001** - Technical Debt Resolution (P2, 12 days)
  - Cart workflow complexity refactoring
  - OAuth service extraction
  - Code duplication cleanup
  - Dependency updates
  - Documentation debt resolution
  - Performance optimization pass
  - Depends on: All Batch 1-4 tasks

- **TASK-SEC-001** - Security Audit & Hardening (P1, 14 days)
  - OWASP Top 10 compliance audit
  - Penetration testing
  - Secret scanning and rotation
  - Input validation hardening
  - Rate limiting and DDoS protection
  - Security monitoring and alerting
  - Depends on: All Batch 1-4 tasks

---

### Batch Execution Timeline

```
Batch 1 (Foundation)  ████████████████████  ~14 days (parallel)  ← CURRENT
Batch 2 (Data/Search) ████████████████████████████  ~25 days (parallel)
Batch 3 (Features)    ████████████████████████████  ~25 days (parallel)
Batch 4 (Platform)    ████████████████████████  ~22 days (parallel)
Batch 5 (Quality)     ██████████████  ~14 days (parallel)
                      ─────────────────────────────────────────────
                      Total: ~100 days with 5-task parallelism
                      (347 days sequential effort)
```

---

### 📦 Backlog Tasks (2)

Future enhancements:

| ID | Title | Priority | Estimate |
|----|-------|----------|----------|
| [TASK-MCP-REAL-001](./backlog/TASK-MCP-REAL-001-real-swiggy-integration.md) | Real Swiggy API Integration | P2 | 2-3 weeks |
| [TASK-LLM-001](./backlog/TASK-LLM-001-ml-provider-routing.md) | ML-Based Provider Routing | P3 | 2 weeks |

---

### ⚠️ Technical Debt (2)

| ID | Title | Priority | Estimate | Impact |
|----|-------|----------|----------|--------|
| [TD-001](./technical-debt/TD-001-cart-workflow-complexity.md) | Cart Workflow Complexity | P2 | 1 week | Code maintainability |
| [TD-002](./technical-debt/TD-002-oauth-service-extraction.md) | OAuth Service Extraction | P2 | 3 days | Code organization |

---

### 📝 Technical Tasks (2)

Test specification documents:

| ID | Title | Priority |
|----|-------|----------|
| [search-orchestrator-test-cases.md](./technical-tasks/search-orchestrator-test-cases.md) | Search Orchestrator Test Cases | P1 |
| [event-streaming-test-cases.md](./technical-tasks/event-streaming-test-cases.md) | Event Streaming Test Cases | P1 |

---

### 🐛 Bug Fixes (1)

| ID | Title | Priority | Severity |
|----|-------|----------|----------|
| [BUG-001](./bug-fixes/BUG-001-oauth-token-refresh.md) | OAuth Token Refresh Failure | P1 | Medium |

---

## 🎯 Sprint Planning

### Current Sprint: Batch 1 - Foundation

**Sprint Goal:** Complete critical foundation tasks (DB, OAuth, MCP, Deployment)

**Duration:** 3 weeks
**Start:** 2026-02-23
**End:** 2026-03-16

#### Sprint Backlog:

**Week 1 (Feb 23 - Mar 1):**
- [ ] TASK-DB-001: Database schema design and initial migrations
- [ ] TASK-OAUTH-002: Token exchange flow implementation
- [ ] TASK-MCP-005: Unit test coverage for MCP providers
- [ ] Continue Gateway API implementation (legacy pending)

**Week 2 (Mar 2-8):**
- [ ] TASK-DB-001: Elasticsearch mappings and Kafka topics
- [ ] TASK-OAUTH-002: Encrypted storage and refresh mechanism
- [ ] TASK-MCP-004: Order placement API (after OAUTH-002)
- [ ] TASK-DEPLOY-003: Docker multi-stage builds

**Week 3 (Mar 9-16):**
- [ ] TASK-MCP-004: Provider-specific transformations and testing
- [ ] TASK-MCP-005: Integration and performance tests
- [ ] TASK-DEPLOY-003: Kubernetes manifests and Helm charts
- [ ] Integration testing across all Batch 1 deliverables

---

## 🚀 Next Sprint: Batch 2 - Data & Search

**Sprint Goal:** Data layer enhancements and semantic search capabilities

**Duration:** 4 weeks
**Start:** 2026-03-16
**End:** 2026-04-13

**Tasks:**
- [ ] TASK-VECTOR-001: Vector DB & Semantic Caching (14 days)
- [ ] TASK-GRAPH-001: Neo4j User Preference Graph (14 days)
- [ ] TASK-SEARCH-002: Production Search Enhancements (22 days)
- [ ] TASK-PLANNER-001: Party Planner Feature (20 days)
- [ ] TASK-PLANNER-002: Diet Planner Feature (25 days)

---

## 📊 Task Metrics

### Velocity:

```
Completed Last Week: 0 tasks
Completed Last Month: 8 tasks
Average Completion Rate: 2 tasks/week
New Tasks Added: 22 (batched)
Total Remaining Effort: ~347 days (sequential) / ~100 days (parallel)
```

### By Component:

| Component | Tasks | Completed | In Progress | Pending/New |
|-----------|-------|-----------|-------------|-------------|
| MCP Layer | 11 | 1 (9%) | 1 (9%) | 9 (82%) |
| Gateway API | 3 | 0 (0%) | 0 (0%) | 3 (100%) |
| Database | 2 | 0 (0%) | 0 (0%) | 2 (100%) |
| Frontend/Mobile | 4 | 2 (50%) | 0 (0%) | 2 (50%) |
| Infrastructure | 6 | 1 (17%) | 0 (0%) | 5 (83%) |
| Workflows | 3 | 1 (33%) | 0 (0%) | 2 (67%) |
| Search | 4 | 1 (25%) | 0 (0%) | 3 (75%) |
| Data (Vector/Graph) | 2 | 0 (0%) | 0 (0%) | 2 (100%) |
| Events | 2 | 1 (50%) | 0 (0%) | 1 (50%) |
| Planners | 3 | 0 (0%) | 0 (0%) | 3 (100%) |
| Analytics | 1 | 0 (0%) | 0 (0%) | 1 (100%) |
| Security/Quality | 2 | 0 (0%) | 0 (0%) | 2 (100%) |
| Chrome Ext | 1 | 1 (100%) | 0 (0%) | 0 (0%) |
| Browser Auto | 1 | 0 (0%) | 0 (0%) | 1 (100%) |

---

## 🔍 Task Breakdown: Gateway API Implementation

The Gateway API is the **#1 critical blocker** with 17 subtasks:

**File:** [gateway-api-implementation-tasks.md](./pending/gateway-api-implementation-tasks.md)

### Subtasks (17 total):

**Authentication & Authorization (3 tasks):**
1. [ ] JWT authentication service
2. [ ] Auth guards and decorators
3. [ ] Role-based access control

**Core API Modules (8 tasks):**
4. [ ] Restaurant module (CRUD)
5. [ ] Dish module (CRUD)
6. [ ] Cart module (add, update, remove)
7. [ ] Order module (create, track, update)
8. [ ] Payment module (process, verify, refund)
9. [ ] User module (profile, addresses)
10. [ ] Admin module (user management, approval)
11. [ ] Search module (proxy to orchestrator)

**Infrastructure (3 tasks):**
12. [ ] Database connection and TypeORM setup
13. [ ] Redis integration (cache, sessions)
14. [ ] Exception filters and validation

**Testing (3 tasks):**
15. [ ] Unit tests for all modules
16. [ ] Integration tests for API endpoints
17. [ ] E2E tests for critical flows

**Estimate:** 25.5 days (3-4 weeks with 1 developer)

---

## 📝 Task Creation Guide

### Creating a New Task:

1. **Choose the correct folder:**
   - `completed/` - Finished tasks
   - `in-progress/` - Currently working on
   - `pending/` - Ready to start, high priority
   - `backlog/` - Future tasks, lower priority
   - `technical-debt/` - Refactoring, cleanup
   - `technical-tasks/` - Test specifications, documentation
   - `bug-fixes/` - Bug reports and fixes

2. **Use the task template:** See [templates/task-template.md](../templates/task-template.md)

3. **Assign a unique ID:**
   - Format: `TASK-{COMPONENT}-{NUMBER}`
   - Examples: `TASK-MCP-001`, `TASK-DEPLOY-002`, `TD-001`, `BUG-001`

4. **Link to requirements:**
   - Use `FR-XXX-YYY-ZZZ` format
   - Link to requirement files: `[FR-CA-ORDER-001](../requirements/customer-agent/FR-CA-ORDER-001-order-placement.md)`

5. **Set priority and estimate:**
   - Priority: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
   - Estimate: Days or weeks

6. **Add to this index:** Update task counts and status tables

### Priority Guidelines:

- **Critical (P0)**: Blocks MVP, must complete immediately
- **High (P1)**: Important for launch, complete soon
- **Medium (P2)**: Valuable but not urgent
- **Low (P3)**: Nice to have, low priority

### Status Guidelines:

- **Pending**: Not started, waiting to be picked up
- **In Progress**: Actively being worked on (max 1-2 per person)
- **Completed**: Finished, tested, and verified
- **Blocked**: Cannot proceed due to dependencies

---

## 🔗 Related Documentation

- [Requirements Documentation](../requirements/index.md)
- [Architecture Documentation](../architecture/index.md)
- [Implementation Status](../architecture/implementation-status.md)
- [Archive](../archive/README.md)

---

## 📋 Task Naming Convention

Format: `TASK-{COMPONENT}-{NUMBER}-{slug}.md`

**Components:**
- MCP = MCP Layer
- DB = Database
- OAUTH = Authentication/OAuth
- DEPLOY = Deployment
- SEARCH = Search
- VECTOR = Vector Database
- GRAPH = Graph Database (Neo4j)
- PLANNER = Planner Features (Party, Diet, Bulk)
- RA = Restaurant Analytics
- ES = Event Streaming
- WF = Workflow Engine
- BROWSER = Browser Automation
- ML = Machine Learning
- CICD = CI/CD Pipeline
- NOTIF = Notification Service
- MOBILE = Mobile Apps
- PROVIDER = Provider Integration
- SEC = Security
- TD = Technical Debt
- EVENTS = Event Streaming (legacy)
- WORKFLOWS = Temporal Workflows (legacy)
- FRONTEND = Frontend Apps
- CHROME = Chrome Extension
- LLM = LLM Orchestration
- OPS = Operations/DevOps
- BUG = Bug Fix

**Example:** `TASK-MCP-001-complete-oauth-implementation.md`

---

## ✅ Task Status Legend

- ✅ **Completed**: Task finished, tested, verified
- 🚧 **In Progress**: Actively being worked on
- 🟡 **Pending**: Ready to start, not yet begun
- 📦 **Backlog**: Future task, lower priority
- ⚠️ **Technical Debt**: Refactoring/cleanup needed
- 🐛 **Bug**: Issue that needs fixing
- ⏸️ **Blocked**: Cannot proceed due to dependencies
- 📝 **Technical Task**: Specification or documentation task

---

**For questions or updates, refer to the [main README](../../README.md) or [project README](../README.md).**

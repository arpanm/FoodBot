# Architecture - Navigation Hub

**Last Updated:** 2026-02-20
**Status:** Active
**Overall Completion:** 69% (18/26 components implemented)

---

## 📋 Quick Links

| Document | Description | Status |
|----------|-------------|--------|
| [System Architecture](./system-architecture.md) | High-level system design and layers | ✅ Complete |
| [Component Architecture](./component-architecture.md) | Component breakdown and interactions | ✅ Complete |
| [Implementation Status](./implementation-status.md) | Current implementation progress (69%) | ✅ Updated 2026-02-20 |

---

## 🏗️ Architecture Overview

### System Layers

FoodBot follows a **4-tier architecture**:

```
┌─────────────────────────────────────────┐
│         CLIENT LAYER                    │
│  - Customer App (React Native) 85%     │
│  - Restaurant App (React Native) 85%   │
│  - Chrome Extension 100%               │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         API GATEWAY LAYER               │
│  - NestJS Gateway API 15%              │
│  - Authentication/Authorization         │
│  - Rate Limiting                        │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         SERVICE LAYER                   │
│  - LLM Router Service (planned)        │
│  - MCP Adapter Service 60%             │
│  - Workflow Service (Temporal) 65%     │
│  - Search Orchestrator 85%             │
│  - Notification Service 75%            │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         DATA LAYER                      │
│  - PostgreSQL (Primary DB)              │
│  - Redis (Cache)                        │
│  - Elasticsearch (Search)               │
│  - Kafka (Event Streaming)              │
└─────────────────────────────────────────┘
```

---

## 🔑 Key Components

### 1. Client Layer (85% Complete)

**Customer App (React Native)**
- [📄 Component Details](./components/customer-app.md)
- Chat interface for conversational ordering
- Restaurant search and menu browsing
- Cart management and checkout
- Order tracking
- **Status:** 85% - Code complete, native initialization pending

**Restaurant App (React Native)**
- [📄 Component Details](./components/restaurant-app.md)
- Order management dashboard
- Menu management
- Analytics and reporting
- **Status:** 85% - Code complete, native initialization pending

**Chrome Extension**
- [📄 Component Details](./components/chrome-extension.md)
- Browser automation for Swiggy/Zomato
- Platform abstraction layer (Strategy Pattern)
- DOM parsing and action simulation
- **Status:** ✅ 100% Complete - Zomato & Swiggy support production-ready

---

### 2. API Gateway Layer (15% Complete - 🔴 CRITICAL BLOCKER)

**Gateway API (NestJS)**
- [📄 Component Details](./components/gateway-api.md)
- Unified API entry point
- JWT authentication
- Request validation and transformation
- Rate limiting
- **Status:** ⚠️ 15% - Only scaffolding exists, requires immediate implementation

---

### 3. Service Layer (Mixed Completion)

**LLM Router Service**
- [📄 Component Details](./components/llm-router.md)
- Multi-provider support (Claude, OpenAI, Gemini)
- Provider selection and load balancing
- Streaming support
- **Status:** 📝 Planned - Not yet implemented

**MCP Adapter Service**
- [📄 Component Details](./components/mcp-adapter.md)
- Integration with Swiggy MCP, Zomato MCP
- OAuth 2.1 account linking
- Result aggregation
- Circuit breaker pattern
- **Status:** 🚧 60% - Core functionality complete, OAuth and order placement pending

**Workflow Service (Temporal)**
- [📄 Component Details](./components/temporal-workflows.md)
- Order processing workflows
- Payment processing
- Notification workflows
- **Status:** 🚧 65% - 6/9 workflows complete

**Search Orchestrator**
- [📄 Component Details](./components/search-orchestrator.md)
- Multi-source search (Elasticsearch, MCP, Database)
- Result ranking and aggregation
- **Status:** 🚧 85% - Core complete, advanced features pending

**Notification Service**
- [📄 Component Details](./components/notification-service.md)
- Multi-channel notifications (email, SMS, push)
- Kafka-driven event processing
- **Status:** 🚧 75% - Core channels implemented

---

### 4. Data Layer (90% Complete)

**PostgreSQL**
- [📄 Schema Details](./data/postgres-schema.md)
- Primary database for transactional data
- User accounts, orders, restaurants, menus
- **Status:** ⚠️ 90% - Running but 70% of schema migrations missing

**Redis**
- Caching layer for frequently accessed data
- Session storage
- Rate limiting counters
- **Status:** ✅ 100% Complete

**Elasticsearch**
- [📄 Architecture Details](./data/elasticsearch-search.md)
- Full-text search for restaurants and dishes
- Indexing and filtering
- **Status:** ✅ 100% Complete

**Kafka**
- [📄 Architecture Details](./integration/kafka-event-streaming.md)
- Event streaming for real-time updates
- Order events, notification events
- **Status:** ✅ 100% Complete - 13 topics, 5 consumer groups

---

## 📂 Architecture Documentation

### Components (7 files)
- [Gateway API](./components/gateway-api.md)
- [LLM Router](./components/llm-router.md)
- [MCP Adapter](./components/mcp-adapter.md)
- [Notification Service](./components/notification-service.md)
- [Search Orchestrator](./components/search-orchestrator.md)
- [Customer App (React Native)](./components/customer-app.md)
- [Temporal Workflows](./components/temporal-workflows.md)

### Data Layer (2 files)
- [PostgreSQL Schema](./data/postgres-schema.md)
- [Elasticsearch Search](./data/elasticsearch-search.md)

**⚠️ Missing:** Neo4j Graph DB, Vector Database documentation

### Integration (7 files)
- [Kafka Event Streaming (Consolidated)](./integration/kafka-event-streaming.md) ⭐ Current
- [MCP Architecture (Consolidated)](./integration/mcp-architecture-consolidated.md) ⭐ Current
- [Temporal Workflows (Consolidated)](./integration/temporal-workflows-architecture-consolidated.md) ⭐ Current
- [Kafka Architecture (Legacy)](./integration/kafka-architecture.md) 📦 Superseded
- [MCP Architecture (Legacy)](./integration/mcp-architecture.md) 📦 Superseded
- [OAuth Flow](./integration/oauth-flow.md)
- [Event Streaming Requirements](./integration/event-streaming-requirements.md)

### Deployment (6 files)
- [Deployment Architecture](./deployment/deployment-architecture.md)
- [Docker Infrastructure](./deployment/docker-infrastructure.md)
- [AWS Deployment](./deployment/aws-deployment.md)
- [Kubernetes Deployment](./deployment/kubernetes-deployment.md)
- [Disaster Recovery](./deployment/disaster-recovery.md)
- [Deployment Verification](./deployment/deployment-verification.md)

### Security (0 files)
**⚠️ Missing:** Security architecture documentation (planned)

---

## 📐 Architecture Decision Records (ADRs)

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | Database Choice: PostgreSQL | ✅ Accepted | 2026-01-15 |
| ADR-002 | MCP as Primary Integration | ✅ Accepted | 2026-02-19 |
| ADR-003 | React Native for Mobile Apps | ✅ Accepted | 2026-02-19 |
| ADR-004 | Hybrid LLM Architecture | ✅ Accepted | 2026-02-19 |
| ADR-005 | Strategy Pattern for Chrome Extension | ✅ Accepted | 2026-02-19 |
| ADR-006 | Temporal for Workflow Orchestration | ✅ Accepted | 2026-01-20 |
| ADR-007 | TypeScript MCP Adapter over Spring Boot | ✅ Accepted | 2026-02-20 |

---

## 🔗 Integration Points

### External Integrations

| Service | Type | Purpose | Status |
|---------|------|---------|--------|
| Swiggy MCP | Mock (OAuth pending) | Restaurant search, ordering | 🚧 40% - Mock complete, OAuth blocked |
| Zomato MCP | Mock (OAuth pending) | Restaurant search, ordering | 🚧 40% - Mock complete, OAuth blocked |
| Claude API | LLM | Natural language processing | ✅ 100% Complete |
| OpenAI API | LLM | Natural language processing | 📝 Planned |
| Gemini API | LLM | Natural language processing | 📝 Planned |
| ONDC | Open protocol | Alternative integration | 📝 Planned |

---

## 🔐 Security Architecture Highlights

- **Authentication**: JWT with RS256 algorithm (15-minute access, 7-day refresh)
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: AES-256-GCM for sensitive data at rest, TLS 1.3 for data in transit
- **OAuth**: OAuth 2.1 for platform account linking (implementation pending)
- **Rate Limiting**: Redis-based rate limiting (100 req/min per user)
- **OWASP Top 10**: Full compliance with OWASP security standards

**⚠️ Missing:** Detailed security architecture documentation

---

## 🚀 Deployment Architecture Highlights

- **Cloud Provider**: AWS (primary), GCP (backup)
- **Container Orchestration**: Kubernetes (EKS)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Deployment Strategy**: Blue-Green deployments with zero downtime

[📄 Full Deployment Architecture](./deployment/deployment-architecture.md)

---

## 📊 Technology Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS (TypeScript)
- **MCP Service**: TypeScript (decision changed from Spring Boot)
- **Workflow**: Temporal

### Frontend
- **Mobile**: React Native (TypeScript)
- **Chrome Extension**: Vanilla TypeScript
- **State Management**: Redux Toolkit (customer) / Zustand (restaurant)

### Databases
- **Primary**: PostgreSQL 16
- **Cache**: Redis 7
- **Search**: Elasticsearch 8
- **Streaming**: Kafka 3.x
- **Planned**: Neo4j (graph), Vector DB (semantic search)

### DevOps
- **Containers**: Docker + Docker Compose
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana, ELK

---

## 📊 Implementation Status Summary

**Last Updated:** 2026-02-20

### By Component:

| Component | Status | Completion | Priority |
|-----------|--------|------------|----------|
| Chrome Extension | ✅ Production Ready | 100% | P3 |
| Mobile Apps | 🚧 Code Complete | 85% | P2 |
| Search Orchestrator | 🚧 Mostly Complete | 85% | P1 |
| Kafka Events | ✅ Production Ready | 100% | P1 |
| Temporal Workflows | 🚧 In Progress | 65% | P1 |
| MCP Adapter | 🚧 In Progress | 60% | P0 |
| Gateway API | ⚠️ Critical Blocker | 15% | P0 |

### Critical Blockers (P0):

1. **Gateway API** - 85% incomplete, estimated 3-4 weeks
2. **Database Migrations** - 70% incomplete, estimated 1 week
3. **Mobile Native Init** - 100% incomplete, estimated 1 week
4. **OAuth Integration** - Blocking MCP real provider integration

**Full Status Report:** [implementation-status.md](./implementation-status.md)

---

## 🔗 Related Documentation

- [Requirements Documentation](../requirements/index.md)
- [Task Tracking](../tasks/index.md)
- [Archive](../archive/README.md)

---

## 📝 How to Use This Hub

1. **Finding Architecture Info**: Use the Quick Links table or search by component name
2. **Adding New Components**: Document in components/ subfolder
3. **Recording Decisions**: Create ADRs in this index
4. **Cross-Referencing**: Link to components using `[Component Name](./components/component-name.md)`

---

## ✅ Document Status Legend

- 📝 **Planned**: Document not yet created
- 🚧 **In Progress**: Document being written/updated
- ✅ **Complete**: Document finalized and reviewed
- 🔄 **Under Review**: Awaiting stakeholder approval
- 📦 **Archived**: Moved to archive, superseded by newer version

---

**For questions or updates, refer to the [main README](../../README.md) or [project README](../README.md).**

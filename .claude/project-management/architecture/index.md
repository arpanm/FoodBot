# Architecture - Navigation Hub

**Last Updated:** 2026-02-19
**Status:** Active

---

## 📋 Quick Links

| Document | Description | Status |
|----------|-------------|--------|
| [System Architecture](./system-architecture.md) | High-level system design | 🚧 In Progress |
| [Component Architecture](./component-architecture.md) | Component breakdown and interactions | 📝 Planned |
| [Data Architecture](./data-architecture.md) | Data flow and storage design | 📝 Planned |
| [Integration Architecture](./integration-architecture.md) | External integrations (MCP, APIs) | 📝 Planned |
| [Security Architecture](./security-architecture.md) | Security design and controls | 📝 Planned |
| [Deployment Architecture](./deployment-architecture.md) | Infrastructure and deployment | 📝 Planned |
| [Technology Stack](./technology-stack.md) | Tech stack decisions | 📝 Planned |
| [Architecture Decisions](./architecture-decisions.md) | ADRs (Architecture Decision Records) | 📝 Planned |
| [Changelog](./changelog.md) | Architecture change history | 📝 Planned |

---

## 🏗️ Architecture Overview

### System Layers

FoodBot follows a **4-tier architecture**:

```
┌─────────────────────────────────────────┐
│         CLIENT LAYER                    │
│  - Customer App (React Native)          │
│  - Restaurant App (React Native)        │
│  - Chrome Extension                     │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         API GATEWAY LAYER               │
│  - NestJS Gateway API                   │
│  - Authentication/Authorization         │
│  - Rate Limiting                        │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         SERVICE LAYER                   │
│  - LLM Router Service                   │
│  - MCP Adapter Service                  │
│  - Workflow Service (Temporal)          │
│  - Search Orchestrator                  │
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

### 1. Client Layer

**Customer App (React Native)**
- [📄 Component Details](./component-architecture.md#customer-app)
- Chat interface for conversational ordering
- Restaurant search and menu browsing
- Cart management and checkout
- Order tracking
- **Status:** 📝 Planned

**Restaurant App (React Native)**
- [📄 Component Details](./component-architecture.md#restaurant-app)
- Order management dashboard
- Menu management
- Analytics and reporting
- **Status:** 📝 Planned

**Chrome Extension**
- [📄 Component Details](./component-architecture.md#chrome-extension)
- Browser automation for Swiggy/Zomato
- Platform abstraction layer (Strategy Pattern)
- DOM parsing and action simulation
- **Status:** 🚧 In Progress

---

### 2. API Gateway Layer

**Gateway API (NestJS)**
- [📄 Component Details](./component-architecture.md#gateway-api)
- Unified API entry point
- JWT authentication
- Request validation and transformation
- Rate limiting
- **Status:** ✅ Complete

---

### 3. Service Layer

**LLM Router Service**
- [📄 Component Details](./component-architecture.md#llm-router)
- Multi-provider support (Claude, OpenAI, Gemini)
- Provider selection and load balancing
- Streaming support
- **Status:** 📝 Planned

**MCP Adapter Service**
- [📄 Component Details](./component-architecture.md#mcp-adapter)
- Integration with Swiggy MCP, Zomato MCP
- OAuth 2.1 account linking
- Result aggregation
- Circuit breaker pattern
- **Status:** 🚧 In Progress

**Workflow Service (Temporal)**
- [📄 Component Details](./component-architecture.md#workflow-service)
- Order processing workflows
- Payment processing
- Notification workflows
- **Status:** ✅ Complete

**Search Orchestrator**
- [📄 Component Details](./component-architecture.md#search-orchestrator)
- Multi-source search (Elasticsearch, MCP, Database)
- Result ranking and aggregation
- **Status:** ✅ Complete

---

### 4. Data Layer

**PostgreSQL**
- Primary database for transactional data
- User accounts, orders, restaurants, menus
- **Status:** ✅ Complete

**Redis**
- Caching layer for frequently accessed data
- Session storage
- Rate limiting counters
- **Status:** ✅ Complete

**Elasticsearch**
- Full-text search for restaurants and dishes
- Indexing and filtering
- **Status:** ✅ Complete

**Kafka**
- Event streaming for real-time updates
- Order events, notification events
- **Status:** 🚧 In Progress

---

## 📐 Architecture Decision Records (ADRs)

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./architecture-decisions.md#adr-001) | Database Choice: PostgreSQL | ✅ Accepted | 2026-01-15 |
| [ADR-002](./architecture-decisions.md#adr-002) | MCP as Primary Integration | ✅ Accepted | 2026-02-19 |
| [ADR-003](./architecture-decisions.md#adr-003) | React Native for Mobile Apps | ✅ Accepted | 2026-02-19 |
| [ADR-004](./architecture-decisions.md#adr-004) | Hybrid LLM Architecture | ✅ Accepted | 2026-02-19 |
| [ADR-005](./architecture-decisions.md#adr-005) | Strategy Pattern for Chrome Extension | ✅ Accepted | 2026-02-19 |
| [ADR-006](./architecture-decisions.md#adr-006) | Temporal for Workflow Orchestration | ✅ Accepted | 2026-01-20 |

---

## 🔗 Integration Points

### External Integrations

| Service | Type | Purpose | Status |
|---------|------|---------|--------|
| Swiggy MCP | Official MCP | Restaurant search, ordering | 🚧 In Progress |
| Zomato MCP | Open-source MCP | Restaurant search, ordering | 🚧 In Progress |
| Claude API | LLM | Natural language processing | ✅ Complete |
| OpenAI API | LLM | Natural language processing | 📝 Planned |
| Gemini API | LLM | Natural language processing | 📝 Planned |
| ONDC | Open protocol | Alternative integration | 📝 Planned |

---

## 🔐 Security Architecture Highlights

- **Authentication**: JWT with RS256 algorithm (15-minute access, 7-day refresh)
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: AES-256-GCM for sensitive data at rest, TLS 1.3 for data in transit
- **OAuth**: OAuth 2.1 for platform account linking
- **Rate Limiting**: Redis-based rate limiting (100 req/min per user)
- **OWASP Top 10**: Full compliance with OWASP security standards

[📄 Full Security Architecture](./security-architecture.md)

---

## 🚀 Deployment Architecture Highlights

- **Cloud Provider**: AWS (primary), GCP (backup)
- **Container Orchestration**: Kubernetes (EKS)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Deployment Strategy**: Blue-Green deployments with zero downtime

[📄 Full Deployment Architecture](./deployment-architecture.md)

---

## 📊 Technology Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS (TypeScript)
- **MCP Service**: Spring Boot (Java 17)
- **Workflow**: Temporal

### Frontend
- **Mobile**: React Native (TypeScript)
- **Chrome Extension**: Vanilla TypeScript
- **State Management**: Redux Toolkit

### Databases
- **Primary**: PostgreSQL 16
- **Cache**: Redis 7
- **Search**: Elasticsearch 8
- **Streaming**: Kafka 3.x

### DevOps
- **Containers**: Docker + Docker Compose
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana, ELK

[📄 Full Technology Stack](./technology-stack.md)

---

## 🔗 Related Documentation

- [Requirements Documentation](../requirements/index.md)
- [Task Tracking](../tasks/index.md)
- [Progress Dashboard](../progress/index.md)

---

## 📝 How to Use This Hub

1. **Finding Architecture Info**: Use the Quick Links table or search by component name
2. **Adding New Components**: Document in component-architecture.md
3. **Recording Decisions**: Create ADRs in architecture-decisions.md
4. **Cross-Referencing**: Link to components using [Component Name](./component-architecture.md#anchor)

---

## ✅ Document Status Legend

- 📝 **Planned**: Document not yet created
- 🚧 **In Progress**: Document being written/updated
- ✅ **Complete**: Document finalized and reviewed
- 🔄 **Under Review**: Awaiting stakeholder approval
- 📦 **Archived**: Moved to archive, superseded by newer version

---

**For questions or updates, refer to the [main README](../../../README.md) or contact the project team.**

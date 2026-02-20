# FoodBot Component Architecture

This directory contains detailed documentation for each major component of the FoodBot platform.

## Component Overview

| Component | Status | Documentation |
|-----------|--------|---------------|
| [Customer Agent](./customer-agent.md) | ⚠️ Partial (30%) | Mobile-first customer interface |
| [Restaurant Agent](./restaurant-agent.md) | ⚠️ Partial (25%) | Restaurant owner dashboard |
| [Gateway API](./gateway-api.md) | ⚠️ Partial (15%) | Central API gateway (NestJS) |
| [LLM Service](./llm-service.md) | ⚠️ Partial (40%) | Multi-LLM routing and orchestration |
| [Workflow Service](./workflow-service.md) | ⚠️ Partial (35%) | Temporal workflow definitions |
| [MCP Orchestrator](./mcp-orchestrator.md) | ❌ Not Started (0%) | Multi-provider aggregation (TypeScript adapter exists at 60%) |
| [Notification Service](./notification-service.md) | ✅ Implemented (80%) | Multi-channel notifications |
| [Search Orchestrator](./search-orchestrator.md) | ✅ Implemented (70%) | Unified search service |

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│  - Customer Agent (React/Capacitor)                             │
│  - Restaurant Agent (React/Capacitor)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────┴────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  - Gateway API (NestJS)                                         │
│    - Authentication, Authorization                              │
│    - Rate Limiting, Validation                                  │
│    - Request Routing                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
┌──────────▼───────┐ ┌──▼──────────┐ ┌▼────────────────┐
│  LLM Service     │ │  Workflow   │ │ MCP Orchestrator│
│                  │ │  Service    │ │                 │
│ - Intent Extract │ │ - Temporal  │ │ - Provider Mgmt │
│ - Context Enrich │ │ - Sagas     │ │ - Search        │
│ - Workflow Gen   │ │ - Activities│ │ - Aggregation   │
└──────────┬───────┘ └──┬──────────┘ └┬────────────────┘
           │             │             │
           └─────────────┼─────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                         DATA LAYER                               │
│  - PostgreSQL (primary)                                         │
│  - Redis (cache)                                                │
│  - Elasticsearch (search)                                       │
│  - Kafka (events)                                               │
│  - Neo4j (preferences) [planned]                                │
│  - Vector DB (semantic) [planned]                               │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interactions

### Request Flow (Synchronous)
```
Customer App → Gateway API → Backend Services → Data Layer
```

### Event Flow (Asynchronous)
```
Gateway API → Kafka → Notification/Indexing Services
```

### Workflow Flow (Orchestrated)
```
Gateway API → Temporal Client → Workflows → Activities → External APIs
```

## Key Patterns

1. **API Gateway Pattern** - Single entry point (Gateway API)
2. **Saga Pattern** - Distributed transactions (Temporal workflows)
3. **Event Sourcing** - Kafka event log
4. **CQRS** - Separate read (Elasticsearch) and write (PostgreSQL) models
5. **Circuit Breaker** - Resilience patterns in MCP layer

## Documentation Index

- **[System Architecture](../system-architecture.md)** - High-level system overview
- **[Data Architecture](../data/README.md)** - Database schemas and data flow
- **[Integration Patterns](../integration/README.md)** - API and event integration
- **[Implementation Status](../implementation-status.md)** - Current state of implementation
- **[Security Architecture](../security/README.md)** - Authentication, authorization, encryption

## Navigation

- [← Back to Architecture Index](../index.md)
- [Implementation Status →](../implementation-status.md)

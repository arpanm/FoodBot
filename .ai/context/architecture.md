System Architecture — Agentic Restaurant Commerce Platform

1. Architectural Principle

This system follows LLM-Planned, Deterministically Executed Architecture.

LLMs decide WHAT to do.
Temporal + Services decide HOW it is done safely.

LLMs must never directly call infrastructure or mutate state.

---

2. Layered Architecture
```
UI (Capacitor + React)
    ↓
Agent Gateway (NestJS)
    ↓
Context Enrichment Layer (Redis + Graph)
    ↓
LLM Planning Layer (Claude/OpenAI/Gemini via Router)
    ↓
Workflow Definition (JSON)
    ↓
Temporal Execution Layer
    ↓
MCP Aggregation Layer (Spring Boot)
    ↓
Search + Index (Elasticsearch + Kafka)
    ↓
Restaurant Service APIs
```
---

3. Responsibilities by Layer
```
Layer| Responsibility
Frontend| Conversational UI + structured actions
Gateway| Async job management
LLM Layer| Intent + workflow planning
Temporal| Reliable execution
MCP Layer| Normalize providers (Mock/Swiggy/Zomato)
Search Layer| Discoverability & filtering
Restaurant Services| Domain ownership
```
---

4. State Ownership Rules
```
Data| Owner
Orders| Restaurant Service
Search Index| Elasticsearch
Preferences| GraphDB
Session State| Redis
Workflow State| Temporal
```
LLMs must not become state holders.

---

5. Failure Handling Philosophy

All execution must be:

- Retryable
- Idempotent
- Observable
- Compensatable

Temporal enforces these properties.

---

6. LLM Usage Philosophy

LLMs are:
✔ Planners
✔ Interpreters
✔ Validators

LLMs are NOT:
✘ Executors
✘ Databases
✘ Source of truth

---

7. Integration Strategy

External MCP providers must always be wrapped via:

Provider Adapter → MCP Contract → Temporal Activity

Never integrate providers directly into agents.

---

8. Scalability Model

System must scale independently across:

- LLM reasoning load
- Workflow execution load
- Search/index load
- Restaurant operations

No shared bottlenecks allowed.

## 9. Mandatory Contracts

LLM Output Schema: packages/workflow-schema
Temporal Entry: services/orchestration
MCP Interface: services/mcp-adapter/contracts
Search Write Path: Kafka Only (No Direct ES Writes)

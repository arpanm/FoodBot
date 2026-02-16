## 🍽️ Agentic Food Platform (FoodBot)

An AI-Orchestrated, Spec-Driven Restaurant Commerce Platform that combines conversational UX, multi-LLM reasoning, and deterministic workflow execution using Temporal.
```
«This is not a chatbot.
It is a goal-driven commerce agent that plans, validates, and executes workflows safely across multiple providers (Mock, Swiggy MCP, Zomato MCP).»
```
---

### 🚀 What This Project Does

Transforms a natural request like:
```
«“Order dinner for 5 veg and 2 non-veg friends tonight”»
```
into a validated execution workflow:
```
Intent → Planned Workflow → Temporal Execution → MCP Providers → Order Complete
```
---

### 🧠 Core Principles
```
Principle| Meaning
LLM-Planned| AI decides WHAT should happen
Deterministic Execution| Services decide HOW it happens
Workflow-First| No direct action without validated workflow
Provider-Agnostic| Swiggy/Zomato/Mock via MCP
Spec-Driven Development| Repo is governed by machine-readable specs
Self-Healing SDLC| Agents generate → test → fix → validate
```
---

### 🏗️ Architecture Overview
```
Capacitor + React Apps (Customer / Restaurant Owner)
            ↓
NestJS Agent Gateway (Async Job API)
            ↓
Personalization (Redis + GraphDB)
            ↓
Multi-LLM Router (Claude / OpenAI / Gemini)
            ↓
Workflow JSON (Validated Against Schema)
            ↓
Temporal Orchestration Engine
            ↓
Java Spring MCP Aggregation Layer
            ↓
Elasticsearch + Kafka Index
            ↓
Restaurant Services / External MCP Providers
```
---

### 🤖 Multi-LLM Strategy
```
Model| Role
Claude| Planning + Workflow Generation
OpenAI| Validation + Structured Reasoning
Gemini| Fast Classification / Cache Routing
```
Configurable via ".env".

---

### 🧩 Monorepo Structure
```
.ai/                  → AI control plane (rules, skills, orchestration)
apps/
  ├── customer-app    → Capacitor + React user app
  ├── restaurant-app  → Restaurant owner console
  └── gateway-api     → NestJS agent gateway

services/
  ├── orchestration   → Temporal workers
  ├── search-orchestrator → Spring Boot (ES + Kafka)
  └── mcp-adapter     → MCP provider integrations

packages/
  ├── llm-router
  ├── workflow-schema
  └── ui-schema

tools/                → Safe execution layer (patch, workflow, telemetry)
infra/                → Docker / Temporal / Elastic setup
```
---

### 📜 Spec-Driven Development (SDD)

This repository is governed by machine-readable intent:
```
.ai/context/          → Product + architecture context
.ai/skills/           → Engineering agents
.ai/plugins/          → Execution bindings
.ai/schema/           → Workflow contracts
.ai/memory/           → Architectural decisions
```
Agents MUST read ".ai/config.yaml" before acting.

---

### 🔄 Execution Flow
```
1️⃣ User Prompt

Frontend sends:

POST /agent/execute { userId, prompt }

2️⃣ Async Job Created

Returns:

{ jobId }

3️⃣ AI Planning

LLM produces validated workflow JSON.

4️⃣ Temporal Executes

Retries, compensation, fallback providers handled automatically.

5️⃣ MCP Layer Executes Commerce Actions

6️⃣ UI Polls Job Status

User sees live progress updates.
```
---

### 🔐 Guardrails

- LLMs cannot mutate data directly.
- All actions flow through Temporal.
- Workflow must validate against schema.
- Providers accessed only through MCP adapters.
- Generated code must pass test + security gates.

---

### ⚙️ Local Development (GitHub Codespaces Recommended)

Start Environment
```
pnpm install
docker compose up
```
Run Gateway
```
cd apps/gateway-api
pnpm start:dev
```
---

### 🌐 Required Services
```
Service| Purpose
Temporal| Durable orchestration
Redis| Session + personalization
GraphDB| Preference graph
Elasticsearch| Discovery/search
Kafka| Index updates
NestJS| Agent gateway
Spring Boot| MCP aggregator
```
---

### 🔌 MCP Provider Support
```
Provider| Status
Mock| Enabled by default
Swiggy MCP| Configurable
Zomato MCP| Configurable
```
Toggle via environment config.

---

### 📊 Observability

Platform emits structured telemetry for:

- Workflow lifecycle
- LLM usage
- Provider performance
- Conversion funnels

---

### 🧪 AI-Driven SDLC Pipeline

Claude agents automatically perform:

Requirement Expansion
→ Architecture Mapping
→ Task Planning
→ Code Generation
→ Test Creation
→ Static + Security Analysis
→ Self-Healing Fixes
→ Release Validation

---

### 🔑 Environment Configuration

Create ".env":
```
LLM_CLAUDE_ENABLED=true
LLM_OPENAI_ENABLED=true
LLM_GEMINI_ENABLED=true

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
```
Never commit secrets.

---

### 🛠 Tooling Layer

All executable automation lives under:
```
tools/
```
AI instructions stay in ".ai/" (declarative vs executable separation).

---

### 📌 Project Status

This is a foundational platform repo designed to evolve into:
```
«A generalized Agentic Commerce Operating System.»
```
---

### 🤝 Contribution Model

This repo expects:

- Spec updates before feature code
- Workflow-safe implementations
- Test-first automation
- Observable behavior

---

### 📄 License

Internal / TBD.

---

### 🔭 Future Extensions

- Cross-vertical commerce agents
- Learning personalization engine
- Marketplace orchestration
- Multi-domain agent federation

---

### 🧠 Philosophy

Traditional systems execute instructions.

This system understands intent, plans safely, and executes reliably.

That shift is the foundation of Agentic Software.

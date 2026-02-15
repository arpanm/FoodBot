🍽️ Agentic Restaurant Commerce Platform — Spec-Driven Development (SDD)

0. Purpose

Build an Agentic, LLM-Orchestrated Restaurant Commerce Platform with:

- Frontend: Capacitor + React (Customer + Restaurant Owner Apps)
- Backend (Agent Layer): Node.js + NestJS
- Search/Index Layer: Java Spring Boot + Elasticsearch + Kafka
- Workflow Orchestration: Temporal
- LLMs: Claude + OpenAI + Gemini (Configurable On/Off)
- Memory/Caching: Redis + GraphDB + VectorDB
- Protocol Integration: MCP (Mock + Swiggy + Zomato)

This system behaves like a goal-driven assistant, not a chatbot.

---

1. High-Level Architecture

Mobile App (Capacitor + React)
        ↓
NestJS Agent Gateway (Async Job API)
        ↓
Personalization Layer (Redis + Graph GraphDB)
        ↓
LLM Routing Layer (Claude/OpenAI/Gemini)
        ↓
Workflow JSON
        ↓
Temporal Orchestration Engine
        ↓
MCP Aggregation Layer (Java Spring Boot)
        ↓
ElasticSearch + Kafka Index
        ↓
Restaurant Agents (NestJS)

---

2. LLM Responsibilities (Configurable)

Model| Responsibility
Claude| Planning + Workflow Generation
OpenAI| Validation + Structured Extraction
Gemini| Fast Classification / Cache Lookup

".env" Configuration

LLM_CLAUDE_ENABLED=true
LLM_OPENAI_ENABLED=true
LLM_GEMINI_ENABLED=true

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

---

3. UI/UX Requirements (Chat + Rich Cards)

Chat Experience Must Support:

- Conversational flow
- Dynamic UI injected by backend
- Cards with:
  - Image
  - Title
  - Attributes (price, rating, ETA)
  - CTA buttons
- Inline forms (address, filters, qty)
- Multi-select options
- Progress timeline messages

Example Response Payload

{
  "type": "CARD_LIST",
  "cards": [
    {
      "image": "...",
      "title": "Paneer Tikka",
      "attributes": { "price": 299, "rating": 4.5 },
      "cta": ["Add", "Details"]
    }
  ]
}

---

4. Async Job Model

Request

POST /agent/execute
{
  userId,
  prompt
}

Response

{
  jobId,
  status: "PROCESSING"
}

Frontend polls:

GET /agent/status/{jobId}

---

5. Personalization Model (Graph Tree)

Stored in GraphDB:

User
 └── DayOfWeek
      └── HourOfDay
           └── Category
                └── Subcategory
                     └── Restaurant
                          └── Dish

Used to enrich LLM prompt before reasoning.

---

6. Vector Cache (Token Reduction)

Prompt → Intent → Workflow stored in VectorDB.

Before calling LLM:

semanticSearch(prompt)
IF similarity > threshold → reuse workflow
ELSE → call LLM

---

7. Workflow JSON Contract (LLM Output)

{
  intent: "ORDER_FOOD",
  steps: [
    { action: "SEARCH_DISH", params:{} },
    { action: "FILTER", params:{} },
    { action: "ADD_TO_CART" },
    { action: "CHECKOUT" }
  ]
}

---

8. Temporal Execution Requirements

Temporal must implement:

- Retry Policies
- Circuit Breakers
- Bulkheads
- Alternative Plans
- Backtracking
- Compensation Actions

Each step must update job status.

---

9. MCP Layer

Supported Providers

Provider| Toggle
Mock| Enabled
Swiggy MCP| Configurable
Zomato MCP| Configurable

MCP_SWIGGY_ENABLED=true
MCP_ZOMATO_ENABLED=false

---

10. MCP APIs to Implement

Discovery

- searchRestaurants
- searchDishes
- getFilters
- applyFilters

Commerce

- addToCart
- checkout
- initiatePayment
- trackOrder
- cancelOrder

Engagement

- recommendDishes
- feedback
- analytics

---

11. ElasticSearch Index Model

Indexed Entities:

- Restaurants
- Dishes
- Price
- Availability
- Geo
- Cuisine
- Ratings

Kafka events update index:

MENU_UPDATED
ITEM_AVAILABILITY_CHANGED
PRICE_CHANGED

---

12. Restaurant Owner Agent (Capacitor + React)

Features:

- Menu CRUD
- Availability Toggle
- Orders Dashboard
- Analytics Queries via LLM
- Insights Chat ("Why sales dropped?")

---

13. Spec-Driven Development Flow (Claude Code Role)

Claude must:

1. Expand Requirements → Detailed Specs
2. Break into Tasks
3. Generate Code
4. Generate Tests
5. Run Static Analysis
6. Perform Code Review
7. Fix Issues Automatically
8. Re-run Tests
9. Security Audit
10. Produce Deployment Artifacts

---

14. Guardrails

- LLM never calls APIs directly.
- Only Temporal executes actions.
- All workflows validated against schema.
- All external MCP calls wrapped in resilience layer.

---

15. Tech Stack Summary

Layer| Tech
Frontend| Capacitor + React
Gateway| NestJS
Orchestration| Temporal
Search Layer| Spring Boot
Index| ElasticSearch
Streaming| Kafka
Cache| Redis
Graph| Neo4j/Nemo
Vector| Pinecone/Weaviate

---

16. Observability

Track:

- LLM token usage
- Workflow latency
- MCP provider reliability
- Conversion funnels

---

17. Deliverables Expected from Claude Code

- Complete repo scaffold
- Environment configs
- Infra scripts
- API contracts
- Workflow schemas
- Test suites
- CI/CD pipelines

---

18. Success Definition

System behaves like:

«A reasoning commerce operator that plans, executes, adapts, and learns —
not a chatbot.»

---

📁 Recommended Monorepo Structure

agentic-food-platform/
├── apps/
│   ├── customer-app/            # Capacitor + React (Customer)
│   ├── restaurant-app/          # Capacitor + React (Owner)
│   └── gateway-api/             # NestJS (Agent Gateway)
│
├── services/
│   ├── orchestration/           # Temporal workers (Node)
│   ├── search-orchestrator/     # Spring Boot (ES + Kafka bridge)
│   └── mcp-adapter/             # MCP integrations (Swiggy/Zomato/Mock)
│
├── infra/
│   ├── docker-compose.yml
│   ├── elastic/
│   └── temporal/
│
├── packages/
│   ├── llm-router/              # Shared multi-LLM logic
│   ├── ui-schema/               # Chat UI contracts
│   └── workflow-schema/         # Workflow JSON schema
│
├── .devcontainer/
├── .env.example
└── README.md


---

⚙️ DevContainer:

Create:

.devcontainer/devcontainer.json

{
"name": "Agentic Food Platform",
"dockerComposeFile": "../infra/docker-compose.yml",
"service": "dev",
"workspaceFolder": "/workspace",

"features": {
"ghcr.io/devcontainers/features/node:1": { "version": "20" },
"ghcr.io/devcontainers/features/java:1": { "version": "21" },
"ghcr.io/devcontainers/features/docker-in-docker:2": {}
},

"customizations": {
"vscode": {
"extensions": [
"dbaeumer.vscode-eslint",
"esbenp.prettier-vscode",
"vscjava.vscode-java-pack",
"ms-azuretools.vscode-docker"
]
}
},

"forwardPorts": [3000, 8080, 9200, 7233],

"postCreateCommand": "npm install -g pnpm && pnpm install"
}
---

🐳 Local Infra:

infra/docker-compose.yml

version: "3.9"

services:
dev:
image: mcr.microsoft.com/devcontainers/base:ubuntu
volumes:
- ..:/workspace
command: sleep infinity

redis:
image: redis:7
ports:
- "6379:6379"

elastic:
image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
environment:
- discovery.type=single-node
- xpack.security.enabled=false
ports:
- "9200:9200"

temporal:
image: temporalio/auto-setup:1.23
ports:
- "7233:7233"

kafka:
image: bitnami/kafka:latest
environment:
- KAFKA_CFG_NODE_ID=0
- KAFKA_CFG_PROCESS_ROLES=controller,broker
- KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@localhost:9093
ports:
- "9092:9092"
---

🔐 Environment Configuration

.env.example

LLM Toggles

LLM_CLAUDE_ENABLED=true
LLM_OPENAI_ENABLED=true
LLM_GEMINI_ENABLED=true

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

MCP Providers

MCP_SWIGGY_ENABLED=false
MCP_ZOMATO_ENABLED=false
MCP_MOCK_ENABLED=true

REDIS_URL=redis://redis:6379
ELASTIC_URL=http://elastic:9200
TEMPORAL_ADDRESS=temporal:7233Store real values in Codespaces Secrets, not this file.


---

🤖 Shared LLM Router Package

packages/llm-router/index.ts

export class LLMRouter {
async plan(prompt: string, context: any) {
if (process.env.LLM_GEMINI_ENABLED === "true") {
const cached = await this.checkVectorCache(prompt);
if (cached) return cached;
}

if (process.env.LLM_CLAUDE_ENABLED === "true") {
  return this.callClaude(prompt, context);
}

return this.callOpenAI(prompt, context);

}

async callClaude(prompt: string, context: any) {
// call Anthropic Messages API
}

async callOpenAI(prompt: string, context: any) {
// call OpenAI structured output
}

async checkVectorCache(prompt: string) {
// TODO: plug Pinecone/Weaviate
}
}
---

🚪 NestJS Gateway Entry (Async Job Creation)

apps/gateway-api/src/agent.controller.ts

@Post("execute")
async execute(@Body() dto: { userId: string; prompt: string }) {
const jobId = randomUUID();

await this.jobService.create(jobId, dto);

this.orchestrator.start(jobId, dto); // async fire

return { jobId, status: "PROCESSING" };
}
---

⏱ Temporal Worker (Dynamic Execution)

services/orchestration/workflow.ts

export async function executeWorkflow(plan, activities) {
for (const step of plan.steps) {
try {
await activities"step.action" (step.params);
} catch (e) {
await activities.compensate(step);
}
}
}
---

📱 React Chat UI Contract

packages/ui-schema/message.ts

export type ChatMessage =
| { type: "TEXT"; text: string }
| { type: "CARD_LIST"; cards: Card[] }
| { type: "FORM"; fields: Field[] }
| { type: "STATUS"; step: string };
---

# Technical Requirements - FoodBot

**Version:** 2.0.0
**Last Updated:** 2026-02-20
**Status:** Active - Updated with Advanced Features

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Frontend Technology Stack](#2-frontend-technology-stack)
- [3. Backend Technology Stack](#3-backend-technology-stack)
- [4. Database Requirements](#4-database-requirements)
- [5. Integration Requirements](#5-integration-requirements)
- [6. DevOps & Infrastructure](#6-devops--infrastructure)
- [7. Development Tools](#7-development-tools)
- [8. Performance Requirements](#8-performance-requirements)
- [9. Advanced Features Tech Stack](#9-advanced-features-tech-stack)
- [10. Multi-Agent Development Platform](#10-multi-agent-development-platform)

---

## 1. Overview

### 1.1 Purpose

This document specifies all technical requirements, technology choices, and implementation standards for the FoodBot platform.

### 1.2 Technology Decision Criteria

All technology choices based on:
- **Production Readiness**: Stable, well-maintained, enterprise-grade
- **Developer Experience**: Strong TypeScript support, excellent documentation
- **Performance**: Meets or exceeds performance benchmarks
- **Community**: Active community, regular updates, good ecosystem
- **Cost**: Reasonable licensing and operational costs

---

## 2. Frontend Technology Stack

### 2.1 Mobile Application

**TR-FE-MOBILE-001: React Native Stack** ✅ **IMPLEMENTED**

**Implementation Date:** 2026-02-20
**Status:** Complete (native init blocked)

```json
{
  "framework": "React Native 0.73.2",
  "language": "TypeScript 5.0.4",
  "stateManagement": "Redux Toolkit 2.0.7",
  "navigation": "React Navigation 6.x",
  "networking": "Axios 1.6.5",
  "forms": "React Hook Form 7.x",
  "styling": "StyleSheet + React Native Paper",
  "testing": "Jest + React Native Testing Library",
  "buildTool": "Metro Bundler",
  "nativeBridge": "React Native 0.73"
}
```

**Key Dependencies:**
```json
{
  "react": "18.2.0",
  "react-native": "0.73.2",
  "@reduxjs/toolkit": "2.0.7",
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/stack": "^6.3.20",
  "axios": "^1.6.5",
  "react-native-keychain": "^8.1.2",
  "react-hook-form": "^7.49.3"
}
```

**Dev Dependencies:**
```json
{
  "typescript": "5.0.4",
  "@types/react": "^18.2.6",
  "@types/react-native": "^0.72.8",
  "jest": "^29.6.3",
  "@testing-library/react-native": "^12.4.3",
  "eslint": "^8.19.0",
  "prettier": "^2.8.8"
}
```

**Rationale:**
- **React Native 0.73.2**: Latest stable, excellent performance
- **TypeScript 5.0.4**: Strict mode for type safety
- **Redux Toolkit**: Modern Redux with less boilerplate
- **React Navigation 6**: Industry standard, type-safe
- **Axios**: Interceptors for auth, well-tested
- **Keychain**: Secure token storage (iOS Keychain/Android Keystore)

**Files Created:**
- `/apps/mobile-app/package.json`
- `/apps/mobile-app/tsconfig.json`
- `/apps/mobile-app/babel.config.js`
- `/apps/mobile-app/metro.config.js`

**Performance Metrics:**
- Bundle size: Target <5MB
- App launch time: <2 seconds
- Screen transition: <200ms
- Memory footprint: <150MB

---

### 2.2 Chrome Extension

**TR-FE-EXT-001: Chrome Extension Stack** ✅ **IMPLEMENTED**

**Implementation Date:** 2026-02-19
**Status:** Complete

```json
{
  "manifest": "Manifest V3",
  "language": "TypeScript 5.x",
  "bundler": "Webpack 5",
  "testing": "Jest + DOM Testing Library",
  "contentScripts": "Vanilla TypeScript (no React)",
  "background": "Service Worker",
  "storage": "chrome.storage.local"
}
```

**Key Features:**
- **Platform Abstraction**: 87% code reuse between Swiggy/Zomato
- **Selector Fallback**: 5-8 fallbacks per selector
- **Message Passing**: chrome.runtime messaging API
- **DOM Manipulation**: Direct DOM access for performance

**Files:**
- `/chrome-extension/manifest.json`
- `/chrome-extension/tsconfig.json`
- `/chrome-extension/webpack.config.js`
- `/chrome-extension/src/` (15+ TypeScript files)

**Performance:**
- Content script injection: <50ms
- DOM query time: <10ms (p95)
- Platform detection: <10ms
- Memory footprint: <30MB

---

### 2.3 Customer Web App

**TR-FE-WEB-001: Customer Web App Stack** 🟡 **PENDING**

**Planned Stack:**
```json
{
  "framework": "Next.js 14",
  "language": "TypeScript 5.x",
  "stateManagement": "Redux Toolkit + RTK Query",
  "styling": "Tailwind CSS 3.x",
  "ui": "shadcn/ui components",
  "testing": "Jest + React Testing Library + Playwright"
}
```

**Rationale:**
- **Next.js 14**: SSR/SSG for SEO, App Router, Server Components
- **Tailwind CSS**: Rapid UI development, consistent design
- **shadcn/ui**: Accessible, customizable components
- **RTK Query**: Built-in caching, automatic refetching

---

### 2.4 Restaurant Web App

**TR-FE-RESTAURANT-001: Restaurant Web App Stack** 🟡 **PENDING**

**Planned Stack:**
```json
{
  "framework": "Next.js 14",
  "language": "TypeScript 5.x",
  "stateManagement": "Redux Toolkit",
  "charts": "Recharts / Chart.js",
  "forms": "React Hook Form + Zod",
  "ui": "Material-UI"
}
```

---

---

## 3. Backend Technology Stack

### 3.1 Gateway API

**TR-BE-GATEWAY-001: NestJS Gateway** 🔄 **IN PROGRESS**

**Implementation Status:** Structure defined, endpoints pending

```json
{
  "framework": "NestJS 10.x",
  "language": "TypeScript 5.x",
  "runtime": "Node.js 20 LTS",
  "apiStyle": "REST (OpenAPI 3.0)",
  "validation": "class-validator + class-transformer",
  "auth": "JWT + Passport.js",
  "documentation": "Swagger/OpenAPI",
  "testing": "Jest + Supertest"
}
```

**Key Dependencies:**
```json
{
  "@nestjs/core": "^10.0.0",
  "@nestjs/common": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@nestjs/swagger": "^7.0.0",
  "@nestjs/jwt": "^10.0.0",
  "@nestjs/passport": "^10.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

**Endpoints (Planned):**
- Authentication: `/api/v1/auth/*`
- Chat: `/api/v1/chat/*`
- Restaurants: `/api/v1/restaurants/*`
- Orders: `/api/v1/orders/*`
- Users: `/api/v1/users/*`

**Performance Targets:**
- Response time p95: <500ms
- Response time p99: <1000ms
- Throughput: 1000+ req/sec
- Concurrent connections: 10,000+

---

### 3.2 MCP Adapter Service

**TR-BE-MCP-001: MCP Adapter Service** ✅ **IMPLEMENTED**

**Implementation Date:** 2026-02-19
**Status:** Complete

```json
{
  "framework": "NestJS 10.x",
  "language": "TypeScript 5.x",
  "protocol": "JSON-RPC 2.0 (MCP)",
  "httpClient": "Node.js fetch API",
  "retry": "Exponential backoff (3 attempts)",
  "timeout": "5000ms (configurable)",
  "testing": "Jest with 100% critical path coverage"
}
```

**Files:**
- `/services/mcp-adapter/src/mcp/MCPClient.ts` (328 lines)
- `/services/mcp-adapter/src/providers/swiggy/SwiggyMCPClient.ts` (285 lines)
- `/services/mcp-adapter/src/providers/zomato/ZomatoMCPClient.ts` (372 lines)
- `/services/mcp-adapter/src/auth/OAuthManager.ts` (OAuth 2.1 implementation)

**Providers Integrated:**
- **Swiggy MCP**: 13 tools (food, instamart, dineout, unified search)
- **Zomato MCP**: 21 tools (search, collections, reviews, orders, delivery)

**Performance:**
- MCP request latency: <200ms (network dependent)
- Retry overhead: 100ms - 5000ms (exponential)
- Health check: <2000ms
- Memory per client: <10MB

**Error Handling:**
```typescript
class MCPRequestError extends Error
class MCPProtocolError extends Error
class MCPTimeoutError extends Error
class MCPHealthCheckError extends Error
```

---

### 3.3 LLM Orchestration Service

**TR-BE-LLM-001: LLM Router Package** ✅ **IMPLEMENTED**

**Implementation Date:** 2026-02-19
**Status:** Complete (standalone package)

```json
{
  "package": "@foodbot/llm-router",
  "language": "TypeScript 5.x",
  "providers": ["Claude", "OpenAI", "Gemini"],
  "routing": "Quality / Cost / Performance / Balanced",
  "streaming": "Supported on all providers",
  "monitoring": "Metrics + Health checks"
}
```

**Dependencies:**
```json
{
  "@anthropic-ai/sdk": "^0.32.1",
  "openai": "^4.77.0",
  "@google/generative-ai": "^0.21.0",
  "pino": "^9.4.0",
  "zod": "^3.23.8"
}
```

**Providers:**
- **Claude (Anthropic)**: opus-4-6, sonnet-4-5, haiku-4
- **OpenAI**: gpt-4-turbo, gpt-4o, gpt-4, gpt-3.5-turbo
- **Gemini (Google)**: gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-pro

**Routing Strategies:**
1. **Quality**: Claude for reasoning, OpenAI for code, first available otherwise
2. **Cost**: Gemini for simple, OpenAI for medium, Claude for complex
3. **Performance**: All to Gemini (fastest)
4. **Balanced**: Random distribution

**Features:**
- Intelligent routing by task type
- Automatic failover on provider failure
- Retry with exponential backoff
- Streaming support
- Metrics tracking (requests, latency, cost)
- Health monitoring per provider

**Files:**
- `/packages/llm-router/src/router.ts` (436 lines)
- `/packages/llm-router/src/providers/claude-provider.ts` (186 lines)
- `/packages/llm-router/src/providers/openai-provider.ts` (174 lines)
- `/packages/llm-router/src/providers/gemini-provider.ts` (180 lines)

**Performance:**
- Claude: 500-2000ms (complex reasoning)
- OpenAI: 400-1500ms (general purpose)
- Gemini: 300-1000ms (fast classification)
- Fallback overhead: <100ms

---

### 3.4 Temporal Workflow Service

**TR-BE-TEMPORAL-001: Workflow Orchestration** 🟡 **PENDING**

**Planned Stack:**
```json
{
  "framework": "Temporal.io",
  "language": "TypeScript",
  "sdk": "@temporalio/client + @temporalio/worker",
  "persistence": "PostgreSQL",
  "retention": "30 days"
}
```

**Use Cases:**
- Order placement workflows
- Delivery tracking workflows
- Multi-step user interactions
- Long-running operations

---

---

## 4. Database Requirements

### 4.1 PostgreSQL (Primary Database)

**TR-DB-POSTGRES-001: PostgreSQL Configuration** 🔄 **IN PROGRESS**

**Version:** PostgreSQL 15+
**Usage:** Primary relational database

**Schema (Planned):**
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cuisine VARCHAR(100)[],
  rating DECIMAL(2,1),
  price_range INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

**Performance Requirements:**
- Query response time: p95 <50ms
- Connection pool size: 20-100
- Max connections: 200
- Indexing strategy: All foreign keys indexed

---

### 4.2 Redis (Cache & Session Store)

**TR-DB-REDIS-001: Redis Configuration** 🔄 **IN PROGRESS**

**Version:** Redis 7+
**Usage:** Caching, sessions, job status

**Data Structures:**
```typescript
// User sessions (TTL: 7 days)
SET session:{sessionId} '{"userId": "...", "accessToken": "..."}' EX 604800

// Job status (TTL: 24 hours)
SET job:{jobId} '{"status": "PROCESSING", "progress": 50}' EX 86400

// API response cache (TTL: 5 minutes)
SET cache:restaurants:{query} '{"results": [...]}' EX 300

// Rate limiting counters (TTL: 1 minute)
INCR ratelimit:{userId}:{endpoint} EX 60
```

**Performance:**
- GET latency: p95 <1ms
- SET latency: p95 <2ms
- Memory limit: 4GB (LRU eviction)
- Persistence: AOF (append-only file)

---

### 4.3 Neo4j (Graph Database)

**TR-DB-NEO4J-001: User Preference Graph** 🟡 **PENDING**

**Version:** Neo4j 5+
**Usage:** User preference learning

**Graph Structure:**
```cypher
// User preference hierarchy
(User)-[:PREFERS_ON]->(DayOfWeek)
(DayOfWeek)-[:AT_HOUR]->(Hour)
(Hour)-[:FOR_CATEGORY]->(Category)
(Category)-[:IN_SUBCATEGORY]->(Subcategory)
(Subcategory)-[:AT_RESTAURANT]->(Restaurant)
(Restaurant)-[:DISH]->(Dish)

// Example query
MATCH (u:User {id: $userId})
  -[:PREFERS_ON]->(dow:DayOfWeek {name: $dayOfWeek})
  -[:AT_HOUR]->(h:Hour {hour: $hour})
  -[:FOR_CATEGORY]->(c:Category)
  -[:IN_SUBCATEGORY]->(sc:Subcategory)
  -[:AT_RESTAURANT]->(r:Restaurant)
  -[:DISH]->(d:Dish)
RETURN d
ORDER BY d.preference_score DESC
LIMIT 10
```

**Performance Target:**
- Graph traversal: <100ms
- Preference update: <50ms
- Memory: 2GB

---

### 4.4 Vector Database (Semantic Caching)

**TR-DB-VECTOR-001: Vector Database** 🟡 **PENDING**

**Options:** Pinecone / Weaviate / Qdrant
**Usage:** Semantic prompt caching

**Configuration:**
```typescript
{
  embeddingDimensions: 1536, // OpenAI ada-002
  indexSize: '1M vectors',
  similarityMetric: 'cosine',
  cacheThreshold: 0.85, // Cosine similarity > 0.85 = cache hit
  ttl: '24 hours'
}
```

**Use Cases:**
- Cache prompt → intent mappings
- Similar query detection
- Reduce LLM API calls by >60%

---

### 4.5 Elasticsearch (Search Engine)

**TR-DB-ELASTICSEARCH-001: Search Indexing** 🟡 **PENDING**

**Version:** Elasticsearch 8+
**Usage:** Full-text search for restaurants and dishes

**Indexes:**
```json
{
  "restaurants": {
    "mappings": {
      "properties": {
        "name": { "type": "text", "analyzer": "standard" },
        "description": { "type": "text" },
        "cuisine": { "type": "keyword" },
        "location": { "type": "geo_point" },
        "rating": { "type": "float" },
        "price_range": { "type": "integer" }
      }
    }
  },
  "dishes": {
    "mappings": {
      "properties": {
        "name": { "type": "text", "analyzer": "standard" },
        "ingredients": { "type": "text" },
        "category": { "type": "keyword" },
        "price": { "type": "float" },
        "dietary_tags": { "type": "keyword" }
      }
    }
  }
}
```

**Performance:**
- Search latency: p95 <500ms
- Indexing latency: <5 seconds
- Typo tolerance: Fuzzy matching enabled

---

### 4.6 Kafka (Event Streaming)

**TR-DB-KAFKA-001: Event Streaming** 🟡 **PENDING**

**Version:** Kafka 3+
**Usage:** Real-time data synchronization

**Topics:**
```
restaurant.created
restaurant.updated
restaurant.deleted
menu.updated
dish.availability.changed
order.created
order.status.changed
```

**Configuration:**
- Partitions: 3 per topic
- Replication factor: 3
- Retention: 7 days
- Compression: LZ4

---

---

## 5. Integration Requirements

### 5.1 MCP Protocol

**TR-INT-MCP-001: MCP Specification** ✅ **IMPLEMENTED**

**Implementation Date:** 2026-02-19
**Status:** Complete

**Protocol:** JSON-RPC 2.0 over HTTPS

**Message Format:**
```typescript
interface MCPMessage {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number;
}
```

**Providers:**
- **Swiggy MCP**: `https://mcp.swiggy.com` (13 tools)
- **Zomato MCP**: `https://mcp-server.zomato.com/mcp` (21 tools)

**Error Codes:**
```typescript
-32700: Parse error
-32600: Invalid request
-32601: Method not found
-32602: Invalid params
-32603: Internal error
```

---

### 5.2 OAuth 2.1

**TR-INT-OAUTH-001: OAuth Implementation** ✅ **IMPLEMENTED**

**Implementation Date:** 2026-02-19
**Status:** Complete

**Providers:**
- Google OAuth 2.0
- Facebook OAuth 2.0
- Apple Sign In

**Flow:**
```
1. Client initiates OAuth
2. Redirect to provider
3. User authorizes
4. Provider redirects with code
5. Backend exchanges code for tokens
6. Tokens stored securely
```

**Security:**
- State parameter for CSRF protection
- State expiration: 5 minutes
- PKCE (Proof Key for Code Exchange) ready
- Token storage: Keychain (mobile), httpOnly cookie (web)

**Files:**
- `/services/mcp-adapter/src/auth/OAuthManager.ts`
- `/apps/mobile-app/src/services/auth/OAuthService.ts`

---

### 5.3 Payment Gateway

**TR-INT-PAYMENT-001: Payment Integration** 🟡 **PENDING**

**Planned Providers:**
- Razorpay (Primary - India)
- Stripe (International)

**Features:**
- Multiple payment methods (card, UPI, wallets, net banking)
- Webhook handling for payment status
- Idempotency for duplicate requests
- PCI-DSS compliance

---

### 5.4 Notification Services

**TR-INT-NOTIF-001: Push Notifications** 🟡 **PENDING**

**Provider:** Firebase Cloud Messaging (FCM)

**Use Cases:**
- Order status updates
- Promotional messages
- Restaurant offers
- Delivery tracking

---

---

## 6. DevOps & Infrastructure

### 6.1 Containerization

**TR-DEVOPS-DOCKER-001: Docker Setup** 🔄 **IN PROGRESS**

**Files:**
- `/docker-compose.yml`
- `/docker-compose.dev.yml`
- Service-specific Dockerfiles

**Services:**
```yaml
services:
  gateway-api:
    build: ./apps/gateway-api
    ports: ["3000:3000"]

  mcp-adapter:
    build: ./services/mcp-adapter
    ports: ["3001:3001"]

  postgres:
    image: postgres:15

  redis:
    image: redis:7

  neo4j:
    image: neo4j:5

  elasticsearch:
    image: elasticsearch:8.x

  kafka:
    image: confluentinc/cp-kafka:latest
```

---

### 6.2 CI/CD

**TR-DEVOPS-CI-001: GitHub Actions** 🟡 **PENDING**

**Pipelines:**
- Linting (ESLint, Prettier)
- Type checking (TypeScript)
- Unit tests (Jest)
- Integration tests
- Build verification
- Docker image build
- Deployment to staging/production

---

### 6.3 Monitoring

**TR-DEVOPS-MON-001: Monitoring Stack** 🟡 **PENDING**

**Stack:**
- **Metrics**: Prometheus + Grafana
- **Logging**: Winston + Elasticsearch + Kibana (ELK)
- **Tracing**: Jaeger / Zipkin
- **Alerting**: PagerDuty + Slack

---

---

## 7. Development Tools

### 7.1 Code Quality

**TR-DEV-QUALITY-001: Linting & Formatting** ✅ **IMPLEMENTED**

**Tools:**
- ESLint with TypeScript rules
- Prettier for code formatting
- TypeScript strict mode

**Configuration:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "error",
    "no-debugger": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

---

### 7.2 Testing

**TR-DEV-TEST-001: Testing Stack** ✅ **IMPLEMENTED**

**Unit Tests:**
- Jest 29.x
- Testing Library (React Native, React)
- Coverage threshold: 80%

**Integration Tests:**
- Supertest (API testing)
- Test databases (Docker)

**E2E Tests:**
- Playwright (web)
- Detox (React Native)

**Files:**
- `/apps/mobile-app/jest.config.js`
- `/services/mcp-adapter/tests/`
- `/packages/llm-router/tests/`

---

---

## 8. Performance Requirements

### 8.1 Response Times

| Metric | Target | Measured |
|--------|--------|----------|
| API p95 | <500ms | - |
| API p99 | <1000ms | - |
| Database query p95 | <50ms | - |
| Redis GET p95 | <1ms | - |
| Elasticsearch search p95 | <500ms | - |
| LLM response (Gemini) | <1000ms | 300-1000ms ✅ |
| LLM response (OpenAI) | <1500ms | 400-1500ms ✅ |
| LLM response (Claude) | <2000ms | 500-2000ms ✅ |

### 8.2 Throughput

| Service | Target | Measured |
|---------|--------|----------|
| Gateway API | 1000+ req/sec | - |
| MCP Adapter | 500+ req/sec | - |
| LLM Router | 100+ req/sec | - |

### 8.3 Scalability

- **Horizontal Scaling**: All services stateless
- **Database**: Read replicas for load distribution
- **Caching**: Redis for hot data
- **CDN**: Static assets served via CDN

---

## 9. Advanced Features Tech Stack

### 9.1 Vector Database

**NFR-VECTOR-001: Vector Database for Semantic Caching** 🟡 **PENDING**

**Options Evaluation:**

| Provider | Type | Pros | Cons | Cost | Choice |
|----------|------|------|------|------|--------|
| **Pinecone** | Managed | Fastest, no ops, excellent API | Expensive, vendor lock-in | $$$ | Production |
| **Weaviate** | Open-source | GraphQL API, multi-modal, free | Self-hosted, ops overhead | $ | Development |
| **Qdrant** | Open-source | Rust-based, very fast, free | Smaller community | $ | Alternative |
| **Chroma** | Open-source | Simple, Python-first | Limited scale | Free | Local dev |

**Selected Stack:**
```json
{
  "production": "Pinecone",
  "development": "Weaviate (Docker)",
  "embedding": "OpenAI text-embedding-3-small (1536 dims)",
  "similarityMetric": "cosine",
  "indexSize": "1M vectors",
  "cacheThreshold": 0.85
}
```

**Configuration:**
```typescript
interface VectorDBConfig {
  provider: 'pinecone' | 'weaviate' | 'qdrant';
  indexName: string;
  dimensions: 1536; // OpenAI embedding size
  metric: 'cosine' | 'euclidean' | 'dotProduct';
  namespace?: string; // For multi-tenancy
  replicas: number;
  shards: number;
}
```

**Performance Targets:**
- Insert latency: <10ms (p95)
- Query latency: <50ms (p95)
- Throughput: 1000+ queries/sec
- Cache hit rate: >70%

**Cost Optimization:**
- Use smaller embeddings (512 dims) for non-critical caching
- TTL-based expiration (24 hours default)
- Periodic cleanup of low-hit-rate vectors

---

### 9.2 Graph Database (Neo4j)

**NFR-GRAPH-001: User Preference Graph** 🟡 **PENDING**

**Stack:**
```json
{
  "database": "Neo4j 5.x",
  "driver": "@neo4j/driver (Node.js)",
  "deployment": "Neo4j Aura (managed) or self-hosted",
  "clustering": "Causal cluster (3 nodes)",
  "memory": "4GB heap size",
  "storage": "50GB SSD"
}
```

**Schema:**
```cypher
// User node
CREATE (u:User {
  id: 'uuid',
  name: 'string',
  createdAt: datetime()
})

// Preference hierarchy
CREATE (u:User)-[:PREFERS_ON {score: 0.8}]->(dow:DayOfWeek {name: 'Monday'})
CREATE (dow)-[:AT_HOUR {score: 0.9}]->(h:Hour {hour: 12})
CREATE (h)-[:FOR_CATEGORY {score: 0.85}]->(c:Category {name: 'Italian'})
CREATE (c)-[:AT_RESTAURANT {score: 0.95}]->(r:Restaurant {id: 'uuid'})
CREATE (r)-[:DISH {score: 0.9}]->(d:Dish {id: 'uuid', name: 'Margherita Pizza'})

// Indexes
CREATE INDEX user_id FOR (u:User) ON (u.id)
CREATE INDEX restaurant_id FOR (r:Restaurant) ON (r.id)
CREATE INDEX dish_id FOR (d:Dish) ON (d.id)
```

**Query Performance:**
```cypher
// Get personalized recommendations (target: <100ms)
MATCH (u:User {id: $userId})
  -[:PREFERS_ON]->(dow:DayOfWeek {name: $dayOfWeek})
  -[:AT_HOUR]->(h:Hour {hour: $hour})
  -[catRel:FOR_CATEGORY]->(c:Category)
  -[restRel:AT_RESTAURANT]->(r:Restaurant)
  -[dishRel:DISH]->(d:Dish)
RETURN d, (catRel.score + restRel.score + dishRel.score) / 3 as score
ORDER BY score DESC
LIMIT 10
```

**Performance Targets:**
- Graph traversal: <100ms (p95)
- Preference update: <50ms
- Concurrent queries: 100+/sec
- Graph size: 10M+ nodes, 50M+ relationships

---

### 9.3 Nutrition API Integration

**NFR-NUTRITION-001: Nutrition Data** 🟡 **PENDING**

**Provider Options:**

| Provider | Coverage | Cost | Data Quality | Choice |
|----------|----------|------|--------------|--------|
| **USDA FoodData Central** | US-focused, 300k+ foods | Free | Excellent | Primary |
| **Nutritionix** | 800k+ foods, restaurant data | $$ | Excellent | Secondary |
| **Edamam** | Recipe analysis, nutrition | $$$ | Good | Fallback |

**Selected:** USDA FoodData Central (free) + Nutritionix (paid)

**Integration:**
```typescript
interface NutritionData {
  calories: number;
  protein: number; // grams
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number; // mg
  cholesterol: number; // mg
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
}

async function getNutrition(dishName: string): Promise<NutritionData> {
  // 1. Check cache (Redis)
  // 2. Query USDA API
  // 3. Fallback to Nutritionix
  // 4. Cache result (24h TTL)
}
```

---

### 9.4 Agent SDK & Orchestration

**NFR-AGENT-001: Multi-Agent Platform** 🟡 **PENDING**

**Tech Stack:**
```json
{
  "orchestrator": "Temporal.io",
  "agentFramework": "Claude Agent SDK",
  "llmProvider": "Anthropic Claude Opus 4.6",
  "codeGeneration": "Claude Sonnet 4.5",
  "quickTasks": "Claude Haiku 4",
  "taskQueue": "Temporal task queues",
  "stateManagement": "Temporal workflow state",
  "monitoring": "Temporal Web UI + Grafana"
}
```

**Agent Architecture:**
```typescript
interface Agent {
  name: string;
  role: 'architect' | 'developer' | 'tester' | 'reviewer' | 'security' | 'devops';
  llmProvider: 'claude-opus' | 'claude-sonnet' | 'claude-haiku';
  capabilities: string[];
  execute(task: Task): Promise<TaskResult>;
}

interface Task {
  id: string;
  type: 'design' | 'code' | 'test' | 'review' | 'security' | 'deploy';
  input: any;
  dependencies: string[]; // Task IDs
  parallelizable: boolean;
}

interface TaskResult {
  success: boolean;
  output: any;
  artifacts: Artifact[]; // Code files, test results, reports
  nextTasks?: Task[];
}
```

**Workflow Example:**
```typescript
// Temporal workflow for feature implementation
async function implementFeature(requirement: Requirement): Promise<void> {
  // 1. Architect generates design (Claude Opus)
  const design = await architectAgent.generateDesign(requirement);

  // 2. Developer generates code (Claude Sonnet)
  const code = await developerAgent.generateCode(design);

  // 3. Parallel tasks
  const [tests, review, securityScan] = await Promise.all([
    testerAgent.generateTests(code),
    reviewerAgent.reviewCode(code),
    securityAgent.scanCode(code)
  ]);

  // 4. Fix issues (if any)
  if (review.issues.length > 0 || securityScan.vulnerabilities.length > 0) {
    const fixes = await developerAgent.fixIssues(code, [...review.issues, ...securityScan.vulnerabilities]);
    code = fixes;
  }

  // 5. Run tests
  const testResults = await testerAgent.runTests(tests);

  if (!testResults.passed) {
    // Fix failing tests
    const fixes = await developerAgent.fixTests(code, testResults.failures);
    code = fixes;
  }

  // 6. Deploy (DevOps agent)
  await devopsAgent.deploy(code);
}
```

**Performance:**
- Task scheduling latency: <100ms
- Agent response time: 1-30 seconds (LLM dependent)
- Parallel task execution: Up to 10 agents
- Workflow history: Persistent for 30 days

---

### 9.5 Browser Automation

**NFR-BROWSER-001: Browser Automation Stack** 🟡 **PENDING**

**Options:**

| Tool | Pros | Cons | Use Case |
|------|------|------|----------|
| **OpenClaw** | AI-powered, smart selectors | New, less mature | Primary |
| **Playwright** | Reliable, cross-browser | Brittle selectors | Fallback |
| **Puppeteer** | Fast, Chrome-only | Chrome-only | Development |

**Selected Stack:**
```json
{
  "primary": "OpenClaw (AI browser automation)",
  "fallback": "Playwright",
  "headless": true,
  "browser": "Chromium",
  "timeout": 30000,
  "retries": 3
}
```

**Integration:**
```typescript
interface BrowserAgent {
  navigate(url: string): Promise<void>;
  fillForm(fields: Record<string, string>): Promise<void>;
  click(selector: string): Promise<void>;
  extractData(schema: Schema): Promise<any>;
  screenshot(): Promise<Buffer>;
}

// OpenClaw example
const agent = new OpenClawAgent({
  aiModel: 'claude-sonnet-4-5',
  smartSelectors: true, // AI finds elements without CSS selectors
  errorRecovery: true
});

await agent.navigate('https://swiggy.com');
await agent.fillForm({
  search: 'pizza',
  location: 'Bangalore'
});
await agent.click('Add to Cart'); // AI finds button by text
const cart = await agent.extractData(cartSchema);
```

---

## 10. Multi-Agent Development Platform

### 10.1 Architecture

**System Components:**

```
┌─────────────────────────────────────────────────────────────┐
│                     Temporal Orchestrator                    │
│  (Manages agent workflows, state, retry, compensation)      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Architect   │   │  Developer   │   │   Tester     │
│  Agent       │   │  Agent       │   │   Agent      │
│ (Claude Opus)│   │(Claude Sonnet)│  │(Claude Haiku)│
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Reviewer    │   │  Security    │   │   DevOps     │
│  Agent       │   │  Agent       │   │   Agent      │
│(Claude Sonnet)│  │(Claude Sonnet)│  │(Claude Haiku)│
└──────────────┘   └──────────────┘   └──────────────┘
```

**Data Flow:**
```
Requirements (Natural Language)
    ↓
Architect: System Design
    ↓
Developer: Code Generation
    ↓
Tester: Test Case Generation
    ↓
[Parallel Execution]
    ├─→ Reviewer: Code Review
    ├─→ Security: Vulnerability Scan
    └─→ Tester: Test Execution
    ↓
Developer: Fix Issues
    ↓
DevOps: Deploy
```

---

### 10.2 Agent Specifications

**Architect Agent (Claude Opus 4.6):**
- **Capabilities:** System design, tech stack selection, architecture decisions
- **Input:** Requirements (natural language or structured)
- **Output:** Architecture diagrams, component design, API contracts
- **Performance:** 5-30 seconds per design task
- **Quality Metrics:** Design completeness, scalability, maintainability

**Developer Agent (Claude Sonnet 4.5):**
- **Capabilities:** Code generation (TypeScript, React, NestJS), refactoring, debugging
- **Input:** Design documents, task descriptions
- **Output:** Source code files, unit tests
- **Performance:** 3-15 seconds per file
- **Quality Metrics:** Code coverage, complexity, TypeScript strict mode compliance

**Tester Agent (Claude Haiku 4):**
- **Capabilities:** Test case generation, test execution, failure analysis
- **Input:** Source code, API contracts
- **Output:** Jest tests, integration tests, E2E tests
- **Performance:** 2-10 seconds per test suite
- **Quality Metrics:** Coverage (>80%), edge case coverage

**Reviewer Agent (Claude Sonnet 4.5):**
- **Capabilities:** Code review, best practices, performance analysis
- **Input:** Source code
- **Output:** Review comments, refactoring suggestions
- **Performance:** 3-10 seconds per file
- **Quality Metrics:** Issues found, false positive rate

**Security Agent (Claude Sonnet 4.5):**
- **Capabilities:** OWASP Top 10 checks, dependency scanning, SQL injection detection
- **Input:** Source code, dependencies
- **Output:** Vulnerability report, remediation suggestions
- **Performance:** 5-20 seconds per scan
- **Quality Metrics:** Vulnerabilities found, false positive rate

**DevOps Agent (Claude Haiku 4):**
- **Capabilities:** CI/CD pipeline, Docker, Kubernetes, monitoring setup
- **Input:** Deployment requirements, infrastructure specs
- **Output:** CI/CD configs, Dockerfiles, K8s manifests
- **Performance:** 2-10 seconds per config
- **Quality Metrics:** Deployment success rate, pipeline speed

---

### 10.3 LLM Selection Strategy

| Task Type | Complexity | Selected LLM | Reasoning | Cost | Speed |
|-----------|-----------|--------------|-----------|------|-------|
| Architecture design | High | Claude Opus 4.6 | Best reasoning, system thinking | $$$ | Slow |
| Code generation | Medium-High | Claude Sonnet 4.5 | Balanced quality & speed | $$ | Medium |
| Test generation | Medium | Claude Sonnet 4.5 | Good code understanding | $$ | Medium |
| Code review | Medium | Claude Sonnet 4.5 | Pattern recognition | $$ | Medium |
| Security scan | Medium | Claude Sonnet 4.5 | Vulnerability knowledge | $$ | Medium |
| Quick tasks | Low | Claude Haiku 4 | Fast, good for simple tasks | $ | Fast |

**Cost Optimization:**
- Use Haiku for repetitive, simple tasks
- Use Sonnet for most coding tasks
- Reserve Opus for complex architectural decisions
- Estimated cost: $50-200 per feature (depending on complexity)

---

### 10.4 Workflow Orchestration

**Temporal Workflow Definition:**
```typescript
@WorkflowFunction()
async function developFeature(req: FeatureRequest): Promise<FeatureResult> {
  // Step 1: Architecture (sequential)
  const design = await activities.architectFeature(req);

  // Step 2: Code generation (sequential)
  const code = await activities.generateCode(design);

  // Step 3: Quality checks (parallel)
  const [tests, review, security] = await Promise.all([
    activities.generateTests(code),
    activities.reviewCode(code),
    activities.scanSecurity(code)
  ]);

  // Step 4: Fix issues (conditional)
  let finalCode = code;
  const allIssues = [...review.issues, ...security.vulnerabilities];

  if (allIssues.length > 0) {
    finalCode = await activities.fixIssues(code, allIssues);
  }

  // Step 5: Test execution (sequential)
  const testResults = await activities.runTests(tests, finalCode);

  // Step 6: Fix test failures (conditional, with retry)
  let attempts = 0;
  while (!testResults.passed && attempts < 3) {
    finalCode = await activities.fixTestFailures(finalCode, testResults);
    testResults = await activities.runTests(tests, finalCode);
    attempts++;
  }

  // Step 7: Deploy (sequential)
  const deployment = await activities.deploy(finalCode);

  return {
    code: finalCode,
    tests: testResults,
    deployment
  };
}
```

**Error Handling:**
- Automatic retry on transient failures (3 attempts)
- Exponential backoff (100ms, 1s, 5s)
- Compensation on permanent failure (rollback)
- Human escalation after 3 failed attempts

---

### 10.5 Performance & Cost Targets

**Performance:**
- Simple feature (CRUD endpoint): 2-5 minutes
- Medium feature (workflow): 5-15 minutes
- Complex feature (new system): 15-60 minutes
- Parallel agent execution: Up to 10 agents

**Cost per Feature:**
- Simple: $5-20
- Medium: $20-100
- Complex: $100-500

**Quality Metrics:**
- Code coverage: >80%
- Type safety: 100% (TypeScript strict mode)
- Security scan: 0 critical vulnerabilities
- Code review: <5 major issues

---

## Summary

### Implementation Status

| Category | Status | Details |
|----------|--------|---------|
| Mobile App Stack | ✅ Complete | React Native, Redux, Navigation |
| Chrome Extension Stack | ✅ Complete | TypeScript, Platform abstraction |
| Backend Framework | 🔄 In Progress | NestJS structure defined |
| MCP Integration | ✅ Complete | 34 tools across 2 providers |
| LLM Router | ✅ Complete | 3 providers, 4 routing strategies |
| OAuth Implementation | ✅ Complete | Backend + Mobile |
| Databases | 🟡 Pending | PostgreSQL, Redis, Neo4j, Vector DB |
| Search & Events | 🟡 Pending | Elasticsearch, Kafka |
| DevOps | 🔄 In Progress | Docker, CI/CD pending |

### Next Technical Steps

1. **Week 11**: Setup PostgreSQL and Redis
2. **Week 12**: Implement Gateway API endpoints
3. **Week 13**: Setup Elasticsearch and Kafka
4. **Week 14**: Neo4j and Vector DB integration
5. **Week 15**: Temporal workflows
6. **Week 16**: Complete monitoring stack

---

**Document Maintained By:** Agent-DocFix
**Last Updated:** 2026-02-20

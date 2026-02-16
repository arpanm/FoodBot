## 🍽️ Agentic Food Platform (FoodBot)

An AI-Orchestrated, Spec-Driven Restaurant Commerce Platform that combines
conversational UX, multi-LLM reasoning, and deterministic workflow execution
using Temporal.

```
«This is not a chatbot.
It is a goal-driven commerce agent that plans, validates, and executes workflows safely across multiple providers (Mock, Swiggy MCP, Zomato MCP).»
```

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [What This Project Does](#-what-this-project-does)
- [Documentation Guide](#-documentation-guide)
- [Core Principles](#-core-principles)
- [Architecture Overview](#-architecture-overview)
- [Project Setup](#-project-setup)
- [Claude Code Integration](#-claude-code-integration)
- [Testing & Quality](#-testing--quality)
- [Docker Infrastructure](#-docker-infrastructure)
- [Development Workflow](#-development-workflow)
- [Project Structure](#-project-structure)
- [Configuration Files](#-configuration-files)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- Claude Code CLI (for AI-assisted development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd FoodBot

# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp .env.docker .env.docker

# Start Docker infrastructure
pnpm docker:up

# Wait for services to be healthy
pnpm docker:health

# Run tests
pnpm test

# Start development server
cd apps/gateway-api
pnpm start:dev
```

---

## 🎯 What This Project Does

Transforms a natural request like:

```
«"Order dinner for 5 veg and 2 non-veg friends tonight"»
```

into a validated execution workflow:

```
Intent → Planned Workflow → Temporal Execution → MCP Providers → Order Complete
```

---

## 📚 Documentation Guide

This repository includes comprehensive documentation to help you understand, develop, and deploy the FoodBot platform. Below are the key documentation files and when to use them.

### Core Documentation Files

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[README.md](./README.md)** | Project overview, setup, and daily development | Start here for quick start and general information |
| **[REQUIREMENTS.md](./REQUIREMENTS.md)** | Detailed functional & technical requirements | When understanding features, building new features, or writing specs |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System architecture, components, and design decisions | When understanding system design, planning changes, or onboarding |
| **[TODO_CLAUDE_PROMPTS.md](./TODO_CLAUDE_PROMPTS.md)** | Multi-agent development workflow with Claude | When using Claude Code for AI-driven development |
| **[CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md](./CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md)** | Complete guide to using this repo as a template | When setting up a new project or customizing this template |
| **[DOCKER_INFRASTRUCTURE.md](./DOCKER_INFRASTRUCTURE.md)** | Docker services setup and troubleshooting | When working with Docker services or debugging infrastructure |
| **[LICENSE](./LICENSE)** | MIT License - Free to use, modify, and distribute | When using this code or creating derivative works |

### Quick Reference by Use Case

#### 🎯 **I want to understand the system**
1. Start with [README.md](./README.md) - Get overview and quick start
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand system design
3. Review [REQUIREMENTS.md](./REQUIREMENTS.md) - See detailed feature specs

#### 🔨 **I want to build a new feature**
1. Read [REQUIREMENTS.md](./REQUIREMENTS.md) - Understand existing patterns
2. Check [ARCHITECTURE.md](./ARCHITECTURE.md) - Find where feature fits
3. Use [TODO_CLAUDE_PROMPTS.md](./TODO_CLAUDE_PROMPTS.md) - Follow development workflow
4. Let Claude Code handle test generation, code generation, and quality checks

#### 🤖 **I want to use AI-driven development**
1. Read [CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md](./CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md) - Complete setup guide
2. Follow [TODO_CLAUDE_PROMPTS.md](./TODO_CLAUDE_PROMPTS.md) - Phase-by-phase prompts
3. Use Claude Code to automate: requirements → tests → code → review → deploy

#### 🐳 **I want to work with Docker**
1. Read [DOCKER_INFRASTRUCTURE.md](./DOCKER_INFRASTRUCTURE.md) - Complete Docker guide
2. See [README.md](#-docker-infrastructure) - Quick commands
3. Run `pnpm docker:health` - Check service status

#### 📝 **I want to clone this as a template**
1. Read [CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md](./CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md) - Complete customization guide
2. Follow "Customization Guide" section - Step-by-step adaptation
3. Update [REQUIREMENTS.md](./REQUIREMENTS.md) - Your project requirements
4. Update [ARCHITECTURE.md](./ARCHITECTURE.md) - Your system design

### Document Details

#### 📋 [REQUIREMENTS.md](./REQUIREMENTS.md)
**Size**: ~1,800 lines | **Type**: Specification

**What's Inside**:
- Complete functional requirements for Customer Agent, Restaurant Agent, MCP Layer
- Technical requirements (Frontend, Backend, Databases, Integrations)
- Non-functional requirements (Performance, Security, Scalability)
- Detailed data models and API specifications
- Security and compliance requirements

**Best For**:
- Understanding what the system should do
- Writing new requirements
- Validating implementation against specs
- Onboarding new developers
- Planning sprints and features

**Key Sections**:
```
1. Overview
2. System Actors
3. Functional Requirements (Customer Agent, Restaurant Agent, MCP Layer)
4. Technical Requirements
5. Non-Functional Requirements
6. Data Models
7. API Specifications
8. Security Requirements
9. Compliance & Standards
```

#### 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md)
**Size**: ~1,200 lines | **Type**: Technical Design

**What's Inside**:
- High-level system architecture with diagrams
- Component architecture for all services
- Data architecture (all databases and data flows)
- Integration patterns (REST, Kafka, Temporal)
- Security architecture
- Deployment architecture (Kubernetes, Docker)
- Complete technology stack
- Architecture Decision Records (ADRs)

**Best For**:
- Understanding how the system works
- Making architectural decisions
- Planning integrations
- Debugging complex issues
- Technical interviews and presentations

**Key Sections**:
```
1. Architecture Overview (with diagrams)
2. System Context
3. Component Architecture (Frontend, Backend, Temporal, MCP)
4. Data Architecture (PostgreSQL, Redis, Neo4j, Vector DB, etc.)
5. Integration Architecture
6. Security Architecture
7. Deployment Architecture
8. Technology Stack
9. Architecture Decisions (ADRs)
10. Scalability & Performance
```

#### 🤖 [TODO_CLAUDE_PROMPTS.md](./TODO_CLAUDE_PROMPTS.md)
**Size**: ~2,400 lines | **Type**: Development Workflow

**What's Inside**:
- 12-phase multi-agent development workflow
- Specific Claude prompts for each phase
- Sequential and parallel execution strategies
- Quality gates and acceptance criteria
- Complete examples for test generation, code generation, fixing

**Best For**:
- Using Claude Code for development
- AI-driven feature development
- Automated testing and quality checks
- Learning spec-driven development
- Training team on AI-assisted development

**Key Phases**:
```
Phase 1: Requirements Expansion
Phase 2: Architecture & Planning
Phase 3: Test Generation (Parallel)
Phase 4: Code Generation (Parallel)
Phase 5: Test Execution
Phase 6: Bug Fixing (Parallel)
Phase 7: Code Review
Phase 8: Static Analysis
Phase 9: Security Audit
Phase 10: Fix & Refactor (Parallel)
Phase 11: Integration Testing
Phase 12: Documentation (Parallel)
```

**Example Usage**:
```bash
# In Claude Code, use prompts from TODO_CLAUDE_PROMPTS.md
claude chat

# Phase 1: Expand requirements
> "Expand requirements for user profile management (FR-NEW-001)"

# Phase 3: Generate tests
> "Generate comprehensive test suite for user profile management"

# Phase 4: Generate code
> "Generate production code to make all user profile tests pass"

# Phase 7: Review code
> "Perform comprehensive code review"
```

#### 🚀 [CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md](./CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md)
**Size**: ~2,800 lines | **Type**: Complete Usage Guide

**What's Inside**:
- Complete guide to using this repo as a template
- All files and folders explained (.ai/, .claude/, prompt-docs/)
- Multi-agent architecture explained
- Skills, hooks, and MCP servers
- Best practices and troubleshooting
- Language-specific adaptations (Python, Go, etc.)

**Best For**:
- Setting up a new project using this template
- Understanding the complete development workflow
- Learning about Claude Code features (hooks, skills, MCP)
- Customizing for your tech stack
- Training team on the development process

**Key Topics**:
```
1. What is Spec-Driven Development
2. Quick Start (clone and customize)
3. Repository Structure (all files explained)
4. Claude Code Setup (config, rules, hooks)
5. Development Workflow (13 phases)
6. Multi-Agent Architecture
7. Files & Folders Explained
8. Skills & Commands
9. Hooks & Automation
10. MCP Servers
11. Best Practices
12. Customization Guide (adapt for any project)
```

**File/Folder Explanations**:
- `.ai/` - Auto-memory system, stores learnings
- `.claude/` - Claude Code config, rules, hooks
- `prompt-docs/` - AI-generated reports (tracked in git)
- `docs/` - Human-readable documentation
- Hooks: pre-commit, post-commit, on-file-change
- Skills: Custom commands for Claude
- MCP Servers: External integrations (GitHub, Postgres, Slack)

#### 🐳 [DOCKER_INFRASTRUCTURE.md](./DOCKER_INFRASTRUCTURE.md)
**Size**: Referenced | **Type**: Infrastructure Guide

**What's Inside**:
- Complete Docker setup for 11 services
- Service configurations and connections
- Health checks and troubleshooting
- Development and production setups

**Best For**:
- Setting up local development environment
- Debugging Docker issues
- Understanding service dependencies
- Production deployment planning

### Additional Documentation

#### Generated Documentation (prompt-docs/)

The `prompt-docs/` folder contains AI-generated documentation from development sessions:

| File | Purpose |
|------|---------|
| `TASK_BREAKDOWN.md` | Task list generated during planning |
| `TEST_EXECUTION_REPORT.md` | Test results and failures |
| `CODE_REVIEW_REPORT.md` | Code review findings |
| `CODE_ANALYSIS_REPORT.md` | Static analysis results (ESLint, SonarQube) |
| `SECURITY_AUDIT_REPORT.md` | Security vulnerabilities found |
| `FIX_REPORT_*.md` | Bug fixes and issue resolutions |
| `STATUS_UPDATE_*.md` | Daily development status |

These files provide **development history** and **decision tracking**.

#### Configuration Documentation

See [Configuration Files](#-configuration-files) section below for:
- `.claude/config.yaml` - Claude Code settings
- `.env.example` - Environment variables template
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - Linting rules
- `docker-compose.yml` - Docker services

### Documentation Maintenance

**Keeping Docs Up-to-Date**:
- Update [REQUIREMENTS.md](./REQUIREMENTS.md) when adding features
- Update [ARCHITECTURE.md](./ARCHITECTURE.md) when changing design
- Update [TODO_CLAUDE_PROMPTS.md](./TODO_CLAUDE_PROMPTS.md) when improving workflow
- Let Claude Code update documentation automatically
- Review generated docs in `prompt-docs/` regularly

**Documentation Standards**:
- Use clear, concise language
- Include examples and code snippets
- Add diagrams for complex concepts
- Keep table of contents updated
- Version all major documentation changes

---

## 🧠 Core Principles

| Principle | Meaning |
|-----------|---------|
| **LLM-Planned** | AI decides WHAT should happen |
| **Deterministic Execution** | Services decide HOW it happens |
| **Workflow-First** | No direct action without validated workflow |
| **Provider-Agnostic** | Swiggy/Zomato/Mock via MCP |
| **Spec-Driven Development** | Repo is governed by machine-readable specs |
| **Self-Healing SDLC** | Agents generate → test → fix → validate |

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

## 🤖 Multi-LLM Strategy

The platform uses multiple LLMs for different purposes, optimizing for cost and performance.

| Model | Role | Use Case | Cost |
|-------|------|----------|------|
| **Claude (Sonnet)** | Planning + Workflow Generation | Complex reasoning, workflow creation | High |
| **OpenAI (GPT-4)** | Validation + Structured Reasoning | Data validation, structured output | Medium |
| **Gemini (Pro)** | Fast Classification / Cache Routing | Intent classification, quick responses | Low |

### LLM Router Configuration

```bash
# Enable/disable specific models
LLM_CLAUDE_ENABLED=true
LLM_OPENAI_ENABLED=true
LLM_GEMINI_ENABLED=true

# Model Selection Strategy
LLM_SELECTION_STRATEGY=auto  # Options: auto, manual, cost-optimized, performance-optimized

# Fallback Configuration
LLM_FALLBACK_ENABLED=true
LLM_FALLBACK_ORDER=claude,openai,gemini

# Rate Limiting
LLM_CLAUDE_RPM=50
LLM_OPENAI_RPM=60
LLM_GEMINI_RPM=100
```

### Usage Example

```javascript
// packages/llm-router/src/router.js
import { LLMRouter } from '@foodbot/llm-router';

const router = new LLMRouter({
  providers: {
    claude: { apiKey: process.env.ANTHROPIC_API_KEY },
    openai: { apiKey: process.env.OPENAI_API_KEY },
    gemini: { apiKey: process.env.GEMINI_API_KEY },
  },
  strategy: 'auto',
});

// Automatic model selection based on task
const workflow = await router.generateWorkflow({
  prompt: "Order dinner for 5 people",
  complexity: 'high',  // Will use Claude
});

const validation = await router.validateData({
  data: orderData,
  complexity: 'medium',  // Will use OpenAI
});

const intent = await router.classifyIntent({
  prompt: "I want pizza",
  complexity: 'low',  // Will use Gemini
});
```

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

## 🛠️ Project Setup

### 1. Environment Configuration

Create `.env` file in the root directory:

```bash
# LLM Provider Configuration
LLM_CLAUDE_ENABLED=true
LLM_OPENAI_ENABLED=true
LLM_GEMINI_ENABLED=true

# API Keys (NEVER commit these)
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here

# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database Configuration
DATABASE_URL=postgresql://temporal:temporal@localhost:5432/temporal

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=foodbot-redis-password

# Temporal Configuration
TEMPORAL_HOST=localhost
TEMPORAL_PORT=7233
TEMPORAL_NAMESPACE=default

# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200

# Kafka Configuration
KAFKA_BROKER=localhost:29092
KAFKA_ZOOKEEPER=localhost:2181
SCHEMA_REGISTRY_URL=http://localhost:8083
```

### 2. Install Dependencies

```bash
# Install all packages
pnpm install

# Install specific workspace packages
pnpm --filter @apps/gateway-api install
pnpm --filter @apps/customer-app install
pnpm --filter @apps/restaurant-app install
```

### 3. Verify Installation

```bash
# Run linting
pnpm lint

# Run formatting check
pnpm format:check

# Run tests
pnpm test

# Check Docker infrastructure
pnpm docker:up
pnpm docker:health
```

---

## 🤖 Claude Code Integration

This project is optimized for development with **Claude Code** - an AI-powered development assistant.

### Claude Code Configuration Files

```
.claude/
├── config.yaml           # Main Claude Code configuration
├── settings.json         # Editor and workflow settings
├── rules/
│   ├── coding-standards.md      # Code style guidelines
│   ├── security-rules.md        # Security best practices
│   ├── workflow-rules.md        # Development workflow rules
│   └── commit-standards.md      # Git commit conventions
├── skills/
│   ├── test-runner.md          # Test execution skill
│   ├── quality-checker.md      # Quality assurance skill
│   ├── docker-manager.md       # Docker operations skill
│   └── workflow-validator.md   # Workflow validation skill
├── hooks/
│   ├── pre-commit.js           # Pre-commit validation
│   ├── post-commit.js          # Post-commit actions
│   └── on-file-change.js       # File change handling
└── memory/
    └── MEMORY.md               # Persistent context memory
```

### Claude Code Commands

#### Development Commands

```bash
# Format: Ask Claude to perform tasks using natural language

# Code Generation
"Create a new Temporal workflow for order processing"
"Add a REST endpoint for restaurant search"
"Generate unit tests for the LLM router"

# Code Review & Quality
"Review this file for security issues"
"Check code quality and suggest improvements"
"Run all quality checks and fix issues"

# Testing
"Run all tests"
"Run unit tests for the gateway"
"Run E2E tests with Playwright"
"Fix failing tests"

# Docker Operations
"Start Docker infrastructure"
"Check Docker service health"
"View Kafka logs"
"Restart Elasticsearch"

# Git Operations
"Create a commit with my changes"
"Review uncommitted changes"
"Create a pull request"
```

### Claude Code Hooks

The project includes automated hooks that run on specific events:

**Pre-commit Hook** (`.claude/hooks/pre-commit.js`)
- Runs ESLint on staged files
- Runs Prettier format check
- Validates commit message format
- Runs affected unit tests
- Blocks commit if checks fail

**Post-commit Hook** (`.claude/hooks/post-commit.js`)
- Emits telemetry event
- Updates workflow metrics
- Triggers CI/CD pipeline notification

**On-file-change Hook** (`.claude/hooks/on-file-change.js`)
- Validates file against guardrails
- Checks for sensitive data
- Updates type definitions if schema changes
- Runs related tests

### Claude Code Skills

Skills are reusable AI capabilities:

**test-runner** - Execute tests with intelligent selection
```bash
# Usage in Claude Code:
"Run tests" → Automatically selects relevant tests based on changes
```

**quality-checker** - Comprehensive quality analysis
```bash
# Usage in Claude Code:
"Check quality" → Runs ESLint, Prettier, SonarQube, Snyk
```

**docker-manager** - Docker infrastructure operations
```bash
# Usage in Claude Code:
"Manage Docker" → Interactive Docker service management
```

**workflow-validator** - Validate Temporal workflows
```bash
# Usage in Claude Code:
"Validate workflow" → Checks workflow JSON against schema
```

---

## 🧪 Testing & Quality

### Testing Tools

| Tool | Purpose | Command |
|------|---------|---------|
| **Jest** | Unit & Integration Testing | `pnpm test` |
| **Playwright** | E2E Browser Testing | `pnpm test:e2e` |
| **Temporal Testing** | Workflow Testing | `pnpm test:temporal` |

### Test Commands

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test -- path/to/test.test.ts

# Run Temporal workflow tests
pnpm test:temporal
```

### Quality Tools

| Tool | Purpose | Command |
|------|---------|---------|
| **ESLint** | Code Linting | `pnpm lint` |
| **Prettier** | Code Formatting | `pnpm format` |
| **SonarQube** | Code Quality Analysis | `pnpm quality:sonar` |
| **Snyk** | Security Scanning | `pnpm quality:snyk` |
| **CodeRabbit** | AI Code Review | `pnpm quality:coderabbit` |

### Quality Commands

```bash
# Linting
pnpm lint              # Check for lint errors
pnpm lint:fix          # Auto-fix lint errors

# Formatting
pnpm format            # Format all files
pnpm format:check      # Check formatting without changes

# Code Quality
pnpm quality:sonar     # Run SonarQube analysis
pnpm quality:snyk      # Run Snyk security scan
pnpm quality:coderabbit # Run CodeRabbit review

# Run all quality checks
pnpm lint && pnpm format:check && pnpm test:coverage
```

### Test Structure

```
test/
├── examples/
│   ├── unit.test.example.ts          # Unit test template
│   ├── integration.spec.example.ts   # Integration test template
│   └── e2e.spec.example.ts          # E2E test template
├── unit/
│   ├── services/
│   ├── controllers/
│   └── utils/
├── integration/
│   ├── api/
│   ├── database/
│   └── workflows/
├── e2e/
│   ├── customer-flows/
│   ├── restaurant-flows/
│   └── admin-flows/
└── workflows/
    └── temporal.test.ts              # Temporal workflow tests
```

### Test Configuration Files

- `jest.config.cjs` - Jest configuration (unit & integration)
- `playwright.config.cjs` - Playwright configuration (E2E)
- `.eslintrc.json` or `eslint.config.js` - ESLint configuration
- `.prettierrc.cjs` - Prettier configuration

---

## 🐳 Docker Infrastructure

### Services Overview

| Service | Port | Purpose | UI Access |
|---------|------|---------|-----------|
| **PostgreSQL** | 5432 | Temporal database | - |
| **Temporal Server** | 7233 | Workflow orchestration | - |
| **Temporal UI** | 8080 | Workflow visualization | http://localhost:8080 |
| **Redis** | 6379 | Session & caching | - |
| **Redis Commander** | 8081 | Redis management | http://localhost:8081 |
| **Elasticsearch** | 9200 | Search & discovery | - |
| **Kibana** | 5601 | Elasticsearch UI | http://localhost:5601 |
| **Zookeeper** | 2181 | Kafka coordination | - |
| **Kafka** | 9092, 29092 | Event streaming | - |
| **Kafka UI** | 8082 | Kafka management | http://localhost:8082 |
| **Schema Registry** | 8083 | Schema management | - |

### Docker Commands

```bash
# Start all services
pnpm docker:up

# Start with development overrides (debug logging, more resources)
pnpm docker:dev

# Stop all services
pnpm docker:down

# View logs (all services)
pnpm docker:logs

# View logs (specific service)
docker-compose logs -f temporal
docker-compose logs -f kafka

# Check service status
pnpm docker:ps

# Check health of all services
pnpm docker:health

# Clean up (remove volumes)
pnpm docker:clean

# Restart a specific service
docker-compose restart temporal
docker-compose restart redis
```

### Docker Health Check

Run the automated health check script:

```bash
./scripts/docker-health-check.sh
```

Or use the npm command:

```bash
pnpm docker:health
```

### Connecting to Services

**Node.js Connection Examples:**

```javascript
// Temporal Client
import { Connection, Client } from '@temporalio/client';

const connection = await Connection.connect({
  address: 'localhost:7233',
});

const client = new Client({ connection });

// Redis Client
import { createClient } from 'redis';

const redis = createClient({
  url: 'redis://:foodbot-redis-password@localhost:6379'
});

await redis.connect();

// Elasticsearch Client
import { Client } from '@elastic/elasticsearch';

const esClient = new Client({
  node: 'http://localhost:9200'
});

// Kafka Producer
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  brokers: ['localhost:29092'],
  clientId: 'foodbot-app',
});

const producer = kafka.producer();
await producer.connect();
```

### Docker Troubleshooting

See [DOCKER_INFRASTRUCTURE.md](./DOCKER_INFRASTRUCTURE.md) for detailed troubleshooting.

Common issues:

```bash
# Service won't start
docker-compose logs <service-name>

# Port already in use
docker-compose down
lsof -ti:7233 | xargs kill  # Kill process on port 7233

# Clean restart
docker-compose down -v  # Remove volumes
docker-compose up -d

# Check resource usage
docker stats
```

---

## 🔄 Development Workflow

### Daily Development Flow

```bash
# 1. Start Docker infrastructure
pnpm docker:up
pnpm docker:health

# 2. Start development server
cd apps/gateway-api
pnpm start:dev

# 3. Make changes to code

# 4. Run tests for changed code
pnpm test

# 5. Check code quality
pnpm lint
pnpm format:check

# 6. Fix issues automatically
pnpm lint:fix
pnpm format

# 7. Commit changes (pre-commit hooks run automatically)
git add .
git commit -m "feat: add new feature"

# 8. Push changes
git push
```

### Using Claude Code for Development

```bash
# Start Claude Code session
claude

# Example interactions:
> "Add a new endpoint for restaurant search"
> "Run tests for the changes I made"
> "Check if my code follows best practices"
> "Create a commit with my changes"
> "Review my code for security issues"
```

### Workflow Validation

Before committing workflow changes:

```bash
# Validate workflow JSON against schema
node tools/workflow/validateWorkflow.js path/to/workflow.json

# Test workflow execution
pnpm test:temporal
```

### Code Review Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Code formatted (`pnpm format:check`)
- [ ] Security scan clean (`pnpm quality:snyk`)
- [ ] Documentation updated
- [ ] Workflow validated (if applicable)
- [ ] Docker services healthy (`pnpm docker:health`)

---

## 📁 Project Structure

```
.ai/                           # AI control plane
├── config.yaml               # AI orchestration config
├── context/                  # Product & architecture context
├── skills/                   # Engineering agents
├── plugins/                  # Execution bindings
├── schema/                   # Workflow contracts
└── memory/                   # Architectural decisions

.claude/                       # Claude Code configuration
├── config.yaml               # Main configuration
├── settings.json             # Editor settings
├── rules/                    # Development rules
├── skills/                   # Reusable skills
├── hooks/                    # Git hooks & automations
└── memory/                   # Persistent context

apps/                          # Application layer
├── customer-app/             # Capacitor + React customer app
├── restaurant-app/           # Restaurant owner console
└── gateway-api/              # NestJS agent gateway

services/                      # Service layer
├── orchestration/            # Temporal workers
├── search-orchestrator/      # Spring Boot (ES + Kafka)
└── mcp-adapter/              # MCP provider integrations

packages/                      # Shared packages
├── llm-router/               # Multi-LLM routing
├── workflow-schema/          # Workflow type definitions
└── ui-schema/                # UI component schemas

tools/                         # Executable automation
├── workflow/                 # Workflow utilities
├── observability/            # Telemetry & logging
├── utils/                    # Helper utilities
└── quality/                  # Quality scanning tools

infra/                         # Infrastructure
├── docker/                   # Docker configurations
├── temporal/                 # Temporal configs
└── k8s/                      # Kubernetes manifests (future)

test/                          # Test suites
├── examples/                 # Test templates
├── unit/                     # Unit tests
├── integration/              # Integration tests
├── e2e/                      # End-to-end tests
└── workflows/                # Temporal workflow tests

scripts/                       # Utility scripts
├── docker-health-check.sh    # Docker health checker
└── setup-dev.sh              # Development setup

docs/                          # Documentation
├── architecture/             # Architecture diagrams
├── api/                      # API documentation
└── workflows/                # Workflow documentation

prompt-docs/                   # AI-generated session docs
└── README.md                 # Development artifacts from Claude sessions
```

---

## ⚙️ Configuration Files

### Root Configuration

| File | Purpose |
|------|---------|
| `package.json` | Main package configuration, scripts, dependencies |
| `.env` | Environment variables (do not commit) |
| `.env.docker` | Docker service configuration |
| `.env.example` | Environment variable template |
| `tsconfig.json` | TypeScript configuration |
| `tsconfig.node.json` | TypeScript config for Node.js tools |

### Code Quality

| File | Purpose |
|------|---------|
| `eslint.config.js` | ESLint 9.x flat configuration |
| `.prettierrc.cjs` | Prettier formatting rules |
| `jest.config.cjs` | Jest testing configuration |
| `playwright.config.cjs` | Playwright E2E configuration |
| `sonar-project.properties` | SonarQube project settings |

### Docker

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Main Docker service definitions |
| `docker-compose.dev.yml` | Development overrides |
| `.dockerignore` | Docker build exclusions |
| `Dockerfile` | Application container (future) |

### Claude Code

| File | Purpose |
|------|---------|
| `.claude/config.yaml` | Claude Code main configuration |
| `.claude/settings.json` | Editor and workflow settings |
| `.claude/rules/*.md` | Development rules and standards |
| `.claude/skills/*.md` | Reusable AI skills |
| `.claude/hooks/*.js` | Automated hooks |

### AI Control Plane

| File | Purpose |
|------|---------|
| `.ai/config.yaml` | AI orchestration configuration |
| `.ai/context/*.md` | Product context documents |
| `.ai/skills/*.md` | AI agent capabilities |
| `.ai/schema/*.json` | Workflow JSON schemas |

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Module Resolution Errors

```bash
Error: Cannot find module '@/...'
```

**Solution:**
- Ensure `tsconfig.json` has correct path mappings
- Run `pnpm install` to ensure all dependencies are installed
- Check that workspace references are correct in `package.json`

#### 2. ESLint Configuration Errors

```bash
Error: ESLint configuration in .eslintrc.js is invalid
```

**Solution:**
- We use ESLint 9.x flat config (`eslint.config.js`)
- Do not create `.eslintrc.js` files
- Configuration uses `projectService: true` for TypeScript

#### 3. Jest Test Failures

```bash
Error: Can't find a root directory while resolving a config file path
```

**Solution:**
- Use `--selectProjects` flag instead of `--projects`
- Commands in `package.json` already use correct flags
- Ensure `jest.config.cjs` (not `.js`) exists

#### 4. Docker Service Not Starting

```bash
Error: Service temporal unhealthy
```

**Solution:**
```bash
# Check logs
docker-compose logs temporal

# Restart service
docker-compose restart temporal

# Clean restart
docker-compose down -v
docker-compose up -d
```

#### 5. Pre-commit Hook Blocking Commit

```bash
Error: Pre-commit hook failed
```

**Solution:**
```bash
# Fix linting errors
pnpm lint:fix

# Fix formatting
pnpm format

# Run tests
pnpm test

# Try commit again
git commit -m "your message"
```

#### 6. TypeScript Errors

```bash
Error: Cannot read file 'tsconfig.json'
```

**Solution:**
- Ensure `tsconfig.json` exists in root
- Check that file is valid JSON
- Run `pnpm install` to ensure TypeScript is installed

### Getting Help

1. **Check Documentation:**
   - [DOCKER_INFRASTRUCTURE.md](./DOCKER_INFRASTRUCTURE.md) - Docker setup details
   - [.claude/rules/](..claude/rules/) - Development guidelines
   - [.ai/context/](./ai/context/) - Product context

2. **Use Claude Code:**
   ```bash
   claude
   > "Help me debug this error: [paste error]"
   > "Why is my Docker service failing?"
   > "How do I run integration tests?"
   ```

3. **Check Service Health:**
   ```bash
   pnpm docker:health
   docker-compose ps
   docker-compose logs <service>
   ```

4. **Run Diagnostics:**
   ```bash
   pnpm lint
   pnpm test
   pnpm docker:health
   ```

---

## ⚙️ Local Development

### GitHub Codespaces (Recommended)

This project is optimized for GitHub Codespaces with pre-configured environment.

### Local Setup

```bash
# Install dependencies
pnpm install

# Start Docker infrastructure
pnpm docker:up

# Wait for services to be healthy
pnpm docker:health

# Start gateway API
cd apps/gateway-api
pnpm start:dev
```

### Development URLs

- **Gateway API:** http://localhost:3000
- **Temporal UI:** http://localhost:8080
- **Redis Commander:** http://localhost:8081
- **Kafka UI:** http://localhost:8082
- **Kibana:** http://localhost:5601

---

## 🌐 Required Services

| Service | Purpose | Status |
|---------|---------|--------|
| **Temporal** | Durable orchestration | ✅ Configured |
| **Redis** | Session + personalization | ✅ Configured |
| **GraphDB** | Preference graph | 🚧 Planned |
| **Elasticsearch** | Discovery/search | ✅ Configured |
| **Kafka** | Index updates | ✅ Configured |
| **NestJS** | Agent gateway | 🚧 In Progress |
| **Spring Boot** | MCP aggregator | 🚧 Planned |

### Service Dependencies

```mermaid
graph TD
    A[NestJS Gateway] --> B[Temporal]
    B --> C[PostgreSQL]
    A --> D[Redis]
    A --> E[Elasticsearch]
    E --> F[Kafka]
    F --> G[Zookeeper]
    B --> H[Temporal Workers]
    H --> I[MCP Adapter]
    I --> J[External Providers]
```

---

## 🔌 MCP Provider Support

Model Context Protocol (MCP) providers enable external integrations for food ordering.

| Provider | Status | Configuration |
|----------|--------|---------------|
| **Mock Provider** | ✅ Enabled | Default for development |
| **Swiggy MCP** | 🚧 Configurable | Set `MCP_SWIGGY_ENABLED=true` |
| **Zomato MCP** | 🚧 Configurable | Set `MCP_ZOMATO_ENABLED=true` |
| **UberEats MCP** | 📋 Planned | Future integration |
| **DoorDash MCP** | 📋 Planned | Future integration |

### MCP Configuration

Add to `.env`:

```bash
# MCP Provider Configuration
MCP_MOCK_ENABLED=true
MCP_SWIGGY_ENABLED=false
MCP_ZOMATO_ENABLED=false

# Swiggy MCP Settings
SWIGGY_MCP_URL=https://api.swiggy.com/mcp
SWIGGY_API_KEY=your_swiggy_key

# Zomato MCP Settings
ZOMATO_MCP_URL=https://api.zomato.com/mcp
ZOMATO_API_KEY=your_zomato_key
```

### MCP Adapter Usage

```javascript
// services/mcp-adapter/src/mcpClient.js
import { MCPClient } from '@foodbot/mcp-adapter';

const client = new MCPClient({
  providers: ['mock', 'swiggy', 'zomato'],
  fallbackStrategy: 'round-robin',
});

// Execute with automatic fallback
const result = await client.execute('searchRestaurants', {
  location: 'Bangalore',
  cuisine: 'Italian',
});
```

---

## 📊 Observability

The platform emits comprehensive telemetry for monitoring and debugging.

### Telemetry Categories

| Category | Metrics | Tools |
|----------|---------|-------|
| **Workflow Lifecycle** | Start, complete, failure, duration | Temporal UI |
| **LLM Usage** | Model selection, tokens, latency, cost | Custom dashboard |
| **Provider Performance** | Response time, error rate, fallback count | Kafka + Elasticsearch |
| **Conversion Funnels** | User journey, drop-off points | Analytics |
| **System Health** | CPU, memory, connections | Docker stats |

### Emitting Events

```javascript
// tools/observability/emitEvent.js
import { emitEvent } from '@foodbot/observability';

// Emit custom events
await emitEvent('order.created', {
  orderId: '12345',
  userId: 'user-abc',
  provider: 'swiggy',
  amount: 599,
});

// Emit metrics
await emitEvent('llm.usage', {
  model: 'claude',
  tokens: 1500,
  latency: 2300,
  cost: 0.045,
});
```

### Viewing Telemetry

**Temporal Workflows:**
```bash
# Open Temporal UI
open http://localhost:8080

# Or view via CLI
temporal workflow list
temporal workflow describe -w <workflow-id>
```

**Kafka Events:**
```bash
# Open Kafka UI
open http://localhost:8082

# Or consume via CLI
kafka-console-consumer --bootstrap-server localhost:29092 \
  --topic foodbot.events --from-beginning
```

**Elasticsearch Queries:**
```bash
# Open Kibana
open http://localhost:5601

# Or query via API
curl -X GET "localhost:9200/foodbot-events/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{ "query": { "match_all": {} } }'
```

### Log Aggregation

Logs are structured in JSON format:

```json
{
  "timestamp": "2026-02-17T10:30:00Z",
  "level": "info",
  "service": "gateway-api",
  "message": "Workflow started",
  "context": {
    "workflowId": "wf-12345",
    "userId": "user-abc"
  }
}
```

View logs:

```bash
# All services
pnpm docker:logs

# Specific service
docker-compose logs -f gateway-api

# With grep
docker-compose logs gateway-api | grep ERROR
```

---

## 🧪 AI-Driven SDLC Pipeline

Claude Code agents automate the entire software development lifecycle.

### SDLC Stages

```mermaid
graph LR
    A[Requirement] --> B[Expansion]
    B --> C[Architecture]
    C --> D[Task Planning]
    D --> E[Code Generation]
    E --> F[Test Creation]
    F --> G[Quality Analysis]
    G --> H{Pass?}
    H -->|No| I[Self-Healing]
    I --> E
    H -->|Yes| J[Release]
```

| Stage | Automated Actions | Tools Used |
|-------|------------------|------------|
| **Requirement Expansion** | Parse user intent, identify dependencies | Claude |
| **Architecture Mapping** | Map to existing patterns, identify files | File search, Grep |
| **Task Planning** | Break down into subtasks, estimate effort | TodoWrite |
| **Code Generation** | Write code following project conventions | Read, Edit, Write |
| **Test Creation** | Generate unit, integration, E2E tests | Jest, Playwright |
| **Quality Analysis** | Lint, format, security scan | ESLint, Prettier, Snyk |
| **Self-Healing** | Auto-fix errors, retry failed tests | ESLint --fix, Test runner |
| **Release Validation** | Verify all checks pass, create commit | Git hooks |

### Using AI-Driven Development

```bash
# Start Claude Code session
claude

# Example: Full feature development
> "Add a new feature for scheduled orders"

# Claude will automatically:
# 1. Understand requirements
# 2. Plan architecture changes
# 3. Create task breakdown
# 4. Generate code files
# 5. Write tests
# 6. Run quality checks
# 7. Fix any issues
# 8. Create commit
```

### Self-Healing Capabilities

When errors occur, Claude automatically:

1. **Lint Errors** → Runs `pnpm lint:fix`
2. **Format Errors** → Runs `pnpm format`
3. **Test Failures** → Analyzes failure, modifies code, retries
4. **Type Errors** → Adds type annotations, fixes signatures
5. **Security Issues** → Refactors unsafe code, adds validation

### Guardrails

AI agents respect project guardrails:

```javascript
// tools/utils/guardrails.js
const PROTECTED_PATHS = [
  '.git',           // Never modify git internals
  'node_modules',   // Never edit dependencies
  '.env',           // Never read/write secrets
  'secrets',        // Never access secret files
];
```

### Monitoring AI Actions

All AI actions are logged:

```bash
# View AI action logs
tail -f .claude/logs/actions.log

# View decision history
cat .claude/memory/MEMORY.md
```

---

## 🔑 Environment Configuration

### Creating .env Files

**Never commit `.env` files to version control!**

```bash
# Copy example files
cp .env.example .env
cp .env.docker .env.docker

# Edit with your actual values
nano .env
```

### Complete .env Template

```bash
# ============================================
# APPLICATION CONFIGURATION
# ============================================
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
APP_NAME=FoodBot

# ============================================
# LLM PROVIDER CONFIGURATION
# ============================================
LLM_CLAUDE_ENABLED=true
LLM_OPENAI_ENABLED=true
LLM_GEMINI_ENABLED=true

# API Keys (NEVER COMMIT THESE!)
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GEMINI_API_KEY=xxxxx

# LLM Router Configuration
LLM_SELECTION_STRATEGY=auto
LLM_FALLBACK_ENABLED=true
LLM_FALLBACK_ORDER=claude,openai,gemini
LLM_CLAUDE_RPM=50
LLM_OPENAI_RPM=60
LLM_GEMINI_RPM=100

# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://temporal:temporal@localhost:5432/temporal
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ============================================
# REDIS CONFIGURATION
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=foodbot-redis-password
REDIS_DB=0
REDIS_TTL=3600

# ============================================
# TEMPORAL CONFIGURATION
# ============================================
TEMPORAL_HOST=localhost
TEMPORAL_PORT=7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=foodbot-tasks

# ============================================
# ELASTICSEARCH CONFIGURATION
# ============================================
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_PREFIX=foodbot
ELASTICSEARCH_MAX_RETRIES=3

# ============================================
# KAFKA CONFIGURATION
# ============================================
KAFKA_BROKER=localhost:29092
KAFKA_CLIENT_ID=foodbot-app
KAFKA_ZOOKEEPER=localhost:2181
SCHEMA_REGISTRY_URL=http://localhost:8083

# Kafka Topics
KAFKA_TOPIC_ORDERS=foodbot.orders
KAFKA_TOPIC_EVENTS=foodbot.events
KAFKA_TOPIC_METRICS=foodbot.metrics

# ============================================
# MCP PROVIDER CONFIGURATION
# ============================================
MCP_MOCK_ENABLED=true
MCP_SWIGGY_ENABLED=false
MCP_ZOMATO_ENABLED=false

# Swiggy Configuration
SWIGGY_MCP_URL=https://api.swiggy.com/mcp
SWIGGY_API_KEY=your_swiggy_key
SWIGGY_TIMEOUT=30000

# Zomato Configuration
ZOMATO_MCP_URL=https://api.zomato.com/mcp
ZOMATO_API_KEY=your_zomato_key
ZOMATO_TIMEOUT=30000

# ============================================
# SECURITY CONFIGURATION
# ============================================
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
API_RATE_LIMIT=100

# ============================================
# OBSERVABILITY CONFIGURATION
# ============================================
TELEMETRY_ENABLED=true
SENTRY_DSN=
DATADOG_API_KEY=

# ============================================
# FEATURE FLAGS
# ============================================
FEATURE_AI_PLANNING=true
FEATURE_MULTI_PROVIDER=true
FEATURE_PERSONALIZATION=false
```

### Environment-Specific Files

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `.env.example` | Template with dummy values | ✅ Yes |
| `.env` | Local development secrets | ❌ No |
| `.env.docker` | Docker service config | ✅ Yes (no secrets) |
| `.env.production` | Production secrets | ❌ No |
| `.env.test` | Test environment | ✅ Yes (if no secrets) |

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

## 🤝 Contribution Model

### Contribution Guidelines

This repository follows spec-driven development principles.

#### Before Contributing

1. **Read Project Context:**
   - [.ai/context/](./ai/context/) - Understand product vision
   - [.claude/rules/](./claude/rules/) - Follow coding standards
   - [README.md](./README.md) - This document

2. **Set Up Environment:**
   ```bash
   pnpm install
   pnpm docker:up
   pnpm docker:health
   pnpm test
   ```

3. **Verify Quality Checks Pass:**
   ```bash
   pnpm lint
   pnpm format:check
   pnpm test:coverage
   ```

#### Contribution Process

```mermaid
graph TD
    A[Issue/Feature Request] --> B[Spec Update]
    B --> C[Architecture Review]
    C --> D[Implementation]
    D --> E[Tests]
    E --> F[Quality Checks]
    F --> G{Pass?}
    G -->|No| D
    G -->|Yes| H[PR Review]
    H --> I[Merge]
```

**Step-by-Step:**

1. **Spec Updates Before Code**
   - Update `.ai/schema/` if changing workflows
   - Update `.claude/rules/` if adding conventions
   - Document in `.ai/context/` if architectural change

2. **Workflow-Safe Implementations**
   - All business logic in Temporal workflows
   - Validate workflow JSON against schema
   - Test workflow execution with `pnpm test:temporal`

3. **Test-First Automation**
   - Write tests before implementation (TDD)
   - Minimum 80% code coverage
   - Include unit, integration, and E2E tests

4. **Observable Behavior**
   - Emit telemetry events for key actions
   - Add structured logging
   - Update observability dashboards

#### Code Standards

**Required Checks:**

```bash
# Must pass before commit
pnpm lint           # 0 errors
pnpm format:check   # All files formatted
pnpm test           # All tests passing
pnpm quality:snyk   # No high/critical vulnerabilities
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```bash
git commit -m "feat(gateway): add restaurant search endpoint"
git commit -m "fix(workflow): handle order cancellation edge case"
git commit -m "test(llm-router): add unit tests for model selection"
```

#### Pull Request Process

1. **Create Feature Branch:**
   ```bash
   git checkout -b feat/restaurant-search
   ```

2. **Make Changes + Tests:**
   ```bash
   # Make changes
   # Write tests
   pnpm test
   ```

3. **Run Quality Checks:**
   ```bash
   pnpm lint:fix
   pnpm format
   pnpm test:coverage
   ```

4. **Commit with Pre-commit Hooks:**
   ```bash
   git add .
   git commit -m "feat(search): add restaurant search"
   # Pre-commit hooks run automatically
   ```

5. **Push and Create PR:**
   ```bash
   git push origin feat/restaurant-search
   # Create PR on GitHub
   ```

6. **PR Review Checklist:**
   - [ ] Spec updates included (if applicable)
   - [ ] Tests added/updated
   - [ ] All quality checks passing
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   - [ ] Workflow validated (if applicable)

#### Using Claude Code for Contributions

```bash
# Let Claude handle the entire flow
claude

> "I want to contribute a new feature for X"
> "Create a PR for the changes I made"
```

Claude will:
- Guide you through spec updates
- Generate code following project conventions
- Write comprehensive tests
- Run quality checks
- Fix issues automatically
- Create well-formatted commit
- Generate PR description

#### Code Review Focus Areas

**Reviewers check:**
1. **Architecture** - Follows spec-driven patterns
2. **Testing** - Adequate coverage, meaningful tests
3. **Security** - No vulnerabilities, proper validation
4. **Performance** - Efficient algorithms, proper caching
5. **Observability** - Proper logging and telemetry
6. **Documentation** - Clear comments, updated docs

---

### 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

**What this means:**
- ✅ You can use this code for any purpose (personal, commercial, etc.)
- ✅ You can modify and distribute the code
- ✅ You can create private or public forks
- ✅ No warranty or liability provided
- ⚠️ You must include the original copyright notice

**Using as a Template:**
This repository is designed to be used as a template for your own projects. Feel free to:
- Clone and customize for your needs
- Remove FoodBot-specific features
- Keep the structure and patterns
- Share your improvements back to the community

---

## 🔒 Security Best Practices

### Security Measures

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **API Security** | Rate limiting, API keys | NestJS guards |
| **Authentication** | JWT tokens | Passport.js |
| **Authorization** | Role-based access control | Custom middleware |
| **Data Validation** | Input sanitization | class-validator |
| **Secret Management** | Environment variables | .env (gitignored) |
| **Dependency Scanning** | Vulnerability detection | Snyk |
| **Code Analysis** | Static security analysis | SonarQube |

### Security Checklist

**Before Deployment:**

```bash
# Run security scan
pnpm quality:snyk

# Check for exposed secrets
git secrets --scan

# Verify environment variables
grep -r "API_KEY" . --exclude-dir=node_modules

# Review dependencies
pnpm audit

# Check Docker image vulnerabilities
docker scan foodbot-app
```

**Never Commit:**
- API keys or secrets
- `.env` files
- Private keys or certificates
- User data or PII
- Database credentials

**Always:**
- Use environment variables for secrets
- Validate all user input
- Sanitize data before database queries
- Use parameterized queries (prevent SQL injection)
- Implement rate limiting
- Log security events
- Keep dependencies updated

### Reporting Security Issues

**Do not create public issues for security vulnerabilities.**

Email: security@foodbot.com (replace with actual)

---

## ⚡ Performance Optimization

### Performance Strategies

| Strategy | Implementation | Impact |
|----------|----------------|--------|
| **Caching** | Redis for sessions, API responses | 80% latency reduction |
| **Indexing** | Elasticsearch for search | Sub-second queries |
| **Connection Pooling** | PostgreSQL, Redis pools | Reduced overhead |
| **Async Processing** | Kafka for events | Non-blocking operations |
| **Workflow Optimization** | Temporal parallel activities | Faster execution |
| **LLM Caching** | Cache model responses | Cost reduction |

### Performance Monitoring

```bash
# Monitor Docker resource usage
docker stats

# Check service response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health

# View Temporal workflow durations
open http://localhost:8080

# Check Elasticsearch performance
curl -X GET "localhost:9200/_cat/indices?v"

# Monitor Redis memory
docker exec foodbot-redis redis-cli INFO memory
```

### Optimization Tips

**Database:**
```sql
-- Add indexes for frequent queries
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);

-- Use connection pooling
-- Configured in .env: DATABASE_POOL_MAX=10
```

**Redis Caching:**
```javascript
// Cache expensive operations
const cacheKey = `restaurant:${restaurantId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const restaurant = await db.getRestaurant(restaurantId);
await redis.setex(cacheKey, 3600, JSON.stringify(restaurant));
```

**Temporal Workflows:**
```javascript
// Parallelize independent activities
const [restaurants, user, offers] = await Promise.all([
  workflow.executeActivity('searchRestaurants'),
  workflow.executeActivity('getUserPreferences'),
  workflow.executeActivity('getActiveOffers'),
]);
```

**LLM Response Caching:**
```javascript
// Cache common LLM responses
const cacheKey = `llm:${hash(prompt)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return cached; // Save API cost
}
```

---

## 🚢 Deployment

### Production Deployment (Coming Soon)

**Prerequisites:**
- Kubernetes cluster
- Docker registry
- CI/CD pipeline (GitHub Actions)
- Production environment variables

**Deployment Steps:**

```bash
# Build Docker images
docker build -t foodbot/gateway:latest apps/gateway-api

# Push to registry
docker push foodbot/gateway:latest

# Deploy to Kubernetes
kubectl apply -f infra/k8s/

# Verify deployment
kubectl get pods
kubectl logs -f deployment/gateway-api
```

### CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test:coverage
      - run: pnpm quality:snyk

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: kubectl apply -f infra/k8s/
```

---

## 📚 API Documentation

### Gateway API Endpoints

**Base URL:** `http://localhost:3000/api/v1`

#### Agent Execution

```http
POST /agent/execute
Content-Type: application/json

{
  "userId": "user-123",
  "prompt": "Order dinner for 5 people"
}

Response:
{
  "jobId": "job-abc-123",
  "status": "pending"
}
```

#### Job Status

```http
GET /agent/jobs/:jobId

Response:
{
  "jobId": "job-abc-123",
  "status": "running",
  "progress": 0.6,
  "currentStep": "Executing workflow",
  "result": null
}
```

#### Restaurant Search

```http
POST /restaurants/search
Content-Type: application/json

{
  "location": "Bangalore",
  "cuisine": "Italian",
  "filters": {
    "rating": 4.0,
    "priceRange": "$$"
  }
}

Response:
{
  "restaurants": [...],
  "total": 45,
  "page": 1
}
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Execute agent
curl -X POST http://localhost:3000/api/v1/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "prompt": "Order pizza"}'

# Check job status
curl http://localhost:3000/api/v1/agent/jobs/job-abc-123
```

---

## ❓ FAQ

### General Questions

**Q: What makes this different from a regular chatbot?**
A: FoodBot is an agentic system that plans and executes workflows, not just responds to messages. It uses multi-LLM reasoning, validates plans against schemas, and executes through Temporal with automatic retries and compensation.

**Q: Why use multiple LLMs?**
A: Different models excel at different tasks. Claude for complex planning, OpenAI for validation, Gemini for fast classification. This optimizes cost and performance.

**Q: What is Temporal?**
A: Temporal is a durable workflow orchestration engine. It ensures workflows complete reliably even if services restart, with automatic retries and state management.

### Technical Questions

**Q: How do I add a new MCP provider?**
A:
1. Create provider adapter in `services/mcp-adapter/src/providers/`
2. Register in `mcpClient.js`
3. Add configuration to `.env`
4. Test with mock data first

**Q: How do I debug a failing workflow?**
A:
```bash
# View in Temporal UI
open http://localhost:8080

# Or use CLI
temporal workflow describe -w <workflow-id>
temporal workflow show -w <workflow-id>
```

**Q: How do I run only affected tests?**
A: Jest automatically runs tests related to changed files. Or:
```bash
pnpm test -- --changedSince=main
pnpm test -- path/to/changed/file.test.ts
```

**Q: How do I add a new quality check?**
A:
1. Add tool to `tools/quality/`
2. Add npm script to `package.json`
3. Add to pre-commit hook if desired
4. Document in README

### Development Questions

**Q: Can I develop without Docker?**
A: Technically yes, but you'll need to install Temporal, Redis, Elasticsearch, Kafka locally. Docker is highly recommended.

**Q: How do I use Claude Code without the CLI?**
A: You can use Claude via web interface, but the CLI provides better integration with git hooks, local files, and automation.

**Q: Where are workflow schemas defined?**
A: In `packages/workflow-schema/src/schemas/`. All workflows must validate against these JSON schemas.

**Q: How do I add custom Claude Code skills?**
A: Create a new markdown file in `.claude/skills/` with the skill definition. Claude will automatically load it.

---

## 🔭 Future Extensions

### Roadmap

**Phase 1 (Current):**
- ✅ Multi-LLM routing
- ✅ Temporal workflow orchestration
- ✅ Docker infrastructure
- ✅ Claude Code integration
- 🚧 NestJS gateway API
- 🚧 Mock MCP provider

**Phase 2:**
- [ ] Customer app (Capacitor + React)
- [ ] Restaurant owner app
- [ ] Swiggy MCP integration
- [ ] Zomato MCP integration
- [ ] User authentication & authorization
- [ ] Payment processing

**Phase 3:**
- [ ] Personalization engine (GraphDB)
- [ ] Learning from user preferences
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Real-time order tracking

**Phase 4:**
- [ ] Cross-vertical commerce agents
- [ ] Marketplace orchestration
- [ ] Multi-domain agent federation
- [ ] Agent marketplace
- [ ] White-label platform

### Contributing to Roadmap

Have ideas? Open an issue with:
- **Use case:** What problem does it solve?
- **Impact:** How many users benefit?
- **Effort:** Complexity estimate
- **Dependencies:** What's needed first?

---

## 🧠 Philosophy

### From Instructions to Intent

**Traditional Systems:**
```
User → Command → Direct Execution → Result
```
*Problem: User must know exact commands, no flexibility, no understanding*

**Agentic Systems:**
```
User → Natural Intent → AI Planning → Validated Workflow → Orchestrated Execution → Result
```
*Solution: System understands intent, plans safely, executes reliably*

### Key Principles

1. **Intent Over Instructions**
   - Users express goals, not steps
   - "Order dinner for 5 people" vs "Search restaurants, filter by veg, add to cart..."

2. **Planning Over Reacting**
   - AI creates complete workflow before execution
   - Validates feasibility and safety
   - Generates execution plan

3. **Orchestration Over Direct Calls**
   - All actions through Temporal workflows
   - Automatic retries, compensation, state management
   - Observable, debuggable, reliable

4. **Multi-Agent Collaboration**
   - Different LLMs for different tasks
   - Specialized agents for specific domains
   - Coordinated through workflow orchestration

5. **Spec-Driven Development**
   - Machine-readable specifications
   - Self-validating workflows
   - AI-generated code follows patterns

**This shift is the foundation of Agentic Software.**

---

## 📞 Support & Community

### Getting Help

1. **Documentation:**
   - [README.md](./README.md) (you are here)
   - [DOCKER_INFRASTRUCTURE.md](./DOCKER_INFRASTRUCTURE.md)
   - [.claude/rules/](./claude/rules/)
   - [.ai/context/](./ai/context/)

2. **Issues:**
   - Bug reports: Use GitHub Issues
   - Feature requests: Use GitHub Issues with `enhancement` label
   - Security issues: Email security@foodbot.com

3. **Claude Code:**
   ```bash
   claude
   > "Help me with [your question]"
   ```

### Project Links

- **GitHub:** [Repository URL]
- **Documentation:** [Docs URL]
- **API Docs:** [API URL]
- **Status Page:** [Status URL]

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 FoodBot Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Full License**: See [LICENSE](./LICENSE) file for complete details.

### Using This Repository

**Free to Use**:
- ✅ Personal projects
- ✅ Commercial projects
- ✅ Educational purposes
- ✅ Modify and redistribute
- ✅ Private and public use

**Requirements**:
- Include the MIT License and copyright notice
- Provide attribution to original authors

**Template Usage**:
This repository is explicitly designed as a **template** for spec-driven development. You are encouraged to:
- Clone and customize for your projects
- Remove FoodBot-specific code
- Adapt for any tech stack
- Share improvements with the community

**Attribution Example**:
```markdown
This project uses the FoodBot template:
https://github.com/[your-org]/FoodBot

Licensed under MIT License
```

---

## 🙏 Acknowledgments

Built with:
- [Claude Code](https://claude.com/claude-code) - AI-powered development
- [Temporal](https://temporal.io/) - Workflow orchestration
- [NestJS](https://nestjs.com/) - Backend framework
- [React](https://react.dev/) - Frontend framework
- [Capacitor](https://capacitorjs.com/) - Mobile framework

---

**Made with ❤️ and AI by the FoodBot team**

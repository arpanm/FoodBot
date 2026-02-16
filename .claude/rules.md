# 📋 Claude Code Rules - FoodBot Project

These rules govern how Claude operates within this project. All code generation,
modifications, and decisions must comply with these rules.

---

## 🎯 Core Principles

### 1. Spec-Driven Development (SDD)

```
MUST: Read specifications before generating code
MUST: Validate against architecture.md
MUST: Ensure traceability to requirements
MUST NOT: Invent requirements or features
```

**Location:** [.ai/context/product-spec.md](../.ai/context/product-spec.md)

---

### 2. LLM Planning, Deterministic Execution

```
LLMs decide WHAT to do
Services decide HOW to do it safely

MUST NOT: Allow LLMs to directly execute actions
MUST NOT: Allow LLMs to mutate state directly
MUST: Route all execution through Temporal workflows
MUST: Validate all LLM outputs against schemas
```

**Reference:**
[.ai/context/architecture.md](../.ai/context/architecture.md#llm-usage-philosophy)

---

### 3. Workflow-First Architecture

```
MUST: Generate workflow JSON before execution
MUST: Validate against workflow.schema.json
MUST: Never bypass Temporal orchestration
MUST: Include retry, compensation, and observability
```

**Schema:**
[.ai/schema/workflow.schema.json](../.ai/schema/workflow.schema.json)

---

## 🚫 Forbidden Actions

### Absolute Prohibitions

```yaml
NEVER:
  # Security
  - Hardcode API keys, secrets, or credentials
  - Use eval() or similar dynamic code execution
  - Expose sensitive data in logs or errors
  - Disable security checks or validations

  # Architecture
  - Bypass Temporal workflows for business logic
  - Allow LLMs to directly call infrastructure
  - Modify contracts without versioning
  - Create circular dependencies

  # Code Quality
  - Generate code without tests
  - Skip linting or formatting
  - Leave TODO/FIXME in production code
  - Commit commented-out code blocks

  # Safety
  - Modify protected paths without confirmation:
      • /.ai/ • /packages/contracts/ • /.claude/hooks/ • /.git/
  - Delete files without explicit instruction
  - Force-push to main/master branches
  - Disable guardrails or quality gates
```

---

## ✅ Required Practices

### Code Generation

```yaml
MUST:
  - Follow existing patterns in codebase
  - Include comprehensive tests (unit + contract)
  - Add observability hooks (logging, metrics, tracing)
  - Document public APIs and complex logic
  - Use TypeScript strict mode
  - Handle errors gracefully with domain errors

MUST NOT:
  - Generate duplicate code (check for existing implementations)
  - Create files in arbitrary locations
  - Use any/unknown types in TypeScript
  - Mix business logic with infrastructure concerns
```

**Example Structure:**

```typescript
// ✅ CORRECT
apps/gateway-api/
├── src/
│   ├── controllers/     # HTTP layer
│   ├── services/        # Business logic
│   ├── domain/          # Domain models
│   ├── infrastructure/  # External integrations
│   └── contracts/       # API contracts

// ❌ WRONG
apps/gateway-api/
└── src/
    └── index.ts         # Everything mixed together
```

---

### Testing Requirements

```yaml
Unit Tests:
  - MUST: Cover all public methods
  - MUST: Test happy paths and error cases
  - MUST: Mock external dependencies
  - Target: 80%+ coverage

Contract Tests:
  - MUST: Validate API contracts
  - MUST: Test request/response schemas
  - MUST: Verify error responses

Integration Tests (Services Only):
  - SHOULD: Test end-to-end flows
  - SHOULD: Use test containers
  - SHOULD: Validate Temporal workflows
```

---

### Temporal Workflow Rules

```yaml
Workflows MUST:
  - Be deterministic (no random, no Date.now())
  - Use activities for side effects
  - Include retry policies
  - Define compensation actions
  - Emit observability events
  - Handle timeouts gracefully

Activities MUST:
  - Be idempotent
  - Accept retries safely
  - Validate inputs
  - Return structured errors
  - Log with correlation IDs
```

**Example:**

```typescript
// ✅ CORRECT Workflow
@workflow()
export async function orderFoodWorkflow(input: OrderInput): Promise<OrderResult> {
  const { userId, prompt } = input;

  // 1. Enrich with personalization
  const context = await activities.enrichContext(userId);

  // 2. Generate workflow via LLM (with retry)
  const workflowDef = await activities.generateWorkflow({ prompt, context });

  // 3. Validate workflow
  await activities.validateWorkflow(workflowDef);

  // 4. Execute steps with compensation
  return await executeStepsWithCompensation(workflowDef.steps);
}

// ❌ WRONG - Non-deterministic
@workflow()
export async function badWorkflow() {
  const now = Date.now(); // ❌ Non-deterministic!
  const random = Math.random(); // ❌ Non-deterministic!
  await fetch('http://api'); // ❌ Side effect in workflow!
}
```

---

### Error Handling Standard

```yaml
Error Hierarchy: DomainError → ApplicationError → APIError

Rules:
  - MUST: Use domain-specific error types
  - MUST: Include error codes and context
  - MUST: Log errors with correlation IDs
  - MUST NOT: Expose internal details to users
  - MUST NOT: Throw generic Error instances
```

**Example:**

```typescript
// ✅ CORRECT
class OrderNotFoundError extends DomainError {
  constructor(orderId: string) {
    super({
      code: 'ORDER_NOT_FOUND',
      message: `Order ${orderId} not found`,
      context: { orderId },
      userMessage: "We couldn't find your order",
    });
  }
}

// ❌ WRONG
throw new Error('Order not found'); // Too generic
```

---

## 🏗️ Architecture Constraints

### Layer Boundaries

```yaml
Controllers:
  MAY: Handle HTTP concerns (request/response)
  MAY: Validate input schemas
  MAY: Call service layer
  MUST NOT: Contain business logic
  MUST NOT: Access infrastructure directly

Services:
  MAY: Implement business logic
  MAY: Coordinate between domain and infrastructure
  MAY: Call other services
  MUST NOT: Handle HTTP concerns
  MUST NOT: Access databases directly

Domain:
  MAY: Define models and business rules
  MUST NOT: Depend on infrastructure
  MUST NOT: Depend on services

Infrastructure:
  MAY: Integrate with external systems
  MAY: Manage database connections
  MUST NOT: Contain business logic
  MUST: Be mockable for testing
```

---

### Dependency Rules

```yaml
Allowed Dependencies:
  apps/* → packages/* services/* → packages/* packages/* → NO OTHER PACKAGES
  (self-contained)

Forbidden Dependencies:
  apps/* ⊗ services/* packages/* ⊗ apps/* packages/* ⊗ services/* Circular
  dependencies ⊗ (always forbidden)
```

---

## 🔌 MCP Integration Rules

```yaml
MCP Providers:
  - MUST: Be accessed through adapters only
  - MUST: Have fallback providers configured
  - MUST: Implement circuit breakers
  - MUST: Emit provider metrics
  - MUST NOT: Be called directly from workflows

Adapter Pattern:
  MCPAdapter (Interface) ↓ ProviderAdapter (Swiggy/Zomato/Mock) ↓ MCP Server
  (External)

Configuration:
  - MUST: Support enable/disable per provider
  - MUST: Define priority order
  - MUST: Handle provider failures gracefully
```

---

## 📊 Observability Requirements

```yaml
Every Service MUST Emit:
  - Structured logs (JSON)
  - Metrics (duration, count, errors)
  - Traces (distributed tracing)
  - Events (business events)

Log Format:
  {
    'timestamp': 'ISO8601',
    'level': 'info|warn|error',
    'correlationId': 'uuid',
    'service': 'gateway-api',
    'event': 'order_created',
    'context': { ... },
  }

Required Metrics:
  - API latency (p50, p95, p99)
  - Error rates
  - LLM token usage
  - Workflow execution time
  - Cache hit rates
```

---

## 🔒 Security Requirements

```yaml
Environment Variables:
  - MUST: Use .env for local development
  - MUST: Use secrets manager for production
  - MUST NOT: Commit .env files
  - MUST: Provide .env.example

API Keys:
  - MUST: Validate before use
  - MUST: Rotate regularly
  - MUST: Log usage (but not keys!)
  - MUST NOT: Expose in responses

Input Validation:
  - MUST: Validate all user input
  - MUST: Sanitize for XSS
  - MUST: Use parameterized queries (no SQL injection)
  - MUST: Validate file uploads

Dependencies:
  - MUST: Run security scans (Snyk)
  - MUST: Update vulnerable packages
  - MUST: Review new dependencies
  - MUST NOT: Use deprecated packages
```

---

## 📝 Documentation Standards

```yaml
Code Documentation:
  - MUST: Document public APIs (JSDoc/TSDoc)
  - MUST: Explain "why" not "what" in comments
  - SHOULD: Add examples for complex functions
  - MUST NOT: Add obvious comments

Project Documentation:
  - MUST: Update architecture.md for major changes
  - MUST: Update decision.md for architectural decisions
  - SHOULD: Create ADRs for significant choices
  - MUST NOT: Create documentation unless requested
```

---

## 🚀 Deployment Rules

```yaml
Pre-Deployment Checks:
  - MUST: Pass all quality gates
  - MUST: Readiness score ≥ 0.85
  - MUST: No high/critical security issues
  - MUST: All tests passing
  - MUST: Build successful

Deployment Process:
  - MUST: Use blue-green or canary deployments
  - MUST: Have rollback plan
  - MUST: Monitor post-deployment
  - MUST NOT: Deploy directly to production
  - MUST NOT: Deploy on Fridays (unless urgent)

Database Migrations:
  - MUST: Be backward compatible
  - MUST: Have rollback scripts
  - MUST: Test in staging first
  - MUST NOT: Drop tables without explicit approval
```

---

## 🤝 Collaboration Rules

```yaml
Git Workflow:
  - MUST: Use conventional commits
  - MUST: Create feature branches (feat/*, fix/*)
  - MUST: Squash commits before merging
  - MUST NOT: Commit directly to main
  - MUST NOT: Force-push to shared branches

Code Review:
  - MUST: Request review before merging
  - SHOULD: Address all review comments
  - MUST: Run CI checks before requesting review
  - MUST NOT: Merge own PRs

Communication:
  - SHOULD: Ask for clarification when uncertain
  - SHOULD: Propose alternatives with trade-offs
  - MUST: Respect user decisions
  - MUST NOT: Make breaking changes without discussion
```

---

## 🎨 Code Style

```yaml
General:
  - Use TypeScript strict mode
  - Use functional programming where appropriate
  - Prefer composition over inheritance
  - Keep functions small (<50 lines)
  - Limit file size (<500 lines)

Naming:
  - camelCase for variables and functions
  - PascalCase for classes and types
  - SCREAMING_SNAKE_CASE for constants
  - Descriptive names (no single letters except loops)

Formatting:
  - Run Prettier automatically
  - 2-space indentation
  - Single quotes for strings
  - Trailing commas
  - Line length: 100 characters
```

---

## 🔧 Hook Integration

```yaml
When hooks execute:
  - MUST: Respect hook results
  - MUST NOT: Bypass blocking hooks
  - MUST: Emit telemetry on hook execution
  - SHOULD: Auto-fix issues when possible

Self-Healing:
  - MUST: Limit iterations (max 3)
  - MUST: Escalate after max iterations
  - MUST: Log all healing attempts
  - MUST NOT: Silently fail
```

---

## 📚 References

- **Product Spec:**
  [.ai/context/product-spec.md](../.ai/context/product-spec.md)
- **Architecture:**
  [.ai/context/architecture.md](../.ai/context/architecture.md)
- **Coding Standards:**
  [.ai/prompts/coding-standard.md](../.ai/prompts/coding-standard.md)
- **Workflow Rules:**
  [.ai/orchestration/workflow-rules.md](../.ai/orchestration/workflow-rules.md)
- **Multi-Agent SDLC:**
  [.ai/orchestration/claude-multi-agent.md](../.ai/orchestration/claude-multi-agent.md)

---

## ⚖️ Conflict Resolution

When rules conflict:

1. Security rules > All other rules
2. Architecture rules > Implementation rules
3. Spec requirements > General best practices
4. User instructions > Default behaviors

---

## 🔄 Rule Updates

Rules are **living documents** and may be updated as the project evolves.

When updating rules:

- Document reason in [.ai/memory/decision.md](../.ai/memory/decision.md)
- Notify team of changes
- Update related documentation
- Version control all changes

---

**Last Updated:** 2024-02-17 **Version:** 1.0.0 **Status:** ✅ Active

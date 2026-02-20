# Agent Workflow Guide - Managing Tasks with AI Agents

**Last Updated:** 2026-02-20
**Purpose:** Guide for using AI agents to execute tasks, requirements, and architecture changes

---

## 📋 Table of Contents

- [Overview](#overview)
- [Initiating Agent Groups for Pending Tasks](#initiating-agent-groups-for-pending-tasks)
- [Adding New Tasks/Requirements](#adding-new-tasksrequirements)
- [Changing Requirements/Architecture and Creating Tasks](#changing-requirementsarchitecture-and-creating-tasks)
- [Agent Types and Capabilities](#agent-types-and-capabilities)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Overview

FoodBot project management can leverage AI agents for:
- **Parallel task execution** - Run multiple tasks simultaneously
- **Code generation** - Implement requirements automatically
- **Documentation** - Generate architecture and requirement docs
- **Testing** - Create comprehensive test suites
- **Refactoring** - Update existing code and architecture

---

## Initiating Agent Groups for Pending Tasks

### Step 1: Review Pending Tasks

Check the current pending tasks:

```bash
# View all pending tasks
ls .claude/project-management/tasks/pending/

# Or view the summary
cat .claude/project-management/PENDING_TASKS_SUMMARY.md
```

**Current Pending Tasks (7 major groups):**
1. Gateway API Implementation (17 subtasks, P0 Critical)
2. MCP Order Placement (P0 Critical)
3. Complete MCP Test Coverage (P0 Critical)
4. Docker Build Automation (P1 High)
5. Kubernetes Deployment (P1 High)
6. Search Enhancements (P2 Medium)
7. Event Streaming Enhancements (P2 Medium)

---

### Step 2: Choose Tasks for Parallel Execution

**Good Candidates for Parallel Execution:**
- Independent modules (auth, restaurant, dish modules)
- Different layers (frontend, backend, infrastructure)
- Test generation tasks
- Documentation tasks

**Poor Candidates for Parallel Execution:**
- Tasks with dependencies (OAuth must complete before MCP order placement)
- Database migration tasks (sequential by nature)
- Deployment tasks (need specific order)

---

### Step 3: Initiate Agent Group

#### Option A: Using Claude Code (Recommended)

**For Gateway API Implementation (17 subtasks):**

```
@claude I need to implement the Gateway API with 17 subtasks in parallel.
See @.claude/project-management/tasks/pending/gateway-api-implementation-tasks.md

Please create 4 agent groups to work on these in parallel:
- Agent Group 1: Authentication modules (tasks 1-3)
- Agent Group 2: Core API modules (tasks 4-7)
- Agent Group 3: Additional modules (tasks 8-11)
- Agent Group 4: Infrastructure & testing (tasks 12-17)

Each agent should:
1. Read the task requirements
2. Generate the code following @.claude/rules/development-guardrails.md
3. Write comprehensive tests (80% coverage minimum)
4. Update the task status to completed when done

Run all 4 agents in parallel.
```

#### Option B: Using Task Tool Programmatically

```typescript
// Example: Initiate parallel agents for Gateway API
const agents = [
  {
    name: 'auth-agent',
    tasks: ['JWT auth service', 'Auth guards', 'RBAC'],
    prompt: 'Implement authentication modules from gateway-api-implementation-tasks.md tasks 1-3',
  },
  {
    name: 'core-api-agent',
    tasks: ['Restaurant CRUD', 'Dish CRUD', 'Cart module', 'Order module'],
    prompt: 'Implement core API modules from gateway-api-implementation-tasks.md tasks 4-7',
  },
  {
    name: 'additional-api-agent',
    tasks: ['Payment module', 'User module', 'Admin module', 'Search proxy'],
    prompt: 'Implement additional API modules from gateway-api-implementation-tasks.md tasks 8-11',
  },
  {
    name: 'infra-test-agent',
    tasks: ['DB setup', 'Redis integration', 'Exception filters', 'Tests'],
    prompt: 'Implement infrastructure and testing from gateway-api-implementation-tasks.md tasks 12-17',
  },
];

// Launch all agents in parallel
agents.forEach(agent => {
  console.log(`Launching ${agent.name}...`);
  // Claude Code will handle parallel execution
});
```

---

### Step 4: Monitor Agent Progress

**Check agent status:**

```bash
# View agent logs (if running in background)
tail -f /tmp/agent-*.log

# Check for completed outputs
ls -la .claude/project-management/tasks/completed/

# Check for agent-generated summaries
ls -la .claude/project-management/archive/prompt-docs/output-summary/
```

**Agent Status Indicators:**
- ✅ Complete: Agent finished successfully
- 🚧 In Progress: Agent still working
- ⚠️ Warning: Agent encountered issues but continued
- ❌ Failed: Agent stopped with error

---

### Step 5: Review Agent Outputs

After agents complete:

```bash
# 1. Check generated code
git status
git diff

# 2. Review agent summary reports
cat .claude/project-management/archive/prompt-docs/output-summary/AGENT_*_SUMMARY.md

# 3. Verify test coverage
pnpm test:coverage

# 4. Update task status
mv .claude/project-management/tasks/pending/TASK-XXX-*.md \
   .claude/project-management/tasks/completed/
```

---

### Step 6: Consolidate and Validate

**Validation Checklist:**
- [ ] All code compiles without errors
- [ ] All tests pass (unit + integration)
- [ ] Test coverage ≥ 80%
- [ ] ESLint passes with no warnings
- [ ] Code follows development guardrails
- [ ] API endpoints work end-to-end
- [ ] Documentation updated
- [ ] Tasks moved to completed/

**If validation fails:**
1. Identify failing agent's output
2. Review error logs
3. Fix issues manually or re-run agent with corrections
4. Re-validate

---

## Adding New Tasks/Requirements

### Adding a New Task

#### Step 1: Determine Task Type

**Task Categories:**
- `completed/` - Finished tasks
- `in-progress/` - Currently being worked on
- `pending/` - Ready to start, high priority
- `backlog/` - Future tasks
- `technical-debt/` - Refactoring, cleanup
- `bug-fixes/` - Bug reports

#### Step 2: Create Task File

**Option A: Using Template**

```bash
cd .claude/project-management/tasks/pending

# Copy template
cp ../templates/task-template.md TASK-NEW-001-my-new-task.md

# Edit the file
code TASK-NEW-001-my-new-task.md
```

**Option B: Using Helper Script (if exists)**

```bash
cd .claude/project-management
./scripts/new-item.sh task my-new-task
```

#### Step 3: Fill Task Details

**Required Fields:**

```markdown
# TASK-NEW-001: My New Task

**Status:** Pending
**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Estimated Effort:** X days/hours
**Dependencies:** TASK-XXX-YYY (if any)
**Blocking:** What this blocks (if applicable)

## Description

[Clear description of what needs to be done]

## Requirements

**Functional Requirements:**
- FR-XX-YYY-ZZZ: [Link to requirement](../requirements/{category}/FR-XX-YYY-ZZZ-name.md)

**Technical Requirements:**
- TR-XXX: [Description]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Implementation Plan

1. Step 1
2. Step 2
3. Step 3

## Testing Strategy

- Unit tests for X
- Integration tests for Y
- E2E tests for Z

## Definition of Done

- [ ] Code implemented and reviewed
- [ ] Tests written and passing
- [ ] Test coverage ≥ 80%
- [ ] Documentation updated
- [ ] PR merged to main
```

#### Step 4: Link to Requirements

Always link tasks to requirements:

```markdown
## Related Requirements

- [FR-CA-ORDER-001](../requirements/customer-agent/FR-CA-ORDER-001-order-placement.md)
- [TR-BACKEND-001](../requirements/technical-requirements.md#tr-backend-001)

## Related Architecture

- [Gateway API](../architecture/components/gateway-api.md)
- [Order Workflow](../architecture/integration/temporal-workflows-architecture-consolidated.md)
```

#### Step 5: Update Index

Add task to [tasks/index.md](./tasks/index.md):

```markdown
### 🟡 Pending Tasks (8)

| ID | Title | Priority | Estimate | Dependencies |
|----|-------|----------|----------|--------------|
| [TASK-NEW-001](./pending/TASK-NEW-001-my-new-task.md) | My New Task | P1 | 3 days | None |
```

---

### Adding a New Requirement

#### Step 1: Determine Requirement Category

**Categories:**
- `customer-agent/` - Customer-facing features
- `restaurant-agent/` - Restaurant owner features
- `mcp-layer/` - MCP integration
- `llm/` - LLM orchestration
- `workflows/` - Temporal workflows
- `gateway-api/` - Backend API
- `integrations/` - External integrations

#### Step 2: Assign Requirement ID

**Format:** `FR-{COMPONENT}-{CATEGORY}-{NUMBER}-{slug}.md`

**Examples:**
- `FR-CA-ORDER-004-scheduled-orders.md` (Customer Agent, Order, #4)
- `FR-RA-ANALYTICS-006-profit-margins.md` (Restaurant Agent, Analytics, #6)
- `FR-MCP-AUTH-002-refresh-tokens.md` (MCP Layer, Auth, #2)

#### Step 3: Create Requirement File

```bash
cd .claude/project-management/requirements/{category}

# Copy template
cp ../templates/requirement-template.md FR-XX-YYY-001-new-feature.md

# Edit
code FR-XX-YYY-001-new-feature.md
```

#### Step 4: Fill Requirement Details

```markdown
# FR-CA-ORDER-004: Scheduled Orders

**ID:** FR-CA-ORDER-004
**Component:** Customer Agent
**Category:** Order Management
**Status:** 📝 Planned
**Priority:** P2 (Medium)
**Created:** 2026-02-20
**Updated:** 2026-02-20

---

## Overview

Allow customers to schedule orders for future delivery times.

## User Stories

**As a** customer
**I want to** schedule an order for later delivery
**So that** I can plan meals in advance

## Functional Requirements

### FR-CA-ORDER-004.1: Schedule Selection
- User can select future date and time
- System validates delivery time is within restaurant hours
- System shows availability for selected time

### FR-CA-ORDER-004.2: Order Modification
- User can modify scheduled orders up to 1 hour before delivery
- System sends notifications when modification window closes

## Acceptance Criteria

- [ ] User can select date/time when placing order
- [ ] System validates selected time is valid
- [ ] Order is placed and scheduled correctly
- [ ] User receives confirmation with scheduled time
- [ ] Restaurant receives order at appropriate time
- [ ] User can modify order before cutoff

## Technical Specifications

**Database:**
- Add `scheduledFor` timestamp field to orders table
- Add index on `scheduledFor` for efficient queries

**API Endpoints:**
- `POST /orders/scheduled` - Create scheduled order
- `PATCH /orders/:id/schedule` - Modify scheduled time
- `GET /orders/scheduled` - Get user's scheduled orders

**Workflow:**
- Temporal workflow for scheduled order processing
- Scheduled signal to trigger order at specified time

## Dependencies

- **Requires:** FR-CA-ORDER-001 (Order Placement)
- **Blocks:** None
- **Related:** FR-RA-ORDER-001 (Order Management)

## Non-Functional Requirements

- System must handle time zones correctly
- Scheduled orders must trigger exactly at specified time (±1 min)
- Performance: Support 10,000+ scheduled orders

## Implementation Status

**Status:** Not Implemented
**Progress:** 0%

## Testing Requirements

- Unit tests for scheduling logic
- Integration tests for workflow triggers
- E2E tests for user flow
- Load tests for 10,000 concurrent scheduled orders

## Open Questions

- Q: How far in advance can users schedule?
  A: [To be decided - suggest 7 days max]

- Q: What happens if restaurant closes unexpectedly?
  A: [To be decided - suggest notify user and offer refund]
```

#### Step 5: Create Associated Tasks

After creating requirement, create implementation tasks:

```markdown
## Related Tasks

- [ ] [TASK-ORDER-001](../../tasks/pending/TASK-ORDER-001-scheduled-orders-backend.md) - Backend implementation
- [ ] [TASK-ORDER-002](../../tasks/pending/TASK-ORDER-002-scheduled-orders-frontend.md) - Frontend implementation
- [ ] [TASK-ORDER-003](../../tasks/pending/TASK-ORDER-003-scheduled-orders-tests.md) - Test suite
```

#### Step 6: Update Requirements Index

Add to [requirements/index.md](./requirements/index.md):

```markdown
### Customer Agent Requirements (16 files)

| ID | Title | Status | Priority |
|----|-------|--------|----------|
| FR-CA-ORDER-004 | Scheduled Orders | 📝 Planned | P2 |
```

---

## Changing Requirements/Architecture and Creating Tasks

### Scenario 1: Modify Existing Requirement

#### Step 1: Update Requirement File

```bash
# Open requirement
code .claude/project-management/requirements/customer-agent/FR-CA-ORDER-001-order-placement.md
```

#### Step 2: Document Changes

```markdown
## Change Log

### 2026-02-20 - Added Support for Multiple Payment Methods

**Changes:**
- Added Apple Pay support
- Added Google Pay support
- Updated payment validation logic

**Impact:**
- Requires updates to payment module
- New API endpoints needed
- Frontend UI changes required

**Breaking Changes:**
- Payment request format changed
- Old payment API deprecated

## Updated Acceptance Criteria

- [x] Support credit card payments
- [x] Support UPI payments
- [x] Support wallet payments
- [ ] Support Apple Pay (NEW)
- [ ] Support Google Pay (NEW)
```

#### Step 3: Create Update Tasks

Create tasks for implementing the changes:

```bash
cd .claude/project-management/tasks/pending

# Create task for backend changes
cat > TASK-PAYMENT-001-multiple-payment-methods.md << 'EOF'
# TASK-PAYMENT-001: Implement Multiple Payment Methods

**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 5 days
**Related Requirement:** FR-CA-ORDER-001 (updated 2026-02-20)

## Description

Implement Apple Pay and Google Pay support in addition to existing payment methods.

## Changes Required

### Backend (2 days)
- Add Apple Pay integration
- Add Google Pay integration
- Update payment validation
- Add new API endpoints

### Frontend (2 days)
- Add Apple Pay button
- Add Google Pay button
- Update payment form
- Handle new payment flows

### Testing (1 day)
- Unit tests for new payment methods
- Integration tests with payment gateways
- E2E tests for user flows

## Acceptance Criteria

- [ ] Apple Pay integration complete
- [ ] Google Pay integration complete
- [ ] API endpoints updated
- [ ] Frontend UI updated
- [ ] Tests passing with 80% coverage
- [ ] Documentation updated

## Breaking Changes

- Old payment API format deprecated
- Migration guide needed for existing integrations
EOF
```

#### Step 4: Update Architecture (if needed)

If changes affect architecture:

```bash
code .claude/project-management/architecture/components/gateway-api.md
```

Add architecture changes:

```markdown
## Recent Changes (2026-02-20)

### Multiple Payment Method Support

**Changes:**
- Added `PaymentStrategyFactory` for multiple payment providers
- Implemented Strategy pattern for payment processing
- Added Apple Pay and Google Pay integrations

**Architecture Diagram:**

```
PaymentController
    ↓
PaymentService
    ↓
PaymentStrategyFactory
    ↓
├─► CardPaymentStrategy
├─► UPIPaymentStrategy
├─► WalletPaymentStrategy
├─► ApplePayStrategy (NEW)
└─► GooglePayStrategy (NEW)
```

**Impact:**
- Improved extensibility
- Easier to add new payment methods
- Better error handling per provider
```

---

### Scenario 2: Update Architecture and Generate Tasks

#### Step 1: Identify Architecture Change

**Example:** Adding Neo4j for personalized recommendations

#### Step 2: Update Architecture Documentation

```bash
# Create new architecture doc
cd .claude/project-management/architecture/data
cat > neo4j-preference-graph.md << 'EOF'
# Neo4j User Preference Graph

**Component:** Data Layer - Graph Database
**Status:** 📝 Planned
**Priority:** P2 (Medium)
**Created:** 2026-02-20

## Overview

Implement Neo4j graph database for storing and querying user preferences, restaurant relationships, and personalized recommendations.

## Architecture

### Nodes

**User:**
- userId
- preferences
- dietaryRestrictions

**Restaurant:**
- restaurantId
- cuisine
- priceRange
- location

**Dish:**
- dishId
- name
- category
- ingredients

### Relationships

- (User)-[:ORDERED]->(Dish)
- (User)-[:LIKED]->(Restaurant)
- (User)-[:PREFERS]->(Cuisine)
- (Restaurant)-[:SERVES]->(Dish)
- (User)-[:SIMILAR_TO]->(User)

### Queries

1. **Personalized Recommendations:**
   ```cypher
   MATCH (u:User {id: $userId})-[:LIKED]->(r:Restaurant)-[:SERVES]->(d:Dish)
   RETURN d
   LIMIT 10
   ```

2. **Collaborative Filtering:**
   ```cypher
   MATCH (u:User {id: $userId})-[:SIMILAR_TO]->(similar:User)-[:LIKED]->(r:Restaurant)
   WHERE NOT (u)-[:LIKED]->(r)
   RETURN r
   LIMIT 10
   ```

## Integration

- Kafka events update graph in real-time
- GraphQL API for querying recommendations
- Cache recommendations in Redis (15min TTL)

## Performance Requirements

- Query response < 100ms
- Support 1M+ users
- Support 100K+ restaurants

EOF
```

#### Step 3: Create Implementation Tasks

Generate tasks from architecture:

```bash
cd .claude/project-management/tasks/pending

# Task 1: Neo4j Setup
cat > TASK-NEO4J-001-setup-database.md << 'EOF'
# TASK-NEO4J-001: Setup Neo4j Database

**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 3 days
**Related Architecture:** [Neo4j Preference Graph](../../architecture/data/neo4j-preference-graph.md)

## Objective

Set up Neo4j database for user preference graph.

## Tasks

### Infrastructure (1 day)
- [ ] Add Neo4j to docker-compose.yml
- [ ] Configure Neo4j settings
- [ ] Set up authentication
- [ ] Configure backups

### Schema (1 day)
- [ ] Define node types (User, Restaurant, Dish)
- [ ] Define relationships
- [ ] Create indexes
- [ ] Add constraints

### Integration (1 day)
- [ ] Add Neo4j driver to gateway-api
- [ ] Create Neo4j service wrapper
- [ ] Add error handling
- [ ] Add health checks

## Acceptance Criteria

- [ ] Neo4j running in Docker
- [ ] Schema defined and validated
- [ ] Gateway API can connect
- [ ] Health checks passing
EOF

# Task 2: Kafka Integration
cat > TASK-NEO4J-002-kafka-integration.md << 'EOF'
# TASK-NEO4J-002: Kafka Event Integration

**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 4 days
**Dependencies:** TASK-NEO4J-001

## Objective

Integrate Kafka events to update Neo4j graph in real-time.

## Tasks

### Event Consumers (2 days)
- [ ] Order events → create (User)-[:ORDERED]->(Dish)
- [ ] Review events → create (User)-[:LIKED]->(Restaurant)
- [ ] User preference events → update preferences

### Graph Updates (1 day)
- [ ] Batch processing for performance
- [ ] Transaction handling
- [ ] Error recovery
- [ ] Duplicate prevention

### Monitoring (1 day)
- [ ] Event processing metrics
- [ ] Graph update latency
- [ ] Error rates
- [ ] Data consistency checks

EOF

# Task 3: Recommendation API
cat > TASK-NEO4J-003-recommendation-api.md << 'EOF'
# TASK-NEO4J-003: Recommendation API

**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 5 days
**Dependencies:** TASK-NEO4J-002

## Objective

Implement GraphQL API for querying personalized recommendations.

## Tasks

### API Endpoints (2 days)
- [ ] GET /recommendations/restaurants
- [ ] GET /recommendations/dishes
- [ ] GET /users/:id/similar

### Query Optimization (2 days)
- [ ] Cypher query optimization
- [ ] Result caching (Redis)
- [ ] Pagination
- [ ] Filtering

### Testing (1 day)
- [ ] Unit tests for queries
- [ ] Integration tests with Neo4j
- [ ] Performance tests (<100ms)
- [ ] Load tests

EOF
```

#### Step 4: Update Requirements

Link architecture to requirements:

```bash
cd .claude/project-management/requirements/llm
cat > FR-DATA-GRAPH-001-user-preference-graph.md << 'EOF'
# FR-DATA-GRAPH-001: User Preference Graph (Neo4j)

**ID:** FR-DATA-GRAPH-001
**Component:** Data Layer
**Category:** Graph Database
**Status:** 📝 Planned
**Priority:** P2 (Medium)

## Overview

Implement Neo4j graph database for personalized recommendations based on user preferences and behavior.

## Related Architecture

- [Neo4j Preference Graph](../../architecture/data/neo4j-preference-graph.md)

## Related Tasks

- [TASK-NEO4J-001](../../tasks/pending/TASK-NEO4J-001-setup-database.md) - Database setup
- [TASK-NEO4J-002](../../tasks/pending/TASK-NEO4J-002-kafka-integration.md) - Kafka integration
- [TASK-NEO4J-003](../../tasks/pending/TASK-NEO4J-003-recommendation-api.md) - API implementation

## Acceptance Criteria

- [ ] Neo4j running and integrated
- [ ] Real-time updates from Kafka
- [ ] Recommendation API functional
- [ ] Query performance <100ms
- [ ] Tests passing
EOF
```

---

## Agent Types and Capabilities

### Available Agent Types:

1. **Bash Agent**
   - Execute terminal commands
   - Git operations
   - File system operations
   - Best for: Infrastructure setup, deployment

2. **General-Purpose Agent**
   - Multi-step complex tasks
   - Code search and exploration
   - Best for: Large implementation tasks

3. **Explore Agent**
   - Fast codebase exploration
   - Search by pattern
   - Answer questions about code
   - Best for: Understanding existing code

4. **Plan Agent**
   - Design implementation plans
   - Architectural decisions
   - Best for: Planning complex features

### Choosing the Right Agent:

**Use Bash Agent when:**
- Need to run terminal commands
- Setting up infrastructure
- Git operations
- Deployment tasks

**Use General-Purpose Agent when:**
- Implementing multi-file features
- Complex business logic
- Need code generation
- Multiple steps required

**Use Explore Agent when:**
- Need to understand existing code
- Find similar implementations
- Answer "how does X work?"
- Quick codebase searches

**Use Plan Agent when:**
- Planning complex features
- Need architectural decisions
- Multiple approaches possible
- Unsure about implementation strategy

---

## Best Practices

### DO ✅

1. **Break Large Tasks into Subtasks**
   - Gateway API → 17 subtasks
   - Easier to parallelize
   - Better progress tracking

2. **Define Clear Acceptance Criteria**
   - Makes agent success measurable
   - Provides validation checklist

3. **Link Requirements ↔ Tasks ↔ Architecture**
   - Maintains traceability
   - Easier to understand impact

4. **Run Tests After Agent Completes**
   - Validate agent output
   - Catch issues early

5. **Review Agent-Generated Code**
   - Don't blindly merge
   - Check for security issues
   - Verify adherence to standards

### DON'T ❌

1. **Don't Run Dependent Tasks in Parallel**
   - OAuth must complete before MCP order placement
   - Database migrations must be sequential

2. **Don't Skip Validation**
   - Always test agent output
   - Check coverage metrics
   - Run linters

3. **Don't Forget to Update Documentation**
   - Update README files
   - Update architecture docs
   - Move tasks to completed/

4. **Don't Overload Single Agent**
   - Keep agent scope reasonable
   - Split complex tasks

---

## Examples

### Example 1: Parallel Gateway API Implementation

```
@claude I need to implement all 17 Gateway API subtasks from
@.claude/project-management/tasks/pending/gateway-api-implementation-tasks.md

Create 4 parallel agents:
1. Authentication Agent (tasks 1-3)
2. Core API Agent (tasks 4-7)
3. Additional API Agent (tasks 8-11)
4. Infrastructure Agent (tasks 12-17)

Each agent should:
- Read the task requirements
- Implement the code following @.claude/rules/development-guardrails.md
- Write tests with 80%+ coverage
- Update task status when complete

Run all 4 agents in parallel and report when all complete.
```

### Example 2: Add New Feature End-to-End

```
@claude I want to add a "Scheduled Orders" feature.

1. First, create requirement document:
   - ID: FR-CA-ORDER-004
   - Category: customer-agent/
   - Status: Planned
   - Include user stories and acceptance criteria

2. Then create architecture documentation:
   - Update order workflow
   - Add database schema changes
   - Document Temporal workflow for scheduling

3. Finally, create 3 implementation tasks:
   - TASK-ORDER-001: Backend implementation
   - TASK-ORDER-002: Frontend implementation
   - TASK-ORDER-003: Testing

Link all documents together and update all index files.
```

### Example 3: Modify Architecture and Update

```
@claude I want to add Neo4j for personalized recommendations.

1. Create architecture documentation at:
   .claude/project-management/architecture/data/neo4j-preference-graph.md

2. Create 3 implementation tasks:
   - TASK-NEO4J-001: Setup database (3 days)
   - TASK-NEO4J-002: Kafka integration (4 days)
   - TASK-NEO4J-003: Recommendation API (5 days)

3. Create requirement document:
   - FR-DATA-GRAPH-001: User Preference Graph

4. Update all index files to include new documents.

Generate all files following the templates and naming conventions.
```

---

## Related Documentation

- [Pending Tasks Summary](./PENDING_TASKS_SUMMARY.md)
- [Development Guardrails](../.claude/rules/development-guardrails.md)
- [Tasks Index](./tasks/index.md)
- [Requirements Index](./requirements/index.md)
- [Architecture Index](./architecture/index.md)

---

**Need Help?** Check the examples above or ask Claude for guidance on specific workflows.

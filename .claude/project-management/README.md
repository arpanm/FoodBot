# FoodBot - Project Management Documentation

**Version**: 2.0.0
**Last Updated**: 2026-02-20
**Status**: Active

---

## 📊 Current Project Status

### Implementation Progress

| Metric | Value | Status |
|--------|-------|--------|
| **Overall Architecture** | 69% (18/26 components) | 🚧 In Progress |
| **Requirements Complete** | 89% (40/45) | ✅ Nearly Complete |
| **Tasks Completed** | 35% (8/23) | 🚧 In Progress |
| **Production Ready** | 42% (11/26 components) | ⚠️ Not Ready |

### Critical Blockers (P0)

| Blocker | Status | Impact | Estimate |
|---------|--------|--------|----------|
| **Gateway API** | 15% | Entire backend non-functional | 3-4 weeks |
| **Database Migrations** | 30% | Cannot persist data | 1 week |
| **OAuth Integration** | 40% | Cannot use real MCP providers | 1-2 weeks |
| **Mobile Native Init** | 0% | Apps cannot run on devices | 1 week |

### Quick Stats

- **Architecture Documents:** 27 files across 5 categories
- **Requirements:** 45 total (40 implemented, 4 partial, 1 not started)
- **Tasks:** 23 total (8 completed, 1 in progress, 14 pending/backlog)
- **Archived Reports:** 114+ historical documents

**🔗 Quick Links:**
- [Architecture Status](./architecture/implementation-status.md) - Detailed implementation progress
- [Requirements Index](./requirements/index.md) - 45 functional requirements
- [Tasks Index](./tasks/index.md) - 23 active tasks
- [Archive Index](./archive/prompt-docs/INDEX.md) - Historical task outputs

---

## 📋 Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Quick Start](#quick-start)
- [How to Add New Items](#how-to-add-new-items)
- [Generating Task Lists](#generating-task-lists)
- [Documentation Standards](#documentation-standards)
- [Workflow](#workflow)

---

## Overview

This directory contains **all** project management documentation for FoodBot, organized in a modular, maintainable structure. Each requirement, task, and architecture document is in its own file, making it easy to:

- ✅ Track individual items independently
- ✅ Generate consolidated lists on demand
- ✅ Add new items using templates
- ✅ Search and navigate documentation
- ✅ Maintain version history per item

---

## Folder Structure

```
.claude/project-management/
├── README.md                          # This file
│
├── requirements/                      # Functional requirements (modular)
│   ├── customer-agent/               # Customer-facing requirements
│   │   ├── FR-CA-UI-001-chat.md
│   │   ├── FR-CA-SEARCH-001-restaurant-search.md
│   │   └── ...
│   ├── restaurant-agent/             # Restaurant-facing requirements
│   ├── mcp-layer/                    # MCP integration requirements
│   ├── llm/                          # LLM orchestration requirements
│   ├── workflows/                    # Workflow management requirements
│   ├── chrome-extension/             # Chrome extension requirements
│   ├── mobile-app/                   # Mobile app requirements
│   └── index.md                      # Requirements hub
│
├── architecture/                      # Technical architecture (modular)
│   ├── components/                   # Component architecture docs
│   │   ├── llm-router.md
│   │   ├── mcp-adapter.md
│   │   ├── mobile-app.md
│   │   └── ...
│   ├── data/                         # Data architecture docs
│   │   ├── postgres-schema.md
│   │   ├── redis-caching.md
│   │   ├── neo4j-graph.md
│   │   └── ...
│   ├── integration/                  # Integration architecture
│   │   ├── oauth-flow.md
│   │   ├── mcp-protocol.md
│   │   ├── payment-gateway.md
│   │   └── ...
│   ├── security/                     # Security architecture
│   ├── deployment/                   # Deployment architecture
│   └── index.md                      # Architecture hub
│
├── tasks/                             # Individual task files
│   ├── completed/                    # ✅ Completed tasks
│   │   ├── TASK-001-oauth-implementation.md
│   │   ├── TASK-002-mcp-client.md
│   │   └── ...
│   ├── in-progress/                  # 🔄 Currently being worked on
│   │   ├── TASK-050-mobile-app-backend-integration.md
│   │   └── ...
│   ├── pending/                      # 🟡 Ready to start
│   │   ├── TASK-100-elasticsearch-setup.md
│   │   └── ...
│   ├── backlog/                      # 📦 Future tasks
│   │   ├── TASK-200-recommendation-engine.md
│   │   └── ...
│   └── index.md                      # Tasks hub
│
├── task-lists/                        # Auto-generated task lists
│   ├── completed-tasks.md            # List of all completed tasks
│   ├── in-progress-tasks.md          # List of in-progress tasks
│   ├── pending-tasks.md              # List of pending/backlog tasks
│   └── all-tasks.md                  # Master list of all tasks
│
├── templates/                         # Templates for new items
│   ├── task-template.md              # Template for new tasks
│   ├── requirement-template.md       # Template for requirements
│   └── architecture-template.md      # Template for architecture docs
│
├── scripts/                           # Helper scripts
│   ├── generate-task-list.sh         # Generate consolidated task lists
│   └── new-item.sh                   # Create new task/requirement/architecture
│
└── archive/                           # Archived old documentation
    ├── prompt-docs/                  # 🆕 AI task output documentation
    │   ├── output-summary/           # Task execution summaries
    │   ├── indexes/                  # Navigation indexes
    │   ├── analysis/                 # Analysis documents
    │   ├── INDEX.md                  # Master index
    │   └── README.md                 # Archive documentation
    ├── requirements/                 # Old requirements files
    ├── architecture/                 # Old architecture files
    ├── implementation-reports/       # AI-generated reports
    ├── status-reports/               # Status summaries
    ├── quality-reports/              # Code reviews, test reports
    ├── implementation-plans/         # Completed implementation plans
    ├── deprecated-plans/             # Obsolete plans
    ├── guides/                       # Old guides
    └── old-docs/                     # Miscellaneous old docs
```

---

## Quick Start

### View Current Tasks

```bash
# View all task lists (auto-updated)
ls task-lists/

# View completed tasks
cat task-lists/completed-tasks.md

# View in-progress tasks
cat task-lists/in-progress-tasks.md

# View pending backlog
cat task-lists/pending-tasks.md
```

### Search Documentation

```bash
# Find a requirement by keyword
grep -r "OAuth" requirements/

# Find a task by ID
find tasks/ -name "TASK-050*"

# Find architecture docs about MCP
find architecture/ -name "*mcp*"
```

---

## 🤖 Working with AI Agents

### Quick Reference Guides

**📚 Comprehensive Guides:**
- **[Pending Tasks Summary](./PENDING_TASKS_SUMMARY.md)** - All 7 pending task groups (40+ subtasks)
- **[Agent Workflow Guide](./AGENT_WORKFLOW_GUIDE.md)** - Complete guide for working with AI agents

---

### Initiating Agent Groups for Pending Tasks

Use AI agents to execute multiple tasks in parallel for faster implementation.

**View Pending Tasks:**

```bash
# See all pending tasks
cat .claude/project-management/PENDING_TASKS_SUMMARY.md

# Or list pending task files
ls .claude/project-management/tasks/pending/
```

**Current Pending Tasks:**
1. 🔴 **Gateway API Implementation** (17 subtasks, 3-4 weeks) - CRITICAL
2. 🔴 **MCP Order Placement** (8 days) - CRITICAL
3. 🔴 **Complete MCP Test Coverage** (5 days) - CRITICAL
4. 🟠 **Docker Build Automation** (4 hours) - HIGH
5. 🟠 **Kubernetes Deployment** (8 hours) - HIGH
6. 🟡 **Search Enhancements** (5 subtasks, 22 days) - MEDIUM
7. 🟡 **Event Streaming Enhancements** (5 subtasks, 16 days) - MEDIUM

**Initiate Parallel Agents:**

```
@claude I need to implement the Gateway API with 17 subtasks in parallel.
See @.claude/project-management/tasks/pending/gateway-api-implementation-tasks.md

Create 4 agent groups:
- Agent 1: Authentication modules (tasks 1-3)
- Agent 2: Core API modules (tasks 4-7)
- Agent 3: Additional modules (tasks 8-11)
- Agent 4: Infrastructure & testing (tasks 12-17)

Each agent should:
1. Read the task requirements
2. Generate code following @.claude/rules/development-guardrails.md
3. Write tests with 80%+ coverage
4. Update task status when complete

Run all 4 agents in parallel.
```

**📖 Full Guide:** [Agent Workflow Guide - Initiating Agents](./AGENT_WORKFLOW_GUIDE.md#initiating-agent-groups-for-pending-tasks)

---

### Adding New Tasks/Requirements

**Quick Add - New Task:**

```bash
cd .claude/project-management/tasks/pending

# Copy template
cp ../templates/task-template.md TASK-NEW-001-my-task.md

# Edit with required fields
code TASK-NEW-001-my-task.md
```

**Required Fields:**
- **Status:** Pending/In Progress/Completed
- **Priority:** P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)
- **Estimated Effort:** X days/hours
- **Description:** What needs to be done
- **Acceptance Criteria:** Checklist of completion requirements
- **Related Requirements:** Link to FR-XX-YYY-ZZZ
- **Related Architecture:** Link to architecture docs

**Quick Add - New Requirement:**

```bash
cd .claude/project-management/requirements/{category}

# Create requirement file
# Format: FR-{COMPONENT}-{CATEGORY}-{NUMBER}-{slug}.md
touch FR-CA-ORDER-004-scheduled-orders.md

# Edit with required fields
code FR-CA-ORDER-004-scheduled-orders.md
```

**Required Fields:**
- **ID:** Unique identifier (FR-XX-YYY-ZZZ)
- **Component:** customer-agent, restaurant-agent, mcp-layer, etc.
- **Status:** Planned/In Progress/Implemented
- **User Stories:** As a [role], I want [feature], so that [benefit]
- **Acceptance Criteria:** Testable completion criteria
- **Technical Specifications:** Database, API, workflow details
- **Related Tasks:** Links to implementation tasks

**Using AI Agent:**

```
@claude Create a new requirement for "Scheduled Orders" feature:
- ID: FR-CA-ORDER-004
- Category: customer-agent/
- Include user stories, acceptance criteria, technical specs
- Link to 3 implementation tasks
- Follow the template at @.claude/project-management/templates/requirement-template.md
```

**📖 Full Guide:** [Agent Workflow Guide - Adding New Items](./AGENT_WORKFLOW_GUIDE.md#adding-new-tasksrequirements)

---

### Changing Requirements/Architecture and Creating Tasks

When modifying existing requirements or architecture, follow this workflow:

#### Step 1: Update the Requirement/Architecture

```bash
# Example: Add Apple Pay support to order placement
code .claude/project-management/requirements/customer-agent/FR-CA-ORDER-001-order-placement.md
```

Add change log section:

```markdown
## Change Log

### 2026-02-20 - Added Apple Pay and Google Pay Support

**Changes:**
- Added Apple Pay integration
- Added Google Pay integration
- Updated payment validation logic

**Impact:**
- Requires payment module updates
- New API endpoints needed
- Frontend UI changes required

**Breaking Changes:**
- Payment request format changed
```

#### Step 2: Update Related Architecture

```bash
code .claude/project-management/architecture/components/gateway-api.md
```

Document architectural changes:

```markdown
## Recent Changes (2026-02-20)

### Multiple Payment Method Support

**Architecture:** Implemented Strategy pattern for payments

**Diagram:**
```
PaymentController → PaymentService → PaymentStrategyFactory
                                        ├─► CardPaymentStrategy
                                        ├─► ApplePayStrategy (NEW)
                                        └─► GooglePayStrategy (NEW)
```
```

#### Step 3: Create Implementation Tasks

```bash
cd .claude/project-management/tasks/pending

# Create task for changes
cat > TASK-PAYMENT-001-multiple-payment-methods.md << 'EOF'
# TASK-PAYMENT-001: Implement Multiple Payment Methods

**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 5 days
**Related Requirement:** FR-CA-ORDER-001 (updated 2026-02-20)
**Related Architecture:** [Gateway API](../../architecture/components/gateway-api.md)

## Changes Required
- Backend: Apple Pay + Google Pay integration (2 days)
- Frontend: New payment UI (2 days)
- Testing: Comprehensive test suite (1 day)

## Acceptance Criteria
- [ ] Apple Pay integration complete
- [ ] Google Pay integration complete
- [ ] Tests passing with 80%+ coverage
EOF
```

#### Step 4: Update All Index Files

```bash
# Update requirements index
code .claude/project-management/requirements/index.md

# Update architecture index
code .claude/project-management/architecture/index.md

# Update tasks index
code .claude/project-management/tasks/index.md
```

**Using AI Agent for End-to-End Update:**

```
@claude I want to add Apple Pay and Google Pay to order payments.

1. Update FR-CA-ORDER-001 with change log
2. Update gateway-api architecture with Strategy pattern
3. Create TASK-PAYMENT-001 for implementation (5 days)
4. Link all documents together
5. Update all index files

Follow templates and conventions in @.claude/project-management/
```

**📖 Full Guide:** [Agent Workflow Guide - Changing Requirements](./AGENT_WORKFLOW_GUIDE.md#changing-requirementsarchitecture-and-creating-tasks)

---

## How to Add New Items

### Using the Helper Script (Recommended)

#### Add a New Task

```bash
cd .claude/project-management
./scripts/new-item.sh task implement-redis-caching
```

This will:
1. Auto-increment task number (e.g., TASK-051)
2. Create file in `tasks/pending/`
3. Pre-fill template with current date
4. Open in your editor

#### Add a New Requirement

```bash
./scripts/new-item.sh requirement payment-integration
```

You'll be prompted for:
- Component (customer-agent, restaurant-agent, etc.)
- Category (UI, API, SEARCH, etc.)

This creates: `requirements/{component}/FR-{COMP}-{CATEGORY}-{NUM}-{name}.md`

#### Add New Architecture Document

```bash
./scripts/new-item.sh architecture kafka-event-streaming
```

You'll be prompted for architecture type:
- components
- data
- integration
- security
- deployment

### Manual Creation

1. Copy the appropriate template from `templates/`
2. Rename with proper naming convention
3. Fill in all sections
4. Move to appropriate folder

---

## Generating Task Lists

### Auto-Generate All Lists

```bash
cd .claude/project-management
./scripts/generate-task-list.sh
```

This creates/updates:
- `task-lists/completed-tasks.md` - All completed tasks
- `task-lists/in-progress-tasks.md` - Current work
- `task-lists/pending-tasks.md` - Backlog by priority
- `task-lists/all-tasks.md` - Master list with statistics

### When to Regenerate

Run the script when:
- You complete a task (move from `in-progress/` to `completed/`)
- You start a new task (move from `pending/` to `in-progress/`)
- You add new tasks
- You want updated statistics

**Pro Tip**: Add to pre-commit hook for automatic updates!

---

## Documentation Standards

### Requirements

**Naming**: `FR-{COMPONENT}-{CATEGORY}-{NUMBER}-{slug}.md`

Examples:
- `FR-CA-UI-001-rich-chat-interface.md`
- `FR-MCP-PROVIDER-002-orchestration.md`
- `FR-LLM-ROUTER-001-multi-provider.md`

**Must Include**:
- Unique ID
- Status (🟡 Pending | 🔄 In Progress | ✅ Implemented | ⏸️ Blocked)
- Priority (High | Medium | Low)
- Acceptance criteria (checkboxes)
- Implementation details (when implemented)
- Links to related tasks

### Tasks

**Naming**: `TASK-{NUMBER}-{slug}.md`

Examples:
- `TASK-001-oauth-implementation.md`
- `TASK-050-mobile-backend-integration.md`
- `TASK-100-elasticsearch-setup.md`

**Must Include**:
- Task ID
- Status emoji
- Priority emoji (🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low)
- Description & context
- Acceptance criteria
- Dependencies
- Progress log (date-stamped updates)
- Completion checklist

### Architecture

**Naming**: `{component-name}.md`

Examples:
- `llm-router.md`
- `oauth-flow.md`
- `postgres-schema.md`

**Must Include**:
- Overview & purpose
- Architecture diagram (ASCII or link)
- Components breakdown
- Data flow
- Technology stack
- Performance characteristics
- Security considerations
- Monitoring approach

---

## Workflow

### 1. Planning Phase

```bash
# Create requirement
./scripts/new-item.sh requirement new-feature

# Fill in requirement details
code requirements/{component}/FR-*.md

# Create tasks for the requirement
./scripts/new-item.sh task implement-feature-part1
./scripts/new-item.sh task implement-feature-part2
./scripts/new-item.sh task test-feature
```

### 2. Implementation Phase

```bash
# Move task to in-progress
mv tasks/pending/TASK-XXX-*.md tasks/in-progress/

# Update task progress regularly
# Add entries to "Progress Log" section
# Check off completed items

# Regenerate lists to show updated status
./scripts/generate-task-list.sh
```

### 3. Completion Phase

```bash
# Complete all checkboxes in task
# Add completion date
# Move to completed
mv tasks/in-progress/TASK-XXX-*.md tasks/completed/

# Update requirement status to ✅ Implemented
code requirements/{component}/FR-*.md

# Add implementation details to requirement:
# - Files created/modified
# - Implementation date
# - Test coverage
# - Pull request links

# Regenerate lists
./scripts/generate-task-list.sh

# Commit
git add .
git commit -m "Complete TASK-XXX: Feature name"
```

### 4. Review Cycle

Weekly/Monthly:
1. Review `task-lists/in-progress-tasks.md` - Any blockers?
2. Review `task-lists/pending-tasks.md` - Reprioritize?
3. Review requirements - Any gaps?
4. Update architecture docs - Any changes?

---

## Tips & Best Practices

### ✅ DO

- **Keep tasks focused**: One task = one pull request
- **Update progress logs**: Add dated entries as you work
- **Link related items**: Cross-reference requirements ↔ tasks
- **Use templates**: Consistency helps searchability
- **Regenerate lists often**: Keep task lists current
- **Archive old versions**: Don't delete, move to `archive/`

### ❌ DON'T

- **Don't create monolithic files**: Break down into focused docs
- **Don't skip templates**: They ensure completeness
- **Don't forget dependencies**: Link tasks that depend on each other
- **Don't leave tasks orphaned**: Every task should relate to a requirement
- **Don't edit task lists manually**: Use the generator script

---

## Statistics (Updated 2026-02-20)

### Documentation Coverage

| Category | Files | Status | Completion |
|----------|-------|--------|------------|
| **Architecture** | 27 | Active | 69% |
| **Requirements** | 47 | Active | 89% |
| **Tasks** | 23 | Active | 35% complete |
| **Archive** | 114+ | Historical | - |
| **Total** | 211+ | - | - |

### Task Breakdown

```
Total Tasks: 23
├── Completed: 8 (35%)
│   ✅ MCP Adapter, Search, Events, Workflows, Frontend, Chrome Extension
├── In Progress: 1 (4%)
│   🚧 OAuth 2.1 implementation (40% complete, blocking)
├── Pending: 7 (30%)
│   🟡 Gateway API (CRITICAL), DB migrations, MCP order placement
├── Backlog: 2 (9%)
│   📦 Real Swiggy/Zomato integration, ML routing
├── Technical Debt: 2 (9%)
│   ⚠️ Cart workflow complexity, OAuth service extraction
├── Technical Tasks: 2 (9%)
│   📝 Test specifications
└── Bug Fixes: 1 (4%)
    🐛 OAuth token refresh
```

### Requirements Summary

```
Total Requirements: 45
├── Implemented: 40 (89%)
├── Partial: 4 (9%)
│   ⚠️ FR-CA-ORDER-003 (Feedback)
│   ⚠️ FR-MCP-SWIGGY-001 (Mock only)
│   ⚠️ FR-MCP-ZOMATO-001 (Mock only)
│   ⚠️ FR-RA-ANALYTICS-001 (Partial)
└── Not Started: 1 (2%)
    📝 Gateway API requirements
```

### Architecture Status

```
Components Implemented: 18/26 (69%)
Production Ready: 11/26 (42%)

✅ Complete: Chrome Extension, Kafka, Redis, Elasticsearch
🚧 Partial: Mobile Apps (85%), Search (85%), Temporal (65%), MCP (60%)
⚠️ Critical: Gateway API (15%), Database (30%), OAuth (40%)
```

**Note:** Run `./scripts/generate-task-list.sh` to generate detailed task list reports.

---

## Maintenance

### Monthly
- Review and archive completed tasks older than 3 months
- Update architecture docs for implemented changes
- Prune outdated requirements
- Review pending backlog for relevance

### Quarterly
- Consolidate lessons learned
- Update templates based on feedback
- Audit documentation coverage
- Plan documentation improvements

---

## AI Task Output Archive

### Overview

All AI-generated task outputs, summaries, and analysis documents are now archived in a structured format under `archive/prompt-docs/`.

**Location:** `.claude/project-management/archive/prompt-docs/`

### Quick Access

- **📊 [Output Summaries](archive/prompt-docs/output-summary/)** - Task execution summaries (11 documents)
- **📑 [Navigation Indexes](archive/prompt-docs/indexes/)** - Documentation indexes (5 documents)
- **🔍 [Analysis Documents](archive/prompt-docs/analysis/)** - Research and analysis (1 document)
- **📖 [Master Index](archive/prompt-docs/INDEX.md)** - Complete catalog of all archived documents
- **ℹ️ [Archive README](archive/prompt-docs/README.md)** - Archive structure and usage guide

### What's Archived

**Recent Task Outputs (2026-02-20):**
- Backend Reverse Engineering Summary (70+ API endpoints, 13 database entities)
- Infrastructure Summary (38 services, 6 Docker compose files, 7 CI/CD workflows)
- Architecture Processing Summary (implementation status, gap analysis)
- Documentation Reorganization Reports (guide folder cleanup, research folder reorganization)
- Content Extraction Summaries (200+ requirements, 500+ tasks extracted)

**Total Archive Size:** 17 documents (~500KB)

### For Future Tasks

All future AI task output documents should be generated in:
- `archive/prompt-docs/output-summary/` for task summaries
- `archive/prompt-docs/indexes/` for navigation documents
- `archive/prompt-docs/analysis/` for analysis reports

**See:** [Archive README](archive/prompt-docs/README.md) for detailed guidelines

---

## MCP Layer Documentation

The MCP (Model Context Protocol) Layer is a critical component that integrates external food delivery platforms (Swiggy, Zomato) with FoodBot's internal systems.

### Quick Links

**Requirements:**
- [Core Requirements](requirements/mcp-layer/core-requirements.md) - Provider interface, aggregation, caching, resilience
- [OAuth Requirements](requirements/mcp-layer/oauth-requirements.md) - Account linking, token management
- [Provider Integration](requirements/mcp-layer/provider-integration-requirements.md) - Swiggy, Zomato, Internal providers
- [Testing Requirements](requirements/mcp-layer/testing-requirements.md) - Unit, integration, performance tests

**Architecture:**
- [MCP Architecture](architecture/integration/mcp-architecture.md) - System overview, components, data flow

**Tasks:**
- [TASK-MCP-001](tasks/in-progress/TASK-MCP-001-complete-oauth-implementation.md) - Complete OAuth implementation ⚠️ In Progress
- [TASK-MCP-002](tasks/pending/TASK-MCP-002-implement-provider-order-placement.md) - Provider order placement 🟡 Pending
- [TASK-MCP-003](tasks/pending/TASK-MCP-003-complete-test-coverage.md) - Complete test coverage 🟡 Pending

**Implementation:**
- MCP Adapter Service: `services/mcp-adapter/`
- MCP Orchestrator Service: `services/mcp-orchestrator/`

### Current Status (2026-02-20)

| Component | Status | Progress | Priority | Blocking |
|-----------|--------|----------|----------|----------|
| **Internal Provider** | ✅ Complete | 100% | P0 | - |
| **Swiggy Provider** | ⚠️ Mock Only | 40% | P0 | OAuth |
| **Zomato Provider** | ⚠️ Mock Only | 40% | P0 | OAuth |
| **OAuth Integration** | 🚧 In Progress | 40% | P0 | TASK-MCP-001 |
| **Aggregator** | ✅ Complete | 100% | P0 | - |
| **Cache Layer** | ✅ Complete | 100% | P1 | - |
| **Resilience Patterns** | ✅ Complete | 100% | P0 | - |
| **Order Placement** | 🟡 Pending | 0% | P0 | OAuth + TASK-MCP-002 |
| **Test Coverage** | ⚠️ Partial | 60% | P1 | TASK-MCP-003 |

**Critical Blocker:** OAuth 2.1 implementation (TASK-MCP-001) at 40% completion, blocking real provider integration and order placement.

**Overall MCP Status:** 60% complete

---

## Getting Help

### Common Questions

**Q: How do I find a specific requirement?**
```bash
grep -r "keyword" requirements/
```

**Q: How do I see what tasks are blocking others?**
```bash
grep -r "Depends on: TASK-" tasks/
```

**Q: How do I add a new requirement category?**
Edit `scripts/new-item.sh` to add new category option.

**Q: Can I have subtasks?**
Yes, reference subtasks in the "Implementation Plan" section of parent task.

**Q: How do I track epics/features?**
Create a requirement with multiple tasks linked to it.

---

## Version History

- **v2.0.0** (2026-02-20): Complete restructure with modular files
- **v1.0.0** (2026-02-17): Initial documentation structure

---

## Contributing

When adding documentation:
1. Use templates from `templates/`
2. Follow naming conventions
3. Fill all required sections
4. Link related items
5. Run `generate-task-list.sh`
6. Commit with descriptive message

---

**Maintained by**: FoodBot Development Team
**Questions?**: Check `archive/` for historical context

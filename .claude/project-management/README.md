# FoodBot - Project Management Documentation

**Version**: 2.0.0
**Last Updated**: 2026-02-20
**Status**: Active

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

## Statistics (Auto-Updated)

Last generated: Run `./scripts/generate-task-list.sh` to update

See `task-lists/all-tasks.md` for current statistics.

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

### Current Status

| Component | Status | Coverage | Priority |
|-----------|--------|----------|----------|
| Internal Provider | ✅ Implemented | 65% | P0 |
| Swiggy Provider | ⚠️ Partial | 45% | P0 |
| Zomato Provider | ⚠️ Partial | 40% | P0 |
| OAuth Integration | ⚠️ Partial | 30% | P0 |
| Aggregator | ✅ Implemented | 70% | P0 |
| Cache Layer | ✅ Implemented | 95% | P1 |
| Resilience Patterns | ✅ Implemented | 75% | P0 |
| Order Placement | ❌ Pending | 0% | P0 |

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

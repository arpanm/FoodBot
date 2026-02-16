# Claude Code: Spec-Driven Development Guide

> **Complete Guide to AI-Orchestrated, Multi-Agent Software Development**
>
> Use this repository as a template for building production-grade applications using Claude Code with automated testing, code review, security audits, and quality checks.

**Version**: 1.0.0 | **Last Updated**: 2026-02-17

---

## 📋 Table of Contents

- [1. Overview](#1-overview)
- [2. Quick Start](#2-quick-start)
- [3. Repository Structure](#3-repository-structure)
- [4. Claude Code Setup](#4-claude-code-setup)
- [5. Development Workflow](#5-development-workflow)
- [6. Multi-Agent Architecture](#6-multi-agent-architecture)
- [7. Files & Folders Explained](#7-files--folders-explained)
- [8. Skills & Commands](#8-skills--commands)
- [9. Hooks & Automation](#9-hooks--automation)
- [10. MCP Servers](#10-mcp-servers)
- [11. Best Practices](#11-best-practices)
- [12. Customization Guide](#12-customization-guide)

---

## 1. Overview

### 1.1 What is Spec-Driven Development?

**Spec-Driven Development** is an AI-orchestrated approach where:
1. You write **high-level requirements** (like a product spec)
2. Claude Code **expands requirements** into detailed specifications
3. AI agents **generate comprehensive test cases** before any code
4. AI agents **generate production code** to make tests pass
5. Automated tools **review, analyze, and audit** the code
6. AI agents **fix all issues** automatically
7. You get **production-ready code** with high quality and security

### 1.2 Why This Approach?

✅ **Faster Development**: AI writes code 10x faster than humans
✅ **Higher Quality**: Automated testing, review, and analysis
✅ **Better Security**: Automated security audits catch vulnerabilities
✅ **Test-First**: Tests written before code ensures correctness
✅ **Consistent**: AI follows patterns and standards consistently
✅ **Documented**: Auto-generated documentation always up-to-date

### 1.3 What This Repository Provides

This repository is a **complete template** showing:
- ✅ How to structure a Claude Code project
- ✅ How to write specs that AI can understand
- ✅ How to set up multi-agent workflows
- ✅ How to automate testing, review, and security
- ✅ How to use hooks, skills, and MCP servers
- ✅ Complete working example (FoodBot)

---

## 2. Quick Start

### 2.1 Clone This Repository

```bash
# Clone as a template for your project
git clone https://github.com/your-org/FoodBot.git MyNewProject
cd MyNewProject

# Remove FoodBot-specific code (keep structure)
rm -rf apps/* packages/*

# Keep the structure and configuration
# - .claude/
# - .ai/
# - prompt-docs/
# - All .md files (REQUIREMENTS, ARCHITECTURE, TODO_CLAUDE_PROMPTS)
```

### 2.2 Install Claude Code

```bash
# Install Claude Code CLI
npm install -g @anthropic/claude-code

# Or use the VSCode extension
code --install-extension Anthropic.claude-code
```

### 2.3 Configure Your Project

```bash
# Initialize Claude Code (if not already done)
claude init

# Copy environment template
cp .env.example .env

# Add your API keys
# Edit .env and add:
# ANTHROPIC_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here (optional)
# GEMINI_API_KEY=your_key_here (optional)
```

### 2.4 Start Development

```bash
# Open in VSCode with Claude Code
code .

# Or start Claude Code CLI
claude chat

# Follow the prompts in TODO_CLAUDE_PROMPTS.md
```

---

## 3. Repository Structure

### 3.1 Complete Directory Tree

```
FoodBot/
├── .ai/                          # AI Configuration (Auto-Memory)
│   ├── local-secrets.yaml        # Local secrets (gitignored)
│   ├── tmp/                      # Temporary AI files (gitignored)
│   └── cache/                    # AI cache (gitignored)
│
├── .claude/                      # Claude Code Configuration
│   ├── config.yaml               # Main Claude configuration
│   ├── settings.json             # Editor and workflow settings
│   ├── keybindings.json          # Custom keyboard shortcuts
│   ├── rules/                    # Development rules and guidelines
│   │   ├── coding-standards.md   # Code style and patterns
│   │   ├── security-rules.md     # Security best practices
│   │   ├── workflow-rules.md     # Development workflow
│   │   ├── commit-standards.md   # Git commit conventions
│   │   └── development-guardrails.md  # Code generation rules
│   ├── hooks/                    # Automation hooks
│   │   ├── pre-commit.js         # Pre-commit validation
│   │   ├── post-commit.js        # Post-commit actions
│   │   ├── on-file-change.js     # File change handlers
│   │   └── on-test-fail.js       # Test failure handlers
│   ├── skills/                   # Custom skills (optional)
│   │   └── custom-skill.yaml     # Skill definitions
│   └── mcp-servers/              # MCP server configs
│       └── servers.json          # MCP server list
│
├── apps/                         # Application code
│   ├── customer-agent/           # Customer-facing app (Capacitor+React)
│   ├── restaurant-agent/         # Restaurant management app
│   └── gateway-api/              # Backend API (NestJS)
│
├── packages/                     # Shared packages
│   ├── llm-router/               # Multi-LLM routing
│   ├── workflows/                # Temporal workflows
│   └── mcp-orchestrator/         # MCP provider orchestration
│
├── docs/                         # Project documentation
│   ├── architecture/             # Architecture diagrams
│   ├── api/                      # API documentation
│   └── workflows/                # Workflow documentation
│
├── prompt-docs/                  # AI-generated documentation
│   ├── README.md                 # Prompt-docs guide
│   ├── TASK_BREAKDOWN.md         # Generated task list
│   ├── TEST_EXECUTION_REPORT.md  # Test results
│   ├── CODE_REVIEW_REPORT.md     # Code review findings
│   ├── CODE_ANALYSIS_REPORT.md   # Static analysis results
│   ├── SECURITY_AUDIT_REPORT.md  # Security scan results
│   ├── FIX_REPORT_*.md           # Fix reports by category
│   └── STATUS_UPDATE_*.md        # Daily status updates
│
├── scripts/                      # Utility scripts
│   ├── docker-health-check.sh    # Docker health monitoring
│   └── setup-dev.sh              # Development setup
│
├── .github/                      # GitHub configuration
│   └── workflows/                # CI/CD pipelines
│       ├── test.yml              # Run tests on PR
│       ├── code-quality.yml      # ESLint, SonarQube
│       └── security.yml          # Snyk security scan
│
├── REQUIREMENTS.md               # ⭐ Detailed requirements spec
├── ARCHITECTURE.md               # ⭐ System architecture
├── TODO_CLAUDE_PROMPTS.md        # ⭐ Multi-agent development plan
├── CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md  # ⭐ This guide
├── README.md                     # Project overview
├── DOCKER_INFRASTRUCTURE.md      # Docker setup guide
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Root package config
├── pnpm-workspace.yaml           # Monorepo workspace
├── tsconfig.json                 # TypeScript config
├── eslint.config.js              # ESLint config (Flat config)
├── .prettierrc                   # Prettier config
├── docker-compose.yml            # Docker services
└── jest.config.js                # Jest test config
```

### 3.2 Key Files Explained

| File | Purpose | When to Edit |
|------|---------|-------------|
| **REQUIREMENTS.md** | Detailed functional & technical requirements | After initial spec, during refinement |
| **ARCHITECTURE.md** | System architecture, components, data flow | During architecture planning |
| **TODO_CLAUDE_PROMPTS.md** | Multi-agent development workflow with prompts | Reference only, customize for your project |
| **.claude/config.yaml** | Claude Code settings (model, API keys, behavior) | Initial setup, when changing models |
| **.claude/rules/*.md** | Development rules Claude follows | Define your coding standards |
| **.claude/hooks/*.js** | Automation hooks (pre-commit, post-commit, etc.) | When adding automation |
| **prompt-docs/*.md** | AI-generated reports and status updates | Auto-generated, review only |
| **.env.example** | Environment variable template | When adding new env vars |

---

## 4. Claude Code Setup

### 4.1 Initial Configuration

#### Step 1: Configure API Keys

Edit `.claude/config.yaml`:

```yaml
# .claude/config.yaml
model: claude-sonnet-4-5  # or claude-opus-4-6 for complex tasks
apiKey: ${ANTHROPIC_API_KEY}  # From environment variable

# Optional: Multi-LLM support
llmProviders:
  claude:
    enabled: true
    apiKey: ${ANTHROPIC_API_KEY}
    model: claude-sonnet-4-5
  openai:
    enabled: true
    apiKey: ${OPENAI_API_KEY}
    model: gpt-4-turbo
  gemini:
    enabled: false  # Enable if you have Gemini API key
    apiKey: ${GEMINI_API_KEY}
    model: gemini-pro

# Auto-memory settings
autoMemory:
  enabled: true
  path: .claude/memory

# Project context
projectContext:
  description: "AI-orchestrated restaurant commerce platform"
  techStack:
    - TypeScript
    - React
    - NestJS
    - Temporal
    - PostgreSQL
    - Redis
```

#### Step 2: Set Up Development Rules

Create `.claude/rules/coding-standards.md`:

```markdown
# Coding Standards

## TypeScript
- Always use TypeScript strict mode
- No `any` types (use `unknown` if needed)
- Explicit return types for functions
- Use interfaces over types for objects

## Code Style
- Use ESLint flat config (eslint.config.js)
- Format with Prettier
- Max line length: 100
- Use functional components (React)
- Use async/await over promises.then()

## Error Handling
- All external calls wrapped in try-catch
- Use custom error classes
- Log errors with context
- Never silent failures

## Testing
- Test-first approach
- 80% minimum coverage
- No flaky tests
- Mock external dependencies

## Security
- No secrets in code
- All inputs validated
- All outputs encoded
- SQL queries parameterized
```

#### Step 3: Configure Hooks

Create `.claude/hooks/pre-commit.js`:

```javascript
// .claude/hooks/pre-commit.js
/**
 * Pre-commit hook: Runs before creating a commit
 * Validates code quality and runs tests
 */

const { execSync } = require('child_process');

module.exports = async function preCommit(context) {
  const { files, logger } = context;

  logger.info('Running pre-commit checks...');

  try {
    // 1. Run linter
    logger.info('Running ESLint...');
    execSync('pnpm lint', { stdio: 'inherit' });

    // 2. Run type check
    logger.info('Running TypeScript type check...');
    execSync('pnpm type-check', { stdio: 'inherit' });

    // 3. Run tests for changed files
    if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
      logger.info('Running tests...');
      execSync('pnpm test --passWithNoTests', { stdio: 'inherit' });
    }

    // 4. Run Prettier
    logger.info('Running Prettier...');
    execSync('pnpm format', { stdio: 'inherit' });

    logger.info('✅ Pre-commit checks passed!');
    return { success: true };

  } catch (error) {
    logger.error('❌ Pre-commit checks failed!');
    logger.error(error.message);
    return {
      success: false,
      message: 'Fix the errors above before committing',
    };
  }
};
```

Create `.claude/hooks/on-file-change.js`:

```javascript
// .claude/hooks/on-file-change.js
/**
 * On file change hook: Runs when files are modified
 * Triggers relevant actions based on file type
 */

const { execSync } = require('child_process');
const path = require('path');

module.exports = async function onFileChange(context) {
  const { files, logger } = context;

  for (const file of files) {
    const ext = path.extname(file);

    // Run tests when source files change
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      // Find corresponding test file
      const testFile = file.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1');

      try {
        logger.info(`Running tests for ${file}...`);
        execSync(`pnpm test ${testFile}`, { stdio: 'inherit' });
      } catch (error) {
        logger.warn(`Tests failed for ${file}`);
      }
    }

    // Regenerate API docs when controllers change
    if (file.includes('/controllers/')) {
      logger.info('Regenerating API documentation...');
      try {
        execSync('pnpm docs:api', { stdio: 'inherit' });
      } catch (error) {
        logger.warn('Failed to regenerate API docs');
      }
    }
  }

  return { success: true };
};
```

### 4.2 Settings Configuration

Edit `.claude/settings.json`:

```json
{
  "editor": {
    "defaultLanguage": "typescript",
    "tabSize": 2,
    "formatOnSave": true
  },
  "workflow": {
    "autoTest": true,
    "autoLint": true,
    "autoFormat": true
  },
  "ai": {
    "contextWindow": "large",
    "temperature": 0.7,
    "topP": 0.9,
    "maxTokens": 4096
  },
  "testing": {
    "framework": "jest",
    "coverage": {
      "enabled": true,
      "threshold": 80
    }
  },
  "quality": {
    "linter": "eslint",
    "formatter": "prettier",
    "staticAnalysis": ["sonarqube"],
    "securityScanner": ["snyk"]
  }
}
```

---

## 5. Development Workflow

### 5.1 Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 1: REQUIREMENTS                           │
│                                                                     │
│  1. Write high-level requirements                                  │
│  2. Run: "Expand requirements" (Claude Prompt 1.1)                 │
│  3. Output: Detailed REQUIREMENTS.md                               │
│                                                                     │
│  Files Updated: REQUIREMENTS.md                                    │
│  Agent Type: Requirements Agent (Sequential)                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 2: ARCHITECTURE                           │
│                                                                     │
│  1. Review requirements                                            │
│  2. Run: "Design architecture" (Claude Prompt 2.1)                 │
│  3. Output: ARCHITECTURE.md with diagrams                          │
│                                                                     │
│  Files Updated: ARCHITECTURE.md                                    │
│  Agent Type: Architecture Agent (Sequential)                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 3: TASK PLANNING                          │
│                                                                     │
│  1. Break down requirements into tasks                             │
│  2. Run: "Create task breakdown" (Claude Prompt 2.1)               │
│  3. Output: prompt-docs/TASK_BREAKDOWN.md                          │
│                                                                     │
│  Files Created: prompt-docs/TASK_BREAKDOWN.md                      │
│  Agent Type: Planning Agent (Sequential)                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 4: TEST GENERATION                        │
│                  (PARALLEL EXECUTION ⚡)                            │
│                                                                     │
│  Agent 1: Frontend Tests    Agent 2: Backend Tests                 │
│  Agent 3: Workflow Tests    Agent 4: Integration Tests             │
│                                                                     │
│  Each agent:                                                       │
│  1. Reads REQUIREMENTS.md                                          │
│  2. Generates test files                                           │
│  3. Creates test data factories                                    │
│  4. Creates mock data                                              │
│                                                                     │
│  Files Created: **/*.test.ts, **/__tests__/**                      │
│  Hooks Triggered: on-file-change.js                                │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 5: CODE GENERATION                        │
│                  (PARALLEL EXECUTION ⚡)                            │
│                                                                     │
│  Agent 1: Frontend Code     Agent 2: Backend Code                  │
│  Agent 3: Workflow Code     Agent 4: Database Code                 │
│                                                                     │
│  Each agent:                                                       │
│  1. Reads REQUIREMENTS.md + ARCHITECTURE.md                        │
│  2. Reads corresponding test files                                 │
│  3. Generates production code to make tests pass                   │
│  4. Follows .claude/rules/                                         │
│                                                                     │
│  Files Created: All source code files                              │
│  Hooks Triggered: on-file-change.js (runs tests)                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 6: TEST EXECUTION                         │
│                                                                     │
│  1. Run all unit tests                                             │
│  2. Run all integration tests                                      │
│  3. Run all E2E tests                                              │
│  4. Generate coverage report                                       │
│  5. Output: prompt-docs/TEST_EXECUTION_REPORT.md                   │
│                                                                     │
│  Command: pnpm test --coverage                                     │
│  Hooks Triggered: on-test-fail.js (if tests fail)                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (if tests fail)
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 7: BUG FIXING                             │
│                  (PARALLEL EXECUTION ⚡)                            │
│                                                                     │
│  Agent 1: Fix Frontend Bugs    Agent 2: Fix Backend Bugs           │
│  Agent 3: Fix Workflow Bugs    Agent 4: Fix Integration Bugs       │
│                                                                     │
│  Each agent:                                                       │
│  1. Reads TEST_EXECUTION_REPORT.md                                 │
│  2. Identifies failures in their domain                            │
│  3. Fixes code to make tests pass                                  │
│  4. Runs tests to verify                                           │
│                                                                     │
│  Files Updated: Source code with fixes                             │
│  Output: prompt-docs/FIX_REPORT_{CATEGORY}.md                      │
│                                                                     │
│  ↻ REPEAT PHASES 6-7 UNTIL ALL TESTS PASS                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (when all tests pass)
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 8: CODE REVIEW                            │
│                                                                     │
│  1. AI reviews all generated code                                  │
│  2. Checks against .claude/rules/                                  │
│  3. Identifies code smells, anti-patterns                          │
│  4. Checks error handling, performance                             │
│  5. Output: prompt-docs/CODE_REVIEW_REPORT.md                      │
│                                                                     │
│  Agent Type: Code Review Agent (Sequential)                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 9: STATIC ANALYSIS                        │
│                                                                     │
│  1. Run ESLint (pnpm lint)                                         │
│  2. Run TypeScript compiler (pnpm type-check)                      │
│  3. Run SonarQube (pnpm quality:sonar)                             │
│  4. Check complexity, duplication                                  │
│  5. Output: prompt-docs/CODE_ANALYSIS_REPORT.md                    │
│                                                                     │
│  Tools: ESLint, TypeScript, SonarQube                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 10: SECURITY AUDIT                        │
│                                                                     │
│  1. Run Snyk scan (pnpm quality:snyk)                              │
│  2. Check OWASP Top 10                                             │
│  3. Review authentication/authorization                            │
│  4. Check for secrets in code                                      │
│  5. Output: prompt-docs/SECURITY_AUDIT_REPORT.md                   │
│                                                                     │
│  Tools: Snyk, manual OWASP review                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 11: FIX ALL ISSUES                        │
│                  (PARALLEL EXECUTION ⚡)                            │
│                                                                     │
│  Agent 1: Fix Code Review Issues                                   │
│  Agent 2: Fix Static Analysis Issues                               │
│  Agent 3: Fix Security Issues                                      │
│                                                                     │
│  Each agent:                                                       │
│  1. Reads their respective report                                  │
│  2. Fixes all Critical and High issues                             │
│  3. Fixes Medium and Low issues                                    │
│  4. Verifies fixes don't break tests                               │
│                                                                     │
│  Output: prompt-docs/FIX_REPORT_{CATEGORY}.md                      │
│                                                                     │
│  ↻ REPEAT PHASES 8-11 UNTIL NO CRITICAL/HIGH ISSUES               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 12: INTEGRATION TESTING                   │
│                                                                     │
│  1. Start all services (docker-compose up)                         │
│  2. Run end-to-end integration tests                               │
│  3. Run performance tests                                          │
│  4. Run load tests                                                 │
│  5. Output: prompt-docs/INTEGRATION_TEST_REPORT.md                 │
│                                                                     │
│  Command: pnpm test:integration                                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 13: DOCUMENTATION                         │
│                  (PARALLEL EXECUTION ⚡)                            │
│                                                                     │
│  Agent 1: API Docs          Agent 2: Code Docs                     │
│  Agent 3: User Guides       Agent 4: Architecture Docs             │
│                                                                     │
│  Each agent:                                                       │
│  1. Generates documentation                                        │
│  2. Adds examples and usage                                        │
│  3. Generates diagrams                                             │
│                                                                     │
│  Output: docs/**/*.md, OpenAPI specs                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                          ✅ DONE!
```

### 5.2 Starting a New Feature

#### Step 1: Write High-Level Requirement

Create or update `REQUIREMENTS.md`:

```markdown
### FR-NEW-001: User Profile Management

**Description**: Users should be able to view and edit their profile.

**Requirements**:
- View profile with name, email, phone
- Edit profile fields
- Upload profile picture
- Change password
- Delete account

**Acceptance Criteria**:
- Profile displays current user data
- Edit form validates inputs
- Profile picture uploads work
- Password change requires current password
- Account deletion requires confirmation
```

#### Step 2: Run Requirements Expansion

Open Claude Code and use this prompt from `TODO_CLAUDE_PROMPTS.md`:

```
# CONTEXT
I've added a new requirement: User Profile Management (FR-NEW-001)

# TASK
Expand FR-NEW-001 into detailed specifications following the pattern in REQUIREMENTS.md:
1. Break down into sub-requirements
2. Add explicit acceptance criteria for each
3. Define API endpoints needed
4. Specify data models
5. Identify edge cases
6. Add error scenarios
7. Define validation rules

# OUTPUT
Update REQUIREMENTS.md with the expanded specification.
```

#### Step 3: Generate Tests

Use the test generation prompt:

```
# CONTEXT
New requirement added: User Profile Management (FR-NEW-001)

# TASK
Generate comprehensive test suite:

1. Frontend tests:
   - ProfileView.test.tsx
   - ProfileEdit.test.tsx
   - ProfilePictureUpload.test.tsx

2. Backend tests:
   - profile.controller.test.ts
   - profile.service.test.ts
   - profile.repository.test.ts

3. E2E tests:
   - profile-management.e2e.test.ts

Follow the test patterns in TODO_CLAUDE_PROMPTS.md Section 4.3
```

#### Step 4: Generate Code

Use the code generation prompt:

```
# CONTEXT
Tests are generated for User Profile Management (FR-NEW-001)

# TASK
Generate production code to make all tests pass:

1. Frontend components:
   - ProfileView.tsx
   - ProfileEdit.tsx
   - ProfilePictureUpload.tsx

2. Backend services:
   - profile.controller.ts
   - profile.service.ts
   - profile.repository.ts

3. Database migrations:
   - Add profile_picture column
   - Add profile_updated_at column

Follow .claude/rules/ and make all tests pass.
```

#### Step 5: Run Quality Checks

```bash
# Run all tests
pnpm test

# Run linter
pnpm lint

# Run security scan
pnpm quality:snyk

# Review reports in prompt-docs/
```

---

## 6. Multi-Agent Architecture

### 6.1 Agent Types

| Agent Type | Execution | Purpose | Input | Output |
|------------|-----------|---------|-------|--------|
| **Requirements Agent** | Sequential | Expand high-level requirements | REQUIREMENTS.md (brief) | REQUIREMENTS.md (detailed) |
| **Architecture Agent** | Sequential | Design system architecture | REQUIREMENTS.md | ARCHITECTURE.md |
| **Planning Agent** | Sequential | Break down into tasks | REQUIREMENTS.md, ARCHITECTURE.md | TASK_BREAKDOWN.md |
| **Test Gen Agent** | **Parallel** | Generate test cases | REQUIREMENTS.md, ARCHITECTURE.md | **/*.test.ts |
| **Code Gen Agent** | **Parallel** | Generate production code | Tests, REQUIREMENTS.md | Source code |
| **Test Exec Agent** | Sequential | Run all tests | Source code, Tests | TEST_EXECUTION_REPORT.md |
| **Bug Fix Agent** | **Parallel** | Fix failing tests | TEST_EXECUTION_REPORT.md | Fixed source code |
| **Review Agent** | Sequential | Code review | Source code | CODE_REVIEW_REPORT.md |
| **Analysis Agent** | Sequential | Static analysis | Source code | CODE_ANALYSIS_REPORT.md |
| **Security Agent** | Sequential | Security audit | Source code | SECURITY_AUDIT_REPORT.md |
| **Fix Agent** | **Parallel** | Fix all issues | All reports | Fixed source code |
| **Integration Agent** | Sequential | E2E testing | All source code | INTEGRATION_TEST_REPORT.md |
| **Docs Agent** | **Parallel** | Generate docs | Source code | Documentation |

### 6.2 Agent Communication

Agents communicate through **shared artifacts**:

```
┌─────────────────┐
│ Requirements    │──────┐
│ Agent           │      │
└─────────────────┘      │
                         ▼
                   REQUIREMENTS.md
                         │
┌─────────────────┐      │
│ Planning Agent  │◄─────┤
│                 │      │
└─────────────────┘      │
         │               │
         ▼               │
  TASK_BREAKDOWN.md      │
         │               │
         ▼               │
┌─────────────────┐      │
│ Test Gen Agent  │◄─────┘
│ (Parallel x4)   │
└─────────────────┘
         │
         ▼
    Test Files
         │
         ▼
┌─────────────────┐
│ Code Gen Agent  │◄── Reads test files
│ (Parallel x4)   │
└─────────────────┘
         │
         ▼
   Source Code
         │
         ▼
┌─────────────────┐
│ Test Exec Agent │
└─────────────────┘
         │
         ▼
TEST_EXECUTION_REPORT.md
         │
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
    Review     Analysis   Security   Integration
     Agent      Agent      Agent        Agent
         │          │          │          │
         ▼          ▼          ▼          ▼
    Reports    Reports    Reports    Reports
         │          │          │          │
         └──────────┴──────────┴──────────┘
                    │
                    ▼
             ┌─────────────────┐
             │ Fix Agent       │
             │ (Parallel x3)   │
             └─────────────────┘
                    │
                    ▼
              Fixed Code
```

### 6.3 Parallel Execution Example

In `.claude/config.yaml`, define agent pools:

```yaml
agents:
  testGeneration:
    poolSize: 4  # Run 4 test gen agents in parallel
    agents:
      - name: frontend-test-gen
        type: test-generation
        scope: apps/customer-agent
      - name: backend-test-gen
        type: test-generation
        scope: apps/gateway-api
      - name: workflow-test-gen
        type: test-generation
        scope: packages/workflows
      - name: integration-test-gen
        type: test-generation
        scope: tests/integration

  codeGeneration:
    poolSize: 4  # Run 4 code gen agents in parallel
    agents:
      - name: frontend-code-gen
        type: code-generation
        scope: apps/customer-agent
      - name: backend-code-gen
        type: code-generation
        scope: apps/gateway-api
      - name: workflow-code-gen
        type: code-generation
        scope: packages/workflows
      - name: database-code-gen
        type: code-generation
        scope: packages/database

  bugFixing:
    poolSize: 3  # Run 3 bug fix agents in parallel
    agents:
      - name: frontend-bug-fix
        type: bug-fixing
        scope: apps/customer-agent
      - name: backend-bug-fix
        type: bug-fixing
        scope: apps/gateway-api
      - name: workflow-bug-fix
        type: bug-fixing
        scope: packages/workflows
```

---

## 7. Files & Folders Explained

### 7.1 `.ai/` Directory

**Purpose**: Claude Code's auto-memory system stores project context and learning.

```
.ai/
├── local-secrets.yaml     # Local API keys and secrets (GITIGNORED)
├── tmp/                   # Temporary files during agent execution (GITIGNORED)
├── cache/                 # Cached embeddings and computations (GITIGNORED)
└── memory.md              # Project-specific learnings and patterns (TRACKED)
```

**What it does**:
- **Auto-Memory**: Claude remembers patterns, mistakes, and learnings across sessions
- **Context Caching**: Speeds up subsequent prompts by caching embeddings
- **Local Secrets**: Stores API keys locally (never committed)

**Example `.ai/memory.md`**:

```markdown
# Project Memory

## Patterns We Follow
- All API responses use standardized format: `{ data, error, meta }`
- All database queries use repository pattern
- All external calls have 30s timeout

## Mistakes to Avoid
- Don't use `any` type - use `unknown` or specific types
- Don't forget to add `@Injectable()` decorator to NestJS services
- Don't use `console.log` - use `LoggerService`

## Project-Specific Knowledge
- User preferences stored in Neo4j as a graph
- LLM responses cached in Pinecone vector DB
- All async jobs tracked in Redis with `job:{jobId}` key pattern
```

### 7.2 `.claude/` Directory

**Purpose**: Claude Code configuration, rules, hooks, and automation.

#### `.claude/config.yaml`

Main configuration file:

```yaml
# Model configuration
model: claude-sonnet-4-5  # or claude-opus-4-6
apiKey: ${ANTHROPIC_API_KEY}

# Project settings
project:
  name: FoodBot
  description: AI-orchestrated restaurant commerce platform
  version: 1.0.0

# Context settings
context:
  maxTokens: 100000
  includeFiles:
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.md"
  excludeFiles:
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/*.test.ts"  # Exclude tests from main context (included when needed)

# Memory settings
autoMemory:
  enabled: true
  path: .ai/memory.md

# Agent settings
agents:
  enabled: true
  maxConcurrent: 4

# Hook settings
hooks:
  enabled: true
  path: .claude/hooks

# MCP settings
mcpServers:
  enabled: true
  configPath: .claude/mcp-servers/servers.json
```

#### `.claude/rules/` Directory

Development rules that Claude follows:

**coding-standards.md**:
- Code style guidelines
- TypeScript conventions
- React patterns
- NestJS patterns

**security-rules.md**:
- Authentication patterns
- Authorization checks
- Input validation
- Secret management

**workflow-rules.md**:
- Git workflow
- Branch naming
- Commit message format
- PR requirements

**development-guardrails.md**:
- Code generation constraints
- Test requirements
- Quality thresholds
- Performance targets

#### `.claude/hooks/` Directory

Automation hooks that run at specific times:

| Hook | When It Runs | Purpose |
|------|-------------|---------|
| **pre-commit.js** | Before git commit | Lint, type-check, test, format |
| **post-commit.js** | After git commit | Update docs, notify team |
| **on-file-change.js** | When file is modified | Run related tests, update docs |
| **on-test-fail.js** | When tests fail | Analyze failures, suggest fixes |
| **on-security-alert.js** | When security issue found | Flag critical issues, block commit |

#### `.claude/mcp-servers/` Directory

MCP server configurations:

**servers.json**:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "args": ["/Users/you/code/FoodBot"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

### 7.3 `prompt-docs/` Directory

**Purpose**: AI-generated documentation and reports (tracked in git for history).

```
prompt-docs/
├── README.md                      # Guide to prompt-docs
├── TASK_BREAKDOWN.md              # Generated task list (Phase 2)
├── TEST_EXECUTION_REPORT.md       # Test results (Phase 5)
├── CODE_REVIEW_REPORT.md          # Code review findings (Phase 7)
├── CODE_ANALYSIS_REPORT.md        # Static analysis results (Phase 8)
├── SECURITY_AUDIT_REPORT.md       # Security scan results (Phase 9)
├── INTEGRATION_TEST_REPORT.md     # Integration test results (Phase 11)
├── FIX_REPORT_FRONTEND.md         # Frontend fixes (Phase 6)
├── FIX_REPORT_BACKEND.md          # Backend fixes (Phase 6)
├── FIX_REPORT_SECURITY.md         # Security fixes (Phase 10)
└── STATUS_UPDATE_2026-02-17.md    # Daily status update
```

**Why tracked in git?**
- Provides development history
- Shows AI decision-making process
- Helps debug issues later
- Documents quality over time

### 7.4 `docs/` Directory

**Purpose**: Human-readable project documentation.

```
docs/
├── architecture/
│   ├── system-overview.md
│   ├── component-diagrams.md
│   └── data-flow.md
├── api/
│   ├── openapi.yaml
│   ├── README.md
│   └── authentication.md
└── workflows/
    ├── order-placement.md
    └── payment-processing.md
```

### 7.5 Root Configuration Files

| File | Purpose |
|------|---------|
| **package.json** | Dependencies, scripts, workspace config |
| **pnpm-workspace.yaml** | Monorepo workspace definition |
| **tsconfig.json** | TypeScript compiler settings |
| **eslint.config.js** | ESLint rules (flat config format) |
| **.prettierrc** | Code formatting rules |
| **jest.config.js** | Test framework configuration |
| **docker-compose.yml** | Local development services |
| **.env.example** | Environment variable template |
| **.gitignore** | Files to ignore in git |

---

## 8. Skills & Commands

### 8.1 Built-in Claude Code Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/help` | Show help | `/help` |
| `/clear` | Clear conversation | `/clear` |
| `/commit` | Create git commit | `/commit` |
| `/review-pr` | Review pull request | `/review-pr 123` |
| `/compact` | Compact conversation history | `/compact` |

### 8.2 Custom Skills

Create custom skills in `.claude/skills/`:

**custom-skill.yaml**:
```yaml
name: generate-crud
description: Generate complete CRUD operations for an entity
trigger: /crud

parameters:
  - name: entity
    description: Entity name (e.g., User, Product)
    required: true
  - name: fields
    description: Comma-separated field list
    required: true

prompt: |
  Generate complete CRUD operations for entity: {{entity}}

  Fields: {{fields}}

  Generate:
  1. Database model (TypeORM entity)
  2. Repository class
  3. Service class (CRUD methods)
  4. Controller (REST endpoints)
  5. DTOs (Create, Update, Response)
  6. Unit tests for service
  7. E2E tests for controller

  Follow patterns in .claude/rules/coding-standards.md

examples:
  - command: /crud User email,name,password
    description: Generate CRUD for User entity
```

**Usage**:
```bash
# In Claude Code
/crud Product name,description,price,stock

# Generates:
# - packages/database/src/entities/product.entity.ts
# - apps/gateway-api/src/repositories/product.repository.ts
# - apps/gateway-api/src/services/product.service.ts
# - apps/gateway-api/src/controllers/product.controller.ts
# - apps/gateway-api/src/dto/product.dto.ts
# - apps/gateway-api/src/services/__tests__/product.service.test.ts
# - apps/gateway-api/src/controllers/__tests__/product.controller.test.ts
```

### 8.3 Project-Specific Scripts

Define in `package.json`:

```json
{
  "scripts": {
    "dev": "pnpm --filter \"./apps/*\" dev",
    "build": "pnpm --filter \"./apps/*\" build",
    "test": "jest --coverage",
    "test:unit": "jest --testPathPattern='.test.ts$'",
    "test:integration": "jest --testPathPattern='.integration.test.ts$'",
    "test:e2e": "jest --testPathPattern='.e2e.test.ts$'",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "quality:sonar": "sonar-scanner",
    "quality:snyk": "snyk test",
    "quality:all": "pnpm lint && pnpm type-check && pnpm quality:sonar && pnpm quality:snyk",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:health": "bash scripts/docker-health-check.sh",
    "docker:clean": "docker-compose down -v",
    "docs:api": "swagger-cli bundle -o docs/api/openapi.yaml apps/gateway-api/src/swagger.yaml"
  }
}
```

---

## 9. Hooks & Automation

### 9.1 Hook System Overview

Claude Code hooks enable automation at key points:

```
User Action ──────► Hook Trigger ──────► Hook Script ──────► Action Result
                         │                    │
                         │                    ▼
                         │              Custom Logic
                         │              (JavaScript)
                         │                    │
                         ▼                    ▼
                   Hook Config         Tool Execution
                   (.claude/config)    (lint, test, etc.)
```

### 9.2 Available Hooks

#### Pre-Commit Hook

**File**: `.claude/hooks/pre-commit.js`

**Triggers**: Before `git commit`

**Purpose**: Validate code quality before commit

**Example Implementation**:

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function preCommit(context) {
  const { files, logger, config } = context;

  // Get quality thresholds from config
  const thresholds = config.quality || {
    coverage: 80,
    complexity: 10,
  };

  const checks = [];

  // 1. ESLint
  checks.push({
    name: 'ESLint',
    command: 'pnpm lint',
    required: true,
  });

  // 2. TypeScript
  checks.push({
    name: 'TypeScript',
    command: 'pnpm type-check',
    required: true,
  });

  // 3. Tests
  if (hasSourceChanges(files)) {
    checks.push({
      name: 'Tests',
      command: 'pnpm test --passWithNoTests',
      required: true,
    });
  }

  // 4. Coverage Check
  if (hasSourceChanges(files)) {
    checks.push({
      name: 'Coverage',
      command: `pnpm test:coverage`,
      required: true,
      validator: () => {
        const coverage = getCoveragePercentage();
        if (coverage < thresholds.coverage) {
          throw new Error(
            `Coverage ${coverage}% below threshold ${thresholds.coverage}%`
          );
        }
      },
    });
  }

  // 5. Security Check (on dependencies change)
  if (files.some(f => f.includes('package.json'))) {
    checks.push({
      name: 'Security Scan',
      command: 'pnpm quality:snyk',
      required: false,  // Warning only
    });
  }

  // Run all checks
  for (const check of checks) {
    try {
      logger.info(`Running ${check.name}...`);
      execSync(check.command, { stdio: 'inherit' });

      if (check.validator) {
        check.validator();
      }

      logger.success(`✓ ${check.name} passed`);
    } catch (error) {
      if (check.required) {
        logger.error(`✗ ${check.name} failed`);
        return {
          success: false,
          message: `${check.name} check failed. Fix errors before committing.`,
        };
      } else {
        logger.warn(`⚠ ${check.name} failed (non-blocking)`);
      }
    }
  }

  logger.success('✓ All pre-commit checks passed!');
  return { success: true };
};

function hasSourceChanges(files) {
  return files.some(f =>
    f.endsWith('.ts') ||
    f.endsWith('.tsx') ||
    f.endsWith('.js') ||
    f.endsWith('.jsx')
  );
}

function getCoveragePercentage() {
  const coverageFile = path.join(process.cwd(), 'coverage/coverage-summary.json');
  if (!fs.existsSync(coverageFile)) {
    return 0;
  }
  const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  return coverage.total.statements.pct;
}
```

#### Post-Commit Hook

**File**: `.claude/hooks/post-commit.js`

**Triggers**: After `git commit`

**Purpose**: Update documentation, notify team, trigger CI

**Example Implementation**:

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

module.exports = async function postCommit(context) {
  const { commit, logger, config } = context;

  // 1. Update documentation
  logger.info('Updating documentation...');
  try {
    execSync('pnpm docs:api', { stdio: 'inherit' });
    logger.success('✓ Documentation updated');
  } catch (error) {
    logger.warn('⚠ Documentation update failed');
  }

  // 2. Generate changelog entry
  logger.info('Updating changelog...');
  updateChangelog(commit);

  // 3. Notify team (if configured)
  if (config.notifications?.slack) {
    notifySlack(commit, config.notifications.slack);
  }

  // 4. Trigger CI (if on main branch)
  if (commit.branch === 'main') {
    logger.info('Triggering CI build...');
    triggerCI(commit);
  }

  return { success: true };
};

function updateChangelog(commit) {
  const changelogPath = 'CHANGELOG.md';
  const entry = `\n- ${commit.message} (${commit.hash.substring(0, 7)})`;

  if (fs.existsSync(changelogPath)) {
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    const updated = changelog.replace(
      '## Unreleased',
      `## Unreleased${entry}`
    );
    fs.writeFileSync(changelogPath, updated);
  }
}

function notifySlack(commit, webhookUrl) {
  const message = {
    text: `New commit: ${commit.message}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*New Commit*\n${commit.message}\n\nAuthor: ${commit.author}\nHash: ${commit.hash}`,
        },
      },
    ],
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

function triggerCI(commit) {
  // Trigger GitHub Actions or other CI
  // Implementation depends on your CI system
}
```

#### On-File-Change Hook

**File**: `.claude/hooks/on-file-change.js`

**Triggers**: When files are modified (by Claude or user)

**Purpose**: Run tests, update docs, validate changes

**Example in Section 4.1**.

#### On-Test-Fail Hook

**File**: `.claude/hooks/on-test-fail.js`

**Triggers**: When tests fail

**Purpose**: Analyze failures, suggest fixes, open bug reports

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

module.exports = async function onTestFail(context) {
  const { failures, logger } = context;

  logger.info(`Analyzing ${failures.length} test failures...`);

  const analysis = [];

  for (const failure of failures) {
    const suggestion = await analyzeFailure(failure);
    analysis.push({
      test: failure.testName,
      file: failure.testFile,
      error: failure.error,
      suggestion,
    });
  }

  // Write analysis to file
  const reportPath = 'prompt-docs/TEST_FAILURE_ANALYSIS.md';
  const report = generateReport(analysis);
  fs.writeFileSync(reportPath, report);

  logger.info(`Analysis written to ${reportPath}`);
  logger.info('You can now ask Claude to fix these issues with:');
  logger.info('  "Fix test failures in TEST_FAILURE_ANALYSIS.md"');

  return { success: true, analysis };
};

async function analyzeFailure(failure) {
  // Analyze error message and stack trace
  const errorType = identifyErrorType(failure.error);

  const suggestions = {
    'TypeError': 'Check for null/undefined values. Add null checks or optional chaining.',
    'AssertionError': 'Expected value doesn\'t match actual. Review test expectations or implementation.',
    'TimeoutError': 'Async operation taking too long. Check for missing await or increase timeout.',
    'ReferenceError': 'Variable not defined. Check imports and variable declarations.',
  };

  return suggestions[errorType] || 'Review error message and stack trace for clues.';
}

function identifyErrorType(error) {
  if (error.includes('TypeError')) return 'TypeError';
  if (error.includes('AssertionError')) return 'AssertionError';
  if (error.includes('Timeout')) return 'TimeoutError';
  if (error.includes('ReferenceError')) return 'ReferenceError';
  return 'Unknown';
}

function generateReport(analysis) {
  let report = '# Test Failure Analysis\n\n';
  report += `Total Failures: ${analysis.length}\n\n`;

  for (const item of analysis) {
    report += `## ${item.test}\n\n`;
    report += `**File**: ${item.file}\n\n`;
    report += `**Error**:\n\`\`\`\n${item.error}\n\`\`\`\n\n`;
    report += `**Suggestion**: ${item.suggestion}\n\n`;
    report += '---\n\n';
  }

  return report;
}
```

### 9.3 Hook Configuration

Enable/disable hooks in `.claude/config.yaml`:

```yaml
hooks:
  enabled: true
  path: .claude/hooks

  # Individual hook settings
  preCommit:
    enabled: true
    timeout: 300000  # 5 minutes

  postCommit:
    enabled: true
    timeout: 60000   # 1 minute

  onFileChange:
    enabled: true
    timeout: 30000   # 30 seconds
    debounce: 1000   # Wait 1s after last change

  onTestFail:
    enabled: true
    timeout: 60000   # 1 minute
```

---

## 10. MCP Servers

### 10.1 What are MCP Servers?

**MCP (Model Context Protocol)** servers provide Claude with access to external tools and data sources.

### 10.2 Available MCP Servers

| MCP Server | Purpose | Use Case |
|------------|---------|----------|
| **@modelcontextprotocol/server-github** | GitHub integration | Create issues, PRs, review code |
| **@modelcontextprotocol/server-filesystem** | File system access | Read/write project files |
| **@modelcontextprotocol/server-postgres** | PostgreSQL access | Query database, run migrations |
| **@modelcontextprotocol/server-slack** | Slack integration | Send notifications, get feedback |
| **@modelcontextprotocol/server-google-drive** | Google Drive | Access specs, design docs |
| **@modelcontextprotocol/server-jira** | Jira integration | Create tickets, track progress |

### 10.3 Configuring MCP Servers

Edit `.claude/mcp-servers/servers.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/you/code/FoodBot"
      ]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}"
      }
    }
  }
}
```

### 10.4 Using MCP Servers

Once configured, Claude can use MCP servers automatically:

**Example: Create GitHub Issue**

```
User: "Create a GitHub issue for the user profile feature"

Claude (uses GitHub MCP):
- Connects to GitHub via MCP
- Creates issue with title and description
- Adds labels (feature, enhancement)
- Assigns to current milestone
- Returns issue URL
```

**Example: Query Database**

```
User: "How many users have registered in the last 7 days?"

Claude (uses Postgres MCP):
- Connects to database via MCP
- Runs query: SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'
- Returns result
```

**Example: Send Slack Notification**

```
User: "Notify the team that feature X is ready for testing"

Claude (uses Slack MCP):
- Connects to Slack via MCP
- Sends message to #engineering channel
- Includes feature details and testing instructions
```

---

## 11. Best Practices

### 11.1 Writing Good Requirements

✅ **DO**:
- Write clear, specific requirements
- Include acceptance criteria
- Define edge cases
- Specify error scenarios
- Add examples

❌ **DON'T**:
- Write vague requirements like "make it fast"
- Skip error scenarios
- Assume obvious edge cases
- Leave acceptance criteria undefined

**Good Example**:

```markdown
### FR-AUTH-001: User Login

**Description**: Users authenticate with email and password.

**Requirements**:
- Accept email and password
- Validate email format
- Validate password (min 8 chars)
- Return JWT token on success
- Return error on invalid credentials
- Implement rate limiting (5 attempts per 15 min)
- Lock account after 10 failed attempts

**Acceptance Criteria**:
- ✅ Valid credentials return 200 with JWT token
- ✅ Invalid credentials return 401 with error message
- ✅ Rate limiting blocks after 5 attempts
- ✅ Account locks after 10 failed attempts
- ✅ JWT token expires after 15 minutes

**Edge Cases**:
- Email not found: Return 401 (don't reveal existence)
- Password wrong: Return 401 (same message as email not found)
- Account locked: Return 403 with unlock instructions
- Rate limited: Return 429 with retry-after header

**API Endpoint**:
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900
}

Response 401:
{
  "error": "Invalid credentials"
}
```
```

### 11.2 Structuring Your Prompts

✅ **DO**:
- Provide context (what Claude needs to know)
- Be specific about the task
- Define expected output format
- Add examples
- Include constraints

❌ **DON'T**:
- Write vague prompts
- Skip context
- Forget to specify output format
- Mix multiple unrelated tasks

**Good Prompt Template**:

```
# CONTEXT
[Explain what Claude needs to know]
- Current state of the code
- Related files/components
- Relevant requirements

# TASK
[Specific task to perform]
- Break down into steps
- Be clear and specific
- One primary task per prompt

# OUTPUT
[Expected output format]
- File(s) to create/modify
- Format specifications
- Examples of expected output

# CONSTRAINTS
[Limitations and requirements]
- Follow .claude/rules/
- Must pass all tests
- Follow existing patterns
- Security requirements

# EXAMPLES
[Show examples of expected output]
```

### 11.3 Organizing Multi-Agent Work

✅ **DO**:
- Define clear agent boundaries
- Use parallel execution when possible
- Share context through files
- Track progress in reports
- Define quality gates

❌ **DON'T**:
- Have agents work on overlapping scope
- Force sequential when parallel is possible
- Have agents communicate directly
- Skip quality checks

### 11.4 Managing Test Quality

✅ **DO**:
- Write tests before code (TDD)
- Aim for 80%+ coverage
- Test edge cases
- Test error scenarios
- Use test factories for data
- Mock external dependencies

❌ **DON'T**:
- Write tests after code
- Skip edge cases
- Use hardcoded test data
- Have flaky tests
- Test implementation details

### 11.5 Code Review Checklist

Before accepting AI-generated code, verify:

- [ ] All tests pass
- [ ] Coverage > 80%
- [ ] No ESLint errors
- [ ] No TypeScript errors
- [ ] SonarQube rating A or B
- [ ] 0 critical security vulnerabilities
- [ ] 0 high security vulnerabilities
- [ ] Follows .claude/rules/
- [ ] Error handling complete
- [ ] Logging in place
- [ ] Documentation updated

---

## 12. Customization Guide

### 12.1 Adapting for Your Project

#### Step 1: Clone and Clean

```bash
git clone https://github.com/your-org/FoodBot.git MyProject
cd MyProject

# Remove FoodBot-specific code
rm -rf apps/* packages/*

# Update README.md with your project info
# Update REQUIREMENTS.md with your requirements
# Update ARCHITECTURE.md with your architecture
```

#### Step 2: Update Configuration

**Edit `.claude/config.yaml`**:

```yaml
project:
  name: MyProject
  description: Your project description
  version: 1.0.0

context:
  includeFiles:
    - "**/*.ts"      # Adjust for your languages
    - "**/*.py"      # Add Python if using
    - "**/*.md"
```

**Edit `package.json`**:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "Your project description",
  "scripts": {
    // Update scripts for your stack
  }
}
```

#### Step 3: Define Your Stack

**Edit `.claude/rules/coding-standards.md`**:

```markdown
# Coding Standards for MyProject

## Stack
- Language: TypeScript / Python / Go
- Frontend: React / Vue / Angular
- Backend: NestJS / Express / FastAPI
- Database: PostgreSQL / MongoDB / MySQL

## Patterns
[Define your patterns]

## Testing
- Framework: Jest / Pytest / Go Test
- Coverage: 80% minimum
```

#### Step 4: Write Your Requirements

Follow the structure in `REQUIREMENTS.md` but with your features:

```markdown
# MyProject - Requirements

## 1. Overview
[Your project overview]

## 2. Functional Requirements

### 2.1 Feature 1
[Your feature requirements]

### 2.2 Feature 2
[Your feature requirements]
```

#### Step 5: Start Development

Follow the workflow in Section 5, using prompts from `TODO_CLAUDE_PROMPTS.md` as templates.

### 12.2 Language-Specific Adaptations

#### Python Projects

Update `.claude/hooks/pre-commit.js`:

```javascript
module.exports = async function preCommit(context) {
  const checks = [
    { name: 'Black', command: 'black --check .' },
    { name: 'Flake8', command: 'flake8 .' },
    { name: 'MyPy', command: 'mypy .' },
    { name: 'Pytest', command: 'pytest --cov --cov-fail-under=80' },
  ];

  // Run checks...
};
```

#### Go Projects

Update `.claude/hooks/pre-commit.js`:

```javascript
module.exports = async function preCommit(context) {
  const checks = [
    { name: 'gofmt', command: 'gofmt -l .' },
    { name: 'go vet', command: 'go vet ./...' },
    { name: 'golint', command: 'golint ./...' },
    { name: 'go test', command: 'go test -cover -coverprofile=coverage.out ./...' },
  ];

  // Run checks...
};
```

### 12.3 Adding New Agent Types

Define new agent in `.claude/config.yaml`:

```yaml
agents:
  customAgent:
    poolSize: 2
    agents:
      - name: my-custom-agent-1
        type: custom-agent
        scope: packages/my-package
        config:
          customSetting: value
```

Create agent prompt in `TODO_CLAUDE_PROMPTS.md`:

```markdown
### Phase X: Custom Agent Task

#### Prompt X.1: Custom Agent

\`\`\`
# CONTEXT
[Agent context]

# TASK
[Agent task]

# OUTPUT
[Expected output]
\`\`\`
```

---

## 13. Troubleshooting

### 13.1 Common Issues

#### Issue: Tests Failing After Code Generation

**Symptom**: AI generates code but tests fail

**Solutions**:
1. Check TEST_EXECUTION_REPORT.md for details
2. Run Bug Fix Agent (Phase 6)
3. Verify test data factories are correct
4. Check mock configurations

#### Issue: Code Review Finds Many Issues

**Symptom**: CODE_REVIEW_REPORT.md shows many problems

**Solutions**:
1. Update `.claude/rules/` to be more specific
2. Add examples of good patterns
3. Run Fix Agent (Phase 10)
4. Iterate until quality improves

#### Issue: Security Vulnerabilities Found

**Symptom**: SECURITY_AUDIT_REPORT.md shows vulnerabilities

**Solutions**:
1. Run Security Fix Agent immediately
2. Never ignore critical/high vulnerabilities
3. Update dependencies
4. Review security-rules.md

#### Issue: Hooks Not Running

**Symptom**: Pre-commit checks don't run

**Solutions**:
1. Check `.claude/config.yaml` has `hooks.enabled: true`
2. Verify hook files exist in `.claude/hooks/`
3. Check hook files are executable: `chmod +x .claude/hooks/*.js`
4. Check for syntax errors in hook files

#### Issue: MCP Servers Not Working

**Symptom**: Claude can't access GitHub/DB/etc.

**Solutions**:
1. Check `.claude/mcp-servers/servers.json` exists
2. Verify environment variables set (API keys, tokens)
3. Test MCP server manually: `npx @modelcontextprotocol/server-github`
4. Check MCP server logs

### 13.2 Getting Help

- **Documentation**: Review this guide and `TODO_CLAUDE_PROMPTS.md`
- **Claude Code Docs**: https://docs.anthropic.com/claude/docs/claude-code
- **GitHub Issues**: https://github.com/anthropics/claude-code/issues
- **Community**: https://discord.gg/anthropic

---

## 14. Appendix

### 14.1 Complete File Checklist

When setting up a new project, ensure you have:

- [ ] `.claude/config.yaml` - Claude Code configuration
- [ ] `.claude/settings.json` - Editor and workflow settings
- [ ] `.claude/rules/coding-standards.md` - Code standards
- [ ] `.claude/rules/security-rules.md` - Security guidelines
- [ ] `.claude/rules/workflow-rules.md` - Git workflow
- [ ] `.claude/hooks/pre-commit.js` - Pre-commit validation
- [ ] `.claude/hooks/post-commit.js` - Post-commit actions
- [ ] `.claude/hooks/on-file-change.js` - File change handling
- [ ] `.claude/mcp-servers/servers.json` - MCP server config
- [ ] `REQUIREMENTS.md` - Detailed requirements
- [ ] `ARCHITECTURE.md` - System architecture
- [ ] `TODO_CLAUDE_PROMPTS.md` - Development workflow
- [ ] `CLAUDE_CODE_SPEC_DRIVEN_DEVELOPMENT.md` - This guide
- [ ] `README.md` - Project overview
- [ ] `.env.example` - Environment template
- [ ] `.gitignore` - Git ignore rules
- [ ] `package.json` - Dependencies and scripts
- [ ] `tsconfig.json` - TypeScript config
- [ ] `eslint.config.js` - ESLint config
- [ ] `.prettierrc` - Prettier config
- [ ] `jest.config.js` - Jest config
- [ ] `docker-compose.yml` - Docker services

### 14.2 Glossary

| Term | Definition |
|------|------------|
| **Spec-Driven Development** | Development approach where detailed specs guide AI code generation |
| **Multi-Agent** | Multiple AI agents working in parallel or sequence |
| **MCP** | Model Context Protocol - connects Claude to external tools |
| **Hook** | Automation script that runs at specific events |
| **Skill** | Custom command or workflow in Claude Code |
| **Quality Gate** | Criteria that must be met before proceeding |
| **Agent Pool** | Group of agents running in parallel |
| **Auto-Memory** | Claude's memory system for project context |

### 14.3 Quick Reference

**Start New Feature**:
```bash
1. Write requirement in REQUIREMENTS.md
2. Claude: "Expand requirement [ID]"
3. Claude: "Generate tests for [ID]"
4. Claude: "Generate code for [ID]"
5. pnpm test
6. If fails: Claude: "Fix test failures"
7. pnpm quality:all
8. If issues: Claude: "Fix all issues"
9. git add . && git commit -m "feat: [feature]"
```

**Run Quality Checks**:
```bash
pnpm lint                  # ESLint
pnpm type-check            # TypeScript
pnpm test                  # All tests
pnpm test:coverage         # With coverage
pnpm quality:sonar         # SonarQube
pnpm quality:snyk          # Security scan
pnpm quality:all           # All checks
```

**Review AI Output**:
```bash
cat prompt-docs/TEST_EXECUTION_REPORT.md
cat prompt-docs/CODE_REVIEW_REPORT.md
cat prompt-docs/CODE_ANALYSIS_REPORT.md
cat prompt-docs/SECURITY_AUDIT_REPORT.md
```

---

## 15. Conclusion

This repository provides a **complete template** for AI-driven software development using Claude Code. By following this guide, you can:

✅ Build production-ready applications 10x faster
✅ Maintain high code quality automatically
✅ Ensure security through automated audits
✅ Follow test-first development consistently
✅ Generate comprehensive documentation automatically
✅ Scale development with multi-agent workflows

**Next Steps**:
1. Clone this repository as a template
2. Customize for your project
3. Write high-level requirements
4. Follow the 12-phase development workflow
5. Watch Claude build your application!

**Remember**: This is a template. Adapt it to your needs. The key is having clear requirements, comprehensive tests, and automated quality checks.

---

**Version**: 1.0.0
**Last Updated**: 2026-02-17
**License**: MIT
**Author**: FoodBot Team + Claude Code

**Questions?** Open an issue or reach out to the Claude Code community!

🚀 **Happy AI-Driven Development!**

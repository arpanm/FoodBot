# FoodBot - Claude Multi-Agent Development Plan

> **AI-Driven, Spec-Based Development with Claude Code**
> Version: 1.0.0 | Last Updated: 2026-02-17

---

## 📋 Table of Contents

- [1. Overview](#1-overview)
- [2. Multi-Agent Development Strategy](#2-multi-agent-development-strategy)
- [3. Development Phases](#3-development-phases)
- [4. Phase-by-Phase Claude Prompts](#4-phase-by-phase-claude-prompts)
- [5. Quality Gates](#5-quality-gates)
- [6. Progress Tracking](#6-progress-tracking)

---

## 1. Overview

### 1.1 Purpose

This document outlines the Claude-driven, multi-agent development approach for FoodBot. It provides specific prompts for each development phase, enabling AI-assisted implementation while maintaining code quality and architectural integrity.

### 1.2 Development Principles

1. **Spec-Driven**: All development based on REQUIREMENTS.md and ARCHITECTURE.md
2. **Incremental**: Build and validate incrementally
3. **Test-First**: Generate tests before implementation
4. **Quality-First**: Code review, analysis, and security before merge
5. **AI-Orchestrated**: Claude agents handle planning, coding, testing, reviewing

### 1.3 Agent Types

| Agent Type | Purpose | Parallel Execution |
|------------|---------|-------------------|
| **Requirements Agent** | Expand and clarify requirements | No |
| **Planning Agent** | Break down tasks, create implementation plan | No |
| **Test Generation Agent** | Generate test cases and test data | Yes (per module) |
| **Code Generation Agent** | Generate production code | Yes (per service) |
| **Test Execution Agent** | Run tests, report failures | No (sequential after code) |
| **Bug Fix Agent** | Fix test failures and bugs | Yes (per bug) |
| **Code Review Agent** | Review code quality, patterns, best practices | No |
| **Code Analysis Agent** | Static analysis, complexity metrics | No |
| **Security Audit Agent** | Security vulnerability scanning | No |
| **Fix & Refactor Agent** | Fix all issues from review/analysis/security | Yes (per issue type) |
| **Integration Agent** | Integration testing across services | No |
| **Documentation Agent** | Generate API docs, code comments | Yes (per service) |

---

## 2. Multi-Agent Development Strategy

### 2.1 Execution Model

```
┌────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: REQUIREMENTS                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Requirements Agent (Sequential)                             │ │
│  │  - Expand requirements                                       │ │
│  │  - Identify gaps                                             │ │
│  │  - Create detailed specs                                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                        PHASE 2: PLANNING                           │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Planning Agent (Sequential)                                 │ │
│  │  - Break down requirements to tasks                          │ │
│  │  - Define dependencies                                       │ │
│  │  - Create implementation order                               │ │
│  │  - Estimate complexity                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: TEST GENERATION                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │ Test Gen     │  │ Test Gen     │  │ Test Gen               ││
│  │ Agent        │  │ Agent        │  │ Agent                  ││
│  │ (Customer)   │  │ (Restaurant) │  │ (MCP)                  ││
│  │              │  │              │  │                        ││
│  │ - Unit tests │  │ - Unit tests │  │ - Unit tests           ││
│  │ - API tests  │  │ - API tests  │  │ - Integration tests    ││
│  └──────────────┘  └──────────────┘  └──────────────────────────┘│
│                     ⬆ PARALLEL EXECUTION ⬆                         │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: CODE GENERATION                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │ Code Gen     │  │ Code Gen     │  │ Code Gen               ││
│  │ Agent        │  │ Agent        │  │ Agent                  ││
│  │ (Frontend)   │  │ (Backend)    │  │ (MCP Layer)            ││
│  │              │  │              │  │                        ││
│  │ - Components │  │ - Services   │  │ - Orchestrator         ││
│  │ - State mgmt │  │ - Controllers│  │ - Providers            ││
│  │ - Services   │  │ - Repositories│ │ - Search service       ││
│  └──────────────┘  └──────────────┘  └──────────────────────────┘│
│                     ⬆ PARALLEL EXECUTION ⬆                         │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: TEST EXECUTION                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Test Execution Agent (Sequential)                           │ │
│  │  - Run all unit tests                                        │ │
│  │  - Run integration tests                                     │ │
│  │  - Run E2E tests                                             │ │
│  │  - Generate coverage report                                  │ │
│  │  - Report failures                                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 6: BUG FIXING                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │ Bug Fix      │  │ Bug Fix      │  │ Bug Fix                ││
│  │ Agent        │  │ Agent        │  │ Agent                  ││
│  │ (Unit Tests) │  │ (API Tests)  │  │ (E2E Tests)            ││
│  └──────────────┘  └──────────────┘  └──────────────────────────┘│
│                     ⬆ PARALLEL EXECUTION ⬆                         │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼ (Repeat Phase 5 & 6 until all pass)
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 7: CODE REVIEW                            │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Code Review Agent (Sequential)                              │ │
│  │  - Review code patterns                                      │ │
│  │  - Check best practices                                      │ │
│  │  - Verify architecture compliance                            │ │
│  │  - Identify code smells                                      │ │
│  │  - Check error handling                                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 8: CODE ANALYSIS                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Code Analysis Agent (Sequential)                            │ │
│  │  - Run ESLint                                                │ │
│  │  - Run SonarQube                                             │ │
│  │  - Check cyclomatic complexity                               │ │
│  │  - Check code duplication                                    │ │
│  │  - Verify code coverage                                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 9: SECURITY AUDIT                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Security Audit Agent (Sequential)                           │ │
│  │  - Run Snyk scan                                             │ │
│  │  - Check OWASP Top 10                                        │ │
│  │  - Verify secrets management                                 │ │
│  │  - Check authentication/authorization                        │ │
│  │  - Review input validation                                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 10: FIX & REFACTOR                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │ Fix Agent    │  │ Fix Agent    │  │ Fix Agent              ││
│  │ (Code Review)│  │ (Analysis)   │  │ (Security)             ││
│  │ Issues       │  │ Issues       │  │ Issues                 ││
│  └──────────────┘  └──────────────┘  └──────────────────────────┘│
│                     ⬆ PARALLEL EXECUTION ⬆                         │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼ (Repeat Phases 7-10 until clean)
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 11: INTEGRATION TESTING                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Integration Agent (Sequential)                              │ │
│  │  - End-to-end workflow testing                               │ │
│  │  - Cross-service integration tests                           │ │
│  │  - Performance testing                                       │ │
│  │  - Load testing                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 12: DOCUMENTATION                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │ Doc Agent    │  │ Doc Agent    │  │ Doc Agent              ││
│  │ (Frontend)   │  │ (Backend)    │  │ (MCP Layer)            ││
│  │              │  │              │  │                        ││
│  │ - JSDoc      │  │ - API docs   │  │ - API docs             ││
│  │ - README     │  │ - JSDoc      │  │ - Integration docs     ││
│  │ - Examples   │  │ - Examples   │  │ - Examples             ││
│  └──────────────┘  └──────────────┘  └──────────────────────────┘│
│                     ⬆ PARALLEL EXECUTION ⬆                         │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                          ✅ DONE
```

### 2.2 Parallel vs Sequential Execution

**Parallel Execution** (when safe):
- Multiple services/modules without shared dependencies
- Different types of fixes (review issues vs security issues)
- Independent test suites
- Documentation for different services

**Sequential Execution** (when required):
- Requirements analysis (needs complete context)
- Planning (depends on requirements)
- Test execution (needs all code ready)
- Code review (needs all code ready)
- Security audit (needs all code ready)

---

## 3. Development Phases

### 3.1 Phase Overview

| Phase | Duration Estimate | Parallel | Dependencies |
|-------|------------------|----------|--------------|
| 1. Requirements Expansion | 2-3 hours | No | None |
| 2. Task Planning | 1-2 hours | No | Phase 1 |
| 3. Test Generation | 4-6 hours | Yes | Phase 2 |
| 4. Code Generation | 12-16 hours | Yes | Phase 3 |
| 5. Test Execution | 2-3 hours | No | Phase 4 |
| 6. Bug Fixing | 4-8 hours | Yes | Phase 5 |
| 7. Code Review | 2-3 hours | No | Phase 6 |
| 8. Code Analysis | 1-2 hours | No | Phase 7 |
| 9. Security Audit | 2-3 hours | No | Phase 8 |
| 10. Fix & Refactor | 4-6 hours | Yes | Phase 9 |
| 11. Integration Testing | 3-4 hours | No | Phase 10 |
| 12. Documentation | 3-4 hours | Yes | Phase 11 |

**Total Estimate**: 40-60 hours (with parallel execution, wall-clock time: 20-30 hours)

---

## 4. Phase-by-Phase Claude Prompts

### 4.1 PHASE 1: Requirements Expansion

#### Prompt 1.1: Expand High-Level Requirements

```
# CONTEXT
You are a senior product manager and requirements analyst. Review the existing REQUIREMENTS.md file.

# TASK
Expand the high-level requirements into detailed, testable specifications:

1. For each functional requirement:
   - Break down into detailed sub-requirements
   - Add explicit acceptance criteria
   - Define edge cases
   - Specify error scenarios
   - Add data validation rules

2. For each non-functional requirement:
   - Add measurable metrics
   - Define SLAs
   - Specify performance benchmarks
   - Add monitoring requirements

3. Identify missing requirements:
   - Error handling scenarios
   - Edge cases not covered
   - Integration failure scenarios
   - Data consistency requirements
   - Audit logging requirements

# OUTPUT
Update REQUIREMENTS.md with expanded specifications. Create a new section for each major component:
- Customer Agent: Detailed user stories with acceptance criteria
- Restaurant Agent: Detailed workflows with edge cases
- MCP Layer: Integration scenarios with failure modes
- LLM Service: Prompt templates and response formats
- Workflow Service: Error handling and retry strategies

# CONSTRAINTS
- All requirements must be testable
- All acceptance criteria must be measurable
- All error scenarios must be documented
- Follow the existing document structure
```

#### Prompt 1.2: Identify Requirements Gaps

```
# CONTEXT
You are reviewing the FoodBot requirements for completeness.

# TASK
Analyze REQUIREMENTS.md and ARCHITECTURE.md to identify gaps:

1. Missing functional requirements:
   - User management (registration, profile, preferences)
   - Admin functionality (user management, restaurant approval)
   - Notification preferences
   - Payment method management
   - Refund handling
   - Customer support integration

2. Missing non-functional requirements:
   - Disaster recovery procedures
   - Data backup and retention
   - Multi-tenancy support
   - Rate limiting specifics
   - Cache invalidation strategies
   - Session management

3. Missing technical specifications:
   - API versioning strategy
   - Database migration approach
   - Feature flag system
   - A/B testing framework
   - Monitoring and alerting specifics

# OUTPUT
Create a document: prompt-docs/REQUIREMENTS_GAPS.md listing:
- All identified gaps
- Priority (Critical, High, Medium, Low)
- Recommendation for each gap
- Impact if not addressed

# NEXT STEP
After review, update REQUIREMENTS.md with critical and high-priority gaps.
```

---

### 4.2 PHASE 2: Task Planning

#### Prompt 2.1: Create Development Task Breakdown

```
# CONTEXT
You are a technical architect creating a detailed implementation plan for FoodBot.

# TASK
Create a comprehensive task breakdown based on REQUIREMENTS.md and ARCHITECTURE.md:

1. Identify all major components:
   - List all services, modules, and layers
   - Identify dependencies between components
   - Determine implementation order

2. Break down each component into tasks:
   - Database schema design
   - API endpoint implementation
   - Business logic implementation
   - Frontend component development
   - Integration points
   - Testing requirements

3. For each task, specify:
   - Task ID (e.g., FE-001, BE-001, MCP-001)
   - Description
   - Dependencies (prerequisite tasks)
   - Estimated complexity (Small, Medium, Large)
   - Files to create/modify
   - Test files required

4. Create implementation phases:
   - Phase 1: Foundation (database, core models, basic APIs)
   - Phase 2: Core Features (main workflows)
   - Phase 3: Integration (MCP layer, LLM service)
   - Phase 4: Advanced Features (analytics, recommendations)

# OUTPUT
Create: prompt-docs/TASK_BREAKDOWN.md with:
- Complete task list (200-300 tasks expected)
- Dependency graph (visual or text-based)
- Implementation order recommendation
- Parallel execution opportunities
- Critical path analysis

# FORMAT
Each task entry should follow:
```
### Task ID: [FE-001]
**Component**: Customer Agent Frontend
**Description**: Implement Chat UI component with rich cards
**Dependencies**: None
**Complexity**: Medium
**Files**:
  - Create: apps/customer-agent/src/components/Chat/ChatInterface.tsx
  - Create: apps/customer-agent/src/components/Chat/MessageCard.tsx
  - Create: apps/customer-agent/src/components/Chat/InputField.tsx
**Tests**:
  - Create: apps/customer-agent/src/components/Chat/__tests__/ChatInterface.test.tsx
**Acceptance Criteria**:
  - [ ] Chat interface displays messages
  - [ ] Cards render with images, text, attributes
  - [ ] CTA buttons trigger actions
  - [ ] Input field accepts text input
```
```

#### Prompt 2.2: Define Development Guardrails

```
# CONTEXT
You are defining coding standards and guardrails for the FoodBot project.

# TASK
Create comprehensive development guardrails:

1. Code Quality Standards:
   - TypeScript strict mode required
   - ESLint rules (no warnings allowed)
   - Prettier formatting (auto-format on save)
   - Minimum test coverage: 80%
   - Maximum cyclomatic complexity: 10
   - Maximum file length: 300 lines
   - Maximum function length: 50 lines

2. Architecture Guardrails:
   - No circular dependencies
   - No direct database access from controllers
   - All external calls must have error handling
   - All async operations must have timeouts
   - All API endpoints must have validation
   - All API responses must be typed

3. Security Guardrails:
   - No secrets in code
   - All user input sanitized
   - All SQL queries parameterized
   - All API endpoints authenticated (except public)
   - All sensitive data encrypted
   - OWASP Top 10 compliance

4. Testing Guardrails:
   - Unit tests for all business logic
   - Integration tests for all API endpoints
   - E2E tests for all user workflows
   - All tests must be deterministic
   - No hardcoded test data (use factories)
   - All external dependencies mocked in unit tests

5. Git Workflow:
   - Feature branches from main
   - PR required for all changes
   - All checks must pass before merge
   - Squash commits on merge
   - Semantic commit messages

# OUTPUT
Create: .claude/rules/development-guardrails.md
This will be used by Claude to enforce standards during code generation.
```

---

### 4.3 PHASE 3: Test Generation

#### Prompt 3.1: Generate Unit Tests (Frontend)

```
# CONTEXT
You are generating comprehensive unit tests for the Customer Agent frontend.

# TASK
For each component in apps/customer-agent/src/components/:

1. Generate test file using React Testing Library:
   - Render tests (component renders without crashing)
   - Props tests (component handles all props correctly)
   - Interaction tests (user interactions work correctly)
   - State tests (state updates work correctly)
   - Edge case tests (handles errors, empty states, loading states)

2. Generate test data factories:
   - Mock data for all component props
   - Mock API responses
   - Mock Redux state

3. Test coverage targets:
   - 100% of components
   - 100% of user interactions
   - All error scenarios
   - All edge cases

# EXAMPLE
```typescript
// apps/customer-agent/src/components/Chat/__tests__/ChatInterface.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ChatInterface } from '../ChatInterface';
import { mockStore } from '../../../test/utils/mockStore';
import { mockMessages } from '../../../test/factories/message.factory';

describe('ChatInterface', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      chat: {
        messages: mockMessages(5),
        loading: false,
        error: null,
      },
    });
  });

  it('renders without crashing', () => {
    render(
      <Provider store={store}>
        <ChatInterface />
      </Provider>
    );
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
  });

  it('displays all messages', () => {
    render(
      <Provider store={store}>
        <ChatInterface />
      </Provider>
    );
    expect(screen.getAllByTestId('message-card')).toHaveLength(5);
  });

  it('sends message on submit', async () => {
    render(
      <Provider store={store}>
        <ChatInterface />
      </Provider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    fireEvent.change(input, { target: { value: 'I want pizza' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(store.getActions()).toContainEqual(
        expect.objectContaining({
          type: 'chat/sendMessage',
          payload: { message: 'I want pizza' },
        })
      );
    });
  });

  it('handles empty message', () => {
    render(
      <Provider store={store}>
        <ChatInterface />
      </Provider>
    );

    const sendButton = screen.getByRole('button', { name: 'Send' });
    fireEvent.click(sendButton);

    expect(store.getActions()).toHaveLength(0);
  });

  it('displays loading state', () => {
    store = mockStore({
      chat: {
        messages: [],
        loading: true,
        error: null,
      },
    });

    render(
      <Provider store={store}>
        <ChatInterface />
      </Provider>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays error message', () => {
    store = mockStore({
      chat: {
        messages: [],
        loading: false,
        error: 'Failed to load messages',
      },
    });

    render(
      <Provider store={store}>
        <ChatInterface />
      </Provider>
    );

    expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
  });
});
```

# OUTPUT
Generate test files for ALL frontend components. Ensure 100% component coverage.
```

#### Prompt 3.2: Generate API Tests (Backend)

```
# CONTEXT
You are generating comprehensive API tests for the NestJS backend.

# TASK
For each controller in apps/gateway-api/src/controllers/:

1. Generate E2E test file using Supertest:
   - Successful request tests (200/201 responses)
   - Validation error tests (400 responses)
   - Authentication error tests (401 responses)
   - Authorization error tests (403 responses)
   - Not found tests (404 responses)
   - Server error handling (500 responses)

2. Generate test data factories:
   - Mock request payloads
   - Mock database entities
   - Mock external service responses

3. Test coverage targets:
   - All HTTP endpoints
   - All HTTP methods
   - All status codes
   - All validation rules
   - All error scenarios

# EXAMPLE
```typescript
// apps/gateway-api/src/controllers/__tests__/chat.controller.e2e.spec.ts

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AuthService } from '../../services/auth.service';
import { createMockUser } from '../../test/factories/user.factory';

describe('ChatController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Get auth token for tests
    const authService = app.get(AuthService);
    const mockUser = createMockUser();
    authToken = await authService.generateToken(mockUser);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/chat', () => {
    it('should create a job and return jobId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'user_123',
          message: 'I want pizza for dinner',
        })
        .expect(201);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body.jobId).toMatch(/^job_[a-zA-Z0-9]+$/);
      expect(response.body).toHaveProperty('status', 'QUEUED');
    });

    it('should return 400 for missing userId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I want pizza for dinner',
        })
        .expect(400);

      expect(response.body.message).toContain('userId');
    });

    it('should return 400 for empty message', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'user_123',
          message: '',
        })
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat')
        .send({
          userId: 'user_123',
          message: 'I want pizza',
        })
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          userId: 'user_123',
          message: 'I want pizza',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/jobs/:jobId/status', () => {
    it('should return job status', async () => {
      // First create a job
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'user_123',
          message: 'I want pizza',
        });

      const jobId = createResponse.body.jobId;

      // Then check status
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body).toHaveProperty('jobId', jobId);
      expect(statusResponse.body).toHaveProperty('status');
      expect(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED']).toContain(
        statusResponse.body.status
      );
    });

    it('should return 404 for non-existent job', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/jobs/job_nonexistent/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
```

# OUTPUT
Generate E2E test files for ALL API endpoints. Ensure 100% endpoint coverage.
```

#### Prompt 3.3: Generate Integration Tests (Workflows)

```
# CONTEXT
You are generating integration tests for Temporal workflows.

# TASK
For each workflow in packages/workflows/src/:

1. Generate workflow test file using @temporalio/testing:
   - Happy path tests (successful execution)
   - Error handling tests (activity failures)
   - Retry tests (verify retry logic)
   - Timeout tests (activity timeouts)
   - Compensation tests (rollback scenarios)

2. Mock activities:
   - Mock successful responses
   - Mock error responses
   - Mock timeout scenarios

3. Test coverage targets:
   - All workflow paths
   - All activity calls
   - All error scenarios
   - All retry scenarios
   - All compensation logic

# EXAMPLE
```typescript
// packages/workflows/src/__tests__/searchRestaurant.workflow.test.ts

import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { searchRestaurantWorkflow } from '../searchRestaurant.workflow';
import * as activities from '../activities';

describe('SearchRestaurantWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('successfully searches restaurants', async () => {
    const { client, nativeConnection } = testEnv;

    const mockActivities = {
      loadUserContext: async () => ({
        userId: 'user_123',
        preferences: { cuisine: ['Italian'] },
      }),
      callMCPSearch: async () => [
        { id: 'rest_1', name: 'Pizza Palace', cuisine: 'Italian' },
        { id: 'rest_2', name: 'Pasta House', cuisine: 'Italian' },
      ],
      cacheResults: async () => true,
    };

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test',
      workflowsPath: require.resolve('../searchRestaurant.workflow'),
      activities: mockActivities,
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(searchRestaurantWorkflow, {
        workflowId: 'test-search-1',
        taskQueue: 'test',
        args: [{ userId: 'user_123', query: 'pizza' }],
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Pizza Palace');
    });
  });

  it('handles MCP API failure with retry', async () => {
    const { client, nativeConnection } = testEnv;

    let callCount = 0;
    const mockActivities = {
      loadUserContext: async () => ({ userId: 'user_123' }),
      callMCPSearch: async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('API temporarily unavailable');
        }
        return [{ id: 'rest_1', name: 'Pizza Palace' }];
      },
      cacheResults: async () => true,
    };

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test',
      workflowsPath: require.resolve('../searchRestaurant.workflow'),
      activities: mockActivities,
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(searchRestaurantWorkflow, {
        workflowId: 'test-search-retry',
        taskQueue: 'test',
        args: [{ userId: 'user_123', query: 'pizza' }],
      });

      expect(callCount).toBe(3); // Verify it retried
      expect(result).toHaveLength(1);
    });
  });

  it('falls back to alternative provider on failure', async () => {
    const { client, nativeConnection } = testEnv;

    const mockActivities = {
      loadUserContext: async () => ({ userId: 'user_123' }),
      callMCPSearch: async (provider) => {
        if (provider === 'swiggy') {
          throw new Error('Swiggy API down');
        }
        // Fallback to mock
        return [{ id: 'rest_1', name: 'Pizza Palace' }];
      },
      cacheResults: async () => true,
    };

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test',
      workflowsPath: require.resolve('../searchRestaurant.workflow'),
      activities: mockActivities,
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(searchRestaurantWorkflow, {
        workflowId: 'test-search-fallback',
        taskQueue: 'test',
        args: [{ userId: 'user_123', query: 'pizza', provider: 'swiggy' }],
      });

      expect(result).toHaveLength(1); // Got results from fallback
    });
  });
});
```

# OUTPUT
Generate workflow test files for ALL Temporal workflows. Ensure 100% workflow coverage.
```

---

### 4.4 PHASE 4: Code Generation

#### Prompt 4.1: Generate Frontend Components

```
# CONTEXT
You are generating React components for the Customer Agent frontend based on:
- REQUIREMENTS.md (Customer Agent section)
- ARCHITECTURE.md (Frontend architecture)
- Task breakdown from TASK_BREAKDOWN.md
- Existing test files (implement to make tests pass)

# TASK
Generate components following this order:

1. **Foundation Components** (no dependencies):
   - Button, Input, Card, Loading, ErrorMessage

2. **Chat Components**:
   - ChatInterface, MessageCard, InputField, CTAButton, StatusIndicator

3. **Restaurant Components**:
   - RestaurantCard, RestaurantList, RestaurantDetail, DishCard, DishList

4. **Cart Components**:
   - CartItem, CartList, CartSummary

5. **Order Components**:
   - OrderCard, OrderList, OrderDetail, OrderTracking

6. **Layout Components**:
   - Header, Footer, Navigation, Layout

# GUARDRAILS
For EACH component:
- Use TypeScript with explicit types
- Use functional components with hooks
- Implement proper error boundaries
- Add loading states
- Add empty states
- Handle all edge cases from tests
- Follow Material-UI design system
- Add proper accessibility (ARIA labels, keyboard navigation)
- Add JSDoc comments
- NO console.log() calls
- NO hardcoded strings (use i18n)
- NO inline styles (use styled-components or sx prop)

# EXAMPLE
```typescript
// apps/customer-agent/src/components/Chat/ChatInterface.tsx

import React, { useEffect, useRef } from 'react';
import { Box, Paper } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { sendMessage } from '../../store/slices/chatSlice';
import { MessageCard } from './MessageCard';
import { InputField } from './InputField';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

/**
 * ChatInterface component provides the main chat UI for customer interactions.
 * Displays message history, handles user input, and manages chat state.
 *
 * @component
 * @example
 * ```tsx
 * <ChatInterface />
 * ```
 */
export const ChatInterface: React.FC = () => {
  const dispatch = useAppDispatch();
  const { messages, loading, error } = useAppSelector((state) => state.chat);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handles message submission from the input field
   * @param message - The message text to send
   */
  const handleSendMessage = async (message: string) => {
    if (!message.trim()) {
      return; // Don't send empty messages
    }

    try {
      await dispatch(sendMessage({ message })).unwrap();
    } catch (err) {
      // Error is handled in Redux slice
      console.error('Failed to send message:', err);
    }
  };

  if (error) {
    return (
      <Box data-testid="chat-interface" sx={{ p: 2 }}>
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      </Box>
    );
  }

  return (
    <Paper
      data-testid="chat-interface"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '80vh',
      }}
    >
      {/* Message List */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            Start a conversation by typing a message below
          </Box>
        )}

        {messages.map((message) => (
          <MessageCard key={message.id} message={message} />
        ))}

        {loading && <LoadingSpinner />}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Field */}
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <InputField onSend={handleSendMessage} disabled={loading} />
      </Box>
    </Paper>
  );
};
```

# OUTPUT
Generate ALL frontend components. Each component must:
- Make all its tests pass
- Follow TypeScript strict mode
- Have proper error handling
- Have loading/empty states
- Have accessibility support
```

#### Prompt 4.2: Generate Backend Services

```
# CONTEXT
You are generating NestJS services for the API Gateway based on:
- REQUIREMENTS.md (Backend requirements)
- ARCHITECTURE.md (Backend architecture)
- API specifications from REQUIREMENTS.md Section 7
- Existing test files (implement to make tests pass)

# TASK
Generate services following this order:

1. **Core Services** (foundational):
   - AuthService, UserService, ValidationService, LoggerService

2. **Business Logic Services**:
   - ChatService, RestaurantService, DishService, CartService
   - OrderService, PaymentService, FeedbackService

3. **Integration Services**:
   - LLMService, WorkflowService, MCPService, CacheService

4. **Infrastructure Services**:
   - DatabaseService, RedisService, KafkaService

# GUARDRAILS
For EACH service:
- Use TypeScript with explicit types
- Use dependency injection (NestJS @Injectable)
- Implement proper error handling (custom exceptions)
- Add logging for all operations
- Add input validation (class-validator)
- Add output validation (class-transformer)
- Handle all edge cases from tests
- Add JSDoc comments
- NO console.log() (use LoggerService)
- NO hardcoded values (use ConfigService)
- Wrap external calls in try-catch
- Add timeouts to external calls

# EXAMPLE
```typescript
// apps/gateway-api/src/services/chat.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { LLMService } from './llm.service';
import { WorkflowService } from './workflow.service';
import { RedisService } from './redis.service';
import { ChatMessageDto } from '../dto/chat-message.dto';
import { JobStatusDto } from '../dto/job-status.dto';
import { InvalidInputException } from '../exceptions/invalid-input.exception';

/**
 * Service for handling chat interactions and job management.
 * Processes user messages, creates async jobs, and tracks job status.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly llmService: LLMService,
    private readonly workflowService: WorkflowService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Processes a chat message and creates an async job.
   *
   * @param dto - Chat message data transfer object
   * @returns Job ID and initial status
   * @throws InvalidInputException if message is empty
   *
   * @example
   * ```typescript
   * const result = await chatService.processChatMessage({
   *   userId: 'user_123',
   *   message: 'I want pizza for dinner',
   * });
   * console.log(result.jobId); // 'job_abc123'
   * ```
   */
  async processChatMessage(dto: ChatMessageDto): Promise<JobStatusDto> {
    this.logger.log(`Processing chat message for user: ${dto.userId}`);

    // Validate input
    if (!dto.message?.trim()) {
      throw new InvalidInputException('Message cannot be empty');
    }

    // Generate job ID
    const jobId = `job_${uuidv4()}`;

    try {
      // Store initial job status
      await this.storeJobStatus(jobId, {
        status: 'QUEUED',
        userId: dto.userId,
        message: dto.message,
        createdAt: new Date().toISOString(),
      });

      // Trigger async processing (fire and forget)
      this.processMessageAsync(jobId, dto).catch((error) => {
        this.logger.error(`Async processing failed for job ${jobId}:`, error);
        this.updateJobStatus(jobId, {
          status: 'FAILED',
          error: error.message,
        });
      });

      return {
        jobId,
        status: 'QUEUED',
        message: 'Your request is being processed',
      };
    } catch (error) {
      this.logger.error(`Failed to create job for user ${dto.userId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves the current status of a job.
   *
   * @param jobId - The unique job identifier
   * @returns Current job status
   * @throws NotFoundException if job doesn't exist
   */
  async getJobStatus(jobId: string): Promise<JobStatusDto> {
    this.logger.log(`Fetching status for job: ${jobId}`);

    const status = await this.redisService.get(`job:${jobId}`);

    if (!status) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    return JSON.parse(status);
  }

  /**
   * Processes the message asynchronously.
   * Internal method that handles LLM and workflow execution.
   *
   * @param jobId - The job identifier
   * @param dto - Chat message DTO
   * @private
   */
  private async processMessageAsync(
    jobId: string,
    dto: ChatMessageDto,
  ): Promise<void> {
    try {
      // Update status: PROCESSING
      await this.updateJobStatus(jobId, { status: 'PROCESSING' });

      // Step 1: Extract intent using LLM
      this.logger.log(`Extracting intent for job: ${jobId}`);
      await this.updateJobStatus(jobId, {
        status: 'INTENT_DETECTING',
        currentStep: 'Analyzing your request...',
      });

      const intentResult = await this.llmService.extractIntent({
        userId: dto.userId,
        message: dto.message,
      });

      // Step 2: Generate workflow
      this.logger.log(`Generating workflow for job: ${jobId}`);
      await this.updateJobStatus(jobId, {
        status: 'WORKFLOW_GENERATING',
        currentStep: 'Planning the best approach...',
        intent: intentResult.intent,
      });

      const workflowJson = await this.llmService.generateWorkflow({
        intent: intentResult.intent,
        context: intentResult.context,
      });

      // Step 3: Execute workflow
      this.logger.log(`Executing workflow for job: ${jobId}`);
      await this.updateJobStatus(jobId, {
        status: 'WORKFLOW_EXECUTING',
        currentStep: 'Executing your request...',
      });

      const workflowResult = await this.workflowService.executeWorkflow({
        workflowId: jobId,
        workflowJson,
      });

      // Step 4: Complete
      this.logger.log(`Job completed successfully: ${jobId}`);
      await this.updateJobStatus(jobId, {
        status: 'COMPLETED',
        result: workflowResult,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Job processing failed: ${jobId}`, error);
      await this.updateJobStatus(jobId, {
        status: 'FAILED',
        error: error.message,
        failedAt: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Stores job status in Redis.
   * @private
   */
  private async storeJobStatus(jobId: string, status: any): Promise<void> {
    const ttl = this.configService.get<number>('JOB_STATUS_TTL', 86400); // 24 hours
    await this.redisService.setex(
      `job:${jobId}`,
      ttl,
      JSON.stringify(status),
    );
  }

  /**
   * Updates job status in Redis.
   * @private
   */
  private async updateJobStatus(
    jobId: string,
    updates: Partial<any>,
  ): Promise<void> {
    const current = await this.redisService.get(`job:${jobId}`);
    if (current) {
      const updated = { ...JSON.parse(current), ...updates };
      await this.storeJobStatus(jobId, updated);
    }
  }
}
```

# OUTPUT
Generate ALL backend services. Each service must:
- Make all its tests pass
- Follow NestJS best practices
- Have proper error handling
- Have comprehensive logging
- Have input/output validation
```

#### Prompt 4.3: Generate Temporal Workflows

```
# CONTEXT
You are generating Temporal workflows based on:
- REQUIREMENTS.md (Workflow requirements)
- ARCHITECTURE.md (Workflow architecture)
- Existing workflow test files

# TASK
Generate workflows following this order:

1. **Search Workflows**:
   - SearchRestaurantWorkflow
   - SearchDishWorkflow

2. **Order Workflows**:
   - PlaceOrderWorkflow
   - OrderTrackingWorkflow
   - CancelOrderWorkflow

3. **Payment Workflows**:
   - ProcessPaymentWorkflow
   - RefundPaymentWorkflow

4. **Recommendation Workflows**:
   - GenerateRecommendationsWorkflow
   - UpdatePreferencesWorkflow

# GUARDRAILS
For EACH workflow:
- Use TypeScript with Temporal decorators
- Define activities separately
- Add retry policies for each activity
- Add timeout configurations
- Implement compensation logic
- Add status updates at each step
- Handle all error scenarios
- Add logging via workflow.log()
- Make tests pass

# EXAMPLE
```typescript
// packages/workflows/src/searchRestaurant.workflow.ts

import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from './activities';

// Proxy activities with retry and timeout configs
const {
  loadUserContext,
  callMCPSearch,
  applyFilters,
  rankResults,
  cacheResults,
  updateJobStatus,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

/**
 * Workflow for searching restaurants based on user query.
 * Handles user context loading, MCP API calls, filtering, and ranking.
 *
 * @param input - Search input parameters
 * @returns Array of restaurant results
 */
export async function searchRestaurantWorkflow(input: {
  userId: string;
  query: string;
  filters?: any;
  provider?: 'mock' | 'swiggy' | 'zomato';
}): Promise<any[]> {
  log.info('Starting restaurant search workflow', { input });

  try {
    // Step 1: Load user context
    await updateJobStatus(input.userId, {
      status: 'PROCESSING',
      currentStep: 'Loading your preferences...',
    });

    const userContext = await loadUserContext(input.userId);
    log.info('User context loaded', { userId: input.userId });

    // Step 2: Call MCP search API with retry and circuit breaker
    await updateJobStatus(input.userId, {
      status: 'PROCESSING',
      currentStep: 'Searching restaurants...',
    });

    let searchResults;
    const provider = input.provider || 'mock';

    try {
      searchResults = await callMCPSearch({
        provider,
        query: input.query,
        location: userContext.location,
      });
      log.info('MCP search completed', {
        provider,
        resultCount: searchResults.length,
      });
    } catch (error) {
      log.warn(`MCP search failed for provider: ${provider}`, { error });

      // Fallback to alternative provider
      if (provider === 'swiggy') {
        log.info('Falling back to mock provider');
        searchResults = await callMCPSearch({
          provider: 'mock',
          query: input.query,
          location: userContext.location,
        });
      } else {
        throw error; // Re-throw if no fallback available
      }
    }

    // Step 3: Apply filters
    await updateJobStatus(input.userId, {
      status: 'PROCESSING',
      currentStep: 'Applying filters...',
    });

    const filteredResults = await applyFilters({
      results: searchResults,
      filters: {
        ...input.filters,
        // Add user preference filters
        cuisine: userContext.preferences?.cuisine,
        priceRange: userContext.preferences?.priceRange,
      },
    });

    log.info('Filters applied', { resultCount: filteredResults.length });

    // Step 4: Rank results based on user preferences
    await updateJobStatus(input.userId, {
      status: 'PROCESSING',
      currentStep: 'Personalizing results...',
    });

    const rankedResults = await rankResults({
      results: filteredResults,
      userContext,
    });

    log.info('Results ranked', { topResult: rankedResults[0]?.name });

    // Step 5: Cache results for future queries
    await cacheResults({
      userId: input.userId,
      query: input.query,
      results: rankedResults,
    });

    // Step 6: Update final status
    await updateJobStatus(input.userId, {
      status: 'COMPLETED',
      currentStep: 'Done!',
      result: rankedResults,
    });

    log.info('Search workflow completed successfully');

    return rankedResults;
  } catch (error) {
    log.error('Search workflow failed', { error });

    await updateJobStatus(input.userId, {
      status: 'FAILED',
      error: error.message,
    });

    throw error;
  }
}
```

```typescript
// packages/workflows/src/activities/index.ts

import { RedisService } from './redis.service';
import { Neo4jService } from './neo4j.service';
import { MCPClient } from './mcp.client';

/**
 * Loads user context from Redis and Neo4j preference graph.
 */
export async function loadUserContext(userId: string): Promise<any> {
  const redisService = new RedisService();
  const neo4jService = new Neo4jService();

  // Try Redis cache first
  const cached = await redisService.get(`user:context:${userId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Load from Neo4j
  const preferences = await neo4jService.getUserPreferences(userId);
  const location = await neo4jService.getUserLocation(userId);

  const context = {
    userId,
    preferences,
    location,
  };

  // Cache for 30 minutes
  await redisService.setex(
    `user:context:${userId}`,
    1800,
    JSON.stringify(context),
  );

  return context;
}

/**
 * Calls MCP provider search API.
 */
export async function callMCPSearch(params: {
  provider: string;
  query: string;
  location?: any;
}): Promise<any[]> {
  const client = new MCPClient(params.provider);
  return await client.searchRestaurants({
    query: params.query,
    location: params.location,
  });
}

/**
 * Applies filters to search results.
 */
export async function applyFilters(params: {
  results: any[];
  filters: any;
}): Promise<any[]> {
  let filtered = params.results;

  if (params.filters.cuisine) {
    filtered = filtered.filter((r) =>
      params.filters.cuisine.includes(r.cuisine),
    );
  }

  if (params.filters.priceRange) {
    filtered = filtered.filter((r) => r.priceRange <= params.filters.priceRange);
  }

  if (params.filters.rating) {
    filtered = filtered.filter((r) => r.rating >= params.filters.rating);
  }

  return filtered;
}

/**
 * Ranks results based on user preferences.
 */
export async function rankResults(params: {
  results: any[];
  userContext: any;
}): Promise<any[]> {
  // Scoring algorithm based on user preferences
  return params.results
    .map((restaurant) => {
      let score = restaurant.rating * 10; // Base score from rating

      // Boost score if matches user preferences
      if (params.userContext.preferences?.cuisine?.includes(restaurant.cuisine)) {
        score += 20;
      }

      // Boost score if frequently ordered from
      if (params.userContext.preferences?.frequentRestaurants?.includes(restaurant.id)) {
        score += 30;
      }

      return { ...restaurant, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Caches search results in vector database.
 */
export async function cacheResults(params: {
  userId: string;
  query: string;
  results: any[];
}): Promise<void> {
  // Implementation for vector DB caching
  // This would use embedding generation and vector storage
}

/**
 * Updates job status in Redis.
 */
export async function updateJobStatus(
  userId: string,
  status: any,
): Promise<void> {
  const redisService = new RedisService();
  // Implementation for status updates
}
```

# OUTPUT
Generate ALL Temporal workflows and activities. Each must:
- Make all tests pass
- Have proper error handling
- Have retry policies
- Have compensation logic
- Have status updates
```

---

### 4.5 PHASE 5: Test Execution

#### Prompt 5.1: Run All Tests

```
# CONTEXT
All code has been generated. Now run the complete test suite.

# TASK
Execute tests in this order:

1. **Unit Tests (Parallel)**:
   ```bash
   # Frontend unit tests
   cd apps/customer-agent && pnpm test --coverage
   cd apps/restaurant-agent && pnpm test --coverage

   # Backend unit tests
   cd apps/gateway-api && pnpm test:unit --coverage
   cd packages/llm-router && pnpm test --coverage
   cd packages/workflows && pnpm test --coverage
   ```

2. **Integration Tests (Sequential)**:
   ```bash
   # Start test database and services
   docker-compose -f docker-compose.test.yml up -d

   # Run API integration tests
   cd apps/gateway-api && pnpm test:integration

   # Run workflow integration tests
   cd packages/workflows && pnpm test:integration

   # Cleanup
   docker-compose -f docker-compose.test.yml down
   ```

3. **E2E Tests (Sequential)**:
   ```bash
   # Start all services
   docker-compose up -d
   pnpm docker:health # Wait for healthy

   # Run E2E tests
   cd apps/customer-agent && pnpm test:e2e
   cd apps/restaurant-agent && pnpm test:e2e

   # Cleanup
   docker-compose down
   ```

# OUTPUT FORMAT
For each test suite, capture:
- Total tests
- Passed tests
- Failed tests
- Coverage percentage
- Failed test details (test name, error message, stack trace)

Generate report: prompt-docs/TEST_EXECUTION_REPORT.md

Example format:
```markdown
# Test Execution Report

## Summary
- **Total Tests**: 1,247
- **Passed**: 1,189
- **Failed**: 58
- **Coverage**: 76.4%

## Failed Tests

### Frontend Unit Tests (12 failures)

#### 1. ChatInterface.test.tsx - should handle network error
**Error**:
```
Expected error message to be displayed
Expected: "Network error occurred"
Received: undefined
```

**Stack Trace**:
```
at Object.<anonymous> (ChatInterface.test.tsx:145:23)
```

**Fix Required**: Add network error handling in ChatInterface component
```

# NEXT STEP
After generating report, proceed to Phase 6 (Bug Fixing) for all failed tests.
```

---

### 4.6 PHASE 6: Bug Fixing

#### Prompt 6.1: Fix Test Failures (Parallel)

```
# CONTEXT
Test execution report shows 58 failed tests across different categories.
Fix failures in parallel by category.

# TASK
Create 3 parallel fix agents:

**Agent 1: Fix Frontend Test Failures**
```
Review all failed frontend tests in TEST_EXECUTION_REPORT.md.
For each failure:
1. Read the test file
2. Read the component implementation
3. Understand the failure reason
4. Fix the component to make the test pass
5. Run the specific test to verify fix
6. Move to next failure

Guardrails:
- Fix only what's needed to pass the test
- Don't modify test logic unless test is wrong
- Maintain existing functionality
- Don't introduce new bugs
```

**Agent 2: Fix Backend Test Failures**
```
Review all failed backend tests in TEST_EXECUTION_REPORT.md.
For each failure:
1. Read the test file
2. Read the service/controller implementation
3. Understand the failure reason
4. Fix the implementation to make the test pass
5. Run the specific test to verify fix
6. Move to next failure

Guardrails:
- Fix only what's needed to pass the test
- Don't modify test logic unless test is wrong
- Maintain existing functionality
- Add proper error handling if missing
```

**Agent 3: Fix Workflow Test Failures**
```
Review all failed workflow tests in TEST_EXECUTION_REPORT.md.
For each failure:
1. Read the test file
2. Read the workflow implementation
3. Understand the failure reason
4. Fix the workflow to make the test pass
5. Run the specific test to verify fix
6. Move to next failure

Guardrails:
- Fix only what's needed to pass the test
- Don't modify test logic unless test is wrong
- Maintain workflow state consistency
- Ensure retry/compensation logic correct
```

# OUTPUT
Each agent generates: prompt-docs/FIX_REPORT_{CATEGORY}.md
- List of fixed tests
- Changes made
- Verification results

# REPEAT
After all fixes, run Phase 5 again. Repeat Phase 6 until all tests pass.
```

---

### 4.7 PHASE 7: Code Review

#### Prompt 7.1: Comprehensive Code Review

```
# CONTEXT
All tests are now passing. Perform comprehensive code review.

# TASK
Review all generated code against these criteria:

## 1. Architecture Compliance
- [ ] Components follow defined architecture
- [ ] Dependencies flow in correct direction
- [ ] No circular dependencies
- [ ] Proper separation of concerns
- [ ] Repository pattern followed
- [ ] No business logic in controllers

## 2. Code Quality
- [ ] Functions are small (< 50 lines)
- [ ] Files are manageable (< 300 lines)
- [ ] Cyclomatic complexity < 10
- [ ] No code duplication (DRY principle)
- [ ] Meaningful variable names
- [ ] Consistent naming conventions
- [ ] Proper use of TypeScript types
- [ ] No 'any' types (except where necessary)

## 3. Error Handling
- [ ] All external calls wrapped in try-catch
- [ ] Errors logged with context
- [ ] User-friendly error messages
- [ ] No silent failures
- [ ] Proper error types used
- [ ] Errors propagated correctly

## 4. Performance
- [ ] No unnecessary re-renders (React)
- [ ] Proper use of memoization
- [ ] Lazy loading for heavy components
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Proper use of caching
- [ ] Async operations parallelized where possible

## 5. Security
- [ ] No secrets in code
- [ ] All inputs validated
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF protection in place
- [ ] Authentication required
- [ ] Authorization checked
- [ ] Sensitive data not logged

## 6. Best Practices
- [ ] SOLID principles followed
- [ ] Design patterns used appropriately
- [ ] Comments explain "why" not "what"
- [ ] JSDoc for public methods
- [ ] Consistent code style
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] No TODO comments

# OUTPUT FORMAT
Generate: prompt-docs/CODE_REVIEW_REPORT.md

For each issue found:
```markdown
### Issue: [Brief description]
**Severity**: Critical | High | Medium | Low
**File**: path/to/file.ts:line
**Category**: Architecture | Quality | Error Handling | Performance | Security | Best Practice

**Description**:
Detailed explanation of the issue.

**Current Code**:
\`\`\`typescript
// Current problematic code
\`\`\`

**Recommended Fix**:
\`\`\`typescript
// Recommended solution
\`\`\`

**Rationale**:
Why this is an issue and why the fix is better.
```

# SUMMARY
At the end, provide:
- Total issues found: X
- By severity: Critical (X), High (X), Medium (X), Low (X)
- By category breakdown
- Overall code quality score (1-10)
```

---

### 4.8 PHASE 8: Code Analysis

#### Prompt 8.1: Static Code Analysis

```
# CONTEXT
Run static analysis tools on the codebase.

# TASK
Execute analysis tools in this order:

## 1. ESLint
```bash
pnpm lint
```

Capture:
- Total issues
- Errors
- Warnings
- File-by-file breakdown

## 2. SonarQube
```bash
pnpm quality:sonar
```

Capture:
- Code smells
- Bugs
- Vulnerabilities
- Security hotspots
- Technical debt
- Code coverage
- Duplications
- Maintainability rating

## 3. TypeScript Compiler
```bash
pnpm type-check
```

Capture:
- Type errors
- Strict mode violations

## 4. Complexity Analysis
```bash
npx complexity-report src/
```

Capture:
- High complexity functions (> 10)
- Average complexity
- Maintainability index

# OUTPUT FORMAT
Generate: prompt-docs/CODE_ANALYSIS_REPORT.md

```markdown
# Code Analysis Report

## ESLint Results
- **Total Issues**: 142
- **Errors**: 12
- **Warnings**: 130

### Top Issues
1. **@typescript-eslint/no-explicit-any** (45 occurrences)
   - Severity: Error
   - Files: [list of files]

2. **@typescript-eslint/no-unused-vars** (38 occurrences)
   - Severity: Warning
   - Files: [list of files]

## SonarQube Results
- **Bugs**: 8
- **Code Smells**: 67
- **Vulnerabilities**: 3
- **Security Hotspots**: 12
- **Technical Debt**: 2d 4h
- **Coverage**: 76.4%
- **Duplications**: 3.2%
- **Maintainability**: B

### Critical Issues
[List critical issues]

## TypeScript Results
- **Type Errors**: 23
- **Strict Mode Violations**: 45

### Top Type Issues
[List type errors]

## Complexity Analysis
- **High Complexity Functions**: 15
- **Average Complexity**: 4.2
- **Maintainability Index**: 72 (Good)

### Functions > Complexity 10
1. **searchRestaurantWorkflow** - Complexity: 15
2. **processOrderPayment** - Complexity: 12
```

# NEXT STEP
Proceed to Phase 9 (Security Audit), then fix all issues in Phase 10.
```

---

### 4.9 PHASE 9: Security Audit

#### Prompt 9.1: Comprehensive Security Audit

```
# CONTEXT
Perform comprehensive security audit on the codebase.

# TASK
Run security tools and manual review:

## 1. Snyk Scan
```bash
pnpm quality:snyk
```

Capture:
- Vulnerability count by severity
- Dependency vulnerabilities
- Code vulnerabilities
- License issues

## 2. OWASP Top 10 Review
Manually review code for:

### A01:2021 - Broken Access Control
- [ ] Check all API endpoints have authentication
- [ ] Check authorization for sensitive operations
- [ ] Check user can't access other users' data
- [ ] Check admin operations require admin role

### A02:2021 - Cryptographic Failures
- [ ] Check secrets not in code
- [ ] Check passwords hashed (bcrypt)
- [ ] Check sensitive data encrypted at rest
- [ ] Check HTTPS enforced

### A03:2021 - Injection
- [ ] Check SQL queries parameterized
- [ ] Check NoSQL queries sanitized
- [ ] Check user input validated
- [ ] Check no code execution from user input

### A04:2021 - Insecure Design
- [ ] Check rate limiting implemented
- [ ] Check circuit breakers in place
- [ ] Check no sensitive data in logs
- [ ] Check no sensitive data in error messages

### A05:2021 - Security Misconfiguration
- [ ] Check no default credentials
- [ ] Check security headers set
- [ ] Check unnecessary features disabled
- [ ] Check error messages don't leak info

### A06:2021 - Vulnerable Components
- [ ] Check all dependencies up to date
- [ ] Check no known vulnerabilities
- [ ] Check dependencies from trusted sources

### A07:2021 - Authentication Failures
- [ ] Check strong password policy
- [ ] Check account lockout implemented
- [ ] Check JWT properly validated
- [ ] Check session timeout configured

### A08:2021 - Software and Data Integrity
- [ ] Check npm packages verified
- [ ] Check CI/CD pipeline secure
- [ ] Check no unsigned code deployed

### A09:2021 - Logging and Monitoring
- [ ] Check all security events logged
- [ ] Check logs monitored
- [ ] Check alerts configured
- [ ] Check audit trail complete

### A10:2021 - Server-Side Request Forgery
- [ ] Check URLs validated
- [ ] Check no arbitrary URL fetching
- [ ] Check internal services protected

## 3. API Security Review
- [ ] Check all endpoints documented
- [ ] Check all endpoints have rate limiting
- [ ] Check all endpoints have input validation
- [ ] Check all endpoints have output encoding
- [ ] Check CORS configured correctly
- [ ] Check API versioning in place

## 4. Authentication & Authorization
- [ ] Check JWT secret is strong
- [ ] Check JWT expiration configured
- [ ] Check refresh token rotation
- [ ] Check RBAC implemented
- [ ] Check principle of least privilege

## 5. Data Protection
- [ ] Check PII identified
- [ ] Check PII encrypted
- [ ] Check PII not in logs
- [ ] Check data retention policy
- [ ] Check data deletion implemented

# OUTPUT FORMAT
Generate: prompt-docs/SECURITY_AUDIT_REPORT.md

```markdown
# Security Audit Report

## Executive Summary
- **Total Vulnerabilities**: 23
- **Critical**: 2
- **High**: 8
- **Medium**: 10
- **Low**: 3

## Critical Vulnerabilities

### 1. SQL Injection in Search Query
**Severity**: Critical
**File**: apps/gateway-api/src/services/restaurant.service.ts:45
**OWASP**: A03:2021 - Injection

**Description**:
User input directly concatenated into SQL query without parameterization.

**Vulnerable Code**:
\`\`\`typescript
const query = `SELECT * FROM restaurants WHERE name LIKE '%${searchTerm}%'`;
\`\`\`

**Impact**:
Attacker can execute arbitrary SQL, potentially accessing or deleting all data.

**Fix**:
\`\`\`typescript
const query = `SELECT * FROM restaurants WHERE name LIKE $1`;
const params = [`%${searchTerm}%`];
\`\`\`

### 2. JWT Secret Exposed
**Severity**: Critical
**File**: apps/gateway-api/src/config/jwt.config.ts:3
**OWASP**: A02:2021 - Cryptographic Failures

**Description**:
JWT secret hardcoded in source code.

**Vulnerable Code**:
\`\`\`typescript
const JWT_SECRET = 'mysecretkey';
\`\`\`

**Impact**:
Attacker can forge JWT tokens and impersonate any user.

**Fix**:
\`\`\`typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
\`\`\`

[Continue for all vulnerabilities...]
```

# NEXT STEP
Proceed to Phase 10 to fix all security issues.
```

---

### 4.10 PHASE 10: Fix & Refactor

#### Prompt 10.1: Fix All Issues (Parallel)

```
# CONTEXT
We have three reports with issues to fix:
- CODE_REVIEW_REPORT.md (code quality issues)
- CODE_ANALYSIS_REPORT.md (static analysis issues)
- SECURITY_AUDIT_REPORT.md (security vulnerabilities)

# TASK
Create 3 parallel fix agents:

**Agent 1: Fix Code Review Issues**
```
Review CODE_REVIEW_REPORT.md and fix all issues by priority:

Priority Order:
1. Critical severity
2. High severity
3. Medium severity
4. Low severity

For each issue:
1. Read the file
2. Locate the problematic code
3. Apply the recommended fix
4. Verify the fix doesn't break tests
5. Run tests for that file
6. Move to next issue

Guardrails:
- Don't break existing functionality
- Maintain test coverage
- Follow recommended fixes from report
- Add tests if fixing uncovered code
```

**Agent 2: Fix Code Analysis Issues**
```
Review CODE_ANALYSIS_REPORT.md and fix all issues:

1. Fix ESLint errors first
2. Fix TypeScript type errors
3. Reduce complexity in high-complexity functions
4. Fix ESLint warnings
5. Address SonarQube code smells

For each issue:
1. Understand the rule violation
2. Apply appropriate fix
3. Run linter to verify
4. Run tests to ensure no breakage
5. Move to next issue

Guardrails:
- Don't use @ts-ignore or eslint-disable unless absolutely necessary
- If rule is incorrect, document why and disable with comment
- Prefer refactoring over disabling rules
```

**Agent 3: Fix Security Issues**
```
Review SECURITY_AUDIT_REPORT.md and fix ALL security issues:

Priority Order:
1. Critical vulnerabilities (MUST FIX ALL)
2. High vulnerabilities (MUST FIX ALL)
3. Medium vulnerabilities
4. Low vulnerabilities

For each vulnerability:
1. Read the file
2. Understand the vulnerability
3. Apply the recommended fix
4. Verify fix resolves vulnerability
5. Add test for the security issue
6. Run all tests
7. Move to next vulnerability

Guardrails:
- NEVER compromise security for convenience
- Always use recommended fixes
- Add security tests
- Document security assumptions
```

# OUTPUT
Each agent generates: prompt-docs/FIX_REPORT_{CATEGORY}.md

Example:
```markdown
# Code Review Fixes Report

## Summary
- **Total Issues**: 89
- **Fixed**: 89
- **Could Not Fix**: 0

## Fixed Issues

### 1. Reduce Cyclomatic Complexity in searchRestaurantWorkflow
**File**: packages/workflows/src/searchRestaurant.workflow.ts
**Original Complexity**: 15
**New Complexity**: 8

**Changes Made**:
- Extracted filter logic to separate function
- Extracted ranking logic to separate function
- Simplified error handling

**Verification**:
- ✅ Tests passing
- ✅ Complexity reduced
- ✅ Functionality maintained
```

# VERIFICATION
After all fixes:
1. Run full test suite (Phase 5)
2. Run static analysis (Phase 8)
3. Run security audit (Phase 9)
4. Verify all issues resolved

# REPEAT
If any issues remain, repeat Phase 10 for remaining issues.
```

---

### 4.11 PHASE 11: Integration Testing

#### Prompt 11.1: End-to-End Integration Tests

```
# CONTEXT
All unit tests pass, all issues fixed. Now test end-to-end workflows.

# TASK
Create integration test suites for complete user journeys:

## Test Suite 1: Customer Order Journey
```typescript
// tests/integration/customer-order-journey.test.ts

describe('Customer Order Journey - End to End', () => {
  it('completes full order flow: search → select → cart → checkout → track', async () => {
    // 1. User opens app and searches
    const searchResponse = await api.post('/api/v1/chat', {
      userId: testUser.id,
      message: 'I want pizza',
    });

    expect(searchResponse.status).toBe(201);
    const jobId = searchResponse.body.jobId;

    // 2. Poll for search results
    const results = await pollForCompletion(jobId);
    expect(results.status).toBe('COMPLETED');
    expect(results.result).toHaveLength(10);

    // 3. Select restaurant and view menu
    const restaurantId = results.result[0].id;
    const menuResponse = await api.get(`/api/v1/restaurants/${restaurantId}`);
    expect(menuResponse.body.menu).toBeDefined();

    // 4. Add items to cart
    const dish = menuResponse.body.menu[0].dishes[0];
    await api.post('/api/v1/cart/items', {
      dishId: dish.id,
      quantity: 2,
    });

    const cart = await api.get('/api/v1/cart');
    expect(cart.body.items).toHaveLength(1);

    // 5. Proceed to checkout
    const checkoutResponse = await api.post('/api/v1/orders', {
      cartId: cart.body.id,
      addressId: testUser.addresses[0].id,
      paymentMethod: 'card',
    });

    expect(checkoutResponse.status).toBe(201);
    const orderId = checkoutResponse.body.orderId;

    // 6. Track order
    const tracking = await api.get(`/api/v1/orders/${orderId}/tracking`);
    expect(tracking.body.status).toBe('placed');

    // 7. Wait for restaurant confirmation (simulated)
    await waitForOrderStatus(orderId, 'confirmed', 30000);

    // 8. Verify order complete
    const finalOrder = await api.get(`/api/v1/orders/${orderId}`);
    expect(finalOrder.body.status).toBe('confirmed');
    expect(finalOrder.body.total).toBeGreaterThan(0);
  });
});
```

## Test Suite 2: Restaurant Order Management
```typescript
// tests/integration/restaurant-order-management.test.ts

describe('Restaurant Order Management - End to End', () => {
  it('completes order lifecycle: receive → accept → prepare → deliver', async () => {
    // 1. Customer places order (from customer side)
    const orderId = await createTestOrder();

    // 2. Restaurant receives order notification
    const orders = await restaurantApi.get('/api/v1/restaurant/orders');
    const newOrder = orders.body.find(o => o.id === orderId);
    expect(newOrder.status).toBe('placed');

    // 3. Restaurant accepts order
    await restaurantApi.put(`/api/v1/restaurant/orders/${orderId}/status`, {
      status: 'confirmed',
    });

    // Verify customer sees update
    const customerOrder = await api.get(`/api/v1/orders/${orderId}`);
    expect(customerOrder.body.status).toBe('confirmed');

    // 4. Restaurant updates to preparing
    await restaurantApi.put(`/api/v1/restaurant/orders/${orderId}/status`, {
      status: 'preparing',
    });

    // 5. Restaurant marks ready
    await restaurantApi.put(`/api/v1/restaurant/orders/${orderId}/status`, {
      status: 'ready_for_pickup',
    });

    // 6. Delivery partner picks up
    await restaurantApi.put(`/api/v1/restaurant/orders/${orderId}/status`, {
      status: 'out_for_delivery',
    });

    // 7. Order delivered
    await restaurantApi.put(`/api/v1/restaurant/orders/${orderId}/status`, {
      status: 'delivered',
    });

    // Verify final state
    const finalOrder = await api.get(`/api/v1/orders/${orderId}`);
    expect(finalOrder.body.status).toBe('delivered');
  });
});
```

## Test Suite 3: Multi-Provider Failover
```typescript
// tests/integration/mcp-provider-failover.test.ts

describe('MCP Provider Failover', () => {
  it('falls back to alternative provider when primary fails', async () => {
    // 1. Configure Swiggy as primary
    await configService.set('MCP_PRIMARY_PROVIDER', 'swiggy');

    // 2. Simulate Swiggy failure
    swiggyMock.onGet('/search').reply(500);

    // 3. Search should fall back to mock provider
    const searchResponse = await api.post('/api/v1/chat', {
      userId: testUser.id,
      message: 'I want pizza',
    });

    const jobId = searchResponse.body.jobId;
    const results = await pollForCompletion(jobId);

    // 4. Verify results received from fallback provider
    expect(results.status).toBe('COMPLETED');
    expect(results.result).toBeDefined();
    expect(results.metadata.provider).toBe('mock'); // Fell back to mock

    // 5. Verify circuit breaker opened for Swiggy
    const circuitStatus = await api.get('/api/v1/health/circuit-breakers');
    expect(circuitStatus.body.swiggy).toBe('open');
  });
});
```

## Test Suite 4: Performance & Load Testing
```typescript
// tests/integration/performance.test.ts

describe('Performance & Load Testing', () => {
  it('handles 100 concurrent users', async () => {
    const startTime = Date.now();

    // Create 100 concurrent requests
    const requests = Array.from({ length: 100 }, (_, i) =>
      api.post('/api/v1/chat', {
        userId: `user_${i}`,
        message: 'I want pizza',
      })
    );

    const responses = await Promise.all(requests);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all succeeded
    responses.forEach((response) => {
      expect(response.status).toBe(201);
      expect(response.body.jobId).toBeDefined();
    });

    // Verify performance (should complete in < 10 seconds)
    expect(duration).toBeLessThan(10000);

    // Verify average response time
    const avgResponseTime = duration / 100;
    expect(avgResponseTime).toBeLessThan(100); // < 100ms per request
  });

  it('maintains p95 latency under load', async () => {
    const latencies = [];

    for (let i = 0; i < 1000; i++) {
      const start = Date.now();
      await api.get('/api/v1/restaurants/search?q=pizza');
      const latency = Date.now() - start;
      latencies.push(latency);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    expect(p95).toBeLessThan(500); // p95 < 500ms
  });
});
```

# EXECUTION
Run all integration tests:
```bash
# Start all services
docker-compose up -d
pnpm docker:health

# Run integration tests
pnpm test:integration

# Generate report
pnpm test:integration:report
```

# OUTPUT
Generate: prompt-docs/INTEGRATION_TEST_REPORT.md
- All test suites executed
- Pass/fail status
- Performance metrics
- Any issues found
```

---

### 4.12 PHASE 12: Documentation

#### Prompt 12.1: Generate API Documentation

```
# CONTEXT
Generate comprehensive API documentation for all endpoints.

# TASK
For each API endpoint:

1. **OpenAPI/Swagger Spec**:
   - Generate OpenAPI 3.0 spec
   - Include all endpoints
   - Include all request/response schemas
   - Include authentication requirements
   - Include example requests/responses
   - Include error responses

2. **API Reference Guide**:
   - Organized by domain (Chat, Restaurant, Order, etc.)
   - Clear descriptions
   - Request examples (curl, JavaScript, TypeScript)
   - Response examples
   - Error scenarios
   - Rate limits

3. **Integration Guides**:
   - How to authenticate
   - How to handle async jobs
   - How to handle errors
   - How to use polling
   - Best practices

# EXAMPLE OUTPUT
```markdown
# FoodBot API Documentation

## Authentication

All API endpoints require authentication using JWT Bearer tokens.

### Obtaining a Token

\`\`\`bash
curl -X POST https://api.foodbot.com/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
\`\`\`

**Response**:
\`\`\`json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
\`\`\`

## Chat API

### POST /api/v1/chat

Creates an async job to process a chat message.

**Authentication**: Required

**Request**:
\`\`\`json
{
  "userId": "user_123",
  "message": "I want pizza for dinner"
}
\`\`\`

**Response**: 201 Created
\`\`\`json
{
  "jobId": "job_abc123",
  "status": "QUEUED",
  "message": "Your request is being processed"
}
\`\`\`

**Error Responses**:

- **400 Bad Request**: Invalid input
  \`\`\`json
  {
    "statusCode": 400,
    "message": "userId is required",
    "error": "Bad Request"
  }
  \`\`\`

- **401 Unauthorized**: Missing or invalid token
  \`\`\`json
  {
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
  }
  \`\`\`

**Rate Limit**: 100 requests per minute

**Example (curl)**:
\`\`\`bash
curl -X POST https://api.foodbot.com/api/v1/chat \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "user_123",
    "message": "I want pizza for dinner"
  }'
\`\`\`

**Example (JavaScript)**:
\`\`\`javascript
const response = await fetch('https://api.foodbot.com/api/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user_123',
    message: 'I want pizza for dinner',
  }),
});

const data = await response.json();
console.log(data.jobId);
\`\`\`

[Continue for all endpoints...]
```

# OUTPUT
Generate:
- docs/api/openapi.yaml (OpenAPI spec)
- docs/api/README.md (API reference guide)
- docs/api/integration-guide.md (Integration guide)
- docs/api/authentication.md (Auth guide)
- docs/api/error-handling.md (Error handling guide)
```

#### Prompt 12.2: Generate Code Documentation

```
# CONTEXT
Generate comprehensive code-level documentation.

# TASK
For each module:

1. **README.md**:
   - Module purpose
   - Key components
   - Usage examples
   - Configuration
   - Testing

2. **Architecture diagrams**:
   - Component relationships
   - Data flow
   - Integration points

3. **Code comments**:
   - JSDoc for all public functions/methods
   - Inline comments for complex logic
   - Type documentation

# EXAMPLE
```markdown
# Customer Agent Module

## Overview
The Customer Agent is a Capacitor + React mobile application that provides a conversational interface for food ordering.

## Architecture

\`\`\`
┌─────────────────────────────────────┐
│      Customer Agent App             │
├─────────────────────────────────────┤
│  ┌───────────┐  ┌─────────────────┐│
│  │  UI Layer │  │  State Management││
│  │  (React)  │──│  (Redux)        ││
│  └───────────┘  └─────────────────┘│
│       │                │            │
│  ┌────▼────────────────▼──────────┐│
│  │     Service Layer               ││
│  │  (API calls, business logic)    ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
           │
           ▼
    API Gateway (NestJS)
\`\`\`

## Key Components

### ChatInterface
Primary chat UI component.

**Location**: `src/components/Chat/ChatInterface.tsx`

**Props**:
\`\`\`typescript
interface ChatInterfaceProps {
  // No props - uses Redux for state
}
\`\`\`

**Usage**:
\`\`\`typescript
import { ChatInterface } from './components/Chat/ChatInterface';

function App() {
  return (
    <Provider store={store}>
      <ChatInterface />
    </Provider>
  );
}
\`\`\`

### RestaurantCard
Displays restaurant information in a card format.

**Location**: `src/components/Restaurant/RestaurantCard.tsx`

**Props**:
\`\`\`typescript
interface RestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (id: string) => void;
}
\`\`\`

[Continue for all components...]

## Configuration

### Environment Variables
\`\`\`bash
REACT_APP_API_URL=https://api.foodbot.com
REACT_APP_WS_URL=wss://api.foodbot.com
\`\`\`

### Build Configuration
See `capacitor.config.ts` for platform-specific configurations.

## Development

### Setup
\`\`\`bash
cd apps/customer-agent
pnpm install
\`\`\`

### Development Server
\`\`\`bash
pnpm dev
\`\`\`

### Build
\`\`\`bash
# Web
pnpm build

# iOS
pnpm build:ios

# Android
pnpm build:android
\`\`\`

### Testing
\`\`\`bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:coverage
\`\`\`

## Testing

### Unit Tests
All components have corresponding test files in `__tests__` directories.

Example:
\`\`\`bash
pnpm test ChatInterface
\`\`\`

### E2E Tests
End-to-end tests are in `e2e/` directory using Playwright.

Example:
\`\`\`bash
pnpm test:e2e:order-flow
\`\`\`

## Troubleshooting

### Common Issues

#### Build fails on iOS
Make sure Xcode is installed and up to date.

#### API requests failing
Check `REACT_APP_API_URL` environment variable is set correctly.
```

# OUTPUT
Generate README.md for each module:
- apps/customer-agent/README.md
- apps/restaurant-agent/README.md
- apps/gateway-api/README.md
- packages/llm-router/README.md
- packages/workflows/README.md
- packages/mcp-orchestrator/README.md
```

---

## 5. Quality Gates

### 5.1 Quality Gate Criteria

Each phase must meet these criteria before proceeding:

| Phase | Quality Gate |
|-------|-------------|
| **Phase 3: Test Generation** | • All modules have test files<br>• Test coverage plan > 80%<br>• All test data factories created |
| **Phase 4: Code Generation** | • All planned files created<br>• No syntax errors<br>• TypeScript compiles without errors |
| **Phase 5: Test Execution** | • Initial test run completed<br>• Failures documented<br>• Report generated |
| **Phase 6: Bug Fixing** | • **100% tests passing**<br>• Coverage > 80%<br>• No skipped tests |
| **Phase 7: Code Review** | • Review completed<br>• Issues documented<br>• All critical issues noted |
| **Phase 8: Code Analysis** | • ESLint: 0 errors<br>• TypeScript: 0 type errors<br>• SonarQube: A or B rating |
| **Phase 9: Security Audit** | • **0 critical vulnerabilities**<br>• **0 high vulnerabilities**<br>• Medium/low documented |
| **Phase 10: Fix & Refactor** | • All critical issues fixed<br>• All high issues fixed<br>• Medium issues addressed |
| **Phase 11: Integration** | • All integration tests pass<br>• Performance targets met<br>• Load tests pass |
| **Phase 12: Documentation** | • API docs complete<br>• Code docs complete<br>• Integration guides complete |

### 5.2 Acceptance Criteria

✅ **Project is DONE when**:
- [ ] All tests passing (unit, integration, E2E)
- [ ] Test coverage > 80%
- [ ] ESLint: 0 errors, < 10 warnings
- [ ] TypeScript: 0 type errors
- [ ] SonarQube: Rating A or B
- [ ] 0 critical security vulnerabilities
- [ ] 0 high security vulnerabilities
- [ ] All API endpoints documented
- [ ] All modules have README
- [ ] Integration tests pass
- [ ] Performance tests meet targets
- [ ] Load tests pass (100 concurrent users)

---

## 6. Progress Tracking

### 6.1 Progress Checklist

Track overall progress:

```markdown
## Phase Completion Tracking

- [ ] Phase 1: Requirements Expansion _____________ %
- [ ] Phase 2: Task Planning _____________ %
- [ ] Phase 3: Test Generation _____________ %
- [ ] Phase 4: Code Generation _____________ %
- [ ] Phase 5: Test Execution _____________ %
- [ ] Phase 6: Bug Fixing _____________ %
- [ ] Phase 7: Code Review _____________ %
- [ ] Phase 8: Code Analysis _____________ %
- [ ] Phase 9: Security Audit _____________ %
- [ ] Phase 10: Fix & Refactor _____________ %
- [ ] Phase 11: Integration Testing _____________ %
- [ ] Phase 12: Documentation _____________ %

## Overall Progress: ______ %

## Metrics
- Total Tasks: _______
- Completed Tasks: _______
- Test Coverage: _______ %
- Code Quality Score: _______
- Security Score: _______
```

### 6.2 Daily Status Updates

Generate daily: `prompt-docs/STATUS_UPDATE_YYYY-MM-DD.md`

```markdown
# Daily Status Update - 2026-02-17

## Today's Progress
- Completed Phase 4 (Code Generation) for Customer Agent Frontend
- 45 components generated
- 127 test files passing
- Started Phase 4 for Backend Services

## Blockers
- None

## Next Steps
- Complete Backend Services code generation
- Start MCP Orchestrator implementation
- Begin Phase 5 (Test Execution) tomorrow

## Metrics
- Overall Progress: 42%
- Tests Passing: 892 / 1,247 (71%)
- Coverage: 76.4%
- Files Generated: 234 / 450 (52%)

## Issues
- 3 high-complexity functions need refactoring
- 12 ESLint warnings to address
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-17
**Estimated Completion**: 2026-02-27 (10 days with parallel execution)

# TASK-WF-001: Multi-Mode Workflow Execution Engine

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 22 days
**Component:** Workflows / Temporal / Agent SDKs / Browser Extension
**Depends On:** TASK-MCP-004 (order workflows)
**Blocks:** Browser-based ordering, agent SDK workflows, adaptive execution
**Related Requirements:** temporal-workflows-requirements.md, FR-DEV-AGENT-001

---

## Overview

Implement a multi-mode workflow execution system that supports multiple execution engines: Temporal (backend server-side), Agent SDKs (Claude/OpenAI/Gemini for AI-driven workflows), Browser-based (Chrome extension/Open Claw for client-side browser automation), and a hybrid mode that can dynamically switch between engines based on the workflow requirements. Each workflow is stored as a portable JSON definition and routed to the appropriate engine with full resilience patterns.

---

## Requirements

### Functional Requirements

1. **Workflow Definition Format (Portable JSON)**
   - Universal workflow schema (engine-agnostic)
   - Steps: action, condition, parallel, loop, wait, signal, human-in-loop
   - Step types: API_CALL, MCP_CALL, BROWSER_ACTION, LLM_CALL, DB_OPERATION, NOTIFICATION
   - Input/output mapping between steps
   - Error handling per step (retry, fallback, compensate)
   - Workflow metadata: required_engine, preferred_engine, timeout, priority
   - Workflow versioning
   - Workflow templates library
   - JSON Schema validation for workflow definitions

2. **Temporal Engine (Server-Side)**
   - Complete 9 workflow implementations:
     - searchRestaurant (done)
     - placeOrder (done)
     - processPayment (done)
     - orderFulfillment (done)
     - userOnboarding (done)
     - restaurantOnboarding (done)
     - partyOrderScheduler (new)
     - dietDailyScheduler (new)
     - bulkOrderProcessor (new)
   - Activity implementations for all step types
   - Saga compensations for all workflows
   - Workflow visibility and query API
   - Workflow signal handling
   - Long-running workflow support (days/weeks for diet plans)
   - Cron workflow scheduling
   - Workflow versioning (for safe deployment)

3. **Agent SDK Engine (AI-Driven)**
   - Claude Agent SDK integration
     - Tool definitions matching MCP operations
     - Conversation-based workflow execution
     - Streaming status updates
   - OpenAI Assistants API integration
     - Function calling for workflow steps
     - Thread-based conversation management
   - Gemini Agent SDK integration
     - Function declarations for operations
     - Multi-turn conversation flow
   - Common agent interface (AgentWorkflowExecutor)
   - Agent selection based on:
     - MCP compatibility (Claude has native MCP support)
     - Task complexity routing
     - Cost optimization
     - Latency requirements
   - Agent conversation persistence
   - Agent fallback chain (Claude → OpenAI → Gemini)

4. **Browser Engine (Client-Side)**
   - Chrome extension workflow executor (existing, extend)
   - Workflow JSON → browser action sequence
   - DOM analysis using on-device LLM (small model in extension)
   - Platform-specific selectors (Swiggy, Zomato)
   - Action types: click, type, scroll, wait, extract, navigate
   - Visual confirmation of actions
   - Screenshot capture at each step
   - Error detection from DOM state
   - Fallback: notify user for manual step
   - Open Claw-like implementation for mobile web
   - Headless browser mode for server-side browser automation (Puppeteer)

5. **Workflow Router**
   - Analyze workflow to determine best engine
   - Rules:
     - Has API/MCP calls → Temporal (preferred) or Agent SDK
     - Requires browser interaction → Browser Engine
     - Needs AI reasoning → Agent SDK
     - Mix → Hybrid (split across engines)
   - Configuration-based override per workflow type
   - A/B testing between engines
   - Cost-based routing (Temporal cheapest, Agent SDK most flexible)
   - Health-based routing (route away from unhealthy engines)

6. **Resilience Patterns (All Engines)**
   - Retry with exponential backoff (max 3 attempts)
   - Circuit breaker per engine and per step type
   - Bulkhead (isolated thread pools per engine)
   - Timeout per step and per workflow
   - Fallback chain (primary engine → secondary → manual)
   - Back-tracing (rewind to last good state)
   - Alternative plan execution (if step fails, try alternative)
   - Compensation/rollback for completed steps
   - Dead letter handling for unrecoverable failures

7. **Workflow Monitoring & Status**
   - Per-step status tracking (PENDING, RUNNING, COMPLETED, FAILED, COMPENSATING)
   - Real-time status streaming to frontend
   - Workflow execution timeline visualization
   - Step-level metrics (duration, retries, errors)
   - Workflow SLA monitoring
   - Alert on workflow failures
   - Audit trail for all workflow executions

### Architecture

```
Workflow Execution Flow:
Workflow JSON → Router → Select Engine → Execute Steps → Update Status

Engines:
├── TemporalEngine
│   ├── WorkflowStarter
│   ├── ActivityRegistry
│   ├── SagaManager
│   └── VisibilityAPI
├── AgentSDKEngine
│   ├── ClaudeAgentExecutor
│   │   ├── MCPToolProvider
│   │   ├── ConversationManager
│   │   └── StreamingHandler
│   ├── OpenAIAgentExecutor
│   │   ├── FunctionCallingHandler
│   │   ├── ThreadManager
│   │   └── RunManager
│   ├── GeminiAgentExecutor
│   │   ├── FunctionDeclarationHandler
│   │   └── SessionManager
│   └── AgentSelectionStrategy
├── BrowserEngine
│   ├── ChromeExtensionExecutor
│   │   ├── DOMAnalyzer (on-device LLM)
│   │   ├── ActionSimulator
│   │   ├── ScreenshotCapture
│   │   └── PlatformSelectors
│   ├── PuppeteerExecutor (server-side)
│   │   ├── BrowserPool
│   │   ├── PageManager
│   │   └── ActionExecutor
│   └── MobileWebExecutor (future)
├── WorkflowRouter
│   ├── EngineAnalyzer
│   ├── ConfigRouter
│   ├── ABTestRouter
│   ├── CostRouter
│   └── HealthRouter
├── ResilienceLayer
│   ├── RetryManager
│   ├── CircuitBreakerRegistry
│   ├── BulkheadManager
│   ├── TimeoutManager
│   ├── FallbackChain
│   ├── BackTracer
│   └── CompensationManager
└── MonitoringLayer
    ├── StatusTracker
    ├── MetricsCollector
    ├── TimelineBuilder
    ├── SLAMonitor
    └── AuditLogger

Workflow JSON Schema:
{
  "id": "wf-uuid",
  "name": "Place Order via Swiggy",
  "version": "1.0.0",
  "preferred_engine": "temporal",
  "fallback_engines": ["agent_sdk", "browser"],
  "timeout_ms": 300000,
  "steps": [
    {
      "id": "step-1",
      "name": "Search Restaurant",
      "type": "MCP_CALL",
      "config": { "provider": "swiggy", "method": "search" },
      "input_mapping": { "query": "$.workflow.input.query" },
      "retry": { "max_attempts": 3, "backoff": "exponential" },
      "timeout_ms": 10000,
      "on_failure": { "strategy": "fallback", "fallback_step": "step-1b" }
    }
  ],
  "compensations": [...]
}
```

### Acceptance Criteria
- [ ] Portable workflow JSON schema defined and validated
- [ ] Temporal engine executing all 9 workflows
- [ ] Claude Agent SDK executing workflows with MCP tools
- [ ] OpenAI Assistants executing workflows with function calling
- [ ] Gemini Agent executing workflows with function declarations
- [ ] Browser engine executing Swiggy/Zomato workflows
- [ ] Workflow router selecting appropriate engine
- [ ] Configuration-based engine override working
- [ ] Retry with exponential backoff (all engines)
- [ ] Circuit breaker per engine
- [ ] Bulkhead isolation between engines
- [ ] Back-tracing to last good state
- [ ] Alternative plan execution on step failure
- [ ] Compensation/rollback for all workflows
- [ ] Real-time status streaming to frontend
- [ ] Workflow execution timeline visualization
- [ ] Performance: workflow routing < 10ms, step execution measured per engine
- [ ] 85%+ test coverage
- [ ] Integration tests per engine
- [ ] E2E: order through Temporal → fallback to Agent SDK → fallback to Browser

---

## SDLC Phases

### Phase 1: Design & Schema (Days 1-3)
- Define portable workflow JSON schema
- Design engine interfaces
- Design router logic
- Architecture review

### Phase 2: Temporal Engine Enhancement (Days 4-8)
- Implement 3 new workflows (partyOrderScheduler, dietDailyScheduler, bulkOrderProcessor)
- Add saga compensations
- Add cron scheduling support
- Add workflow versioning

### Phase 3: Agent SDK Engine (Days 9-13)
- Claude Agent SDK executor
- OpenAI Assistants executor
- Gemini Agent executor
- Agent selection strategy
- Agent fallback chain

### Phase 4: Browser Engine Integration (Days 14-16)
- Workflow JSON executor for Chrome extension
- DOM analyzer LLM integration
- Puppeteer executor for server-side

### Phase 5: Router & Resilience (Days 17-19)
- Workflow router implementation
- Retry, circuit breaker, bulkhead
- Back-tracing and compensation
- Fallback chain

### Phase 6: Monitoring & Testing (Days 20-22)
- Status tracking and timeline
- SLA monitoring
- Integration tests per engine
- E2E multi-engine test
- Performance testing

---

## Files to Create/Modify

**Workflow Core:**
- `packages/workflows/src/schema/workflow-definition.schema.ts`
- `packages/workflows/src/schema/workflow-validator.ts`
- `packages/workflows/src/router/workflow-router.ts`
- `packages/workflows/src/router/engine-analyzer.ts`
- `packages/workflows/src/router/cost-router.ts`
- `packages/workflows/src/resilience/retry-manager.ts`
- `packages/workflows/src/resilience/circuit-breaker-registry.ts`
- `packages/workflows/src/resilience/bulkhead-manager.ts`
- `packages/workflows/src/resilience/back-tracer.ts`
- `packages/workflows/src/resilience/compensation-manager.ts`
- `packages/workflows/src/monitoring/status-tracker.ts`
- `packages/workflows/src/monitoring/timeline-builder.ts`

**Temporal Engine (extend):**
- `packages/workflows/src/workflows/partyOrderScheduler.workflow.ts`
- `packages/workflows/src/workflows/dietDailyScheduler.workflow.ts`
- `packages/workflows/src/workflows/bulkOrderProcessor.workflow.ts`

**Agent SDK Engine:**
- `packages/workflows/src/engines/agent-sdk/claude-agent-executor.ts`
- `packages/workflows/src/engines/agent-sdk/openai-agent-executor.ts`
- `packages/workflows/src/engines/agent-sdk/gemini-agent-executor.ts`
- `packages/workflows/src/engines/agent-sdk/agent-selection-strategy.ts`

**Browser Engine (extend):**
- `chrome-extension/src/workflow/workflow-json-executor.ts`
- `chrome-extension/src/workflow/dom-analyzer-llm.ts`
- `packages/workflows/src/engines/browser/puppeteer-executor.ts`

**Tests:**
- `packages/workflows/src/__tests__/router/*.spec.ts`
- `packages/workflows/src/__tests__/resilience/*.spec.ts`
- `packages/workflows/src/__tests__/engines/*.spec.ts`
- `packages/workflows/src/__tests__/e2e/multi-engine.spec.ts`

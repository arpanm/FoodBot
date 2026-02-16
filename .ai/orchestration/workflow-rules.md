## Workflow Rules — How Agents Must Execute Work

### 1. Workflow is the Source of Execution Truth

All user intents must resolve to a validated workflow JSON before execution.

No service may execute user intent directly.

---

### 2. Workflow Lifecycle

```
Prompt → Plan → Validate → Execute → Observe → Adapt → Complete
```

---

### 3. Mandatory Workflow Properties

Every workflow must include:

- "intent"
- "steps[]"
- "rollback_strategy"
- "observability_hooks"
- "timeout_policy"

---

### 4. Execution Rules

```
Rule| Description
No Direct Calls| Agents cannot call MCP APIs directly
Temporal Only| Execution must go through Temporal
Retry First| Failures retried before escalation
Compensation Ready| Each action must support undo
```

---

### 5. Parallelization Policy

Parallel execution allowed only when steps are:

- Stateless
- Independent
- Idempotent

---

### 6. Self-Healing Loop

If a workflow step fails:

Diagnose → Replan → Retry Alternate Path

Claude may regenerate sub-workflow, not entire plan.

---

### 7. Observability Requirement

Each step must emit:

```
jobId
stepName
status
duration
provider
```

---

### 8. Provider Switching Rule

If Swiggy MCP fails → fallback to:

Mock MCP OR Zomato MCP

This decision is made by workflow, not runtime code.

---

### 9. Workflow Validation

Before execution:

- Schema validation required
- Risk scoring required
- Dependency check required

Invalid workflows must be rejected, not corrected silently.

workflow_version: required backward_compatibility: must be preserved for N-1
version

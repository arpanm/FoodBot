## Coding Standards — Rules for Generated and Human Code

### 1. Code Philosophy

All code must be:

- Deterministic
- Observable
- Replaceable
- Domain-driven

Avoid cleverness. Prefer clarity.

---

### 2. Structure Rules

Each service must follow:

```
controller/
service/
domain/
infrastructure/
contracts/
```

No business logic allowed in controllers.

---

### 3. API Design Rules

APIs must be:

- Idempotent where possible
- Versioned
- Fully typed
- Observable

---

### 4. Error Handling Standard

Never throw raw exceptions.

Use:

```
DomainError → ApplicationError → APIError
```

---

### 5. Logging Standard

Every external call must log:

```
correlationId
provider
latency
result
```

---

### 6. Test Requirements

Minimum:

- Unit Tests
- Contract Tests
- Workflow Simulation Tests

LLM-generated code without tests is invalid.

---

### 7. Security Requirements

Never:

- Embed API keys
- Trust LLM output blindly
- Skip validation layers

---

### 8. Temporal Activities Rule

Activities must:

- Be idempotent
- Accept retry safely
- Avoid shared mutable state

---

### 9. UI Standards

Frontend must render based on backend schema.

No hardcoded business decisions in React.

---

### 10. Code Review Expectation

Generated code must pass:

- Static analysis
- Security scan
- Architectural compliance check

```
/generated → AI may overwrite
/core → AI must patch via diff only
/contracts → immutable without approval
```

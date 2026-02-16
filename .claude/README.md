# 🪝 Claude Code Hooks - SDLC Automation

This directory contains Claude Code lifecycle hooks that automate the
spec-driven development pipeline.

## 📁 Structure

```
.claude/
├── hooks/                    # Hook scripts
│   ├── on-spec-created.sh
│   ├── on-task-planned.sh
│   ├── on-code-generated.sh
│   ├── on-tests-failed.sh
│   ├── on-security-risk.sh
│   └── on-release-candidate.sh
├── hooks.yaml               # Hook configuration
└── README.md                # This file
```

## 🎯 Available Hooks

### 1. `on-spec-created.sh`

**Trigger:** When specifications are created/modified **Purpose:** Validate spec
completeness and trigger architecture design

**Checks:**

- ✅ Required sections present (Purpose, Architecture, Requirements)
- ✅ No ambiguous terms (TBD, TODO, maybe)
- ✅ Architecture compliance
- ✅ Traceability and acceptance criteria

**Next Steps:**

- Invokes `ArchitectureDesigner` skill
- Triggers `TaskPlanner` skill

---

### 2. `on-task-planned.sh`

**Trigger:** After task breakdown is created **Purpose:** Validate task
structure and dependencies

**Checks:**

- ✅ Valid JSON structure
- ✅ No circular dependencies
- ✅ Task completeness (id, description, definition_of_done)
- ✅ Test strategy coverage (≥80%)
- ✅ Observability hooks present

---

### 3. `on-code-generated.sh` 🚨 BLOCKING

**Trigger:** Before code is committed **Purpose:** Pre-commit validation and
quality gates

**Checks:**

- ✅ Code compilation
- ✅ Linting (ESLint/Prettier)
- ✅ Code formatting
- ✅ Architecture compliance
- ✅ Guardrail validation

**On Failure:** Blocks commit until issues are resolved

---

### 4. `on-tests-failed.sh`

**Trigger:** When test execution fails **Purpose:** Self-healing loop automation

**Actions:**

1. Reads test failure report
2. Checks iteration count (max: 3)
3. Invokes `Fixer` skill
4. Re-runs tests automatically
5. Escalates if max iterations reached

**Environment Variables:**

- `CLAUDE_FIX_ITERATION` - Current iteration count
- `CLAUDE_MAX_FIX_ITERATIONS` - Maximum iterations (default: 3)

---

### 5. `on-security-risk.sh` 🚨 BLOCKING

**Trigger:** When security scan detects vulnerabilities **Purpose:** Block
deployment on high-severity issues

**Severity Actions:**

- 🔴 **CRITICAL** → Block
- 🟠 **HIGH** → Block (configurable)
- 🟡 **MEDIUM** → Warn
- 🟢 **LOW** → Info

**Environment Variables:**

- `SECURITY_BLOCK_ON_HIGH` - Block on high severity (default: true)

---

### 6. `on-release-candidate.sh` 🚨 BLOCKING

**Trigger:** Before release/merge to main **Purpose:** Final quality gate
validation

**Readiness Score Calculation:**

```
Readiness = TestCoverage * 0.3
          + CodeQuality * 0.2
          + SecurityScore * 0.3
          + ArchitectureCompliance * 0.2
```

**Quality Gates:**

- Test Coverage ≥ 80%
- Readiness Score ≥ 0.85
- No high/critical security vulnerabilities
- Clean build
- All required documentation present

---

## 🔧 Configuration

Edit [hooks.yaml](hooks.yaml) to customize hook behavior:

```yaml
hooks:
  on_code_generated:
    enabled: true
    blocking: true

  on_tests_failed:
    auto_remediate: true
    max_iterations: 3

  on_security_risk:
    blocking: true
    severity_levels:
      critical: block
      high: block

settings:
  telemetry_enabled: true
  fail_fast: false
  timeout: 300
```

## 🚀 Usage

### Manual Invocation

```bash
# Run a specific hook
.claude/hooks/on-code-generated.sh

# Run with arguments
.claude/hooks/on-tests-failed.sh test-results.json

# Run security hook with severity
.claude/hooks/on-security-risk.sh security-report.json high
```

### Automatic Triggers

Hooks are automatically triggered by Claude Code during:

- File changes (code generation)
- Command execution (test failures)
- Branch operations (release candidates)

### Integration with Skills

Hooks integrate with Claude agent skills defined in [.ai/skills/](.ai/skills/):

```yaml
on_code_generated:
  invoke_skills:
    - CodeReviewer
    - StaticAnalyzer

on_tests_failed:
  invoke_skills:
    - Fixer
    - TestRunner
```

## 📊 Observability

All hooks emit telemetry events to track:

- Execution duration
- Success/failure rates
- Quality gate metrics
- Iteration counts

Events are sent to: `http://localhost:8090/events`

### Event Format

```json
{
  "event": "hook.onCodeGenerated",
  "status": "success",
  "duration_seconds": 12,
  "failures": [],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🛡️ Guardrails

All hooks enforce guardrails defined in:

- [.ai/prompts/system-prompt.md](../.ai/prompts/system-prompt.md)
- [.ai/prompts/coding-standard.md](../.ai/prompts/coding-standard.md)
- [tools/utils/guardrails.js](../tools/utils/guardrails.js)

**Protected Paths:**

- `/.ai` - AI control plane
- `/packages/contracts` - API contracts

## 🔄 Self-Healing Flow

```
Test Fails
    ↓
on-tests-failed.sh
    ↓
Invoke Fixer Agent
    ↓
Apply Minimal Patch
    ↓
Re-run Tests
    ↓
Success? → Continue
Fail? → Retry (max 3)
    ↓
Max Iterations? → Escalate
```

## 📝 Environment Variables

Create `.env` with:

```bash
# Hook behavior
CLAUDE_FIX_ITERATION=0
CLAUDE_MAX_FIX_ITERATIONS=3

# Quality gates
MIN_TEST_COVERAGE=80
MIN_READINESS_SCORE=0.85
SECURITY_BLOCK_ON_HIGH=true

# Observability
OBSERVABILITY_URL=http://localhost:8090/events
```

## 🐛 Debugging

Enable verbose output:

```bash
# Set debug mode
export DEBUG=1

# Run hook with verbose output
bash -x .claude/hooks/on-code-generated.sh
```

## 🔗 Related Documentation

- [Claude Multi-Agent SDLC](../.ai/orchestration/claude-multi-agent.md) -
  Overall automation framework
- [Workflow Rules](../.ai/orchestration/workflow-rules.md) - Execution rules
- [Skills Directory](../.ai/skills/) - Agent skill definitions
- [Plugins Directory](../.ai/plugins/) - Execution tools

## 📦 Dependencies

Hooks require:

- ✅ bash (≥4.0)
- ✅ Node.js (≥20)
- ✅ jq (for JSON parsing)
- ✅ bc (for arithmetic)
- ✅ pnpm (package manager)

Install missing dependencies:

```bash
# macOS
brew install jq bc

# Ubuntu/Debian
apt-get install jq bc

# Verify installation
jq --version
bc --version
```

## 🎯 Success Criteria

Hooks are working correctly when:

- ✅ Code generation automatically validates before commit
- ✅ Test failures trigger automatic healing (≤3 iterations)
- ✅ Security issues block deployment
- ✅ Release candidates pass quality gates
- ✅ All events are emitted to observability endpoint
- ✅ Manual intervention only required after max iterations

## 🚨 Troubleshooting

### Hook not executing

```bash
# Check permissions
ls -la .claude/hooks/

# Make executable
chmod +x .claude/hooks/*.sh
```

### Hook failing silently

```bash
# Check for errors
bash -x .claude/hooks/on-code-generated.sh 2>&1 | tee hook-debug.log
```

### Telemetry not working

```bash
# Verify observability endpoint
curl -X POST http://localhost:8090/events \
  -H "Content-Type: application/json" \
  -d '{"test": "hook"}'
```

---

**Last Updated:** 2024-02-17 **Version:** 1.0 **Maintainer:** Claude Code
Automation System

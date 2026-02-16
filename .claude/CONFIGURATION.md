# 📋 Claude Code Configuration Guide

Complete guide to all Claude Code configurations for the FoodBot project.

---

## 📁 Configuration Files

```
.claude/
├── config.yaml          # Main project configuration
├── rules.md             # Coding rules and constraints
├── guardrails.yaml      # Safety constraints
├── skills.yaml          # Custom command shortcuts
├── settings.yaml        # IDE integration settings
├── .claudeignore        # Context exclusion patterns
├── hooks.yaml           # Hook configuration
└── hooks/               # Hook scripts
    ├── on-spec-created.sh
    ├── on-task-planned.sh
    ├── on-code-generated.sh
    ├── on-tests-failed.sh
    ├── on-security-risk.sh
    └── on-release-candidate.sh
```

---

## 🎯 config.yaml

**Purpose:** Main Claude Code project configuration

### Key Sections

#### Context Management

```yaml
context:
  entry_files:
    - .ai/context/product-spec.md
    - .ai/context/architecture.md
    - .claude/rules.md

  smart_context:
    enabled: true
    max_files: 50
    relevance_threshold: 0.7
```

#### Development Rules

```yaml
rules:
  spec_driven:
    enabled: true
    require_spec_before_code: true

  code_generation:
    include_tests: true
    add_observability: true

  testing:
    min_coverage: 80
```

#### Guardrails

```yaml
guardrails:
  file_operations:
    immutable_paths:
      - '/.ai/schema/**'
      - '/packages/contracts/published/**'

    protected_paths:
      - '/.ai/**'
      - '/packages/contracts/**'
```

#### Multi-LLM Routing

```yaml
llm_routing:
  planner:
    provider: 'claude'
    model: 'claude-sonnet-4-5'

  validator:
    provider: 'openai'
    model: 'gpt-4'

  classifier:
    provider: 'gemini'
    model: 'gemini-pro'
```

#### Quality Gates

```yaml
quality:
  pre_commit:
    enabled: true
    run_linting: true
    run_formatting: true

  pre_release:
    min_readiness: 0.85
    require_documentation: true
```

---

## 📜 rules.md

**Purpose:** Project-specific coding rules and best practices

### Core Principles

1. **Spec-Driven Development** - Read specs before generating code
2. **LLM Planning, Deterministic Execution** - LLMs decide WHAT, services decide
   HOW
3. **Workflow-First Architecture** - All execution through Temporal

### Forbidden Actions

- ❌ Hardcode secrets
- ❌ Use eval()
- ❌ Bypass Temporal workflows
- ❌ Generate code without tests
- ❌ Modify protected paths without confirmation

### Required Practices

- ✅ Follow existing patterns
- ✅ Include comprehensive tests
- ✅ Add observability hooks
- ✅ Handle errors gracefully
- ✅ Use TypeScript strict mode

### Architecture Constraints

```
Controllers → Services → Domain ← Infrastructure
     ↓            ↓
     X            X
(No business    (No HTTP
  logic)         concerns)
```

### See Full Details

[.claude/rules.md](.claude/rules.md)

---

## 🛡️ guardrails.yaml

**Purpose:** Safety constraints and validation rules

### File System Protection

#### Immutable Paths (Never Modify)

- `/.git/**` - Git internals
- `/.ai/schema/**` - Schema definitions
- `/packages/contracts/published/**` - Published contracts
- `/.claude/hooks/**` - Hook scripts

#### Protected Paths (Require Confirmation)

- `/.ai/**` - AI configuration
- `/packages/contracts/**` - API contracts
- `/infra/**` - Infrastructure

### Code Guardrails

#### Forbidden Patterns

```yaml
- pattern: "eval\\("
  severity: critical

- pattern: "password|secret|key.*=\\s*['\"]"
  severity: critical
  message: 'Potential hardcoded secret'

- pattern: "\\.only\\(|fdescribe\\("
  severity: medium
  auto_fix: true
```

#### Required Patterns

```yaml
- file_pattern: '**/temporal/workflows/*.ts'
  pattern: '@workflow'
  message: 'Workflows must have @workflow decorator'
```

### Security Guardrails

#### Secret Detection

- API keys
- AWS credentials
- Private keys
- JWT tokens
- Database URLs

#### Dependency Validation

- Scan on add
- Block deprecated packages
- Block vulnerable dependencies
- Severity threshold: HIGH

### Architecture Guardrails

#### Layer Boundaries

```yaml
controller:
  may_import: [services, domain, contracts]
  must_not_import: [infrastructure]

domain:
  may_import: []
  must_not_import: [services, infrastructure, controllers]
```

### LLM Guardrails

- ❌ No direct execution
- ❌ No state mutation
- ✅ Validate all outputs
- ✅ Schema validation required

---

## 🔧 skills.yaml

**Purpose:** Custom command shortcuts

### Quick Access Commands

| Command   | Alias          | Description                |
| --------- | -------------- | -------------------------- |
| `/spec`   | `/s`           | Open product specification |
| `/arch`   | -              | Open architecture docs     |
| `/rules`  | `/r`           | Open coding rules          |
| `/hooks`  | `/h`           | List all hooks             |
| `/verify` | `/v`, `/check` | Verify installation        |

### Quality Commands

| Command     | Alias        | Description       |
| ----------- | ------------ | ----------------- |
| `/lint`     | `/l`         | Run linting       |
| `/format`   | `/f`, `/fmt` | Format code       |
| `/test`     | `/t`         | Run tests         |
| `/coverage` | `/cov`       | Generate coverage |

### Build Commands

| Command          | Alias | Description        |
| ---------------- | ----- | ------------------ |
| `/build`         | `/b`  | Build all packages |
| `/clean`         | `/c`  | Clean artifacts    |
| `/release-check` | `/rc` | Validate release   |

### Agent Skills

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `/expand-requirements` | Invoke RequirementExpander      |
| `/design-architecture` | Invoke ArchitectureDesigner     |
| `/plan-tasks`          | Invoke TaskPlanner              |
| `/generate-code`       | Invoke CodeGenerator            |
| `/review`              | Invoke CodeReviewer             |
| `/fix`                 | Invoke Fixer (auto-remediation) |

### Workflows

```yaml
/full-pipeline:
  - expand-requirements
  - design-architecture
  - plan-tasks
  - generate-code
  - generate-tests
  - review
  - analyze
  - security-audit
  - validate-release
```

### Usage Examples

```bash
# Open specification
/spec

# Run specific hook
/hook code-generated

# Run tests
/test

# Complete pipeline
/full-pipeline
```

---

## ⚙️ settings.yaml

**Purpose:** IDE integration and user preferences

### Editor Integration

#### Inline Suggestions

```yaml
inline_suggestions:
  enabled: true
  trigger: auto
  delay_ms: 500
```

#### Diagnostics

```yaml
diagnostics:
  enabled: true
  severity_levels: [error, warning, info]
  update_on_save: true
```

### File Watching

```yaml
watch:
  - pattern: '.ai/**/*.md'
    reload_on_change: true

  - pattern: '.env'
    notify_on_change: true
```

### Context Management

```yaml
smart_context:
  enabled: true
  max_files: 50
  relevance_threshold: 0.7
```

### Keyboard Shortcuts (VS Code)

- `cmd+shift+s` - Open spec
- `cmd+shift+h` - Run hook
- `cmd+shift+f` - Format code
- `cmd+shift+t` - Run tests

### Language Settings

```yaml
typescript:
  format_on_save: true
  organize_imports: true
  fix_on_save: ['source.fixAll.eslint']
```

---

## 🚫 .claudeignore

**Purpose:** Exclude files from Claude's context

### Excluded Patterns

#### Dependencies

```
node_modules/
.yarn/
.pnpm/
```

#### Build Outputs

```
dist/
build/
coverage/
```

#### Logs & Caches

```
*.log
.cache/
.turbo/
```

#### Sensitive Files

```
.env
secrets.yaml
*.key
*.pem
```

#### Large Files

```
*.jpg
*.png
*.pdf
*.zip
```

---

## 🪝 hooks.yaml

**Purpose:** Hook configuration and triggers

### Available Hooks

1. **on-spec-created** - Spec validation
2. **on-task-planned** - Task validation
3. **on-code-generated** - Pre-commit (BLOCKING)
4. **on-tests-failed** - Self-healing
5. **on-security-risk** - Security blocking (BLOCKING)
6. **on-release-candidate** - Release validation (BLOCKING)

### Configuration Example

```yaml
hooks:
  on_code_generated:
    enabled: true
    blocking: true
    triggers:
      - file_pattern: 'apps/**/*.{ts,tsx}'
        events: ['created', 'modified']
```

### See Full Details

[.claude/hooks.yaml](.claude/hooks.yaml)
[.claude/README.md (Hooks)](.claude/README.md)

---

## 🚀 Getting Started

### 1. Verify Configuration

```bash
# Check all configurations are valid
.claude/verify-hooks.sh
```

### 2. Set Up Environment

```bash
# Copy and configure
cp .env.example .env

# Edit with your settings
nano .env
```

### 3. Test Configuration

```bash
# Test a hook
.claude/hooks/on-code-generated.sh

# Run quality checks
/lint && /format && /test
```

### 4. Start Development

```bash
# Start dev servers
/dev

# Or run full pipeline
/full-pipeline
```

---

## 📊 Configuration Hierarchy

```
User Settings (.claude/settings.yaml)
    ↓
Project Config (.claude/config.yaml)
    ↓
Rules & Guardrails (.claude/rules.md, guardrails.yaml)
    ↓
AI Context (.ai/*)
    ↓
Hooks (.claude/hooks/*)
```

Priority: User Settings > Project Config > Rules > Context

---

## 🔄 Configuration Updates

### When to Update

1. **New Feature** - Update rules.md, config.yaml
2. **Security Change** - Update guardrails.yaml
3. **Workflow Change** - Update hooks.yaml
4. **Team Preference** - Update settings.yaml

### How to Update

```bash
# 1. Edit configuration file
nano .claude/config.yaml

# 2. Validate (if applicable)
yamllint .claude/config.yaml

# 3. Test changes
.claude/verify-hooks.sh

# 4. Document in decision log
echo "Decision: ..." >> .ai/memory/decision.md

# 5. Commit
git add .claude/
git commit -m "chore: update Claude config - [reason]"
```

---

## 🐛 Troubleshooting

### Configuration Not Loading

```bash
# Check file exists
ls -la .claude/config.yaml

# Validate YAML
yamllint .claude/*.yaml

# Check permissions
chmod 644 .claude/config.yaml
```

### Hooks Not Executing

```bash
# Check executable
ls -la .claude/hooks/

# Fix permissions
chmod +x .claude/hooks/*.sh

# Test manually
bash -x .claude/hooks/on-code-generated.sh
```

### Context Not Loading

```bash
# Check .claudeignore
cat .claude/.claudeignore

# Verify file patterns
find . -name "*.md" ! -path "*/node_modules/*"
```

---

## 📚 Related Documentation

- **Hooks:** [.claude/README.md](.claude/README.md)
- **Setup Guide:** [HOOKS_SETUP.md](../HOOKS_SETUP.md)
- **Architecture:**
  [.ai/context/architecture.md](../.ai/context/architecture.md)
- **Product Spec:**
  [.ai/context/product-spec.md](../.ai/context/product-spec.md)

---

## ✅ Configuration Checklist

- [ ] config.yaml configured with project settings
- [ ] rules.md reviewed and understood
- [ ] guardrails.yaml safety constraints in place
- [ ] skills.yaml custom shortcuts configured
- [ ] settings.yaml IDE integration set up
- [ ] .claudeignore patterns defined
- [ ] hooks.yaml configured
- [ ] All hooks executable and tested
- [ ] .env configured (from .env.example)
- [ ] Verification script passed

---

**Last Updated:** 2024-02-17 **Version:** 1.0.0 **Configuration Status:** ✅
Complete

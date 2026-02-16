#!/usr/bin/env bash
# Hook: onCodeGenerated
# Trigger: Before code is committed
# Purpose: Validate code quality, run linters, ensure compilation

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 [Hook] onCodeGenerated - Validating generated code..."

# Load environment
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Track execution metrics
START_TIME=$(date +%s)
HOOK_STATUS="success"
FAILURES=()

# 1. Validate code compiles
echo "📦 [1/5] Checking compilation..."
if ! pnpm build > /dev/null 2>&1; then
  HOOK_STATUS="failed"
  FAILURES+=("compilation")
  echo "❌ Compilation failed"
else
  echo "✅ Code compiles successfully"
fi

# 2. Run linting
echo "🔧 [2/5] Running static analysis..."
if ! pnpm lint > /dev/null 2>&1; then
  HOOK_STATUS="failed"
  FAILURES+=("linting")
  echo "⚠️  Linting issues detected"
else
  echo "✅ Linting passed"
fi

# 3. Format check
echo "💅 [3/5] Checking code formatting..."
if ! pnpm format --check > /dev/null 2>&1; then
  echo "⚠️  Formatting issues detected - auto-fixing..."
  pnpm format > /dev/null 2>&1
  echo "✅ Code formatted"
fi

# 4. Validate against architecture rules
echo "🏛️  [4/5] Validating architectural compliance..."
if [ -f "tools/utils/validateArchitecture.js" ]; then
  if ! node tools/utils/validateArchitecture.js; then
    HOOK_STATUS="failed"
    FAILURES+=("architecture")
    echo "❌ Architecture validation failed"
  else
    echo "✅ Architecture compliant"
  fi
else
  echo "⏭️  Architecture validator not found, skipping..."
fi

# 5. Check guardrails
echo "🛡️  [5/5] Checking guardrails..."
if node tools/utils/guardrails.js validate; then
  echo "✅ Guardrails satisfied"
else
  HOOK_STATUS="failed"
  FAILURES+=("guardrails")
  echo "❌ Guardrail violations detected"
fi

# Emit telemetry
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ -x "tools/observability/emitEvent.js" ]; then
  echo "{
    \"event\": \"hook.onCodeGenerated\",
    \"status\": \"$HOOK_STATUS\",
    \"duration_seconds\": $DURATION,
    \"failures\": $(printf '%s\n' "${FAILURES[@]}" | jq -R . | jq -s .),
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }" | node tools/observability/emitEvent.js > /dev/null 2>&1 || true
fi

# Report results
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$HOOK_STATUS" = "success" ]; then
  echo "✅ Code generation validation PASSED"
  echo "   Duration: ${DURATION}s"
  exit 0
else
  echo "❌ Code generation validation FAILED"
  echo "   Failed checks: ${FAILURES[*]}"
  echo "   Duration: ${DURATION}s"
  echo ""
  echo "🤖 Tip: Run 'claude fix' to auto-repair issues"
  exit 1
fi

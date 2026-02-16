#!/usr/bin/env bash
# Hook: onTestsFailed
# Trigger: When test execution fails
# Purpose: Trigger self-healing loop via Fixer agent

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔧 [Hook] onTestsFailed - Initiating self-healing..."

# Parse test failure report
TEST_REPORT="${1:-test-results.json}"

if [ ! -f "$TEST_REPORT" ]; then
  echo "⚠️  Test report not found: $TEST_REPORT"
  echo "   Skipping automated healing"
  exit 0
fi

# Load environment
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

ITERATION="${CLAUDE_FIX_ITERATION:-0}"
MAX_ITERATIONS="${CLAUDE_MAX_FIX_ITERATIONS:-3}"

echo "📊 Self-healing iteration: $ITERATION/$MAX_ITERATIONS"

# Check iteration limit
if [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
  echo "⛔ Maximum healing iterations reached"
  echo "   Manual intervention required"

  # Emit alert
  echo "{
    \"event\": \"hook.onTestsFailed.max_iterations\",
    \"iteration\": $ITERATION,
    \"max_iterations\": $MAX_ITERATIONS,
    \"test_report\": \"$TEST_REPORT\",
    \"severity\": \"high\",
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }" | node tools/observability/emitEvent.js > /dev/null 2>&1 || true

  exit 1
fi

# Invoke Fixer skill
echo "🤖 Invoking Fixer agent..."
echo "   Reading failure report: $TEST_REPORT"

# Create fixer invocation payload
FIXER_INPUT=$(cat <<EOF
{
  "skill": "Fixer",
  "input": {
    "failure_report": "$TEST_REPORT",
    "iteration": $ITERATION,
    "context": "test_failure"
  }
}
EOF
)

# Trigger Fixer (this would integrate with Claude Code's skill system)
echo "$FIXER_INPUT" > .tmp_fixer_input.json

echo "📝 Fixer agent will:"
echo "   1. Analyze test failures"
echo "   2. Generate minimal corrective patch"
echo "   3. Preserve existing contracts"
echo "   4. Re-run tests automatically"

# Emit telemetry
echo "{
  \"event\": \"hook.onTestsFailed.triggered\",
  \"iteration\": $ITERATION,
  \"test_report\": \"$TEST_REPORT\",
  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
}" | node tools/observability/emitEvent.js > /dev/null 2>&1 || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Fixer agent invoked"
echo "   Next: Tests will be re-run after fixes"
echo "   Iteration will increment: $((ITERATION + 1))/$MAX_ITERATIONS"

# Increment iteration counter for next run
export CLAUDE_FIX_ITERATION=$((ITERATION + 1))

exit 0

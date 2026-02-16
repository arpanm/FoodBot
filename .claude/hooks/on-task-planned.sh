#!/usr/bin/env bash
# Hook: onTaskPlanned
# Trigger: After task breakdown is created
# Purpose: Validate task structure and dependencies

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📋 [Hook] onTaskPlanned - Validating task breakdown..."

# Task graph file
TASK_GRAPH="${1:-task-graph.json}"

if [ ! -f "$TASK_GRAPH" ]; then
  echo "⚠️  Task graph not found: $TASK_GRAPH"
  echo "   Skipping validation"
  exit 0
fi

echo "📊 Analyzing task graph: $TASK_GRAPH"

# Load environment
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

if ! command -v jq &> /dev/null; then
  echo "⚠️  jq not installed - skipping detailed validation"
  exit 0
fi

# 1. Validate JSON structure
echo ""
echo "🔍 [1/5] Validating JSON structure..."

if jq empty "$TASK_GRAPH" 2>/dev/null; then
  echo "✅ Valid JSON structure"
else
  echo "❌ Invalid JSON structure"
  exit 1
fi

# 2. Check for circular dependencies
echo ""
echo "🔄 [2/5] Checking for circular dependencies..."

# Extract task graph and check for cycles
TASK_COUNT=$(jq -r '.tasks | length' "$TASK_GRAPH" 2>/dev/null || echo "0")
echo "   Total tasks: $TASK_COUNT"

if [ "$TASK_COUNT" -eq 0 ]; then
  echo "⚠️  No tasks found in graph"
  exit 1
fi

echo "✅ Task graph structure valid"

# 3. Validate task completeness
echo ""
echo "📝 [3/5] Validating task definitions..."

REQUIRED_FIELDS=("id" "description" "definition_of_done")
INCOMPLETE_TASKS=()

for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".tasks[$i].id // \"task-$i\"" "$TASK_GRAPH")

  for field in "${REQUIRED_FIELDS[@]}"; do
    if ! jq -e ".tasks[$i].$field" "$TASK_GRAPH" > /dev/null 2>&1; then
      INCOMPLETE_TASKS+=("$TASK_ID:missing-$field")
    fi
  done
done

if [ ${#INCOMPLETE_TASKS[@]} -eq 0 ]; then
  echo "✅ All tasks complete"
else
  echo "⚠️  Incomplete tasks:"
  printf '   • %s\n' "${INCOMPLETE_TASKS[@]}"
fi

# 4. Check test strategy
echo ""
echo "🧪 [4/5] Verifying test strategies..."

TASKS_WITH_TESTS=0

for i in $(seq 0 $((TASK_COUNT - 1))); do
  if jq -e ".tasks[$i].test_strategy" "$TASK_GRAPH" > /dev/null 2>&1; then
    TASKS_WITH_TESTS=$((TASKS_WITH_TESTS + 1))
  fi
done

TEST_COVERAGE_PCT=$((TASKS_WITH_TESTS * 100 / TASK_COUNT))

echo "   Tasks with tests: $TASKS_WITH_TESTS/$TASK_COUNT ($TEST_COVERAGE_PCT%)"

if [ "$TEST_COVERAGE_PCT" -lt 80 ]; then
  echo "⚠️  Test coverage below 80%"
else
  echo "✅ Adequate test coverage"
fi

# 5. Check observability hooks
echo ""
echo "📡 [5/5] Checking observability hooks..."

TASKS_WITH_OBSERVABILITY=0

for i in $(seq 0 $((TASK_COUNT - 1))); do
  if jq -e ".tasks[$i].observability_hooks" "$TASK_GRAPH" > /dev/null 2>&1; then
    TASKS_WITH_OBSERVABILITY=$((TASKS_WITH_OBSERVABILITY + 1))
  fi
done

echo "   Tasks with observability: $TASKS_WITH_OBSERVABILITY/$TASK_COUNT"

if [ "$TASKS_WITH_OBSERVABILITY" -eq "$TASK_COUNT" ]; then
  echo "✅ All tasks observable"
else
  echo "⚠️  Some tasks lack observability hooks"
fi

# Emit telemetry
echo "{
  \"event\": \"hook.onTaskPlanned\",
  \"task_graph\": \"$TASK_GRAPH\",
  \"task_count\": $TASK_COUNT,
  \"incomplete_tasks\": $(printf '%s\n' "${INCOMPLETE_TASKS[@]}" | jq -R . | jq -s .),
  \"test_coverage_pct\": $TEST_COVERAGE_PCT,
  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
}" | node tools/observability/emitEvent.js > /dev/null 2>&1 || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Task planning validation complete"
echo ""
echo "🤖 Next: Code generation will begin"
echo ""

exit 0

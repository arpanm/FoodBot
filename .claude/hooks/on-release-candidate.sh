#!/usr/bin/env bash
# Hook: onReleaseCandidate
# Trigger: Before creating a release or merging to main
# Purpose: Final quality gate validation

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 [Hook] onReleaseCandidate - Final validation gate..."

# Load environment
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Quality gate thresholds from config
MIN_TEST_COVERAGE="${MIN_TEST_COVERAGE:-80}"
MIN_READINESS_SCORE="${MIN_READINESS_SCORE:-0.85}"

# Track metrics
METRICS=()
SCORES=()
FAILED_GATES=()

echo "📊 Computing release readiness..."
echo ""

# 1. Test Coverage
echo "🧪 [1/6] Test Coverage..."
TEST_COVERAGE=0

if [ -f "coverage/coverage-summary.json" ]; then
  if command -v jq &> /dev/null; then
    TEST_COVERAGE=$(jq -r '.total.lines.pct // 0' coverage/coverage-summary.json 2>/dev/null || echo "0")
  fi
fi

echo "   Coverage: ${TEST_COVERAGE}%"
echo "   Required: ${MIN_TEST_COVERAGE}%"

if (( $(echo "$TEST_COVERAGE >= $MIN_TEST_COVERAGE" | bc -l 2>/dev/null || echo "0") )); then
  echo "   ✅ PASS"
  SCORES+=(0.3)
else
  echo "   ❌ FAIL"
  FAILED_GATES+=("test_coverage")
  SCORES+=(0)
fi

# 2. Code Quality
echo ""
echo "🔧 [2/6] Code Quality..."

CODE_QUALITY_SCORE=0

if pnpm lint > /dev/null 2>&1; then
  echo "   ✅ Linting: PASS"
  CODE_QUALITY_SCORE=1.0
else
  echo "   ❌ Linting: FAIL"
  FAILED_GATES+=("linting")
fi

QUALITY_WEIGHTED=$(echo "$CODE_QUALITY_SCORE * 0.2" | bc -l 2>/dev/null || echo "0")
SCORES+=($QUALITY_WEIGHTED)

# 3. Security Scan
echo ""
echo "🛡️  [3/6] Security Analysis..."

SECURITY_SCORE=0

if [ -f "security-report.json" ]; then
  if command -v jq &> /dev/null; then
    HIGH_VULNS=$(jq -r '[.vulnerabilities[] | select(.severity == "high" or .severity == "critical")] | length' security-report.json 2>/dev/null || echo "0")

    if [ "$HIGH_VULNS" -eq 0 ]; then
      echo "   ✅ No high/critical vulnerabilities"
      SECURITY_SCORE=1.0
    else
      echo "   ❌ Found $HIGH_VULNS high/critical vulnerabilities"
      FAILED_GATES+=("security")
      SECURITY_SCORE=0
    fi
  fi
else
  echo "   ⚠️  No security report found"
  SECURITY_SCORE=0.5
fi

SECURITY_WEIGHTED=$(echo "$SECURITY_SCORE * 0.3" | bc -l 2>/dev/null || echo "0")
SCORES+=($SECURITY_WEIGHTED)

# 4. Architecture Compliance
echo ""
echo "🏛️  [4/6] Architecture Compliance..."

ARCH_SCORE=1.0

if [ -f "tools/utils/validateArchitecture.js" ]; then
  if node tools/utils/validateArchitecture.js > /dev/null 2>&1; then
    echo "   ✅ Architecture compliant"
  else
    echo "   ❌ Architecture violations detected"
    FAILED_GATES+=("architecture")
    ARCH_SCORE=0
  fi
else
  echo "   ⚠️  Architecture validator not found"
  ARCH_SCORE=0.7
fi

ARCH_WEIGHTED=$(echo "$ARCH_SCORE * 0.2" | bc -l 2>/dev/null || echo "0")
SCORES+=($ARCH_WEIGHTED)

# 5. Build Status
echo ""
echo "📦 [5/6] Build Verification..."

if pnpm build > /dev/null 2>&1; then
  echo "   ✅ Build successful"
else
  echo "   ❌ Build failed"
  FAILED_GATES+=("build")
fi

# 6. Documentation
echo ""
echo "📚 [6/6] Documentation Check..."

DOC_FILES=(".ai/context/product-spec.md" ".ai/context/architecture.md" "README.md")
MISSING_DOCS=()

for doc in "${DOC_FILES[@]}"; do
  if [ ! -f "$doc" ]; then
    MISSING_DOCS+=("$doc")
  fi
done

if [ ${#MISSING_DOCS[@]} -eq 0 ]; then
  echo "   ✅ All required documentation present"
else
  echo "   ⚠️  Missing: ${MISSING_DOCS[*]}"
fi

# Calculate composite readiness score
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RELEASE READINESS CALCULATION"
echo ""

TOTAL_SCORE=0
for score in "${SCORES[@]}"; do
  TOTAL_SCORE=$(echo "$TOTAL_SCORE + $score" | bc -l 2>/dev/null || echo "0")
done

# Convert test coverage to 0-0.3 scale
TEST_SCORE=$(echo "scale=3; ($TEST_COVERAGE / 100) * 0.3" | bc -l 2>/dev/null || echo "0")
TOTAL_SCORE=$(echo "$TOTAL_SCORE + $TEST_SCORE" | bc -l 2>/dev/null || echo "0")

printf "   Test Coverage:     %.1f%%  → %.3f\n" "$TEST_COVERAGE" "$TEST_SCORE"
printf "   Code Quality:              → %.3f\n" "$QUALITY_WEIGHTED"
printf "   Security:                  → %.3f\n" "$SECURITY_WEIGHTED"
printf "   Architecture:              → %.3f\n" "$ARCH_WEIGHTED"
echo   "   ──────────────────────────────────"
printf "   TOTAL READINESS:           %.3f\n" "$TOTAL_SCORE"
printf "   REQUIRED:                  %.3f\n" "$MIN_READINESS_SCORE"

# Emit telemetry
echo "{
  \"event\": \"hook.onReleaseCandidate\",
  \"readiness_score\": $TOTAL_SCORE,
  \"required_score\": $MIN_READINESS_SCORE,
  \"test_coverage\": $TEST_COVERAGE,
  \"failed_gates\": $(printf '%s\n' "${FAILED_GATES[@]}" | jq -R . | jq -s .),
  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
}" | node tools/observability/emitEvent.js > /dev/null 2>&1 || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final decision
if (( $(echo "$TOTAL_SCORE >= $MIN_READINESS_SCORE" | bc -l 2>/dev/null || echo "0") )) && [ ${#FAILED_GATES[@]} -eq 0 ]; then
  echo "✅ RELEASE GATE: PASSED"
  echo ""
  echo "   Ready for deployment ✨"
  exit 0
else
  echo "❌ RELEASE GATE: FAILED"
  echo ""
  echo "   Failed gates: ${FAILED_GATES[*]}"
  echo "   Readiness score below threshold"
  echo ""
  echo "🔧 Required actions before release"
  exit 1
fi

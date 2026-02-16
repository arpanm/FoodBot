#!/usr/bin/env bash
# Hook: onSpecCreated
# Trigger: After requirements/specs are written
# Purpose: Validate specs and trigger architecture design

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📝 [Hook] onSpecCreated - Validating specifications..."

# Find newly created/modified spec files
SPEC_FILE="${1:-.ai/context/product-spec.md}"

if [ ! -f "$SPEC_FILE" ]; then
  echo "⚠️  Spec file not found: $SPEC_FILE"
  exit 1
fi

echo "📄 Analyzing spec: $SPEC_FILE"

# Load environment
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# 1. Validate spec completeness
echo ""
echo "🔍 [1/4] Checking spec completeness..."

REQUIRED_SECTIONS=(
  "Purpose"
  "Architecture"
  "Requirements"
  "Success"
)

MISSING_SECTIONS=()

for section in "${REQUIRED_SECTIONS[@]}"; do
  if ! grep -qi "^#.*$section" "$SPEC_FILE"; then
    MISSING_SECTIONS+=("$section")
  fi
done

if [ ${#MISSING_SECTIONS[@]} -gt 0 ]; then
  echo "⚠️  Missing sections: ${MISSING_SECTIONS[*]}"
  echo "   Spec may be incomplete"
else
  echo "✅ All required sections present"
fi

# 2. Check for ambiguous requirements
echo ""
echo "🎯 [2/4] Scanning for ambiguous requirements..."

AMBIGUOUS_PATTERNS=(
  "TBD"
  "TODO"
  "maybe"
  "might"
  "probably"
)

AMBIGUOUS_FOUND=false

for pattern in "${AMBIGUOUS_PATTERNS[@]}"; do
  if grep -qi "$pattern" "$SPEC_FILE"; then
    AMBIGUOUS_FOUND=true
    echo "⚠️  Found ambiguous term: '$pattern'"
  fi
done

if [ "$AMBIGUOUS_FOUND" = false ]; then
  echo "✅ No ambiguous requirements detected"
fi

# 3. Validate against architecture constraints
echo ""
echo "🏛️  [3/4] Checking architecture compliance..."

if [ -f ".ai/context/architecture.md" ]; then
  echo "✅ Architecture reference found"

  # Check if spec references architecture
  if grep -qi "architecture" "$SPEC_FILE"; then
    echo "✅ Spec references architecture"
  else
    echo "⚠️  Spec doesn't reference architecture.md"
  fi
else
  echo "⚠️  Architecture document not found"
fi

# 4. Validate traceability
echo ""
echo "🔗 [4/4] Checking traceability..."

# Check if spec has acceptance criteria
if grep -qi "success\|criteria\|acceptance" "$SPEC_FILE"; then
  echo "✅ Acceptance criteria defined"
else
  echo "⚠️  No clear acceptance criteria found"
fi

# Emit telemetry
echo "{
  \"event\": \"hook.onSpecCreated\",
  \"spec_file\": \"$SPEC_FILE\",
  \"missing_sections\": $(printf '%s\n' "${MISSING_SECTIONS[@]}" | jq -R . | jq -s .),
  \"has_ambiguities\": $AMBIGUOUS_FOUND,
  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
}" | node tools/observability/emitEvent.js > /dev/null 2>&1 || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Spec validation complete"
echo ""
echo "🤖 Next Steps:"
echo "   1. Architecture agent will design system"
echo "   2. Task planner will create breakdown"
echo "   3. Code generation will begin"
echo ""

exit 0

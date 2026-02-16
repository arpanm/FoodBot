#!/usr/bin/env bash
# Verify Claude Code hooks installation

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 Verifying Claude Code Hooks Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ALL_CHECKS_PASSED=true

# 1. Check directory structure
echo "📁 [1/5] Checking directory structure..."
if [ -d ".claude/hooks" ]; then
  echo "   ✅ .claude/hooks/ exists"
else
  echo "   ❌ .claude/hooks/ not found"
  ALL_CHECKS_PASSED=false
fi

# 2. Check hook scripts
echo ""
echo "📜 [2/5] Checking hook scripts..."

REQUIRED_HOOKS=(
  "on-spec-created.sh"
  "on-task-planned.sh"
  "on-code-generated.sh"
  "on-tests-failed.sh"
  "on-security-risk.sh"
  "on-release-candidate.sh"
)

MISSING_HOOKS=()

for hook in "${REQUIRED_HOOKS[@]}"; do
  if [ -f ".claude/hooks/$hook" ]; then
    if [ -x ".claude/hooks/$hook" ]; then
      echo "   ✅ $hook (executable)"
    else
      echo "   ⚠️  $hook (not executable)"
      chmod +x ".claude/hooks/$hook"
      echo "      → Fixed permissions"
    fi
  else
    echo "   ❌ $hook (missing)"
    MISSING_HOOKS+=("$hook")
    ALL_CHECKS_PASSED=false
  fi
done

# 3. Check configuration
echo ""
echo "⚙️  [3/5] Checking configuration..."

if [ -f ".claude/hooks.yaml" ]; then
  echo "   ✅ hooks.yaml exists"

  if command -v node &> /dev/null; then
    if node -e "const yaml = require('js-yaml'); const fs = require('fs'); yaml.load(fs.readFileSync('.claude/hooks.yaml', 'utf8'));" 2>/dev/null; then
      echo "   ✅ hooks.yaml is valid"
    else
      echo "   ⚠️  hooks.yaml has syntax issues"
    fi
  fi
else
  echo "   ❌ hooks.yaml not found"
  ALL_CHECKS_PASSED=false
fi

# 4. Check dependencies
echo ""
echo "📦 [4/5] Checking dependencies..."

DEPENDENCIES=("bash" "node" "jq" "bc")
MISSING_DEPS=()

for dep in "${DEPENDENCIES[@]}"; do
  if command -v "$dep" &> /dev/null; then
    VERSION=$("$dep" --version 2>&1 | head -1)
    echo "   ✅ $dep - $VERSION"
  else
    echo "   ❌ $dep not found"
    MISSING_DEPS+=("$dep")
    ALL_CHECKS_PASSED=false
  fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo ""
  echo "   Install missing dependencies:"
  echo "   macOS:   brew install ${MISSING_DEPS[*]}"
  echo "   Ubuntu:  apt-get install ${MISSING_DEPS[*]}"
fi

# 5. Check environment
echo ""
echo "🌍 [5/5] Checking environment configuration..."

if [ -f ".env" ]; then
  echo "   ✅ .env file exists"

  # Check for hook-related variables
  HOOK_VARS=("CLAUDE_MAX_FIX_ITERATIONS" "MIN_TEST_COVERAGE" "MIN_READINESS_SCORE")

  for var in "${HOOK_VARS[@]}"; do
    if grep -q "^$var=" .env 2>/dev/null; then
      echo "   ✅ $var configured"
    else
      echo "   ⚠️  $var not set (will use defaults)"
    fi
  done
else
  echo "   ⚠️  .env not found (using .env.example)"
  if [ -f ".env.example" ]; then
    echo "   💡 Run: cp .env.example .env"
  fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ALL_CHECKS_PASSED" = true ]; then
  echo "✅ All checks passed!"
  echo ""
  echo "🎯 Next steps:"
  echo "   1. Configure .env with your settings"
  echo "   2. Test hooks: .claude/hooks/on-code-generated.sh"
  echo "   3. Start development with automated quality gates"
  echo ""
  exit 0
else
  echo "⚠️  Some checks failed"
  echo ""
  echo "📋 Action items:"

  if [ ${#MISSING_HOOKS[@]} -gt 0 ]; then
    echo "   • Install missing hooks: ${MISSING_HOOKS[*]}"
  fi

  if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo "   • Install dependencies: ${MISSING_DEPS[*]}"
  fi

  echo ""
  exit 1
fi

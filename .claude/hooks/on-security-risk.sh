#!/usr/bin/env bash
# Hook: onSecurityRisk
# Trigger: When security scan detects vulnerabilities
# Purpose: Block deployment and alert on high-severity issues

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚨 [Hook] onSecurityRisk - Security issue detected"

# Parse security report
SECURITY_REPORT="${1:-security-report.json}"
SEVERITY="${2:-high}"

if [ ! -f "$SECURITY_REPORT" ]; then
  echo "⚠️  Security report not found: $SECURITY_REPORT"
  exit 1
fi

# Load environment
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Read quality gates
BLOCK_ON_HIGH="${SECURITY_BLOCK_ON_HIGH:-true}"

echo "📋 Security Report: $SECURITY_REPORT"
echo "🎯 Severity Level: $SEVERITY"

# Determine action based on severity
SHOULD_BLOCK=false

case "$SEVERITY" in
  critical)
    SHOULD_BLOCK=true
    echo "🔴 CRITICAL severity - BLOCKING"
    ;;
  high)
    if [ "$BLOCK_ON_HIGH" = "true" ]; then
      SHOULD_BLOCK=true
      echo "🟠 HIGH severity - BLOCKING (per policy)"
    else
      echo "🟠 HIGH severity - WARNING (block disabled)"
    fi
    ;;
  medium)
    echo "🟡 MEDIUM severity - WARNING"
    ;;
  low)
    echo "🟢 LOW severity - INFORMATIONAL"
    ;;
  *)
    echo "⚪ UNKNOWN severity - BLOCKING by default"
    SHOULD_BLOCK=true
    ;;
esac

# Extract vulnerability details
if command -v jq &> /dev/null; then
  VULN_COUNT=$(jq -r '.vulnerabilities | length // 0' "$SECURITY_REPORT" 2>/dev/null || echo "0")
  echo ""
  echo "📊 Vulnerability Summary:"
  echo "   Total issues: $VULN_COUNT"

  # Show top 3 vulnerabilities
  if [ "$VULN_COUNT" -gt 0 ]; then
    echo ""
    echo "🔍 Top Issues:"
    jq -r '.vulnerabilities[:3] | .[] | "   • \(.title // .id) [\(.severity)]"' "$SECURITY_REPORT" 2>/dev/null || echo "   (Unable to parse details)"
  fi
fi

# Emit security event
echo "{
  \"event\": \"hook.onSecurityRisk.detected\",
  \"severity\": \"$SEVERITY\",
  \"blocked\": $SHOULD_BLOCK,
  \"report_path\": \"$SECURITY_REPORT\",
  \"vulnerability_count\": ${VULN_COUNT:-0},
  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
}" | node tools/observability/emitEvent.js > /dev/null 2>&1 || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$SHOULD_BLOCK" = true ]; then
  echo "⛔ SECURITY GATE: FAILED"
  echo ""
  echo "🛡️  Actions Required:"
  echo "   1. Review security report: $SECURITY_REPORT"
  echo "   2. Fix vulnerabilities or update dependencies"
  echo "   3. Re-run security scan"
  echo ""
  echo "🤖 Tip: Run 'claude security-fix' for automated remediation"
  echo ""
  exit 1
else
  echo "⚠️  SECURITY GATE: WARNING"
  echo ""
  echo "   Security issues detected but not blocking"
  echo "   Review report: $SECURITY_REPORT"
  echo ""
  exit 0
fi

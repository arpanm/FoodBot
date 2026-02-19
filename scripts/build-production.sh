#!/bin/bash

###############################################################################
# Production Build Script for FoodBot
#
# This script builds all production artifacts with optimizations enabled
#
# Usage:
#   ./scripts/build-production.sh [options]
#
# Options:
#   --skip-tests      Skip running tests before build
#   --skip-lint       Skip linting before build
#   --analyze         Generate bundle analysis reports
#   --verbose         Enable verbose output
#
# Version: 1.0.0
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SKIP_TESTS=false
SKIP_LINT=false
ANALYZE=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-lint)
      SKIP_LINT=true
      shift
      ;;
    --analyze)
      ANALYZE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Utility functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_section() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo ""
}

# Start build process
log_section "FoodBot Production Build"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  log_error "Node.js version 18 or higher is required (current: $(node -v))"
  exit 1
fi
log_success "Node.js version: $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  log_error "pnpm is not installed. Please install it: npm install -g pnpm"
  exit 1
fi
log_success "pnpm version: $(pnpm -v)"

# Environment check
if [ -f ".env.production" ]; then
  log_success "Found .env.production"
else
  log_warning ".env.production not found. Using .env.example as template"
  cp .env.example .env.production
fi

# Clean previous builds
log_section "Cleaning Previous Builds"
log_info "Removing old build artifacts..."

rm -rf dist build .next .turbo
rm -rf apps/*/dist apps/*/build
rm -rf services/*/dist services/*/build
rm -rf packages/*/dist
rm -rf chrome-extension/dist

log_success "Clean complete"

# Install dependencies
log_section "Installing Dependencies"
log_info "Running pnpm install..."

if [ "$VERBOSE" = true ]; then
  pnpm install --frozen-lockfile
else
  pnpm install --frozen-lockfile > /dev/null 2>&1
fi

log_success "Dependencies installed"

# Run linting
if [ "$SKIP_LINT" = false ]; then
  log_section "Running Linters"
  log_info "Running ESLint..."

  if [ "$VERBOSE" = true ]; then
    pnpm run lint
  else
    pnpm run lint > /dev/null 2>&1
  fi

  log_success "Linting passed"
else
  log_warning "Skipping linting (--skip-lint flag)"
fi

# Run tests
if [ "$SKIP_TESTS" = false ]; then
  log_section "Running Tests"
  log_info "Running test suite..."

  if [ "$VERBOSE" = true ]; then
    pnpm run test:ci
  else
    pnpm run test:ci > /dev/null 2>&1
  fi

  log_success "All tests passed"
else
  log_warning "Skipping tests (--skip-tests flag)"
fi

# Type checking
log_section "Type Checking"
log_info "Running TypeScript compiler..."

if [ "$VERBOSE" = true ]; then
  pnpm run typecheck
else
  pnpm run typecheck > /dev/null 2>&1
fi

log_success "Type checking passed"

# Build packages (shared code)
log_section "Building Shared Packages"

log_info "Building @foodbot/shared..."
cd packages/shared
pnpm run build:prod
cd ../..
log_success "Shared packages built"

log_info "Building @foodbot/workflows..."
cd packages/workflows
pnpm run build:prod
cd ../..
log_success "Workflows package built"

# Build backend services
log_section "Building Backend Services"

log_info "Building Gateway API..."
cd apps/gateway-api
pnpm run build:prod
cd ../..
log_success "Gateway API built"

log_info "Building MCP Adapter..."
cd services/mcp-adapter
pnpm run build:prod
cd ../..
log_success "MCP Adapter built"

# Build frontend applications
log_section "Building Frontend Applications"

if [ "$ANALYZE" = true ]; then
  export ANALYZE=true
  log_info "Bundle analysis enabled"
fi

log_info "Building Customer App..."
cd apps/customer-app
pnpm run build:prod
cd ../..
log_success "Customer App built"

log_info "Building Restaurant App..."
cd apps/restaurant-app
pnpm run build:prod
cd ../..
log_success "Restaurant App built"

# Build Chrome Extension
log_section "Building Chrome Extension"
log_info "Building extension..."

cd chrome-extension
pnpm run build:prod
cd ..

log_success "Chrome Extension built"

# Generate build manifest
log_section "Generating Build Manifest"

BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

cat > build-manifest.json <<EOF
{
  "buildTime": "$BUILD_TIME",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH",
  "nodeVersion": "$(node -v)",
  "pnpmVersion": "$(pnpm -v)",
  "environment": "production"
}
EOF

log_success "Build manifest generated"

# Show bundle sizes
log_section "Build Summary"

echo ""
log_info "Build Sizes:"
echo ""

if [ -d "apps/customer-app/dist" ]; then
  SIZE=$(du -sh apps/customer-app/dist | cut -f1)
  echo "  Customer App:      $SIZE"
fi

if [ -d "apps/restaurant-app/dist" ]; then
  SIZE=$(du -sh apps/restaurant-app/dist | cut -f1)
  echo "  Restaurant App:    $SIZE"
fi

if [ -d "apps/gateway-api/dist" ]; then
  SIZE=$(du -sh apps/gateway-api/dist | cut -f1)
  echo "  Gateway API:       $SIZE"
fi

if [ -d "chrome-extension/dist" ]; then
  SIZE=$(du -sh chrome-extension/dist | cut -f1)
  echo "  Chrome Extension:  $SIZE"
fi

echo ""

# Bundle analysis reports
if [ "$ANALYZE" = true ]; then
  log_info "Bundle analysis reports:"
  echo ""

  if [ -f "apps/customer-app/dist/stats.html" ]; then
    echo "  Customer App:      apps/customer-app/dist/stats.html"
  fi

  if [ -f "apps/restaurant-app/dist/stats.html" ]; then
    echo "  Restaurant App:    apps/restaurant-app/dist/stats.html"
  fi

  if [ -f "chrome-extension/dist/bundle-report.html" ]; then
    echo "  Chrome Extension:  chrome-extension/dist/bundle-report.html"
  fi

  echo ""
fi

# Final success message
log_section "Build Complete"
log_success "All production builds completed successfully!"
echo ""
log_info "Build artifacts are ready for deployment"
log_info "Build time: $BUILD_TIME"
log_info "Git commit: $GIT_COMMIT"
echo ""

exit 0

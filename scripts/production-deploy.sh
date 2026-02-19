#!/bin/bash
#
# Production Deployment Script for FoodBot
# Handles zero-downtime deployment with health checks
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/foodbot}"
BACKUP_DIR="${BACKUP_DIR:-/opt/foodbot/backups}"
MAX_BACKUPS="${MAX_BACKUPS:-5}"

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing_cmds=()

    for cmd in git docker docker-compose node npm pnpm; do
        if ! command -v $cmd &> /dev/null; then
            missing_cmds+=($cmd)
        fi
    done

    if [ ${#missing_cmds[@]} -gt 0 ]; then
        print_error "Missing required commands: ${missing_cmds[*]}"
        exit 1
    fi

    print_success "All prerequisites satisfied"
}

create_backup() {
    print_header "Creating Backup"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${BACKUP_DIR}/${timestamp}"

    mkdir -p "$backup_path"

    # Backup database
    print_info "Backing up database..."
    docker exec foodbot-postgres pg_dump -U postgres foodbot > "${backup_path}/database.sql"

    # Backup environment files
    print_info "Backing up configuration..."
    cp -r "${APP_DIR}/.env" "${backup_path}/.env" 2>/dev/null || true
    cp -r "${APP_DIR}/docker-compose.yml" "${backup_path}/docker-compose.yml" 2>/dev/null || true

    # Backup uploaded files (if any)
    if [ -d "${APP_DIR}/uploads" ]; then
        print_info "Backing up uploads..."
        tar -czf "${backup_path}/uploads.tar.gz" -C "${APP_DIR}" uploads
    fi

    print_success "Backup created: $backup_path"

    # Cleanup old backups
    print_info "Cleaning up old backups (keeping last $MAX_BACKUPS)..."
    ls -dt ${BACKUP_DIR}/*/ | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf 2>/dev/null || true
}

pull_latest_code() {
    print_header "Pulling Latest Code"

    cd "$APP_DIR"

    # Stash any local changes
    git stash save "auto-stash-before-deploy-$(date +%Y%m%d_%H%M%S)"

    # Pull latest code
    print_info "Fetching latest changes..."
    git fetch origin

    # Checkout target branch/tag
    local target="${DEPLOY_TARGET:-main}"
    print_info "Checking out $target..."
    git checkout "$target"
    git pull origin "$target"

    print_success "Code updated to: $(git rev-parse --short HEAD)"
}

install_dependencies() {
    print_header "Installing Dependencies"

    cd "$APP_DIR"

    print_info "Installing npm packages..."
    pnpm install --frozen-lockfile

    print_success "Dependencies installed"
}

build_applications() {
    print_header "Building Applications"

    cd "$APP_DIR"

    # Build all applications
    print_info "Building Gateway API..."
    pnpm --filter gateway-api build

    print_info "Building Customer App..."
    pnpm --filter customer-app build

    print_info "Building Chrome Extension..."
    pnpm --filter chrome-extension build

    print_success "All applications built successfully"
}

run_migrations() {
    print_header "Running Database Migrations"

    cd "$APP_DIR"

    # Run migrations
    print_info "Applying database migrations..."
    pnpm --filter gateway-api migration:run

    print_success "Migrations completed"
}

health_check() {
    local url=$1
    local max_attempts=${2:-30}
    local attempt=1

    print_info "Waiting for service to be healthy..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url/health" > /dev/null; then
            print_success "Service is healthy"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo ""
    print_error "Service failed health check after $max_attempts attempts"
    return 1
}

deploy_blue_green() {
    print_header "Deploying (Blue-Green Strategy)"

    cd "$APP_DIR"

    # Determine current and new environments
    local current_env=$(docker ps --filter "name=foodbot-gateway-api-blue" -q && echo "blue" || echo "green")
    local new_env=$([ "$current_env" == "blue" ] && echo "green" || echo "blue")

    print_info "Current environment: $current_env"
    print_info "Deploying to: $new_env"

    # Start new environment
    print_info "Starting $new_env environment..."
    docker-compose -f docker-compose.prod.yml -p foodbot-$new_env up -d

    # Wait for new environment to be healthy
    local new_url="http://localhost:${new_env == 'blue' ? '4000' : '4001'}"
    if ! health_check "$new_url"; then
        print_error "New environment failed health check, rolling back..."
        docker-compose -f docker-compose.prod.yml -p foodbot-$new_env down
        exit 1
    fi

    # Switch traffic to new environment (update nginx/load balancer)
    print_info "Switching traffic to $new_env environment..."
    # TODO: Update load balancer configuration

    # Wait a bit for traffic to drain
    sleep 10

    # Stop old environment
    print_info "Stopping $current_env environment..."
    docker-compose -f docker-compose.prod.yml -p foodbot-$current_env down

    print_success "Deployment completed successfully"
}

deploy_rolling() {
    print_header "Deploying (Rolling Update Strategy)"

    cd "$APP_DIR"

    # Update services one by one
    for service in gateway-api customer-app; do
        print_info "Updating $service..."

        # Scale up new instance
        docker-compose -f docker-compose.prod.yml up -d --scale $service=2 --no-recreate $service

        # Wait for new instance to be healthy
        sleep 10

        # Scale down old instance
        docker-compose -f docker-compose.prod.yml up -d --scale $service=1 --no-recreate $service
    done

    print_success "Rolling update completed"
}

deploy_standard() {
    print_header "Deploying (Standard Strategy)"

    cd "$APP_DIR"

    # Stop services
    print_info "Stopping services..."
    docker-compose -f docker-compose.prod.yml down

    # Start services
    print_info "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d

    # Health check
    if ! health_check "http://localhost:4000"; then
        print_error "Deployment failed health check"
        print_info "Attempting rollback..."
        rollback
        exit 1
    fi

    print_success "Deployment completed"
}

rollback() {
    print_header "Rolling Back"

    # Get latest backup
    local latest_backup=$(ls -dt ${BACKUP_DIR}/*/ | head -1)

    if [ -z "$latest_backup" ]; then
        print_error "No backup found for rollback"
        exit 1
    fi

    print_info "Rolling back to: $latest_backup"

    # Stop current services
    docker-compose -f docker-compose.prod.yml down

    # Restore database
    print_info "Restoring database..."
    docker exec -i foodbot-postgres psql -U postgres -d foodbot < "${latest_backup}/database.sql"

    # Restore configuration
    print_info "Restoring configuration..."
    cp "${latest_backup}/.env" "${APP_DIR}/.env"

    # Start services
    docker-compose -f docker-compose.prod.yml up -d

    print_success "Rollback completed"
}

smoke_tests() {
    print_header "Running Smoke Tests"

    local base_url="http://localhost:4000"

    # Test 1: Health endpoint
    print_info "Testing health endpoint..."
    if curl -f -s "$base_url/health" > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi

    # Test 2: API authentication
    print_info "Testing API authentication..."
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$base_url/auth/login")
    if [ "$response" -eq 401 ] || [ "$response" -eq 400 ]; then
        print_success "Auth endpoint responding"
    else
        print_error "Auth endpoint failed (HTTP $response)"
        return 1
    fi

    # Test 3: Database connectivity
    print_info "Testing database connectivity..."
    if curl -f -s "$base_url/health/db" | grep -q "ok"; then
        print_success "Database connected"
    else
        print_error "Database connection failed"
        return 1
    fi

    print_success "All smoke tests passed"
}

notify_deployment() {
    local status=$1
    local message=$2

    print_info "Sending deployment notification..."

    # Slack notification (if webhook configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"FoodBot Deployment $status: $message\"}"
    fi

    # Email notification (if configured)
    # if [ -n "$NOTIFICATION_EMAIL" ]; then
    #     echo "$message" | mail -s "FoodBot Deployment $status" "$NOTIFICATION_EMAIL"
    # fi
}

main() {
    print_header "FoodBot Production Deployment"
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo ""

    # Pre-deployment
    check_prerequisites
    create_backup

    # Deployment
    pull_latest_code
    install_dependencies
    build_applications
    run_migrations

    # Deploy based on strategy
    local strategy="${DEPLOY_STRATEGY:-standard}"
    case "$strategy" in
        blue-green)
            deploy_blue_green
            ;;
        rolling)
            deploy_rolling
            ;;
        standard|*)
            deploy_standard
            ;;
    esac

    # Post-deployment
    smoke_tests

    # Notify
    notify_deployment "SUCCESS" "Deployment completed successfully"

    print_header "Deployment Complete!"
    print_success "FoodBot is now running the latest version"
    echo ""
    echo "Next steps:"
    echo "  - Monitor logs: docker-compose logs -f"
    echo "  - Check metrics: open http://localhost:3000/grafana"
    echo "  - View logs: open http://localhost:5601"
}

# Parse arguments
case "${1:-}" in
    rollback)
        rollback
        ;;
    smoke-tests)
        smoke_tests
        ;;
    --help|-h)
        echo "Usage: $0 [rollback|smoke-tests|--help]"
        echo ""
        echo "Commands:"
        echo "  rollback      Rollback to previous deployment"
        echo "  smoke-tests   Run smoke tests only"
        echo "  --help        Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  ENVIRONMENT         Deployment environment (default: production)"
        echo "  DEPLOY_STRATEGY     Deployment strategy: standard|rolling|blue-green"
        echo "  DEPLOY_TARGET       Git branch/tag to deploy (default: main)"
        echo "  APP_DIR             Application directory (default: /opt/foodbot)"
        echo "  BACKUP_DIR          Backup directory (default: /opt/foodbot/backups)"
        echo "  SLACK_WEBHOOK_URL   Slack webhook for notifications"
        ;;
    *)
        main
        ;;
esac

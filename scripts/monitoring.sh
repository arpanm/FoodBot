#!/bin/bash

# FoodBot Monitoring Management Script
# Manages the monitoring stack (Prometheus, Grafana, Loki, etc.)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.monitoring.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Check if network exists
check_network() {
    if ! docker network inspect foodbot-network >/dev/null 2>&1; then
        log_warn "Network 'foodbot-network' does not exist. Creating..."
        docker network create foodbot-network
        log_info "Network created successfully"
    fi
}

# Start monitoring stack
start() {
    log_info "Starting FoodBot monitoring stack..."
    check_docker
    check_network

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" up -d

    log_info "Monitoring stack started successfully!"
    log_info ""
    log_info "Access monitoring UIs:"
    log_info "  Grafana:       http://localhost:3030 (admin/admin)"
    log_info "  Prometheus:    http://localhost:9090"
    log_info "  AlertManager:  http://localhost:9093"
    log_info "  Loki:          http://localhost:3100"
}

# Stop monitoring stack
stop() {
    log_info "Stopping FoodBot monitoring stack..."
    check_docker

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" down

    log_info "Monitoring stack stopped successfully!"
}

# Restart monitoring stack
restart() {
    log_info "Restarting FoodBot monitoring stack..."
    stop
    sleep 2
    start
}

# Show status
status() {
    log_info "FoodBot monitoring stack status:"
    docker-compose -f "$COMPOSE_FILE" ps
}

# Show logs
logs() {
    local service=${1:-}
    if [ -z "$service" ]; then
        docker-compose -f "$COMPOSE_FILE" logs -f
    else
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    fi
}

# Clean up (remove volumes)
clean() {
    log_warn "This will remove all monitoring data (volumes). Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Cleaning up monitoring stack..."
        docker-compose -f "$COMPOSE_FILE" down -v
        log_info "Cleanup complete!"
    else
        log_info "Cleanup cancelled."
    fi
}

# Health check
health() {
    log_info "Checking monitoring stack health..."

    check_service() {
        local name=$1
        local url=$2

        if curl -sf "$url" >/dev/null 2>&1; then
            log_info "  $name: ${GREEN}✓ Healthy${NC}"
        else
            log_error "  $name: ${RED}✗ Unhealthy${NC}"
        fi
    }

    check_service "Prometheus" "http://localhost:9090/-/healthy"
    check_service "Grafana" "http://localhost:3030/api/health"
    check_service "AlertManager" "http://localhost:9093/-/healthy"
    check_service "Loki" "http://localhost:3100/ready"
}

# Display usage
usage() {
    cat <<EOF
Usage: $0 [COMMAND]

Commands:
  start     Start the monitoring stack
  stop      Stop the monitoring stack
  restart   Restart the monitoring stack
  status    Show status of monitoring services
  logs      Show logs (optionally for specific service)
  health    Check health of monitoring services
  clean     Stop and remove all data (volumes)
  help      Show this help message

Examples:
  $0 start                # Start monitoring stack
  $0 logs prometheus      # Show Prometheus logs
  $0 health              # Check service health

EOF
}

# Main script logic
case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs "${2:-}"
        ;;
    health)
        health
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: ${1:-}"
        echo ""
        usage
        exit 1
        ;;
esac

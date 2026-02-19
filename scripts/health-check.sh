#!/bin/bash
#
# Health Check Script for FoodBot Production
# Verifies all services are running and healthy
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:4000}"
CUSTOMER_APP_URL="${CUSTOMER_APP_URL:-http://localhost:3000}"
ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

OVERALL_STATUS=0

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_check() {
    echo -n "$1... "
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    OVERALL_STATUS=1
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_http_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}

    print_check "Checking $name"

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)

    if [ "$response" -eq "$expected_status" ]; then
        print_success "OK (HTTP $response)"
        return 0
    else
        print_error "FAILED (HTTP $response)"
        return 1
    fi
}

check_tcp_port() {
    local host=$1
    local port=$2
    local name=$3

    print_check "Checking $name"

    if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
        print_success "OK ($host:$port)"
        return 0
    else
        print_error "FAILED ($host:$port unreachable)"
        return 1
    fi
}

check_docker_container() {
    local container=$1
    local name=$2

    print_check "Checking $name container"

    if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
        if [ "$health" == "healthy" ] || [ "$health" == "unknown" ]; then
            print_success "OK (running)"
            return 0
        else
            print_error "UNHEALTHY (status: $health)"
            return 1
        fi
    else
        print_error "NOT RUNNING"
        return 1
    fi
}

check_disk_space() {
    print_check "Checking disk space"

    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt 80 ]; then
        print_success "OK (${usage}% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        print_warning "WARNING (${usage}% used)"
        return 0
    else
        print_error "CRITICAL (${usage}% used)"
        return 1
    fi
}

check_memory() {
    print_check "Checking memory"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local total=$(sysctl hw.memsize | awk '{print $2}')
        local free=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local page_size=$(vm_stat | head -1 | awk '{print $8}')
        local free_mb=$((free * page_size / 1024 / 1024))
        local total_mb=$((total / 1024 / 1024))
        local usage=$((100 - (free_mb * 100 / total_mb)))
    else
        # Linux
        local usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    fi

    if [ "$usage" -lt 80 ]; then
        print_success "OK (${usage}% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        print_warning "WARNING (${usage}% used)"
        return 0
    else
        print_error "CRITICAL (${usage}% used)"
        return 1
    fi
}

check_redis() {
    print_check "Checking Redis"

    if command -v redis-cli &> /dev/null; then
        response=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>&1)
        if [ "$response" == "PONG" ]; then
            print_success "OK"
            return 0
        else
            print_error "FAILED ($response)"
            return 1
        fi
    else
        print_warning "redis-cli not installed, skipping"
        return 0
    fi
}

check_postgres() {
    print_check "Checking PostgreSQL"

    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" &> /dev/null; then
            print_success "OK"
            return 0
        else
            print_error "FAILED"
            return 1
        fi
    else
        # Fallback to TCP check
        check_tcp_port "$POSTGRES_HOST" "$POSTGRES_PORT" "PostgreSQL (TCP)"
    fi
}

check_api_health() {
    print_check "Checking Gateway API health endpoint"

    response=$(curl -s "$GATEWAY_URL/health" 2>&1)

    if echo "$response" | grep -q "ok"; then
        print_success "OK"

        # Check detailed metrics
        local uptime=$(echo "$response" | jq -r '.uptime // "unknown"' 2>/dev/null)
        local memory=$(echo "$response" | jq -r '.memory.heapUsed // "unknown"' 2>/dev/null)

        if [ "$uptime" != "unknown" ]; then
            echo "    Uptime: $uptime seconds"
        fi
        if [ "$memory" != "unknown" ]; then
            echo "    Memory: $((memory / 1024 / 1024)) MB"
        fi

        return 0
    else
        print_error "FAILED"
        return 1
    fi
}

check_elasticsearch_cluster() {
    print_check "Checking Elasticsearch cluster"

    response=$(curl -s "$ELASTICSEARCH_URL/_cluster/health" 2>&1)

    if echo "$response" | grep -q "status"; then
        local status=$(echo "$response" | jq -r '.status')
        local nodes=$(echo "$response" | jq -r '.number_of_nodes')
        local shards=$(echo "$response" | jq -r '.active_shards')

        if [ "$status" == "green" ]; then
            print_success "OK ($status, $nodes nodes, $shards shards)"
            return 0
        elif [ "$status" == "yellow" ]; then
            print_warning "WARNING ($status, $nodes nodes, $shards shards)"
            return 0
        else
            print_error "CRITICAL ($status)"
            return 1
        fi
    else
        print_error "FAILED"
        return 1
    fi
}

check_job_queue() {
    print_check "Checking job queue"

    response=$(curl -s "$GATEWAY_URL/jobs/stats" 2>&1)

    if echo "$response" | grep -q "pending\|total"; then
        local pending=$(echo "$response" | jq -r '.pending // 0' 2>/dev/null)
        local processing=$(echo "$response" | jq -r '.processing // 0' 2>/dev/null)

        print_success "OK (pending: $pending, processing: $processing)"

        if [ "$pending" -gt 1000 ]; then
            print_warning "High queue backlog: $pending pending jobs"
        fi

        return 0
    else
        print_warning "Stats endpoint not available"
        return 0
    fi
}

check_extension_connectivity() {
    print_check "Checking extension connectivity"

    # Check if extension can poll jobs
    response=$(curl -s "$GATEWAY_URL/jobs/pending" 2>&1)

    if echo "$response" | grep -q "\[\]" || echo "$response" | grep -q "id"; then
        print_success "OK"
        return 0
    else
        print_error "FAILED"
        return 1
    fi
}

main() {
    print_header "FoodBot Production Health Check"
    echo "Timestamp: $(date)"
    echo ""

    # System Health
    print_header "System Health"
    check_disk_space
    check_memory

    # Infrastructure
    print_header "Infrastructure"
    check_postgres
    check_redis
    check_elasticsearch_cluster

    # Application Services
    print_header "Application Services"
    check_http_endpoint "$GATEWAY_URL/health" "Gateway API"
    check_http_endpoint "$CUSTOMER_APP_URL" "Customer App"
    check_api_health

    # Docker Containers (if using Docker)
    if command -v docker &> /dev/null; then
        print_header "Docker Containers"
        check_docker_container "foodbot-gateway-api" "Gateway API"
        check_docker_container "foodbot-customer-app" "Customer App"
        check_docker_container "foodbot-postgres" "PostgreSQL"
        check_docker_container "foodbot-redis" "Redis"
        check_docker_container "foodbot-elasticsearch" "Elasticsearch"
        check_docker_container "foodbot-logstash" "Logstash"
        check_docker_container "foodbot-kibana" "Kibana"
    fi

    # Logging Stack
    print_header "Logging Stack"
    check_http_endpoint "$ELASTICSEARCH_URL/_cluster/health" "Elasticsearch" 200
    check_http_endpoint "$KIBANA_URL/api/status" "Kibana" 200
    check_tcp_port "localhost" "5044" "Logstash (Beats)"

    # Application Features
    print_header "Application Features"
    check_job_queue
    check_extension_connectivity

    # Summary
    echo ""
    print_header "Health Check Summary"
    if [ $OVERALL_STATUS -eq 0 ]; then
        print_success "All checks passed!"
        echo ""
        exit 0
    else
        print_error "Some checks failed!"
        echo ""
        echo "Review the errors above and check logs for more details:"
        echo "  - Application logs: ./logs/"
        echo "  - Docker logs: docker-compose logs -f"
        echo "  - System logs: journalctl -xe"
        echo ""
        exit 1
    fi
}

# Parse arguments
case "${1:-}" in
    --json)
        # JSON output for monitoring systems
        main 2>&1 | tee /tmp/health-check.log
        # Parse and output JSON
        ;;
    --help|-h)
        echo "Usage: $0 [--json|--help]"
        echo ""
        echo "Options:"
        echo "  --json     Output results in JSON format"
        echo "  --help     Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  GATEWAY_URL         Gateway API URL (default: http://localhost:4000)"
        echo "  CUSTOMER_APP_URL    Customer App URL (default: http://localhost:3000)"
        echo "  ELASTICSEARCH_URL   Elasticsearch URL (default: http://localhost:9200)"
        echo "  KIBANA_URL          Kibana URL (default: http://localhost:5601)"
        echo "  REDIS_HOST          Redis host (default: localhost)"
        echo "  POSTGRES_HOST       PostgreSQL host (default: localhost)"
        ;;
    *)
        main
        ;;
esac

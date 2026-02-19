#!/bin/bash
#
# Real-time Monitoring Script for FoodBot
# Displays live metrics and logs
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:4000}"
REFRESH_INTERVAL="${REFRESH_INTERVAL:-5}"

clear_screen() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           FoodBot Production Monitor                      ║${NC}"
    echo -e "${BLUE}║           $(date '+%Y-%m-%d %H:%M:%S')                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

get_metric() {
    local url=$1
    local path=$2
    local default=${3:-0}

    curl -s "$url$path" 2>/dev/null | jq -r "$path // $default" 2>/dev/null || echo "$default"
}

display_system_metrics() {
    echo -e "${CYAN}┌─ System Metrics ─────────────────────────────────────────┐${NC}"

    # CPU usage
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local cpu=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    else
        local cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%//')
    fi

    # Memory usage
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local mem=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages active:\s+(\d+)/ and printf("%.1f", $1 * $size / 1048576);' 2>/dev/null || echo "0")
    else
        local mem=$(free -m | awk 'NR==2{printf "%.1f", $3}')
    fi

    # Disk usage
    local disk=$(df -h / | awk 'NR==2 {print $5}')

    echo -e "  CPU Usage:    ${GREEN}${cpu}%${NC}"
    echo -e "  Memory Used:  ${GREEN}${mem} MB${NC}"
    echo -e "  Disk Usage:   ${GREEN}${disk}${NC}"
    echo -e "${CYAN}└──────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

display_docker_stats() {
    echo -e "${CYAN}┌─ Docker Containers ──────────────────────────────────────┐${NC}"

    if command -v docker &> /dev/null; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | \
            grep foodbot | \
            while read line; do
                echo -e "  $line"
            done
    else
        echo -e "  ${YELLOW}Docker not available${NC}"
    fi

    echo -e "${CYAN}└──────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

display_api_metrics() {
    echo -e "${CYAN}┌─ API Metrics ────────────────────────────────────────────┐${NC}"

    # Get health data
    local health_data=$(curl -s "$GATEWAY_URL/health" 2>/dev/null)

    if [ -n "$health_data" ]; then
        local status=$(echo "$health_data" | jq -r '.status // "unknown"')
        local uptime=$(echo "$health_data" | jq -r '.uptime // 0')
        local memory=$(echo "$health_data" | jq -r '.memory.heapUsed // 0')
        local rss=$(echo "$health_data" | jq -r '.memory.rss // 0')

        # Convert uptime to human readable
        local uptime_hours=$((uptime / 3600))
        local uptime_mins=$(( (uptime % 3600) / 60))

        # Convert memory to MB
        local memory_mb=$((memory / 1024 / 1024))
        local rss_mb=$((rss / 1024 / 1024))

        echo -e "  Status:       ${GREEN}${status}${NC}"
        echo -e "  Uptime:       ${GREEN}${uptime_hours}h ${uptime_mins}m${NC}"
        echo -e "  Heap Used:    ${GREEN}${memory_mb} MB${NC}"
        echo -e "  RSS:          ${GREEN}${rss_mb} MB${NC}"
    else
        echo -e "  ${RED}API not responding${NC}"
    fi

    # Get metrics
    local metrics=$(curl -s "$GATEWAY_URL/metrics" 2>/dev/null)

    if [ -n "$metrics" ]; then
        local req_total=$(echo "$metrics" | grep "http_requests_total" | tail -1 | awk '{print $2}' || echo "0")
        local req_errors=$(echo "$metrics" | grep "http_requests_failed" | tail -1 | awk '{print $2}' || echo "0")

        echo ""
        echo -e "  Total Requests:  ${GREEN}${req_total}${NC}"
        echo -e "  Failed Requests: ${RED}${req_errors}${NC}"
    fi

    echo -e "${CYAN}└──────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

display_job_queue() {
    echo -e "${CYAN}┌─ Job Queue ──────────────────────────────────────────────┐${NC}"

    local stats=$(curl -s "$GATEWAY_URL/jobs/stats" 2>/dev/null)

    if [ -n "$stats" ]; then
        local pending=$(echo "$stats" | jq -r '.pending // 0')
        local processing=$(echo "$stats" | jq -r '.processing // 0')
        local completed=$(echo "$stats" | jq -r '.completed // 0')
        local failed=$(echo "$stats" | jq -r '.failed // 0')

        echo -e "  Pending:      ${YELLOW}${pending}${NC}"
        echo -e "  Processing:   ${BLUE}${processing}${NC}"
        echo -e "  Completed:    ${GREEN}${completed}${NC}"
        echo -e "  Failed:       ${RED}${failed}${NC}"

        # Alert if queue is backed up
        if [ "$pending" -gt 100 ]; then
            echo -e "  ${RED}⚠ High queue backlog!${NC}"
        fi
    else
        echo -e "  ${YELLOW}Stats not available${NC}"
    fi

    echo -e "${CYAN}└──────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

display_database_connections() {
    echo -e "${CYAN}┌─ Database ───────────────────────────────────────────────┐${NC}"

    if command -v psql &> /dev/null; then
        local connections=$(psql -h localhost -U postgres -d foodbot -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='foodbot';" 2>/dev/null | xargs)

        if [ -n "$connections" ]; then
            echo -e "  Active Connections: ${GREEN}${connections}${NC}"

            # Get long running queries
            local long_queries=$(psql -h localhost -U postgres -d foodbot -t -c "SELECT count(*) FROM pg_stat_activity WHERE state='active' AND query_start < NOW() - INTERVAL '30 seconds';" 2>/dev/null | xargs)

            if [ "$long_queries" -gt 0 ]; then
                echo -e "  Long Running Queries: ${YELLOW}${long_queries}${NC}"
            fi
        fi
    else
        echo -e "  ${YELLOW}psql not available${NC}"
    fi

    echo -e "${CYAN}└──────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

display_recent_errors() {
    echo -e "${CYAN}┌─ Recent Errors (Last 5) ─────────────────────────────────┐${NC}"

    # Query Elasticsearch for recent errors
    local errors=$(curl -s "http://localhost:9200/foodbot-errors-*/_search?size=5&sort=@timestamp:desc" 2>/dev/null)

    if [ -n "$errors" ]; then
        echo "$errors" | jq -r '.hits.hits[]._source | "\(.timestamp) - \(.service): \(.message)"' 2>/dev/null | head -5 | while read line; do
            echo -e "  ${RED}✗${NC} $line"
        done
    else
        echo -e "  ${GREEN}No recent errors${NC}"
    fi

    echo -e "${CYAN}└──────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

display_alerts() {
    echo -e "${CYAN}┌─ Active Alerts ──────────────────────────────────────────┐${NC}"

    local has_alerts=false

    # Check for high error rate
    local error_rate=$(curl -s "$GATEWAY_URL/metrics" 2>/dev/null | grep "error_rate" | awk '{print $2}' || echo "0")
    if (( $(echo "$error_rate > 0.01" | bc -l 2>/dev/null || echo 0) )); then
        echo -e "  ${RED}⚠ High error rate: ${error_rate}%${NC}"
        has_alerts=true
    fi

    # Check for slow responses
    local p95=$(curl -s "$GATEWAY_URL/metrics" 2>/dev/null | grep "http_request_duration_p95" | awk '{print $2}' || echo "0")
    if (( $(echo "$p95 > 500" | bc -l 2>/dev/null || echo 0) )); then
        echo -e "  ${YELLOW}⚠ Slow responses: p95=${p95}ms${NC}"
        has_alerts=true
    fi

    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        echo -e "  ${RED}⚠ Low disk space: ${disk_usage}% used${NC}"
        has_alerts=true
    fi

    if [ "$has_alerts" = false ]; then
        echo -e "  ${GREEN}✓ No active alerts${NC}"
    fi

    echo -e "${CYAN}└──────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

monitor_loop() {
    while true; do
        clear_screen

        display_system_metrics
        display_api_metrics
        display_job_queue
        display_database_connections
        display_alerts
        display_recent_errors

        echo -e "${BLUE}Refreshing every ${REFRESH_INTERVAL}s... (Press Ctrl+C to exit)${NC}"

        sleep "$REFRESH_INTERVAL"
    done
}

tail_logs() {
    local service=$1

    if [ -z "$service" ]; then
        echo "Tailing all logs..."
        docker-compose logs -f
    else
        echo "Tailing $service logs..."
        docker-compose logs -f "$service"
    fi
}

show_metrics() {
    clear_screen
    display_system_metrics
    display_api_metrics
    display_job_queue
    display_database_connections
    display_alerts
}

main() {
    case "${1:-}" in
        logs)
            tail_logs "${2:-}"
            ;;
        once)
            show_metrics
            ;;
        --help|-h)
            echo "FoodBot Production Monitor"
            echo ""
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  (no args)     Start real-time monitoring dashboard"
            echo "  logs [svc]    Tail logs for service (or all if no service specified)"
            echo "  once          Show metrics once and exit"
            echo "  --help        Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  GATEWAY_URL         Gateway API URL (default: http://localhost:4000)"
            echo "  REFRESH_INTERVAL    Refresh interval in seconds (default: 5)"
            ;;
        *)
            monitor_loop
            ;;
    esac
}

main "$@"

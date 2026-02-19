#!/bin/bash
#
# FoodBot Performance Benchmark Script
# Runs multiple load testing tools and generates comprehensive reports
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="${RESULTS_DIR}/${TIMESTAMP}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:4000}"
DURATION="${DURATION:-300}"  # 5 minutes default
VUS="${VUS:-50}"             # 50 virtual users default

print_header() {
    echo -e "\n${GREEN}======================================${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${GREEN}======================================${NC}\n"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

check_dependencies() {
    print_header "Checking Dependencies"

    local missing_deps=()

    if ! command -v k6 &> /dev/null; then
        missing_deps+=("k6")
    fi

    if ! command -v artillery &> /dev/null; then
        missing_deps+=("artillery")
    fi

    if ! command -v ab &> /dev/null; then
        missing_deps+=("apache-bench (ab)")
    fi

    if ! command -v wrk &> /dev/null; then
        missing_deps+=("wrk")
    fi

    if [ ${#missing_deps[@]} -eq 0 ]; then
        print_success "All dependencies found"
    else
        print_error "Missing dependencies: ${missing_deps[*]}"
        echo ""
        echo "Install missing dependencies:"
        echo "  - k6: brew install k6"
        echo "  - artillery: npm install -g artillery"
        echo "  - apache-bench: brew install httpd (includes ab)"
        echo "  - wrk: brew install wrk"
        exit 1
    fi
}

setup_results_dir() {
    print_header "Setting Up Results Directory"

    mkdir -p "${REPORT_DIR}"
    print_success "Results will be saved to: ${REPORT_DIR}"
}

check_server() {
    print_header "Checking Server Availability"

    if curl -f -s "${BASE_URL}/health" > /dev/null; then
        print_success "Server is running at ${BASE_URL}"
    else
        print_error "Server is not responding at ${BASE_URL}"
        echo "Start the server with: ./foodbot dev api-gateway"
        exit 1
    fi
}

run_ab_benchmark() {
    print_header "Running Apache Bench (ab)"

    local requests=10000
    local concurrency=50

    print_info "Requests: ${requests}, Concurrency: ${concurrency}"

    ab -n ${requests} -c ${concurrency} \
       -g "${REPORT_DIR}/ab-gnuplot.tsv" \
       "${BASE_URL}/health" > "${REPORT_DIR}/ab-results.txt" 2>&1

    print_success "Apache Bench completed"

    # Extract key metrics
    local rps=$(grep "Requests per second" "${REPORT_DIR}/ab-results.txt" | awk '{print $4}')
    local mean_time=$(grep "Time per request" "${REPORT_DIR}/ab-results.txt" | head -1 | awk '{print $4}')

    echo "  - Requests/sec: ${rps}"
    echo "  - Mean time: ${mean_time} ms"
}

run_wrk_benchmark() {
    print_header "Running wrk Benchmark"

    local duration=60
    local threads=4
    local connections=100

    print_info "Duration: ${duration}s, Threads: ${threads}, Connections: ${connections}"

    wrk -t${threads} -c${connections} -d${duration}s \
        --latency \
        "${BASE_URL}/health" > "${REPORT_DIR}/wrk-results.txt" 2>&1

    print_success "wrk completed"

    # Extract key metrics
    grep -E "(Requests/sec|Latency|Transfer/sec)" "${REPORT_DIR}/wrk-results.txt" || true
}

run_k6_load_test() {
    print_header "Running K6 Load Test"

    print_info "Starting comprehensive load test..."

    # Set environment variables
    export BASE_URL="${BASE_URL}"

    cd "${SCRIPT_DIR}"

    k6 run \
        --out json="${REPORT_DIR}/k6-results.json" \
        --summary-export="${REPORT_DIR}/k6-summary.json" \
        k6-load-test.js 2>&1 | tee "${REPORT_DIR}/k6-output.log"

    print_success "K6 load test completed"
}

run_artillery_test() {
    print_header "Running Artillery Load Test"

    print_info "Starting Artillery test..."

    cd "${SCRIPT_DIR}"

    artillery run \
        --output "${REPORT_DIR}/artillery-results.json" \
        artillery-load-test.yml 2>&1 | tee "${REPORT_DIR}/artillery-output.log"

    # Generate HTML report
    artillery report \
        "${REPORT_DIR}/artillery-results.json" \
        --output "${REPORT_DIR}/artillery-report.html"

    print_success "Artillery test completed"
}

run_api_endpoint_tests() {
    print_header "Running API Endpoint Tests"

    local endpoints=(
        "GET /health"
        "GET /metrics"
        "GET /restaurants/search?q=pizza"
        "GET /jobs/pending"
    )

    print_info "Testing individual endpoints..."

    for endpoint in "${endpoints[@]}"; do
        local method=$(echo $endpoint | awk '{print $1}')
        local path=$(echo $endpoint | awk '{print $2}')
        local url="${BASE_URL}${path}"

        echo ""
        echo "Testing: ${method} ${path}"

        # Quick benchmark with ab
        ab -n 1000 -c 10 -q "${url}" 2>&1 | \
            grep -E "(Requests per second|Time per request|50%|95%|99%)" || true
    done

    print_success "Endpoint tests completed"
}

generate_summary_report() {
    print_header "Generating Summary Report"

    cat > "${REPORT_DIR}/SUMMARY.md" << EOF
# FoodBot Performance Benchmark Report

**Date:** $(date)
**Base URL:** ${BASE_URL}
**Duration:** ${DURATION}s
**Virtual Users:** ${VUS}

## Test Results

### Apache Bench (ab)
$(cat "${REPORT_DIR}/ab-results.txt" | grep -A 20 "Server Software" || echo "Results not available")

### wrk
$(cat "${REPORT_DIR}/wrk-results.txt" || echo "Results not available")

### K6 Load Test
- Full results: [k6-results.json](./k6-results.json)
- Summary: [k6-summary.json](./k6-summary.json)
- Output log: [k6-output.log](./k6-output.log)

### Artillery
- HTML Report: [artillery-report.html](./artillery-report.html)
- JSON Results: [artillery-results.json](./artillery-results.json)

## Performance Thresholds

| Metric              | Target   | Status |
|---------------------|----------|--------|
| p95 Response Time   | < 500ms  | TBD    |
| p99 Response Time   | < 1000ms | TBD    |
| Error Rate          | < 1%     | TBD    |
| Requests/sec        | > 1000   | TBD    |

## Recommendations

1. Review p95 and p99 latencies
2. Check error logs for any failures
3. Monitor database query performance
4. Review cache hit rates
5. Check resource utilization (CPU, memory, network)

## Files Generated

- \`ab-results.txt\` - Apache Bench results
- \`ab-gnuplot.tsv\` - Apache Bench gnuplot data
- \`wrk-results.txt\` - wrk benchmark results
- \`k6-results.json\` - K6 detailed results
- \`k6-summary.json\` - K6 summary metrics
- \`artillery-results.json\` - Artillery results
- \`artillery-report.html\` - Artillery HTML report

---
*Generated by FoodBot Performance Benchmark Suite*
EOF

    print_success "Summary report generated: ${REPORT_DIR}/SUMMARY.md"
}

open_reports() {
    print_header "Opening Reports"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "${REPORT_DIR}/SUMMARY.md"
        open "${REPORT_DIR}/artillery-report.html"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "${REPORT_DIR}/SUMMARY.md" 2>/dev/null || true
        xdg-open "${REPORT_DIR}/artillery-report.html" 2>/dev/null || true
    fi
}

main() {
    print_header "FoodBot Performance Benchmark Suite"

    check_dependencies
    setup_results_dir
    check_server

    # Run benchmarks
    run_ab_benchmark
    run_wrk_benchmark
    run_api_endpoint_tests
    # run_k6_load_test      # Disabled by default (long running)
    # run_artillery_test    # Disabled by default (long running)

    generate_summary_report

    print_header "Benchmark Complete!"
    print_info "Results saved to: ${REPORT_DIR}"
    print_info "View summary: cat ${REPORT_DIR}/SUMMARY.md"

    # open_reports
}

# Parse arguments
case "${1:-}" in
    --full)
        # Run full benchmarks including k6 and artillery
        main
        run_k6_load_test
        run_artillery_test
        generate_summary_report
        ;;
    --quick)
        # Run only quick benchmarks
        check_dependencies
        setup_results_dir
        check_server
        run_ab_benchmark
        run_wrk_benchmark
        generate_summary_report
        ;;
    --help|-h)
        echo "Usage: $0 [--quick|--full|--help]"
        echo ""
        echo "Options:"
        echo "  --quick    Run quick benchmarks only (ab, wrk)"
        echo "  --full     Run full benchmark suite (ab, wrk, k6, artillery)"
        echo "  --help     Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  BASE_URL   Base URL of the API (default: http://localhost:4000)"
        echo "  DURATION   Test duration in seconds (default: 300)"
        echo "  VUS        Number of virtual users (default: 50)"
        ;;
    *)
        main
        ;;
esac

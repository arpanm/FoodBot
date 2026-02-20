# OPS-MON-001: Prometheus Metrics Collection

**ID**: OPS-MON-001
**Component**: Operations / Monitoring
**Category**: Metrics Collection
**Status**: ✅ Implemented
**Priority**: 🔴 Critical
**Created**: 2026-02-20
**Updated**: 2026-02-20

---

## Overview

Implement comprehensive Prometheus metrics collection across all FoodBot services for monitoring application health, performance, and infrastructure metrics.

## Requirements

### Functional Requirements

- **FR-1**: All application services MUST expose `/metrics` endpoint in Prometheus format
- **FR-2**: Infrastructure services MUST be monitored via exporters (node-exporter, cadvisor)
- **FR-3**: Metrics MUST be collected every 15 seconds for application services
- **FR-4**: Metrics MUST be collected every 30 seconds for infrastructure services
- **FR-5**: Metrics data MUST be retained for 15 days minimum

### Non-Functional Requirements

- **NFR-1**: Metrics collection overhead MUST NOT exceed 1% CPU per service
- **NFR-2**: Prometheus server MUST handle 10,000+ time series
- **NFR-3**: Query response time MUST be under 1 second for p95
- **NFR-4**: Metrics endpoint MUST respond within 100ms

## Metrics Categories

### Application Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_request_duration_seconds` | Histogram | method, route, status | HTTP request duration |
| `http_request_total` | Counter | method, route, status | Total HTTP requests |
| `http_error_rate` | Gauge | service | HTTP error rate percentage |
| `active_connections` | Gauge | service | Active connections count |
| `circuit_breaker_state` | Gauge | name | Circuit breaker state (0=closed, 1=open) |
| `cache_hit_rate` | Gauge | cache_type | Cache hit rate percentage |

### Infrastructure Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `node_cpu_seconds_total` | Counter | CPU usage per core |
| `node_memory_MemAvailable_bytes` | Gauge | Available memory |
| `node_disk_io_time_seconds_total` | Counter | Disk I/O time |
| `container_cpu_usage_seconds_total` | Counter | Container CPU usage |
| `container_memory_usage_bytes` | Gauge | Container memory usage |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `pg_stat_activity_count` | Gauge | Active PostgreSQL connections |
| `pg_stat_database_tup_fetched` | Counter | Rows fetched |
| `pg_locks_count` | Gauge | PostgreSQL lock count |
| `redis_connected_clients` | Gauge | Redis connected clients |
| `redis_memory_used_bytes` | Gauge | Redis memory usage |

### Temporal Workflow Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `temporal_workflow_execution_count` | Counter | Workflow executions |
| `temporal_workflow_failure_count` | Counter | Workflow failures |
| `temporal_activity_retry_count` | Counter | Activity retries |

## Service Endpoints

### Application Services

```yaml
Gateway API: http://localhost:3000/metrics
MCP Adapter: http://localhost:8082/metrics
Search Orchestrator: http://localhost:3002/metrics
Notification Service: http://localhost:3005/metrics
```

### Infrastructure Exporters

```yaml
Node Exporter: http://localhost:9100/metrics
Cadvisor: http://localhost:8080/metrics
Postgres Exporter: http://localhost:9187/metrics
Redis Exporter: http://localhost:9121/metrics
```

## Prometheus Configuration

### Scrape Config

```yaml
scrape_configs:
  - job_name: 'foodbot-gateway-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['foodbot-db:9187']
    scrape_interval: 30s
```

### Retention Policy

```yaml
storage:
  tsdb:
    retention.time: 15d
    retention.size: 50GB
```

## Implementation Details

### Files Modified

- `/monitoring/prometheus/prometheus.yml` - Main Prometheus configuration
- `/packages/monitoring/src/metrics/prometheus.ts` - Metrics collection middleware
- `/apps/gateway-api/src/main.ts` - Metrics endpoint registration
- `/docker-compose.monitoring.yml` - Monitoring stack definition

### Libraries Used

- `prom-client` (Node.js) - Prometheus client library
- `express-prometheus-middleware` - Express metrics middleware
- Prometheus server v2.50.1

## Acceptance Criteria

- [x] Prometheus server deployed and accessible at http://localhost:9090
- [x] All application services expose `/metrics` endpoint
- [x] HTTP request metrics collected (duration, count, status)
- [x] Infrastructure metrics collected (CPU, memory, disk, network)
- [x] Database metrics collected (connections, queries, locks)
- [x] Circuit breaker metrics collected
- [x] Cache hit rate metrics collected
- [x] Metrics retention set to 15 days
- [x] Prometheus configuration includes all services
- [x] Node exporter deployed for system metrics
- [x] Cadvisor deployed for container metrics

## Testing

### Manual Testing

```bash
# Test Prometheus server
curl http://localhost:9090/-/healthy

# Test metrics endpoint
curl http://localhost:3000/metrics

# Query metrics via PromQL
curl 'http://localhost:9090/api/v1/query?query=http_request_duration_seconds'
```

### Automated Testing

- Unit tests for metrics collection functions
- Integration tests for Prometheus scraping
- Load tests to verify metrics overhead

## Monitoring

### Health Checks

```bash
# Prometheus health
wget --quiet --tries=1 --spider http://localhost:9090/-/healthy

# Metrics endpoint health
curl -f http://localhost:3000/metrics
```

### Alerts

- Prometheus scrape failure (target down > 5 min)
- High cardinality metrics (> 100k time series)
- Metrics endpoint slow response (> 100ms)

## Dependencies

- **Depends on**: Docker infrastructure
- **Depends on**: Application services
- **Required for**: TASK-OPS-001 (Grafana dashboards)
- **Required for**: TASK-OPS-002 (Alerting rules)

## Related Requirements

- [OPS-MON-002](./OPS-MON-002-grafana-dashboards.md) - Grafana Dashboards
- [OPS-MON-003](./OPS-MON-003-alertmanager.md) - AlertManager Configuration
- [OPS-LOG-001](./OPS-LOG-001-loki-aggregation.md) - Log Aggregation

## References

- [Production Runbook](../../archive/guides/PRODUCTION_RUNBOOK.md) - Section 2: Monitoring Dashboards
- [Prometheus Documentation](https://prometheus.io/docs/)
- [prom-client GitHub](https://github.com/siderolabs/prom-client)

---

**Last Reviewed**: 2026-02-20
**Status**: Implemented and operational in production

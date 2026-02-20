# Monitoring Architecture

**Component**: Monitoring Stack
**Status**: ✅ Implemented
**Version**: 1.0.0
**Last Updated**: 2026-02-20
**Owner**: SRE Team

---

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Components](#components)
- [Data Flow](#data-flow)
- [Metrics Strategy](#metrics-strategy)
- [Alerting Strategy](#alerting-strategy)
- [Dashboards](#dashboards)
- [Performance Characteristics](#performance-characteristics)
- [Security Considerations](#security-considerations)
- [Deployment](#deployment)
- [Operations](#operations)

---

## Overview

FoodBot's monitoring architecture provides comprehensive observability across all system components through a modern observability stack combining metrics (Prometheus), logs (Loki), traces (Tempo), and visualization (Grafana).

### Goals

- **Real-time Visibility**: Monitor system health and performance in real-time
- **Proactive Alerting**: Detect issues before they impact users
- **Root Cause Analysis**: Quickly diagnose problems through correlated metrics and logs
- **Capacity Planning**: Track resource usage trends for scaling decisions
- **SLA Compliance**: Measure and enforce service level objectives

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Metrics** | Prometheus | 2.50.1 | Time-series metrics collection and storage |
| **Visualization** | Grafana | 10.3.3 | Dashboard creation and data visualization |
| **Alerting** | AlertManager | 0.27.0 | Alert routing and notification |
| **Logs** | Loki | 2.9.5 | Log aggregation and querying |
| **Log Shipping** | Promtail | 2.9.5 | Log collection and forwarding |
| **System Metrics** | Node Exporter | 1.7.0 | Linux system metrics |
| **Container Metrics** | cAdvisor | 0.47.2 | Container resource metrics |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GRAFANA (Port 3030)                         │
│                    Visualization & Dashboards                        │
└────────┬─────────────────┬─────────────────┬────────────────────────┘
         │                 │                 │
         │                 │                 │
         v                 v                 v
┌────────────────┐ ┌───────────────┐ ┌──────────────────┐
│   PROMETHEUS   │ │     LOKI      │ │   ALERTMANAGER   │
│   (Port 9090)  │ │  (Port 3100)  │ │   (Port 9093)    │
│                │ │               │ │                  │
│ - Scrapes      │ │ - Stores      │ │ - Routes alerts  │
│   metrics      │ │   logs        │ │ - Sends          │
│ - Evaluates    │ │ - Indexes     │ │   notifications  │
│   rules        │ │   labels      │ │                  │
└────────┬───────┘ └───────┬───────┘ └──────────────────┘
         │                 │
         │                 │
    ┌────┴─────────────────┴────┐
    │                            │
    │    METRICS SOURCES         │    LOG SOURCES
    │                            │
    v                            v
┌──────────────────────────────────────────────────────────────────┐
│  APPLICATION SERVICES                                             │
├──────────────────────────────────────────────────────────────────┤
│  • Gateway API (/metrics)           • JSON structured logs        │
│  • MCP Orchestrator (/metrics)      • Request/response logs       │
│  • Search Orchestrator (/metrics)   • Error logs with stack       │
│  • Notification Service (/metrics)  • Audit logs                  │
│  • Temporal Workers (/metrics)      • Performance logs            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE SERVICES                                          │
├──────────────────────────────────────────────────────────────────┤
│  • Node Exporter (system metrics)   • System logs (/var/log)     │
│  • cAdvisor (container metrics)     • Docker container logs      │
│  • Postgres Exporter (DB metrics)   • Database logs              │
│  • Redis Exporter (cache metrics)   • Redis logs                 │
└──────────────────────────────────────────────────────────────────┘

                              │
                              v
                    ┌─────────────────┐
                    │    PROMTAIL     │
                    │                 │
                    │  - Tails logs   │
                    │  - Adds labels  │
                    │  - Ships to     │
                    │    Loki         │
                    └─────────────────┘
```

---

## Components

### 1. Prometheus

**Purpose**: Time-series database for metrics collection and storage

**Configuration**:
- **Scrape Interval**: 15s (application), 30s (infrastructure)
- **Retention**: 15 days
- **Storage**: 50GB max
- **Evaluation Interval**: 15s for alerting rules

**Scrape Targets**:

```yaml
scrape_configs:
  # Application Services
  - job_name: 'foodbot-gateway-api'
    static_configs:
      - targets: ['host.docker.internal:3000']

  - job_name: 'foodbot-mcp-adapter'
    static_configs:
      - targets: ['host.docker.internal:8082']

  # Infrastructure
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  # Databases
  - job_name: 'postgres'
    static_configs:
      - targets: ['foodbot-db:9187']
```

**Key Features**:
- Multi-dimensional data model with labels
- PromQL query language
- Built-in alerting rules engine
- Service discovery (Kubernetes)
- High availability support

### 2. Grafana

**Purpose**: Metrics visualization and dashboard creation

**Configuration**:
- **Admin User**: admin (change in production)
- **Data Sources**: Prometheus, Loki, Tempo
- **Plugins**: grafana-piechart-panel

**Pre-configured Dashboards**:
1. **System Overview** - High-level health metrics
2. **Gateway API** - Request rates, latency, errors
3. **MCP Orchestrator** - Provider stats, circuit breakers
4. **Search Performance** - Query latency, cache hits
5. **Temporal Workflows** - Execution stats, failures
6. **Database Performance** - Connection pool, query times
7. **Infrastructure** - CPU, memory, disk, network

**Features**:
- Custom dashboard creation
- Alert annotations on graphs
- Variable templating
- Panel sharing and embedding
- Role-based access control

### 3. AlertManager

**Purpose**: Alert routing, grouping, and notification

**Configuration**:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'team-notifications'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true

    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'team-notifications'
    slack_configs:
      - api_url: '$SLACK_WEBHOOK_URL'
        channel: '#alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '$PAGERDUTY_SERVICE_KEY'

  - name: 'slack-warnings'
    slack_configs:
      - api_url: '$SLACK_WEBHOOK_URL'
        channel: '#warnings'
```

**Alert Grouping**:
- Groups similar alerts to reduce noise
- Deduplicates identical alerts
- Batches notifications

**Notification Channels**:
- Slack (team notifications)
- PagerDuty (critical alerts)
- Email (digest summaries)
- Webhook (custom integrations)

### 4. Loki

**Purpose**: Log aggregation and querying

**Configuration**:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  retention_period: 30d
```

**Features**:
- Index-free log storage (labels only)
- LogQL query language
- Multi-tenancy support
- Low resource footprint
- Grafana integration

### 5. Promtail

**Purpose**: Log collection and forwarding to Loki

**Configuration**:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*.log

  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
```

**Features**:
- Tails log files in real-time
- Adds labels for filtering
- Supports multiple input sources
- Batches logs for efficiency

### 6. Node Exporter

**Purpose**: Linux system metrics

**Metrics Collected**:
- CPU usage per core
- Memory usage (available, used, cached)
- Disk I/O and usage
- Network traffic and errors
- System load averages
- File descriptor usage

### 7. cAdvisor

**Purpose**: Container resource metrics

**Metrics Collected**:
- Container CPU usage
- Container memory usage
- Container network I/O
- Container filesystem usage
- Container restart counts

---

## Data Flow

### Metrics Collection Flow

```
1. Application exports metrics → /metrics endpoint (Prometheus format)
2. Prometheus scrapes endpoint → Every 15-30 seconds
3. Prometheus stores metrics → Time-series database
4. Prometheus evaluates rules → Triggers alerts if thresholds met
5. AlertManager receives alerts → Routes to appropriate channels
6. Grafana queries metrics → Displays in dashboards
7. Users view dashboards → Monitor system health
```

### Log Collection Flow

```
1. Application writes logs → stdout/stderr (JSON format)
2. Docker captures logs → /var/lib/docker/containers
3. Promtail tails logs → Reads from Docker socket
4. Promtail adds labels → job, container, environment
5. Promtail ships to Loki → Batched HTTP requests
6. Loki indexes logs → Labels only, not content
7. Grafana queries logs → LogQL queries
8. Users view logs → Correlated with metrics
```

---

## Metrics Strategy

### Metric Naming Convention

```
<component>_<metric_name>_<unit>

Examples:
- http_request_duration_seconds
- database_connection_pool_active
- cache_hit_rate_percent
- workflow_execution_count_total
```

### Metric Types

| Type | Use Case | Example |
|------|----------|---------|
| **Counter** | Monotonically increasing values | `http_requests_total` |
| **Gauge** | Values that go up and down | `memory_usage_bytes` |
| **Histogram** | Distribution of values | `http_request_duration_seconds` |
| **Summary** | Similar to histogram | `api_response_size_bytes` |

### Key Metrics

#### Application Performance

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) /
rate(http_requests_total[5m])

# Latency percentiles
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)
```

#### Infrastructure Health

```promql
# CPU usage
100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```

#### Database Performance

```promql
# Connection pool usage
pg_stat_activity_count / pg_settings_max_connections * 100

# Query rate
rate(pg_stat_database_xact_commit[5m])

# Replication lag
pg_replication_lag_seconds
```

### Metric Labels

**Standard Labels**:
- `environment`: production, staging, development
- `service`: gateway-api, mcp-orchestrator, etc.
- `instance`: hostname or pod name
- `version`: application version

**Best Practices**:
- Keep cardinality low (< 100k time series per metric)
- Use consistent label names across metrics
- Avoid high-cardinality labels (user IDs, UUIDs)

---

## Alerting Strategy

### Alert Severity Levels

| Level | Response Time | Notification | Example |
|-------|--------------|--------------|---------|
| **Critical** | 15 minutes | PagerDuty + Slack | Service down, data loss |
| **Warning** | 2 hours | Slack | High latency, elevated errors |
| **Info** | 24 hours | Email digest | Performance trends |

### Alert Rules

**File**: `/monitoring/prometheus/alerts.yml`

```yaml
groups:
  - name: application
    interval: 30s
    rules:
      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency (p95 > 500ms)"
          description: "{{ $labels.service }} p95 latency is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate (> 5%)"
          description: "{{ $labels.service }} error rate is {{ $value | humanizePercentage }}"

      - alert: ServiceDown
        expr: up{job=~"foodbot-.*"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} has been down for 5 minutes"

  - name: infrastructure
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage (> 80%)"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage (> 90%)"

      - alert: DiskSpaceRunningOut
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk space running out (> 85%)"

  - name: database
    interval: 30s
    rules:
      - alert: PostgreSQLConnectionPoolHigh
        expr: pg_stat_activity_count / pg_settings_max_connections * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL connection pool usage high (> 80%)"

      - alert: PostgreSQLReplicationLagHigh
        expr: pg_replication_lag_seconds > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL replication lag high (> 10s)"
```

### Alert Routing

```yaml
# Route critical alerts to PagerDuty immediately
# Route warnings to Slack
# Batch info alerts to email digest

routes:
  - match:
      severity: critical
    receiver: pagerduty
    continue: true

  - match:
      severity: critical
    receiver: slack-critical

  - match:
      severity: warning
    receiver: slack-warnings

  - match:
      severity: info
    receiver: email-digest
    group_interval: 24h
```

---

## Dashboards

### 1. System Overview Dashboard

**Purpose**: High-level system health at a glance

**Panels**:
- Overall system status (green/yellow/red)
- Request rate (requests/second)
- Error rate (percentage)
- Average latency (p50, p95, p99)
- Active users
- Service uptime
- Infrastructure health (CPU, memory, disk)

### 2. Gateway API Dashboard

**Purpose**: Detailed API performance metrics

**Panels**:
- Request rate by endpoint
- Latency distribution (histogram)
- Error rate by endpoint
- Response status code distribution
- Active connections
- JWT validation success rate
- Cache hit rate
- Database query performance

### 3. MCP Orchestrator Dashboard

**Purpose**: Search and provider performance

**Panels**:
- Search query rate
- Provider response times
- Circuit breaker states
- Cache hit rate by provider
- Elasticsearch query latency
- Provider error rates
- Aggregation time

### 4. Temporal Workflows Dashboard

**Purpose**: Workflow execution monitoring

**Panels**:
- Active workflows
- Workflow completion rate
- Workflow failure rate
- Activity execution time
- Activity retry rate
- Workflow timeout rate
- Task queue depth

### 5. Infrastructure Dashboard

**Purpose**: System resource monitoring

**Panels**:
- CPU usage per service
- Memory usage per service
- Network I/O
- Disk I/O
- Container restart count
- Pod status (Kubernetes)
- Node health

---

## Performance Characteristics

### Resource Usage

| Component | CPU | Memory | Disk | Network |
|-----------|-----|--------|------|---------|
| **Prometheus** | 2 cores | 4GB | 50GB (15 days retention) | 10 Mbps |
| **Grafana** | 1 core | 1GB | 5GB | 5 Mbps |
| **Loki** | 2 cores | 2GB | 100GB (30 days retention) | 20 Mbps |
| **AlertManager** | 0.5 cores | 512MB | 1GB | 1 Mbps |
| **Node Exporter** | 0.1 cores | 32MB | N/A | 0.1 Mbps |
| **cAdvisor** | 0.5 cores | 512MB | N/A | 1 Mbps |

### Scalability

- **Metrics**: Prometheus can handle 1M+ time series
- **Logs**: Loki can ingest 1GB/day without performance degradation
- **Queries**: Grafana can serve 1000+ concurrent dashboards
- **Alerts**: AlertManager can route 10k+ alerts/hour

### Query Performance

- **Simple PromQL queries**: < 100ms
- **Complex PromQL queries**: < 1s
- **LogQL queries**: < 2s
- **Dashboard load time**: < 3s

---

## Security Considerations

### Authentication

**Grafana**:
- Admin credentials changed from default
- LDAP/OAuth integration for production
- Role-based access control (viewer, editor, admin)
- Session timeout configured

**Prometheus/AlertManager**:
- Not exposed publicly (internal network only)
- Basic auth for production deployments
- TLS enabled for external access

### Network Security

```yaml
# Only Grafana exposed externally
# Prometheus, Loki, AlertManager internal only

networks:
  foodbot-network:
    internal: false  # Grafana accessible

  monitoring-internal:
    internal: true   # Prometheus, Loki internal only
```

### Data Security

- **Metrics**: No PII in metric labels
- **Logs**: Sensitive data redacted (passwords, tokens, credit cards)
- **Backups**: Encrypted at rest
- **Retention**: Automatic cleanup after retention period

### Secrets Management

```bash
# Secrets stored in environment variables or Kubernetes secrets
# Not committed to Git

GRAFANA_ADMIN_PASSWORD=<secret>
SLACK_WEBHOOK_URL=<secret>
PAGERDUTY_SERVICE_KEY=<secret>
```

---

## Deployment

### Docker Compose

**File**: `/docker-compose.monitoring.yml`

```bash
# Start monitoring stack
./scripts/monitoring.sh start

# Stop monitoring stack
./scripts/monitoring.sh stop

# View logs
./scripts/monitoring.sh logs

# Health check
./scripts/monitoring.sh health
```

**Access**:
- Grafana: http://localhost:3030
- Prometheus: http://localhost:9090
- AlertManager: http://localhost:9093
- Loki: http://localhost:3100

### Kubernetes

**Helm Chart**: `charts/monitoring/`

```bash
# Deploy monitoring stack
helm install monitoring ./charts/monitoring \
  --namespace monitoring \
  --create-namespace \
  --values values-prod.yaml

# Upgrade
helm upgrade monitoring ./charts/monitoring \
  --namespace monitoring

# Rollback
helm rollback monitoring
```

**Access**:
- Grafana: https://grafana.foodbot.com
- Prometheus: https://prometheus.foodbot.com (internal only)
- AlertManager: https://alertmanager.foodbot.com (internal only)

---

## Operations

### Daily Operations

**Health Check**:
```bash
# Automated health check
./scripts/monitoring.sh health

# Manual check
curl http://localhost:9090/-/healthy
curl http://localhost:3030/api/health
curl http://localhost:3100/ready
```

**Troubleshooting**:
```bash
# View Prometheus targets
curl http://localhost:9090/api/v1/targets | jq

# Check AlertManager alerts
curl http://localhost:9093/api/v2/alerts | jq

# View Grafana datasources
curl http://admin:admin@localhost:3030/api/datasources | jq
```

### Maintenance

**Backup Prometheus Data**:
```bash
# Take snapshot
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot

# Copy snapshot
docker cp foodbot-prometheus:/prometheus/snapshots/. ./backups/prometheus/
```

**Cleanup Old Data**:
```bash
# Prometheus auto-cleans after 15 days
# Loki auto-cleans after 30 days

# Manual cleanup if needed
curl -X POST -g 'http://localhost:3100/loki/api/v1/delete?query={job="old"}&start=0&end=1234567890'
```

**Update Dashboards**:
```bash
# Export dashboard JSON
curl http://admin:admin@localhost:3030/api/dashboards/uid/<uid> > dashboard.json

# Import dashboard
curl -X POST http://admin:admin@localhost:3030/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @dashboard.json
```

### Monitoring the Monitoring

**Meta-Alerts**:
```yaml
- alert: PrometheusDown
  expr: up{job="prometheus"} == 0
  for: 5m

- alert: GrafanaDown
  expr: up{job="grafana"} == 0
  for: 5m

- alert: PrometheusScrapeFailures
  expr: rate(prometheus_target_scrapes_exceeded_sample_limit_total[5m]) > 0
  for: 5m
```

---

## Related Documentation

- [Production Runbook](../../archive/guides/PRODUCTION_RUNBOOK.md)
- [Troubleshooting Guide](../../archive/guides/TROUBLESHOOTING.md)
- [OPS-MON-001: Prometheus Metrics](../../requirements/workflows/OPS-MON-001-prometheus-metrics.md)
- [OPS-HEALTH-001: Health Checks](../../requirements/workflows/OPS-HEALTH-001-health-checks.md)

---

**Maintained by**: SRE Team
**Review Cycle**: Monthly
**Last Architecture Review**: 2026-02-20

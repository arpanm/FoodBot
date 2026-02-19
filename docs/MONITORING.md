# FoodBot Monitoring and Observability Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19
**Target Audience:** SRE Team, DevOps Engineers, On-Call Engineers

---

## Table of Contents

- [1. Metrics Reference](#1-metrics-reference)
- [2. Alert Configuration](#2-alert-configuration)
- [3. Dashboard Usage](#3-dashboard-usage)
- [4. Log Aggregation](#4-log-aggregation)
- [5. Tracing Setup](#5-tracing-setup)
- [6. Health Checks](#6-health-checks)

---

## 1. Metrics Reference

### Application Metrics

#### Gateway API (NestJS)

Exposed at: `/actuator/prometheus` (custom implementation via Pino metrics)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_request_duration_seconds` | Histogram | method, route, status | HTTP request latency |
| `http_requests_total` | Counter | method, route, status | Total HTTP requests |
| `http_errors_total` | Counter | method, route, error_code | HTTP errors by type |
| `jwt_validations_total` | Counter | result | JWT validation attempts |
| `jwt_validation_failures_total` | Counter | reason | JWT validation failures |
| `database_connections_active` | Gauge | -- | Active database connections |
| `database_connections_idle` | Gauge | -- | Idle database connections |
| `database_query_duration_seconds` | Histogram | query_type | Database query latency |
| `redis_operations_total` | Counter | operation, result | Redis operations |
| `redis_operation_duration_seconds` | Histogram | operation | Redis operation latency |
| `temporal_workflow_starts_total` | Counter | workflow_type | Workflows started |
| `temporal_workflow_failures_total` | Counter | workflow_type, error | Workflow failures |
| `kafka_messages_published_total` | Counter | topic | Kafka messages published |
| `kafka_publish_errors_total` | Counter | topic, error | Kafka publish errors |

#### MCP Orchestrator (Spring Boot)

Exposed at: `/mcp/v1/actuator/prometheus`

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_server_requests_seconds` | Histogram | method, uri, status | HTTP request latency |
| `mcp_provider_calls_total` | Counter | provider, result | MCP provider call count |
| `mcp_provider_duration_seconds` | Histogram | provider | MCP provider latency |
| `resilience4j_circuitbreaker_state` | Gauge | name | Circuit breaker state (0=closed, 1=open, 2=half_open) |
| `resilience4j_circuitbreaker_calls_total` | Counter | name, kind | Circuit breaker calls |
| `resilience4j_ratelimiter_available_permissions` | Gauge | name | Rate limiter available permits |
| `resilience4j_retry_calls_total` | Counter | name, kind | Retry attempts |
| `cache_gets_total` | Counter | cache, result | Cache get operations |
| `cache_puts_total` | Counter | cache | Cache put operations |
| `cache_evictions_total` | Counter | cache | Cache evictions |
| `elasticsearch_query_duration_seconds` | Histogram | index | Elasticsearch query latency |
| `elasticsearch_index_duration_seconds` | Histogram | index | Elasticsearch indexing latency |
| `kafka_consumer_lag` | Gauge | topic, partition, group | Kafka consumer lag |
| `kafka_consumer_records_consumed_total` | Counter | topic, partition | Kafka records consumed |

#### Search Orchestrator (TypeScript)

Exposed at: `/metrics`

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `search_requests_total` | Counter | strategy, result | Search requests |
| `search_duration_seconds` | Histogram | strategy, source | Search latency by source |
| `search_source_timeouts_total` | Counter | source | Source timeout count |
| `search_source_errors_total` | Counter | source, error | Source error count |
| `search_cache_hits_total` | Counter | -- | Cache hits |
| `search_cache_misses_total` | Counter | -- | Cache misses |
| `search_aggregation_duration_seconds` | Histogram | -- | Result aggregation time |

#### Temporal Workers

Exposed via Temporal Server metrics at: `localhost:7235/metrics`

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `temporal_workflow_execution_time` | Histogram | workflow_type | Workflow execution time |
| `temporal_activity_execution_time` | Histogram | activity_type | Activity execution time |
| `temporal_activity_retry_count` | Counter | activity_type | Activity retry attempts |
| `temporal_workflow_task_queue_latency` | Histogram | task_queue | Task queue latency |
| `temporal_worker_task_slots_available` | Gauge | worker_id | Available worker slots |

### Infrastructure Metrics

#### PostgreSQL

Exposed via postgres_exporter at: `localhost:9187/metrics`

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `pg_up` | Gauge | -- | PostgreSQL availability |
| `pg_stat_database_numbackends` | Gauge | datname | Active connections |
| `pg_stat_database_xact_commit` | Counter | datname | Committed transactions |
| `pg_stat_database_xact_rollback` | Counter | datname | Rolled back transactions |
| `pg_stat_database_blks_hit` | Counter | datname | Buffer cache hits |
| `pg_stat_database_blks_read` | Counter | datname | Disk reads |
| `pg_stat_replication_lag_bytes` | Gauge | application_name | Replication lag |
| `pg_locks_count` | Gauge | datname, mode | Active locks |

#### Redis

Exposed via redis_exporter at: `localhost:9121/metrics`

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `redis_up` | Gauge | -- | Redis availability |
| `redis_connected_clients` | Gauge | -- | Connected clients |
| `redis_used_memory_bytes` | Gauge | -- | Memory usage |
| `redis_evicted_keys_total` | Counter | -- | Evicted keys |
| `redis_keyspace_hits_total` | Counter | db | Cache hits |
| `redis_keyspace_misses_total` | Counter | db | Cache misses |
| `redis_commands_processed_total` | Counter | cmd | Commands processed |
| `redis_command_duration_seconds` | Histogram | cmd | Command latency |

#### Elasticsearch

Exposed via elasticsearch_exporter at: `localhost:9114/metrics`

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `elasticsearch_cluster_health_status` | Gauge | cluster | Cluster health (0=green, 1=yellow, 2=red) |
| `elasticsearch_cluster_health_number_of_nodes` | Gauge | cluster | Node count |
| `elasticsearch_indices_search_query_time_seconds` | Counter | cluster | Query time |
| `elasticsearch_indices_search_query_total` | Counter | cluster | Query count |
| `elasticsearch_indices_indexing_index_time_seconds` | Counter | cluster | Indexing time |
| `elasticsearch_indices_indexing_index_total` | Counter | cluster | Indexing count |
| `elasticsearch_jvm_memory_used_bytes` | Gauge | cluster, area | JVM memory usage |

#### Kafka

Exposed via kafka_exporter at: `localhost:9308/metrics`

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `kafka_brokers` | Gauge | -- | Active brokers |
| `kafka_topic_partitions` | Gauge | topic | Partition count |
| `kafka_consumergroup_lag` | Gauge | consumergroup, topic, partition | Consumer lag |
| `kafka_consumergroup_current_offset` | Gauge | consumergroup, topic, partition | Current offset |
| `kafka_topic_partition_current_offset` | Gauge | topic, partition | Log end offset |

---

## 2. Alert Configuration

### Alert Severity Levels

| Severity | Response | Example |
|----------|----------|---------|
| **Critical** | Page on-call immediately | API down, database unreachable |
| **Warning** | Notify Slack, investigate within 30min | High latency, elevated error rate |
| **Info** | Log only, investigate during business hours | Deployment, scaling event |

### Alert Rules (Prometheus)

#### API Health Alerts

```yaml
# File: prometheus/alerts/api_health.yml
groups:
  - name: api_health
    interval: 30s
    rules:
      - alert: APIHighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "API error rate above 5%"
          description: "{{ $labels.service }} has {{ $value | humanizePercentage }} error rate"
          dashboard: "https://grafana.foodbot.com/d/gateway-api"

      - alert: APIHighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "API p95 latency above 500ms"
          description: "{{ $labels.service }} p95 latency is {{ $value }}s"

      - alert: APIDown
        expr: up{job="gateway-api"} == 0
        for: 1m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Gateway API is down"
          description: "Gateway API instance {{ $labels.instance }} is unreachable"
```

#### Database Alerts

```yaml
# File: prometheus/alerts/database.yml
groups:
  - name: database
    interval: 30s
    rules:
      - alert: PostgresConnectionPoolHigh
        expr: |
          (pg_stat_database_numbackends / pg_settings_max_connections) > 0.8
        for: 5m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "PostgreSQL connection pool usage above 80%"
          description: "Database {{ $labels.datname }} using {{ $value | humanizePercentage }} of connection pool"

      - alert: PostgresReplicationLag
        expr: pg_stat_replication_lag_bytes > 10485760  # 10MB
        for: 5m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "PostgreSQL replication lag above 10MB"
          description: "Replica {{ $labels.application_name }} is {{ $value | humanize }}B behind"

      - alert: PostgresDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL instance {{ $labels.instance }} is unreachable"
```

#### Cache Alerts

```yaml
# File: prometheus/alerts/cache.yml
groups:
  - name: cache
    interval: 30s
    rules:
      - alert: RedisCacheHitRateLow
        expr: |
          (
            sum(rate(redis_keyspace_hits_total[5m]))
            /
            (sum(rate(redis_keyspace_hits_total[5m])) + sum(rate(redis_keyspace_misses_total[5m])))
          ) < 0.6
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Redis cache hit rate below 60%"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"

      - alert: RedisMemoryHigh
        expr: (redis_used_memory_bytes / redis_memory_max_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "Redis memory usage above 90%"
          description: "Redis using {{ $value | humanizePercentage }} of available memory"

      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "Redis is down"
          description: "Redis instance {{ $labels.instance }} is unreachable"
```

#### Search Alerts

```yaml
# File: prometheus/alerts/search.yml
groups:
  - name: search
    interval: 30s
    rules:
      - alert: ElasticsearchClusterRed
        expr: elasticsearch_cluster_health_status == 2
        for: 1m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "Elasticsearch cluster status RED"
          description: "Cluster {{ $labels.cluster }} has unassigned primary shards"

      - alert: ElasticsearchHighQueryLatency
        expr: |
          (
            rate(elasticsearch_indices_search_query_time_seconds[5m])
            /
            rate(elasticsearch_indices_search_query_total[5m])
          ) > 0.2
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Elasticsearch query latency above 200ms"
          description: "Average query time is {{ $value }}s"
```

#### Workflow Alerts

```yaml
# File: prometheus/alerts/workflows.yml
groups:
  - name: workflows
    interval: 30s
    rules:
      - alert: TemporalWorkflowFailureRate
        expr: |
          (
            sum(rate(temporal_workflow_failures_total[5m]))
            /
            sum(rate(temporal_workflow_starts_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Temporal workflow failure rate above 5%"
          description: "{{ $value | humanizePercentage }} of workflows failing"

      - alert: TemporalActivityRetryHigh
        expr: rate(temporal_activity_retry_count[5m]) > 10
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High activity retry rate"
          description: "Activity {{ $labels.activity_type }} retrying {{ $value }}/s"
```

#### Kafka Alerts

```yaml
# File: prometheus/alerts/kafka.yml
groups:
  - name: kafka
    interval: 30s
    rules:
      - alert: KafkaConsumerLagHigh
        expr: kafka_consumergroup_lag > 10000
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Kafka consumer lag above 10,000 messages"
          description: "Consumer group {{ $labels.consumergroup }} has {{ $value }} lag on {{ $labels.topic }}"

      - alert: KafkaBrokerDown
        expr: kafka_brokers < 3
        for: 1m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "Kafka broker count below 3"
          description: "Only {{ $value }} brokers available"
```

### Alert Routing (AlertManager)

```yaml
# File: alertmanager/config.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/xxx'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  receiver: 'slack-default'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    # Critical alerts -> PagerDuty + Slack
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true
    - match:
        severity: critical
      receiver: 'slack-critical'

    # Warning alerts -> Slack only
    - match:
        severity: warning
      receiver: 'slack-warning'

receivers:
  - name: 'slack-default'
    slack_configs:
      - channel: '#alerts'
        title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}\n{{ end }}'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#incidents'
        title: ':rotating_light: [CRITICAL] {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}\nDashboard: {{ .Annotations.dashboard }}\n{{ end }}'
        send_resolved: true

  - name: 'slack-warning'
    slack_configs:
      - channel: '#alerts'
        title: ':warning: [WARNING] {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'xxx'
        description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
```

---

## 3. Dashboard Usage

### Pre-Built Dashboards

#### 1. System Overview Dashboard

**URL:** `/d/foodbot-overview`

**Panels:**
- Request Rate (req/s) - Time series
- Error Rate (%) - Time series
- p95 Latency (ms) - Time series
- Active Users - Gauge
- Success Rate - Stat panel
- Service Status - Table (Gateway API, MCP, PostgreSQL, Redis, Elasticsearch, Kafka)

**Use Case:** First dashboard to check during incidents.

#### 2. Gateway API Dashboard

**URL:** `/d/gateway-api`

**Panels:**
- HTTP Request Rate by Endpoint
- HTTP Latency (p50, p95, p99) by Endpoint
- Error Rate by Status Code
- JWT Validation Rate
- Database Connection Pool Usage
- Redis Cache Hit Rate
- Temporal Workflow Starts
- Kafka Message Publish Rate

**Use Case:** Debugging API performance issues.

#### 3. MCP Orchestrator Dashboard

**URL:** `/d/mcp-orchestrator`

**Panels:**
- Provider Call Rate (Swiggy, Zomato, Internal)
- Provider Latency Distribution
- Circuit Breaker States (gauges)
- Cache Hit Rate
- Elasticsearch Query Latency
- Kafka Consumer Lag

**Use Case:** Debugging search and provider integration issues.

#### 4. Database Dashboard

**URL:** `/d/postgres`

**Panels:**
- Active Connections
- Transaction Rate (commits, rollbacks)
- Cache Hit Ratio
- Query Duration (p50, p95, p99)
- Replication Lag
- Lock Wait Time
- Disk I/O
- Table Size Growth

**Use Case:** Debugging database performance.

#### 5. Kafka Dashboard

**URL:** `/d/kafka`

**Panels:**
- Topic Throughput (messages/s)
- Consumer Lag by Group
- Broker CPU/Memory
- Producer Send Rate
- Consumer Fetch Rate
- Under-Replicated Partitions

**Use Case:** Debugging event streaming issues.

### Creating Custom Dashboards

#### PromQL Query Examples

```promql
# API p95 latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{service="gateway-api"}[5m])) by (le, route)
)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
/
sum(rate(http_requests_total[5m])) by (service)

# Cache hit rate
sum(rate(redis_keyspace_hits_total[5m]))
/
(sum(rate(redis_keyspace_hits_total[5m])) + sum(rate(redis_keyspace_misses_total[5m])))

# Database connection pool usage
pg_stat_database_numbackends{datname="foodbot"}
/
pg_settings_max_connections

# Kafka consumer lag
kafka_consumergroup_lag{consumergroup="notification-consumers"}
```

---

## 4. Log Aggregation

### Structured Logging Format

All services use JSON structured logging:

```json
{
  "timestamp": "2026-02-19T10:30:45.123Z",
  "level": "info",
  "service": "gateway-api",
  "correlationId": "abc123",
  "userId": "user-456",
  "method": "POST",
  "path": "/orders",
  "duration": 320,
  "status": 201,
  "message": "Order created successfully"
}
```

### Log Levels

| Level | Usage |
|-------|-------|
| **ERROR** | Unhandled exceptions, critical failures |
| **WARN** | Recoverable errors, degraded performance |
| **INFO** | Business events (order placed, user registered) |
| **DEBUG** | Detailed diagnostics (disabled in production) |

### Loki Configuration

```yaml
# File: loki/config.yml
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
    - from: 2026-01-01
      store: boltdb-shipper
      object_store: s3
      schema: v11
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: s3
  aws:
    s3: s3://us-east-1/foodbot-logs
    s3forcepathstyle: true

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h  # 7 days

chunk_store_config:
  max_look_back_period: 744h  # 31 days

table_manager:
  retention_deletes_enabled: true
  retention_period: 744h  # 31 days
```

### LogQL Query Examples

```logql
# All errors in last hour
{service="gateway-api"} |= "level=error" | json

# Slow API requests (> 1s)
{service="gateway-api"} | json | duration > 1000

# Failed order placements
{service="gateway-api", path="/orders"} | json | status >= 400

# Errors by service
sum(count_over_time({level="error"}[1h])) by (service)

# p95 latency by endpoint
quantile_over_time(0.95, {service="gateway-api"} | json | unwrap duration [5m]) by (path)
```

### Promtail Configuration

```yaml
# File: promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: service
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
    pipeline_stages:
      - json:
          expressions:
            level: level
            timestamp: timestamp
            message: message
            correlationId: correlationId
      - timestamp:
          source: timestamp
          format: RFC3339
      - labels:
          level:
```

---

## 5. Tracing Setup

### Jaeger Configuration

```yaml
# File: jaeger/docker-compose.yml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:1.51
    environment:
      - COLLECTOR_ZIPKIN_HTTP_PORT=9411
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "5775:5775/udp"   # Zipkin compact thrift
      - "6831:6831/udp"   # Jaeger compact thrift
      - "6832:6832/udp"   # Jaeger binary thrift
      - "5778:5778"       # Serve frontend
      - "16686:16686"     # Jaeger UI
      - "14268:14268"     # Jaeger collector HTTP
      - "14250:14250"     # Jaeger gRPC
      - "9411:9411"       # Zipkin compatible endpoint
      - "4317:4317"       # OTLP gRPC
      - "4318:4318"       # OTLP HTTP
```

### OpenTelemetry Instrumentation

#### Gateway API (NestJS)

```typescript
// apps/gateway-api/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

const sdk = new NodeSDK({
  serviceName: 'gateway-api',
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

sdk.start();
```

#### MCP Orchestrator (Spring Boot)

```yaml
# application.yml
spring:
  application:
    name: mcp-orchestrator
  sleuth:
    sampler:
      probability: 1.0
  zipkin:
    base-url: http://jaeger:9411
```

### Trace Example

**Request:** `POST /orders`

```
Trace ID: abc123xyz789
Duration: 680ms

Span 1: POST /orders (Gateway API)
├─ Duration: 680ms
├─ Status: 200
└─ Spans:
    ├─ Span 2: JWT Validation (20ms)
    ├─ Span 3: Database Query - Get Cart Items (35ms)
    ├─ Span 4: Temporal Workflow Start (120ms)
    │   └─ Span 5: Activity - Validate Cart (45ms)
    │   └─ Span 6: Activity - Process Payment (280ms)  ← SLOW
    │       └─ Span 7: HTTP POST payment-gateway.com (265ms)
    │   └─ Span 8: Activity - Create Order (38ms)
    │   └─ Span 9: Activity - Send Notification (22ms)
    ├─ Span 10: Kafka Publish - order.created (12ms)
    └─ Span 11: Database Insert - Order (28ms)
```

**Analysis:** Payment gateway is the bottleneck (265ms). Consider async processing.

---

## 6. Health Checks

### Endpoint-Based Health Checks

#### Gateway API

```typescript
// apps/gateway-api/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.healthCheckService.check([
      () => this.typeOrmHealthIndicator.pingCheck('database'),
      () => this.redisHealthIndicator.pingCheck('redis'),
      async () => ({
        temporal: {
          status: await this.checkTemporal() ? 'up' : 'down',
        },
      }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    // Stricter health check for Kubernetes readiness probe
    return this.healthCheckService.check([
      () => this.typeOrmHealthIndicator.pingCheck('database', { timeout: 1000 }),
      () => this.redisHealthIndicator.pingCheck('redis', { timeout: 500 }),
    ]);
  }

  @Get('live')
  live() {
    // Simple liveness check
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "temporal": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "temporal": { "status": "up" }
  }
}
```

#### MCP Orchestrator

```java
// services/mcp-orchestrator/src/main/java/com/foodbot/mcp/health/HealthCheckController.java
@RestController
@RequestMapping("/mcp/v1/actuator/health")
public class HealthCheckController {

    @GetMapping
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(HealthResponse.builder()
            .status("UP")
            .providers(Map.of(
                "mock", providerHealth("mock"),
                "swiggy", providerHealth("swiggy"),
                "zomato", providerHealth("zomato")
            ))
            .elasticsearch(elasticsearchHealth())
            .redis(redisHealth())
            .build());
    }
}
```

### Kubernetes Probes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway-api
spec:
  template:
    spec:
      containers:
      - name: gateway-api
        image: foodbot/gateway-api:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        startupProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30
```

**Probe Types:**
- **Liveness:** Is the application running? If fails, restart pod.
- **Readiness:** Is the application ready to serve traffic? If fails, remove from load balancer.
- **Startup:** Has the application finished starting? Prevents premature liveness failures.

---

## Monitoring Stack Diagram

```
                    ┌──────────────────────────────┐
                    │  FoodBot Services            │
                    │  (Gateway, MCP, Workers)     │
                    └──────────┬───────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────────┐ ┌──────────┐ ┌────────────┐
        │  Prometheus  │ │  Promtail│ │  Jaeger    │
        │  (Metrics)   │ │  (Logs)  │ │  (Traces)  │
        └──────┬───────┘ └────┬─────┘ └──────┬─────┘
               │              │               │
               └──────────────┼───────────────┘
                              ▼
                    ┌──────────────────┐
                    │     Grafana      │
                    │  (Visualization) │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  AlertManager    │
                    │  (Alerting)      │
                    └──────┬───────────┘
                           │
                    ┌──────┴───────┐
                    │              │
                    ▼              ▼
            ┌──────────────┐ ┌─────────────┐
            │  PagerDuty   │ │    Slack    │
            └──────────────┘ └─────────────┘
```

---

**Questions?** Contact #observability-team on Slack or email observability@foodbot.com

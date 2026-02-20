# Infrastructure Requirements - FoodBot

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2026-02-20

---

## Table of Contents

- [1. Compute Requirements](#1-compute-requirements)
- [2. Database Requirements](#2-database-requirements)
- [3. Caching & Session Management](#3-caching--session-management)
- [4. Search Infrastructure](#4-search-infrastructure)
- [5. Event Streaming](#5-event-streaming)
- [6. Workflow Orchestration](#6-workflow-orchestration)
- [7. Networking & Load Balancing](#7-networking--load-balancing)
- [8. Storage Requirements](#8-storage-requirements)
- [9. Monitoring & Observability](#9-monitoring--observability)
- [10. Security Requirements](#10-security-requirements)

---

## 1. Compute Requirements

### 1.1 Kubernetes Cluster

**Development Environment:**
- Kubernetes version: 1.27+
- Node count: 3 minimum
- Node size: 4 vCPU, 16 GB RAM per node
- Local development: Docker Desktop or Minikube

**Production Environment:**
- Kubernetes version: 1.27+
- Node count: 12 minimum (6 for apps, 6 for data)
- Node size: 16 vCPU, 64 GB RAM per node
- Multi-AZ deployment for high availability
- Auto-scaling enabled (min: 12, max: 50 nodes)

**Node Pools:**
```yaml
app-nodes:
  min_replicas: 3
  max_replicas: 20
  instance_type: c5.4xlarge
  labels:
    workload-type: application

data-nodes:
  min_replicas: 3
  max_replicas: 10
  instance_type: r5.2xlarge
  labels:
    workload-type: database

workflow-nodes:
  min_replicas: 2
  max_replicas: 8
  instance_type: c5.2xlarge
  labels:
    workload-type: workflows
```

### 1.2 Container Resources

**Gateway API:**
```yaml
requests:
  cpu: 500m
  memory: 512Mi
limits:
  cpu: 1000m
  memory: 1Gi
replicas:
  min: 3
  max: 20
```

**Search Orchestrator (MCP):**
```yaml
requests:
  cpu: 1000m
  memory: 1Gi
limits:
  cpu: 2000m
  memory: 2Gi
replicas:
  min: 2
  max: 8
```

**Temporal Workers:**
```yaml
requests:
  cpu: 500m
  memory: 512Mi
limits:
  cpu: 1000m
  memory: 1Gi
replicas:
  min: 2
  max: 10
```

**Notification Service:**
```yaml
requests:
  cpu: 250m
  memory: 256Mi
limits:
  cpu: 500m
  memory: 512Mi
replicas:
  min: 2
  max: 6
```

**Frontend Applications:**
```yaml
requests:
  cpu: 100m
  memory: 128Mi
limits:
  cpu: 200m
  memory: 256Mi
replicas:
  min: 3
  max: 10
```

---

## 2. Database Requirements

### 2.1 PostgreSQL - Application Database

**Development:**
- Docker container: postgres:16-alpine
- Port: 5433
- Storage: 20 GB volume

**Production (AWS RDS):**
```yaml
engine: PostgreSQL 16.1
instance_class: db.r6g.2xlarge
specifications:
  vcpu: 8
  memory: 64 GB
  storage: 500 GB GP3 SSD
  iops: 12000
  throughput: 500 MB/s
high_availability:
  multi_az: true
  read_replicas: 2
  automatic_failover: enabled
backup:
  retention_period: 30 days
  backup_window: "03:00-04:00 UTC"
  point_in_time_recovery: enabled
performance:
  performance_insights: enabled
  enhanced_monitoring: enabled
  slow_query_log: enabled
encryption:
  at_rest: true
  in_transit: true
  kms_key: custom
```

**Connection Pooling:**
```yaml
pool_size: 20
connection_timeout: 10000ms
idle_timeout: 30000ms
max_lifetime: 1800000ms
```

**Required Extensions:**
- uuid-ossp (UUID generation)
- pg_trgm (Full-text search)
- postgis (Geo-spatial queries)

### 2.2 PostgreSQL - Temporal Database

**Production (AWS RDS):**
```yaml
engine: PostgreSQL 15.4
instance_class: db.r6g.xlarge
specifications:
  vcpu: 4
  memory: 32 GB
  storage: 200 GB GP3 SSD
high_availability:
  multi_az: true
  automatic_failover: enabled
backup:
  retention_period: 30 days
```

---

## 3. Caching & Session Management

### 3.1 Redis Requirements

**Development:**
- Docker container: redis:7-alpine
- Port: 6379
- Password protected
- AOF persistence enabled

**Production (AWS ElastiCache):**
```yaml
engine: Redis 7.0
node_type: cache.r7g.xlarge
specifications:
  vcpu: 4
  memory: 26 GB
  network_performance: Up to 10 Gbps
cluster_configuration:
  num_cache_clusters: 3
  multi_az: true
  automatic_failover: enabled
security:
  encryption_at_rest: true
  encryption_in_transit: true
  auth_token_enabled: true
backup:
  snapshot_retention: 7 days
  snapshot_window: "02:00-03:00 UTC"
```

**Use Cases:**
- Session storage (TTL: 24 hours)
- API response caching (TTL: 5-60 minutes)
- Rate limiting counters
- Real-time leaderboards
- Pub/Sub for notifications

**Memory Allocation:**
```yaml
sessions: 40%
api_cache: 30%
rate_limiting: 10%
leaderboards: 10%
pubsub: 10%
```

---

## 4. Search Infrastructure

### 4.1 Elasticsearch Requirements

**Development:**
- Docker container: elasticsearch:8.11.3
- Ports: 9200 (HTTP), 9300 (Transport)
- Single node cluster
- Memory: 2 GB

**Production (AWS OpenSearch):**
```yaml
engine: OpenSearch 2.11
cluster_configuration:
  data_nodes:
    instance_type: r6g.xlarge.search
    instance_count: 3
    ebs_volume_size: 500 GB
    ebs_volume_type: gp3
  master_nodes:
    instance_type: r6g.large.search
    instance_count: 3
    dedicated: true
  availability_zones: 3
security:
  encryption_at_rest: true
  node_to_node_encryption: true
  enforce_https: true
  fine_grained_access_control: enabled
backup:
  automated_snapshot_hour: 1
```

**Indices:**
```yaml
restaurants:
  shards: 6
  replicas: 2
  mappings:
    - location: geo_point
    - name: text (analyzed)
    - cuisine: keyword
    - rating: float
    - price_range: integer
    - operating_hours: nested

dishes:
  shards: 6
  replicas: 2
  mappings:
    - name: text (analyzed)
    - description: text (analyzed)
    - category: keyword
    - dietary_tags: keyword
    - price: float
    - restaurant_id: keyword
```

**Performance Requirements:**
- Search latency: p95 < 100ms
- Indexing latency: p95 < 50ms
- Query throughput: 1000 queries/second

---

## 5. Event Streaming

### 5.1 Apache Kafka Requirements

**Development:**
- Docker containers: Zookeeper + Kafka
- Kafka port: 9092 (internal), 29092 (external)
- Schema Registry: port 8083

**Production (AWS MSK):**
```yaml
kafka_version: 3.5.1
cluster_configuration:
  broker_nodes:
    instance_type: kafka.m5.2xlarge
    instance_count: 6
    storage_per_broker: 1000 GB EBS
    ebs_volume_type: gp3
  multi_az: true
  availability_zones: 3
security:
  encryption_at_rest: true
  encryption_in_transit: TLS
  authentication: SASL/SCRAM
monitoring:
  prometheus_jmx_exporter: enabled
  cloudwatch_logs: enabled
```

**Topic Configuration:**
```yaml
restaurant.created:
  partitions: 6
  replication_factor: 3
  retention_ms: 604800000  # 7 days
  compression_type: lz4

restaurant.updated:
  partitions: 6
  replication_factor: 3
  retention_ms: 604800000

order.created:
  partitions: 12
  replication_factor: 3
  retention_ms: 2592000000  # 30 days
  compression_type: lz4

order.status.changed:
  partitions: 12
  replication_factor: 3
  retention_ms: 2592000000

payment.completed:
  partitions: 12
  replication_factor: 3
  retention_ms: 7776000000  # 90 days

payment.failed:
  partitions: 6
  replication_factor: 3
  retention_ms: 2592000000

dish.created:
  partitions: 6
  replication_factor: 3
  retention_ms: 604800000

dish.updated:
  partitions: 6
  replication_factor: 3
  retention_ms: 604800000

user.registered:
  partitions: 6
  replication_factor: 3
  retention_ms: 2592000000

foodbot.dlq:
  partitions: 3
  replication_factor: 3
  retention_ms: 2592000000
```

**Performance Requirements:**
- Producer throughput: 10,000 messages/second
- Consumer lag: < 1000 messages
- End-to-end latency: p99 < 500ms

---

## 6. Workflow Orchestration

### 6.1 Temporal Server Requirements

**Development:**
- Docker container: temporalio/auto-setup:1.22.4
- Ports: 7233 (gRPC), 7234 (HTTP), 7235 (metrics)
- UI: temporalio/ui:2.21.3 on port 8080

**Production:**
```yaml
deployment:
  replicas: 3
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
database:
  engine: PostgreSQL
  connection_pool: 100
  max_conns_per_host: 20
persistence:
  default_store: primary
  visibility_store: visibility
  num_history_shards: 512
services:
  frontend:
    replicas: 3
    rps: 2000
  history:
    replicas: 6
    rps: 5000
  matching:
    replicas: 3
    rps: 2000
  worker:
    replicas: 2
```

**Task Queues:**
```yaml
foodbot-main-queue:
  workers: 10
  concurrent_tasks: 50

foodbot-payment-queue:
  workers: 5
  concurrent_tasks: 20

foodbot-notification-queue:
  workers: 5
  concurrent_tasks: 30

foodbot-analytics-queue:
  workers: 3
  concurrent_tasks: 10
```

---

## 7. Networking & Load Balancing

### 7.1 Load Balancer Requirements

**Development:**
- Nginx container
- Round-robin load balancing
- Basic SSL termination

**Production (AWS ALB):**
```yaml
load_balancer_type: application
scheme: internet-facing
ip_address_type: ipv4
subnets: 3 (multi-AZ)
security_groups:
  - alb-sg
target_groups:
  gateway-api:
    protocol: HTTP
    port: 3000
    health_check:
      path: /health
      interval: 30s
      timeout: 5s
      healthy_threshold: 2
      unhealthy_threshold: 3
  customer-app:
    protocol: HTTP
    port: 80
    health_check:
      path: /
      interval: 30s
  restaurant-app:
    protocol: HTTP
    port: 80
    health_check:
      path: /
      interval: 30s
```

### 7.2 Nginx Configuration (Kubernetes Ingress)

```yaml
rate_limiting:
  api_endpoints: 10 req/s per IP
  auth_endpoints: 5 req/m per IP
  general: 100 req/s per IP

compression:
  gzip: enabled
  level: 6
  types: text/*, application/json, application/javascript

caching:
  api_cache:
    zone_size: 10m
    max_size: 1g
    inactive: 60m
  static_cache:
    zone_size: 10m
    max_size: 2g
    inactive: 7d

ssl_tls:
  protocols: TLSv1.2 TLSv1.3
  ciphers: HIGH:!aNULL:!MD5
  prefer_server_ciphers: on
  session_timeout: 10m

security_headers:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: "1; mode=block"
  - Strict-Transport-Security: max-age=31536000
  - Content-Security-Policy: default-src 'self'
```

### 7.3 Network Policies

```yaml
default_policy: deny_all
allowed_ingress:
  - frontend_to_gateway_api
  - gateway_api_to_postgres
  - gateway_api_to_redis
  - gateway_api_to_temporal
  - gateway_api_to_kafka
  - mcp_to_elasticsearch
  - mcp_to_redis
  - mcp_to_kafka
  - notification_service_to_kafka
  - temporal_workers_to_temporal
allowed_egress:
  - gateway_api_to_external_apis
  - notification_service_to_sendgrid
  - payment_service_to_stripe
```

---

## 8. Storage Requirements

### 8.1 Persistent Volumes

**PostgreSQL (Application):**
```yaml
storage_class: gp3
size: 500Gi
iops: 12000
throughput: 500MB/s
backup: daily snapshots
```

**PostgreSQL (Temporal):**
```yaml
storage_class: gp3
size: 200Gi
iops: 6000
throughput: 250MB/s
backup: daily snapshots
```

**Redis:**
```yaml
storage_class: gp3
size: 50Gi
persistence: AOF + RDB
```

**Elasticsearch:**
```yaml
storage_class: gp3
size: 500Gi per node
iops: 6000
throughput: 250MB/s
```

**Kafka:**
```yaml
storage_class: gp3
size: 1000Gi per broker
iops: 12000
throughput: 500MB/s
retention: 7-90 days per topic
```

### 8.2 Object Storage (AWS S3)

```yaml
buckets:
  foodbot-backups:
    versioning: enabled
    lifecycle:
      - transition_to_ia: 30 days
      - transition_to_glacier: 90 days
      - expiration: 365 days
    encryption: AES-256

  foodbot-static-assets:
    versioning: disabled
    cdn: CloudFront
    cache_control: max-age=31536000
    encryption: AES-256

  foodbot-logs:
    versioning: disabled
    lifecycle:
      - transition_to_ia: 7 days
      - expiration: 30 days
    encryption: AES-256
```

---

## 9. Monitoring & Observability

### 9.1 Metrics Collection (Prometheus)

**Scrape Configuration:**
```yaml
scrape_interval: 15s
evaluation_interval: 15s
retention: 30d

targets:
  - gateway_api_instances
  - mcp_orchestrator_instances
  - temporal_server
  - temporal_workers
  - notification_service
  - postgres_exporter
  - redis_exporter
  - kafka_exporter
  - elasticsearch_exporter
  - node_exporter
  - nginx_exporter
```

**Alert Rules:**
```yaml
alerts:
  high_error_rate:
    threshold: 5%
    duration: 5m
  high_response_time:
    threshold: 500ms (p95)
    duration: 5m
  service_down:
    duration: 2m
  high_cpu_usage:
    threshold: 80%
    duration: 10m
  high_memory_usage:
    threshold: 85%
    duration: 10m
  database_connection_pool_exhausted:
    threshold: 80%
  redis_high_memory:
    threshold: 85%
  kafka_consumer_lag:
    threshold: 1000 messages
  elasticsearch_cluster_unhealthy:
    condition: status != green
```

### 9.2 Logging (ELK Stack)

```yaml
log_aggregation:
  - application_logs (stdout/stderr)
  - access_logs (nginx)
  - audit_logs (database)
  - error_logs (all services)

log_retention:
  hot_storage: 7 days (Elasticsearch)
  warm_storage: 30 days (S3)
  cold_storage: 90 days (S3 Glacier)

log_format: JSON
log_level:
  development: debug
  staging: info
  production: warn
```

### 9.3 Distributed Tracing (Jaeger)

```yaml
sampling_rate:
  development: 1.0 (100%)
  staging: 0.5 (50%)
  production: 0.1 (10%)

trace_retention: 7 days
backends:
  - Elasticsearch
  - S3 (long-term storage)
```

### 9.4 Dashboards (Grafana)

**Pre-configured Dashboards:**
- Service Health Overview
- API Performance Metrics
- Database Performance
- Cache Hit Rates
- Kafka Consumer Lag
- Kubernetes Cluster Overview
- Resource Utilization
- Error Rate Trends
- Business Metrics (Orders, Revenue)

---

## 10. Security Requirements

### 10.1 TLS/SSL Certificates

```yaml
certificate_manager: AWS Certificate Manager
domains:
  - api.foodbot.com
  - app.foodbot.com
  - restaurant.foodbot.com
  - admin.foodbot.com
auto_renewal: enabled
validation: DNS
```

### 10.2 Secrets Management

```yaml
secrets_manager: Kubernetes Secrets + AWS Secrets Manager
encryption: KMS (AES-256)
rotation: automatic (90 days)
access_control: RBAC + IAM policies
audit_logging: enabled
```

### 10.3 Network Security

```yaml
vpc_configuration:
  cidr: 10.0.0.0/16
  public_subnets: 3 (multi-AZ)
  private_subnets: 3 (multi-AZ)
  nat_gateways: 3 (one per AZ)

security_groups:
  - alb_sg (80, 443 from internet)
  - app_sg (3000, 8081 from ALB)
  - data_sg (5432, 6379, 9200, 9092 from app_sg)
  - bastion_sg (22 from corporate IPs)

network_acls:
  - deny_known_malicious_ips
  - rate_limit_per_subnet
```

### 10.4 IAM & RBAC

**Kubernetes RBAC:**
```yaml
service_accounts:
  - gateway-api-sa
  - mcp-orchestrator-sa
  - temporal-worker-sa
  - notification-service-sa

roles:
  - read_configmaps_secrets
  - list_pods
  - create_jobs

role_bindings:
  - bind each service account to appropriate roles
```

**AWS IAM Policies:**
```yaml
policies:
  - s3_read_write (backups, static assets)
  - rds_connect
  - elasticache_access
  - msk_produce_consume
  - opensearch_crud
  - secretsmanager_read
  - cloudwatch_put_metrics
```

---

## Performance Targets

### Application Performance

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 500ms |
| API Response Time (p99) | < 1000ms |
| Search Latency (p95) | < 100ms |
| Database Query Time (p95) | < 50ms |
| Cache Hit Rate | > 80% |
| Error Rate | < 1% |
| Uptime | 99.9% |

### Infrastructure Performance

| Metric | Target |
|--------|--------|
| Node CPU Utilization | 50-70% |
| Node Memory Utilization | 60-80% |
| Disk I/O Latency | < 10ms |
| Network Latency (inter-service) | < 5ms |
| Pod Startup Time | < 30s |
| Container Image Pull Time | < 60s |

---

## Disaster Recovery

### Recovery Objectives

```yaml
RPO (Recovery Point Objective):
  - PostgreSQL: 1 hour
  - Redis: 1 second (AOF)
  - Elasticsearch: 24 hours
  - Kafka: 0 (replicated)

RTO (Recovery Time Objective):
  - PostgreSQL: 15 minutes
  - Redis: 5 minutes
  - Elasticsearch: 30 minutes
  - Kafka: 5 minutes
  - Application services: 10 minutes
```

### Backup Strategy

```yaml
automated_backups:
  postgresql:
    frequency: daily
    retention: 30 days
    point_in_time_recovery: enabled
  redis:
    frequency: hourly (RDB)
    retention: 7 days
  elasticsearch:
    frequency: daily
    retention: 30 days
  kafka:
    strategy: multi-region replication

manual_backups:
  before_major_deployments: required
  before_schema_changes: required
```

---

## Cost Optimization

### Reserved Instances

```yaml
ec2_instances:
  percentage: 70%
  term: 3 years
  payment: all upfront
  savings: ~60%

rds_instances:
  percentage: 100%
  term: 1 year
  payment: partial upfront
  savings: ~40%
```

### Spot Instances

```yaml
workloads:
  - temporal-workers (non-critical)
  - batch-jobs
  - CI/CD pipelines
percentage: 30%
savings: ~70%
```

### Auto-Scaling Policies

```yaml
scale_up:
  cpu_threshold: 70%
  memory_threshold: 80%
  custom_metric: request_rate > 100 req/s
  cooldown: 3 minutes

scale_down:
  cpu_threshold: 30%
  memory_threshold: 40%
  custom_metric: request_rate < 20 req/s
  cooldown: 10 minutes
  min_replicas: always maintain minimum
```

---

## Compliance & Governance

### Data Residency

```yaml
primary_region: us-east-1
backup_region: us-west-2
data_sovereignty: US only
cross_region_replication: enabled for DR
```

### Compliance Requirements

```yaml
standards:
  - SOC 2 Type II
  - PCI DSS (for payment data)
  - GDPR (for EU users)
  - HIPAA (if health-related data)

audit_logging:
  - all database access
  - all API requests with PII
  - all admin actions
  - all authentication events
retention: 7 years
```

---

**Document Maintainer:** DevOps Team
**Review Schedule:** Quarterly
**Next Review Date:** 2026-05-20

# FoodBot Production Runbook

**Version:** 1.0.0
**Last Updated:** 2026-02-19
**Target Audience:** Operations Team, SREs, On-Call Engineers

---

## Table of Contents

- [1. Service Architecture Overview](#1-service-architecture-overview)
- [2. Monitoring Dashboards](#2-monitoring-dashboards)
- [3. Common Issues and Fixes](#3-common-issues-and-fixes)
- [4. Scaling Procedures](#4-scaling-procedures)
- [5. Backup and Restore](#5-backup-and-restore)
- [6. Incident Response](#6-incident-response)
- [7. On-Call Procedures](#7-on-call-procedures)

---

## 1. Service Architecture Overview

### Production Services

| Service | Purpose | Technology | Port | Replicas | CPU | Memory |
|---------|---------|------------|------|----------|-----|--------|
| **Gateway API** | REST API gateway, JWT auth | NestJS/TypeScript | 3000 | 3-20 | 500m-1000m | 512Mi-1Gi |
| **MCP Orchestrator** | Multi-provider search aggregation | Spring Boot/Java | 8081 | 2-10 | 1000m-2000m | 1Gi-2Gi |
| **MCP Adapter** | Provider integration adapter | TypeScript/Express | 3003 | 2-8 | 500m-1000m | 512Mi-1Gi |
| **Search Orchestrator** | Multi-source search coordination | TypeScript/Express | 3002 | 2-8 | 500m-1000m | 512Mi-1Gi |
| **Notification Service** | Multi-channel notifications | TypeScript | 3005 | 2-6 | 250m-500m | 256Mi-512Mi |
| **Temporal Workers** | Workflow execution | TypeScript | N/A | 2-8 | 500m-1000m | 512Mi-1Gi |
| **Customer App** | Customer frontend | React/Redux | 3001 | 2-6 (NGINX) | 100m-200m | 128Mi-256Mi |
| **Restaurant App** | Restaurant owner dashboard | React/Zustand | 3002 | 2-4 (NGINX) | 100m-200m | 128Mi-256Mi |

### Infrastructure Services

| Service | Purpose | Technology | Port | Storage | CPU | Memory |
|---------|---------|------------|------|---------|-----|--------|
| **PostgreSQL (App)** | Application database | PostgreSQL 16 | 5433 | 100Gi SSD | 2000m | 4Gi |
| **PostgreSQL (Temporal)** | Workflow database | PostgreSQL 15 | 5432 | 50Gi SSD | 1000m | 2Gi |
| **Redis** | Cache, sessions, rate limiting | Redis 7 | 6379 | 10Gi SSD | 500m | 1Gi |
| **Elasticsearch** | Full-text and geo search | Elasticsearch 8.11 | 9200 | 200Gi SSD | 2000m | 4Gi |
| **Kafka** | Event streaming | Confluent 7.5 | 9092 | 100Gi SSD | 1000m | 2Gi |
| **Zookeeper** | Kafka coordination | Confluent 7.5 | 2181 | 10Gi SSD | 500m | 1Gi |
| **Temporal Server** | Workflow orchestration | Temporal 1.22 | 7233 | N/A | 1000m | 2Gi |

### Service Dependencies

```
Internet → Load Balancer → Ingress Controller
                              |
                +--------------+----------------+
                |                               |
        Gateway API (3000)           Customer/Restaurant Apps (80)
                |
    +-----------+-----------+
    |           |           |
PostgreSQL   Redis    Temporal Server
   (App)                    |
                       Temporal Workers
                            |
    +-----------------------+------------------------+
    |           |           |            |           |
  MCP      Search     Notification   Kafka      Elasticsearch
Orchestrator Orchestrator  Service
    |
Elasticsearch + Redis + Kafka
```

---

## 2. Monitoring Dashboards

### Grafana Dashboard URLs

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| **System Overview** | `/d/foodbot-overview` | High-level health, request rates, error rates |
| **Gateway API** | `/d/gateway-api` | API latency, throughput, error breakdown |
| **MCP Orchestrator** | `/d/mcp-orchestrator` | Provider status, circuit breakers, cache hits |
| **Search Performance** | `/d/search-perf` | Search latency by source, aggregation time |
| **Workflows** | `/d/temporal-workflows` | Workflow completion, failures, compensation |
| **Database** | `/d/postgres` | Connection pool, query performance, replication lag |
| **Kafka** | `/d/kafka` | Consumer lag, throughput, partition health |
| **Infrastructure** | `/d/infra` | Node CPU/memory, disk I/O, network traffic |

### Key Metrics to Watch

#### Application Health

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| `http_request_duration_p95` | > 500ms for 5min | WARNING |
| `http_request_duration_p99` | > 1000ms for 5min | WARNING |
| `http_error_rate` | > 5% for 2min | CRITICAL |
| `http_5xx_errors` | > 10/min | CRITICAL |
| `jwt_validation_failures` | > 20/min | WARNING |

#### Search Performance

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| `search_duration_p95` | > 500ms | WARNING |
| `elasticsearch_response_time_p95` | > 200ms | WARNING |
| `mcp_adapter_timeout_rate` | > 10% | WARNING |
| `cache_hit_rate` | < 60% | INFO |

#### Workflow Health

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| `temporal_workflow_failures` | > 5% | CRITICAL |
| `temporal_workflow_timeout` | > 0 | CRITICAL |
| `temporal_activity_retry_rate` | > 20% | WARNING |

#### Infrastructure

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| `postgres_connection_pool_usage` | > 80% | WARNING |
| `postgres_replication_lag` | > 10s | CRITICAL |
| `redis_memory_usage` | > 85% | WARNING |
| `elasticsearch_cluster_status` | != GREEN | CRITICAL |
| `kafka_consumer_lag` | > 10000 messages | WARNING |
| `disk_usage` | > 85% | WARNING |
| `memory_usage` | > 90% | WARNING |
| `cpu_usage` | > 80% for 10min | WARNING |

### Temporal UI

- **URL:** `https://temporal.foodbot.com` (production)
- **Purpose:** Monitor workflow execution, inspect failures, manually complete signals
- **Key Views:**
  - Workflows: List all running/completed/failed workflows
  - Task Queues: Monitor worker health and task backlog
  - Schedules: View scheduled workflows (user onboarding)

---

## 3. Common Issues and Fixes

### Issue: High API Latency (p95 > 500ms)

**Symptoms:**
- Gateway API response times increasing
- Customer complaints about slow page loads
- Prometheus alert: `APILatencyHigh`

**Diagnosis:**
```bash
# Check Gateway API logs for slow queries
kubectl logs -n foodbot-apps deployment/gateway-api --tail=100 | grep "duration.*[5-9][0-9][0-9]ms"

# Check database query performance
kubectl exec -n foodbot-data sts/postgres-app -- psql -U postgres -d foodbot -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis latency
kubectl exec -n foodbot-data sts/redis -- redis-cli --latency-history
```

**Root Causes:**
1. Missing database indexes
2. N+1 query problems
3. Redis cache misses
4. Slow Elasticsearch queries

**Fix:**
```bash
# Scale up Gateway API replicas
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=6

# Add missing indexes (example)
kubectl exec -n foodbot-data sts/postgres-app -- psql -U postgres -d foodbot -c "CREATE INDEX CONCURRENTLY idx_orders_user_status ON orders(user_id, status);"

# Warm up Redis cache
curl -X POST https://api.foodbot.com/admin/cache/warmup

# Check Elasticsearch shard allocation
curl -X GET "https://elasticsearch.foodbot.com/_cat/shards?v"
```

---

### Issue: Circuit Breaker Open on Swiggy Provider

**Symptoms:**
- Swiggy search results missing
- MCP Orchestrator logs: `CircuitBreakerOpenException`
- Prometheus metric: `resilience4j_circuitbreaker_state{name="swiggy"} == 1`

**Diagnosis:**
```bash
# Check MCP Orchestrator logs
kubectl logs -n foodbot-services deployment/mcp-orchestrator --tail=100 | grep "Swiggy"

# Check circuit breaker metrics
curl https://mcp.foodbot.com/actuator/metrics/resilience4j.circuitbreaker.calls

# Test Swiggy provider directly
curl -X GET "https://mcp.foodbot.com/mcp/v1/search?query=pizza&provider=swiggy"
```

**Root Causes:**
1. Swiggy API rate limit exceeded
2. Swiggy API timeout (> 2000ms)
3. Swiggy API returning 5xx errors
4. Network connectivity issues

**Fix:**
```bash
# Manually close circuit breaker (emergency only)
curl -X POST https://mcp.foodbot.com/actuator/circuitbreaker/swiggy/transition -d "CLOSED"

# Increase timeout threshold (requires config change + restart)
kubectl set env -n foodbot-services deployment/mcp-orchestrator SWIGGY_TIMEOUT_MS=5000
kubectl rollout restart -n foodbot-services deployment/mcp-orchestrator

# Fallback: Disable Swiggy provider temporarily
kubectl set env -n foodbot-services deployment/mcp-orchestrator SWIGGY_ENABLED=false
```

---

### Issue: Kafka Consumer Lag Growing

**Symptoms:**
- Notification delays (users not receiving order updates)
- Elasticsearch index stale (search results outdated)
- Prometheus alert: `KafkaConsumerLagHigh`

**Diagnosis:**
```bash
# Check consumer lag
kubectl exec -n foodbot-data pod/kafka-0 -- kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group notification-consumers

# Check Notification Service logs
kubectl logs -n foodbot-services deployment/notification-service --tail=100

# Check Kafka broker health
kubectl exec -n foodbot-data pod/kafka-0 -- kafka-broker-api-versions --bootstrap-server localhost:9092
```

**Root Causes:**
1. Consumer service crashed or restarting
2. Message processing too slow
3. Kafka broker performance issues
4. Topic partition count insufficient

**Fix:**
```bash
# Scale up Notification Service consumers
kubectl scale -n foodbot-services deployment/notification-service --replicas=4

# Reset consumer offset to latest (emergency only - loses messages)
kubectl exec -n foodbot-data pod/kafka-0 -- kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group notification-consumers \
  --topic order.status.changed \
  --reset-offsets --to-latest --execute

# Increase topic partitions (allows more parallel consumers)
kubectl exec -n foodbot-data pod/kafka-0 -- kafka-topics \
  --bootstrap-server localhost:9092 \
  --alter --topic order.status.changed --partitions 24
```

---

### Issue: PostgreSQL Connection Pool Exhausted

**Symptoms:**
- Gateway API errors: `ConnectionTimeoutException`
- Prometheus alert: `PostgresConnectionPoolHigh`
- API requests hanging or timing out

**Diagnosis:**
```bash
# Check active connections
kubectl exec -n foodbot-data sts/postgres-app -- psql -U postgres -d foodbot -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check long-running queries
kubectl exec -n foodbot-data sts/postgres-app -- psql -U postgres -d foodbot -c "SELECT pid, now() - query_start AS duration, state, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"

# Check connection pool config
kubectl get configmap -n foodbot-apps gateway-api-config -o yaml | grep DB_POOL_SIZE
```

**Root Causes:**
1. Connection leaks (queries not releasing connections)
2. Pool size too small for load
3. Long-running queries blocking pool
4. Database performance degradation

**Fix:**
```bash
# Kill long-running query (emergency only)
kubectl exec -n foodbot-data sts/postgres-app -- psql -U postgres -d foodbot -c "SELECT pg_terminate_backend(<PID>);"

# Increase connection pool size
kubectl set env -n foodbot-apps deployment/gateway-api DB_POOL_SIZE=20
kubectl rollout restart -n foodbot-apps deployment/gateway-api

# Scale database vertically (requires maintenance window)
kubectl scale -n foodbot-data sts/postgres-app --replicas=0
# Resize PVC, then scale back up
kubectl scale -n foodbot-data sts/postgres-app --replicas=1
```

---

### Issue: Elasticsearch Cluster Status RED

**Symptoms:**
- Search returning 503 errors
- Prometheus alert: `ElasticsearchClusterRed`
- Kibana inaccessible

**Diagnosis:**
```bash
# Check cluster health
curl -X GET "https://elasticsearch.foodbot.com/_cluster/health?pretty"

# Check unassigned shards
curl -X GET "https://elasticsearch.foodbot.com/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason"

# Check disk space
kubectl exec -n foodbot-data sts/elasticsearch-0 -- df -h /usr/share/elasticsearch/data
```

**Root Causes:**
1. Unassigned primary shards (data loss)
2. Disk space full (> 95%)
3. Node failure
4. Shard allocation disabled

**Fix:**
```bash
# Enable shard allocation (if disabled)
curl -X PUT "https://elasticsearch.foodbot.com/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster.routing.allocation.enable": "all"
  }
}'

# Increase disk watermark threshold (temporary)
curl -X PUT "https://elasticsearch.foodbot.com/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.disk.watermark.low": "95%",
    "cluster.routing.allocation.disk.watermark.high": "97%"
  }
}'

# Delete old indices to free space
curl -X DELETE "https://elasticsearch.foodbot.com/.monitoring-*,foodbot_logs_2025*"

# Scale Elasticsearch cluster horizontally
kubectl scale -n foodbot-data sts/elasticsearch --replicas=5
```

---

### Issue: Temporal Workflow Stuck

**Symptoms:**
- Order not progressing to next status
- Customer reports "order stuck in pending"
- Temporal UI shows workflow "Running" for > 30 minutes

**Diagnosis:**
1. Navigate to Temporal UI: `https://temporal.foodbot.com`
2. Search for workflow by Order ID: `order-fulfillment-{orderId}`
3. Check "History" tab for last event
4. Check "Pending Activities" for stuck activities

**Root Causes:**
1. Activity timeout exceeded
2. Worker crashed or not running
3. External API dependency down (payment gateway)
4. Signal not sent (order confirmation)

**Fix:**
```bash
# Check Temporal Workers are running
kubectl get pods -n foodbot-workflows -l app=temporal-workers

# Scale up workers
kubectl scale -n foodbot-workflows deployment/temporal-workers --replicas=4

# Manually send signal (if waiting for signal)
curl -X POST https://temporal.foodbot.com/api/v1/namespaces/default/workflows/{workflow_id}/signal \
  -H "Content-Type: application/json" \
  -d '{"signal": "orderConfirmed"}'

# Cancel stuck workflow (emergency only - requires manual cleanup)
tctl workflow terminate -w order-fulfillment-{orderId}
```

---

### Issue: Redis Memory Usage High (> 90%)

**Symptoms:**
- Prometheus alert: `RedisMemoryHigh`
- Eviction policy kicking in (cache misses increasing)
- Slow cache operations

**Diagnosis:**
```bash
# Check memory usage
kubectl exec -n foodbot-data sts/redis-0 -- redis-cli INFO memory

# Check key count by pattern
kubectl exec -n foodbot-data sts/redis-0 -- redis-cli --scan --pattern "search:*" | wc -l

# Check largest keys
kubectl exec -n foodbot-data sts/redis-0 -- redis-cli --bigkeys
```

**Root Causes:**
1. Cache TTL too long
2. Large cache values
3. Memory leak in application
4. Redis needs more memory

**Fix:**
```bash
# Flush specific key pattern (emergency only)
kubectl exec -n foodbot-data sts/redis-0 -- redis-cli --scan --pattern "search:*" | xargs redis-cli DEL

# Reduce cache TTL (requires config change)
kubectl set env -n foodbot-apps deployment/gateway-api CACHE_TTL_SECONDS=180

# Scale Redis vertically
kubectl patch -n foodbot-data sts/redis -p '{"spec":{"template":{"spec":{"containers":[{"name":"redis","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

# Add Redis read replicas (horizontal scaling)
kubectl scale -n foodbot-data sts/redis --replicas=3
```

---

## 4. Scaling Procedures

### Horizontal Pod Autoscaling (HPA)

All application services have HPA configured. Manual scaling overrides HPA.

#### Scale Gateway API

```bash
# View current replicas
kubectl get hpa -n foodbot-apps gateway-api-hpa

# Manually scale (HPA will override after metrics stabilize)
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=10

# Adjust HPA targets
kubectl patch hpa -n foodbot-apps gateway-api-hpa --patch '{"spec":{"maxReplicas":30}}'
```

#### Scale MCP Orchestrator

```bash
# Java app scales differently (higher resource needs)
kubectl scale -n foodbot-services deployment/mcp-orchestrator --replicas=5
```

#### Scale Temporal Workers

```bash
# More workers = more concurrent workflow/activity executions
kubectl scale -n foodbot-workflows deployment/temporal-workers --replicas=8

# Adjust worker concurrency limits (requires restart)
kubectl set env -n foodbot-workflows deployment/temporal-workers \
  WORKER_MAX_CONCURRENT_ACTIVITIES=200 \
  WORKER_MAX_CONCURRENT_WORKFLOWS=100
kubectl rollout restart -n foodbot-workflows deployment/temporal-workers
```

### Vertical Scaling

#### Scale PostgreSQL

**Requires brief downtime (< 5 minutes):**

```bash
# Increase CPU and memory
kubectl patch -n foodbot-data sts/postgres-app -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "postgres",
          "resources": {
            "requests": {"cpu": "4000m", "memory": "8Gi"},
            "limits": {"cpu": "4000m", "memory": "8Gi"}
          }
        }]
      }
    }
  }
}'

# Restart pods
kubectl rollout restart -n foodbot-data sts/postgres-app
```

#### Scale Elasticsearch

**Can be done live with rolling restart:**

```bash
# Scale horizontally (add nodes)
kubectl scale -n foodbot-data sts/elasticsearch --replicas=5

# Increase node resources
kubectl patch -n foodbot-data sts/elasticsearch -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "elasticsearch",
          "resources": {
            "requests": {"cpu": "4000m", "memory": "8Gi"},
            "limits": {"cpu": "4000m", "memory": "8Gi"}
          }
        }]
      }
    }
  }
}'
```

### Database Optimization

#### Add Indexes

```sql
-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' AND tablename IN ('orders', 'restaurants', 'dishes')
ORDER BY abs(correlation) DESC;

-- Add common indexes
CREATE INDEX CONCURRENTLY idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX CONCURRENTLY idx_dishes_restaurant_available ON dishes(restaurant_id, is_available);
```

#### Vacuum and Analyze

```bash
# Run vacuum analyze on all tables
kubectl exec -n foodbot-data sts/postgres-app -- psql -U postgres -d foodbot -c "VACUUM ANALYZE;"

# Check table bloat
kubectl exec -n foodbot-data sts/postgres-app -- psql -U postgres -d foodbot -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"
```

---

## 5. Backup and Restore

### PostgreSQL Backup

#### Automated Daily Backup

Configured via CronJob in Kubernetes:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: foodbot-data
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - sh
            - -c
            - |
              pg_dump -h postgres-app -U postgres -d foodbot | gzip > /backup/foodbot_$(date +%Y%m%d_%H%M%S).sql.gz
              aws s3 cp /backup/foodbot_*.sql.gz s3://foodbot-backups/postgres/
              find /backup -name "*.sql.gz" -mtime +7 -delete
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

#### Manual Backup

```bash
# Backup to local file
kubectl exec -n foodbot-data sts/postgres-app -- pg_dump -U postgres -d foodbot | gzip > foodbot_backup_$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp foodbot_backup_$(date +%Y%m%d).sql.gz s3://foodbot-backups/postgres/manual/

# Verify backup
gunzip -c foodbot_backup_$(date +%Y%m%d).sql.gz | head -n 50
```

#### Restore from Backup

```bash
# Download backup from S3
aws s3 cp s3://foodbot-backups/postgres/foodbot_20260219.sql.gz .

# Restore (requires downtime)
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=0
gunzip -c foodbot_20260219.sql.gz | kubectl exec -i -n foodbot-data sts/postgres-app -- psql -U postgres -d foodbot
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=3
```

### Redis Backup

Redis is configured with AOF and RDB persistence. Backup files are in `/data/` volume.

```bash
# Trigger manual snapshot
kubectl exec -n foodbot-data sts/redis-0 -- redis-cli BGSAVE

# Copy snapshot to S3
kubectl exec -n foodbot-data sts/redis-0 -- cat /data/dump.rdb > redis_backup_$(date +%Y%m%d).rdb
aws s3 cp redis_backup_$(date +%Y%m%d).rdb s3://foodbot-backups/redis/

# Restore (requires brief downtime)
kubectl scale -n foodbot-data sts/redis --replicas=0
aws s3 cp s3://foodbot-backups/redis/redis_backup_20260219.rdb dump.rdb
kubectl cp dump.rdb foodbot-data/redis-0:/data/dump.rdb
kubectl scale -n foodbot-data sts/redis --replicas=1
```

### Elasticsearch Backup

#### Create Snapshot Repository

```bash
# Configure S3 snapshot repository
curl -X PUT "https://elasticsearch.foodbot.com/_snapshot/s3_backup" -H 'Content-Type: application/json' -d'
{
  "type": "s3",
  "settings": {
    "bucket": "foodbot-backups",
    "region": "us-east-1",
    "base_path": "elasticsearch"
  }
}'
```

#### Automated Daily Snapshot

```bash
# Create snapshot lifecycle policy
curl -X PUT "https://elasticsearch.foodbot.com/_slm/policy/daily-snapshots" -H 'Content-Type: application/json' -d'
{
  "schedule": "0 30 1 * * ?",
  "name": "<daily-snap-{now/d}>",
  "repository": "s3_backup",
  "config": {
    "indices": ["foodbot_*"],
    "ignore_unavailable": false,
    "include_global_state": false
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 7,
    "max_count": 90
  }
}'
```

#### Manual Snapshot

```bash
# Create manual snapshot
curl -X PUT "https://elasticsearch.foodbot.com/_snapshot/s3_backup/manual_$(date +%Y%m%d)?wait_for_completion=true"

# List snapshots
curl -X GET "https://elasticsearch.foodbot.com/_snapshot/s3_backup/_all?pretty"
```

#### Restore from Snapshot

```bash
# Close indices before restore
curl -X POST "https://elasticsearch.foodbot.com/foodbot_restaurants/_close"

# Restore snapshot
curl -X POST "https://elasticsearch.foodbot.com/_snapshot/s3_backup/manual_20260219/_restore" -H 'Content-Type: application/json' -d'
{
  "indices": "foodbot_*",
  "ignore_unavailable": true,
  "include_global_state": false
}'

# Monitor restore progress
curl -X GET "https://elasticsearch.foodbot.com/_recovery?human&pretty"
```

### Kafka Backup

Kafka topics with retention > 7 days can replay events. For critical topics, use Mirror Maker 2 for cross-region replication.

```bash
# Increase retention for critical topics
kubectl exec -n foodbot-data pod/kafka-0 -- kafka-configs \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name order.created \
  --alter --add-config retention.ms=7776000000  # 90 days
```

---

## 6. Incident Response

### Incident Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|-----------|---------------|------------|
| **P0 - Critical** | Complete service outage | 15 minutes | Immediate page to on-call + manager |
| **P1 - High** | Major feature unavailable | 30 minutes | Page to on-call |
| **P2 - Medium** | Performance degradation | 2 hours | Alert to on-call, no page |
| **P3 - Low** | Minor issue, no user impact | 24 hours | Create ticket |

### Incident Response Workflow

#### 1. Acknowledge Incident

```bash
# Acknowledge PagerDuty alert
pagerduty ack <incident-id>

# Or via Slack
/pd ack <incident-id>
```

#### 2. Initial Assessment

- Check incident severity (P0-P3)
- Identify affected services (Gateway API, MCP, Search, etc.)
- Check monitoring dashboards for root cause indicators
- Estimate user impact (% of requests affected)

#### 3. Form War Room (P0/P1 Only)

- Create Slack channel: `#incident-YYYYMMDD-description`
- Invite: On-call engineer, manager, relevant service owners
- Designate Incident Commander to coordinate response

#### 4. Mitigation

Priority: Restore service first, investigate root cause later.

**Common Mitigation Actions:**
- Scale up affected services
- Roll back recent deployment
- Enable feature flag to disable problematic feature
- Failover to secondary region (DR)
- Manually close circuit breakers

#### 5. Communication

**Internal:**
- Post updates to incident Slack channel every 15 minutes (P0), 30 minutes (P1)
- Update status page: `https://status.foodbot.com`

**External (Customer-Facing):**
- Update status page with customer-friendly message
- Send email to affected customers (P0 only)
- Post on Twitter/social media (P0 only)

#### 6. Resolution

- Verify service restored to normal
- Monitor for 30 minutes to ensure stability
- Close incident in PagerDuty
- Mark status page as "Resolved"

#### 7. Post-Incident Review

Within 48 hours, create post-mortem document:

**Template:**
```markdown
# Incident Post-Mortem: [Title]

**Date:** 2026-02-19
**Duration:** 45 minutes
**Severity:** P1
**Services Affected:** Gateway API, MCP Orchestrator

## Summary
Brief description of what happened.

## Timeline
- 10:00 - Alert triggered (high API latency)
- 10:05 - On-call engineer paged
- 10:10 - Root cause identified (database connection pool exhausted)
- 10:15 - Mitigation applied (scaled up replicas + increased pool size)
- 10:30 - Service restored
- 10:45 - Monitoring stable, incident closed

## Root Cause
Database connection pool size (10) insufficient for traffic spike from marketing campaign.

## Impact
- 15% of API requests timing out
- ~200 customers affected
- 0 orders lost

## Action Items
- [ ] Increase default pool size to 20 (Owner: @dev-team, Due: 2026-02-20)
- [ ] Add alert for pool usage > 70% (Owner: @sre-team, Due: 2026-02-21)
- [ ] Load test with 2x expected traffic (Owner: @qa-team, Due: 2026-02-25)
```

---

## 7. On-Call Procedures

### On-Call Schedule

- **Rotation:** 1 week shifts, Monday 9 AM to Monday 9 AM
- **Primary:** SRE or senior backend engineer
- **Secondary:** Engineering manager (escalation only)
- **Schedule Tool:** PagerDuty

### On-Call Checklist

#### Start of Shift

- [ ] Verify PagerDuty notification settings (SMS + push + phone call)
- [ ] Review open incidents from previous shift
- [ ] Check all monitoring dashboards for anomalies
- [ ] Test PagerDuty alert (send test page)
- [ ] Ensure access to:
  - [ ] Kubernetes cluster (`kubectl` configured)
  - [ ] AWS console
  - [ ] Grafana dashboards
  - [ ] Temporal UI
  - [ ] GitHub (for rollback)
  - [ ] VPN (if remote)

#### During Shift

- Keep laptop/phone within reach (even during meetings)
- Respond to pages within 15 minutes (P0/P1)
- Escalate to secondary if unable to resolve within 30 minutes
- Document all incidents in Slack

#### End of Shift

- [ ] Hand off any ongoing incidents to next on-call
- [ ] Update runbook with new issues/fixes discovered
- [ ] Complete post-mortem for any P0/P1 incidents
- [ ] Update Grafana dashboard annotations for deployments/incidents

### Common Commands (Quick Reference)

```bash
# View pod status
kubectl get pods -n foodbot-apps -o wide

# View logs (last 100 lines)
kubectl logs -n foodbot-apps deployment/gateway-api --tail=100

# Follow logs in real-time
kubectl logs -n foodbot-apps deployment/gateway-api -f

# Describe pod (events, resource usage)
kubectl describe pod -n foodbot-apps <pod-name>

# Shell into pod
kubectl exec -it -n foodbot-apps <pod-name> -- bash

# Scale deployment
kubectl scale -n foodbot-apps deployment/gateway-api --replicas=10

# Rollback deployment
kubectl rollout undo -n foodbot-apps deployment/gateway-api

# View rollout history
kubectl rollout history -n foodbot-apps deployment/gateway-api

# Check HPA status
kubectl get hpa -n foodbot-apps

# Check PVC usage
kubectl exec -n foodbot-data sts/postgres-app -- df -h

# Port forward for local debugging
kubectl port-forward -n foodbot-apps svc/gateway-api 3000:3000
```

### Escalation Path

1. **On-Call Engineer** (Primary)
2. **Engineering Manager** (Secondary, if primary unavailable or needs help)
3. **CTO** (P0 incidents only, if major business impact)

### When to Escalate

- Incident unresolved after 30 minutes of troubleshooting
- Data loss risk (PostgreSQL replication failure)
- Security incident (unauthorized access, data breach)
- Need approval for risky mitigation (delete production data, manual DB intervention)

---

## Useful Links

| Resource | URL |
|----------|-----|
| **Production Dashboards** | https://grafana.foodbot.com |
| **Status Page** | https://status.foodbot.com |
| **Temporal UI** | https://temporal.foodbot.com |
| **Kibana (Logs)** | https://kibana.foodbot.com |
| **Kafka UI** | https://kafka.foodbot.com |
| **PagerDuty** | https://foodbot.pagerduty.com |
| **GitHub** | https://github.com/foodbot/foodbot |
| **Runbook (This Doc)** | https://github.com/foodbot/foodbot/blob/main/docs/PRODUCTION_RUNBOOK.md |

---

**Questions?** Contact #sre-team on Slack or email sre@foodbot.com

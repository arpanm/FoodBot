# Infrastructure Test Cases - FoodBot

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2026-02-20

---

## Table of Contents

- [1. Docker Infrastructure Tests](#1-docker-infrastructure-tests)
- [2. Kubernetes Deployment Tests](#2-kubernetes-deployment-tests)
- [3. Database Tests](#3-database-tests)
- [4. Caching Tests](#4-caching-tests)
- [5. Messaging Tests](#5-messaging-tests)
- [6. Search Infrastructure Tests](#6-search-infrastructure-tests)
- [7. Load Balancer Tests](#7-load-balancer-tests)
- [8. Monitoring & Logging Tests](#8-monitoring--logging-tests)
- [9. Security Tests](#9-security-tests)
- [10. Disaster Recovery Tests](#10-disaster-recovery-tests)

---

## 1. Docker Infrastructure Tests

### TEST-DOCKER-001: Container Build Tests

**Objective:** Verify all Docker images build successfully

```bash
# Test Case
TEST_ID: TEST-DOCKER-001
TEST_TYPE: Unit
PRIORITY: High

# Preconditions
- Docker 24+ installed
- BuildKit enabled
- Source code available

# Test Steps
1. Run `./scripts/docker-build.sh`
2. Verify all images built without errors
3. Check image sizes are optimized
4. Verify no high/critical vulnerabilities

# Expected Results
- All images build successfully
- Gateway API image < 200MB
- MCP Orchestrator image < 300MB
- Frontend images < 50MB
- No critical/high vulnerabilities found

# Actual Results
[To be filled during execution]

# Status: PENDING
```

### TEST-DOCKER-002: Multi-Platform Build Test

**Objective:** Verify multi-platform builds work correctly

```bash
TEST_ID: TEST-DOCKER-002
PLATFORMS: linux/amd64, linux/arm64

# Test Steps
1. Run `PLATFORMS=linux/amd64,linux/arm64 ./scripts/docker-build.sh`
2. Verify images for both platforms
3. Test running containers on both architectures

# Expected Results
- Images built for both platforms
- Containers start successfully on both
- All health checks pass

# Status: PENDING
```

### TEST-DOCKER-003: Docker Compose Stack Test

**Objective:** Verify complete Docker Compose stack starts successfully

```bash
TEST_ID: TEST-DOCKER-003
FILE: docker-compose.prod.yml

# Test Steps
1. Run `docker-compose -f docker-compose.prod.yml up -d`
2. Wait 5 minutes for all services to start
3. Check all container health statuses
4. Verify inter-service communication

# Expected Results
- All containers status: healthy
- No containers in restarting state
- Services communicate successfully
- Health endpoints return 200 OK

# Verification Commands
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs --tail=50
curl http://localhost/health

# Status: PENDING
```

---

## 2. Kubernetes Deployment Tests

### TEST-K8S-001: Cluster Setup Test

**Objective:** Verify EKS cluster is properly configured

```bash
TEST_ID: TEST-K8S-001
CLUSTER: foodbot-prod

# Test Steps
1. Run `kubectl get nodes`
2. Verify node count and status
3. Check node labels and taints
4. Verify add-ons installed

# Expected Results
- All nodes: Ready status
- Correct node count (12 nodes)
- Proper labels: workload-type
- Add-ons: metrics-server, aws-load-balancer-controller

# Status: PENDING
```

### TEST-K8S-002: Service Deployment Test

**Objective:** Verify all services deploy successfully

```bash
TEST_ID: TEST-K8S-002
NAMESPACE: foodbot-apps

# Test Steps
1. Run `./scripts/k8s-deploy.sh`
2. Monitor rollout status
3. Check pod statuses
4. Verify health endpoints

# Expected Results
- All deployments: Available
- All pods: Running (1/1 Ready)
- All health checks: Passing
- No CrashLoopBackOff

# Verification
kubectl get pods -n foodbot-apps
kubectl get deployments -n foodbot-apps
kubectl describe pod <pod-name> -n foodbot-apps

# Status: PENDING
```

### TEST-K8S-003: Horizontal Pod Autoscaling Test

**Objective:** Verify HPA scales pods based on load

```bash
TEST_ID: TEST-K8S-003
SERVICE: gateway-api

# Test Steps
1. Check initial replica count (should be 3)
2. Generate load (1000 req/s)
3. Wait for HPA to scale up
4. Stop load
5. Wait for HPA to scale down

# Expected Results
- Initial replicas: 3
- Under load: scales up to 10-20
- After load: scales down to 3 (within 10 minutes)
- No pod disruptions during scaling

# Verification
kubectl get hpa -n foodbot-apps -w
kubectl top pods -n foodbot-apps
ab -n 100000 -c 100 https://api.foodbot.com/health

# Status: PENDING
```

### TEST-K8S-004: Rolling Update Test

**Objective:** Verify zero-downtime rolling updates

```bash
TEST_ID: TEST-K8S-004
SERVICE: gateway-api

# Test Steps
1. Deploy version v1.0.0
2. Start continuous traffic (100 req/s)
3. Deploy version v1.1.0
4. Monitor during rollout
5. Check error rate

# Expected Results
- Zero downtime during update
- Error rate < 0.1%
- All requests successful
- Old pods gracefully terminated

# Verification
kubectl rollout status deployment/gateway-api -n foodbot-apps
# Monitor error rate in Grafana

# Status: PENDING
```

---

## 3. Database Tests

### TEST-DB-001: PostgreSQL Connection Test

**Objective:** Verify database connectivity from applications

```bash
TEST_ID: TEST-DB-001
DATABASE: foodbot-postgres-prod (RDS)

# Test Steps
1. Deploy test pod with psql client
2. Connect to database
3. Run test queries
4. Check connection pooling

# Expected Results
- Connection successful
- Queries execute < 50ms
- Connection pool: 20 connections
- No connection timeout errors

# Test Commands
kubectl run db-test --image=postgres:16-alpine --rm -it -- \
  psql -h <RDS_ENDPOINT> -U postgres -d foodbot -c "SELECT 1;"

# Expected Output
 ?column?
----------
        1
(1 row)

# Status: PENDING
```

### TEST-DB-002: Database Migration Test

**Objective:** Verify database migrations run successfully

```bash
TEST_ID: TEST-DB-002

# Test Steps
1. Take database backup
2. Run migration job
3. Verify schema changes
4. Test application with new schema
5. Rollback test (optional)

# Expected Results
- Migrations complete without errors
- Application works with new schema
- No data loss
- Rollback possible (if needed)

# Status: PENDING
```

### TEST-DB-003: Database Performance Test

**Objective:** Verify database performance under load

```bash
TEST_ID: TEST-DB-003

# Test Steps
1. Run pgbench load test
2. Monitor query performance
3. Check connection pool usage
4. Verify slow query logs

# Expected Results
- Queries p95 < 50ms
- No connection pool exhaustion
- Slow queries properly logged
- IOPS within limits

# Test Commands
pgbench -h <RDS_ENDPOINT> -U postgres -d foodbot -c 50 -j 10 -T 60

# Status: PENDING
```

---

## 4. Caching Tests

### TEST-CACHE-001: Redis Connection Test

**Objective:** Verify Redis connectivity and authentication

```bash
TEST_ID: TEST-CACHE-001
CACHE: foodbot-redis-prod (ElastiCache)

# Test Steps
1. Deploy test pod with redis-cli
2. Connect with auth token
3. Test SET/GET operations
4. Check replication status

# Expected Results
- Connection successful with auth
- SET/GET operations < 5ms
- Replication: master + 2 replicas
- No authentication errors

# Test Commands
kubectl run redis-test --image=redis:7-alpine --rm -it -- \
  redis-cli -h <REDIS_ENDPOINT> -a <AUTH_TOKEN> ping

# Expected Output
PONG

# Status: PENDING
```

### TEST-CACHE-002: Cache Hit Rate Test

**Objective:** Verify caching is effective

```bash
TEST_ID: TEST-CACHE-002

# Test Steps
1. Clear cache
2. Make 1000 API requests (same endpoints)
3. Check cache hit rate
4. Verify response times improve

# Expected Results
- Cache hit rate > 80%
- Cached response time < 50ms
- Non-cached response time < 500ms
- Memory usage stable

# Status: PENDING
```

---

## 5. Messaging Tests

### TEST-KAFKA-001: Kafka Connectivity Test

**Objective:** Verify Kafka broker connectivity

```bash
TEST_ID: TEST-KAFKA-001
KAFKA: foodbot-kafka-prod (MSK)

# Test Steps
1. List Kafka topics
2. Create test topic
3. Produce messages
4. Consume messages
5. Delete test topic

# Expected Results
- Can list all topics
- Topic creation successful
- Messages produced/consumed successfully
- No broker connection errors

# Test Commands
kafka-topics --bootstrap-server <MSK_ENDPOINT>:9092 --list
kafka-console-producer --bootstrap-server <MSK_ENDPOINT>:9092 --topic test-topic
kafka-console-consumer --bootstrap-server <MSK_ENDPOINT>:9092 --topic test-topic --from-beginning

# Status: PENDING
```

### TEST-KAFKA-002: Event Streaming Test

**Objective:** Verify end-to-end event streaming

```bash
TEST_ID: TEST-KAFKA-002
FLOW: API → Kafka → Notification Service

# Test Steps
1. Create order via API
2. Verify event produced to Kafka
3. Check Notification Service consumes event
4. Verify notification sent

# Expected Results
- Event produced within 100ms
- Consumer lag < 1000 messages
- Notification sent successfully
- No DLQ messages

# Status: PENDING
```

---

## 6. Search Infrastructure Tests

### TEST-SEARCH-001: Elasticsearch Connection Test

**Objective:** Verify Elasticsearch cluster health

```bash
TEST_ID: TEST-SEARCH-001
SEARCH: foodbot-search-prod (OpenSearch)

# Test Steps
1. Check cluster health
2. List indices
3. Verify replication
4. Test search query

# Expected Results
- Cluster status: green
- All indices: open status
- Replication factor: 2
- Search query < 100ms

# Test Commands
curl -X GET "<OPENSEARCH_ENDPOINT>/_cluster/health?pretty"

# Expected Output
{
  "status" : "green",
  "number_of_nodes" : 6,
  "active_primary_shards" : 12,
  "active_shards" : 36
}

# Status: PENDING
```

### TEST-SEARCH-002: Search Performance Test

**Objective:** Verify search performance under load

```bash
TEST_ID: TEST-SEARCH-002

# Test Steps
1. Index 100,000 restaurants
2. Run 1000 search queries
3. Measure response times
4. Check index size

# Expected Results
- Indexing rate: 1000 docs/sec
- Search p95: < 100ms
- Search p99: < 200ms
- Index size optimized

# Status: PENDING
```

---

## 7. Load Balancer Tests

### TEST-LB-001: ALB Health Check Test

**Objective:** Verify ALB health checks work correctly

```bash
TEST_ID: TEST-LB-001
ALB: foodbot-prod-alb

# Test Steps
1. Check ALB target group health
2. Verify healthy targets
3. Simulate unhealthy target
4. Verify traffic rerouted

# Expected Results
- All targets: healthy
- Unhealthy targets removed from pool
- Traffic distributed evenly
- No 503 errors

# Verification
aws elbv2 describe-target-health --target-group-arn <TG_ARN>

# Status: PENDING
```

### TEST-LB-002: SSL/TLS Termination Test

**Objective:** Verify SSL termination and certificate validity

```bash
TEST_ID: TEST-LB-002

# Test Steps
1. Access https://api.foodbot.com
2. Check certificate validity
3. Verify TLS version (1.2+)
4. Test HTTP to HTTPS redirect

# Expected Results
- Certificate valid and trusted
- TLS 1.2 or 1.3
- HTTP redirects to HTTPS
- No security warnings

# Test Commands
curl -vI https://api.foodbot.com
openssl s_client -connect api.foodbot.com:443 -showcerts

# Status: PENDING
```

---

## 8. Monitoring & Logging Tests

### TEST-MON-001: Prometheus Metrics Test

**Objective:** Verify metrics collection

```bash
TEST_ID: TEST-MON-001

# Test Steps
1. Access Prometheus UI
2. Check targets status
3. Verify metrics ingestion
4. Run sample queries

# Expected Results
- All targets: UP status
- Metrics available for all services
- Queries return valid data
- Alert rules loaded

# Sample Queries
http_requests_total
up{job="gateway-api"}
rate(http_requests_total[5m])

# Status: PENDING
```

### TEST-MON-002: Grafana Dashboard Test

**Objective:** Verify dashboards display correctly

```bash
TEST_ID: TEST-MON-002

# Test Steps
1. Access Grafana
2. Open FoodBot Overview dashboard
3. Verify all panels load
4. Check data freshness

# Expected Results
- All panels display data
- Data updated in real-time
- No panel errors
- Alerts functional

# Status: PENDING
```

### TEST-LOG-001: CloudWatch Logs Test

**Objective:** Verify logs are collected properly

```bash
TEST_ID: TEST-LOG-001

# Test Steps
1. Generate test logs
2. Check CloudWatch log streams
3. Search for specific log entries
4. Verify retention policy

# Expected Results
- Logs visible within 1 minute
- Search works correctly
- Retention: 30 days
- Structured JSON format

# Status: PENDING
```

---

## 9. Security Tests

### TEST-SEC-001: Network Policy Test

**Objective:** Verify network policies enforce restrictions

```bash
TEST_ID: TEST-SEC-001

# Test Steps
1. Deploy test pod in restricted namespace
2. Attempt unauthorized connections
3. Verify connections blocked
4. Test allowed connections

# Expected Results
- Unauthorized connections blocked
- Allowed connections succeed
- No policy bypass possible

# Status: PENDING
```

### TEST-SEC-002: Secrets Management Test

**Objective:** Verify secrets are properly encrypted

```bash
TEST_ID: TEST-SEC-002

# Test Steps
1. Check secrets in Kubernetes
2. Verify encryption at rest
3. Test secret rotation
4. Check access logs

# Expected Results
- Secrets encrypted (base64 minimum)
- KMS encryption enabled
- Rotation successful
- Access logged

# Status: PENDING
```

---

## 10. Disaster Recovery Tests

### TEST-DR-001: Database Backup and Restore Test

**Objective:** Verify database backup and restore procedures

```bash
TEST_ID: TEST-DR-001

# Test Steps
1. Take manual backup
2. Drop test table
3. Restore from backup
4. Verify data integrity

# Expected Results
- Backup completes < 30 minutes
- Restore completes < 15 minutes
- No data loss
- Application functional post-restore

# Status: PENDING
```

### TEST-DR-002: Disaster Recovery Failover Test

**Objective:** Verify failover to backup region

```bash
TEST_ID: TEST-DR-002

# Test Steps
1. Simulate primary region failure
2. Trigger failover to secondary region
3. Verify application availability
4. Test data consistency

# Expected Results
- RTO < 15 minutes
- RPO < 1 hour
- Application operational
- Data consistent across regions

# Status: PENDING
```

---

## Test Execution Schedule

### Daily Tests (Automated)
- Docker build tests
- Health check tests
- Basic connectivity tests

### Weekly Tests (Automated)
- Performance tests
- Load tests
- Security scans

### Monthly Tests (Manual)
- Disaster recovery tests
- Failover tests
- Full system tests

### Quarterly Tests (Manual)
- Penetration testing
- Compliance audits
- Capacity planning

---

## Test Reporting

### Metrics to Track
- Test pass rate
- Mean time to detect (MTTD)
- Mean time to resolve (MTTR)
- Infrastructure uptime
- Performance baselines

### Reporting Format
```yaml
test_run:
  date: "2026-02-20"
  environment: production
  total_tests: 50
  passed: 48
  failed: 2
  skipped: 0
  pass_rate: 96%
  duration: "2h 15m"

failed_tests:
  - TEST-K8S-003: HPA scaling timeout
  - TEST-DB-003: Query performance degradation

action_items:
  - Investigate HPA configuration
  - Optimize database indices
```

---

**Document Owner:** QA & DevOps Teams
**Review Schedule:** Monthly
**Next Review Date:** 2026-03-20

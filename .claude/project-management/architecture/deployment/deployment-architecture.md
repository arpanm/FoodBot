# FoodBot Deployment Architecture

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2026-02-20

---

## Table of Contents

- [1. Deployment Environments](#1-deployment-environments)
- [2. Deployment Strategy](#2-deployment-strategy)
- [3. Container Orchestration](#3-container-orchestration)
- [4. Service Dependencies](#4-service-dependencies)
- [5. Scaling Strategy](#5-scaling-strategy)
- [6. Health Checks & Readiness](#6-health-checks--readiness)
- [7. Deployment Pipeline](#7-deployment-pipeline)
- [8. Rollback Procedures](#8-rollback-procedures)

---

## 1. Deployment Environments

### 1.1 Environment Strategy

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Development │ -> │   Staging   │ -> │ Production  │    │   Canary    │
│  (Local)    │    │  (Cloud)    │    │   (Cloud)   │    │ (Gradual)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 1.2 Development Environment

**Purpose:** Local development and testing

**Infrastructure:**
```yaml
orchestration: Docker Compose
compute: Local machine (8+ GB RAM, 4+ cores)
services:
  - PostgreSQL (2 instances)
  - Redis
  - Temporal Server + UI
  - Elasticsearch + Kibana
  - Kafka + Zookeeper + Schema Registry
  - Management UIs (Redis Commander, Kafka UI)

resource_limits: minimal
data_persistence: docker volumes
networking: bridge network (172.28.0.0/16)
```

**Configuration:**
```yaml
database:
  synchronize: true  # Auto-sync schema
  logging: all queries

api:
  log_level: debug
  cors: "*"
  rate_limiting: disabled

cache:
  ttl: short (for testing)
```

**Access:**
- API: http://localhost:3000
- Temporal UI: http://localhost:8080
- Kibana: http://localhost:5601
- Redis Commander: http://localhost:8081
- Kafka UI: http://localhost:8082

### 1.3 Staging Environment

**Purpose:** Pre-production testing, QA, and integration tests

**Infrastructure:**
```yaml
orchestration: Kubernetes (EKS)
cluster:
  nodes: 6 (3 app, 3 data)
  node_size: m5.xlarge (4 vCPU, 16 GB)
  regions: 2 AZs

managed_services:
  database: AWS RDS PostgreSQL (db.t3.large)
  cache: AWS ElastiCache Redis (cache.t3.medium)
  search: AWS OpenSearch (t3.medium.search, 2 nodes)
  messaging: AWS MSK (kafka.t3.small, 3 brokers)

replicas:
  gateway_api: 2
  mcp_orchestrator: 1
  temporal_workers: 1
  notification_service: 1
```

**Configuration:**
```yaml
database:
  synchronize: false  # Use migrations
  logging: errors only

api:
  log_level: info
  cors: specific domains
  rate_limiting: relaxed

cache:
  ttl: production-like
```

**Access:**
- API: https://staging-api.foodbot.com
- Customer App: https://staging-app.foodbot.com
- Restaurant App: https://staging-restaurant.foodbot.com

### 1.4 Production Environment

**Purpose:** Live system serving real users

**Infrastructure:**
```yaml
orchestration: Kubernetes (EKS)
cluster:
  nodes: 12 (6 app, 6 data)
  node_size: c5.4xlarge (16 vCPU, 32 GB)
  regions: 3 AZs
  auto_scaling: enabled

managed_services:
  database: AWS RDS PostgreSQL (db.r6g.2xlarge, Multi-AZ)
  cache: AWS ElastiCache Redis (cache.r7g.xlarge, 3 nodes)
  search: AWS OpenSearch (r6g.xlarge.search, 3 data + 3 master)
  messaging: AWS MSK (kafka.m5.2xlarge, 6 brokers)

replicas:
  gateway_api: 3-20 (HPA)
  mcp_orchestrator: 2-8 (HPA)
  temporal_workers: 2-10 (HPA)
  notification_service: 2-6 (HPA)
  customer_app: 3-10 (HPA)
  restaurant_app: 3-10 (HPA)
```

**Configuration:**
```yaml
database:
  synchronize: false
  logging: errors only
  slow_query_log: enabled

api:
  log_level: warn
  cors: production domains only
  rate_limiting: strict

cache:
  ttl: optimized for performance

security:
  tls: enforced
  secrets: AWS Secrets Manager
  encryption: at rest and in transit
```

**Access:**
- API: https://api.foodbot.com
- Customer App: https://app.foodbot.com
- Restaurant App: https://restaurant.foodbot.com

### 1.5 Canary Deployment

**Purpose:** Gradual rollout of new versions to minimize risk

**Strategy:**
```yaml
traffic_split:
  phase_1: 5% canary, 95% stable (duration: 30 min)
  phase_2: 25% canary, 75% stable (duration: 1 hour)
  phase_3: 50% canary, 50% stable (duration: 2 hours)
  phase_4: 100% canary (full rollout)

success_criteria:
  error_rate: < 1%
  response_time_p95: < 500ms
  response_time_p99: < 1000ms
  cpu_usage: < 80%
  memory_usage: < 85%

automatic_rollback:
  enabled: true
  triggers:
    - error_rate > 2%
    - response_time_p95 > 1000ms
    - crash_loop_backoff
```

---

## 2. Deployment Strategy

### 2.1 Rolling Deployment (Default)

**Strategy:** Zero-downtime rolling updates

```yaml
deployment_config:
  strategy: RollingUpdate
  max_unavailable: 0
  max_surge: 1

process:
  1. Create new pod with updated version
  2. Wait for readiness probe to pass
  3. Shift traffic to new pod
  4. Terminate old pod
  5. Repeat for all replicas

duration: ~5 minutes for 3 replicas
downtime: 0 seconds
rollback: automatic on failure
```

**Example (Gateway API):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 1 extra pod during update
      maxUnavailable: 0  # No downtime
  template:
    spec:
      containers:
      - name: gateway-api
        image: foodbot/gateway-api:v1.2.0
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### 2.2 Blue-Green Deployment

**Strategy:** Full environment switch

```yaml
process:
  1. Deploy complete new environment (Green)
  2. Run smoke tests on Green
  3. Switch load balancer to Green
  4. Monitor for issues
  5. Keep Blue for rollback (24 hours)
  6. Decomission Blue

duration: ~30 minutes
downtime: 0 seconds
resource_usage: 2x during deployment
rollback: instant (switch back to Blue)
```

**Use Cases:**
- Major version upgrades
- Database schema changes
- High-risk deployments

### 2.3 Canary Deployment

**Strategy:** Gradual traffic shift

```yaml
process:
  1. Deploy Canary version (5% traffic)
  2. Monitor metrics for 30 minutes
  3. Increase to 25% traffic (1 hour)
  4. Increase to 50% traffic (2 hours)
  5. Full rollout to 100%

tools:
  - Istio Service Mesh
  - Flagger (automated progressive delivery)
  - Prometheus (metrics collection)

metrics_monitoring:
  - request success rate
  - request duration
  - custom business metrics
```

### 2.4 Database Migration Strategy

**Strategy:** Backward-compatible migrations

```yaml
process:
  1. Pre-deployment:
     - Create migration (backward compatible)
     - Test on staging
     - Review with team

  2. Deployment:
     - Run migration before deploying app
     - Migration should be additive only
     - No column/table drops

  3. Post-deployment:
     - Monitor for migration issues
     - Data validation checks
     - Performance monitoring

  4. Cleanup (after 2 weeks):
     - Remove deprecated columns/tables
     - Run vacuum/analyze

backward_compatibility:
  - Add new columns with defaults
  - Never drop columns immediately
  - Use feature flags for schema changes
  - Always add, never remove or rename
```

**Example Migration Flow:**
```sql
-- Phase 1: Add new column (backward compatible)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Deploy application v1.1 (uses email_verified)
-- Monitor for 2 weeks

-- Phase 2: Cleanup old column (separate migration)
ALTER TABLE users DROP COLUMN old_email_status;
```

---

## 3. Container Orchestration

### 3.1 Kubernetes Architecture

```
                         ┌─────────────────────────┐
                         │     Ingress (ALB)       │
                         │  - SSL Termination      │
                         │  - Rate Limiting        │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
         ┌──────────▼──────────┐           ┌───────────▼──────────┐
         │  Gateway API Pods   │           │   Frontend Pods      │
         │  (3-20 replicas)    │           │   (3-10 replicas)    │
         │  - Health checks    │           │   - Static content   │
         │  - Auto-scaling     │           │   - CDN integration  │
         └──────────┬──────────┘           └──────────────────────┘
                    │
       ┌────────────┼────────────┬────────────────┐
       │            │            │                │
  ┌────▼────┐  ┌───▼────┐  ┌───▼─────┐  ┌───────▼────────┐
  │PostgreSQL│  │ Redis  │  │Temporal │  │   Kafka        │
  │  (RDS)   │  │(Elastic│  │ Server  │  │   (MSK)        │
  │          │  │Cache)  │  │  Pods   │  │                │
  └──────────┘  └────────┘  └─────────┘  └────────────────┘
```

### 3.2 Namespace Organization

```yaml
namespaces:
  foodbot-apps:
    purpose: User-facing applications
    services:
      - gateway-api
      - customer-app
      - restaurant-app
    resource_quota:
      cpu: 100 cores
      memory: 200Gi
      pods: 100

  foodbot-services:
    purpose: Backend services
    services:
      - mcp-orchestrator
      - notification-service
    resource_quota:
      cpu: 50 cores
      memory: 100Gi
      pods: 50

  foodbot-workflows:
    purpose: Temporal workflows
    services:
      - temporal-server
      - temporal-workers
      - temporal-ui
    resource_quota:
      cpu: 50 cores
      memory: 100Gi
      pods: 50

  foodbot-data:
    purpose: Data services (if self-hosted)
    services:
      - postgres-statefulset
      - redis-statefulset
      - elasticsearch-statefulset
    resource_quota:
      cpu: 100 cores
      memory: 300Gi
      pods: 30

  foodbot-monitoring:
    purpose: Observability stack
    services:
      - prometheus
      - grafana
      - loki
      - jaeger
    resource_quota:
      cpu: 30 cores
      memory: 80Gi
      pods: 30
```

### 3.3 Pod Distribution Strategy

```yaml
anti_affinity:
  # Spread pods across nodes
  gateway-api:
    rule: preferred
    weight: 100
    topology_key: kubernetes.io/hostname

  # Spread pods across availability zones
  mcp-orchestrator:
    rule: required
    topology_key: topology.kubernetes.io/zone

node_affinity:
  # Application pods on app nodes
  gateway-api:
    required:
      - key: workload-type
        operator: In
        values: [application]

  # Data services on data nodes
  postgres:
    required:
      - key: workload-type
        operator: In
        values: [database]
```

---

## 4. Service Dependencies

### 4.1 Dependency Graph

```
┌──────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                  │
│  ┌──────────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌────────┐ │
│  │PostgreSQL│  │Redis │  │Kafka │  │Elastic│  │Temporal│ │
│  │  (RDS)   │  │(EC)  │  │(MSK) │  │Search │  │   DB   │ │
│  └─────┬────┘  └───┬──┘  └───┬──┘  └───┬───┘  └────┬───┘ │
└────────┼───────────┼─────────┼─────────┼───────────┼─────┘
         │           │         │         │           │
┌────────┼───────────┼─────────┼─────────┼───────────┼─────┐
│        │           │         │         │           │      │
│   ┌────▼────┐      │         │         │      ┌────▼────┐ │
│   │ Gateway │◄─────┴─────────┴─────────┘      │Temporal │ │
│   │   API   │                                 │ Server  │ │
│   └────┬────┘                                 └────┬────┘ │
│        │                                           │      │
│        │       ┌───────────┐                       │      │
│        ├──────►│    MCP    │◄──────────────────────┤      │
│        │       │Orchestrator│                      │      │
│        │       └───────────┘                       │      │
│        │                                           │      │
│        │       ┌───────────┐                       │      │
│        └──────►│Notification│◄──────────────────────┘      │
│                │  Service  │                              │
│                └───────────┘                              │
│                                                           │
│                   Application Layer                       │
└───────────────────────────────────────────────────────────┘
```

### 4.2 Startup Order

**Critical Path:**
```yaml
1. Infrastructure Services (parallel):
   - PostgreSQL (RDS): 2 minutes
   - Redis (ElastiCache): 2 minutes
   - Elasticsearch (OpenSearch): 5 minutes
   - Kafka (MSK): 3 minutes

2. Workflow Engine:
   - Temporal Server: 1 minute (depends on PostgreSQL)

3. Core Services (parallel):
   - Gateway API: 30 seconds (depends on all infrastructure)
   - MCP Orchestrator: 1 minute (depends on Redis, Elasticsearch, Kafka)

4. Supporting Services (parallel):
   - Temporal Workers: 20 seconds (depends on Temporal Server)
   - Notification Service: 20 seconds (depends on Kafka)

5. Frontend Applications (parallel):
   - Customer App: 10 seconds
   - Restaurant App: 10 seconds

Total Cold Start Time: ~8 minutes
Warm Start Time (infrastructure ready): ~2 minutes
```

### 4.3 Dependency Health Checks

```yaml
gateway_api:
  depends_on:
    postgres:
      type: readiness
      timeout: 30s
      retry: 5
    redis:
      type: readiness
      timeout: 10s
      retry: 3
    temporal:
      type: readiness
      timeout: 60s
      retry: 10
    kafka:
      type: readiness
      timeout: 30s
      retry: 5

startup_behavior:
  on_dependency_failure: crash_loop
  max_retries: 5
  backoff: exponential (1s, 2s, 4s, 8s, 16s)
```

---

## 5. Scaling Strategy

### 5.1 Horizontal Pod Autoscaling (HPA)

**Gateway API:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gateway-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

**MCP Orchestrator:**
```yaml
minReplicas: 2
maxReplicas: 8
metrics:
  - cpu: 70%
  - memory: 75%
  - custom: search_requests_per_second > 50
```

**Temporal Workers:**
```yaml
minReplicas: 2
maxReplicas: 10
metrics:
  - cpu: 60%
  - memory: 70%
  - custom: workflow_task_queue_depth > 100
```

### 5.2 Cluster Autoscaling

**Node Autoscaling:**
```yaml
app_node_group:
  min_size: 3
  max_size: 20
  desired_size: 6
  instance_type: c5.4xlarge
  triggers:
    - pod_pending > 2 minutes
    - node_cpu > 80%
    - node_memory > 85%

data_node_group:
  min_size: 3
  max_size: 10
  desired_size: 6
  instance_type: r5.2xlarge
  triggers:
    - pod_pending > 2 minutes
    - node_memory > 90%
```

### 5.3 Vertical Pod Autoscaling (VPA)

**Automatic Resource Adjustment:**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: gateway-api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway-api
  updatePolicy:
    updateMode: "Auto"  # Auto-adjust resources
  resourcePolicy:
    containerPolicies:
    - containerName: gateway-api
      minAllowed:
        cpu: 500m
        memory: 512Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
```

---

## 6. Health Checks & Readiness

### 6.1 Probe Types

**Liveness Probe:** Determines if pod should be restarted
**Readiness Probe:** Determines if pod should receive traffic
**Startup Probe:** Determines if application has started (for slow-starting apps)

### 6.2 Gateway API Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
    scheme: HTTP
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
    scheme: HTTP
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1

startupProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30  # 30 * 5s = 150s max startup time
```

**Health Endpoint Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T10:00:00Z",
  "uptime": 3600,
  "dependencies": {
    "postgres": "healthy",
    "redis": "healthy",
    "temporal": "healthy",
    "kafka": "healthy"
  }
}
```

### 6.3 MCP Orchestrator Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /mcp/v1/actuator/health/liveness
    port: 8081
  initialDelaySeconds: 60
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /mcp/v1/actuator/health/readiness
    port: 8081
  initialDelaySeconds: 30
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

**Spring Boot Actuator Response:**
```json
{
  "status": "UP",
  "components": {
    "redis": {
      "status": "UP"
    },
    "elasticsearch": {
      "status": "UP",
      "details": {
        "cluster_name": "foodbot-search",
        "status": "green",
        "number_of_nodes": 3
      }
    },
    "kafka": {
      "status": "UP"
    }
  }
}
```

---

## 7. Deployment Pipeline

### 7.1 CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'apps/**'
      - 'services/**'
      - '.github/workflows/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run linting
        run: pnpm lint

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration

      - name: Build Docker images
        run: |
          docker build -t foodbot/gateway-api:${{ github.sha }} apps/gateway-api
          docker build -t foodbot/mcp-orchestrator:${{ github.sha }} services/mcp-orchestrator

      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push foodbot/gateway-api:${{ github.sha }}
          docker push foodbot/mcp-orchestrator:${{ github.sha }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: |
          kubectl set image deployment/gateway-api \
            gateway-api=foodbot/gateway-api:${{ github.sha }} \
            -n foodbot-apps --context=staging

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/gateway-api -n foodbot-apps --context=staging

      - name: Run smoke tests
        run: pnpm test:smoke --env=staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy Canary (5%)
        run: |
          kubectl apply -f k8s/canary/gateway-api-canary.yaml

      - name: Monitor Canary
        run: |
          ./scripts/monitor-canary.sh --duration=30m --error-threshold=1%

      - name: Promote to 100%
        if: success()
        run: |
          kubectl set image deployment/gateway-api \
            gateway-api=foodbot/gateway-api:${{ github.sha }} \
            -n foodbot-apps --context=production

      - name: Rollback on failure
        if: failure()
        run: |
          kubectl rollout undo deployment/gateway-api -n foodbot-apps --context=production
```

### 7.2 Deployment Steps

**1. Pre-Deployment Checks:**
```bash
# Verify cluster health
kubectl get nodes
kubectl get pods --all-namespaces

# Check database migrations
npm run migration:status

# Verify secrets and configmaps
kubectl get secrets -n foodbot-apps
kubectl get configmaps -n foodbot-apps
```

**2. Database Migration:**
```bash
# Run migrations
kubectl run migration-runner \
  --image=foodbot/migration-runner:latest \
  --restart=Never \
  --command -- npm run migration:run

# Wait and verify
kubectl wait --for=condition=complete pod/migration-runner --timeout=5m
kubectl logs migration-runner
```

**3. Deploy Services:**
```bash
# Update image tag
kubectl set image deployment/gateway-api \
  gateway-api=foodbot/gateway-api:v1.2.0 \
  -n foodbot-apps

# Monitor rollout
kubectl rollout status deployment/gateway-api -n foodbot-apps

# Verify health
kubectl get pods -n foodbot-apps
curl https://api.foodbot.com/health
```

**4. Post-Deployment Verification:**
```bash
# Run smoke tests
npm run test:smoke --env=production

# Check metrics
curl https://api.foodbot.com/metrics | grep error_rate

# Monitor logs
kubectl logs -f deployment/gateway-api -n foodbot-apps
```

---

## 8. Rollback Procedures

### 8.1 Automatic Rollback

**Trigger Conditions:**
```yaml
automatic_rollback:
  enabled: true
  conditions:
    - deployment_timeout: 10 minutes
    - pod_crash_loop: 3 consecutive failures
    - health_check_failure: 5 consecutive failures
    - error_rate_spike: > 5% for 2 minutes
```

### 8.2 Manual Rollback

**Kubernetes Rollback:**
```bash
# View rollout history
kubectl rollout history deployment/gateway-api -n foodbot-apps

# Rollback to previous version
kubectl rollout undo deployment/gateway-api -n foodbot-apps

# Rollback to specific revision
kubectl rollout undo deployment/gateway-api -n foodbot-apps --to-revision=3

# Verify rollback
kubectl rollout status deployment/gateway-api -n foodbot-apps
```

**Database Migration Rollback:**
```bash
# Revert last migration
kubectl run migration-rollback \
  --image=foodbot/migration-runner:latest \
  --restart=Never \
  --command -- npm run migration:revert

# Verify
kubectl logs migration-rollback
```

### 8.3 Rollback Decision Matrix

| Severity | Symptoms | Action | Time Limit |
|----------|----------|--------|------------|
| P0 - Critical | Complete service outage, data loss | Immediate rollback | < 5 minutes |
| P1 - High | Error rate > 10%, critical feature broken | Rollback after quick investigation | < 15 minutes |
| P2 - Medium | Error rate 5-10%, degraded performance | Investigate, consider rollback | < 30 minutes |
| P3 - Low | Minor issues, non-critical features affected | Fix forward or schedule rollback | < 2 hours |

### 8.4 Post-Rollback Actions

**1. Incident Report:**
```markdown
# Deployment Rollback Incident

**Date:** 2026-02-20 10:30 UTC
**Duration:** 15 minutes
**Severity:** P1

## Timeline:
- 10:15: Deployment initiated (v1.2.0)
- 10:20: Error rate spike detected (8%)
- 10:25: Rollback initiated
- 10:30: Service restored to v1.1.9

## Root Cause:
- Database connection pool exhaustion due to missing configuration

## Actions Taken:
- Immediate rollback to v1.1.9
- Fixed configuration in v1.2.1
- Added monitoring alert for connection pool

## Prevention:
- Add pre-deployment configuration validation
- Enhance staging environment to match production
```

**2. Post-Mortem:**
- Schedule team review within 24 hours
- Document lessons learned
- Update deployment checklist
- Improve monitoring and alerts

---

## Summary

This deployment architecture ensures:

- **Zero-downtime deployments** through rolling updates
- **Gradual risk mitigation** via canary deployments
- **Fast recovery** with automatic rollback capabilities
- **Scalability** through HPA and cluster autoscaling
- **Reliability** with comprehensive health checks
- **Observability** with metrics and logging at every stage

---

**Document Owner:** DevOps Team
**Review Schedule:** Quarterly
**Next Review Date:** 2026-05-20

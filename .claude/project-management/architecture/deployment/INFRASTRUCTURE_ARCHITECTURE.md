# FoodBot Infrastructure Architecture

**Version:** 1.0.0
**Status:** Documented
**Last Updated:** 2026-02-20

---

## Executive Summary

FoodBot implements a comprehensive, production-ready infrastructure with:
- **6 Docker Compose files** for different environments
- **7 GitHub Actions workflows** for CI/CD and security
- **23+ microservices** across application and infrastructure layers
- **12 deployment scripts** for automation
- **4 monitoring solutions** (Prometheus, Grafana, Loki, ELK)
- **Blue/Green deployment** strategy for zero-downtime releases

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer (Nginx)                    │
│                     - SSL Termination                             │
│                     - Rate Limiting                               │
│                     - Load Balancing                              │
└───────────────┬─────────────────────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼────────────┐  ┌───────▼──────────┐
│ Application    │  │  Frontend Apps   │
│ Services       │  │  - Customer      │
│ - Gateway API  │  │  - Restaurant    │
│ - Search Orch  │  │                  │
│ - MCP Adapter  │  │                  │
│ - Notification │  │                  │
└────────┬───────┘  └──────────────────┘
         │
    ┌────┴─────────────────────────────────────┐
    │                                           │
┌───▼──────────┐  ┌──────────────┐  ┌─────────▼────────┐
│ Data Layer   │  │ Event Stream │  │ Workflow Engine  │
│ - PostgreSQL │  │ - Kafka      │  │ - Temporal       │
│ - Redis      │  │ - Zookeeper  │  │                  │
│ - Elastic    │  │              │  │                  │
└──────────────┘  └──────────────┘  └──────────────────┘
         │
    ┌────┴─────────────────────────────────────┐
    │                                           │
┌───▼──────────┐  ┌──────────────┐  ┌─────────▼────────┐
│ Monitoring   │  │ Logging      │  │ Security         │
│ - Prometheus │  │ - Loki       │  │ - Trivy          │
│ - Grafana    │  │ - ELK Stack  │  │ - Snyk           │
│ - Alert Mgr  │  │ - APM Server │  │ - CodeQL         │
└──────────────┘  └──────────────┘  └──────────────────┘
```

---

## 1. Container Infrastructure

### Docker Compose Files

#### docker-compose.yml (Main)
**Purpose:** Core infrastructure services

**Services Breakdown:**
```yaml
Infrastructure (11 services):
  - PostgreSQL (Temporal): 15-alpine
  - PostgreSQL (App): 16-alpine
  - Redis: 7-alpine
  - Elasticsearch: 8.11.3
  - Kafka: 7.5.3
  - Zookeeper: 7.5.3
  - Temporal Server: 1.22.4

Management UIs (4 services):
  - Temporal UI: 2.21.3
  - Redis Commander: latest
  - Kibana: 8.11.3
  - Kafka UI: latest

Utilities (3 services):
  - Kafka Init: Topic creator
  - Schema Registry: 7.5.3
  - Search Orchestrator: Custom build
```

**Network:** foodbot-network (bridge)
**Volumes:** 8 persistent volumes (postgres, redis, elastic, kafka, etc.)

#### docker-compose.dev.yml
**Purpose:** Development overrides

**Overrides:**
- Increased logging (SQL, Temporal, Kafka)
- Debug log levels
- Increased memory for Elasticsearch (1GB)
- Reduced Kafka retention (24h vs 168h)
- Exposed log volumes

#### docker-compose.prod.yml
**Purpose:** Production deployment

**Key Features:**
- 3 Gateway API replicas for HA
- Nginx load balancer with SSL
- Resource limits on all services
- Optimized PostgreSQL configuration
- Monitoring stack (Prometheus, Grafana)
- Production-grade health checks
- Structured logging (JSON)

**Total Services:** 20+
**Total CPU:** ~18 cores reserved
**Total Memory:** ~36GB reserved

#### docker-compose.temporal.yml
**Purpose:** Standalone Temporal development

**Services:** 4 (PostgreSQL, Temporal, UI, Admin Tools)
**Network:** temporal-network (isolated)

#### docker-compose.monitoring.yml
**Purpose:** Observability stack

**Services:**
- Prometheus: v2.50.1
- Grafana: 10.3.3
- AlertManager: v0.27.0
- Loki: 2.9.5
- Promtail: 2.9.5
- Node Exporter: v1.7.0
- cAdvisor: v0.47.2

**Retention:** Prometheus 15 days, Loki configurable

#### docker-compose.logging.yml
**Purpose:** ELK Stack

**Services:**
- Elasticsearch: 8.11.0
- Logstash: 8.11.0
- Kibana: 8.11.0
- Filebeat: 8.11.0
- Metricbeat: 8.11.0
- APM Server: 8.11.0

**Ports:** 5000 (TCP/UDP), 5044 (Beats), 9600 (API)

---

## 2. Application Services Architecture

### Gateway API (NestJS)
**Replicas:** 3 (production)
**Port:** 3000
**Resources:**
- CPU: 0.5-1 core
- Memory: 1-2GB

**Responsibilities:**
- API gateway and routing
- Authentication/Authorization
- Request validation
- Rate limiting
- Database access

**Dockerfile:** Multi-stage build (4 stages)
```dockerfile
Stage 1: Base dependencies (node:20-alpine)
Stage 2: Dependencies installation (pnpm)
Stage 3: Build (TypeScript compilation)
Stage 4: Production (minimal image, non-root user)
```

**Health Check:** /health endpoint (30s interval)

### Search Orchestrator (Node.js)
**Port:** 3002
**Resources:**
- CPU: 0.5-1 core
- Memory: 1-2GB

**Responsibilities:**
- Multi-source search coordination
- Elasticsearch integration
- MCP adapter communication
- Database fallback
- Response caching

**Timeouts:**
- Elasticsearch: 200ms
- MCP: 2000ms
- Database: 500ms
- Total max: 3000ms

**Cache:** Redis, 5-minute TTL

### MCP Adapter (Node.js)
**Port:** 8082
**Resources:**
- CPU: 0.25-0.5 core
- Memory: 512MB-1GB

**Responsibilities:**
- MCP protocol adaptation
- External service integration
- Response transformation

### Notification Service (Node.js)
**Port:** 3003
**Resources:**
- CPU: 0.25-0.5 core
- Memory: 512MB-1GB

**Responsibilities:**
- Kafka event consumption
- Email notifications (SMTP)
- SMS notifications
- Push notifications

### Frontend Apps (React)
**Customer App:**
- Build: Optimized production bundle
- Resources: 0.25-0.5 CPU, 256-512MB

**Restaurant App:**
- Build: Optimized production bundle
- Resources: 0.25-0.5 CPU, 256-512MB

---

## 3. Data Layer Architecture

### PostgreSQL Configuration

#### Application Database
**Version:** 16-alpine
**Port:** 5433
**Production Tuning:**
```conf
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
work_mem = 1MB
min_wal_size = 1GB
max_wal_size = 4GB
```

**Resources:**
- CPU: 1-2 cores
- Memory: 2-4GB

#### Temporal Database
**Version:** 15-alpine
**Port:** 5432
**Resources:**
- CPU: 0.5-1 core
- Memory: 1-2GB

### Redis Configuration
**Version:** 7-alpine
**Port:** 6379
**Authentication:** Password protected

**Production Settings:**
```conf
maxmemory: 2GB
maxmemory-policy: allkeys-lru
Persistence: RDB (60s/1000, 300s/100, 600s/10)
```

**Use Cases:**
- Session storage
- Cache layer
- Rate limiting counters
- Job queue (BullMQ)

### Elasticsearch Configuration
**Version:** 8.11.3
**Ports:** 9200 (HTTP), 9300 (Transport)

**Production Settings:**
```yaml
discovery.type: single-node
xpack.security.enabled: false (behind firewall)
ES_JAVA_OPTS: -Xms1g -Xmx1g
```

**Resources:**
- CPU: 1-2 cores
- Memory: 2-3GB

**Indices:**
- foodbot_restaurants
- foodbot_dishes
- foodbot_orders

### Kafka Configuration
**Version:** 7.5.3 (Confluent)
**Ports:** 9092 (internal), 29092 (host)

**Production Settings:**
```yaml
broker_id: 1
compression_type: lz4
network_threads: 8
io_threads: 8
log_retention_hours: 168 (7 days)
```

**Topics (13 total):**
```
High Throughput (12 partitions):
- order.created
- order.status.changed
- payment.completed
- dish.availability.changed

Medium Throughput (6 partitions):
- restaurant.created/updated
- dish.created/updated
- user.registered
- payment.failed/refunded

Low Throughput (3 partitions):
- restaurant.deleted
- foodbot.dlq (dead letter queue)
```

**Resources:**
- CPU: 1-2 cores
- Memory: 2-3GB

---

## 4. Load Balancing Architecture

### Nginx Configuration
**Version:** 1.25-alpine
**Ports:** 80 (HTTP), 443 (HTTPS)

**Features:**
```nginx
Performance:
- worker_processes: auto
- worker_connections: 4096
- keepalive: 65s, 100 requests
- sendfile, tcp_nopush, tcp_nodelay: enabled

Compression:
- gzip: on
- gzip_comp_level: 6
- gzip_min_length: 256
- 15+ MIME types supported

Security:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- server_tokens: off

Rate Limiting:
- API: 10 req/s per IP
- Auth: 5 req/minute per IP
- General: 100 req/s per IP
```

**Upstream Pools:**
```nginx
gateway_backend (least_conn):
  - gateway-api-1:3000
  - gateway-api-2:3000
  - gateway-api-3:3000
  keepalive: 32 connections

search_backend:
  - search-orchestrator:3002
  keepalive: 16 connections

customer_app:
  - customer-app:8080

restaurant_app:
  - restaurant-app:8081
```

**Caching:**
```nginx
API Cache:
- Path: /var/cache/nginx/api
- Size: 1GB max
- Inactive: 60 minutes

Static Cache:
- Path: /var/cache/nginx/static
- Size: 2GB max
- Inactive: 7 days
```

---

## 5. Monitoring Architecture

### Prometheus Setup
**Version:** v2.48.0
**Port:** 9090
**Retention:** 30 days (production), 15 days (monitoring stack)

**Scrape Targets:**
```yaml
Application Services:
- gateway-api-1/2/3:3000/metrics
- search-orchestrator:3002/metrics
- mcp-adapter:8082/metrics
- notification-service:3003/metrics

Infrastructure:
- postgres-exporter:9187
- redis-exporter:9121
- kafka-exporter:9308
- elasticsearch-exporter:9114
- node-exporter:9100
- nginx:9113

Kubernetes (if applicable):
- API Server
- Nodes
- Pods (annotation-based)
```

**Scrape Interval:** 15s
**Evaluation Interval:** 15s

### Grafana Setup
**Version:** 10.2.2 / 10.3.3
**Port:** 3001 (prod), 3030 (monitoring)

**Datasources:**
- Prometheus (primary)
- Loki (logs)
- Elasticsearch (traces)

**Pre-configured Dashboards:**
- Application metrics
- Infrastructure metrics
- Kafka metrics
- Database performance
- API performance

**Plugins:**
- grafana-piechart-panel

### AlertManager
**Version:** v0.27.0
**Port:** 9093

**Alert Rules:**
- API response time > 500ms (p95)
- Error rate > 1%
- Database connections > 80%
- Disk usage > 80%
- Memory usage > 90%
- Service down

**Notification Channels:**
- Slack
- Email
- PagerDuty (optional)

### Loki + Promtail
**Loki Version:** 2.9.5
**Port:** 3100

**Log Sources:**
- Application containers (Docker logs)
- System logs (/var/log)
- Nginx access/error logs

**Log Parsing:**
- JSON structured logs
- Timestamp extraction
- Label extraction

### ELK Stack

#### Elasticsearch (Logging)
**Port:** 9200
**Memory:** 512MB-512MB
**Purpose:** Log storage and indexing

#### Logstash
**Ports:**
- 5000: TCP/UDP input
- 5044: Beats input
- 9600: Monitoring API

**Pipeline:**
```
Input → Filter → Output
  ↓       ↓        ↓
 TCP    Grok     Elastic
 UDP    JSON
Beats   Mutate
```

#### Kibana
**Port:** 5601
**Purpose:** Log visualization and analysis

#### Filebeat
**Purpose:** Ship application and container logs

#### Metricbeat
**Purpose:** System and application metrics

#### APM Server
**Port:** 8200
**Purpose:** Application Performance Monitoring
**RUM:** Enabled for frontend tracking

---

## 6. CI/CD Pipeline Architecture

### Continuous Integration Flow
```
┌──────────────┐
│ Git Push/PR  │
└──────┬───────┘
       │
   ┌───▼────────────────────────────┐
   │ Trigger CI Pipeline            │
   └───┬────────────────────────────┘
       │
   ┌───▼──────────┐
   │ Lint & Type  │ (2-3 min)
   │ Check        │
   └───┬──────────┘
       │
   ┌───▼──────────────────────────────┐
   │ Parallel Testing:                │
   │ - Backend Tests (PostgreSQL)     │ (8-12 min)
   │ - Frontend Tests                 │ (5-7 min)
   │ - MCP Tests (Maven)              │ (10-12 min)
   └───┬──────────────────────────────┘
       │
   ┌───▼──────────────────────────────┐
   │ Parallel Builds:                 │
   │ - Backend Build                  │ (5-7 min)
   │ - Frontend Build                 │
   │ - MCP Build (JAR)                │
   └───┬──────────────────────────────┘
       │
   ┌───▼──────────┐
   │ Security     │ (5-10 min)
   │ Scan (PR)    │
   └───┬──────────┘
       │
   ┌───▼──────────┐
   │ E2E Tests    │ (15-20 min)
   │ (main only)  │
   └───┬──────────┘
       │
   ┌───▼──────────┐
   │ Artifacts    │
   │ Upload       │
   └──────────────┘

Total Time: 20-30 minutes
```

### Production Deployment Flow (Blue/Green)
```
┌──────────────────┐
│ Version Tag      │
│ (v1.2.3)         │
└────────┬─────────┘
         │
   ┌─────▼──────────────────┐
   │ Pre-flight Checks      │
   │ - Version validation   │
   │ - Secrets verification │
   └─────┬──────────────────┘
         │
   ┌─────▼──────────────────────────────┐
   │ Build & Scan (Parallel Matrix)     │
   │ - Backend image                    │
   │ - Frontend image                   │
   │ - MCP image                        │
   │ - Search image                     │
   │ - Adapter image                    │
   │ Each: Build → Push → Trivy Scan   │
   └─────┬──────────────────────────────┘
         │                    (30-40 min)
   ┌─────▼──────────────────┐
   │ Deploy to Green Env    │
   │ - Create namespace     │
   │ - Deploy services      │
   │ - Update images        │
   │ - Wait for rollout     │
   └─────┬──────────────────┘
         │                    (10 min)
   ┌─────▼──────────────────┐
   │ Health Checks          │
   │ - Port-forward test    │
   │ - Smoke tests          │
   │ - DB migrations (dry)  │
   └─────┬──────────────────┘
         │
   ┌─────▼──────────────────┐
   │ Traffic Switch         │
   │ - Update service       │
   │   selectors            │
   │ - Monitor (2 min)      │
   └─────┬──────────────────┘
         │
   ┌─────▼──────────────────┐
   │ Post-Switch            │
   │ - Health verify        │
   │ - Run migrations       │
   │ - Scale down blue      │
   │ - Swap labels          │
   └─────┬──────────────────┘
         │
   ┌─────▼──────────────────┐
   │ E2E Tests (Production) │
   │ - Run against live     │
   │ - Verify functionality │
   └─────┬──────────────────┘
         │                    (15-20 min)
   ┌─────▼──────────────────┐
   │ Post-Deployment        │
   │ - Create release       │
   │ - Datadog event        │
   │ - Slack notification   │
   │ - Status page update   │
   └────────────────────────┘

Total Time: 55-75 minutes
Rollback: < 2 minutes if failure
```

### Security Scanning Flow
```
┌──────────────────┐
│ Daily 2 AM UTC   │
│ or Push/PR       │
└────────┬─────────┘
         │
   ┌─────▼────────────────────────────┐
   │ Parallel Security Scans:         │
   │                                  │
   │ 1. Secret Detection              │ (5 min)
   │    - TruffleHog                  │
   │    - GitLeaks                    │
   │                                  │
   │ 2. Dependency Scan               │ (10 min)
   │    - npm audit                   │
   │    - Snyk                        │
   │    - OWASP Dep Check             │
   │                                  │
   │ 3. SAST                          │ (15 min)
   │    - CodeQL                      │
   │    - SonarQube                   │
   │    - Semgrep                     │
   │                                  │
   │ 4. Container Scan (5 services)   │ (20 min)
   │    - Trivy                       │
   │    - Grype                       │
   │    - Docker Scout                │
   │                                  │
   │ 5. License + IaC                 │ (5 min)
   │    - license-checker             │
   │    - Checkov                     │
   │    - Terrascan                   │
   └─────┬────────────────────────────┘
         │
   ┌─────▼────────────────────────────┐
   │ Aggregate Results                │
   │ - Generate summary               │
   │ - Upload SARIF to GitHub         │
   │ - Create issue if critical       │
   │ - Notify security team           │
   └──────────────────────────────────┘

Total Time: 55-65 minutes
Frequency: Daily + on push/PR
```

---

## 7. Deployment Scripts Architecture

### Script Inventory

#### Deployment Scripts
1. **deploy.sh** - Systemd-based deployment
   - Release directory management
   - Service restart orchestration
   - Health checks
   - Cleanup old releases

2. **production-deploy.sh** - Comprehensive production deployment
   - Prerequisites check
   - Database backup
   - Git pull
   - Dependency install
   - Build applications
   - Run migrations
   - Deploy (standard/rolling/blue-green)
   - Smoke tests
   - Notifications

3. **deploy-k8s.sh** - Kubernetes deployment
4. **deploy-aws.sh** - AWS deployment
5. **rollback-k8s.sh** - Kubernetes rollback
6. **rollback.sh** - Standard rollback

#### Database Scripts
7. **db-setup.sh** - Run TypeORM migrations
8. **db-seed.sh** - Seed database with data
9. **db-reset.sh** - Drop + setup + seed
10. **db-migrate.sh** - Run specific migrations

#### Docker Scripts
11. **docker-build.sh** - Build all Docker images
12. **docker-push.sh** - Push images to registry
13. **docker-health-check.sh** - Container health verification

#### Monitoring Scripts
14. **monitoring.sh** - Manage monitoring stack
    - start/stop/restart
    - status
    - logs
    - health checks
    - cleanup

15. **health-check.sh** - Comprehensive system health
    - Disk space
    - Memory
    - PostgreSQL
    - Redis
    - Elasticsearch
    - API endpoints
    - Docker containers
    - Job queue
    - Extension connectivity

16. **monitor.sh** - Real-time monitoring

#### Build Scripts
17. **build-production.sh** - Production build
18. **helm-deploy.sh** - Helm-based deployment
19. **k8s-deploy.sh** - Raw Kubernetes deployment

### Deployment Strategy Support

#### Standard Deployment
```bash
# Stop → Deploy → Start
./scripts/production-deploy.sh
```

#### Rolling Update
```bash
# Gradual service replacement
DEPLOY_STRATEGY=rolling ./scripts/production-deploy.sh
```

#### Blue/Green Deployment
```bash
# Zero downtime with traffic switch
DEPLOY_STRATEGY=blue-green ./scripts/production-deploy.sh
```

---

## 8. Performance Testing

### K6 Load Testing
**File:** performance/k6-load-test.js

**Scenarios:**
1. **Ramp-up Load Test**
   - 0 → 50 VUs (2 min)
   - 50 → 100 VUs (5 min)
   - 100 → 0 VUs (2 min)

2. **Spike Test**
   - 100 → 500 VUs (10s spike)
   - Hold 500 VUs (3 min)
   - Drop to 100 VUs

3. **Stress Test**
   - Gradual increase to 500 VUs
   - Hold for 10 minutes

4. **Soak Test**
   - 100 VUs constant
   - Duration: 1 hour

**Performance Targets:**
- p95 < 500ms
- p99 < 1000ms
- Error rate < 1%
- Throughput > 1000 req/sec

**Test Coverage:**
- Health checks (10%)
- Search restaurants (30%)
- Get menu (20%)
- Create job (20%)
- Get pending jobs (10%)
- Get user orders (10%)

**Custom Metrics:**
- Error rate
- API duration
- Successful/Failed requests

### Artillery Load Testing
**File:** performance/artillery-load-test.yml

**Phases:**
1. Warm-up: 10 users/sec (60s)
2. Ramp-up: 10 → 50 users/sec (120s)
3. Sustained: 50 users/sec (300s)

---

## 9. Infrastructure Configuration Files

### Nginx Configuration
**Location:** infra/nginx/

Files:
- nginx.conf: Main configuration
- conf.d/default.conf: Server blocks
- SSL certificates

### Prometheus Configuration
**Location:** infra/prometheus/

Files:
- prometheus.yml: Scrape config
- alerts/api-alerts.yml: Alert rules

### Grafana Configuration
**Location:** infra/grafana/

Files:
- provisioning/datasources/prometheus.yaml
- dashboards/: Pre-configured dashboards

---

## 10. Dockerfiles

### Gateway API Dockerfile
**Location:** apps/gateway-api/Dockerfile

**Multi-stage build:**
```dockerfile
Stage 1: Base (node:20-alpine)
  - Security updates
  - dumb-init, curl

Stage 2: Dependencies
  - pnpm install
  - Frozen lockfile

Stage 3: Builder
  - Copy source
  - pnpm build
  - pnpm prune --prod

Stage 4: Runner
  - Non-root user (appuser:1001)
  - Copy dist + node_modules
  - Health check
  - Tini init system
```

**Security:**
- Non-root user
- Read-only where possible
- Security updates
- Minimal attack surface

### Search Orchestrator Dockerfile
**Location:** services/search-orchestrator/Dockerfile

**Similar pattern:**
- Builder stage with npm install + build
- Runner stage with minimal footprint
- Non-root user (appuser:1001)
- wget-based health check

### Other Dockerfiles
- apps/customer-app/Dockerfile
- apps/restaurant-app/Dockerfile
- services/mcp-adapter/Dockerfile
- services/mcp-adapter/Dockerfile.prod
- services/notification-service/Dockerfile
- services/mcp-orchestrator/Dockerfile
- Dockerfile.production (root-level)

---

## 11. Network Architecture

### Port Allocation
```
Frontend:
3000  - Customer App (internal)
8080  - Customer App (nginx upstream)
8081  - Restaurant App (nginx upstream)

Backend:
3000  - Gateway API (internal, 3 replicas)
3002  - Search Orchestrator
3003  - Notification Service
8082  - MCP Adapter

Databases:
5432  - Temporal PostgreSQL
5433  - App PostgreSQL
6379  - Redis

Search & Events:
9200  - Elasticsearch HTTP
9300  - Elasticsearch Transport
9092  - Kafka (internal)
29092 - Kafka (host)
2181  - Zookeeper

Workflow:
7233  - Temporal gRPC
7234  - Temporal HTTP
7235  - Temporal Metrics
8080  - Temporal UI
8088  - Temporal UI (standalone)

Monitoring:
3001  - Grafana (prod)
3030  - Grafana (monitoring)
3100  - Loki
9090  - Prometheus
9093  - AlertManager
9100  - Node Exporter
8585  - cAdvisor

Logging:
5601  - Kibana
5000  - Logstash TCP/UDP
5044  - Logstash Beats
9600  - Logstash API
8200  - APM Server

Management UIs:
8081  - Redis Commander
8082  - Kafka UI
8083  - Schema Registry

Load Balancer:
80    - HTTP
443   - HTTPS
```

### Subnet Configuration
**Production Network:**
- Name: foodbot-network
- Subnet: 172.20.0.0/16
- Driver: bridge

---

## 12. Backup & Disaster Recovery

### Backup Strategy

#### Automated Backups
```bash
# Database backup (daily)
docker exec foodbot-postgres pg_dump -U postgres foodbot > backup.sql

# Configuration backup
- .env files
- docker-compose.yml
- Volumes

# Retention
- Keep last 5 backups
- Backup directory: /opt/foodbot/backups
```

#### Backup Contents
1. PostgreSQL databases (app + temporal)
2. Redis RDB snapshots
3. Elasticsearch indices
4. Configuration files
5. Uploaded files (if any)

### Disaster Recovery

#### Recovery Time Objective (RTO)
- **Target:** < 30 minutes
- **Typical:** 15-20 minutes

#### Recovery Point Objective (RPO)
- **Target:** < 1 hour
- **Typical:** Daily backups

#### Recovery Procedure
1. Restore database from latest backup
2. Restore configuration files
3. Start services
4. Verify health checks
5. Restore traffic

#### Rollback Procedure
1. Automatic rollback on health check failure
2. Manual rollback via script
3. Rollback time: < 2 minutes

---

## 13. Scaling Strategy

### Horizontal Scaling
```yaml
Gateway API: 3 → 10 replicas
Search Orchestrator: 1 → 3 replicas
MCP Adapter: 1 → 3 replicas
```

### Vertical Scaling
```yaml
PostgreSQL: 2GB → 8GB RAM
Redis: 2GB → 4GB RAM
Elasticsearch: 3GB → 8GB RAM
```

### Auto-scaling (Kubernetes)
```yaml
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
```

---

## 14. Cost Optimization

### Development Environment
**Monthly Cost:** ~$0 (local Docker)

### Staging Environment
**Monthly Cost:** ~$100-200
- 2 CPU cores
- 8GB RAM
- 100GB storage

### Production Environment
**Monthly Cost:** ~$500-1000
- 16 CPU cores
- 32GB RAM
- 500GB SSD
- Load balancer
- Managed services (optional)

### Optimization Strategies
1. Use spot instances for non-critical services
2. Right-size container resources
3. Implement caching aggressively
4. Use CDN for static assets
5. Archive old logs to S3
6. Scale down during off-peak hours

---

## 15. Security Architecture

### Defense in Depth

**Layer 1: Network**
- Firewall rules
- Private subnets
- VPC isolation

**Layer 2: Load Balancer**
- Rate limiting
- DDoS protection
- SSL/TLS termination

**Layer 3: Application**
- Authentication (JWT)
- Authorization (RBAC)
- Input validation
- Output encoding

**Layer 4: Data**
- Encryption at rest
- Encryption in transit
- Database access controls

**Layer 5: Monitoring**
- Security event logging
- Anomaly detection
- Intrusion detection

### Security Scanning

**Daily Scans:**
- Secret detection (TruffleHog, GitLeaks)
- Dependency vulnerabilities (Snyk, OWASP)
- SAST (CodeQL, SonarQube, Semgrep)
- Container scanning (Trivy, Grype)
- License compliance
- IaC security (Checkov, Terrascan)

**Pre-Deploy Scans:**
- All above +
- Critical vulnerability blocking
- SARIF upload to GitHub Security

---

## 16. Compliance & Standards

### Standards Adherence
- **OWASP Top 10:** Full compliance
- **CIS Benchmarks:** Container hardening
- **GDPR:** Data protection measures
- **SOC 2:** Audit trail and logging
- **PCI DSS:** Payment security (if applicable)

### Audit Logging
- All API requests logged
- All database changes tracked
- All deployments recorded
- All security events captured

---

## Status: DOCUMENTED ✓

Complete infrastructure architecture has been documented and reverse-engineered from existing implementation.

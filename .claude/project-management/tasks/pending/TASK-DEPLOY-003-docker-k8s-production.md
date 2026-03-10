# TASK-DEPLOY-003: Production Docker & Kubernetes Deployment

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 10 days
**Component:** Infrastructure / DevOps
**Depends On:** None
**Blocks:** Production deployment, CI/CD pipeline

---

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
  - [Docker Requirements](#docker-requirements)
  - [Kubernetes Requirements](#kubernetes-requirements)
- [Architecture](#architecture)
- [Acceptance Criteria](#acceptance-criteria)
- [SDLC Phases](#sdlc-phases)

---

## Overview

Implement complete production-grade Docker containerization and Kubernetes deployment for all FoodBot services with multi-stage builds, health checks, resource limits, auto-scaling, secrets management, ingress routing, monitoring integration, blue/green deployment strategy, and comprehensive CI/CD pipeline.

---

## Requirements

### Docker Requirements

1. **Multi-stage Dockerfiles for each service:**
   - gateway-api (NestJS) - node:20-alpine, build + runtime stages
   - mcp-adapter (Node.js) - node:20-alpine with native deps
   - mcp-orchestrator (Java) - eclipse-temurin:21-alpine, gradle build
   - search-orchestrator (Node.js) - node:20-alpine
   - notification-service (Node.js) - node:20-alpine
   - customer-app (React) - nginx:alpine for static serving
   - restaurant-app (React) - nginx:alpine for static serving

2. **Docker Compose production stack:**
   - All services with proper networking (internal + external)
   - Health checks with startup probes
   - Resource limits (CPU + memory per service)
   - Volume mounts for persistent data
   - Environment variable injection
   - Log rotation configuration

3. **Image optimization:**
   - Layer caching strategy
   - .dockerignore for all services
   - Non-root user in all containers
   - Read-only filesystem where possible
   - Minimal attack surface (no shell in production images)

4. **Docker security scanning:**
   - Trivy/Snyk integration for vulnerability scanning
   - Base image pinning with SHA digests
   - No secrets in build layers

### Kubernetes Requirements

1. **Deployments for all services:**
   - Rolling update strategy (maxSurge: 25%, maxUnavailable: 0)
   - Liveness, readiness, and startup probes
   - Resource requests and limits
   - Pod disruption budgets
   - Anti-affinity rules for HA

2. **Services & Networking:**
   - ClusterIP for internal services
   - LoadBalancer for gateway-api
   - Ingress with TLS termination (cert-manager)
   - Network policies (zero-trust)

3. **Auto-scaling:**
   - HPA for gateway-api (CPU 70%, memory 80%)
   - HPA for mcp-adapter (request rate)
   - VPA for search-orchestrator
   - KEDA for Kafka consumers

4. **Configuration & Secrets:**
   - ConfigMaps for non-sensitive config
   - Kubernetes Secrets (sealed-secrets or external-secrets)
   - Environment-specific overlays (dev, staging, prod)

5. **Helm Charts:**
   - Chart per service with values.yaml
   - Umbrella chart for full deployment
   - Chart testing (helm test)

6. **CI/CD Pipeline (GitHub Actions):**
   - Build -> Test -> Lint -> Security Scan -> Docker Build -> Push -> Deploy
   - Parallel builds for independent services
   - Canary deployment support
   - Rollback on health check failure
   - Slack/Discord notifications

---

## Architecture

```
Kubernetes Cluster
├── Namespace: foodbot-prod
│   ├── Deployments (7 services)
│   ├── StatefulSets (PostgreSQL, Redis, Kafka, Elasticsearch)
│   ├── Jobs (migrations, seeding)
│   ├── CronJobs (scheduled orders, analytics)
│   ├── Services (ClusterIP + LoadBalancer)
│   ├── Ingress (TLS with cert-manager)
│   ├── HPA (3 services)
│   ├── PDB (all services)
│   ├── NetworkPolicies
│   ├── ConfigMaps (5)
│   └── Secrets (3)
├── Namespace: foodbot-monitoring
│   ├── Prometheus
│   ├── Grafana
│   ├── Jaeger
│   └── AlertManager
└── Namespace: foodbot-temporal
    ├── Temporal Server
    └── Temporal Workers
```

### Service Resource Allocation

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas |
|---------|-------------|-----------|----------------|--------------|----------|
| gateway-api | 250m | 1000m | 256Mi | 1Gi | 2-10 (HPA) |
| mcp-adapter | 250m | 500m | 256Mi | 512Mi | 2-8 (HPA) |
| mcp-orchestrator | 500m | 2000m | 512Mi | 2Gi | 2-4 |
| search-orchestrator | 250m | 1000m | 256Mi | 1Gi | 2-6 (VPA) |
| notification-service | 100m | 500m | 128Mi | 512Mi | 2 |
| customer-app | 50m | 200m | 64Mi | 256Mi | 2 |
| restaurant-app | 50m | 200m | 64Mi | 256Mi | 2 |

### Deployment Strategy

```
Blue/Green Deployment:
1. Deploy "green" version alongside "blue" (current)
2. Run smoke tests against "green"
3. Switch ingress traffic to "green"
4. Monitor for errors (5 min window)
5. If errors exceed threshold, rollback to "blue"
6. If stable, terminate "blue"

Canary Deployment (alternative):
1. Deploy canary with 5% traffic
2. Monitor error rate and latency
3. Gradually increase: 5% -> 25% -> 50% -> 100%
4. Rollback at any stage if metrics degrade
```

---

## Acceptance Criteria

- [ ] All services have optimized multi-stage Dockerfiles
- [ ] Docker images < 200MB each (except Java service)
- [ ] All images pass Trivy security scan (no critical/high CVEs)
- [ ] Kubernetes manifests for all services with proper probes
- [ ] HPA working for gateway-api and mcp-adapter
- [ ] Helm charts with environment overlays (dev, staging, prod)
- [ ] CI/CD pipeline building, testing, and deploying
- [ ] Blue/green deployment tested
- [ ] Rollback procedure documented and tested
- [ ] Network policies enforcing zero-trust
- [ ] All services reachable and healthy in K8s
- [ ] 85%+ test coverage on Helm chart tests
- [ ] Load test: cluster handles 1000 req/s

---

## SDLC Phases

### Phase 1: Planning & Design (Day 1-2)

**Objectives:**
- Finalize service resource requirements
- Design Kubernetes namespace layout
- Plan CI/CD pipeline stages
- Define deployment strategy (blue/green vs canary)

**Deliverables:**
- Infrastructure architecture diagram
- Resource allocation table per service
- CI/CD pipeline flowchart
- Deployment runbook (draft)

**Activities:**
1. Audit all 7 services for runtime dependencies and resource usage
2. Define health check endpoints for each service
3. Plan network policies and service mesh requirements
4. Design Helm chart structure and values hierarchy
5. Plan secret management strategy (sealed-secrets vs external-secrets)
6. Document rollback procedures

### Phase 2: Docker Implementation (Day 2-4)

**Objectives:**
- Create multi-stage Dockerfiles for all services
- Optimize image sizes and security
- Set up Docker Compose for local development

**Deliverables:**
- 7 Dockerfiles (one per service)
- 7 .dockerignore files
- docker-compose.yml (development)
- docker-compose.prod.yml (production)
- Trivy scan configuration

**Activities:**
1. Create multi-stage Dockerfile for gateway-api (NestJS)
   - Stage 1: Install dependencies (npm ci --only=production)
   - Stage 2: Build TypeScript
   - Stage 3: Production runtime (node:20-alpine)
2. Create Dockerfile for mcp-adapter with native dependency support
3. Create Dockerfile for mcp-orchestrator (Java/Gradle multi-stage)
4. Create Dockerfiles for search-orchestrator and notification-service
5. Create Dockerfiles for React apps (build + nginx:alpine)
6. Create .dockerignore files for all services
7. Implement non-root users in all containers
8. Pin base images with SHA digests
9. Configure Trivy scanning in CI
10. Test all images locally with docker-compose

### Phase 3: Kubernetes Manifests (Day 4-6)

**Objectives:**
- Create Kubernetes manifests for all services
- Implement proper probes, resource limits, and policies
- Set up ingress with TLS

**Deliverables:**
- Deployment manifests (7 services)
- Service manifests (ClusterIP + LoadBalancer)
- Ingress manifest with TLS
- HPA manifests (3 services)
- PDB manifests (all services)
- NetworkPolicy manifests
- ConfigMap and Secret manifests

**Activities:**
1. Create Deployment manifests with:
   - Liveness probes (HTTP GET /health/live)
   - Readiness probes (HTTP GET /health/ready)
   - Startup probes (HTTP GET /health/startup, failureThreshold: 30)
   - Resource requests and limits
   - Rolling update strategy
   - Anti-affinity rules
2. Create Service manifests:
   - ClusterIP for internal services
   - LoadBalancer for gateway-api
3. Create Ingress with:
   - cert-manager for TLS certificates
   - Path-based routing to services
   - Rate limiting annotations
4. Create HPA manifests:
   - gateway-api: scale on CPU (70%) and memory (80%)
   - mcp-adapter: scale on custom metric (request rate)
   - search-orchestrator: VPA for vertical scaling
5. Create PDB manifests (minAvailable: 1 for all services)
6. Create NetworkPolicy manifests (zero-trust):
   - Only allow ingress from known sources
   - Only allow egress to known destinations
7. Create ConfigMaps and Secrets:
   - Application config per environment
   - Database credentials (sealed-secrets)
   - API keys (external-secrets)

### Phase 4: Helm Charts (Day 6-8)

**Objectives:**
- Package all manifests into Helm charts
- Create environment-specific overlays
- Implement chart testing

**Deliverables:**
- Helm chart per service (7 charts)
- Umbrella chart for full deployment
- values.yaml per environment (dev, staging, prod)
- Helm test hooks
- Chart documentation

**Activities:**
1. Create Helm chart structure:
   ```
   charts/
   ├── foodbot/                    # Umbrella chart
   │   ├── Chart.yaml
   │   ├── values.yaml
   │   └── charts/                 # Sub-charts
   ├── gateway-api/
   │   ├── Chart.yaml
   │   ├── values.yaml
   │   ├── values-dev.yaml
   │   ├── values-staging.yaml
   │   ├── values-prod.yaml
   │   ├── templates/
   │   │   ├── deployment.yaml
   │   │   ├── service.yaml
   │   │   ├── ingress.yaml
   │   │   ├── hpa.yaml
   │   │   ├── pdb.yaml
   │   │   ├── configmap.yaml
   │   │   ├── secret.yaml
   │   │   ├── networkpolicy.yaml
   │   │   └── tests/
   │   │       └── test-connection.yaml
   │   └── .helmignore
   ├── mcp-adapter/
   ├── mcp-orchestrator/
   ├── search-orchestrator/
   ├── notification-service/
   ├── customer-app/
   └── restaurant-app/
   ```
2. Templatize all manifests with Helm values
3. Create environment-specific values files
4. Create Helm test hooks for each chart
5. Create umbrella chart with dependencies
6. Run `helm lint` on all charts
7. Run `helm test` for each chart
8. Document chart usage and configuration

### Phase 5: CI/CD Pipeline (Day 8-9)

**Objectives:**
- Implement GitHub Actions CI/CD pipeline
- Set up parallel builds and deployments
- Implement rollback automation

**Deliverables:**
- GitHub Actions workflow files
- Build pipeline (lint, test, build, scan, push)
- Deploy pipeline (dev, staging, prod)
- Rollback workflow
- Notification configuration

**Activities:**
1. Create `.github/workflows/ci.yml`:
   - Trigger on PR and push to main
   - Matrix build for all services
   - Parallel execution of independent steps
   - Cache Docker layers and npm dependencies
2. Create `.github/workflows/deploy.yml`:
   - Environment-specific deployment (dev/staging/prod)
   - Helm upgrade with atomic flag
   - Post-deploy smoke tests
   - Rollback on failure
3. Create `.github/workflows/rollback.yml`:
   - Manual trigger with version input
   - Helm rollback to specified revision
   - Notification on rollback
4. Configure notifications:
   - Slack webhook for build/deploy status
   - GitHub deployment environments
5. Set up branch protection rules:
   - Require CI passing before merge
   - Require review approval

### Phase 6: Testing & Validation (Day 9-10)

**Objectives:**
- Validate entire deployment pipeline end-to-end
- Load test the cluster
- Document operational procedures

**Deliverables:**
- E2E deployment test results
- Load test results (1000 req/s target)
- Blue/green deployment test results
- Rollback test results
- Operations runbook (final)
- Monitoring dashboard screenshots

**Activities:**
1. Deploy full stack to staging environment
2. Run smoke tests against all services
3. Execute blue/green deployment test:
   - Deploy v2 alongside v1
   - Switch traffic to v2
   - Verify zero downtime
   - Rollback to v1
4. Execute rollback test:
   - Introduce failing deployment
   - Verify automatic rollback
   - Verify service continuity
5. Run load test:
   - Target: 1000 req/s sustained
   - Verify HPA scales up
   - Monitor resource utilization
   - Check for memory leaks
6. Verify monitoring integration:
   - Prometheus scraping all services
   - Grafana dashboards showing metrics
   - AlertManager rules firing correctly
7. Security validation:
   - Trivy scan all images
   - Verify network policies blocking unauthorized traffic
   - Verify secrets encryption
8. Document operations runbook:
   - Deployment procedures
   - Rollback procedures
   - Scaling procedures
   - Troubleshooting guides
   - On-call response procedures

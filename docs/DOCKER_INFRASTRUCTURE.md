# FoodBot Docker Infrastructure - Complete Setup

## Overview

This document provides a comprehensive overview of the production-grade Docker infrastructure created for the FoodBot project.

---

## Infrastructure Components

### 1. Optimized Dockerfiles

Multi-stage production-ready Dockerfiles with security best practices:

#### Backend Services
- **Gateway API**: `/apps/gateway-api/Dockerfile`
  - Multi-stage build (base → dependencies → builder → runner)
  - Non-root user (uid 1001)
  - Health checks built-in
  - Resource-optimized (Node 20 Alpine)
  - Tini init system for proper signal handling

- **Search Orchestrator**: `/services/search-orchestrator/Dockerfile`
  - Production-optimized build
  - Minimal attack surface
  - Health check endpoint

- **MCP Adapter**: `/services/mcp-adapter/Dockerfile.prod`
  - Lightweight Alpine-based image
  - Security hardened

- **Notification Service**: `/services/notification-service/Dockerfile`
  - Event-driven architecture support
  - Kafka integration ready

#### Frontend Applications
- **Customer App**: `/apps/customer-app/Dockerfile`
  - React production build
  - Nginx static file serving
  - Gzip compression enabled
  - Custom Nginx configuration
  - Security headers configured

- **Restaurant App**: `/apps/restaurant-app/Dockerfile`
  - Similar to Customer App
  - Separate deployment for isolation
  - Optimized for restaurant-specific features

### 2. Docker Compose Production

**File**: `/docker-compose.prod.yml`

Features:
- **High Availability**: 3 replicas of Gateway API
- **Resource Limits**: CPU and memory constraints
- **Health Checks**: All services have health monitoring
- **Restart Policies**: `unless-stopped` for resilience
- **Logging**: JSON file driver with rotation
- **Networks**: Isolated bridge network with custom subnet
- **Volumes**: Persistent storage for all stateful services

Services Included:
- Nginx Load Balancer
- Gateway API (3 instances)
- Customer App
- Restaurant App
- Search Orchestrator
- MCP Adapter
- Notification Service
- PostgreSQL (2 instances - app + temporal)
- Redis with persistence
- Temporal workflow engine
- Elasticsearch
- Kafka + Zookeeper
- Prometheus monitoring
- Grafana dashboards
- Node Exporter

Resource Allocation:
```yaml
Gateway API (per instance):
  - CPU: 0.5-1 core
  - Memory: 1-2GB

PostgreSQL:
  - CPU: 1-2 cores
  - Memory: 2-4GB

Redis:
  - CPU: 0.5-1 core
  - Memory: 1-2GB

Elasticsearch:
  - CPU: 1-2 cores
  - Memory: 2-3GB

Kafka:
  - CPU: 1-2 cores
  - Memory: 2-3GB
```

### 3. Nginx Load Balancer

**Configuration**: `/infra/nginx/`

Features:
- **Load Balancing**: Round-robin across 3 Gateway API instances
- **SSL/TLS Termination**: HTTPS with strong cipher suites
- **Gzip Compression**: 6-level compression for optimal performance
- **Rate Limiting**:
  - API: 10 req/s per IP
  - Auth: 5 req/m per IP
  - General: 100 req/s per IP
- **Security Headers**:
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Strict-Transport-Security
  - Content-Security-Policy
- **Caching**:
  - API cache: 10MB zone, 1GB max, 60m inactive
  - Static cache: 10MB zone, 2GB max, 7d inactive
- **WebSocket Support**: For real-time features
- **Health Checks**: Built-in health endpoints

Upstream Pools:
```nginx
gateway_backend: 3 instances (least_conn, keepalive 32)
search_backend: 1 instance (keepalive 16)
customer_app: 1 instance
restaurant_app: 1 instance
```

### 4. Kubernetes Manifests

**Directory**: `/k8s/`

Structure:
```
k8s/
├── base/
│   └── namespace.yaml              # Namespace definition
├── configmaps/
│   └── app-config.yaml            # Application configuration
├── secrets/
│   └── app-secrets.yaml           # Secrets (template)
├── pvc/
│   └── storage.yaml               # Persistent volume claims
├── deployments/
│   ├── gateway-api.yaml           # Gateway API deployment
│   └── postgres.yaml              # PostgreSQL StatefulSet
├── services/
│   ├── gateway-api-service.yaml   # Service definitions
│   └── postgres-service.yaml
├── ingress/
│   └── ingress.yaml               # Ingress rules with SSL
└── hpa/
    └── gateway-api-hpa.yaml       # Horizontal Pod Autoscaler
```

Key Features:
- **Anti-Affinity**: Pods spread across nodes
- **Resource Limits**: Requests and limits defined
- **Health Probes**: Liveness and readiness checks
- **Security Context**: Non-root, no privilege escalation
- **Auto-scaling**: HPA with CPU, memory, and custom metrics
- **Rolling Updates**: Zero-downtime deployments
- **Ingress**: Nginx ingress with TLS, rate limiting, CORS

HPA Configuration:
```yaml
Gateway API:
  - Min: 3 replicas
  - Max: 10 replicas
  - CPU: 70%
  - Memory: 80%
  - Custom: 100 req/s per pod

Search Orchestrator:
  - Min: 2 replicas
  - Max: 8 replicas
  - CPU: 70%
  - Memory: 75%
```

### 5. Helm Charts

**Directory**: `/helm/foodbot/`

Features:
- **Parameterized Deployment**: Easy customization via values.yaml
- **Dependency Management**: Bitnami charts for databases
- **Environment Profiles**: Dev, staging, production
- **Version Management**: Chart version tracking
- **Rollback Support**: Easy version rollback

Dependencies:
- PostgreSQL (Bitnami)
- Redis (Bitnami)
- Kafka (Bitnami)
- Elasticsearch (Bitnami)

Customizable Values:
- Replica counts
- Resource limits
- Image tags
- Environment variables
- Ingress configuration
- Auto-scaling parameters
- Storage sizes
- Service types

### 6. Monitoring & Observability

#### Prometheus Configuration

**File**: `/infra/prometheus/prometheus.yml`

Scrape Targets:
- Gateway API (all 3 instances)
- Search Orchestrator
- MCP Adapter
- Notification Service
- PostgreSQL Exporter
- Redis Exporter
- Kafka Exporter
- Elasticsearch Exporter
- Node Exporter
- Nginx Exporter
- Kubernetes API Server
- Kubernetes Nodes
- Kubernetes Pods

Metrics Collection:
- Every 15 seconds
- 30-day retention
- Automatic service discovery for K8s

#### Alert Rules

**File**: `/infra/prometheus/alerts/api-alerts.yml`

Alerts Configured:
1. **HighErrorRate**: Error rate > 5% for 5 minutes
2. **HighResponseTime**: p95 > 500ms for 5 minutes
3. **ServiceDown**: Service unreachable for 2 minutes
4. **HighCPUUsage**: CPU > 80% for 10 minutes
5. **HighMemoryUsage**: Memory > 85% for 10 minutes
6. **DatabaseConnectionPoolExhausted**: Connections > 80%
7. **RedisHighMemoryUsage**: Redis memory > 85%
8. **KafkaConsumerLag**: Lag > 1000 messages
9. **ElasticsearchClusterNotHealthy**: Cluster not green
10. **TooManyPodsPending**: > 5 pods pending
11. **DeploymentRolloutStuck**: Rollout stuck for 15 minutes

#### Grafana Dashboards

**Configuration**: `/infra/grafana/provisioning/`

Pre-configured:
- Prometheus datasource
- Service health dashboards
- Resource utilization graphs
- API performance metrics
- Database performance
- Kafka metrics
- Kubernetes cluster overview

### 7. Deployment Scripts

#### Docker Build Script

**File**: `/scripts/docker-build.sh`

Features:
- Builds all services in sequence
- Supports custom registry and tags
- Multi-platform builds
- Build validation
- Error handling
- Progress reporting

Usage:
```bash
./scripts/docker-build.sh
DOCKER_REGISTRY=myregistry.com IMAGE_TAG=v1.0.0 ./scripts/docker-build.sh
```

#### Docker Push Script

**File**: `/scripts/docker-push.sh`

Features:
- Pushes all images to registry
- Registry authentication
- Push validation
- Error handling

Usage:
```bash
DOCKER_REGISTRY=myregistry.com ./scripts/docker-push.sh
```

#### Kubernetes Deploy Script

**File**: `/scripts/k8s-deploy.sh`

Features:
- Step-by-step deployment
- Dependency ordering
- Health check waiting
- Dry-run support
- Status reporting

Usage:
```bash
./scripts/k8s-deploy.sh
K8S_CONTEXT=production-cluster ./scripts/k8s-deploy.sh
DRY_RUN=true ./scripts/k8s-deploy.sh
```

#### Helm Deploy Script

**File**: `/scripts/helm-deploy.sh`

Features:
- Helm chart validation
- Repository management
- Upgrade with rollback
- Custom values support
- Status reporting

Usage:
```bash
./scripts/helm-deploy.sh
HELM_VALUES_FILE=values.prod.yaml ./scripts/helm-deploy.sh
```

---

## Architecture Highlights

### Security
1. **Non-root Containers**: All services run as uid 1001
2. **Read-only Root Filesystem**: Where applicable
3. **No Privilege Escalation**: Capabilities dropped
4. **Secrets Management**: Kubernetes secrets / environment variables
5. **Network Policies**: Isolated network segments
6. **TLS Everywhere**: HTTPS with strong ciphers
7. **Security Headers**: XSS, CSRF, Clickjacking protection
8. **Rate Limiting**: DDoS protection

### Performance
1. **Multi-stage Builds**: Minimal image sizes
2. **Caching Layers**: Optimized Docker layer caching
3. **Connection Pooling**: Database and Redis connections
4. **Load Balancing**: Nginx with least_conn algorithm
5. **Gzip Compression**: Reduced bandwidth usage
6. **Static Asset Caching**: Browser and proxy caching
7. **Resource Limits**: Prevent resource exhaustion
8. **Auto-scaling**: Dynamic scaling based on load

### Reliability
1. **Health Checks**: All services monitored
2. **Restart Policies**: Automatic recovery
3. **Rolling Updates**: Zero-downtime deployments
4. **Readiness Probes**: Traffic only to ready pods
5. **Liveness Probes**: Automatic pod restart
6. **Persistent Volumes**: Data durability
7. **Backups**: Automated backup strategies
8. **Monitoring**: 24/7 observability

### Scalability
1. **Horizontal Scaling**: HPA for dynamic scaling
2. **Stateless Services**: Easy replication
3. **Message Queues**: Async processing with Kafka
4. **Caching**: Redis for performance
5. **Search**: Elasticsearch for fast queries
6. **Load Balancing**: Distribute traffic evenly
7. **Database Replication**: Read replicas for scale
8. **CDN Ready**: Static assets optimized

---

## Quick Start Commands

### Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f gateway-api

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale gateway-api=5

# Stop all
docker-compose -f docker-compose.prod.yml down
```

### Kubernetes

```bash
# Deploy
./scripts/k8s-deploy.sh

# Check pods
kubectl get pods -n foodbot

# View logs
kubectl logs -f -l app=gateway-api -n foodbot

# Scale
kubectl scale deployment gateway-api --replicas=5 -n foodbot

# Delete
kubectl delete namespace foodbot
```

### Helm

```bash
# Deploy
helm install foodbot helm/foodbot --namespace foodbot --create-namespace

# Upgrade
helm upgrade foodbot helm/foodbot -n foodbot

# Status
helm status foodbot -n foodbot

# Rollback
helm rollback foodbot 1 -n foodbot

# Uninstall
helm uninstall foodbot -n foodbot
```

---

## Support & Documentation

- **Full Guide**: `/README.docker.md`
- **Development Guide**: `/README.md`
- **Deployment Scripts**: `/scripts/`
- **Configuration Files**: `/infra/`

---

**Created**: 2026-02-19
**Version**: 1.0.0
**Status**: Production-Ready

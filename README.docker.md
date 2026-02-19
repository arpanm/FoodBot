# FoodBot Docker Deployment Guide

Complete guide for deploying FoodBot using Docker, Docker Compose, and Kubernetes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Build](#docker-build)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Helm Deployment](#helm-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Docker**: >= 24.0
- **Docker Compose**: >= 2.20
- **kubectl**: >= 1.28 (for Kubernetes)
- **Helm**: >= 3.12 (for Helm deployment)
- **pnpm**: >= 8.0 (for building)

### System Requirements

**Development:**
- CPU: 4+ cores
- RAM: 8GB minimum, 16GB recommended
- Disk: 20GB free space

**Production:**
- CPU: 16+ cores
- RAM: 32GB minimum, 64GB recommended
- Disk: 100GB+ free space

---

## Docker Build

### Build All Images

```bash
# Build all production images
./scripts/docker-build.sh

# Build with custom registry and tag
DOCKER_REGISTRY=myregistry.com IMAGE_TAG=v1.0.0 ./scripts/docker-build.sh

# Build for specific platform
BUILD_PLATFORM=linux/arm64 ./scripts/docker-build.sh
```

### Build Individual Services

```bash
# Gateway API
docker build -f apps/gateway-api/Dockerfile -t foodbot/gateway-api:latest .

# Customer App
docker build -f apps/customer-app/Dockerfile -t foodbot/customer-app:latest .

# Restaurant App
docker build -f apps/restaurant-app/Dockerfile -t foodbot/restaurant-app:latest .

# Search Orchestrator
docker build -f services/search-orchestrator/Dockerfile -t foodbot/search-orchestrator:latest .

# MCP Adapter
docker build -f services/mcp-adapter/Dockerfile.prod -t foodbot/mcp-adapter:latest .

# Notification Service
docker build -f services/notification-service/Dockerfile -t foodbot/notification-service:latest .
```

### Push to Registry

```bash
# Configure registry
export DOCKER_REGISTRY=myregistry.com
export REGISTRY_USERNAME=myuser
export REGISTRY_PASSWORD=mypass

# Push all images
./scripts/docker-push.sh
```

---

## Docker Compose Deployment

### Development Environment

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis temporal

# View logs
docker-compose logs -f gateway-api

# Stop all services
docker-compose down

# Clean up everything (including volumes)
docker-compose down -v
```

### Production Environment

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale gateway-api=5

# Check health status
docker-compose -f docker-compose.prod.yml ps

# View resource usage
docker stats
```

### Environment Variables

Create `.env` file:

```env
# Database
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password

# Redis
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-super-secret-jwt-key

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-smtp-password

# SMS Provider
SMS_PROVIDER_API_KEY=your-sms-api-key

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=your-grafana-password
```

---

## Kubernetes Deployment

### Manual Deployment

```bash
# Deploy using kubectl
./scripts/k8s-deploy.sh

# Deploy to specific context
K8S_CONTEXT=production-cluster ./scripts/k8s-deploy.sh

# Dry run
DRY_RUN=true ./scripts/k8s-deploy.sh
```

### Step-by-Step Deployment

```bash
# 1. Create namespace
kubectl apply -f k8s/base/namespace.yaml

# 2. Create ConfigMaps
kubectl apply -f k8s/configmaps/

# 3. Create Secrets (update values first!)
kubectl apply -f k8s/secrets/

# 4. Create PVCs
kubectl apply -f k8s/pvc/

# 5. Deploy databases
kubectl apply -f k8s/deployments/postgres.yaml
kubectl apply -f k8s/services/postgres-service.yaml

# Wait for databases
kubectl wait --for=condition=ready pod -l app=postgres -n foodbot --timeout=300s

# 6. Deploy applications
kubectl apply -f k8s/deployments/gateway-api.yaml
kubectl apply -f k8s/services/gateway-api-service.yaml

# 7. Configure ingress
kubectl apply -f k8s/ingress/

# 8. Configure auto-scaling
kubectl apply -f k8s/hpa/
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n foodbot

# Check services
kubectl get services -n foodbot

# Check ingress
kubectl get ingress -n foodbot

# View logs
kubectl logs -f -l app=gateway-api -n foodbot

# Describe pod
kubectl describe pod <pod-name> -n foodbot
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment gateway-api --replicas=5 -n foodbot

# Check HPA status
kubectl get hpa -n foodbot

# View HPA details
kubectl describe hpa gateway-api-hpa -n foodbot
```

---

## Helm Deployment

### Deploy with Helm

```bash
# Deploy using default values
./scripts/helm-deploy.sh

# Deploy with custom values
HELM_VALUES_FILE=values.prod.yaml ./scripts/helm-deploy.sh

# Dry run
DRY_RUN=true ./scripts/helm-deploy.sh
```

### Custom Values

Create `values.prod.yaml`:

```yaml
global:
  environment: production

gatewayApi:
  replicaCount: 5
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi

postgresql:
  auth:
    password: your-secure-password
  primary:
    persistence:
      size: 50Gi
```

Deploy with custom values:

```bash
helm upgrade --install foodbot helm/foodbot \
  --namespace foodbot \
  --values values.prod.yaml \
  --create-namespace \
  --wait
```

### Helm Commands

```bash
# List releases
helm list -n foodbot

# Get release status
helm status foodbot -n foodbot

# Upgrade release
helm upgrade foodbot helm/foodbot -n foodbot

# Rollback release
helm rollback foodbot 1 -n foodbot

# Uninstall release
helm uninstall foodbot -n foodbot
```

---

## Monitoring

### Access Monitoring Tools

**Prometheus:**
```bash
# Port forward
kubectl port-forward svc/prometheus 9090:9090 -n foodbot

# Open browser
open http://localhost:9090
```

**Grafana:**
```bash
# Port forward
kubectl port-forward svc/grafana 3000:3000 -n foodbot

# Open browser
open http://localhost:3000

# Default credentials
# Username: admin
# Password: admin (change after first login)
```

**Temporal UI:**
```bash
# Port forward
kubectl port-forward svc/temporal-ui 8080:8080 -n foodbot

# Open browser
open http://localhost:8080
```

### Metrics Endpoints

- **Gateway API**: `http://gateway-api:3000/metrics`
- **Search Orchestrator**: `http://search-orchestrator:3002/metrics`
- **MCP Adapter**: `http://mcp-adapter:8082/metrics`
- **Notification Service**: `http://notification-service:3003/metrics`

---

## Troubleshooting

### Common Issues

#### Pod stuck in Pending
```bash
# Check events
kubectl describe pod <pod-name> -n foodbot

# Check PVC status
kubectl get pvc -n foodbot

# Check node resources
kubectl top nodes
```

#### Pod CrashLoopBackOff
```bash
# View logs
kubectl logs <pod-name> -n foodbot

# View previous logs
kubectl logs <pod-name> -n foodbot --previous

# Check events
kubectl get events -n foodbot --sort-by='.lastTimestamp'
```

#### Service not accessible
```bash
# Check service
kubectl get svc -n foodbot

# Check endpoints
kubectl get endpoints -n foodbot

# Test connectivity from another pod
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
wget -O- http://gateway-api:3000/health
```

#### Database connection issues
```bash
# Check database pod
kubectl logs -f <postgres-pod> -n foodbot

# Test connection
kubectl exec -it <app-pod> -n foodbot -- sh
nc -zv foodbot-postgres 5432
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n foodbot

# Describe deployment
kubectl describe deployment gateway-api -n foodbot

# Execute command in pod
kubectl exec -it <pod-name> -n foodbot -- /bin/sh

# Port forward to service
kubectl port-forward svc/gateway-api 3000:3000 -n foodbot

# View resource usage
kubectl top pods -n foodbot
kubectl top nodes
```

### Health Checks

```bash
# Docker Compose
curl http://localhost:3000/health

# Kubernetes
kubectl port-forward svc/gateway-api 3000:3000 -n foodbot
curl http://localhost:3000/health
```

---

## Performance Tuning

### Resource Limits

Adjust in `docker-compose.prod.yml` or `k8s/deployments/`:

```yaml
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 2000m
    memory: 4Gi
```

### Auto-scaling Configuration

Edit `k8s/hpa/gateway-api-hpa.yaml`:

```yaml
minReplicas: 3
maxReplicas: 20
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

### Database Optimization

PostgreSQL settings in `docker-compose.prod.yml`:

```yaml
command:
  - "postgres"
  - "-c"
  - "max_connections=500"
  - "-c"
  - "shared_buffers=512MB"
  - "-c"
  - "effective_cache_size=2GB"
```

---

## Security Best Practices

1. **Secrets Management**: Use external secret managers (Vault, AWS Secrets Manager)
2. **Network Policies**: Implement Kubernetes Network Policies
3. **Pod Security**: Enable Pod Security Standards
4. **Image Scanning**: Scan images for vulnerabilities
5. **TLS Everywhere**: Enable TLS for all communications
6. **RBAC**: Configure Role-Based Access Control

---

## Backup and Recovery

### Database Backup

```bash
# PostgreSQL backup
kubectl exec <postgres-pod> -n foodbot -- pg_dump -U postgres foodbot > backup.sql

# Redis backup
kubectl exec <redis-pod> -n foodbot -- redis-cli SAVE
```

### Restore

```bash
# PostgreSQL restore
cat backup.sql | kubectl exec -i <postgres-pod> -n foodbot -- psql -U postgres foodbot
```

---

## Production Checklist

- [ ] Update all secrets in `k8s/secrets/`
- [ ] Configure TLS certificates
- [ ] Set up external secret manager
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts
- [ ] Configure log aggregation
- [ ] Enable network policies
- [ ] Configure resource limits
- [ ] Set up auto-scaling
- [ ] Configure ingress rate limiting
- [ ] Enable pod disruption budgets
- [ ] Test disaster recovery procedures

---

## Support

For issues and questions:
- Documentation: `./docs/`
- GitHub Issues: `https://github.com/your-org/foodbot/issues`
- Email: `devops@foodbot.com`

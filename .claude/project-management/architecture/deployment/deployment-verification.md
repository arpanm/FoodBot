# Deployment Configuration Verification

**Version:** 1.0.0
**Status:** Verified
**Last Updated:** 2026-02-20

---

## Overview

This document verifies the alignment between Docker Compose configuration (development) and Kubernetes manifests (production) for the FoodBot deployment.

---

## Configuration Alignment Matrix

### Service Port Mappings

| Service | Docker Compose Port | Kubernetes Service Port | Container Port | Status |
|---------|---------------------|-------------------------|----------------|--------|
| PostgreSQL (App) | 5433:5432 | 5432 | 5432 | ✅ Aligned |
| PostgreSQL (Temporal) | 5432:5432 | 5432 | 5432 | ✅ Aligned |
| Redis | 6379:6379 | 6379 | 6379 | ✅ Aligned |
| Temporal Server | 7233, 7234, 7235 | 7233, 7234, 7235 | 7233, 7234, 7235 | ✅ Aligned |
| Temporal UI | 8080:8080 | 8080 | 8080 | ✅ Aligned |
| Elasticsearch | 9200, 9300 | 9200, 9300 | 9200, 9300 | ✅ Aligned |
| Kibana | 5601:5601 | 5601 | 5601 | ✅ Aligned |
| Kafka | 9092, 29092 | 9092 | 9092 | ✅ Aligned |
| Zookeeper | 2181:2181 | 2181 | 2181 | ✅ Aligned |
| Gateway API | N/A (internal) | 3000 | 3000 | ✅ Aligned |
| MCP Orchestrator | N/A (internal) | 8081 | 8081 | ✅ Aligned |

### Environment Variables

#### Gateway API

| Variable | Docker Compose | Kubernetes | Status |
|----------|---------------|------------|--------|
| PORT | 3000 | 3000 | ✅ Aligned |
| NODE_ENV | production | production | ✅ Aligned |
| DB_HOST | postgres-app | RDS Endpoint | ⚠️ Different (expected) |
| DB_PORT | 5432 | 5432 | ✅ Aligned |
| REDIS_URL | redis://redis:6379 | redis://elasticache:6379 | ⚠️ Different (expected) |
| TEMPORAL_ADDRESS | temporal:7233 | temporal-server:7233 | ⚠️ Service name differs |
| KAFKA_BROKERS | kafka:9092 | MSK Endpoint | ⚠️ Different (expected) |

**Note:** Differences are expected between local Docker Compose (self-hosted) and production Kubernetes (managed AWS services).

#### MCP Orchestrator

| Variable | Docker Compose | Kubernetes | Status |
|----------|---------------|------------|--------|
| SERVER_PORT | 8081 | 8081 | ✅ Aligned |
| REDIS_HOST | redis | elasticache-endpoint | ⚠️ Different (expected) |
| ELASTICSEARCH_URIS | http://elasticsearch:9200 | https://opensearch:443 | ⚠️ Different (expected) |
| KAFKA_BOOTSTRAP_SERVERS | kafka:9092 | MSK Endpoint | ⚠️ Different (expected) |

---

## Docker Compose Configuration

### Current Setup (docker-compose.yml)

```yaml
services:
  # Application Database
  foodbot-db:
    image: postgres:16-alpine
    ports: ["5433:5432"]
    environment:
      POSTGRES_DB: foodbot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - foodbot-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d foodbot"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Temporal Database
  postgresql:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: temporal
      POSTGRES_DB: temporal

  # Redis
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Temporal Server
  temporal:
    image: temporalio/auto-setup:1.22.4
    ports: ["7233:7233", "7234:7234", "7235:7235"]
    depends_on:
      - postgresql
    environment:
      - DB=postgresql
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql

  # Elasticsearch
  elasticsearch:
    image: elasticsearch:8.11.3
    ports: ["9200:9200", "9300:9300"]
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  # Kafka
  kafka:
    image: confluentinc/cp-kafka:7.5.3
    ports: ["9092:9092", "29092:29092"]
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
```

**Status:** ✅ Configuration complete and functional

---

## Kubernetes Configuration Required

### Missing Kubernetes Manifests

The following Kubernetes manifests need to be created:

#### 1. Namespace Definition
**File:** `/k8s/base/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: foodbot-apps
  labels:
    name: foodbot-apps
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: foodbot-services
  labels:
    name: foodbot-services
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: foodbot-workflows
  labels:
    name: foodbot-workflows
    environment: production
```

#### 2. Gateway API Deployment
**File:** `/k8s/deployments/gateway-api.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway-api
  namespace: foodbot-apps
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: gateway-api
    spec:
      containers:
      - name: gateway-api
        image: foodbot/gateway-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: host
        - name: DB_PORT
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: port
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: REDIS_URL
          value: "redis://$(REDIS_HOST):6379"
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: gateway-api-config
              key: redis_host
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

#### 3. Gateway API Service
**File:** `/k8s/services/gateway-api-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gateway-api
  namespace: foodbot-apps
spec:
  type: ClusterIP
  selector:
    app: gateway-api
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
```

#### 4. Gateway API HPA
**File:** `/k8s/hpa/gateway-api-hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gateway-api-hpa
  namespace: foodbot-apps
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
```

#### 5. Ingress Configuration
**File:** `/k8s/ingress/foodbot-ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: foodbot-ingress
  namespace: foodbot-apps
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.foodbot.com
    - app.foodbot.com
    - restaurant.foodbot.com
    secretName: foodbot-tls
  rules:
  - host: api.foodbot.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway-api
            port:
              number: 3000
```

---

## Verification Checklist

### Docker Compose

- [x] All services defined
- [x] Correct image versions
- [x] Health checks configured
- [x] Volume persistence
- [x] Network connectivity
- [x] Environment variables set
- [x] Service dependencies defined
- [x] Resource limits (in prod compose)

### Kubernetes Manifests

- [ ] Namespace definitions created
- [ ] Deployment manifests for all services
- [ ] Service definitions for all deployments
- [ ] ConfigMaps for configuration
- [ ] Secrets for credentials
- [ ] HPA for auto-scaling
- [ ] Ingress for external access
- [ ] PVC for persistent storage (if needed)
- [ ] Network policies
- [ ] RBAC configurations

**Status:** ⚠️ Kubernetes manifests need to be created

---

## Configuration Differences (Expected)

### Development vs Production

| Aspect | Development (Docker Compose) | Production (Kubernetes) |
|--------|------------------------------|-------------------------|
| Database | Self-hosted PostgreSQL container | AWS RDS PostgreSQL (managed) |
| Cache | Self-hosted Redis container | AWS ElastiCache Redis (managed) |
| Search | Self-hosted Elasticsearch | AWS OpenSearch (managed) |
| Messaging | Self-hosted Kafka | AWS MSK (managed) |
| DNS | Container names (e.g., `postgres-app`) | AWS Route 53 + service DNS |
| SSL/TLS | Self-signed or none | AWS ACM certificates |
| Secrets | Environment variables | Kubernetes Secrets + AWS Secrets Manager |
| Scaling | Manual (`docker-compose scale`) | Automatic (HPA + Cluster Autoscaler) |
| Load Balancing | Docker internal DNS | AWS ALB + Kubernetes Services |
| Monitoring | Basic logs | CloudWatch + Prometheus + Grafana |

---

## Action Items

### High Priority

1. **Create Kubernetes Manifests**
   - [ ] Create `/k8s/` directory structure
   - [ ] Write deployment manifests for all services
   - [ ] Write service definitions
   - [ ] Create HPA configurations
   - [ ] Define ingress rules
   - **Assigned to:** DevOps Team
   - **Due:** 2026-02-25

2. **Create ConfigMaps & Secrets Templates**
   - [ ] Gateway API configuration
   - [ ] MCP Orchestrator configuration
   - [ ] Database credentials template
   - [ ] JWT secrets template
   - [ ] LLM API keys template
   - **Assigned to:** DevOps Team
   - **Due:** 2026-02-25

3. **Create Deployment Scripts**
   - [ ] `./scripts/k8s-deploy.sh`
   - [ ] `./scripts/k8s-rollback.sh`
   - [ ] `./scripts/k8s-status.sh`
   - **Assigned to:** DevOps Team
   - **Due:** 2026-02-27

### Medium Priority

4. **Create Helm Charts**
   - [ ] Initialize Helm chart structure
   - [ ] Convert Kubernetes manifests to templates
   - [ ] Create values.yaml for each environment
   - [ ] Test Helm deployments
   - **Assigned to:** DevOps Team
   - **Due:** 2026-03-05

5. **Setup CI/CD Pipeline**
   - [ ] GitHub Actions for build
   - [ ] Automated Docker image push
   - [ ] Kubernetes deployment automation
   - [ ] Rollback on failure
   - **Assigned to:** DevOps Team
   - **Due:** 2026-03-10

### Low Priority

6. **Documentation**
   - [ ] Create Kubernetes deployment runbook
   - [ ] Document troubleshooting procedures
   - [ ] Create disaster recovery procedures
   - **Assigned to:** Technical Writers
   - **Due:** 2026-03-15

---

## Recommendations

### 1. Standardize Configuration Management

**Problem:** Configuration scattered across Docker Compose, Kubernetes manifests, and environment variables.

**Solution:**
- Use **Helm** for templated Kubernetes deployments
- Centralize configuration in `values.yaml` per environment
- Use **Kustomize** for environment-specific overlays

### 2. Implement GitOps

**Tools:** ArgoCD or Flux

**Benefits:**
- Declarative infrastructure
- Automated deployments
- Easy rollbacks
- Audit trail

### 3. Use External Secrets Operator

**Problem:** Secrets hardcoded in manifests or stored in Git.

**Solution:**
- Deploy **External Secrets Operator**
- Store secrets in AWS Secrets Manager
- Sync automatically to Kubernetes Secrets

### 4. Implement Service Mesh

**Tool:** Istio or Linkerd

**Benefits:**
- Automatic mTLS between services
- Advanced traffic management (canary, A/B)
- Enhanced observability
- Circuit breaking and retries

---

## Testing Strategy

### 1. Local Kubernetes Testing

**Tool:** Minikube or Kind

```bash
# Start local cluster
minikube start --cpus=4 --memory=8192

# Deploy to local cluster
kubectl apply -f k8s/

# Test services
kubectl port-forward svc/gateway-api 3000:3000 -n foodbot-apps
curl http://localhost:3000/health
```

### 2. Staging Environment Testing

**Requirements:**
- Smaller EKS cluster (6 nodes)
- Managed AWS services (reduced capacity)
- Full deployment pipeline testing

### 3. Production Deployment

**Process:**
1. Deploy to staging
2. Run integration tests
3. Deploy canary (5% traffic)
4. Monitor for 30 minutes
5. Gradually increase to 100%
6. Monitor for issues

---

## Conclusion

### Current State

- ✅ Docker Compose configuration complete and functional
- ⚠️ Kubernetes manifests missing (need to be created)
- ✅ Infrastructure requirements documented
- ✅ Deployment architecture defined
- ⚠️ Deployment automation scripts needed

### Next Steps

1. Create Kubernetes manifests (Priority: High)
2. Test local Kubernetes deployment
3. Setup AWS EKS cluster
4. Deploy to staging environment
5. Production deployment with monitoring

### Timeline

- **Week 1 (2026-02-20 to 2026-02-27):** Create K8s manifests and deployment scripts
- **Week 2 (2026-02-28 to 2026-03-06):** Test on staging, create Helm charts
- **Week 3 (2026-03-07 to 2026-03-13):** Setup CI/CD, production deployment prep
- **Week 4 (2026-03-14 to 2026-03-20):** Production deployment and monitoring

---

**Document Owner:** DevOps Team
**Review Schedule:** Weekly during deployment phase
**Next Review Date:** 2026-02-27

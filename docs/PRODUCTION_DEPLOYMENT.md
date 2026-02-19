# FoodBot Production Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19
**Target Audience:** DevOps Engineers, SREs, Release Managers

---

## Table of Contents

- [1. Prerequisites](#1-prerequisites)
- [2. Infrastructure Setup](#2-infrastructure-setup)
- [3. Environment Configuration](#3-environment-configuration)
- [4. Database Migration](#4-database-migration)
- [5. Service Deployment](#5-service-deployment)
- [6. Health Verification](#6-health-verification)
- [7. Rollback Procedures](#7-rollback-procedures)
- [8. Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### Infrastructure Requirements

#### Kubernetes Cluster

**Minimum Specifications:**
- Kubernetes version: 1.27+
- Node count: 6 minimum (3 for apps, 3 for data)
- Node size: 8 vCPU, 32 GB RAM per node
- Storage class: GP3 SSD with dynamic provisioning
- Load balancer: AWS ALB or NGINX Ingress Controller
- CNI: Calico or AWS VPC CNI
- CSI: AWS EBS CSI Driver

**Recommended Specifications (Production):**
- Node count: 12 (6 for apps, 6 for data)
- Node size: 16 vCPU, 64 GB RAM per node
- Multi-AZ deployment for high availability
- Spot instances for non-critical workloads

#### Access Requirements

- kubectl configured with cluster admin access
- Helm 3.10+ installed
- AWS CLI configured with appropriate IAM permissions
- Docker registry access (ECR, Docker Hub, or private registry)
- GitHub access for CI/CD pipelines

### External Services

| Service | Purpose | Required |
|---------|---------|----------|
| **AWS RDS PostgreSQL 16** | Application database | Yes |
| **AWS ElastiCache Redis 7** | Cache and sessions | Yes |
| **AWS OpenSearch 2.11** | Search engine | Yes |
| **AWS MSK (Kafka) 3.5** | Event streaming | Yes |
| **Temporal Cloud** | Workflow orchestration | Alternative to self-hosted |
| **AWS S3** | Backups and static assets | Yes |
| **AWS CloudFront** | CDN for frontend | Recommended |
| **AWS Route 53** | DNS management | Yes |
| **AWS Certificate Manager** | TLS certificates | Yes |
| **SendGrid** | Email delivery | Yes |
| **Twilio** | SMS delivery | Optional |
| **Stripe** | Payment processing | Yes |

---

## 2. Infrastructure Setup

### Step 1: Create Namespaces

```bash
# Create Kubernetes namespaces
kubectl create namespace foodbot-apps
kubectl create namespace foodbot-services
kubectl create namespace foodbot-workflows
kubectl create namespace foodbot-data
kubectl create namespace foodbot-monitoring

# Label namespaces
kubectl label namespace foodbot-apps environment=production
kubectl label namespace foodbot-services environment=production
kubectl label namespace foodbot-workflows environment=production
kubectl label namespace foodbot-data environment=production tier=database
kubectl label namespace foodbot-monitoring environment=production tier=observability
```

### Step 2: Setup RBAC

```bash
# Create service accounts
kubectl create serviceaccount -n foodbot-apps gateway-api-sa
kubectl create serviceaccount -n foodbot-services mcp-orchestrator-sa
kubectl create serviceaccount -n foodbot-workflows temporal-worker-sa

# Apply RBAC policies
kubectl apply -f k8s/rbac/
```

Example RBAC policy (`k8s/rbac/gateway-api-role.yaml`):
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: gateway-api-role
  namespace: foodbot-apps
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gateway-api-rolebinding
  namespace: foodbot-apps
subjects:
  - kind: ServiceAccount
    name: gateway-api-sa
    namespace: foodbot-apps
roleRef:
  kind: Role
  name: gateway-api-role
  apiGroup: rbac.authorization.k8s.io
```

### Step 3: Setup Secrets

```bash
# Create database secrets
kubectl create secret generic postgres-credentials \
  --from-literal=username=foodbot_user \
  --from-literal=password='<STRONG_PASSWORD>' \
  --from-literal=host=foodbot-postgres.cluster-xxx.us-east-1.rds.amazonaws.com \
  --from-literal=port=5432 \
  --from-literal=database=foodbot \
  -n foodbot-apps

# Create JWT secrets
kubectl create secret generic jwt-secrets \
  --from-literal=jwt-secret='<GENERATED_SECRET_32_CHARS>' \
  --from-literal=jwt-refresh-secret='<GENERATED_REFRESH_SECRET_32_CHARS>' \
  -n foodbot-apps

# Create LLM API keys
kubectl create secret generic llm-api-keys \
  --from-literal=anthropic-api-key='<ANTHROPIC_KEY>' \
  --from-literal=openai-api-key='<OPENAI_KEY>' \
  --from-literal=gemini-api-key='<GEMINI_KEY>' \
  -n foodbot-apps

# Create Redis password
kubectl create secret generic redis-credentials \
  --from-literal=password='<REDIS_PASSWORD>' \
  -n foodbot-apps

# Create Stripe API keys
kubectl create secret generic stripe-credentials \
  --from-literal=api-key='<STRIPE_SECRET_KEY>' \
  --from-literal=webhook-secret='<STRIPE_WEBHOOK_SECRET>' \
  -n foodbot-apps

# Create SendGrid API key
kubectl create secret generic sendgrid-credentials \
  --from-literal=api-key='<SENDGRID_API_KEY>' \
  -n foodbot-services
```

**Secret Generation:**
```bash
# Generate strong secrets
openssl rand -base64 32  # For JWT secrets
openssl rand -hex 32     # For Redis password
```

### Step 4: Setup ConfigMaps

```bash
# Create application config
kubectl create configmap gateway-api-config \
  --from-literal=PORT=3000 \
  --from-literal=NODE_ENV=production \
  --from-literal=LOG_LEVEL=info \
  --from-literal=DB_POOL_SIZE=20 \
  --from-literal=DB_CONNECTION_TIMEOUT=10000 \
  --from-literal=ALLOWED_ORIGINS='https://app.foodbot.com,https://restaurant.foodbot.com' \
  -n foodbot-apps

# Create MCP Orchestrator config
kubectl create configmap mcp-orchestrator-config \
  --from-literal=SERVER_PORT=8081 \
  --from-literal=SPRING_PROFILES_ACTIVE=production \
  --from-literal=ELASTICSEARCH_URIS=https://foodbot-es.us-east-1.es.amazonaws.com \
  --from-literal=KAFKA_BOOTSTRAP_SERVERS=b-1.foodbot-msk.kafka.us-east-1.amazonaws.com:9092 \
  -n foodbot-services
```

### Step 5: Install Infrastructure Components

#### PostgreSQL (AWS RDS)

```bash
# Create RDS instance via AWS CLI
aws rds create-db-instance \
  --db-instance-identifier foodbot-postgres-prod \
  --db-instance-class db.r6g.2xlarge \
  --engine postgres \
  --engine-version 16.1 \
  --master-username foodbot_admin \
  --master-user-password '<STRONG_PASSWORD>' \
  --allocated-storage 500 \
  --storage-type gp3 \
  --storage-encrypted \
  --multi-az \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name foodbot-db-subnet-group \
  --parameter-group-name foodbot-postgres-params \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --tags Key=Environment,Value=production Key=Application,Value=foodbot
```

#### Redis (AWS ElastiCache)

```bash
# Create Redis cluster
aws elasticache create-replication-group \
  --replication-group-id foodbot-redis-prod \
  --replication-group-description "FoodBot production Redis" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r7g.xlarge \
  --num-cache-clusters 3 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --cache-subnet-group-name foodbot-redis-subnet-group \
  --security-group-ids sg-yyy \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token '<REDIS_AUTH_TOKEN>' \
  --snapshot-retention-limit 7 \
  --snapshot-window "02:00-03:00" \
  --tags Key=Environment,Value=production Key=Application,Value=foodbot
```

#### Elasticsearch (AWS OpenSearch)

```bash
# Create OpenSearch domain
aws opensearch create-domain \
  --domain-name foodbot-search-prod \
  --engine-version OpenSearch_2.11 \
  --cluster-config InstanceType=r6g.xlarge.search,InstanceCount=3,DedicatedMasterEnabled=true,DedicatedMasterType=r6g.large.search,DedicatedMasterCount=3,ZoneAwarenessEnabled=true,ZoneAwarenessConfig={AvailabilityZoneCount=3} \
  --ebs-options EBSEnabled=true,VolumeType=gp3,VolumeSize=500 \
  --access-policies '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"*"},"Action":"es:*","Resource":"arn:aws:es:us-east-1:123456789012:domain/foodbot-search-prod/*"}]}' \
  --vpc-options SubnetIds=subnet-xxx,subnet-yyy,subnet-zzz,SecurityGroupIds=sg-zzz \
  --encryption-at-rest-options Enabled=true \
  --node-to-node-encryption-options Enabled=true \
  --domain-endpoint-options EnforceHTTPS=true,TLSSecurityPolicy=Policy-Min-TLS-1-2-2019-07 \
  --snapshot-options AutomatedSnapshotStartHour=1 \
  --tags Key=Environment,Value=production Key=Application,Value=foodbot
```

#### Kafka (AWS MSK)

```bash
# Create MSK cluster
aws kafka create-cluster-v2 \
  --cluster-name foodbot-kafka-prod \
  --kafka-version 3.5.1 \
  --provisioned Provisioned={BrokerNodeGroupInfo={InstanceType=kafka.m5.2xlarge,ClientSubnets=[subnet-aaa,subnet-bbb,subnet-ccc],SecurityGroups=[sg-www],StorageInfo={EbsStorageInfo={VolumeSize=1000}}},NumberOfBrokerNodes=6,EncryptionInfo={EncryptionAtRest={DataVolumeKMSKeyId=arn:aws:kms:us-east-1:123456789012:key/xxx},EncryptionInTransit={ClientBroker=TLS,InCluster=true}}} \
  --tags Environment=production,Application=foodbot
```

#### Temporal Server (Self-Hosted)

```yaml
# k8s/temporal/temporal-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-server
  namespace: foodbot-workflows
spec:
  replicas: 3
  selector:
    matchLabels:
      app: temporal-server
  template:
    metadata:
      labels:
        app: temporal-server
    spec:
      containers:
      - name: temporal
        image: temporalio/auto-setup:1.22.4
        ports:
        - containerPort: 7233
          name: grpc
        - containerPort: 7234
          name: http
        - containerPort: 7235
          name: metrics
        env:
        - name: DB
          value: "postgresql"
        - name: DB_PORT
          value: "5432"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PWD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: POSTGRES_SEEDS
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: host
        - name: DYNAMIC_CONFIG_FILE_PATH
          value: config/dynamicconfig/production.yaml
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - "tctl --address temporal-server:7233 cluster health | grep SERVING"
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - "tctl --address temporal-server:7233 cluster health | grep SERVING"
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: temporal-server
  namespace: foodbot-workflows
spec:
  type: ClusterIP
  ports:
  - port: 7233
    targetPort: 7233
    name: grpc
  - port: 7234
    targetPort: 7234
    name: http
  - port: 7235
    targetPort: 7235
    name: metrics
  selector:
    app: temporal-server
```

```bash
# Deploy Temporal Server
kubectl apply -f k8s/temporal/
```

---

## 3. Environment Configuration

### Gateway API Environment Variables

Create `k8s/apps/gateway-api-deployment.yaml`:

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
  template:
    metadata:
      labels:
        app: gateway-api
        version: v1.0.0
    spec:
      serviceAccountName: gateway-api-sa
      containers:
      - name: gateway-api
        image: foodbot/gateway-api:v1.0.0
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: gateway-api-config
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secrets
              key: jwt-secret
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secrets
              key: jwt-refresh-secret
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
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: database
        - name: REDIS_HOST
          value: "foodbot-redis.cache.amazonaws.com"
        - name: REDIS_PORT
          value: "6379"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: password
        - name: TEMPORAL_ADDRESS
          value: "temporal-server.foodbot-workflows.svc.cluster.local:7233"
        - name: KAFKA_BROKERS
          value: "b-1.foodbot-msk.kafka.us-east-1.amazonaws.com:9092,b-2.foodbot-msk.kafka.us-east-1.amazonaws.com:9092"
        - name: ELASTICSEARCH_URL
          value: "https://foodbot-search.us-east-1.es.amazonaws.com"
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-api-keys
              key: anthropic-api-key
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-api-keys
              key: openai-api-key
        - name: STRIPE_API_KEY
          valueFrom:
            secretKeyRef:
              name: stripe-credentials
              key: api-key
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
        startupProbe:
          httpGet:
            path: /health/live
            port: 3000
          failureThreshold: 30
          periodSeconds: 5
```

---

## 4. Database Migration

### Pre-Deployment Database Setup

#### Step 1: Create Database Schema

```bash
# Connect to RDS PostgreSQL
PGPASSWORD='<PASSWORD>' psql -h foodbot-postgres.cluster-xxx.us-east-1.rds.amazonaws.com -U foodbot_admin -d postgres

# Create application database and user
CREATE DATABASE foodbot;
CREATE USER foodbot_user WITH ENCRYPTED PASSWORD '<USER_PASSWORD>';
GRANT ALL PRIVILEGES ON DATABASE foodbot TO foodbot_user;

# Enable required extensions
\c foodbot
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search
CREATE EXTENSION IF NOT EXISTS "postgis";  -- For geo-spatial queries

# Grant permissions
GRANT ALL ON SCHEMA public TO foodbot_user;
```

#### Step 2: Run TypeORM Migrations

```bash
# Build migration runner container
docker build -t foodbot/migration-runner -f docker/Dockerfile.migrations .

# Run migrations
kubectl run migration-runner \
  --image=foodbot/migration-runner:latest \
  --restart=Never \
  --env="DB_HOST=$(kubectl get secret postgres-credentials -n foodbot-apps -o jsonpath='{.data.host}' | base64 -d)" \
  --env="DB_PASSWORD=$(kubectl get secret postgres-credentials -n foodbot-apps -o jsonpath='{.data.password}' | base64 -d)" \
  --command -- npm run migration:run

# Wait for completion
kubectl wait --for=condition=complete pod/migration-runner --timeout=300s

# Check logs
kubectl logs migration-runner

# Cleanup
kubectl delete pod migration-runner
```

#### Step 3: Seed Initial Data (Optional)

```bash
# Run seed job
kubectl run seed-runner \
  --image=foodbot/seed-runner:latest \
  --restart=Never \
  --env="DB_HOST=..." \
  --command -- npm run seed:production

kubectl wait --for=condition=complete pod/seed-runner --timeout=600s
kubectl logs seed-runner
kubectl delete pod seed-runner
```

### Migration Safety Checklist

- [ ] Backup database before migration
- [ ] Test migration on staging environment
- [ ] Review migration SQL for destructive operations
- [ ] Ensure migrations are reversible
- [ ] Monitor migration execution time (< 5 minutes)
- [ ] Verify data integrity after migration
- [ ] Document rollback procedure

---

## 5. Service Deployment

### Deployment Order

Deploy services in this order to respect dependencies:

1. **Infrastructure** (PostgreSQL, Redis, Elasticsearch, Kafka) - Already deployed
2. **Temporal Server** - Already deployed
3. **Gateway API** - Core API
4. **MCP Orchestrator** - Search service
5. **Temporal Workers** - Workflow execution
6. **Notification Service** - Event consumers
7. **Frontend Apps** - Customer and Restaurant apps

### Deploy Gateway API

```bash
# Apply deployment
kubectl apply -f k8s/apps/gateway-api-deployment.yaml
kubectl apply -f k8s/apps/gateway-api-service.yaml
kubectl apply -f k8s/apps/gateway-api-hpa.yaml

# Wait for rollout
kubectl rollout status deployment/gateway-api -n foodbot-apps

# Verify pods are running
kubectl get pods -n foodbot-apps -l app=gateway-api

# Check logs
kubectl logs -n foodbot-apps deployment/gateway-api --tail=50
```

### Deploy MCP Orchestrator (Java/Spring Boot)

```yaml
# k8s/services/mcp-orchestrator-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-orchestrator
  namespace: foodbot-services
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcp-orchestrator
  template:
    metadata:
      labels:
        app: mcp-orchestrator
    spec:
      containers:
      - name: mcp-orchestrator
        image: foodbot/mcp-orchestrator:v1.0.0
        ports:
        - containerPort: 8081
        envFrom:
        - configMapRef:
            name: mcp-orchestrator-config
        env:
        - name: REDIS_HOST
          value: "foodbot-redis.cache.amazonaws.com"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: password
        - name: ELASTICSEARCH_URIS
          value: "https://foodbot-search.us-east-1.es.amazonaws.com"
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "b-1.foodbot-msk.kafka.us-east-1.amazonaws.com:9092"
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /mcp/v1/actuator/health
            port: 8081
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /mcp/v1/actuator/health
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 5
```

```bash
# Deploy MCP Orchestrator
kubectl apply -f k8s/services/mcp-orchestrator-deployment.yaml
kubectl rollout status deployment/mcp-orchestrator -n foodbot-services
```

### Deploy Temporal Workers

```bash
kubectl apply -f k8s/workflows/temporal-workers-deployment.yaml
kubectl rollout status deployment/temporal-workers -n foodbot-workflows
```

### Deploy Notification Service

```bash
kubectl apply -f k8s/services/notification-service-deployment.yaml
kubectl rollout status deployment/notification-service -n foodbot-services
```

### Deploy Frontend Apps

#### Customer App (React/Redux)

```yaml
# k8s/apps/customer-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: customer-app
  namespace: foodbot-apps
spec:
  replicas: 3
  selector:
    matchLabels:
      app: customer-app
  template:
    metadata:
      labels:
        app: customer-app
    spec:
      containers:
      - name: customer-app
        image: foodbot/customer-app:v1.0.0
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

```bash
kubectl apply -f k8s/apps/customer-app-deployment.yaml
kubectl rollout status deployment/customer-app -n foodbot-apps
```

### Setup Ingress

```yaml
# k8s/ingress/foodbot-ingress.yaml
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
  - host: app.foodbot.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: customer-app
            port:
              number: 80
  - host: restaurant.foodbot.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: restaurant-app
            port:
              number: 80
```

```bash
kubectl apply -f k8s/ingress/foodbot-ingress.yaml
```

---

## 6. Health Verification

### Post-Deployment Checks

#### 1. Check All Pods are Running

```bash
# Check all namespaces
kubectl get pods -n foodbot-apps
kubectl get pods -n foodbot-services
kubectl get pods -n foodbot-workflows

# Expected output: All pods in "Running" state, all containers ready (e.g., 1/1)
```

#### 2. Verify Health Endpoints

```bash
# Gateway API health
curl https://api.foodbot.com/health
# Expected: {"status":"ok","timestamp":"..."}

# MCP Orchestrator health
curl https://api.foodbot.com/mcp/v1/actuator/health
# Expected: {"status":"UP","providers":{...}}
```

#### 3. Test API Endpoints

```bash
# Test public endpoints
curl https://api.foodbot.com/restaurants/search?query=pizza
curl https://api.foodbot.com/restaurants/search?lat=40.7128&lon=-74.0060

# Test authentication
curl -X POST https://api.foodbot.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'
```

#### 4. Check Database Connectivity

```bash
# Run connectivity test pod
kubectl run db-test --image=postgres:16-alpine --restart=Never --rm -it -- \
  psql -h foodbot-postgres.cluster-xxx.us-east-1.rds.amazonaws.com -U foodbot_user -d foodbot -c "SELECT 1;"
```

#### 5. Verify Kafka Connectivity

```bash
# Check Kafka topics
kubectl run kafka-test --image=confluentinc/cp-kafka:7.5.3 --restart=Never --rm -it -- \
  kafka-topics --bootstrap-server b-1.foodbot-msk.kafka.us-east-1.amazonaws.com:9092 --list
```

#### 6. Monitor Logs

```bash
# Watch Gateway API logs
kubectl logs -n foodbot-apps deployment/gateway-api -f | grep -i error

# Watch MCP Orchestrator logs
kubectl logs -n foodbot-services deployment/mcp-orchestrator -f | grep -i error
```

#### 7. Check Metrics

```bash
# View Prometheus metrics
curl https://api.foodbot.com/metrics

# Check Grafana dashboards
open https://grafana.foodbot.com/d/foodbot-overview
```

---

## 7. Rollback Procedures

### Scenario 1: Application Rollback (No DB Changes)

```bash
# Rollback Gateway API to previous version
kubectl rollout undo deployment/gateway-api -n foodbot-apps

# Verify rollback
kubectl rollout status deployment/gateway-api -n foodbot-apps

# Check previous revision
kubectl rollout history deployment/gateway-api -n foodbot-apps

# Rollback to specific revision
kubectl rollout undo deployment/gateway-api -n foodbot-apps --to-revision=3
```

### Scenario 2: Database Migration Rollback

```bash
# Run migration rollback
kubectl run migration-rollback \
  --image=foodbot/migration-runner:latest \
  --restart=Never \
  --env="DB_HOST=..." \
  --command -- npm run migration:revert

# Verify rollback
kubectl logs migration-rollback

# Rollback application to match database schema
kubectl rollout undo deployment/gateway-api -n foodbot-apps
```

### Scenario 3: Complete Deployment Rollback

```bash
# Rollback all services to previous tag
kubectl set image deployment/gateway-api gateway-api=foodbot/gateway-api:v0.9.5 -n foodbot-apps
kubectl set image deployment/mcp-orchestrator mcp-orchestrator=foodbot/mcp-orchestrator:v0.9.5 -n foodbot-services
kubectl set image deployment/temporal-workers temporal-workers=foodbot/temporal-workers:v0.9.5 -n foodbot-workflows

# Wait for rollouts
kubectl rollout status deployment/gateway-api -n foodbot-apps
kubectl rollout status deployment/mcp-orchestrator -n foodbot-services
kubectl rollout status deployment/temporal-workers -n foodbot-workflows
```

### Rollback Checklist

- [ ] Identify issue severity (P0/P1/P2)
- [ ] Alert team via Slack #deployments
- [ ] Stop current deployment if in progress
- [ ] Determine safe rollback point
- [ ] Execute rollback commands
- [ ] Verify health checks passing
- [ ] Run smoke tests
- [ ] Monitor error rates (target < 1%)
- [ ] Update status page
- [ ] Schedule post-mortem

---

## 8. Troubleshooting

### Issue: Pods Stuck in Pending

**Symptoms:**
```bash
kubectl get pods -n foodbot-apps
NAME                           READY   STATUS    RESTARTS   AGE
gateway-api-5f4d8b7c9d-abc123   0/1     Pending   0          5m
```

**Diagnosis:**
```bash
kubectl describe pod gateway-api-5f4d8b7c9d-abc123 -n foodbot-apps
```

**Common Causes:**
- Insufficient node resources (CPU/memory)
- PersistentVolumeClaim not bound
- Node selector mismatch

**Fix:**
```bash
# Scale up cluster nodes
eksctl scale nodegroup --cluster=foodbot-prod --name=app-nodes --nodes=6

# Or reduce replica count temporarily
kubectl scale deployment/gateway-api --replicas=2 -n foodbot-apps
```

### Issue: CrashLoopBackOff

**Symptoms:**
```bash
gateway-api-5f4d8b7c9d-abc123   0/1     CrashLoopBackOff   5          5m
```

**Diagnosis:**
```bash
kubectl logs gateway-api-5f4d8b7c9d-abc123 -n foodbot-apps
kubectl logs gateway-api-5f4d8b7c9d-abc123 -n foodbot-apps --previous
```

**Common Causes:**
- Missing environment variables
- Database connection failure
- Application startup error

**Fix:**
```bash
# Check secrets and configmaps
kubectl get secrets -n foodbot-apps
kubectl get configmaps -n foodbot-apps

# Verify database connectivity
kubectl run db-test --image=postgres:16-alpine --restart=Never --rm -it -- \
  psql -h <DB_HOST> -U <DB_USER> -d foodbot -c "SELECT 1;"
```

### Issue: High API Latency

**Diagnosis:**
```bash
# Check pod resource usage
kubectl top pods -n foodbot-apps

# Check HPA status
kubectl get hpa -n foodbot-apps

# Check database connection pool
kubectl logs -n foodbot-apps deployment/gateway-api | grep "connection pool"
```

**Fix:**
```bash
# Scale up replicas
kubectl scale deployment/gateway-api --replicas=6 -n foodbot-apps

# Increase resource limits
kubectl set resources deployment/gateway-api -n foodbot-apps \
  --limits=cpu=2000m,memory=2Gi \
  --requests=cpu=1000m,memory=1Gi
```

---

**Questions?** Contact #deployments on Slack or email devops@foodbot.com

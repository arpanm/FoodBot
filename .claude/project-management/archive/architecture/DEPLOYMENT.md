# FoodBot Deployment Guide

**Version:** 2.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Docker Compose Setup (Development)](#1-docker-compose-setup-development)
- [2. Kubernetes Deployment (Production)](#2-kubernetes-deployment-production)
- [3. Environment Variables](#3-environment-variables)
- [4. Database Migrations](#4-database-migrations)
- [5. Service Dependencies](#5-service-dependencies)
- [6. Health Checks](#6-health-checks)
- [7. Monitoring Setup](#7-monitoring-setup)
- [8. Backup Strategies](#8-backup-strategies)

---

## 1. Docker Compose Setup (Development)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- 8 GB RAM minimum (16 GB recommended)
- 20 GB free disk space

### Starting Infrastructure

```bash
# Start all infrastructure services
docker-compose up -d

# Start with development overrides (debug logging)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Verify all services are healthy
docker-compose ps
```

### Infrastructure Services

| Service | Container Name | Port(s) | Image |
|---------|---------------|---------|-------|
| PostgreSQL (Temporal) | foodbot-postgresql | 5432 | postgres:15-alpine |
| PostgreSQL (App) | foodbot-app-db | 5433 | postgres:16-alpine |
| Temporal Server | foodbot-temporal | 7233, 7234, 7235 | temporalio/auto-setup:1.22.4 |
| Temporal UI | foodbot-temporal-ui | 8080 | temporalio/ui:2.21.3 |
| Redis | foodbot-redis | 6379 | redis:7-alpine |
| Redis Commander | foodbot-redis-commander | 8081 | rediscommander/redis-commander |
| Elasticsearch | foodbot-elasticsearch | 9200, 9300 | elasticsearch:8.11.3 |
| Kibana | foodbot-kibana | 5601 | kibana:8.11.3 |
| Zookeeper | foodbot-zookeeper | 2181 | cp-zookeeper:7.5.3 |
| Kafka | foodbot-kafka | 9092, 29092 | cp-kafka:7.5.3 |
| Kafka UI | foodbot-kafka-ui | 8082 | provectuslabs/kafka-ui |
| Schema Registry | foodbot-schema-registry | 8083 | cp-schema-registry:7.5.3 |

### Kafka Topics (Auto-Created)

The `kafka-init` container automatically creates the following topics on first startup:

| Topic | Partitions | Description |
|-------|------------|-------------|
| `restaurant.created` | 6 | New restaurant registered |
| `restaurant.updated` | 6 | Restaurant details updated |
| `restaurant.deleted` | 3 | Restaurant removed |
| `dish.created` | 6 | New dish added to menu |
| `dish.updated` | 6 | Dish details updated |
| `dish.availability.changed` | 12 | Dish availability toggled |
| `order.created` | 12 | New order placed |
| `order.status.changed` | 12 | Order status transition |
| `payment.completed` | 12 | Payment successful |
| `payment.failed` | 6 | Payment failed |
| `payment.refunded` | 6 | Payment refunded |
| `user.registered` | 6 | New user registered |
| `foodbot.dlq` | 3 | Dead letter queue |

### Management Commands

```bash
# View logs for all services
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f kafka

# Stop all services
docker-compose down

# Stop and remove all data volumes
docker-compose down -v

# Check health of all services
pnpm docker:health
```

### Management UIs

| UI | URL | Purpose |
|----|-----|---------|
| Temporal UI | http://localhost:8080 | Workflow monitoring and debugging |
| Redis Commander | http://localhost:8081 | Redis key browser and management |
| Kafka UI | http://localhost:8082 | Topic browser, consumer groups, messages |
| Kibana | http://localhost:5601 | Elasticsearch dashboards and queries |
| Schema Registry | http://localhost:8083 | Kafka schema management |
| Elasticsearch API | http://localhost:9200 | Direct Elasticsearch access |

---

## 2. Kubernetes Deployment (Production)

### Cluster Requirements

- Kubernetes 1.27+
- 3 worker nodes minimum (8 vCPU, 32 GB RAM each)
- Storage class with dynamic provisioning
- Ingress controller (NGINX recommended)
- cert-manager for TLS

### Namespace Strategy

```
foodbot-apps         # Gateway API, Customer App, Restaurant App
foodbot-services     # MCP Orchestrator, Notification Service
foodbot-workflows    # Temporal Server, Workers
foodbot-data         # PostgreSQL, Redis, Elasticsearch, Kafka
foodbot-monitoring   # Prometheus, Grafana, Loki
```

### Deployment Order

1. **Namespace creation** and RBAC configuration
2. **Data services** -- PostgreSQL, Redis, Elasticsearch, Kafka (StatefulSets)
3. **Temporal Server** (depends on PostgreSQL)
4. **MCP Orchestrator** (depends on Redis, Elasticsearch, Kafka)
5. **Gateway API** (depends on PostgreSQL, Redis, Temporal, Kafka)
6. **Temporal Workers** (depends on Temporal Server)
7. **Notification Service** (depends on Kafka)
8. **Frontend Apps** (static files served via NGINX)

### Example Gateway API Deployment

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
    spec:
      containers:
        - name: gateway-api
          image: foodbot/gateway-api:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: gateway-api-secrets
            - configMapRef:
                name: gateway-api-config
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
---
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
```

---

## 3. Environment Variables

### Gateway API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment name |
| `JWT_SECRET` | Yes | -- | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | -- | Refresh token secret (min 32 chars) |
| `ALLOWED_ORIGINS` | No | localhost:3000,3001 | CORS allowed origins |
| `DB_HOST` | Yes | localhost | PostgreSQL host |
| `DB_PORT` | No | 5433 | PostgreSQL port |
| `DB_USER` | Yes | postgres | PostgreSQL user |
| `DB_PASSWORD` | Yes | postgres | PostgreSQL password |
| `DB_NAME` | No | foodbot | Database name |
| `DB_POOL_SIZE` | No | 10 | Connection pool size |
| `DB_CONNECTION_TIMEOUT` | No | 5000 | Connection timeout (ms) |
| `DB_IDLE_TIMEOUT` | No | 30000 | Idle timeout (ms) |
| `REDIS_HOST` | No | localhost | Redis host |
| `REDIS_PORT` | No | 6379 | Redis port |
| `REDIS_PASSWORD` | No | -- | Redis password |
| `REDIS_URL` | No | redis://localhost:6379 | Redis URL (alternative) |
| `TEMPORAL_ADDRESS` | No | localhost:7233 | Temporal gRPC address |
| `TEMPORAL_NAMESPACE` | No | default | Temporal namespace |
| `TEMPORAL_TASK_QUEUE` | No | foodbot-main-queue | Default task queue |
| `KAFKA_BROKERS` | No | localhost:29092 | Kafka bootstrap servers |
| `ELASTICSEARCH_URL` | No | http://localhost:9200 | Elasticsearch URL |

### MCP Orchestrator

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERVER_PORT` | No | 8081 | Server port |
| `REDIS_HOST` | No | localhost | Redis host |
| `REDIS_PORT` | No | 6379 | Redis port |
| `REDIS_PASSWORD` | No | -- | Redis password |
| `ELASTICSEARCH_URIS` | No | http://localhost:9200 | Elasticsearch URIs |
| `KAFKA_BOOTSTRAP_SERVERS` | No | localhost:9092 | Kafka bootstrap servers |
| `SWIGGY_MCP_ENABLED` | No | false | Enable Swiggy provider |
| `SWIGGY_API_KEY` | Conditional | -- | Swiggy API key |
| `ZOMATO_MCP_ENABLED` | No | false | Enable Zomato provider |
| `ZOMATO_API_KEY` | Conditional | -- | Zomato API key |

### LLM Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Conditional | -- | Claude API key |
| `OPENAI_API_KEY` | Conditional | -- | OpenAI API key |
| `GEMINI_API_KEY` | Conditional | -- | Gemini API key |
| `LLM_CLAUDE_ENABLED` | No | true | Enable Claude |
| `LLM_OPENAI_ENABLED` | No | true | Enable OpenAI |
| `LLM_GEMINI_ENABLED` | No | true | Enable Gemini |

---

## 4. Database Migrations

### TypeORM (Gateway API)

The Gateway API uses TypeORM with `synchronize: true` in development. For production, use migrations:

```bash
# Generate a migration from entity changes
cd apps/gateway-api
npx typeorm migration:generate -d src/config/database.config.ts -n MigrationName

# Run pending migrations
npx typeorm migration:run -d src/config/database.config.ts

# Revert last migration
npx typeorm migration:revert -d src/config/database.config.ts
```

### Temporal Database

Temporal manages its own database schema. The `temporalio/auto-setup` Docker image handles initial schema creation. For production upgrades, use the Temporal Admin tools.

### Elasticsearch Indices

Index mappings are defined in `services/mcp-orchestrator/src/main/resources/elasticsearch/`:

- `restaurant-mapping.json` -- Restaurant index with geo_point, text analyzers, nested operating hours
- `dish-mapping.json` -- Dish index with keyword categories, dietary tags, text search

Indices are created automatically by the MCP Orchestrator on startup if they do not exist.

---

## 5. Service Dependencies

```
                    PostgreSQL (Temporal)
                         |
                    Temporal Server
                    /          \
          Temporal Workers   Temporal UI
               |
          Gateway API -----> PostgreSQL (App)
          /    |    \
     Redis  Kafka  Temporal
               |
     +---------+---------+
     |                   |
MCP Orchestrator    Notification Service
  /      |      \
Redis  Elastic  Kafka
       search
```

### Startup Order

1. PostgreSQL (both instances)
2. Redis
3. Zookeeper
4. Kafka
5. Elasticsearch
6. Temporal Server (depends on PostgreSQL)
7. Schema Registry (depends on Kafka)
8. Kafka Topic Init (depends on Kafka)
9. MCP Orchestrator (depends on Redis, Elasticsearch, Kafka)
10. Gateway API (depends on PostgreSQL, Redis, Kafka, Temporal)
11. Temporal Workers (depends on Temporal)
12. Notification Service (depends on Kafka)
13. Management UIs (Temporal UI, Redis Commander, Kafka UI, Kibana)

---

## 6. Health Checks

### Gateway API

```
GET /health
Response: { "status": "ok", "timestamp": "2026-02-19T10:00:00Z" }
```

### MCP Orchestrator

```
GET /mcp/v1/health
Response: {
  "status": "UP",
  "providers": { "mock": "UP", "swiggy": "DOWN", "zomato": "DISABLED" },
  "elasticsearch": "UP",
  "redis": "UP"
}

GET /mcp/v1/actuator/health       # Spring Boot health endpoint
GET /mcp/v1/actuator/metrics      # Micrometer metrics
GET /mcp/v1/actuator/prometheus   # Prometheus metrics export
```

### Docker Compose Health Checks

All Docker Compose services include health checks:

| Service | Check | Interval | Retries |
|---------|-------|----------|---------|
| PostgreSQL | `pg_isready` | 10s | 5 |
| Redis | `redis-cli ping` | 10s | 5 |
| Elasticsearch | `curl /_cluster/health` | 30s | 5 |
| Kafka | `kafka-broker-api-versions` | 30s | 5 |
| Temporal | `tctl cluster health` | 10s | 10 |
| Zookeeper | `echo ruok` | 10s | 5 |
| Schema Registry | `curl /` | 30s | 5 |
| Kibana | `curl /api/status` | 30s | 5 |

---

## 7. Monitoring Setup

### Prometheus Metrics

The MCP Orchestrator exposes Prometheus metrics at `/mcp/v1/actuator/prometheus`:

- `http_server_requests_seconds` -- HTTP request latency
- `resilience4j_circuitbreaker_*` -- Circuit breaker state and call counts
- `resilience4j_ratelimiter_*` -- Rate limiter metrics
- `kafka_consumer_*` -- Kafka consumer lag and throughput
- `cache_*` -- Redis cache hit/miss rates

### Structured Logging

- **Gateway API:** Pino logger with correlation IDs
- **MCP Orchestrator:** SLF4J with Logback, JSON format, file rotation (10 MB, 30 days)
- **Notification Service:** Pino logger

### Recommended Monitoring Stack

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection (scrape `/actuator/prometheus`) |
| Grafana | Dashboards and visualization |
| Loki | Log aggregation from Docker/Kubernetes |
| Jaeger | Distributed tracing with OpenTelemetry |
| AlertManager | Alert routing based on metrics thresholds |

---

## 8. Backup Strategies

### PostgreSQL

```bash
# Daily automated backup
pg_dump -h localhost -p 5433 -U postgres -d foodbot > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h localhost -p 5433 -U postgres -d foodbot < backup_20260219.sql
```

**Production:** Use managed PostgreSQL (AWS RDS, GCP Cloud SQL) with automated daily snapshots, point-in-time recovery, and cross-region replication.

### Redis

Redis is configured with `appendonly yes` for persistence. For production, enable RDB snapshots and AOF with `appendfsync everysec`.

### Elasticsearch

Snapshot to S3/GCS daily. Retain 30 days of snapshots. Use index lifecycle management (ILM) to roll over indices monthly.

### Kafka

Topic data retained for 7-90 days depending on topic. Use Mirror Maker 2 for cross-region replication in production.

### Disaster Recovery

| Component | RPO | RTO | Strategy |
|-----------|-----|-----|----------|
| PostgreSQL | 1 hour | 15 min | Streaming replication + point-in-time recovery |
| Redis | 1 second | 5 min | Redis Sentinel automatic failover |
| Elasticsearch | 24 hours | 30 min | Snapshot restore + re-index from Kafka |
| Kafka | 0 (replicated) | 5 min | Multi-broker cluster with ISR |
| Temporal | 0 (PostgreSQL) | 15 min | Same as PostgreSQL recovery |

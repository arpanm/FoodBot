# Docker Infrastructure Requirements

**Version:** 1.0.0
**Status:** Completed
**Last Updated:** 2026-02-20

---

## Overview

FoodBot uses Docker Compose for containerized deployment across development, staging, and production environments. The infrastructure includes 6 compose files for different environments and purposes.

---

## Docker Compose Files

### 1. docker-compose.yml (Main Infrastructure)

**Purpose:** Core infrastructure services for all environments

**Services:**

#### PostgreSQL (Temporal)
- **Image:** `postgres:15-alpine`
- **Container:** `foodbot-postgresql`
- **Port:** 5432
- **Purpose:** Temporal workflow database
- **Environment:**
  - POSTGRES_USER: temporal
  - POSTGRES_PASSWORD: temporal
  - POSTGRES_DB: temporal
- **Health Check:** `pg_isready -U temporal`
- **Volume:** postgres-data

#### Temporal Server
- **Image:** `temporalio/auto-setup:1.22.4`
- **Container:** `foodbot-temporal`
- **Ports:**
  - 7233: gRPC
  - 7234: HTTP
  - 7235: Metrics
- **Depends On:** PostgreSQL
- **Purpose:** Workflow orchestration engine
- **Health Check:** `tctl cluster health`

#### Temporal UI
- **Image:** `temporalio/ui:2.21.3`
- **Container:** `foodbot-temporal-ui`
- **Port:** 8080
- **Purpose:** Web interface for Temporal
- **CORS Origins:** localhost:3000, localhost:8080

#### PostgreSQL (FoodBot App)
- **Image:** `postgres:16-alpine`
- **Container:** `foodbot-app-db`
- **Port:** 5433 (mapped from 5432)
- **Purpose:** Application database
- **Environment:**
  - POSTGRES_DB: foodbot
  - POSTGRES_USER: postgres
  - POSTGRES_PASSWORD: postgres
- **Volume:** foodbot-db-data

#### Redis
- **Image:** `redis:7-alpine`
- **Container:** `foodbot-redis`
- **Port:** 6379
- **Purpose:** Caching and session storage
- **Command:** `redis-server --appendonly yes --requirepass foodbot-redis-password`
- **Volume:** redis-data
- **Health Check:** `redis-cli ping`

#### Redis Commander
- **Image:** `rediscommander/redis-commander:latest`
- **Container:** `foodbot-redis-commander`
- **Port:** 8081
- **Purpose:** Redis management UI

#### Elasticsearch
- **Image:** `docker.elastic.co/elasticsearch/elasticsearch:8.11.3`
- **Container:** `foodbot-elasticsearch`
- **Ports:**
  - 9200: HTTP
  - 9300: Transport
- **Purpose:** Search and analytics engine
- **Configuration:**
  - Single node mode
  - Security disabled (dev)
  - Memory: 512MB-512MB (dev), 1GB-1GB (prod)
- **Volume:** elasticsearch-data

#### Kibana
- **Image:** `docker.elastic.co/kibana/kibana:8.11.3`
- **Container:** `foodbot-kibana`
- **Port:** 5601
- **Purpose:** Elasticsearch UI and visualization
- **Depends On:** Elasticsearch

#### Zookeeper
- **Image:** `confluentinc/cp-zookeeper:7.5.3`
- **Container:** `foodbot-zookeeper`
- **Port:** 2181
- **Purpose:** Kafka coordination
- **Volumes:**
  - zookeeper-data
  - zookeeper-logs

#### Kafka
- **Image:** `confluentinc/cp-kafka:7.5.3`
- **Container:** `foodbot-kafka`
- **Ports:**
  - 9092: Internal
  - 29092: Host
- **Purpose:** Event streaming platform
- **Configuration:**
  - Broker ID: 1
  - Replication factor: 1
  - Auto-create topics: enabled
  - Log retention: 168 hours (7 days)
- **Volume:** kafka-data

#### Kafka UI
- **Image:** `provectuslabs/kafka-ui:latest`
- **Container:** `foodbot-kafka-ui`
- **Port:** 8082
- **Purpose:** Kafka management interface

#### Kafka Topic Initialization
- **Container:** `foodbot-kafka-init`
- **Purpose:** Creates predefined Kafka topics
- **Topics Created:**
  - restaurant.created (6 partitions)
  - restaurant.updated (6 partitions)
  - restaurant.deleted (3 partitions)
  - dish.created (6 partitions)
  - dish.updated (6 partitions)
  - dish.availability.changed (12 partitions)
  - order.created (12 partitions)
  - order.status.changed (12 partitions)
  - payment.completed (12 partitions)
  - payment.failed (6 partitions)
  - payment.refunded (6 partitions)
  - user.registered (6 partitions)
  - foodbot.dlq (3 partitions - dead letter queue)

#### Schema Registry
- **Image:** `confluentinc/cp-schema-registry:7.5.3`
- **Container:** `foodbot-schema-registry`
- **Port:** 8083
- **Purpose:** Kafka schema management

#### Search Orchestrator
- **Build:** services/search-orchestrator/Dockerfile
- **Container:** `foodbot-search-orchestrator`
- **Port:** 3002
- **Purpose:** Multi-source search coordination
- **Timeouts:**
  - Elasticsearch: 200ms
  - MCP: 2000ms
  - Database: 500ms
  - Total max: 3000ms
- **Cache TTL:** 300 seconds

---

### 2. docker-compose.dev.yml (Development Overrides)

**Purpose:** Development-specific configurations

**Overrides:**

#### PostgreSQL (App)
- **Additional Logging:** All SQL statements logged
- **Command:** `postgres -c log_statement=all -c log_min_duration_statement=0`

#### Temporal
- **Log Level:** DEBUG
- **Additional Volumes:**
  - ./temporal-config
  - ./temporal-logs

#### Redis
- **Log Level:** DEBUG

#### Elasticsearch
- **Memory:** 1GB-1GB (increased from 512MB)

#### Kafka
- **Log Retention:** 24 hours (reduced from 168)
- **Log Level:** DEBUG

---

### 3. docker-compose.prod.yml (Production)

**Purpose:** Production-ready multi-service orchestration with HA

**Key Features:**
- Resource limits and reservations
- Health checks with proper timeouts
- Logging configuration (JSON, 10MB max, 3 files)
- Load balancing with Nginx
- 3 replicas of Gateway API
- Monitoring stack (Prometheus, Grafana)

**Services:**

#### Nginx Load Balancer
- **Image:** `nginx:1.25-alpine`
- **Ports:**
  - 80: HTTP
  - 443: HTTPS
- **Purpose:** Load balancer and reverse proxy
- **Volumes:**
  - nginx.conf
  - conf.d/
  - ssl/ (certificates)
  - nginx-cache
  - nginx-logs
- **Resources:**
  - CPU: 0.25-0.5
  - Memory: 256MB-512MB

#### Gateway API (3 Replicas)
- **Containers:**
  - foodbot-gateway-api-1
  - foodbot-gateway-api-2
  - foodbot-gateway-api-3
- **Port:** 3000 (internal)
- **Resources:**
  - CPU: 0.5-1
  - Memory: 1GB-2GB
- **Environment:** Full production config with secrets from env vars

#### Customer App
- **Build:** apps/customer-app/Dockerfile
- **Resources:**
  - CPU: 0.25-0.5
  - Memory: 256MB-512MB

#### Restaurant App
- **Build:** apps/restaurant-app/Dockerfile
- **Resources:**
  - CPU: 0.25-0.5
  - Memory: 256MB-512MB

#### Search Orchestrator
- **Resources:**
  - CPU: 0.5-1
  - Memory: 1GB-2GB

#### MCP Adapter
- **Build:** services/mcp-adapter/Dockerfile.prod
- **Resources:**
  - CPU: 0.25-0.5
  - Memory: 512MB-1GB

#### Notification Service
- **Build:** services/notification-service/Dockerfile
- **Port:** 3003
- **Purpose:** Email, SMS notifications via Kafka consumers
- **Resources:**
  - CPU: 0.25-0.5
  - Memory: 512MB-1GB

#### PostgreSQL (App) - Production Tuned
- **Configuration:**
  - max_connections: 200
  - shared_buffers: 256MB
  - effective_cache_size: 1GB
  - maintenance_work_mem: 64MB
  - checkpoint_completion_target: 0.9
  - wal_buffers: 16MB
  - work_mem: 1MB
  - min_wal_size: 1GB
  - max_wal_size: 4GB
- **Resources:**
  - CPU: 1-2
  - Memory: 2GB-4GB

#### Redis - Production
- **Configuration:**
  - maxmemory: 2GB
  - maxmemory-policy: allkeys-lru
  - Persistence: RDB snapshots (60s/1000, 300s/100, 600s/10)
- **Resources:**
  - CPU: 0.5-1
  - Memory: 1GB-2GB

#### Temporal - Production
- **Resources:**
  - CPU: 1-2
  - Memory: 1.5GB-3GB

#### Elasticsearch - Production
- **Memory:** 1GB-1GB
- **Resources:**
  - CPU: 1-2
  - Memory: 2GB-3GB

#### Kafka - Production
- **Configuration:**
  - Compression: lz4
  - Network threads: 8
  - IO threads: 8
- **Resources:**
  - CPU: 1-2
  - Memory: 2GB-3GB

#### Prometheus
- **Image:** `prom/prometheus:v2.48.0`
- **Port:** 9090
- **Purpose:** Metrics collection
- **Configuration:**
  - Retention: 30 days
- **Resources:**
  - CPU: 0.5-1
  - Memory: 1GB-2GB

#### Grafana
- **Image:** `grafana/grafana:10.2.2`
- **Port:** 3001 (mapped from 3000)
- **Purpose:** Metrics visualization
- **Resources:**
  - CPU: 0.25-0.5
  - Memory: 512MB-1GB

#### Node Exporter
- **Image:** `prom/node-exporter:v1.7.0`
- **Purpose:** System metrics
- **Resources:**
  - CPU: 0.1-0.25
  - Memory: 128MB-256MB

**Network:**
- **Name:** foodbot-network
- **Driver:** bridge
- **Subnet:** 172.20.0.0/16

---

### 4. docker-compose.temporal.yml

**Purpose:** Standalone Temporal setup for development

**Services:**
- PostgreSQL (Temporal only)
- Temporal Server
- Temporal UI (port 8088)
- Temporal Admin Tools (interactive)

**Use Case:** Temporal development and testing without full stack

---

### 5. docker-compose.monitoring.yml

**Purpose:** Observability stack

**Services:**

#### Prometheus
- **Image:** `prom/prometheus:v2.50.1`
- **Port:** 9090
- **Configuration:**
  - Retention: 15 days
  - Web lifecycle API enabled

#### Grafana
- **Image:** `grafana/grafana:10.3.3`
- **Port:** 3030
- **Plugins:** grafana-piechart-panel

#### AlertManager
- **Image:** `prom/alertmanager:v0.27.0`
- **Port:** 9093
- **Purpose:** Alert routing and management

#### Loki
- **Image:** `grafana/loki:2.9.5`
- **Port:** 3100
- **Purpose:** Log aggregation

#### Promtail
- **Image:** `grafana/promtail:2.9.5`
- **Purpose:** Log shipper to Loki
- **Volumes:**
  - /var/log
  - /var/lib/docker/containers (read-only)

#### Node Exporter
- **Port:** 9100
- **Purpose:** Host system metrics

#### cAdvisor
- **Image:** `gcr.io/cadvisor/cadvisor:v0.47.2`
- **Port:** 8585
- **Purpose:** Container metrics
- **Privileged:** true

---

### 6. docker-compose.logging.yml

**Purpose:** ELK Stack for centralized logging

**Services:**

#### Elasticsearch
- **Image:** `docker.elastic.co/elasticsearch/elasticsearch:8.11.0`
- **Ports:** 9200, 9300
- **Memory:** 512MB-512MB

#### Logstash
- **Image:** `docker.elastic.co/logstash/logstash:8.11.0`
- **Ports:**
  - 5000: TCP/UDP input
  - 5044: Beats input
  - 9600: Monitoring API
- **Memory:** 256MB-256MB

#### Kibana
- **Image:** `docker.elastic.co/kibana/kibana:8.11.0`
- **Port:** 5601

#### Filebeat
- **Image:** `docker.elastic.co/beats/filebeat:8.11.0`
- **Purpose:** File log shipping
- **Volumes:**
  - ./logs
  - /var/lib/docker/containers

#### Metricbeat
- **Image:** `docker.elastic.co/beats/metricbeat:8.11.0`
- **Purpose:** System and app metrics
- **Volumes:**
  - /var/run/docker.sock
  - /sys/fs/cgroup
  - /proc

#### APM Server
- **Image:** `docker.elastic.co/apm/apm-server:8.11.0`
- **Port:** 8200
- **Purpose:** Application Performance Monitoring
- **Configuration:**
  - RUM enabled
  - Allow origins: '*'

---

## Volume Management

**Persistent Volumes:**
- postgres-data: Temporal database
- foodbot-db-data: Application database
- redis-data: Redis persistence
- elasticsearch-data: Search indices
- kafka-data: Event logs
- zookeeper-data: Kafka metadata
- zookeeper-logs: Zookeeper logs
- prometheus-data: Metrics storage
- grafana-data: Dashboards and settings
- nginx-cache: Response cache
- nginx-logs: Access and error logs

**Backup Strategy:**
- Database: Daily automated backups
- Volumes: Included in deployment backup script
- Retention: Last 5 backups

---

## Networking

**Networks:**
- **foodbot-network:** Main application network (bridge driver)
- **temporal-network:** Isolated Temporal network
- **foodbot-logging:** Logging stack network

**Port Mapping:**
- 3000: Gateway API
- 3001: Grafana
- 3002: Search Orchestrator
- 3003: Notification Service
- 3030: Monitoring Grafana
- 3100: Loki
- 5432: Temporal PostgreSQL
- 5433: App PostgreSQL
- 5601: Kibana
- 6379: Redis
- 7233-7235: Temporal Server
- 8080: Temporal UI
- 8081: Redis Commander
- 8082: Kafka UI
- 8083: Schema Registry
- 8088: Temporal UI (standalone)
- 8200: APM Server
- 8585: cAdvisor
- 9090: Prometheus
- 9093: AlertManager
- 9100: Node Exporter
- 9200: Elasticsearch HTTP
- 9300: Elasticsearch Transport

---

## Resource Requirements

### Minimum (Development)
- **CPU:** 4 cores
- **Memory:** 8GB RAM
- **Disk:** 50GB

### Recommended (Production)
- **CPU:** 16+ cores
- **Memory:** 32GB+ RAM
- **Disk:** 500GB SSD

### Per-Service Production Limits
| Service | CPU Limit | Memory Limit |
|---------|-----------|--------------|
| Nginx | 0.5 | 512MB |
| Gateway API (each) | 1 | 2GB |
| Customer/Restaurant App | 0.5 | 512MB |
| Search Orchestrator | 1 | 2GB |
| MCP Adapter | 0.5 | 1GB |
| Notification Service | 0.5 | 1GB |
| PostgreSQL (App) | 2 | 4GB |
| PostgreSQL (Temporal) | 1 | 2GB |
| Redis | 1 | 2GB |
| Temporal | 2 | 3GB |
| Elasticsearch | 2 | 3GB |
| Kafka | 2 | 3GB |
| Zookeeper | 0.5 | 1GB |
| Prometheus | 1 | 2GB |
| Grafana | 0.5 | 1GB |

**Total Production:** ~18 CPU, ~36GB RAM

---

## Health Checks

All services implement health checks with:
- **Interval:** 30s (10s for databases)
- **Timeout:** 10s (5s for databases)
- **Retries:** 3-5
- **Start Period:** 10-60s depending on service

---

## Security Considerations

### Production Requirements:
1. **No hardcoded credentials** - all secrets from environment variables
2. **Non-root containers** - all services run as unprivileged users
3. **Read-only volumes** where possible
4. **Resource limits** enforced
5. **Network isolation** between stacks
6. **TLS/SSL** for external communication
7. **Image scanning** with Trivy before deployment

### Development Exceptions:
- Default passwords allowed
- Security features disabled for Elasticsearch
- Debug logging enabled

---

## Deployment Strategies

### Standard (docker-compose.yml + dev/prod overrides)
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoring Only
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### Logging Only
```bash
docker-compose -f docker-compose.logging.yml up -d
```

### Full Stack
```bash
docker-compose -f docker-compose.yml \
  -f docker-compose.monitoring.yml \
  -f docker-compose.logging.yml up -d
```

---

## Maintenance

### Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f [service]
```

### Scale Services
```bash
docker-compose -f docker-compose.prod.yml up -d --scale gateway-api=5
```

### Health Check All
```bash
./scripts/health-check.sh
```

---

## Status: COMPLETED ✓

All Docker infrastructure requirements have been implemented and tested.

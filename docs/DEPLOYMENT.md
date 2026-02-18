# FoodBot Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Elasticsearch Setup](#elasticsearch-setup)
- [Kafka Setup](#kafka-setup)
- [Temporal Setup](#temporal-setup)
- [Application Deployment](#application-deployment)
- [Docker Deployment](#docker-deployment)
- [Health Checks](#health-checks)
- [Monitoring Setup](#monitoring-setup)
- [Backup Strategy](#backup-strategy)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Disk | 50 GB SSD | 100 GB SSD |
| OS | Linux (Ubuntu 22.04+), macOS 13+ | Ubuntu 22.04 LTS |

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | >= 20 | Gateway API, Customer App |
| pnpm | >= 8 | Package management |
| Java | >= 17 | MCP Orchestrator |
| Docker | >= 24 | Container runtime |
| Docker Compose | >= 2.20 | Container orchestration |
| PostgreSQL | 15 | Temporal persistence |
| Redis | 7 | Caching and sessions |
| Elasticsearch | 8.11+ | Search engine |
| Apache Kafka | 3.5+ | Event streaming |
| Temporal | 1.22+ | Workflow orchestration |

---

## Environment Configuration

### Application Environment (.env)

Create a `.env` file from the template:

```bash
cp .env.example .env
```

### Required Variables

```bash
# ==========================================
# LLM Provider Configuration
# ==========================================
LLM_CLAUDE_ENABLED=true
LLM_OPENAI_ENABLED=false
LLM_GEMINI_ENABLED=false

# API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# ==========================================
# MCP Provider Configuration
# ==========================================
MCP_SWIGGY_ENABLED=true
MCP_ZOMATO_ENABLED=false
MCP_MOCK_ENABLED=true    # Set to false in production

# ==========================================
# Infrastructure URLs
# ==========================================
TEMPORAL_GATEWAY=http://temporal:7233
REDIS_URL=redis://:foodbot-redis-password@redis:6379
GRAPHDB_URL=bolt://neo4j:7687
ELASTICSEARCH_URL=http://elasticsearch:9200
KAFKA_BROKERS=kafka:9092

# ==========================================
# JWT Configuration
# ==========================================
JWT_SECRET=your-production-jwt-secret-here
JWT_REFRESH_SECRET=your-production-refresh-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ==========================================
# Application Configuration
# ==========================================
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# ==========================================
# Quality Gates
# ==========================================
MIN_TEST_COVERAGE=80
MIN_READINESS_SCORE=0.85
SECURITY_BLOCK_ON_HIGH=true

# ==========================================
# Observability
# ==========================================
OBSERVABILITY_URL=http://observability:8090/events
```

### Docker Environment (.env.docker)

For Docker-based deployments, use the Docker-specific environment file:

```bash
# PostgreSQL
POSTGRES_USER=temporal
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=temporal

# Redis
REDIS_PASSWORD=<strong-redis-password>

# Kafka
KAFKA_BROKER_ID=1
KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181

# Application
NODE_ENV=production
LOG_LEVEL=info
```

### Security Considerations

- Never commit `.env` files to version control
- Use strong, unique passwords for all services in production
- Rotate JWT secrets periodically
- Store API keys in a secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Enable TLS/SSL for all service-to-service communication in production

---

## Database Setup

### PostgreSQL (Temporal Backend)

PostgreSQL is used exclusively as Temporal's persistence backend.

**Docker deployment** (recommended for development):

```bash
docker-compose up -d postgresql
```

**Manual setup**:

```bash
# Install PostgreSQL 15
sudo apt install postgresql-15

# Create the Temporal database and user
sudo -u postgres psql
CREATE USER temporal WITH PASSWORD 'your-password';
CREATE DATABASE temporal OWNER temporal;
GRANT ALL PRIVILEGES ON DATABASE temporal TO temporal;
```

**Verify connection**:

```bash
psql -h localhost -U temporal -d temporal
# Or via Docker:
docker exec foodbot-postgresql pg_isready -U temporal
```

**Production recommendations**:
- Enable WAL archiving for point-in-time recovery
- Set `shared_buffers` to 25% of available RAM
- Configure `wal_level = replica` for replication
- Enable connection pooling (PgBouncer)
- Regular VACUUM and ANALYZE schedules

---

## Redis Setup

### Configuration

Redis is used for:
- Session management (JWT token storage)
- Token blacklisting (logout)
- Rate limiting (login attempts, password reset)
- Search result caching
- MCP provider response caching

**Docker deployment**:

```bash
docker-compose up -d redis
```

Redis is configured with:
- AOF persistence (`appendonly yes`)
- Password authentication (`requirepass`)
- Default port 6379

**Manual setup**:

```bash
# Install Redis 7
sudo apt install redis-server

# Edit /etc/redis/redis.conf
requirepass your-redis-password
appendonly yes
maxmemory 2gb
maxmemory-policy allkeys-lru
```

**Verify**:

```bash
redis-cli -a foodbot-redis-password ping
# Expected: PONG
```

**Redis Commander UI**: Available at http://localhost:8081 for development

**Production recommendations**:
- Enable Redis Sentinel or Cluster for high availability
- Set `maxmemory` based on expected cache size
- Use `allkeys-lru` eviction policy
- Enable TLS for encrypted connections
- Disable dangerous commands (`FLUSHALL`, `FLUSHDB`, `CONFIG`)

---

## Elasticsearch Setup

### Configuration

Elasticsearch powers the restaurant and dish search functionality.

**Docker deployment**:

```bash
docker-compose up -d elasticsearch
```

The Docker configuration includes:
- Single-node discovery (development)
- Security disabled (development only)
- 512MB JVM heap
- Memory lock enabled

**Index creation** (performed by the MCP Orchestrator on startup):

```bash
# Verify Elasticsearch is running
curl -s http://localhost:9200/_cluster/health | python -m json.tool

# List indices
curl -s http://localhost:9200/_cat/indices?v
```

**Kibana UI**: Available at http://localhost:5601

**Production recommendations**:
- Enable X-Pack security with authentication
- Deploy minimum 3 nodes for high availability
- Increase JVM heap to 50% of available RAM (max 31GB)
- Configure index lifecycle management (ILM)
- Enable snapshot/restore for backup
- Set appropriate shard count based on data volume
- Enable TLS between nodes and for client connections

---

## Kafka Setup

### Configuration

Kafka handles event streaming for:
- Restaurant data indexing events
- Dish data indexing events
- Order lifecycle events
- Schema evolution via Schema Registry

**Docker deployment**:

```bash
docker-compose up -d zookeeper kafka schema-registry
```

The Docker configuration includes:
- Zookeeper (port 2181) for Kafka coordination
- Kafka broker (port 9092 internal, 29092 external)
- Schema Registry (port 8083) for Avro/JSON schema management
- Kafka UI (port 8082) for topic management

**Topic creation** (auto-create enabled in development):

```bash
# List topics
docker exec foodbot-kafka kafka-topics --list --bootstrap-server localhost:9092

# Create a topic manually
docker exec foodbot-kafka kafka-topics \
  --create --topic restaurant-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1
```

**Kafka UI**: Available at http://localhost:8082

**Production recommendations**:
- Deploy minimum 3 brokers for fault tolerance
- Set replication factor to 3 for critical topics
- Disable auto-create topics in production
- Configure retention policies per topic
- Monitor consumer lag with Kafka metrics
- Use KRaft mode (Kafka without Zookeeper) for newer versions
- Enable SASL/SSL authentication

---

## Temporal Setup

### Configuration

Temporal orchestrates durable workflows for:
- Restaurant search with caching
- Order placement with saga compensation
- Payment processing with idempotency

**Docker deployment**:

```bash
docker-compose up -d postgresql temporal temporal-ui
```

The Docker configuration includes:
- Temporal Server (port 7233 gRPC, 7234 HTTP, 7235 metrics)
- Temporal UI (port 8080)
- PostgreSQL backend for persistence
- Dynamic configuration via `temporal-config/development-sql.yaml`

**Temporal UI**: Available at http://localhost:8080

**Verify**:

```bash
# Check Temporal health
curl -s http://localhost:7234/api/v1/health

# Via tctl (if installed)
tctl --address localhost:7233 cluster health
```

**Worker deployment**:

Temporal workers execute workflow and activity code. They must be deployed separately:

```bash
# Start the workflow worker
cd packages/workflows
pnpm start:worker
```

**Production recommendations**:
- Use Temporal Cloud or deploy multi-node Temporal cluster
- Configure separate frontend and history service scaling
- Set appropriate workflow execution timeouts
- Monitor workflow task queue depth
- Configure archival for completed workflows
- Use namespace isolation for different environments

---

## Application Deployment

### Gateway API (NestJS)

```bash
# Build
cd apps/gateway-api
pnpm build

# Start production server
NODE_ENV=production node dist/main.js
```

**Process management** (PM2 recommended):

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/main.js --name foodbot-gateway -i max

# View logs
pm2 logs foodbot-gateway

# Monitor
pm2 monit
```

### MCP Orchestrator (Spring Boot)

```bash
# Build
cd services/mcp-orchestrator
./mvnw clean package -DskipTests

# Run
java -jar target/mcp-orchestrator-*.jar \
  --spring.profiles.active=production
```

### Customer App (React)

```bash
# Build
cd apps/customer-app
pnpm build

# Serve static files (nginx, serve, etc.)
npx serve -s build -l 3001
```

### Temporal Workers

```bash
# Build
cd packages/workflows
pnpm build

# Start worker
node dist/worker.js
```

---

## Docker Deployment

### Full Stack Deployment

The entire FoodBot infrastructure can be deployed using Docker Compose:

```bash
# Start all services
docker-compose up -d

# Verify all services are healthy
pnpm docker:health

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Development Mode

Use the development overlay for debug logging and larger resource limits:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Development overrides include:
- Temporal: Debug log level, log volume mount
- Redis: Debug log level
- Elasticsearch: Increased memory (1GB heap)
- Kafka: Shorter retention (24h), debug logging

### Service Ports

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| PostgreSQL | 5432 | 5432 |
| Temporal gRPC | 7233 | 7233 |
| Temporal HTTP | 7234 | 7234 |
| Temporal UI | 8080 | 8080 |
| Redis | 6379 | 6379 |
| Redis Commander | 8081 | 8081 |
| Elasticsearch | 9200 | 9200 |
| Kibana | 5601 | 5601 |
| Kafka (internal) | 9092 | 9092 |
| Kafka (external) | 29092 | 29092 |
| Kafka UI | 8080 | 8082 |
| Schema Registry | 8083 | 8083 |
| Zookeeper | 2181 | 2181 |

---

## Health Checks

### Automated Health Check Script

Run the built-in health check script:

```bash
pnpm docker:health
# or directly:
./scripts/docker-health-check.sh
```

This script checks:
- Docker daemon status
- Docker Compose service status
- PostgreSQL connectivity
- Temporal Server health
- Temporal UI availability
- Redis ping
- Elasticsearch cluster health
- Kibana status
- Zookeeper status
- Kafka broker API

### Manual Health Checks

```bash
# PostgreSQL
docker exec foodbot-postgresql pg_isready -U temporal

# Temporal
curl -sf http://localhost:7234/api/v1/health

# Redis
docker exec foodbot-redis redis-cli -a foodbot-redis-password PING

# Elasticsearch
curl -sf http://localhost:9200/_cluster/health

# Kafka
docker exec foodbot-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

---

## Monitoring Setup

### SonarQube Integration

FoodBot includes SonarQube configuration for code quality monitoring:

```bash
# Run SonarQube analysis (requires running SonarQube server)
pnpm sonar

# Local SonarQube
pnpm sonar:local
```

Configuration in `sonar-project.properties`:
- Coverage reports from Jest (lcov format)
- TypeScript analysis
- Quality gate enforcement
- Duplication detection
- Security vulnerability scanning

### Snyk Security Monitoring

```bash
# One-time security scan
pnpm security:scan

# Continuous monitoring
pnpm security:monitor
```

### Recommended Production Monitoring Stack

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection from all services |
| Grafana | Dashboards and alerting |
| Jaeger/Zipkin | Distributed tracing |
| ELK Stack | Centralized logging (already have Elasticsearch + Kibana) |
| PagerDuty/OpsGenie | Incident alerting |

### Key Metrics to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| API response time (p95) | Gateway API | > 500ms |
| API error rate | Gateway API | > 1% |
| Workflow failure rate | Temporal | > 5% |
| Workflow queue depth | Temporal | > 100 |
| Redis memory usage | Redis | > 80% |
| Elasticsearch cluster status | Elasticsearch | Yellow or Red |
| Kafka consumer lag | Kafka | > 10000 |
| PostgreSQL connections | PostgreSQL | > 80% of max |

---

## Backup Strategy

### PostgreSQL (Temporal Data)

```bash
# Daily backup
pg_dump -h localhost -U temporal -d temporal > backup_$(date +%Y%m%d).sql

# Automated backup with cron
0 2 * * * pg_dump -h localhost -U temporal -d temporal | gzip > /backups/temporal_$(date +\%Y\%m\%d).sql.gz
```

### Redis

```bash
# Manual RDB snapshot
docker exec foodbot-redis redis-cli -a foodbot-redis-password BGSAVE

# Copy RDB file
docker cp foodbot-redis:/data/dump.rdb ./backups/redis_$(date +%Y%m%d).rdb
```

Redis is configured with AOF persistence for durability.

### Elasticsearch

```bash
# Register snapshot repository
curl -X PUT "localhost:9200/_snapshot/backups" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/usr/share/elasticsearch/backups"
  }
}'

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/backups/snapshot_$(date +%Y%m%d)"
```

### Kafka

Kafka retains messages based on configured retention period (default: 168 hours / 7 days). For long-term backup:

```bash
# Use Kafka Connect S3 Sink or similar for archival
# Configure topic retention policies per use case
```

### Docker Volumes

```bash
# List volumes
docker volume ls | grep foodbot

# Backup a volume
docker run --rm -v foodbot-postgres-data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-data.tar.gz /data
```

### Recommended Backup Schedule

| Data | Frequency | Retention |
|------|-----------|-----------|
| PostgreSQL | Daily (full), Hourly (WAL) | 30 days |
| Redis RDB | Every 6 hours | 7 days |
| Elasticsearch snapshots | Daily | 30 days |
| Docker volumes | Weekly | 14 days |
| Application configuration | On change (via Git) | Indefinite |

---

## Troubleshooting

### Service Won't Start

```bash
# Check Docker logs
docker-compose logs <service-name>

# Check resource usage
docker stats

# Restart a specific service
docker-compose restart <service-name>
```

### Elasticsearch Out of Memory

```bash
# Increase memory allocation in docker-compose.yml
environment:
  - ES_JAVA_OPTS=-Xms1g -Xmx1g

# Check cluster health
curl http://localhost:9200/_cluster/health?pretty
```

### Kafka Consumer Lag

```bash
# Check consumer groups
docker exec foodbot-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 --list

# Describe consumer group
docker exec foodbot-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --group <group-name>
```

### Temporal Workflow Stuck

1. Open Temporal UI at http://localhost:8080
2. Navigate to the stuck workflow
3. Check the event history for errors
4. Verify workers are running and connected to the correct task queue

### Redis Connection Refused

```bash
# Check if Redis is running
docker exec foodbot-redis redis-cli -a foodbot-redis-password ping

# Check max connections
docker exec foodbot-redis redis-cli -a foodbot-redis-password info clients
```

### Port Conflicts

If a port is already in use:

```bash
# Find the process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
```

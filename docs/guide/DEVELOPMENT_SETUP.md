# FoodBot Development Setup Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Prerequisites](#1-prerequisites)
- [2. Clone and Install](#2-clone-and-install)
- [3. Environment Setup](#3-environment-setup)
- [4. Infrastructure Services](#4-infrastructure-services)
- [5. Running Services Locally](#5-running-services-locally)
- [6. Database Setup](#6-database-setup)
- [7. Kafka Setup](#7-kafka-setup)
- [8. Temporal Setup](#8-temporal-setup)
- [9. Elasticsearch Setup](#9-elasticsearch-setup)
- [10. Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|-------------|
| Node.js | >= 20 | https://nodejs.org/ or `nvm install 20` |
| pnpm | >= 8 | `npm install -g pnpm` |
| Docker | >= 24 | https://docs.docker.com/get-docker/ |
| Docker Compose | v2+ | Included with Docker Desktop |
| Java | 17+ | `brew install openjdk@17` (macOS) |
| Maven | 3.9+ | `brew install maven` (macOS) |
| Git | >= 2.30 | https://git-scm.com/ |

### Recommended Tools

| Tool | Purpose |
|------|---------|
| VS Code | IDE with TypeScript, ESLint, Prettier extensions |
| IntelliJ IDEA | Java/Spring Boot development (MCP Orchestrator) |
| Postman / Insomnia | API testing |
| DBeaver | Database management |
| RedisInsight | Redis data browser (alternative to Redis Commander) |

### System Requirements

- **RAM:** 8 GB minimum, 16 GB recommended (Docker services consume ~4 GB)
- **Disk:** 20 GB free space
- **CPU:** 4+ cores recommended

---

## 2. Clone and Install

```bash
# Clone the repository
git clone https://github.com/foodbot/foodbot.git
cd foodbot

# Install all dependencies (monorepo)
pnpm install

# Verify installation
pnpm test:unit
```

---

## 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# At minimum, set JWT secrets:
#   JWT_SECRET=<generate with: openssl rand -base64 32>
#   JWT_REFRESH_SECRET=<generate with: openssl rand -base64 32>
```

### Required Environment Variables

| Variable | How to Get |
|----------|-----------|
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -base64 32` |

### Optional Environment Variables

| Variable | Default | When Needed |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | -- | When using Claude AI features |
| `OPENAI_API_KEY` | -- | When using OpenAI features |
| `SWIGGY_API_KEY` | -- | When enabling Swiggy provider |
| `ZOMATO_API_KEY` | -- | When enabling Zomato provider |

---

## 4. Infrastructure Services

### Start All Services

```bash
# Start all infrastructure (PostgreSQL, Redis, Kafka, Elasticsearch, Temporal)
docker-compose up -d

# Wait for all services to be healthy (may take 60-90 seconds)
docker-compose ps

# Verify all services show "healthy" status
```

### Start Specific Services

```bash
# Only PostgreSQL and Redis (minimal for Gateway API)
docker-compose up -d foodbot-db redis

# Add Temporal (for workflow development)
docker-compose up -d postgresql temporal temporal-ui

# Add Kafka (for event streaming)
docker-compose up -d zookeeper kafka kafka-init kafka-ui

# Add Elasticsearch (for search)
docker-compose up -d elasticsearch kibana
```

### Verify Services

| Service | Verification Command |
|---------|---------------------|
| PostgreSQL (App) | `docker exec foodbot-app-db pg_isready -U postgres` |
| Redis | `docker exec foodbot-redis redis-cli ping` |
| Elasticsearch | `curl http://localhost:9200/_cluster/health` |
| Kafka | `docker exec foodbot-kafka kafka-topics --bootstrap-server localhost:9092 --list` |
| Temporal | Open http://localhost:8080 |

---

## 5. Running Services Locally

### Gateway API (NestJS)

```bash
# From the repository root
cd apps/gateway-api

# Development mode (with hot reload)
npx nest start --watch

# The API will be available at http://localhost:3000
# Health check: curl http://localhost:3000/health
```

### MCP Orchestrator (Spring Boot)

```bash
cd services/mcp-orchestrator

# Build and run
mvn spring-boot:run

# Or build JAR and run
mvn clean package -DskipTests
java -jar target/mcp-orchestrator-*.jar

# The service will be available at http://localhost:8081/mcp/v1
# Swagger UI: http://localhost:8081/mcp/v1/swagger-ui.html
```

### Temporal Workers

```bash
cd packages/workflows

# Start workers (connects to Temporal server)
npx ts-node src/workers/worker.ts
```

### Customer App (React)

```bash
cd apps/customer-app

# Development mode (with hot reload)
npx vite dev

# The app will be available at http://localhost:3001 (or next available port)
```

---

## 6. Database Setup

### Application Database

The Gateway API uses TypeORM with `synchronize: true` in development, which automatically creates tables from entity definitions on startup.

**Entities:** Users, Restaurants, Dishes, Orders, OrderItems, Carts, CartItems, Payments, Addresses, Feedback, Workflows

```bash
# Connect to the database
psql -h localhost -p 5433 -U postgres -d foodbot

# Seed initial data (if available)
cd apps/gateway-api
npx ts-node src/database/seeds/initial-seed.ts
```

### Temporal Database

Managed automatically by the `temporalio/auto-setup` Docker image. No manual setup required.

---

## 7. Kafka Setup

Kafka topics are automatically created by the `kafka-init` Docker container. To verify:

```bash
# List all topics
docker exec foodbot-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Describe a specific topic
docker exec foodbot-kafka kafka-topics --bootstrap-server localhost:9092 --describe --topic order.created

# Consume messages from a topic (useful for debugging)
docker exec foodbot-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic order.created --from-beginning
```

### Kafka UI

Access http://localhost:8082 to browse topics, consumer groups, and messages visually.

---

## 8. Temporal Setup

### Verify Temporal is Running

```bash
# Check cluster health
docker exec foodbot-temporal tctl cluster health

# List namespaces
docker exec foodbot-temporal tctl namespace list

# Register the default namespace (if not auto-created)
docker exec foodbot-temporal tctl namespace register default
```

### Temporal UI

Access http://localhost:8080 to:
- View running workflows
- Inspect workflow history
- Search by workflow ID or type

---

## 9. Elasticsearch Setup

### Verify Elasticsearch

```bash
# Cluster health
curl http://localhost:9200/_cluster/health?pretty

# List indices
curl http://localhost:9200/_cat/indices?v

# Search all restaurants
curl http://localhost:9200/restaurants/_search?pretty
```

### Kibana

Access http://localhost:5601 for:
- Dev Tools console for Elasticsearch queries
- Index management
- Dashboard creation

---

## 10. Troubleshooting

### Docker Issues

**Problem:** Services fail to start
```bash
# Check available disk space
docker system df

# Clean up unused resources
docker system prune -a

# Rebuild from scratch
docker-compose down -v
docker-compose up -d
```

**Problem:** Port conflicts
```bash
# Check what is using a port
lsof -i :3000
lsof -i :5433
lsof -i :9200

# Kill the process or change the port in docker-compose.yml
```

### Database Issues

**Problem:** Cannot connect to PostgreSQL
```bash
# Verify the container is running
docker ps | grep foodbot-app-db

# Check logs
docker logs foodbot-app-db

# Test connection
psql -h localhost -p 5433 -U postgres -d foodbot -c "SELECT 1"
```

### Kafka Issues

**Problem:** Topics not created
```bash
# Check if kafka-init completed
docker logs foodbot-kafka-init

# Manually create a topic
docker exec foodbot-kafka kafka-topics --bootstrap-server localhost:9092 --create --topic test.topic --partitions 3 --replication-factor 1
```

### Temporal Issues

**Problem:** Cannot start workflows
```bash
# Check Temporal server logs
docker logs foodbot-temporal

# Verify namespace exists
docker exec foodbot-temporal tctl namespace describe default

# Check if workers are connected
# Open Temporal UI (http://localhost:8080) > Task Queues
```

### Elasticsearch Issues

**Problem:** Cluster status RED
```bash
# Check cluster health
curl http://localhost:9200/_cluster/health?pretty

# Check unassigned shards
curl http://localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason

# In single-node dev setup, set replicas to 0
curl -X PUT http://localhost:9200/_settings -H 'Content-Type: application/json' -d '{"index.number_of_replicas": 0}'
```

### Node.js / pnpm Issues

**Problem:** Module resolution errors
```bash
# Clear cache and reinstall
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -rf services/*/node_modules
pnpm install
```

**Problem:** TypeScript compilation errors
```bash
# Check TypeScript version
npx tsc --version

# Run type check
npx tsc --noEmit
```

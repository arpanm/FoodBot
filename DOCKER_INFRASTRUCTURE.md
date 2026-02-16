# 🐳 Docker Infrastructure Guide

Complete Docker infrastructure for FoodBot with Temporal, Redis, Elasticsearch,
and Kafka.

---

## 📦 Services Included

### Core Services

| Service             | Port(s)    | Purpose                 | UI/Access                        |
| ------------------- | ---------- | ----------------------- | -------------------------------- |
| **Temporal**        | 7233, 7234 | Workflow orchestration  | http://localhost:8080            |
| **Redis**           | 6379       | Caching & sessions      | http://localhost:8081            |
| **Elasticsearch**   | 9200, 9300 | Search & analytics      | http://localhost:5601 (Kibana)   |
| **Kafka**           | 9092       | Event streaming         | http://localhost:8082 (Kafka UI) |
| **PostgreSQL**      | 5432       | Temporal database       | localhost:5432                   |
| **Zookeeper**       | 2181       | Kafka coordination      | localhost:2181                   |
| **Schema Registry** | 8083       | Kafka schema management | http://localhost:8083            |

### Management UIs

| Service             | Port | URL                   | Purpose             |
| ------------------- | ---- | --------------------- | ------------------- |
| **Temporal UI**     | 8080 | http://localhost:8080 | Workflow management |
| **Redis Commander** | 8081 | http://localhost:8081 | Redis management    |
| **Kafka UI**        | 8082 | http://localhost:8082 | Kafka management    |
| **Kibana**          | 5601 | http://localhost:5601 | Elasticsearch UI    |

---

## 🚀 Quick Start

### 1. Start All Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 2. Start with Development Overrides

```bash
# Use development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 3. Stop All Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: Data will be lost)
docker-compose down -v
```

---

## 🔧 Individual Service Management

### Start Specific Services

```bash
# Start only Temporal stack
docker-compose up -d postgresql temporal temporal-ui

# Start only Kafka stack
docker-compose up -d zookeeper kafka kafka-ui schema-registry

# Start only Redis
docker-compose up -d redis redis-commander

# Start only Elasticsearch
docker-compose up -d elasticsearch kibana
```

### View Service Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f temporal
docker-compose logs -f kafka
docker-compose logs -f redis
docker-compose logs -f elasticsearch
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart temporal
docker-compose restart kafka
```

---

## 📊 Service Configuration

### Temporal Server

**Configuration:**

- **gRPC Port:** 7233
- **HTTP Port:** 7234
- **Database:** PostgreSQL
- **Namespace:** default

**Access:**

```bash
# Using tctl (Temporal CLI)
tctl --address localhost:7233 namespace list
tctl --address localhost:7233 workflow list

# Health check
curl http://localhost:7234/api/v1/health
```

**Environment Variables:**

```bash
TEMPORAL_HOST=temporal
TEMPORAL_PORT=7233
TEMPORAL_NAMESPACE=default
```

### Redis

**Configuration:**

- **Port:** 6379
- **Password:** foodbot-redis-password
- **Persistence:** Enabled (AOF)

**Access:**

```bash
# Using redis-cli
docker exec -it foodbot-redis redis-cli -a foodbot-redis-password

# Commands
> PING
> SET test "Hello"
> GET test
> INFO
```

**Connection String:**

```bash
redis://:foodbot-redis-password@localhost:6379
```

### Elasticsearch

**Configuration:**

- **HTTP Port:** 9200
- **Transport Port:** 9300
- **Security:** Disabled (dev mode)
- **Memory:** 512MB heap

**Access:**

```bash
# Check cluster health
curl http://localhost:9200/_cluster/health?pretty

# List indices
curl http://localhost:9200/_cat/indices?v

# Create index
curl -X PUT http://localhost:9200/orders

# Search
curl http://localhost:9200/orders/_search?pretty
```

**Kibana Access:** http://localhost:5601

### Kafka

**Configuration:**

- **Internal Port:** 9092 (for Docker services)
- **External Port:** 29092 (for host machine)
- **Zookeeper:** localhost:2181
- **Replication Factor:** 1

**Access:**

```bash
# Create topic
docker exec foodbot-kafka kafka-topics --create \
  --topic orders \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

# List topics
docker exec foodbot-kafka kafka-topics --list \
  --bootstrap-server localhost:9092

# Produce message
docker exec -it foodbot-kafka kafka-console-producer \
  --topic orders \
  --bootstrap-server localhost:9092

# Consume messages
docker exec -it foodbot-kafka kafka-console-consumer \
  --topic orders \
  --from-beginning \
  --bootstrap-server localhost:9092
```

**Kafka UI Access:** http://localhost:8082

---

## 🔌 Application Connection Examples

### Node.js Connection Snippets

#### Temporal

```typescript
import { Connection, Client } from '@temporalio/client';

const connection = await Connection.connect({
  address: 'localhost:7233',
});

const client = new Client({
  connection,
  namespace: 'default',
});
```

#### Redis

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'foodbot-redis-password',
});

await redis.set('key', 'value');
const value = await redis.get('key');
```

#### Elasticsearch

```typescript
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: 'http://localhost:9200',
});

await client.index({
  index: 'orders',
  document: { orderId: '123', total: 50.0 },
});
```

#### Kafka

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'foodbot',
  brokers: ['localhost:29092'],
});

const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'orders',
  messages: [{ value: JSON.stringify({ orderId: '123' }) }],
});
```

---

## 📝 Environment Variables

Copy `.env.docker` to `.env` for your application:

```bash
cp .env.docker .env
```

**Key Variables:**

```bash
# Temporal
TEMPORAL_HOST=localhost
TEMPORAL_PORT=7233

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=foodbot-redis-password

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200

# Kafka
KAFKA_BROKERS=localhost:29092
SCHEMA_REGISTRY_URL=http://localhost:8083
```

---

## 🔍 Health Checks

### Check All Services

```bash
# Check Docker service status
docker-compose ps

# Check health of all services
docker-compose ps | grep "healthy"
```

### Individual Health Checks

```bash
# Temporal
curl http://localhost:7234/api/v1/health

# Redis
docker exec foodbot-redis redis-cli -a foodbot-redis-password PING

# Elasticsearch
curl http://localhost:9200/_cluster/health

# Kafka
docker exec foodbot-kafka kafka-broker-api-versions \
  --bootstrap-server localhost:9092
```

---

## 🗑️ Data Management

### Backup Data

```bash
# Backup PostgreSQL
docker exec foodbot-postgresql pg_dump -U temporal temporal > backup-temporal.sql

# Backup Redis
docker exec foodbot-redis redis-cli -a foodbot-redis-password SAVE
docker cp foodbot-redis:/data/dump.rdb ./backup-redis.rdb
```

### Restore Data

```bash
# Restore PostgreSQL
docker exec -i foodbot-postgresql psql -U temporal temporal < backup-temporal.sql

# Restore Redis
docker cp ./backup-redis.rdb foodbot-redis:/data/dump.rdb
docker-compose restart redis
```

### Clear All Data

```bash
# Stop and remove all volumes (CAUTION!)
docker-compose down -v

# Remove specific volumes
docker volume rm foodbot-postgres-data
docker volume rm foodbot-redis-data
docker volume rm foodbot-kafka-data
docker volume rm foodbot-elasticsearch-data
```

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Check resource usage
docker stats

# Restart service
docker-compose restart [service-name]
```

### Port Already in Use

```bash
# Find process using port
lsof -i :7233  # Temporal
lsof -i :6379  # Redis
lsof -i :9200  # Elasticsearch
lsof -i :9092  # Kafka

# Kill process or change port in docker-compose.yml
```

### Out of Memory

```bash
# Increase Docker memory limit
# Docker Desktop -> Settings -> Resources -> Memory

# Or reduce service memory in docker-compose.yml
```

### Connection Refused

```bash
# Wait for service to be healthy
docker-compose ps

# Check if service is listening
docker exec [container] netstat -tuln

# Check network connectivity
docker network inspect foodbot-network
```

---

## 📊 Monitoring & Metrics

### Resource Usage

```bash
# Real-time stats
docker stats

# Specific service
docker stats foodbot-temporal foodbot-kafka
```

### Logs

```bash
# Follow all logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f temporal
```

---

## 🔐 Security Notes

**⚠️ IMPORTANT:**

- Default passwords are used (development only)
- Security features are disabled for Elasticsearch
- No authentication on Kafka
- **DO NOT use in production without proper security configuration**

**Production Checklist:**

- [ ] Change all default passwords
- [ ] Enable Elasticsearch security (xpack)
- [ ] Configure Kafka SASL/SSL
- [ ] Use Redis AUTH
- [ ] Set up network isolation
- [ ] Enable Temporal mTLS
- [ ] Configure proper firewall rules

---

## 📚 Additional Resources

- **Temporal Docs:** https://docs.temporal.io/
- **Redis Docs:** https://redis.io/docs/
- **Elasticsearch Docs:** https://www.elastic.co/guide/
- **Kafka Docs:** https://kafka.apache.org/documentation/

---

## 🎯 Common Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Restart everything
docker-compose restart

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Remove everything (including data)
docker-compose down -v

# Rebuild images
docker-compose build

# Pull latest images
docker-compose pull
```

---

**Status:** Ready for development! 🚀

Run `docker-compose up -d` to start all services.

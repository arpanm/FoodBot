# FoodBot Troubleshooting Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Common Issues and Solutions](#1-common-issues-and-solutions)
- [2. Service-Specific Debugging](#2-service-specific-debugging)
- [3. Log Locations](#3-log-locations)
- [4. Useful Commands](#4-useful-commands)
- [5. Performance Issues](#5-performance-issues)
- [6. Database Issues](#6-database-issues)
- [7. Kafka Issues](#7-kafka-issues)
- [8. Temporal Issues](#8-temporal-issues)

---

## 1. Common Issues and Solutions

### Application Will Not Start

**Symptom:** `Error: Cannot find module` or `MODULE_NOT_FOUND`

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules services/*/node_modules
pnpm install
```

**Symptom:** `Error: connect ECONNREFUSED localhost:5433`

**Solution:** PostgreSQL is not running.
```bash
docker-compose up -d foodbot-db
docker exec foodbot-app-db pg_isready -U postgres
```

**Symptom:** `Error: connect ECONNREFUSED localhost:6379`

**Solution:** Redis is not running.
```bash
docker-compose up -d redis
docker exec foodbot-redis redis-cli ping
```

### Authentication Errors

**Symptom:** `401 Unauthorized` on all requests

**Solutions:**
1. Verify JWT_SECRET is set: `echo $JWT_SECRET`
2. Verify token is not expired
3. Check if token is blacklisted in Redis:
   ```bash
   docker exec foodbot-redis redis-cli keys "blacklist:*"
   ```
4. Verify token format: `Authorization: Bearer <token>` (note the space)

**Symptom:** `403 Forbidden`

**Solution:** The user's role does not have permission. Check the `@Roles()` decorator on the endpoint and verify the user's role in the database.

### Port Conflicts

**Symptom:** `Error: listen EADDRINUSE :::3000`

**Solution:**
```bash
# Find and kill the process using the port
lsof -i :3000
kill -9 <PID>

# Or change the port
PORT=3001 npx nest start
```

---

## 2. Service-Specific Debugging

### Gateway API (NestJS)

```bash
# Enable debug logging
NODE_ENV=development DEBUG=* npx nest start

# Check database connection
cd apps/gateway-api
npx ts-node -e "
  const { DataSource } = require('typeorm');
  const ds = new DataSource({ type: 'postgres', host: 'localhost', port: 5433, username: 'postgres', password: 'postgres', database: 'foodbot' });
  ds.initialize().then(() => console.log('DB OK')).catch(e => console.error(e));
"
```

### MCP Orchestrator (Spring Boot)

```bash
# Enable debug logging
cd services/mcp-orchestrator
mvn spring-boot:run -Dspring-boot.run.arguments="--logging.level.com.foodbot.mcp=DEBUG"

# Check Elasticsearch connectivity
curl http://localhost:9200/_cluster/health?pretty

# Check Redis connectivity
docker exec foodbot-redis redis-cli -a foodbot-redis-password ping
```

### Temporal Workers

```bash
# Check if workers are registered
# Open Temporal UI: http://localhost:8080
# Navigate to: Task Queues > foodbot-main-queue

# Run worker with verbose logging
cd packages/workflows
LOG_LEVEL=debug npx ts-node src/workers/worker.ts
```

### Notification Service

```bash
# Check Kafka consumer group status
docker exec foodbot-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group notification-service \
  --describe
```

---

## 3. Log Locations

| Service | Location | Format |
|---------|----------|--------|
| Gateway API | stdout | JSON (Pino) |
| MCP Orchestrator | `services/mcp-orchestrator/logs/mcp-orchestrator.log` | JSON (Logback) |
| MCP Orchestrator | stdout | Text (console) |
| Notification Service | stdout | JSON (Pino) |
| Temporal Server | `docker logs foodbot-temporal` | Text |
| PostgreSQL | `docker logs foodbot-app-db` | Text |
| Redis | `docker logs foodbot-redis` | Text |
| Elasticsearch | `docker logs foodbot-elasticsearch` | JSON |
| Kafka | `docker logs foodbot-kafka` | Text |

### Viewing Logs

```bash
# All Docker services
docker-compose logs -f

# Specific service
docker-compose logs -f kafka

# Last 100 lines
docker-compose logs --tail=100 temporal

# Filter by pattern
docker-compose logs kafka 2>&1 | grep "ERROR"
```

---

## 4. Useful Commands

### Docker

```bash
# Check all container status
docker-compose ps

# Restart a specific service
docker-compose restart redis

# View resource usage
docker stats

# Clean up everything
docker-compose down -v
docker system prune -a
```

### Database

```bash
# Connect to FoodBot database
psql -h localhost -p 5433 -U postgres -d foodbot

# List all tables
psql -h localhost -p 5433 -U postgres -d foodbot -c "\dt"

# Check table row counts
psql -h localhost -p 5433 -U postgres -d foodbot -c "
  SELECT schemaname, tablename, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC;
"
```

### Redis

```bash
# Connect to Redis
docker exec -it foodbot-redis redis-cli -a foodbot-redis-password

# Check memory usage
docker exec foodbot-redis redis-cli -a foodbot-redis-password INFO memory

# List all keys (development only)
docker exec foodbot-redis redis-cli -a foodbot-redis-password KEYS "*"

# Flush all data (development only)
docker exec foodbot-redis redis-cli -a foodbot-redis-password FLUSHALL
```

### Elasticsearch

```bash
# Cluster health
curl http://localhost:9200/_cluster/health?pretty

# List indices
curl http://localhost:9200/_cat/indices?v

# Count documents in an index
curl http://localhost:9200/restaurants/_count?pretty

# Search for a restaurant
curl "http://localhost:9200/restaurants/_search?q=pizza&pretty"

# Delete an index (development only)
curl -X DELETE http://localhost:9200/restaurants
```

### Kafka

```bash
# List topics
docker exec foodbot-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Describe a topic
docker exec foodbot-kafka kafka-topics --bootstrap-server localhost:9092 --describe --topic order.created

# Consume messages (for debugging)
docker exec foodbot-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic order.created \
  --from-beginning \
  --max-messages 10

# Check consumer group lag
docker exec foodbot-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group mcp-indexer \
  --describe
```

### Temporal

```bash
# List running workflows
docker exec foodbot-temporal tctl workflow list --open

# Describe a workflow
docker exec foodbot-temporal tctl workflow describe -w <workflow-id>

# List task queues
docker exec foodbot-temporal tctl taskqueue describe -tq foodbot-main-queue
```

---

## 5. Performance Issues

### Slow API Responses

1. **Check database queries:** Enable query logging in TypeORM and look for slow queries.
2. **Check Redis cache:** Verify cache hit rate in Redis Commander (http://localhost:8081).
3. **Check external calls:** MCP Orchestrator circuit breakers may be open.
4. **Check Temporal:** Workflow execution may be slow due to activity retries.

### High Memory Usage

1. **Node.js:** Check for memory leaks with `--inspect` flag and Chrome DevTools.
2. **Elasticsearch:** Verify heap size is appropriate (512 MB in dev, 8 GB in prod).
3. **Kafka:** Check if consumer lag is causing message backlog.

### Slow Elasticsearch Queries

1. Check index health: `curl http://localhost:9200/_cat/indices?v`
2. Check shard allocation: `curl http://localhost:9200/_cat/shards?v`
3. Profile a slow query: Add `"profile": true` to the search request body.

---

## 6. Database Issues

### Connection Pool Exhausted

**Symptom:** `Error: Cannot acquire a connection from the pool`

**Solution:**
1. Increase pool size: `DB_POOL_SIZE=20`
2. Check for connection leaks (unclosed connections)
3. Verify idle timeout: `DB_IDLE_TIMEOUT=30000`

### Migration Failures

**Symptom:** `Error: relation already exists` or schema mismatch

**Solution:**
1. In development, set `synchronize: true` in TypeORM config
2. In production, run migrations: `npx typeorm migration:run`
3. To revert: `npx typeorm migration:revert`

---

## 7. Kafka Issues

### Consumer Lag Growing

**Symptom:** Messages accumulating in topics without being consumed

**Solutions:**
1. Verify consumer is running and connected
2. Check consumer group status:
   ```bash
   docker exec foodbot-kafka kafka-consumer-groups \
     --bootstrap-server localhost:9092 \
     --group mcp-indexer --describe
   ```
3. Increase consumer instances or partition count
4. Check for processing errors in consumer logs

### Messages Not Produced

**Symptom:** Topics show 0 messages despite API activity

**Solutions:**
1. Verify Kafka is healthy: `docker-compose ps kafka`
2. Check Gateway API Kafka configuration
3. Verify topic exists: `docker exec foodbot-kafka kafka-topics --list --bootstrap-server localhost:9092`
4. Check for serialization errors in producer logs

---

## 8. Temporal Issues

### Workflow Stuck in Running State

**Symptom:** Workflow appears as "Running" for an unusually long time

**Solutions:**
1. Check if workers are connected: Temporal UI > Task Queues
2. Check activity timeout configuration
3. Check for activity failures in workflow history
4. Manually terminate if necessary:
   ```bash
   docker exec foodbot-temporal tctl workflow terminate -w <workflow-id> -r "manual intervention"
   ```

### Workers Not Picking Up Tasks

**Symptom:** Workflows start but activities never execute

**Solutions:**
1. Verify workers are running on the correct task queue
2. Check worker logs for connection errors
3. Verify Temporal server is healthy: `docker exec foodbot-temporal tctl cluster health`
4. Check namespace: `docker exec foodbot-temporal tctl namespace describe default`

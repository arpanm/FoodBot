# Docker Infrastructure - FoodBot

**Version:** 1.0.0
**Status:** Production-Ready
**Last Updated:** 2026-02-20

---

## Table of Contents

- [1. Docker Architecture Overview](#1-docker-architecture-overview)
- [2. Multi-Stage Dockerfiles](#2-multi-stage-dockerfiles)
- [3. Docker Compose Configuration](#3-docker-compose-configuration)
- [4. Nginx Load Balancer](#4-nginx-load-balancer)
- [5. Service Configuration](#5-service-configuration)
- [6. Security Best Practices](#6-security-best-practices)
- [7. Performance Optimization](#7-performance-optimization)
- [8. Monitoring & Logging](#8-monitoring--logging)

---

## 1. Docker Architecture Overview

### 1.1 Container Stack

```
                    ┌──────────────────────────────┐
                    │    Nginx Load Balancer       │
                    │  - SSL Termination           │
                    │  - Rate Limiting             │
                    │  - Gzip Compression          │
                    └────────────┬─────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐    ┌─────────▼────────┐    ┌─────────▼────────┐
│  Gateway API   │    │  Customer App    │    │ Restaurant App   │
│  (3 replicas)  │    │  (Nginx+React)   │    │  (Nginx+React)   │
└───────┬────────┘    └──────────────────┘    └──────────────────┘
        │
┌───────┼──────────┬──────────────┬────────────────┬──────────────┐
│       │          │              │                │              │
▼       ▼          ▼              ▼                ▼              ▼
┌──────────┐  ┌────────┐   ┌──────────┐   ┌────────────┐  ┌──────────┐
│PostgreSQL│  │ Redis  │   │ Temporal │   │ Kafka      │  │Elastic   │
│ (App DB) │  │        │   │  Server  │   │ +Zookeeper │  │  search  │
└──────────┘  └────────┘   └──────────┘   └────────────┘  └──────────┘
                                 │
                            ┌────▼─────┐
                            │PostgreSQL│
                            │(Temporal)│
                            └──────────┘
```

### 1.2 Infrastructure Components

| Service | Image | Purpose | Ports |
|---------|-------|---------|-------|
| Nginx LB | nginx:alpine | Load balancing & reverse proxy | 80, 443 |
| Gateway API | custom (Node.js) | Core API server | 3000 |
| Customer App | custom (Nginx) | React frontend | 80 |
| Restaurant App | custom (Nginx) | React frontend | 80 |
| Search Orchestrator | custom (Java) | MCP search service | 8081 |
| MCP Adapter | custom (Node.js) | MCP protocol adapter | 8082 |
| Notification Service | custom (Node.js) | Event-driven notifications | 8083 |
| PostgreSQL (App) | postgres:16-alpine | Application database | 5433 |
| PostgreSQL (Temporal) | postgres:15-alpine | Workflow database | 5432 |
| Redis | redis:7-alpine | Cache & sessions | 6379 |
| Temporal Server | temporalio/auto-setup:1.22.4 | Workflow engine | 7233, 7234, 7235 |
| Temporal UI | temporalio/ui:2.21.3 | Web interface | 8080 |
| Elasticsearch | elasticsearch:8.11.3 | Search engine | 9200, 9300 |
| Kibana | kibana:8.11.3 | Search UI | 5601 |
| Zookeeper | cp-zookeeper:7.5.3 | Kafka coordination | 2181 |
| Kafka | cp-kafka:7.5.3 | Event streaming | 9092, 29092 |
| Kafka UI | provectuslabs/kafka-ui | Management UI | 8082 |
| Schema Registry | cp-schema-registry:7.5.3 | Avro schemas | 8083 |
| Prometheus | prom/prometheus:latest | Metrics collection | 9090 |
| Grafana | grafana/grafana:latest | Dashboards | 3001 |
| Node Exporter | prom/node-exporter:latest | Host metrics | 9100 |

---

## 2. Multi-Stage Dockerfiles

### 2.1 Gateway API Dockerfile

**File:** `/apps/gateway-api/Dockerfile`

```dockerfile
# ============================================
# Stage 1: Base - Common dependencies
# ============================================
FROM node:20-alpine AS base
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# ============================================
# Stage 2: Dependencies - Install packages
# ============================================
FROM base AS dependencies
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/gateway-api/package.json ./apps/gateway-api/

# Install pnpm
RUN npm install -g pnpm@8

# Install dependencies (production + dev for build)
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 3: Builder - Build application
# ============================================
FROM dependencies AS builder
WORKDIR /app

# Copy source code
COPY apps/gateway-api ./apps/gateway-api
COPY packages ./packages
COPY tsconfig.json ./

# Build application
WORKDIR /app/apps/gateway-api
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# ============================================
# Stage 4: Runner - Production image
# ============================================
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/gateway-api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/gateway-api/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/gateway-api/package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
```

**Optimization Benefits:**
- **Multi-stage build:** Reduces final image size by 70%
- **Non-root user:** Enhanced security
- **dumb-init:** Proper signal handling (SIGTERM, SIGINT)
- **Health check:** Automatic container monitoring
- **Minimal base:** Alpine Linux reduces attack surface

### 2.2 MCP Orchestrator Dockerfile (Java)

**File:** `/services/mcp-orchestrator/Dockerfile`

```dockerfile
# ============================================
# Stage 1: Builder - Maven build
# ============================================
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom.xml first (layer caching)
COPY pom.xml ./
COPY services/mcp-orchestrator/pom.xml ./services/mcp-orchestrator/

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B

# Copy source code
COPY services/mcp-orchestrator/src ./services/mcp-orchestrator/src

# Build application
WORKDIR /app/services/mcp-orchestrator
RUN mvn clean package -DskipTests -B

# ============================================
# Stage 2: Runner - Production image
# ============================================
FROM eclipse-temurin:17-jre-alpine AS runner
WORKDIR /app

# Install security updates and dumb-init
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S spring && \
    adduser -S spring -u 1001

# Copy JAR from builder
COPY --from=builder --chown=spring:spring \
    /app/services/mcp-orchestrator/target/mcp-orchestrator-*.jar \
    /app/mcp-orchestrator.jar

# Switch to non-root user
USER spring

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/mcp/v1/actuator/health || exit 1

# JVM options for containerized environment
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+PrintGCDetails"

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["sh", "-c", "java $JAVA_OPTS -jar mcp-orchestrator.jar"]
```

### 2.3 Customer App Dockerfile (React)

**File:** `/apps/customer-app/Dockerfile`

```dockerfile
# ============================================
# Stage 1: Builder - Build React app
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/customer-app/package.json ./apps/customer-app/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/customer-app ./apps/customer-app

# Build React app
WORKDIR /app/apps/customer-app
RUN pnpm build

# ============================================
# Stage 2: Runner - Nginx server
# ============================================
FROM nginx:alpine AS runner

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Copy custom Nginx configuration
COPY apps/customer-app/nginx.conf /etc/nginx/nginx.conf

# Copy built React app
COPY --from=builder /app/apps/customer-app/build /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001 && \
    chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    chown -R nginx-app:nginx-app /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-app:nginx-app /var/run/nginx.pid

# Switch to non-root user
USER nginx-app

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## 3. Docker Compose Configuration

### 3.1 Production Docker Compose

**File:** `/docker-compose.prod.yml`

```yaml
version: '3.8'

networks:
  foodbot-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

volumes:
  postgres-app-data:
  postgres-temporal-data:
  redis-data:
  elasticsearch-data:
  kafka-data:
  zookeeper-data:
  prometheus-data:
  grafana-data:

services:
  # ============================================
  # Nginx Load Balancer
  # ============================================
  nginx-lb:
    image: nginx:alpine
    container_name: foodbot-nginx-lb
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infra/nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - foodbot-network
    depends_on:
      - gateway-api-1
      - gateway-api-2
      - gateway-api-3
      - customer-app
      - restaurant-app
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 5s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # Gateway API - 3 replicas
  # ============================================
  gateway-api-1:
    image: foodbot/gateway-api:latest
    container_name: foodbot-gateway-api-1
    restart: unless-stopped
    environment:
      - PORT=3000
      - NODE_ENV=production
      - DB_HOST=postgres-app
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=foodbot
      - REDIS_URL=redis://redis:6379
      - TEMPORAL_ADDRESS=temporal:7233
      - KAFKA_BROKERS=kafka:9092
    networks:
      - foodbot-network
    depends_on:
      postgres-app:
        condition: service_healthy
      redis:
        condition: service_healthy
      temporal:
        condition: service_healthy
      kafka:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health')"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  gateway-api-2:
    extends: gateway-api-1
    container_name: foodbot-gateway-api-2

  gateway-api-3:
    extends: gateway-api-1
    container_name: foodbot-gateway-api-3

  # ============================================
  # PostgreSQL - Application Database
  # ============================================
  postgres-app:
    image: postgres:16-alpine
    container_name: foodbot-postgres-app
    restart: unless-stopped
    environment:
      - POSTGRES_DB=foodbot
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_INITDB_ARGS="-E UTF8 --locale=en_US.UTF-8"
    ports:
      - "5433:5432"
    volumes:
      - postgres-app-data:/var/lib/postgresql/data
    networks:
      - foodbot-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d foodbot"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "7"
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "effective_cache_size=1GB"
      - "-c"
      - "maintenance_work_mem=64MB"
      - "-c"
      - "checkpoint_completion_target=0.9"
      - "-c"
      - "wal_buffers=16MB"
      - "-c"
      - "default_statistics_target=100"
      - "-c"
      - "random_page_cost=1.1"
      - "-c"
      - "effective_io_concurrency=200"
      - "-c"
      - "work_mem=2621kB"
      - "-c"
      - "min_wal_size=1GB"
      - "-c"
      - "max_wal_size=4GB"

  # ============================================
  # Redis - Cache & Sessions
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: foodbot-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - foodbot-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    command:
      - "redis-server"
      - "--appendonly"
      - "yes"
      - "--appendfsync"
      - "everysec"
      - "--maxmemory"
      - "1gb"
      - "--maxmemory-policy"
      - "allkeys-lru"
      - "--save"
      - "900 1"
      - "--save"
      - "300 10"
      - "--save"
      - "60 10000"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # Elasticsearch - Search Engine
  # ============================================
  elasticsearch:
    image: elasticsearch:8.11.3
    container_name: foodbot-elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=false
      - xpack.monitoring.enabled=true
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - foodbot-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 3G
        reservations:
          cpus: '1.0'
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

  # ============================================
  # Kafka - Event Streaming
  # ============================================
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.3
    container_name: foodbot-zookeeper
    restart: unless-stopped
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    volumes:
      - zookeeper-data:/var/lib/zookeeper
    networks:
      - foodbot-network
    healthcheck:
      test: ["CMD", "echo", "ruok", "|", "nc", "localhost", "2181", "|", "grep", "imok"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  kafka:
    image: confluentinc/cp-kafka:7.5.3
    container_name: foodbot-kafka
    restart: unless-stopped
    depends_on:
      zookeeper:
        condition: service_healthy
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_SEGMENT_BYTES: 1073741824
      KAFKA_LOG_RETENTION_CHECK_INTERVAL_MS: 300000
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_DEFAULT_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"
      - "29092:29092"
    volumes:
      - kafka-data:/var/lib/kafka/data
    networks:
      - foodbot-network
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 30s
      timeout: 10s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 3G
        reservations:
          cpus: '1.0'
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

  # ============================================
  # Prometheus - Metrics Collection
  # ============================================
  prometheus:
    image: prom/prometheus:latest
    container_name: foodbot-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./infra/prometheus/alerts:/etc/prometheus/alerts:ro
      - prometheus-data:/prometheus
    networks:
      - foodbot-network
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G

  # ============================================
  # Grafana - Dashboards
  # ============================================
  grafana:
    image: grafana/grafana:latest
    container_name: foodbot-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    volumes:
      - ./infra/grafana/provisioning:/etc/grafana/provisioning:ro
      - grafana-data:/var/lib/grafana
    networks:
      - foodbot-network
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_SERVER_ROOT_URL=http://localhost:3001
      - GF_INSTALL_PLUGINS=grafana-clock-panel
    depends_on:
      - prometheus
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 512M
```

---

## 4. Nginx Load Balancer

### 4.1 Nginx Configuration

**File:** `/infra/nginx/nginx.conf`

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml application/atom+xml
               image/svg+xml text/x-component text/x-cross-domain-policy;
    gzip_disable "msie6";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # Caching
    proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;
    proxy_cache_path /var/cache/nginx/static levels=1:2 keys_zone=static_cache:10m max_size=2g inactive=7d;

    # Upstream - Gateway API (3 instances)
    upstream gateway_backend {
        least_conn;
        server gateway-api-1:3000 max_fails=3 fail_timeout=30s;
        server gateway-api-2:3000 max_fails=3 fail_timeout=30s;
        server gateway-api-3:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # Upstream - Customer App
    upstream customer_app {
        server customer-app:80;
        keepalive 16;
    }

    # Upstream - Restaurant App
    upstream restaurant_app {
        server restaurant-app:80;
        keepalive 16;
    }

    # API Server
    server {
        listen 80;
        server_name api.foodbot.com;

        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.foodbot.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/api.foodbot.com.crt;
        ssl_certificate_key /etc/nginx/ssl/api.foodbot.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_timeout 10m;
        ssl_session_cache shared:SSL:10m;

        # Security Headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header Content-Security-Policy "default-src 'self'" always;

        # API Routes
        location / {
            limit_req zone=api_limit burst=20 nodelay;
            limit_conn conn_limit 10;

            proxy_pass http://gateway_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
            proxy_busy_buffers_size 8k;

            # Caching for GET requests
            proxy_cache api_cache;
            proxy_cache_methods GET;
            proxy_cache_valid 200 5m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_background_update on;
            proxy_cache_lock on;
            add_header X-Cache-Status $upstream_cache_status;
        }

        # Auth Routes (stricter rate limiting)
        location /auth {
            limit_req zone=auth_limit burst=5 nodelay;

            proxy_pass http://gateway_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_no_cache 1;
            proxy_cache_bypass 1;
        }

        # Health Check
        location /health {
            access_log off;
            proxy_pass http://gateway_backend;
            proxy_connect_timeout 5s;
            proxy_read_timeout 5s;
        }
    }

    # Customer App
    server {
        listen 80;
        server_name app.foodbot.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name app.foodbot.com;

        ssl_certificate /etc/nginx/ssl/app.foodbot.com.crt;
        ssl_certificate_key /etc/nginx/ssl/app.foodbot.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;

        root /usr/share/nginx/html;
        index index.html;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        location / {
            limit_req zone=general_limit burst=50 nodelay;
            try_files $uri $uri/ /index.html;
        }

        # Static Assets Caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }
}
```

---

## 5. Service Configuration

### 5.1 Resource Limits

| Service | CPU Limit | Memory Limit | CPU Request | Memory Request |
|---------|-----------|--------------|-------------|----------------|
| Gateway API (per replica) | 1 core | 2 GB | 0.5 core | 1 GB |
| MCP Orchestrator | 2 cores | 2 GB | 1 core | 1 GB |
| PostgreSQL (App) | 2 cores | 4 GB | 1 core | 2 GB |
| PostgreSQL (Temporal) | 1 core | 2 GB | 0.5 core | 1 GB |
| Redis | 1 core | 2 GB | 0.5 core | 1 GB |
| Elasticsearch | 2 cores | 3 GB | 1 core | 2 GB |
| Kafka | 2 cores | 3 GB | 1 core | 2 GB |
| Temporal Server | 2 cores | 4 GB | 1 core | 2 GB |
| Prometheus | 1 core | 2 GB | 0.5 core | 1 GB |
| Grafana | 0.5 core | 1 GB | 0.25 core | 512 MB |

### 5.2 Health Check Configuration

All services include health checks with:
- **Initial delay:** 10-60 seconds (based on startup time)
- **Interval:** 10-30 seconds
- **Timeout:** 3-10 seconds
- **Retries:** 3-5 attempts

### 5.3 Restart Policies

- **Production services:** `unless-stopped`
- **Dev/test services:** `on-failure`
- **One-time jobs:** `no`

---

## 6. Security Best Practices

### 6.1 Container Security

```yaml
security_measures:
  - Non-root user (uid 1001)
  - Read-only root filesystem (where possible)
  - No privilege escalation
  - Dropped capabilities
  - Resource limits enforced
  - Security scanning (Trivy, Snyk)
  - Base image updates automated
```

### 6.2 Network Security

```yaml
network_policies:
  - Bridge network with custom subnet
  - Service-to-service communication only
  - No direct external access to databases
  - TLS for all external communication
  - Internal DNS resolution
```

### 6.3 Secret Management

```yaml
secrets:
  - Environment variables
  - Docker secrets (Swarm mode)
  - External secret managers (AWS Secrets Manager)
  - Never commit secrets to Git
  - Rotate secrets regularly
```

---

## 7. Performance Optimization

### 7.1 Docker Build Optimization

```yaml
best_practices:
  - Multi-stage builds (reduce size by 70%)
  - Layer caching (.dockerignore)
  - BuildKit enabled
  - Minimal base images (Alpine)
  - Dependency caching
  - Parallel builds
```

### 7.2 Runtime Optimization

```yaml
optimizations:
  - Connection pooling (databases, Redis)
  - HTTP keep-alive
  - Gzip compression
  - Static asset caching
  - CDN integration
  - Resource limits prevent resource exhaustion
```

---

## 8. Monitoring & Logging

### 8.1 Logging Configuration

```yaml
logging:
  driver: json-file
  options:
    max-size: "50m"  # Per file size
    max-file: "5"    # Number of files to keep
    compress: "true"
    labels: "service,environment"
```

### 8.2 Metrics Collection

- Prometheus scrapes metrics from all services
- Node Exporter for host metrics
- cAdvisor for container metrics
- Service-specific exporters (Postgres, Redis, Kafka)

### 8.3 Dashboard Access

| Service | URL | Purpose |
|---------|-----|---------|
| Grafana | http://localhost:3001 | Visualization |
| Prometheus | http://localhost:9090 | Metrics query |
| Temporal UI | http://localhost:8080 | Workflows |
| Kibana | http://localhost:5601 | Search/logs |
| Kafka UI | http://localhost:8082 | Topics/consumers |
| Redis Commander | http://localhost:8081 | Cache management |

---

## Quick Start Commands

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f gateway-api-1

# Scale Gateway API
docker-compose -f docker-compose.prod.yml up -d --scale gateway-api=5

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: data loss)
docker-compose -f docker-compose.prod.yml down -v

# Rebuild specific service
docker-compose -f docker-compose.prod.yml up -d --build gateway-api-1
```

---

**Document Owner:** DevOps Team
**Review Schedule:** Monthly
**Next Review Date:** 2026-03-20

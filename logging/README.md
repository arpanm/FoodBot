# FoodBot Centralized Logging System

Comprehensive logging infrastructure using the ELK Stack (Elasticsearch, Logstash, Kibana) with Beats for log collection and APM for application performance monitoring.

## Table of Contents

- [Architecture](#architecture)
- [Components](#components)
- [Quick Start](#quick-start)
- [Log Formats](#log-formats)
- [Indices](#indices)
- [Dashboards](#dashboards)
- [Alerting](#alerting)
- [Troubleshooting](#troubleshooting)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Logs                         │
│  (Gateway API, Customer App, Chrome Extension, etc.)        │
└───────┬─────────────────────────────────────────┬───────────┘
        │                                         │
        │ File Logs                               │ TCP/UDP Logs
        │                                         │
    ┌───▼────────┐                           ┌───▼────────┐
    │  Filebeat  │                           │  Logstash  │
    │ (Collector)│                           │ (Pipeline) │
    └───┬────────┘                           └───┬────────┘
        │                                        │
        │ Beats Protocol                         │
        └────────────┬───────────────────────────┘
                     │
                 ┌───▼──────────────┐
                 │  Elasticsearch   │
                 │  (Storage/Index) │
                 └───┬──────────────┘
                     │
                 ┌───▼─────────┐
                 │   Kibana    │
                 │ (Visualize) │
                 └─────────────┘
```

## Components

### 1. Elasticsearch
- **Purpose:** Stores and indexes all logs
- **Port:** 9200 (HTTP), 9300 (Transport)
- **Indices:**
  - `foodbot-logs-*` - All application logs
  - `foodbot-errors-*` - Error logs only
  - `foodbot-security-*` - Security events
  - `foodbot-performance-*` - Performance metrics
  - `filebeat-foodbot-*` - Filebeat collected logs
  - `metricbeat-foodbot-*` - System metrics

### 2. Logstash
- **Purpose:** Processes, filters, and enriches logs
- **Ports:**
  - 5000 (TCP/UDP) - Application log input
  - 5044 (Beats) - Filebeat input
  - 8080 (HTTP) - Webhook input
  - 9600 (API) - Monitoring
- **Features:**
  - JSON parsing
  - Timestamp normalization
  - Log level categorization
  - HTTP status categorization
  - Performance tagging
  - Security event detection
  - PII masking for payment logs

### 3. Kibana
- **Purpose:** Visualize logs and create dashboards
- **Port:** 5601
- **Access:** http://localhost:5601
- **Features:**
  - Log searching and filtering
  - Custom dashboards
  - Alert management
  - Saved queries

### 4. Filebeat
- **Purpose:** Collects logs from files and Docker containers
- **Sources:**
  - Application log files (`/var/log/foodbot/**/*.log`)
  - Docker container logs
  - Service-specific logs

### 5. Metricbeat
- **Purpose:** Collects system and infrastructure metrics
- **Metrics:**
  - System (CPU, memory, network, disk)
  - Docker containers
  - Elasticsearch cluster
  - Logstash node
  - PostgreSQL database
  - Redis cache

### 6. APM Server
- **Purpose:** Application Performance Monitoring
- **Port:** 8200
- **Features:**
  - Distributed tracing
  - Error tracking
  - Performance metrics
  - Real User Monitoring (RUM)

## Quick Start

### Start ELK Stack

```bash
# Start all logging infrastructure
docker-compose -f docker-compose.logging.yml up -d

# Check status
docker-compose -f docker-compose.logging.yml ps

# View logs
docker-compose -f docker-compose.logging.yml logs -f

# Access Kibana
open http://localhost:5601
```

### Configure Application Logging

#### Gateway API (NestJS)

```typescript
// apps/gateway-api/src/logging/logger.service.ts
import * as winston from 'winston';
import * as Transport from 'winston-transport';

const logstashTransport = new winston.transports.Http({
  host: 'localhost',
  port: 5000,
  path: '/',
  format: winston.format.json(),
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gateway-api' },
  transports: [
    new winston.transports.Console(),
    logstashTransport,
    new winston.transports.File({ filename: '/var/log/foodbot/gateway-api/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/var/log/foodbot/gateway-api/combined.log' }),
  ],
});
```

#### Customer App (React)

```typescript
// apps/customer-app/src/utils/logger.ts
import * as Sentry from '@sentry/react';

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      service: 'customer-app',
      message,
      ...context,
    }));
  },

  error: (message: string, error?: Error, context?: Record<string, any>) => {
    const logEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      service: 'customer-app',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...context,
    };

    console.error(JSON.stringify(logEntry));
    Sentry.captureException(error, { extra: context });

    // Send to Logstash
    fetch('http://localhost:5000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    }).catch(() => {}); // Silent fail
  },
};
```

## Log Formats

### Standard Log Format

All logs should follow this JSON structure:

```json
{
  "level": "info",
  "timestamp": "2024-02-17T10:30:00.000Z",
  "service": "gateway-api",
  "correlationId": "req-abc-123",
  "userId": "user-456",
  "message": "Order created successfully",
  "context": {
    "orderId": "order-789",
    "total": 45.99,
    "items": 3
  }
}
```

### HTTP Request Log Format

```json
{
  "level": "info",
  "timestamp": "2024-02-17T10:30:00.000Z",
  "service": "gateway-api",
  "correlationId": "req-abc-123",
  "message": "HTTP Request",
  "method": "POST",
  "path": "/orders",
  "statusCode": 201,
  "duration": 245,
  "userAgent": "Mozilla/5.0...",
  "clientIp": "192.168.1.100"
}
```

### Error Log Format

```json
{
  "level": "error",
  "timestamp": "2024-02-17T10:30:00.000Z",
  "service": "gateway-api",
  "correlationId": "req-abc-123",
  "message": "Database connection failed",
  "error": {
    "name": "DatabaseError",
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n    at Database.connect..."
  },
  "context": {
    "host": "postgres://db:5432",
    "retryAttempt": 3
  }
}
```

## Indices

### Index Patterns

Create these index patterns in Kibana:

1. **foodbot-logs-\*** - All application logs
2. **foodbot-errors-\*** - Error logs
3. **foodbot-security-\*** - Security events
4. **foodbot-performance-\*** - Performance metrics
5. **metricbeat-foodbot-\*** - System metrics

### Index Lifecycle Management

Logs are retained based on these policies:

- **foodbot-logs-\***: 30 days
- **foodbot-errors-\***: 90 days
- **foodbot-security-\***: 365 days
- **foodbot-performance-\***: 30 days

Configure in Elasticsearch:

```bash
# Create ILM policy
curl -X PUT "localhost:9200/_ilm/policy/foodbot-logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_size": "50gb"
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
'
```

## Dashboards

### Pre-built Dashboards

Import these dashboards in Kibana:

1. **Application Overview**
   - Request rate (RPM)
   - Error rate
   - Average response time
   - Top endpoints
   - HTTP status distribution

2. **Error Analysis**
   - Error count over time
   - Error types distribution
   - Top error messages
   - Error stack traces
   - Affected users

3. **Performance Monitoring**
   - p50, p95, p99 latencies
   - Slow queries
   - Database connection pool
   - Cache hit rates
   - Queue depths

4. **Security Dashboard**
   - Failed login attempts
   - Unauthorized access attempts
   - Rate limit violations
   - Suspicious patterns

5. **Business Metrics**
   - Order creation rate
   - Job processing status
   - Restaurant search trends
   - User activity

### Creating Custom Dashboards

1. Navigate to Kibana → Dashboard → Create dashboard
2. Add visualizations:
   - Line charts for time series
   - Bar charts for distributions
   - Pie charts for proportions
   - Data tables for details
3. Save and share dashboard

## Alerting

### Watcher Alerts

Configure alerts in Elasticsearch Watcher:

#### High Error Rate Alert

```json
{
  "trigger": {
    "schedule": {
      "interval": "1m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["foodbot-logs-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                { "match": { "level": "error" }},
                { "range": { "@timestamp": { "gte": "now-5m" }}}
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total": {
        "gt": 10
      }
    }
  },
  "actions": {
    "send_email": {
      "email": {
        "to": "alerts@foodbot.com",
        "subject": "High Error Rate Alert",
        "body": "Error count: {{ctx.payload.hits.total}}"
      }
    },
    "webhook": {
      "webhook": {
        "method": "POST",
        "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
        "body": "{\"text\":\"High error rate detected: {{ctx.payload.hits.total}} errors in last 5 minutes\"}"
      }
    }
  }
}
```

#### Slow Response Alert

```json
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["foodbot-performance-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                { "range": { "duration_ms": { "gt": 1000 }}},
                { "range": { "@timestamp": { "gte": "now-5m" }}}
              ]
            }
          },
          "aggs": {
            "avg_duration": {
              "avg": {
                "field": "duration_ms"
              }
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.aggregations.avg_duration.value": {
        "gt": 500
      }
    }
  },
  "actions": {
    "notify": {
      "webhook": {
        "method": "POST",
        "url": "https://alerting-service/webhook",
        "body": "{\"message\":\"Average response time is {{ctx.payload.aggregations.avg_duration.value}}ms\"}"
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Elasticsearch not starting

```bash
# Check logs
docker logs foodbot-elasticsearch

# Common fixes:
# - Increase vm.max_map_count
sudo sysctl -w vm.max_map_count=262144

# - Free up disk space (Elasticsearch needs >10% free)
df -h

# - Reset data
docker-compose -f docker-compose.logging.yml down -v
docker-compose -f docker-compose.logging.yml up -d
```

#### 2. Logs not appearing in Kibana

```bash
# Check Filebeat status
docker logs foodbot-filebeat

# Check Logstash pipeline
docker logs foodbot-logstash

# Verify index exists
curl -X GET "localhost:9200/_cat/indices?v"

# Check index pattern in Kibana
# Kibana → Stack Management → Index Patterns
```

#### 3. High memory usage

```bash
# Adjust JVM heap size in docker-compose.logging.yml
environment:
  - "ES_JAVA_OPTS=-Xms512m -Xmx512m"  # Reduce if needed
  - "LS_JAVA_OPTS=-Xms256m -Xmx256m"

# Restart services
docker-compose -f docker-compose.logging.yml restart
```

#### 4. Slow queries

```bash
# Enable slow query log
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "logger.index.search.slowlog": "DEBUG",
    "logger.index.indexing.slowlog": "DEBUG"
  }
}
'

# Analyze slow queries
docker logs foodbot-elasticsearch | grep -i slow
```

### Useful Commands

```bash
# Check Elasticsearch cluster health
curl -X GET "localhost:9200/_cluster/health?pretty"

# List all indices
curl -X GET "localhost:9200/_cat/indices?v"

# Get index stats
curl -X GET "localhost:9200/foodbot-logs-*/_stats?pretty"

# Delete old indices
curl -X DELETE "localhost:9200/foodbot-logs-2024.01.*"

# Reindex
curl -X POST "localhost:9200/_reindex" -H 'Content-Type: application/json' -d'
{
  "source": {
    "index": "foodbot-logs-2024.02.01"
  },
  "dest": {
    "index": "foodbot-logs-2024.02.01-reindexed"
  }
}
'

# Force merge indices
curl -X POST "localhost:9200/foodbot-logs-*/_forcemerge?max_num_segments=1"

# Clear cache
curl -X POST "localhost:9200/_cache/clear"
```

## Production Recommendations

1. **Resource Allocation**
   - Elasticsearch: 4GB RAM minimum, 8GB recommended
   - Logstash: 2GB RAM minimum
   - Kibana: 1GB RAM minimum

2. **Security**
   - Enable X-Pack security
   - Use TLS for all connections
   - Rotate passwords regularly
   - Restrict network access

3. **Backup**
   - Configure snapshot repository
   - Daily automated backups
   - Test restore procedures

4. **Monitoring**
   - Set up cluster monitoring
   - Configure alerts for disk space
   - Monitor index growth rate

5. **Optimization**
   - Use index lifecycle management
   - Configure appropriate shard sizes
   - Enable index caching
   - Use bulk API for ingestion

---

**For more information, see:**
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Filebeat Documentation](https://www.elastic.co/guide/en/beats/filebeat/current/index.html)

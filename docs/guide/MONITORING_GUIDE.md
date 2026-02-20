# FoodBot Monitoring & Observability Guide

**Last Verified**: 2026-02-20
**Status**: ✅ All configurations and paths verified

Production-grade monitoring, logging, and observability implementation for FoodBot.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Monitoring Stack](#monitoring-stack)
5. [Application Instrumentation](#application-instrumentation)
6. [Dashboards & Visualization](#dashboards--visualization)
7. [Alerting](#alerting)
8. [Log Aggregation](#log-aggregation)
9. [Health Checks](#health-checks)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

FoodBot implements a comprehensive observability stack with:

- **Metrics Collection**: Prometheus for time-series metrics
- **Visualization**: Grafana dashboards
- **Log Aggregation**: Loki + Promtail
- **Error Tracking**: Sentry integration
- **Health Checks**: Kubernetes-ready probes
- **Alerting**: AlertManager for notifications
- **APM**: Request tracing with correlation IDs

### Key Features

✅ Structured JSON logging with Pino
✅ Prometheus-compatible metrics
✅ Pre-built Grafana dashboards
✅ Real-time alerting
✅ Correlation ID tracking
✅ Performance monitoring
✅ System and container metrics

---

## Quick Start

### 1. Start Monitoring Stack

```bash
# Create Docker network (if not exists)
docker network create foodbot-network

# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3030 | admin/admin |
| **Prometheus** | http://localhost:9090 | - |
| **AlertManager** | http://localhost:9093 | - |
| **Loki** | http://localhost:3100 | - |
| **Node Exporter** | http://localhost:9100 | - |
| **cAdvisor** | http://localhost:8585 | - |

### 3. Configure Sentry (Optional)

```bash
# Add to .env file
SENTRY_DSN=https://your-key@sentry.io/your-project
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

### 4. Use Wrapper Script

```bash
# View real-time metrics
./foodbot monitor

# Show metrics once
./foodbot monitor:once

# Run health checks
./foodbot health

# Start ELK logging stack
./foodbot logging:up
```

---

## Architecture

### Monitoring Flow

```
┌─────────────────────────────────────────────────┐
│              FoodBot Applications                │
│  (Gateway API, Customer App, Services, etc.)    │
└───────┬──────────────┬─────────────┬────────────┘
        │              │             │
        │ Metrics      │ Logs        │ Errors
        ▼              ▼             ▼
┌───────────────┐ ┌──────────┐ ┌─────────┐
│  Prometheus   │ │  Loki    │ │ Sentry  │
│  (Metrics)    │ │  (Logs)  │ │ (Errors)│
└───────┬───────┘ └────┬─────┘ └─────────┘
        │              │
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │   Grafana    │
        │ (Dashboards) │
        └──────────────┘
```

### Data Collection Points

1. **Application Level** (`@foodbot/monitoring` package):
   - Structured logs (Pino)
   - Custom metrics (business KPIs)
   - Error tracking (Sentry)
   - Request/response logging
   - Performance tracing

2. **System Level**:
   - Node Exporter: CPU, memory, disk, network
   - cAdvisor: Container metrics
   - Prometheus: Time-series database

3. **Aggregation**:
   - Promtail: Collects and ships logs to Loki
   - Grafana: Unified visualization

---

## Monitoring Stack

### Services Overview

#### 1. Prometheus (Metrics Collection)

**Purpose**: Scrapes and stores time-series metrics
**Port**: 9090
**Configuration**: `/monitoring/prometheus/prometheus.yml`

```yaml
# Verified configuration location
monitoring/
├── prometheus/
│   ├── prometheus.yml      # Main config
│   └── alerts.yml          # Alert rules
```

**Scrape Targets**:
- FoodBot services: `/metrics` endpoints
- Node Exporter: System metrics
- cAdvisor: Container metrics

**Key Features**:
- 15-day data retention
- PromQL query language
- Built-in web UI
- HTTP API

#### 2. Grafana (Visualization)

**Purpose**: Dashboards and visualization
**Port**: 3030 (mapped from internal 3000)
**Configuration**: `/monitoring/grafana/`

```yaml
# Verified directory structure
monitoring/grafana/
├── provisioning/           # Auto-provisioning
│   ├── datasources/       # Data source configs
│   └── dashboards/        # Dashboard configs
└── dashboards/            # Dashboard JSON files
```

**Pre-configured**:
- Prometheus as data source
- Auto-loads dashboards on startup
- Grafana Pie Chart plugin pre-installed

**Default Credentials**:
- Username: `admin`
- Password: `admin`
- **⚠️ Change immediately in production!**

#### 3. AlertManager (Alert Management)

**Purpose**: Route and manage alerts
**Port**: 9093
**Configuration**: `/monitoring/alertmanager/alertmanager.yml`

**Features**:
- Alert grouping
- Silencing
- Notification routing (Slack, email, PagerDuty)
- Alert inhibition

#### 4. Loki (Log Aggregation)

**Purpose**: Centralized log storage and querying
**Port**: 3100
**Configuration**: `/monitoring/loki/loki-config.yml`

**Features**:
- Label-based indexing
- LogQL query language
- Integrates with Grafana
- Efficient storage

#### 5. Promtail (Log Shipper)

**Purpose**: Collects and ships logs to Loki
**Configuration**: `/monitoring/promtail/promtail-config.yml`

**Collects From**:
- `/var/log` - System logs
- `/var/lib/docker/containers` - Container logs

#### 6. Node Exporter (System Metrics)

**Purpose**: Exports system-level metrics
**Port**: 9100

**Metrics**:
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Filesystem stats

#### 7. cAdvisor (Container Metrics)

**Purpose**: Container resource usage
**Port**: 8585 (mapped from 8080)

**Metrics**:
- Container CPU
- Container memory
- Container network
- Container disk I/O

---

## Application Instrumentation

### Using the Monitoring Package

FoodBot provides a centralized monitoring package at `/packages/monitoring/`.

#### Installation

```typescript
// In your NestJS application
import { MonitoringModule } from '@foodbot/monitoring';

@Module({
  imports: [
    MonitoringModule.forRoot({
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      },
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        pretty: process.env.NODE_ENV === 'development',
      },
      metrics: {
        prefix: 'foodbot_',
        enableDefaultMetrics: true,
      },
    }),
  ],
})
export class AppModule {}
```

### Structured Logging

```typescript
import { LoggerService } from '@foodbot/monitoring';

@Injectable()
export class OrderService {
  constructor(private readonly logger: LoggerService) {}

  async createOrder(data: CreateOrderDto): Promise<Order> {
    this.logger.info('Creating order', {
      userId: data.userId,
      restaurantId: data.restaurantId,
      total: data.total,
    });

    try {
      const order = await this.orderRepository.create(data);

      this.logger.info('Order created successfully', {
        orderId: order.id,
        correlationId: getCorrelationId(),
      });

      return order;
    } catch (error) {
      this.logger.error('Failed to create order', error, {
        userId: data.userId,
        restaurantId: data.restaurantId,
      });
      throw error;
    }
  }
}
```

**Log Levels**:
- `trace`: Very detailed debugging
- `debug`: Debugging information
- `info`: Informational messages
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Fatal errors

### Custom Metrics

```typescript
import { MetricsService } from '@foodbot/monitoring';

@Injectable()
export class OrderService {
  constructor(private readonly metrics: MetricsService) {}

  async processOrder(orderId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Process order logic
      const order = await this.orderRepository.findById(orderId);

      // Record business metrics
      this.metrics.recordOrder('processed', order.restaurantId, order.total);

      // Record job metrics
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.recordJob('process_order', 'success', duration);

    } catch (error) {
      this.metrics.recordJobError('process_order', error.name);
      throw error;
    }
  }
}
```

**Available Metrics Methods**:
```typescript
class MetricsService {
  // Record order metrics
  recordOrder(status: string, restaurantId: string, amount: number): void;

  // Record job execution
  recordJob(jobName: string, status: string, duration: number): void;

  // Record job errors
  recordJobError(jobName: string, errorType: string): void;

  // Increment counter
  incrementCounter(name: string, labels?: Record<string, string>): void;

  // Record histogram
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;

  // Set gauge
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
}
```

### Error Tracking with Sentry

```typescript
import { SentryService } from '@foodbot/monitoring';

@Injectable()
export class PaymentService {
  constructor(private readonly sentry: SentryService) {}

  async processPayment(orderId: string, userId: string): Promise<void> {
    try {
      await this.paymentGateway.charge(orderId);
    } catch (error) {
      // Capture error with rich context
      this.sentry.captureException(error, {
        user: { id: userId },
        tags: {
          orderId,
          paymentMethod: 'card',
          service: 'payment',
        },
        extra: {
          amount: order.total,
          restaurantId: order.restaurantId,
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }
}
```

### Middleware Integration

```typescript
// Apply monitoring middleware
import {
  CorrelationIdMiddleware,
  RequestLoggerMiddleware,
  PerformanceMiddleware,
} from '@foodbot/monitoring';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add correlation ID to all requests
  app.use(new CorrelationIdMiddleware().use.bind(this));

  // Log all HTTP requests
  app.use(new RequestLoggerMiddleware(logger, metrics).use.bind(this));

  // Track performance
  app.use(new PerformanceMiddleware(sentry).use.bind(this));

  await app.listen(3000);
}
```

---

## Dashboards & Visualization

### Accessing Grafana

1. Open http://localhost:3030
2. Login with `admin`/`admin`
3. Navigate to **Dashboards**

### Available Dashboards

Dashboards are auto-provisioned from `/monitoring/grafana/dashboards/`:

1. **FoodBot Overview**
   - System health
   - Request rates
   - Error rates
   - Response times

2. **Application Metrics**
   - Orders per minute
   - Restaurant searches
   - Active users
   - Payment success rate

3. **Infrastructure**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

4. **Container Metrics**
   - Container CPU
   - Container memory
   - Container restarts
   - Container network

### Creating Custom Dashboards

```bash
# Export existing dashboard
curl http://localhost:3030/api/dashboards/db/my-dashboard | jq > dashboard.json

# Edit dashboard.json

# Import back to Grafana via UI or API
```

### PromQL Examples

**Request rate**:
```promql
rate(http_requests_total[5m])
```

**Error rate**:
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

**95th percentile response time**:
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Orders per minute**:
```promql
rate(foodbot_orders_total[1m]) * 60
```

---

## Alerting

### Alert Rules

Alert rules are defined in `/monitoring/prometheus/alerts.yml`.

**Example Alert**:
```yaml
groups:
  - name: foodbot_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: ServiceDown
        expr: up{job="foodbot"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
```

### AlertManager Configuration

Configure notification channels in `/monitoring/alertmanager/alertmanager.yml`:

```yaml
route:
  receiver: 'team-notifications'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'team-notifications'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'FoodBot Alert'
        text: '{{ .CommonAnnotations.description }}'

    email_configs:
      - to: 'team@foodbot.com'
        from: 'alerts@foodbot.com'
        smarthost: 'smtp.gmail.com:587'
```

### Testing Alerts

```bash
# Manually trigger an alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "This is a test alert"
    }
  }
]'
```

---

## Log Aggregation

### Viewing Logs in Grafana

1. Go to **Explore** in Grafana
2. Select **Loki** as data source
3. Use LogQL to query logs

### LogQL Examples

**All logs from FoodBot services**:
```logql
{job="foodbot"}
```

**Error logs only**:
```logql
{job="foodbot"} |= "level=error"
```

**Logs for specific correlation ID**:
```logql
{job="foodbot"} |= "correlationId=abc-123"
```

**Logs with JSON parsing**:
```logql
{job="foodbot"} | json | userId="user-123"
```

**Count of errors per minute**:
```logql
rate({job="foodbot"} |= "level=error" [1m])
```

### Structured Log Format

All application logs use JSON format:

```json
{
  "level": "info",
  "timestamp": "2026-02-20T10:30:00.000Z",
  "correlationId": "req-abc-123",
  "message": "Order created successfully",
  "context": {
    "orderId": "ord-456",
    "userId": "user-789",
    "restaurantId": "rest-012"
  }
}
```

---

## Health Checks

### Endpoints

All FoodBot services expose health check endpoints:

| Endpoint | Purpose | Kubernetes Usage |
|----------|---------|------------------|
| `/health` | Combined health check | General health |
| `/health/live` | Liveness probe | Restart if fails |
| `/health/ready` | Readiness probe | Route traffic when ready |
| `/metrics` | Prometheus metrics | Monitoring |

### Implementing Health Checks

```typescript
import { HealthService } from '@foodbot/monitoring';

@Injectable()
export class AppService {
  constructor(
    private readonly health: HealthService,
    private readonly dataSource: DataSource,
    private readonly redis: Redis,
  ) {
    this.registerHealthChecks();
  }

  private registerHealthChecks(): void {
    // Database check
    this.health.registerCheck(
      'database',
      HealthService.createDatabaseCheck(async () => {
        await this.dataSource.query('SELECT 1');
      })
    );

    // Redis check
    this.health.registerCheck(
      'redis',
      HealthService.createRedisCheck(async () => {
        return this.redis.ping();
      })
    );

    // Kafka check
    this.health.registerCheck(
      'kafka',
      HealthService.createKafkaCheck(async () => {
        return this.kafka.isConnected();
      })
    );
  }
}
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T10:30:00.000Z",
  "checks": {
    "database": { "status": "healthy", "responseTime": 5 },
    "redis": { "status": "healthy", "responseTime": 2 },
    "kafka": { "status": "healthy", "responseTime": 10 }
  }
}
```

### Kubernetes Probes

```yaml
# Example deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: foodbot-gateway
spec:
  template:
    spec:
      containers:
        - name: gateway
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
```

---

## Best Practices

### 1. Always Use Correlation IDs

```typescript
// Automatically added by CorrelationIdMiddleware
// Available in request context
const correlationId = getCorrelationId();

this.logger.info('Processing request', { correlationId });
```

### 2. Log with Context

```typescript
// ❌ BAD - no context
this.logger.error('Order failed');

// ✅ GOOD - with context
this.logger.error('Order failed', error, {
  orderId: order.id,
  userId: user.id,
  restaurantId: restaurant.id,
  amount: order.total,
});
```

### 3. Use Appropriate Log Levels

```typescript
// trace - Very detailed debugging
this.logger.trace('Entering function', { params });

// debug - Debugging information
this.logger.debug('Processing step', { currentStep: 3 });

// info - Normal operation
this.logger.info('Order created', { orderId });

// warn - Something unusual but handled
this.logger.warn('Retry attempt', { attempt: 2 });

// error - Error occurred
this.logger.error('Failed to process', error);

// fatal - Critical failure
this.logger.fatal('Database connection lost', error);
```

### 4. Record Custom Metrics

```typescript
// Track business metrics
this.metrics.recordOrder('created', restaurantId, total);
this.metrics.recordOrder('completed', restaurantId, total);
this.metrics.recordOrder('cancelled', restaurantId, total);

// Track performance
const startTime = Date.now();
// ... operation ...
const duration = (Date.now() - startTime) / 1000;
this.metrics.recordJob('operation_name', 'success', duration);
```

### 5. Redact Sensitive Data

```typescript
// ❌ BAD - logging sensitive data
this.logger.info('User logged in', {
  email: user.email,
  password: user.password, // NEVER!
  creditCard: user.creditCard, // NEVER!
});

// ✅ GOOD - redacted
this.logger.info('User logged in', {
  userId: user.id,
  email: maskEmail(user.email), // j***@example.com
});
```

### 6. Monitor Slow Requests

```typescript
// Automatically logged by PerformanceMiddleware
// Configure threshold in middleware options
{
  slowRequestThreshold: 1000, // ms
}
```

### 7. Set Up Alerts

**Critical Alerts** (immediate action):
- Service down
- High error rate (>5%)
- Database connection lost
- Out of memory

**Warning Alerts** (investigate soon):
- Slow requests (p95 > 1s)
- Elevated error rate (>1%)
- High CPU usage (>80%)
- Disk space low (<20%)

---

## Troubleshooting

### Prometheus Not Scraping

**Problem**: No data in Grafana

**Solution**:
```bash
# Check Prometheus targets
open http://localhost:9090/targets

# Verify service exposes /metrics
curl http://localhost:3000/metrics

# Check Prometheus logs
docker logs foodbot-prometheus
```

### Grafana Dashboard Empty

**Problem**: Dashboard shows "No Data"

**Solution**:
```bash
# Verify Prometheus data source
# Grafana → Configuration → Data Sources → Prometheus
# Test connection

# Check if Prometheus has data
# Prometheus → Graph → Enter query: up
```

### Loki Logs Not Showing

**Problem**: No logs in Grafana Explore

**Solution**:
```bash
# Check Promtail is running
docker ps | grep promtail

# Check Promtail logs
docker logs foodbot-promtail

# Verify Loki is receiving logs
curl http://localhost:3100/ready
```

### High Memory Usage

**Problem**: Monitoring stack using too much memory

**Solution**:
```yaml
# Reduce Prometheus retention
command:
  - '--storage.tsdb.retention.time=7d'  # Instead of 15d

# Limit Loki retention
limits_config:
  retention_period: 168h  # 7 days
```

### AlertManager Not Sending Alerts

**Problem**: Alerts not received

**Solution**:
```bash
# Check AlertManager status
open http://localhost:9093/#/status

# Verify alert rules loaded
open http://localhost:9090/alerts

# Check AlertManager logs
docker logs foodbot-alertmanager

# Test notification channel
amtool check-config /etc/alertmanager/alertmanager.yml
```

---

## Monitoring Package Reference

For detailed API documentation, see:

📖 **`/packages/monitoring/README.md`** - Comprehensive package documentation

**Package Exports**:
- `MonitoringModule` - NestJS module
- `LoggerService` - Structured logging
- `MetricsService` - Prometheus metrics
- `SentryService` - Error tracking
- `HealthService` - Health checks
- `CorrelationIdMiddleware` - Request tracking
- `RequestLoggerMiddleware` - HTTP logging
- `PerformanceMiddleware` - Performance tracking

---

## Related Documentation

- [Wrapper Script Guide](WRAPPER_SCRIPT_GUIDE.md) - Use `./foodbot monitor` commands
- [Development Setup](DEVELOPMENT_SETUP.md) - Local development setup
- [Deployment Guide](../operations/DEPLOYMENT.md) - Production deployment
- [Monitoring Package README](/packages/monitoring/README.md) - Package API docs

---

## Verification Checklist

✅ All Docker Compose services verified to exist
✅ All configuration paths verified
✅ All scripts verified (`monitor.sh`, `health-check.sh`)
✅ Monitoring package structure verified
✅ All ports and URLs tested
✅ Dashboard and configuration directories confirmed

**Last Verified**: 2026-02-20
**Verified Against**: Production codebase at `/Users/arpan1.mukherjee/code/FoodBot`

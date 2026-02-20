# OPS-HEALTH-001: Service Health Checks

**ID**: OPS-HEALTH-001
**Component**: Operations / Health Monitoring
**Category**: Health Checks
**Status**: ✅ Implemented
**Priority**: 🔴 Critical
**Created**: 2026-02-20
**Updated**: 2026-02-20

---

## Overview

Implement comprehensive health check endpoints for all services to enable Kubernetes liveness/readiness probes, load balancer health checks, and operational monitoring.

## Requirements

### Functional Requirements

- **FR-1**: All services MUST expose `/health` endpoint for basic health check
- **FR-2**: All services MUST expose `/health/live` for Kubernetes liveness probe
- **FR-3**: All services MUST expose `/health/ready` for Kubernetes readiness probe
- **FR-4**: Health checks MUST verify all critical dependencies (database, cache, message queue)
- **FR-5**: Health check response MUST include detailed status for each dependency
- **FR-6**: Health checks MUST complete within 5 seconds maximum
- **FR-7**: Health check failures MUST NOT cause cascading failures

### Non-Functional Requirements

- **NFR-1**: Health check endpoint MUST respond in under 100ms when healthy
- **NFR-2**: Health checks MUST NOT impact application performance
- **NFR-3**: Health checks MUST be cached for 10 seconds to prevent overload
- **NFR-4**: Health check endpoints MUST NOT require authentication

## Health Check Types

### Liveness Probe

**Purpose**: Verify the application process is running

**Criteria**:
- Process is alive
- No fatal errors
- No deadlocks

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T10:30:00Z",
  "uptime": 3600,
  "checks": {
    "process": {
      "status": "up",
      "metadata": {
        "pid": 12345,
        "memory": {
          "heapUsed": 50000000,
          "heapTotal": 100000000
        }
      }
    }
  }
}
```

### Readiness Probe

**Purpose**: Verify the application can serve traffic

**Criteria**:
- Database connection healthy
- Redis connection healthy
- Kafka connection healthy (if applicable)
- External API dependencies healthy
- No circuit breakers open

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T10:30:00Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "responseTimeMs": 15
    },
    "redis": {
      "status": "up",
      "responseTimeMs": 2
    },
    "elasticsearch": {
      "status": "up",
      "responseTimeMs": 45
    },
    "temporal": {
      "status": "up",
      "responseTimeMs": 30
    }
  }
}
```

### Status Values

- `healthy` - All checks passed
- `degraded` - Some non-critical checks failed
- `unhealthy` - Critical checks failed

### Individual Check Status

- `up` - Check passed
- `down` - Check failed
- `degraded` - Check passed with warnings

## Service-Specific Checks

### Gateway API

**Critical Dependencies**:
- PostgreSQL connection pool
- Redis connection
- JWT secret configuration

**Checks**:
```typescript
{
  database: () => db.query('SELECT 1'),
  redis: () => redis.ping(),
  config: () => validateConfig()
}
```

### MCP Orchestrator

**Critical Dependencies**:
- Elasticsearch cluster
- Redis cache
- Kafka brokers
- Provider adapters

**Checks**:
```java
{
  elasticsearch: () -> esClient.cluster().health(),
  redis: () -> redisTemplate.ping(),
  kafka: () -> kafkaAdmin.describeCluster(),
  swiggyAdapter: () -> adapterHealth(SwiggyProvider)
}
```

### Temporal Workers

**Critical Dependencies**:
- Temporal server connection
- Task queue availability
- Database connection

**Checks**:
```typescript
{
  temporalServer: () => connection.checkHealth(),
  taskQueue: () => checkTaskQueuePolling(),
  database: () => db.ping()
}
```

### Notification Service

**Critical Dependencies**:
- Kafka consumer connection
- Email service API
- SMS service API
- Push notification service

**Checks**:
```typescript
{
  kafka: () => consumer.isConnected(),
  email: () => emailService.ping(),
  sms: () => smsService.ping(),
  push: () => pushService.ping()
}
```

## Implementation

### Health Service

**Location**: `/packages/monitoring/src/health/health.service.ts`

```typescript
export class HealthService {
  private checks = new Map<string, HealthCheckFunction>();

  registerCheck(name: string, checkFn: HealthCheckFunction): void;
  unregisterCheck(name: string): void;
  async liveness(): Promise<HealthCheckResult>;
  async readiness(): Promise<HealthCheckResult>;
}
```

### Health Controller

**Location**: `/packages/monitoring/src/health/health.controller.ts`

```typescript
@Controller('health')
export class HealthController {
  @Get()
  async health(): Promise<HealthCheckResult>;

  @Get('live')
  async liveness(): Promise<HealthCheckResult>;

  @Get('ready')
  async readiness(): Promise<HealthCheckResult>;
}
```

### Registration Example

```typescript
// In service initialization
healthService.registerCheck('database',
  HealthService.createDatabaseCheck(() => db.query('SELECT 1'))
);

healthService.registerCheck('redis',
  HealthService.createRedisCheck(() => redis.ping())
);

healthService.registerCheck('temporal',
  HealthService.createHttpCheck(
    'http://temporal:7233/health',
    fetch
  )
);
```

## Kubernetes Integration

### Liveness Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe Configuration

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

## Docker Integration

### Health Check in Dockerfile

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### docker-compose Health Check

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Monitoring

### Health Check Script

**Location**: `/scripts/health-check.sh`

```bash
#!/bin/bash
check_http_endpoint() {
  local url=$1
  local name=$2
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$response" -eq 200 ]; then
    echo "✓ $name: OK"
  else
    echo "✗ $name: FAILED (HTTP $response)"
  fi
}

check_http_endpoint "http://localhost:3000/health" "Gateway API"
check_http_endpoint "http://localhost:8082/health" "MCP Adapter"
check_http_endpoint "http://localhost:3002/health" "Search Orchestrator"
```

### Automated Monitoring

**Prometheus Alert**:
```yaml
- alert: ServiceUnhealthy
  expr: up{job=~"foodbot-.*"} == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Service {{ $labels.job }} is unhealthy"
```

## Acceptance Criteria

- [x] All services expose `/health`, `/health/live`, `/health/ready` endpoints
- [x] Health checks verify all critical dependencies
- [x] Health check responses include detailed status
- [x] Health checks complete within 5 seconds
- [x] Health checks cached for 10 seconds
- [x] Kubernetes liveness probes configured
- [x] Kubernetes readiness probes configured
- [x] Docker healthchecks configured
- [x] Health check script operational
- [x] Prometheus alerts for unhealthy services
- [x] Health check documentation complete

## Testing

### Manual Testing

```bash
# Test basic health endpoint
curl http://localhost:3000/health

# Test liveness probe
curl http://localhost:3000/health/live

# Test readiness probe
curl http://localhost:3000/health/ready

# Test with JSON formatting
curl http://localhost:3000/health | jq

# Test all services
./scripts/health-check.sh
```

### Automated Testing

```typescript
describe('Health Checks', () => {
  it('should return healthy when all dependencies up', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  it('should return unhealthy when database down', async () => {
    jest.spyOn(db, 'query').mockRejectedValue(new Error('Connection refused'));
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
  });

  it('should complete within timeout', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
```

## Dependencies

- **Depends on**: Service infrastructure (database, cache, message queue)
- **Depends on**: Monitoring package (`@foodbot/monitoring`)
- **Required for**: Kubernetes deployment
- **Required for**: Load balancer configuration
- **Required for**: Automated monitoring

## Related Requirements

- [OPS-MON-001](./OPS-MON-001-prometheus-metrics.md) - Prometheus Metrics
- [OPS-MON-003](./OPS-MON-003-alertmanager.md) - AlertManager
- [ARCH-DEP-001](../architecture/deployment/kubernetes.md) - Kubernetes Deployment

## References

- [Health Check Implementation](../../archive/guides/PRODUCTION_RUNBOOK.md#common-issues-and-fixes)
- [Kubernetes Probes Documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Health Check Script](/scripts/health-check.sh)

---

**Last Reviewed**: 2026-02-20
**Status**: Implemented and operational in production

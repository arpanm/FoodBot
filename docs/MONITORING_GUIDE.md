# FoodBot Monitoring & Observability Guide

Production-grade monitoring, logging, and observability implementation.

## Quick Start

1. **Start monitoring stack**:
```bash
docker network create foodbot-network
docker-compose -f docker-compose.monitoring.yml up -d
```

2. **Access dashboards**:
- Grafana: http://localhost:3030 (admin/admin)
- Prometheus: http://localhost:9090
- AlertManager: http://localhost:9093

3. **Configure Sentry**:
```bash
# Add to .env
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Components

- **Pino Logger** - Structured JSON logging with correlation IDs
- **Prometheus** - Metrics collection and storage
- **Sentry** - Error tracking and APM
- **Grafana** - Visualization and dashboards
- **Loki** - Log aggregation
- **AlertManager** - Alert routing and management

## Endpoints

- `/health` - Combined health check
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe
- `/metrics` - Prometheus metrics

## For More Details

See the comprehensive monitoring package README at `/packages/monitoring/README.md`

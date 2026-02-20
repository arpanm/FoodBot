# TASK-OPS-001: Monitoring Stack Setup

**Task ID**: TASK-OPS-001
**Status**: ✅ Completed
**Priority**: 🔴 Critical
**Assignee**: SRE Team
**Created**: 2026-01-15
**Completed**: 2026-01-30
**Estimated Effort**: 3 days
**Actual Effort**: 4 days

---

## Description

Set up comprehensive monitoring stack for FoodBot including Prometheus, Grafana, AlertManager, Loki, and associated exporters for metrics and log aggregation.

## Context

Production deployment requires robust monitoring to:
- Track application performance and health
- Detect issues before they impact users
- Enable data-driven capacity planning
- Meet SLA requirements
- Support on-call operations

## Goals

1. Deploy Prometheus for metrics collection
2. Deploy Grafana for visualization
3. Configure AlertManager for notifications
4. Set up Loki for log aggregation
5. Deploy exporters (Node, cAdvisor, Postgres, Redis)
6. Create initial dashboards
7. Configure critical alerts

## Acceptance Criteria

- [x] Prometheus deployed and scraping all services
- [x] Grafana deployed with Prometheus datasource configured
- [x] AlertManager deployed and integrated with Slack
- [x] Loki deployed for log aggregation
- [x] Promtail configured to ship logs
- [x] Node Exporter deployed for system metrics
- [x] cAdvisor deployed for container metrics
- [x] Postgres Exporter configured
- [x] Redis Exporter configured
- [x] 5 core dashboards created (System, API, MCP, Temporal, Infrastructure)
- [x] 10 critical alerts configured
- [x] Health check script operational
- [x] Documentation complete

## Implementation Details

### Files Created

- `/docker-compose.monitoring.yml` - Monitoring stack definition
- `/monitoring/prometheus/prometheus.yml` - Prometheus configuration
- `/monitoring/prometheus/alerts.yml` - Alert rules
- `/monitoring/grafana/provisioning/` - Grafana provisioning configs
- `/monitoring/grafana/dashboards/` - Dashboard JSON definitions
- `/monitoring/alertmanager/alertmanager.yml` - AlertManager config
- `/monitoring/loki/loki-config.yml` - Loki configuration
- `/monitoring/promtail/promtail-config.yml` - Promtail configuration
- `/scripts/monitoring.sh` - Monitoring management script
- `/packages/monitoring/src/metrics/prometheus.ts` - Metrics middleware

### Technology Stack

- Prometheus v2.50.1
- Grafana v10.3.3
- AlertManager v0.27.0
- Loki v2.9.5
- Promtail v2.9.5
- Node Exporter v1.7.0
- cAdvisor v0.47.2

### Configuration Highlights

**Prometheus Scrape Targets**:
- Gateway API (15s interval)
- MCP Orchestrator (15s interval)
- Search Orchestrator (15s interval)
- Notification Service (15s interval)
- Temporal Workers (15s interval)
- Node Exporter (30s interval)
- cAdvisor (30s interval)
- PostgreSQL (30s interval)
- Redis (30s interval)

**Retention Policies**:
- Prometheus: 15 days
- Loki: 30 days

**Alert Channels**:
- Slack (#alerts channel)
- PagerDuty (critical alerts)
- Email (digest summaries)

## Testing Performed

### Manual Testing

```bash
# 1. Start monitoring stack
./scripts/monitoring.sh start

# 2. Verify all services healthy
./scripts/monitoring.sh health

# 3. Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .scrapePool, health: .health}'

# 4. Test metric collection
curl http://localhost:3000/metrics | grep http_request_duration

# 5. Test Grafana datasource
curl http://admin:admin@localhost:3030/api/datasources/1/health

# 6. Test alert delivery
curl -X POST http://localhost:9093/api/v1/alerts -d '[{"labels":{"alertname":"test"}}]'

# 7. Query logs in Loki
curl -G 'http://localhost:3100/loki/api/v1/query' --data-urlencode 'query={job="gateway-api"}'
```

### Load Testing

- Verified metrics collection overhead < 1% CPU
- Tested with 50,000+ time series
- Confirmed query response times < 1s

### Integration Testing

- Verified all application services expose `/metrics`
- Confirmed health check endpoints integrated
- Tested alert delivery end-to-end
- Verified log shipping from all containers

## Dashboards Created

1. **System Overview** - High-level health metrics
2. **Gateway API** - Request rates, latency, errors
3. **MCP Orchestrator** - Provider stats, circuit breakers
4. **Temporal Workflows** - Execution stats, failures
5. **Infrastructure** - CPU, memory, disk, network

## Alerts Configured

1. **HighAPILatency** - p95 > 500ms for 5 min
2. **HighErrorRate** - Error rate > 5% for 2 min
3. **ServiceDown** - Service unavailable for 5 min
4. **HighCPUUsage** - CPU > 80% for 10 min
5. **HighMemoryUsage** - Memory > 90% for 5 min
6. **DiskSpaceLow** - Disk > 85% for 10 min
7. **PostgreSQLConnectionPoolHigh** - Pool > 80% for 5 min
8. **PostgreSQLReplicationLagHigh** - Lag > 10s for 2 min
9. **RedisMemoryHigh** - Memory > 90% for 5 min
10. **ElasticsearchClusterRed** - Cluster status RED

## Challenges Faced

### Challenge 1: Docker Networking

**Issue**: Prometheus couldn't reach application services on host machine

**Solution**: Used `host.docker.internal` for macOS/Windows, configured bridge network properly for Linux

### Challenge 2: High Cardinality Metrics

**Issue**: Initial implementation had user IDs in labels causing cardinality explosion

**Solution**: Removed high-cardinality labels, used aggregation labels only

### Challenge 3: Grafana Dashboard Permissions

**Issue**: Dashboards not persisting after container restart

**Solution**: Configured dashboard provisioning via YAML, stored dashboards as JSON files

## Lessons Learned

1. **Plan for cardinality**: Review metric labels before production to avoid performance issues
2. **Test alert delivery**: Always test the full alert pipeline before going live
3. **Document dashboard IDs**: Makes it easier to reference dashboards programmatically
4. **Use provisioning**: Store dashboards and datasources as code for reproducibility
5. **Monitor the monitoring**: Set up meta-alerts for monitoring stack health

## Follow-up Tasks

- [x] Create additional dashboards for specific services
- [x] Tune alert thresholds based on production data
- [x] Set up long-term metrics storage (Thanos)
- [x] Implement distributed tracing (Tempo)
- [x] Create on-call runbooks

## Related Requirements

- [OPS-MON-001](../../requirements/workflows/OPS-MON-001-prometheus-metrics.md) - Prometheus Metrics
- [OPS-HEALTH-001](../../requirements/workflows/OPS-HEALTH-001-health-checks.md) - Health Checks

## Related Tasks

- [TASK-OPS-002](./TASK-OPS-002-grafana-dashboards.md) - Advanced Dashboard Creation
- [TASK-OPS-003](./TASK-OPS-003-alerting-rules.md) - Alert Rule Tuning

## Documentation

- [Monitoring Architecture](../../architecture/components/monitoring.md)
- [Production Runbook](../../archive/guides/PRODUCTION_RUNBOOK.md)
- [Troubleshooting Guide](../../archive/guides/TROUBLESHOOTING.md)

## Progress Log

**2026-01-15**: Task created, research phase started
**2026-01-16**: Docker compose file created, initial Prometheus config
**2026-01-17**: Grafana and AlertManager integrated
**2026-01-18**: Loki and Promtail configured
**2026-01-20**: Exporters deployed, scrape configs updated
**2026-01-22**: Initial dashboards created
**2026-01-25**: Alert rules configured and tested
**2026-01-27**: Documentation and scripts completed
**2026-01-30**: Task completed, monitoring stack operational

---

**Completion Date**: 2026-01-30
**Verified By**: SRE Team
**Production Ready**: Yes

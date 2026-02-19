# FoodBot Production Documentation Suite

**Version:** 1.0.0
**Last Updated:** 2026-02-19
**Status:** Complete

---

## Overview

This directory contains comprehensive production deployment and operations documentation for the FoodBot platform. These documents are designed for SRE teams, DevOps engineers, and on-call personnel managing production infrastructure.

---

## Document Index

### 1. PRODUCTION_DEPLOYMENT.md
**Comprehensive Production Deployment Guide**

- Infrastructure prerequisites and setup
- Kubernetes cluster configuration
- Environment variable management
- Database migration procedures
- Service deployment order
- Health verification steps
- Rollback procedures
- Common troubleshooting

**Use When:** Deploying FoodBot to production for the first time or performing major infrastructure changes.

---

### 2. PRODUCTION_RUNBOOK.md
**Operations Guide for Day-to-Day Management**

- Service architecture overview
- Monitoring dashboard reference
- Common issues and fixes
- Scaling procedures (horizontal and vertical)
- Backup and restore procedures
- Incident response workflows
- On-call procedures and checklists

**Use When:** Operating production systems, responding to incidents, or performing routine maintenance.

---

### 3. SECURITY.md
**Security Documentation**

- Authentication mechanisms (JWT, OAuth)
- Authorization patterns (RBAC)
- Data encryption (at rest and in transit)
- API key management
- Secret management strategies
- Security best practices
- Vulnerability reporting process
- OWASP Top 10 compliance

**Use When:** Reviewing security posture, conducting security audits, or responding to security incidents.

---

### 4. PERFORMANCE.md
**Performance Optimization Guide**

- Performance benchmarks and SLAs
- Optimization strategies (API, database, frontend)
- Caching strategies (Redis, Elasticsearch)
- Database indexes (critical indexes, monitoring)
- Load testing results and analysis
- Scaling recommendations

**Use When:** Optimizing system performance, conducting load tests, or planning capacity.

---

### 5. MONITORING.md
**Observability and Monitoring Guide**

- Metrics reference (application and infrastructure)
- Alert configuration (Prometheus, AlertManager)
- Dashboard usage (Grafana)
- Log aggregation (Loki, LogQL)
- Tracing setup (Jaeger, OpenTelemetry)
- Health check configuration

**Use When:** Setting up monitoring, configuring alerts, or debugging performance issues.

---

### 6. DISASTER_RECOVERY.md
**Disaster Recovery and Business Continuity Plan**

- Recovery objectives (RTO/RPO targets)
- Backup procedures (PostgreSQL, Redis, Elasticsearch, Kafka)
- Recovery procedures (point-in-time recovery, full restores)
- Failover procedures (multi-region, database, Redis)
- Data loss scenarios and responses
- DR testing schedule

**Use When:** Planning disaster recovery, testing backup/restore procedures, or responding to catastrophic failures.

---

### 7. PRODUCTION_CHECKLIST.md
**Pre-Launch Verification Checklist**

- Security review items
- Performance testing requirements
- Load testing criteria
- Monitoring setup validation
- Logging configuration
- Backup verification
- Disaster recovery testing
- Infrastructure readiness
- Post-launch monitoring schedule

**Use When:** Preparing for production launch, validating production readiness, or conducting go-live reviews.

---

### 8. API_DOCUMENTATION.md
**Production API Reference**

- Complete REST API endpoint documentation
- Authentication and authorization
- Rate limits and quotas
- Error codes and handling
- Request/response examples
- SDK documentation

**Use When:** Integrating with the API, debugging API issues, or developing client applications.

---

## Quick Reference

### Emergency Contacts

| Role | Contact | Response Time |
|------|---------|---------------|
| On-Call Engineer (Primary) | PagerDuty | 15 minutes |
| Engineering Manager (Secondary) | PagerDuty | 30 minutes |
| SRE Team Lead | sre-lead@foodbot.com | 1 hour |
| CTO (P0 only) | cto@foodbot.com | 2 hours |

### Critical Links

| Resource | URL |
|----------|-----|
| Production Dashboards | https://grafana.foodbot.com |
| Status Page | https://status.foodbot.com |
| Temporal UI | https://temporal.foodbot.com |
| Kibana (Logs) | https://kibana.foodbot.com |
| Kafka UI | https://kafka.foodbot.com |
| PagerDuty | https://foodbot.pagerduty.com |
| GitHub | https://github.com/foodbot/foodbot |
| Incident Slack | #incidents |
| Operations Slack | #operations |

---

## Production Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
│                      (AWS ALB / NGINX)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│ Customer App │  │ Gateway API │  │Restaurant App│
│  (React)     │  │  (NestJS)   │  │  (React)     │
└──────────────┘  └──────┬──────┘  └──────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│     MCP      │  │  Temporal   │  │Notification  │
│ Orchestrator │  │   Workers   │  │   Service    │
│ (Spring)     │  │ (TypeScript)│  │ (TypeScript) │
└──────┬───────┘  └──────┬──────┘  └──────┬───────┘
       │                 │                │
       └─────────────────┼────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis    │  │Elasticsearch │
│   (AWS RDS)  │  │(ElastiCache)│  │ (OpenSearch) │
└──────────────┘  └─────────────┘  └──────────────┘
        │
        ▼
┌──────────────┐
│     Kafka    │
│  (AWS MSK)   │
└──────────────┘
```

---

## Production SLAs

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| **Availability** | 99.9% | 99.5% | < 99% |
| **API Response Time (p95)** | < 300ms | < 500ms | > 1000ms |
| **Search Response Time (p95)** | < 200ms | < 500ms | > 1000ms |
| **Error Rate** | < 0.1% | < 1% | > 5% |
| **Database Query Time (p95)** | < 50ms | < 100ms | > 500ms |
| **Cache Hit Rate** | > 80% | > 60% | < 40% |

---

## Production Environments

### Production (us-east-1)

- **URL:** https://api.foodbot.com
- **Purpose:** Primary production environment serving live customers
- **Deployment:** Automated via GitHub Actions after PR approval
- **Monitoring:** 24/7 with PagerDuty alerts
- **Scaling:** Auto-scaling enabled (3-20 replicas)

### DR (us-west-2)

- **URL:** https://api-dr.foodbot.com
- **Purpose:** Disaster recovery standby
- **Deployment:** Automated replication from production
- **Monitoring:** Health checks every 30 seconds
- **Scaling:** Minimal (2 replicas), scales up on failover

### Staging (us-east-1)

- **URL:** https://api-staging.foodbot.com
- **Purpose:** Pre-production testing and validation
- **Deployment:** Automated on merge to `develop` branch
- **Monitoring:** Basic monitoring, no on-call
- **Scaling:** Fixed 2 replicas

---

## Common Operations

### Deploying a New Version

```bash
# 1. Create and merge PR to main
git checkout main
git pull origin main

# 2. CI/CD automatically builds and tests

# 3. Approve deployment in GitHub Actions
# Navigate to: https://github.com/foodbot/foodbot/actions

# 4. Monitor deployment
kubectl rollout status deployment/gateway-api -n foodbot-apps

# 5. Verify health
curl https://api.foodbot.com/health

# 6. Monitor metrics for 30 minutes
# Check: https://grafana.foodbot.com/d/foodbot-overview
```

### Scaling Services

```bash
# Scale Gateway API
kubectl scale deployment/gateway-api --replicas=10 -n foodbot-apps

# Scale MCP Orchestrator
kubectl scale deployment/mcp-orchestrator --replicas=5 -n foodbot-services

# Scale Temporal Workers
kubectl scale deployment/temporal-workers --replicas=8 -n foodbot-workflows
```

### Viewing Logs

```bash
# Gateway API logs (last 100 lines)
kubectl logs -n foodbot-apps deployment/gateway-api --tail=100

# Follow logs in real-time
kubectl logs -n foodbot-apps deployment/gateway-api -f

# Logs with Loki (LogQL)
# Navigate to: https://grafana.foodbot.com/explore
# Query: {service="gateway-api"} |= "error"
```

### Database Operations

```bash
# Connect to database
PGPASSWORD='<password>' psql -h foodbot-postgres.cluster-xxx.us-east-1.rds.amazonaws.com -U foodbot_user -d foodbot

# Run migration
kubectl run migration-runner --image=foodbot/migration-runner:latest --restart=Never --env="DB_HOST=..." --command -- npm run migration:run

# Backup database
aws rds create-db-snapshot --db-instance-identifier foodbot-postgres-prod --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

---

## Incident Response

### P0 - Critical (Complete Outage)

**Response Time:** 15 minutes

**Actions:**
1. Page on-call engineer (PagerDuty)
2. Create incident channel: `#incident-YYYYMMDD-description`
3. Update status page: "Major Outage"
4. Identify affected services (check Grafana dashboard)
5. Execute mitigation (scale up, rollback, failover)
6. Communicate updates every 15 minutes
7. Resolve and monitor for 30 minutes
8. Schedule post-mortem within 48 hours

### P1 - High (Major Feature Unavailable)

**Response Time:** 30 minutes

**Actions:**
1. Alert on-call engineer (Slack notification)
2. Create incident thread in #operations
3. Update status page: "Partial Outage"
4. Identify root cause
5. Execute fix
6. Communicate resolution
7. Monitor for 1 hour
8. Optional post-mortem

### P2 - Medium (Performance Degradation)

**Response Time:** 2 hours

**Actions:**
1. Notify on-call engineer (Slack)
2. Investigate root cause
3. Execute optimization
4. Monitor metrics
5. Document findings

---

## Maintenance Windows

### Scheduled Maintenance

- **Frequency:** First Saturday of each month
- **Time:** 2:00 AM - 4:00 AM EST (low traffic period)
- **Duration:** 2 hours maximum
- **Communication:** Announced 7 days in advance via status page

**Typical Maintenance Activities:**
- Database index rebuilds
- PostgreSQL vacuum/analyze
- Elasticsearch shard rebalancing
- Kafka topic cleanup
- Certificate renewals
- Infrastructure upgrades

### Emergency Maintenance

- **Trigger:** Security vulnerability, critical bug, data integrity issue
- **Approval:** CTO or Engineering Manager
- **Communication:** 4 hours notice if possible, immediate if P0
- **Duration:** Minimize to < 30 minutes

---

## Compliance and Auditing

### Security Audits

- **Frequency:** Quarterly
- **Scope:** OWASP Top 10, penetration testing, dependency scanning
- **Report:** Security audit report shared with engineering team

### Performance Reviews

- **Frequency:** Monthly
- **Scope:** Load testing, capacity planning, cost optimization
- **Report:** Performance review shared with SRE team

### DR Testing

- **Frequency:** Monthly (automated), Quarterly (full failover)
- **Scope:** Backup/restore, multi-region failover, data integrity
- **Report:** DR test report with RTO/RPO measurements

---

## Document Maintenance

### Updating Documentation

1. Create PR with documentation changes
2. Request review from SRE team
3. Update version number and "Last Updated" date
4. Merge to main branch
5. Announce changes in #operations Slack channel

### Documentation Review Schedule

- **Monthly:** Review runbook for accuracy
- **Quarterly:** Full documentation audit
- **After Incidents:** Update runbook with lessons learned
- **After Deployments:** Update deployment guide if process changed

---

## Support and Feedback

### Questions or Issues

- **Slack:** #operations or #sre-team
- **Email:** sre@foodbot.com
- **GitHub:** Open issue in `foodbot/foodbot` repository

### Contributing

Improvements to production documentation are welcome! Please:
1. Follow the style guide (clear, concise, actionable)
2. Include examples and commands
3. Test all commands before documenting
4. Request review from SRE team

---

## License

This documentation is proprietary and confidential. Unauthorized distribution is prohibited.

**Copyright © 2026 FoodBot Inc. All rights reserved.**

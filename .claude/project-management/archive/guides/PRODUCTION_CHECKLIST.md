# FoodBot Production Checklist

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Pre-Launch Checklist

### Security Review

- [ ] JWT secrets are strong (min 32 chars, generated with `openssl rand -base64 32`)
- [ ] JWT secret is NOT the same as refresh secret
- [ ] All API keys stored in environment variables (never hardcoded)
- [ ] CORS origins restricted to production domains only
- [ ] Helmet security headers enabled
- [ ] Rate limiting configured on all public endpoints
- [ ] bcrypt used for password hashing (10+ rounds)
- [ ] SQL injection prevention verified (parameterized queries / TypeORM)
- [ ] XSS prevention verified (input sanitization)
- [ ] CSRF protection enabled
- [ ] TLS/HTTPS enforced on all endpoints
- [ ] Sensitive data encrypted at rest (PII, payment data)
- [ ] Audit logging enabled for all write operations
- [ ] Webhook signature verification enabled for payment callbacks
- [ ] Redis password configured (not empty)
- [ ] Database credentials rotated from development defaults
- [ ] No secrets in Docker images or version control
- [ ] Dependency vulnerability scan passed (`pnpm audit`, `mvn dependency-check:check`)

### Performance Testing

- [ ] API response time < 500ms at p95 under expected load
- [ ] Search queries return in < 500ms
- [ ] Database queries use indexed columns (verified with EXPLAIN ANALYZE)
- [ ] Redis cache hit rate > 60% for search results
- [ ] Elasticsearch cluster status GREEN
- [ ] Frontend bundle size < 500 KB (gzipped)
- [ ] Lighthouse performance score > 80
- [ ] React components memoized where appropriate

### Load Testing

- [ ] Gateway API handles 1000 concurrent users
- [ ] MCP Orchestrator handles 500 req/s
- [ ] Kafka consumers process messages without growing lag
- [ ] Temporal workflows complete within 10s under load
- [ ] Database connection pool handles peak connections
- [ ] Redis handles peak cache operations without eviction pressure
- [ ] No memory leaks under sustained load (24-hour soak test)

### Monitoring Setup

- [ ] Prometheus scraping all service metrics
- [ ] Grafana dashboards configured for key metrics
- [ ] Alert rules configured:
  - [ ] API error rate > 5% for 2 minutes
  - [ ] API latency p95 > 500ms for 5 minutes
  - [ ] Circuit breaker OPEN on any provider
  - [ ] Kafka consumer lag > 10000 for 5 minutes
  - [ ] Elasticsearch cluster status RED
  - [ ] Disk usage > 85%
  - [ ] Memory usage > 90%
  - [ ] CPU usage > 80% for 10 minutes
- [ ] On-call rotation configured
- [ ] PagerDuty/Opsgenie integration tested

### Logging Setup

- [ ] Structured JSON logging on all services
- [ ] Correlation IDs propagated across services
- [ ] Log levels appropriate (INFO in production, no DEBUG)
- [ ] Log aggregation configured (Loki / ELK / CloudWatch)
- [ ] Log retention policy defined (30 days minimum)
- [ ] Sensitive data excluded from logs (passwords, tokens, PII)
- [ ] Audit logs stored separately with extended retention

### Backup Verification

- [ ] PostgreSQL backup automation tested
- [ ] PostgreSQL point-in-time recovery tested
- [ ] Redis persistence verified (AOF + RDB)
- [ ] Elasticsearch snapshot schedule configured
- [ ] Kafka topic replication factor >= 3
- [ ] Backup restoration procedure documented and tested
- [ ] Backup integrity checks automated

### Disaster Recovery Plan

- [ ] Recovery Time Objective (RTO) defined per service
- [ ] Recovery Point Objective (RPO) defined per data store
- [ ] Failover procedures documented
- [ ] Database failover tested
- [ ] Redis failover tested (Sentinel or Cluster)
- [ ] Elasticsearch cluster recovery tested
- [ ] Kafka broker failure recovery tested
- [ ] Full disaster recovery drill completed

### Rollback Procedures

- [ ] Application rollback process documented
- [ ] Database migration rollback tested
- [ ] Blue-green deployment configured
- [ ] Canary release process defined
- [ ] Feature flags implemented for risky changes
- [ ] Rollback can be completed in < 5 minutes

### Infrastructure

- [ ] Kubernetes cluster properly sized
- [ ] Horizontal Pod Autoscaler configured for all services
- [ ] Resource requests and limits set on all pods
- [ ] PersistentVolumeClaims provisioned for stateful services
- [ ] Network policies restrict pod-to-pod communication
- [ ] Ingress controller with TLS termination
- [ ] DNS records configured
- [ ] CDN configured for static frontend assets

### Application

- [ ] All environment variables set in production
- [ ] Health check endpoints responding correctly
- [ ] TypeORM synchronize=false in production (use migrations)
- [ ] Error messages do not expose internal details
- [ ] API versioning strategy defined
- [ ] Graceful shutdown handlers implemented
- [ ] Connection pool sizes tuned for production load

### Testing

- [ ] All unit tests passing (80%+ coverage)
- [ ] All integration tests passing
- [ ] E2E tests passing on staging environment
- [ ] Performance tests passing on staging
- [ ] Security scan passing (no high/critical vulnerabilities)
- [ ] Smoke tests defined for post-deployment verification

### Documentation

- [ ] API documentation up to date
- [ ] Runbook for common operational tasks
- [ ] Incident response playbook
- [ ] On-call documentation
- [ ] Architecture documentation current

---

## Post-Launch Monitoring

### First Hour

- [ ] Health checks returning 200
- [ ] No 5xx errors in logs
- [ ] API latency within targets
- [ ] Kafka consumers processing without lag
- [ ] Temporal workflows completing successfully

### First Day

- [ ] Error rate remains < 1%
- [ ] No memory or CPU anomalies
- [ ] Database connection pool stable
- [ ] Cache hit rates meeting targets
- [ ] User registrations and orders flowing correctly

### First Week

- [ ] Performance trends stable
- [ ] No gradual memory leaks
- [ ] Backup jobs completing successfully
- [ ] No security alerts
- [ ] Customer feedback reviewed

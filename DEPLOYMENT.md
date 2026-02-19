# FoodBot Production Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19
**Status:** Production Ready

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Building for Production](#building-for-production)
- [Deployment Strategies](#deployment-strategies)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the complete production deployment process for FoodBot, including:

- Environment setup and configuration
- Production build process
- Deployment to various platforms (AWS, GCP, Kubernetes)
- Health checks and monitoring
- Rollback procedures

**Architecture Components:**
- Gateway API (NestJS)
- Customer App (React + Vite)
- Restaurant App (React + Vite)
- MCP Adapter Service
- Chrome Extension
- Temporal Workflows
- Shared Packages

---

## Prerequisites

### Required Software

```bash
# Node.js 18+ (LTS recommended)
node --version  # Should be >= 18.0.0

# pnpm package manager
npm install -g pnpm
pnpm --version

# Docker (for containerized deployment)
docker --version
docker-compose --version

# Git
git --version
```

### Required Access

- [ ] Production server SSH access
- [ ] Database credentials (PostgreSQL)
- [ ] Redis credentials
- [ ] Temporal Cloud access (or self-hosted)
- [ ] AWS/GCP credentials (if using cloud)
- [ ] Elasticsearch credentials
- [ ] Kafka credentials
- [ ] Secret management access (AWS Secrets Manager / HashiCorp Vault)

---

## Environment Configuration

### 1. Production Environment Variables

Copy and configure production environment:

```bash
cp .env.example .env.production
```

**Critical Variables (MUST be set):**

```bash
# Security
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-32>
SESSION_SECRET=<generate-with-openssl-rand-base64-32>

# Database
DB_HOST=<production-db-host>
DB_PORT=5432
DB_USER=<db-user>
DB_PASSWORD=<db-password>
DB_NAME=foodbot_production
DB_SSL=true

# Redis
REDIS_URL=<redis-connection-url>
REDIS_TLS=true

# CORS (production domains only)
ALLOWED_ORIGINS=https://app.foodbot.com,https://restaurant.foodbot.com

# API Keys
ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
```

### 2. Validate Environment

Run environment validation:

```bash
pnpm run validate:env
```

This will check:
- All required variables are set
- Values match expected formats
- Production-specific requirements (SSL enabled, no localhost in CORS, etc.)

---

## Building for Production

### 1. Clean Build

Remove all previous build artifacts:

```bash
pnpm run clean
```

### 2. Install Dependencies

Install with frozen lockfile (for reproducible builds):

```bash
pnpm install --frozen-lockfile
```

### 3. Run Production Build

**Option A: Full Build with Tests and Linting**

```bash
./scripts/build-production.sh
```

**Option B: Quick Build (Skip Tests)**

```bash
./scripts/build-production.sh --skip-tests --skip-lint
```

**Option C: Build with Bundle Analysis**

```bash
./scripts/build-production.sh --analyze
```

This generates:
- `apps/customer-app/dist/stats.html`
- `apps/restaurant-app/dist/stats.html`
- `chrome-extension/dist/bundle-report.html`

### 4. Verify Build

Check build artifacts:

```bash
ls -lh apps/*/dist
ls -lh services/*/dist
ls -lh chrome-extension/dist
```

Review `build-manifest.json` for build metadata.

---

## Deployment Strategies

### Strategy 1: Docker Deployment (Recommended)

#### 1. Build Docker Images

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker build -t foodbot-gateway-api -f apps/gateway-api/Dockerfile .
```

#### 2. Push to Registry

```bash
# Tag images
docker tag foodbot-gateway-api:latest registry.foodbot.com/gateway-api:latest

# Push to registry
docker push registry.foodbot.com/gateway-api:latest
```

#### 3. Deploy with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 4. Health Check

```bash
# Gateway API
curl https://api.foodbot.com/health

# Customer App
curl https://app.foodbot.com

# Restaurant App
curl https://restaurant.foodbot.com
```

---

### Strategy 2: Kubernetes Deployment

#### 1. Configure kubectl

```bash
kubectl config use-context foodbot-production
```

#### 2. Apply Kubernetes Manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress.yaml
```

#### 3. Verify Deployment

```bash
kubectl get pods -n foodbot-production
kubectl get services -n foodbot-production
kubectl get ingress -n foodbot-production
```

#### 4. Check Logs

```bash
kubectl logs -f deployment/gateway-api -n foodbot-production
kubectl logs -f deployment/customer-app -n foodbot-production
```

---

### Strategy 3: AWS ECS Deployment

#### 1. Create Task Definitions

```bash
aws ecs register-task-definition --cli-input-json file://ecs/task-definitions/gateway-api.json
```

#### 2. Update Service

```bash
aws ecs update-service \
  --cluster foodbot-production \
  --service gateway-api \
  --force-new-deployment
```

#### 3. Monitor Deployment

```bash
aws ecs describe-services \
  --cluster foodbot-production \
  --services gateway-api
```

---

### Strategy 4: Static Site Deployment (Frontend Apps)

#### Deploy to AWS S3 + CloudFront

```bash
# Customer App
aws s3 sync apps/customer-app/dist s3://foodbot-customer-app --delete
aws cloudfront create-invalidation --distribution-id EXXXXXX --paths "/*"

# Restaurant App
aws s3 sync apps/restaurant-app/dist s3://foodbot-restaurant-app --delete
aws cloudfront create-invalidation --distribution-id EXXXXXX --paths "/*"
```

#### Deploy to Vercel

```bash
cd apps/customer-app
vercel --prod

cd apps/restaurant-app
vercel --prod
```

#### Deploy to Netlify

```bash
cd apps/customer-app
netlify deploy --prod --dir=dist

cd apps/restaurant-app
netlify deploy --prod --dir=dist
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# API Health
curl https://api.foodbot.com/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}

# API Readiness
curl https://api.foodbot.com/ready
# Expected: {"status":"ready"}

# API Liveness
curl https://api.foodbot.com/live
# Expected: {"status":"alive"}
```

### 2. Smoke Tests

```bash
# Test authentication
curl -X POST https://api.foodbot.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test restaurant search
curl -X GET https://api.foodbot.com/api/v1/restaurants/search?query=pizza \
  -H "Authorization: Bearer <token>"

# Test order creation
curl -X POST https://api.foodbot.com/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"items":[...],"restaurantId":"..."}'
```

### 3. Frontend Verification

- [ ] Visit https://app.foodbot.com - Customer app loads
- [ ] Visit https://restaurant.foodbot.com - Restaurant app loads
- [ ] Test login flow
- [ ] Test order placement
- [ ] Check browser console for errors
- [ ] Verify service worker registration (PWA)

### 4. Database Migrations

```bash
# Run pending migrations
pnpm run migrate:prod

# Verify migration status
pnpm run migrate:status
```

### 5. Performance Metrics

Check metrics dashboard:
- Response times < 500ms (p95)
- Error rate < 1%
- CPU usage < 70%
- Memory usage < 80%

---

## Rollback Procedures

### Docker Rollback

```bash
# List previous versions
docker images | grep foodbot-gateway-api

# Rollback to previous tag
docker-compose -f docker-compose.prod.yml down
docker tag foodbot-gateway-api:previous foodbot-gateway-api:latest
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/gateway-api -n foodbot-production

# Rollback to previous version
kubectl rollout undo deployment/gateway-api -n foodbot-production

# Rollback to specific revision
kubectl rollout undo deployment/gateway-api --to-revision=2 -n foodbot-production
```

### AWS ECS Rollback

```bash
# Update service to previous task definition
aws ecs update-service \
  --cluster foodbot-production \
  --service gateway-api \
  --task-definition gateway-api:previous
```

### Static Site Rollback

```bash
# S3 versioning - restore previous version
aws s3api list-object-versions --bucket foodbot-customer-app
aws s3api copy-object \
  --copy-source foodbot-customer-app/index.html?versionId=PREVIOUS_VERSION_ID \
  --bucket foodbot-customer-app \
  --key index.html
```

---

## Monitoring

### Application Metrics

**Prometheus Metrics:**
- Endpoint: `http://api.foodbot.com:9090/metrics`

**Key Metrics:**
- `http_request_duration_ms` - Request latency
- `http_request_total` - Total requests
- `http_request_errors_total` - Error count
- `db_query_duration_ms` - Database query time
- `cache_hit_rate` - Redis cache hit rate

### Logging

**View Logs:**

```bash
# Docker
docker logs -f foodbot-gateway-api

# Kubernetes
kubectl logs -f deployment/gateway-api -n foodbot-production

# AWS CloudWatch
aws logs tail /aws/ecs/gateway-api --follow
```

### Error Tracking

**Sentry Dashboard:**
- Production errors: https://sentry.io/organizations/foodbot/issues
- Performance monitoring: https://sentry.io/organizations/foodbot/performance

### APM (Application Performance Monitoring)

**New Relic / DataDog:**
- Distributed tracing
- Database query performance
- External API latency
- Custom business metrics

---

## Troubleshooting

### Issue: Build Fails

**Solution:**
```bash
# Clear cache
pnpm store prune
rm -rf node_modules
rm -rf .turbo

# Reinstall
pnpm install --frozen-lockfile

# Rebuild
pnpm run build:prod
```

### Issue: Database Connection Fails

**Check:**
- Verify DB_HOST and DB_PORT
- Check database is running: `pg_isready -h $DB_HOST -p $DB_PORT`
- Verify credentials
- Check security groups/firewall rules
- Verify SSL certificates

### Issue: High Memory Usage

**Investigation:**
```bash
# Check memory usage
docker stats

# Kubernetes
kubectl top pods -n foodbot-production

# Node.js heap dump
kill -USR2 <process-id>
```

**Solutions:**
- Increase memory limits in deployment config
- Check for memory leaks (heap snapshots)
- Optimize database queries
- Implement pagination

### Issue: Slow API Responses

**Investigation:**
- Check API metrics: Response time percentiles
- Review slow query logs
- Check external API timeouts
- Verify cache hit rates

**Solutions:**
- Add database indexes
- Increase Redis cache TTL
- Implement query optimization
- Add CDN for static assets

### Issue: CORS Errors

**Check:**
- Verify ALLOWED_ORIGINS includes production domain
- Check request origin header
- Verify credentials: true in CORS config

**Fix:**
```bash
# Update environment
ALLOWED_ORIGINS=https://app.foodbot.com,https://restaurant.foodbot.com

# Restart service
docker-compose restart gateway-api
```

---

## Support

For deployment issues:
- **DevOps Team:** devops@foodbot.com
- **On-Call:** PagerDuty
- **Slack:** #foodbot-deployments

---

## Appendix

### A. Deployment Checklist

Pre-Deployment:
- [ ] Code reviewed and approved
- [ ] Tests passing (unit, integration, E2E)
- [ ] Security scan passed
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Rollback plan documented

During Deployment:
- [ ] Build successful
- [ ] Images pushed to registry
- [ ] Database migrations applied
- [ ] Services deployed
- [ ] Health checks passing
- [ ] Smoke tests completed

Post-Deployment:
- [ ] Monitoring alerts configured
- [ ] Logs streaming
- [ ] Performance metrics normal
- [ ] Error rates normal
- [ ] Announcement sent to team

### B. Production URLs

- **Customer App:** https://app.foodbot.com
- **Restaurant App:** https://restaurant.foodbot.com
- **Admin Portal:** https://admin.foodbot.com
- **API Gateway:** https://api.foodbot.com
- **Metrics:** https://metrics.foodbot.com
- **Documentation:** https://docs.foodbot.com

### C. Emergency Contacts

- **Engineering Lead:** +1-XXX-XXX-XXXX
- **DevOps Lead:** +1-XXX-XXX-XXXX
- **On-Call:** PagerDuty (auto-escalation)

---

**Document Maintained By:** DevOps Team
**Next Review:** 2026-03-19

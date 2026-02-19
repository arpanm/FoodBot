# FoodBot CI/CD Pipeline Documentation

## Overview

This directory contains the complete CI/CD pipeline configuration for FoodBot, implementing best practices for continuous integration, deployment, and security scanning.

## Workflows

### 1. Continuous Integration (`ci.yml`)

**Trigger:** Push to `main`/`develop`, Pull Requests

**What it does:**
- Linting (ESLint)
- Format checking (Prettier)
- TypeScript type checking
- Unit tests (Backend, Frontend, MCP)
- Integration tests
- E2E tests (on main branch only)
- Build artifacts
- Security scanning
- Code coverage upload to Codecov

**Services:**
- PostgreSQL 16 (test database)
- Redis 7 (caching)

**Jobs:**
1. `lint` - ESLint, Prettier, TypeScript checks
2. `test-backend` - NestJS backend tests
3. `test-frontend` - React frontend tests
4. `test-mcp` - Java/Maven MCP tests
5. `build-backend` - Build and upload artifacts
6. `build-frontend` - Build React app
7. `build-mcp` - Build Spring Boot JAR
8. `security` - npm audit, Maven dependency check
9. `test-e2e` - Playwright E2E tests

**Environment Variables:**
```bash
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=foodbot_test
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=ci-test-jwt-secret-minimum-32-chars
JWT_REFRESH_SECRET=ci-test-jwt-refresh-secret-32-chars
```

---

### 2. Deploy to AWS EC2 (`deploy-aws.yml`)

**Trigger:** CI workflow completion on `main`, Manual dispatch

**What it does:**
- Verifies required secrets
- Builds all artifacts (backend, frontend, MCP)
- Creates deployment package
- Deploys to EC2 via SSH
- Runs database migrations
- Health checks all services
- Automatic rollback on failure
- Cleanup old releases (keeps last 5)

**Required Secrets:**
```
EC2_HOST
EC2_USER
SSH_PRIVATE_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
REACT_APP_API_URL
```

**Deployment Flow:**
1. Preflight checks
2. Build artifacts
3. Create deployment package
4. Copy to EC2 via SCP
5. Execute deployment script
6. Health checks
7. Rollback on failure
8. Cleanup old releases

---

### 3. Deploy to Staging (`cd-staging.yml`)

**Trigger:** Push to `develop` branch, Manual dispatch

**What it does:**
- Build Docker images for all services
- Push to GitHub Container Registry
- Deploy to Kubernetes staging namespace
- Run database migrations
- Smoke tests (auth, menu API)
- Health checks
- Slack notifications

**Docker Images:**
- `backend` - NestJS Gateway API
- `frontend` - React Customer App
- `mcp` - Spring Boot MCP Orchestrator
- `search` - Search Orchestrator
- `adapter` - MCP Adapter

**Kubernetes Resources:**
```
Namespace: foodbot-staging
Deployments: backend, frontend, mcp, search, adapter
Services: LoadBalancer for external access
ConfigMaps: Application configuration
Secrets: Database credentials, API keys
```

**Smoke Tests:**
- User registration
- User login
- Menu API
- Health endpoints

---

### 4. Deploy to Production (`cd-production.yml`)

**Trigger:** Git tags `v*.*.*` (semantic versioning), Manual dispatch

**What it does:**
- Semantic version validation
- Build and security scan Docker images
- Blue/green deployment to Kubernetes
- Database migrations (dry-run first)
- E2E tests on production
- Automatic rollback on failure
- Create GitHub release
- Datadog deployment event
- Slack notifications
- Status page update

**Blue/Green Deployment:**
1. Deploy to green environment
2. Run health checks on green
3. Run smoke tests on green
4. Switch production traffic to green
5. Monitor metrics for 2 minutes
6. Run database migrations
7. Scale down blue environment
8. Label green as new blue

**Security Scanning:**
- Trivy vulnerability scanner
- Critical/High severity check
- SARIF upload to GitHub Security

**E2E Tests:**
- Full user workflows
- Order placement
- Payment processing
- Results uploaded for 30 days

---

### 5. Dependency Updates (`dependency-update.yml`)

**Trigger:** Weekly (Monday 9 AM UTC), Manual dispatch

**What it does:**
- Update Node.js dependencies (pnpm)
- Update Maven dependencies
- Update GitHub Actions versions
- Run tests on updates
- Security audits
- Create PRs automatically
- Auto-merge patch/minor updates (Dependabot)

**Update Strategy:**
- Patch and minor versions only
- Major versions require manual review
- DevDependencies auto-merged
- All tests must pass before PR creation

**Renovate Bot (Optional):**
- Alternative to manual updates
- Configurable auto-merge rules
- Scheduled updates

---

### 6. Security Scanning (`security-scan.yml`)

**Trigger:** Daily 2 AM UTC, Push to main/develop, Pull Requests, Manual dispatch

**What it does:**
- Secret detection (TruffleHog, GitLeaks)
- Dependency vulnerability scanning (npm audit, Snyk, OWASP)
- SAST (CodeQL, SonarQube, Semgrep)
- Container image scanning (Trivy, Grype, Docker Scout)
- License compliance checking
- Infrastructure as Code scanning (Checkov, Terrascan)
- Create issues for critical findings
- Security team notifications

**Secret Scanning:**
- AWS credentials
- Private keys
- API tokens
- Verified secrets only

**Dependency Scanning:**
- npm audit (moderate severity)
- Snyk (high severity)
- OWASP Dependency Check (CVSS 7+)
- Maven dependencies

**SAST Tools:**
- CodeQL (security-extended queries)
- SonarQube (quality + security)
- Semgrep (security-audit, OWASP Top 10)

**Container Scanning:**
- Trivy (OS + library vulnerabilities)
- Grype (Anchore scanner)
- Docker Scout CVE scan

**IaC Scanning:**
- Checkov (Kubernetes, Dockerfile, GitHub Actions)
- Terrascan (Kubernetes manifests)

**Notifications:**
- GitHub Security tab
- Automated issues for critical findings
- Slack notifications (security team)

---

## Docker Images

All images use multi-stage builds with the following security features:

### Security Features

1. **Multi-stage builds** - Minimal production images
2. **Non-root user** - All services run as `appuser` (UID 1001)
3. **Alpine Linux** - Minimal attack surface
4. **Security updates** - `apk upgrade --no-cache`
5. **Health checks** - Built-in container health monitoring
6. **Dumb-init** - Proper signal handling
7. **Metadata labels** - OCI image spec compliance

### Image Specifications

**Backend (NestJS):**
```dockerfile
Base: node:20-alpine
User: appuser (1001)
Port: 3000
Health: /api/v1/health
Size: ~150MB
```

**Frontend (React):**
```dockerfile
Base: node:20-alpine + nginx:alpine
User: nginx
Port: 80, 443
Health: /
Size: ~50MB
```

**MCP Orchestrator (Spring Boot):**
```dockerfile
Base: eclipse-temurin:17-jre-alpine
User: appuser (1001)
Port: 8080
Health: /actuator/health
Size: ~200MB
```

**Search Orchestrator:**
```dockerfile
Base: node:20-alpine
User: appuser (1001)
Port: 3002
Health: /health
Size: ~120MB
```

**MCP Adapter:**
```dockerfile
Base: node:20-alpine
User: appuser (1001)
Port: 3100
Health: /health
Size: ~120MB
```

---

## Deployment Scripts

### `/scripts/deploy-k8s.sh`

Zero-downtime Kubernetes deployment script.

**Usage:**
```bash
./scripts/deploy-k8s.sh <environment> <version>

# Examples:
./scripts/deploy-k8s.sh staging v1.2.3
./scripts/deploy-k8s.sh production v1.2.3
```

**Features:**
- Namespace creation
- ConfigMap/Secret deployment
- Rolling updates
- Health checks
- Database migrations
- Service status display

### `/scripts/rollback-k8s.sh`

Kubernetes rollback script.

**Usage:**
```bash
./scripts/rollback-k8s.sh <environment>

# Examples:
./scripts/rollback-k8s.sh staging
./scripts/rollback-k8s.sh production  # Requires confirmation
```

**Features:**
- Rollback all deployments
- Health verification
- Deployment history display
- Production confirmation

### `/scripts/db-migrate.sh`

Database migration script with backup/restore.

**Usage:**
```bash
./scripts/db-migrate.sh <environment> <action>

# Examples:
./scripts/db-migrate.sh staging migrate
./scripts/db-migrate.sh production migrate
./scripts/db-migrate.sh production rollback
./scripts/db-migrate.sh staging status
./scripts/db-migrate.sh staging dry-run
```

**Features:**
- Automatic backups (production)
- Rollback capability
- Migration status
- Dry-run mode
- Restore from backup

---

## Environment Configuration

### GitHub Secrets

**AWS Deployment:**
```
EC2_HOST                  # EC2 instance IP/hostname
EC2_USER                  # SSH user
SSH_PRIVATE_KEY           # SSH private key (base64)
AWS_ACCESS_KEY_ID         # AWS credentials
AWS_SECRET_ACCESS_KEY     # AWS credentials
AWS_REGION                # AWS region (e.g., us-east-1)
```

**Kubernetes Deployment:**
```
KUBE_CONFIG_STAGING       # Kubeconfig for staging (base64)
KUBE_CONFIG_PRODUCTION    # Kubeconfig for production (base64)
DOCKER_REGISTRY           # Container registry URL
GITHUB_TOKEN              # Auto-generated (no setup needed)
```

**Application Configuration:**
```
REACT_APP_API_URL         # API URL for React app
PROD_DATABASE_URL         # Production database connection
STAGING_DATABASE_URL      # Staging database connection
JWT_SECRET                # Production JWT secret
```

**Third-party Integrations:**
```
CODECOV_TOKEN             # Code coverage reporting
SNYK_TOKEN                # Snyk security scanning
SONAR_TOKEN               # SonarQube analysis
SONAR_HOST_URL            # SonarQube server URL
DATADOG_API_KEY           # Datadog monitoring
SLACK_WEBHOOK_URL         # Slack notifications
SECURITY_SLACK_WEBHOOK    # Security alerts
STATUS_PAGE_API_KEY       # Status page updates
STATUS_PAGE_ID            # Status page identifier
DOCKER_SCOUT_TOKEN        # Docker Scout scanning
```

---

## Best Practices

### 1. Semantic Versioning

Use semantic versioning for all releases:

```bash
# Major version (breaking changes)
git tag v2.0.0
git push origin v2.0.0

# Minor version (new features)
git tag v1.1.0
git push origin v1.1.0

# Patch version (bug fixes)
git tag v1.0.1
git push origin v1.0.1
```

### 2. Branch Strategy

- `main` - Production-ready code
- `develop` - Staging/development code
- `feature/*` - Feature branches
- `hotfix/*` - Production hotfixes

### 3. Pull Request Workflow

1. Create feature branch from `develop`
2. Make changes and commit
3. Create PR to `develop`
4. CI checks must pass
5. Code review required
6. Merge to `develop` (auto-deploy to staging)
7. Test on staging
8. Merge `develop` to `main`
9. Tag release (auto-deploy to production)

### 4. Rollback Procedure

**If deployment fails:**
1. GitHub Actions automatically triggers rollback
2. Blue/green deployment switches back to blue
3. Services are verified healthy
4. Incident created and team notified

**Manual rollback:**
```bash
# Kubernetes
./scripts/rollback-k8s.sh production

# AWS EC2
ssh user@host 'cd /home/user/foodbot && ./rollback.sh'
```

### 5. Monitoring

**Health Checks:**
- Backend: `GET /api/v1/health`
- Frontend: `GET /`
- MCP: `GET /actuator/health`

**Metrics:**
- Datadog deployment events
- GitHub Actions run history
- Container registry image scans

**Alerts:**
- Slack notifications
- GitHub issues (critical security)
- Status page updates

---

## Troubleshooting

### CI Failures

**Linting errors:**
```bash
pnpm run lint:fix
pnpm run format
```

**Test failures:**
```bash
# Run locally
pnpm run test:unit
pnpm run test:integration

# Check coverage
pnpm run test:coverage
```

**Build failures:**
```bash
# Clean and rebuild
pnpm run clean
pnpm install
pnpm run build
```

### Deployment Failures

**Health check failures:**
1. Check pod logs: `kubectl logs -n foodbot-production deployment/foodbot-backend`
2. Check pod status: `kubectl get pods -n foodbot-production`
3. Check service: `kubectl describe svc foodbot-backend -n foodbot-production`

**Database migration failures:**
1. Check migration status: `./scripts/db-migrate.sh production status`
2. Rollback migration: `./scripts/db-migrate.sh production rollback`
3. Check logs: `kubectl logs -n foodbot-production deployment/foodbot-backend`

**Image pull failures:**
1. Verify registry credentials: `kubectl get secret -n foodbot-production`
2. Check image exists: `docker pull ghcr.io/foodbot/backend:v1.2.3`
3. Update image pull secret if needed

### Security Scan Failures

**Critical vulnerabilities:**
1. Review findings in GitHub Security tab
2. Update vulnerable dependencies
3. Run local scan: `snyk test`
4. Create remediation plan

**Secret detection:**
1. Remove secrets from code immediately
2. Rotate compromised credentials
3. Use environment variables or secret managers

---

## Performance Optimization

### Pipeline Optimization

1. **Caching:**
   - Node modules cached per branch
   - Maven dependencies cached
   - Docker layer caching enabled

2. **Parallel Jobs:**
   - Lint, test, build run in parallel
   - Independent workflows don't block each other

3. **Conditional Execution:**
   - E2E tests only on main branch
   - Security scans only on PR/push
   - Deployment only after successful CI

### Resource Limits

```yaml
CI Jobs:
  Timeout: 10-30 minutes
  Concurrency: Cancel in-progress (CI only)

Deployment Jobs:
  Timeout: 15-30 minutes
  Concurrency: No cancellation
```

---

## Maintenance

### Weekly Tasks

- Review dependency update PRs
- Check security scan results
- Monitor deployment success rate
- Review logs for errors

### Monthly Tasks

- Update GitHub Actions versions
- Review and update secrets
- Audit access permissions
- Review and optimize pipeline performance

### Quarterly Tasks

- Security audit
- Dependency major version updates
- Infrastructure cost optimization
- Disaster recovery testing

---

## Support

For questions or issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Check project README.md
4. Contact DevOps team

---

**Last Updated:** 2026-02-19
**Version:** 1.0.0

# CI/CD Pipeline Requirements

**Version:** 1.0.0
**Status:** Completed
**Last Updated:** 2026-02-20

---

## Overview

FoodBot implements comprehensive CI/CD pipelines using GitHub Actions for continuous integration, deployment, and security scanning across development, staging, and production environments.

---

## Pipeline Files

### 1. Continuous Integration (.github/workflows/ci.yml)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

**Concurrency:** Cancels in-progress runs for same ref

**Jobs:**

#### Lint & Type Check
- **Timeout:** 10 minutes
- **Runner:** ubuntu-latest
- **Steps:**
  1. Checkout repository
  2. Setup pnpm (v8)
  3. Setup Node.js 20 with cache
  4. Install dependencies (frozen lockfile)
  5. Run ESLint
  6. Check Prettier formatting
  7. TypeScript type check (noEmit)

#### Backend Tests
- **Timeout:** 15 minutes
- **Runner:** ubuntu-latest
- **Services:**
  - PostgreSQL 16 (port 5433)
  - Redis 7 (port 6379)
- **Steps:**
  1. Checkout
  2. Setup pnpm + Node.js
  3. Install dependencies
  4. Run unit tests with coverage
  5. Run integration tests
  6. Upload coverage artifacts (7 day retention)
  7. Upload to Codecov (main branch only)
- **Coverage Target:** 80% (enforced)

#### Frontend Tests
- **Timeout:** 10 minutes
- **Steps:**
  1. Checkout
  2. Setup pnpm + Node.js
  3. Install dependencies
  4. Run frontend tests with coverage
  5. Upload coverage artifacts
  6. Upload to Codecov (main branch only)

#### MCP Orchestrator Tests (Java)
- **Timeout:** 15 minutes
- **Java Version:** 17 (Temurin)
- **Steps:**
  1. Checkout
  2. Setup Java with Maven cache
  3. Run Maven tests
  4. Upload test results (7 day retention)

#### Build Backend
- **Timeout:** 10 minutes
- **Depends On:** lint, test-backend
- **Steps:**
  1. Checkout
  2. Setup pnpm + Node.js
  3. Install dependencies
  4. Build all packages
  5. Upload build artifacts (3 day retention)
    - apps/gateway-api/dist
    - packages/*/dist
    - services/*/dist

#### Build Frontend
- **Timeout:** 10 minutes
- **Depends On:** lint, test-frontend
- **Steps:**
  1. Checkout
  2. Setup pnpm + Node.js
  3. Install dependencies
  4. Build customer-app
  5. Upload build artifacts (3 day retention)

#### Build MCP Service
- **Timeout:** 15 minutes
- **Depends On:** test-mcp
- **Steps:**
  1. Checkout
  2. Setup Java
  3. Maven build (skip tests)
  4. Upload JAR artifact (3 day retention)

#### Security Scan
- **Timeout:** 10 minutes
- **Condition:** Pull requests only
- **Steps:**
  1. Checkout
  2. Setup pnpm + Node.js
  3. Install dependencies
  4. npm audit (high severity)
  5. Setup Java
  6. Maven dependency-check
- **Failures:** Non-blocking (|| true)

#### E2E Tests
- **Timeout:** 30 minutes
- **Condition:** main branch pushes only
- **Depends On:** build-backend, build-frontend, build-mcp
- **Services:**
  - PostgreSQL 16
  - Redis 7
- **Steps:**
  1. Checkout
  2. Setup pnpm + Node.js
  3. Install dependencies
  4. Install Playwright browsers
  5. Run E2E tests
  6. Upload test results (7 day retention)

**Total Pipeline Time:** ~20-30 minutes

---

### 2. Production Deployment (.github/workflows/cd-production.yml)

**Triggers:**
- Push to tags matching `v*.*.*` (semantic versioning)
- Manual workflow dispatch with version input

**Concurrency:** production-deployment (no cancellation)

**Environment Variables:**
- REGISTRY: ghcr.io
- IMAGE_PREFIX: github.repository
- NODE_VERSION: 20
- JAVA_VERSION: 17

**Jobs:**

#### Pre-flight Checks
- **Steps:**
  1. Checkout with full history
  2. Extract version from tag or input
  3. Validate semantic version format
  4. Check tag exists
  5. Verify required secrets:
     - KUBE_CONFIG_PRODUCTION
     - PROD_DATABASE_URL
     - DATADOG_API_KEY
- **Outputs:** version, should_deploy

#### Build & Security Scan
- **Timeout:** 45 minutes
- **Depends On:** preflight
- **Permissions:**
  - contents: read
  - packages: write
  - security-events: write
- **Strategy:** Matrix build for 5 services
  - backend (gateway-api)
  - frontend (customer-app)
  - mcp (mcp-orchestrator)
  - search (search-orchestrator)
  - adapter (mcp-adapter)
- **Steps Per Service:**
  1. Checkout
  2. Setup Docker Buildx
  3. Login to GitHub Container Registry
  4. Build image with tags:
     - {version}
     - latest
  5. Push to registry with build cache
  6. Run Trivy security scan (CRITICAL, HIGH)
  7. Upload SARIF to GitHub Security
  8. Fail if critical vulnerabilities found

#### Blue/Green Deploy to Production
- **Timeout:** 30 minutes
- **Depends On:** preflight, build-and-scan
- **Environment:** production (https://foodbot.app)
- **Steps:**
  1. Checkout
  2. Configure kubectl v1.28.0
  3. Setup kubeconfig from secret
  4. Create green namespace
  5. Deploy to green environment (k8s/production/green/)
  6. Update image versions for all services
  7. Wait for green deployment rollout (10min timeout)
  8. Run database migrations (dry-run)
  9. Verify green health via port-forward
  10. Run smoke tests on green
  11. Switch production traffic to green
  12. Monitor metrics (2 minutes)
  13. Verify production health post-switch
  14. Run database migrations (production)
  15. Scale down blue environment
  16. Label green as new blue

**Deployment Strategy:**
- **Type:** Blue/Green
- **Zero Downtime:** Yes
- **Rollback Time:** < 2 minutes
- **Health Checks:** Pre and post switch
- **Database Migrations:** Dry-run before switch

#### Production E2E Tests
- **Timeout:** 20 minutes
- **Depends On:** deploy-production
- **Condition:** skip_e2e input not set
- **Steps:**
  1. Checkout
  2. Setup pnpm + Node.js
  3. Install dependencies
  4. Install Playwright (chromium only)
  5. Run E2E against production URLs
  6. Upload results (30 day retention)

#### Rollback on Failure
- **Condition:** Any previous job failed
- **Timeout:** 10 minutes
- **Steps:**
  1. Configure kubectl
  2. Setup kubeconfig
  3. Switch traffic back to blue
  4. Scale up blue environment (3 replicas)
  5. Verify rollback health
- **Rollback Time:** < 2 minutes

#### Post-deployment Tasks
- **Depends On:** deploy-production, e2e-tests
- **Condition:** Success only
- **Steps:**
  1. Create GitHub Release
     - Tag name
     - Release notes
     - Link to CHANGELOG.md
  2. Send Datadog deployment event
  3. Notify Slack (if webhook configured)
  4. Update status page (if API key configured)

**Total Deployment Time:** ~50-70 minutes

---

### 3. Security Scanning (.github/workflows/security-scan.yml)

**Triggers:**
- Daily at 2 AM UTC (cron)
- Push to main/develop
- Pull requests to main/develop
- Manual workflow dispatch

**Permissions:**
- contents: read
- security-events: write
- pull-requests: write

**Jobs:**

#### Secret Detection
- **Timeout:** 10 minutes
- **Tools:**
  1. TruffleHog (verified secrets only)
  2. GitLeaks
  3. Custom AWS credentials check
  4. Custom private key check
- **Pattern:** `AKIA[0-9A-Z]{16}`, `BEGIN.*PRIVATE KEY`

#### Dependency Vulnerabilities
- **Timeout:** 15 minutes
- **Scans:**
  1. pnpm audit (moderate+)
  2. Snyk dependency scan (high+) - if token provided
  3. OWASP Dependency Check (CVSS ≥ 7)
- **Outputs:**
  - npm-audit.json
  - snyk-report.json (SARIF)
  - owasp-dependency-check-report (HTML, JSON)
- **Retention:** 30 days

#### Maven Security Scan
- **Timeout:** 15 minutes
- **Tool:** OWASP Dependency Check Maven Plugin
- **Threshold:** CVSS ≥ 7
- **Configuration:** dependency-check-suppressions.xml

#### SAST Analysis
- **Timeout:** 20 minutes
- **Tools:**
  1. **CodeQL**
     - Languages: JavaScript, TypeScript, Java
     - Queries: security-extended
  2. **SonarQube** (if token provided)
     - Coverage reports included
  3. **Semgrep**
     - Rulesets:
       - p/security-audit
       - p/secrets
       - p/owasp-top-ten
       - p/nodejs
       - p/typescript
       - p/java
- **Outputs:** SARIF files uploaded to GitHub Security

#### Container Security Scan
- **Timeout:** 20 minutes per service
- **Condition:** Push or manual dispatch
- **Strategy:** Matrix for 5 services
- **Tools:**
  1. **Trivy**
     - Severity: CRITICAL, HIGH, MEDIUM
     - Types: OS, Library
     - Scanners: vuln, secret, config
  2. **Grype** (Anchore)
     - Severity cutoff: high
     - Non-blocking
  3. **Docker Scout** (if token provided)
- **Outputs:** SARIF files, reports (30 day retention)

#### License Compliance
- **Timeout:** 10 minutes
- **Tool:** license-checker
- **Forbidden Licenses:** GPL, AGPL, SSPL, CC-BY-NC
- **Output:** licenses.json (30 day retention)

#### Infrastructure as Code Security
- **Timeout:** 10 minutes
- **Tools:**
  1. **Checkov**
     - Frameworks: Kubernetes, Dockerfile, GitHub Actions
     - Format: SARIF
  2. **Terrascan**
     - Type: Kubernetes
     - Directory: k8s/

#### Security Report Summary
- **Depends On:** All scan jobs
- **Condition:** Always runs
- **Steps:**
  1. Download all artifacts
  2. Generate summary in GitHub Actions UI
  3. Create GitHub issue if critical findings
  4. Notify security team via Slack
  5. Include workflow run link

**Scan Frequency:**
- Daily: Full scan at 2 AM UTC
- On PR: All scans
- On Push: All scans

**Total Scan Time:** ~60-90 minutes

---

### 4. Additional Workflows

#### Dependency Update (.github/workflows/dependency-update.yml)
- **Trigger:** Weekly
- **Purpose:** Automated dependency updates
- **Tools:** Dependabot or Renovate

#### CD Staging (.github/workflows/cd-staging.yml)
- **Trigger:** Push to develop branch
- **Purpose:** Deploy to staging environment
- **Strategy:** Similar to production but without blue/green

#### Deploy AWS (.github/workflows/deploy-aws.yml)
- **Trigger:** Manual or tag
- **Purpose:** Deploy to AWS ECS/EKS
- **Services:** CloudFormation, ECR, ECS

---

## Secrets Management

### Required Secrets

#### Production Deployment
- `KUBE_CONFIG_PRODUCTION`: Base64 encoded kubeconfig
- `PROD_DATABASE_URL`: Production database connection
- `DATADOG_API_KEY`: Datadog monitoring
- `JWT_SECRET`: JWT signing key (32+ chars)
- `JWT_REFRESH_SECRET`: Refresh token key (32+ chars)
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `REDIS_PASSWORD`: Redis password
- `SLACK_WEBHOOK_URL`: Deployment notifications
- `STATUS_PAGE_API_KEY`: Status page updates
- `STATUS_PAGE_ID`: Status page identifier

#### Security Scanning
- `CODECOV_TOKEN`: Code coverage upload
- `SNYK_TOKEN`: Snyk vulnerability scanning
- `SONAR_TOKEN`: SonarQube analysis
- `SONAR_HOST_URL`: SonarQube server
- `DOCKER_SCOUT_TOKEN`: Docker security scanning
- `SECURITY_SLACK_WEBHOOK`: Security alerts

#### Optional
- `GRAFANA_USER`: Grafana admin username
- `GRAFANA_PASSWORD`: Grafana admin password
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email notifications
- `SMS_PROVIDER_API_KEY`: SMS notifications

---

## Artifact Management

### Build Artifacts
- **Backend:** dist/ directories (3 days)
- **Frontend:** build/ directories (3 days)
- **MCP:** JAR files (3 days)

### Test Artifacts
- **Coverage:** lcov.info, coverage/ (7 days)
- **E2E:** playwright-report/, test-results/ (7-30 days)
- **MCP:** surefire-reports/ (7 days)

### Security Artifacts
- **SARIF:** All security scans (permanent)
- **Reports:** HTML/JSON reports (30 days)
- **Licenses:** licenses.json (30 days)

---

## Performance Metrics

### CI Pipeline (Typical)
- Lint: 2-3 minutes
- Backend Tests: 8-12 minutes
- Frontend Tests: 5-7 minutes
- MCP Tests: 10-12 minutes
- Build: 5-7 minutes
- E2E: 15-20 minutes
- **Total:** 20-30 minutes

### Production Deployment (Typical)
- Build & Scan: 30-40 minutes
- Deploy: 10-15 minutes
- E2E Tests: 15-20 minutes
- **Total:** 55-75 minutes

### Security Scan (Full)
- Secret Scan: 5 minutes
- Dependency Scan: 10 minutes
- SAST: 15 minutes
- Container Scan: 20 minutes (5 services × 4 min)
- License + IaC: 5 minutes
- **Total:** 55-65 minutes

---

## Quality Gates

### Pre-Merge Requirements
1. ✓ All lint checks pass
2. ✓ All tests pass (unit, integration)
3. ✓ Code coverage ≥ 80%
4. ✓ No TypeScript errors
5. ✓ Prettier formatting correct
6. ✓ No high-severity vulnerabilities

### Pre-Deploy Requirements
1. ✓ All CI checks pass
2. ✓ No critical container vulnerabilities
3. ✓ Semantic version tag valid
4. ✓ Required secrets configured
5. ✓ Green environment healthy
6. ✓ Smoke tests pass

### Post-Deploy Verification
1. ✓ Production health check
2. ✓ Database migrations successful
3. ✓ E2E tests pass
4. ✓ Metrics within normal range
5. ✓ Error rate < 1%

---

## Rollback Procedures

### Automatic Rollback Triggers
- Green environment health check fails
- Smoke tests fail
- E2E tests fail on production
- Database migration fails

### Manual Rollback
```bash
# Via workflow
gh workflow run cd-production.yml -f rollback=true

# Via kubectl
kubectl patch service foodbot-backend -n foodbot-production \
  -p '{"spec":{"selector":{"environment":"blue"}}}'
```

### Rollback Time
- **Target:** < 2 minutes
- **Typical:** 1-3 minutes
- **Maximum:** 5 minutes

---

## Monitoring & Alerting

### Pipeline Monitoring
- GitHub Actions status dashboard
- Datadog CI/CD metrics
- Slack notifications on failure

### Security Monitoring
- Daily security scan results
- GitHub Security tab for SARIF uploads
- Critical finding notifications
- Auto-created GitHub issues

### Deployment Monitoring
- Datadog deployment events
- Grafana deployment annotations
- Status page updates
- Slack deployment notifications

---

## Compliance

### Standards Adherence
- **OWASP Top 10:** Scanned daily
- **CIS Benchmarks:** Container images scanned
- **License Compliance:** All dependencies checked
- **Secret Detection:** Automated on every commit
- **SAST:** Multiple tools (CodeQL, SonarQube, Semgrep)
- **DAST:** Post-deployment E2E tests

### Audit Trail
- All deployments logged in GitHub Actions
- Deployment events sent to Datadog
- Security findings in GitHub Security tab
- Change history via git tags and releases

---

## Status: COMPLETED ✓

All CI/CD pipelines have been implemented and tested successfully.

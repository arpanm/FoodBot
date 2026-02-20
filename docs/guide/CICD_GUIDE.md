# FoodBot CI/CD Pipeline Guide

**Version:** 2.0.0
**Last Updated:** 2026-02-20
**Status:** Production Ready

Complete guide for the GitHub Actions CI/CD pipeline with comprehensive deployment strategies.

---

## Table of Contents

- [Overview](#overview)
- [Pipeline Architecture](#pipeline-architecture)
- [Continuous Integration (CI)](#continuous-integration-ci)
- [Continuous Deployment (CD)](#continuous-deployment-cd)
- [Security Scanning](#security-scanning)
- [Deployment Scripts](#deployment-scripts)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

FoodBot uses GitHub Actions for continuous integration and deployment with multiple strategies:

### Active Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **Continuous Integration** | `.github/workflows/ci.yml` | Push/PR to main/develop | Lint, test, build all services |
| **Deploy to Production** | `.github/workflows/cd-production.yml` | Tag `v*.*.*` | Blue/green production deployment |
| **Deploy to Staging** | `.github/workflows/cd-staging.yml` | Push to develop | Staging environment deployment |
| **Security Scan** | `.github/workflows/security-scan.yml` | Daily, push, PR | Comprehensive security scanning |
| **Deploy to AWS EC2** | `.github/workflows/deploy.yml` | Post-CI, manual | Standard EC2 deployment |
| **Deploy to AWS (Simple)** | `.github/workflows/deploy-aws.yml` | Push to main, manual | Simplified EC2 deployment |
| **Dependency Updates** | `.github/workflows/dependency-update.yml` | Weekly, manual | Automated dependency management |

### Deployment Environments

- **Production**: Kubernetes cluster with blue/green deployment
- **Staging**: Kubernetes cluster with rolling updates
- **AWS EC2**: Traditional server deployment with releases

---

## Pipeline Architecture

### CI/CD Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Code Push / Pull Request                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Continuous Integration (CI)                 │
├─────────────────────────────────────────────────────────────┤
│  1. Lint & Type Check (2-3 min)                             │
│  2. Backend Tests + Coverage (5-8 min)                      │
│  3. Frontend Tests + Coverage (3-5 min)                     │
│  4. MCP Orchestrator Tests (3-5 min)                        │
│  5. Build Backend/Frontend/MCP (5-7 min)                    │
│  6. Security Scan (PR only, 2-3 min)                        │
│  7. E2E Tests (main only, 10-15 min)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
                  ┌──────┴──────┐
                  │             │
         ┌────────↓───┐   ┌────↓────────┐
         │  Staging   │   │ Production  │
         │ (develop)  │   │  (v*.*.*)   │
         └────────┬───┘   └────┬────────┘
                  │             │
                  ↓             ↓
         ┌────────────┐   ┌──────────────┐
         │ Build &    │   │ Pre-flight   │
         │ Push       │   │ Checks       │
         │ Images     │   │ & Security   │
         └────┬───────┘   └──────┬───────┘
              │                  │
              ↓                  ↓
         ┌────────────┐   ┌──────────────┐
         │ Deploy to  │   │ Blue/Green   │
         │ Staging    │   │ Deployment   │
         │ K8s        │   │ Production   │
         └────┬───────┘   └──────┬───────┘
              │                  │
              ↓                  ↓
         ┌────────────┐   ┌──────────────┐
         │ Smoke      │   │ E2E Tests    │
         │ Tests      │   │ + Health     │
         └────────────┘   └──────┬───────┘
                                 │
                          ┌──────┴──────┐
                          │             │
                     Success?      Failure?
                          │             │
                          ↓             ↓
                   ┌──────────┐   ┌──────────┐
                   │ Complete │   │ Rollback │
                   └──────────┘   └──────────┘
```

---

## Continuous Integration (CI)

**File:** `.github/workflows/ci.yml`

### Triggers

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Jobs Overview

#### 1. Lint & Type Check
**Duration:** ~2-3 minutes
**Runs:** All pushes and PRs

```bash
Steps:
├─ Setup pnpm + Node.js 20
├─ Install dependencies (pnpm install --frozen-lockfile)
├─ Run ESLint (pnpm run lint)
├─ Check Prettier formatting (pnpm run format:check)
└─ TypeScript type check (npx tsc --noEmit)
```

**Timeout:** 10 minutes
**Concurrency:** Runs in parallel with tests

---

#### 2. Backend Tests
**Duration:** ~5-8 minutes
**Services:** PostgreSQL 16, Redis 7

```yaml
Services:
  postgres:
    image: postgres:16-alpine
    ports: [5433:5432]
    health-checks: pg_isready

  redis:
    image: redis:7-alpine
    ports: [6379:6379]
    health-checks: redis-cli ping
```

```bash
Steps:
├─ Setup environment with PostgreSQL + Redis
├─ Install dependencies
├─ Run unit tests with coverage
│  └─ pnpm run test:unit -- --coverage
├─ Run integration tests
│  └─ pnpm run test:integration
├─ Upload coverage artifacts
└─ Upload to Codecov (main branch only)
```

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

**Artifacts:**
- Coverage reports (7 days retention)
- Test results

---

#### 3. Frontend Tests
**Duration:** ~3-5 minutes

```bash
Steps:
├─ Setup pnpm + Node.js
├─ Install dependencies
├─ Run frontend tests with coverage
│  └─ cd apps/customer-app && pnpm test -- --coverage
├─ Upload coverage artifacts
└─ Upload to Codecov (main branch only)
```

**Working Directory:** `apps/customer-app`
**Test Framework:** Jest + React Testing Library

---

#### 4. MCP Orchestrator Tests
**Duration:** ~3-5 minutes
**Language:** Java 17

```bash
Steps:
├─ Setup Java 17 (Temurin distribution)
├─ Maven cache configured
├─ Run MCP tests
│  └─ cd services/mcp-orchestrator && mvn test
└─ Upload test results
```

**Artifacts:**
- Surefire test reports (7 days retention)

---

#### 5. Build Backend
**Duration:** ~5-7 minutes
**Dependencies:** Lint + Backend Tests

```bash
Steps:
├─ Setup pnpm + Node.js
├─ Install dependencies (frozen lockfile)
├─ Build backend
│  └─ pnpm run build
└─ Upload artifacts (3 days retention):
   ├─ apps/gateway-api/dist/
   ├─ apps/backend/dist/
   ├─ packages/*/dist/
   ├─ services/*/dist/
   ├─ package.json
   ├─ pnpm-lock.yaml
   └─ pnpm-workspace.yaml
```

---

#### 6. Build Frontend
**Duration:** ~5-7 minutes
**Dependencies:** Lint + Frontend Tests

```bash
Steps:
├─ Setup pnpm + Node.js
├─ Install dependencies
├─ Build frontend
│  └─ cd apps/customer-app && pnpm run build
└─ Upload artifacts (3 days retention):
   └─ apps/customer-app/build/
```

**Note:** Build may fail gracefully if frontend build script not configured

---

#### 7. Build MCP Service
**Duration:** ~5-7 minutes
**Dependencies:** MCP Tests

```bash
Steps:
├─ Setup Java 17 + Maven cache
├─ Build with Maven (skip tests - already ran)
│  └─ cd services/mcp-orchestrator && mvn clean package -DskipTests
└─ Upload JAR artifact (3 days retention):
   └─ services/mcp-orchestrator/target/*.jar
```

---

#### 8. Security Scan (PR Only)
**Duration:** ~2-3 minutes
**Trigger:** Pull requests only

```bash
Steps:
├─ Setup pnpm + Node.js
├─ Install dependencies
├─ Run npm audit
│  └─ pnpm audit --audit-level=high || true
├─ Setup Java for Maven
└─ Audit Maven dependencies
   └─ cd services/mcp-orchestrator && mvn dependency-check:check || true
```

**Note:** Non-blocking (continues on audit warnings)

---

#### 9. E2E Tests (Main Branch Only)
**Duration:** ~10-15 minutes
**Trigger:** Push to main only
**Dependencies:** All builds complete

```yaml
Services:
  postgres: postgres:16-alpine (5433:5432)
  redis: redis:7-alpine (6379:6379)
```

```bash
Steps:
├─ Setup full environment (PostgreSQL + Redis)
├─ Install dependencies
├─ Install Playwright browsers
│  └─ npx playwright install --with-deps
├─ Run E2E tests
│  └─ pnpm run test:e2e
└─ Upload test results (7 days retention):
   ├─ playwright-report/
   └─ test-results/
```

---

### CI Timing Summary

| Scenario | Duration | Jobs Running |
|----------|----------|--------------|
| **PR/Branch Push** | 15-20 minutes | Lint, Tests, Builds (parallel) |
| **Main Branch** | 25-35 minutes | All jobs + E2E tests |
| **Failing Fast** | 5-10 minutes | Early exit on lint/test failures |

### Concurrency Control

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

- Cancels in-progress runs when new commit pushed
- Saves CI minutes
- Faster feedback loop

---

## Continuous Deployment (CD)

### CD Workflows

| Environment | Workflow | Trigger | Strategy | Duration |
|------------|----------|---------|----------|----------|
| **Production** | `cd-production.yml` | Tag `v*.*.*` | Blue/Green | 30-45 min |
| **Staging** | `cd-staging.yml` | Push to develop | Rolling | 15-20 min |
| **AWS EC2** | `deploy.yml` | Post-CI success | Release-based | 12-15 min |

---

## Deploy to Production (Blue/Green)

**File:** `.github/workflows/cd-production.yml`

### Triggers

```yaml
on:
  push:
    tags:
      - 'v*.*.*'  # Semantic version tags only
  workflow_dispatch:
    inputs:
      version:
        required: true
        description: 'Version to deploy (e.g., v1.2.3)'
      skip_e2e:
        default: false
        description: 'Skip E2E tests'
```

### Concurrency

```yaml
concurrency:
  group: production-deployment
  cancel-in-progress: false  # Never cancel production deployments
```

---

### Job 1: Pre-flight Checks
**Duration:** ~1 minute

```bash
Steps:
├─ Extract version from tag or input
├─ Validate semantic version format (v\d+.\d+.\d+)
├─ Check if tag exists in git
└─ Verify required secrets:
   ├─ KUBE_CONFIG_PRODUCTION
   ├─ PROD_DATABASE_URL
   └─ DATADOG_API_KEY
```

**Output:** `version`, `should_deploy`

---

### Job 2: Build & Security Scan
**Duration:** ~15-25 minutes per service (parallel)
**Timeout:** 45 minutes

**Matrix Strategy:**
```yaml
services:
  - backend (apps/gateway-api/Dockerfile)
  - frontend (apps/customer-app/Dockerfile)
  - mcp (services/mcp-orchestrator/Dockerfile)
  - search (services/search-orchestrator/Dockerfile)
  - adapter (services/mcp-adapter/Dockerfile)
```

```bash
For each service:
├─ Build Docker image with Buildx
├─ Push to GitHub Container Registry (ghcr.io)
│  └─ Tags: {version}, latest
├─ Run Trivy security scan
│  ├─ Scan for CRITICAL + HIGH vulnerabilities
│  └─ Format: SARIF for GitHub Security
├─ Upload scan results to GitHub Security
└─ Fail if critical vulnerabilities found
```

**Registry:** `ghcr.io/{owner}/{repo}/{service}:{version}`

**Cache Strategy:**
```yaml
cache-from: type=registry,ref=.../{service}:cache
cache-to: type=registry,ref=.../{service}:cache,mode=max
```

---

### Job 3: Blue/Green Production Deploy
**Duration:** ~15-20 minutes
**Environment:** production (https://foodbot.app)
**Timeout:** 30 minutes

#### Steps:

**1. Create Green Environment**
```bash
├─ Configure kubectl
├─ Set up kubeconfig from secrets
├─ Create green namespace (if not exists)
├─ Deploy to green environment
│  └─ kubectl apply -f k8s/production/green/
└─ Update image versions:
   ├─ kubectl set image deployment/foodbot-backend backend=...:{version}
   ├─ kubectl set image deployment/foodbot-frontend frontend=...:{version}
   ├─ kubectl set image deployment/foodbot-mcp mcp=...:{version}
   ├─ kubectl set image deployment/foodbot-search search=...:{version}
   └─ kubectl set image deployment/foodbot-adapter adapter=...:{version}
```

**2. Wait for Rollout**
```bash
├─ kubectl rollout status deployment/foodbot-backend --timeout=10m
├─ kubectl rollout status deployment/foodbot-frontend --timeout=10m
├─ kubectl rollout status deployment/foodbot-mcp --timeout=10m
├─ kubectl rollout status deployment/foodbot-search --timeout=10m
└─ kubectl rollout status deployment/foodbot-adapter --timeout=10m
```

**3. Run Database Migrations (Dry-Run)**
```bash
└─ kubectl exec deployment/foodbot-backend -- npm run migration:dry-run
```

**4. Verify Green Environment**
```bash
├─ Port-forward to green environment
├─ Run health checks
│  └─ curl http://localhost:8080/api/v1/health
└─ Verify 200 response
```

**5. Smoke Tests on Green**
```bash
├─ Port-forward to green backend
├─ Test health endpoint
└─ Test menu API endpoint
```

**6. Switch Traffic (Blue → Green)**
```bash
├─ Update service selectors:
│  └─ kubectl patch service {service} -p '{"spec":{"selector":{"environment":"green"}}}'
├─ Switch all services:
│  ├─ foodbot-backend
│  ├─ foodbot-frontend
│  ├─ foodbot-mcp
│  ├─ foodbot-search
│  └─ foodbot-adapter
└─ Monitor for 2 minutes
```

**7. Verify Production Health**
```bash
└─ curl https://api.foodbot.app/api/v1/health
```

**8. Run Production Migrations**
```bash
└─ kubectl exec deployment/foodbot-backend -- npm run migration:run
```

**9. Scale Down Blue**
```bash
├─ kubectl scale deployment --all --replicas=0 -n foodbot-blue
└─ Label swap: green → blue, blue → green (for next deployment)
```

---

### Job 4: Production E2E Tests
**Duration:** ~10-15 minutes
**Trigger:** Only if skip_e2e = false

```bash
Steps:
├─ Install Playwright browsers (chromium only)
├─ Run E2E tests against production
│  └─ PLAYWRIGHT_BASE_URL=https://foodbot.app pnpm run test:e2e
└─ Upload E2E results (30 days retention)
```

---

### Job 5: Rollback (On Failure)
**Duration:** ~5-10 minutes
**Trigger:** If any job fails

```bash
Steps:
├─ Configure kubectl
├─ Switch traffic back to blue:
│  └─ kubectl patch service {service} -p '{"spec":{"selector":{"environment":"blue"}}}'
├─ Scale up blue environment
│  └─ kubectl scale deployment --all --replicas=3 -n foodbot-blue
├─ Wait 30 seconds
└─ Verify rollback health:
   └─ curl https://api.foodbot.app/api/v1/health
```

**Output:** Logs rollback success/failure

---

### Job 6: Post-deployment Tasks
**Duration:** ~1-2 minutes
**Trigger:** On success

```bash
Steps:
├─ Create GitHub Release
│  ├─ Tag: {version}
│  ├─ Release notes from CHANGELOG.md
│  └─ Deployment metadata
├─ Send Datadog deployment event
│  └─ POST https://api.datadoghq.com/api/v1/events
├─ Notify Slack (if webhook configured)
│  └─ Deployment success message
└─ Update status page (if configured)
   └─ POST incident resolution
```

---

## Deploy to Staging

**File:** `.github/workflows/cd-staging.yml`

### Triggers

```yaml
on:
  push:
    branches: [develop]
  workflow_dispatch:
    inputs:
      skip_tests: false
```

### Concurrency

```yaml
concurrency:
  group: staging-deployment
  cancel-in-progress: false
```

---

### Job 1: Build & Push Images
**Duration:** ~15-20 minutes

```bash
Steps:
├─ Generate staging tag:
│  └─ staging-YYYYMMDD-HHMMSS-{commit_sha:8}
├─ Build all Docker images in parallel:
│  ├─ Backend
│  ├─ Frontend
│  ├─ MCP Orchestrator
│  ├─ Search Orchestrator
│  └─ MCP Adapter
├─ Push to GitHub Container Registry
└─ Output: image_tag, image_digest
```

---

### Job 2: Deploy to Staging
**Duration:** ~5-10 minutes
**Environment:** staging (https://staging.foodbot.dev)

```bash
Steps:
├─ Configure kubectl for staging
├─ Update deployment images:
│  └─ kubectl set image deployment/{service} {container}={image}:{tag}
├─ Wait for rollout (5 minute timeout per service)
├─ Run database migrations
│  └─ kubectl exec deployment/foodbot-backend -- npm run migration:run
└─ All services deployed
```

---

### Job 3: Smoke Tests
**Duration:** ~2-3 minutes

```bash
Steps:
├─ Wait 30 seconds for stabilization
├─ Health check - Backend API
│  └─ curl https://staging-api.foodbot.dev/api/v1/health
├─ Health check - Frontend
│  └─ curl https://staging.foodbot.dev/
├─ Health check - MCP Orchestrator
│  └─ curl https://staging-mcp.foodbot.dev/actuator/health
├─ Smoke test - User authentication
│  ├─ Register test user
│  └─ Login test user
└─ Smoke test - Menu API
   └─ Verify menu items returned
```

---

### Job 4: Notify
**Duration:** ~10 seconds

```bash
└─ Send Slack notification with status
```

---

## Deploy to AWS EC2

**File:** `.github/workflows/deploy.yml`

### Triggers

```yaml
on:
  workflow_run:
    workflows: ['Continuous Integration']
    branches: [main]
    types: [completed]
  workflow_dispatch:
    inputs:
      environment: production|staging
      skip_health_check: false
```

---

### Job 1: Pre-flight Checks

```bash
Steps:
├─ Generate release ID: YYYYMMDD_HHMMSS_{commit_sha:8}
└─ Verify required secrets:
   ├─ EC2_HOST
   ├─ EC2_USER
   ├─ SSH_PRIVATE_KEY
   ├─ AWS_ACCESS_KEY_ID
   ├─ AWS_SECRET_ACCESS_KEY
   └─ AWS_REGION
```

---

### Job 2: Build Artifacts
**Duration:** ~10-15 minutes

```bash
Steps:
├─ Install dependencies (pnpm, maven)
├─ Build backend (pnpm run build)
├─ Build frontend (cd apps/customer-app && pnpm run build)
├─ Build MCP (cd services/mcp-orchestrator && mvn clean package -DskipTests)
├─ Prepare deployment package:
│  ├─ dist/backend
│  ├─ dist/frontend
│  ├─ mcp-jar/*.jar
│  ├─ package.json, pnpm-lock.yaml
│  ├─ scripts/
│  └─ RELEASE.json (metadata)
└─ Upload artifact: deploy-package-{release_id} (7 days)
```

---

### Job 3: Deploy to EC2
**Duration:** ~5-10 minutes
**Environment:** production or staging

```bash
Steps:
├─ Configure AWS credentials
├─ Download deployment package
├─ Setup SSH key
│  ├─ mkdir -p ~/.ssh
│  ├─ echo "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
│  ├─ chmod 600 ~/.ssh/deploy_key
│  └─ ssh-keyscan -H {EC2_HOST} >> ~/.ssh/known_hosts
├─ Create release directory on EC2
│  └─ ssh ... "mkdir -p /home/{user}/foodbot/releases/{release_id}"
├─ Copy package to EC2
│  └─ scp -r ./deploy-package/* {user}@{host}:{app_dir}/releases/{release_id}/
├─ Copy deployment scripts
│  └─ scp deploy.sh rollback.sh {user}@{host}:{app_dir}/
├─ Execute deployment
│  └─ ssh ... "export RELEASE_ID={release_id} && bash {app_dir}/deploy.sh"
├─ Post-deploy health checks:
│  ├─ Backend: curl http://localhost:3000/api/v1/health
│  ├─ Frontend: curl http://localhost:3001/
│  └─ MCP: curl http://localhost:8080/actuator/health
└─ Cleanup SSH key
```

---

### Job 4: Rollback (On Failure)

```bash
Steps:
├─ Setup SSH key
├─ Execute rollback script
│  └─ ssh ... "bash {app_dir}/rollback.sh"
├─ Verify rollback health
│  └─ curl http://localhost:3000/api/v1/health
└─ Cleanup SSH key
```

---

### Job 5: Cleanup Old Releases

```bash
Steps:
└─ Remove old releases (keep last 5):
   └─ ssh ... "cd {app_dir}/releases && ls -t | tail -n +6 | xargs -r rm -rf"
```

---

## Security Scanning

**File:** `.github/workflows/security-scan.yml`

### Triggers

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
```

### Permissions

```yaml
permissions:
  contents: read
  security-events: write
  pull-requests: write
```

---

### Job 1: Secret Scanning
**Duration:** ~3-5 minutes

```bash
Tools:
├─ TruffleHog (verified secrets only)
├─ GitLeaks (pattern-based scanning)
├─ Custom checks:
│  ├─ AWS credentials (AKIA[0-9A-Z]{16})
│  └─ Private keys (BEGIN.*PRIVATE KEY)
```

**Output:** Fails if secrets found

---

### Job 2: Dependency Vulnerabilities
**Duration:** ~5-10 minutes

```bash
Steps:
├─ Run npm audit
│  └─ pnpm audit --audit-level=moderate --json
├─ Snyk dependency scan (if token configured)
│  └─ snyk test --severity-threshold=high
├─ OWASP Dependency Check
│  └─ dependency-check --failOnCVSS 7
└─ Upload results:
   ├─ npm-audit.json
   ├─ snyk-report.json (SARIF)
   └─ dependency-check-report.html
```

---

### Job 3: Maven Security Scan
**Duration:** ~5-10 minutes

```bash
Steps:
└─ OWASP Dependency Check (Maven)
   └─ cd services/mcp-orchestrator
   └─ mvn org.owasp:dependency-check-maven:check -DfailBuildOnCVSS=7
```

---

### Job 4: SAST Analysis
**Duration:** ~10-15 minutes

```bash
Tools:
├─ CodeQL
│  ├─ Languages: javascript, typescript, java
│  └─ Queries: security-extended
├─ SonarQube (if configured)
│  └─ Project key: foodbot
└─ Semgrep
   ├─ Rulesets: security-audit, secrets, owasp-top-ten
   └─ Languages: nodejs, typescript, java
```

**Outputs:** SARIF files uploaded to GitHub Security tab

---

### Job 5: Container Image Scanning
**Duration:** ~10-15 minutes per service (parallel)
**Trigger:** Push or manual only

**Matrix:**
```yaml
services: [backend, frontend, mcp, search, adapter]
```

```bash
For each service:
├─ Build image for scanning
├─ Run Trivy vulnerability scanner
│  ├─ Severity: CRITICAL, HIGH, MEDIUM
│  ├─ Types: os, library
│  └─ Scanners: vuln, secret, config
├─ Upload to GitHub Security (SARIF)
├─ Run Grype vulnerability scanner
│  └─ Severity cutoff: high
└─ Docker Scout CVE scan (if token configured)
```

---

### Job 6: License Compliance
**Duration:** ~2-3 minutes

```bash
Steps:
├─ Generate license report
│  └─ npx license-checker --production --json
├─ Check for forbidden licenses:
│  └─ Forbidden: GPL, AGPL, SSPL, CC-BY-NC
└─ Upload license report (30 days)
```

---

### Job 7: Infrastructure as Code Scan
**Duration:** ~3-5 minutes

```bash
Tools:
├─ Checkov
│  ├─ Frameworks: kubernetes, dockerfile, github_actions
│  └─ Output: SARIF
└─ Terrascan
   ├─ IaC type: k8s
   └─ Directory: k8s/
```

---

### Job 8: Security Report
**Duration:** ~1 minute
**Trigger:** Always runs

```bash
Steps:
├─ Download all security artifacts
├─ Generate summary to GitHub Step Summary
├─ Create GitHub issue if critical findings
│  └─ Labels: security, critical, automated
└─ Notify security team via Slack (if failures)
```

---

## Dependency Updates

**File:** `.github/workflows/dependency-update.yml`

### Triggers

```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:
```

---

### Job 1: Update Node.js Dependencies
**Duration:** ~10-15 minutes

```bash
Steps:
├─ Check for outdated packages
│  └─ pnpm outdated --format json
├─ Update non-breaking dependencies
│  └─ pnpm update --latest --recursive
├─ Run tests
│  ├─ pnpm run lint
│  └─ pnpm run test:unit
├─ Security audit
│  └─ pnpm audit --audit-level=moderate
└─ Create Pull Request
   ├─ Branch: chore/update-node-dependencies
   ├─ Labels: dependencies, automated, javascript
   └─ Assignee: workflow trigger actor
```

---

### Job 2: Update Maven Dependencies
**Duration:** ~10-15 minutes

```bash
Steps:
├─ Check for Maven updates
│  └─ mvn versions:display-dependency-updates
├─ Update dependencies
│  └─ mvn versions:use-latest-releases -DallowMajorUpdates=false
├─ Run tests
│  └─ mvn test
└─ Create Pull Request
   ├─ Branch: chore/update-maven-dependencies
   └─ Labels: dependencies, automated, java
```

---

### Job 3: Update GitHub Actions
**Duration:** ~5 minutes

```bash
Steps:
├─ Find workflow files
│  └─ find .github/workflows -name "*.yml"
├─ Update action versions
│  ├─ actions/checkout@v3 → v4
│  ├─ actions/setup-node@v3 → v4
│  ├─ actions/setup-java@v3 → v4
│  └─ docker/build-push-action@v4 → v5
└─ Create Pull Request
   ├─ Branch: chore/update-github-actions
   └─ Labels: dependencies, automated, ci/cd
```

---

### Job 4: Dependabot Auto-merge
**Duration:** ~1 minute
**Trigger:** When Dependabot creates PR

```bash
Steps:
├─ Fetch Dependabot metadata
└─ Auto-merge if:
   ├─ Update type: patch or minor
   └─ Merge method: squash
```

---

### Job 5: Summary Report

```bash
Steps:
├─ Generate summary
└─ Notify on failures
```

---

## Deployment Scripts

### deploy.sh

**Location:** `/scripts/deploy.sh`

```bash
Features:
├─ Creates timestamped releases
├─ Extracts deployment package
├─ Stops services (systemd)
├─ Installs dependencies (npm ci --production)
├─ Updates symlink to new release
├─ Runs database migrations
├─ Starts services
├─ Health checks (backend, frontend, MCP)
├─ Cleans up old releases (keeps last 5)
└─ Colored output for visibility
```

**Services Managed:**
- `foodbot-backend.service`
- `foodbot-frontend.service`
- `foodbot-mcp.service`

**Deployment Flow:**
```
/home/ubuntu/foodbot/
├─ releases/
│  ├─ 20260220_143022/
│  ├─ 20260219_120000/
│  └─ ...
├─ current -> releases/20260220_143022/deploy-package
└─ scripts/
```

---

### production-deploy.sh

**Location:** `/scripts/production-deploy.sh`

```bash
Comprehensive Production Script:

Pre-deployment:
├─ Check prerequisites (git, docker, node, npm, pnpm)
├─ Create database backup (pg_dump)
├─ Backup environment files (.env)
├─ Backup uploaded files (if any)
└─ Cleanup old backups (keep last 5)

Deployment:
├─ Pull latest code from git
├─ Install dependencies (pnpm install --frozen-lockfile)
├─ Build all applications:
│  ├─ Gateway API
│  ├─ Customer App
│  └─ Chrome Extension
├─ Run database migrations (pnpm migration:run)
└─ Deploy based on strategy:
   ├─ Blue-Green (docker-compose swap)
   ├─ Rolling (scale up, scale down)
   └─ Standard (down, up)

Post-deployment:
├─ Run smoke tests:
│  ├─ Health endpoint
│  ├─ API authentication
│  └─ Database connectivity
└─ Send notifications (Slack, Email)

Rollback capability:
├─ Restore database from backup
├─ Restore configuration
└─ Restart services
```

**Environment Variables:**
```bash
ENVIRONMENT=production          # Deployment environment
DEPLOY_STRATEGY=standard        # standard|rolling|blue-green
DEPLOY_TARGET=main             # Git branch/tag
APP_DIR=/opt/foodbot           # Application directory
BACKUP_DIR=/opt/foodbot/backups # Backup directory
SLACK_WEBHOOK_URL=...          # Notifications
```

**Usage:**
```bash
# Standard deployment
./scripts/production-deploy.sh

# Blue-green deployment
DEPLOY_STRATEGY=blue-green ./scripts/production-deploy.sh

# Rollback
./scripts/production-deploy.sh rollback

# Smoke tests only
./scripts/production-deploy.sh smoke-tests
```

---

### rollback.sh

**Location:** `/scripts/rollback.sh`

```bash
Steps:
├─ Identify previous release (2nd most recent)
├─ Stop all services
├─ Revert symlink to previous release
├─ Start services
├─ Wait 10 seconds
└─ Verify rollback:
   ├─ Backend health
   ├─ Frontend health
   └─ MCP health
```

**Automatic Execution:**
- Triggered on deployment failure
- Called from GitHub Actions rollback job

---

## Troubleshooting

### Common Issues

#### 1. CI Failing on Lint

**Symptom:** ESLint or Prettier errors

**Solution:**
```bash
# Run locally
pnpm run lint
pnpm run format:check

# Auto-fix
pnpm run lint:fix
pnpm run format

# Commit fixes
git add .
git commit -m "fix: resolve linting issues"
git push
```

---

#### 2. Backend Tests Failing

**Symptom:** Database connection errors

**Solution:**
```bash
# Check local PostgreSQL
docker ps | grep postgres

# Run tests locally with same CI environment
export NODE_ENV=test
export DB_HOST=localhost
export DB_PORT=5433
pnpm run test:unit

# Check test database
docker exec -it {postgres_container} psql -U postgres -d foodbot_test
```

---

#### 3. Build Artifacts Missing

**Symptom:** Deploy job can't find build outputs

**Solution:**
```bash
# Verify build job completed
# Check GitHub Actions → CI workflow → Build jobs

# Download artifacts locally
gh run download {run_id}

# Check artifact retention (default 3-7 days)
# Re-run failed job if artifacts expired
```

---

#### 4. Deployment Health Check Fails

**Symptom:** Health endpoints return 500 or timeout

**Solution:**
```bash
# SSH to EC2
ssh -i key.pem ubuntu@{EC2_HOST}

# Check service status
sudo systemctl status foodbot-backend

# Check logs
sudo journalctl -u foodbot-backend -n 100 --no-pager

# Check if ports are bound
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000

# Manual restart
sudo systemctl restart foodbot-backend

# Check database connection
cd /home/ubuntu/foodbot/current/backend
npm run migration:show
```

---

#### 5. Blue/Green Deployment Stuck

**Symptom:** Green environment not becoming healthy

**Solution:**
```bash
# Check Kubernetes pods
kubectl get pods -n foodbot-green

# Check pod logs
kubectl logs -n foodbot-green deployment/foodbot-backend

# Describe pod for events
kubectl describe pod -n foodbot-green {pod-name}

# Check service endpoints
kubectl get endpoints -n foodbot-green

# Manual rollback
kubectl patch service foodbot-backend -n foodbot-production \
  -p '{"spec":{"selector":{"environment":"blue"}}}'
```

---

#### 6. Security Scan Blocking PR

**Symptom:** Vulnerabilities detected

**Solution:**
```bash
# Check security tab
# Repository → Security → Dependabot alerts

# Update vulnerable package
pnpm update {package-name}

# Or upgrade to specific version
pnpm add {package-name}@{safe-version}

# For Maven
cd services/mcp-orchestrator
mvn versions:use-latest-releases

# Commit and push
git commit -m "fix: update vulnerable dependencies"
```

---

#### 7. Docker Image Build Fails

**Symptom:** Buildx errors or timeout

**Solution:**
```bash
# Test build locally
docker build -f apps/gateway-api/Dockerfile -t test .

# Check Dockerfile syntax
docker build --dry-run -f {dockerfile} .

# Clean Docker cache
docker builder prune -f

# Check disk space on runner
df -h
```

---

#### 8. Rollback Script Fails

**Symptom:** No previous release found

**Solution:**
```bash
# Check releases directory
ls -lt /home/ubuntu/foodbot/releases/

# If only one release exists, restore from backup
cd /home/ubuntu/foodbot/backups
ls -lt
# Latest backup directory

# Restore database
docker exec -i foodbot-postgres psql -U postgres -d foodbot < {backup}/database.sql

# Copy configuration
cp {backup}/.env /home/ubuntu/foodbot/.env

# Restart services
sudo systemctl restart foodbot-*
```

---

## Best Practices

### 1. Semantic Versioning

```bash
# Production releases
git tag v1.2.3
git push origin v1.2.3

# Tag format triggers production deployment
v{major}.{minor}.{patch}

# Pre-releases
git tag v1.3.0-rc.1
git tag v1.3.0-beta.2
```

---

### 2. Branch Strategy

```
main (production-ready)
  ├─ Protected branch
  ├─ Requires PR approval
  └─ Triggers production deployment on tag

develop (staging)
  ├─ Integration branch
  ├─ Triggers staging deployment
  └─ Auto-deploys on merge

feature/* (development)
  ├─ Feature branches
  └─ Run CI only
```

---

### 3. Secret Management

```bash
# Required GitHub Secrets

# AWS Deployment
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
EC2_HOST
EC2_USER
SSH_PRIVATE_KEY

# Kubernetes
KUBE_CONFIG_PRODUCTION
KUBE_CONFIG_STAGING

# Database
PROD_DATABASE_URL
STAGING_DATABASE_URL

# External Services
DATADOG_API_KEY
SLACK_WEBHOOK_URL
SECURITY_SLACK_WEBHOOK
CODECOV_TOKEN
SNYK_TOKEN
SONAR_TOKEN

# Application
JWT_SECRET
JWT_REFRESH_SECRET
REACT_APP_API_URL
PRODUCTION_DOMAIN
```

---

### 4. Monitoring Deployments

```bash
# GitHub Actions
# Repository → Actions → Select workflow run

# Real-time logs
gh run watch {run_id}

# Download logs
gh run download {run_id}

# EC2 Monitoring
ssh ubuntu@{EC2_HOST}

# Watch logs in real-time
sudo journalctl -u foodbot-backend -f

# Check service status
sudo systemctl status foodbot-*

# Kubernetes Monitoring
kubectl get pods -n foodbot-production -w

# Logs
kubectl logs -f deployment/foodbot-backend -n foodbot-production

# Events
kubectl get events -n foodbot-production --sort-by='.lastTimestamp'
```

---

### 5. Performance Optimization

#### Cache Strategy
```yaml
# Node modules cache
- uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

# Maven cache
- uses: actions/cache@v4
  with:
    path: ~/.m2/repository
    key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
```

#### Parallel Execution
```yaml
strategy:
  matrix:
    service: [backend, frontend, mcp, search, adapter]
  max-parallel: 5
```

#### Timeout Control
```yaml
timeout-minutes: 30  # Prevents hanging jobs
```

---

### 6. Database Migration Safety

```bash
# Always run dry-run first
npm run migration:dry-run

# Check migration history
npm run migration:show

# Create reversible migrations
# - Always include down() method
# - Test rollback locally

# Backup before migrations
pg_dump -U postgres foodbot > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations in transaction
# - Ensures atomic operations
# - Auto-rollback on error
```

---

### 7. Health Check Best Practices

```typescript
// Health check endpoint
@Get('/health')
async health(): Promise<HealthResponse> {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    checks: {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: this.checkMemory(),
    },
  };
}
```

---

## Metrics & Monitoring

### DORA Metrics

Track these in GitHub Actions:

1. **Deployment Frequency**
   - Target: Multiple times per day
   - Tracked: `cd-production.yml` runs

2. **Lead Time for Changes**
   - Target: < 1 hour
   - Measured: Commit to production

3. **Change Failure Rate**
   - Target: < 15%
   - Tracked: Rollback frequency

4. **Mean Time to Recovery (MTTR)**
   - Target: < 1 hour
   - Measured: Failure to rollback complete

---

## Future Enhancements

### Planned Features

- [ ] **Multi-region deployment** - Deploy to multiple AWS regions
- [ ] **Canary releases** - Gradual traffic shifting (5% → 50% → 100%)
- [ ] **Feature flags** - LaunchDarkly integration
- [ ] **Performance testing** - Lighthouse CI for frontend
- [ ] **Load testing** - k6 integration in CI
- [ ] **Database backup verification** - Test restore process
- [ ] **Chaos engineering** - Chaos Mesh for resilience testing
- [ ] **Cost tracking** - AWS cost alerts per deployment

### Implemented Features

✅ Blue/green deployment (production)
✅ Rolling updates (staging)
✅ Automated rollback
✅ Security scanning (comprehensive)
✅ E2E testing (Playwright)
✅ Dependency updates (automated)
✅ Multi-service support
✅ Docker container deployment
✅ Kubernetes orchestration

---

## Support & Resources

### Documentation

- [Development Guardrails](/Users/arpan1.mukherjee/code/FoodBot/.claude/rules/development-guardrails.md)
- [Architecture Guide](/Users/arpan1.mukherjee/code/FoodBot/docs/guide/ARCHITECTURE.md)
- [Security Guide](/Users/arpan1.mukherjee/code/FoodBot/docs/guide/SECURITY.md)

### Workflow Files

- CI: `.github/workflows/ci.yml`
- Production CD: `.github/workflows/cd-production.yml`
- Staging CD: `.github/workflows/cd-staging.yml`
- Security: `.github/workflows/security-scan.yml`
- AWS Deploy: `.github/workflows/deploy.yml`
- Dependencies: `.github/workflows/dependency-update.yml`

### Scripts

- Deploy: `/scripts/deploy.sh`
- Production Deploy: `/scripts/production-deploy.sh`
- Rollback: `/scripts/rollback.sh`
- Health Check: `/scripts/health-check.sh`

### Getting Help

1. Check GitHub Actions logs
2. Review EC2/K8s logs
3. Check security scan results
4. Review this guide
5. Contact DevOps team

---

**Last Updated:** 2026-02-20
**Version:** 2.0.0
**Maintained By:** DevOps Team

**Changelog:**
- **v2.0.0** (2026-02-20): Complete rewrite with actual implementation details
- **v1.0.0** (2026-02-19): Initial version

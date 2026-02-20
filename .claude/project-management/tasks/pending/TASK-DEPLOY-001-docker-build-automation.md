# TASK-DEPLOY-001: Docker Build Automation Script

**Status:** Pending
**Priority:** High
**Assignee:** DevOps Team
**Estimated Effort:** 4 hours
**Created:** 2026-02-20

---

## Objective

Create automated Docker build scripts for all FoodBot services with support for multi-platform builds, caching, and registry management.

---

## Requirements

### Functional Requirements

1. **Build Script (`/scripts/docker-build.sh`)**
   - Build all service images in correct order
   - Support custom registry and image tags
   - Multi-platform builds (linux/amd64, linux/arm64)
   - BuildKit caching for faster builds
   - Parallel builds where possible
   - Build validation and health checks
   - Error handling and rollback

2. **Push Script (`/scripts/docker-push.sh`)**
   - Push all images to specified registry (ECR, Docker Hub)
   - Support for multiple registries
   - Authentication handling
   - Push validation
   - Retry logic for failures

3. **Supported Services**
   - Gateway API (Node.js)
   - MCP Orchestrator (Java/Spring Boot)
   - Search Orchestrator (Java)
   - MCP Adapter (Node.js)
   - Notification Service (Node.js)
   - Temporal Workers (Node.js)
   - Customer App (React/Nginx)
   - Restaurant App (React/Nginx)

### Technical Requirements

```bash
# Environment variables
DOCKER_REGISTRY=${DOCKER_REGISTRY:-docker.io/foodbot}
IMAGE_TAG=${IMAGE_TAG:-latest}
DOCKER_BUILDKIT=${DOCKER_BUILDKIT:-1}
PLATFORMS=${PLATFORMS:-linux/amd64}
CACHE_FROM=${CACHE_FROM:-}
CACHE_TO=${CACHE_TO:-}

# Features
- BuildKit enabled
- Layer caching
- Multi-stage builds
- Build arguments support
- Health check validation
- Image scanning (Trivy)
- Size optimization checks
```

---

## Implementation Details

### Script Structure

```bash
scripts/
├── docker-build.sh          # Main build script
├── docker-push.sh           # Push to registry
├── docker-build-service.sh  # Build single service
├── docker-validate.sh       # Validate built images
└── docker-scan.sh           # Security scanning
```

### Build Process

```yaml
1. Pre-build:
   - Validate Dockerfiles
   - Check prerequisites (Docker, BuildKit)
   - Set up build context

2. Build:
   - Build base images
   - Build service images in parallel
   - Apply cache layers
   - Tag images properly

3. Post-build:
   - Run health checks
   - Scan for vulnerabilities
   - Generate SBOM (Software Bill of Materials)
   - Push to registry

4. Cleanup:
   - Remove dangling images
   - Prune build cache
   - Report build metrics
```

---

## Acceptance Criteria

- [ ] Build script builds all services successfully
- [ ] Supports custom registry and tags via environment variables
- [ ] Multi-platform builds work (amd64, arm64)
- [ ] Caching reduces build time by >50%
- [ ] Push script authenticates and pushes to ECR
- [ ] Security scanning integrated (Trivy)
- [ ] Build fails on high/critical vulnerabilities
- [ ] Build time reported and logged
- [ ] Parallel builds reduce total build time
- [ ] Error handling with clear messages
- [ ] Documentation updated

---

## Testing

```bash
# Test local build
./scripts/docker-build.sh

# Test with custom tag
IMAGE_TAG=v1.0.0 ./scripts/docker-build.sh

# Test multi-platform
PLATFORMS=linux/amd64,linux/arm64 ./scripts/docker-build.sh

# Test ECR push
DOCKER_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com/foodbot ./scripts/docker-push.sh

# Test validation
./scripts/docker-validate.sh

# Test security scanning
./scripts/docker-scan.sh
```

---

## Dependencies

- Docker 24+
- BuildKit enabled
- Trivy security scanner
- AWS CLI (for ECR)
- jq (for JSON parsing)

---

## Deliverables

- [ ] `/scripts/docker-build.sh` - Main build script
- [ ] `/scripts/docker-push.sh` - Push script
- [ ] `/scripts/docker-build-service.sh` - Single service builder
- [ ] `/scripts/docker-validate.sh` - Image validation
- [ ] `/scripts/docker-scan.sh` - Security scanning
- [ ] `/scripts/README.md` - Scripts documentation
- [ ] CI/CD integration examples

---

## Related Tasks

- TASK-DEPLOY-002: Kubernetes Deployment Automation
- TASK-DEPLOY-003: Helm Chart Development
- TASK-CI-001: GitHub Actions CI/CD Pipeline

---

**Created By:** DevOps Lead
**Last Updated:** 2026-02-20

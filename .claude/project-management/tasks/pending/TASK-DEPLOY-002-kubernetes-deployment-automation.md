# TASK-DEPLOY-002: Kubernetes Deployment Automation

**Status:** Pending
**Priority:** High
**Assignee:** DevOps Team
**Estimated Effort:** 8 hours
**Created:** 2026-02-20

---

## Objective

Create automated Kubernetes deployment scripts and manifests for deploying FoodBot to production EKS cluster with zero-downtime deployments.

---

## Requirements

### Functional Requirements

1. **Deployment Script (`/scripts/k8s-deploy.sh`)**
   - Deploy all services in correct dependency order
   - Support for different environments (dev, staging, prod)
   - Dry-run capability
   - Rollout status monitoring
   - Automatic rollback on failure
   - Health check validation
   - Post-deployment smoke tests

2. **Kubernetes Manifests (`/k8s/`)**
   - Deployments with proper resource limits
   - Services (ClusterIP, LoadBalancer)
   - ConfigMaps and Secrets
   - HorizontalPodAutoscaler (HPA)
   - PersistentVolumeClaims (if needed)
   - Ingress with TLS
   - NetworkPolicies
   - ServiceAccounts and RBAC

3. **Service Deployment Order**
   ```
   1. Namespace and RBAC
   2. ConfigMaps and Secrets
   3. StatefulSets (if self-hosted data services)
   4. Temporal Server
   5. Gateway API
   6. MCP Orchestrator
   7. Temporal Workers
   8. Notification Service
   9. Frontend Applications
   10. Ingress
   ```

### Technical Requirements

```yaml
environments:
  development:
    context: docker-desktop
    namespace: foodbot-dev
    replicas: 1
    resources: minimal

  staging:
    context: staging-cluster
    namespace: foodbot-staging
    replicas: 2
    resources: medium

  production:
    context: production-cluster
    namespace: foodbot-apps
    replicas: 3
    resources: production

features:
  - Rolling updates (maxSurge: 1, maxUnavailable: 0)
  - Health checks (liveness, readiness, startup)
  - Auto-scaling (HPA with CPU, memory, custom metrics)
  - Anti-affinity rules
  - Resource quotas
  - Network policies
  - Pod security policies
```

---

## Implementation Details

### Directory Structure

```
k8s/
├── base/
│   ├── namespace.yaml
│   └── rbac.yaml
├── configmaps/
│   ├── gateway-api-config.yaml
│   └── mcp-orchestrator-config.yaml
├── secrets/
│   ├── postgres-credentials.yaml.template
│   ├── jwt-secrets.yaml.template
│   └── llm-api-keys.yaml.template
├── deployments/
│   ├── gateway-api.yaml
│   ├── mcp-orchestrator.yaml
│   ├── temporal-server.yaml
│   ├── temporal-workers.yaml
│   ├── notification-service.yaml
│   ├── customer-app.yaml
│   └── restaurant-app.yaml
├── services/
│   ├── gateway-api-service.yaml
│   ├── mcp-orchestrator-service.yaml
│   └── temporal-server-service.yaml
├── hpa/
│   ├── gateway-api-hpa.yaml
│   └── mcp-orchestrator-hpa.yaml
├── ingress/
│   └── foodbot-ingress.yaml
└── network-policies/
    └── default-deny.yaml
```

### Deployment Process

```yaml
1. Pre-deployment:
   - Validate cluster connectivity
   - Check namespace existence
   - Verify secrets are created
   - Run migration jobs
   - Backup current deployments

2. Deployment:
   - Apply ConfigMaps and Secrets
   - Deploy services in dependency order
   - Wait for each rollout to complete
   - Verify health checks pass

3. Post-deployment:
   - Run smoke tests
   - Verify all pods are running
   - Check service endpoints
   - Monitor error rates
   - Update DNS if needed

4. Rollback (if failure):
   - Revert to previous version
   - Check database state
   - Notify team
   - Create incident report
```

---

## Acceptance Criteria

- [ ] Deployment script deploys all services successfully
- [ ] Supports environment selection (dev, staging, prod)
- [ ] Dry-run mode works correctly
- [ ] Rollout monitoring with timeout
- [ ] Automatic rollback on deployment failure
- [ ] Health checks validate service readiness
- [ ] HPA scales pods based on metrics
- [ ] Ingress configured with TLS
- [ ] Network policies enforce security
- [ ] RBAC configured correctly
- [ ] Documentation complete

---

## Testing

```bash
# Dry run
DRY_RUN=true ./scripts/k8s-deploy.sh

# Deploy to development
ENVIRONMENT=development ./scripts/k8s-deploy.sh

# Deploy specific service
SERVICE=gateway-api ./scripts/k8s-deploy.sh

# Deploy to production with specific version
ENVIRONMENT=production IMAGE_TAG=v1.2.0 ./scripts/k8s-deploy.sh

# Check deployment status
kubectl get pods -n foodbot-apps
kubectl get svc -n foodbot-apps
kubectl get ing -n foodbot-apps

# View rollout status
kubectl rollout status deployment/gateway-api -n foodbot-apps

# Test HPA
kubectl get hpa -n foodbot-apps
kubectl top pods -n foodbot-apps
```

---

## Dependencies

- kubectl configured with cluster access
- AWS CLI (for EKS)
- eksctl (optional, for cluster management)
- helm (if using Helm charts)
- jq (for JSON parsing)

---

## Deliverables

- [ ] `/scripts/k8s-deploy.sh` - Main deployment script
- [ ] `/scripts/k8s-rollback.sh` - Rollback script
- [ ] `/scripts/k8s-status.sh` - Status checker
- [ ] `/k8s/` - Complete Kubernetes manifests
- [ ] `/k8s/README.md` - Manifest documentation
- [ ] CI/CD pipeline integration
- [ ] Runbook for troubleshooting

---

## Related Tasks

- TASK-DEPLOY-001: Docker Build Automation
- TASK-DEPLOY-003: Helm Chart Development
- TASK-INFRA-001: EKS Cluster Setup

---

**Created By:** DevOps Lead
**Last Updated:** 2026-02-20

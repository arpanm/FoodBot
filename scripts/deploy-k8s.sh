#!/bin/bash
# =============================================================================
# FoodBot - Kubernetes Deployment Script
# =============================================================================
# Zero-downtime rolling deployment to Kubernetes cluster
# Supports staging and production environments
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-staging}"
VERSION="${2:-latest}"
NAMESPACE="foodbot-${ENVIRONMENT}"
REGISTRY="${DOCKER_REGISTRY:-ghcr.io/foodbot}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

echo -e "${GREEN}=== FoodBot Kubernetes Deployment ===${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"
echo -e "${YELLOW}Namespace: $NAMESPACE${NC}"

# Check kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check cluster connectivity
echo -e "${YELLOW}Checking cluster connectivity...${NC}"
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi
echo -e "${GREEN}Cluster connected${NC}"

# Create namespace if not exists
echo -e "${YELLOW}Ensuring namespace exists...${NC}"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Deploy ConfigMaps and Secrets
echo -e "${YELLOW}Deploying ConfigMaps and Secrets...${NC}"
kubectl apply -f k8s/${ENVIRONMENT}/configmap.yaml -n "$NAMESPACE"
kubectl apply -f k8s/${ENVIRONMENT}/secrets.yaml -n "$NAMESPACE" 2>/dev/null || echo "Secrets already exist"

# Deploy backend service
echo -e "${YELLOW}Deploying backend service...${NC}"
kubectl set image deployment/foodbot-backend \
    backend=${REGISTRY}/backend:${VERSION} \
    -n "$NAMESPACE" \
    --record

echo -e "${YELLOW}Waiting for backend rollout...${NC}"
kubectl rollout status deployment/foodbot-backend -n "$NAMESPACE" --timeout=5m

# Deploy frontend service
echo -e "${YELLOW}Deploying frontend service...${NC}"
kubectl set image deployment/foodbot-frontend \
    frontend=${REGISTRY}/frontend:${VERSION} \
    -n "$NAMESPACE" \
    --record

echo -e "${YELLOW}Waiting for frontend rollout...${NC}"
kubectl rollout status deployment/foodbot-frontend -n "$NAMESPACE" --timeout=5m

# Deploy MCP orchestrator
echo -e "${YELLOW}Deploying MCP orchestrator...${NC}"
kubectl set image deployment/foodbot-mcp \
    mcp=${REGISTRY}/mcp:${VERSION} \
    -n "$NAMESPACE" \
    --record

echo -e "${YELLOW}Waiting for MCP rollout...${NC}"
kubectl rollout status deployment/foodbot-mcp -n "$NAMESPACE" --timeout=5m

# Deploy search orchestrator
echo -e "${YELLOW}Deploying search orchestrator...${NC}"
kubectl set image deployment/foodbot-search \
    search=${REGISTRY}/search:${VERSION} \
    -n "$NAMESPACE" \
    --record

echo -e "${YELLOW}Waiting for search rollout...${NC}"
kubectl rollout status deployment/foodbot-search -n "$NAMESPACE" --timeout=5m

# Deploy MCP adapter
echo -e "${YELLOW}Deploying MCP adapter...${NC}"
kubectl set image deployment/foodbot-adapter \
    adapter=${REGISTRY}/adapter:${VERSION} \
    -n "$NAMESPACE" \
    --record

echo -e "${YELLOW}Waiting for adapter rollout...${NC}"
kubectl rollout status deployment/foodbot-adapter -n "$NAMESPACE" --timeout=5m

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
POD=$(kubectl get pod -n "$NAMESPACE" -l app=foodbot-backend -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n "$NAMESPACE" "$POD" -- npm run migration:run || echo "Migration may have failed, check logs"

# Health checks
echo -e "${YELLOW}Running health checks...${NC}"
sleep 15

# Backend health check
BACKEND_POD=$(kubectl get pod -n "$NAMESPACE" -l app=foodbot-backend -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- curl -f http://localhost:3000/api/v1/health || {
    echo -e "${RED}Backend health check failed${NC}"
    exit 1
}
echo -e "${GREEN}Backend is healthy${NC}"

# MCP health check
MCP_POD=$(kubectl get pod -n "$NAMESPACE" -l app=foodbot-mcp -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n "$NAMESPACE" "$MCP_POD" -- curl -f http://localhost:8080/actuator/health || {
    echo -e "${RED}MCP health check failed${NC}"
    exit 1
}
echo -e "${GREEN}MCP orchestrator is healthy${NC}"

# Get service URLs
echo -e "${GREEN}=== Deployment Successful ===${NC}"
echo -e "${YELLOW}Service URLs:${NC}"

BACKEND_URL=$(kubectl get svc foodbot-backend -n "$NAMESPACE" -o jsonpath="{.status.loadBalancer.ingress[0].hostname}" 2>/dev/null || echo "Not exposed")
FRONTEND_URL=$(kubectl get svc foodbot-frontend -n "$NAMESPACE" -o jsonpath="{.status.loadBalancer.ingress[0].hostname}" 2>/dev/null || echo "Not exposed")

echo -e "Backend: http://${BACKEND_URL}:3000"
echo -e "Frontend: http://${FRONTEND_URL}:3001"

# Display pod status
echo -e "${YELLOW}Pod Status:${NC}"
kubectl get pods -n "$NAMESPACE"

# Display deployment info
echo -e "${YELLOW}Deployment Info:${NC}"
echo "Version: $VERSION"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Deployed by: ${USER:-unknown}"

echo -e "${GREEN}Deployment complete!${NC}"

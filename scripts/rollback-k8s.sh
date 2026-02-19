#!/bin/bash
# =============================================================================
# FoodBot - Kubernetes Rollback Script
# =============================================================================
# Rollback to previous deployment version
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
NAMESPACE="foodbot-${ENVIRONMENT}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

echo -e "${RED}=== FoodBot Kubernetes Rollback ===${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Namespace: $NAMESPACE${NC}"

# Confirm rollback
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${RED}WARNING: Rolling back PRODUCTION environment!${NC}"
    read -p "Are you sure? (yes/no): " confirmation
    if [[ "$confirmation" != "yes" ]]; then
        echo "Rollback cancelled"
        exit 0
    fi
fi

# Check kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Rollback backend
echo -e "${YELLOW}Rolling back backend...${NC}"
kubectl rollout undo deployment/foodbot-backend -n "$NAMESPACE"
kubectl rollout status deployment/foodbot-backend -n "$NAMESPACE" --timeout=5m

# Rollback frontend
echo -e "${YELLOW}Rolling back frontend...${NC}"
kubectl rollout undo deployment/foodbot-frontend -n "$NAMESPACE"
kubectl rollout status deployment/foodbot-frontend -n "$NAMESPACE" --timeout=5m

# Rollback MCP orchestrator
echo -e "${YELLOW}Rolling back MCP orchestrator...${NC}"
kubectl rollout undo deployment/foodbot-mcp -n "$NAMESPACE"
kubectl rollout status deployment/foodbot-mcp -n "$NAMESPACE" --timeout=5m

# Rollback search orchestrator
echo -e "${YELLOW}Rolling back search orchestrator...${NC}"
kubectl rollout undo deployment/foodbot-search -n "$NAMESPACE"
kubectl rollout status deployment/foodbot-search -n "$NAMESPACE" --timeout=5m

# Rollback MCP adapter
echo -e "${YELLOW}Rolling back MCP adapter...${NC}"
kubectl rollout undo deployment/foodbot-adapter -n "$NAMESPACE"
kubectl rollout status deployment/foodbot-adapter -n "$NAMESPACE" --timeout=5m

# Verify rollback
echo -e "${YELLOW}Verifying rollback...${NC}"
sleep 10

# Backend health check
BACKEND_POD=$(kubectl get pod -n "$NAMESPACE" -l app=foodbot-backend -o jsonpath="{.items[0].metadata.name}")
if kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- curl -f http://localhost:3000/api/v1/health; then
    echo -e "${GREEN}Backend is healthy after rollback${NC}"
else
    echo -e "${RED}Backend health check failed after rollback${NC}"
    exit 1
fi

# MCP health check
MCP_POD=$(kubectl get pod -n "$NAMESPACE" -l app=foodbot-mcp -o jsonpath="{.items[0].metadata.name}")
if kubectl exec -n "$NAMESPACE" "$MCP_POD" -- curl -f http://localhost:8080/actuator/health; then
    echo -e "${GREEN}MCP orchestrator is healthy after rollback${NC}"
else
    echo -e "${RED}MCP health check failed after rollback${NC}"
    exit 1
fi

# Display pod status
echo -e "${YELLOW}Current Pod Status:${NC}"
kubectl get pods -n "$NAMESPACE"

# Display deployment history
echo -e "${YELLOW}Deployment History:${NC}"
kubectl rollout history deployment/foodbot-backend -n "$NAMESPACE" | tail -5

echo -e "${GREEN}=== Rollback Successful ===${NC}"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

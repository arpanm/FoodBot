#!/bin/bash

# ============================================
# Kubernetes Deployment Script
# Deploys FoodBot to Kubernetes cluster
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE=${K8S_NAMESPACE:-"foodbot"}
CONTEXT=${K8S_CONTEXT:-""}
DRY_RUN=${DRY_RUN:-"false"}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FoodBot Kubernetes Deployment${NC}"
echo -e "${GREEN}Namespace: ${NAMESPACE}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Set context if provided
if [ -n "$CONTEXT" ]; then
    echo -e "${BLUE}Setting context to ${CONTEXT}...${NC}"
    kubectl config use-context "$CONTEXT"
    echo ""
fi

# Function to apply manifest
apply_manifest() {
    local manifest_path=$1
    local description=$2

    echo -e "${YELLOW}Applying ${description}...${NC}"

    if [ "$DRY_RUN" = "true" ]; then
        kubectl apply -f "$manifest_path" --dry-run=client
    else
        kubectl apply -f "$manifest_path"
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${description} applied${NC}"
        echo ""
    else
        echo -e "${RED}✗ Failed to apply ${description}${NC}"
        exit 1
    fi
}

# Deploy in order
echo -e "${BLUE}Step 1: Creating namespace...${NC}"
apply_manifest "k8s/base/namespace.yaml" "Namespace"

echo -e "${BLUE}Step 2: Creating ConfigMaps...${NC}"
apply_manifest "k8s/configmaps/app-config.yaml" "ConfigMaps"

echo -e "${BLUE}Step 3: Creating Secrets...${NC}"
echo -e "${YELLOW}⚠ Warning: Update secrets before deploying to production!${NC}"
apply_manifest "k8s/secrets/app-secrets.yaml" "Secrets"

echo -e "${BLUE}Step 4: Creating Persistent Volume Claims...${NC}"
apply_manifest "k8s/pvc/storage.yaml" "PVCs"

echo -e "${BLUE}Step 5: Deploying Databases...${NC}"
apply_manifest "k8s/deployments/postgres.yaml" "PostgreSQL"
apply_manifest "k8s/services/postgres-service.yaml" "PostgreSQL Service"

# Wait for databases to be ready
if [ "$DRY_RUN" != "true" ]; then
    echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=300s || true
    echo ""
fi

echo -e "${BLUE}Step 6: Deploying Application Services...${NC}"
apply_manifest "k8s/deployments/gateway-api.yaml" "Gateway API"
apply_manifest "k8s/services/gateway-api-service.yaml" "Gateway API Service"

echo -e "${BLUE}Step 7: Configuring Ingress...${NC}"
apply_manifest "k8s/ingress/ingress.yaml" "Ingress"

echo -e "${BLUE}Step 8: Configuring Auto-scaling...${NC}"
apply_manifest "k8s/hpa/gateway-api-hpa.yaml" "HPA"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Show deployment status
if [ "$DRY_RUN" != "true" ]; then
    echo "Checking deployment status..."
    echo ""
    kubectl get pods -n "$NAMESPACE"
    echo ""
    kubectl get services -n "$NAMESPACE"
    echo ""
    kubectl get ingress -n "$NAMESPACE"
    echo ""

    echo -e "${GREEN}To view logs:${NC}"
    echo "  kubectl logs -f -l app=gateway-api -n $NAMESPACE"
    echo ""
    echo -e "${GREEN}To check pod status:${NC}"
    echo "  kubectl get pods -n $NAMESPACE"
    echo ""
    echo -e "${GREEN}To scale deployment:${NC}"
    echo "  kubectl scale deployment gateway-api --replicas=5 -n $NAMESPACE"
fi

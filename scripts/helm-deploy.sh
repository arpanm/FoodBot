#!/bin/bash

# ============================================
# Helm Deployment Script
# Deploys FoodBot using Helm charts
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RELEASE_NAME=${HELM_RELEASE:-"foodbot"}
NAMESPACE=${K8S_NAMESPACE:-"foodbot"}
CHART_PATH=${HELM_CHART_PATH:-"helm/foodbot"}
VALUES_FILE=${HELM_VALUES_FILE:-"helm/foodbot/values.yaml"}
DRY_RUN=${DRY_RUN:-"false"}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FoodBot Helm Deployment${NC}"
echo -e "${GREEN}Release: ${RELEASE_NAME}${NC}"
echo -e "${GREEN}Namespace: ${NAMESPACE}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: helm is not installed${NC}"
    exit 1
fi

# Create namespace if it doesn't exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Add required Helm repositories
echo -e "${BLUE}Adding Helm repositories...${NC}"
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
echo ""

# Validate chart
echo -e "${BLUE}Validating Helm chart...${NC}"
helm lint "$CHART_PATH"
echo ""

# Deploy or upgrade
if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}Running in dry-run mode...${NC}"
    helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE" \
        --dry-run \
        --debug
else
    echo -e "${BLUE}Deploying FoodBot...${NC}"
    helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE" \
        --create-namespace \
        --wait \
        --timeout 10m

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Deployment successful!${NC}"
    else
        echo -e "${RED}✗ Deployment failed${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ "$DRY_RUN" != "true" ]; then
    # Show deployment status
    echo "Release Status:"
    helm status "$RELEASE_NAME" -n "$NAMESPACE"
    echo ""

    echo "Pods:"
    kubectl get pods -n "$NAMESPACE"
    echo ""

    echo "Services:"
    kubectl get services -n "$NAMESPACE"
    echo ""

    echo "Ingress:"
    kubectl get ingress -n "$NAMESPACE"
    echo ""

    echo -e "${GREEN}Useful commands:${NC}"
    echo "  View logs:        kubectl logs -f -l app=gateway-api -n $NAMESPACE"
    echo "  Get pods:         kubectl get pods -n $NAMESPACE"
    echo "  Describe pod:     kubectl describe pod <pod-name> -n $NAMESPACE"
    echo "  Port forward:     kubectl port-forward svc/gateway-api 3000:3000 -n $NAMESPACE"
    echo "  Uninstall:        helm uninstall $RELEASE_NAME -n $NAMESPACE"
    echo "  Upgrade:          helm upgrade $RELEASE_NAME $CHART_PATH -n $NAMESPACE"
fi

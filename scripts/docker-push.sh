#!/bin/bash

# ============================================
# Docker Push Script
# Pushes all production Docker images to registry
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY=${DOCKER_REGISTRY:-""}
TAG=${IMAGE_TAG:-"latest"}

if [ -z "$REGISTRY" ]; then
    echo -e "${RED}Error: DOCKER_REGISTRY environment variable is not set${NC}"
    echo "Usage: DOCKER_REGISTRY=your-registry.com ./scripts/docker-push.sh"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FoodBot Docker Push Script${NC}"
echo -e "${GREEN}Registry: ${REGISTRY}${NC}"
echo -e "${GREEN}Tag: ${TAG}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to push image
push_image() {
    local image_name=$1
    local full_image_name="${REGISTRY}/${image_name}:${TAG}"

    echo -e "${YELLOW}Pushing ${image_name}...${NC}"

    docker push "${full_image_name}"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully pushed ${full_image_name}${NC}"
        echo ""
    else
        echo -e "${RED}✗ Failed to push ${image_name}${NC}"
        exit 1
    fi
}

# Login to registry if credentials are provided
if [ -n "$REGISTRY_USERNAME" ] && [ -n "$REGISTRY_PASSWORD" ]; then
    echo "Logging in to registry..."
    echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY" -u "$REGISTRY_USERNAME" --password-stdin
    echo ""
fi

# Push all images
echo "Pushing all FoodBot images..."
echo ""

push_image "foodbot/gateway-api"
push_image "foodbot/search-orchestrator"
push_image "foodbot/mcp-adapter"
push_image "foodbot/notification-service"
push_image "foodbot/customer-app"
push_image "foodbot/restaurant-app"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All images pushed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Images are now available at:"
echo "  ${REGISTRY}/foodbot/gateway-api:${TAG}"
echo "  ${REGISTRY}/foodbot/search-orchestrator:${TAG}"
echo "  ${REGISTRY}/foodbot/mcp-adapter:${TAG}"
echo "  ${REGISTRY}/foodbot/notification-service:${TAG}"
echo "  ${REGISTRY}/foodbot/customer-app:${TAG}"
echo "  ${REGISTRY}/foodbot/restaurant-app:${TAG}"

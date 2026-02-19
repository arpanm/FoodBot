#!/bin/bash

# ============================================
# Docker Build Script
# Builds all production Docker images
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
PLATFORM=${BUILD_PLATFORM:-"linux/amd64"}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FoodBot Docker Build Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to build image
build_image() {
    local service_name=$1
    local dockerfile_path=$2
    local image_name=$3

    echo -e "${YELLOW}Building ${service_name}...${NC}"

    if [ -n "$REGISTRY" ]; then
        full_image_name="${REGISTRY}/${image_name}:${TAG}"
    else
        full_image_name="${image_name}:${TAG}"
    fi

    docker build \
        --platform "${PLATFORM}" \
        --file "${dockerfile_path}" \
        --tag "${full_image_name}" \
        --progress=plain \
        .

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully built ${full_image_name}${NC}"
        echo ""
    else
        echo -e "${RED}✗ Failed to build ${service_name}${NC}"
        exit 1
    fi
}

# Build all images
echo "Building all FoodBot services..."
echo ""

# Backend Services
build_image "Gateway API" "apps/gateway-api/Dockerfile" "foodbot/gateway-api"
build_image "Search Orchestrator" "services/search-orchestrator/Dockerfile" "foodbot/search-orchestrator"
build_image "MCP Adapter" "services/mcp-adapter/Dockerfile.prod" "foodbot/mcp-adapter"
build_image "Notification Service" "services/notification-service/Dockerfile" "foodbot/notification-service"

# Frontend Applications
build_image "Customer App" "apps/customer-app/Dockerfile" "foodbot/customer-app"
build_image "Restaurant App" "apps/restaurant-app/Dockerfile" "foodbot/restaurant-app"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All images built successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# List built images
echo "Built images:"
docker images | grep "foodbot/" | head -6

echo ""
echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "To push images to registry:"
echo "  ./scripts/docker-push.sh"
echo ""
echo "To run with Docker Compose:"
echo "  docker-compose -f docker-compose.prod.yml up -d"

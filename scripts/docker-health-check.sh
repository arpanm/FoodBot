#!/bin/bash

# ============================================
# Docker Infrastructure Health Check Script
# ============================================

set -e

echo "🔍 Checking FoodBot Docker Infrastructure Health..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service
check_service() {
    local service_name=$1
    local check_command=$2

    echo -n "Checking $service_name... "

    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check Docker Compose
if ! docker-compose ps > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: No running services found${NC}"
    echo "Run 'docker-compose up -d' to start services"
    exit 1
fi

echo "Docker Services Status:"
docker-compose ps
echo ""

# Health Checks
echo "Service Health Checks:"
echo "======================"

check_service "PostgreSQL" "docker exec foodbot-postgresql pg_isready -U temporal"
check_service "Temporal Server" "curl -sf http://localhost:7234/api/v1/health"
check_service "Temporal UI" "curl -sf http://localhost:8080"
check_service "Redis" "docker exec foodbot-redis redis-cli -a foodbot-redis-password PING"
check_service "Elasticsearch" "curl -sf http://localhost:9200/_cluster/health"
check_service "Kibana" "curl -sf http://localhost:5601/api/status"
check_service "Zookeeper" "docker exec foodbot-zookeeper bash -c 'echo ruok | nc localhost 2181'"
check_service "Kafka" "docker exec foodbot-kafka kafka-broker-api-versions --bootstrap-server localhost:9092"
check_service "Schema Registry" "curl -sf http://localhost:8083"

echo ""
echo "======================"
echo -e "${GREEN}Health check complete!${NC}"
echo ""
echo "Access URLs:"
echo "  Temporal UI:      http://localhost:8080"
echo "  Redis Commander:  http://localhost:8081"
echo "  Kafka UI:         http://localhost:8082"
echo "  Kibana:           http://localhost:5601"

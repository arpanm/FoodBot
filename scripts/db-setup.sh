#!/usr/bin/env bash

###########################################
# Database Setup Script
# Creates schema and tables
###########################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up database...${NC}"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U foodbot; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

# Run TypeORM migrations
echo "Running database migrations..."
cd "$(dirname "$0")/.."

if [ -d "apps/gateway-api" ]; then
    pnpm --filter @foodbot/gateway-api migration:run
    echo -e "${GREEN}✓ Migrations complete${NC}"
else
    echo "Gateway API not found, skipping migrations"
fi

echo -e "${GREEN}✓ Database setup complete${NC}"

#!/usr/bin/env bash

###########################################
# Database Reset Script
# Drops and recreates the entire database
###########################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}WARNING: This will DELETE ALL DATA in the database!${NC}"
echo -e "${YELLOW}Are you sure you want to continue? (yes/no)${NC}"
read -r response

if [ "$response" != "yes" ]; then
    echo "Database reset cancelled."
    exit 0
fi

echo -e "${BLUE}Resetting database...${NC}"

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Database connection details
DB_NAME="${DB_NAME:-foodbot}"
DB_USER="${DB_USER:-foodbot}"
DB_PASSWORD="${DB_PASSWORD:-foodbot_dev_password}"

export PGPASSWORD="$DB_PASSWORD"

# Drop and recreate database
echo "Dropping database..."
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating database..."
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

echo -e "${GREEN}✓ Database dropped and recreated${NC}"

# Run setup script
echo "Setting up schema..."
./scripts/db-setup.sh

# Run seed script
echo "Seeding data..."
./scripts/db-seed.sh

echo -e "${GREEN}✓ Database reset complete${NC}"

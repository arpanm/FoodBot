#!/bin/bash
# =============================================================================
# FoodBot - Database Migration Script
# =============================================================================
# Safely run database migrations with backup and rollback capability
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
ACTION="${2:-migrate}"  # migrate, rollback, status
BACKUP_DIR="${BACKUP_DIR:-/tmp/foodbot-backups}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(migrate|rollback|status|dry-run)$ ]]; then
    echo -e "${RED}Error: Action must be 'migrate', 'rollback', 'status', or 'dry-run'${NC}"
    exit 1
fi

echo -e "${GREEN}=== FoodBot Database Migration ===${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Action: $ACTION${NC}"

# Load environment variables
if [[ -f ".env.${ENVIRONMENT}" ]]; then
    source ".env.${ENVIRONMENT}"
else
    echo -e "${YELLOW}Warning: .env.${ENVIRONMENT} not found, using existing env vars${NC}"
fi

# Check required environment variables
if [[ -z "$DB_HOST" || -z "$DB_NAME" || -z "$DB_USER" ]]; then
    echo -e "${RED}Error: Database connection variables not set${NC}"
    exit 1
fi

# Function: Create database backup
create_backup() {
    echo -e "${YELLOW}Creating database backup...${NC}"

    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="${BACKUP_DIR}/foodbot-${ENVIRONMENT}-$(date +%Y%m%d_%H%M%S).sql"

    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -F c \
        -f "${BACKUP_FILE}"

    echo -e "${GREEN}Backup created: ${BACKUP_FILE}${NC}"
    echo "$BACKUP_FILE"
}

# Function: Run migration
run_migration() {
    echo -e "${YELLOW}Running database migrations...${NC}"

    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Production: Create backup first
        BACKUP_FILE=$(create_backup)
        echo -e "${YELLOW}Backup file: ${BACKUP_FILE}${NC}"
    fi

    # Run migrations
    npm run migration:run

    echo -e "${GREEN}Migrations completed successfully${NC}"
}

# Function: Rollback migration
rollback_migration() {
    echo -e "${YELLOW}Rolling back last migration...${NC}"

    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo -e "${RED}WARNING: Rolling back production database!${NC}"
        read -p "Are you sure? (yes/no): " confirmation
        if [[ "$confirmation" != "yes" ]]; then
            echo "Rollback cancelled"
            exit 0
        fi

        # Create backup before rollback
        create_backup
    fi

    # Rollback last migration
    npm run migration:revert

    echo -e "${GREEN}Rollback completed${NC}"
}

# Function: Show migration status
show_status() {
    echo -e "${YELLOW}Migration Status:${NC}"
    npm run migration:show
}

# Function: Dry run (show pending migrations)
dry_run() {
    echo -e "${YELLOW}Pending Migrations (Dry Run):${NC}"
    npm run migration:dry-run || npm run migration:show
}

# Function: Restore from backup
restore_backup() {
    BACKUP_FILE="$1"

    if [[ ! -f "$BACKUP_FILE" ]]; then
        echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Restoring from backup: ${BACKUP_FILE}${NC}"

    # Drop and recreate database (be careful!)
    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER}" \
        -d postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME};"

    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER}" \
        -d postgres \
        -c "CREATE DATABASE ${DB_NAME};"

    # Restore backup
    PGPASSWORD="${DB_PASSWORD}" pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -F c \
        "${BACKUP_FILE}"

    echo -e "${GREEN}Database restored from backup${NC}"
}

# Check if PostgreSQL client is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL client (psql) is not installed${NC}"
    exit 1
fi

# Execute action
case "$ACTION" in
    migrate)
        run_migration
        ;;
    rollback)
        rollback_migration
        ;;
    status)
        show_status
        ;;
    dry-run)
        dry_run
        ;;
    *)
        echo -e "${RED}Unknown action: $ACTION${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}=== Operation Complete ===${NC}"

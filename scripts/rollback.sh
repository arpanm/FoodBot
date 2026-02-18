#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}=== FoodBot Rollback Starting ===${NC}"

APP_ROOT="/home/$USER/foodbot"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"

# Get previous release (second most recent)
PREVIOUS_RELEASE=$(ls -t "$RELEASES_DIR" | sed -n '2p')

if [ -z "$PREVIOUS_RELEASE" ]; then
    echo -e "${RED}No previous release found!${NC}"
    exit 1
fi

echo -e "${YELLOW}Rolling back to: $PREVIOUS_RELEASE${NC}"

# Stop services
echo -e "${YELLOW}Stopping services...${NC}"
sudo systemctl stop foodbot-backend || true
sudo systemctl stop foodbot-frontend || true
sudo systemctl stop foodbot-mcp || true

# Update symlink to previous release
echo -e "${YELLOW}Reverting symlink...${NC}"
ln -sfn "$RELEASES_DIR/$PREVIOUS_RELEASE/deploy-package" "$CURRENT_LINK"

# Start services
echo -e "${YELLOW}Starting services...${NC}"
sudo systemctl start foodbot-backend
sudo systemctl start foodbot-frontend
sudo systemctl start foodbot-mcp

sleep 10

# Verify rollback
echo -e "${YELLOW}Verifying rollback...${NC}"
curl -f http://localhost:3000/api/v1/health || exit 1
curl -f http://localhost:3001/ || exit 1
curl -f http://localhost:8080/actuator/health || exit 1

echo -e "${GREEN}=== Rollback Successful ===${NC}"
echo -e "Rolled back to: ${YELLOW}$PREVIOUS_RELEASE${NC}"

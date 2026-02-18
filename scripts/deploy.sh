#!/bin/bash
set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== FoodBot Deployment Starting ===${NC}"

APP_ROOT="/home/$USER/foodbot"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
TEMP_PACKAGE="/tmp/deploy-package.tar.gz"

RELEASE_ID=$(date +%Y%m%d_%H%M%S)
NEW_RELEASE="$RELEASES_DIR/$RELEASE_ID"

echo -e "${YELLOW}Creating release: $NEW_RELEASE${NC}"
mkdir -p "$NEW_RELEASE"
tar -xzf "$TEMP_PACKAGE" -C "$NEW_RELEASE"
cd "$NEW_RELEASE/deploy-package"

if [ -L "$CURRENT_LINK" ]; then
    PREVIOUS_RELEASE=$(readlink "$CURRENT_LINK")
    echo -e "${YELLOW}Previous: $PREVIOUS_RELEASE${NC}"
fi

echo -e "${YELLOW}Stopping services...${NC}"
sudo systemctl stop foodbot-backend || true
sudo systemctl stop foodbot-frontend || true
sudo systemctl stop foodbot-mcp || true

echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$NEW_RELEASE/deploy-package/backend"
npm ci --production --silent

echo -e "${YELLOW}Updating symlink...${NC}"
ln -sfn "$NEW_RELEASE/deploy-package" "$CURRENT_LINK"

echo -e "${YELLOW}Running migrations...${NC}"
cd "$CURRENT_LINK/backend"
npm run migration:run || true

echo -e "${YELLOW}Starting services...${NC}"
sudo systemctl start foodbot-backend
sudo systemctl start foodbot-frontend
sudo systemctl start foodbot-mcp

sleep 15

echo -e "${YELLOW}Health checks...${NC}"
curl -f http://localhost:3000/api/v1/health || exit 1
curl -f http://localhost:3001/ || exit 1
curl -f http://localhost:8080/actuator/health || exit 1

cd "$RELEASES_DIR" && ls -t | tail -n +6 | xargs -I {} rm -rf {}
rm -f "$TEMP_PACKAGE"

echo -e "${GREEN}=== Deployment Successful ===${NC}"

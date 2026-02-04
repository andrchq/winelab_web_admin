#!/bin/bash
# WineLab Web Admin - Installation Script for Ubuntu
# Run: chmod +x install.sh && ./install.sh

set -e

echo "🚀 WineLab Web Admin Installation"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}📦 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}⚠ Please logout and login again for Docker group to take effect${NC}"
fi

# 2. Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    echo -e "${GREEN}📦 Installing Docker Compose...${NC}"
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# 3. Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
    echo -e "${GREEN}📦 Installing Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 4. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo -e "${GREEN}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# 5. Install/update management scripts
echo -e "${GREEN}📦 Installing wlapi and wlweb commands...${NC}"

# Fix line endings (Windows to Unix)
sed -i 's/\r$//' "$SCRIPT_DIR/scripts/wlapi" 2>/dev/null || true
sed -i 's/\r$//' "$SCRIPT_DIR/scripts/wlweb" 2>/dev/null || true

# Copy to /usr/local/bin
sudo cp "$SCRIPT_DIR/scripts/wlapi" /usr/local/bin/wlapi
sudo cp "$SCRIPT_DIR/scripts/wlweb" /usr/local/bin/wlweb
sudo chmod +x /usr/local/bin/wlapi
sudo chmod +x /usr/local/bin/wlweb

# Print versions
echo ""
echo -e "${GREEN}✅ Installed versions:${NC}"
docker --version
docker compose version
node --version
npm --version
pm2 --version

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${BLUE}Management commands:${NC}"
echo "  wlapi   - Manage backend API"
echo "  wlweb   - Manage frontend"
echo ""
echo -e "${BLUE}Quick start:${NC}"
echo "  wlapi rebuild       # Build API (first time)"
echo "  wlapi db seed       # Add test data"
echo "  wlweb rebuild       # Build Web (also restarts API)"
echo ""
echo -e "${BLUE}Clean rebuild (deletes node_modules):${NC}"
echo "  wlapi rebuild --clean"
echo "  wlweb rebuild --clean"
echo ""
echo -e "${BLUE}After updates:${NC}"
echo "  wlweb update        # Git pull + rebuild + restart all"

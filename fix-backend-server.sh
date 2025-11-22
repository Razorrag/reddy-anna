#!/bin/bash

# ============================================================================
# BACKEND SERVER FIX SCRIPT
# Fixes: EADDRINUSE port conflict and missing dependencies
# ============================================================================

set -e  # Exit on error

echo "============================================"
echo "🔧 FIXING BACKEND SERVER"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Kill all processes on port 5000
echo -e "${YELLOW}Step 1: Killing all processes on port 5000...${NC}"
sudo lsof -ti:5000 | xargs sudo kill -9 2>/dev/null || echo "No processes found on port 5000"
sleep 2

# Verify port is free
if sudo lsof -i:5000 >/dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Port 5000 still in use!${NC}"
    echo "Please manually kill the process:"
    sudo lsof -i:5000
    exit 1
else
    echo -e "${GREEN}✅ Port 5000 is now free${NC}"
fi

# Step 2: Navigate to app directory
echo ""
echo -e "${YELLOW}Step 2: Navigating to app directory...${NC}"
cd /var/www/andar-bahar/reddy-anna || {
    echo -e "${RED}❌ ERROR: App directory not found!${NC}"
    exit 1
}
echo -e "${GREEN}✅ In directory: $(pwd)${NC}"

# Step 3: Install dependencies
echo ""
echo -e "${YELLOW}Step 3: Installing npm dependencies...${NC}"
npm install --production 2>&1 | tail -10
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ ERROR: Failed to install dependencies${NC}"
    exit 1
fi

# Verify critical dependencies exist
echo ""
echo -e "${YELLOW}Verifying critical dependencies...${NC}"
if [ -d "node_modules/dotenv" ]; then
    echo -e "${GREEN}✅ dotenv installed${NC}"
else
    echo -e "${RED}❌ dotenv missing${NC}"
    npm install dotenv
fi

if [ -d "node_modules/@supabase" ]; then
    echo -e "${GREEN}✅ @supabase/supabase-js installed${NC}"
else
    echo -e "${RED}❌ @supabase/supabase-js missing${NC}"
    npm install @supabase/supabase-js
fi

# Step 4: Stop and delete old PM2 process
echo ""
echo -e "${YELLOW}Step 4: Removing old PM2 process...${NC}"
pm2 stop backend-server 2>/dev/null || echo "Backend was not running"
pm2 delete backend-server 2>/dev/null || echo "Backend not in PM2"
echo -e "${GREEN}✅ Old process removed${NC}"

# Step 5: Check if dist directory exists
echo ""
echo -e "${YELLOW}Step 5: Checking build directory...${NC}"
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}❌ ERROR: dist/index.js not found!${NC}"
    echo "Building project..."
    npm run build || {
        echo -e "${RED}❌ ERROR: Build failed!${NC}"
        exit 1
    }
fi
echo -e "${GREEN}✅ Build directory exists${NC}"

# Step 6: Check package.json for module type
echo ""
echo -e "${YELLOW}Step 6: Checking module type...${NC}"
MODULE_TYPE=$(grep '"type"' package.json | grep -o 'module' || echo "commonjs")
echo "Module type: $MODULE_TYPE"

# Step 7: Start backend with PM2
echo ""
echo -e "${YELLOW}Step 7: Starting backend server...${NC}"

if [ "$MODULE_TYPE" = "module" ]; then
    echo "Using ES modules configuration..."
    pm2 start dist/index.js --name backend-server \
        --node-args="--experimental-modules" \
        --time \
        --max-restarts 10 \
        --min-uptime 10000
else
    echo "Using CommonJS configuration..."
    pm2 start dist/index.js --name backend-server \
        --time \
        --max-restarts 10 \
        --min-uptime 10000
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend started${NC}"
else
    echo -e "${RED}❌ ERROR: Failed to start backend${NC}"
    exit 1
fi

# Step 8: Save PM2 configuration
echo ""
echo -e "${YELLOW}Step 8: Saving PM2 configuration...${NC}"
pm2 save
echo -e "${GREEN}✅ PM2 configuration saved${NC}"

# Step 9: Wait for backend to initialize
echo ""
echo -e "${YELLOW}Step 9: Waiting for backend to initialize (10 seconds)...${NC}"
sleep 10

# Step 10: Verify backend is running
echo ""
echo -e "${YELLOW}Step 10: Verifying backend status...${NC}"

# Check PM2 status
pm2 status backend-server

# Check if port is listening
if sudo netstat -tulpn | grep :5000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is listening on port 5000${NC}"
else
    echo -e "${RED}❌ ERROR: Backend is NOT listening on port 5000${NC}"
    echo "Check PM2 logs:"
    pm2 logs backend-server --lines 50 --nostream
    exit 1
fi

# Check PM2 restart count
RESTART_COUNT=$(pm2 jlist | grep -A 10 '"name":"backend-server"' | grep '"restart_time"' | grep -o '[0-9]*' | head -1)
if [ "$RESTART_COUNT" -gt 5 ]; then
    echo -e "${RED}⚠️  WARNING: Backend has restarted $RESTART_COUNT times${NC}"
    echo "This indicates the backend is crashing. Check logs:"
    pm2 logs backend-server --lines 50 --nostream
else
    echo -e "${GREEN}✅ Backend is stable (restarts: $RESTART_COUNT)${NC}"
fi

# Step 11: Test the site
echo ""
echo -e "${YELLOW}Step 11: Testing site...${NC}"
HTTP_STATUS=$(curl -I -s -o /dev/null -w "%{http_code}" https://rajugarikossu.com)

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Site is responding with HTTP 200 OK${NC}"
elif [ "$HTTP_STATUS" = "502" ]; then
    echo -e "${RED}❌ Site still returning 502 Bad Gateway${NC}"
    echo "Backend is running but not responding correctly."
    echo "Check PM2 logs for errors:"
    pm2 logs backend-server --lines 50 --nostream
    exit 1
else
    echo -e "${YELLOW}⚠️  Site returned HTTP $HTTP_STATUS${NC}"
fi

# Step 12: Show final status
echo ""
echo "============================================"
echo -e "${GREEN}✅ BACKEND FIX COMPLETE${NC}"
echo "============================================"
echo ""
echo "Final Status:"
pm2 status

echo ""
echo "Recent Logs:"
pm2 logs backend-server --lines 20 --nostream

echo ""
echo "Port Status:"
sudo netstat -tulpn | grep :5000

echo ""
echo "============================================"
echo "Next Steps:"
echo "1. Test your site: https://rajugarikossu.com"
echo "2. Monitor logs: pm2 logs backend-server"
echo "3. Check status: pm2 status"
echo "============================================"
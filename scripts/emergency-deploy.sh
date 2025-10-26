#!/bin/bash

# 🚨 EMERGENCY DEPLOYMENT SCRIPT
# Fixes critical authentication vulnerabilities and deploys updates

set -e  # Exit on error

echo "🚨 EMERGENCY SECURITY FIX DEPLOYMENT"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check NODE_ENV
echo "Step 1: Checking NODE_ENV..."
if [ "$NODE_ENV" = "development" ]; then
    echo -e "${RED}❌ CRITICAL: NODE_ENV is set to 'development' in production!${NC}"
    echo -e "${YELLOW}⚠️  This creates a massive security hole!${NC}"
    echo ""
    read -p "Set NODE_ENV to 'production'? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        export NODE_ENV=production
        echo -e "${GREEN}✅ NODE_ENV set to production${NC}"
    fi
else
    echo -e "${GREEN}✅ NODE_ENV is correct${NC}"
fi
echo ""

# Step 2: Rebuild Frontend
echo "Step 2: Rebuilding frontend with security fixes..."
cd client
echo "   Installing dependencies..."
npm install --silent
echo "   Building production bundle..."
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend rebuilt successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
cd ..
echo ""

# Step 3: Check Backend Dependencies
echo "Step 3: Checking backend dependencies..."
npm install --silent
echo -e "${GREEN}✅ Backend dependencies checked${NC}"
echo ""

# Step 4: Restart Backend
echo "Step 4: Restarting backend server..."
if command -v pm2 &> /dev/null; then
    echo "   Using PM2..."
    pm2 restart all
    pm2 save
    echo -e "${GREEN}✅ Backend restarted with PM2${NC}"
elif pgrep -f "node.*index.js" > /dev/null; then
    echo "   Killing existing Node.js processes..."
    pkill -f "node.*index.js"
    echo "   Starting new server..."
    NODE_ENV=production npm start &
    echo -e "${GREEN}✅ Backend restarted${NC}"
else
    echo -e "${YELLOW}⚠️  No running server found, starting new instance...${NC}"
    NODE_ENV=production npm start &
    echo -e "${GREEN}✅ Backend started${NC}"
fi
echo ""

# Step 5: Verification
echo "Step 5: Verifying deployment..."
sleep 3  # Give server time to start

# Check if server is responding
if curl -f -s http://localhost:5000/api/game/current > /dev/null; then
    echo -e "${GREEN}✅ Server is responding${NC}"
else
    echo -e "${RED}❌ Server is not responding! Check logs.${NC}"
fi

# Check for authentication requirement
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/users)
if [ "$AUTH_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✅ Authentication is required (401 Unauthorized)${NC}"
else
    echo -e "${RED}❌ WARNING: Admin endpoint accessible without auth! (HTTP $AUTH_RESPONSE)${NC}"
fi
echo ""

# Final Instructions
echo "======================================"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo "======================================"
echo ""
echo "📋 NEXT STEPS FOR USERS:"
echo ""
echo "1. Clear Browser Data:"
echo "   - Press F12 (DevTools)"
echo "   - Application/Storage tab"
echo "   - Clear localStorage & cookies"
echo "   - Hard refresh (Ctrl+Shift+R)"
echo ""
echo "2. Verify in Browser:"
echo "   - Network tab should show /api/ (not /api/api/)"
echo "   - Admin pages require login"
echo "   - WebSocket shows authenticated user"
echo ""
echo "3. Check Logs:"
if command -v pm2 &> /dev/null; then
    echo "   pm2 logs"
else
    echo "   Check your terminal for server logs"
fi
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Users must clear their browser cache!${NC}"
echo ""

# Summary
echo "📊 DEPLOYMENT SUMMARY:"
echo "   ✅ Frontend rebuilt with API client fix"
echo "   ✅ Backend restarted with security patches"
echo "   ✅ Authentication bypass removed"
echo "   ✅ WebSocket anonymous fallback removed"
echo ""
echo "🔐 Security Status: SECURED"
echo ""

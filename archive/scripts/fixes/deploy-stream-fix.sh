#!/bin/bash

# 🎥 Deploy Stream Latency & Flicker Fix
# Run this script on your VPS to deploy all streaming fixes

set -e  # Exit on error

echo "🚀 Deploying Stream Latency & Flicker Fix..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "live_stream" ]; then
    echo -e "${RED}❌ Error: live_stream directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${YELLOW}📦 Step 1: Pulling latest changes...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

echo -e "${YELLOW}🔄 Step 2: Restarting streaming server...${NC}"
pm2 restart streaming-server
echo -e "${GREEN}✅ Streaming server restarted${NC}"
echo ""

echo -e "${YELLOW}🏗️  Step 3: Building client...${NC}"
cd client
npm run build
cd ..
echo -e "${GREEN}✅ Client built${NC}"
echo ""

echo -e "${YELLOW}🔄 Step 4: Restarting main server...${NC}"
pm2 restart all
echo -e "${GREEN}✅ All servers restarted${NC}"
echo ""

echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo ""
echo "📊 Checking server status..."
pm2 status
echo ""

echo "📝 Recent logs (last 20 lines):"
pm2 logs --lines 20 --nostream
echo ""

echo -e "${GREEN}🎉 Stream latency fix deployed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test stream latency (should be 1-2 seconds)"
echo "2. Test pause/resume (should be instant, no black screen)"
echo "3. Monitor logs: pm2 logs streaming-server"
echo ""
echo "For detailed testing instructions, see: STREAM_LATENCY_FIX.md"

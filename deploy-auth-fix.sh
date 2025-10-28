#!/bin/bash

# 🔐 Authentication Fix Deployment Script
# This script helps deploy the JWT-only authentication fix to your VPS

echo "================================================"
echo "🔐 AUTHENTICATION FIX DEPLOYMENT"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ ERROR: .env file not found!${NC}"
    echo ""
    echo "Please create a .env file with the following required variables:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_KEY"
    echo "  - JWT_SECRET (generate with: openssl rand -base64 32)"
    echo ""
    echo "See .env.example for reference"
    exit 1
fi

# Check for required environment variables
echo "📋 Checking required environment variables..."
source .env

MISSING_VARS=()

if [ -z "$SUPABASE_URL" ]; then
    MISSING_VARS+=("SUPABASE_URL")
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    MISSING_VARS+=("SUPABASE_SERVICE_KEY")
fi

if [ -z "$JWT_SECRET" ]; then
    MISSING_VARS+=("JWT_SECRET")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please add these to your .env file"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables found${NC}"
echo ""

# Check JWT_SECRET length
JWT_LENGTH=${#JWT_SECRET}
if [ $JWT_LENGTH -lt 32 ]; then
    echo -e "${YELLOW}⚠️  WARNING: JWT_SECRET is less than 32 characters${NC}"
    echo "   For better security, generate a new one with:"
    echo "   openssl rand -base64 32"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Build the application
echo "🔨 Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting application with PM2..."
    pm2 restart all
    echo -e "${GREEN}✅ Application restarted${NC}"
    echo ""
    echo "📊 Application status:"
    pm2 status
else
    echo -e "${YELLOW}⚠️  PM2 not found. Please restart your application manually${NC}"
    echo ""
    echo "To start the application:"
    echo "  NODE_ENV=production npm start"
fi

echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "================================================"
echo ""
echo "🔍 NEXT STEPS:"
echo ""
echo "1. Clear browser data (localStorage):"
echo "   - Open DevTools (F12)"
echo "   - Application → Storage → Clear site data"
echo "   - Or use Incognito/Private window"
echo ""
echo "2. Test authentication:"
echo "   - Try logging in as player"
echo "   - Try logging in as admin"
echo "   - Verify WebSocket connection"
echo ""
echo "3. Monitor logs:"
echo "   pm2 logs"
echo ""
echo "4. If issues persist, check:"
echo "   - JWT_SECRET is set correctly"
echo "   - SUPABASE credentials are valid"
echo "   - CORS settings allow your domain"
echo ""
echo "📖 See AUTHENTICATION_FIX_GUIDE.md for detailed troubleshooting"
echo ""

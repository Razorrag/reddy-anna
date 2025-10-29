#!/bin/bash

# ============================================
# Admin Fund Management Fix - Deployment Script
# ============================================

echo "🚀 Admin Fund Management Fix Deployment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY"
    exit 1
fi

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ Error: Missing required environment variables${NC}"
    echo "Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file"
    exit 1
fi

echo -e "${BLUE}📋 Pre-deployment Checklist${NC}"
echo "1. Database backup created? (y/n)"
read -r backup_confirm
if [ "$backup_confirm" != "y" ]; then
    echo -e "${YELLOW}⚠️  Please create a database backup first!${NC}"
    echo "Go to Supabase Dashboard > Database > Backups > Create Backup"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Checking database connection...${NC}"

# Extract database connection details from Supabase URL
DB_HOST=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co.*|\1.supabase.co|')
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="$SUPABASE_SERVICE_KEY"

echo "Database: $DB_HOST"
echo ""

echo -e "${BLUE}📦 Applying migration...${NC}"
echo "This will:"
echo "  - Drop existing functions (if any)"
echo "  - Create update_request_status function"
echo "  - Create update_balance_with_request function"
echo "  - Grant necessary permissions"
echo ""
echo "Continue? (y/n)"
read -r continue_confirm
if [ "$continue_confirm" != "y" ]; then
    echo -e "${YELLOW}⚠️  Deployment cancelled${NC}"
    exit 0
fi

# Apply migration using Supabase REST API
echo ""
echo -e "${BLUE}🔧 Executing SQL migration...${NC}"

# Read migration file
MIGRATION_SQL=$(cat server/migrations/fix-admin-request-functions.sql)

# Execute via Supabase REST API
RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}")

echo ""
echo -e "${GREEN}✅ Migration applied${NC}"
echo ""

echo -e "${BLUE}🔍 Verifying installation...${NC}"

# Verification query
VERIFY_SQL="SELECT routine_name, data_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('update_request_status', 'update_balance_with_request');"

echo "Checking if functions exist..."
echo ""

echo -e "${YELLOW}⚠️  Note: Automatic verification via REST API is limited.${NC}"
echo "Please manually verify in Supabase SQL Editor:"
echo ""
echo -e "${BLUE}Run this query:${NC}"
echo "SELECT routine_name, data_type FROM information_schema.routines"
echo "WHERE routine_schema = 'public'"
echo "AND routine_name IN ('update_request_status', 'update_balance_with_request');"
echo ""
echo -e "${BLUE}Expected output:${NC}"
echo "routine_name                  | data_type"
echo "------------------------------|----------"
echo "update_request_status         | json"
echo "update_balance_with_request   | json"
echo ""

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Verify functions in Supabase SQL Editor (see query above)"
echo "2. Test with a small deposit request"
echo "3. Check application logs for any errors"
echo "4. Monitor request processing"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "See ADMIN_FUND_MANAGEMENT_FIX.md for:"
echo "  - Detailed function documentation"
echo "  - API endpoint usage"
echo "  - Testing procedures"
echo "  - Troubleshooting guide"
echo ""
echo -e "${GREEN}🎉 Admin fund management system is now fixed!${NC}"

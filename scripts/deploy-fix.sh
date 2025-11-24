#!/bin/bash
# Quick Fix Deployment Script
# Run this on your VPS to fix the connection issue

set -e  # Exit on error

echo "🚀 Starting Quick Fix Deployment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project directory?"
    exit 1
fi

# 1. Backup current .env
echo "📦 Backing up current .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 2. Update .env file
echo "✏️  Updating .env configuration..."
cat > .env << 'EOF'
# Core Environment
NODE_ENV=production
PORT=5000

# Domain Configuration
CORS_ORIGIN=https://rajugarikossu.com
ALLOWED_ORIGINS=https://rajugarikossu.com,https://www.rajugarikossu.com
WEBSOCKET_URL=wss://rajugarikossu.com/ws

# Supabase Configuration
VITE_SUPABASE_URL=https://nliiasrfkenkkdlzkcum.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saWlhc3Jma2Vua2tkbHprY3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTI0NDUsImV4cCI6MjA3NzE2ODQ0NX0.XLJAKrqcdT4alwcaJP2cFUcvifatTq9sAjcp3v-_AII
SUPABASE_URL=https://nliiasrfkenkkdlzkcum.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saWlhc3Jma2Vua2tkbHprY3VtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5MjQ0NSwiZXhwIjoyMDc3MTY4NDQ1fQ.1TVKL3TLJA6M551NO27_9nT2VU62ZTouxksHgcly7hg

# JWT Configuration
JWT_SECRET=863I3hOMrEQy92L/B76e0jL6eLFwQkXZykYDo3ZQYz8=
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Game Configuration
MIN_BET=1000
MAX_BET=100000
DEFAULT_BALANCE=0.00
DEFAULT_TIMER_DURATION=30
HOUSE_COMMISSION=0.05

# Payment Configuration
MIN_DEPOSIT=100
MAX_DEPOSIT=1000000
MIN_WITHDRAWAL=500
MAX_WITHDRAWAL=500000

# Vite Build-Time Variables (for frontend build)
VITE_API_BASE_URL=/api
VITE_WS_URL=wss://rajugarikossu.com/ws
EOF

echo "✅ .env updated"
echo ""

# 3. Install dependencies (if needed)
echo "📦 Checking dependencies..."
npm install --production
echo ""

# 4. Build the application
echo "🔨 Building application..."
npm run build
echo "✅ Build complete"
echo ""

# 5. Restart PM2
echo "🔄 Restarting PM2 application..."
pm2 restart reddy-anna-app || pm2 start dist/index.js --name reddy-anna-app
pm2 save
echo "✅ PM2 restarted"
echo ""

# 6. Check status
echo "📊 Current Status:"
pm2 status
echo ""

# 7. Test backend
echo "🧪 Testing backend..."
sleep 2
if curl -s http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is responding"
else
    echo "⚠️  Backend may not be ready yet, check logs with: pm2 logs"
fi
echo ""

# 8. Reload Nginx
echo "🔄 Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx reloaded"
echo ""

echo "=========================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Your website should now be accessible at:"
echo "🌐 https://rajugarikossu.com"
echo ""
echo "Next steps:"
echo "1. Visit https://rajugarikossu.com in your browser"
echo "2. Check browser console for any errors (F12)"
echo "3. Verify WebSocket connection in Network tab"
echo "4. Test login and basic functionality"
echo ""
echo "If you encounter issues:"
echo "- Check logs: pm2 logs reddy-anna-app"
echo "- View Nginx errors: sudo tail -50 /var/log/nginx/reddy-anna-error.log"
echo "- Run diagnostics: ./scripts/diagnose-vps.sh"
echo ""
#!/bin/bash

# 🔧 Environment Setup Helper
# This script helps you set up the .env file with required variables

echo "================================================"
echo "🔧 ENVIRONMENT SETUP HELPER"
echo "================================================"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    echo ""
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting without changes"
        exit 0
    fi
    # Backup existing .env
    cp .env .env.backup
    echo "✅ Backed up existing .env to .env.backup"
    echo ""
fi

# Start creating .env file
echo "Let's set up your environment variables..."
echo ""

# Supabase URL
echo "📊 SUPABASE CONFIGURATION"
echo "Get these from: https://app.supabase.com → Your Project → Settings → API"
echo ""
read -p "Enter your Supabase URL (e.g., https://abc123.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Service Key: " SUPABASE_SERVICE_KEY

# JWT Secret
echo ""
echo "🔐 JWT CONFIGURATION"
echo "Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ Generated JWT_SECRET: $JWT_SECRET"

# Node Environment
echo ""
echo "🖥️  SERVER CONFIGURATION"
read -p "Environment (development/production) [production]: " NODE_ENV
NODE_ENV=${NODE_ENV:-production}

read -p "Server port [5000]: " PORT
PORT=${PORT:-5000}

# CORS
echo ""
echo "🌐 CORS CONFIGURATION"
if [ "$NODE_ENV" == "production" ]; then
    read -p "Enter your domain (e.g., https://yourdomain.com): " DOMAIN
    ALLOWED_ORIGINS=$DOMAIN
else
    ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000,http://localhost:5000"
fi

# Game Configuration
echo ""
echo "🎮 GAME CONFIGURATION"
read -p "Minimum bet amount [1000]: " MIN_BET
MIN_BET=${MIN_BET:-1000}

read -p "Maximum bet amount [100000]: " MAX_BET
MAX_BET=${MAX_BET:-100000}

read -p "Default player balance [100000]: " DEFAULT_BALANCE
DEFAULT_BALANCE=${DEFAULT_BALANCE:-100000}

# Create .env file
cat > .env << EOF
# 🔐 SUPABASE CONFIGURATION
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# 🎯 JWT CONFIGURATION
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# 🖥️ SERVER CONFIGURATION
NODE_ENV=$NODE_ENV
PORT=$PORT

# 🌐 CORS CONFIGURATION
ALLOWED_ORIGINS=$ALLOWED_ORIGINS

# 📊 GAME CONFIGURATION
MIN_BET=$MIN_BET
MAX_BET=$MAX_BET
DEFAULT_BALANCE=$DEFAULT_BALANCE
DEFAULT_TIMER_DURATION=30

# 🔒 RATE LIMITING
MAX_BETS_PER_MINUTE=30
RATE_LIMIT_WINDOW_MS=60000

# 💰 PAYMENT CONFIGURATION
MIN_DEPOSIT=100
MAX_DEPOSIT=1000000
MIN_WITHDRAWAL=500
MAX_WITHDRAWAL=500000
EOF

echo ""
echo "================================================"
echo "✅ ENVIRONMENT SETUP COMPLETE"
echo "================================================"
echo ""
echo "📄 Created .env file with the following configuration:"
echo ""
echo "  - Supabase URL: $SUPABASE_URL"
echo "  - JWT Secret: [HIDDEN]"
echo "  - Environment: $NODE_ENV"
echo "  - Port: $PORT"
echo "  - Allowed Origins: $ALLOWED_ORIGINS"
echo "  - Min Bet: ₹$MIN_BET"
echo "  - Max Bet: ₹$MAX_BET"
echo "  - Default Balance: ₹$DEFAULT_BALANCE"
echo ""
echo "🔒 SECURITY NOTES:"
echo "  - Never commit .env to version control"
echo "  - Keep JWT_SECRET secure"
echo "  - Backup .env file safely"
echo ""
echo "🚀 NEXT STEPS:"
echo "  1. Review .env file: cat .env"
echo "  2. Install dependencies: npm install"
echo "  3. Build application: npm run build"
echo "  4. Start server: npm start"
echo ""
echo "Or run the deployment script:"
echo "  bash deploy-auth-fix.sh"
echo ""

#!/bin/bash
# Quick Redeploy Script - Use after code changes

echo "🚀 Starting quick redeploy..."

# Navigate to project directory
cd ~/reddy-anna

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies (if package.json changed)
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Restart PM2
echo "♻️  Restarting application..."
pm2 restart andar-bahar

# Show logs
echo "📋 Showing logs (Ctrl+C to exit)..."
sleep 2
pm2 logs andar-bahar --lines 30

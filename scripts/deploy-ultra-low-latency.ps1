# Ultra-Low Latency Streaming Fix Deployment Script
# This script deploys the optimized HLS configuration to reduce latency from 18s to 1-2s

Write-Host "🚀 Ultra-Low Latency Streaming Fix Deployment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$VPS_IP = "89.42.231.35"
$VPS_USER = "root"
$PROJECT_PATH = "/var/www/andar-bahar/reddy-anna"

Write-Host "📋 Deployment Summary:" -ForegroundColor Yellow
Write-Host "  - Server buffer: 4s → 1s (75% reduction)" -ForegroundColor White
Write-Host "  - Segment duration: 1s → 0.5s" -ForegroundColor White
Write-Host "  - Playlist size: 4 → 2 segments" -ForegroundColor White
Write-Host "  - Expected latency: 1-2 seconds" -ForegroundColor Green
Write-Host ""

# Step 1: Install HLS.js locally
Write-Host "📦 Step 1: Installing HLS.js..." -ForegroundColor Cyan
try {
    npm install hls.js
    Write-Host "✅ HLS.js installed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️  HLS.js installation failed. Continuing anyway..." -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Build client
Write-Host "🔨 Step 2: Building client..." -ForegroundColor Cyan
Set-Location "client"
try {
    npm run build
    Write-Host "✅ Client built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Client build failed!" -ForegroundColor Red
    Set-Location ".."
    exit 1
}
Set-Location ".."
Write-Host ""

# Step 3: Deploy to VPS
Write-Host "🚀 Step 3: Deploying to VPS..." -ForegroundColor Cyan
Write-Host "⚠️  You will need to enter your VPS password" -ForegroundColor Yellow
Write-Host ""

# Upload server.js
Write-Host "📤 Uploading optimized server.js..." -ForegroundColor White
scp "live_stream/server.js" "${VPS_USER}@${VPS_IP}:${PROJECT_PATH}/live_stream/server.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ server.js uploaded" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to upload server.js" -ForegroundColor Red
    exit 1
}

# Upload client build
Write-Host "📤 Uploading client build..." -ForegroundColor White
scp -r "client/dist/*" "${VPS_USER}@${VPS_IP}:${PROJECT_PATH}/client/dist/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Client uploaded" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to upload client" -ForegroundColor Red
    exit 1
}

# Restart services
Write-Host ""
Write-Host "🔄 Step 4: Restarting services..." -ForegroundColor Cyan
$restartCommands = @"
cd $PROJECT_PATH
pm2 restart streaming-server
pm2 restart all
pm2 logs streaming-server --lines 20
"@

ssh "${VPS_USER}@${VPS_IP}" $restartCommands

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. ⚠️  CRITICAL: Set OBS Keyframe Interval = 1" -ForegroundColor Red
Write-Host "     (OBS → Settings → Output → Keyframe Interval: 1)" -ForegroundColor White
Write-Host ""
Write-Host "  2. Start OBS stream to: rtmp://91.108.110.72:1935/live/test" -ForegroundColor White
Write-Host ""
Write-Host "  3. Test latency:" -ForegroundColor White
Write-Host "     - Wave hand in camera" -ForegroundColor White
Write-Host "     - Check browser: https://rajugarikossu.com/game" -ForegroundColor White
Write-Host "     - Should see hand within 1-2 seconds ✅" -ForegroundColor Green
Write-Host ""
Write-Host "  4. Verify in browser console (F12):" -ForegroundColor White
Write-Host "     - Look for: 'HLS.js with LOW LATENCY config'" -ForegroundColor White
Write-Host ""
Write-Host "📊 Expected Results:" -ForegroundColor Yellow
Write-Host "  Before: 18+ seconds delay ❌" -ForegroundColor Red
Write-Host "  After:  1-2 seconds delay ✅" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Documentation: See ULTRA_LOW_LATENCY_FIX.md" -ForegroundColor Cyan
Write-Host ""

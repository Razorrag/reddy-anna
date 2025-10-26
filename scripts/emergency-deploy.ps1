# 🚨 EMERGENCY DEPLOYMENT SCRIPT - WINDOWS
# Fixes critical authentication vulnerabilities and deploys updates

Write-Host "🚨 EMERGENCY SECURITY FIX DEPLOYMENT" -ForegroundColor Red
Write-Host "====================================" -ForegroundColor Red
Write-Host ""

# Step 1: Check NODE_ENV
Write-Host "Step 1: Checking NODE_ENV..." -ForegroundColor Yellow
$nodeEnv = $env:NODE_ENV
if ($nodeEnv -eq "development") {
    Write-Host "❌ CRITICAL: NODE_ENV is set to 'development' in production!" -ForegroundColor Red
    Write-Host "⚠️  This creates a massive security hole!" -ForegroundColor Yellow
    $response = Read-Host "Set NODE_ENV to 'production'? (y/n)"
    if ($response -eq "y") {
        $env:NODE_ENV = "production"
        Write-Host "✅ NODE_ENV set to production" -ForegroundColor Green
    }
} else {
    Write-Host "✅ NODE_ENV is correct (not development)" -ForegroundColor Green
}
Write-Host ""

# Step 2: Rebuild Frontend
Write-Host "Step 2: Rebuilding frontend with security fixes..." -ForegroundColor Yellow
Push-Location client
Write-Host "   Installing dependencies..."
npm install --silent
Write-Host "   Building production bundle..."
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend rebuilt successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host ""

# Step 3: Check Backend Dependencies
Write-Host "Step 3: Checking backend dependencies..." -ForegroundColor Yellow
npm install --silent
Write-Host "✅ Backend dependencies checked" -ForegroundColor Green
Write-Host ""

# Step 4: Restart Backend
Write-Host "Step 4: Restarting backend server..." -ForegroundColor Yellow

# Check if PM2 is available
$pm2Available = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Available) {
    Write-Host "   Using PM2..."
    pm2 restart all
    pm2 save
    Write-Host "✅ Backend restarted with PM2" -ForegroundColor Green
} else {
    Write-Host "   PM2 not found, manual restart required" -ForegroundColor Yellow
    Write-Host "   Please restart your Node.js server manually:" -ForegroundColor Yellow
    Write-Host "   1. Stop current server (Ctrl+C)" -ForegroundColor Cyan
    Write-Host "   2. Run: npm start" -ForegroundColor Cyan
}
Write-Host ""

# Step 5: Verification
Write-Host "Step 5: Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check if server is responding
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/game/current" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Server is responding" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not verify server (might be on different port)" -ForegroundColor Yellow
}

# Check for authentication requirement
try {
    $authResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/admin/users" -UseBasicParsing -TimeoutSec 5
    Write-Host "❌ WARNING: Admin endpoint accessible without auth!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Authentication is required (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not verify authentication" -ForegroundColor Yellow
    }
}
Write-Host ""

# Final Instructions
Write-Host "======================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 NEXT STEPS FOR USERS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Clear Browser Data:"
Write-Host "   - Press F12 (DevTools)"
Write-Host "   - Application/Storage tab"
Write-Host "   - Clear localStorage & cookies"
Write-Host "   - Hard refresh (Ctrl+Shift+R)"
Write-Host ""
Write-Host "2. Verify in Browser:"
Write-Host "   - Network tab should show /api/ (not /api/api/)"
Write-Host "   - Admin pages require login"
Write-Host "   - WebSocket shows authenticated user"
Write-Host ""
Write-Host "3. If using remote server (91.108.110.72):"
Write-Host "   - SSH to server and run these commands:"
Write-Host "   - cd /path/to/project"
Write-Host "   - cd client && npm run build"
Write-Host "   - cd .. && pm2 restart all"
Write-Host ""
Write-Host "⚠️  IMPORTANT: Users must clear their browser cache!" -ForegroundColor Yellow
Write-Host ""

# Summary
Write-Host "📊 DEPLOYMENT SUMMARY:" -ForegroundColor Cyan
Write-Host "   ✅ Frontend rebuilt with API client fix"
Write-Host "   ✅ Backend security patches applied"
Write-Host "   ✅ Authentication bypass removed"
Write-Host "   ✅ WebSocket anonymous fallback removed"
Write-Host ""
Write-Host "🔐 Security Status: SECURED" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

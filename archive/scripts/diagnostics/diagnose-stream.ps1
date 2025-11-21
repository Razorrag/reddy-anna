# Stream Diagnostic Script
# Run this to check if everything is configured correctly

Write-Host "🔍 STREAM DIAGNOSTIC TOOL" -ForegroundColor Cyan
Write-Host "=" * 60

# Check 1: Streaming Server Status
Write-Host "`n📡 Checking Streaming Server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://89.42.231.35:8000/live/test/index.m3u8" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Streaming server is running" -ForegroundColor Green
        Write-Host "   HLS playlist accessible at: http://89.42.231.35:8000/live/test/index.m3u8"
    }
} catch {
    Write-Host "❌ Streaming server NOT accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    Write-Host "   Action: SSH into server and run: pm2 status"
}

# Check 2: NGINX Proxy
Write-Host "`n🌐 Checking NGINX Proxy..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://rajugarikossu.com/live/test/index.m3u8" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ NGINX proxy is working" -ForegroundColor Green
        Write-Host "   HLS accessible via HTTPS: https://rajugarikossu.com/live/test/index.m3u8"
    }
} catch {
    Write-Host "❌ NGINX proxy NOT working" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    Write-Host "   Action: Check NGINX config and restart: sudo systemctl restart nginx"
}

# Check 3: Database Stream Config
Write-Host "`n💾 Checking Database Stream Config..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://rajugarikossu.com/api/stream/simple-config" -Method Get
    if ($response.success) {
        Write-Host "✅ Stream config API working" -ForegroundColor Green
        Write-Host "   Stream URL: $($response.data.streamUrl)"
        Write-Host "   Stream Type: $($response.data.streamType)"
        Write-Host "   Is Active: $($response.data.isActive)"
        Write-Host "   Is Paused: $($response.data.isPaused)"
        
        if (-not $response.data.streamUrl) {
            Write-Host "⚠️  WARNING: Stream URL is empty!" -ForegroundColor Yellow
            Write-Host "   Action: Set stream URL in admin panel to: https://rajugarikossu.com/live/test/index.m3u8"
        }
        
        if (-not $response.data.isActive) {
            Write-Host "⚠️  WARNING: Stream is not active!" -ForegroundColor Yellow
            Write-Host "   Action: Enable stream in admin panel"
        }
        
        if ($response.data.isPaused) {
            Write-Host "⚠️  WARNING: Stream is paused!" -ForegroundColor Yellow
            Write-Host "   Action: Resume stream in admin panel"
        }
    }
} catch {
    Write-Host "❌ Stream config API NOT working" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
}

# Check 4: Frontend Build
Write-Host "`n🏗️  Checking Frontend Build..." -ForegroundColor Yellow
$clientPath = "c:\Users\15anu\Desktop\andar bahar\andar bahar\client"
if (Test-Path "$clientPath\dist") {
    Write-Host "✅ Frontend build exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend not built" -ForegroundColor Yellow
    Write-Host "   Action: Run 'npm run build' in client folder"
}

# Check 5: HLS.js Library
Write-Host "`n📚 Checking HLS.js Library..." -ForegroundColor Yellow
$indexHtml = Get-Content "$clientPath\index.html" -Raw
if ($indexHtml -match "hls\.js") {
    Write-Host "✅ HLS.js library included in index.html" -ForegroundColor Green
} else {
    Write-Host "❌ HLS.js library NOT included" -ForegroundColor Red
    Write-Host "   Action: Add HLS.js CDN to client/index.html"
}

# Summary
Write-Host "`n" + "=" * 60
Write-Host "📋 DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60

Write-Host "`n✅ REQUIRED STEPS FOR STREAM TO WORK:" -ForegroundColor Green
Write-Host "1. Start OBS with RTMP: rtmp://89.42.231.35:1935/live, key: test"
Write-Host "2. Wait 10-15 seconds for HLS segments to generate"
Write-Host "3. Set stream URL in admin panel: https://rajugarikossu.com/live/test/index.m3u8"
Write-Host "4. Set stream type: HLS"
Write-Host "5. Enable stream: Is Active = ON"
Write-Host "6. Make sure stream is not paused: Is Paused = OFF"

Write-Host "`n🔧 QUICK FIXES:" -ForegroundColor Yellow
Write-Host "• Streaming server not running: ssh root@89.42.231.35 'pm2 restart streaming-server'"
Write-Host "• NGINX not working: ssh root@89.42.231.35 'sudo systemctl restart nginx'"
Write-Host "• Stream not showing: Check browser console (F12) for errors"
Write-Host "• Database not updated: Set stream URL in admin panel and save"

Write-Host "`n🌐 ADMIN PANEL:" -ForegroundColor Cyan
Write-Host "https://rajugarikossu.com/admin-stream-settings"

Write-Host "`n"

# 🧪 Test Stream Latency & Flicker Fix
# Run this script to verify all fixes are working correctly

param(
    [string]$VpsHost = "root@89.42.231.35",
    [string]$StreamUrl = "https://rajugarikossu.com"
)

Write-Host "🧪 Testing Stream Latency & Flicker Fix..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check streaming server is running
Write-Host "📡 Test 1: Checking streaming server status..." -ForegroundColor Yellow
$streamingStatus = ssh $VpsHost "pm2 list | grep streaming-server"
if ($streamingStatus -match "online") {
    Write-Host "✅ Streaming server is running" -ForegroundColor Green
} else {
    Write-Host "❌ Streaming server is NOT running!" -ForegroundColor Red
    Write-Host "Run: ssh $VpsHost 'pm2 restart streaming-server'" -ForegroundColor Yellow
}
Write-Host ""

# Test 2: Check HLS configuration
Write-Host "🔧 Test 2: Verifying HLS configuration..." -ForegroundColor Yellow
$hlsConfig = ssh $VpsHost "cat /var/www/andar-bahar/reddy-anna/live_stream/server.js | grep hlsFlags"
if ($hlsConfig -match "hls_time=0.5") {
    Write-Host "✅ HLS segment time is 0.5s (ultra-low latency)" -ForegroundColor Green
} else {
    Write-Host "⚠️  HLS segment time is NOT 0.5s - may have high latency" -ForegroundColor Yellow
}

if ($hlsConfig -match "hls_list_size=2") {
    Write-Host "✅ HLS playlist size is 2 segments (minimal buffer)" -ForegroundColor Green
} else {
    Write-Host "⚠️  HLS playlist size is NOT 2 - may have high latency" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check HLS.js is loaded in client
Write-Host "📦 Test 3: Checking HLS.js library..." -ForegroundColor Yellow
$clientHtml = ssh $VpsHost "cat /var/www/andar-bahar/reddy-anna/client/index.html | grep hls.js"
if ($clientHtml -match "hls.js") {
    Write-Host "✅ HLS.js library is included in client" -ForegroundColor Green
} else {
    Write-Host "❌ HLS.js library is MISSING from client!" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check recent streaming logs
Write-Host "📝 Test 4: Checking streaming server logs..." -ForegroundColor Yellow
Write-Host "Recent activity:" -ForegroundColor Cyan
ssh $VpsHost "pm2 logs streaming-server --lines 10 --nostream"
Write-Host ""

# Test 5: Check HLS stream is accessible
Write-Host "🌐 Test 5: Testing HLS stream accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://rajugarikossu.com/live/test/index.m3u8" -Method Head -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ HLS stream is accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  HLS stream is not accessible (may not be streaming yet)" -ForegroundColor Yellow
    Write-Host "   Start OBS stream to: rtmp://89.42.231.35:1935/live (key: test)" -ForegroundColor Cyan
}
Write-Host ""

# Test 6: Manual testing instructions
Write-Host "🎯 Manual Testing Instructions:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  LATENCY TEST:" -ForegroundColor Yellow
Write-Host "   - Start OBS stream to: rtmp://89.42.231.35:1935/live (key: test)"
Write-Host "   - Open game in browser: $StreamUrl"
Write-Host "   - Wave hand in front of camera"
Write-Host "   - Expected: See hand in browser within 1-2 seconds"
Write-Host ""

Write-Host "2️⃣  PAUSE/RESUME TEST:" -ForegroundColor Yellow
Write-Host "   - Login as admin"
Write-Host "   - Go to Stream Settings"
Write-Host "   - Click 'Pause Stream'"
Write-Host "   - Expected: Stream freezes on current frame (no black screen)"
Write-Host "   - Click 'Play Stream'"
Write-Host "   - Expected: Stream resumes instantly from live edge (1-2 seconds)"
Write-Host ""

Write-Host "3️⃣  BROWSER CONSOLE CHECK:" -ForegroundColor Yellow
Write-Host "   - Open browser DevTools (F12)"
Write-Host "   - Look for these messages:"
Write-Host "     ✅ '🎬 Initializing HLS.js with ultra-low latency config...'"
Write-Host "     ✅ '✅ HLS.js initialized successfully'"
Write-Host "     ✅ '✅ Jumped to live edge at X seconds' (on resume)"
Write-Host ""

# Summary
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "Expected Results:" -ForegroundColor Yellow
Write-Host "  • Stream latency: 1-2 seconds (was 10-15s)"
Write-Host "  • Resume time: 1-2 seconds (was 5-6 minutes)"
Write-Host "  • No black screen on pause/resume"
Write-Host "  • Smooth frozen frame overlay when paused"
Write-Host ""
Write-Host "If any tests fail, check: STREAM_LATENCY_FIX.md for troubleshooting" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Testing complete!" -ForegroundColor Green

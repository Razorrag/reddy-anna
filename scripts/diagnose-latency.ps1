# Latency Diagnostic Script
# Helps identify why you're still seeing 13 seconds delay

Write-Host "🔍 HLS Latency Diagnostic Tool" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Check 1: OBS Keyframe Interval
Write-Host "⚠️  CHECK 1: OBS Keyframe Interval" -ForegroundColor Yellow
Write-Host "   This is the #1 cause of high latency!" -ForegroundColor White
Write-Host ""
Write-Host "   Steps to verify:" -ForegroundColor White
Write-Host "   1. Open OBS" -ForegroundColor White
Write-Host "   2. Settings → Output" -ForegroundColor White
Write-Host "   3. Output Mode: Advanced" -ForegroundColor White
Write-Host "   4. Streaming tab → Encoder Settings" -ForegroundColor White
Write-Host "   5. Find 'Keyframe Interval'" -ForegroundColor White
Write-Host ""
Write-Host "   ✅ MUST BE: 1 (exactly 1, not 0, not 2)" -ForegroundColor Green
Write-Host "   ❌ If it's 2: You'll get 4-6s server delay" -ForegroundColor Red
Write-Host "   ❌ If it's 0 (auto): You'll get 10-15s server delay" -ForegroundColor Red
Write-Host ""
$keyframe = Read-Host "   What is your OBS Keyframe Interval? (enter number)"
Write-Host ""

if ($keyframe -eq "1") {
    Write-Host "   ✅ Keyframe is correct!" -ForegroundColor Green
} else {
    Write-Host "   ❌ PROBLEM FOUND! Keyframe should be 1, not $keyframe" -ForegroundColor Red
    Write-Host "   This is causing extra 10+ seconds of delay!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   FIX: Set Keyframe Interval to 1 in OBS and restart stream" -ForegroundColor Yellow
}
Write-Host ""

# Check 2: OBS Tune Setting
Write-Host "⚠️  CHECK 2: OBS Tune Setting" -ForegroundColor Yellow
Write-Host "   Steps to verify:" -ForegroundColor White
Write-Host "   1. OBS → Settings → Output → Streaming" -ForegroundColor White
Write-Host "   2. Find 'Tune' dropdown" -ForegroundColor White
Write-Host ""
Write-Host "   ✅ MUST BE: zerolatency" -ForegroundColor Green
Write-Host "   ❌ If it's (none) or anything else: Extra 2-3s delay" -ForegroundColor Red
Write-Host ""
$tune = Read-Host "   What is your OBS Tune setting? (enter value)"
Write-Host ""

if ($tune -eq "zerolatency") {
    Write-Host "   ✅ Tune is correct!" -ForegroundColor Green
} else {
    Write-Host "   ❌ PROBLEM FOUND! Tune should be 'zerolatency', not '$tune'" -ForegroundColor Red
    Write-Host "   This is causing extra 2-3 seconds of delay!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   FIX: Set Tune to 'zerolatency' in OBS and restart stream" -ForegroundColor Yellow
}
Write-Host ""

# Check 3: Server Configuration
Write-Host "⚠️  CHECK 3: Server Configuration" -ForegroundColor Yellow
Write-Host "   Checking live_stream/server.js..." -ForegroundColor White
Write-Host ""

$serverConfig = Get-Content "live_stream/server.js" | Select-String "hlsFlags"
if ($serverConfig -match "hls_time=0.5") {
    Write-Host "   ✅ Server config is optimized (0.5s segments)" -ForegroundColor Green
} elseif ($serverConfig -match "hls_time=1") {
    Write-Host "   ⚠️  Server using 1s segments (should be 0.5s)" -ForegroundColor Yellow
    Write-Host "   This adds 1-2 seconds of delay" -ForegroundColor Yellow
} else {
    Write-Host "   ❌ Server config not optimized!" -ForegroundColor Red
}
Write-Host ""

# Check 4: HLS.js Installation
Write-Host "⚠️  CHECK 4: HLS.js Installation" -ForegroundColor Yellow
Write-Host "   Checking if hls.js is installed..." -ForegroundColor White
Write-Host ""

if (Test-Path "node_modules/hls.js") {
    Write-Host "   ✅ HLS.js is installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ HLS.js is NOT installed!" -ForegroundColor Red
    Write-Host "   Without HLS.js, you'll get default browser buffering (15-20s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   FIX: Run 'npm install hls.js'" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: Server Running
Write-Host "⚠️  CHECK 5: Streaming Server Status" -ForegroundColor Yellow
Write-Host "   Checking if streaming server is running on VPS..." -ForegroundColor White
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://91.108.110.72:8000/live/test/index.m3u8" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Streaming server is running" -ForegroundColor Green
        
        # Check segment duration from playlist
        $content = $response.Content
        if ($content -match "#EXTINF:(\d+\.?\d*)") {
            $segmentDuration = $matches[1]
            Write-Host "   📊 Segment duration: $segmentDuration seconds" -ForegroundColor White
            
            if ([double]$segmentDuration -le 0.6) {
                Write-Host "   ✅ Segment duration is optimized" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Segment duration is $segmentDuration s (should be 0.5s)" -ForegroundColor Yellow
                Write-Host "   Server config may not be applied. Restart streaming server!" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "   ❌ Cannot reach streaming server!" -ForegroundColor Red
    Write-Host "   Make sure streaming server is running on VPS" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "📊 DIAGNOSIS SUMMARY" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Most Common Causes of 13s Delay:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ❌ OBS Keyframe ≠ 1 (adds 10+ seconds)" -ForegroundColor Red
Write-Host "   Fix: OBS → Settings → Output → Keyframe Interval = 1" -ForegroundColor White
Write-Host ""
Write-Host "2. ❌ OBS Tune ≠ zerolatency (adds 2-3 seconds)" -ForegroundColor Red
Write-Host "   Fix: OBS → Settings → Output → Tune = zerolatency" -ForegroundColor White
Write-Host ""
Write-Host "3. ❌ Server not restarted after config change (adds 3-4 seconds)" -ForegroundColor Red
Write-Host "   Fix: SSH to VPS and run 'pm2 restart streaming-server'" -ForegroundColor White
Write-Host ""
Write-Host "4. ❌ HLS.js not installed (adds 10-15 seconds)" -ForegroundColor Red
Write-Host "   Fix: Run 'npm install hls.js' and rebuild client" -ForegroundColor White
Write-Host ""

Write-Host "Expected Latency Breakdown:" -ForegroundColor Cyan
Write-Host "  - OBS encoding: 0.1-0.3s" -ForegroundColor White
Write-Host "  - Server buffer: 1s (with 0.5s segments × 2)" -ForegroundColor White
Write-Host "  - Client buffer: 0.5-1s (with HLS.js optimized)" -ForegroundColor White
Write-Host "  - Network: 0.1-0.3s" -ForegroundColor White
Write-Host "  --------------------------------" -ForegroundColor White
Write-Host "  Total: 1.7-2.6 seconds ✅" -ForegroundColor Green
Write-Host ""

Write-Host "If you're seeing 13s, one of the above is misconfigured!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Quick Fix Checklist:" -ForegroundColor Cyan
Write-Host "  [ ] Set OBS Keyframe = 1" -ForegroundColor White
Write-Host "  [ ] Set OBS Tune = zerolatency" -ForegroundColor White
Write-Host "  [ ] Restart OBS stream" -ForegroundColor White
Write-Host "  [ ] Run: npm install hls.js" -ForegroundColor White
Write-Host "  [ ] Run: npm run build (in client folder)" -ForegroundColor White
Write-Host "  [ ] SSH to VPS: pm2 restart streaming-server" -ForegroundColor White
Write-Host "  [ ] Hard refresh browser (Ctrl+Shift+R)" -ForegroundColor White
Write-Host ""

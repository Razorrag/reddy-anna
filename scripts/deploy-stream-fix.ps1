# 🎥 Deploy Stream Latency & Flicker Fix to VPS
# Run this script on Windows to deploy all streaming fixes to your VPS

param(
    [string]$VpsHost = "root@89.42.231.35",
    [string]$ProjectPath = "/var/www/andar-bahar/reddy-anna"
)

Write-Host "🚀 Deploying Stream Latency & Flicker Fix to VPS..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Commit and push local changes
Write-Host "📦 Step 1: Committing and pushing local changes..." -ForegroundColor Yellow
git add .
git commit -m "Fix: Ultra-low latency HLS streaming + no-flicker pause/resume"
git push origin main
Write-Host "✅ Changes pushed to repository" -ForegroundColor Green
Write-Host ""

# Step 2: SSH into VPS and deploy
Write-Host "🔄 Step 2: Deploying to VPS..." -ForegroundColor Yellow
$deployScript = @"
cd $ProjectPath
echo '📥 Pulling latest changes...'
git pull origin main
echo '✅ Code updated'
echo ''

echo '🔄 Restarting streaming server...'
pm2 restart streaming-server
echo '✅ Streaming server restarted'
echo ''

echo '🏗️  Building client...'
cd client
npm run build
cd ..
echo '✅ Client built'
echo ''

echo '🔄 Restarting all servers...'
pm2 restart all
echo '✅ All servers restarted'
echo ''

echo '📊 Server status:'
pm2 status
echo ''

echo '📝 Recent logs:'
pm2 logs --lines 20 --nostream
"@

ssh $VpsHost $deployScript

Write-Host ""
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test stream latency (should be 1-2 seconds)"
Write-Host "2. Test pause/resume (should be instant, no black screen)"
Write-Host "3. Monitor logs: ssh $VpsHost 'pm2 logs streaming-server'"
Write-Host ""
Write-Host "For detailed testing instructions, see: STREAM_LATENCY_FIX.md" -ForegroundColor Yellow

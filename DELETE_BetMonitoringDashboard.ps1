# Script to delete BetMonitoringDashboard.tsx
# This component is no longer needed as LiveBetMonitoring is used instead

$filePath = "client\src\components\BetMonitoringDashboard.tsx"

if (Test-Path $filePath) {
    Remove-Item $filePath -Force
    Write-Host "✅ Deleted: $filePath" -ForegroundColor Green
} else {
    Write-Host "❌ File not found: $filePath" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Summary of changes:" -ForegroundColor Cyan
Write-Host "1. ✅ Removed LiveBetMonitoring from /admin/game page" -ForegroundColor Green
Write-Host "2. ✅ Replaced BetMonitoringDashboard with LiveBetMonitoring in /admin page" -ForegroundColor Green
Write-Host "3. ✅ Deleted BetMonitoringDashboard.tsx component" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Result: LiveBetMonitoring now appears ONLY on /admin page" -ForegroundColor Yellow

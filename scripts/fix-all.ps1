# PowerShell script to fix admin password and verify database

Write-Host "🔧 Fixing Admin Password & Database Issues..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY" -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Install required packages if not present
Write-Host "📦 Ensuring required packages are installed..." -ForegroundColor Yellow
npm install bcryptjs @supabase/supabase-js dotenv --save

# Reset admin password
Write-Host ""
Write-Host "🔐 Resetting admin password..." -ForegroundColor Cyan
node scripts/reset-admin-password.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Admin password reset complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Login Credentials:" -ForegroundColor Cyan
    Write-Host "   Username: admin" -ForegroundColor White
    Write-Host "   Password: admin123" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Failed to reset admin password" -ForegroundColor Red
    Write-Host "Check the error above and try again" -ForegroundColor Yellow
    exit 1
}

# Verify database
Write-Host "🔍 Checking database status..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Please verify in Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "1. Run: SELECT * FROM game_history LIMIT 5;" -ForegroundColor White
Write-Host "2. Run: SELECT routine_name FROM information_schema.routines WHERE routine_name = 'apply_payouts_and_update_bets';" -ForegroundColor White
Write-Host "3. Run: SELECT unnest(enum_range(NULL::transaction_status));" -ForegroundColor White
Write-Host ""

Write-Host "✅ Fix script complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Restart server: npm run dev:both" -ForegroundColor White
Write-Host "2. Login as admin (admin/admin123)" -ForegroundColor White
Write-Host "3. Play a test game" -ForegroundColor White
Write-Host "4. Check game history in admin panel" -ForegroundColor White
Write-Host ""

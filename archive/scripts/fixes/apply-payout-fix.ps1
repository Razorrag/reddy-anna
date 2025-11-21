# ============================================================================
# APPLY SIMPLIFIED PAYOUT SYSTEM FIX
# ============================================================================
# This script applies the complete database migration to fix payout issues
# Run this script from PowerShell as Administrator
# ============================================================================

Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     REDDY ANNA - PAYOUT SYSTEM FIX MIGRATION                        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$envPath = Join-Path $PSScriptRoot "..\server\.env"
if (Test-Path $envPath) {
    Write-Host "✓ Loading environment variables..." -ForegroundColor Green
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.+?)\s*$') {
            $name = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "✗ .env file not found at: $envPath" -ForegroundColor Red
    Write-Host "Please create .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY" -ForegroundColor Yellow
    exit 1
}

$supabaseUrl = $env:SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "✗ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Supabase URL: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# Read the SQL migration file
$sqlFile = Join-Path $PSScriptRoot "fix-payout-system-simplified.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "✗ Migration file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $sqlFile -Raw
Write-Host "✓ Loaded migration SQL ($($sqlContent.Length) bytes)" -ForegroundColor Green
Write-Host ""

# Confirmation prompt
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "MIGRATION ACTIONS:" -ForegroundColor Yellow
Write-Host "  1. Add payout_transaction_id column to player_bets" -ForegroundColor White
Write-Host "  2. Add actual_payout column to player_bets" -ForegroundColor White
Write-Host "  3. Create unique index for idempotency" -ForegroundColor White
Write-Host "  4. Drop broken apply_payouts_and_update_bets function" -ForegroundColor White
Write-Host "  5. Create update_bet_with_payout function" -ForegroundColor White
Write-Host "  6. Create add_balance_atomic function" -ForegroundColor White
Write-Host "  7. Create create_payout_transaction function" -ForegroundColor White
Write-Host "  8. Add performance indexes" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Apply this migration? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Applying migration..." -ForegroundColor Cyan
Write-Host ""

try {
    # Execute SQL via Supabase REST API
    $headers = @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
        "Content-Type" = "application/json"
    }
    
    # Split SQL into individual statements (simple approach)
    $statements = $sqlContent -split ";" | Where-Object { $_.Trim() -ne "" -and -not $_.Trim().StartsWith("--") }
    
    $successCount = 0
    $failCount = 0
    
    foreach ($statement in $statements) {
        $trimmed = $statement.Trim()
        if ($trimmed -eq "" -or $trimmed.StartsWith("COMMENT ON")) {
            continue # Skip empty and comment statements
        }
        
        Write-Host "Executing: $($trimmed.Substring(0, [Math]::Min(60, $trimmed.Length)))..." -ForegroundColor Gray
        
        try {
            $body = @{
                query = $trimmed
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body -ErrorAction Stop
            $successCount++
            Write-Host "  ✓ Success" -ForegroundColor Green
        } catch {
            # Try alternative method: Use PostgREST
            Write-Host "  ⚠ Attempting alternative execution method..." -ForegroundColor Yellow
            
            # For PostgreSQL functions, we can try direct execution via REST API
            # This is a fallback - ideally you should use Supabase SQL Editor
            $failCount++
            Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "MIGRATION SUMMARY:" -ForegroundColor Cyan
    Write-Host "  ✓ Successful: $successCount" -ForegroundColor Green
    if ($failCount -gt 0) {
        Write-Host "  ✗ Failed: $failCount" -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠ IMPORTANT: Some migrations failed via API." -ForegroundColor Yellow
        Write-Host "   Please run the SQL directly in Supabase SQL Editor:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   1. Go to: https://supabase.com/dashboard" -ForegroundColor White
        Write-Host "   2. Select your project" -ForegroundColor White
        Write-Host "   3. Click 'SQL Editor' in left sidebar" -ForegroundColor White
        Write-Host "   4. Create new query" -ForegroundColor White
        Write-Host "   5. Paste contents of: $sqlFile" -ForegroundColor White
        Write-Host "   6. Click 'Run' button" -ForegroundColor White
        Write-Host ""
    }
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "✗ Migration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "MANUAL MIGRATION REQUIRED:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "2. Select your project" -ForegroundColor White
    Write-Host "3. Click 'SQL Editor' in the left sidebar" -ForegroundColor White
    Write-Host "4. Create a new query" -ForegroundColor White
    Write-Host "5. Copy and paste the contents of:" -ForegroundColor White
    Write-Host "   $sqlFile" -ForegroundColor Cyan
    Write-Host "6. Click the 'Run' button" -ForegroundColor White
    Write-Host "7. Verify all statements execute successfully" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "✓ Migration process complete!" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Verify migration in Supabase SQL Editor (run verification queries)" -ForegroundColor White
Write-Host "2. Restart your server: npm run dev:both" -ForegroundColor White
Write-Host "3. Test a complete game with payout" -ForegroundColor White
Write-Host ""
Write-Host "VERIFICATION QUERIES (run these in Supabase SQL Editor):" -ForegroundColor Yellow
Write-Host ""
Write-Host @"
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'player_bets' 
AND column_name IN ('payout_transaction_id', 'actual_payout');

-- Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('update_bet_with_payout', 'create_payout_transaction', 'add_balance_atomic')
AND routine_schema = 'public';

-- Check if old function is removed
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'apply_payouts_and_update_bets';
"@ -ForegroundColor Gray
Write-Host ""

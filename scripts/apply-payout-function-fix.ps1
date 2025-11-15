# Apply Database Migration - Fix Payout Function Overloading
# This script drops the old text[] version of apply_payouts_and_update_bets

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix Payout Function Overloading" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if migration file exists
$migrationFile = "server\migrations\drop_old_payout_function.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Migration file found: $migrationFile" -ForegroundColor Green
Write-Host ""

# Load environment variables
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "WARNING: .env file not found" -ForegroundColor Yellow
}

# Get Supabase connection details
$supabaseUrl = $env:SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment" -ForegroundColor Red
    Write-Host "Please ensure .env file contains these variables" -ForegroundColor Red
    exit 1
}

Write-Host "Supabase URL: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# Extract database connection info from Supabase URL
# Format: https://[project-ref].supabase.co
if ($supabaseUrl -match 'https://([^.]+)\.supabase\.co') {
    $projectRef = $matches[1]
    Write-Host "Project Reference: $projectRef" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not parse Supabase URL" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  IMPORTANT: Manual Migration Required" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This migration needs to be applied directly to your Supabase database." -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Using Supabase Dashboard" -ForegroundColor Green
Write-Host "  1. Go to: https://supabase.com/dashboard/project/$projectRef/editor" -ForegroundColor White
Write-Host "  2. Click 'SQL Editor' in the left sidebar" -ForegroundColor White
Write-Host "  3. Click 'New Query'" -ForegroundColor White
Write-Host "  4. Copy and paste the contents of: $migrationFile" -ForegroundColor White
Write-Host "  5. Click 'Run' to execute the migration" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Using psql CLI" -ForegroundColor Green
Write-Host "  If you have direct database access:" -ForegroundColor White
Write-Host "  psql -h db.$projectRef.supabase.co -U postgres -d postgres -f $migrationFile" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Using Supabase CLI" -ForegroundColor Green
Write-Host "  If you have Supabase CLI installed:" -ForegroundColor White
Write-Host "  supabase db push --db-url `"postgresql://postgres:[password]@db.$projectRef.supabase.co:5432/postgres`"" -ForegroundColor White
Write-Host ""

# Display migration content
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Migration Content Preview" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Get-Content $migrationFile | Select-Object -First 30
Write-Host "..." -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to open the migration file in notepad..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
notepad $migrationFile

Write-Host ""
Write-Host "After applying the migration, restart your server." -ForegroundColor Green
Write-Host ""

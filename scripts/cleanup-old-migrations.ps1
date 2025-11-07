# Cleanup Old Migration Files
# This script backs up and removes all old migration files that are now consolidated

Write-Host "🧹 Cleaning up old migration files..." -ForegroundColor Cyan
Write-Host ""

# Define paths
$projectRoot = Split-Path -Parent $PSScriptRoot
$migrationsDir = Join-Path $projectRoot "server\migrations"
$backupDir = Join-Path $projectRoot ".backup-migrations-$(Get-Date -Format 'yyyy-MM-dd-HHmmss')"

# Create backup directory
Write-Host "📦 Creating backup directory: $backupDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup migration files
Write-Host "💾 Backing up migration files..." -ForegroundColor Yellow
if (Test-Path $migrationsDir) {
    Copy-Item -Path "$migrationsDir\*" -Destination $backupDir -Recurse -Force
    Write-Host "✅ Backed up $($(Get-ChildItem $migrationsDir -File).Count) files" -ForegroundColor Green
}

# List of migration files to remove
$filesToRemove = @(
    "0001_apply_payouts.sql",
    "add-atomic-operations.sql",
    "add-bonus-applied-transaction-type.sql",
    "add-bonus-config-settings.sql",
    "add-wagering-requirements.sql",
    "add_bonus_tracking_table.sql",
    "add_show_stream_column.sql",
    "add_unique_bet_constraint.sql",
    "fix-admin-request-functions.sql",
    "fix_payout_function.sql",
    "fix_payout_with_actual_payout.sql",
    "remove_unique_bet_constraint.sql"
)

# Remove old migration files
Write-Host ""
Write-Host "🗑️  Removing old migration files..." -ForegroundColor Yellow
$removedCount = 0
foreach ($file in $filesToRemove) {
    $filePath = Join-Path $migrationsDir $file
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "  ✅ Removed: $file" -ForegroundColor Green
        $removedCount++
    }
}

Write-Host ""
Write-Host "✅ Removed $removedCount migration files" -ForegroundColor Green

# Keep only README.md
Write-Host ""
Write-Host "📝 Keeping README.md for reference" -ForegroundColor Cyan

# Update README.md
$readmePath = Join-Path $migrationsDir "README.md"
$newReadme = @"
# Database Migrations

## ⚠️ IMPORTANT: DO NOT USE INDIVIDUAL MIGRATION FILES

All database migrations have been consolidated into a single comprehensive reset script:

**Location:** ``scripts/reset-and-recreate-database.sql``

## Why?

Running multiple migration files in different orders caused database corruption and conflicts. The single reset script ensures:
- ✅ Consistent database state
- ✅ All tables created in correct order
- ✅ All functions, triggers, and indexes properly set up
- ✅ No conflicts or duplicate definitions
- ✅ Fresh password hashes for admin and test users

## How to Reset Database

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of ``scripts/reset-and-recreate-database.sql``
3. Paste into SQL Editor
4. Click **RUN**
5. Wait for completion

## What's Included

The reset script includes:
- 24 tables with proper relationships
- 9 RPC functions (including the critical ``apply_payouts_and_update_bets`` fix)
- 11 triggers for auto-updates
- 50+ performance indexes
- Default game settings
- Admin accounts (admin/admin123)
- Test player accounts (9876543210/player123)

## Critical Fix

The reset script includes the fix for the ``apply_payouts_and_update_bets`` function that was causing:
- User statistics showing 0 winnings
- Game history showing 0 payouts
- Win/loss results being reversed

## Backup

Old migration files have been backed up to:
``.backup-migrations-YYYY-MM-DD-HHMMSS/``

## Documentation

See ``DATABASE_RESET_INSTRUCTIONS.md`` for detailed instructions.
"@

Set-Content -Path $readmePath -Value $newReadme -Force
Write-Host "✅ Updated README.md" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  • Backed up $removedCount files to: $backupDir" -ForegroundColor White
Write-Host "  • Removed $removedCount old migration files" -ForegroundColor White
Write-Host "  • Updated README.md with new instructions" -ForegroundColor White
Write-Host ""
Write-Host "✅ Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run scripts/reset-and-recreate-database.sql in Supabase" -ForegroundColor White
Write-Host "  2. Test admin login (admin/admin123)" -ForegroundColor White
Write-Host "  3. Test player login (9876543210/player123)" -ForegroundColor White
Write-Host "  4. Complete a test game to verify payouts work" -ForegroundColor White
Write-Host ""

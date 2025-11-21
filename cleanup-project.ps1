# Project Cleanup Script for Windows PowerShell
# This script archives unnecessary files and cleans up the project

Write-Host "Starting Project Cleanup..." -ForegroundColor Green

# 1. Create archive directories
Write-Host "Creating archive directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "archive/docs" | Out-Null
New-Item -ItemType Directory -Force -Path "archive/scripts/fixes" | Out-Null
New-Item -ItemType Directory -Force -Path "archive/scripts/diagnostics" | Out-Null
New-Item -ItemType Directory -Force -Path "archive/scripts/tests" | Out-Null
New-Item -ItemType Directory -Force -Path "archive/scripts/cleanup" | Out-Null
New-Item -ItemType Directory -Force -Path "archive/nginx" | Out-Null
New-Item -ItemType Directory -Force -Path "archive/data" | Out-Null

# 2. Move documentation files
Write-Host "Archiving documentation files..." -ForegroundColor Yellow
$docFiles = @(
    "BALANCED_STREAMING_CONFIG_FINAL.md",
    "BETTING_PERFORMANCE_OPTIMIZATION_COMPLETE.md",
    "IMPLEMENTATION_COMPLETE.txt",
    "INSTANT_BETTING_FIX_COMPLETE.md",
    "MOBILE_BETTING_OPTIMIZATION_COMPLETE.md",
    "OBS_QUICK_SETUP.txt",
    "OBS_TO_FRONTEND_LATENCY_BREAKDOWN.md",
    "OVENMEDIAENGINE_ULTRA_LOW_LATENCY_GUIDE.md",
    "ROCK_SOLID_STREAMING_FIX_COMPLETE.md",
    "STREAM_LATENCY_OPTIMIZATION_COMPLETE.md",
    "ULTRA_FAST_BET_DISPLAY_COMPLETE.md",
    "WEBSOCKET_BROADCAST_OPTIMIZATION_COMPLETE.md"
)

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Move-Item $file "archive/docs/" -Force
        Write-Host "  Moved $file" -ForegroundColor Gray
    }
}

# 3. Move nginx config files
Write-Host "Archiving nginx config files..." -ForegroundColor Yellow
$nginxFiles = @(
    "NGINX_CONFIG_andar-bahar_COMPLETE.conf",
    "NGINX_CONFIG_andar-bahar_FIXED.conf",
    "NGINX_CONFIG_nginx.conf_ADDITIONS.txt",
    "NGINX_CONFIG_nginx.conf_COMPLETE.conf",
    "NGINX_CONFIG_WORKING_WITH_CACHE.conf",
    "NGINX_FIX_LOGIN_ISSUE.conf",
    "nginx-stream-cache.conf"
)

foreach ($file in $nginxFiles) {
    if (Test-Path $file) {
        Move-Item $file "archive/nginx/" -Force
        Write-Host "  Moved $file" -ForegroundColor Gray
    }
}

# 4. Move temporary data files from root
Write-Host "Archiving temporary data files..." -ForegroundColor Yellow
$dataFiles = @(
    "DATABASE_OPERATIONS_AUDIT.json",
    "game_settings_rows.csv",
    "STORAGE_ANALYTICS_TRANSFORMATION_PATCH.ts"
)

foreach ($file in $dataFiles) {
    if (Test-Path $file) {
        Move-Item $file "archive/data/" -Force
        Write-Host "  Moved $file" -ForegroundColor Gray
    }
}

# 5. Remove duplicate root files
Write-Host "Removing duplicate root files..." -ForegroundColor Yellow
$duplicateFiles = @(
    "find-claim-bonus.cjs",
    "find-claim-bonus.js"
)

foreach ($file in $duplicateFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Deleted $file" -ForegroundColor Gray
    }
}

# 6. Move fix scripts from scripts/
Write-Host "Archiving fix scripts..." -ForegroundColor Yellow
$fixScripts = @(
    "scripts/apply-bonus-migration.cjs",
    "scripts/apply-payout-fix.ps1",
    "scripts/apply-payout-function-fix.ps1",
    "scripts/apply-simplified-payout-fix.js",
    "scripts/backfill-game-statistics.sql",
    "scripts/cleanup-corrupted-analytics.sql",
    "scripts/database-verification-and-fixes.sql",
    "scripts/fix-admin-password.js",
    "scripts/fix-all.ps1",
    "scripts/fix-analytics-dashboard.sql",
    "scripts/fix-bonus-unlock.sql",
    "scripts/fix-duplicate-functions.sql",
    "scripts/fix-game-history-missing.sql",
    "scripts/fix-game-history-schema-simple.sql",
    "scripts/fix-game-history-schema.sql",
    "scripts/fix-game-statistics-table.sql",
    "scripts/fix-login-issues.js",
    "scripts/fix-missing-bonus-records.sql",
    "scripts/fix-payout-rpc-function.sql",
    "scripts/fix-payout-system-simplified.sql",
    "scripts/fix-pending-bonus-status.sql",
    "scripts/fix-round-payouts-backfill.sql",
    "scripts/fix-transaction-history.sql",
    "scripts/fix-user-statistics.sql",
    "scripts/FIX_EVERYTHING.sql",
    "scripts/FIX_PLAYER_STATS_AND_GAME_HISTORY.sql",
    "scripts/FIX_RPC_TYPE_MISMATCH.sql",
    "scripts/MASTER_FIX_DATABASE.sql",
    "scripts/MASTER-SETUP-ALL-TRIGGERS.sql",
    "scripts/QUICK_FIX_GAME_HISTORY.sql"
)

foreach ($file in $fixScripts) {
    if (Test-Path $file) {
        Move-Item $file "archive/scripts/fixes/" -Force
        $filename = Split-Path $file -Leaf
        Write-Host "  Moved $filename" -ForegroundColor Gray
    }
}

# 7. Move diagnostic scripts
Write-Host "Archiving diagnostic scripts..." -ForegroundColor Yellow
$diagnosticScripts = @(
    "scripts/analyze-database-operations.js",
    "scripts/analyze-and-prepare-cleanup.js",
    "scripts/check-all-issues.ps1",
    "scripts/check-bonus-creation-on-approval.sql",
    "scripts/check-database.sql",
    "scripts/check-user-stats.ps1",
    "scripts/debug-admin-user.js",
    "scripts/debug-stream-settings.cjs",
    "scripts/debug-user-stats.sql",
    "scripts/diagnose-game-history.sql",
    "scripts/diagnose-latency.ps1",
    "scripts/diagnose-login-issue.js",
    "scripts/diagnose-missing-payouts.sql",
    "scripts/diagnose-stream.ps1",
    "scripts/diagnose-supabase-connection.js",
    "scripts/DIAGNOSE_GAME_HISTORY_ISSUE.sql",
    "scripts/verify-all-fixes.sql",
    "scripts/verify-data-integrity.sql",
    "scripts/verify-fix-status.sql",
    "scripts/verify-game-history-fix.ps1",
    "scripts/verify-statistics-saving.sql"
)

foreach ($file in $diagnosticScripts) {
    if (Test-Path $file) {
        Move-Item $file "archive/scripts/diagnostics/" -Force
        $filename = Split-Path $file -Leaf
        Write-Host "  Moved $filename" -ForegroundColor Gray
    }
}

# 8. Move test scripts
Write-Host "Archiving test scripts..." -ForegroundColor Yellow
$testScripts = @(
    "scripts/test-admin-payments-fix.ps1",
    "scripts/test-bonus-endpoints.js",
    "scripts/test-bonus-system.cjs",
    "scripts/test-bonus-system.js",
    "scripts/test-bonus-system.ps1",
    "scripts/test-connection.js",
    "scripts/test-db-connection.js",
    "scripts/test-dependencies.js",
    "scripts/test-game-history.sql",
    "scripts/test-login-signup.js",
    "scripts/test-password.js",
    "scripts/test-passwords.ts",
    "scripts/test-simplified-payout.js",
    "scripts/test-stream-api.ps1",
    "scripts/test-stream-fix.ps1"
)

foreach ($file in $testScripts) {
    if (Test-Path $file) {
        Move-Item $file "archive/scripts/tests/" -Force
        $filename = Split-Path $file -Leaf
        Write-Host "  Moved $filename" -ForegroundColor Gray
    }
}

# 9. Move cleanup meta-scripts
Write-Host "Archiving cleanup scripts..." -ForegroundColor Yellow
$cleanupScripts = @(
    "scripts/cleanup-all.sh",
    "scripts/cleanup-database.js",
    "scripts/cleanup-docs.js",
    "scripts/cleanup-old-migrations.ps1",
    "scripts/delete-additional-unused.js",
    "scripts/delete-unused-files.js"
)

foreach ($file in $cleanupScripts) {
    if (Test-Path $file) {
        Move-Item $file "archive/scripts/cleanup/" -Force
        $filename = Split-Path $file -Leaf
        Write-Host "  Moved $filename" -ForegroundColor Gray
    }
}

# 10. Move temporary data files from scripts/
Write-Host "Archiving scripts data files..." -ForegroundColor Yellow
$scriptsDataFiles = @(
    "scripts/complete-database-schema.json",
    "scripts/database-analysis.json",
    "scripts/database-structure.json"
)

foreach ($file in $scriptsDataFiles) {
    if (Test-Path $file) {
        Move-Item $file "archive/data/" -Force
        $filename = Split-Path $file -Leaf
        Write-Host "  Moved $filename" -ForegroundColor Gray
    }
}

# 11. Move duplicate admin/password scripts
Write-Host "Archiving duplicate admin scripts..." -ForegroundColor Yellow
$adminScripts = @(
    "scripts/check-admin-credentials.cjs",
    "scripts/check-admin-credentials.js",
    "scripts/create-admin-final.js",
    "scripts/create-admin-fixed.js",
    "scripts/generate-admin-hashes.js",
    "scripts/generate-all-hashes.js",
    "scripts/generate-hashes.js",
    "scripts/generate-password-hashes.js",
    "scripts/generate-test-user-password.js",
    "scripts/reset-admin-password.js",
    "scripts/reset-admin-password.ts",
    "scripts/update-admin-role.js",
    "scripts/update-all-admin-passwords.js",
    "scripts/update-all-test-user-passwords.js",
    "scripts/update-password-hashes.sql"
)

foreach ($file in $adminScripts) {
    if (Test-Path $file) {
        Move-Item $file "archive/scripts/fixes/" -Force
        $filename = Split-Path $file -Leaf
        Write-Host "  Moved $filename" -ForegroundColor Gray
    }
}

# 12. Move deployment/streaming scripts
Write-Host "Archiving deployment scripts..." -ForegroundColor Yellow
$deployScripts = @(
    "scripts/configure-restream.ts",
    "scripts/deploy-stream-fix.ps1",
    "scripts/deploy-stream-fix.sh",
    "scripts/deploy-ultra-low-latency.ps1",
    "scripts/update-stream-settings.js"
)

foreach ($file in $deployScripts) {
    if (Test-Path $file) {
        Move-Item $file "archive/scripts/fixes/" -Force
        $filename = Split-Path $file -Leaf
        Write-Host "  Moved $filename" -ForegroundColor Gray
    }
}

# 13. Move schema fetch scripts
Write-Host "Archiving schema fetch scripts..." -ForegroundColor Yellow
$schemaScripts = @(
    "scripts/fetch-all-database-details.sql",
    "scripts/fetch-complete-schema.js",
    "scripts/fetch-database-details.js",
    "scripts/fetch-database-details.sql",
    "scripts/fetch-schema-with-pg.js"
)

foreach ($file in $schemaScripts) {
    if (Test-Path $file) {
        Move-Item $file "archive/scripts/diagnostics/" -Force
        $filename = Split-Path $file -Leaf
        Write-Host "  Moved $filename" -ForegroundColor Gray
    }
}

# Summary
Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - Documentation files moved to archive/docs/" -ForegroundColor Gray
Write-Host "  - Nginx configs moved to archive/nginx/" -ForegroundColor Gray
Write-Host "  - Fix scripts moved to archive/scripts/fixes/" -ForegroundColor Gray
Write-Host "  - Diagnostic scripts moved to archive/scripts/diagnostics/" -ForegroundColor Gray
Write-Host "  - Test scripts moved to archive/scripts/tests/" -ForegroundColor Gray
Write-Host "  - Data files moved to archive/data/" -ForegroundColor Gray
Write-Host ""
Write-Host "Review archive/ directory before permanent deletion" -ForegroundColor Yellow
Write-Host "To permanently delete: Remove-Item archive -Recurse -Force" -ForegroundColor Yellow
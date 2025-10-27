# Repository Cleanup Script
# This script moves all temporary documentation files to the docs folder
# and removes obsolete test files

Write-Host "🧹 Starting repository cleanup..." -ForegroundColor Cyan

# Create docs/archive folder if it doesn't exist
$archiveDir = "docs\archive"
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Host "✅ Created $archiveDir" -ForegroundColor Green
}

# List of temporary markdown files to move to archive
$tempDocs = @(
    "ADMIN_PLAYER_ACCESS_FIX.md",
    "AUTHENTICATION_FIXES_COMPLETE.md",
    "COMPREHENSIVE_AUDIT_AND_FIXES.md",
    "CRITICAL_FIXES_APPLIED.md",
    "CRITICAL_SECURITY_FIXES.md",
    "DEEP_ANALYSIS_PART1.md",
    "DEEP_ANALYSIS_PART2.md",
    "DUAL_STREAMING_IMPLEMENTATION_COMPLETE.md",
    "DUAL_STREAMING_NOW_WORKING.md",
    "DUAL_STREAMING_QUICK_START.md",
    "EMERGENCY_FIX_DEPLOY.md",
    "FIXES_APPLIED.md",
    "FIX_NOW.md",
    "STREAMING_IMPLEMENTATION_ANALYSIS.md",
    "USER_MANAGEMENT_FIX.md"
)

# Move temporary docs to archive
foreach ($doc in $tempDocs) {
    if (Test-Path $doc) {
        Move-Item -Path $doc -Destination $archiveDir -Force
        Write-Host "📦 Moved $doc to archive" -ForegroundColor Yellow
    }
}

# List of obsolete test files to remove
$obsoleteFiles = @(
    "test-supabase.js",
    "test-password.js",
    "create-admin.js"
)

# Remove obsolete files
foreach ($file in $obsoleteFiles) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "🗑️  Removed obsolete file: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Repository cleanup complete!" -ForegroundColor Green
Write-Host "   - Temporary docs moved to docs/archive/" -ForegroundColor Gray
Write-Host "   - Obsolete test files removed" -ForegroundColor Gray

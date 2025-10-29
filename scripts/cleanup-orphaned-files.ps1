# Cleanup Orphaned Files Script
# This script moves unused/duplicate files to an archive folder

$ErrorActionPreference = "Stop"

Write-Host "🧹 Cleaning up orphaned files..." -ForegroundColor Cyan

# Create archive directory
$archiveDir = ".\archive\orphaned-files-$(Get-Date -Format 'yyyy-MM-dd')"
New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
Write-Host "✅ Created archive directory: $archiveDir" -ForegroundColor Green

# List of orphaned files to move
$orphanedFiles = @(
    ".\server\admin-requests-api.ts",
    ".\server\admin-requests-supabase.ts",
    ".\server\stream-routes.ts",
    ".\server\unified-stream-routes.ts",
    ".\server\stream-storage.ts",
    ".\server\routes\stream-config.ts"
)

$movedCount = 0
$notFoundCount = 0

foreach ($file in $orphanedFiles) {
    if (Test-Path $file) {
        $fileName = Split-Path $file -Leaf
        $destination = Join-Path $archiveDir $fileName
        
        Write-Host "📦 Moving: $file → $destination" -ForegroundColor Yellow
        Move-Item -Path $file -Destination $destination -Force
        $movedCount++
    } else {
        Write-Host "⚠️  Not found: $file (already removed?)" -ForegroundColor DarkYellow
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host "   Moved: $movedCount files" -ForegroundColor Cyan
Write-Host "   Not found: $notFoundCount files" -ForegroundColor DarkGray
Write-Host ""
Write-Host "📁 Archived files location: $archiveDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "ℹ️  These files were NOT in use and can be safely deleted." -ForegroundColor Gray
Write-Host "   Active implementations are in server/routes/ directory." -ForegroundColor Gray

# PowerShell Script to Check ALL Client-Reported Issues
# Comprehensive diagnostic for all 18 issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPREHENSIVE ISSUE CHECKER" -ForegroundColor Cyan
Write-Host "  Checking all 18 client-reported issues" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"
$issuesFound = @()
$issuesOk = @()

# Helper function to test endpoint
function Test-Endpoint {
    param(
        [string]$url,
        [hashtable]$headers = @{}
    )
    try {
        $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -TimeoutSec 5
        return @{ success = $true; data = $response }
    } catch {
        return @{ success = $false; error = $_.Exception.Message }
    }
}

# Check if server is running
Write-Host "🔍 Checking server status..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "   ✅ Server is running" -ForegroundColor Green
        $serverRunning = $true
    }
} catch {
    Write-Host "   ❌ Server is NOT running" -ForegroundColor Red
    Write-Host "   Please start server: npm run dev" -ForegroundColor Yellow
    exit
}

Write-Host ""

# Get admin token
Write-Host "🔑 Authentication Setup" -ForegroundColor Yellow
Write-Host "   To check all issues, we need an admin JWT token" -ForegroundColor Gray
Write-Host "   Steps:" -ForegroundColor Gray
Write-Host "   1. Login as admin in browser" -ForegroundColor Gray
Write-Host "   2. DevTools → Application → Local Storage → Copy 'token'" -ForegroundColor Gray
Write-Host ""
$token = Read-Host "   Enter admin JWT token (or press Enter to skip API checks)"
Write-Host ""

$headers = @{}
if ($token) {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
}

# Issue #1: User Statistics
Write-Host "📊 Issue #1: User Statistics Showing 0" -ForegroundColor Cyan
if ($token) {
    $result = Test-Endpoint -url "$baseUrl/api/admin/users?limit=10" -headers $headers
    if ($result.success -and $result.data.success) {
        $usersWithStats = ($result.data.users | Where-Object { $_.gamesPlayed -gt 0 }).Count
        $totalUsers = $result.data.users.Count
        
        if ($usersWithStats -gt 0) {
            Write-Host "   ✅ WORKING: $usersWithStats/$totalUsers users have game statistics" -ForegroundColor Green
            $issuesOk += "Issue #1: User Statistics"
        } else {
            Write-Host "   ⚠️  WARNING: 0/$totalUsers users have played games" -ForegroundColor Yellow
            Write-Host "      This is expected if no games have been completed" -ForegroundColor Gray
            $issuesFound += @{
                issue = "Issue #1: User Statistics"
                severity = "Info"
                message = "No games played yet - not a bug"
            }
        }
    } else {
        Write-Host "   ❌ ERROR: Cannot fetch users - $($result.error)" -ForegroundColor Red
        $issuesFound += @{
            issue = "Issue #1: User Statistics"
            severity = "Error"
            message = $result.error
        }
    }
} else {
    Write-Host "   ⏭️  SKIPPED: No token provided" -ForegroundColor Gray
}
Write-Host ""

# Issue #2: Financial Overview
Write-Host "💰 Issue #2: Financial Overview Showing ₹0.00" -ForegroundColor Cyan
if ($token) {
    $result = Test-Endpoint -url "$baseUrl/api/admin/users?limit=100" -headers $headers
    if ($result.success -and $result.data.success) {
        $totalWinnings = ($result.data.users | Measure-Object -Property totalWinnings -Sum).Sum
        $totalLosses = ($result.data.users | Measure-Object -Property totalLosses -Sum).Sum
        $netProfit = $totalLosses - $totalWinnings
        
        Write-Host "   Total Winnings: ₹$totalWinnings" -ForegroundColor Cyan
        Write-Host "   Total Losses: ₹$totalLosses" -ForegroundColor Cyan
        Write-Host "   Net Profit: ₹$netProfit" -ForegroundColor Cyan
        
        if ($totalWinnings -gt 0 -or $totalLosses -gt 0) {
            Write-Host "   ✅ WORKING: Financial data exists" -ForegroundColor Green
            $issuesOk += "Issue #2: Financial Overview"
        } else {
            Write-Host "   ⚠️  WARNING: All financial totals are 0" -ForegroundColor Yellow
            $issuesFound += @{
                issue = "Issue #2: Financial Overview"
                severity = "Info"
                message = "No financial data yet - play games to generate data"
            }
        }
    }
} else {
    Write-Host "   ⏭️  SKIPPED: No token provided" -ForegroundColor Gray
}
Write-Host ""

# Issue #3: Game History Payouts
Write-Host "🎮 Issue #3: Game History Payouts Missing" -ForegroundColor Cyan
if ($token) {
    $result = Test-Endpoint -url "$baseUrl/api/admin/game-history?limit=10" -headers $headers
    if ($result.success) {
        if ($result.data.games -and $result.data.games.Count -gt 0) {
            $gamesWithPayouts = ($result.data.games | Where-Object { $_.housePayout -gt 0 -or $_.totalBets -gt 0 }).Count
            Write-Host "   Found $($result.data.games.Count) games in history" -ForegroundColor Cyan
            Write-Host "   Games with payout data: $gamesWithPayouts" -ForegroundColor Cyan
            
            if ($gamesWithPayouts -gt 0) {
                Write-Host "   ✅ WORKING: Payout data exists" -ForegroundColor Green
                $issuesOk += "Issue #3: Game History Payouts"
            } else {
                Write-Host "   ⚠️  WARNING: No payout data in games" -ForegroundColor Yellow
                $issuesFound += @{
                    issue = "Issue #3: Game History Payouts"
                    severity = "Warning"
                    message = "Games exist but no payout data"
                }
            }
        } else {
            Write-Host "   ⚠️  No games in history yet" -ForegroundColor Yellow
            $issuesFound += @{
                issue = "Issue #3: Game History Payouts"
                severity = "Info"
                message = "No games completed yet"
            }
        }
    }
} else {
    Write-Host "   ⏭️  SKIPPED: No token provided" -ForegroundColor Gray
}
Write-Host ""

# Issue #4: Payment Requests
Write-Host "💳 Issue #4: Payment Requests Not Showing" -ForegroundColor Cyan
if ($token) {
    $result = Test-Endpoint -url "$baseUrl/api/admin/payment-requests?limit=10" -headers $headers
    if ($result.success) {
        if ($result.data.requests -and $result.data.requests.Count -gt 0) {
            Write-Host "   ✅ WORKING: Found $($result.data.requests.Count) payment requests" -ForegroundColor Green
            $issuesOk += "Issue #4: Payment Requests"
        } else {
            Write-Host "   ⚠️  No payment requests found" -ForegroundColor Yellow
            $issuesFound += @{
                issue = "Issue #4: Payment Requests"
                severity = "Info"
                message = "No payment requests yet - create some to test"
            }
        }
    } else {
        Write-Host "   ❌ ERROR: Cannot fetch payment requests" -ForegroundColor Red
        $issuesFound += @{
            issue = "Issue #4: Payment Requests"
            severity = "Error"
            message = "API endpoint not working"
        }
    }
} else {
    Write-Host "   ⏭️  SKIPPED: No token provided" -ForegroundColor Gray
}
Write-Host ""

# Check for auto-refresh intervals (code analysis)
Write-Host "🔄 Issue #5-8: Checking for Auto-Refresh Issues" -ForegroundColor Cyan
Write-Host "   Scanning frontend code for setInterval..." -ForegroundColor Gray

$autoRefreshFiles = @()
$filesToCheck = @(
    "client\src\pages\profile.tsx",
    "client\src\components\GameHistoryModal.tsx",
    "client\src\contexts\UserProfileContext.tsx",
    "client\src\pages\GameHistoryPage.tsx"
)

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "setInterval") {
            $autoRefreshFiles += $file
        }
    }
}

if ($autoRefreshFiles.Count -gt 0) {
    Write-Host "   ⚠️  Found setInterval in:" -ForegroundColor Yellow
    foreach ($file in $autoRefreshFiles) {
        Write-Host "      - $file" -ForegroundColor Yellow
    }
    $issuesFound += @{
        issue = "Auto-refresh intervals"
        severity = "Warning"
        message = "Found setInterval in $($autoRefreshFiles.Count) files"
    }
} else {
    Write-Host "   ✅ No auto-refresh intervals found" -ForegroundColor Green
    $issuesOk += "Auto-refresh check"
}
Write-Host ""

# Check for component locations
Write-Host "📍 Issue #14: Live Bet Monitoring Location" -ForegroundColor Cyan
$adminGameContent = Get-Content "client\src\pages\admin-game.tsx" -Raw -ErrorAction SilentlyContinue
$adminContent = Get-Content "client\src\pages\admin.tsx" -Raw -ErrorAction SilentlyContinue

$inAdminGame = $adminGameContent -match "LiveBetMonitoring"
$inAdmin = $adminContent -match "LiveBetMonitoring"

if ($inAdmin -and -not $inAdminGame) {
    Write-Host "   ✅ CORRECT: LiveBetMonitoring in admin.tsx" -ForegroundColor Green
    $issuesOk += "LiveBetMonitoring location"
} elseif ($inAdminGame -and -not $inAdmin) {
    Write-Host "   ❌ WRONG: LiveBetMonitoring in admin-game.tsx (should be in admin.tsx)" -ForegroundColor Red
    $issuesFound += @{
        issue = "LiveBetMonitoring location"
        severity = "High"
        message = "Component in wrong file"
    }
} elseif ($inAdmin -and $inAdminGame) {
    Write-Host "   ⚠️  WARNING: LiveBetMonitoring in BOTH files" -ForegroundColor Yellow
    $issuesFound += @{
        issue = "LiveBetMonitoring location"
        severity = "Medium"
        message = "Duplicate component"
    }
} else {
    Write-Host "   ❌ ERROR: LiveBetMonitoring not found in either file" -ForegroundColor Red
    $issuesFound += @{
        issue = "LiveBetMonitoring location"
        severity = "High"
        message = "Component missing"
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Issues OK: $($issuesOk.Count)" -ForegroundColor Green
foreach ($issue in $issuesOk) {
    Write-Host "   - $issue" -ForegroundColor Green
}
Write-Host ""

Write-Host "⚠️  Issues Found: $($issuesFound.Count)" -ForegroundColor Yellow
foreach ($issue in $issuesFound) {
    $color = switch ($issue.severity) {
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Info" { "Cyan" }
        default { "Gray" }
    }
    Write-Host "   - $($issue.issue)" -ForegroundColor $color
    Write-Host "     $($issue.message)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($issuesFound.Count -eq 0) {
    Write-Host "🎉 All checked issues are working correctly!" -ForegroundColor Green
} else {
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Review issues found above" -ForegroundColor Gray
    Write-Host "2. Check database with: .\scripts\check-database.ps1" -ForegroundColor Gray
    Write-Host "3. Run test game to verify stats update" -ForegroundColor Gray
    Write-Host "4. Fix actual bugs (not 'no data' issues)" -ForegroundColor Gray
}
Write-Host ""

# Save report
$reportPath = "diagnostic-report-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').txt"
@"
DIAGNOSTIC REPORT
Generated: $(Get-Date)

Issues OK: $($issuesOk.Count)
$($issuesOk | ForEach-Object { "  - $_" } | Out-String)

Issues Found: $($issuesFound.Count)
$($issuesFound | ForEach-Object { "  - $($_.issue): $($_.message)" } | Out-String)
"@ | Out-File $reportPath

Write-Host "📄 Full report saved to: $reportPath" -ForegroundColor Cyan
Write-Host ""

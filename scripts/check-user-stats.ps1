# PowerShell Script to Check User Statistics Issue
# Run this to diagnose why user stats are showing 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  USER STATISTICS DIAGNOSTIC SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "1. Checking if server is running..." -ForegroundColor Yellow
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Server is running on port 5000" -ForegroundColor Green
        $serverRunning = $true
    }
} catch {
    Write-Host "   ❌ Server is NOT running on port 5000" -ForegroundColor Red
    Write-Host "   Please start the server first: npm run dev" -ForegroundColor Yellow
}

Write-Host ""

if ($serverRunning) {
    # Check admin users endpoint
    Write-Host "2. Checking /api/admin/users endpoint..." -ForegroundColor Yellow
    
    # You'll need to replace this with actual admin token
    Write-Host "   ⚠️  You need to provide admin JWT token" -ForegroundColor Yellow
    Write-Host "   Steps to get token:" -ForegroundColor Gray
    Write-Host "   1. Login as admin in browser" -ForegroundColor Gray
    Write-Host "   2. Open DevTools → Application → Local Storage" -ForegroundColor Gray
    Write-Host "   3. Copy 'token' value" -ForegroundColor Gray
    Write-Host "   4. Paste below when prompted" -ForegroundColor Gray
    Write-Host ""
    
    $token = Read-Host "   Enter admin JWT token (or press Enter to skip)"
    
    if ($token) {
        try {
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
            
            $response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/users?limit=5" -Method GET -Headers $headers
            
            if ($response.success) {
                Write-Host "   ✅ API endpoint working" -ForegroundColor Green
                Write-Host "   📊 Found $($response.total) total users" -ForegroundColor Cyan
                Write-Host ""
                
                if ($response.users.Count -gt 0) {
                    Write-Host "3. Analyzing user statistics..." -ForegroundColor Yellow
                    Write-Host ""
                    
                    $usersWithStats = 0
                    $usersWithoutStats = 0
                    
                    foreach ($user in $response.users) {
                        $hasStats = $user.gamesPlayed -gt 0
                        
                        if ($hasStats) {
                            $usersWithStats++
                            Write-Host "   ✅ User: $($user.fullName)" -ForegroundColor Green
                            Write-Host "      Phone: $($user.phone)" -ForegroundColor Gray
                            Write-Host "      Games Played: $($user.gamesPlayed)" -ForegroundColor Cyan
                            Write-Host "      Games Won: $($user.gamesWon)" -ForegroundColor Cyan
                            Write-Host "      Total Winnings: ₹$($user.totalWinnings)" -ForegroundColor Green
                            Write-Host "      Total Losses: ₹$($user.totalLosses)" -ForegroundColor Red
                        } else {
                            $usersWithoutStats++
                            Write-Host "   ⚠️  User: $($user.fullName)" -ForegroundColor Yellow
                            Write-Host "      Phone: $($user.phone)" -ForegroundColor Gray
                            Write-Host "      Games Played: 0 (No games played yet)" -ForegroundColor Yellow
                        }
                        Write-Host ""
                    }
                    
                    Write-Host "========================================" -ForegroundColor Cyan
                    Write-Host "  SUMMARY" -ForegroundColor Cyan
                    Write-Host "========================================" -ForegroundColor Cyan
                    Write-Host "Users with stats: $usersWithStats" -ForegroundColor Green
                    Write-Host "Users without stats: $usersWithoutStats" -ForegroundColor Yellow
                    Write-Host ""
                    
                    if ($usersWithStats -eq 0) {
                        Write-Host "🔍 DIAGNOSIS: No users have played games yet" -ForegroundColor Yellow
                        Write-Host "   This is NOT a bug - stats will update after games are completed" -ForegroundColor Cyan
                        Write-Host ""
                        Write-Host "✅ SOLUTION: Play some test games to verify stats update correctly" -ForegroundColor Green
                    } else {
                        Write-Host "✅ DIAGNOSIS: Stats are working correctly!" -ForegroundColor Green
                        Write-Host "   Some users have game statistics" -ForegroundColor Cyan
                        Write-Host ""
                        Write-Host "💡 If admin panel shows 0, try:" -ForegroundColor Yellow
                        Write-Host "   1. Hard refresh browser (Ctrl+Shift+R)" -ForegroundColor Gray
                        Write-Host "   2. Clear browser cache" -ForegroundColor Gray
                        Write-Host "   3. Check if filtering/searching users" -ForegroundColor Gray
                    }
                } else {
                    Write-Host "   ⚠️  No users found in database" -ForegroundColor Yellow
                }
            } else {
                Write-Host "   ❌ API returned error: $($response.error)" -ForegroundColor Red
            }
        } catch {
            Write-Host "   ❌ Error calling API: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "   ⏭️  Skipped API check (no token provided)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Check database directly with check-database.ps1" -ForegroundColor Yellow
Write-Host "2. Run a test game and verify stats update" -ForegroundColor Yellow
Write-Host "3. Check server logs for any errors" -ForegroundColor Yellow
Write-Host ""

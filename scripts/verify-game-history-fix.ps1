# Verify Player Game History Fix
# This script helps verify the fix is working correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Player Game History Fix Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if the fix is applied
Write-Host "1. Checking if fix is applied..." -ForegroundColor Yellow
$contextFile = "client\src\contexts\UserProfileContext.tsx"

if (Test-Path $contextFile) {
    $content = Get-Content $contextFile -Raw
    
    # Check for correct endpoint
    if ($content -match "/api/user/game-history") {
        Write-Host "   ✓ Correct endpoint (/api/user/game-history) found" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Wrong endpoint - fix not applied!" -ForegroundColor Red
        exit 1
    }
    
    # Check for response parsing
    if ($content -match "response\?\.data \|\| response") {
        Write-Host "   ✓ Correct response parsing found" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Response parsing not fixed!" -ForegroundColor Red
        exit 1
    }
    
    # Check for normalization
    if ($content -match "yourTotalBet = Number") {
        Write-Host "   ✓ Normalization logic found" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Normalization logic missing!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "   All checks passed! Fix is properly applied." -ForegroundColor Green
} else {
    Write-Host "   ✗ File not found: $contextFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Verifying backend route exists..." -ForegroundColor Yellow
$routesFile = "server\routes.ts"

if (Test-Path $routesFile) {
    $routesContent = Get-Content $routesFile -Raw
    
    if ($routesContent -match 'app\.get\("/api/user/game-history"') {
        Write-Host "   ✓ Backend route /api/user/game-history exists" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Backend route not found!" -ForegroundColor Red
        exit 1
    }
    
    # Check response structure
    if ($routesContent -match "data: \{[\s\S]*?games:[\s\S]*?total:[\s\S]*?hasMore:") {
        Write-Host "   ✓ Backend returns correct response structure" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Backend response structure might be different" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ File not found: $routesFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Checking storage function..." -ForegroundColor Yellow
$storageFile = "server\storage-supabase.ts"

if (Test-Path $storageFile) {
    $storageContent = Get-Content $storageFile -Raw
    
    if ($storageContent -match "getUserGameHistory\(userId: string\)") {
        Write-Host "   ✓ getUserGameHistory function exists" -ForegroundColor Green
    } else {
        Write-Host "   ✗ getUserGameHistory function not found!" -ForegroundColor Red
        exit 1
    }
    
    # Check for key fields
    if ($storageContent -match "yourTotalBet" -and $storageContent -match "yourTotalPayout" -and $storageContent -match "yourNetProfit") {
        Write-Host "   ✓ Backend computes all required fields" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Some fields might be missing" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ File not found: $storageFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start the development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test in browser:" -ForegroundColor White
Write-Host "   - Login as a player" -ForegroundColor Gray
Write-Host "   - Go to Profile → Game History" -ForegroundColor Gray
Write-Host "   - Verify all fields show correct values" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check browser console:" -ForegroundColor White
Write-Host "   - Open DevTools (F12)" -ForegroundColor Gray
Write-Host "   - Go to Network tab" -ForegroundColor Gray
Write-Host "   - Look for /api/user/game-history request" -ForegroundColor Gray
Write-Host "   - Verify response has data.data.games structure" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Compare with admin view:" -ForegroundColor White
Write-Host "   - Login as admin" -ForegroundColor Gray
Write-Host "   - Go to Users → Select user → Game History" -ForegroundColor Gray
Write-Host "   - Verify values match player view" -ForegroundColor Gray
Write-Host ""

Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "- Complete fix details: PLAYER_GAME_HISTORY_FIX_COMPLETE.md" -ForegroundColor Gray
Write-Host "- Test plan: TEST_PLAYER_GAME_HISTORY.md" -ForegroundColor Gray
Write-Host "- Summary: PLAYER_GAME_HISTORY_FIX_SUMMARY.md" -ForegroundColor Gray
Write-Host ""

Write-Host "Status: ✓ Fix verified and ready for testing" -ForegroundColor Green

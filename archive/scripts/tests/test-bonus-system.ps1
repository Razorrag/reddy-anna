# ============================================
# BONUS & REFERRAL SYSTEM TEST SCRIPT
# ============================================
# Tests all bonus and referral endpoints

param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$Token = ""
)

Write-Host "🎁 BONUS & REFERRAL SYSTEM TEST" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "❌ ERROR: Token required!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\test-bonus-system.ps1 -Token 'YOUR_JWT_TOKEN'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get your token:" -ForegroundColor Yellow
    Write-Host "  1. Login to the app" -ForegroundColor Yellow
    Write-Host "  2. Open browser console (F12)" -ForegroundColor Yellow
    Write-Host "  3. Run: localStorage.getItem('token')" -ForegroundColor Yellow
    Write-Host "  4. Copy the token value" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

# Test 1: Bonus Summary
Write-Host "📊 Test 1: Bonus Summary" -ForegroundColor Yellow
Write-Host "Endpoint: GET /api/user/bonus-summary" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/user/bonus-summary" -Headers $headers -Method Get
    if ($response.success) {
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Available Bonus: ₹$($response.data.totals.available)" -ForegroundColor Cyan
        Write-Host "Credited Bonus: ₹$($response.data.totals.credited)" -ForegroundColor Cyan
        Write-Host "Lifetime Bonus: ₹$($response.data.totals.lifetime)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Deposit Bonuses:" -ForegroundColor Magenta
        Write-Host "  Unlocked: ₹$($response.data.depositBonuses.unlocked)" -ForegroundColor White
        Write-Host "  Locked: ₹$($response.data.depositBonuses.locked)" -ForegroundColor White
        Write-Host "  Credited: ₹$($response.data.depositBonuses.credited)" -ForegroundColor White
        Write-Host ""
        Write-Host "Referral Bonuses:" -ForegroundColor Magenta
        Write-Host "  Pending: ₹$($response.data.referralBonuses.pending)" -ForegroundColor White
        Write-Host "  Credited: ₹$($response.data.referralBonuses.credited)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

# Test 2: Referral Data
Write-Host "🔗 Test 2: Referral Data" -ForegroundColor Yellow
Write-Host "Endpoint: GET /api/user/referral-data" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/user/referral-data" -Headers $headers -Method Get
    if ($response.success) {
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Your Referral Code: $($response.data.referralCode)" -ForegroundColor Cyan
        Write-Host "Total Referrals: $($response.data.totalReferrals)" -ForegroundColor Cyan
        Write-Host "Total Earnings: ₹$($response.data.totalReferralEarnings)" -ForegroundColor Cyan
        
        if ($response.data.referredUsers.Count -gt 0) {
            Write-Host ""
            Write-Host "Referred Users:" -ForegroundColor Magenta
            foreach ($user in $response.data.referredUsers) {
                Write-Host "  - $($user.fullName) ($($user.phone))" -ForegroundColor White
                Write-Host "    Deposited: $($user.hasDeposited)" -ForegroundColor White
                Write-Host "    Bonus Earned: ₹$($user.bonusEarned)" -ForegroundColor White
                Write-Host "    Status: $($user.bonusStatus)" -ForegroundColor White
            }
        } else {
            Write-Host ""
            Write-Host "No referred users yet" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ FAILED: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

# Test 3: Deposit Bonuses
Write-Host "💰 Test 3: Deposit Bonuses" -ForegroundColor Yellow
Write-Host "Endpoint: GET /api/user/deposit-bonuses" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/user/deposit-bonuses" -Headers $headers -Method Get
    if ($response.success) {
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Total Deposit Bonuses: $($response.data.Count)" -ForegroundColor Cyan
        
        if ($response.data.Count -gt 0) {
            Write-Host ""
            foreach ($bonus in $response.data) {
                Write-Host "Bonus ID: $($bonus.id)" -ForegroundColor Magenta
                Write-Host "  Deposit: ₹$($bonus.depositAmount)" -ForegroundColor White
                Write-Host "  Bonus: ₹$($bonus.bonusAmount) ($($bonus.bonusPercentage)%)" -ForegroundColor White
                Write-Host "  Status: $($bonus.status)" -ForegroundColor White
                Write-Host "  Wagering: $($bonus.wageringCompleted) / $($bonus.wageringRequired)" -ForegroundColor White
                $progress = if ($bonus.wageringRequired -gt 0) { 
                    [math]::Round(($bonus.wageringCompleted / $bonus.wageringRequired) * 100, 2) 
                } else { 0 }
                Write-Host "  Progress: $progress%" -ForegroundColor White
                Write-Host ""
            }
        } else {
            Write-Host ""
            Write-Host "No deposit bonuses yet" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ FAILED: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

# Test 4: Referral Bonuses
Write-Host "🎁 Test 4: Referral Bonuses" -ForegroundColor Yellow
Write-Host "Endpoint: GET /api/user/referral-bonuses" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/user/referral-bonuses" -Headers $headers -Method Get
    if ($response.success) {
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Total Referral Bonuses: $($response.data.Count)" -ForegroundColor Cyan
        
        if ($response.data.Count -gt 0) {
            Write-Host ""
            foreach ($bonus in $response.data) {
                Write-Host "Bonus ID: $($bonus.id)" -ForegroundColor Magenta
                Write-Host "  Deposit: ₹$($bonus.depositAmount)" -ForegroundColor White
                Write-Host "  Bonus: ₹$($bonus.bonusAmount)" -ForegroundColor White
                Write-Host "  Status: $($bonus.status)" -ForegroundColor White
                Write-Host "  Created: $($bonus.createdAt)" -ForegroundColor White
                Write-Host ""
            }
        } else {
            Write-Host ""
            Write-Host "No referral bonuses yet" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ FAILED: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

# Test 5: Bonus Transactions
Write-Host "📜 Test 5: Bonus Transactions" -ForegroundColor Yellow
Write-Host "Endpoint: GET /api/user/bonus-transactions" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/user/bonus-transactions?limit=10" -Headers $headers -Method Get
    if ($response.success) {
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Total Transactions: $($response.data.Count)" -ForegroundColor Cyan
        
        if ($response.data.Count -gt 0) {
            Write-Host ""
            foreach ($tx in $response.data) {
                Write-Host "Transaction ID: $($tx.id)" -ForegroundColor Magenta
                Write-Host "  Type: $($tx.bonus_type)" -ForegroundColor White
                Write-Host "  Action: $($tx.action)" -ForegroundColor White
                Write-Host "  Amount: ₹$($tx.amount)" -ForegroundColor White
                Write-Host "  Description: $($tx.description)" -ForegroundColor White
                Write-Host "  Created: $($tx.created_at)" -ForegroundColor White
                Write-Host ""
            }
        } else {
            Write-Host ""
            Write-Host "No bonus transactions yet" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ FAILED: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "🎯 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All endpoints tested!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If all tests show '0' or 'No data', run VERIFY_BONUS_SYSTEM.sql" -ForegroundColor White
Write-Host "2. Check if deposits have been approved (bonuses created on approval)" -ForegroundColor White
Write-Host "3. Check if users signed up with referral codes" -ForegroundColor White
Write-Host "4. Verify database has actual bonus records" -ForegroundColor White
Write-Host ""
Write-Host "System is working if APIs return success=true!" -ForegroundColor Green
Write-Host ""

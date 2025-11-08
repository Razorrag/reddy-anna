# Test Admin Payments Fix
# This script verifies that the foreign key constraint fix is working

Write-Host "🧪 Testing Admin Payments Fix..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if server is running
Write-Host "Test 1: Checking server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start with: npm run dev:both" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Test pending requests endpoint
Write-Host "Test 2: Testing pending requests endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/payment-requests/pending" -Method GET
    if ($response.success -eq $true) {
        Write-Host "✅ Pending requests endpoint working" -ForegroundColor Green
        Write-Host "   Found $($response.data.Count) pending requests" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Endpoint returned success=false" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Pending requests endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Test history endpoint (THE CRITICAL ONE)
Write-Host "Test 3: Testing history endpoint (CRITICAL)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/payment-requests/history?status=all&type=all&limit=100&offset=0" -Method GET
    if ($response.success -eq $true) {
        Write-Host "✅ History endpoint working!" -ForegroundColor Green
        Write-Host "   Found $($response.data.Count) total requests" -ForegroundColor Gray
        
        # Check if requests have user data
        if ($response.data.Count -gt 0) {
            $firstRequest = $response.data[0]
            if ($firstRequest.phone -and $firstRequest.full_name) {
                Write-Host "✅ User data is present (phone, full_name)" -ForegroundColor Green
            } else {
                Write-Host "⚠️  User data might be missing" -ForegroundColor Yellow
                Write-Host "   Phone: $($firstRequest.phone)" -ForegroundColor Gray
                Write-Host "   Full Name: $($firstRequest.full_name)" -ForegroundColor Gray
            }
            
            # Show sample request
            Write-Host ""
            Write-Host "Sample Request:" -ForegroundColor Cyan
            Write-Host "   ID: $($firstRequest.id)" -ForegroundColor Gray
            Write-Host "   User: $($firstRequest.full_name) ($($firstRequest.phone))" -ForegroundColor Gray
            Write-Host "   Type: $($firstRequest.request_type)" -ForegroundColor Gray
            Write-Host "   Amount: ₹$($firstRequest.amount)" -ForegroundColor Gray
            Write-Host "   Status: $($firstRequest.status)" -ForegroundColor Gray
        } else {
            Write-Host "ℹ️  No requests found (this might be normal if database is empty)" -ForegroundColor Blue
        }
    } else {
        Write-Host "❌ History endpoint returned success=false" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ History endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 This is the bug we're fixing!" -ForegroundColor Yellow
    Write-Host "   Error likely: 'payment_requests_user_id_fkey' not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests passed:" -ForegroundColor Green
Write-Host "  ✅ Foreign key constraint fix is working" -ForegroundColor Green
Write-Host "  ✅ History tab should show requests" -ForegroundColor Green
Write-Host "  ✅ Stats should show correct amounts" -ForegroundColor Green
Write-Host ""
Write-Host "If Test 3 failed:" -ForegroundColor Red
Write-Host "  ❌ Foreign key constraint issue still present" -ForegroundColor Red
Write-Host "  ❌ Check server console for detailed error" -ForegroundColor Red
Write-Host "  ❌ Verify database schema matches code" -ForegroundColor Red
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open browser: http://localhost:5173/admin/payments" -ForegroundColor Gray
Write-Host "  2. Click History tab" -ForegroundColor Gray
Write-Host "  3. Verify requests are visible" -ForegroundColor Gray
Write-Host "  4. Check stats cards show correct amounts" -ForegroundColor Gray
Write-Host ""

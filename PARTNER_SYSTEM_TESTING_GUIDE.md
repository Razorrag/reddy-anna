# 🧪 Partner System - Complete Testing Guide

## Prerequisites

### 1. Run Database Migration
```sql
-- Execute this in Supabase SQL Editor
-- File: server/migrations/PARTNER_SYSTEM_SIMPLE.sql
```

This creates:
- `partners` table with `share_percentage` column
- `admin_partner_settings` table with default values
- Necessary indexes

### 2. Restart Server
```bash
npm run dev
```

### 3. Verify Tables Exist
```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('partners', 'admin_partner_settings');

-- Check partners table structure
\d partners

-- Check default settings
SELECT * FROM admin_partner_settings;
```

Expected output:
```
setting_key                | setting_value
--------------------------+---------------
default_share_percentage  | 50
require_admin_approval    | true
```

---

## 🧪 Test Scenarios

### Test 1: Partner Registration (Frontend)

**URL:** `http://localhost:5000/partner/signup`

**Steps:**
1. Open browser to `/partner/signup`
2. Fill in form:
   - Phone: `9876543210`
   - Password: `Test123!`
   - Confirm Password: `Test123!`
3. Click "Sign Up"

**Expected Result:**
- Success message: "Partner registration submitted. Awaiting admin approval."
- Status should be 'pending'
- No token returned (because not approved yet)

**Verify in Database:**
```sql
SELECT 
  id, 
  full_name, 
  phone_number, 
  status, 
  share_percentage 
FROM partners 
WHERE phone_number = '9876543210';
```

Expected output:
```
full_name              | phone_number | status  | share_percentage
-----------------------+-------------+---------+-----------------
Partner_9876543210     | 9876543210  | pending | 50.00
```

---

### Test 2: Admin View Pending Partners

**URL:** `http://localhost:5000/admin/partners`

**Steps:**
1. Login as admin
2. Navigate to `/admin/partners`
3. Check "Pending" stat card (should show 1)
4. Look for partner in table

**Expected Result:**
- Partner appears with:
  - Name: `Partner_9876543210`
  - Phone: `9876543210`
  - Status: Yellow "PENDING" badge
  - Share %: `50%` (clickable)
  - Actions: "Approve" and "Reject" buttons

**API Call:**
```bash
curl -X GET http://localhost:5000/api/admin/partners/stats/summary \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "total": 1,
    "pending": 1,
    "active": 0,
    "suspended": 0,
    "banned": 0
  }
}
```

---

### Test 3: Admin Set Share Percentage

**Still on:** `/admin/partners`

**Steps:**
1. Find the partner in table
2. Click on the `50%` in "Share %" column
3. Input box appears
4. Change to `30`
5. Click green checkmark button

**Expected Result:**
- Percentage updates to `30%`
- No error messages

**API Call (Behind the scenes):**
```bash
curl -X PUT http://localhost:5000/api/admin/partners/{PARTNER_ID}/share \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sharePercentage": 30}'
```

**Verify in Database:**
```sql
SELECT share_percentage FROM partners WHERE phone_number = '9876543210';
```

Expected: `30.00`

---

### Test 4: Admin Approve Partner

**Still on:** `/admin/partners`

**Steps:**
1. Find the partner (should still show as pending)
2. Click "Approve" button (green)
3. Confirm if dialog appears

**Expected Result:**
- Status badge changes to green "ACTIVE"
- "Approve"/"Reject" buttons disappear
- "Suspend" button appears

**API Call:**
```bash
curl -X PUT http://localhost:5000/api/admin/partners/{PARTNER_ID}/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

**Verify in Database:**
```sql
SELECT status, approved_at FROM partners WHERE phone_number = '9876543210';
```

Expected:
```
status | approved_at
-------+------------------------
active | 2025-01-26 20:00:00.000
```

---

### Test 5: Partner Login

**URL:** `http://localhost:5000/partner/login`

**Steps:**
1. Go to `/partner/login`
2. Enter:
   - Phone: `9876543210`
   - Password: `Test123!`
3. Click "Login"

**Expected Result:**
- Success! Redirected to `/partner/dashboard`
- JWT token stored in localStorage as `partner_token`
- Dashboard loads with partner's name

**API Call:**
```bash
curl -X POST http://localhost:5000/api/partner/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "Test123!"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "partner": {
    "id": "uuid-here",
    "full_name": "Partner_9876543210",
    "phone_number": "9876543210",
    "status": "active",
    "share_percentage": 30.00
  },
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

---

### Test 6: Partner Dashboard - View Share Percentage

**URL:** `http://localhost:5000/partner/dashboard`

**Steps:**
1. After login, you should be on dashboard
2. Look at header section

**Expected Result:**
- Header shows:
  - "Welcome, Partner_9876543210"
  - Purple badge with: "Your Share Percentage: 30%"
  - Small text: "All financial amounts shown are calculated at your share percentage"

**Screenshot location:** Header area with purple badge

---

### Test 7: Partner Dashboard - View Game History with Adjusted Amounts

**Still on:** `/partner/dashboard`

**Prerequisites:**
- Need at least one game in `game_statistics` table
- Need matching `game_sessions` record

**Steps:**
1. Look at game history table
2. Check financial values

**Expected Result:**
If admin sees:
- Total Bets: ₹10,000
- Andar Bet: ₹6,000
- Bahar Bet: ₹4,000
- Profit/Loss: +₹2,000

Partner (30% share) should see:
- Total Bets: ₹3,000.00 (30% of 10,000)
- Andar Bet: ₹1,800.00 (30% of 6,000)
- Bahar Bet: ₹1,200.00 (30% of 4,000)
- Profit/Loss: +₹600.00 (30% of 2,000)

**Cards should be unchanged:**
- Opening Card: Same as admin sees (e.g., ♠A)
- Winner: Same as admin sees (e.g., ANDAR)
- Winning Card: Same as admin sees (e.g., ♥K)

**API Call:**
```bash
curl -X GET "http://localhost:5000/api/partner/game-history?page=1&limit=20" \
  -H "Authorization: Bearer PARTNER_JWT_TOKEN"
```

---

### Test 8: Verify Share Percentage Calculations

**Manual Calculation Test:**

1. **Get actual game data from admin:**
```sql
SELECT 
  game_id,
  total_bets,
  andar_total_bet,
  bahar_total_bet,
  profit_loss,
  house_payout
FROM game_statistics
ORDER BY created_at DESC
LIMIT 1;
```

Example output:
```
game_id | total_bets | andar_total_bet | bahar_total_bet | profit_loss | house_payout
--------|------------|-----------------|-----------------|-------------|-------------
GAME_123| 50000.00   | 30000.00        | 20000.00        | 10000.00    | 40000.00
```

2. **Calculate expected partner view (30% share):**
```
total_bets = 50000 × 0.30 = 15000.00
andar_total_bet = 30000 × 0.30 = 9000.00
bahar_total_bet = 20000 × 0.30 = 6000.00
profit_loss = 10000 × 0.30 = 3000.00
house_payout = 40000 × 0.30 = 12000.00
```

3. **Verify partner dashboard shows these values**

4. **Check API response:**
```bash
curl -X GET "http://localhost:5000/api/partner/game-history?page=1&limit=1" \
  -H "Authorization: Bearer PARTNER_TOKEN" | jq '.data.games[0]'
```

Expected JSON:
```json
{
  "gameId": "GAME_123",
  "sharePercentage": 30,
  "totalBets": 15000.00,
  "andarTotalBet": 9000.00,
  "baharTotalBet": 6000.00,
  "profitLoss": 3000.00,
  "housePayout": 12000.00,
  "openingCard": "♠A",
  "winner": "andar",
  "winningCard": "♥K"
}
```

---

### Test 9: Admin Change Share Percentage (Live Test)

**Objective:** Verify partner sees updated percentage immediately

**Steps:**
1. Partner is logged in viewing dashboard (shows 30%)
2. Admin changes share to 45% in `/admin/partners`
3. Partner clicks "Refresh" button on dashboard
4. Partner's badge should update to 45%
5. Financial amounts should recalculate

**Before (30% share):**
- Total Bets: ₹15,000

**After (45% share):**
- Total Bets: ₹22,500 (same game, different percentage)

---

### Test 10: Test Different Share Percentages

**Scenarios to test:**

| Admin Sets | Partner Sees (if actual = ₹100,000) |
|-----------|--------------------------------------|
| 1%        | ₹1,000.00                           |
| 25%       | ₹25,000.00                          |
| 50%       | ₹50,000.00                          |
| 75%       | ₹75,000.00                          |
| 100%      | ₹100,000.00                         |

**Test each:**
1. Admin sets percentage
2. Partner refreshes dashboard
3. Verify calculations are correct

---

### Test 11: Multiple Partners with Different Percentages

**Setup:**
1. Register Partner A (phone: 9876543210) - Set 30% share
2. Register Partner B (phone: 9876543211) - Set 50% share
3. Register Partner C (phone: 9876543212) - Set 75% share

**Test:**
1. Same game shows different amounts to each partner
2. Partner A sees 30% of actual
3. Partner B sees 50% of actual
4. Partner C sees 75% of actual
5. All see same cards/game flow

---

### Test 12: Partner Cannot Access Other Partner Data

**Security Test:**

**Steps:**
1. Login as Partner A (30% share)
2. Try to access Partner B's data via API manipulation
3. Should be blocked

**API Test:**
```bash
# Partner A's token trying to access partners list
curl -X GET http://localhost:5000/api/admin/partners \
  -H "Authorization: Bearer PARTNER_A_TOKEN"
```

**Expected Result:**
- 403 Forbidden or 401 Unauthorized
- Message: "Admin access required" or similar

---

### Test 13: CSV Export with Adjusted Amounts

**On Partner Dashboard:**

**Steps:**
1. Partner is viewing game history
2. Click "Download" (CSV export) button
3. CSV file downloads

**Expected CSV Content:**
```csv
Date,Opening Card,Winner,Winning Card,Andar Bets,Bahar Bets,Total Bets,Payout,Profit/Loss
2025-01-26 14:30,♠A,ANDAR,♥K,9000,6000,15000,12000,3000
```

Note: All financial amounts should be at partner's share percentage (30%)

---

### Test 14: Partner Status Changes

**Test Suspend:**
1. Admin suspends active partner
2. Partner tries to login → Should fail with message
3. Partner already logged in → Next API call should fail

**Test Ban:**
1. Admin bans partner
2. Partner cannot login
3. Existing sessions invalidated

**Test Reactivate:**
1. Admin reactivates suspended partner
2. Partner can login again
3. Share percentage unchanged

---

## 🔍 Debugging Tips

### Issue: Share Percentage Not Showing in Admin

**Check:**
```sql
-- Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners' 
AND column_name = 'share_percentage';
```

**Check API response:**
```bash
curl -X GET "http://localhost:5000/api/admin/partners?page=1&limit=1" \
  -H "Authorization: Bearer ADMIN_TOKEN" | jq '.data.partners[0]'
```

Should include: `"sharePercentage": 50.00`

### Issue: Calculations Not Applied

**Check partner route:**
```bash
curl -X GET "http://localhost:5000/api/partner/game-history?page=1&limit=1" \
  -H "Authorization: Bearer PARTNER_TOKEN" | jq '.data.games[0]'
```

Should include: `"sharePercentage": 30`

**Verify backend code:**
- File: `server/routes/partner.ts`
- Line: ~170 (where sharePercentage is fetched)
- Line: ~230 (where multiplier is applied)

### Issue: Cards Showing as "-"

**Check game_sessions table:**
```sql
SELECT 
  gs.game_id,
  gs.opening_card,
  gs.winner,
  gs.winning_card,
  gst.game_id as stats_game_id
FROM game_sessions gs
LEFT JOIN game_statistics gst ON gs.game_id = gst.game_id
LIMIT 5;
```

**If NULL:** Game sessions not being populated during gameplay
**If game_id mismatch:** Format difference between tables

---

## ✅ Success Checklist

- [ ] Partner can register with phone + passwords only
- [ ] New partner has status 'pending'
- [ ] New partner gets default share percentage (50%)
- [ ] Admin sees pending partner in `/admin/partners`
- [ ] Admin can click share % and edit it (1-100)
- [ ] Admin can approve partner → status changes to 'active'
- [ ] Partner can login after approval
- [ ] Partner dashboard shows share percentage badge
- [ ] Partner sees game history with cards (unchanged)
- [ ] Partner sees financial amounts × share percentage
- [ ] Math is correct: if 30% share, all amounts are 30% of actual
- [ ] Different partners see different amounts based on their %
- [ ] Partner cannot access admin routes
- [ ] Partner cannot see other partners' data
- [ ] CSV export works with adjusted amounts
- [ ] Admin can change share % and partner sees update

---

## 🚨 Common Issues & Solutions

### 1. "Partner not found" on login
**Cause:** Status is still 'pending'
**Solution:** Admin must approve first

### 2. Share percentage shows as NaN or undefined
**Cause:** Database field mismatch
**Solution:** Check `server/routes/admin-partners.ts` line 65 uses `sharePercentage` not `commissionPercentage`

### 3. Amounts not adjusted
**Cause:** Share multiplier not applied in API
**Solution:** Check `server/routes/partner.ts` applies: `amount * sharePercentage / 100`

### 4. Admin page doesn't load partners
**Cause:** Route not registered
**Solution:** Check `server/routes.ts` has: `app.use("/api/admin/partners", adminPartnerRoutes)`

### 5. Partner routes return 401
**Cause:** Partner auth middleware not working
**Solution:** Check `/api/partner` prefix is bypassing player auth in `routes.ts`

---

*Last Updated: January 26, 2025*
# 🧪 COMPREHENSIVE SYSTEM TESTING GUIDE

## Testing Credentials

**Admin:**
- Username: `admin`
- Password: `admin123`

**Test Players:** You'll create these during testing

---

## 📋 PRE-TESTING CHECKLIST

### 1. Verify Server is Running
```bash
# Check if server is running
curl http://localhost:5000/api/health

# Expected response: {"status": "ok"}
```

### 2. Check Database Connection
```bash
# Check if admin user exists
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Expected: Should return success with token
```

### 3. Verify WhatsApp Number Configured
- Go to: `http://localhost:3000/admin/whatsapp-settings`
- Login as admin
- Ensure admin WhatsApp number is configured

---

## 🧪 TEST SUITE 1: REFERRAL CODE GENERATION

### Test 1.1: Create Player Account WITHOUT Referral
**Purpose:** Verify every new user gets a referral code

**Steps:**
1. Open browser: `http://localhost:3000/signup`
2. Fill in details:
   - Phone: `9876543210`
   - Password: `test123`
   - Full Name: `Test Player 1`
   - **Leave Referral Code blank**
3. Click "Sign Up"

**Expected Results:**
✅ Account created successfully
✅ Redirected to `/game`
✅ User automatically assigned a referral code

**Verification:**
```sql
-- Run in Supabase SQL Editor
SELECT id, phone, full_name, referral_code_generated 
FROM users 
WHERE phone = '9876543210';

-- Expected: referral_code_generated should NOT be null
```

**Pass Criteria:**
- ✅ User created
- ✅ `referral_code_generated` column has a value (e.g., "A1B2C3")

---

### Test 1.2: Check Referral Code Display
**Purpose:** Verify referral code shown in UI

**Steps:**
1. Login as `Test Player 1` (9876543210/test123)
2. Click on Profile/Settings icon
3. Navigate to Profile page

**Expected Results:**
✅ Referral code displayed clearly
✅ Copy button available
✅ Share link shown

**Visual Check:**
- [ ] Referral code visible
- [ ] Code format: 6 characters, alphanumeric

---

### Test 1.3: Create Player Account WITH Referral
**Purpose:** Verify referral relationship tracking

**Steps:**
1. **Get Referral Code from Test Player 1:**
   - Login as Test Player 1
   - Copy referral code (e.g., "ABC123")

2. **Create Test Player 2 with referral:**
   - Logout
   - Go to: `http://localhost:3000/signup`
   - Phone: `9876543211`
   - Password: `test123`
   - Full Name: `Test Player 2`
   - **Referral Code: Paste Player 1's code**
   - Click "Sign Up"

**Expected Results:**
✅ Account created successfully
✅ Player 2 gets their own referral code
✅ Player 2 linked to Player 1 as referrer

**Verification:**
```sql
-- Check referral relationship
SELECT 
  u1.phone as referred_user,
  u2.phone as referrer,
  ur.created_at
FROM user_referrals ur
JOIN users u1 ON ur.referred_user_id = u1.id
JOIN users u2 ON ur.referrer_user_id = u2.id
WHERE u1.phone = '9876543211';

-- Expected: Shows Player 2 referred by Player 1
```

**Pass Criteria:**
- ✅ Player 2 account created
- ✅ Player 2 has own referral code
- ✅ `user_referrals` table has relationship record

---

## 🧪 TEST SUITE 2: DEPOSIT & BONUS CREATION

### Test 2.1: Deposit Request (Player 1 - No Referrer)
**Purpose:** Verify deposit bonus creation for direct signup

**Steps:**
1. Login as Test Player 1 (9876543210/test123)
2. Click "Wallet" button
3. Enter amount: `10000`
4. Payment method: `UPI`
5. Click "Request Deposit ₹10,000"
6. WhatsApp opens with message
7. Send the WhatsApp message

**Expected Results:**
✅ Deposit request created
✅ Status: `pending`
✅ WhatsApp message sent

**Verification:**
```sql
-- Check deposit request
SELECT id, user_id, amount, request_type, status 
FROM payment_requests 
WHERE amount = 10000 
ORDER BY created_at DESC 
LIMIT 1;

-- Expected: status = 'pending'
```

**Pass Criteria:**
- ✅ Payment request record created
- ✅ Status is `pending`
- ✅ WhatsApp integration works

---

### Test 2.2: Admin Approves Deposit (Player 1)
**Purpose:** Verify bonus creation on approval

**Steps:**
1. Login as admin (admin/admin123)
2. Go to: `http://localhost:3000/admin/payments`
3. Find Player 1's deposit request (₹10,000)
4. Click "Approve"
5. Confirm approval

**Expected Results:**
✅ Request status changes to `approved`
✅ Player balance increased by ₹10,000
✅ Deposit bonus created (5% = ₹500) with status `locked`
✅ Wagering requirement calculated

**Verification:**
```sql
-- Check user balance
SELECT phone, balance 
FROM users 
WHERE phone = '9876543210';
-- Expected: balance = 10000

-- Check deposit bonus created
SELECT 
  user_id,
  deposit_amount,
  bonus_amount,
  bonus_percentage,
  wagering_required,
  wagering_completed,
  status
FROM deposit_bonuses
WHERE deposit_amount = 10000
ORDER BY created_at DESC 
LIMIT 1;

-- Expected:
-- deposit_amount = 10000
-- bonus_amount = 500 (5%)
-- status = 'locked'
-- wagering_required = 10000 (100% of deposit)
-- wagering_completed = 0
```

**Pass Criteria:**
- ✅ Balance = ₹10,000
- ✅ Bonus = ₹500 (locked)
- ✅ Wagering required = ₹10,000
- ✅ Wagering completed = 0

---

### Test 2.3: Deposit Request (Player 2 - Has Referrer)
**Purpose:** Verify referral tracking on first deposit

**Steps:**
1. Login as Test Player 2 (9876543211/test123)
2. Click "Wallet" button
3. Enter amount: `5000`
4. Payment method: `UPI`
5. Click "Request Deposit ₹5,000"
6. Send WhatsApp message

**Expected Results:**
✅ Deposit request created
✅ Status: `pending`

**Verification:**
```sql
-- Check deposit request
SELECT id, user_id, amount, request_type, status 
FROM payment_requests 
WHERE amount = 5000 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Test 2.4: Admin Approves Deposit (Player 2)
**Purpose:** Verify referral relationship tracked

**Steps:**
1. As admin, go to: `http://localhost:3000/admin/payments`
2. Find Player 2's deposit request (₹5,000)
3. Click "Approve"

**Expected Results:**
✅ Request approved
✅ Player 2 balance = ₹5,000
✅ Player 2 deposit bonus = ₹250 (locked)
✅ Referral relationship updated in `user_referrals` table
✅ **NOTE:** Referral bonus NOT created yet (only after wagering)

**Verification:**
```sql
-- Check Player 2 balance and bonus
SELECT phone, balance FROM users WHERE phone = '9876543211';
-- Expected: balance = 5000

SELECT * FROM deposit_bonuses WHERE deposit_amount = 5000;
-- Expected: bonus_amount = 250, status = 'locked'

-- Check referral relationship updated
SELECT 
  deposit_amount,
  bonus_amount,
  bonus_applied
FROM user_referrals ur
JOIN users u ON ur.referred_user_id = u.id
WHERE u.phone = '9876543211';

-- Expected:
-- deposit_amount = 5000
-- bonus_amount = 250 (expected referral bonus for Player 1)
-- bonus_applied = false (not yet applied)
```

**Pass Criteria:**
- ✅ Player 2 balance = ₹5,000
- ✅ Player 2 bonus = ₹250 (locked)
- ✅ Referral tracked (bonus_applied = false)

---

## 🧪 TEST SUITE 3: WAGERING & BONUS UNLOCKING

### Test 3.1: Place Bets (Does NOT Count Toward Wagering)
**Purpose:** Verify wagering NOT tracked when bets are placed

**Steps:**
1. Login as Player 1 (9876543210/test123)
2. Go to game: `http://localhost:3000/game`
3. Wait for betting round to start
4. Place bet: ₹1,000 on Andar

**Expected Results:**
✅ Bet recorded
✅ Balance deducted: ₹10,000 - ₹1,000 = ₹9,000
✅ **Wagering completed = 0** (still zero!)

**Verification:**
```sql
-- Check bet created
SELECT * FROM bets 
WHERE amount = 1000 
ORDER BY created_at DESC 
LIMIT 1;

-- Check wagering STILL ZERO
SELECT wagering_completed FROM deposit_bonuses 
WHERE deposit_amount = 10000;

-- Expected: wagering_completed = 0 (NO CHANGE YET!)
```

**Pass Criteria:**
- ✅ Bet placed successfully
- ✅ Wagering = 0 (unchanged)

---

### Test 3.2: Game Completes (Wagering NOW Tracked)
**Purpose:** Verify wagering tracked ONLY after game ends

**Steps:**
1. As admin, open: `http://localhost:3000/admin/game`
2. Start a new game
3. Deal cards until game completes
4. Note the winner (Andar or Bahar)

**Expected Results:**
✅ Game completes
✅ Payouts processed
✅ **Wagering NOW tracked** for Player 1's ₹1,000 bet

**Verification:**
```sql
-- Check wagering updated
SELECT 
  deposit_amount,
  bonus_amount,
  wagering_required,
  wagering_completed,
  wagering_progress,
  status
FROM deposit_bonuses 
WHERE deposit_amount = 10000;

-- Expected:
-- wagering_completed = 1000 (bet amount)
-- wagering_progress = 10 (1000/10000 * 100)
-- status = 'locked' (still locked)
```

**Pass Criteria:**
- ✅ `wagering_completed` = 1000
- ✅ `wagering_progress` = 10%
- ✅ Status still `locked`

---

### Test 3.3: Complete Wagering Requirement
**Purpose:** Verify bonus unlocks when threshold met

**Steps:**
1. Continue playing as Player 1
2. Place bets totaling ₹9,000 more
3. Let games complete

**Target:** Total wagering = ₹10,000

**Expected Results After ₹10,000 Wagered:**
✅ Bonus status changes: `locked` → `unlocked`
✅ Bonus automatically credited to balance
✅ Player 1 balance increases by ₹500

**Verification:**
```sql
-- Check bonus unlocked
SELECT 
  wagering_completed,
  wagering_progress,
  status,
  unlocked_at,
  credited_at
FROM deposit_bonuses 
WHERE deposit_amount = 10000;

-- Expected:
-- wagering_completed >= 10000
-- wagering_progress = 100
-- status = 'credited'
-- unlocked_at = timestamp
-- credited_at = timestamp

-- Check bonus transactions
SELECT * FROM bonus_transactions 
WHERE user_id = (SELECT id FROM users WHERE phone = '9876543210')
ORDER BY created_at DESC;

-- Expected: Shows unlock and credit events
```

**Pass Criteria:**
- ✅ Status = `credited`
- ✅ Wagering = 100%
- ✅ Balance increased by ₹500
- ✅ Bonus transactions recorded

---

## 🧪 TEST SUITE 4: REFERRAL BONUS FLOW

### Test 4.1: Check Referral Bonus NOT Created Yet
**Purpose:** Verify referral bonus only created after referred user's wagering complete

**Steps:**
```sql
-- Check if referral bonus exists for Player 1
SELECT * FROM referral_bonuses 
WHERE referrer_user_id = (SELECT id FROM users WHERE phone = '9876543210');

-- Expected: No rows (referral bonus not yet created)
```

**Pass Criteria:**
- ✅ No referral bonus exists yet

---

### Test 4.2: Player 2 Completes Wagering
**Purpose:** Trigger referral bonus creation for Player 1

**Steps:**
1. Login as Player 2 (9876543211/test123)
2. Place bets totaling ₹5,000
3. Let games complete (wagering requirement met)

**Expected Results:**
✅ Player 2's deposit bonus unlocked and credited
✅ **Referral bonus created for Player 1** (₹250)
✅ Referral bonus **auto-credited** to Player 1's balance

**Verification:**
```sql
-- Check Player 2's bonus
SELECT status FROM deposit_bonuses WHERE deposit_amount = 5000;
-- Expected: status = 'credited'

-- Check referral bonus created for Player 1
SELECT 
  referrer_user_id,
  referred_user_id,
  bonus_amount,
  status,
  created_at,
  credited_at
FROM referral_bonuses 
WHERE referrer_user_id = (SELECT id FROM users WHERE phone = '9876543210');

-- Expected:
-- bonus_amount = 250 (5% of Player 2's ₹5,000 deposit)
-- status = 'credited'
-- credited_at = timestamp

-- Check Player 1's balance increased
SELECT phone, balance FROM users WHERE phone = '9876543210';
-- Expected: balance increased by ₹250

-- Check user_referrals updated
SELECT bonus_applied, bonus_applied_at 
FROM user_referrals 
WHERE referred_user_id = (SELECT id FROM users WHERE phone = '9876543211');

-- Expected:
-- bonus_applied = true
-- bonus_applied_at = timestamp
```

**Pass Criteria:**
- ✅ Referral bonus created (₹250)
- ✅ Status = `credited`
- ✅ Player 1's balance increased
- ✅ `user_referrals.bonus_applied` = true

---

## 🧪 TEST SUITE 5: UI DISPLAY VERIFICATION

### Test 5.1: Wallet Modal - Bonus Display
**Purpose:** Verify bonus amounts shown correctly

**Steps:**
1. Login as Player 1
2. Click "Wallet" button
3. Check bonus display section

**Expected Display:**
```
Deposit Bonus: ₹500 ✅ (should show as credited/unlocked)
Referral Bonus: ₹250 ✅
```

**Visual Checks:**
- [ ] Deposit bonus shown
- [ ] Referral bonus shown
- [ ] Total bonus calculated correctly
- [ ] Colors: Green for unlocked, Yellow/Orange for locked

---

### Test 5.2: Profile Page - Referral Info
**Purpose:** Verify referral data displayed

**Steps:**
1. Login as Player 1
2. Go to Profile
3. Find "Referral" section

**Expected Display:**
```
Your Referral Code: ABC123
Total Referrals: 1
Total Earnings: ₹250

Referred Users:
- Test Player 2 (9876543211) - ₹250 earned ✅
```

**Visual Checks:**
- [ ] Referral code shown
- [ ] Referral count correct
- [ ] Earnings amount correct
- [ ] Referred users list shown

---

### Test 5.3: Admin Panel - Bonus Analytics
**Purpose:** Verify admin sees all bonus data

**Steps:**
1. Login as admin
2. Go to: `http://localhost:3000/admin/bonus`
3. Check tables and analytics

**Expected Display:**
- Player 1:
  - Deposit Bonus: ₹500 (credited)
  - Referral Bonus: ₹250 (credited)
  - Total: ₹750

- Player 2:
  - Deposit Bonus: ₹250 (credited)
  - Total: ₹250

**Visual Checks:**
- [ ] All bonuses listed
- [ ] Status shown correctly
- [ ] Amounts accurate
- [ ] Timestamps displayed

---

## 🧪 TEST SUITE 6: ADMIN FUNCTIONS

### Test 6.1: View All Payment Requests
**Steps:**
1. Login as admin
2. Go to: `http://localhost:3000/admin/payments`

**Expected Display:**
- All payment requests (deposits + withdrawals)
- Status for each (pending/approved/rejected)
- User details shown
- Amount and payment method

**Visual Checks:**
- [ ] All requests visible
- [ ] Can approve/reject
- [ ] User info shown
- [ ] Filters work

---

### Test 6.2: View Referral Data
**Steps:**
1. As admin, go to: `http://localhost:3000/admin/users`
2. Check referral information

**Expected Display:**
- User referral codes
- Referral relationships
- Bonus amounts earned

**API Check:**
```bash
# Get referral data (admin token required)
curl http://localhost:5000/api/admin/referral-data \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Expected: List of all referral relationships
```

---

### Test 6.3: Fix Missing Referral Codes
**Purpose:** Verify admin can fix users without codes

**Steps:**
1. Create a user manually in database WITHOUT referral code
2. As admin, call fix endpoint:

```bash
curl -X POST http://localhost:5000/api/admin/fix-referral-codes \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Results:**
✅ All users without codes get codes generated
✅ Response shows count of fixed users

**Verification:**
```sql
-- Check all users have codes
SELECT COUNT(*) as total,
       COUNT(referral_code_generated) as with_code
FROM users;

-- Expected: total = with_code
```

---

## 🧪 TEST SUITE 7: EDGE CASES

### Test 7.1: Multiple Deposits (FIFO Bonus Unlocking)
**Purpose:** Verify oldest bonus unlocks first

**Steps:**
1. As Player 1, make 2nd deposit of ₹20,000
2. Admin approves (bonus = ₹1,000)
3. Play and wager ₹10,000
4. Check which bonus unlocks

**Expected:**
✅ Oldest bonus unlocks first (FIFO)
✅ If first already unlocked, overflow goes to second

**Verification:**
```sql
-- Check bonus order
SELECT 
  deposit_amount,
  bonus_amount,
  wagering_required,
  wagering_completed,
  status,
  created_at
FROM deposit_bonuses 
WHERE user_id = (SELECT id FROM users WHERE phone = '9876543210')
ORDER BY created_at ASC;

-- Expected: Oldest should be 'credited', newest still 'locked'
```

---

### Test 7.2: Withdrawal Request
**Purpose:** Verify withdrawal flow

**Steps:**
1. Login as Player 1
2. Click "Wallet" → "Withdraw" tab
3. Enter amount: ₹5,000
4. Payment method: UPI
5. Enter UPI ID
6. Submit

**Expected:**
✅ Withdrawal request created
✅ Balance NOT deducted yet
✅ Status = pending
✅ WhatsApp opens with details

**Verification:**
```sql
SELECT * FROM payment_requests 
WHERE request_type = 'withdrawal' 
ORDER BY created_at DESC 
LIMIT 1;

-- Expected: status = 'pending'
```

---

### Test 7.3: Referral Chain (3+ Levels)
**Purpose:** Verify only direct referrals get bonus

**Steps:**
1. Player 3 signs up with Player 2's code
2. Player 3 deposits and completes wagering

**Expected:**
✅ Player 2 gets referral bonus (direct referrer)
✅ Player 1 does NOT get bonus (indirect)

**Verification:**
```sql
-- Check only Player 2 got bonus
SELECT * FROM referral_bonuses 
WHERE referred_user_id = (SELECT id FROM users WHERE phone LIKE '%Player 3%');

-- Expected: Only 1 row, referrer_user_id = Player 2's ID
```

---

## 📊 TEST RESULTS TEMPLATE

### System Test Report

**Date:** __________
**Tester:** __________

| Test Suite | Test Case | Result | Notes |
|------------|-----------|--------|-------|
| 1. Referral Code | 1.1 Create w/o referral | ☐ Pass ☐ Fail | |
| 1. Referral Code | 1.2 UI display | ☐ Pass ☐ Fail | |
| 1. Referral Code | 1.3 Create w/ referral | ☐ Pass ☐ Fail | |
| 2. Deposit & Bonus | 2.1 Deposit request | ☐ Pass ☐ Fail | |
| 2. Deposit & Bonus | 2.2 Admin approval | ☐ Pass ☐ Fail | |
| 2. Deposit & Bonus | 2.3 Player 2 deposit | ☐ Pass ☐ Fail | |
| 2. Deposit & Bonus | 2.4 Player 2 approval | ☐ Pass ☐ Fail | |
| 3. Wagering | 3.1 Bet placement | ☐ Pass ☐ Fail | |
| 3. Wagering | 3.2 Game completion | ☐ Pass ☐ Fail | |
| 3. Wagering | 3.3 Full wagering | ☐ Pass ☐ Fail | |
| 4. Referral Bonus | 4.1 Bonus not yet created | ☐ Pass ☐ Fail | |
| 4. Referral Bonus | 4.2 Bonus after wagering | ☐ Pass ☐ Fail | |
| 5. UI Display | 5.1 Wallet modal | ☐ Pass ☐ Fail | |
| 5. UI Display | 5.2 Profile page | ☐ Pass ☐ Fail | |
| 5. UI Display | 5.3 Admin panel | ☐ Pass ☐ Fail | |
| 6. Admin Functions | 6.1 Payment requests | ☐ Pass ☐ Fail | |
| 6. Admin Functions | 6.2 Referral data | ☐ Pass ☐ Fail | |
| 6. Admin Functions | 6.3 Fix missing codes | ☐ Pass ☐ Fail | |
| 7. Edge Cases | 7.1 Multiple deposits | ☐ Pass ☐ Fail | |
| 7. Edge Cases | 7.2 Withdrawal | ☐ Pass ☐ Fail | |
| 7. Edge Cases | 7.3 Referral chain | ☐ Pass ☐ Fail | |

---

## 🐛 ISSUE REPORTING TEMPLATE

If you find any issues, report them using this format:

```markdown
### Issue #X: [Short Description]

**Test Case:** [Which test case failed]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Screenshots/Logs:**
[Attach any relevant screenshots or error logs]

**Database Query Results:**
```sql
-- Paste relevant SQL query results here
```

**Priority:** [High/Medium/Low]
```

---

## ✅ SUCCESS CRITERIA

The system passes testing if:

1. ✅ **Referral Codes:** Every user gets a unique code
2. ✅ **Deposit Bonus:** 5% bonus created as locked on approval
3. ✅ **Wagering:** Tracked ONLY after games complete, NOT during betting
4. ✅ **Bonus Unlock:** Auto-unlocks at threshold, auto-credits to balance
5. ✅ **FIFO:** Oldest bonuses unlock first
6. ✅ **Referral Bonus:** Created when referred user completes wagering
7. ✅ **UI Display:** All bonuses shown correctly in wallet/profile
8. ✅ **Admin Panel:** All data visible and manageable
9. ✅ **No Duplicates:** No duplicate bonuses or referral records
10. ✅ **Atomic Operations:** No race conditions or partial updates

---

## 📞 TESTING SUPPORT

If you encounter issues or need clarification:
1. Check the SQL verification queries
2. Review [`BONUS_REFERRAL_SYSTEM_CLEANUP_COMPLETE.md`](BONUS_REFERRAL_SYSTEM_CLEANUP_COMPLETE.md)
3. Report issues using the template above

**Happy Testing!** 🧪
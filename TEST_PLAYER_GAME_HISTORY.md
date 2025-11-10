# Test Plan: Player Game History Fix

**Date:** Nov 10, 2025  
**Objective:** Verify player game history displays correct bet totals, payouts, and net profit

---

## Quick Test (5 minutes)

### Test 1: Basic Display
1. **Login as player** with existing game history
2. **Navigate to:** Profile → Game History tab
3. **Verify each game shows:**
   - ✅ Opening card displayed
   - ✅ Winner side (Andar/Bahar) displayed
   - ✅ Your bet amount (not zero)
   - ✅ Your payout amount (if won)
   - ✅ Net profit (green if positive, red if negative)
   - ✅ Result badge (Win/Loss/No Bet)

**Expected Result:** All fields populated with non-zero values for games where bets were placed.

---

## Detailed Test (15 minutes)

### Test 2: Single Bet Per Game
**Setup:**
1. Place single bet (e.g., ₹100 on Andar)
2. Wait for game to complete
3. Check Profile → Game History

**Verify:**
- ✅ `yourTotalBet` = ₹100
- ✅ If won: `yourTotalPayout` = ₹190 (or correct payout)
- ✅ If won: `yourNetProfit` = +₹90 (green)
- ✅ If lost: `yourTotalPayout` = ₹0
- ✅ If lost: `yourNetProfit` = -₹100 (red)
- ✅ Result badge matches outcome

---

### Test 3: Multiple Bets Per Game
**Setup:**
1. Place bet in Round 1 (e.g., ₹100 on Andar)
2. Place bet in Round 2 (e.g., ₹200 on Bahar)
3. Wait for game to complete
4. Check Profile → Game History

**Verify:**
- ✅ `yourTotalBet` = ₹300 (sum of all bets)
- ✅ `yourTotalPayout` = sum of all individual payouts
- ✅ `yourNetProfit` = total payout - ₹300
- ✅ Expand to see all individual bets listed
- ✅ Each bet shows correct amount and payout

---

### Test 4: Edge Cases

#### Case A: No Bet Placed
1. View game where you didn't bet
2. **Verify:**
   - ✅ `yourTotalBet` = ₹0
   - ✅ `yourTotalPayout` = ₹0
   - ✅ `yourNetProfit` = ₹0
   - ✅ Result badge = "No Bet"

#### Case B: Refunded Bet
1. View game where bet was refunded
2. **Verify:**
   - ✅ `yourTotalBet` = original bet amount
   - ✅ `yourTotalPayout` = refund amount (equal to bet)
   - ✅ `yourNetProfit` = ₹0
   - ✅ Status shows "Refund"

#### Case C: Pagination
1. Scroll to bottom of game history
2. Click "Load More"
3. **Verify:**
   - ✅ New games load correctly
   - ✅ All fields populated
   - ✅ No duplicate entries

---

## Admin Consistency Test (10 minutes)

### Test 5: Admin View Matches Player View
**Setup:**
1. Note down values from player's game history:
   - Game ID
   - yourTotalBet
   - yourTotalPayout
   - yourNetProfit
   - result

2. Login as admin
3. Navigate to: Users → Select same user → Game History
4. Find same game by Game ID

**Verify:**
- ✅ Admin view shows same `yourTotalBet`
- ✅ Admin view shows same `yourTotalPayout`
- ✅ Admin view shows same `yourNetProfit`
- ✅ Admin view shows same `result`

**Critical:** If values don't match, there's a data consistency issue.

---

## API Response Test (Advanced)

### Test 6: Inspect Network Response
**Setup:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to Profile → Game History
4. Find request to `/api/user/game-history`

**Verify Response Structure:**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "gameId": "...",
        "yourTotalBet": 100,
        "yourTotalPayout": 190,
        "yourNetProfit": 90,
        "result": "win",
        "yourBets": [
          {
            "id": "...",
            "side": "andar",
            "amount": 100,
            "payout": 190,
            "status": "won"
          }
        ]
      }
    ],
    "total": 50,
    "hasMore": true
  }
}
```

**Verify:**
- ✅ Response has nested `data.data.games` structure
- ✅ Each game has `yourTotalBet`, `yourTotalPayout`, `yourNetProfit`
- ✅ Values are numbers (not strings or null)
- ✅ `result` is 'win', 'loss', or 'no_bet'

---

## Regression Test (5 minutes)

### Test 7: Other Profile Features Still Work
**Verify:**
- ✅ Profile → Overview tab loads
- ✅ Profile → Analytics tab loads
- ✅ Profile → Transactions tab loads
- ✅ Profile → Bonuses tab loads
- ✅ Profile → Referrals tab loads
- ✅ Deposit/Withdrawal buttons work
- ✅ Profile edit works

**Critical:** Ensure fix didn't break other profile features.

---

## Performance Test (Optional)

### Test 8: Large History
**Setup:**
1. Login as user with 100+ games
2. Navigate to Profile → Game History

**Verify:**
- ✅ Page loads within 2 seconds
- ✅ Scrolling is smooth
- ✅ Load More works without lag
- ✅ No memory leaks (check DevTools Memory tab)

---

## Bug Scenarios (What Was Fixed)

### Scenario A: Wrong Endpoint (FIXED ✅)
**Before:** Called `/user/game-history` (non-existent)  
**After:** Calls `/api/user/game-history` (correct)

**Test:**
1. Check Network tab
2. Verify request goes to `/api/user/game-history`
3. Verify response is 200 OK (not 404)

---

### Scenario B: Wrong Response Parsing (FIXED ✅)
**Before:** Read `response.data.games` (undefined)  
**After:** Reads `response.data.data.games` (correct)

**Test:**
1. Add console.log in `fetchGameHistory`:
   ```typescript
   console.log('Response:', response);
   console.log('Games:', container.games);
   ```
2. Verify `container.games` is populated array
3. Verify no "Cannot read property 'map' of undefined" errors

---

### Scenario C: Missing Normalization (FIXED ✅)
**Before:** Direct mapping, no fallbacks  
**After:** Defensive normalization with fallbacks

**Test:**
1. Check if old game records (with missing fields) still display
2. Verify fallback calculations work:
   - If `yourTotalBet` missing, sum from `yourBets[]`
   - If `yourTotalPayout` missing, sum from `yourBets[].payout`
   - If `result` missing, derive from `yourNetProfit`

---

## Success Criteria

### Must Pass (Critical)
- ✅ All games show non-zero bet amounts (if bets placed)
- ✅ All games show correct payout amounts
- ✅ All games show correct net profit (payout - bet)
- ✅ Result badges match actual outcomes
- ✅ Admin view matches player view

### Should Pass (Important)
- ✅ Multiple bets per game sum correctly
- ✅ Pagination works
- ✅ Edge cases handled (no bet, refund)
- ✅ No console errors

### Nice to Have (Optional)
- ✅ Performance is good (< 2s load)
- ✅ No memory leaks
- ✅ Smooth scrolling

---

## Rollback Plan (If Test Fails)

### If Critical Issues Found:
1. **Revert commit:**
   ```bash
   git revert HEAD
   ```

2. **Redeploy previous version:**
   ```bash
   npm run build
   # Deploy to production
   ```

3. **Investigate:**
   - Check browser console for errors
   - Check Network tab for API response
   - Check backend logs for errors
   - Compare with admin view data

### Common Issues and Fixes:

#### Issue: Still showing zeros
**Cause:** Backend not returning data  
**Fix:** Check `storage.getUserGameHistory()` logs

#### Issue: Wrong values
**Cause:** Normalization logic error  
**Fix:** Review fallback calculations in `fetchGameHistory()`

#### Issue: Admin view different
**Cause:** Data inconsistency  
**Fix:** Check database `player_bets.actual_payout` values

---

## Test Results Template

```
Date: ___________
Tester: ___________

Test 1 (Basic Display): ☐ PASS ☐ FAIL
Test 2 (Single Bet): ☐ PASS ☐ FAIL
Test 3 (Multiple Bets): ☐ PASS ☐ FAIL
Test 4 (Edge Cases): ☐ PASS ☐ FAIL
Test 5 (Admin Consistency): ☐ PASS ☐ FAIL
Test 6 (API Response): ☐ PASS ☐ FAIL
Test 7 (Regression): ☐ PASS ☐ FAIL
Test 8 (Performance): ☐ PASS ☐ FAIL

Overall: ☐ PASS ☐ FAIL

Notes:
_______________________________________
_______________________________________
_______________________________________
```

---

## Contact

**If tests fail:**
- Check `PLAYER_GAME_HISTORY_FIX_COMPLETE.md` for detailed fix documentation
- Review `client/src/contexts/UserProfileContext.tsx:420-516`
- Check backend logs for `getUserGameHistory` output
- Verify database `player_bets` table has `actual_payout` values

**Status:** Ready for testing ✅

# Testing Guide: Betting System Fixes

## Overview

This guide provides step-by-step testing procedures for all betting system fixes, including the two already-implemented fixes and the new per-round payout tracking feature.

---

## Test Environment Setup

### Prerequisites
- Access to admin panel
- Access to player interface
- Database access for verification queries
- Browser developer console open for debugging

### Test Users Needed
- **Admin User**: For admin panel testing
- **Player User 1**: Primary test player
- **Player User 2**: Secondary test player (for multi-player scenarios)

---

## Bug #1: Bet Accumulation (Already Fixed ✅)

### Test Objective
Verify that bet amounts don't accumulate when placing multiple bets after undo operations.

### Test Steps

#### Test 1.1: Single Bet → Undo → Rebid
1. **Login** as Player User 1
2. **Wait** for betting phase to start
3. **Place bet**: ₹2,500 on Andar (Round 1)
4. **Verify**: Button shows "₹2,500" ✅
5. **Click** "Undo Bet" button
6. **Verify**: Button shows "₹0" ✅
7. **Place bet**: ₹2,500 on Andar (Round 1) again
8. **Expected**: Button shows "₹2,500" (NOT ₹5,000) ✅
9. **Check console**: Should see "⚠️ Duplicate bet_confirmed ignored" if duplicate received

**Pass Criteria:**
- ✅ Button shows ₹2,500 after rebid (not accumulated)
- ✅ No duplicate bets in `playerRound1Bets.andar` array
- ✅ Console shows deduplication working

#### Test 1.2: Multiple Bets → Undo → Multiple Rebids
1. **Place bet**: ₹1,000 on Andar (Round 1)
2. **Place bet**: ₹1,500 on Andar (Round 1)
3. **Verify**: Button shows "₹2,500" ✅
4. **Click** "Undo Bet" (undoes all Round 1 bets)
5. **Verify**: Button shows "₹0" ✅
6. **Place bet**: ₹1,000 on Andar (Round 1)
7. **Place bet**: ₹1,500 on Andar (Round 1)
8. **Expected**: Button shows "₹2,500" (NOT ₹5,000) ✅

**Pass Criteria:**
- ✅ Button shows correct total after rebids
- ✅ No accumulation from previous bets

#### Test 1.3: Network Retry Simulation
1. **Open** browser DevTools → Network tab
2. **Enable** "Slow 3G" throttling
3. **Place bet**: ₹2,500 on Andar
4. **Observe**: Multiple `bet_confirmed` messages may arrive
5. **Verify**: Button still shows "₹2,500" (not duplicated)
6. **Check console**: Should see duplicate detection logs

**Pass Criteria:**
- ✅ Bet amount not duplicated despite network issues
- ✅ Console shows "Duplicate bet_confirmed ignored"

---

## Bug #2: Admin Dashboard Stale Data (Already Fixed ✅)

### Test Objective
Verify that admin dashboard updates immediately when players place or undo bets.

### Test Steps

#### Test 2.1: Real-time Bet Updates
1. **Login** as Admin
2. **Open** Live Bet Monitoring dashboard
3. **Have Player User 1** place bet: ₹5,000 on Andar
4. **Expected**: Admin dashboard updates within 1 second ✅
5. **Verify**: Shows Player User 1 with ₹5,000 on Andar
6. **Check console**: Should see "📊 Fetched X players' bets"

**Pass Criteria:**
- ✅ Dashboard updates immediately (< 1 second)
- ✅ Correct bet amount displayed
- ✅ Console shows fetch triggered by WebSocket event

#### Test 2.2: Real-time Undo Updates
1. **Admin dashboard** showing Player User 1: ₹5,000 on Andar
2. **Have Player User 1** click "Undo Bet"
3. **Expected**: Admin dashboard updates within 1 second ✅
4. **Verify**: Player User 1 bet removed or shows ₹0
5. **Check console**: Should see "🔄 Fetching live bets from API..."

**Pass Criteria:**
- ✅ Dashboard updates immediately after undo
- ✅ Bet amount correctly removed
- ✅ No stale data displayed

#### Test 2.3: Multiple Players Betting
1. **Have Player User 1** place bet: ₹5,000 on Andar
2. **Have Player User 2** place bet: ₹3,000 on Bahar
3. **Verify**: Admin dashboard shows both players ✅
4. **Have Player User 1** undo bet
5. **Verify**: Admin dashboard shows only Player User 2 ✅
6. **Have Player User 2** undo bet
7. **Verify**: Admin dashboard shows no bets ✅

**Pass Criteria:**
- ✅ All player bets visible in real-time
- ✅ Undo operations update correctly
- ✅ No phantom bets remain

#### Test 2.4: Force Refresh Verification
1. **Open** browser DevTools → Console
2. **Watch** for state updates
3. **Have player** place bet
4. **Check console**: Should see `refreshKey` increment
5. **Verify**: Component re-renders with new data

**Pass Criteria:**
- ✅ `refreshKey` increments on each fetch
- ✅ Component re-renders after state update
- ✅ No stale closures capturing old state

---

## Bug #3: Per-Round Payout Tracking (New Feature ⚠️)

### Test Objective
Verify that per-round payout data is calculated, saved, and displayed correctly.

### Prerequisites
- ✅ Database migration completed (`add-round-payouts-to-history.sql`)
- ✅ Backend code updated (game.ts, storage-supabase.ts, routes.ts)
- ✅ Frontend code updated (GameHistoryModal.tsx)
- ✅ Server restarted

### Test Steps

#### Test 3.1: Database Migration Verification

**Run these SQL queries:**

```sql
-- Query 1: Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'game_history' 
AND column_name = 'round_payouts';

-- Expected: Should return 1 row with data_type = 'jsonb'
```

```sql
-- Query 2: Check sample data
SELECT 
  game_id,
  winner,
  winning_round,
  total_payouts,
  round_payouts
FROM game_history
ORDER BY created_at DESC
LIMIT 5;

-- Expected: round_payouts should have JSONB data, not NULL
```

```sql
-- Query 3: Verify backfill
SELECT 
  COUNT(*) as total_games,
  COUNT(CASE WHEN round_payouts IS NOT NULL THEN 1 END) as games_with_payouts,
  COUNT(CASE WHEN round_payouts IS NULL OR round_payouts = '{}'::jsonb THEN 1 END) as games_missing_payouts
FROM game_history;

-- Expected: games_with_payouts should equal total_games
```

**Pass Criteria:**
- ✅ Column exists with type JSONB
- ✅ Existing games have round_payouts populated
- ✅ No games with NULL or empty round_payouts

#### Test 3.2: New Game Payout Calculation

**Setup:**
1. **Login** as Admin
2. **Start** new game with opening card
3. **Have Player User 1** place bets:
   - ₹1,000 on Andar (Round 1)
   - ₹2,000 on Bahar (Round 2)
4. **Have Player User 2** place bets:
   - ₹3,000 on Andar (Round 1)
5. **Complete game** with Andar winning in Round 1

**Expected Payouts:**
- Player User 1: (₹1,000 × 0.9) = ₹900 (Round 1 Andar)
- Player User 2: (₹3,000 × 0.9) = ₹2,700 (Round 1 Andar)
- Total Round 1 Andar Payout: ₹3,600
- Total Round 1 Bahar Payout: ₹0
- Total Round 2 Andar Payout: ₹0
- Total Round 2 Bahar Payout: ₹0

**Verification Steps:**

1. **Check server logs** for payout calculation:
```
📊 Calculated round payouts:
  round1Andar: 3600.00
  round1Bahar: 0.00
  round2Andar: 0.00
  round2Bahar: 0.00
  total: 3600.00
  expectedTotal: 3600.00
```

2. **Query database:**
```sql
SELECT 
  game_id,
  winner,
  winning_round,
  total_payouts,
  (round_payouts->'round1'->>'andar')::numeric as r1_andar,
  (round_payouts->'round1'->>'bahar')::numeric as r1_bahar,
  (round_payouts->'round2'->>'andar')::numeric as r2_andar,
  (round_payouts->'round2'->>'bahar')::numeric as r2_bahar
FROM game_history
WHERE game_id = '<GAME_ID>'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- r1_andar: 3600.00
-- r1_bahar: 0.00
-- r2_andar: 0.00
-- r2_bahar: 0.00
-- total_payouts: 3600.00
```

3. **Check API response:**
```bash
curl -X GET "http://localhost:5000/api/game/history?limit=1" \
  -H "Authorization: Bearer <TOKEN>"

# Expected response includes:
# "round1AndarPayout": 3600,
# "round1BaharPayout": 0,
# "round2AndarPayout": 0,
# "round2BaharPayout": 0
```

**Pass Criteria:**
- ✅ Server logs show correct calculation
- ✅ Database has correct round_payouts JSONB
- ✅ API response includes per-round payout fields
- ✅ Total of round payouts equals total_payouts

#### Test 3.3: Frontend Display Verification

1. **Login** as Admin
2. **Open** Game History modal
3. **Click** on the most recent game
4. **Verify**: Per-round payout breakdown section visible
5. **Check values**:
   - Round 1 Andar: ₹3,600
   - Round 1 Bahar: ₹0
   - Round 2 Andar: ₹0
   - Round 2 Bahar: ₹0
   - Total: ₹3,600

**Pass Criteria:**
- ✅ Per-round breakdown section displays
- ✅ All payout values correct
- ✅ Total matches sum of round payouts
- ✅ Formatting correct (currency symbols, decimals)

#### Test 3.4: Multi-Round Game Test

**Setup:**
1. **Start** new game
2. **Have Player User 1** place bets:
   - ₹2,000 on Andar (Round 1)
   - ₹3,000 on Bahar (Round 2)
3. **Have Player User 2** place bets:
   - ₹1,000 on Bahar (Round 1)
   - ₹4,000 on Andar (Round 2)
4. **Complete game** with Bahar winning in Round 2

**Expected Payouts:**
- Player User 1: (₹3,000 × 1.8) = ₹5,400 (Round 2 Bahar)
- Player User 2: (₹4,000 × 1.8) = ₹7,200 (Round 2 Andar) - LOSES (wrong side)
- Total Round 1 Andar Payout: ₹0
- Total Round 1 Bahar Payout: ₹0
- Total Round 2 Andar Payout: ₹0
- Total Round 2 Bahar Payout: ₹5,400

**Verification:**
```sql
SELECT 
  game_id,
  winner,
  winning_round,
  (round_payouts->'round2'->>'bahar')::numeric as r2_bahar_payout
FROM game_history
WHERE game_id = '<GAME_ID>';

-- Expected: r2_bahar_payout = 5400.00
```

**Pass Criteria:**
- ✅ Round 2 Bahar payout = ₹5,400
- ✅ All other round payouts = ₹0
- ✅ Frontend displays correct values

#### Test 3.5: Complex Proportional Distribution Test

**Setup:**
1. **Start** new game
2. **Have Player User 1** place bets:
   - ₹1,000 on Andar (Round 1)
   - ₹1,000 on Bahar (Round 1)
   - ₹2,000 on Andar (Round 2)
3. **Complete game** with Andar winning in Round 1

**Expected Calculation:**
- Player User 1 total bets: ₹4,000
- Player User 1 winning bet: ₹1,000 on Andar (Round 1)
- Player User 1 payout: ₹1,000 × 0.9 = ₹900
- Round 1 Andar payout: ₹900
- Round 1 Bahar payout: ₹0 (lost)

**Verification:**
```sql
SELECT 
  (round_payouts->'round1'->>'andar')::numeric as r1_andar,
  (round_payouts->'round1'->>'bahar')::numeric as r1_bahar
FROM game_history
WHERE game_id = '<GAME_ID>';

-- Expected:
-- r1_andar: 900.00
-- r1_bahar: 0.00
```

**Pass Criteria:**
- ✅ Proportional distribution correct
- ✅ Only winning side has payout
- ✅ Losing side shows ₹0

---

## Integration Tests

### Test INT-1: Complete Game Flow with All Features

**Objective**: Verify all three fixes work together in a complete game.

**Steps:**
1. **Admin** starts game
2. **Player 1** places ₹5,000 on Andar (Round 1)
3. **Verify**: Admin dashboard shows bet immediately ✅ (Bug #2)
4. **Player 1** undos bet
5. **Verify**: Admin dashboard updates immediately ✅ (Bug #2)
6. **Player 1** places ₹5,000 on Andar again
7. **Verify**: Button shows ₹5,000 (not ₹10,000) ✅ (Bug #1)
8. **Player 2** places ₹3,000 on Bahar (Round 1)
9. **Admin** completes game with Andar winning
10. **Verify**: Game history shows correct round payouts ✅ (Bug #3)

**Pass Criteria:**
- ✅ All three fixes working simultaneously
- ✅ No conflicts between fixes
- ✅ Complete data flow from bet to history

### Test INT-2: Stress Test - Multiple Players

**Objective**: Test system under load with multiple concurrent players.

**Steps:**
1. **Admin** starts game
2. **5 players** simultaneously place bets
3. **Verify**: Admin dashboard shows all bets ✅
4. **2 players** undo bets
5. **Verify**: Admin dashboard updates correctly ✅
6. **2 players** place new bets
7. **Verify**: No bet accumulation ✅
8. **Admin** completes game
9. **Verify**: Round payouts calculated correctly ✅

**Pass Criteria:**
- ✅ System handles concurrent operations
- ✅ No race conditions
- ✅ All data consistent

---

## Regression Tests

### Test REG-1: Existing Functionality Not Broken

**Verify these still work:**
- ✅ User login/logout
- ✅ Balance updates after bet
- ✅ Balance updates after win
- ✅ Game statistics calculation
- ✅ User statistics tracking
- ✅ Admin panel displays
- ✅ Payment requests
- ✅ Bonus system

### Test REG-2: Database Integrity

**Run these queries:**

```sql
-- Check for orphaned bets
SELECT COUNT(*) FROM player_bets pb
LEFT JOIN game_history gh ON pb.game_id = gh.game_id
WHERE gh.game_id IS NULL;
-- Expected: 0

-- Check for mismatched totals
SELECT 
  gh.game_id,
  gh.total_payouts,
  COALESCE(SUM(pb.actual_payout), 0) as bets_total,
  ABS(gh.total_payouts - COALESCE(SUM(pb.actual_payout), 0)) as difference
FROM game_history gh
LEFT JOIN player_bets pb ON pb.game_id = gh.game_id
GROUP BY gh.game_id, gh.total_payouts
HAVING ABS(gh.total_payouts - COALESCE(SUM(pb.actual_payout), 0)) > 0.01
ORDER BY difference DESC
LIMIT 10;
-- Expected: 0 rows (or very small differences due to rounding)
```

**Pass Criteria:**
- ✅ No orphaned data
- ✅ Totals match across tables
- ✅ No data corruption

---

## Performance Tests

### Test PERF-1: API Response Time

**Measure:**
- Game history API response time
- Live bets API response time
- Bet placement response time

**Expected:**
- Game history: < 500ms
- Live bets: < 300ms
- Bet placement: < 200ms

**Pass Criteria:**
- ✅ All endpoints respond within limits
- ✅ No performance degradation from new features

### Test PERF-2: Database Query Performance

**Run EXPLAIN ANALYZE:**

```sql
EXPLAIN ANALYZE
SELECT * FROM game_history
WHERE round_payouts->'round1'->>'andar' > '1000'
ORDER BY created_at DESC
LIMIT 10;

-- Check: Uses GIN index on round_payouts
-- Execution time: < 50ms
```

**Pass Criteria:**
- ✅ Index used correctly
- ✅ Query execution time acceptable

---

## Rollback Tests

### Test ROLL-1: Rollback Procedure

**If issues found, verify rollback works:**

1. **Run rollback SQL:**
```sql
BEGIN;
ALTER TABLE game_history DROP COLUMN IF EXISTS round_payouts;
DROP INDEX IF EXISTS idx_game_history_round_payouts;
COMMIT;
```

2. **Restart server** with previous code version
3. **Verify**: System works without round_payouts
4. **Complete test game**
5. **Verify**: Game completes successfully

**Pass Criteria:**
- ✅ Rollback completes without errors
- ✅ System functional after rollback
- ✅ No data loss

---

## Test Report Template

```markdown
# Betting System Fixes - Test Report

**Date**: [DATE]
**Tester**: [NAME]
**Environment**: [Production/Staging/Local]

## Bug #1: Bet Accumulation
- Test 1.1: [PASS/FAIL] - Notes: ___
- Test 1.2: [PASS/FAIL] - Notes: ___
- Test 1.3: [PASS/FAIL] - Notes: ___

## Bug #2: Admin Dashboard
- Test 2.1: [PASS/FAIL] - Notes: ___
- Test 2.2: [PASS/FAIL] - Notes: ___
- Test 2.3: [PASS/FAIL] - Notes: ___
- Test 2.4: [PASS/FAIL] - Notes: ___

## Bug #3: Per-Round Payouts
- Test 3.1: [PASS/FAIL] - Notes: ___
- Test 3.2: [PASS/FAIL] - Notes: ___
- Test 3.3: [PASS/FAIL] - Notes: ___
- Test 3.4: [PASS/FAIL] - Notes: ___
- Test 3.5: [PASS/FAIL] - Notes: ___

## Integration Tests
- Test INT-1: [PASS/FAIL] - Notes: ___
- Test INT-2: [PASS/FAIL] - Notes: ___

## Regression Tests
- Test REG-1: [PASS/FAIL] - Notes: ___
- Test REG-2: [PASS/FAIL] - Notes: ___

## Performance Tests
- Test PERF-1: [PASS/FAIL] - Notes: ___
- Test PERF-2: [PASS/FAIL] - Notes: ___

## Overall Result
- **Status**: [PASS/FAIL]
- **Issues Found**: [COUNT]
- **Recommendation**: [DEPLOY/HOLD/ROLLBACK]

## Issues Log
1. [Issue description and severity]
2. [Issue description and severity]
```

---

## Quick Test Checklist

For rapid verification after deployment:

- [ ] Place bet → verify button shows correct amount
- [ ] Undo bet → verify button shows ₹0
- [ ] Place bet again → verify no accumulation
- [ ] Admin sees bet immediately
- [ ] Admin sees undo immediately
- [ ] Complete game → verify history saved
- [ ] Check game history → verify round payouts displayed
- [ ] Run database verification query
- [ ] Check server logs for errors
- [ ] Verify API response includes new fields

**If all checkboxes pass: ✅ DEPLOYMENT SUCCESSFUL**

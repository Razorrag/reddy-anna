# Database Fix Instructions

## Issues Fixed

### 1. **Bonus Wagering Calculation Bug** (CRITICAL)
- **Problem**: Depositing ₹100,000 with 5% bonus (₹5,000) was showing wagering requirement of ₹300,000 instead of ₹30,000
- **Root Cause**: Code was using `wagering_multiplier = 3` and applying it to deposit (3 × 100k = 300k)
- **Correct Formula**: Wagering = 30% of DEPOSIT (0.3 × 100k = 30k)
- **Fix**: Changed `wagering_multiplier` to `0.3` and formula to `deposit × multiplier`

### 2. **Payout Calculation Bug** (CRITICAL)
- **Problem**: Game statistics showing 2x-3x inflated payouts
- **Root Cause**: Total user payout was being assigned to EACH individual bet instead of per-bet calculation
- **Fix**: Calculate payout per individual bet based on bet amount and game rules

### 2. **Wrong Calculations in Admin Pages**
- User management showing incorrect stats
- Analytics pages showing wrong data
- Profile game history showing wrong calculations
- **Root Cause**: Data inconsistency between `player_bets`, `users`, `game_statistics`, and analytics tables
- **Fix**: SQL script to recalculate all stats from source of truth (`player_bets`)

### 3. **Database Inconsistency**
- `game_history` has correct data
- Other tables have stale/incorrect aggregated data
- **Fix**: Rebuild all derived tables from `player_bets` and `game_statistics`

---

## Step-by-Step Fix Process

### Step 1: Run Diagnostic Queries First
Run the diagnostic section (STEP 1) of the SQL script to see current state:

```sql
-- Run in Supabase SQL Editor
-- Copy lines 14-175 from COMPLETE_DATABASE_FIX_AND_AUDIT.sql
```

This will show you:
- Current bonus/wagering settings
- Which deposit bonuses have wrong wagering
- Comparison of user stats vs calculated stats
- Game statistics accuracy

### Step 2: Fix the Database Settings
```sql
-- Set correct wagering multiplier (3x bonus)
UPDATE game_settings 
SET setting_value = '3', 
    description = 'Wagering requirement multiplier of BONUS amount (3 = 3x bonus)'
WHERE setting_key = 'wagering_multiplier';
```

### Step 3: Fix Existing Wrong Wagering Requirements
```sql
-- Fix deposit bonuses: wagering should be 3x BONUS
UPDATE deposit_bonuses
SET wagering_required = bonus_amount * 3, updated_at = NOW()
WHERE wagering_required != bonus_amount * 3 AND status = 'locked';

-- Fix referral bonuses
UPDATE referral_bonuses
SET wagering_required = bonus_amount * 3, updated_at = NOW()
WHERE wagering_required != bonus_amount * 3 AND status = 'locked';
```

### Step 4: Recalculate All Player Stats
```sql
-- This recalculates total_winnings, total_losses, games_played, games_won
-- from the actual player_bets table
SELECT * FROM recalculate_all_player_stats();
```

### Step 5: Rebuild Analytics Tables
Run the full SQL script sections for:
- STEP 5: Recalculate game_history
- STEP 6: Recalculate game_statistics
- STEP 7: Rebuild daily_game_statistics
- STEP 8: Rebuild monthly_game_statistics
- STEP 9: Rebuild yearly_game_statistics

### Step 6: Verify Fixes
Run the verification queries (STEP 10) to confirm all data is now consistent.

---

## Files Modified

### Server Code Fixes
1. **`server/storage-supabase.ts`** (line ~4839)
   - Changed: `wageringRequirement = amount * wageringMultiplier`
   - To: `wageringRequirement = bonusAmount * wageringMultiplier`

2. **`server/content-management.ts`** (line ~431)
   - Changed default wagering_multiplier from `0.3` to `3`
   - Updated comment to clarify it's multiplier of BONUS, not deposit

### SQL Scripts
- **`scripts/COMPLETE_DATABASE_FIX_AND_AUDIT.sql`** - Full diagnostic and fix script

---

## Correct Bonus Logic (After Fix)

| Deposit | Bonus (5%) | Wagering (30% of deposit) |
|---------|------------|---------------------------|
| ₹100,000 | ₹5,000 | ₹30,000 |
| ₹50,000 | ₹2,500 | ₹15,000 |
| ₹25,000 | ₹1,250 | ₹7,500 |

## Quick Fix - Run This SQL Now

## Quick SQL Commands to Run

```sql
-- 1. Check current settings
SELECT setting_key, setting_value FROM game_settings 
WHERE setting_key IN ('wagering_multiplier', 'default_deposit_bonus_percent');

-- 2. Fix wagering multiplier
UPDATE game_settings SET setting_value = '3' WHERE setting_key = 'wagering_multiplier';

-- 3. Fix existing locked bonuses
UPDATE deposit_bonuses SET wagering_required = bonus_amount * 3 WHERE status = 'locked';
UPDATE referral_bonuses SET wagering_required = bonus_amount * 3 WHERE status = 'locked';

-- 4. Verify fix
SELECT id, deposit_amount, bonus_amount, wagering_required, 
       bonus_amount * 3 as correct_wagering,
       CASE WHEN wagering_required = bonus_amount * 3 THEN 'OK' ELSE 'WRONG' END as status
FROM deposit_bonuses WHERE status = 'locked';
```

---

## After Running Fixes

1. **Restart the server** to pick up code changes
2. **Clear any caches** if applicable
3. **Test a new deposit** to verify wagering is calculated correctly
4. **Check admin pages** to verify stats are now correct

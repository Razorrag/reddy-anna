# Complete Database & Code Fixes Summary

## Issues Fixed

### 1. Bonus Wagering Calculation Bug (CRITICAL)
- **Problem**: Depositing ₹100,000 showed wagering of ₹300,000 instead of ₹30,000
- **Root Cause**: `wagering_multiplier = 3` was being applied to deposit (3 × 100k = 300k)
- **Correct Formula**: Wagering = 30% of DEPOSIT (0.3 × 100k = 30k)
- **Files Fixed**:
  - `server/storage-supabase.ts` - Line 4839: `wageringRequirement = amount * wageringMultiplier`
  - `server/storage-supabase.ts` - Line 5348: Referral bonus wagering
  - `server/content-management.ts` - Default multiplier changed to 0.3

### 2. Payout Per-Bet Calculation Bug (CRITICAL)
- **Problem**: Game statistics showing 2x-3x inflated payouts
- **Root Cause**: Total user payout was assigned to EACH bet instead of per-bet calculation
- **File Fixed**: `server/game.ts` - Lines 277-307

### 3. Player Stats Inconsistency
- **Problem**: `users.total_winnings`, `total_losses`, `games_played`, `games_won` don't match `player_bets`
- **Fix**: SQL script recalculates from source of truth

### 4. Analytics Tables Out of Sync
- **Problem**: `daily_game_statistics`, `monthly_game_statistics`, `yearly_game_statistics` have wrong data
- **Fix**: SQL script rebuilds from `game_statistics`

---

## Correct Formulas

| Setting | Value | Formula |
|---------|-------|---------|
| `wagering_multiplier` | `0.3` | Wagering = Deposit × 0.3 |
| `default_deposit_bonus_percent` | `5` | Bonus = Deposit × 0.05 |
| `referral_bonus_percent` | `5` | Referral Bonus = Deposit × 0.05 |

### Example
| Deposit | Bonus (5%) | Wagering Required (30%) |
|---------|------------|-------------------------|
| ₹100,000 | ₹5,000 | ₹30,000 |
| ₹50,000 | ₹2,500 | ₹15,000 |
| ₹25,000 | ₹1,250 | ₹7,500 |

---

## SQL to Run NOW

Run this in **Supabase SQL Editor**:

```sql
-- STEP 1: Fix wagering settings
UPDATE game_settings SET setting_value = '0.3' WHERE setting_key = 'wagering_multiplier';
UPDATE game_settings SET setting_value = '0.3' WHERE setting_key = 'referral_wagering_multiplier';

-- STEP 2: Fix locked deposit bonuses (30% of deposit)
UPDATE deposit_bonuses
SET wagering_required = deposit_amount * 0.3, updated_at = NOW()
WHERE status = 'locked';

-- STEP 3: Fix locked referral bonuses
UPDATE referral_bonuses
SET wagering_required = deposit_amount * 0.3, updated_at = NOW()
WHERE status = 'locked';

-- STEP 4: Recalculate player stats
UPDATE users u
SET 
  total_winnings = COALESCE(calc.winnings, 0),
  total_losses = COALESCE(calc.losses, 0),
  games_played = COALESCE(calc.games_played, 0),
  games_won = COALESCE(calc.games_won, 0),
  updated_at = NOW()
FROM (
  SELECT user_id,
    SUM(CASE WHEN status = 'won' THEN actual_payout ELSE 0 END) as winnings,
    SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END) as losses,
    COUNT(DISTINCT game_id) as games_played,
    COUNT(DISTINCT CASE WHEN status = 'won' THEN game_id END) as games_won
  FROM player_bets WHERE status IN ('won', 'lost', 'completed')
  GROUP BY user_id
) calc WHERE u.id = calc.user_id;

-- STEP 5: Verify
SELECT setting_key, setting_value FROM game_settings WHERE setting_key LIKE '%wager%';
SELECT id, deposit_amount, wagering_required, deposit_amount * 0.3 as correct FROM deposit_bonuses WHERE status = 'locked';
```

For **FULL database rebuild**, run: `scripts/IMMEDIATE_DATABASE_FIX.sql`

---

## After Fixes

1. **Restart server** to pick up code changes
2. **Test new deposit** to verify wagering = 30% of deposit
3. **Check admin pages** to verify stats are correct

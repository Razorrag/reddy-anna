# Bonus & Referral System Update

## Summary of Changes

### NEW FLOW (After Fix)

```
Player A deposits ₹100,000
├─ Gets ₹5,000 deposit bonus (5%) - LOCKED
├─ Wagering required: ₹30,000 (30% of deposit)
└─ Status: locked

Player B uses Player A's referral code
├─ Player B deposits ₹50,000
├─ Player B gets ₹2,500 deposit bonus - LOCKED (wagering: ₹15,000)
├─ Player A gets ₹2,500 referral bonus - LOCKED
│   └─ Linked to Player A's deposit bonus (no separate wagering!)
└─ Both bonuses will be credited TOGETHER

Player A plays and wagers ₹30,000:
├─ Player A's ₹5,000 deposit bonus → CREDITED
├─ Player A's ₹2,500 referral bonus → CREDITED (at same time!)
└─ Total credited to Player A: ₹7,500

Player B completes their own wagering (₹15,000):
└─ Player B's ₹2,500 deposit bonus → CREDITED
```

## Code Changes Made

### 1. `server/storage-supabase.ts`

#### `createReferralBonus()` - Lines 5403-5467
- **NEW**: Links referral bonus to referrer's latest locked deposit bonus
- **NEW**: Sets `wagering_required = 0` (no separate wagering)
- **NEW**: Adds `linked_deposit_bonus_id` field

#### `creditDepositBonus()` - Lines 5277-5329
- **NEW**: Calls `creditLinkedReferralBonuses()` after crediting deposit bonus

#### `creditLinkedReferralBonuses()` - Lines 5331-5401 (NEW FUNCTION)
- Credits all referral bonuses linked to a deposit bonus
- Updates user balance with total referral bonus
- Marks `user_referrals.bonus_applied = true`

#### `updateReferralBonusWagering()` - Lines 5474-5479
- **DEPRECATED**: No longer tracks separate wagering
- Referral bonuses are now credited with linked deposit bonus

#### `getUserBonusInfo()` - Lines 3354-3417
- **ENHANCED**: Now includes:
  - `totalReferrals` - Number of users referred
  - `referralsWithDeposit` - Referrals who deposited
  - `referralCode` - User's referral code
  - `pendingDepositBonus` - Locked deposit bonus amount
  - `pendingReferralBonus` - Locked referral bonus amount
  - `pendingCreditOnWagering` - Total to be credited when wagering complete
  - `wageringRemaining` - Amount left to wager

#### `getBonusSummary()` - Lines 5821-5947
- **ENHANCED**: Now includes wagering progress and referral stats

#### `getReferralBonuses()` - Lines 5630-5683
- **NEW**: Returns `linkedDepositBonusId` field

## Database Migration Required

Run this SQL in Supabase: `scripts/ADD_LINKED_DEPOSIT_BONUS_COLUMN.sql`

```sql
-- Add the column
ALTER TABLE referral_bonuses 
ADD COLUMN IF NOT EXISTS linked_deposit_bonus_id UUID REFERENCES deposit_bonuses(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_linked_deposit 
ON referral_bonuses(linked_deposit_bonus_id);

-- Link existing locked referral bonuses to deposit bonuses
-- (see full script for details)
```

## API Response Changes

### `/api/user/bonus-info` now returns:

```json
{
  "success": true,
  "data": {
    "depositBonus": 5000,
    "referralBonus": 2500,
    "totalBonus": 7500,
    "wageringRequired": 30000,
    "wageringCompleted": 15000,
    "wageringProgress": 50,
    "wageringRemaining": 15000,
    "bonusLocked": true,
    "totalReferrals": 3,
    "referralsWithDeposit": 2,
    "referralCode": "ABC12345",
    "pendingDepositBonus": 5000,
    "pendingReferralBonus": 2500,
    "pendingCreditOnWagering": 7500
  }
}
```

## Frontend Updates Needed

### `MobileTopBar.tsx`
- Show referral count badge
- Show combined bonus amount (deposit + referral)

### `profile.tsx`
- Show wagering progress bar
- Show "Wager ₹X more to unlock ₹Y (deposit) + ₹Z (referral)"
- Show referral code with copy button
- Show list of referred users

## Testing

1. Run the SQL migration
2. Restart the server
3. Test flow:
   - Player A deposits → Gets deposit bonus (locked)
   - Player B uses A's code and deposits → A gets referral bonus (locked, linked)
   - Player A plays and completes wagering → Both bonuses credited together

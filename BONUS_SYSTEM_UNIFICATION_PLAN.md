# Bonus System Unification Plan

## Problem Summary

You have **two overlapping bonus systems** running simultaneously:

### 1. Legacy System (User-Level Aggregated)
- **Fields**: `deposit_bonus_available`, `referral_bonus_available`, `bonus_locked`, `wagering_requirement`, `wagering_completed`
- **Logic**: 
  - `trackWagering()` increments `wagering_completed` if `bonus_locked` is true
  - `checkAndUnlockBonus()` moves total bonus to balance when requirement met
  - `addUserBonus()` updates aggregated bonus fields
- **Problem**: `approvePaymentRequestAtomic()` does NOT set `bonus_locked` or `wagering_requirement`, so legacy tracking does nothing for new deposits

### 2. New System (Per-Record)
- **Tables**: `deposit_bonuses`, `referral_bonuses`, `bonus_transactions`
- **Logic**:
  - `createDepositBonus()` creates locked bonus record
  - `updateDepositBonusWagering()` tracks per-deposit wagering
  - `checkBonusThresholds()` credits bonus when wallet crosses thresholds
- **Problem**: Admin manual bonuses use legacy `addUserBonus()` and don't create records in new tables

### 3. Current Inconsistencies

#### In `handlePlayerBet` (game-handlers.ts:195-225)
```typescript
// BOTH systems called in parallel:
await storage.trackWagering(userId, amount);           // Legacy
const bonusUnlocked = await storage.checkAndUnlockBonus(userId); // Legacy
await storage.checkBonusThresholds(userId);            // New
await storage.updateDepositBonusWagering(userId, amount); // New
```

**Result**: 
- Legacy system does nothing (no `bonus_locked` set for new deposits)
- New system works via thresholds
- WebSocket sends `bonus_unlocked` (legacy) AND `bonus_update` (new) events
- Potential double-credit if both systems active

#### In `approvePaymentRequestAtomic` (storage-supabase.ts:4589)
```typescript
// Creates deposit_bonuses record (new system)
await this.createDepositBonus({...});

// But does NOT set legacy fields:
// ❌ bonus_locked = true
// ❌ wagering_requirement = X
// ❌ wagering_completed = 0
```

**Result**: Legacy `trackWagering()` does nothing because `bonus_locked` is false

#### In Admin Manual Bonus (routes.ts:4134)
```typescript
// Uses legacy system only:
await storage.addUserBonus(userId, amount, bonusType, 0);
await storage.addTransaction({...}); // Generic transaction

// Does NOT:
// ❌ Create deposit_bonuses/referral_bonuses record
// ❌ Call logBonusTransaction()
```

**Result**: 
- Admin panel analytics (built on new tables) don't show manual bonuses
- User profile bonus history doesn't show manual bonuses
- "Total Bonus Paid" in admin is incorrect

---

## Solution: Standardize on New System

### Phase 1: Stop Writing to Legacy Fields (Immediate)

#### 1.1 Update `handlePlayerBet` - Remove Legacy Calls

**File**: `server/socket/game-handlers.ts` (lines 195-225)

**Current**:
```typescript
// ✅ Track wagering for bonus unlock
try {
  await storage.trackWagering(userId, amount);
  const bonusUnlocked = await storage.checkAndUnlockBonus(userId);
  if (bonusUnlocked && bonusUnlocked.unlocked) {
    ws.send(JSON.stringify({
      type: 'bonus_unlocked',
      data: { ... }
    }));
  }
} catch (wageringError) {
  console.error('⚠️ Error tracking wagering:', wageringError);
}

// Check deposit bonus thresholds after balance change
try {
  await storage.checkBonusThresholds(userId);
  ws.send(JSON.stringify({
    type: 'bonus_update',
    data: { message: 'Bonus status updated', timestamp: Date.now() }
  }));
} catch (e) {}
```

**Change to**:
```typescript
// ✅ NEW: Track wagering for deposit bonuses (unified system)
try {
  await storage.updateDepositBonusWagering(userId, amount);
  await storage.checkBonusThresholds(userId);
  
  // Send single unified event
  ws.send(JSON.stringify({
    type: 'bonus_update',
    data: { 
      message: 'Bonus status updated', 
      timestamp: Date.now() 
    }
  }));
} catch (wageringError) {
  console.error('⚠️ Error tracking wagering:', wageringError);
}
```

**Remove duplicate call** at line 295:
```typescript
// ✅ NEW: Track wagering for deposit bonuses
try {
  await storage.updateDepositBonusWagering(userId, amount);
  console.log(`📊 Wagering tracked: ${userId} - ₹${amount} towards bonus unlock`);
} catch (wageringError) {
  console.error('⚠️ Error tracking wagering:', wageringError);
}
```
This is now redundant - remove it.

#### 1.2 Update Admin Manual Bonus - Use New System

**File**: `server/routes.ts` (line 4115)

**Current**:
```typescript
app.post("/api/admin/apply-bonus", generalLimiter, async (req, res) => {
  try {
    const { userId, bonusType, amount, reason } = req.body;
    
    // Apply bonus to user
    await storage.addUserBonus(userId, amount, bonusType, 0);
    
    // Add transaction record
    const user = await storage.getUserById(userId);
    if (user) {
      const balanceBefore = parseFloat(user.balance);
      await storage.updateUserBalance(userId, amount);
      const balanceAfter = balanceBefore + amount;
      
      await storage.addTransaction({
        userId,
        transactionType: 'bonus',
        amount,
        balanceBefore,
        balanceAfter,
        referenceId: `manual_bonus_${Date.now()}`,
        description: reason || `Manual ${bonusType} applied by admin`
      });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error applying bonus:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Change to**:
```typescript
app.post("/api/admin/apply-bonus", generalLimiter, async (req, res) => {
  try {
    const { userId, bonusType, amount, reason } = req.body;
    
    // Validate inputs
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid userId or amount' 
      });
    }
    
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const balanceBefore = parseFloat(user.balance);
    
    // ✅ NEW: Use unified bonus system
    if (bonusType === 'deposit_bonus' || bonusType === 'manual_bonus') {
      // Create deposit bonus record (immediately credited)
      const bonusId = await storage.createDepositBonus({
        userId: userId,
        depositRequestId: `manual_${Date.now()}`, // Manual bonus marker
        depositAmount: 0, // No associated deposit
        bonusAmount: amount,
        bonusPercentage: 0,
        wageringRequired: 0 // No wagering for manual bonuses
      });
      
      // Credit immediately
      await storage.updateUserBalance(userId, amount);
      const balanceAfter = balanceBefore + amount;
      
      // Mark as credited
      await supabaseServer
        .from('deposit_bonuses')
        .update({
          status: 'credited',
          credited_at: new Date().toISOString()
        })
        .eq('id', bonusId);
      
      // Log via new system
      await storage.logBonusTransaction({
        userId,
        bonusType: 'deposit_bonus',
        bonusSourceId: bonusId,
        amount,
        balanceBefore,
        balanceAfter,
        action: 'credited',
        description: reason || `Manual bonus applied by admin`
      });
      
    } else if (bonusType === 'referral_bonus') {
      // Create referral bonus record (immediately credited)
      const bonusId = await storage.createReferralBonus({
        referrerUserId: userId,
        referredUserId: `manual_${Date.now()}`, // Manual marker
        depositAmount: 0,
        bonusAmount: amount,
        bonusPercentage: 0
      });
      // createReferralBonus auto-credits, so balance already updated
    }
    
    // Notify user via WebSocket
    clients.forEach(c => {
      if (c.userId === userId && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify({
          type: 'bonus_update',
          data: { 
            message: `Admin bonus credited: ₹${amount}`,
            timestamp: Date.now() 
          }
        }));
      }
    });
    
    res.json({ success: true, bonusAmount: amount });
  } catch (error: any) {
    console.error('Error applying bonus:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 1.3 Add Helper Function for Bonus Transaction Logging

**File**: `server/storage-supabase.ts` (add after line 5200)

```typescript
/**
 * Log a bonus transaction for history/analytics
 */
async logBonusTransaction(data: {
  userId: string;
  bonusType: 'deposit_bonus' | 'referral_bonus';
  bonusSourceId: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  action: 'added' | 'locked' | 'unlocked' | 'credited' | 'wagering_progress';
  description: string;
}): Promise<void> {
  try {
    const { error } = await supabaseServer
      .from('bonus_transactions')
      .insert({
        user_id: data.userId,
        bonus_type: data.bonusType,
        bonus_source_id: data.bonusSourceId,
        amount: data.amount,
        balance_before: data.balanceBefore,
        balance_after: data.balanceAfter,
        action: data.action,
        description: data.description,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging bonus transaction:', error);
      // Don't throw - logging is non-critical
    }
  } catch (error) {
    console.error('Error in logBonusTransaction:', error);
  }
}
```

### Phase 2: Frontend Alignment (Already Done)

Your frontend already uses the new system:
- ✅ Profile loads from `/api/user/bonus-summary`, `/deposit-bonuses`, `/referral-bonuses`, `/bonus-transactions`
- ✅ Admin panel uses new analytics endpoints
- ✅ Listens for `bonus_update` DOM event

**No changes needed** - frontend is already correct!

### Phase 3: Legacy Data Migration (Optional)

For users with existing legacy bonuses in `deposit_bonus_available`/`referral_bonus_available`:

**Option A**: Leave as-is, let them unlock via legacy path (keep `trackWagering`/`checkAndUnlockBonus` for backward compat)

**Option B**: Migrate to new system with SQL script:
```sql
-- Create deposit_bonuses records for existing legacy bonuses
INSERT INTO deposit_bonuses (
  user_id, 
  deposit_request_id, 
  deposit_amount, 
  bonus_amount, 
  bonus_percentage, 
  wagering_required,
  wagering_completed,
  status,
  created_at
)
SELECT 
  id,
  'legacy_migration',
  COALESCE(original_deposit_amount, 0),
  COALESCE(deposit_bonus_available, 0),
  0,
  COALESCE(wagering_requirement, 0),
  COALESCE(wagering_completed, 0),
  CASE 
    WHEN bonus_locked THEN 'locked'
    ELSE 'credited'
  END,
  created_at
FROM users
WHERE COALESCE(deposit_bonus_available, 0) > 0
  OR COALESCE(referral_bonus_available, 0) > 0;

-- Reset legacy fields after migration
UPDATE users
SET 
  deposit_bonus_available = 0,
  referral_bonus_available = 0,
  bonus_locked = false,
  wagering_requirement = 0,
  wagering_completed = 0
WHERE COALESCE(deposit_bonus_available, 0) > 0
  OR COALESCE(referral_bonus_available, 0) > 0;
```

---

## Implementation Checklist

- [ ] 1. Update `handlePlayerBet` to remove legacy calls (game-handlers.ts)
- [ ] 2. Add `logBonusTransaction` helper if missing (storage-supabase.ts)
- [ ] 3. Update admin manual bonus endpoint (routes.ts)
- [ ] 4. Test deposit approval flow (verify bonus record created)
- [ ] 5. Test betting flow (verify wagering tracked, thresholds checked)
- [ ] 6. Test admin manual bonus (verify appears in analytics)
- [ ] 7. Verify WebSocket events (only `bonus_update`, not `bonus_unlocked`)
- [ ] 8. Check admin analytics (Total Bonus Paid should include manual bonuses)
- [ ] 9. Check user profile (bonus history should show all bonuses)
- [ ] 10. (Optional) Migrate legacy bonus data

---

## Expected Results After Fix

### For New Deposits
1. Admin approves deposit → `createDepositBonus()` creates locked record
2. User bets → `updateDepositBonusWagering()` tracks progress
3. Wallet crosses threshold → `checkBonusThresholds()` credits bonus
4. User sees bonus in profile timeline
5. Admin sees bonus in analytics

### For Admin Manual Bonuses
1. Admin applies bonus → Creates `deposit_bonuses` or `referral_bonuses` record
2. Bonus immediately credited to balance
3. Logged via `logBonusTransaction()`
4. Appears in user profile bonus history
5. Appears in admin analytics "Total Bonus Paid"

### For Legacy Bonuses (if not migrated)
1. Keep `trackWagering`/`checkAndUnlockBonus` for backward compat
2. Add feature flag to skip legacy calls for users with only new bonuses
3. Eventually deprecate after all users migrated

---

## Testing Commands

```bash
# Test deposit approval
curl -X POST http://localhost:5000/api/admin/approve-payment \
  -H "Content-Type: application/json" \
  -d '{"requestId": "xxx", "userId": "yyy", "amount": 1000}'

# Test manual bonus
curl -X POST http://localhost:5000/api/admin/apply-bonus \
  -H "Content-Type: application/json" \
  -d '{"userId": "xxx", "bonusType": "deposit_bonus", "amount": 500, "reason": "Test"}'

# Check bonus records
SELECT * FROM deposit_bonuses WHERE user_id = 'xxx' ORDER BY created_at DESC;
SELECT * FROM bonus_transactions WHERE user_id = 'xxx' ORDER BY created_at DESC;
```

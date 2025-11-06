# Per-Deposit Bonus Tracking - CRITICAL FIX REQUIRED

## 🎯 Critical Issue Identified

### **Current System (WRONG):**

**Problem:** All bonuses accumulated into single field with single wagering requirement

**Example:**
```
Deposit 1: ₹10,000 → Bonus ₹500 → Wagering ₹3,000
Deposit 2: ₹100,000 → Bonus ₹5,000 → Wagering ₹30,000

Current System:
- deposit_bonus_available: ₹5,500 (accumulated)
- wagering_requirement: ₹30,000 (OVERWRITES previous ₹3,000!)
- wagering_completed: ₹0

Result: User must wager ₹30,000 to claim ALL ₹5,500
❌ WRONG! First ₹500 should be claimable after ₹3,000
```

---

### **Required System (CORRECT):**

**Solution:** Track each deposit's bonus separately with its own wagering requirement

**Example:**
```
Deposit 1: ₹10,000 → Bonus ₹500 → Wagering ₹3,000
Deposit 2: ₹100,000 → Bonus ₹5,000 → Wagering ₹30,000

New System:
bonus_tracking table:
┌────┬─────────┬────────┬──────────┬────────┬──────────┐
│ ID │ Deposit │ Bonus  │ Required │ Done   │ Status   │
├────┼─────────┼────────┼──────────┼────────┼──────────┤
│ 1  │ ₹10k    │ ₹500   │ ₹3k      │ ₹3.5k  │ unlocked │
│ 2  │ ₹100k   │ ₹5,000 │ ₹30k     │ ₹3.5k  │ locked   │
└────┴─────────┴────────┴──────────┴────────┴──────────┘

User bets ₹3,500:
- Bonus 1: ₹3,500 / ₹3,000 = 117% → UNLOCKED ✅
- Bonus 2: ₹3,500 / ₹30,000 = 12% → LOCKED ❌

User can claim: ₹500 (Bonus 1 only)
User cannot claim: ₹5,000 (Bonus 2 still locked)
```

---

## ✅ Solution Architecture

### **1. New Database Table: `bonus_tracking`**

**Schema:**
```sql
CREATE TABLE bonus_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  bonus_type VARCHAR(50), -- 'deposit_bonus' or 'referral_bonus'
  bonus_amount DECIMAL(15, 2),
  deposit_amount DECIMAL(15, 2), -- Original deposit
  wagering_requirement DECIMAL(15, 2),
  wagering_completed DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'locked', -- 'locked', 'unlocked', 'claimed'
  created_at TIMESTAMP,
  unlocked_at TIMESTAMP,
  claimed_at TIMESTAMP
);
```

**Purpose:**
- Each row = One bonus from one deposit
- Tracks individual wagering progress
- Allows partial claiming (unlocked bonuses only)

---

### **2. Updated Deposit Approval Logic**

**File:** `server/storage-supabase.ts`

**OLD (Wrong):**
```typescript
async approvePaymentRequestAtomic() {
  // Calculate bonus
  const bonusAmount = amount * (bonusPercent / 100);
  const wageringRequirement = amount * wageringMultiplier;
  
  // ❌ WRONG: Overwrites existing bonus and wagering
  await supabaseServer
    .from('users')
    .update({
      deposit_bonus_available: bonusAmount, // Overwrites!
      wagering_requirement: wageringRequirement, // Overwrites!
      wagering_completed: 0 // Resets!
    });
}
```

**NEW (Correct):**
```typescript
async approvePaymentRequestAtomic() {
  // Calculate bonus
  const bonusAmount = amount * (bonusPercent / 100);
  const wageringRequirement = amount * wageringMultiplier;
  
  // ✅ CORRECT: Create new bonus tracking entry
  await supabaseServer
    .from('bonus_tracking')
    .insert({
      user_id: userId,
      bonus_type: 'deposit_bonus',
      bonus_amount: bonusAmount,
      deposit_amount: amount,
      wagering_requirement: wageringRequirement,
      wagering_completed: 0,
      status: 'locked'
    });
  
  // Keep users table fields for backward compatibility (sum of all)
  const allBonuses = await this.getUserBonuses(userId);
  await supabaseServer
    .from('users')
    .update({
      deposit_bonus_available: allBonuses.totalLocked
    });
}
```

---

### **3. Updated Wagering Tracking Logic**

**File:** `server/storage-supabase.ts`

**OLD (Wrong):**
```typescript
async trackWagering(userId: string, betAmount: number) {
  // ❌ WRONG: Updates single wagering_completed field
  const currentCompleted = parseFloat(user.wagering_completed || '0');
  const newCompleted = currentCompleted + betAmount;
  
  await supabaseServer
    .from('users')
    .update({ wagering_completed: newCompleted });
}
```

**NEW (Correct):**
```typescript
async trackWagering(userId: string, betAmount: number) {
  // ✅ CORRECT: Update ALL locked bonuses
  const lockedBonuses = await supabaseServer
    .from('bonus_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'locked');
  
  for (const bonus of lockedBonuses.data) {
    const newCompleted = bonus.wagering_completed + betAmount;
    
    await supabaseServer
      .from('bonus_tracking')
      .update({ wagering_completed: newCompleted })
      .eq('id', bonus.id);
    
    // Check if this bonus should be unlocked
    if (newCompleted >= bonus.wagering_requirement) {
      await supabaseServer
        .from('bonus_tracking')
        .update({ 
          status: 'unlocked',
          unlocked_at: new Date().toISOString()
        })
        .eq('id', bonus.id);
      
      console.log(`🎉 Bonus ${bonus.id} unlocked! ₹${bonus.bonus_amount}`);
    }
  }
}
```

---

### **4. Updated Bonus Info API**

**File:** `server/storage-supabase.ts`

**OLD (Wrong):**
```typescript
async getUserBonusInfo(userId: string) {
  const user = await this.getUser(userId);
  
  return {
    depositBonus: parseFloat(user.deposit_bonus_available || '0'),
    referralBonus: parseFloat(user.referral_bonus_available || '0'),
    totalBonus: depositBonus + referralBonus,
    wageringRequired: parseFloat(user.wagering_requirement || '0'),
    wageringCompleted: parseFloat(user.wagering_completed || '0'),
    bonusLocked: user.bonus_locked
  };
}
```

**NEW (Correct):**
```typescript
async getUserBonusInfo(userId: string) {
  // Get all bonuses from tracking table
  const { data: bonuses } = await supabaseServer
    .from('bonus_tracking')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['locked', 'unlocked']);
  
  const locked = bonuses.filter(b => b.status === 'locked');
  const unlocked = bonuses.filter(b => b.status === 'unlocked');
  
  return {
    // Claimable bonuses (unlocked)
    claimableAmount: unlocked.reduce((sum, b) => sum + b.bonus_amount, 0),
    claimableBonuses: unlocked.map(b => ({
      id: b.id,
      amount: b.bonus_amount,
      depositAmount: b.deposit_amount,
      unlockedAt: b.unlocked_at
    })),
    
    // Locked bonuses (not yet claimable)
    lockedAmount: locked.reduce((sum, b) => sum + b.bonus_amount, 0),
    lockedBonuses: locked.map(b => ({
      id: b.id,
      amount: b.bonus_amount,
      depositAmount: b.deposit_amount,
      wageringRequired: b.wagering_requirement,
      wageringCompleted: b.wagering_completed,
      wageringProgress: (b.wagering_completed / b.wagering_requirement) * 100
    })),
    
    // Totals
    totalBonus: unlocked.reduce((sum, b) => sum + b.bonus_amount, 0) +
                locked.reduce((sum, b) => sum + b.bonus_amount, 0),
    totalClaimable: unlocked.reduce((sum, b) => sum + b.bonus_amount, 0),
    totalLocked: locked.reduce((sum, b) => sum + b.bonus_amount, 0)
  };
}
```

---

### **5. Updated Claim Bonus Logic**

**File:** `server/payment.ts`

**OLD (Wrong):**
```typescript
async applyAvailableBonus(userId: string) {
  const bonusInfo = await storage.getUserBonusInfo(userId);
  
  // ❌ WRONG: Claims ALL bonus if unlocked
  if (!bonusInfo.bonusLocked && bonusInfo.totalBonus > 0) {
    await storage.updateUserBalance(userId, bonusInfo.totalBonus);
    await storage.resetUserBonus(userId);
  }
}
```

**NEW (Correct):**
```typescript
async applyAvailableBonus(userId: string) {
  const bonusInfo = await storage.getUserBonusInfo(userId);
  
  // ✅ CORRECT: Claim only unlocked bonuses
  if (bonusInfo.claimableAmount > 0) {
    // Add claimable amount to balance
    await storage.updateUserBalance(userId, bonusInfo.claimableAmount);
    
    // Mark unlocked bonuses as claimed
    await supabaseServer
      .from('bonus_tracking')
      .update({ 
        status: 'claimed',
        claimed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'unlocked');
    
    console.log(`✅ Claimed ₹${bonusInfo.claimableAmount} (${bonusInfo.claimableBonuses.length} bonuses)`);
    
    // Locked bonuses remain locked
    if (bonusInfo.lockedAmount > 0) {
      console.log(`🔒 Still locked: ₹${bonusInfo.lockedAmount} (${bonusInfo.lockedBonuses.length} bonuses)`);
    }
    
    return true;
  }
  
  return false;
}
```

---

## 📊 Example Scenarios

### **Scenario 1: Two Deposits**

**Timeline:**
```
Day 1:
- User deposits ₹10,000
- Bonus: ₹500 (5%)
- Wagering required: ₹3,000 (30%)
- bonus_tracking: [{ id: 1, amount: 500, required: 3000, completed: 0, status: 'locked' }]

Day 2:
- User bets ₹1,000
- bonus_tracking: [{ id: 1, amount: 500, required: 3000, completed: 1000, status: 'locked' }]
- Progress: 33%

Day 3:
- User deposits ₹100,000
- Bonus: ₹5,000 (5%)
- Wagering required: ₹30,000 (30%)
- bonus_tracking: [
    { id: 1, amount: 500, required: 3000, completed: 1000, status: 'locked' },
    { id: 2, amount: 5000, required: 30000, completed: 0, status: 'locked' }
  ]

Day 4:
- User bets ₹2,500
- bonus_tracking: [
    { id: 1, amount: 500, required: 3000, completed: 3500, status: 'unlocked' }, ← UNLOCKED!
    { id: 2, amount: 5000, required: 30000, completed: 2500, status: 'locked' }
  ]
- Claimable: ₹500 ✅
- Locked: ₹5,000 ❌

Day 5:
- User clicks "Claim Bonus"
- Claims: ₹500 (Bonus 1)
- Balance increases by ₹500
- bonus_tracking: [
    { id: 1, amount: 500, status: 'claimed' }, ← CLAIMED
    { id: 2, amount: 5000, required: 30000, completed: 2500, status: 'locked' }
  ]

Day 6:
- User bets ₹28,000 more
- bonus_tracking: [
    { id: 1, status: 'claimed' },
    { id: 2, amount: 5000, required: 30000, completed: 30500, status: 'unlocked' } ← UNLOCKED!
  ]
- Claimable: ₹5,000 ✅

Day 7:
- User clicks "Claim Bonus"
- Claims: ₹5,000 (Bonus 2)
- Balance increases by ₹5,000
- bonus_tracking: [
    { id: 1, status: 'claimed' },
    { id: 2, status: 'claimed' } ← CLAIMED
  ]
```

---

### **Scenario 2: Multiple Small Deposits**

**Timeline:**
```
Deposit 1: ₹5,000 → Bonus ₹250 → Wagering ₹1,500
Deposit 2: ₹5,000 → Bonus ₹250 → Wagering ₹1,500
Deposit 3: ₹10,000 → Bonus ₹500 → Wagering ₹3,000

User bets ₹2,000:
- Bonus 1: ₹2,000 / ₹1,500 = 133% → UNLOCKED ✅
- Bonus 2: ₹2,000 / ₹1,500 = 133% → UNLOCKED ✅
- Bonus 3: ₹2,000 / ₹3,000 = 67% → LOCKED ❌

User can claim: ₹500 (Bonus 1 + 2)
User cannot claim: ₹500 (Bonus 3)

User bets ₹1,500 more:
- Bonus 3: ₹3,500 / ₹3,000 = 117% → UNLOCKED ✅

User can now claim: ₹500 (Bonus 3)
```

---

## 🎨 UI Changes Required

### **Bonus Display:**

**OLD:**
```
🔒 ₹5,500 (locked)
or
🎁 ₹5,500 (unlocked)
```

**NEW:**
```
🎁 ₹500 (claimable)
🔒 ₹5,000 (locked - 12% done)

Details:
- Bonus 1: ₹500 ✅ Claimable (from ₹10k deposit)
- Bonus 2: ₹5,000 🔒 Locked 12% (from ₹100k deposit)
```

---

### **Claim Button:**

**OLD:**
```
[Claim ₹5,500 Bonus]
```

**NEW:**
```
[Claim ₹500 Bonus]  ← Only claimable amount
(₹5,000 still locked - keep wagering!)
```

---

## 🚀 Implementation Steps

### **Step 1: Database Migration**
```bash
Run: add_bonus_tracking_table.sql
- Creates bonus_tracking table
- Adds indexes
```

### **Step 2: Migrate Existing Data**
```sql
-- Migrate existing bonuses to new table
INSERT INTO bonus_tracking (user_id, bonus_type, bonus_amount, wagering_requirement, wagering_completed, status)
SELECT 
  id as user_id,
  'deposit_bonus',
  CAST(deposit_bonus_available AS DECIMAL),
  CAST(wagering_requirement AS DECIMAL),
  CAST(wagering_completed AS DECIMAL),
  CASE 
    WHEN bonus_locked = true THEN 'locked'
    ELSE 'unlocked'
  END
FROM users
WHERE CAST(deposit_bonus_available AS DECIMAL) > 0;
```

### **Step 3: Update Backend Code**
- `storage-supabase.ts`: Add new methods for bonus_tracking
- `payment.ts`: Update claim logic
- `socket/game-handlers.ts`: Update wagering tracking

### **Step 4: Update Frontend**
- Show claimable vs locked bonuses separately
- Display progress for each locked bonus
- Update claim button to show only claimable amount

---

## ⚠️ CRITICAL: Current System Issues

### **Issue 1: Wagering Requirement Overwrite**
```
User deposits ₹10k → wagering_requirement = ₹3k
User deposits ₹100k → wagering_requirement = ₹30k (OVERWRITES ₹3k!)

Result: First ₹500 bonus now requires ₹30k wagering ❌
```

### **Issue 2: Cannot Claim Partial Bonuses**
```
User has ₹500 unlocked + ₹5,000 locked
Current system: Cannot claim anything (all or nothing) ❌
Required: Should claim ₹500 only ✅
```

### **Issue 3: Wagering Progress Lost**
```
User bets ₹2k towards first bonus
User deposits again → wagering_completed resets to 0 ❌
Result: Lost ₹2k progress
```

---

## ✅ Benefits of New System

1. **Fair Wagering:** Each bonus has its own requirement
2. **Partial Claiming:** Claim unlocked bonuses, keep locked ones
3. **Progress Preservation:** Wagering progress never lost
4. **Transparency:** User sees exactly which bonuses are claimable
5. **Compliance:** Proper bonus tracking for auditing

---

## 🧪 Testing Checklist

### **Test 1: Two Deposits**
```bash
1. Deposit ₹10k (get ₹500 bonus)
2. Bet ₹3.5k (unlock first bonus)
3. Deposit ₹100k (get ₹5k bonus)
4. Check bonus display

Expected:
✅ Shows: 🎁 ₹500 (claimable)
✅ Shows: 🔒 ₹5,000 (locked - 12% done)
✅ Can claim ₹500 only
```

### **Test 2: Claim Partial**
```bash
1. From Test 1, click "Claim Bonus"

Expected:
✅ Balance increases by ₹500
✅ ₹5,000 still locked
✅ Button now shows: "Claim ₹0" (disabled)
✅ Shows: "₹5,000 locked - keep wagering!"
```

### **Test 3: Unlock Second Bonus**
```bash
1. From Test 2, bet ₹28k more
2. Check bonus display

Expected:
✅ ₹5,000 unlocks
✅ Shows: 🎁 ₹5,000 (claimable)
✅ Can claim ₹5,000
```

---

## 📝 Summary

**Current System:** ❌ BROKEN
- Single wagering requirement (overwrites)
- All-or-nothing claiming
- Progress lost on new deposits

**New System:** ✅ CORRECT
- Per-deposit wagering tracking
- Partial claiming (unlocked only)
- Progress preserved forever

**Implementation Required:** YES - Database migration + Code changes

**Priority:** 🔴 **CRITICAL** - Current system is unfair to users

---

**This is a fundamental architectural change required for fair bonus management!**

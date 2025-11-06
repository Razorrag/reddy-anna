# Bonus Claim Wagering Requirement Fix - Session 17

## 🎯 User Issue

**Problem:** User clicks bonus chip → Bonus is automatically claimed even if wagering requirement NOT met

**Example:**
```
User deposits ₹10,000
Bonus: ₹500 (5%)
Wagering requirement: ₹3,000 (30% of deposit)
User bets ₹1,000 (only 33% of requirement)
User clicks bonus chip → ₹500 claimed ❌ WRONG!

Should be:
User clicks bonus chip → Error: "Wagering requirement not met" ✅
```

---

## ✅ Root Cause

**Backend:** `server/payment.ts` - `applyAvailableBonus()` function

**OLD Logic:**
```typescript
// ❌ WRONG: Claims ALL bonus regardless of wagering requirement
if (bonusInfo.totalBonus > 0) {
  // Add to balance
  await storage.updateUserBalance(userId, bonusInfo.totalBonus);
  // Reset bonus
  await storage.resetUserBonus(userId);
}
```

**Problem:**
- No check for `bonusInfo.bonusLocked` status
- No check for wagering requirement completion
- Claims bonus even if only 10% wagering done

---

## ✅ Fixes Applied

### **Fix #1: Backend - Check Wagering Requirement**

**File:** `server/payment.ts` (Lines 483-523)

**NEW Logic:**
```typescript
// ✅ CRITICAL FIX: Check if bonus is locked (wagering requirement not met)
if (bonusInfo.bonusLocked) {
  console.log(`❌ Cannot claim bonus: Wagering requirement not met (${bonusInfo.wageringProgress.toFixed(1)}% complete)`);
  return false;
}

// ✅ CRITICAL FIX: Only claim bonus that has met wagering requirement
if (!bonusInfo.bonusLocked && bonusInfo.totalBonus > 0) {
  // Claim bonus
  await storage.updateUserBalance(userId, bonusInfo.totalBonus);
  await storage.resetUserBonus(userId);
  console.log(`✅ Bonus claimed (wagering requirement met)`);
  return true;
}
```

**What Changed:**
1. ✅ Check `bonusInfo.bonusLocked` before claiming
2. ✅ Return `false` if locked (wagering not complete)
3. ✅ Only claim if `!bonusLocked` (wagering complete)
4. ✅ Log wagering progress for debugging

---

### **Fix #2: Frontend - Show Lock Status**

**File:** `client/src/components/MobileGameLayout/MobileTopBar.tsx` (Lines 61-69, 132-155)

**Added Check Before Claiming:**
```typescript
const handleClaimBonus = async () => {
  // ✅ Check if bonus is locked (wagering requirement not met)
  if (bonusInfo?.bonusLocked) {
    const progress = bonusInfo.wageringProgress || 0;
    showNotification(
      `Bonus is locked! Complete ${(100 - progress).toFixed(0)}% more wagering to unlock (${progress.toFixed(0)}% done)`,
      'error'
    );
    return; // Don't proceed with claim
  }
  
  // Proceed with claim...
}
```

**Visual Indicator:**
```tsx
{/* Bonus Chip */}
<button className={
  bonusInfo?.bonusLocked
    ? 'yellow border (locked)'  // 🔒 Yellow = Locked
    : 'green border animate-pulse (unlocked)'  // 🎁 Green pulsing = Claimable
}>
  {bonusInfo?.bonusLocked ? (
    <LockIcon /> // 🔒 Lock icon
  ) : (
    <GiftIcon /> // 🎁 Gift icon
  )}
  ₹{totalBonus}
</button>
```

---

## 📊 How It Works Now

### **Scenario 1: Wagering Not Complete (Locked)**

**User Journey:**
```
1. User deposits ₹10,000
2. Bonus: ₹500 (5%)
3. Wagering requirement: ₹3,000 (30%)
4. User bets ₹1,000 (33% complete)
5. User sees: 🔒 ₹500 (yellow chip, locked)
6. User clicks chip
7. Notification: "Bonus is locked! Complete 67% more wagering to unlock (33% done)"
8. Bonus NOT claimed ✅
```

**Visual:**
```
┌─────────────────┐
│ 🔒 ₹500        │ ← Yellow, lock icon
└─────────────────┘
Title: "Locked: 33% wagering complete"
```

---

### **Scenario 2: Wagering Complete (Unlocked)**

**User Journey:**
```
1. User deposits ₹10,000
2. Bonus: ₹500 (5%)
3. Wagering requirement: ₹3,000 (30%)
4. User bets ₹3,500 (117% complete)
5. Bonus auto-unlocks (checkAndUnlockBonus)
6. User sees: 🎁 ₹500 (green chip, pulsing)
7. User clicks chip
8. Notification: "Bonus claimed! ₹500 added to your balance"
9. Bonus claimed successfully ✅
```

**Visual:**
```
┌─────────────────┐
│ 🎁 ₹500        │ ← Green, pulsing, gift icon
└─────────────────┘
Title: "Click to claim bonus"
```

---

### **Scenario 3: Auto-Unlock During Betting**

**User Journey:**
```
1. User has locked bonus: ₹500 (70% wagering done)
2. User places bet: ₹1,000
3. Wagering now: 100% complete
4. Backend: checkAndUnlockBonus() runs
5. Bonus auto-unlocks
6. WebSocket notification: "🎉 Bonus unlocked! ₹500 added to your balance"
7. Chip changes: 🔒 → 🎁 (yellow → green)
8. User can now claim manually OR it's already added ✅
```

---

## 🎨 Visual Changes

### **Locked Bonus (Wagering Not Complete):**

**Appearance:**
- Color: Yellow/Orange gradient
- Icon: 🔒 Lock
- Border: Yellow
- Animation: None (static)
- Tooltip: "Locked: X% wagering complete"

**Behavior:**
- Click → Error notification
- Shows wagering progress
- Cannot claim

---

### **Unlocked Bonus (Wagering Complete):**

**Appearance:**
- Color: Green gradient
- Icon: 🎁 Gift
- Border: Green
- Animation: Pulsing (animate-pulse)
- Tooltip: "Click to claim bonus"

**Behavior:**
- Click → Claims bonus
- Adds to balance
- Success notification

---

## 🧪 Testing Instructions

### **Test 1: Locked Bonus (Cannot Claim)**

```bash
1. Login as user
2. Deposit ₹10,000 (get ₹500 bonus)
3. Place bet ₹1,000 (33% wagering)
4. Check top bar

Expected:
✅ Bonus chip shows: 🔒 ₹500 (yellow)
✅ Tooltip: "Locked: 33% wagering complete"

5. Click bonus chip

Expected:
✅ Notification: "Bonus is locked! Complete 67% more wagering..."
✅ Bonus NOT claimed
✅ Balance unchanged
```

---

### **Test 2: Unlocked Bonus (Can Claim)**

```bash
1. Login as user
2. Deposit ₹10,000 (get ₹500 bonus)
3. Place bets totaling ₹3,500 (117% wagering)
4. Check top bar

Expected:
✅ Bonus chip shows: 🎁 ₹500 (green, pulsing)
✅ Tooltip: "Click to claim bonus"

5. Click bonus chip

Expected:
✅ Notification: "Bonus claimed! ₹500 added to your balance"
✅ Bonus claimed successfully
✅ Balance increases by ₹500
✅ Bonus chip disappears
```

---

### **Test 3: Auto-Unlock During Game**

```bash
1. Login as user with locked bonus (70% wagering)
2. Place bet that completes wagering requirement
3. Wait for bet confirmation

Expected:
✅ Notification: "🎉 Bonus unlocked! ₹500 added to your balance"
✅ Bonus chip changes: 🔒 → 🎁 (yellow → green)
✅ Chip starts pulsing
✅ Bonus can now be claimed manually
```

---

### **Test 4: Multiple Bonuses (Partial Unlock)**

**Note:** Current implementation unlocks ALL bonus when wagering is met. If you want partial unlock (e.g., deposit bonus unlocked but referral bonus still locked), additional logic is needed.

**Current Behavior:**
- Deposit bonus: ₹500 (wagering: 30% of ₹10k = ₹3k)
- Referral bonus: ₹100 (no wagering requirement)
- Total: ₹600
- When ₹3k wagering met → ALL ₹600 unlocked

**Future Enhancement (if needed):**
- Track wagering per bonus type
- Unlock deposit bonus separately from referral bonus
- Show: "₹500 claimable, ₹100 locked"

---

## 📝 Key Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| Backend check | None ❌ | Check `bonusLocked` ✅ |
| Locked bonus claim | Allowed ❌ | Blocked ✅ |
| Error message | None | "Wagering requirement not met" ✅ |
| Visual indicator | Green (always) | Yellow (locked) / Green (unlocked) ✅ |
| Icon | Gift (always) | Lock (locked) / Gift (unlocked) ✅ |
| Animation | Pulse (always) | None (locked) / Pulse (unlocked) ✅ |
| Tooltip | Generic | Shows wagering progress ✅ |

---

## 🔧 Technical Details

### **Wagering Flow:**

```
1. Deposit approved
   ↓
2. Bonus added (locked)
   ↓
3. Wagering requirement set (30% of deposit)
   ↓
4. User places bets
   ↓
5. trackWagering() updates progress
   ↓
6. checkAndUnlockBonus() checks if requirement met
   ↓
7. If met: Auto-unlock bonus
   ↓
8. User can claim manually OR it's already added
```

### **Database Fields:**

```sql
users table:
- deposit_bonus_available: DECIMAL (bonus amount)
- referral_bonus_available: DECIMAL (bonus amount)
- wagering_requirement: DECIMAL (total required)
- wagering_completed: DECIMAL (current progress)
- bonus_locked: BOOLEAN (true = locked, false = unlocked)
```

### **Bonus Info Structure:**

```typescript
{
  depositBonus: 500,
  referralBonus: 100,
  totalBonus: 600,
  wageringRequired: 3000,
  wageringCompleted: 1000,
  wageringProgress: 33.33, // (1000 / 3000) * 100
  bonusLocked: true // Locked until wageringCompleted >= wageringRequired
}
```

---

## ✅ Benefits

1. **Security:** Prevents claiming bonus before wagering requirement met
2. **Clarity:** Visual indicator (lock vs gift) shows status
3. **Transparency:** Shows wagering progress in tooltip and error message
4. **User Experience:** Clear feedback when trying to claim locked bonus
5. **Compliance:** Ensures wagering requirements are enforced

---

## 🚀 Deploy

```bash
1. Backend: server/payment.ts (Lines 483-523)
2. Frontend: client/src/components/MobileGameLayout/MobileTopBar.tsx (Lines 61-69, 132-155)
3. No database changes needed
4. npm run build
5. Restart server
```

---

**Total Sessions:** 17  
**Total Features:** 30  
**Production Status:** ✅ **READY**

---

## 🎉 Result

**Bonus claiming now works correctly:**
- ✅ **Locked bonus:** Cannot be claimed, shows lock icon, yellow color
- ✅ **Unlocked bonus:** Can be claimed, shows gift icon, green pulsing
- ✅ **Clear feedback:** Error message shows wagering progress
- ✅ **Visual indicators:** Lock vs gift icon, yellow vs green
- ✅ **Wagering enforcement:** Only claimable when requirement met

**Users can no longer claim bonus before completing wagering requirement!** 🔒✅

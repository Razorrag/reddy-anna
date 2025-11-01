# Bonus System - Wagering Requirements Fix

## 🔴 Current Problem

**What's happening now:**
```
User deposits ₹1,00,000
  ↓
Bonus ₹30,000 calculated (30%)
  ↓
Bonus added to deposit_bonus_available field
  ↓
❌ WRONG: Bonus auto-credits immediately when:
  - Balance changes by ±30% (conditional bonus)
  - OR bonus amount reaches ₹500 threshold
```

**What should happen:**
```
User deposits ₹1,00,000
  ↓
Bonus ₹30,000 calculated (30%)
  ↓
Bonus stored as LOCKED in deposit_bonus_available
  ↓
User must WAGER (bet) at least ₹30,000 (30% of deposit)
  ↓
Once wagering requirement met → Bonus UNLOCKED
  ↓
Bonus added to main balance
```

---

## 🎯 Required Changes

### 1. Database Schema Updates

**Add to `users` table:**
```sql
-- Track wagering for bonus unlock
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  wagering_requirement DECIMAL(15, 2) DEFAULT '0.00';

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  wagering_completed DECIMAL(15, 2) DEFAULT '0.00';

ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  bonus_locked BOOLEAN DEFAULT FALSE;
```

**Fields explained:**
- `wagering_requirement`: Total amount user must wager to unlock bonus (e.g., ₹30,000)
- `wagering_completed`: Amount already wagered towards requirement (cumulative bets)
- `bonus_locked`: Whether bonus is currently locked

---

### 2. Bonus Calculation Logic

**When deposit approved:**
```typescript
// Example: User deposits ₹1,00,000

// 1. Add deposit to balance
balance += 100000; // Main balance

// 2. Calculate bonus (30% of deposit)
const bonusAmount = 100000 * 0.30; // = 30000

// 3. Add bonus to LOCKED bonus field
deposit_bonus_available += 30000;
bonus_locked = true;

// 4. Set wagering requirement (30% of deposit)
wagering_requirement = 100000 * 0.30; // = 30000
wagering_completed = 0;

// Result:
// - Main balance: ₹1,00,000 (can use for betting)
// - Locked bonus: ₹30,000 (shown separately, cannot use yet)
// - Must wager: ₹30,000 to unlock bonus
```

---

### 3. Wagering Tracking

**Every time user places a bet:**
```typescript
// User bets ₹5,000 on Andar
betAmount = 5000;

// 1. Deduct from main balance (as usual)
balance -= 5000;

// 2. Track towards wagering requirement
if (bonus_locked && wagering_requirement > 0) {
  wagering_completed += 5000;
  
  // Check if requirement met
  if (wagering_completed >= wagering_requirement) {
    // ✅ UNLOCK BONUS!
    balance += deposit_bonus_available;
    deposit_bonus_available = 0;
    bonus_locked = false;
    wagering_requirement = 0;
    wagering_completed = 0;
    
    // Notify user: "Bonus unlocked! ₹30,000 added to your balance"
  }
}

// Result after bet:
// - Main balance: ₹95,000
// - Wagering progress: ₹5,000 / ₹30,000 (16.67%)
// - Still need to wager: ₹25,000 more
```

---

### 4. Frontend Display

**Wallet Modal should show:**
```
┌─────────────────────────────┐
│ Main Balance: ₹95,000       │ ← Can use for betting
├─────────────────────────────┤
│ 🔒 Locked Bonus: ₹30,000    │ ← Cannot use yet
│                              │
│ Wagering Progress:           │
│ ▓▓▓░░░░░░░░░░░░░░ 16.67%   │
│ ₹5,000 / ₹30,000            │
│                              │
│ Keep betting to unlock!      │
└─────────────────────────────┘
```

---

## 📝 Implementation Steps

### Step 1: Update Database Schema

Run migration:
```sql
-- Add wagering tracking columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wagering_requirement DECIMAL(15, 2) DEFAULT '0.00',
ADD COLUMN IF NOT EXISTS wagering_completed DECIMAL(15, 2) DEFAULT '0.00',
ADD COLUMN IF NOT EXISTS bonus_locked BOOLEAN DEFAULT FALSE;

-- Update existing users
UPDATE users 
SET bonus_locked = FALSE,
    wagering_requirement = '0.00',
    wagering_completed = '0.00'
WHERE bonus_locked IS NULL;
```

### Step 2: Update TypeScript Interfaces

**File: `shared/schema.ts`**
```typescript
export const users = pgTable("users", {
  // ... existing fields ...
  deposit_bonus_available: decimal("deposit_bonus_available", { precision: 15, scale: 2 }).default("0.00"),
  referral_bonus_available: decimal("referral_bonus_available", { precision: 15, scale: 2 }).default("0.00"),
  
  // NEW: Wagering requirement fields
  wagering_requirement: decimal("wagering_requirement", { precision: 15, scale: 2 }).default("0.00"),
  wagering_completed: decimal("wagering_completed", { precision: 15, scale: 2 }).default("0.00"),
  bonus_locked: boolean("bonus_locked").default(false),
});
```

### Step 3: Update Bonus Application

**File: `server/payment.ts`**
```typescript
export const applyDepositBonus = async (userId: string, depositAmount: number): Promise<boolean> => {
  try {
    // Get deposit bonus percentage from settings (default 30%)
    const depositBonusPercent = await storage.getGameSetting('default_deposit_bonus_percent') || '30';
    const bonusPercentage = parseFloat(depositBonusPercent);
    
    // Calculate bonus amount
    const bonusAmount = (depositAmount * bonusPercentage) / 100;
    
    if (bonusAmount <= 0) {
      return false;
    }
    
    // Get wagering multiplier (default 1x = 100%)
    // If user deposits ₹1,00,000 with 30% bonus, they must wager:
    // - 1x (100%): ₹1,00,000
    // - 0.3x (30%): ₹30,000
    const wageringMultiplier = parseFloat(await storage.getGameSetting('wagering_multiplier') || '0.3');
    const wageringRequirement = depositAmount * wageringMultier;
    
    // Add LOCKED bonus to user's bonus field
    await storage.addUserBonus(userId, bonusAmount, 'deposit_bonus', depositAmount);
    
    // Set wagering requirement
    await storage.setUserWageringRequirement(userId, wageringRequirement);
    
    console.log(`✅ Deposit bonus of ₹${bonusAmount} added as LOCKED for user ${userId}`);
    console.log(`   Must wager ₹${wageringRequirement} to unlock (${wageringMultiplier * 100}% of deposit)`);
    
    // Do NOT auto-credit bonus!
    // User must meet wagering requirement first
    
    return true;
  } catch (error) {
    console.error('Error applying deposit bonus:', error);
    return false;
  }
};
```

### Step 4: Track Wagering on Each Bet

**File: `server/socket/game-handlers.ts` or `server/routes.ts`**

In the `handlePlayerBet` function:
```typescript
export async function handlePlayerBet(client: WSClient, data: any) {
  // ... existing bet placement code ...
  
  // After bet is successfully placed and balance deducted:
  const betAmount = data.amount;
  
  // Track towards wagering requirement
  await storage.trackWagering(userId, betAmount);
  
  // Check if wagering requirement met
  const bonusUnlocked = await storage.checkAndUnlockBonus(userId);
  
  if (bonusUnlocked) {
    // Notify user that bonus is now unlocked!
    client.ws.send(JSON.stringify({
      type: 'bonus_unlocked',
      data: {
        message: `🎉 Bonus unlocked! Check your balance.`,
        bonusAmount: bonusUnlocked.amount
      }
    }));
  }
  
  // ... rest of code ...
}
```

### Step 5: Add Storage Methods

**File: `server/storage-supabase.ts`**
```typescript
// Set wagering requirement for user
async setUserWageringRequirement(userId: string, amount: number): Promise<void> {
  const { error } = await supabaseServer
    .from('users')
    .update({
      wagering_requirement: amount.toString(),
      wagering_completed: '0.00',
      bonus_locked: true
    })
    .eq('id', userId);
    
  if (error) throw error;
}

// Track wagering progress
async trackWagering(userId: string, betAmount: number): Promise<void> {
  // Get current wagering data
  const user = await this.getUser(userId);
  if (!user || !user.bonus_locked) {
    return; // No locked bonus to track
  }
  
  const currentCompleted = parseFloat(user.wagering_completed || '0');
  const newCompleted = currentCompleted + betAmount;
  
  const { error } = await supabaseServer
    .from('users')
    .update({
      wagering_completed: newCompleted.toString()
    })
    .eq('id', userId);
    
  if (error) throw error;
}

// Check if wagering requirement met and unlock bonus
async checkAndUnlockBonus(userId: string): Promise<{ unlocked: boolean; amount: number } | null> {
  const user = await this.getUser(userId);
  if (!user || !user.bonus_locked) {
    return null;
  }
  
  const requirement = parseFloat(user.wagering_requirement || '0');
  const completed = parseFloat(user.wagering_completed || '0');
  
  // Check if requirement met
  if (completed >= requirement) {
    // Get total locked bonus
    const depositBonus = parseFloat(user.deposit_bonus_available || '0');
    const referralBonus = parseFloat(user.referral_bonus_available || '0');
    const totalBonus = depositBonus + referralBonus;
    
    if (totalBonus > 0) {
      // Add bonus to main balance
      const currentBalance = parseFloat(user.balance);
      const newBalance = currentBalance + totalBonus;
      
      // Update user
      await supabaseServer
        .from('users')
        .update({
          balance: newBalance.toString(),
          deposit_bonus_available: '0.00',
          referral_bonus_available: '0.00',
          bonus_locked: false,
          wagering_requirement: '0.00',
          wagering_completed: '0.00'
        })
        .eq('id', userId);
      
      console.log(`✅ Bonus unlocked! ₹${totalBonus} added to user ${userId} balance`);
      
      return { unlocked: true, amount: totalBonus };
    }
  }
  
  return null;
}

// Get wagering progress for display
async getWageringProgress(userId: string): Promise<{
  requirement: number;
  completed: number;
  remaining: number;
  percentage: number;
  bonusLocked: number;
} | null> {
  const user = await this.getUser(userId);
  if (!user || !user.bonus_locked) {
    return null;
  }
  
  const requirement = parseFloat(user.wagering_requirement || '0');
  const completed = parseFloat(user.wagering_completed || '0');
  const remaining = Math.max(0, requirement - completed);
  const percentage = requirement > 0 ? (completed / requirement) * 100 : 0;
  const bonusLocked = parseFloat(user.deposit_bonus_available || '0') + 
                     parseFloat(user.referral_bonus_available || '0');
  
  return {
    requirement,
    completed,
    remaining,
    percentage,
    bonusLocked
  };
}
```

---

## 🎨 Frontend Implementation

### WalletModal Component

**File: `client/src/components/WalletModal.tsx`**
```typescript
// Fetch wagering progress
const [wageringProgress, setWageringProgress] = useState<{
  requirement: number;
  completed: number;
  remaining: number;
  percentage: number;
  bonusLocked: number;
} | null>(null);

useEffect(() => {
  const fetchWageringProgress = async () => {
    try {
      const response = await apiClient.get('/api/user/wagering-progress');
      setWageringProgress(response);
    } catch (error) {
      console.error('Failed to fetch wagering progress:', error);
    }
  };
  
  if (isOpen) {
    fetchWageringProgress();
  }
}, [isOpen]);

// In render:
{wageringProgress && wageringProgress.bonusLocked > 0 && (
  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <span className="text-yellow-800 font-semibold">🔒 Locked Bonus</span>
      <span className="text-yellow-900 font-bold">
        ₹{wageringProgress.bonusLocked.toLocaleString()}
      </span>
    </div>
    
    <div className="mt-3">
      <div className="flex justify-between text-sm text-yellow-700 mb-1">
        <span>Wagering Progress</span>
        <span>{wageringProgress.percentage.toFixed(1)}%</span>
      </div>
      
      <div className="w-full bg-yellow-200 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-yellow-500 h-full transition-all duration-300"
          style={{ width: `${Math.min(100, wageringProgress.percentage)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-yellow-600 mt-1">
        <span>₹{wageringProgress.completed.toLocaleString()}</span>
        <span>₹{wageringProgress.requirement.toLocaleString()}</span>
      </div>
      
      <p className="text-xs text-yellow-700 mt-2">
        Wager ₹{wageringProgress.remaining.toLocaleString()} more to unlock bonus!
      </p>
    </div>
  </div>
)}
```

---

## 🔧 Configuration Settings

Add to game settings:
```sql
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('default_deposit_bonus_percent', '30', 'Deposit bonus percentage (30% = 30)'),
('wagering_multiplier', '0.3', 'Wagering requirement multiplier (0.3 = 30% of deposit, 1.0 = 100%)'),
('bonus_claim_threshold', '0', 'Set to 0 to disable auto-claim, use wagering requirement instead');
```

**Configuration examples:**
- `wagering_multiplier = 0.3`: Must wager 30% of deposit
- `wagering_multiplier = 1.0`: Must wager 100% of deposit (full rollover)
- `wagering_multiplier = 2.0`: Must wager 2x deposit (common in casinos)

---

## ✅ Summary of Changes

| Component | Change | Purpose |
|-----------|--------|---------|
| Database | Add wagering fields | Track bet amounts towards unlock |
| `applyDepositBonus()` | Set wagering requirement | Lock bonus until requirement met |
| `handlePlayerBet()` | Track each bet | Count towards wagering |
| `checkAndUnlockBonus()` | New function | Unlock when requirement met |
| WalletModal | Show progress bar | User sees how much more to wager |
| **REMOVE** | `checkAndAutoCreditBonus()` | Wrong threshold logic |
| **REMOVE** | `applyConditionalBonus()` | Wrong ±30% balance logic |

---

## 🎯 User Experience

**Before (WRONG):**
```
User deposits ₹1,00,000
Bonus ₹30,000 added immediately ✗
User can withdraw ₹1,30,000 right away ✗
```

**After (CORRECT):**
```
User deposits ₹1,00,000
  Main balance: ₹1,00,000 ✓
  Locked bonus: ₹30,000 (shows separately) ✓

User places bets:
  Bet ₹10,000 → Wagering: 33% complete
  Bet ₹10,000 → Wagering: 67% complete  
  Bet ₹10,000 → Wagering: 100% complete ✓
  
Bonus unlocked! ₹30,000 added ✓
  New balance: ₹1,20,000 (assuming no wins/losses)
```

This is the PROPER wagering requirement system used in real casinos!


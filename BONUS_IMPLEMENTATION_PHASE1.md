# 🎁 BONUS SYSTEM IMPLEMENTATION - PHASE 1

**Date:** November 7, 2024  
**Status:** 🚀 **STARTING IMPLEMENTATION**

---

## 📊 FRONTEND DISPLAY LOGIC

### **1. Game Page Header (MobileTopBar)**

**Display Logic:**
```typescript
// Calculate cumulative bonus
const totalUnlockedBonus = 
  depositBonuses
    .filter(b => b.status === 'unlocked')
    .reduce((sum, b) => sum + b.bonusAmount, 0) +
  referralBonuses
    .filter(b => b.status === 'credited')
    .reduce((sum, b) => sum + b.bonusAmount, 0);

const totalLockedBonus = 
  depositBonuses
    .filter(b => b.status === 'locked')
    .reduce((sum, b) => sum + b.bonusAmount, 0);

const totalBonus = totalUnlockedBonus + totalLockedBonus;
```

**Visual States:**
```typescript
// Green pulsing - Has unlocked bonus ready to auto-credit
if (totalUnlockedBonus > 0) {
  return (
    <BonusChip 
      amount={totalBonus}
      color="green"
      pulsing={true}
      icon={<Gift />}
      label={`₹${totalBonus.toLocaleString()}`}
      tooltip="Unlocked bonuses will auto-credit when wagering complete"
    />
  );
}

// Yellow - Has locked bonus (wagering in progress)
if (totalLockedBonus > 0) {
  return (
    <BonusChip 
      amount={totalBonus}
      color="yellow"
      pulsing={false}
      icon={<Lock />}
      label={`₹${totalBonus.toLocaleString()}`}
      tooltip="Keep playing to unlock bonuses"
    />
  );
}

// No bonus chip shown if totalBonus === 0
```

**Click Behavior:**
```typescript
onClick={() => {
  // Option 1: Navigate to Bonuses tab
  navigate('/profile?tab=bonuses');
  
  // Option 2: Show quick modal with breakdown
  showBonusBreakdownModal({
    unlocked: totalUnlockedBonus,
    locked: totalLockedBonus,
    depositBonuses: depositBonuses,
    referralBonuses: referralBonuses
  });
}}
```

---

### **2. Bonuses Tab Structure**

**Tab Layout:**
```typescript
<TabsContent value="bonuses">
  {/* Overview Card */}
  <BonusOverviewCard 
    totalAvailable={totalUnlockedBonus}
    totalLocked={totalLockedBonus}
    totalCredited={lifetimeCredited}
    lifetimeEarnings={lifetimeTotal}
  />
  
  {/* Deposit Bonuses */}
  <DepositBonusesList 
    bonuses={depositBonuses}
    onRefresh={fetchDepositBonuses}
  />
  
  {/* Referral Bonuses */}
  <ReferralBonusesList 
    bonuses={referralBonuses}
    onRefresh={fetchReferralBonuses}
  />
  
  {/* Bonus History */}
  <BonusHistoryTimeline 
    transactions={bonusTransactions}
    onLoadMore={loadMoreHistory}
  />
</TabsContent>
```

---

## 🗄️ DATABASE MIGRATION SCRIPT

### **File:** `server/migrations/add_bonus_tracking_tables.sql`

```sql
-- ============================================
-- BONUS SYSTEM ENHANCEMENT MIGRATION
-- Adds per-deposit bonus tracking and history
-- ============================================

-- 1. Create deposit_bonuses table
CREATE TABLE IF NOT EXISTS deposit_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deposit_request_id UUID REFERENCES payment_requests(id),
  
  -- Amounts
  deposit_amount NUMERIC(10,2) NOT NULL,
  bonus_amount NUMERIC(10,2) NOT NULL,
  bonus_percentage NUMERIC(5,2) DEFAULT 5.00,
  
  -- Wagering tracking
  wagering_required NUMERIC(10,2) NOT NULL,
  wagering_completed NUMERIC(10,2) DEFAULT 0.00,
  wagering_progress NUMERIC(5,2) DEFAULT 0.00, -- percentage (0-100)
  
  -- Status tracking
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'credited', 'expired', 'forfeited')),
  locked_at TIMESTAMP DEFAULT NOW(),
  unlocked_at TIMESTAMP,
  credited_at TIMESTAMP,
  expired_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for deposit_bonuses
CREATE INDEX idx_deposit_bonuses_user_id ON deposit_bonuses(user_id);
CREATE INDEX idx_deposit_bonuses_status ON deposit_bonuses(status);
CREATE INDEX idx_deposit_bonuses_created_at ON deposit_bonuses(created_at DESC);
CREATE INDEX idx_deposit_bonuses_user_status ON deposit_bonuses(user_id, status);

-- 2. Create bonus_transactions table
CREATE TABLE IF NOT EXISTS bonus_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Type and source
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('deposit_bonus', 'referral_bonus', 'conditional_bonus', 'promotional_bonus')),
  bonus_source_id UUID, -- Links to deposit_bonuses.id or referral_bonuses.id
  
  -- Amounts
  amount NUMERIC(10,2) NOT NULL,
  balance_before NUMERIC(10,2),
  balance_after NUMERIC(10,2),
  
  -- Action tracking
  action TEXT NOT NULL CHECK (action IN ('added', 'locked', 'unlocked', 'credited', 'expired', 'forfeited', 'wagering_progress')),
  description TEXT NOT NULL,
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for bonus_transactions
CREATE INDEX idx_bonus_transactions_user_id ON bonus_transactions(user_id);
CREATE INDEX idx_bonus_transactions_type ON bonus_transactions(bonus_type);
CREATE INDEX idx_bonus_transactions_action ON bonus_transactions(action);
CREATE INDEX idx_bonus_transactions_created_at ON bonus_transactions(created_at DESC);
CREATE INDEX idx_bonus_transactions_user_created ON bonus_transactions(user_id, created_at DESC);

-- 3. Create referral_bonuses table
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES user_referrals(id),
  
  -- Amounts
  deposit_amount NUMERIC(10,2) NOT NULL,
  bonus_amount NUMERIC(10,2) NOT NULL,
  bonus_percentage NUMERIC(5,2) DEFAULT 1.00,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
  credited_at TIMESTAMP,
  expired_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for referral_bonuses
CREATE INDEX idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);
CREATE INDEX idx_referral_bonuses_status ON referral_bonuses(status);
CREATE INDEX idx_referral_bonuses_referrer_status ON referral_bonuses(referrer_user_id, status);

-- 4. Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_bonus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deposit_bonuses_updated_at
  BEFORE UPDATE ON deposit_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_updated_at();

CREATE TRIGGER referral_bonuses_updated_at
  BEFORE UPDATE ON referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_updated_at();

-- 5. Migrate existing bonus data (if any)
-- This will create deposit_bonuses records for users with existing deposit_bonus_available
INSERT INTO deposit_bonuses (
  user_id,
  deposit_amount,
  bonus_amount,
  wagering_required,
  wagering_completed,
  wagering_progress,
  status,
  locked_at,
  notes
)
SELECT 
  id as user_id,
  0 as deposit_amount, -- Unknown original deposit
  COALESCE(CAST(deposit_bonus_available AS NUMERIC), 0) as bonus_amount,
  COALESCE(CAST(wagering_requirement AS NUMERIC), 0) as wagering_required,
  COALESCE(CAST(wagering_completed AS NUMERIC), 0) as wagering_completed,
  CASE 
    WHEN COALESCE(CAST(wagering_requirement AS NUMERIC), 0) > 0 
    THEN (COALESCE(CAST(wagering_completed AS NUMERIC), 0) / CAST(wagering_requirement AS NUMERIC)) * 100
    ELSE 0
  END as wagering_progress,
  CASE 
    WHEN bonus_locked = true THEN 'locked'
    WHEN COALESCE(CAST(deposit_bonus_available AS NUMERIC), 0) > 0 THEN 'unlocked'
    ELSE 'credited'
  END as status,
  created_at as locked_at,
  'Migrated from legacy bonus system' as notes
FROM users
WHERE COALESCE(CAST(deposit_bonus_available AS NUMERIC), 0) > 0;

-- 6. Create view for easy bonus summary
CREATE OR REPLACE VIEW user_bonus_summary AS
SELECT 
  u.id as user_id,
  u.phone,
  u.full_name,
  
  -- Deposit bonuses
  COALESCE(SUM(CASE WHEN db.status = 'unlocked' THEN db.bonus_amount ELSE 0 END), 0) as deposit_bonus_unlocked,
  COALESCE(SUM(CASE WHEN db.status = 'locked' THEN db.bonus_amount ELSE 0 END), 0) as deposit_bonus_locked,
  COALESCE(SUM(CASE WHEN db.status = 'credited' THEN db.bonus_amount ELSE 0 END), 0) as deposit_bonus_credited,
  
  -- Referral bonuses
  COALESCE(SUM(CASE WHEN rb.status = 'credited' THEN rb.bonus_amount ELSE 0 END), 0) as referral_bonus_credited,
  COALESCE(SUM(CASE WHEN rb.status = 'pending' THEN rb.bonus_amount ELSE 0 END), 0) as referral_bonus_pending,
  
  -- Totals
  COALESCE(SUM(CASE WHEN db.status IN ('unlocked', 'locked') THEN db.bonus_amount ELSE 0 END), 0) + 
  COALESCE(SUM(CASE WHEN rb.status = 'pending' THEN rb.bonus_amount ELSE 0 END), 0) as total_available,
  
  COALESCE(SUM(CASE WHEN db.status = 'credited' THEN db.bonus_amount ELSE 0 END), 0) + 
  COALESCE(SUM(CASE WHEN rb.status = 'credited' THEN rb.bonus_amount ELSE 0 END), 0) as total_credited,
  
  COALESCE(SUM(db.bonus_amount), 0) + COALESCE(SUM(rb.bonus_amount), 0) as lifetime_earnings
  
FROM users u
LEFT JOIN deposit_bonuses db ON u.id = db.user_id
LEFT JOIN referral_bonuses rb ON u.id = rb.referrer_user_id
GROUP BY u.id, u.phone, u.full_name;

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE ON deposit_bonuses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON referral_bonuses TO authenticated;
GRANT SELECT, INSERT ON bonus_transactions TO authenticated;
GRANT SELECT ON user_bonus_summary TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
```

---

## 🎯 IMPLEMENTATION CHECKLIST

### **Phase 1: Database (30 mins)**
- [ ] Create migration file
- [ ] Run migration on development database
- [ ] Verify tables created
- [ ] Verify indexes created
- [ ] Verify view created
- [ ] Test data migration

### **Phase 2: Backend API (2 hours)**
- [ ] Create deposit bonus tracking functions
- [ ] Create referral bonus tracking functions
- [ ] Create bonus transaction logging
- [ ] Update deposit approval to create deposit_bonuses record
- [ ] Update wagering tracking to update all locked bonuses
- [ ] Create automatic unlock & credit logic
- [ ] Create API endpoints:
  - GET `/api/user/deposit-bonuses`
  - GET `/api/user/referral-bonuses`
  - GET `/api/user/bonus-transactions`
  - GET `/api/user/bonus-summary`

### **Phase 3: Frontend Components (2 hours)**
- [ ] Create BonusOverviewCard component
- [ ] Create DepositBonusesList component
- [ ] Create ReferralBonusesList component
- [ ] Create BonusHistoryTimeline component
- [ ] Create ProgressBar component
- [ ] Update MobileTopBar to show cumulative bonus

### **Phase 4: Profile Integration (1 hour)**
- [ ] Add "Bonuses" tab to profile
- [ ] Integrate all bonus components
- [ ] Add data fetching hooks
- [ ] Add real-time updates

### **Phase 5: Testing (1 hour)**
- [ ] Test deposit bonus creation
- [ ] Test wagering progress tracking
- [ ] Test automatic unlock
- [ ] Test automatic credit
- [ ] Test UI updates
- [ ] Test cumulative display in header

---

## 📊 API RESPONSE FORMATS

### **GET `/api/user/bonus-summary`**
```json
{
  "success": true,
  "data": {
    "depositBonuses": {
      "unlocked": 500,
      "locked": 750,
      "credited": 5000,
      "total": 6250
    },
    "referralBonuses": {
      "pending": 0,
      "credited": 200,
      "total": 200
    },
    "totals": {
      "available": 1250,
      "credited": 5200,
      "lifetime": 6450
    }
  }
}
```

### **GET `/api/user/deposit-bonuses`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "depositAmount": 10000,
      "bonusAmount": 500,
      "bonusPercentage": 5,
      "wageringRequired": 5000,
      "wageringCompleted": 3750,
      "wageringProgress": 75,
      "status": "unlocked",
      "lockedAt": "2024-11-07T10:00:00Z",
      "unlockedAt": "2024-11-07T14:30:00Z",
      "creditedAt": null,
      "createdAt": "2024-11-07T10:00:00Z"
    }
  ]
}
```

---

**Status:** 🟡 **READY TO START**  
**Next Step:** Create database migration file

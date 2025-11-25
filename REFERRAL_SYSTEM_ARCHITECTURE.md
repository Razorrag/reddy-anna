# 🎯 REFERRAL SYSTEM ARCHITECTURE - SINGLE SOURCE OF TRUTH

## Overview

The referral system has ONE source of truth: **The Database**

All referral code generation uses the same method: `generateUniqueReferralCode()`

---

## Database Schema

### Users Table - Referral Fields
```sql
users (
  id VARCHAR(20) PRIMARY KEY,           -- User's unique ID (phone number)
  referral_code VARCHAR(10),            -- Code used during signup (referrer's code)
  referral_code_generated VARCHAR(10),  -- User's OWN unique referral code
  ...
)
```

**Key Distinction:**
- `referral_code` = The code this user USED when signing up (belongs to their referrer)
- `referral_code_generated` = This user's OWN code to share with others

### User Referrals Table
```sql
user_referrals (
  id VARCHAR(36) PRIMARY KEY,
  referrer_user_id VARCHAR(20),    -- User who shared the code
  referred_user_id VARCHAR(20),    -- User who signed up with the code
  deposit_amount DECIMAL(15,2),    -- First deposit amount
  bonus_amount DECIMAL(15,2),      -- Referral bonus amount
  bonus_applied BOOLEAN,           -- Whether bonus has been credited
  bonus_applied_at TIMESTAMP,
  created_at TIMESTAMP
)
```

### Referral Bonuses Table
```sql
referral_bonuses (
  id VARCHAR(36) PRIMARY KEY,
  referrer_user_id VARCHAR(20),    -- User receiving the bonus
  referred_user_id VARCHAR(20),    -- User who triggered the bonus
  referral_id VARCHAR(36),         -- Link to user_referrals
  deposit_amount DECIMAL(15,2),    -- Deposit that triggered bonus
  bonus_amount DECIMAL(15,2),      -- Bonus amount
  bonus_percentage DECIMAL(5,2),   -- Percentage used (e.g., 1%)
  status VARCHAR(20),              -- 'pending', 'credited'
  credited_at TIMESTAMP,
  created_at TIMESTAMP
)
```

---

## Referral Code Generation - SINGLE SOURCE OF TRUTH

### Method: `generateUniqueReferralCode()`

Location: `server/storage-supabase.ts`

```typescript
private async generateUniqueReferralCode(): Promise<string> {
  const crypto = require('crypto');
  const MAX_ATTEMPTS = 20;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Generate 6-character uppercase alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 6);
    
    // Check if code already exists in database
    const { data: existing } = await supabaseServer
      .from('users')
      .select('id')
      .eq('referral_code_generated', code)
      .maybeSingle();
    
    // Code is unique - return it
    if (!existing) {
      return code;
    }
  }
  
  throw new Error('Failed to generate unique referral code');
}
```

### Used By:
1. `createUser()` - When new user registers
2. `generateMissingReferralCodes()` - Fix existing users without codes

---

## Complete Referral Flow

### 1. User A Creates Account
```
User A signs up
    ↓
createUser() called
    ↓
generateUniqueReferralCode() generates "ABC123"
    ↓
User A created with:
  - referral_code: null (no referrer)
  - referral_code_generated: "ABC123"
```

### 2. User A Shares Code
```
User A shares "ABC123" with friends
```

### 3. User B Signs Up with Code
```
User B signs up with referral_code: "ABC123"
    ↓
createUser() called
    ↓
generateUniqueReferralCode() generates "XYZ789"
    ↓
User B created with:
  - referral_code: "ABC123" (User A's code)
  - referral_code_generated: "XYZ789" (User B's own code)
    ↓
checkAndApplyReferralBonus() called
    ↓
user_referrals record created:
  - referrer_user_id: User A
  - referred_user_id: User B
  - bonus_applied: false
```

### 4. User B Makes First Deposit
```
User B deposits ₹10,000
    ↓
Admin approves deposit
    ↓
approvePaymentRequestAtomic() called
    ↓
User B gets:
  - Balance: ₹10,000
  - Deposit bonus: ₹500 (5%, locked)
    ↓
user_referrals updated:
  - deposit_amount: ₹10,000
  - bonus_amount: ₹100 (1% for referrer)
```

### 5. User B Completes Wagering
```
User B wagers ₹10,000 total
    ↓
Deposit bonus unlocked and credited
    ↓
handleReferralForBonus() called
    ↓
referral_bonuses record created for User A:
  - bonus_amount: ₹100
  - status: 'credited'
    ↓
User A balance increased by ₹100
    ↓
user_referrals updated:
  - bonus_applied: true
  - bonus_applied_at: now()
```

---

## API Endpoints

### User Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/user/referral-data` | GET | Get user's referral code and referred users |
| `/api/user/generate-referral-code` | POST | Generate code if missing |

### Admin Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/fix-referral-codes` | POST | Generate codes for all users missing them |
| `/api/admin/referral-data` | GET | Get all referral relationships |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REGISTRATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User signs up ──► createUser() ──► generateUniqueReferralCode()│
│                         │                      │                 │
│                         │                      ▼                 │
│                         │            Check DB for uniqueness     │
│                         │                      │                 │
│                         │                      ▼                 │
│                         │            Return unique 6-char code   │
│                         │                      │                 │
│                         ▼                      │                 │
│                  Insert user with code ◄───────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      REFERRAL TRACKING                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User B signs up with User A's code                              │
│           │                                                      │
│           ▼                                                      │
│  checkAndApplyReferralBonus()                                    │
│           │                                                      │
│           ▼                                                      │
│  Find User A by referral_code_generated = "ABC123"               │
│           │                                                      │
│           ▼                                                      │
│  Create user_referrals record                                    │
│  (referrer: User A, referred: User B)                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      REFERRAL BONUS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User B completes wagering requirement                           │
│           │                                                      │
│           ▼                                                      │
│  creditDepositBonus() ──► handleReferralForBonus()               │
│                                    │                             │
│                                    ▼                             │
│                          Find referral relationship              │
│                                    │                             │
│                                    ▼                             │
│                          Calculate bonus (1% of deposit)         │
│                                    │                             │
│                                    ▼                             │
│                          Create referral_bonuses record          │
│                                    │                             │
│                                    ▼                             │
│                          Credit to User A's balance              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Verification Queries

### Check all users have referral codes
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(referral_code_generated) as users_with_code,
  COUNT(*) - COUNT(referral_code_generated) as users_without_code
FROM users;
```

### Check referral relationships
```sql
SELECT 
  u1.phone as referrer_phone,
  u1.referral_code_generated as referrer_code,
  u2.phone as referred_phone,
  u2.referral_code as code_used,
  ur.deposit_amount,
  ur.bonus_amount,
  ur.bonus_applied
FROM user_referrals ur
JOIN users u1 ON ur.referrer_user_id = u1.id
JOIN users u2 ON ur.referred_user_id = u2.id
ORDER BY ur.created_at DESC;
```

### Check referral bonuses
```sql
SELECT 
  u1.phone as referrer_phone,
  u2.phone as referred_phone,
  rb.deposit_amount,
  rb.bonus_amount,
  rb.bonus_percentage,
  rb.status,
  rb.credited_at
FROM referral_bonuses rb
JOIN users u1 ON rb.referrer_user_id = u1.id
JOIN users u2 ON rb.referred_user_id = u2.id
ORDER BY rb.created_at DESC;
```

---

## Summary

| Component | Source of Truth |
|-----------|-----------------|
| Referral Code Generation | `generateUniqueReferralCode()` in storage-supabase.ts |
| User's Own Code | `users.referral_code_generated` column |
| Code Used at Signup | `users.referral_code` column |
| Referral Relationships | `user_referrals` table |
| Referral Bonuses | `referral_bonuses` table |

**NO FALLBACKS. NO RPC FUNCTIONS. ONE METHOD. ONE DATABASE.**

# 🧹 DATABASE CLEANUP GUIDE

Complete guide for cleaning up duplicate, redundant, and unused elements in your Andar Bahar database.

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [What Will Be Changed](#what-will-be-changed)
3. [Migration Scripts](#migration-scripts)
4. [Execution Order](#execution-order)
5. [Backup Instructions](#backup-instructions)
6. [Rollback Procedures](#rollback-procedures)
7. [Verification](#verification)
8. [FAQ](#faq)

---

## 🎯 OVERVIEW

This cleanup removes:
- ❌ **Duplicate bonus tracking systems** (old `bonus_tracking` table)
- ❌ **Redundant fields in users table** (7 bonus-related fields)
- ❌ **Unused fields** (`phone_verified`)
- ✅ **Adds missing indexes** for performance
- ✅ **Fixes referral bonus percentage** (1% → 5%)
- ✅ **Adds missing constraints** for data integrity

**Risk Level:** LOW (removes only unused code)  
**Estimated Time:** 20 minutes total  
**Downtime Required:** NO (can run on live database)

---

## 📦 WHAT WILL BE CHANGED

### Tables to Remove
| Table | Reason | Impact |
|-------|--------|--------|
| `bonus_tracking` | Obsolete, replaced by `deposit_bonuses` | None - not used in code |

### Fields to Remove from `users` Table
| Field | Reason | Impact |
|-------|--------|--------|
| `deposit_bonus_available` | Duplicates `deposit_bonuses` table | None - not used in code |
| `referral_bonus_available` | Duplicates `referral_bonuses` table | None - not used in code |
| `original_deposit_amount` | Duplicates `deposit_bonuses.deposit_amount` | None - not used in code |
| `total_bonus_earned` | Can be calculated from `bonus_transactions` | None - not used in code |
| `wagering_requirement` | Duplicates `deposit_bonuses.wagering_required` | None - not used in code |
| `wagering_completed` | Duplicates `deposit_bonuses.wagering_completed` | None - not used in code |
| `bonus_locked` | Duplicates `deposit_bonuses.status` | None - not used in code |
| `phone_verified` | Never set to true | None - not used in code |

### Changes to Keep
| Table | Field | Change | Reason |
|-------|-------|--------|--------|
| `referral_bonuses` | `bonus_percentage` | Default: 1.00 → 5.00 | Fix incorrect default |
| `game_settings` | `referral_bonus_percent` | Value: '1' → '5' | Fix incorrect value |
| `users` | `referral_code_generated` | Add UNIQUE constraint | Prevent duplicate codes |

### Indexes to Add
| Index Name | Table | Columns | Purpose |
|------------|-------|---------|---------|
| `idx_deposit_bonuses_user_status_created` | `deposit_bonuses` | `user_id, status, created_at` | Faster bonus queries |
| `idx_referral_bonuses_referrer_created` | `referral_bonuses` | `referrer_user_id, created_at` | Faster referral lookups |
| `idx_bonus_transactions_user_bonus_type_created` | `bonus_transactions` | `user_id, bonus_type, created_at` | Faster transaction history |
| `idx_user_referrals_referrer_bonus_applied` | `user_referrals` | `referrer_user_id, bonus_applied, created_at` | Faster referral status checks |
| `idx_user_referrals_referred_lookup` | `user_referrals` | `referred_user_id` | Faster reverse lookups |

---

## 📜 MIGRATION SCRIPTS

### 1. `fix_referral_system.sql` *(Already Created)*
- Fixes duplicate referral codes
- Adds UNIQUE constraint
- **Status:** ✅ Should already be run

### 2. `update_referral_bonus_to_5_percent.sql` *(Already Created)*
- Updates referral bonus from 1% to 5%
- **Status:** ✅ Should already be run

### 3. `database_cleanup_priority_1.sql` *(NEW - Run First)*
- Fixes referral bonus percentage
- Adds performance indexes
- Verifies data integrity
- **Risk:** LOW
- **Time:** 5 minutes

### 4. `database_cleanup_priority_2.sql` *(NEW - Run Second)*
- Removes redundant fields from users table
- Drops obsolete bonus_tracking table
- Creates backups before changes
- **Risk:** LOW
- **Time:** 10 minutes

### 5. `database_cleanup_verification.sql` *(NEW - Run Last)*
- Verifies all changes completed successfully
- Checks data integrity
- Provides statistics
- **Risk:** NONE (read-only)
- **Time:** 2 minutes

---

## 🚀 EXECUTION ORDER

### Step 1: Pre-Migration Checks

```sql
-- 1. Check if Priority 1 migrations are needed
SELECT 
  setting_key, 
  setting_value,
  CASE 
    WHEN setting_key = 'referral_bonus_percent' AND setting_value != '5' THEN '❌ Needs update'
    ELSE '✅ OK'
  END as status
FROM game_settings 
WHERE setting_key IN ('referral_bonus_percent', 'default_deposit_bonus_percent');

-- 2. Check for duplicate referral codes
SELECT 
  referral_code_generated, 
  COUNT(*) as count
FROM users
WHERE referral_code_generated IS NOT NULL
GROUP BY referral_code_generated
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- 3. Check if bonus_tracking table exists
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'bonus_tracking';
```

### Step 2: Backup Database

```bash
# Full database backup (HIGHLY RECOMMENDED)
pg_dump -h your-host -U your-user -d your-database > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql

# Or backup via Supabase dashboard:
# Dashboard → Settings → Database → Backups → Create Backup
```

### Step 3: Run Priority 1 Cleanup

```sql
-- In Supabase SQL Editor or psql:
\i server/migrations/database_cleanup_priority_1.sql

-- Or copy-paste the contents into Supabase SQL Editor
```

**Expected Output:**
- ✅ Referral bonus percentage updated to 5%
- ✅ 5 new indexes created
- ✅ No orphaned records found
- ✅ All percentages show 5%

### Step 4: Test Application

```bash
# 1. Restart your backend server
npm run dev

# 2. Test these features:
- User registration with referral code
- Deposit approval
- Referral bonus tracking
- Bonus wallet display

# 3. Check logs for errors
# Look for any database errors or warnings
```

### Step 5: Run Priority 2 Cleanup (ONLY IF PRIORITY 1 WORKS)

⚠️ **IMPORTANT:** Only proceed if Priority 1 worked perfectly and application is stable!

```sql
-- In Supabase SQL Editor:
\i server/migrations/database_cleanup_priority_2.sql
```

**Expected Output:**
- ✅ 8 fields removed from users table
- ✅ bonus_tracking table dropped
- ✅ Backup tables created
- ✅ Foreign keys added

### Step 6: Test Application Again

```bash
# Test same features as Step 4
# Make sure everything still works!
```

### Step 7: Run Verification

```sql
-- In Supabase SQL Editor:
\i server/migrations/database_cleanup_verification.sql
```

**Expected Output:**
- ✅ All checks pass
- ✅ No orphaned records
- ✅ All indexes exist
- ✅ Statistics look correct

---

## 💾 BACKUP INSTRUCTIONS

### Before Priority 1
```sql
-- Backup current settings
CREATE TABLE game_settings_backup_$(date +%Y%m%d) AS
SELECT * FROM game_settings;

-- Backup users with referral codes
CREATE TABLE users_referral_backup_$(date +%Y%m%d) AS
SELECT id, referral_code, referral_code_generated 
FROM users 
WHERE referral_code_generated IS NOT NULL;
```

### Before Priority 2
The script automatically creates:
- `users_bonus_fields_backup` (users with non-zero bonus fields)
- `bonus_tracking_backup` (entire bonus_tracking table)

---

## ↩️ ROLLBACK PROCEDURES

### Rollback Priority 1

```sql
-- Restore referral bonus percentage to 1%
UPDATE game_settings 
SET setting_value = '1' 
WHERE setting_key = 'referral_bonus_percent';

ALTER TABLE referral_bonuses 
ALTER COLUMN bonus_percentage SET DEFAULT 1.00;

-- Remove indexes (optional)
DROP INDEX IF EXISTS idx_deposit_bonuses_user_status_created;
DROP INDEX IF EXISTS idx_referral_bonuses_referrer_created;
DROP INDEX IF EXISTS idx_bonus_transactions_user_bonus_type_created;
DROP INDEX IF EXISTS idx_user_referrals_referrer_bonus_applied;
DROP INDEX IF EXISTS idx_user_referrals_referred_lookup;
```

### Rollback Priority 2

```sql
-- Restore bonus_tracking table
CREATE TABLE bonus_tracking AS 
SELECT * FROM bonus_tracking_backup;

-- Restore users bonus fields
ALTER TABLE users 
ADD COLUMN deposit_bonus_available numeric DEFAULT 0.00,
ADD COLUMN referral_bonus_available numeric DEFAULT 0.00,
ADD COLUMN original_deposit_amount numeric DEFAULT 0.00,
ADD COLUMN total_bonus_earned numeric DEFAULT 0.00,
ADD COLUMN wagering_requirement numeric DEFAULT 0.00,
ADD COLUMN wagering_completed numeric DEFAULT 0.00,
ADD COLUMN bonus_locked boolean DEFAULT false,
ADD COLUMN phone_verified boolean DEFAULT false;

-- Restore data (if any was backed up)
UPDATE users u
SET 
  deposit_bonus_available = b.deposit_bonus_available,
  referral_bonus_available = b.referral_bonus_available,
  original_deposit_amount = b.original_deposit_amount,
  total_bonus_earned = b.total_bonus_earned,
  wagering_requirement = b.wagering_requirement,
  wagering_completed = b.wagering_completed,
  bonus_locked = b.bonus_locked
FROM users_bonus_fields_backup b
WHERE u.id = b.id;
```

---

## ✅ VERIFICATION

### Quick Health Check

```sql
-- Run after each migration
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM deposit_bonuses) as deposit_bonuses,
  (SELECT COUNT(*) FROM referral_bonuses) as referral_bonuses,
  (SELECT COUNT(*) FROM user_referrals) as referral_relationships,
  (SELECT COUNT(*) FROM bonus_transactions) as bonus_transactions,
  (SELECT setting_value FROM game_settings WHERE setting_key = 'referral_bonus_percent') as referral_percent;
```

### Detailed Verification

Run `database_cleanup_verification.sql` for comprehensive checks.

---

## ❓ FAQ

### Q: Will this cause downtime?
**A:** No, these migrations can run on a live database. However, it's recommended to run during low-traffic periods.

### Q: What if I find issues after cleanup?
**A:** Use the rollback procedures above. Backups are created automatically.

### Q: Can I run Priority 2 without Priority 1?
**A:** No, Priority 1 must be run first. It fixes critical issues that Priority 2 depends on.

### Q: How do I know if cleanup was successful?
**A:** Run `database_cleanup_verification.sql`. All checks should show ✅ PASS.

### Q: When can I delete backup tables?
**A:** After 1 week of stable operation:
```sql
DROP TABLE IF EXISTS users_bonus_fields_backup;
DROP TABLE IF EXISTS bonus_tracking_backup;
DROP TABLE IF EXISTS game_settings_backup_YYYYMMDD;
DROP TABLE IF EXISTS users_referral_backup_YYYYMMDD;
```

### Q: Will my code need changes?
**A:** No! The cleanup removes only fields that are NOT used in your current code.

### Q: What about existing bonuses?
**A:** All existing bonuses in `deposit_bonuses` and `referral_bonuses` tables are preserved. Only redundant fields are removed.

### Q: Can I test on a staging database first?
**A:** Yes! That's highly recommended. Clone your production database to staging, run all migrations there, test thoroughly, then apply to production.

---

## 📞 SUPPORT

If you encounter any issues:

1. **Check logs:** Review the output of each migration
2. **Run verification:** Use `database_cleanup_verification.sql`
3. **Rollback if needed:** Follow rollback procedures above
4. **Contact support:** Provide error messages and verification output

---

## 📚 RELATED DOCUMENTATION

- [`DATABASE_AUDIT_REPORT.md`](../../DATABASE_AUDIT_REPORT.md) - Detailed audit findings
- [`REFERRAL_FLOW_VERIFICATION.md`](../../REFERRAL_FLOW_VERIFICATION.md) - Referral system flow
- [`REFERRAL_SYSTEM_COMPLETE_FIX_SUMMARY.md`](../../REFERRAL_SYSTEM_COMPLETE_FIX_SUMMARY.md) - Previous fixes

---

**Last Updated:** 2024-11-25  
**Version:** 1.0  
**Status:** Ready for Production
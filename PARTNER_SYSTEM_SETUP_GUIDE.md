# Partner System Setup & Testing Guide

## 🚀 Quick Start

### Step 1: Run Database Migration

The partner system requires new database tables. Run this migration file:

```bash
# Navigate to your Supabase SQL Editor and run:
server/migrations/PARTNER_SYSTEM_TABLES.sql
```

**IMPORTANT**: The migration creates a `phone` column, but if your database already has `phone_number` column, you need to:

**Option A: Rename existing column (if you already have partner data)**
```sql
ALTER TABLE partners RENAME COLUMN phone_number TO phone;
```

**Option B: Modify migration before running (if starting fresh)**
Change line 11 in migration from:
```sql
phone VARCHAR(20) NOT NULL UNIQUE,
```
to:
```sql
phone_number VARCHAR(20) NOT NULL UNIQUE,
```

Then also update all code references from `phone` to `phone_number`.

### Step 2: Verify Tables Created

Check that these tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('partners', 'admin_partner_settings');
```

### Step 3: Create Test Partner Account

Run this SQL to create a test partner:
```sql
-- First, hash a password (you need to do this in Node.js)
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('Test@1234', 12);
-- Copy the hash output

INSERT INTO partners (
  id,
  phone,
  password_hash,
  full_name,
  email,
  whatsapp_number,
  status,
  share_percentage,
  created_at
) VALUES (
  gen_random_uuid()::text,
  '9155804834',
  '$2b$12$YOUR_HASHED_PASSWORD_HERE', -- Replace with actual hash
  'Prachi Agarwal',
  'prachi@example.com',
  '9155804834',
  'active',
  50.00, -- 50% share
  NOW()
);
```

### Step 4: Test Login

1. Navigate to: `http://localhost:5000/partner/login`
2. Enter phone: `9155804834`
3. Enter password: `Test@1234` (or whatever you hashed)
4. Click "Login as Partner"

---

## 🔐 Password Hash Generation Script

Create a file `scripts/generate-partner-hash.js`:

```javascript
const bcrypt = require('bcrypt');

async function generateHash() {
  const password = process.argv[2] || 'Test@1234';
  const hash = await bcrypt.hash(password, 12);
  console.log('\n=== Password Hash Generated ===');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nUse this hash in your SQL INSERT statement.\n');
}

generateHash();
```

Run it:
```bash
node scripts/generate-partner-hash.js "YourPassword123"
```

---

## 📊 Database Schema

### Partners Table
```sql
CREATE TABLE partners (
  id VARCHAR(255) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  whatsapp_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending', -- pending/active/suspended/banned
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  share_percentage DECIMAL(5,2) DEFAULT 50.00, -- Admin-controlled visibility %
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Admin Partner Settings Table
```sql
CREATE TABLE admin_partner_settings (
  id VARCHAR(255) PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 How Share Percentage Works

### Admin Perspective
- Admin sets `share_percentage` per partner (1-100%)
- Example: Partner A gets 50%, Partner B gets 100%
- Admin can see and edit this in `/admin/partner-settings`

### Partner Perspective
- Partner **NEVER sees** their share percentage
- All financial amounts are automatically adjusted
- Partner thinks they see full game data

### Example Calculation

**Real Game Data:**
- Total Bets: ₹10,000
- Total Payout: ₹8,000
- House Profit: ₹2,000

**Partner A (50% share) sees:**
- Total Bets: ₹5,000 (10,000 × 0.50)
- Total Payout: ₹4,000 (8,000 × 0.50)
- House Profit: ₹1,000 (2,000 × 0.50)

**Partner B (100% share) sees:**
- Total Bets: ₹10,000 (10,000 × 1.00)
- Total Payout: ₹8,000 (8,000 × 1.00)
- House Profit: ₹2,000 (2,000 × 1.00)

---

## 🔧 API Endpoints

### Partner Authentication
- `POST /api/partner/auth/register` - Partner signup (requires approval)
- `POST /api/partner/auth/login` - Partner login
- `POST /api/partner/auth/refresh` - Refresh access token
- `POST /api/partner/auth/forgot-password` - Password reset via WhatsApp

### Partner Dashboard
- `GET /api/partner/dashboard/stats` - Dashboard statistics
- `GET /api/partner/dashboard/game-history` - Limited game history view

### Admin Partner Management
- `GET /api/admin/partners` - List all partners
- `GET /api/admin/partners/stats` - Partner system statistics
- `PUT /api/admin/partners/:id/status` - Approve/suspend/ban partner
- `PUT /api/admin/partners/:id/share-percentage` - Update share percentage

---

## 🎨 Frontend Routes

### Partner Pages
- `/partner/login` - Partner login page
- `/partner/signup` - Partner registration
- `/partner/dashboard` - Partner dashboard with game history
- `/partner/forgot-password` - Password recovery

### Admin Pages
- `/admin/partner-settings` - Manage all partners and their share percentages

---

## 🧪 Testing Checklist

### 1. Partner Registration
- [ ] Navigate to `/partner/signup`
- [ ] Fill registration form
- [ ] Check partner created with 'pending' status
- [ ] Verify admin approval required

### 2. Admin Approval
- [ ] Login as admin
- [ ] Go to `/admin/partner-settings`
- [ ] Find pending partner
- [ ] Click "Approve" button
- [ ] Set share percentage (e.g., 50%)
- [ ] Verify partner status changed to 'active'

### 3. Partner Login
- [ ] Navigate to `/partner/login`
- [ ] Enter approved partner credentials
- [ ] Verify successful login
- [ ] Check redirected to dashboard

### 4. Partner Dashboard
- [ ] Verify stats cards display (Total Earnings, etc.)
- [ ] Check game history table shows data
- [ ] Verify financial amounts are adjusted by share %
- [ ] Confirm share percentage is NOT visible anywhere

### 5. Share Percentage Testing
- [ ] Admin sets partner A to 50%
- [ ] Admin sets partner B to 100%
- [ ] Partner A sees 50% of all amounts
- [ ] Partner B sees 100% of all amounts
- [ ] Neither partner sees their percentage

### 6. Admin Controls
- [ ] Test approve/reject partner
- [ ] Test suspend partner
- [ ] Test ban partner
- [ ] Test edit share percentage
- [ ] Verify search/filter works

---

## 🐛 Troubleshooting

### "Invalid phone number or password" on Login

**Cause**: Password not hashed correctly in database

**Solution**:
```javascript
// Run this script
const bcrypt = require('bcrypt');
const password = 'YourPassword123';
const hash = await bcrypt.hash(password, 12);
console.log(hash);

// Then update database
UPDATE partners 
SET password_hash = '$2b$12$...' -- paste hash here
WHERE phone = '9155804834';
```

### Partner Login Returns 401

**Check**:
1. Partner exists in database
2. Partner status is 'active'
3. Password hash starts with `$2b$12$`
4. Phone number matches exactly (with country code if used)

### Share Percentage Not Applied

**Check**:
1. `share_percentage` column exists in partners table
2. Value is between 1.00 and 100.00
3. Backend multiplies amounts by `sharePercentage / 100`

### Game History Not Showing

**Check**:
1. `game_sessions` table has data
2. Games have `status = 'completed'`
3. Partner status is 'active'
4. Check browser console for API errors

---

## 📝 Database Column Name Issue

**IMPORTANT**: The code uses `phone` but your database might have `phone_number`.

### Quick Check:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'partners' AND column_name IN ('phone', 'phone_number');
```

### If you see `phone_number`:

**Option 1: Rename column (recommended)**
```sql
ALTER TABLE partners RENAME COLUMN phone_number TO phone;
```

**Option 2: Update all code references**
Find and replace in these files:
- `server/partner-auth.ts` (11 instances)
- `server/routes/admin-partners.ts` (2 instances)

Change all `phone` to `phone_number`.

---

## 🎉 Success Criteria

System is working correctly when:

✅ Partner can register and see "Pending approval" message
✅ Admin can approve partner and set share percentage
✅ Partner can login with credentials
✅ Partner dashboard shows game history
✅ Financial amounts are adjusted by share percentage
✅ Partner **cannot** see their share percentage anywhere
✅ Admin can edit share percentage anytime
✅ Different partners see different adjusted amounts based on their share %

---

## 📞 Support

If issues persist:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify database tables exist
4. Confirm password hashes are valid bcrypt hashes
5. Test with 100% share percentage first (shows full amounts)

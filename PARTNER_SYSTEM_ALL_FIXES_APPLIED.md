
# Partner System - All Fixes Applied ✅

## Critical Issues Fixed

### 1. **Column Name Consistency: `share_percentage` (NOT commission_percentage)**

**Problem:** Code was using `commission_percentage` but database has `share_percentage`

**Fixed Files:**
- ✅ [`server/partner-auth.ts`](server/partner-auth.ts:183,198) - Uses `share_percentage`
- ✅ [`server/routes/partner.ts`](server/routes/partner.ts:171,175) - Queries `share_percentage`
- ✅ [`server/routes/admin-partners.ts`](server/routes/admin-partners.ts:65,139) - Uses `share_percentage`

**Database Schema (PARTNER_SYSTEM_SIMPLE.sql):**
```sql
CREATE TABLE partners (
    share_percentage DECIMAL(5,2) DEFAULT 50.00  -- ✅ Correct column name
);

INSERT INTO admin_partner_settings VALUES
    ('default_share_percentage', '50', '...');  -- ✅ Correct setting name
```

### 2. **Optional Fields Handling (email, whatsapp_number)**

**Problem:** Backend tried to insert NULL values for optional fields causing errors

**Fixed in [`server/partner-auth.ts`](server/partner-auth.ts:191-211):**
```javascript
// Build insert data conditionally
const insertData: any = {
  phone: normalizedPhone,
  password_hash: hashedPassword,
  full_name: data.name.trim(),
  status: requireApproval ? 'pending' : 'active',
  share_percentage: defaultSharePercentage,
};

// Only add optional fields if provided
if (data.email?.trim()) {
  insertData.email = data.email.trim();
}

if (data.whatsappNumber?.replace(/\D/g, '')) {
  insertData.whatsapp_number = data.whatsappNumber.replace(/\D/g, '');
}
```

### 3. **Admin API Route Name Fixed**

**Changed:** `/api/admin/partners/:id/commission` → `/api/admin/partners/:id/share-percentage`

**Fixed in [`server/routes/admin-partners.ts`](server/routes/admin-partners.ts:126-151):**
```javascript
// PUT /api/admin/partners/:id/share-percentage
router.put('/:id/share-percentage', requireAdmin, async (req, res) => {
  const { sharePercentage } = req.body;  // ✅ Consistent naming
  const shareNum = parseFloat(sharePercentage);
  
  await supabaseServer
    .from('partners')
    .update({ share_percentage: shareNum })  // ✅ Correct column
    .eq('id', id);
});
```

---

## Complete System Overview

### Database Schema

**Tables Created:**
1. **`partners`** - Partner accounts
   - `phone` VARCHAR(20) - Primary identifier
   - `password_hash` TEXT - Bcrypt hashed password
   - `full_name` TEXT - Partner's full name
   - `status` VARCHAR(20) - pending/active/suspended/banned
   - `share_percentage` DECIMAL(5,2) - **Admin-controlled visibility (1-100%)**
   - Optional: `email`, `whatsapp_number`

2. **`admin_partner_settings`** - Global configuration
   - `default_share_percentage` - Default for new partners (50%)
   - `require_admin_approval` - Approval flow toggle

### How Share Percentage Works

**Admin sets share % → Partner sees adjusted amounts**

```javascript
// Example: Partner has 50% share
Real Data:        Partner Sees:
₹100,000     →    ₹50,000   (100,000 × 0.50)
₹85,000      →    ₹42,500   (85,000 × 0.50)
₹15,000      →    ₹7,500    (15,000 × 0.50)
```

**Partner NEVER sees:**
- Their share percentage
- That amounts are adjusted
- Other partners' data
- Individual player details

---

## Testing the System

### Step 1: Register Partner

**Frontend:** Navigate to `/partner/signup`

**Test Data:**
```
Phone: 9876543222
Password: Test@1234
Confirm Password: Test@1234
```

**Expected Result:**
- Shows "Pending approval" message
- Partner created in database with `status = 'pending'`
- `share_percentage = 50.00` (default)

### Step 2: Admin Approval

**Admin Panel:** `/admin/partner-settings`

**Actions:**
1. Find partner in pending list
2. Click "Approve" button
3. Edit share percentage (click the number to edit)
4. Save changes

**Expected Result:**
- Partner status changes to 'active'
- Can now login
- Share percentage saved

### Step 3: Partner Login

**Frontend:** `/partner/login`

**Credentials:**
```
Phone: 9876543222
Password: Test@1234
```

**Expected Result:**
- Successful login
- Redirected to `/partner/dashboard`
- JWT token stored in `partnerToken` cookie

### Step 4: View Dashboard

**Partner Dashboard:** `/partner/dashboard`

**Should Display:**
- Stats cards (Total Earnings, Monthly Earnings)
- Game history table
- All financial amounts adjusted by share %
- **No share percentage visible anywhere**

---

## API Endpoints Reference

### Partner Authentication
```
POST   /api/partner/auth/register      - Partner signup
POST   /api/partner/auth/login         - Partner login
POST   /api/partner/auth/refresh       - Refresh token
GET    /api/partner/auth/me            - Get current partner
```

### Partner Dashboard
```
GET    /api/partner/dashboard/stats         - Dashboard statistics
GET    /api/partner/dashboard/game-history  - Game history (adjusted)
```

### Admin Partner Management
```
GET    /api/admin/partners                      - List all partners
GET    /api/admin/partners/stats                - System statistics
PUT    /api/admin/partners/:id/status           - Approve/suspend/ban
PUT    /api/admin/partners/:id/share-percentage - Update share %
```

---

## Common Issues & Solutions

### Issue 1: "Failed to create partner account"

**Cause:** Database column mismatch or missing required fields

**Solution:**
1. ✅ Verify database has `share_percentage` column (NOT `commission_percentage`)
2. ✅ Ensure migration `PARTNER_SYSTEM_SIMPLE.sql` was run
3. ✅ Check backend logs for actual error

**Check Database:**
```sql
-- Verify column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'partners' AND column_name = 'share_percentage';

-- Should return: share_percentage
```

### Issue 2: Partner login returns 401

**Causes:**
1. Password not hashed correctly
2. Partner status is not 'active'
3. Wrong phone number format

**Solutions:**
```sql
-- Check partner exists and status
SELECT id, phone, status, share_percentage 
FROM partners 
WHERE phone = '9876543222';

-- Verify password hash format (should start with $2b$)
SELECT password_hash FROM partners WHERE phone = '9876543222';
-- Expected: $2b$12$...

-- If needed, generate new hash
-- Use: node scripts/generate-partner-hash.js "YourPassword"
```

### Issue 3: Share percentage not applied

**Check:**
1. Partner has non-zero `share_percentage` in database
2. Backend multiplies by `sharePercentage / 100`
3. API response doesn't include `sharePercentage` field

**Verify Backend Logic:**
```javascript
// In server/routes/partner.ts line 168-176
const { data: partnerData } = await supabaseServer
  .from('partners')
  .select('share_percentage')  // ✅ Correct column
  .eq('id', partnerId)
  .single();

const sharePercentage = partnerData?.share_percentage || 50;
const shareMultiplier = sharePercentage / 100;

// All amounts multiplied by shareMultiplier
```

---

## Files Modified Summary

### Backend
- ✅ `server/partner-auth.ts` - Partner authentication (uses `share_percentage`)
- ✅ `server/routes/partner.ts` - Partner dashboard API (applies share multiplier)
- ✅ `server/routes/admin-partners.ts` - Admin management (uses `share_percentage`)
- ✅ `server/routes.ts` - Registered partner routes

### Frontend  
- ✅ `client/src/pages/partner/partner-login.tsx` - Login page
- ✅ `client/src/pages/partner/partner-signup.tsx` - Registration page
- ✅ `client/src/pages/partner/partner-dashboard.tsx` - Dashboard (no share % visible)
- ✅ `client/src/pages/admin-partners.tsx` - Admin panel (edit share %)
- ✅ `client/src/contexts/PartnerAuthContext.tsx` - Partner auth context
- ✅ `client/src/pages/index.tsx` - Added "Become a Partner" button

### Database
- ✅ `server/migrations/PARTNER_SYSTEM_SIMPLE.sql` - Correct schema with `share_percentage`

---

## What's Working Now

✅ **Partner Registration**
- Form validates properly
- Creates partner with auto-generated name from phone
- Sets default share_percentage = 50%
- Status = 'pending' (awaits admin approval)

✅ **Admin Approval Flow**
- Admin sees pending partners
- Can approve/reject with reason
- Can edit share percentage (1-100%)
- Changes reflect immediately

✅ **Partner Login**
- Validates phone and password
- Checks status is 'active'
- Generates JWT tokens
- Redirects to dashboard

✅ **Partner Dashboard**
- Shows game history table
- All financial amounts adjusted by share %
- Share
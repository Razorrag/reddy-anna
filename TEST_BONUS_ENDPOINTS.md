# Bonus Endpoints Diagnostic Guide

## Problem Analysis

Your bonus data **EXISTS in the database** (5 deposit bonuses, 3 credited, 2 locked), but the frontend shows empty.

## Root Cause Investigation

### ✅ Endpoints Exist (Verified)

**Player Endpoints:**
- `/api/user/bonus-summary` - Lines 3158-3195 in routes.ts
- `/api/user/deposit-bonuses` - Lines 3198-3238 in routes.ts
- `/api/user/referral-bonuses` - Lines 3241-3279 in routes.ts
- `/api/user/bonus-transactions` - Lines 3282-3320 in routes.ts

**Admin Endpoints:**
- `/api/admin/bonus-transactions` - Lines 4137-4161 in routes.ts
- `/api/admin/referral-data` - Lines 4164-4187 in routes.ts
- `/api/admin/player-bonus-analytics` - Lines 4190-4213 in routes.ts

### ✅ Storage Methods Exist (Verified)

- `storage.getBonusSummary()` - Line 5338 in storage-supabase.ts
- `storage.getDepositBonuses()` - Line 4880 in storage-supabase.ts
- `storage.getReferralBonuses()` - Line 5262 in storage-supabase.ts
- `storage.getBonusTransactions()` - Line 5316 in storage-supabase.ts

### ✅ Frontend Calls Correct Endpoints (Verified)

- `profile.tsx:166-171` - Calls all 4 player endpoints correctly
- `admin-bonus.tsx:110-112` - Calls admin bonus-transactions endpoint

---

## Likely Issues

### 1. **Authentication Problem** ⚠️

The endpoints require `req.user.id` to be set by authentication middleware:

```typescript
if (!req.user || !req.user.id) {
  return res.status(401).json({ success: false, error: 'Authentication required' });
}
```

**Check:**
- Is the user logged in?
- Is the JWT token being sent in the Authorization header?
- Is the `requireAuth` middleware working?

**Test:**
```bash
# Open browser DevTools → Network tab
# Navigate to Profile → Bonuses tab
# Check the API requests:
# - Do they have Authorization: Bearer <token> header?
# - What status code do they return? (401 = auth issue, 500 = server error)
```

---

### 2. **CORS or Network Issue** ⚠️

The API might be blocked by CORS or not reachable.

**Test:**
```bash
# In browser console:
fetch('/api/user/bonus-summary', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

### 3. **Empty Response from Database** ⚠️

The storage methods might be querying the wrong user_id or table.

**Check storage method:**

```typescript
// server/storage-supabase.ts:4880
async getDepositBonuses(userId: string): Promise<any[]> {
  const { data, error } = await supabaseServer
    .from('deposit_bonuses')
    .select('*')
    .eq('user_id', userId)  // ← Is this the correct user_id?
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching deposit bonuses:', error);
    return [];
  }
  
  return data || [];
}
```

**Test in Supabase SQL Editor:**
```sql
-- Check what user_id values exist in deposit_bonuses
SELECT DISTINCT user_id FROM deposit_bonuses;

-- Check if bonuses exist for a specific user
SELECT * FROM deposit_bonuses WHERE user_id = 'YOUR_USER_ID_HERE';
```

---

### 4. **Frontend Not Handling Response Correctly** ⚠️

The frontend might be looking for data in the wrong place.

**Check profile.tsx:173-184:**
```typescript
setBonusSummary(summaryRes.data || summaryRes);
setDepositBonuses(depositRes.data || depositRes);
```

**API Response Format:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Frontend expects:**
```typescript
// Should extract .data property
setBonusSummary(summaryRes.data);  // ✅ Correct
```

---

## Debugging Steps

### Step 1: Check Browser Console

1. Open Profile page → Bonuses tab
2. Open DevTools → Console
3. Look for errors:
   - `401 Unauthorized` → Authentication issue
   - `500 Internal Server Error` → Server-side error
   - `CORS error` → CORS configuration issue
   - `Network error` → Server not running or wrong URL

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Navigate to Bonuses tab
3. Find the API requests (`bonus-summary`, `deposit-bonuses`, etc.)
4. Check:
   - **Request Headers:** Is `Authorization: Bearer <token>` present?
   - **Response Status:** 200 OK, 401 Unauthorized, or 500 Error?
   - **Response Body:** What data is returned?

### Step 3: Check Server Logs

1. Look at your server console
2. When you navigate to Bonuses tab, you should see:
   ```
   Bonus summary error: ...
   Deposit bonuses error: ...
   ```
3. If you see errors, they'll tell you what's wrong

### Step 4: Test Directly with SQL

```sql
-- Get your user ID from users table
SELECT id, phone, full_name FROM users WHERE phone = 'YOUR_PHONE_NUMBER';

-- Check deposit bonuses for that user
SELECT * FROM deposit_bonuses WHERE user_id = 'USER_ID_FROM_ABOVE';

-- Check referral bonuses
SELECT * FROM referral_bonuses WHERE referrer_user_id = 'USER_ID_FROM_ABOVE';

-- Check bonus transactions
SELECT * FROM bonus_transactions WHERE user_id = 'USER_ID_FROM_ABOVE' ORDER BY created_at DESC LIMIT 20;
```

---

## Quick Fix Checklist

- [ ] User is logged in with valid JWT token
- [ ] Authorization header is being sent with API requests
- [ ] Server is running and endpoints are accessible
- [ ] `user_id` in database matches `req.user.id` from JWT
- [ ] Storage methods are querying correct tables
- [ ] Frontend is extracting `.data` property from responses
- [ ] No CORS errors in browser console
- [ ] No 401/500 errors in Network tab

---

## Most Likely Solution

Based on the code review, the **most likely issue** is:

### **User ID Mismatch**

Your database shows bonuses with `user_id` values like:
- `9876543210` (phone number as ID)

But the JWT token might have a different user ID format.

**Check:**
1. What is `req.user.id` when the endpoint is called?
2. What are the `user_id` values in `deposit_bonuses` table?
3. Do they match?

**Test:**
Add logging to the endpoint:
```typescript
app.get("/api/user/bonus-summary", generalLimiter, async (req, res) => {
  console.log('🔍 User ID from JWT:', req.user?.id);  // ← Add this
  
  const userId = req.user.id;
  const summary = await storage.getBonusSummary(userId);
  
  console.log('🔍 Bonus summary result:', summary);  // ← Add this
  ...
});
```

Then check server logs when you load the Bonuses tab.

---

## Next Steps

1. **Check browser DevTools** (Console + Network tab)
2. **Check server logs** for errors
3. **Verify user_id** matches between JWT and database
4. **Test SQL queries** directly in Supabase

If you still see empty data after checking these, share:
- Browser console errors
- Network tab response for `/api/user/bonus-summary`
- Server console logs
- Result of SQL query: `SELECT * FROM deposit_bonuses LIMIT 5;`

Then I can pinpoint the exact issue!

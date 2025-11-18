# Frontend Bonus Display Debug Guide

## What I Changed

Added console logging to `client/src/pages/profile.tsx` (line 173-178) to see what the API returns.

---

## How to Debug

### Step 1: Start the App

```bash
npm run dev
```

### Step 2: Login and Navigate to Bonuses

1. Open the app in browser
2. Login with user: `9876543210` (or any user with bonuses)
3. Navigate to **Profile → Bonuses tab**

### Step 3: Check Browser Console

Open DevTools (F12) → Console tab

You should see:
```javascript
🎁 Bonus API Responses: {
  summary: { success: true, data: { ... } },
  deposit: { success: true, data: [...] },
  referral: { success: true, data: [...] },
  transactions: { success: true, data: [...] }
}
```

---

## What to Look For

### ✅ If you see data in console:

**Example:**
```javascript
summary: {
  success: true,
  data: {
    depositBonuses: {
      credited: 7500,
      locked: 0,
      unlocked: 0,
      total: 7500
    },
    ...
  }
}
deposit: {
  success: true,
  data: [
    { id: "...", bonusAmount: 2500, status: "credited", ... },
    { id: "...", bonusAmount: 2500, status: "credited", ... },
    { id: "...", bonusAmount: 2500, status: "credited", ... }
  ]
}
```

**Then the API works!** The issue is in how the frontend displays the data.

**Next step:** Check the bonus display component to see why it's not rendering.

---

### ❌ If you see empty data:

**Example:**
```javascript
summary: {
  success: true,
  data: {
    depositBonuses: { credited: 0, locked: 0, unlocked: 0, total: 0 },
    ...
  }
}
deposit: { success: true, data: [] }
```

**Then there's a user ID mismatch** between your logged-in user and the database.

**Next step:** Check server console logs (I added logging there too).

---

### ❌ If you see an error:

**Example:**
```javascript
Failed to fetch bonus data: Error: Request failed with status code 401
```

**Then authentication is failing.**

**Next step:** 
1. Check if you're logged in
2. Check Network tab for the API request
3. Verify Authorization header is present

---

## Server Console Logs

When you navigate to Bonuses tab, server console should show:

```
🎁 Bonus summary request - User: 9876543210
🔍 Fetching bonus summary for user: 9876543210
📊 Bonus summary result: { depositBonusUnlocked: 0, depositBonusLocked: 0, depositBonusCredited: 7500, ... }
💰 Deposit bonuses request - User: 9876543210
🔍 Fetching deposit bonuses for user: 9876543210
📊 Found 3 deposit bonuses
```

If you see this, the backend is working correctly!

---

## Common Issues

### Issue 1: API Returns Empty Data

**Cause:** User ID in JWT doesn't match user_id in database

**Check:**
1. Server logs show: `User: 9876543210`
2. Database has bonuses for: `9876543210`
3. Do they match? ✅

**Fix:** If they don't match, the issue is in how user IDs are stored during registration.

---

### Issue 2: API Returns 401 Unauthorized

**Cause:** Not logged in or token expired

**Fix:**
1. Logout
2. Login again
3. Try again

---

### Issue 3: Data Loads But Doesn't Display

**Cause:** Frontend component not rendering the data

**Check:**
1. Console shows data ✅
2. But UI shows "No bonuses" ❌

**Fix:** Check the bonus display component (likely in a separate component file).

---

## Next Steps Based on Results

### If Console Shows Data:

The API works! Issue is in the display component.

**I need to check:**
- Where is the bonus data being rendered?
- Is there a condition preventing display?
- Is the component expecting a different data structure?

**Share:** Screenshot of browser console showing the data

---

### If Console Shows Empty Data:

User ID mismatch.

**I need to check:**
- What user ID is in the JWT token?
- What user ID is in the database?

**Share:** Server console logs when you load Bonuses tab

---

### If Console Shows Error:

Authentication issue.

**I need to check:**
- Is the token being sent?
- Is the token valid?

**Share:** 
- Browser console error
- Network tab screenshot of the failed request

---

## Quick Test Right Now

1. **Start server:** `npm run dev`
2. **Open browser:** http://localhost:5173 (or your dev URL)
3. **Login** with user `9876543210`
4. **Open DevTools** (F12) → Console tab
5. **Navigate** to Profile → Bonuses tab
6. **Look at console** - what do you see?

**Share the console output and I'll tell you exactly what's wrong!**

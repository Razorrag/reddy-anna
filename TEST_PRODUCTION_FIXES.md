# Testing Guide for Production Fixes

## Quick Test Suite (5 Minutes)

### Test 1: Admin Bet Totals After Refresh ⏱️ 2 min

**Purpose**: Verify admin sees correct bet totals immediately after refresh

**Steps**:
1. Login as admin → Navigate to `/admin-game`
2. Start game with opening card
3. Open player window (incognito) → Login as player
4. Player places bets: ₹5000 on Andar, ₹3000 on Bahar
5. **Admin refreshes browser (F5)**
6. Check admin dashboard

**Expected Results**:
- ✅ Round 1 Andar: ₹5,000 (not 0)
- ✅ Round 1 Bahar: ₹3,000 (not 0)
- ✅ Total: ₹8,000 (not 0)
- ✅ No delay - shows immediately

**If Failed**:
- Check browser console for WebSocket errors
- Verify `game_subscribe` message includes `round1Bets`, `round2Bets`
- Check server logs for `getCurrentGameStateForUser` output

---

### Test 2: Referral Copy on HTTPS ⏱️ 1 min

**Purpose**: Verify clipboard copy works on secure connection

**Prerequisites**: 
- Deployment must be on HTTPS (not HTTP)
- Or test on `localhost`

**Steps**:
1. Login as player → Navigate to Profile → Referral tab
2. Click "Copy Code" button
3. Open any text editor → Paste (Ctrl+V)

**Expected Results**:
- ✅ Green notification: "Referral code copied to clipboard!"
- ✅ Code appears in text editor (e.g., "RAJUGARIKOSSU123456")

**If Failed**:
- Check if site is on HTTPS (clipboard API requires secure context)
- Check browser console for errors
- Verify `window.isSecureContext` is `true` in console

---

### Test 3: Referral Copy Error on HTTP ⏱️ 1 min

**Purpose**: Verify clear error message on non-secure connection

**Prerequisites**: 
- Access site via HTTP (not HTTPS)
- Or via IP address (e.g., `http://192.168.1.100`)

**Steps**:
1. Login as player → Navigate to Profile → Referral tab
2. Click "Copy Code" button

**Expected Results**:
- ✅ Red notification: "Clipboard access requires HTTPS. Please use a secure connection."
- ✅ No silent failure
- ✅ Code NOT copied to clipboard

**If Failed**:
- Check `handleCopyToClipboard` function in profile.tsx
- Verify `window.isSecureContext` check is working

---

### Test 4: Referral Data Error Visibility ⏱️ 30 sec

**Purpose**: Verify backend errors are logged (not hidden)

**Steps**:
1. Open browser DevTools → Console tab
2. Login as player → Navigate to Profile → Referral tab
3. Watch console output

**Expected Results**:

**If API succeeds**:
- ✅ `🔄 Fetching referral data from API`
- ✅ No errors

**If API fails** (e.g., 500 error, missing endpoint):
- ✅ `❌ Failed to fetch referral data:` with full details:
  - `message`: Error description
  - `status`: HTTP status code
  - `endpoint`: `/user/referral-data`
- ✅ Referral stats show 0 (expected fallback)
- ✅ Cache expires in 5 minutes (not 24 hours)

**If Failed**:
- Check if error is being caught and logged
- Verify console.error is not suppressed
- Check localStorage for `referral_data_cache_duration`

---

### Test 5: Player Bet Persistence ⏱️ 30 sec

**Purpose**: Verify players see their own bets after refresh (not others')

**Steps**:
1. Login as Player A → Place bets: ₹2000 Andar, ₹1000 Bahar
2. Login as Player B (different browser/incognito) → Place bets: ₹5000 Bahar
3. **Player A refreshes browser**
4. Check Player A's bet slips

**Expected Results**:
- ✅ Player A sees: ₹2000 Andar, ₹1000 Bahar (own bets)
- ✅ Player A does NOT see: ₹5000 Bahar (Player B's bet)
- ✅ Balance correct
- ✅ No access to total bets (admin-only)

**If Failed**:
- Check `game_subscribe` response for player
- Verify `playerRound1Bets`, `playerRound2Bets` are user-specific
- Ensure `round1Bets`, `round2Bets` (totals) are NOT sent to players

---

## Automated Test Commands

### Backend Tests (if test suite exists)

```bash
# Test WebSocket state sync
npm test -- --grep "game_subscribe"

# Test referral API
npm test -- --grep "referral-data"
```

### Frontend Tests (if test suite exists)

```bash
# Test clipboard utility
npm test -- --grep "copyToClipboard"

# Test UserProfileContext
npm test -- --grep "UserProfileContext"
```

---

## Debugging Commands

### Check WebSocket Messages (Browser Console)

```javascript
// Enable WebSocket message logging
localStorage.setItem('debug_websocket', 'true');

// Watch for game_subscribe response
// Should include round1Bets, round2Bets for admins
```

### Check Referral Cache (Browser Console)

```javascript
// View cached referral data
JSON.parse(localStorage.getItem('referral_data_cache'));

// View cache timestamp
new Date(parseInt(localStorage.getItem('referral_data_cache_timestamp')));

// Clear cache to force fresh fetch
localStorage.removeItem('referral_data_cache');
localStorage.removeItem('referral_data_cache_timestamp');
```

### Check Secure Context (Browser Console)

```javascript
// Should be true on HTTPS, false on HTTP
console.log('Secure Context:', window.isSecureContext);

// Check clipboard API availability
console.log('Clipboard API:', !!navigator.clipboard);
```

---

## Expected Console Output (Normal Operation)

### Admin Dashboard Load
```
🔄 Admin panel mounted - requesting game state sync
[GAME_STATE] Synchronized state for user admin-123: { phase: 'betting', currentRound: 1, canBet: true }
✅ Game state sent to admin-123
```

### Player Bet Placement
```
📝 BET REQUEST: User player-456 wants to bet ₹5000 on andar for round 1
🔍 BEFORE BET - Round 1 andar: { globalTotal: 0, betToAdd: 5000 }
✅ AFTER BET - Round 1 andar: { globalTotal: 5000, added: 5000 }
📊 Bet recorded: player-456 - 5000 on andar for game game-1234
✅ BET CONFIRMED: player-456 bet ₹5000 on andar, new balance: ₹45000
```

### Referral Data Fetch (Success)
```
🔄 Fetching referral data from API
```

### Referral Data Fetch (Failure)
```
❌ Failed to fetch referral data: {
  message: "Request failed with status code 500",
  status: 500,
  data: { error: "Internal server error" },
  endpoint: "/user/referral-data"
}
```

---

## Performance Benchmarks

### WebSocket Reconnection
- **Target**: < 2 seconds from disconnect to full state sync
- **Measure**: Time from page refresh to bet totals visible

### Clipboard Copy
- **Target**: < 100ms
- **Measure**: Time from button click to success notification

### Referral Data Fetch
- **Target**: < 1 second (first load), < 100ms (cached)
- **Measure**: Time from profile page load to data display

---

## Rollback Plan (If Tests Fail)

### If Admin Bet Totals Still Show 0:
```bash
# Revert server/routes.ts changes
git diff server/routes.ts
git checkout HEAD -- server/routes.ts
npm run build
pm2 restart all
```

### If Referral Copy Broken:
```bash
# Revert profile.tsx changes
git diff client/src/pages/profile.tsx
git checkout HEAD -- client/src/pages/profile.tsx
npm run build
```

### If Referral Data Errors Spam Console:
```bash
# Revert UserProfileContext.tsx changes
git diff client/src/contexts/UserProfileContext.tsx
git checkout HEAD -- client/src/contexts/UserProfileContext.tsx
npm run build
```

---

## Success Criteria

All 5 tests must pass:
- ✅ Test 1: Admin sees bet totals immediately after refresh
- ✅ Test 2: Referral copy works on HTTPS
- ✅ Test 3: Referral copy shows clear error on HTTP
- ✅ Test 4: Backend errors logged with details
- ✅ Test 5: Players see only their own bets

**If all pass** → Deploy to production  
**If any fail** → Review PRODUCTION_READINESS_FIXES.md for troubleshooting

---

**Test Duration**: 5 minutes  
**Required Roles**: 1 admin account, 2 player accounts  
**Required Environment**: HTTPS deployment (or localhost)

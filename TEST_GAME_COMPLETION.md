# 🧪 Game Completion Testing Guide

## Quick Test Procedure

### Step 1: Start the Server
```bash
npm run dev
```

**Expected Output:**
```
Server running on port 5000
✅ Connected to Supabase
WebSocket server listening on /ws
```

---

### Step 2: Login as Admin
1. Open browser: `http://localhost:5000/admin-login`
2. Enter admin credentials
3. Navigate to: `http://localhost:5000/admin/game-control`

---

### Step 3: Start a Game
1. **Select Opening Card:** Click any card (e.g., "7 of Hearts")
2. **Click "Start Game"** button
3. **Wait for timer:** 30 seconds countdown

**Server Console Should Show:**
```
🎮 Game started with opening card: 7♥
⏰ Timer started: 30 seconds
```

---

### Step 4: Deal Cards (Bahar Side)
1. **Wait for timer to expire** (betting phase ends)
2. **Click "Deal to Bahar"** button repeatedly
3. **Watch for winner detection**

**Server Console Should Show:**
```
🃏 Card dealt to Bahar: 5♠
🃏 Card dealt to Bahar: 9♦
🃏 Card dealt to Bahar: 7♥  ← Match found!
🎉 Winner detected: bahar
```

---

### Step 5: Monitor Game Completion Logs

**Look for these logs in sequence:**

#### 1. Payout Processing
```
🔄 Starting payout processing for X payouts...
📊 Payout summary: X winning bets, Y losing bets
💾 Calling storage.applyPayoutsAndupdateBets with: {
  payoutsCount: X,
  winningBetsCount: Y,
  losingBetsCount: Z,
  totalPayoutAmount: XXXX
}
✅ Database updated: X payout records, Y winning bets, Z losing bets
```

#### 2. Game History Save
```
💾 [Attempt 1/3] Saving game history with data: {
  gameId: 'game-xxx',
  openingCard: '7♥',
  winner: 'bahar',
  winningCard: '7♥',
  totalCards: 5,
  round: 1,
  totalBets: 1000,
  totalPayouts: 2000
}
📊 Game history data being saved: { ... }
✅ Game history saved successfully for gameId: game-xxx
```

#### 3. Session Completion
```
🔄 Completing game session in database for gameId: game-xxx
✅ Game session completed in database: game-xxx
```

#### 4. Statistics Save
```
✅ Game statistics saved for gameId: game-xxx
✅ Final game state persisted for gameId: game-xxx
```

#### 5. Database Confirmation
```
✅ Saved record ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx, Round: 1
```

---

### Step 6: Verify Game History

1. **Navigate to:** `http://localhost:5000/admin/game-history`
2. **Check the latest entry:**

**Expected Data:**
| Field | Value |
|-------|-------|
| Game ID | game-1730xxx... |
| Opening Card | 7♥ |
| Winner | Bahar |
| Winning Card | 7♥ |
| Round | 1 |
| Total Cards | 5 |
| Total Bets | ₹1000 |
| Total Payouts | ₹2000 |
| Created At | 2025-11-05... |

---

## 🚨 Error Scenarios to Test

### Test 1: No Bets Placed
**Steps:**
1. Start game
2. Wait for timer to expire (no bets)
3. Deal cards until winner

**Expected:**
- ✅ Game completes normally
- ✅ History saved with 0 bets/payouts
- ✅ No payout processing

**Logs:**
```
🔄 Starting payout processing for 0 payouts...
💾 [Attempt 1/3] Saving game history with data: {
  totalBets: 0,
  totalPayouts: 0
}
✅ Game history saved successfully
```

---

### Test 2: Multiple Rounds
**Steps:**
1. Start game
2. Place bets on Andar
3. Deal to Bahar (no match)
4. Deal to Andar (no match)
5. Continue until Round 2 or 3

**Expected:**
- ✅ Round transitions correctly
- ✅ History saved with correct round number (2 or 3)

**Logs:**
```
🔄 Transitioning to Round 2
💾 [Attempt 1/3] Saving game history with data: {
  round: 2,  ← Should be 2 or 3
  ...
}
✅ Saved record ID: xxx, Round: 2
```

---

### Test 3: Database Connection Issue
**Steps:**
1. Stop Supabase or use invalid credentials
2. Complete a game

**Expected:**
- ❌ Error logs with full details
- ✅ Retry attempts (3 times)
- ❌ Final error broadcast to admins

**Logs:**
```
❌ Database error saving game history: {
  message: "Connection failed",
  code: "PGRST301",
  details: "...",
  hint: "..."
}
💾 [Attempt 2/3] Saving game history with data: ...
💾 [Attempt 3/3] Saving game history with data: ...
❌ CRITICAL ERROR: All game history save attempts failed
```

---

## ✅ Success Criteria

### All Tests Pass If:
- [ ] Game completes without errors
- [ ] History appears in `/admin/game-history`
- [ ] All fields populated correctly
- [ ] Round number is accurate (1, 2, or 3)
- [ ] Payouts applied to user balances
- [ ] Bet statuses updated
- [ ] Statistics updated
- [ ] Game auto-resets after 10 seconds
- [ ] No error messages in console

---

## 🐛 Debugging Tips

### If History Not Saving:

**1. Check Field Name:**
```typescript
// In server logs, look for:
💾 [Attempt 1/3] Saving game history with data: {
  round: X,  ← Should be present
  ...
}
```

**2. Check Database Error:**
```typescript
// If you see:
❌ Database error saving game history: {
  code: "XXXXX",
  message: "...",
  details: "...",
  hint: "..."
}
// Then check Supabase dashboard for table/column issues
```

**3. Check Validation:**
```typescript
// If you see:
❌ VALIDATION ERROR: Cannot save game history: invalid gameId
// Then check game initialization
```

**4. Check Supabase Dashboard:**
- Go to: Table Editor → game_history
- Check for recent inserts
- Verify column names match:
  - `game_id`
  - `opening_card`
  - `winner`
  - `winning_card`
  - `total_cards`
  - `winning_round` ← Critical field
  - `total_bets`
  - `total_payouts`
  - `created_at`

---

## 📊 Expected Console Output (Full Flow)

```
🎮 Game started with opening card: 7♥
⏰ Timer started: 30 seconds
⏰ Timer expired - betting locked
🃏 Card dealt to Bahar: 5♠
🃏 Card dealt to Bahar: 9♦
🃏 Card dealt to Bahar: 7♥
🎉 Winner detected: bahar

🔄 Starting payout processing for 2 payouts...
📊 Payout summary: 2 winning bets, 1 losing bets
💾 Calling storage.applyPayoutsAndupdateBets with: {
  payoutsCount: 2,
  winningBetsCount: 2,
  losingBetsCount: 1,
  totalPayoutAmount: 2000
}
✅ Database updated: 2 payout records, 2 winning bets, 1 losing bets
✅ Updated stats for user user-123: won=true, bet=1000, payout=2000

💾 [Attempt 1/3] Saving game history with data: {
  gameId: 'game-1730xxx',
  openingCard: '7♥',
  winner: 'bahar',
  winningCard: '7♥',
  totalCards: 5,
  round: 1,
  totalBets: 1500,
  totalPayouts: 2000
}
📊 Game history data being saved: { ... }
✅ Game history saved successfully for gameId: game-1730xxx

🔄 Completing game session in database for gameId: game-1730xxx
✅ Game session completed in database: game-1730xxx

✅ Game statistics saved for gameId: game-1730xxx
✅ Final game state persisted for gameId: game-1730xxx
✅ Saved record ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx, Round: 1

🔄 Auto-restart: Starting new game setup
✅ Game auto-restarted successfully
```

---

## 🎯 Final Verification

After testing, verify in Supabase Dashboard:

### 1. game_history Table
```sql
SELECT * FROM game_history 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:**
- ✅ Record exists
- ✅ `winning_round` = 1, 2, or 3 (not NULL)
- ✅ All fields populated

### 2. game_sessions Table
```sql
SELECT * FROM game_sessions 
WHERE status = 'complete' 
ORDER BY updated_at DESC 
LIMIT 1;
```

**Expected Result:**
- ✅ Status = 'complete'
- ✅ Winner field populated
- ✅ Winning card populated

### 3. bets Table
```sql
SELECT * FROM bets 
WHERE game_id = 'YOUR_GAME_ID' 
AND status IN ('won', 'lost');
```

**Expected Result:**
- ✅ All bets have status 'won' or 'lost'
- ✅ No bets with status 'pending'

---

## 🎉 Success!

If all tests pass, the game completion flow is working correctly!

**Key Indicators:**
- ✅ Detailed logs at every step
- ✅ Game history saved with correct round
- ✅ Payouts applied successfully
- ✅ No errors in console
- ✅ Database records created properly

**You can now confidently run games in production!**

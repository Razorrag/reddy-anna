# 🧪 Complete Testing Guide - Multi-Round Andar Bahar

## 📋 Pre-Test Checklist

### ✅ Files That Must Be Replaced Manually

Before testing, you **MUST** replace these files:

1. **GameAdmin.tsx**
   ```
   Source: client/src/components/GameAdmin/GameAdminRefactored.tsx
   Target: client/src/components/GameAdmin/GameAdmin.tsx
   ```

2. **player-game.tsx** (Optional but recommended)
   ```
   Source: client/src/pages/player-game-refactored.tsx
   Target: client/src/pages/player-game.tsx
   ```

**How to Replace:**
- Open both files in VS Code
- Copy all content from "Refactored" version
- Paste into original file
- Save

---

## 🚀 Setup Instructions

### Step 1: Start the Application

```bash
# In project root
npm run dev:both
```

**Expected Output:**
```
Server running on http://localhost:5000
Client running on http://localhost:5173
WebSocket server listening on ws://localhost:5000/ws
```

**Verify:**
- ✅ No compilation errors
- ✅ Both servers running
- ✅ WebSocket connected

---

### Step 2: Create Admin User

1. **Navigate to:** `http://localhost:5173/signup`
2. **Sign up:**
   - Username: `admin`
   - Password: `adminpass`
3. **Expected:** Redirected to `/` (player game page)
4. **Action:** Close this tab

---

### Step 3: Create Player A

1. **Open:** New **Incognito Window**
2. **Navigate to:** `http://localhost:5173/signup`
3. **Sign up:**
   - Username: `PlayerA`
   - Password: `test`
4. **Expected:**
   - Redirected to `/`
   - Wallet shows: `₹50,00,000`
   - WebSocket connected (🟢 Connected)
5. **Action:** Keep this window open

---

### Step 4: Create Player B

1. **Open:** Another **Incognito Window**
2. **Navigate to:** `http://localhost:5173/signup`
3. **Sign up:**
   - Username: `PlayerB`
   - Password: `test`
4. **Expected:**
   - Redirected to `/`
   - Wallet shows: `₹50,00,000`
   - WebSocket connected (🟢 Connected)
5. **Action:** Keep this window open

---

### Step 5: Log in as Admin

1. **Open:** New **regular browser tab**
2. **Navigate to:** `http://localhost:5173/admin-login`
3. **Log in:**
   - Username: `admin`
   - Password: `adminpass`
4. **Expected:**
   - Redirected to `/admin-game`
   - **Admin interface visible** ✅
   - Opening card selection grid displayed
   - 52 cards in 13x4 grid
5. **Action:** Keep this tab open

---

## 🎮 Test Scenario: Round 2 - Andar Wins

### Phase 1: Opening Card Selection

**Admin Actions:**
1. ✅ See "Select Opening Card" section
2. ✅ Click on **`7♥`** card
3. ✅ Verify card highlights with gold border
4. ✅ See selected card display shows `7♥`
5. ✅ Click **"Confirm & Display Opening Card"** button
6. ✅ Timer popup appears
7. ✅ Set timer to `30` seconds (or custom)
8. ✅ Click **"Start Round 1"**

**Expected Admin UI:**
- ✅ Phase changes to "Game In Progress"
- ✅ Round indicator shows: **ROUND 1**
- ✅ Timer counts down from 30
- ✅ Opening card displays: `7♥`
- ✅ Bet Distribution panel shows:
  - Andar: ₹0
  - Bahar: ₹0

**Expected Player A UI:**
- ✅ Opening card appears: `7♥`
- ✅ Timer starts: 30s countdown
- ✅ Round indicator: **ROUND 1**
- ✅ Status: "⏱️ Place Your Bets!"
- ✅ Can click betting zones
- ✅ Chip selector available

**Expected Player B UI:**
- ✅ Same as Player A
- ✅ All synced in real-time

**WebSocket Messages:**
```json
// Admin → Server → Players
{
  "type": "opening_card_confirmed",
  "data": {
    "openingCard": { "value": "7", "suit": "♥", "display": "7♥" },
    "phase": "betting",
    "round": 1
  }
}

{
  "type": "timer_update",
  "data": {
    "seconds": 30,
    "phase": "betting",
    "round": 1
  }
}
```

---

### Phase 2: Round 1 Betting

**Player A Actions:**
1. ✅ Click **"Select Chip"** button
2. ✅ Chip selector panel appears
3. ✅ Click **₹100k** chip (100,000)
4. ✅ Chip selector closes
5. ✅ Selected chip button shows: "₹100k"
6. ✅ Click **ANDAR** betting zone
7. ✅ Notification: "Bet of ₹100k placed on ANDAR!"

**Expected Player A:**
- ✅ Wallet updates: `₹50,00,000` → `₹49,00,000`
- ✅ Bet recorded internally

**Player B Actions:**
1. ✅ Click **"Select Chip"** button
2. ✅ Click **₹100k** chip twice (or select ₹200k if available)
3. ✅ Click **BAHAR** betting zone twice
4. ✅ Total bet: ₹200,000

**Expected Player B:**
- ✅ Wallet updates: `₹50,00,000` → `₹48,00,000`
- ✅ Bet recorded internally

**Expected Admin UI:**
- ✅ Bet Distribution updates in real-time:
  - **Andar:** ₹1,00,000
  - **Bahar:** ₹2,00,000
- ✅ Timer continues counting down

**WebSocket Messages:**
```json
// Player A → Server → Admin
{
  "type": "bet_placed",
  "data": {
    "userId": "PlayerA",
    "side": "andar",
    "amount": 100000,
    "round": 1
  }
}

// Server → All Clients
{
  "type": "betting_stats",
  "data": {
    "andarTotal": 100000,
    "baharTotal": 200000,
    "round": 1
  }
}
```

---

### Phase 3: Timer Expires - Round 1 Dealing

**Expected (Timer reaches 0):**

**All Clients:**
- ✅ Timer shows: `0s`
- ✅ Phase changes to: "Dealing Phase"
- ✅ Players: Betting zones disabled
- ✅ Players: "Select Chip" button disabled
- ✅ Notification: "Betting closed"

**Admin Actions:**
1. ✅ See "Card Dealing Section"
2. ✅ Select **`J♠`** from card grid
3. ✅ Card highlights (first selection = Bahar)
4. ✅ Select **`4♣`** from card grid
5. ✅ Card highlights (second selection = Andar)
6. ✅ Display shows:
   - Bahar Card: `J♠`
   - Andar Card: `4♣`
7. ✅ Click **"🎴 Show Cards"** button

**Expected All Clients:**
- ✅ Bahar zone shows: `J♠`
- ✅ Andar zone shows: `4♣`
- ✅ Card sequence displays:
  - BAHAR: `J♠`
  - ANDAR: `4♣`
- ✅ No winner (neither matches `7`)

**WebSocket Messages:**
```json
// Admin → Server → Players (Bahar card)
{
  "type": "card_dealt",
  "data": {
    "card": { "value": "J", "suit": "♠", "display": "J♠" },
    "side": "bahar",
    "position": 1,
    "isWinningCard": false
  }
}

// Admin → Server → Players (Andar card)
{
  "type": "card_dealt",
  "data": {
    "card": { "value": "4", "suit": "♣", "display": "4♣" },
    "side": "andar",
    "position": 2,
    "isWinningCard": false
  }
}
```

---

### Phase 4: Round 2 Transition

**⚠️ CRITICAL: Backend Auto-Transition Required**

**Backend Should Detect:**
- ✅ Round 1 complete
- ✅ No winner found
- ✅ Auto-transition to Round 2

**Expected All Clients:**
- ✅ Round indicator: **ROUND 2**
- ✅ New timer starts: 30s
- ✅ Phase: "Betting Phase"
- ✅ Status: "⏱️ Place Your Bets!"
- ✅ Notification: "Round 2 betting started!"

**Expected Player UI:**
- ✅ **"Round 1 Locked Bets"** section appears
- ✅ Shows:
  - Player A: Andar ₹1,00,000
  - Player B: Bahar ₹2,00,000
- ✅ Can place **additional** bets
- ✅ Chip selector re-enabled

**Admin UI:**
- ✅ Round 2 button becomes **disabled** (already in R2)
- ✅ Round 3 button becomes **enabled**
- ✅ Bet distribution shows Round 1 locked amounts
- ✅ Can see new Round 2 bets separately

**WebSocket Message:**
```json
{
  "type": "start_round_2",
  "data": {
    "gameId": "default-game",
    "timer": 30,
    "round1Bets": {
      "andar": 100000,
      "bahar": 200000
    }
  }
}
```

**🚨 POTENTIAL ISSUE:**
If backend doesn't auto-transition, admin must manually click **"Start Round 2 Betting"** button.

---

### Phase 5: Round 2 Betting

**Player A Actions:**
1. ✅ Click **"Select Chip"**
2. ✅ Select **₹50k** chip (50,000)
3. ✅ Click **ANDAR** zone
4. ✅ Notification: "Additional bet placed!"

**Expected Player A:**
- ✅ Wallet: `₹49,00,000` → `₹48,50,000`
- ✅ Total invested: ₹1,50,000
  - Round 1: ₹1,00,000
  - Round 2: ₹50,000

**Player B Actions:**
1. ✅ Select **₹100k** chip
2. ✅ Click **BAHAR** zone
3. ✅ Additional bet: ₹1,00,000

**Expected Player B:**
- ✅ Wallet: `₹48,00,000` → `₹47,00,000`
- ✅ Total invested: ₹3,00,000
  - Round 1: ₹2,00,000
  - Round 2: ₹1,00,000

**Expected Admin UI:**
- ✅ Bet Distribution updates:
  - **Andar:** ₹1,50,000 (R1: 1L + R2: 50k)
  - **Bahar:** ₹3,00,000 (R1: 2L + R2: 1L)

---

### Phase 6: Round 2 Dealing

**Expected (Timer reaches 0):**
- ✅ Betting disabled
- ✅ Phase: "Dealing Phase"

**Admin Actions:**
1. ✅ Select **`9♦`** (Bahar card)
2. ✅ Select **`7♠`** (Andar card - **MATCH!**)
3. ✅ Click **"Show Cards"**

**Expected All Clients:**
- ✅ Bahar zone shows: `9♦`
- ✅ Andar zone shows: `7♠` (highlighted as winning card)
- ✅ Card sequence updates:
  - BAHAR: `J♠`, `9♦`
  - ANDAR: `4♣`, `7♠` ⭐
- ✅ **WINNER DETECTED: ANDAR**
- ✅ Phase: "Game Complete"
- ✅ Big notification: "🏆 ANDAR WINS!"

**WebSocket Messages:**
```json
{
  "type": "card_dealt",
  "data": {
    "card": { "value": "7", "suit": "♠", "display": "7♠" },
    "side": "andar",
    "position": 4,
    "isWinningCard": true
  }
}

{
  "type": "game_complete",
  "data": {
    "winner": "andar",
    "winningCard": "7♠",
    "round": 2,
    "payouts": {
      "PlayerA": 300000,  // Won both rounds
      "PlayerB": 0        // Lost both rounds
    }
  }
}
```

---

### Phase 7: Payout Calculation & Verification

**Round 2 - Andar Wins Payout Rules:**
- **Andar wins:** ALL bets (R1+R2) paid 1:1
- **Bahar loses:** Loses all bets

**Player A (Bet on Andar - WON):**
```
Starting Balance:  ₹50,00,000
Round 1 Bet:       -₹1,00,000
Round 2 Bet:       -₹50,000
Total Bet:         -₹1,50,000
Balance After Bet: ₹48,50,000

Payout (R1+R2 @ 1:1):
  Stake Return:    ₹1,50,000
  Profit (1:1):    ₹1,50,000
  Total Payout:    ₹3,00,000

Final Balance:     ₹48,50,000 + ₹3,00,000 = ₹51,50,000 ✅
```

**Player B (Bet on Bahar - LOST):**
```
Starting Balance:  ₹50,00,000
Round 1 Bet:       -₹2,00,000
Round 2 Bet:       -₹1,00,000
Total Bet:         -₹3,00,000
Balance After Bet: ₹47,00,000

Payout:            ₹0 (Lost)

Final Balance:     ₹47,00,000 ✅
```

**Expected Player UI:**
- ✅ Player A wallet: `₹51,50,000`
- ✅ Player B wallet: `₹47,00,000`
- ✅ Win/Loss notification displayed
- ✅ Game history updated

---

## 🔍 Implementation Status Check

### ✅ Implemented Features

1. **Shared Type System** ✅
   - `GamePhase`, `GameRound`, `Card` types
   - `WebSocketMessageType` enum
   - All in `client/src/types/game.ts`

2. **Payout Calculator** ✅
   - Multi-round logic in `client/src/lib/payoutCalculator.ts`
   - Round 1, 2, 3 payout rules
   - Helper functions

3. **GameStateContext** ✅
   - Centralized state management
   - Round tracking
   - Bet tracking per round

4. **WebSocket Integration** ✅
   - Message handlers for all types
   - `opening_card_confirmed`
   - `timer_update`
   - `card_dealt`
   - `betting_stats`
   - `start_round_2`
   - `game_complete`

5. **Admin Interface** ✅
   - Opening card selection
   - Timer management
   - Card dealing
   - Round progression buttons
   - Bet display

6. **Player Interface** ✅
   - Chip selection
   - Bet placement
   - Card display
   - Timer display
   - Round indicator

---

### ⚠️ Potential Issues & Gaps

#### 1. **Backend Auto-Transition** ⚠️
**Issue:** Backend may not auto-detect Round 1 completion and transition to Round 2

**Current Implementation:**
- Frontend has manual "Start Round 2" button
- Backend needs `GameLoopService` to detect no winner and auto-transition

**Workaround:**
- Admin manually clicks "Start Round 2 Betting" button

**Fix Needed:**
Backend should:
```typescript
// After dealing Round 1 cards
if (noWinnerFound && currentRound === 1) {
  setTimeout(() => {
    startRound2();
    broadcastToAllClients({
      type: 'start_round_2',
      data: { timer: 30 }
    });
  }, 2000); // 2 second delay
}
```

#### 2. **Round 1 Locked Bets Display** ⚠️
**Issue:** Player UI may not show "Round 1 Locked Bets" section

**Current Implementation:**
- Context tracks `playerRound1Bets` and `playerRound2Bets`
- Player UI needs to display locked bets

**Fix Needed:**
Add to player-game UI:
```tsx
{gameState.currentRound === 2 && (
  <div className="locked-bets-display">
    <h3>Round 1 Locked Bets</h3>
    <div>Andar: {formatCurrency(gameState.playerRound1Bets.andar)}</div>
    <div>Bahar: {formatCurrency(gameState.playerRound1Bets.bahar)}</div>
  </div>
)}
```

#### 3. **Payout Execution** ⚠️
**Issue:** Frontend calculates payouts but backend must execute wallet updates

**Current Implementation:**
- Frontend has `payoutCalculator.ts`
- Backend needs to use same logic

**Fix Needed:**
Backend should:
1. Calculate payouts using same rules
2. Update player wallets in database
3. Broadcast updated balances to clients

#### 4. **Betting API Integration** ⚠️
**Issue:** Frontend `placeBet` may not call backend API

**Current Implementation:**
- Context has `placeBet` function
- May only update local state

**Fix Needed:**
```typescript
const placeBet = async (side: BetSide, amount: number) => {
  try {
    const response = await fetch('/api/game/place-bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        gameId: gameState.gameId,
        round: gameState.currentRound,
        side,
        amount
      })
    });
    
    if (response.ok) {
      // Update local state
      updatePlayerRoundBets(gameState.currentRound, ...);
      updatePlayerWallet(playerWallet - amount);
    }
  } catch (error) {
    showNotification('Failed to place bet', 'error');
  }
};
```

#### 5. **Card Dealing Backend Integration** ⚠️
**Issue:** Admin card dealing may not persist to backend

**Current Implementation:**
- Admin sends WebSocket messages
- Backend needs to validate and persist

**Fix Needed:**
Backend should:
1. Receive `card_dealt` message
2. Validate card against opening card
3. Check for winner
4. Persist to database
5. Broadcast to all clients

---

## 🐛 Known Limitations

### 1. **Manual File Replacement Required**
- `GameAdmin.tsx` must be manually replaced
- `player-game.tsx` should be replaced for best experience

### 2. **Backend Integration Incomplete**
- Frontend ready, backend may need updates
- API endpoints may not exist
- WebSocket handlers may be incomplete

### 3. **Database Persistence**
- Bets may not persist to database
- Game state may not persist
- Player wallets may not update in DB

### 4. **Round 3 Logic**
- Continuous draw not fully implemented
- No timer for Round 3 (correct)
- Auto-dealing sequence needs backend support

---

## 📝 Testing Checklist

### Pre-Test
- [ ] Replace `GameAdmin.tsx` with refactored version
- [ ] Replace `player-game.tsx` with refactored version (optional)
- [ ] Start both servers (`npm run dev:both`)
- [ ] Verify no compilation errors
- [ ] Check WebSocket connection in console

### Admin Setup
- [ ] Admin can sign up
- [ ] Admin can log in
- [ ] Admin redirected to `/admin-game`
- [ ] Admin interface visible (not blank)
- [ ] Opening card grid displays (52 cards)

### Player Setup
- [ ] Player A can sign up in incognito
- [ ] Player A sees wallet: ₹50,00,000
- [ ] Player A WebSocket connected
- [ ] Player B can sign up in another incognito
- [ ] Player B sees wallet: ₹50,00,000
- [ ] Player B WebSocket connected

### Round 1 Flow
- [ ] Admin selects opening card
- [ ] Admin confirms opening card
- [ ] Timer popup appears
- [ ] Admin starts Round 1
- [ ] Players see opening card
- [ ] Players see timer countdown
- [ ] Player A can place bet on Andar
- [ ] Player B can place bet on Bahar
- [ ] Admin sees bet totals update
- [ ] Timer expires
- [ ] Betting disabled for players
- [ ] Admin can deal cards
- [ ] Players see dealt cards
- [ ] Card sequence displays

### Round 2 Transition
- [ ] Backend auto-transitions OR
- [ ] Admin clicks "Start Round 2" button
- [ ] Round indicator changes to 2
- [ ] New timer starts (30s)
- [ ] Players can place additional bets
- [ ] Locked bets from Round 1 displayed
- [ ] Admin sees separate R1/R2 bet totals

### Round 2 Completion
- [ ] Timer expires
- [ ] Admin deals winning card
- [ ] Winner detected (Andar)
- [ ] Game complete notification
- [ ] Player A wallet increases
- [ ] Player B wallet decreases
- [ ] Correct payout amounts

### Post-Game
- [ ] Admin can reset game
- [ ] Game returns to opening card selection
- [ ] Players see reset
- [ ] Can start new game

---

## 🔧 Troubleshooting

### Issue: Admin Interface Blank
**Solution:** Replace `GameAdmin.tsx` with refactored version

### Issue: Players Don't See Opening Card
**Check:**
- WebSocket connected?
- Console errors?
- Backend sending `opening_card_confirmed` message?

### Issue: Bets Not Updating
**Check:**
- API endpoint `/api/game/place-bet` exists?
- Backend handling `bet_placed` message?
- WebSocket broadcasting `betting_stats`?

### Issue: Round 2 Doesn't Start
**Solution:** Admin manually click "Start Round 2 Betting" button

### Issue: Payouts Incorrect
**Check:**
- Backend using correct payout logic?
- Database wallet updates?
- Frontend displaying updated balance?

---

## 🎯 Success Criteria

✅ **Test Passes If:**
1. Admin interface visible
2. Players see opening card in real-time
3. Timer syncs across all clients
4. Bets update in real-time
5. Cards display when dealt
6. Round 2 starts (auto or manual)
7. Additional bets can be placed in Round 2
8. Winner detected correctly
9. Payouts calculated correctly
10. Wallets update correctly

---

## 📞 Support

If tests fail, check:
1. `FRONTEND_COMPLETE_ANALYSIS.md` - Issue details
2. `WEBSOCKET_FIXES_APPLIED.md` - WebSocket setup
3. `MANUAL_STEPS_REQUIRED.md` - File replacement
4. Browser console for errors
5. Network tab for WebSocket messages
6. Backend logs for errors

---

*Testing guide complete. All frontend code ready for testing after manual file replacement.*

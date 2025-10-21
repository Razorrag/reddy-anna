# 🧪 Quick Test Guide - Multi-Round Andar Bahar

**Purpose:** Verify all game logic works correctly  
**Time:** 5-10 minutes

---

## 🚀 Setup

### 1. Start Backend
```bash
npm run dev:server
```
**Expected:** Server starts on port 5000, WebSocket ready

### 2. Start Frontend
```bash
cd client
npm run dev
```
**Expected:** Vite dev server on port 3000

---

## 🎮 Test Scenario: Complete Game Flow

### Step 1: Open Both Panels

**Admin Panel:**
- Open: http://localhost:3000/game
- **Expected:** Admin interface with card selector

**Player View:**
- Open: http://localhost:3000/ (in different browser/incognito)
- **Expected:** Player game interface

---

### Step 2: Start Round 1

**Admin Actions:**
1. Select Opening Card (e.g., "6♣")
2. Click "Start Game"

**Expected Results:**
- ✅ Opening Card appears on both screens
- ✅ 30-second timer starts
- ✅ Player can select chips and place bets
- ✅ Betting buttons enabled

**Player Actions:**
1. Select chip amount (e.g., ₹10,000)
2. Click "ANDAR" button
3. Verify notification: "Bet placed: ₹10,000 on andar"

**Expected:**
- ✅ Balance deducted (₹50,000 → ₹40,000)
- ✅ Bet shows in "You: ₹10,000" under Andar
- ✅ Total bets update on both screens

---

### Step 3: Deal Round 1 Cards

**Wait for timer to reach 0**
- ✅ Betting locks automatically
- ✅ Phase changes to "Dealing"

**Admin Actions:**
1. Select a card (e.g., "7♥")
2. Click "Deal to Bahar"
3. Select another card (e.g., "8♠")
4. Click "Deal to Andar"

**Expected:**
- ✅ Cards appear in sequence on both screens
- ✅ If no match: Auto-transition to Round 2 after 2 seconds

---

### Step 4: Round 2 Betting

**Expected (Automatic):**
- ✅ New 30-second timer starts
- ✅ Notification: "Round 2 betting started!"
- ✅ Betting buttons enabled again
- ✅ Previous bets still visible

**Player Actions:**
1. Select chip (e.g., ₹10,000)
2. Click "ANDAR" again
3. Verify: "Bet placed: ₹10,000 on andar"

**Expected:**
- ✅ Balance: ₹40,000 → ₹30,000
- ✅ Round 1 bet: ₹10,000
- ✅ Round 2 bet: ₹10,000
- ✅ Total Andar: ₹20,000

---

### Step 5: Deal Round 2 Cards

**Wait for timer to reach 0**

**Admin Actions:**
1. Deal card to Bahar
2. Deal card to Andar

**Test Case A: Andar Wins**
- Deal matching card to Andar (e.g., "6♦" if opening was "6♣")

**Expected:**
- ✅ Winner announcement: "ANDAR WINS!"
- ✅ Payout calculation:
  - Round 1: ₹10,000 × 2 = ₹20,000
  - Round 2: ₹10,000 × 2 = ₹20,000
  - **Total return: ₹40,000**
- ✅ Balance updates: ₹30,000 + ₹40,000 = ₹70,000
- ✅ Game complete

**Test Case B: No Winner**
- Deal non-matching cards
- ✅ Auto-transition to Round 3
- ✅ Notification: "Round 3: Continuous draw started!"

---

### Step 6: Round 3 (Continuous Draw)

**Expected:**
- ✅ NO betting buttons (disabled)
- ✅ NO timer
- ✅ Phase shows "Final Draw"
- ✅ All bets locked

**Admin Actions:**
1. Deal card to Bahar (non-matching)
2. Deal card to Andar (non-matching)
3. Deal card to Bahar (non-matching)
4. Deal card to Andar (MATCHING - e.g., "6♥")

**Expected:**
- ✅ Winner announcement: "ANDAR WINS!"
- ✅ Payout: Total invested (₹20,000) × 2 = ₹40,000
- ✅ Balance: ₹30,000 + ₹40,000 = ₹70,000
- ✅ Game complete

---

## 💰 Payout Verification Tests

### Test 1: Round 1 Andar Win
```
Setup: Bet ₹10,000 on Andar
Action: Deal matching card to Andar in Round 1
Expected: Receive ₹20,000 (1:1 payout)
```

### Test 2: Round 1 Bahar Win
```
Setup: Bet ₹10,000 on Bahar
Action: Deal matching card to Bahar in Round 1
Expected: Receive ₹10,000 (1:0 refund)
```

### Test 3: Round 2 Andar Win
```
Setup: Bet ₹10,000 on Andar in R1, ₹10,000 in R2
Action: Deal matching card to Andar in Round 2
Expected: Receive ₹40,000 (both rounds pay 1:1)
```

### Test 4: Round 2 Bahar Win
```
Setup: Bet ₹10,000 on Bahar in R1, ₹10,000 in R2
Action: Deal matching card to Bahar in Round 2
Expected: Receive ₹30,000 (R1 pays 1:1, R2 refunds)
```

### Test 5: Round 3 Win
```
Setup: Bet ₹10,000 on Andar in R1, ₹10,000 in R2
Action: Deal matching card to Andar in Round 3
Expected: Receive ₹40,000 (total pays 1:1)
```

---

## ✅ Checklist

### WebSocket Communication
- [ ] Admin panel connects to WebSocket
- [ ] Player view connects to WebSocket
- [ ] Both see same game state
- [ ] Real-time updates work

### Timer Functionality
- [ ] 30-second timer starts in Round 1
- [ ] Timer counts down every second
- [ ] Betting locks when timer reaches 0
- [ ] 30-second timer starts in Round 2
- [ ] No timer in Round 3

### Betting System
- [ ] Chip selection works
- [ ] Bet placement sends WebSocket message
- [ ] Balance deducted immediately
- [ ] Bet totals update on both screens
- [ ] Cannot bet when phase is not "betting"
- [ ] Cannot bet when timer is 0
- [ ] Cannot bet in Round 3

### Card Dealing
- [ ] Admin can select cards
- [ ] Cards appear on both screens
- [ ] Card sequence correct (Bahar first, then Andar)
- [ ] Winner detection works
- [ ] Winning card highlighted

### Round Transitions
- [ ] Round 1 → Round 2 (auto, 2s delay)
- [ ] Round 2 → Round 3 (auto, 2s delay)
- [ ] Notifications show for each transition
- [ ] Game state updates correctly

### Payout Calculations
- [ ] Round 1 Andar: 1:1 ✓
- [ ] Round 1 Bahar: 1:0 ✓
- [ ] Round 2 Andar: 1:1 on all ✓
- [ ] Round 2 Bahar: 1:1 on R1, 1:0 on R2 ✓
- [ ] Round 3: 1:1 on total (both sides) ✓

### Balance Updates
- [ ] Balance deducted on bet placement
- [ ] Balance updated on payout
- [ ] Balance shows correctly on both screens
- [ ] Database balance persists

### Game Reset
- [ ] Admin can reset game
- [ ] All state clears
- [ ] New game can start immediately
- [ ] Players see reset notification

---

## 🐛 Common Issues & Solutions

### Issue: Timer not showing
**Solution:** Check browser console for WebSocket errors

### Issue: Bets not placing
**Solution:** 
1. Verify phase is "betting"
2. Check timer > 0
3. Verify sufficient balance

### Issue: Cards not appearing
**Solution:** Check admin is dealing to correct side

### Issue: Wrong payout amount
**Solution:** Verify round number and winner side in calculation

### Issue: WebSocket not connecting
**Solution:** 
1. Verify backend is running
2. Check port 5000 is not blocked
3. Clear browser cache

---

## 📊 Expected Console Logs

### Backend Console:
```
New WebSocket connection
Received WebSocket message: authenticate
Received WebSocket message: bet_placed
Received WebSocket message: deal_card
Auto-transitioning to Round 2...
```

### Browser Console (Player):
```
WebSocket connected successfully
Authentication message sent with token
Bet placed message sent: andar 10000
Card dealt: 7♥ on bahar
```

---

## ✅ Success Criteria

**Game is working correctly if:**

1. ✅ Both admin and player can connect
2. ✅ Timer synchronizes across all clients
3. ✅ Bets are validated and stored
4. ✅ Cards appear in correct sequence
5. ✅ Winner detection is accurate
6. ✅ Payouts match the rules exactly
7. ✅ Auto-transitions work
8. ✅ Balance updates in real-time
9. ✅ Game can be reset and restarted
10. ✅ Multiple players can join simultaneously

---

**Test Duration:** ~5-10 minutes  
**Status:** Ready to test!

Run through this guide to verify all functionality works as specified. 🎮

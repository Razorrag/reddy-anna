# Testing Guide - Multi-Round Andar Bahar Game

## Quick Start

### 1. Start the Application

**Terminal 1 - Backend:**
```bash
cd e:\next\reddy-anna
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd e:\next\reddy-anna\client
npm run dev
```

### 2. Access the Application

- **Admin Panel:** http://localhost:3000/game
- **Player Panel:** http://localhost:3000/player-game

## Test Scenario: Multi-Round Game with Round 2 Winner

### Setup
- Opening Card: **7♥** (Seven of Hearts)
- Two players betting on both sides

### Round 1 - No Winner

**Step 1: Admin Actions**
1. Select opening card: **7♥**
2. Click "Start Game"
3. 30-second timer starts

**Step 2: Player Actions**
- Player 1 bets ₹10,000 on Andar
- Player 2 bets ₹5,000 on Bahar
- Wait for timer to expire

**Step 3: Admin Deals Cards**
1. Deal to Bahar: **3♠** (Three of Spades) - No match
2. Deal to Andar: **K♦** (King of Diamonds) - No match

**Expected Result:**
- No winner found
- System automatically transitions to Round 2 after 2 seconds
- Message: "Round 2 betting started! Your Round 1 bets are locked."

### Round 2 - Andar Wins

**Step 1: Automatic Transition**
- New 30-second timer starts
- Round 1 bets are LOCKED and displayed
- Players can add MORE bets

**Step 2: Player Actions**
- Player 1 adds ₹20,000 to Andar (Total: R1: ₹10k + R2: ₹20k = ₹30k)
- Player 2 adds ₹10,000 to Bahar (Total: R1: ₹5k + R2: ₹10k = ₹15k)
- Wait for timer to expire

**Step 3: Admin Deals Cards**
1. Deal to Bahar: **9♣** (Nine of Clubs) - No match
2. Deal to Andar: **7♠** (Seven of Spades) - **MATCH!** ✅

**Expected Result:**
- Winner: **Andar**
- Winning Card: **7♠**
- Game phase: Complete

### Payout Calculations

**Player 1 (Bet on Andar - Winner):**
- Round 1 bet: ₹10,000
- Round 2 bet: ₹20,000
- Total invested: ₹30,000
- **Payout: ₹60,000** (ALL bets paid 1:1)
- **Profit: ₹30,000**

**Player 2 (Bet on Bahar - Loser):**
- Round 1 bet: ₹5,000
- Round 2 bet: ₹10,000
- Total invested: ₹15,000
- **Payout: ₹10,000** (R1 paid 1:1, R2 refunded)
  - R1: ₹5,000 × 2 = ₹10,000
  - R2: ₹10,000 refund = ₹0
- **Loss: ₹5,000**

## Alternative Scenario: Round 3 Continuous Draw

### If No Winner in Round 2

**Step 1: Automatic Transition**
- System transitions to Round 3
- NO new betting allowed
- All bets from R1 and R2 are LOCKED
- Message: "Round 3: Continuous Draw! All bets locked."

**Step 2: Admin Continuous Dealing**
- Deal alternating: Bahar → Andar → Bahar → Andar...
- Continue until a card matches the opening card (7♥)

**Step 3: Winner Found**
- First matching card determines winner
- Example: 5th card to Andar is **7♦** - Andar wins!

**Payout in Round 3:**
- **Both sides paid 1:1 on total invested (R1+R2)**
- Winner gets: Total invested × 2
- Loser gets: ₹0

## Validation Tests

### Test 1: Bet Amount Validation
**Action:** Try to bet ₹100,000 (exceeds limit)
**Expected:** Error message "Invalid bet amount. Must be between ₹1,000 and ₹50,000"

### Test 2: Insufficient Balance
**Action:** Try to bet more than current balance
**Expected:** Error message "Insufficient balance"

### Test 3: Betting After Timer Expires
**Action:** Try to place bet after timer reaches 0
**Expected:** Error message "Betting time has expired"

### Test 4: Betting in Round 3
**Action:** Try to place bet in Round 3
**Expected:** Error message "No betting allowed in Round 3"

### Test 5: Invalid Bet Side
**Action:** Send bet with invalid side (not andar/bahar)
**Expected:** Error message "Invalid bet side. Must be andar or bahar"

## WebSocket Connection Test

### Check Connection Status
1. Open browser console (F12)
2. Look for messages:
   - "WebSocket connected successfully"
   - "Authentication message sent"
   - "WebSocket authenticated"

### Check Game State Sync
1. Open admin and player panels in different windows
2. Admin starts game
3. Verify both panels show:
   - Same opening card
   - Same timer countdown
   - Same phase (betting/dealing/complete)

## Timer Synchronization Test

### Test Server Authority
1. Open multiple player panels
2. Admin starts game
3. Verify all panels show:
   - Same countdown value
   - Timer updates every second
   - All timers expire at the same time

## Round Transition Test

### Test Auto-Transitions
1. Complete Round 1 without winner
2. Verify automatic transition to Round 2 after 2 seconds
3. Complete Round 2 without winner
4. Verify automatic transition to Round 3 after 2 seconds

## Balance Update Test

### Test Balance Changes
1. Note starting balance
2. Place bet (balance should decrease)
3. Win the game (balance should increase by payout)
4. Verify balance updates in real-time via WebSocket

## Common Issues and Solutions

### Issue: WebSocket Connection Failed
**Solution:** 
- Ensure backend is running on port 5000
- Check vite proxy configuration
- Verify no firewall blocking

### Issue: Timer Not Syncing
**Solution:**
- Refresh page to reconnect WebSocket
- Check browser console for errors
- Verify backend timer is broadcasting

### Issue: Bets Not Registering
**Solution:**
- Check bet amount is within limits (1000-50000)
- Verify betting phase is active
- Check sufficient balance
- Ensure timer hasn't expired

### Issue: Payout Incorrect
**Solution:**
- Verify round-specific payout rules
- Check user bet tracking per round
- Review backend calculatePayout() function

## Success Criteria

✅ WebSocket connects successfully
✅ Game state syncs across all clients
✅ Timer counts down synchronously
✅ Bets are validated and rejected if invalid
✅ Round transitions happen automatically
✅ Payouts calculated correctly per round
✅ Balance updates in real-time
✅ Locked bets displayed properly
✅ Error messages shown for invalid actions

## Performance Benchmarks

- WebSocket connection: < 100ms
- Timer update broadcast: Every 1000ms
- Bet placement response: < 50ms
- Round transition: 2000ms delay
- Game state sync: < 100ms

## Next Steps After Testing

1. Document any bugs found
2. Test with multiple concurrent users
3. Test network interruptions (disconnect/reconnect)
4. Test edge cases (timer at 0, simultaneous bets)
5. Perform load testing (10+ concurrent players)

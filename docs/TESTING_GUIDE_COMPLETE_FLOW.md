# Testing Guide - Complete Game Flow Fixes

## Quick Test Scenarios

### Scenario 1: Full Game Flow with Round 1 Winner
1. **Admin:** Set opening card (e.g., 6♣)
2. **Admin:** Pre-select cards: Bahar = 6♦, Andar = 7♠
3. **Admin:** Click "Save & Wait for Timer"
4. **Player:** Place bet on Bahar (₹5,000)
5. **Wait:** Timer expires (30 seconds)
6. **Expected:**
   - ✅ Bahar card (6♦) appears immediately
   - ✅ 500ms later, Andar card (7♠) appears
   - ✅ Bahar wins detected (both 6)
   - ✅ Winner celebration overlay appears
   - ✅ "BAHAR WINS with 6♦" message
   - ✅ Payout notification: "You won ₹5,000!"
   - ✅ Celebration auto-dismisses after 5 seconds
   - ✅ Game auto-restarts after additional 5 seconds

---

### Scenario 2: Round 1 → Round 2 Transition
1. **Admin:** Set opening card (e.g., K♠)
2. **Admin:** Pre-select Round 1 cards: Bahar = 5♣, Andar = 9♥
3. **Player:** Bet ₹10,000 on Andar
4. **Wait:** Timer expires
5. **Expected:**
   - ✅ Cards dealt: Bahar 5♣, Andar 9♥
   - ✅ No winner detected
   - ✅ Notification: "No winner in Round 1. Starting Round 2 in 1 second..."
   - ✅ 1 second delay
   - ✅ Round 2 betting starts (30 seconds)
   - ✅ Round indicator shows "Round 2"

6. **Admin:** Pre-select Round 2 cards: Bahar = K♣, Andar = Q♦
7. **Player:** Add ₹5,000 more on Andar
8. **Wait:** Timer expires
9. **Expected:**
   - ✅ Round 2 cards dealt
   - ✅ Bahar wins with K♣ (matches opening K♠)
   - ✅ Winner celebration appears
   - ✅ Payout calculated correctly (Round 1: 1:1, Round 2: refund)

---

### Scenario 3: Full Round 3 Continuous Draw
1. **Admin:** Set opening card A♥
2. **Complete Round 1:** No winner (e.g., Bahar = 2♠, Andar = 3♣)
3. **Complete Round 2:** No winner (e.g., Bahar = 4♦, Andar = 5♥)
4. **Expected:**
   - ✅ Notification: "No winner in Round 2. Starting Round 3 in 1 second..."
   - ✅ Round 3 starts
   - ✅ Phase changes to "dealing"
   - ✅ Timer shows 0
   - ✅ Message: "Round 3: Continuous draw started!"

5. **Admin:** Deal cards continuously until match:
   - Deal Bahar: 6♠
   - Deal Andar: 7♣
   - Deal Bahar: 8♦
   - Deal Andar: A♠ (MATCH!)

6. **Expected:**
   - ✅ Each card appears on screen
   - ✅ Console logs: "Round 3 card dealt"
   - ✅ When A♠ dealt: "ANDAR WINS with A♠"
   - ✅ Winner celebration overlay
   - ✅ Payout: 1:1 on all bets (Round 1 + Round 2)

---

### Scenario 4: Auto-Restart Verification
1. **Complete any game** (any round, any winner)
2. **Expected:**
   - ✅ Winner celebration appears
   - ✅ Payout notifications sent
   - ✅ After 5 seconds: Celebration dismisses
   - ✅ After additional 5 seconds: "New game starting soon..." notification
   - ✅ Game state resets:
     - Phase: idle
     - Round: 1
     - Timer: 0
     - Cards cleared
     - Winner: null
   - ✅ Game statistics preserved and updated
   - ✅ Ready for new opening card

---

### Scenario 5: Pre-Selected Cards Without Admin
1. **Admin:** Set opening card
2. **Admin:** Pre-select cards during betting
3. **Admin:** Click "Save & Wait for Timer"
4. **Expected:**
   - ✅ Notification: "Cards saved! They will be revealed when timer expires."
   - ✅ Admin can't change cards after saving
   - ✅ When timer expires, cards auto-reveal
   - ✅ No manual intervention needed

---

## Console Logs to Watch

### Backend Console (routes.ts)
```
🎬 IMMEDIATELY revealing pre-selected cards for Round 1
✅ Bahar card dealt: 6♦
✅ Andar card dealt: 7♠
🎯 BAHAR wins with 6♦
🏆 Game complete! Winner: bahar, Card: 6♦, Round: 1
🔄 Auto-restarting game...
```

### Frontend Console (WebSocketContext.tsx)
```
🎴 Card dealt: { card: {...}, side: 'bahar', isWinningCard: false }
✅ Added to Bahar: 6♦
🎴 Card dealt: { card: {...}, side: 'andar', isWinningCard: false }
✅ Added to Andar: 7♠
🏆 Game complete received: { winner: 'bahar', ... }
Winner celebration event received: { winner: 'bahar', ... }
💰 Payout received: { amount: 5000, ... }
Payout celebration event received: { amount: 5000, ... }
🔄 Game restarted: { message: 'New game starting soon...', stats: {...} }
```

---

## Browser DevTools Checks

### Network Tab
- ✅ WebSocket connection stable (ws://localhost:3000/ws)
- ✅ No disconnections during gameplay
- ✅ Messages flowing bidirectionally

### Console Tab
- ✅ No errors or warnings
- ✅ All WebSocket messages properly handled
- ✅ Custom events firing correctly

### Elements Tab
- ✅ Winner celebration overlay renders correctly
- ✅ Confetti particles animated
- ✅ Z-index: 50 (overlay on top)
- ✅ Tailwind classes applied

---

## Performance Checks

### Memory Leaks
1. Play 10 consecutive games
2. Check Chrome DevTools → Memory
3. **Expected:** Memory usage stable (no growing heap)
4. **Verify:** All timers cleared after each game

### Animation Performance
1. Open Chrome DevTools → Performance
2. Record during winner celebration
3. **Expected:** Consistent 60 FPS
4. **Verify:** No layout thrashing or reflows

---

## Edge Cases to Test

### 1. Rapid Game Completion
- Complete multiple games back-to-back
- Verify auto-restart doesn't conflict

### 2. No Pre-Selected Cards
- Let timer expire without pre-selecting cards
- Verify admin gets warning notification
- Verify game doesn't break

### 3. Multiple Players
- Have 2+ players place bets
- Verify all receive correct payouts
- Verify all see winner celebration

### 4. Connection Loss
- Disconnect WebSocket mid-game
- Reconnect
- Verify game state syncs correctly

---

## Known Good States

### Round 1 Winner Example
```json
{
  "winner": "bahar",
  "winningCard": "6♦",
  "round": 1,
  "andarTotal": 0,
  "baharTotal": 5000,
  "message": "BAHAR WINS with 6♦!",
  "payouts": {
    "player-1": 5000
  },
  "stats": {
    "totalGames": 1,
    "andarWins": 0,
    "baharWins": 1
  }
}
```

### Round 3 Winner Example
```json
{
  "winner": "andar",
  "winningCard": "A♠",
  "round": 3,
  "andarTotal": 15000,
  "baharTotal": 0,
  "message": "ANDAR WINS with A♠!",
  "payouts": {
    "player-1": 30000
  }
}
```

---

## Acceptance Criteria

✅ **All scenarios pass without errors**  
✅ **Winner celebration appears every time**  
✅ **Payouts calculated correctly per round**  
✅ **Auto-restart works consistently**  
✅ **No console errors**  
✅ **No memory leaks**  
✅ **Smooth animations at 60 FPS**  
✅ **WebSocket messages properly handled**  
✅ **Game statistics update correctly**  
✅ **Players never see idle screens**

---

## Troubleshooting

### Issue: Cards don't reveal when timer expires
**Solution:** Check if admin pre-selected cards. If not, admin must deal manually.

### Issue: Winner celebration doesn't appear
**Solution:** Check browser console for `winner-celebration` event. Verify WebSocketContext triggers event.

### Issue: Game doesn't auto-restart
**Solution:** Check `autoRestart: true` in backend game state. Verify 5-second delay in console logs.

### Issue: Payout amount missing in celebration
**Solution:** Verify `payout_received` WebSocket message includes `amount` field. Check `payout-celebration` event.

---

**Happy Testing! 🎉**

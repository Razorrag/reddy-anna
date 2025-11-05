# Complete Betting Flow Analysis & Fix

## Problem Identified

**Players cannot place bets** because the game is in the wrong phase.

### Evidence from Logs

```
✅ Active game state restored: {
  phase: 'dealing',  ← PROBLEM: Should be 'betting' or 'idle'
  round: 1,
  timer: 30
}
```

```
WebSocketManager.ts:256 WebSocketManager: Message sent successfully: place_bet
WebSocketContext.tsx:217 WebSocket error: Object  ← Bet rejected
```

### Root Cause

When the server restarts, it restores the previous game state from the database. If the last game was interrupted during the 'dealing' phase, the server restores that phase. Players can ONLY bet during the 'betting' phase.

---

## Complete Game Flow

### Phase Lifecycle

```
1. IDLE
   ↓ (Admin selects opening card & starts game)
2. BETTING (30 seconds)
   ↓ (Timer expires OR admin manually transitions)
3. DEALING
   ↓ (Admin deals cards until match)
4. COMPLETE
   ↓ (Auto-reset after 10 seconds)
5. IDLE (ready for next game)
```

### When Players Can Bet

✅ **Phase**: `'betting'`  
✅ **Betting Locked**: `false`  
✅ **Timer**: `> 0`  
✅ **Round**: Matches current round  

❌ **Cannot bet when**:
- Phase is 'idle', 'dealing', or 'complete'
- Betting is locked
- Timer is 0 or negative
- Round mismatch

---

## Betting Validation Flow

### Server-Side (`server/socket/game-handlers.ts`)

```typescript
// Line 112-129: Phase validation
if (currentGameState.phase !== 'betting') {
  sendError(ws, `Betting is not open. Current phase: ${currentGameState.phase}`);
  return;
}

if (currentGameState.bettingLocked) {
  sendError(ws, 'Betting period has ended');
  return;
}

if (currentGameState.timer <= 0) {
  sendError(ws, 'Betting time has expired');
  currentGameState.bettingLocked = true;
  return;
}
```

### Balance Deduction (`Line 155`)

```typescript
// Atomic balance deduction - prevents race conditions
newBalance = await storage.deductBalanceAtomic(userId, amount);
```

### Bet Storage (`Line 222-229`)

```typescript
await storage.createBet({
  userId: userId,
  gameId: gameIdToUse,
  side,
  amount: amount,
  round: round.toString(),
  status: 'pending'
});
```

### Rollback on Failure (`Line 234-293`)

If bet storage fails:
1. Rollback game state (subtract bet from totals)
2. Refund balance atomically
3. Create refund transaction record
4. Broadcast cancellation to all clients
5. Send error to player

---

## Why Bets Are Failing Now

### Current State

```
Game Phase: 'dealing'
Betting Locked: true (implied)
Timer: 30 (irrelevant in dealing phase)
```

### What Happens

1. Player clicks bet button
2. Frontend sends `place_bet` WebSocket message
3. Server receives message
4. **Line 112 check fails**: `phase !== 'betting'`
5. Server sends error: `"Betting is not open. Current phase: dealing"`
6. Frontend shows error notification

---

## Solutions

### Solution 1: Reset Game to Idle (Recommended)

**Admin should reset the game** to start fresh:

1. Navigate to admin panel
2. Click "Reset Game" button
3. Game moves to 'idle' phase
4. Admin can start new game
5. Players can bet during betting phase

### Solution 2: Auto-Reset on Server Startup

Modify `restoreActiveGameState()` to automatically reset incomplete games:

```typescript
async function restoreActiveGameState() {
  try {
    const activeSession = await storage.getActiveGameSession();
    if (activeSession && activeSession.status === 'active') {
      const phase = activeSession.phase as GamePhase;
      
      // ✅ FIX: Auto-reset incomplete games on server restart
      if (phase === 'dealing' || phase === 'complete') {
        console.log(`⚠️ Found incomplete game in phase '${phase}', resetting to idle`);
        
        // Mark old game as cancelled
        await storage.updateGameSession(activeSession.gameId, {
          status: 'cancelled',
          ended_at: new Date()
        });
        
        // Reset to idle state
        currentGameState.reset();
        console.log('✅ Game reset to idle state');
        return;
      }
      
      // Only restore if in betting phase
      if (phase === 'betting') {
        // ... existing restore logic
      }
    }
  } catch (error) {
    console.error('Error restoring game state:', error);
  }
}
```

### Solution 3: Allow Betting in Dealing Phase (NOT RECOMMENDED)

This would break game rules - betting should close before dealing starts.

---

## Complete Betting Flow (When Working Correctly)

### 1. Game Start

```
Admin: Selects opening card (e.g., 7♥)
Admin: Clicks "Start Game"
Server: Creates game session in database
Server: Sets phase = 'betting'
Server: Starts 30-second countdown
Server: Broadcasts game_started to all clients
```

### 2. Betting Phase (30 seconds)

```
Player: Sees betting interface enabled
Player: Selects side (Andar/Bahar)
Player: Enters amount (₹1000 - ₹100000)
Player: Clicks "Place Bet"

Frontend: Validates amount
Frontend: Sends place_bet WebSocket message
Server: Validates phase = 'betting'
Server: Validates timer > 0
Server: Validates balance sufficient
Server: Deducts balance atomically
Server: Stores bet in database
Server: Updates game state totals
Server: Broadcasts bet_placed to all clients
Server: Sends bet_confirmed to player

Player: Sees bet appear in UI
Player: Balance updated
Player: Can place more bets (multiple bets allowed)
```

### 3. Timer Expires

```
Server: Timer reaches 0
Server: Sets phase = 'dealing'
Server: Sets bettingLocked = true
Server: Persists state to database
Server: Broadcasts phase_change to all clients

Players: Betting interface disabled
Players: See "Betting closed" message
Admin: Can now deal cards
```

### 4. Dealing Phase

```
Admin: Clicks "Deal Card"
Admin: Selects card and side
Server: Validates phase = 'dealing'
Server: Adds card to game state
Server: Stores card in database
Server: Checks for winner
Server: Broadcasts card_dealt to all clients

Players: See card appear on table
Players: See updated card count
```

### 5. Winner Found

```
Server: Detects matching card
Server: Calls completeGame()
Server: Calculates payouts
Server: Updates balances atomically
Server: Saves game history
Server: Completes game session
Server: Broadcasts game_complete to all clients

Winners: Balance increased
Winners: See payout notification
All Players: See winner announcement
```

### 6. Auto-Reset

```
Server: Waits 10 seconds
Server: Resets game state to 'idle'
Server: Clears cards and bets
Server: Broadcasts game_reset to all clients

Players: Ready for next game
Admin: Can start new game
```

---

## Error Messages Explained

### "Betting is not open. Current phase: dealing"

**Cause**: Game is in dealing phase  
**Solution**: Wait for admin to complete game or reset  
**Prevention**: Don't restart server during active games  

### "Betting period has ended"

**Cause**: `bettingLocked = true`  
**Solution**: Wait for next round or next game  

### "Betting time has expired"

**Cause**: Timer reached 0  
**Solution**: Wait for admin to deal cards and complete game  

### "Insufficient balance"

**Cause**: Player balance < bet amount  
**Solution**: Deposit more funds  

### "Minimum bet amount is ₹1000"

**Cause**: Bet amount < min_bet_amount setting  
**Solution**: Increase bet amount  

### "Maximum bet amount is ₹100000"

**Cause**: Bet amount > max_bet_amount setting  
**Solution**: Decrease bet amount  

### "Invalid round. Expected: 1, got: 2"

**Cause**: Round mismatch  
**Solution**: Frontend should sync with server state  

---

## Frontend Betting Component

### When to Enable Betting

```typescript
const canBet = 
  gameState.phase === 'betting' &&
  !gameState.bettingLocked &&
  gameState.timer > 0 &&
  userBalance >= minBet;
```

### Bet Placement

```typescript
const placeBet = async (side: 'andar' | 'bahar', amount: number) => {
  // Validate locally first
  if (!canBet) {
    showNotification('Betting is closed', 'error');
    return;
  }
  
  if (amount < minBet || amount > maxBet) {
    showNotification(`Bet must be between ₹${minBet} and ₹${maxBet}`, 'error');
    return;
  }
  
  if (amount > userBalance) {
    showNotification('Insufficient balance', 'error');
    return;
  }
  
  // Send to server
  wsManager.send('place_bet', {
    gameId: gameState.gameId,
    side,
    amount,
    round: gameState.currentRound.toString()
  });
};
```

### Handling Responses

```typescript
// Success
case 'bet_confirmed':
  showNotification(`Bet placed: ₹${data.amount} on ${data.side}`, 'success');
  updateBalance(data.newBalance);
  addBetToUI(data);
  break;

// Error
case 'error':
  showNotification(data.message, 'error');
  // Balance already rolled back on server
  break;

// Cancellation (rare)
case 'bet_cancelled':
  showNotification('Bet cancelled and refunded', 'warning');
  updateBalance(data.refundedBalance);
  removeBetFromUI(data.betId);
  break;
```

---

## Database Schema

### game_sessions Table

```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY,
  game_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,  -- 'active', 'completed', 'cancelled'
  phase TEXT NOT NULL,   -- 'idle', 'betting', 'dealing', 'complete'
  current_round INTEGER,
  opening_card TEXT,
  andar_cards JSONB,
  bahar_cards JSONB,
  winner TEXT,
  winning_card TEXT,
  created_at TIMESTAMP,
  ended_at TIMESTAMP
);
```

### player_bets Table

```sql
CREATE TABLE player_bets (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  side TEXT NOT NULL,     -- 'andar' or 'bahar'
  amount NUMERIC(10,2) NOT NULL,
  round TEXT NOT NULL,
  status TEXT NOT NULL,   -- 'pending', 'win', 'lose'
  created_at TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES game_sessions(game_id)
);
```

### game_history Table

```sql
CREATE TABLE game_history (
  id UUID PRIMARY KEY,
  game_id TEXT NOT NULL,
  opening_card TEXT NOT NULL,
  winner TEXT NOT NULL,
  winning_card TEXT NOT NULL,
  total_cards INTEGER,
  winning_round INTEGER,
  total_bets NUMERIC(10,2),
  total_payouts NUMERIC(10,2),
  created_at TIMESTAMP
);
```

---

## Testing Checklist

### ✅ Normal Flow

- [ ] Admin starts game
- [ ] Phase changes to 'betting'
- [ ] Timer counts down from 30
- [ ] Player places bet successfully
- [ ] Balance deducted immediately
- [ ] Bet appears in UI
- [ ] Player can place multiple bets
- [ ] Timer expires → phase = 'dealing'
- [ ] Betting disabled
- [ ] Admin deals cards
- [ ] Winner determined
- [ ] Payouts calculated
- [ ] Balances updated
- [ ] Game history saved
- [ ] Game resets to idle

### ✅ Error Handling

- [ ] Bet during 'idle' phase → Error
- [ ] Bet during 'dealing' phase → Error
- [ ] Bet with insufficient balance → Error
- [ ] Bet below minimum → Error
- [ ] Bet above maximum → Error
- [ ] Bet after timer expires → Error
- [ ] Database failure → Rollback + refund
- [ ] Network error → Retry or fail gracefully

### ✅ Edge Cases

- [ ] Multiple bets same side → Allowed
- [ ] Bets on both sides → Allowed
- [ ] Server restart during betting → Auto-reset
- [ ] Server restart during dealing → Auto-reset
- [ ] Concurrent bets → Atomic operations prevent issues
- [ ] Balance race condition → Atomic deduction prevents
- [ ] Duplicate bet submission → Idempotency check

---

## Immediate Action Required

### For Admin

1. **Open admin panel** at `http://localhost:5173/admin`
2. **Click "Reset Game"** button (if available)
3. **OR manually reset via WebSocket**:
   ```javascript
   // In browser console
   wsManager.send('game_reset', { message: 'Manual reset' });
   ```
4. **Start new game**:
   - Select opening card
   - Click "Start Game"
   - Verify phase = 'betting'
5. **Test betting**:
   - Login as player
   - Place test bet
   - Verify bet appears

### For Developer

1. **Implement auto-reset on startup** (Solution 2 above)
2. **Add reset button to admin UI** if not present
3. **Add phase indicator** to admin panel
4. **Add better error messages** to frontend
5. **Add phase transition logs** for debugging

---

## Summary

### Why Bets Are Failing

❌ Game is in 'dealing' phase (restored from database)  
❌ Players can only bet in 'betting' phase  
❌ No automatic reset on server restart  

### How to Fix

✅ **Immediate**: Admin resets game manually  
✅ **Short-term**: Implement auto-reset on startup  
✅ **Long-term**: Better phase management and recovery  

### Complete Flow Working

```
Admin starts game
  → Phase: betting (30s)
  → Players place bets ✅
  → Timer expires
  → Phase: dealing
  → Admin deals cards
  → Winner found
  → Payouts processed ✅
  → Game history saved ✅
  → Auto-reset to idle
  → Ready for next game
```

---

**Status**: 🔴 **BETTING BLOCKED - NEEDS GAME RESET**

The betting system is fully functional, but the game is stuck in 'dealing' phase from a previous session. Admin needs to reset the game to allow betting.

---

*Document created: November 5, 2024, 7:58 PM IST*  
*Issue: Game phase preventing bets*  
*Solution: Reset game to idle phase*

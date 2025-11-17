# Complete Data Flow: Admin Clicks "Start New Game"

## Overview
This document traces the COMPLETE data flow when admin clicks "Start New Game" button, ensuring:
1. ✅ Payouts are processed in database
2. ✅ Wallet balances are updated
3. ✅ All player bets are cleared from UI
4. ✅ Game history is updated
5. ✅ All clients receive proper state reset

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: Admin Clicks "Start New Game" Button                       │
│ Location: client/src/components/AdminGamePanel/*.tsx               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: WebSocket Message Sent                                     │
│ Message Type: 'game_reset'                                          │
│ Data: { message: "🔄 Game reset..." }                              │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Server Receives game_reset Message                         │
│ Location: server/routes.ts:1540-1693                               │
│                                                                     │
│ A. Check if game is complete with winner                           │
│    - currentPhase === 'complete'                                    │
│    - winner exists                                                  │
│    - winningCard exists                                             │
│                                                                     │
│ B. If game complete → Process Payouts                              │
│    Location: server/routes.ts:1561-1575                            │
│    Import: server/game.ts completeGame()                           │
│                                                                     │
│ C. If game incomplete → Refund bets                                │
│    Location: server/routes.ts:1577-1639                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Process Payouts (server/game.ts completeGame)              │
│ Location: server/game.ts:478-595                                    │
│                                                                     │
│ 4.1 Calculate Payouts for Each User                                │
│     - Get all user bets from currentGameState.userBets              │
│     - Calculate payout using payout calculator                      │
│     - Create payout data structure                                  │
│                                                                     │
│ 4.2 Execute Database Transaction (RPC Function)                    │
│     Location: server/game.ts:534-556                                │
│     RPC: apply_payouts_v2(gameId, payoutData)                      │
│     ✅ CRITICAL: Idempotent - prevents double payout               │
│     ✅ Updates user balances in database                           │
│     ✅ Creates transaction records                                  │
│     ✅ Updates game history                                         │
│                                                                     │
│ 4.3 Send payout_received Messages                                  │
│     Location: server/game.ts:570-590                                │
│     For EACH user who placed bets:                                  │
│     - Send WebSocket message with new balance                       │
│     - Include payout details (amount, netProfit, etc.)              │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: Client Receives payout_received Message                    │
│ Location: client/src/contexts/WebSocketContext.tsx:1017-1036       │
│                                                                     │
│ 5.1 Update Player Wallet                                           │
│     - updatePlayerWallet(wsData.balance)                            │
│     - Updates GameStateContext.playerWallet                         │
│                                                                     │
│ 5.2 Dispatch Balance WebSocket Update Event                        │
│     - window.dispatchEvent('balance-websocket-update')              │
│     - Includes: balance, amount, type, timestamp                    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: BalanceContext Receives Event                              │
│ Location: client/src/contexts/BalanceContext.tsx:189-215           │
│                                                                     │
│ 6.1 Handle balance-websocket-update Event                          │
│     - Update balance state immediately                              │
│     - Mark as WebSocket update (highest priority)                   │
│     - Race condition protection active                              │
│                                                                     │
│ 6.2 Dispatch balance-updated Event                                 │
│     - Notify other components of balance change                     │
│     - Update localStorage                                           │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Server Resets Game State                                   │
│ Location: server/routes.ts:1642-1657                               │
│                                                                     │
│ 7.1 Reset Server Game State                                        │
│     - currentGameState.reset()                                      │
│     - phase = 'idle'                                                │
│     - currentRound = 1                                              │
│     - Clear cards, bets, winner                                     │
│     - timer = 0                                                     │
│     - bettingLocked = false                                         │
│                                                                     │
│ 7.2 Broadcast game_reset Message to ALL Clients                    │
│     Location: server/routes.ts:1660-1682                            │
│     Message includes:                                               │
│     - clearAllBets: true ✅ NEW                                    │
│     - Empty gameState with all bets cleared                         │
│     - round1Bets: { andar: 0, bahar: 0 }                           │
│     - round2Bets: { andar: 0, bahar: 0 }                           │
│     - playerRound1Bets: { andar: [], bahar: [] }                   │
│     - playerRound2Bets: { andar: [], bahar: [] }                   │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Client Receives game_reset Message                         │
│ Location: client/src/contexts/WebSocketContext.tsx:918-940         │
│                                                                     │
│ 8.1 Clear ALL Player Bets                                          │
│     - clearRoundBets(1) → Clears Round 1 bets from UI               │
│     - clearRoundBets(2) → Clears Round 2 bets from UI               │
│     ✅ This removes ALL betting chips from betting buttons         │
│                                                                     │
│ 8.2 Reset Full Game State                                          │
│     - resetGame() → Resets entire GameStateContext                  │
│     - Clears cards, winner, phase, etc.                             │
│                                                                     │
│ 8.3 Hide Celebration                                               │
│     - hideCelebration() → Removes celebration overlay               │
│                                                                     │
│ 8.4 Dispatch Balance Refresh Event ✅ NEW                          │
│     - window.dispatchEvent('refresh-balance')                       │
│     - Ensures ALL UI components refresh balance display             │
│     - Source: 'game_reset'                                          │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 9: BalanceContext Refreshes Balance                           │
│ Location: client/src/contexts/BalanceContext.tsx:217-222           │
│                                                                     │
│ 9.1 Handle refresh-balance Event                                   │
│     - Triggered by game_reset                                       │
│     - Calls refreshBalance()                                        │
│                                                                     │
│ 9.2 Fetch Latest Balance from API                                  │
│     - GET /user/balance                                             │
│     - Ensures balance consistency                                   │
│     - Updates balance state                                         │
│                                                                     │
│ 9.3 Update All UI Components                                       │
│     - Wallet modal                                                  │
│     - Balance displays                                              │
│     - Player game balance                                           │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 10: UI Updates Complete                                       │
│                                                                     │
│ ✅ Wallet balance updated in all components                        │
│ ✅ All betting chips removed from buttons                          │
│ ✅ Game state reset to idle                                        │
│ ✅ Celebration hidden                                               │
│ ✅ Ready for new game                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Detailed Code References

### Server-Side: game_reset Handler
**File**: `server/routes.ts:1540-1693`

```typescript
case 'game_reset': {
  // 1. Check if game is complete with winner
  if (currentPhase === 'complete' && winner) {
    // 2. Process payouts via completeGame()
    const { completeGame } = await import('./game');
    await completeGame(currentGameState, winner, winningCard);
  }
  
  // 3. Reset server-side game state
  currentGameState.reset();
  
  // 4. Broadcast game_reset to all clients
  broadcast({
    type: 'game_reset',
    data: {
      message: '🔄 Game reset. Ready for new game!',
      clearAllBets: true, // ✅ Explicit bet clearing
      gameState: {
        phase: 'idle',
        round1Bets: { andar: 0, bahar: 0 },
        round2Bets: { andar: 0, bahar: 0 },
        playerRound1Bets: { andar: [], bahar: [] },
        playerRound2Bets: { andar: [], bahar: [] },
        // ... other reset state
      }
    }
  });
}
```

### Server-Side: Payout Processing
**File**: `server/game.ts:478-595`

```typescript
export async function completeGame(
  gameState: any,
  winner: 'andar' | 'bahar',
  winningCard: string
) {
  // 1. Calculate payouts for all users
  const payoutData = [];
  for (const [userId, userBets] of gameState.userBets.entries()) {
    const payoutAmount = calculatePayout(/* ... */);
    payoutData.push({ userId, payoutAmount, /* ... */ });
  }
  
  // 2. Execute database transaction (IDEMPOTENT)
  const { data, error } = await supabaseServer.rpc('apply_payouts_v2', {
    p_game_id: gameState.gameId,
    p_payouts: payoutData
  });
  
  // 3. Send payout_received to each user
  for (const payout of payoutData) {
    const userClient = findClient(payout.userId);
    if (userClient) {
      userClient.ws.send(JSON.stringify({
        type: 'payout_received',
        data: {
          balance: payout.newBalance,
          totalBetAmount: payout.totalBet,
          netProfit: payout.netProfit,
          result: payout.result
        }
      }));
    }
  }
}
```

### Client-Side: payout_received Handler
**File**: `client/src/contexts/WebSocketContext.tsx:1017-1036`

```typescript
case 'payout_received': {
  const wsData = (data as any).data;
  
  // Update player wallet in GameState
  if (wsData.balance !== undefined && wsData.balance !== null) {
    updatePlayerWallet(wsData.balance);
    
    // Dispatch event for BalanceContext
    const balanceEvent = new CustomEvent('balance-websocket-update', {
      detail: { 
        balance: wsData.balance, 
        amount: wsData.netProfit || 0,
        type: 'payout', 
        timestamp: Date.now() 
      }
    });
    window.dispatchEvent(balanceEvent);
  }
  break;
}
```

### Client-Side: game_reset Handler
**File**: `client/src/contexts/WebSocketContext.tsx:918-940`

```typescript
case 'game_reset': {
  const { message } = (data as GameResetMessage).data;
  
  // 1. Clear ALL player bets
  clearRoundBets(1); // Clear Round 1 bets
  clearRoundBets(2); // Clear Round 2 bets
  
  // 2. Reset full game state
  resetGame();
  
  // 3. Hide celebration
  hideCelebration();
  
  // 4. ✅ NEW: Explicitly refresh balance
  window.dispatchEvent(new CustomEvent('refresh-balance', {
    detail: { source: 'game_reset' }
  }));
  
  console.log('✅ Game reset complete:', message);
  break;
}
```

### BalanceContext: Event Listeners
**File**: `client/src/contexts/BalanceContext.tsx`

```typescript
// Listen for WebSocket balance updates (lines 189-215)
useEffect(() => {
  const handleWebSocketBalanceUpdate = (event: CustomEvent) => {
    const { balance: newBalance, timestamp } = event.detail;
    dispatch({
      type: 'SET_BALANCE',
      payload: { balance: newBalance, source: 'websocket', timestamp }
    });
    
    // Update localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      user.balance = newBalance;
      localStorage.setItem('user', JSON.stringify(user));
    }
  };

  window.addEventListener('balance-websocket-update', handleWebSocketBalanceUpdate);
  // ...
}, [isAdmin]);

// Listen for balance refresh requests (lines 217-232)
useEffect(() => {
  const handleRefreshBalance = () => {
    if (!isAdmin) {
      refreshBalance(); // Fetch from API
    }
  };

  window.addEventListener('refresh-balance', handleRefreshBalance);
  // ...
}, [isAdmin]);
```

---

## 🔍 Critical Points Ensuring Complete Flow

### 1. ✅ Single Payout Processing
**Location**: `server/game.ts:534-556`
- Uses idempotent RPC function `apply_payouts_v2`
- Prevents double payout via database constraint
- Atomic transaction ensures data consistency

### 2. ✅ Balance Updates Propagate Everywhere
**Flow**: 
```
payout_received → GameState → balance-websocket-update event → BalanceContext → All UI
```
- GameStateContext updated first (line 1023)
- BalanceContext receives event (line 190)
- All components using useBalance() auto-update
- localStorage synced (line 209)

### 3. ✅ Bet Clearing is Explicit
**Location**: `client/src/contexts/WebSocketContext.tsx:923-924`
```typescript
clearRoundBets(1); // Removes ALL Round 1 betting chips
clearRoundBets(2); // Removes ALL Round 2 betting chips
```
- Called BEFORE resetGame()
- Ensures betting buttons are empty
- playerRound1Bets and playerRound2Bets cleared

### 4. ✅ Balance Refresh After Reset
**Location**: `client/src/contexts/WebSocketContext.tsx:933-936`
```typescript
window.dispatchEvent(new CustomEvent('refresh-balance', {
  detail: { source: 'game_reset' }
}));
```
- Ensures wallet displays update
- Triggers API fetch as backup
- All balance-aware components refresh

### 5. ✅ Database Updated
**RPC Function**: `scripts/fix-payout-rpc-function-with-idempotency.sql`
- Updates user balances atomically
- Creates transaction records
- Updates game history
- Marks game as completed

---

## 🎯 What Happens to Each Data Point

### User Balance
1. **Database**: Updated via `apply_payouts_v2` RPC
2. **GameStateContext**: Updated via `updatePlayerWallet()`
3. **BalanceContext**: Updated via WebSocket event
4. **localStorage**: Synced automatically
5. **UI Components**: Auto-refresh via useBalance()

### Player Bets
1. **Server Memory**: Cleared via `currentGameState.reset()`
2. **Database**: Bets remain (for history), but not active
3. **Client GameState**: Cleared via `clearRoundBets()` and `resetGame()`
4. **UI Betting Buttons**: All chips removed visually

### Game State
1. **Server**: Reset to 'idle' phase
2. **Database**: Game marked as 'completed'
3. **Client**: Reset to 'idle' via `resetGame()`
4. **UI**: Returns to opening card selection

### Celebration Display
1. **Removed**: via `hideCelebration()`
2. **Ready**: For next game's celebration

---

## ✅ Verification Checklist

When admin clicks "Start New Game", verify:

- [ ] **Database Operations**
  - [ ] User balances updated (check `users` table)
  - [ ] Transactions created (check `transactions` table)
  - [ ] Game history updated (check `game_sessions` table)
  - [ ] Game marked as completed

- [ ] **Server State**
  - [ ] currentGameState.phase = 'idle'
  - [ ] currentGameState.userBets cleared
  - [ ] currentGameState.round1Bets = {andar: 0, bahar: 0}
  - [ ] currentGameState.round2Bets = {andar: 0, bahar: 0}

- [ ] **Client State**
  - [ ] GameStateContext.phase = 'idle'
  - [ ] GameStateContext.playerRound1Bets = {andar: [], bahar: []}
  - [ ] GameStateContext.playerRound2Bets = {andar: [], bahar: []}
  - [ ] BalanceContext.balance updated

- [ ] **UI Visual Confirmation**
  - [ ] Wallet modal shows new balance
  - [ ] Navigation bar balance display updated
  - [ ] ALL betting buttons are empty (no chips)
  - [ ] Celebration overlay hidden
  - [ ] Opening card panel visible

---

## 🐛 Potential Issues & Solutions

### Issue 1: Balance Not Updating
**Symptom**: Wallet shows old balance after game reset
**Root Cause**: refresh-balance event not dispatched
**Solution**: Added in WebSocketContext.tsx:933-936 ✅

### Issue 2: Bets Not Clearing
**Symptom**: Betting chips still visible after reset
**Root Cause**: clearRoundBets() not called or called with wrong params
**Solution**: Explicit calls added in game_reset handler ✅

### Issue 3: Double Payout
**Symptom**: Balance increases by 2x the correct amount
**Root Cause**: completeGame() called twice
**Solution**: Idempotent RPC function + single call in game_reset ✅

---

## 📝 Summary

The complete data flow ensures:
1. ✅ **Single payout processing** via idempotent RPC
2. ✅ **Immediate balance updates** via WebSocket events
3. ✅ **Complete bet clearing** via explicit clearRoundBets()
4. ✅ **Balance refresh trigger** via refresh-balance event
5. ✅ **Full state reset** on both server and client
6. ✅ **Database consistency** via atomic transactions

Every component is connected and synchronized. The flow is complete and robust.
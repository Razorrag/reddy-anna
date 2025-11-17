# Betting and Balance Update Flow Fix

## Problem Identified

After deep analysis, I found the ROOT CAUSE of why player bets don't clear and balances don't update when starting a new game:

### Issue 1: Race Condition in Game Start Sequence

In [`server/socket/game-handlers.ts:handleStartGame()`](server/socket/game-handlers.ts:492-643), the order of operations creates a race condition:

```typescript
// Line 510-517: Payouts processed
await completeGame(gameState, previousWinner, previousWinningCard);

// Line 543: ❌ PROBLEM - State reset happens immediately
(global as any).currentGameState.startNewGame();

// Lines 548-551: User bets cleared from memory
(global as any).currentGameState.clearUserBets();

// Lines 634-643: opening_card_confirmed broadcast
broadcast({ type: 'opening_card_confirmed', ... });
```

**The Problem**: 
- `completeGame()` sends `payout_received` WebSocket messages to update balances
- `startNewGame()` immediately clears all game state including user bets
- `opening_card_confirmed` is broadcast, which triggers client to clear bets
- But the bets are ALREADY cleared in server memory
- Client never fetches fresh bet data because server already wiped it

### Issue 2: No Explicit Balance Refresh Trigger

In [`client/src/contexts/WebSocketContext.tsx:670-702`](client/src/contexts/WebSocketContext.tsx:670-702), when `opening_card_confirmed` is received:

```typescript
case 'opening_card_confirmed': {
  clearCards();
  clearRoundBets(1);  // ✅ Correctly called
  clearRoundBets(2);  // ✅ Correctly called
  setWinner(null);
  setWinningCard(null);
  hideCelebration();
  
  // ❌ NO BALANCE REFRESH - Wallet might show stale data
}
```

The client clears visual state but doesn't explicitly trigger a balance refresh from the database.

## The Fix

### Fix 1: Ensure Payout Messages Sent BEFORE State Reset

Modify [`server/socket/game-handlers.ts:handleStartGame()`](server/socket/game-handlers.ts:492-539):

```typescript
// ✅ FIXED ORDER:
// 1. Process payouts and wait for WebSocket messages to be sent
await completeGame(gameState, previousWinner, previousWinningCard);

// 2. Add explicit delay to ensure WebSocket messages reach clients
await new Promise(resolve => setTimeout(resolve, 500));

// 3. THEN reset state and start new game
(global as any).currentGameState.startNewGame();
```

### Fix 2: Add Balance Refresh on New Game Start

Modify [`client/src/contexts/WebSocketContext.tsx:670-702`](client/src/contexts/WebSocketContext.tsx:670-702):

```typescript
case 'opening_card_confirmed': {
  // ... existing clear logic ...
  
  // ✅ NEW: Explicitly refresh balance after game reset
  setTimeout(async () => {
    try {
      const balanceRes = await apiClient.get<{success: boolean, balance: number}>('/user/balance');
      if (balanceRes.success && balanceRes.balance !== undefined) {
        updatePlayerWallet(balanceRes.balance);
        
        // Dispatch event for other contexts
        window.dispatchEvent(new CustomEvent('balance-websocket-update', {
          detail: { 
            balance: balanceRes.balance, 
            type: 'game_start_refresh',
            timestamp: Date.now() 
          }
        }));
      }
    } catch (error) {
      console.error('Error refreshing balance after new game:', error);
    }
  }, 100);
}
```

### Fix 3: Fetch User Bets from Database After Game Start

Since `completeGame()` already updates the database with payouts, we need to fetch the latest user bets when a player reconnects or receives `opening_card_confirmed`:

Modify [`client/src/contexts/WebSocketContext.tsx:670-702`](client/src/contexts/WebSocketContext.tsx:670-702):

```typescript
case 'opening_card_confirmed': {
  // ... existing logic ...
  
  // ✅ NEW: Fetch fresh game state after delay
  setTimeout(() => {
    sendWebSocketMessage({ type: 'game_subscribe', data: {} });
  }, 200);
}
```

## Implementation

The fixes ensure:
1. ✅ Payouts are processed and WebSocket messages sent before state reset
2. ✅ Clients receive balance updates before game state is wiped
3. ✅ Balance is explicitly refreshed when new game starts
4. ✅ Game state is re-synced after new game to ensure consistency

## Files to Modify

1. [`server/socket/game-handlers.ts`](server/socket/game-handlers.ts) - Add delay after completeGame
2. [`client/src/contexts/WebSocketContext.tsx`](client/src/contexts/WebSocketContext.tsx) - Add balance refresh and game state resync

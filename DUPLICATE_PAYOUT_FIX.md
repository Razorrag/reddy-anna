# DUPLICATE PAYOUT FIX - Root Cause & Solution

## Problem Summary
When admin clicks "Start New Game" after a game completes, the balance-notify API is called unnecessarily, causing duplicate balance updates for players.

## Root Cause Analysis

### Flow That Causes the Issue:

1. **Game Completes** (Correct Flow)
   - Server sends `game_complete` WebSocket event
   - Server sends `payout_received` WebSocket event with balance
   - Frontend receives `payout_received` → calls `updatePlayerWallet(balance)`
   - `updatePlayerWallet` updates local state ✅ Correct

2. **Start New Game** (PROBLEM)
   - Admin clicks "Start New Game"
   - `opening_card_confirmed` WebSocket event received
   - Frontend processes event and updates game state
   - Something is triggering a balance refresh
   - Balance refresh calls `/api/user/balance-notify` ❌ WRONG
   - This causes duplicate balance notification

### Evidence from Logs:
```
[0] 💰 Balance notification sent: 9876543210 -> NaN (unknown)
[1] PROXYING API REQUEST: POST /api/user/balance-notify
```

The `NaN` value indicates the balance parameter is undefined when `notifyBalanceUpdate` is called.

## The Fix

### Location: `client/src/contexts/BalanceContext.tsx`

The issue is in the `updateBalance` function around line 98-110:

```typescript
// Update localStorage
const userStr = localStorage.getItem('user');
if (userStr) {
  try {
    const user = JSON.parse(userStr);
    user.balance = newBalance;
    localStorage.setItem('user', JSON.stringify(user));
    
    // Notify server via API to broadcast to other WebSocket clients
    if (source !== 'websocket') {  // ❌ THIS IS THE PROBLEM
      try {
        await apiClient.notifyBalanceUpdate(user.id, newBalance, transactionType, amount);
      } catch (error) {
        console.error('Failed to notify balance update:', error);
      }
    }
  } catch (error) {
    console.error('Failed to update localStorage balance:', error);
  }
}
```

**Problem:** When `source !== 'websocket'`, it calls `notifyBalanceUpdate`. This happens even when the balance update is coming from a game event that already notified the server.

### Solution: Add Guard Conditions

We need to prevent `notifyBalanceUpdate` from being called in these cases:
1. When source is 'websocket' (already handled)
2. When source is 'api' AND it's a read-only refresh (not a transaction)
3. When balance hasn't actually changed

## Implementation

Replace the `updateBalance` function with this improved version:

```typescript
const updateBalance = useCallback(async (
  newBalance: number, 
  source: string = 'api', 
  transactionType?: string, 
  amount?: number
) => {
  const timestamp = Date.now();
  
  // ✅ FIX: Check if balance actually changed
  const balanceChanged = Math.abs(newBalance - state.currentBalance) >= 0.01;
  
  dispatch({
    type: 'SET_BALANCE',
    payload: { balance: newBalance, source, timestamp }
  });

  // Emit custom event for other contexts
  window.dispatchEvent(new CustomEvent('balance-updated', {
    detail: { balance: newBalance, source, timestamp, transactionType, amount }
  }));

  // Update localStorage
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      user.balance = newBalance;
      localStorage.setItem('user', JSON.stringify(user));
      
      // ✅ FIX: Only notify server for actual transactions, not for refreshes
      const shouldNotify = (
        source !== 'websocket' &&  // Not from WebSocket (already server-side)
        balanceChanged &&          // Balance actually changed
        (transactionType || amount !== undefined)  // This is a transaction, not just a refresh
      );
      
      if (shouldNotify) {
        try {
          console.log('📊 Notifying server of balance change:', {
            userId: user.id,
            newBalance,
            transactionType,
            amount,
            source
          });
          await apiClient.notifyBalanceUpdate(user.id, newBalance, transactionType, amount);
        } catch (error) {
          console.error('Failed to notify balance update:', error);
        }
      } else {
        console.log('⚠️ Skipping balance-notify:', {
          source,
          balanceChanged,
          hasTransaction: !!(transactionType || amount !== undefined)
        });
      }
    } catch (error) {
      console.error('Failed to update localStorage balance:', error);
    }
  }
}, [state.currentBalance]);
```

## Additional Fix: Validate Balance in API Call

In `client/src/lib/api-client.ts`, add validation:

```typescript
async notifyBalanceUpdate(
  userId: string, 
  balance: number, 
  transactionType?: string, 
  amount?: number
): Promise<ApiResponse> {
  // ✅ FIX: Validate balance before sending
  if (balance === undefined || balance === null || isNaN(balance)) {
    console.error('❌ Invalid balance for notifyBalanceUpdate:', balance);
    return { success: false, error: 'Invalid balance' };
  }
  
  // ✅ FIX: Validate userId
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.error('❌ Invalid userId for notifyBalanceUpdate:', userId);
    return { success: false, error: 'Invalid userId' };
  }
  
  try {
    return this.post<ApiResponse>('/user/balance-notify', {
      userId,
      balance,
      transactionType,
      amount
    });
  } catch (error) {
    console.error('❌ Error in notifyBalanceUpdate:', error);
    throw error;
  }
}
```

## Testing Plan

### Test Case 1: Normal Bet Flow
1. Start game
2. Place bet
3. Verify balance decreases
4. Check network tab: ONE balance-notify call ✅
5. Verify balance updates correctly

### Test Case 2: Game Complete Flow
1. Complete game with payout
2. Receive payout
3. Verify balance increases
4. Check network tab: NO balance-notify call ❌ (WebSocket already notified)
5. Balance should update correctly via WebSocket

### Test Case 3: Start New Game
1. After game completes with payout
2. Admin starts new game
3. Check network tab: NO balance-notify calls ❌
4. Balance should remain unchanged
5. Game should start normally

### Test Case 4: Balance Refresh
1. Navigate away and back to page
2. Balance refreshes from API
3. Check network tab: NO balance-notify call ❌ (just a read operation)
4. Balance displays correctly

## Expected Results

**Before Fix:**
- Multiple balance-notify calls per game
- Unnecessary API calls on game state changes
- NaN values in balance-notify

**After Fix:**
- Balance-notify ONLY called for:
  - Deposits
  - Withdrawals  
  - Manual balance adjustments
  - NOT for bets (handled by game logic)
  - NOT for payouts (handled by WebSocket)
  - NOT for game state changes
  - NOT for balance refreshes

## Deployment Steps

1. Apply fix to `BalanceContext.tsx`
2. Apply validation fix to `api-client.ts`
3. Test thoroughly in development
4. Deploy to staging
5. Verify with production-like data
6. Deploy to production during low-traffic window
7. Monitor logs for any issues

## Rollback Plan

If issues arise:
1. Revert `BalanceContext.tsx` changes
2. Revert `api-client.ts` changes
3. Restart frontend service
4. Monitor for 15 minutes
5. Investigate root cause with enhanced logging

## Success Metrics

- Zero balance-notify calls on game start
- Zero NaN values in balance-notify
- 90% reduction in balance-notify API calls
- No balance synchronization issues
- No user complaints about balance updates

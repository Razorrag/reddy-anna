# Fix: Stale Bets Appearing on Refresh After Game Completion

## Problem Description
When a game completes and admin clicks "Start New Game", everything is cleared properly on both admin and player sides. However, when a player refreshes their browser tab, they see the bets from the previous completed round until a new opening card is selected and betting starts.

## Root Cause
The issue occurred in two places:

### 1. Server-Side: Database Query Issue
**File:** `server/storage-supabase.ts` (line 1543-1557)

The `getBetsForUser()` function was returning ALL bets (pending, won, lost) for a given gameId:
```typescript
.neq('status', 'cancelled'); // Only excluded cancelled bets
```

When a player refreshed after game completion:
1. Game completes → bets marked as 'won'/'lost' in database
2. Admin starts new game → new gameId generated, in-memory state cleared
3. Player refreshes → WebSocket authentication fetches user's bets
4. Query returned 'won'/'lost' bets from previous game because it didn't filter by status

### 2. Client-Side: Incorrect Data Type
**File:** `client/src/contexts/WebSocketContext.tsx` (line 842-856)

The `game_reset` handler was setting bets to `0` instead of empty arrays:
```typescript
updatePlayerRoundBets(1, { andar: 0, bahar: 0 }); // ❌ Wrong type
updatePlayerRoundBets(2, { andar: 0, bahar: 0 }); // ❌ Wrong type
```

The bet structure expects `BetInfo[]` arrays, not numbers.

## Solution

### Fix 1: Filter Database Query to Only Return Pending Bets
**File:** `server/storage-supabase.ts` (line 1549)

Changed the query to only return 'pending' bets (active bets in current game):
```typescript
.eq('status', 'pending'); // ✅ Only return active bets, not completed ones
```

**Why this works:**
- Pending bets = bets placed in current active game
- Won/lost bets = bets from completed games (should not be shown)
- When game completes, all bets are marked as 'won' or 'lost'
- When new game starts, only new 'pending' bets will be returned

### Fix 2: Clear Bets with Empty Arrays
**File:** `client/src/contexts/WebSocketContext.tsx` (line 851-852)

Changed bet clearing to use empty arrays:
```typescript
updatePlayerRoundBets(1, { andar: [], bahar: [] }); // ✅ Correct type
updatePlayerRoundBets(2, { andar: [], bahar: [] }); // ✅ Correct type
```

## Testing Instructions

### Test Scenario 1: Normal Flow
1. Start a game with opening card
2. Player places bets (e.g., ₹1000 on Andar)
3. Complete the game (deal cards until winner)
4. Admin clicks "Start New Game"
5. **Player refreshes browser tab**
6. ✅ Expected: No bets shown on buttons (clean state)
7. ❌ Before fix: Previous bets still visible

### Test Scenario 2: Multiple Rounds
1. Complete a game with Round 1 and Round 2 bets
2. Admin starts new game
3. **Player refreshes**
4. ✅ Expected: Both rounds show 0 bets
5. ❌ Before fix: Both rounds show stale bets

### Test Scenario 3: Mid-Game Refresh (Should Still Work)
1. Start game, player places bets
2. **Player refreshes during betting phase**
3. ✅ Expected: Current pending bets are restored
4. ✅ This should still work because pending bets are active

## Files Modified

1. **server/storage-supabase.ts** (line 1549)
   - Changed `.neq('status', 'cancelled')` to `.eq('status', 'pending')`
   - Only returns active bets, excludes completed game bets

2. **client/src/contexts/WebSocketContext.tsx** (lines 851-852)
   - Changed bet reset from `{ andar: 0, bahar: 0 }` to `{ andar: [], bahar: [] }`
   - Matches expected BetInfo[] structure

## Impact

### ✅ Fixed
- Stale bets no longer appear on refresh after game completion
- Clean slate when admin starts new game
- Proper bet state synchronization

### ✅ Preserved
- Mid-game refresh still restores active pending bets
- Bet history in database remains intact
- All other game functionality unchanged

## Technical Details

### Bet Status Lifecycle
1. **pending** - Bet placed, game in progress
2. **won** - Game completed, player won
3. **lost** - Game completed, player lost
4. **cancelled** - Bet refunded (admin reset before completion)

### Game State Sync Flow
```
Player Refresh
    ↓
WebSocket Authentication
    ↓
getCurrentGameStateForUser()
    ↓
getBetsForUser(userId, gameId)
    ↓
Filter: status = 'pending' only
    ↓
Return active bets (or empty if game just started)
```

## Deployment Notes

- No database migration required
- No breaking changes to API
- Backward compatible with existing bet data
- Can be deployed immediately

## Status
✅ **FIXED** - Both server and client issues resolved

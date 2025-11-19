# Fix Player History Showing Wrong Amounts - AI Agent Instructions

## Problem Statement
Player game history is displaying incorrect bet amounts, payout amounts, or net profit values. The issue is caused by incomplete field name transformation from snake_case (database) to camelCase (frontend).

## Root Cause Analysis

### Database Layer (✅ CORRECT)
The PostgreSQL RPC function `get_user_game_history` in `scripts/FIX_PLAYER_STATS_AND_GAME_HISTORY.sql` (lines 17-112) returns correct calculations:

```sql
-- Line 63: Correct total bet calculation
COALESCE(SUM(pb.amount), 0) as your_total_bet,

-- Line 66: Correct total payout calculation  
COALESCE(SUM(pb.actual_payout), 0) as your_total_payout,

-- Line 69: Correct net profit calculation
COALESCE(SUM(pb.actual_payout), 0) - COALESCE(SUM(pb.amount), 0) as your_net_profit
```

The RPC function returns data in **snake_case** format:
- `your_total_bet` - Total amount user bet in the game
- `your_total_payout` - Total payout user received
- `your_net_profit` - Net profit (payout - bet)
- `your_bets` - JSONB array of individual bets with `actual_payout` field

### Backend Layer (⚠️ NEEDS VERIFICATION)
**File:** `server/storage-supabase.ts` around line 2139

The backend calls the RPC function:
```typescript
const { data: rpcData, error: rpcError } = await supabaseServer
  .rpc('get_user_game_history', {
    p_user_id: userId,
    p_limit: 100,
    p_offset: 0
  });
```

**CRITICAL ISSUE**: The formatting code (lines 2140-2168) must transform snake_case to camelCase, but it may be incomplete.

### Frontend Layer (⚠️ HAS FALLBACK LOGIC)
**File:** `client/src/contexts/UserProfileContext.tsx` (lines 534-582)

The frontend has normalization logic that tries multiple field name variations:
```typescript
yourTotalBet: g.yourTotalBet ?? g.your_total_bet ?? g.totalBet ?? g.total_bet
yourTotalPayout: g.yourTotalPayout ?? g.your_total_payout ?? g.payout ?? g.total_payout  
yourNetProfit: g.yourNetProfit ?? g.your_net_profit ?? g.netProfit ?? g.net_profit
```

This fallback logic should catch the issue, BUT if the backend is sending wrong field names or the data is corrupt, it won't work.

---

## Task for AI Agent

### Step 1: Read the Backend Storage File
Read the entire `server/storage-supabase.ts` file and locate the `getUserGameHistory` method (starts around line 2132).

### Step 2: Analyze the Formatting Code
Look for code around lines 2140-2168 that formats the RPC response. It should look something like:

```typescript
const formattedHistory = rpcData.map((game: any) => ({
  gameId: game.game_id,
  openingCard: game.opening_card,
  winner: game.winner,
  winningCard: game.winning_card,
  // ⚠️ CHECK IF THESE THREE FIELDS ARE PRESENT:
  yourTotalBet: game.your_total_bet,           // ← Must be here
  yourTotalPayout: game.your_total_payout,     // ← Must be here
  yourNetProfit: game.your_net_profit,         // ← Must be here
  yourBets: game.your_bets,
  // ... other fields
}));
```

### Step 3: Verify Field Mapping
Check if ALL of these fields are being mapped:
1. `your_total_bet` → `yourTotalBet`
2. `your_total_payout` → `yourTotalPayout`
3. `your_net_profit` → `yourNetProfit`
4. `your_bets` → `yourBets` (array with `actual_payout` in each bet)

### Step 4: Fix Missing Mappings
If any of these mappings are missing, add them to the formatting code.

**Example Fix:**
```typescript
const formattedHistory = rpcData.map((game: any) => {
  // ✅ Ensure all bet calculation fields are mapped
  return {
    gameId: game.game_id,
    openingCard: game.opening_card,
    winner: game.winner,
    winningCard: game.winning_card,
    winningRound: game.winning_round,
    totalCards: game.total_cards,
    
    // ✅ CRITICAL: Map all payout fields from snake_case to camelCase
    yourTotalBet: Number(game.your_total_bet || 0),
    yourTotalPayout: Number(game.your_total_payout || 0),
    yourNetProfit: Number(game.your_net_profit || 0),
    
    // ✅ Map bets array and ensure payout field is included
    yourBets: Array.isArray(game.your_bets) 
      ? game.your_bets.map((bet: any) => ({
          id: bet.id,
          round: bet.round,
          side: bet.side,
          amount: Number(bet.amount || 0),
          payout: Number(bet.payout || 0),  // ← Maps to 'payout' in bets
          status: bet.status
        }))
      : [],
    
    result: game.result || 'no_bet',
    dealtCards: game.dealt_cards || [],
    createdAt: game.created_at
  };
});
```

### Step 5: Verify the Controller
Also check `server/controllers/userDataController.ts` (lines 8-42) to ensure it's calling `storage.getUserGameHistory` correctly and not modifying the response structure.

### Step 6: Test the Fix
After making changes:
1. Restart the server
2. Open player game history
3. Check browser console for logs from `UserProfileContext.tsx`:
   - Look for `"📊 Game History API Response:"`
   - Look for `"📋 First mapped game:"`
   - Verify `yourTotalBet`, `yourTotalPayout`, `yourNetProfit` have correct values

---

## Expected Behavior After Fix

When a player opens their game history:
1. Each game should show correct bet amounts
2. Payout amounts should match actual payouts received
3. Net profit should be calculated as: `payout - bet`
4. If user had no bets in a game, all three fields should be 0

---

## Debug Information

If the issue persists after the fix:

1. **Check Database**: Run this SQL query to verify RPC output:
```sql
SELECT * FROM get_user_game_history('USER_ID_HERE', 10);
```

2. **Check Backend Logs**: Look for logs from `getUserGameHistory` method showing raw RPC data

3. **Check Frontend Logs**: Browser console should show:
   - Raw API response
   - Mapped game data
   - Any normalization warnings

4. **Check Field Name Consistency**: Ensure the RPC function returns exactly these field names:
   - `your_total_bet` (NOT `yourTotalBet`, `total_bet`, or anything else)
   - `your_total_payout` (NOT `yourTotalPayout`, `payout`, etc.)
   - `your_net_profit` (NOT `yourNetProfit`, `net_profit`, etc.)

---

## Summary

**Problem:** Player history shows wrong amounts
**Root Cause:** Incomplete snake_case to camelCase transformation in `server/storage-supabase.ts`
**Solution:** Add missing field mappings in the formatting code around line 2140-2168
**Test:** Check game history displays correct bet/payout/profit values

Good luck fixing this!
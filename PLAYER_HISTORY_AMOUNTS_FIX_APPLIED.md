# Player History Amounts Fix - Applied

## Issue Identified
Player game history was potentially showing incorrect bet amounts, payout amounts, or net profit values due to inconsistent field naming between the RPC path and the fallback path in the backend.

## Root Cause
**File:** `server/storage-supabase.ts` (lines 2271-2278)

In the **fallback path** (when RPC function is not available), the `yourBets` array was using `actual_payout` (snake_case) instead of `payout` (camelCase), creating inconsistency with the RPC path.

### Before Fix (Fallback Path)
```typescript
yourBets: bets.map(bet => ({
  id: bet.id,
  amount: parseFloat(bet.amount || '0'),
  side: bet.side,
  round: bet.round,
  actual_payout: parseFloat(bet.actual_payout || '0'), // ❌ Snake_case
  status: bet.status
})),
```

### After Fix (Fallback Path)
```typescript
yourBets: bets.map(bet => ({
  id: bet.id,
  amount: parseFloat(bet.amount || '0'),
  side: bet.side,
  round: bet.round,
  payout: parseFloat(bet.actual_payout || '0'), // ✅ CamelCase (matches RPC)
  status: bet.status
})),
```

## Verification of Complete Flow

### 1. Database Layer (✅ CORRECT)
**File:** `scripts/FIX_PLAYER_STATS_AND_GAME_HISTORY.sql` (line 55)

The RPC function correctly maps `actual_payout` to `payout`:
```sql
jsonb_build_object(
  'id', pb.id,
  'round', pb.round,
  'side', pb.side::TEXT,
  'amount', pb.amount,
  'payout', pb.actual_payout,  -- ✅ Maps to 'payout'
  'status', pb.status::TEXT
)
```

### 2. Backend RPC Path (✅ CORRECT)
**File:** `server/storage-supabase.ts` (lines 2149-2164)

The RPC path passes through the data without transformation:
```typescript
const formattedHistory = rpcData.map((game: any) => ({
  id: game.game_id,
  gameId: game.game_id,
  openingCard: game.opening_card,
  winner: game.winner,
  winningCard: game.winning_card,
  winningRound: game.winning_round || 1,
  totalCards: game.total_cards || 0,
  yourBets: game.your_bets || [],  // ✅ Contains 'payout' field
  yourTotalBet: parseFloat(game.your_total_bet || '0'),
  yourTotalPayout: parseFloat(game.your_total_payout || '0'),
  yourNetProfit: parseFloat(game.your_net_profit || '0'),
  result: game.result || 'no_bet',
  dealtCards: game.dealt_cards || [],
  createdAt: game.created_at
}));
```

### 3. Backend Fallback Path (✅ NOW FIXED)
**File:** `server/storage-supabase.ts` (lines 2271-2278)

Now uses consistent `payout` field name (camelCase).

### 4. Controller Layer (✅ CORRECT)
**File:** `server/controllers/userDataController.ts` (lines 20-34)

Controller passes data through without modification:
```typescript
const history = await storage.getUserGameHistory(req.user.id);
const paginatedHistory = history.slice(offset, offset + limit);
res.json({
  success: true,
  data: paginatedHistory,
  // ...
});
```

### 5. Frontend Layer (✅ HAS ROBUST FALLBACK)
**File:** `client/src/contexts/UserProfileContext.tsx` (line 565)

Frontend has fallback logic that handles multiple field name variations:
```typescript
const payout = Number(b.payout ?? b.actual_payout ?? b.actualPayout ?? 0);
```

This means the frontend would have worked even with the inconsistency, but now the backend is consistent.

## Impact of Fix

### Before Fix
- **RPC Path**: Returned `payout` field ✅
- **Fallback Path**: Returned `actual_payout` field ❌
- **Result**: Inconsistent data structure depending on which path was used
- **Frontend Impact**: Minimal (due to fallback logic), but inconsistent

### After Fix
- **RPC Path**: Returns `payout` field ✅
- **Fallback Path**: Returns `payout` field ✅
- **Result**: Consistent data structure across all paths
- **Frontend Impact**: Cleaner, more predictable data

## Field Mapping Summary

All paths now consistently map:

| Database Field | Backend Output | Frontend Usage |
|---------------|----------------|----------------|
| `your_total_bet` | `yourTotalBet` | `yourTotalBet` |
| `your_total_payout` | `yourTotalPayout` | `yourTotalPayout` |
| `your_net_profit` | `yourNetProfit` | `yourNetProfit` |
| `your_bets` (JSONB) | `yourBets` (array) | `yourBets` |
| `actual_payout` (in bets) | `payout` (in bets) | `payout` |

## Testing Recommendations

1. **Test RPC Path**: Ensure RPC function exists and returns correct data
   ```sql
   SELECT * FROM get_user_game_history('user-id-here', 10);
   ```

2. **Test Fallback Path**: Temporarily disable RPC to test fallback
   - Check that `yourBets` array contains `payout` field
   - Verify amounts match database values

3. **Test Frontend Display**: 
   - Open player game history page
   - Check browser console for logs from `UserProfileContext.tsx`
   - Verify bet amounts, payouts, and net profit display correctly

4. **Verify Calculations**:
   - Net Profit = Total Payout - Total Bet
   - Result classification (win/loss/refund) matches net profit

## Files Modified

1. **server/storage-supabase.ts** (line 2276)
   - Changed `actual_payout` to `payout` in fallback path
   - Added comment explaining the mapping

## Status

✅ **FIXED** - Backend now uses consistent camelCase field naming across all paths

## Next Steps

1. Deploy the fix to production
2. Monitor game history API responses
3. Verify player history displays correct amounts
4. No database changes required (RPC function already correct)

---

**Fix Applied:** November 19, 2025
**Files Changed:** 1 (server/storage-supabase.ts)
**Breaking Changes:** None (frontend has fallback logic)

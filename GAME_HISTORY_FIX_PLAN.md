# Game History Not Showing - Root Cause & Fix

## Problem
Players are not seeing their game history even though they have placed bets.

## Root Cause Analysis

### Current Implementation Issue
The `getUserGameHistory()` function in `server/storage-supabase.ts` (lines ~2740-2900) has a critical flaw:

```typescript
// Current broken query
const { data, error } = await supabaseServer
  .from('player_bets')
  .select(`
    *,
    game_sessions(
      opening_card,
      winner,
      winning_card,
      current_round,
      status,
      created_at
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

**Problems:**
1. ❌ Uses `game_sessions` table which may have incomplete/missing data for completed games
2. ❌ `game_sessions` table might be cleared or have status='completed' without full data
3. ❌ Should use `game_history` table which is the permanent record

### Database Schema
- `player_bets` - Contains user bets (permanent)
- `game_sessions` - Active/current games (may be ephemeral)
- **`game_history`** - Completed games with results (permanent record) ✅

## Solution

### Fix Strategy
Change the query to join with `game_history` instead of `game_sessions`:

```typescript
// ✅ FIXED query - use game_history for completed games
const { data, error } = await supabaseServer
  .from('player_bets')
  .select(`
    *,
    game_history!inner(
      opening_card,
      winner,
      winning_card,
      winning_round,
      total_cards,
      created_at
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Why This Works
1. ✅ `game_history` is the canonical source of truth for completed games
2. ✅ Every completed game MUST have a `game_history` record
3. ✅ `game_history` contains all necessary fields (winner, opening_card, etc.)
4. ✅ Using `!inner` join ensures we only get bets for games that have history records

## Implementation Steps

1. **Update `getUserGameHistory()` in storage-supabase.ts**
   - Change join from `game_sessions` to `game_history`
   - Update field mappings to match game_history schema
   - Test with existing database

2. **Add Fallback Logic**
   - If game_history record missing, try game_sessions as fallback
   - Log warning when game_history is missing (indicates data integrity issue)

3. **Verify Data Integrity**
   - Check that all completed games have game_history records
   - Add database constraint to ensure game_history created on game completion

## Testing Checklist
- [ ] User with bets sees complete game history
- [ ] Game results (winner, opening card) display correctly
- [ ] Bets and payouts calculate correctly
- [ ] No duplicate games shown
- [ ] Historical games from weeks ago still show

## Files to Modify
1. `server/storage-supabase.ts` - Update getUserGameHistory() method
2. `server/game.ts` - Ensure game_history is ALWAYS created on game completion

## Expected Outcome
✅ Players will see ALL their game history with complete bet and result information
✅ No missing games or incomplete data
✅ Fast and reliable query performance

# Schema Column Name Fix - Complete

## Issue
```
Error saving game history: {
  code: 'PGRST204',
  message: "Could not find the 'createdAt' column of 'game_history' in the schema cache"
}
```

## Root Cause

**Mismatch between TypeScript and Database**:
- **TypeScript Schema** (`shared/schema.ts`): Uses **camelCase** (e.g., `gameId`, `openingCard`, `createdAt`)
- **Supabase Database** (`SUPABASE_SCHEMA.sql`): Uses **snake_case** (e.g., `game_id`, `opening_card`, `created_at`)

When spreading the object with `...history`, it sends camelCase keys to Supabase, which expects snake_case.

## Fix Applied

### Before (Broken)
```typescript
async saveGameHistory(history: InsertGameHistory): Promise<GameHistoryEntry> {
  const { data, error } = await supabaseServer
    .from('game_history')
    .insert({
      id: randomUUID(),
      ...history,  // ❌ Spreads camelCase keys
      created_at: new Date()
    })
    .select()
    .single();
}
```

### After (Fixed)
```typescript
async saveGameHistory(history: InsertGameHistory): Promise<GameHistoryEntry> {
  // Convert camelCase to snake_case for Supabase
  const { data, error } = await supabaseServer
    .from('game_history')
    .insert({
      id: randomUUID(),
      game_id: history.gameId,           // ✅ Explicit mapping
      opening_card: history.openingCard, // ✅ Explicit mapping
      winner: history.winner,
      winning_card: history.winningCard, // ✅ Explicit mapping
      total_cards: history.totalCards,   // ✅ Explicit mapping
      round: history.round,
      created_at: new Date()             // ✅ snake_case
    })
    .select()
    .single();
}
```

## Database Schema (SUPABASE_SCHEMA.sql)

```sql
CREATE TABLE game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id VARCHAR(100) NOT NULL,        -- snake_case
    opening_card VARCHAR(10) NOT NULL,    -- snake_case
    winner bet_side NOT NULL,
    winning_card VARCHAR(10) NOT NULL,    -- snake_case
    total_cards INTEGER NOT NULL,         -- snake_case
    round INTEGER NOT NULL,
    total_andar_bets DECIMAL(15,2) DEFAULT 0.00,
    total_bahar_bets DECIMAL(15,2) DEFAULT 0.00,
    total_payouts DECIMAL(15,2) DEFAULT 0.00,
    house_profit DECIMAL(15,2) DEFAULT 0.00,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- snake_case
);
```

## TypeScript Schema (shared/schema.ts)

```typescript
export const gameHistory = pgTable("game_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),           // camelCase in TS
  openingCard: text("opening_card").notNull(),    // camelCase in TS
  winner: text("winner").notNull(),
  winningCard: text("winning_card").notNull(),    // camelCase in TS
  totalCards: integer("total_cards").notNull(),   // camelCase in TS
  round: integer("round").notNull(),
  createdAt: timestamp("created_at").defaultNow(), // camelCase in TS
});
```

## All Column Mappings Fixed

### ✅ game_history table
- `gameId` → `game_id`
- `openingCard` → `opening_card`
- `winningCard` → `winning_card`
- `totalCards` → `total_cards`
- `createdAt` → `created_at`

### ✅ player_bets table (already fixed)
- `userId` → `user_id`
- `gameId` → `game_id`
- `updatedAt` → `updated_at`
- `createdAt` → `created_at`

### ✅ Other tables
All other database operations already use correct snake_case column names.

## Files Modified

**`server/storage-supabase.ts`**:
- Lines 576-598: Fixed `saveGameHistory()` to explicitly map all fields to snake_case
- Lines 549-572: `addGameHistory()` already had correct mapping (no changes needed)

## Testing

### ✅ Expected Behavior
```
Game completes
→ saveGameHistory() called
→ Fields mapped: gameId → game_id, etc.
→ Insert succeeds
→ Console: No errors
→ Database: New record in game_history table
```

### ✅ Console Output
```
✅ Game session created with ID: c9a498aa-5d5d-49ef-8f7c-908108713a9a
🎴 Auto-revealing pre-selected cards...
Game complete! Winner: andar, Card: 7♦, Round: 1
✅ Game history saved successfully
```

## Summary

**Issue**: Supabase couldn't find `createdAt` column (expected `created_at`)

**Cause**: Object spread (`...history`) sent camelCase keys to snake_case database

**Fix**: Explicit field mapping in `saveGameHistory()` function

**Status**: ✅ **FIXED - Game history now saves correctly**

---

**Date**: October 22, 2025  
**Issue**: Column name mismatch (camelCase vs snake_case)  
**Resolution**: Explicit field mapping to snake_case  
**Priority**: CRITICAL - Blocking game completion

# Game History Schema Fix

## Overview
This SQL script fixes the `game_history` table schema to ensure it has all required columns for proper game history functionality.

## Files

1. **`fix-game-history-schema.sql`** - Full version with comprehensive checks and error handling
2. **`fix-game-history-schema-simple.sql`** - Simple version that uses PostgreSQL's `IF NOT EXISTS` syntax

## What This Fix Does

Adds the following columns to `game_history` table if they don't exist:

1. **`winning_round`** - INTEGER DEFAULT 1
   - Stores which round (1, 2, or 3) the game ended in
   - Used to track when the game completed

2. **`total_bets`** - DECIMAL(15, 2) DEFAULT '0.00'
   - Total amount of money bet in the game
   - Used for analytics and reporting

3. **`total_payouts`** - DECIMAL(15, 2) DEFAULT '0.00'
   - Total amount of money paid to winners
   - Used for analytics and reporting

## How to Run

### Option 1: Simple Version (Recommended)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `fix-game-history-schema-simple.sql`
4. Click "Run" or press Ctrl+Enter

### Option 2: Full Version
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `fix-game-history-schema.sql`
4. Click "Run" or press Ctrl+Enter
5. Check the output messages to see what was done

## Expected Result

After running the script, your `game_history` table should have these columns:

```
- id (VARCHAR)
- game_id (VARCHAR)
- opening_card (TEXT)
- winner (bet_side enum)
- winning_card (TEXT)
- total_cards (INTEGER)
- winning_round (INTEGER) ← NEW
- total_bets (DECIMAL) ← NEW
- total_payouts (DECIMAL) ← NEW
- created_at (TIMESTAMP)
```

## Verification

After running the script, you can verify the changes by running:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'game_history'
ORDER BY ordinal_position;
```

## Important Notes

- This script is **safe to run multiple times** - it won't create duplicate columns
- Existing data will **not be deleted** or modified
- New columns will have default values for existing records
- The script uses `IF NOT EXISTS` to prevent errors if columns already exist

## Related Code

After running this migration, the following code will work correctly:

- `server/storage-supabase.ts` → `saveGameHistory()` - Saves game history with all fields
- `server/storage-supabase.ts` → `getGameHistory()` - Retrieves game history with all fields
- `server/routes.ts` → `/api/game/history` - Returns complete game history
- `server/routes.ts` → `/api/admin/game-history` - Returns complete game history for admins
- `client/src/components/GameHistoryModal.tsx` - Displays complete game history

## Troubleshooting

If you encounter any errors:

1. **Column already exists error**: This means the column was already added. The script handles this, but if you see an error, you can ignore it or comment out that section.

2. **Table doesn't exist error**: You need to create the `game_history` table first. See `scripts/reset-and-recreate-database.sql` for the full table creation.

3. **Permission errors**: Make sure you're running this as a database admin user.

## Next Steps

After running this fix:

1. Test game history saving - Start and complete a game
2. Test game history retrieval - Call `/api/game/history`
3. Check frontend display - Open GameHistoryModal and verify all data shows correctly


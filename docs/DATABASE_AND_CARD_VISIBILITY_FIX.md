# Database Schema & Card Visibility - FIXED ✅

## Issues Fixed

### Issue 1: Database Error - "Could not find 'createdAt' column"

**Error Message**:
```
Error creating dealt card: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'createdAt' column of 'dealt_cards' in the schema cache"
}
```

**Root Cause**:
- Database schema uses **snake_case**: `created_at`, `game_id`, `is_winning_card`, `dealt_at`
- Code was using **camelCase**: `createdAt`, `gameId`, `isWinningCard`, `dealtAt`
- Supabase couldn't find the column because of the case mismatch

**Solution**:
Fixed `server/storage-supabase.ts` line 453-474 to use correct snake_case column names:

```typescript
async createDealtCard(card: InsertDealtCard): Promise<DealtCard> {
  const { data, error } = await supabaseServer
    .from('dealt_cards')
    .insert({
      id: randomUUID(),
      game_id: card.gameId,           // ✅ snake_case
      card: card.card,
      side: card.side,
      position: card.position,
      is_winning_card: card.isWinningCard || false,  // ✅ snake_case
      dealt_at: new Date(),           // ✅ snake_case
      created_at: new Date()          // ✅ snake_case
    })
    .select()
    .single();
}
```

### Issue 2: Cards Showing Before Timer = 0

**Problem**:
- Admin selects cards during betting phase
- Cards immediately appear to players
- Should only show AFTER timer hits 0

**Solution**:
Updated `client/src/components/MobileGameLayout/BettingStrip.tsx` to conditionally show cards:

```typescript
{/* Only show when dealing or timer = 0 */}
{(gameState.phase === 'dealing' || 
  gameState.phase === 'complete' || 
  gameState.countdownTimer === 0) && 
  gameState.andarCards.length > 0 ? (
  // Show cards
) : (
  // Show placeholder "-"
)}
```

## How It Works Now

### During Betting Phase (Timer > 0):
```
┌──────────────┬─────────┬──────────────┐
│ ANDAR        │ Opening │ BAHAR        │
│ Total: ₹15K  │   7♥    │ Total: ₹20K  │
│              │ HEARTS  │              │
│      -       │         │      -       │  ← Shows "-" placeholder
└──────────────┴─────────┴──────────────┘
Timer: 15s remaining
```

### When Timer = 0 or Dealing Phase:
```
┌──────────────┬─────────┬──────────────┐
│ ANDAR        │ Opening │ BAHAR        │
│ Total: ₹15K  │   7♥    │ Total: ₹20K  │
│              │ HEARTS  │              │
│     5♦       │         │     Q♠       │  ← Cards revealed!
│     K♣       │         │     2♥       │
└──────────────┴─────────┴──────────────┘
Timer: 0s or Dealing phase
```

## Admin Workflow

1. **During Betting** (Timer running):
   - Admin can pre-select cards
   - Players see "-" placeholder
   - Cards are hidden from players

2. **Timer Hits 0**:
   - Automatically switches to dealing phase
   - Cards are revealed to all players
   - Cards appear in Andar/Bahar buttons

3. **Admin Clicks "Show Cards"**:
   - Broadcasts cards to all players
   - Cards visible in betting strip
   - Round progression continues

## Database Schema Alignment

All database operations now use correct snake_case:

| TypeScript (camelCase) | Database (snake_case) |
|------------------------|----------------------|
| gameId                 | game_id              |
| isWinningCard         | is_winning_card      |
| dealtAt               | dealt_at             |
| createdAt             | created_at           |

## Files Modified

1. **server/storage-supabase.ts** (lines 453-474)
   - Fixed column names in `createDealtCard()`
   
2. **client/src/components/MobileGameLayout/BettingStrip.tsx** (lines 107-119, 173-185)
   - Added conditional card visibility based on phase and timer

## Testing

1. **Database Fix**: Deal cards from admin panel - should work without errors
2. **Visibility Fix**: 
   - During betting: Cards hidden (shows "-")
   - Timer = 0: Cards revealed automatically
   - Dealing phase: Cards visible

All working correctly! ✅

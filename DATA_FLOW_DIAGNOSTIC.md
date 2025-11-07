# 🔍 DATA FLOW DIAGNOSTIC - GAME HISTORY ISSUE

**Date:** November 7, 2025 8:55 PM  
**Issue:** Game history disappeared after fixes

---

## 🗄️ DATABASE SCHEMA ANALYSIS

### **Tables Involved:**

1. **`game_sessions`** - Active game state
   - `game_id` (PK)
   - `opening_card`, `winner`, `winning_card`, `status`, `phase`

2. **`player_bets`** - Individual player bets
   - `id` (PK)
   - `user_id` (FK → users)
   - `game_id` (FK → game_sessions)
   - `side`, `amount`, `actual_payout`, `status`

3. **`game_history`** - Completed game records
   - `id` (PK)
   - `game_id` (FK → game_sessions)
   - `opening_card`, `winner`, `winning_card`, `winning_round`, `total_cards`

4. **`dealt_cards`** - Cards dealt in each game
   - `id` (PK)
   - `game_id` (FK → game_sessions)
   - `card`, `side`, `position`, `is_winning_card`

5. **`game_statistics`** - Aggregated game stats
   - `id` (PK)
   - `game_id` (FK → game_sessions)
   - `total_players`, `total_bets`, `total_winnings`, `house_earnings`

---

## 🔄 COMPLETE DATA FLOW

### **When Game Completes:**

```
1. Game ends (winning card found)
   ↓
2. Calculate payouts (game.ts:161-197)
   ↓
3. Apply payouts to database (game.ts:199-217)
   - Updates player_bets.actual_payout
   - Updates player_bets.status = 'completed'
   - Updates users.balance
   ↓
4. Update user statistics (game.ts:189-196)
   - Calls storage.updateUserGameStats()
   - Updates users.games_played, games_won, total_winnings, total_losses
   ↓
5. Save game history (game.ts:450-486)
   - Inserts into game_history table
   - Fields: gameId, openingCard, winner, winningCard, totalCards, round
   ↓
6. Complete game session (game.ts:488-504)
   - Updates game_sessions.status = 'completed'
   - Updates game_sessions.winner, winning_card
   ↓
7. Save game statistics (game.ts:508-530)
   - Inserts into game_statistics table
   - Fields: totalPlayers, totalBets, totalWinnings, houseEarnings, etc.
```

---

## 🐛 PROBLEM IDENTIFIED

### **getUserGameHistory() Logic:**

```typescript
// storage-supabase.ts:1911-1936
async getUserGameHistory(userId: string): Promise<any[]> {
  // Get user's bets and join with game sessions
  const { data, error } = await supabaseServer
    .from('player_bets')
    .select(`
      *,
      game_sessions!inner(
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

### **The Issue:**

1. **Joins with `game_sessions`** - This is correct
2. **Uses `!inner` join** - This means it ONLY returns bets where game_sessions exists
3. **Problem:** If game_sessions are being deleted or status is wrong, bets won't show

### **Potential Causes:**

1. **Foreign Key CASCADE DELETE:**
   ```sql
   CONSTRAINT fk_player_bets_game 
   FOREIGN KEY (game_id) REFERENCES game_sessions(game_id) 
   ON DELETE CASCADE
   ```
   - If game_sessions are deleted, player_bets are also deleted!

2. **Game Session Cleanup:**
   - Are old game_sessions being deleted?
   - Is there a cleanup job removing completed games?

3. **Status Filter:**
   - The query doesn't filter by status
   - But maybe game_sessions.status is causing issues?

---

## ✅ SOLUTIONS

### **Solution 1: Add Logging to getUserGameHistory**

Add comprehensive logging to see what's happening:

```typescript
async getUserGameHistory(userId: string): Promise<any[]> {
  console.log(`🔍 Fetching game history for user: ${userId}`);
  
  // Get user's bets and join with game sessions
  const { data, error } = await supabaseServer
    .from('player_bets')
    .select(`
      *,
      game_sessions!inner(
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

  if (error) {
    console.error('❌ Error getting user game history:', error);
    return [];
  }

  console.log(`📊 Found ${data?.length || 0} bets for user ${userId}`);
  
  if (!data || data.length === 0) {
    console.log(`⚠️ No bets found for user ${userId}`);
    return [];
  }
  
  // ... rest of function
}
```

### **Solution 2: Check if game_sessions Exist**

Add a diagnostic query:

```sql
-- Check if game_sessions exist
SELECT COUNT(*) FROM game_sessions;

-- Check if player_bets exist
SELECT COUNT(*) FROM player_bets;

-- Check if they're linked
SELECT 
  pb.id,
  pb.user_id,
  pb.game_id,
  gs.game_id as session_game_id,
  gs.status
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE pb.user_id = 'YOUR_USER_ID'
LIMIT 10;
```

### **Solution 3: Use game_history Instead of game_sessions**

The problem might be that we're joining with `game_sessions` (active games) instead of `game_history` (completed games):

```typescript
// ALTERNATIVE APPROACH - Join with game_history
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
  .order('created_at', { ascending: false});
```

But this requires changing the foreign key in player_bets!

### **Solution 4: Use LEFT JOIN Instead of INNER JOIN**

Change `!inner` to `!left` to include bets even if game_session is missing:

```typescript
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

---

## 🔧 RECOMMENDED FIX

### **Step 1: Add Comprehensive Logging**

This will help us see what's happening:

```typescript
async getUserGameHistory(userId: string): Promise<any[]> {
  console.log(`\n🔍 ========== getUserGameHistory START ==========`);
  console.log(`User ID: ${userId}`);
  
  // First, check if user has any bets at all
  const { data: allBets, error: betsError } = await supabaseServer
    .from('player_bets')
    .select('id, game_id, amount, created_at')
    .eq('user_id', userId);
  
  console.log(`📊 Total bets for user: ${allBets?.length || 0}`);
  if (allBets && allBets.length > 0) {
    console.log(`Sample bet:`, allBets[0]);
  }
  
  // Check if game_sessions exist for these bets
  if (allBets && allBets.length > 0) {
    const gameIds = allBets.map(b => b.game_id);
    const { data: sessions, error: sessionsError } = await supabaseServer
      .from('game_sessions')
      .select('game_id, status, winner')
      .in('game_id', gameIds);
    
    console.log(`🎮 Game sessions found: ${sessions?.length || 0}`);
    if (sessions && sessions.length > 0) {
      console.log(`Sample session:`, sessions[0]);
    }
  }
  
  // Now do the actual query
  const { data, error } = await supabaseServer
    .from('player_bets')
    .select(`
      *,
      game_sessions!inner(
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

  if (error) {
    console.error('❌ Error in getUserGameHistory:', error);
    console.log(`========== getUserGameHistory END (ERROR) ==========\n`);
    return [];
  }

  console.log(`✅ Joined query returned: ${data?.length || 0} results`);
  console.log(`========== getUserGameHistory END ==========\n`);
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // ... rest of function
}
```

### **Step 2: Check Database Directly**

Run these queries in Supabase SQL editor:

```sql
-- 1. Check if player_bets exist
SELECT COUNT(*) as total_bets FROM player_bets;

-- 2. Check if game_sessions exist
SELECT COUNT(*) as total_sessions FROM game_sessions;

-- 3. Check if game_history exist
SELECT COUNT(*) as total_history FROM game_history;

-- 4. Check orphaned bets (bets without game_sessions)
SELECT COUNT(*) as orphaned_bets
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
WHERE gs.game_id IS NULL;

-- 5. Check specific user's bets
SELECT 
  pb.id,
  pb.user_id,
  pb.game_id,
  pb.amount,
  pb.created_at,
  gs.game_id as session_exists,
  gs.status as session_status,
  gh.id as history_exists
FROM player_bets pb
LEFT JOIN game_sessions gs ON pb.game_id = gs.game_id
LEFT JOIN game_history gh ON pb.game_id = gh.game_id
WHERE pb.user_id = 'YOUR_USER_ID'
ORDER BY pb.created_at DESC
LIMIT 10;
```

---

## 🎯 ROOT CAUSE HYPOTHESIS

Based on the schema, I suspect:

1. **Game sessions are being deleted after completion**
   - Maybe there's a cleanup job?
   - Or CASCADE DELETE is removing them?

2. **Foreign key points to game_sessions, not game_history**
   - player_bets.game_id → game_sessions.game_id
   - But game_sessions might be temporary (only for active games)
   - game_history is permanent (for completed games)

3. **The join is failing because game_sessions don't exist**
   - INNER JOIN requires both tables to have matching rows
   - If game_sessions are deleted, INNER JOIN returns nothing

---

## 💡 IMMEDIATE ACTION ITEMS

1. **Add logging to getUserGameHistory** (see Step 1 above)
2. **Run diagnostic SQL queries** (see Step 2 above)
3. **Check if game_sessions are being deleted**
4. **Consider changing to LEFT JOIN** to see all bets
5. **Consider adding FK to game_history** for permanent reference

---

**Status:** 🔴 **NEEDS INVESTIGATION**  
**Priority:** 🔥 **CRITICAL** - Users can't see their game history!

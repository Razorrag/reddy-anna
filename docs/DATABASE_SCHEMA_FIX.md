# 🔧 Database Schema Fix - PGRST204 Error Resolved

**Error:** `Could not find the 'createdAt' column of 'game_sessions' in the schema cache`

**Root Cause:** Code was using camelCase column names but database schema uses snake_case.

---

## ✅ Fix Applied

### File: `server/storage-supabase.ts`

**Changed:** `createGameSession()` method to use snake_case column names

### Before (❌ Incorrect):
```typescript
const gameSession = {
  gameId: gameId,
  openingCard: session.openingCard || null,
  phase: session.phase || 'idle',
  currentTimer: session.currentTimer || 30,
  status: 'active',
  winner: null,
  winningCard: null,
  currentRound: session.round || 1,
  startedAt: now,
  createdAt: now,  // ❌ Database has 'created_at'
  updatedAt: now,  // ❌ Database has 'updated_at'
};
```

### After (✅ Correct):
```typescript
const gameSession = {
  game_id: gameId,              // ✅ Matches database
  opening_card: session.openingCard || null,
  phase: session.phase || 'idle',
  current_timer: session.currentTimer || 30,
  current_round: session.round || 1,
  andar_cards: [],
  bahar_cards: [],
  status: 'active',
  winner: null,
  winning_card: null,
  winning_round: null,
  total_andar_bets: 0,
  total_bahar_bets: 0,
  total_payouts: 0,
  started_at: now,
  created_at: now,              // ✅ Matches database
  updated_at: now,              // ✅ Matches database
};
```

---

## 📋 Database Schema Reference

From `SUPABASE_SCHEMA.sql` (Lines 44-64):

```sql
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id VARCHAR(100) UNIQUE NOT NULL,
    opening_card VARCHAR(10) NOT NULL,
    phase game_phase DEFAULT 'idle',
    current_round INTEGER DEFAULT 1,
    current_timer INTEGER DEFAULT 0,
    andar_cards TEXT[] DEFAULT '{}',
    bahar_cards TEXT[] DEFAULT '{}',
    winner bet_side,
    winning_card VARCHAR(10),
    winning_round INTEGER,
    total_andar_bets DECIMAL(15,2) DEFAULT 0.00,
    total_bahar_bets DECIMAL(15,2) DEFAULT 0.00,
    total_payouts DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎯 Key Takeaway

**Supabase JS Client does NOT auto-convert camelCase to snake_case for INSERT operations.**

You must use the exact column names as they appear in the database schema.

---

## ✅ Test the Fix

### 1. Restart Backend:
```bash
npm run dev:server
```

### 2. Test Game Start:
1. Open admin panel: http://localhost:3000/game
2. Select opening card
3. Click "Start Game"

### Expected Result:
- ✅ No PGRST204 error
- ✅ Game session created successfully
- ✅ Timer starts
- ✅ Players can place bets

---

## 📝 Status

**Fixed:** ✅ Database schema mismatch resolved  
**Date:** October 21, 2025  
**File Modified:** `server/storage-supabase.ts` (Lines 194-229)

The game should now start without errors!

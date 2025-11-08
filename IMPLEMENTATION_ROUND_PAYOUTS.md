# Implementation Guide: Per-Round Payout Tracking

## Overview

This guide provides the exact code changes needed to implement per-round payout tracking in the game history system.

---

## Step 1: Update TypeScript Interfaces

### File: `shared/types/game.ts` (or wherever InsertGameHistory is defined)

Add the `roundPayouts` field to the interface:

```typescript
export interface InsertGameHistory {
  gameId: string;
  openingCard: string;
  winner: string;
  winningCard: string;
  totalCards: number;
  round?: number;
  totalBets?: number;
  totalPayouts?: number;
  roundPayouts?: {
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
  };
}
```

---

## Step 2: Update Game Completion Logic

### File: `server/game.ts` (Lines 484-505)

**FIND THIS CODE:**
```typescript
// Prepare history data
const historyData = {
  gameId: gameState.gameId,
  openingCard: gameState.openingCard,
  winner: winningSide,
  winningCard: winningCard,
  totalCards: totalCards,
  round: gameState.currentRound,
  totalBets: totalBetsAmount,
  totalPayouts: totalPayoutsAmount,
  createdAt: new Date().toISOString()
};
```

**REPLACE WITH:**
```typescript
// ✅ NEW: Calculate per-round payout breakdown
const roundPayouts = {
  round1: { andar: 0, bahar: 0 },
  round2: { andar: 0, bahar: 0 }
};

// Calculate payouts per round from actual bet data
for (const [userId, userBets] of Array.from(gameState.userBets.entries())) {
  const userPayout = payouts[userId] || 0;
  if (userPayout === 0) continue;
  
  // Calculate total bets for this user
  const totalUserBets = 
    userBets.round1.andar + userBets.round1.bahar +
    userBets.round2.andar + userBets.round2.bahar;
  
  if (totalUserBets === 0) continue;
  
  // Calculate bet amounts per round
  const round1Bets = userBets.round1.andar + userBets.round1.bahar;
  const round2Bets = userBets.round2.andar + userBets.round2.bahar;
  
  // Distribute payout proportionally to rounds
  if (round1Bets > 0) {
    const round1Payout = (userPayout * round1Bets) / totalUserBets;
    
    // Distribute round1 payout to sides proportionally
    if (userBets.round1.andar > 0) {
      roundPayouts.round1.andar += (round1Payout * userBets.round1.andar) / round1Bets;
    }
    if (userBets.round1.bahar > 0) {
      roundPayouts.round1.bahar += (round1Payout * userBets.round1.bahar) / round1Bets;
    }
  }
  
  if (round2Bets > 0) {
    const round2Payout = (userPayout * round2Bets) / totalUserBets;
    
    // Distribute round2 payout to sides proportionally
    if (userBets.round2.andar > 0) {
      roundPayouts.round2.andar += (round2Payout * userBets.round2.andar) / round2Bets;
    }
    if (userBets.round2.bahar > 0) {
      roundPayouts.round2.bahar += (round2Payout * userBets.round2.bahar) / round2Bets;
    }
  }
}

console.log('📊 Calculated round payouts:', {
  round1Andar: roundPayouts.round1.andar.toFixed(2),
  round1Bahar: roundPayouts.round1.bahar.toFixed(2),
  round2Andar: roundPayouts.round2.andar.toFixed(2),
  round2Bahar: roundPayouts.round2.bahar.toFixed(2),
  total: (roundPayouts.round1.andar + roundPayouts.round1.bahar + 
          roundPayouts.round2.andar + roundPayouts.round2.bahar).toFixed(2),
  expectedTotal: totalPayoutsAmount.toFixed(2)
});

// Prepare history data
const historyData = {
  gameId: gameState.gameId,
  openingCard: gameState.openingCard,
  winner: winningSide,
  winningCard: winningCard,
  totalCards: totalCards,
  round: gameState.currentRound,
  totalBets: totalBetsAmount,
  totalPayouts: totalPayoutsAmount,
  roundPayouts: roundPayouts, // ✅ NEW: Add round breakdown
  createdAt: new Date().toISOString()
};
```

---

## Step 3: Update Storage Layer

### File: `server/storage-supabase.ts` (Lines 1768-1781)

**FIND THIS CODE:**
```typescript
// Convert camelCase to snake_case for Supabase
const { data, error } = await supabaseServer
  .from('game_history')
  .insert({
    id: randomUUID(),
    game_id: history.gameId,
    opening_card: history.openingCard,
    winner: history.winner,
    winning_card: history.winningCard,
    total_cards: history.totalCards || 0,
    winning_round: roundValue,
    total_bets: (history as any).totalBets || 0,
    total_payouts: (history as any).totalPayouts || 0,
    created_at: new Date()
  })
  .select()
  .single();
```

**REPLACE WITH:**
```typescript
// Convert camelCase to snake_case for Supabase
const { data, error } = await supabaseServer
  .from('game_history')
  .insert({
    id: randomUUID(),
    game_id: history.gameId,
    opening_card: history.openingCard,
    winner: history.winner,
    winning_card: history.winningCard,
    total_cards: history.totalCards || 0,
    winning_round: roundValue,
    total_bets: (history as any).totalBets || 0,
    total_payouts: (history as any).totalPayouts || 0,
    round_payouts: (history as any).roundPayouts || { // ✅ NEW: Add round payouts
      round1: { andar: 0, bahar: 0 },
      round2: { andar: 0, bahar: 0 }
    },
    created_at: new Date()
  })
  .select()
  .single();
```

---

## Step 4: Update API Response (getGameHistory)

### File: `server/storage-supabase.ts` (Lines 1872-1902)

**FIND THIS CODE:**
```typescript
// Combine history with statistics and cards
const enhancedHistory = historyData.map((history: any) => {
  const stats = statsMap.get(history.game_id);
  const cards = cardsMap.get(history.game_id) || [];
  
  return {
    id: history.id,
    gameId: history.game_id,
    openingCard: history.opening_card,
    winner: history.winner,
    winningCard: history.winning_card,
    totalCards: history.total_cards,
    round: history.winning_round || 1,
    createdAt: history.created_at,
    // Include dealt cards
    dealtCards: cards.map((c: any) => ({
      id: c.id,
      card: c.card,
      side: c.side,
      position: c.position,
      isWinningCard: c.is_winning_card,
      createdAt: c.created_at
    })),
    // Statistics data (with defaults if not available)
    totalBets: stats ? parseFloat(stats.total_bets || '0') : (parseFloat(history.total_bets || '0') || 0),
    andarTotalBet: stats ? parseFloat(stats.andar_total_bet || '0') : 0,
    baharTotalBet: stats ? parseFloat(stats.bahar_total_bet || '0') : 0,
    totalWinnings: stats ? parseFloat(stats.total_winnings || '0') : (parseFloat(history.total_payouts || '0') || 0),
    andarBetsCount: stats ? (stats.andar_bets_count || 0) : 0,
    baharBetsCount: stats ? (stats.bahar_bets_count || 0) : 0,
    totalPlayers: stats ? (stats.total_players || 0) : 0,
  };
});
```

**REPLACE WITH:**
```typescript
// Combine history with statistics and cards
const enhancedHistory = historyData.map((history: any) => {
  const stats = statsMap.get(history.game_id);
  const cards = cardsMap.get(history.game_id) || [];
  
  // ✅ NEW: Parse round payouts from JSONB
  const roundPayouts = history.round_payouts || {
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 }
  };
  
  return {
    id: history.id,
    gameId: history.game_id,
    openingCard: history.opening_card,
    winner: history.winner,
    winningCard: history.winning_card,
    totalCards: history.total_cards,
    round: history.winning_round || 1,
    createdAt: history.created_at,
    // Include dealt cards
    dealtCards: cards.map((c: any) => ({
      id: c.id,
      card: c.card,
      side: c.side,
      position: c.position,
      isWinningCard: c.is_winning_card,
      createdAt: c.created_at
    })),
    // Statistics data (with defaults if not available)
    totalBets: stats ? parseFloat(stats.total_bets || '0') : (parseFloat(history.total_bets || '0') || 0),
    andarTotalBet: stats ? parseFloat(stats.andar_total_bet || '0') : 0,
    baharTotalBet: stats ? parseFloat(stats.bahar_total_bet || '0') : 0,
    totalWinnings: stats ? parseFloat(stats.total_winnings || '0') : (parseFloat(history.total_payouts || '0') || 0),
    andarBetsCount: stats ? (stats.andar_bets_count || 0) : 0,
    baharBetsCount: stats ? (stats.bahar_bets_count || 0) : 0,
    totalPlayers: stats ? (stats.total_players || 0) : 0,
    // ✅ NEW: Add per-round payout data
    round1AndarPayout: parseFloat(String(roundPayouts.round1?.andar || 0)),
    round1BaharPayout: parseFloat(String(roundPayouts.round1?.bahar || 0)),
    round2AndarPayout: parseFloat(String(roundPayouts.round2?.andar || 0)),
    round2BaharPayout: parseFloat(String(roundPayouts.round2?.bahar || 0)),
  };
});
```

---

## Step 5: Update Admin Game History Endpoint

### File: `server/routes.ts` (Lines 5476-5508)

**FIND THIS CODE:**
```typescript
return {
  id: history.id,
  gameId: history.game_id,
  openingCard: history.opening_card,
  winner: history.winner,
  winningCard: history.winning_card,
  round: history.winning_round || history.round || 1,
  totalCards: history.total_cards || cards.length || 0,
  createdAt: history.created_at,
  // Include dealt cards - ALL CARDS DEALT IN THIS GAME
  dealtCards: cards.map((c: any) => ({
    id: c.id,
    card: c.card,
    side: c.side,
    position: c.position,
    isWinningCard: c.is_winning_card,
    createdAt: c.created_at
  })),
  // Statistics data (with defaults if not available)
  totalPlayers: stats ? (stats.total_players || 0) : 0,
  totalBets: stats ? parseFloat(stats.total_bets || '0') : (parseFloat(history.total_bets || '0') || 0),
  andarBetsCount: stats ? (stats.andar_bets_count || 0) : 0,
  baharBetsCount: stats ? (stats.bahar_bets_count || 0) : 0,
  andarTotalBet: stats ? parseFloat(stats.andar_total_bet || '0') : 0,
  baharTotalBet: stats ? parseFloat(stats.bahar_total_bet || '0') : 0,
  totalWinnings: stats ? parseFloat(stats.total_winnings || '0') : (parseFloat(history.total_payouts || '0') || 0),
  houseEarnings: stats ? parseFloat(stats.house_earnings || '0') : 0,
  profitLoss: stats ? parseFloat(stats.profit_loss || '0') : 0,
  profitLossPercentage: stats ? parseFloat(stats.profit_loss_percentage || '0') : 0,
  housePayout: stats ? parseFloat(stats.total_winnings || '0') : (parseFloat(history.total_payouts || '0') || 0),
  gameDuration: stats ? (stats.game_duration || 0) : 0,
  uniquePlayers: stats ? (stats.unique_players || 0) : 0,
};
```

**REPLACE WITH:**
```typescript
// ✅ NEW: Parse round payouts from JSONB
const roundPayouts = history.round_payouts || {
  round1: { andar: 0, bahar: 0 },
  round2: { andar: 0, bahar: 0 }
};

return {
  id: history.id,
  gameId: history.game_id,
  openingCard: history.opening_card,
  winner: history.winner,
  winningCard: history.winning_card,
  round: history.winning_round || history.round || 1,
  totalCards: history.total_cards || cards.length || 0,
  createdAt: history.created_at,
  // Include dealt cards - ALL CARDS DEALT IN THIS GAME
  dealtCards: cards.map((c: any) => ({
    id: c.id,
    card: c.card,
    side: c.side,
    position: c.position,
    isWinningCard: c.is_winning_card,
    createdAt: c.created_at
  })),
  // Statistics data (with defaults if not available)
  totalPlayers: stats ? (stats.total_players || 0) : 0,
  totalBets: stats ? parseFloat(stats.total_bets || '0') : (parseFloat(history.total_bets || '0') || 0),
  andarBetsCount: stats ? (stats.andar_bets_count || 0) : 0,
  baharBetsCount: stats ? (stats.bahar_bets_count || 0) : 0,
  andarTotalBet: stats ? parseFloat(stats.andar_total_bet || '0') : 0,
  baharTotalBet: stats ? parseFloat(stats.bahar_total_bet || '0') : 0,
  totalWinnings: stats ? parseFloat(stats.total_winnings || '0') : (parseFloat(history.total_payouts || '0') || 0),
  houseEarnings: stats ? parseFloat(stats.house_earnings || '0') : 0,
  profitLoss: stats ? parseFloat(stats.profit_loss || '0') : 0,
  profitLossPercentage: stats ? parseFloat(stats.profit_loss_percentage || '0') : 0,
  housePayout: stats ? parseFloat(stats.total_winnings || '0') : (parseFloat(history.total_payouts || '0') || 0),
  gameDuration: stats ? (stats.game_duration || 0) : 0,
  uniquePlayers: stats ? (stats.unique_players || 0) : 0,
  // ✅ NEW: Add per-round payout data
  round1AndarPayout: parseFloat(String(roundPayouts.round1?.andar || 0)),
  round1BaharPayout: parseFloat(String(roundPayouts.round1?.bahar || 0)),
  round2AndarPayout: parseFloat(String(roundPayouts.round2?.andar || 0)),
  round2BaharPayout: parseFloat(String(roundPayouts.round2?.bahar || 0)),
};
```

---

## Step 6: Update Frontend Interface

### File: `client/src/components/GameHistoryModal.tsx` (Lines 17-34)

**FIND THIS CODE:**
```typescript
interface EnhancedGameHistoryEntry {
  id: string;
  gameId: string;
  openingCard: string;
  winner: 'andar' | 'bahar';
  winningCard: string;
  totalCards: number;
  round: number;
  createdAt: string | Date;
  totalBets: number;
  andarTotalBet: number;
  baharTotalBet: number;
  totalWinnings: number;
  andarBetsCount: number;
  baharBetsCount: number;
  totalPlayers: number;
  dealtCards?: DealtCard[];
}
```

**REPLACE WITH:**
```typescript
interface EnhancedGameHistoryEntry {
  id: string;
  gameId: string;
  openingCard: string;
  winner: 'andar' | 'bahar';
  winningCard: string;
  totalCards: number;
  round: number;
  createdAt: string | Date;
  totalBets: number;
  andarTotalBet: number;
  baharTotalBet: number;
  totalWinnings: number;
  andarBetsCount: number;
  baharBetsCount: number;
  totalPlayers: number;
  dealtCards?: DealtCard[];
  // ✅ NEW: Per-round payout fields
  round1AndarPayout?: number;
  round1BaharPayout?: number;
  round2AndarPayout?: number;
  round2BaharPayout?: number;
}
```

---

## Step 7: Update Frontend Display (Optional - Admin Only)

### File: `client/src/components/GameHistoryModal.tsx` (After line 337)

**ADD THIS CODE:**
```typescript
{/* ✅ NEW: Per-round payout breakdown (Admin only) */}
{isAdmin && (
  <div className="mt-4 border-t border-gold/30 pt-4">
    <h5 className="text-sm font-semibold text-gold mb-3">Per-Round Payout Breakdown</h5>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">Round 1 Andar</div>
        <div className="text-base font-bold text-[#A52A2A]">
          {formatCurrency(displayGame.round1AndarPayout || 0)}
        </div>
      </div>
      
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">Round 1 Bahar</div>
        <div 
          className="text-base font-bold text-[#01073b]"
          style={{
            textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
            WebkitTextStroke: '0.2px rgba(255, 255, 255, 0.3)'
          }}
        >
          {formatCurrency(displayGame.round1BaharPayout || 0)}
        </div>
      </div>
      
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">Round 2 Andar</div>
        <div className="text-base font-bold text-[#A52A2A]">
          {formatCurrency(displayGame.round2AndarPayout || 0)}
        </div>
      </div>
      
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">Round 2 Bahar</div>
        <div 
          className="text-base font-bold text-[#01073b]"
          style={{
            textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
            WebkitTextStroke: '0.2px rgba(255, 255, 255, 0.3)'
          }}
        >
          {formatCurrency(displayGame.round2BaharPayout || 0)}
        </div>
      </div>
    </div>
    
    <div className="mt-2 text-xs text-gray-400 text-center">
      Total: {formatCurrency(
        (displayGame.round1AndarPayout || 0) + 
        (displayGame.round1BaharPayout || 0) + 
        (displayGame.round2AndarPayout || 0) + 
        (displayGame.round2BaharPayout || 0)
      )}
    </div>
  </div>
)}
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Backup database
- [ ] Review all code changes
- [ ] Test migration script on staging database

### Deployment Steps
1. [ ] Run SQL migration: `add-round-payouts-to-history.sql`
2. [ ] Verify migration completed successfully
3. [ ] Deploy backend changes (game.ts, storage-supabase.ts, routes.ts)
4. [ ] Deploy frontend changes (GameHistoryModal.tsx)
5. [ ] Restart server

### Post-Deployment Verification
- [ ] Complete a test game
- [ ] Check game_history table has round_payouts populated
- [ ] Verify API response includes round payout fields
- [ ] Check frontend displays payout data correctly
- [ ] Verify totals match (round payouts sum = total payouts)

---

## Rollback Procedure

If issues occur:

1. **Rollback Database:**
   ```sql
   BEGIN;
   ALTER TABLE game_history DROP COLUMN IF EXISTS round_payouts;
   DROP INDEX IF EXISTS idx_game_history_round_payouts;
   COMMIT;
   ```

2. **Revert Code Changes:**
   - Restore previous versions of game.ts, storage-supabase.ts, routes.ts
   - Restore previous version of GameHistoryModal.tsx
   - Restart server

3. **Verify System Stability:**
   - Complete a test game
   - Check game history displays correctly
   - Verify no errors in logs

---

## Expected Results

After implementation:

1. **Database**: `game_history.round_payouts` column populated with JSONB data
2. **API Response**: Includes `round1AndarPayout`, `round1BaharPayout`, `round2AndarPayout`, `round2BaharPayout`
3. **Frontend**: Admin sees per-round payout breakdown in game history modal
4. **Card Circles**: Show correct payout amounts (if implemented in CardHistory component)

---

## Notes

- Round payouts are calculated proportionally based on bet amounts
- If a user bets on both rounds, their payout is distributed proportionally
- If a user bets on both sides in a round, payout is distributed proportionally
- Total of round payouts should equal total_payouts field
- Migration backfills existing games using actual_payout from player_bets table

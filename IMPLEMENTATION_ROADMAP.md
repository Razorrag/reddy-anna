# ANDAR BAHAR GAME - COMPLETE FIX IMPLEMENTATION ROADMAP

**Created**: November 17, 2025  
**Status**: Implementation Plan  
**Estimated Time**: 13 working days (104 hours)

---

## EXECUTIVE SUMMARY

This document provides a step-by-step implementation plan to fix all 25+ critical issues in the Andar Bahar game system. The fixes are organized into 3 phases with clear dependencies and verification steps.

---

## PHASE 1: CRITICAL FIXES (Week 1 - 40 hours)

### Day 1-2: Database Foundation (16h)

#### 1.1 Create Database Migration Script
**File**: `scripts/MASTER_FIX_DATABASE.sql`

```sql
-- ============================================
-- MASTER DATABASE FIX SCRIPT
-- Run this ONCE to fix all database issues
-- ============================================

-- Step 1: Add missing columns to game_history
ALTER TABLE game_history 
  ADD COLUMN IF NOT EXISTS winning_round INTEGER,
  ADD COLUMN IF NOT EXISTS total_bets NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_payouts NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_payouts JSONB DEFAULT '{"round1": {"andar": 0, "bahar": 0}, "round2": {"andar": 0, "bahar": 0}}';

-- Step 2: Create atomic payout function
CREATE OR REPLACE FUNCTION apply_payouts_atomic(
  p_payouts JSONB,
  p_winning_bets TEXT[],
  p_losing_bets TEXT[]
) RETURNS void AS $$
DECLARE
  v_payout RECORD;
  v_user_balance NUMERIC;
  v_bet RECORD;
BEGIN
  -- Process each payout atomically
  FOR v_payout IN SELECT * FROM jsonb_to_recordset(p_payouts) 
    AS x(userId TEXT, amount NUMERIC)
  LOOP
    -- Lock row and get current balance
    SELECT balance INTO v_user_balance 
    FROM users 
    WHERE id = v_payout.userId 
    FOR UPDATE;
    
    IF v_user_balance IS NULL THEN
      RAISE EXCEPTION 'User % not found', v_payout.userId;
    END IF;
    
    -- Update balance
    UPDATE users 
    SET balance = balance + v_payout.amount,
        updated_at = NOW()
    WHERE id = v_payout.userId;
    
    -- Log transaction
    INSERT INTO user_transactions (
      user_id, transaction_type, amount, 
      balance_before, balance_after, 
      description, created_at
    ) VALUES (
      v_payout.userId, 'payout', v_payout.amount,
      v_user_balance, v_user_balance + v_payout.amount,
      'Game payout', NOW()
    );
  END LOOP;
  
  -- Mark winning bets
  UPDATE player_bets 
  SET status = 'won', 
      actual_payout = amount * (
        CASE 
          WHEN round = '1' THEN 1.9
          WHEN round = '2' THEN 1.75
          ELSE 1.0
        END
      ),
      updated_at = NOW()
  WHERE id = ANY(p_winning_bets);
  
  -- Mark losing bets
  UPDATE player_bets 
  SET status = 'lost', 
      actual_payout = 0,
      updated_at = NOW()
  WHERE id = ANY(p_losing_bets);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create idempotency check function
CREATE OR REPLACE FUNCTION check_game_completed(p_game_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM game_sessions
  WHERE game_id = p_game_id;
  
  RETURN v_status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Fix round 3 payout multiplier
CREATE OR REPLACE FUNCTION get_payout_multiplier(p_round INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  CASE p_round
    WHEN 1 THEN RETURN 1.9;
    WHEN 2 THEN RETURN 1.75;
    ELSE RETURN 1.0;  -- Round 3+ refund only
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create game state validation function
CREATE OR REPLACE FUNCTION validate_game_state(
  p_game_id TEXT,
  p_phase TEXT,
  p_round INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure game exists
  IF NOT EXISTS (SELECT 1 FROM game_sessions WHERE game_id = p_game_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Validate phase transition
  IF p_phase NOT IN ('idle', 'betting', 'dealing', 'complete') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate round
  IF p_round NOT IN (1, 2, 3) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Verification**:
```bash
npm run test:database
```

#### 1.2 Fix Payout Calculation Logic
**File**: `server/game-fixed.ts`

Create a new fixed version of game.ts that uses the atomic database functions.

**Key Changes**:
1. Check `check_game_completed()` BEFORE processing payouts
2. Use `apply_payouts_atomic()` for all balance updates
3. Remove post-game balance verification (rely on transactions)
4. Use correct multipliers from `get_payout_multiplier()`

### Day 3-4: Round State Machine (16h)

#### 2.1 Create State Machine Class
**File**: `server/lib/GameStateMachine.ts`

```typescript
export class GameStateMachine {
  private state: GamePhase = 'idle';
  private round: 1 | 2 | 3 = 1;
  private gameId: string;
  
  constructor(gameId: string) {
    this.gameId = gameId;
  }
  
  async transition(event: GameEvent): Promise<void> {
    const oldState = this.state;
    const oldRound = this.round;
    
    switch (event.type) {
      case 'OPENING_CARD_SET':
        this.state = 'betting';
        this.round = 1;
        break;
        
      case 'TIMER_EXPIRED':
        if (this.state === 'betting') {
          this.state = 'dealing';
        }
        break;
        
      case 'CARD_DEALT':
        await this.handleCardDealt(event.data);
        break;
        
      case 'GAME_COMPLETE':
        this.state = 'complete';
        break;
    }
    
    // Persist state change to database
    if (oldState !== this.state || oldRound !== this.round) {
      await this.persist();
    }
  }
  
  private async handleCardDealt(data: any): Promise<void> {
    const totalCards = data.andarCount + data.baharCount;
    
    // Round 1: After 2 cards (1 andar + 1 bahar)
    if (this.round === 1 && totalCards === 2 && !data.winner) {
      this.state = 'betting';
      this.round = 2;
    }
    // Round 2: After 4 cards total
    else if (this.round === 2 && totalCards === 4 && !data.winner) {
      this.state = 'dealing';
      this.round = 3;
    }
    // Winner found
    else if (data.winner) {
      this.state = 'complete';
    }
  }
  
  private async persist(): Promise<void> {
    await storage.updateGameSession(this.gameId, {
      phase: this.state,
      round: this.round
    });
  }
  
  getState(): { phase: GamePhase; round: 1 | 2 | 3 } {
    return { phase: this.state, round: this.round };
  }
}
```

### Day 5: WebSocket Synchronization (8h)

#### 3.1 Fix Late Joiner State Sync
**File**: `server/routes.ts` (WebSocket handler)

```typescript
// When new client connects
ws.on('message', async (message) => {
  const data = JSON.parse(message);
  
  if (data.type === 'authenticate') {
    // ... authenticate user ...
    
    // Get current game state
    const gameState = await getCurrentGameState();
    
    // Filter buffered events for this user
    const userEvents = bufferedEvents
      .filter(event => {
        // Skip user-specific events for other users
        if (event.type === 'bet_confirmed') {
          return event.data.userId === userId;
        }
        return true;
      })
      .sort((a, b) => a.sequence - b.sequence); // Sort by sequence
    
    // Send initial state
    ws.send(JSON.stringify({
      type: 'authenticated',
      data: {
        gameState,
        bufferedEvents: userEvents
      }
    }));
  }
});
```

---

## PHASE 2: DATA INTEGRITY (Week 2 - 32h)

### Day 6-7: Bonus System Consolidation (16h)

#### 4.1 Migrate to New Bonus Tables
**File**: `scripts/migrate-bonus-system.sql`

```sql
-- Move data from users table to new tables
INSERT INTO deposit_bonuses (user_id, deposit_amount, bonus_amount, status)
SELECT 
  id,
  original_deposit_amount,
  deposit_bonus_available,
  CASE 
    WHEN bonus_locked THEN 'locked'
    ELSE 'unlocked'
  END
FROM users
WHERE deposit_bonus_available > 0;

-- Deprecate old columns
ALTER TABLE users 
  DROP COLUMN deposit_bonus_available,
  DROP COLUMN referral_bonus_available,
  DROP COLUMN bonus_locked;
```

#### 4.2 Update Bonus Service
**File**: `server/services/BonusService.ts`

Create centralized bonus service that ONLY queries new tables.

### Day 8-9: Analytics Fixes (16h)

#### 5.1 Fix Analytics Race Conditions
**File**: `server/lib/AnalyticsCapture.ts`

```typescript
export async function captureGameAnalytics(
  gameId: string,
  stats: GameStats
): Promise<void> {
  // Capture timestamp ONCE at start
  const snapshot = {
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    month: format(new Date(), 'yyyy-MM'),
    year: new Date().getFullYear()
  };
  
  // Use snapshot for all operations
  await Promise.all([
    updateDailyStats(snapshot.date, stats),
    updateMonthlyStats(snapshot.month, stats),
    updateYearlyStats(snapshot.year, stats)
  ]);
}
```

---

## PHASE 3: TESTING & VERIFICATION (Week 3 - 32h)

### Day 10-11: Comprehensive Test Suite (16h)

#### 6.1 Integration Tests
**File**: `tests/integration/game-flow.test.ts`

```typescript
describe('Complete Game Flow', () => {
  it('should handle full game from start to payout', async () => {
    // 1. Admin starts game
    await admin.startGame('A♠');
    
    // 2. Players place bets
    await player1.placeBet('andar', 1000, 1);
    await player2.placeBet('bahar', 2000, 1);
    
    // 3. Admin deals cards
    await admin.dealCard('K♠', 'andar', 1);
    
    // 4. Verify balances updated correctly
    const balance1 = await player1.getBalance();
    const balance2 = await player2.getBalance();
    
    expect(balance1).toBe(initialBalance1 + 900); // 1:1 payout
    expect(balance2).toBe(initialBalance2);
  });
});
```

### Day 12-13: Load Testing & Bug Fixes (16h)

Run stress tests and fix any issues found.

---

## VERIFICATION CHECKLIST

### ✅ Phase 1 Complete When:
- [ ] All database migrations run successfully
- [ ] Payout calculation uses atomic functions
- [ ] Round transitions follow state machine
- [ ] Late joiners receive correct state
- [ ] No duplicate payouts in logs

### ✅ Phase 2 Complete When:
- [ ] Bonus queries use new tables only
- [ ] Analytics timestamps are consistent
- [ ] Game history saves all fields
- [ ] No data races in tests

### ✅ Phase 3 Complete When:
- [ ] All integration tests pass
- [ ] Load tests show no errors
- [ ] Frontend flows work correctly
- [ ] Admin panel displays accurate data

---

## ROLLBACK PLAN

If issues occur during deployment:

1. **Database**: Keep old columns until migration verified
2. **Code**: Feature flags for new vs old logic
3. **Monitoring**: Alert on payout discrepancies
4. **Backup**: Daily database snapshots

---

## NEXT STEPS

1. **Review this plan** with team
2. **Set up staging environment** for testing
3. **Begin Phase 1** implementation
4. **Daily standups** to track progress

Would you like me to:
1. Start implementing Phase 1?
2. Create more detailed code for specific sections?
3. Add more test cases?

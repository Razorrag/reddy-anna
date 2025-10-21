# Complete Multi-Round Andar Bahar - Implementation Plan

## Game Flow Analysis

### Participants
1. **Admin** (`/admin-game`) - Controls game flow, selects cards
2. **Players** (`/game`) - Watch, bet, receive payouts
3. **Backend** - Manages state, timers, payouts, WebSocket sync

---

## ROUND 1: Initial Betting & Dealing

### Phase 1.1: Setup (Admin)
**State**: `phase: 'idle'`, `round: 1`

**Admin Panel Shows**:
- ✅ Opening card selector (all 52 cards)
- ✅ "Start Round 1" button

**Admin Actions**:
1. Select opening card from grid
2. Click "Start Round 1"

**Backend Actions**:
```typescript
- Set openingCard
- Set phase = 'betting'
- Set round = 1
- Start 30s timer
- Broadcast to all players:
  { type: 'game_start', data: { openingCard, round: 1, timer: 30 }}
```

**Player View Shows**:
- Opening card in center
- Timer: 30s countdown (BIG in center)
- Andar/Bahar betting buttons enabled
- Balance displayed

---

### Phase 1.2: Betting (30 seconds)
**State**: `phase: 'betting'`, `round: 1`, `timer: 30→0`

**Player Actions**:
- Click Andar or Bahar
- Select chip amount (1K-50K)
- Place bet
- Can place multiple bets

**Backend Tracking**:
```typescript
userBets = {
  userId: {
    round1: { andar: 100000, bahar: 0 },
    round2: { andar: 0, bahar: 0 }
  }
}
```

**Admin Panel Shows (During Betting)**:
- ✅ Large timer display (30s countdown)
- ✅ Real-time bet stats: Andar ₹X vs Bahar ₹Y
- ✅ Card pre-selection grid (admin can select early)
- ✅ Button: "💾 Save & Wait for Timer"

**Player View Shows**:
- Timer counting down
- Opening card visible
- Betting buttons active
- "Total: ₹X" on each side
- "You: ₹Y" on bet side
- Cards area shows "-" (hidden)

---

### Phase 1.3: Timer = 0
**State**: `phase: 'dealing'`, `round: 1`

**Backend Actions**:
```typescript
- Set phase = 'dealing'
- Lock betting
- Broadcast: { type: 'phase_change', data: { phase: 'dealing' }}
```

**Admin Panel Shows**:
- ✅ "⏳ Dealing Cards..." message
- ✅ Card selection grid
- ✅ Selected cards preview (Bahar: X, Andar: Y)
- ✅ Button: "🎴 Show Cards to Players"

**Player View Shows**:
- Timer = 0
- "BETTING LOCKED" overlay
- Cards still hidden (shows "-")
- Waiting for admin to deal

---

### Phase 1.4: Admin Deals Cards
**State**: `phase: 'dealing'`, `round: 1`

**Admin Actions**:
1. Select Bahar card
2. Select Andar card
3. Click "Show Cards to Players"

**Backend Actions**:
```typescript
- Add cards to baharCards[], andarCards[]
- Check if card matches openingCard
- If match found:
  - Calculate payouts (Round 1 rules)
  - Update balances
  - Set phase = 'complete'
  - Broadcast winner
- If NO match:
  - Wait 2 seconds
  - Auto-transition to Round 2
```

**Round 1 Payout Logic**:
```typescript
if (andarWins) {
  // Andar: 1:1 (double money)
  payout = userBets.round1.andar * 2;
} else if (baharWins) {
  // Bahar: 1:0 (refund only)
  payout = userBets.round1.bahar * 1; // just refund
}
```

**Player View Shows**:
- Cards appear in Andar/Bahar buttons
- Andar: Shows dealt card symbol
- Bahar: Shows dealt card symbol
- If winner: "🎉 ANDAR/BAHAR WINS!"
- If no winner: "No match. Starting Round 2..."

---

## ROUND 2: Additional Betting

### Phase 2.1: Auto-Transition
**Trigger**: Round 1 complete, no winner

**Backend Actions**:
```typescript
console.log('🔄 Round 1 complete! Auto-transitioning in 2 seconds...');

broadcast({
  type: 'notification',
  data: { message: 'No winner in Round 1. Starting Round 2 in 2 seconds...' }
});

setTimeout(() => {
  currentRound = 2;
  phase = 'betting';
  timer = 30;
  
  broadcast({
    type: 'start_round_2',
    data: { round: 2, timer: 30, message: 'Round 2 betting started!' }
  });
  
  startTimer(30);
}, 2000);
```

**Player View Shows**:
- "ROUND 1" → "ROUND 2" indicator change
- Notification: "Round 2 betting started!"
- New 30s timer starts
- Betting buttons re-enabled
- Previous cards still visible
- Previous bets locked (shown as "You: ₹X")

---

### Phase 2.2: Round 2 Betting (30s)
**State**: `phase: 'betting'`, `round: 2`, `timer: 30→0`

**Player Actions**:
- Place ADDITIONAL bets (on top of R1 bets)
- Example: Had ₹100K on Andar in R1, adds ₹100K more in R2

**Backend Tracking**:
```typescript
userBets = {
  userId: {
    round1: { andar: 100000, bahar: 0 },  // Locked
    round2: { andar: 100000, bahar: 0 }   // New bets
  }
}
```

**Admin Panel Shows**:
- Timer: 30s
- Stats: "R1 Bets: Andar ₹X, Bahar ₹Y"
- Stats: "R2 Bets: Andar ₹A, Bahar ₹B"
- Card pre-selection available

**Player View Shows**:
- Round 2 indicator
- Timer: 30s
- Betting active
- Shows: "R1: ₹100K, R2: ₹100K" (cumulative)

---

### Phase 2.3: Round 2 Dealing
**State**: `phase: 'dealing'`, `round: 2`

**Admin Actions**:
1. Select 1 more Bahar card
2. Select 1 more Andar card
3. Click "Show Cards"

**Backend Actions**:
```typescript
- Now have 2 cards each side
- Check for match
- If match: Calculate Round 2 payouts
- If NO match: Auto-transition to Round 3
```

**Round 2 Payout Logic**:
```typescript
if (andarWins) {
  // ALL bets (R1+R2) paid 1:1
  payout = (userBets.round1.andar + userBets.round2.andar) * 2;
  // Example: (100K + 100K) * 2 = 400K total
  
} else if (baharWins) {
  // R1 bets: 1:1, R2 bets: 1:0 (refund)
  payoutR1 = userBets.round1.bahar * 2;     // 100K * 2 = 200K
  payoutR2 = userBets.round2.bahar * 1;     // 100K * 1 = 100K (refund)
  payout = payoutR1 + payoutR2;             // 300K total
}
```

**Player View Shows**:
- Now shows 2 cards in each button
- Andar: Card1, Card2
- Bahar: Card1, Card2
- If winner: Payout notification
- If no match: "Starting Round 3..."

---

## ROUND 3: Continuous Draw (Sudden Death)

### Phase 3.1: Auto-Transition
**Trigger**: Round 2 complete, no winner

**Backend Actions**:
```typescript
console.log('🔄 Round 2 complete! Starting Final Draw...');

broadcast({
  type: 'start_final_draw',
  data: {
    round: 3,
    message: 'Round 3: Final Draw! Admin will deal until match.'
  }
});

currentRound = 3;
phase = 'dealing';
timer = 0;  // No timer
bettingLocked = true;
```

**Admin Panel Shows**:
- "ROUND 3 - CONTINUOUS DRAW"
- NO timer
- Card selection grid
- Button: "🎴 Deal to Bahar"
- Button: "🎴 Deal to Andar"
- Instructions: "Deal alternating until match"

**Player View Shows**:
- "ROUND 3 | Final Draw"
- NO timer
- Betting disabled (greyed out)
- All previous bets visible and locked
- Cards area ready to show new cards

---

### Phase 3.2: Continuous Dealing
**State**: `phase: 'dealing'`, `round: 3`, `timer: 0`

**Admin Actions** (Loop until match):
1. Deal card to Bahar
2. Check if match → If yes, game ends
3. If no, deal card to Andar
4. Check if match → If yes, game ends
5. Repeat from step 1

**Backend Logic**:
```typescript
// After each card dealt
const isWinner = checkWinner(card);

if (isWinner) {
  // Round 3 Payout: BOTH sides pay 1:1 on TOTAL invested
  const totalInvested = userBets.round1[side] + userBets.round2[side];
  const payout = totalInvested * 2;
  
  // Example: User had 100K in R1 + 100K in R2 = 200K total
  // Payout: 200K * 2 = 400K
  
  completeGame(side, card);
}
```

**Player View Shows**:
- Cards appearing one by one
- Bahar: Card1, Card2, Card3...
- Andar: Card1, Card2...
- Each new card has animation
- When match: "🎉 Winner! ANDAR/BAHAR!"

---

## State Management

### Backend State Structure
```typescript
interface GameState {
  gameId: string;
  openingCard: Card | null;
  phase: 'idle' | 'betting' | 'dealing' | 'complete';
  currentRound: 1 | 2 | 3;
  timer: number;
  bettingLocked: boolean;
  
  // Cards dealt
  andarCards: Card[];
  baharCards: Card[];
  
  // Bets tracking
  round1Bets: { andar: number, bahar: number };
  round2Bets: { andar: number, bahar: number };
  
  // User bets (detailed)
  userBets: Map<string, {
    round1: { andar: number, bahar: number },
    round2: { andar: number, bahar: number }
  }>;
  
  // Winner info
  winner: 'andar' | 'bahar' | null;
  winningCard: Card | null;
  winningRound: 1 | 2 | 3 | null;
}
```

### Frontend State (GameStateContext)
```typescript
interface GameState {
  gameId: string;
  selectedOpeningCard: Card | null;
  phase: GamePhase;
  currentRound: 1 | 2 | 3;
  countdownTimer: number;
  bettingLocked: boolean;
  
  andarCards: Card[];
  baharCards: Card[];
  
  andarTotalBet: number;
  baharTotalBet: number;
  
  playerBalance: number;
  playerRound1Bets: { andar: number, bahar: number };
  playerRound2Bets: { andar: number, bahar: number };
  
  gameWinner: 'andar' | 'bahar' | null;
  winningCard: Card | null;
}
```

---

## What to Show When

### Admin Panel States

| Phase | Round | Shows |
|-------|-------|-------|
| idle | 1 | Opening card selector + "Start Round 1" |
| betting | 1 | Timer (30s), Bet stats, Card pre-selector |
| dealing | 1 | "Deal Cards" button, Selected cards preview |
| betting | 2 | Timer (30s), R1+R2 bet stats, Card pre-selector |
| dealing | 2 | "Deal Cards" button (2nd set) |
| dealing | 3 | "Deal to Bahar/Andar" buttons, No timer |
| complete | Any | Winner display, "Start New Game" button |

### Player View States

| Phase | Round | Shows |
|-------|-------|-------|
| idle | 1 | "Waiting for game to start..." |
| betting | 1 | Timer, Opening card, Betting buttons active, Cards hidden |
| dealing | 1 | Timer=0, "Betting locked", Waiting for cards |
| *Card reveal* | 1 | Cards appear in buttons, Check for winner |
| betting | 2 | New timer, Betting active, Previous cards visible |
| dealing | 2 | Timer=0, Waiting for cards |
| *Card reveal* | 2 | 2 cards each side visible |
| dealing | 3 | "Final Draw", No betting, Cards appear one-by-one |
| complete | Any | Winner announcement, Payout notification |

---

## Implementation Checklist

### ✅ Already Working
- [x] WebSocket sync
- [x] Timer management
- [x] Auto-transitions (R1→R2→R3)
- [x] Payout calculation function
- [x] Card display in betting buttons
- [x] Admin card pre-selection
- [x] Database schema

### ⚠️ Needs Review/Enhancement
- [ ] Payout logic verification (asymmetric rules)
- [ ] Round-specific bet tracking per user
- [ ] Cumulative bet display (R1+R2)
- [ ] Round 3 continuous dealing UI
- [ ] Balance updates on payout
- [ ] Proper bet locking between rounds

### 🔧 Requires Implementation
- [ ] Split bet tracking by round in backend
- [ ] Display R1 vs R2 bets separately
- [ ] Round 3 "Deal to Bahar/Andar" buttons
- [ ] Payout calculation per round rules
- [ ] Balance update WebSocket messages
- [ ] Enhanced notifications for payouts

---

## Next Steps

1. **Verify payout logic** in `server/routes.ts` calculatePayout()
2. **Enhance bet tracking** to separate R1 and R2 bets per user
3. **Update admin panel** for Round 3 continuous dealing
4. **Test full game flow** R1 → R2 → R3
5. **Document** all WebSocket message types

Ready to implement? Let me know which part to start with!

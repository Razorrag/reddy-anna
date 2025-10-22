# Complete Andar Bahar Game Flow Redesign

## Current Issues Identified

### Race Conditions
1. ❌ Timer countdown and card dealing not synchronized
2. ❌ Admin can save cards but they don't reveal at timer=0
3. ❌ Round transitions don't happen automatically
4. ❌ No proper state management between rounds
5. ❌ Winner checking happens immediately instead of after reveal
6. ❌ Frontend and backend states can desync

### Missing Features
1. ❌ No "Show Cards to Players" button
2. ❌ Cards don't reveal with animation
3. ❌ Round 2 doesn't start automatically
4. ❌ No proper betting lock mechanism
5. ❌ No visual feedback for card reveal timing

---

## Proper Game Flow (As Per Requirements)

### Phase 1: IDLE (Opening Card Selection)
```
State:
- phase: 'idle'
- currentRound: 1
- timer: 0
- openingCard: null
- bettingLocked: false

Admin Actions:
1. Select opening card from 52-card grid
2. Click "Start Round 1" button
3. Set timer duration (default 30s)

Backend Actions:
1. Receive 'game_start' message
2. Set phase = 'betting'
3. Set currentRound = 1
4. Start timer countdown
5. Broadcast to all clients:
   - opening_card
   - phase: 'betting'
   - timer: 30
   - currentRound: 1

Frontend (Players):
- See opening card
- See timer countdown
- Can place bets
- See live betting stats
```

### Phase 2: BETTING (Round 1 - 30 seconds)
```
State:
- phase: 'betting'
- currentRound: 1
- timer: 30 → 0 (countdown)
- openingCard: '5♠' (example)
- bettingLocked: false
- preSelectedBaharCard: null
- preSelectedAndarCard: null

Admin Actions (DURING TIMER):
Option A: Pre-select cards
1. Select Bahar card
2. Select Andar card
3. Click "Save & Wait for Timer"
4. Cards are HIDDEN from players
5. Backend stores: preSelectedBaharCard, preSelectedAndarCard
6. Admin sees "Cards saved ✅" message

Option B: Wait for timer to reach 0
1. Don't select cards yet
2. Wait for timer countdown

Backend Timer Logic:
Every second:
- timer--
- Broadcast timer update to all clients

When timer reaches 0:
1. Set bettingLocked = true
2. Set phase = 'dealing'
3. Broadcast phase change
4. If preSelectedCards exist:
   - Automatically reveal them
   - Check for winner
5. If no preSelectedCards:
   - Wait for admin to select cards

Frontend (Players):
- Timer shows: "30s" → "29s" → ... → "0s"
- Can place bets while timer > 0
- Betting disabled when timer = 0
- See message: "Betting closed! Dealing cards..."
```

### Phase 3: DEALING (Reveal Cards)
```
State:
- phase: 'dealing'
- currentRound: 1
- timer: 0
- bettingLocked: true
- baharCards: []
- andarCards: []

Scenario A: Cards Pre-Selected (timer reached 0)
Backend Auto-Actions:
1. Reveal Bahar card first
   - Add to baharCards[]
   - Broadcast 'card_dealt' with 1s delay
   - Check if matches opening card
2. If Bahar wins:
   - Set winner = 'bahar'
   - Set phase = 'complete'
   - Calculate payouts (Round 1: Bahar = 1:0 refund)
   - Broadcast winner
   - STOP
3. If Bahar doesn't match:
   - Reveal Andar card (1s delay)
   - Add to andarCards[]
   - Broadcast 'card_dealt'
   - Check if matches opening card
4. If Andar wins:
   - Set winner = 'andar'
   - Set phase = 'complete'
   - Calculate payouts (Round 1: Andar = 1:1 double)
   - Broadcast winner
   - STOP
5. If no winner:
   - Broadcast 'no_winner'
   - Show "No Winner! Round 2 starting in 3s..."
   - Wait 3 seconds
   - Transition to Round 2

Scenario B: No Pre-Selected Cards
Admin Actions:
1. Select Bahar card
2. Select Andar card
3. Click "Show Cards to Players"
4. Same flow as Scenario A

Frontend (Players):
- See "Dealing..." message
- Bahar card appears with animation (1s)
- If matches: "BAHAR WINS! 🎉"
- If not: Andar card appears (1s delay)
- If matches: "ANDAR WINS! 🎉"
- If not: "No Winner! Round 2 starting..."
```

### Phase 4: ROUND 2 BETTING (30 seconds)
```
State:
- phase: 'betting'
- currentRound: 2
- timer: 30
- baharCards: ['7♥'] (from R1)
- andarCards: ['K♠'] (from R1)
- bettingLocked: false

Backend Auto-Transition:
1. Set currentRound = 2
2. Set phase = 'betting'
3. Set timer = 30
4. Reset bettingLocked = false
5. Broadcast round change

Players:
- Can add MORE bets (cumulative)
- See existing R1 bets + new R2 bets
- Timer counts down again

Admin:
- Same as Round 1
- Can pre-select next cards
- Or wait for timer
```

### Phase 5: ROUND 2 DEALING
```
Same as Round 1 dealing, but:

Payout Rules:
- Andar wins: ALL bets (R1+R2) paid 1:1
- Bahar wins: R1 bets paid 1:1, R2 bets paid 1:0 (refund)

If no winner after R2:
- Transition to Round 3
```

### Phase 6: ROUND 3 (Continuous Draw)
```
State:
- phase: 'dealing'
- currentRound: 3
- timer: 0 (no timer)
- bettingLocked: true (NO MORE BETTING)

Admin Actions:
- Continuously deal cards
- Alternating: Bahar → Andar → Bahar → Andar...
- No "Save & Wait" - instant reveal
- First match wins

Payout Rules:
- BOTH sides: ALL bets (R1+R2) paid 1:1

Frontend:
- No betting panel
- Just watch cards being dealt
- First match triggers winner
```

---

## Backend State Machine

```typescript
interface GameState {
  gameId: string;
  openingCard: string | null;
  phase: 'idle' | 'betting' | 'dealing' | 'complete';
  currentRound: 1 | 2 | 3;
  timer: number;
  timerInterval: NodeJS.Timeout | null;
  
  // Cards
  andarCards: string[];
  baharCards: string[];
  
  // Pre-selected cards (hidden until reveal)
  preSelectedBaharCard: Card | null;
  preSelectedAndarCard: Card | null;
  
  // Winner
  winner: 'andar' | 'bahar' | null;
  winningCard: string | null;
  winningRound: number | null;
  
  // Betting
  bettingLocked: boolean;
  round1Bets: { andar: number; bahar: number };
  round2Bets: { andar: number; bahar: number };
  userBets: Map<string, UserBets>;
}
```

---

## WebSocket Messages

### Admin → Backend

#### 1. Start Game
```json
{
  "type": "game_start",
  "data": {
    "openingCard": "5♠",
    "timer": 30
  }
}
```

#### 2. Save Cards (Pre-select)
```json
{
  "type": "save_cards",
  "data": {
    "baharCard": { "display": "7♥", "suit": "hearts", ... },
    "andarCard": { "display": "K♠", "spades": "hearts", ... }
  }
}
```

#### 3. Reveal Cards (Manual)
```json
{
  "type": "reveal_cards",
  "data": {}
}
```

#### 4. Deal Single Card (Round 3)
```json
{
  "type": "deal_card",
  "data": {
    "card": { "display": "A♦", ... },
    "side": "bahar"
  }
}
```

### Backend → All Clients

#### 1. Game Started
```json
{
  "type": "game_started",
  "data": {
    "gameId": "game-123",
    "openingCard": "5♠",
    "phase": "betting",
    "currentRound": 1,
    "timer": 30
  }
}
```

#### 2. Timer Update
```json
{
  "type": "timer_update",
  "data": {
    "timer": 25,
    "phase": "betting"
  }
}
```

#### 3. Timer Expired
```json
{
  "type": "timer_expired",
  "data": {
    "phase": "dealing",
    "bettingLocked": true,
    "message": "Betting closed! Revealing cards..."
  }
}
```

#### 4. Card Revealed
```json
{
  "type": "card_revealed",
  "data": {
    "card": { "display": "7♥", ... },
    "side": "bahar",
    "position": 1,
    "isWinner": false
  }
}
```

#### 5. Winner Found
```json
{
  "type": "game_complete",
  "data": {
    "winner": "andar",
    "winningCard": "K♠",
    "winningRound": 1,
    "payouts": { ... }
  }
}
```

#### 6. No Winner - Round Transition
```json
{
  "type": "round_transition",
  "data": {
    "fromRound": 1,
    "toRound": 2,
    "message": "No winner! Round 2 starting in 3s...",
    "delay": 3000
  }
}
```

---

## Frontend Components Update

### AdminGamePanel.tsx
```typescript
// Show different UI based on phase and round

if (phase === 'idle') {
  return <OpeningCardSelector />;
}

if (phase === 'betting') {
  return (
    <>
      <TimerDisplay timer={timer} />
      <BettingStats />
      <CardDealingPanel 
        canPreSelect={true}
        showSaveButton={true}
      />
    </>
  );
}

if (phase === 'dealing') {
  if (round === 3) {
    return <ContinuousDealingPanel />;
  } else {
    return (
      <>
        <CardRevealStatus />
        <CardDealingPanel 
          canPreSelect={false}
          showRevealButton={!cardsPreSelected}
        />
      </>
    );
  }
}

if (phase === 'complete') {
  return <WinnerDisplay />;
}
```

### CardDealingPanel.tsx Updates
```typescript
// Two modes:
// 1. Pre-select mode (during betting)
// 2. Manual reveal mode (after timer expires)

const [mode, setMode] = useState<'preselect' | 'reveal'>('preselect');

if (mode === 'preselect') {
  // Show "Save & Wait for Timer" button
  // Cards hidden from players
}

if (mode === 'reveal') {
  // Show "Show Cards to Players" button
  // Immediately broadcast cards
}
```

---

## Implementation Priority

### Phase 1: Fix Timer & State Sync ✅
- [ ] Backend timer countdown with proper intervals
- [ ] Broadcast timer updates every second
- [ ] Lock betting when timer = 0
- [ ] Transition phase from 'betting' to 'dealing'

### Phase 2: Card Pre-Selection ✅
- [ ] Add `save_cards` WebSocket handler
- [ ] Store preSelectedBaharCard, preSelectedAndarCard
- [ ] Don't broadcast cards yet
- [ ] Show "Cards saved ✅" to admin only

### Phase 3: Auto-Reveal on Timer=0 ✅
- [ ] When timer reaches 0
- [ ] If preSelectedCards exist
- [ ] Auto-reveal with delays
- [ ] Check winner after each card

### Phase 4: Manual Reveal ✅
- [ ] If no preSelectedCards
- [ ] Admin selects cards in 'dealing' phase
- [ ] Click "Show Cards to Players"
- [ ] Immediate reveal with delays

### Phase 5: Round Transitions ✅
- [ ] After no winner in R1
- [ ] Wait 3 seconds
- [ ] Auto-transition to R2 betting
- [ ] Reset timer to 30s

### Phase 6: Round 3 Continuous ✅
- [ ] No timer
- [ ] No betting
- [ ] Alternating card dealing
- [ ] First match wins

### Phase 7: Payout Logic ✅
- [ ] Round 1: Andar 1:1, Bahar 1:0
- [ ] Round 2: Andar 1:1 all, Bahar 1:1 R1 + 1:0 R2
- [ ] Round 3: Both sides 1:1 all bets

---

## Files to Modify

### Backend
1. `server/routes.ts`
   - Fix timer logic
   - Add `save_cards` handler
   - Add auto-reveal logic
   - Fix round transitions
   - Fix payout calculations

### Frontend
2. `client/src/components/AdminGamePanel/CardDealingPanel.tsx`
   - Add pre-select mode
   - Add reveal mode
   - Update button logic

3. `client/src/components/AdminGamePanel/AdminGamePanel.tsx`
   - Update phase-based rendering
   - Add timer display
   - Add round transition animations

4. `client/src/contexts/WebSocketContext.tsx`
   - Handle new message types
   - Update state properly
   - Add card reveal animations

5. `client/src/contexts/GameStateContext.tsx`
   - Add preSelectedCards state
   - Add reveal animation state

---

## Testing Checklist

### Round 1
- [ ] Select opening card
- [ ] Start Round 1 with 30s timer
- [ ] Pre-select Bahar + Andar cards
- [ ] Click "Save & Wait"
- [ ] Timer counts down
- [ ] At timer=0, cards auto-reveal
- [ ] Bahar shows first (1s delay)
- [ ] If no match, Andar shows (1s delay)
- [ ] If Bahar wins: Game ends, payout 1:0
- [ ] If Andar wins: Game ends, payout 1:1
- [ ] If no winner: Round 2 starts in 3s

### Round 2
- [ ] Timer resets to 30s
- [ ] Players can add more bets
- [ ] Same card dealing logic
- [ ] Correct payouts (Andar 1:1 all, Bahar 1:1 R1 + 1:0 R2)
- [ ] If no winner: Round 3 starts

### Round 3
- [ ] No timer
- [ ] No betting
- [ ] Continuous dealing
- [ ] Alternating Bahar → Andar
- [ ] First match wins
- [ ] Both sides pay 1:1

---

**Status**: Ready for implementation
**Priority**: HIGH - Critical game flow issues
**Estimated Time**: 4-6 hours for complete implementation

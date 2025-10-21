# Admin Panel UI Flow - Round by Round

## ROUND 1 Flow

### Step 1: Opening Card Selection
```
┌──────────────────────────────────────┐
│ 🎰 Admin Control Panel | Round 1     │
├──────────────────────────────────────┤
│ 🎴 Step 1: Select Opening Card       │
│                                      │
│ ♠ SPADES                             │
│ A♠ 2♠ 3♠ ... K♠                      │
│ ♥ HEARTS                             │
│ A♥ 2♥ 3♥ ... K♥                      │
│ ♦ DIAMONDS                           │
│ ♣ CLUBS                              │
│                                      │
│ Selected: 7♥                         │
│ [Clear] [✅ Start Round 1]           │
└──────────────────────────────────────┘
```

### Step 2: Betting Phase (30s)
```
┌──────────────────────────────────────┐
│ 🎰 Admin Control Panel | Round 1     │
├──────────────────────────────────────┤
│ 🎴 CARD SELECTION (Pre-select)       │
│ Select Bahar → Select Andar → Deal   │
│ ♠ A♠ 2♠ 3♠ ... (click cards)         │
│                                      │
│ Bahar: 5♦  |  Andar: K♣              │
│ [Clear] [💾 Save & Wait for Timer]   │
├──────────────────────────────────────┤
│ ⏱️ BETTING TIME: 25s                 │
│ Players are placing bets...          │
├──────────────────────────────────────┤
│ Opening Card: 7♥                     │
├──────────────────────────────────────┤
│ ANDAR: ₹150K (60%) | BAHAR: ₹100K   │
└──────────────────────────────────────┘
```

### Step 3: Dealing Phase (After Timer = 0)
```
┌──────────────────────────────────────┐
│ 🎴 CARD SELECTION                    │
│ Bahar: 5♦  |  Andar: K♣              │
│ [Clear] [🎴 Show Cards to Players]   │
├──────────────────────────────────────┤
│ ⏳ Round 1 - Deal 1 Bahar + 1 Andar  │
│ Select cards and click "Show Cards"  │
├──────────────────────────────────────┤
│ BAHAR CARDS: 0  |  ANDAR CARDS: 0    │
│ None yet        |  None yet          │
└──────────────────────────────────────┘
```

### Step 4a: NO WINNER (Cards Dealt, No Match)
**Backend checks: Neither 5♦ nor K♣ matches 7♥**

```
┌──────────────────────────────────────┐
│ 🎴 Cards Dealt:                      │
│ BAHAR: 5♦  |  ANDAR: K♣              │
├──────────────────────────────────────┤
│ 🔔 NO WINNER                         │
│ Starting Round 2 in 2 seconds...     │
└──────────────────────────────────────┘

[After 2 seconds]

┌──────────────────────────────────────┐
│ 🎰 Admin Control Panel | Round 2 ✅  │
│ 🔔 Round 2 betting started!          │
│ ⏱️ TIMER: 30s (NEW BETTING ROUND)    │
└──────────────────────────────────────┘
```

### Step 4b: WINNER FOUND (If Match)
**Backend checks: Card matches opening card**

```
┌──────────────────────────────────────┐
│            🎉🎉🎉                     │
│                                      │
│         ANDAR WINS!                  │
│                                      │
│     Winning Card: 7♠                 │
│     Round 1 Complete                 │
│                                      │
│ [🎮 Start New Game]                  │
└──────────────────────────────────────┘
```

---

## ROUND 2 Flow

### Step 1: Betting Phase (30s - New Bets)
```
┌──────────────────────────────────────┐
│ 🎰 Admin Control Panel | Round 2     │
├──────────────────────────────────────┤
│ 🎴 CARD SELECTION (Pre-select R2)    │
│ ♠ A♠ 2♠ 3♠ ... (select more cards)   │
│                                      │
│ Bahar: 3♥  |  Andar: 9♠              │
│ [Clear] [💾 Save & Wait for Timer]   │
├──────────────────────────────────────┤
│ ⏱️ BETTING TIME: 28s                 │
│ Round 2 - Additional bets allowed    │
├──────────────────────────────────────┤
│ Opening Card: 7♥                     │
├──────────────────────────────────────┤
│ R1 BETS: Andar ₹150K | Bahar ₹100K  │
│ R2 BETS: Andar ₹80K  | Bahar ₹120K  │
└──────────────────────────────────────┘
```

### Step 2: Dealing Phase
```
┌──────────────────────────────────────┐
│ 🎴 CARD SELECTION                    │
│ Bahar: 3♥  |  Andar: 9♠              │
│ [🎴 Show Cards to Players]           │
├──────────────────────────────────────┤
│ ⏳ Round 2 - Deal 1 MORE each        │
│ Select cards and click "Show Cards"  │
├──────────────────────────────────────┤
│ BAHAR CARDS: 1  |  ANDAR CARDS: 1    │
│ 5♦              |  K♣                │
└──────────────────────────────────────┘
```

### Step 3a: NO WINNER (Still No Match)
```
┌──────────────────────────────────────┐
│ BAHAR: 5♦, 3♥  |  ANDAR: K♣, 9♠      │
├──────────────────────────────────────┤
│ 🔔 NO WINNER                         │
│ Starting Round 3 (Final Draw)...     │
└──────────────────────────────────────┘

[After 2 seconds]

┌──────────────────────────────────────┐
│ 🎰 Admin Control Panel | Round 3 ✅  │
│ ⚡ ROUND 3 - CONTINUOUS DRAW         │
│ Deal alternating until match found   │
└──────────────────────────────────────┘
```

### Step 3b: WINNER FOUND
```
┌──────────────────────────────────────┐
│            🎉🎉🎉                     │
│                                      │
│         BAHAR WINS!                  │
│                                      │
│     Winning Card: 7♦                 │
│     Round 2 Complete                 │
│                                      │
│ Payouts:                             │
│ • R1 Bahar bets: 1:1                 │
│ • R2 Bahar bets: 1:0 (refund)        │
│                                      │
│ [🎮 Start New Game]                  │
└──────────────────────────────────────┘
```

---

## ROUND 3 Flow (Continuous Draw)

### No Betting - Just Dealing
```
┌──────────────────────────────────────┐
│ 🎰 Admin Control Panel | Round 3     │
├──────────────────────────────────────┤
│ 🎴 CARD SELECTION                    │
│ ♠ A♠ 2♠ 3♠ ... (select card)         │
│                                      │
│ Next Card: 2♠                        │
│ [🎴 Deal to BAHAR]                   │
│ [🎴 Deal to ANDAR]                   │
├──────────────────────────────────────┤
│ ⚡ Round 3 - Continuous Draw         │
│ Deal alternating until match         │
├──────────────────────────────────────┤
│ BAHAR: 3 cards  |  ANDAR: 2 cards    │
│ 5♦, 3♥, Q♣      |  K♣, 9♠            │
└──────────────────────────────────────┘
```

### Winner Found in R3
```
┌──────────────────────────────────────┐
│            🎉🎉🎉                     │
│                                      │
│         ANDAR WINS!                  │
│                                      │
│     Winning Card: 7♣                 │
│     Round 3 Complete                 │
│                                      │
│ Payouts:                             │
│ • All bets (R1+R2): 1:1              │
│ • Total payout per ₹100K: ₹200K      │
│                                      │
│ [🎮 Start New Game]                  │
└──────────────────────────────────────┘
```

---

## Key UI Messages

### Round Transitions
- ✅ "No winner in Round 1. Starting Round 2 in 2 seconds..."
- ✅ "No winner in Round 2. Starting Round 3 in 2 seconds..."
- ✅ "Round 2 betting started!" (notification)
- ✅ "Round 3: Final Draw! Admin will deal until match."

### Dealing Instructions
- **Round 1**: "Deal 1 Bahar + 1 Andar"
- **Round 2**: "Deal 1 MORE Bahar + 1 MORE Andar" 
- **Round 3**: "Continuous Draw Until Match"

### Winner Display
- Shows winning side in large text
- Shows winning card
- Shows round number
- Button to start new game

---

## Summary: Cards Per Round

| Round | Bahar Cards | Andar Cards | Total Each |
|-------|-------------|-------------|------------|
| 1     | 1           | 1           | 1          |
| 2     | 1 more (+1) | 1 more (+1) | 2          |
| 3     | Continuous  | Continuous  | Until match|

**Important**: Each round adds ONLY 1 card per side (except R3 which is continuous)

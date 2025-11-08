# CRITICAL DEBUG: Round Mismatch Investigation

## Problem Statement
User bets ₹15,000 in Round 1, but undo returns: **"No active bets found in Round 1 to undo"**

## Root Cause Hypothesis
The round number being stored in the database doesn't match the round number being checked during undo. This is a **type mismatch** or **value mismatch** issue.

---

## Complete Bet Flow

### Step 1: Client Sends Bet (WebSocketContext.tsx:1482)
```typescript
sendWebSocketMessage({
  type: 'place_bet',
  data: {
    gameId: gameState.gameId,
    side,
    amount,
    round: String(gameState.currentRound), // ✅ Converted to string
  }
});
```
**Sent as**: `round: "1"` (string)

### Step 2: Server Receives Bet (game-handlers.ts:51)
```typescript
const { gameId, side, amount, round } = data;
```
**Received as**: `round: "1"` (string)

### Step 3: Server Validates Round (game-handlers.ts:93-96)
```typescript
if (typeof round !== 'string') {
  sendError(ws, 'round must be a string');
  return;
}
```
**Validation**: Expects string ✓

### Step 4: Server Stores in Database (game-handlers.ts:238-245)
```typescript
await storage.createBet({
  userId: userId,
  gameId: gameIdToUse,
  side,
  amount: amount,
  round: round.toString(), // ✅ Stored as string
  status: 'pending'
});
```
**Stored as**: `round: "1"` (string in database)

### Step 5: Undo Checks Round (routes.ts:4689)
```typescript
const currentRound = currentGameState.currentRound;
```
**Value**: `currentRound: 1` (number?)

### Step 6: Undo Filters Bets (routes.ts:4706-4711)
```typescript
const activeBets = userBets.filter(bet => {
  const betRound = parseInt(bet.round); // Parse "1" → 1
  const matches = bet.status !== 'cancelled' && betRound === currentRound;
  return matches;
});
```
**Comparison**: `parseInt("1") === currentRound`

---

## Potential Issues

### Issue 1: currentRound is undefined
```javascript
currentGameState.currentRound === undefined
```
**Solution**: Initialize properly when game starts

### Issue 2: currentRound is wrong value
```javascript
currentRound === 2  // But bet was placed in round 1
```
**Solution**: Ensure round doesn't advance before undo

### Issue 3: Database round format mismatch
```javascript
bet.round === "round1" // Instead of "1"
```
**Solution**: Standardize format

---

## Debug Logs Added

I've added comprehensive logging at line 4696-4702 in `routes.ts`:

```typescript
console.log(`🔍 UNDO DEBUG:`, {
  currentRound,
  currentRoundType: typeof currentRound,
  userBetsCount: userBets.length,
  userBetsRounds: userBets.map(b => ({ 
    round: b.round, 
    roundType: typeof b.round, 
    status: b.status, 
    amount: b.amount 
  }))
});
```

And per-bet comparison logging at lines 4707-4709:

```typescript
const activeBets = userBets.filter(bet => {
  const betRound = parseInt(bet.round);
  const matches = bet.status !== 'cancelled' && betRound === currentRound;
  console.log(`  🔍 Comparing bet: round="${bet.round}" (${typeof bet.round}) → parsed=${betRound}, currentRound=${currentRound}, status="${bet.status}", matches=${matches}`);
  return matches;
});
```

---

## Testing Steps

### Test 1: Place Bet and Immediately Undo
1. **Start game** as admin
2. **Place bet** ₹15,000 on Bahar in Round 1
3. **Watch server logs** for:
   ```
   📝 BET REQUEST: User 9876543210 wants to bet ₹15000 on bahar for round 1
   📊 Bet recorded: 9876543210 - 15000 on bahar for game game-xxx
   ```
4. **Click Undo** immediately
5. **Check server logs** for:
   ```
   🔍 UNDO REQUEST: User 9876543210, Current Round: ?, Game Phase: betting
   🔍 UNDO DEBUG: {
     currentRound: ?,
     currentRoundType: 'number' or 'undefined'?,
     userBetsCount: 1,
     userBetsRounds: [{ round: '1', roundType: 'string', status: 'pending', amount: '15000' }]
   }
   🔍 Comparing bet: round="1" (string) → parsed=1, currentRound=?, status="pending", matches=true/false?
   ```

### Expected Output (Working):
```
🔍 UNDO DEBUG: {
  currentRound: 1,
  currentRoundType: 'number',
  userBetsCount: 1,
  userBetsRounds: [{ round: '1', roundType: 'string', status: 'pending', amount: '15000' }]
}
🔍 Comparing bet: round="1" (string) → parsed=1, currentRound=1, status="pending", matches=true
✅ ALL BETS UNDONE: User 9876543210, 1 bets from Round 1, Total ₹15000
```

### Actual Output (Broken):
```
🔍 UNDO DEBUG: {
  currentRound: undefined, // ❌ PROBLEM!
  currentRoundType: 'undefined',
  userBetsCount: 1,
  userBetsRounds: [{ round: '1', roundType: 'string', status: 'pending', amount: '15000' }]
}
🔍 Comparing bet: round="1" (string) → parsed=1, currentRound=undefined, status="pending", matches=false
```

---

## Likely Root Causes

### Cause A: currentGameState.currentRound is undefined
**Location**: Server global state initialization
**Fix**: Ensure `currentGameState.currentRound = 1` when game starts

### Cause B: currentRound advances too early
**Location**: Game phase transitions
**Fix**: Don't advance round until dealing phase completes

### Cause C: Multiple game instances
**Location**: Server state management
**Fix**: Ensure single source of truth for currentRound

---

## Files to Check

### 1. Server Game State Initialization
Look for where `currentGameState` is created:
- `server/routes.ts` - Global state object
- `server/socket/game-handlers.ts` - Game start handler

### 2. Round Advancement Logic
Look for where `currentRound` changes:
- Search for `currentRound++` or `currentRound = 2`
- Check game phase transitions

### 3. Game Start Handler
Look for `start_game` WebSocket handler:
- Should set `currentRound = 1`
- Should initialize `round1Bets = { andar: 0, bahar: 0 }`

---

## Quick Fixes to Try

### Fix 1: Ensure currentRound is always defined
```typescript
const currentRound = currentGameState?.currentRound || 1;
```

### Fix 2: Initialize currentRound on game start
```typescript
// In start_game handler
currentGameState.currentRound = 1;
```

### Fix 3: Log currentRound at bet placement
Add to game-handlers.ts after line 100:
```typescript
console.log(`🎲 Current game state:`, {
  currentRound: currentGameState.currentRound,
  phase: currentGameState.phase,
  gameId: currentGameState.gameId
});
```

---

## Action Items

1. **Run the server** with `npm run dev:both`
2. **Place a bet** and watch logs
3. **Try to undo** and copy the EXACT output from:
   ```
   🔍 UNDO REQUEST: ...
   🔍 UNDO DEBUG: ...
   🔍 Comparing bet: ...
   ```
4. **Share the logs** so we can see:
   - What is `currentRound`?
   - What is `bet.round`?
   - Why doesn't the comparison match?

---

## Status

✅ Detailed logging added
⏳ Waiting for test results
🎯 Once we see the logs, we'll know EXACTLY what's wrong

**Next Step**: Run the test and share the console output starting from when you place the bet until you try to undo.

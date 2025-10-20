# Step 2: WebSocket Context Enhancement (Sync + Styling)

## Goal
Enhance WebSocketContext.tsx to handle all new message types and support both sync functionality and styling considerations.

## Current State
- WebSocketContext.tsx needs to handle all new message types from server
- Missing state update calls for received messages
- Need to improve error handling and connection recovery
- Potential conflicts between local and WebSocket state

## Target State
- All message types properly handled in WebSocketContext.tsx
- All state updates properly synchronized
- Robust error handling and connection recovery
- No conflicts between local and WebSocket state

## Files to Modify
- `client/src/contexts/WebSocketContext.tsx`

## Detailed Changes

### 1. Update WebSocketContext.tsx with missing message type handlers:

#### Handle betting stats updates from server
Add to the message handling switch statement:
```typescript
case 'betting_stats':
  // Update total bets for display
  updateTotalBets({ 
    andar: data.andarTotal, 
    bahar: data.baharTotal 
  });
  // Update individual round bets
  if (data.round1Bets) updateRoundBets(1, data.round1Bets);
  if (data.round2Bets) updateRoundBets(2, data.round2Bets);
  break;
```

#### Handle user bet updates (for individual player's locked bets)
Add to the message handling switch statement:
```typescript
case 'user_bets_update':
  // Update individual user's locked bets
  if (data.round1Bets) updatePlayerRoundBets(1, data.round1Bets);
  if (data.round2Bets) updatePlayerRoundBets(2, data.round2Bets);
  break;
```

#### Handle timer updates consistently
Add to the message handling switch statement:
```typescript
case 'timer_update':
  // Update timer consistently
  setCountdown(data.seconds);
  if (data.phase) setPhase(data.phase);
  break;
```

#### Handle card dealing updates
Add to the message handling switch statement:
```typescript
case 'card_dealt':
  // Update card display based on WebSocket data
  if (data.side === 'andar') {
    setAndarCards(prev => [...prev, data.card]);
  } else {
    setBaharCards(prev => [...prev, data.card]);
  }
  // Check if this is the winning card
  if (data.isWinningCard) {
    setWinner(data.side);
  }
  break;
```

#### Handle opening card confirmation
Add to the message handling switch statement:
```typescript
case 'opening_card_confirmed':
  if (data.openingCard) {
    setOpeningCard(data.openingCard);
  }
  if (data.phase) setPhase(data.phase);
  if (data.round) setCurrentRound(data.round);
  break;
```

#### Handle round 2 start
Add to the message handling switch statement:
```typescript
case 'start_round_2':
  setCurrentRound(data.round);
  setPhase('betting');
  if (data.timer) setCountdown(data.timer);
  if (data.round1Bets) updateRoundBets(1, data.round1Bets);
  showNotification(data.message || 'Round 2 betting started!', 'success');
  break;
```

#### Handle final draw start
Add to the message handling switch statement:
```typescript
case 'start_final_draw':
  setCurrentRound(3);
  setPhase('dealing');
  setCountdown(0);
  if (data.round1Bets) updateRoundBets(1, data.round1Bets);
  if (data.round2Bets) updateRoundBets(2, data.round2Bets);
  showNotification(data.message || 'Round 3: Continuous draw started!', 'warning');
  break;
```

#### Handle game completion
Add to the message handling switch statement:
```typescript
case 'game_complete':
  setWinner(data.winner);
  setPhase('completed');
  setCurrentRound(0);
  showNotification(data.message, 'success');
  break;
```

#### Handle game reset
Add to the message handling switch statement:
```typescript
case 'game_reset':
  // Reset all game state
  setPhase('idle');
  setCurrentRound(0);
  setCountdown(0);
  setAndarCards([]);
  setBaharCards([]);
  setWinner(null);
  setOpeningCard(null);
  resetBettingData();
  showNotification(data.message, 'info');
  break;
```

#### Handle sync game state (for reconnection recovery)
Add to the message handling switch statement:
```typescript
case 'sync_game_state':
  if (data.data?.phase) setPhase(data.data.phase);
  if (data.data?.countdown !== undefined) setCountdown(data.data.countdown);
  if (data.data?.winner) setWinner(data.data.winner);
  if (data.data?.currentRound) setCurrentRound(data.data.currentRound);
  if (data.data?.openingCard) setOpeningCard(data.data.openingCard);
  if (data.data?.andarCards) setAndarCards(data.data.andarCards);
  if (data.data?.baharCards) setBaharCards(data.data.baharCards);
  // Ensure ALL state properties are synchronized
  break;
```

### 2. Enhance Game State Context Synchronization
- Ensure WebSocket updates take precedence over local state
- Add proper state reconciliation logic
- Remove potential conflicts between local and WebSocket state

## Verification Steps
1. Update WebSocketContext.tsx with all new message handlers
2. Test WebSocket synchronization between admin and player interfaces
3. Verify all game state updates work correctly
4. Test connection recovery functionality
5. Ensure WebSocket updates properly override local state
/**
 * ============================================
 * ANDAR BAHAR GAME - FIXED IMPLEMENTATION
 * ============================================
 * 
 * This is the fixed version of game.ts that:
 * 1. Uses the GameStateMachine for proper state management
 * 2. Uses atomic database functions for payouts
 * 3. Prevents duplicate payouts with idempotency checks
 * 4. Properly tracks rounds and payout multipliers
 * 5. Saves complete game history
 * 
 * MIGRATION GUIDE:
 * 1. Backup current game.ts
 * 2. Run scripts/MASTER_FIX_DATABASE.sql
 * 3. Replace game.ts with this file
 * 4. Restart server
 * 5. Test thoroughly on staging
 */

import { broadcast, broadcastToRole, GameState, clients } from './routes';
import { storage } from './storage-supabase';
import { GameStateMachine, createStateMachine, GameEvent } from './lib/GameStateMachine';

// Global state machine instance for current game
let currentStateMachine: GameStateMachine | null = null;

/**
 * Initialize or restore state machine for a game
 */
async function getStateMachine(gameId: string): Promise<GameStateMachine> {
  if (!currentStateMachine || currentStateMachine.getCurrentPhase() === 'complete') {
    currentStateMachine = await createStateMachine(gameId);
  }
  return currentStateMachine;
}

/**
 * Completes a game with proper state management and atomic payouts
 */
export async function completeGame(
  gameState: GameState, 
  winningSide: 'andar' | 'bahar', 
  winningCard: string
) {
  console.log(`🎮 Game complete! Winner: ${winningSide}, Card: ${winningCard}, Round: ${gameState.currentRound}`);
  
  const startTime = Date.now();
  
  // ============================================
  // STEP 1: VALIDATE GAME STATE
  // ============================================
  
  // Validate game ID
  if (!gameState.gameId || gameState.gameId === 'default-game') {
    gameState.gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.warn(`⚠️ Generated new game ID: ${gameState.gameId}`);
  }
  
  // Validate opening card
  if (!gameState.openingCard) {
    gameState.openingCard = 'UNKNOWN';
    console.warn(`⚠️ Missing opening card, using UNKNOWN`);
  }
  
  // ============================================
  // STEP 2: CHECK IDEMPOTENCY
  // ============================================
  
  try {
    const isCompleted = await storage.checkGameCompleted(gameState.gameId);
    if (isCompleted) {
      console.warn(`⚠️ Game ${gameState.gameId} already completed, skipping duplicate payout`);
      return;
    }
  } catch (error) {
    console.error(`❌ Error checking game completion status:`, error);
    // Continue anyway - better to process than to block
  }
  
  // ============================================
  // STEP 3: UPDATE STATE MACHINE
  // ============================================
  
  try {
    const stateMachine = await getStateMachine(gameState.gameId);
    await stateMachine.transition({
      type: 'GAME_COMPLETE',
      data: {
        winner: winningSide,
        winningCard: winningCard,
        round: gameState.currentRound
      }
    });
    
    console.log(`✅ State machine updated to complete phase`);
  } catch (error) {
    console.error(`❌ Error updating state machine:`, error);
    // Continue with game completion even if state machine update fails
  }
  
  // Update local game state
  gameState.winner = winningSide;
  gameState.winningCard = winningCard;
  gameState.phase = 'complete';
  gameState.bettingLocked = true;
  
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
  
  // ============================================
  // STEP 4: CALCULATE PAYOUTS
  // ============================================
  
  const payouts: Array<{ userId: string; amount: number }> = [];
  const winningBetIds: string[] = [];
  const losingBetIds: string[] = [];
  
  let totalBetsAmount = 0;
  let totalPayoutsAmount = 0;
  const uniquePlayers = gameState.userBets.size;
  
  // Get all bets for this game
  const allBets = await storage.getBetsForGame(gameState.gameId);
  
  console.log(`📊 Processing ${allBets.length} bets for ${uniquePlayers} players`);
  
  // Get correct payout multiplier from database function
  const multiplier = await storage.getPayoutMultiplier(gameState.currentRound);
  
  console.log(`💰 Round ${gameState.currentRound} payout multiplier: ${multiplier}x`);
  
  // Calculate payouts for each user
  for (const [userId, userBets] of Array.from(gameState.userBets.entries())) {
    const totalUserBets = 
      userBets.round1.andar + 
      userBets.round1.bahar + 
      userBets.round2.andar + 
      userBets.round2.bahar;
    
    if (totalUserBets === 0) {
      console.log(`⚠️ User ${userId} has no bets, skipping`);
      continue;
    }
    
    totalBetsAmount += totalUserBets;
    
    let payout = 0;
    
    // ✅ CORRECT PAYOUT LOGIC
    if (gameState.currentRound === 1) {
      // Round 1: Winner gets 1.9x, loser gets 0
      const userBetOnWinner = userBets.round1[winningSide];
      payout = userBetOnWinner * multiplier;
    } else if (gameState.currentRound === 2) {
      // Round 2: 
      // - Winner's Round 1 bets: 1.75x
      // - Winner's Round 2 bets: 1.75x
      // - Loser's bets: 0
      const round1Bet = userBets.round1[winningSide];
      const round2Bet = userBets.round2[winningSide];
      payout = (round1Bet + round2Bet) * multiplier;
    } else {
      // Round 3+: Winner gets 1.0x (refund), loser gets 0
      const userBetOnWinner = 
        userBets.round1[winningSide] + 
        userBets.round2[winningSide];
      payout = userBetOnWinner * multiplier;
    }
    
    totalPayoutsAmount += payout;
    
    if (payout > 0) {
      payouts.push({ userId, amount: payout });
    }
    
    // Categorize bets as winning/losing
    for (const bet of allBets) {
      const betUserId = (bet as any).user_id || (bet as any).userId;
      if (betUserId === userId) {
        if (bet.side === winningSide && payout > 0) {
          winningBetIds.push(bet.id);
        } else {
          losingBetIds.push(bet.id);
        }
      }
    }
    
    const netProfit = payout - totalUserBets;
    console.log(`💰 User ${userId}: Bet ₹${totalUserBets} → Payout ₹${payout} (Net: ${netProfit >= 0 ? '+' : ''}₹${netProfit})`);
  }
  
  const houseProfitLoss = totalBetsAmount - totalPayoutsAmount;
  const profitLossPercentage = totalBetsAmount > 0 ? (houseProfitLoss / totalBetsAmount) * 100 : 0;
  
  console.log(`📊 Game Summary: Bets ₹${totalBetsAmount}, Payouts ₹${totalPayoutsAmount}, House P/L ₹${houseProfitLoss} (${profitLossPercentage.toFixed(2)}%)`);
  
  // ============================================
  // STEP 5: APPLY PAYOUTS ATOMICALLY
  // ============================================
  
  const payoutStartTime = Date.now();
  let payoutSuccess = false;
  
  try {
    console.log(`💾 Applying payouts atomically (${payouts.length} payouts, ${winningBetIds.length} winning bets)`);
    
    // ✅ USE NEW ATOMIC FUNCTION
    const results = await storage.applyPayoutsAtomic(
      payouts,
      winningBetIds,
      losingBetIds
    );
    
    // Check results
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.error(`❌ ${failed.length} payouts failed:`, failed);
      throw new Error(`${failed.length} payouts failed`);
    }
    
    console.log(`✅ All ${payouts.length} payouts applied successfully in ${Date.now() - payoutStartTime}ms`);
    payoutSuccess = true;
    
  } catch (error) {
    console.error(`❌ Atomic payout failed:`, error);
    
    // ✅ NO FALLBACK - if atomic operation fails, game should not complete
    // This prevents partial payouts and data corruption
    
    broadcastToRole({
      type: 'error',
      data: {
        message: 'Critical payout error - game completion aborted',
        code: 'PAYOUT_ATOMIC_FAILURE',
        error: error instanceof Error ? error.message : String(error)
      }
    }, 'admin');
    
    throw error; // Abort game completion
  }
  
  // ============================================
  // STEP 6: SEND WEBSOCKET NOTIFICATIONS
  // ============================================
  
  const wsStartTime = Date.now();
  
  // Batch fetch balances
  const userIds = Array.from(gameState.userBets.keys());
  const balanceMap = new Map<string, number>();
  
  if (userIds.length > 0) {
    const users = await storage.getUsersBalances(userIds);
    users.forEach((u: any) => balanceMap.set(u.id, u.balance));
  }
  
  // Send payout notifications
  for (const payout of payouts) {
    const client = Array.from(clients).find(c => c.userId === payout.userId);
    if (!client) continue;
    
    const userBets = gameState.userBets.get(payout.userId);
    if (!userBets) continue;
    
    const totalUserBets = 
      userBets.round1.andar + 
      userBets.round1.bahar + 
      userBets.round2.andar + 
      userBets.round2.bahar;
    
    const netProfit = payout.amount - totalUserBets;
    const balance = balanceMap.get(payout.userId) || 0;
    
    client.ws.send(JSON.stringify({
      type: 'payout_received',
      data: {
        amount: payout.amount,
        balance: balance,
        totalBetAmount: totalUserBets,
        netProfit: netProfit,
        winner: winningSide,
        round: gameState.currentRound,
        result: payout.amount > 0 ? 'win' : 'loss',
        multiplier: multiplier
      }
    }));
  }
  
  // Send game_complete to all clients
  broadcast({
    type: 'game_complete',
    data: {
      winner: winningSide,
      winningCard: winningCard,
      round: gameState.currentRound,
      totalBets: totalBetsAmount,
      totalPayouts: totalPayoutsAmount,
      message: `${winningSide.toUpperCase()} wins with ${winningCard}!`
    }
  });
  
  console.log(`✅ WebSocket notifications sent in ${Date.now() - wsStartTime}ms`);
  
  // ============================================
  // STEP 7: SAVE GAME HISTORY (ASYNC)
  // ============================================
  
  const saveGameHistoryAsync = async () => {
    try {
      const historyData = {
        gameId: gameState.gameId,
        openingCard: gameState.openingCard || 'UNKNOWN', // ✅ Handle null case
        winner: winningSide,
        winningCard: winningCard,
        winningRound: gameState.currentRound,
        totalCards: gameState.andarCards.length + gameState.baharCards.length,
        totalBets: totalBetsAmount.toString(), // ✅ Convert to string
        totalPayouts: totalPayoutsAmount.toString(), // ✅ Convert to string
        roundPayouts: {
          round1: { 
            andar: gameState.round1Bets.andar, 
            bahar: gameState.round1Bets.bahar 
          },
          round2: { 
            andar: gameState.round2Bets.andar, 
            bahar: gameState.round2Bets.bahar 
          }
        }
      };
      
      await storage.saveGameHistory(historyData);
      console.log(`✅ Game history saved`);
      
      // Save statistics
      await storage.saveGameStatistics({
        gameId: gameState.gameId,
        totalPlayers: uniquePlayers,
        totalBets: totalBetsAmount,
        totalWinnings: totalPayoutsAmount,
        houseEarnings: houseProfitLoss,
        profitLoss: houseProfitLoss,
        profitLossPercentage: profitLossPercentage,
        housePayout: totalPayoutsAmount,
        uniquePlayers: uniquePlayers
      } as any);
      
      console.log(`✅ Game statistics saved`);
      
      // Mark game session as completed
      await storage.completeGameSession(gameState.gameId, winningSide, winningCard);
      console.log(`✅ Game session marked as completed`);
      
    } catch (error) {
      console.error(`❌ Error saving game history:`, error);
      
      broadcastToRole({
        type: 'error',
        data: {
          message: 'Game history save failed',
          code: 'HISTORY_SAVE_FAILURE',
          error: error instanceof Error ? error.message : String(error)
        }
      }, 'admin');
    }
  };
  
  // Execute in background
  saveGameHistoryAsync();
  
  const totalDuration = Date.now() - startTime;
  console.log(`🎉 Game completion finished in ${totalDuration}ms (history saving in background)`);
}

/**
 * Place a bet with state machine validation
 */
export async function placeBet(
  gameState: GameState,
  userId: string,
  side: 'andar' | 'bahar',
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get state machine
    const stateMachine = await getStateMachine(gameState.gameId);
    
    // Check if betting is allowed
    if (!stateMachine.canPlaceBet()) {
      return {
        success: false,
        error: `Betting not allowed in phase ${stateMachine.getCurrentPhase()}`
      };
    }
    
    // Validate round
    const currentRound = stateMachine.getCurrentRound();
    if (currentRound !== gameState.currentRound) {
      console.warn(`⚠️ Round mismatch: state machine=${currentRound}, gameState=${gameState.currentRound}`);
    }
    
    // Place bet in database
    const bet = await storage.createBet({
      userId: userId,
      gameId: gameState.gameId,
      round: currentRound.toString(),
      side: side,
      amount: amount
    } as any);
    
    // Update game state
    if (!gameState.userBets.has(userId)) {
      gameState.userBets.set(userId, {
        round1: { andar: 0, bahar: 0 },
        round2: { andar: 0, bahar: 0 }
      });
    }
    
    const userBets = gameState.userBets.get(userId)!;
    if (currentRound === 1) {
      userBets.round1[side] += amount;
      gameState.round1Bets[side] += amount;
    } else if (currentRound === 2) {
      userBets.round2[side] += amount;
      gameState.round2Bets[side] += amount;
    }
    
    console.log(`✅ Bet placed: User ${userId}, ${side}, ₹${amount}, Round ${currentRound}`);
    
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Error placing bet:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Deal a card with state machine validation
 */
export async function dealCard(
  gameState: GameState,
  card: string,
  side: 'andar' | 'bahar'
): Promise<{ success: boolean; winner?: 'andar' | 'bahar'; error?: string }> {
  try {
    // Get state machine
    const stateMachine = await getStateMachine(gameState.gameId);
    
    // Check if dealing is allowed
    if (!stateMachine.canDealCard()) {
      return {
        success: false,
        error: `Dealing not allowed in phase ${stateMachine.getCurrentPhase()}`
      };
    }
    
    // Add card to game state
    if (side === 'andar') {
      gameState.andarCards.push(card);
    } else {
      gameState.baharCards.push(card);
    }
    
    // Check for winner
    const cardValue = card.slice(0, -1); // Remove suit
    const openingCardValue = gameState.openingCard?.slice(0, -1);
    
    let winner: 'andar' | 'bahar' | undefined;
    if (cardValue === openingCardValue) {
      winner = side;
    }
    
    // Update state machine
    await stateMachine.transition({
      type: 'CARD_DEALT',
      data: {
        card: card,
        side: side,
        andarCount: gameState.andarCards.length,
        baharCount: gameState.baharCards.length,
        winner: winner
      }
    });
    
    console.log(`🎴 Card dealt: ${card} on ${side}, Winner: ${winner || 'none'}`);
    
    return { success: true, winner: winner };
    
  } catch (error) {
    console.error(`❌ Error dealing card:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reset state machine for new game
 */
export async function resetStateMachine(): Promise<void> {
  if (currentStateMachine) {
    await currentStateMachine.transition({
      type: 'GAME_RESET',
      data: {}
    });
  }
  currentStateMachine = null;
  console.log(`🔄 State machine reset for new game`);
}

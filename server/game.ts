
import { broadcastToRole, GameState } from './routes';
import { storage } from './storage-supabase';

/**
 * Completes a game, calculates payouts, and updates player balances.
 * This version properly implements Andar Bahar rules and saves complete game data to the database.
 *
 * @param winningSide - The winning side ('andar' or 'bahar').
 * @param winningCard - The card that won the game.
 */
export async function completeGame(gameState: GameState, winningSide: 'andar' | 'bahar', winningCard: string) {
  console.log(`Game complete! Winner: ${winningSide}, Card: ${winningCard}, Round: ${gameState.currentRound}`);
  
  // ✅ CRITICAL FIX: Ensure valid game ID FIRST, before any database operations
  // This fixes the issue where gameId was 'default-game' or invalid, causing operations to be skipped
  if (!gameState.gameId || 
      typeof gameState.gameId !== 'string' || 
      gameState.gameId.trim() === '' ||
      gameState.gameId === 'default-game') {
    gameState.gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.warn(`⚠️ Game ID was invalid or missing, generated new ID: ${gameState.gameId}`);
  }
  
  // ✅ FIX: Ensure opening card exists, use fallback if missing
  if (!gameState.openingCard) {
    gameState.openingCard = 'UNKNOWN';
    console.warn(`⚠️ Opening card was missing, using fallback: UNKNOWN`);
  }
  
  gameState.winner = winningSide;
  gameState.winningCard = winningCard;
  gameState.phase = 'complete';
  gameState.bettingLocked = true;
  
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
  
  // Calculate payouts and analytics
  const payouts: Record<string, number> = {};
  let totalBetsAmount = 0;
  let totalPayoutsAmount = 0;
  let uniquePlayers = 0;
  
  // Calculate total bets for this game
  totalBetsAmount = (
    gameState.round1Bets.andar +
    gameState.round1Bets.bahar +
    gameState.round2Bets.andar +
    gameState.round2Bets.bahar
  );
  
  uniquePlayers = gameState.userBets.size;
  
  // OPTIMIZATION: Calculate all payouts and send optimistic WebSocket updates FIRST
  const payoutNotifications: Array<{
    userId: string;
    payout: number;
    newBalance?: number;
    betAmount?: number;
    result: 'win' | 'loss' | 'no_bet';
  }> = [];
  
  // Calculate individual payouts for each user (proper Andar Bahar rules)
  for (const [userId, userBets] of gameState.userBets.entries()) {
    // Get user's total bets for this game
    const totalUserBets = 
      userBets.round1.andar + 
      userBets.round1.bahar + 
      userBets.round2.andar + 
      userBets.round2.bahar;
    
    if (totalUserBets === 0) continue; // Skip users with no bets
    
    let payout = 0;
    
    // Apply proper Andar Bahar rules for payout calculation
    if (gameState.currentRound === 1) {
      // Round 1: Andar wins 1:1 (double), Bahar wins 1:0 (refund only)
      if (winningSide === 'andar') {
        payout = userBets.round1.andar * 2; // 1:1 payout (stake + profit)
      } else { // winningSide === 'bahar'
        payout = userBets.round1.bahar; // 1:0 payout (refund only)
      }
    } else if (gameState.currentRound === 2) {
      // Round 2: Andar wins 1:1 on all Andar bets, Bahar wins mixed (1:1 on R1, 1:0 on R2)
      if (winningSide === 'andar') {
        payout = (userBets.round1.andar + userBets.round2.andar) * 2; // 1:1 on all Andar bets
      } else { // winningSide === 'bahar'
        payout = (userBets.round1.bahar * 2) + userBets.round2.bahar; // 1:1 on R1 + 1:0 on R2
      }
    } else {
      // Round 3 (Continuous Draw): Both sides win 1:1 on total combined bets
      payout = (userBets.round1[winningSide] + userBets.round2[winningSide]) * 2; // 1:1 on winning bets
    }
    
    // Update total payout amount
    totalPayoutsAmount += payout;
    
    // Store payout for this user
    payouts[userId] = payout;
    
    // Determine result type
    const result = payout > 0 ? 'win' : (totalUserBets > 0 ? 'loss' : 'no_bet');
    
    // Add to notification queue for WebSocket broadcasting
    payoutNotifications.push({
      userId,
      payout,
      betAmount: totalUserBets,
      result
    });
  }
  
  // Calculate company profit/loss
  const companyProfitLoss = totalBetsAmount - totalPayoutsAmount;
  const profitLossPercentage = totalBetsAmount > 0 ? (companyProfitLoss / totalBetsAmount) * 100 : 0;
  
  console.log(`💰 Game Analytics - Bets: ₹${totalBetsAmount}, Payouts: ₹${totalPayoutsAmount}, Profit: ₹${companyProfitLoss} (${profitLossPercentage.toFixed(2)}%)`);
  
  // OPTIMIZATION: Prepare bet update for database in advance
  const winningBetIds: string[] = [];
  const losingBetIds: string[] = [];
  
  // Get all bets for this game and categorize as winning/losing
  const allBets = await storage.getBetsForGame(gameState.gameId);
  
  for (const bet of allBets) {
    if (bet.side === winningSide) {
      winningBetIds.push(bet.id);
    } else {
      losingBetIds.push(bet.id);
    }
  }
  
  // OPTIMIZATION: Prepare bulk payout array for database transaction
  const payoutArray: Array<{ userId: string; amount: number; actual_payout?: number }> = [];
  for (const [userId, payout] of Object.entries(payouts)) {
    payoutArray.push({ userId, amount: payout, actual_payout: payout });
  }
  
  // STEP 1: Update database with bet statuses and payouts ATOMICALLY
  try {
    await storage.applyPayoutsAndupdateBets(
      payoutArray.map(p => ({ userId: p.userId, amount: p.amount })),
      winningBetIds,
      losingBetIds
    );
    console.log(`✅ Database updated: ${payoutArray.length} payout records, ${winningBetIds.length} winning bets, ${losingBetIds.length} losing bets`);
  } catch (error) {
    console.error('❌ CRITICAL ERROR updating database with payouts:', error);
    // Broadcast error to admins only
    broadcastToRole({
      type: 'error',
      data: { 
        message: 'CRITICAL ERROR: Game completed but database update failed. Contact admin immediately.',
        code: 'PAYOUT_DB_ERROR',
        error: error instanceof Error ? error.message : String(error)
      }
    }, 'admin');
    return; // Don't continue if database update failed
  }
  
  // STEP 2: Send WebSocket updates with more detailed information
  const clients = (global as any).clients as Set<{ ws: any; userId: string; role: string; wallet: number }>;
  
  // Send payout notifications to players who won, with detailed breakdown
  for (const notification of payoutNotifications) {
    const client = Array.from(clients).find(c => c.userId === notification.userId);
    if (client) {
      try {
        // Send payout details to the winning player
        client.ws.send(JSON.stringify({
          type: 'payout_received',
          data: {
            amount: notification.payout,
            betAmount: notification.betAmount,
            winner: winningSide,
            round: gameState.currentRound,
            result: notification.result,
            payoutBreakdown: {
              winningBets: winningSide === 'andar' ? 
                (gameState.currentRound === 1 ? gameState.round1Bets.andar : 
                 gameState.currentRound === 2 ? (gameState.round1Bets.andar + gameState.round2Bets.andar) :
                 gameState.round1Bets.andar + gameState.round2Bets.andar) :
                (gameState.currentRound === 1 ? gameState.round1Bets.bahar :
                 gameState.currentRound === 2 ? (gameState.round1Bets.bahar * 2 + gameState.round2Bets.bahar) :
                 gameState.round1Bets[winningSide] + gameState.round2Bets[winningSide]),
              multiplier: 2 // 1:1 payout for winners
            }
          }
        }));
        
        console.log(`💸 Sent payout notification to user ${notification.userId}: ₹${notification.payout}`);
      } catch (error) {
        console.error(`❌ Error sending payout notification to user ${notification.userId}:`, error);
      }
    }
  }
  
  // STEP 3: Broadcast game completion to ALL clients
  broadcastToRole({
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
  
  // STEP 4: Save game history to database with comprehensive analytics
  if (gameState.gameId && gameState.gameId !== 'default-game') {
    try {
      // Calculate total cards dealt
      const totalCards = gameState.andarCards.length + gameState.baharCards.length;
      
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
      
      await storage.saveGameHistory(historyData as any);
      console.log(`✅ Game history saved successfully for gameId: ${gameState.gameId}`);
      
      // Mark game session as completed in database
      await storage.completeGameSession(gameState.gameId, winningSide, winningCard);
      console.log(`✅ Game session completed in database: ${gameState.gameId}`);
    } catch (error) {
      console.error('❌ ERROR saving game history:', error);
      console.error('Game details:', {
        gameId: gameState.gameId,
        winner: winningSide,
        winningCard: winningCard,
        round: gameState.currentRound
      });
    }
  } else {
    console.error(`❌ CRITICAL: Cannot save game history - gameId is null/undefined`);
  }
  
  // STEP 5: Broadcast analytics updates to admin clients
  try {
    // Get current stats for analytics broadcast
    const currentGameStats = {
      id: gameState.gameId,
      phase: 'complete',
      currentRound: gameState.currentRound,
      timer: 0,
      andarTotal: gameState.round1Bets.andar + gameState.round2Bets.andar,
      baharTotal: gameState.round1Bets.bahar + gameState.round2Bets.bahar,
      bettingLocked: true,
      totalPlayers: uniquePlayers
    };

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStats = {
      totalGames: 1,
      totalBets: totalBetsAmount,
      totalPayouts: totalPayoutsAmount,
      profitLoss: companyProfitLoss,
      profitLossPercentage: profitLossPercentage,
      uniquePlayers: uniquePlayers
    };

    // Broadcast comprehensive analytics update
    broadcastToRole({
      type: 'analytics_update',
      data: {
        currentGame: currentGameStats,
        todayStats,
        todayGameCount: 1,
        todayBetTotal: totalBetsAmount,
        todayPlayers: uniquePlayers
      }
    }, 'admin');
    
    // Broadcast game history update to ALL users (basic data only)
    broadcast({
      type: 'game_history_update',
      data: {
        gameId: gameState.gameId,
        openingCard: gameState.openingCard,
        winner: winningSide,
        winningCard: winningCard,
        round: gameState.currentRound,
        totalCards: gameState.andarCards.length + gameState.baharCards.length,
        createdAt: new Date().toISOString()
      }
    });
    
    // Broadcast detailed analytics to admins only (with financial data) - separate event type
    broadcastToRole({
      type: 'game_history_update_admin',
      data: {
        gameId: gameState.gameId,
        openingCard: gameState.openingCard,
        winner: winningSide,
        winningCard: winningCard,
        totalBets: totalBetsAmount,
        totalPayouts: totalPayoutsAmount,
        andarTotalBet: gameState.round1Bets.andar + gameState.round2Bets.andar,
        baharTotalBet: gameState.round1Bets.bahar + gameState.round2Bets.bahar,
        totalPlayers: uniquePlayers,
        totalCards: gameState.andarCards.length + gameState.baharCards.length,
        round: gameState.currentRound,
        createdAt: new Date().toISOString()
      }
    }, 'admin');
    
    console.log('✅ Analytics updates broadcasted to admin clients');
  } catch (error) {
    console.error('⚠️ Error broadcasting analytics updates:', error);
  }
  
  // Determine payout message and winner display based on winner and round
  let payoutMessage = '';
  let winnerDisplay = '';
  
  if (gameState.currentRound === 1) {
    if (winningSide === 'andar') {
      payoutMessage = 'Andar wins! Payout: 1:1 (Double money) 💰';
      winnerDisplay = 'ANDAR WON';
    } else {
      payoutMessage = 'Baba wins! Payout: 1:0 (Refund only) 💵';
      winnerDisplay = 'BABA WON'; // Round 1 Bahar = Baba Won
    }
  } else if (gameState.currentRound === 2) {
    if (winningSide === 'andar') {
      payoutMessage = 'Andar wins! Payout: 1:1 on all Andar bets 🎰';
      winnerDisplay = 'ANDAR WON';
    } else {
      payoutMessage = 'Baba wins! Payout: 1:1 on Round 1 + 1:0 on Round 2 💸';
      winnerDisplay = 'BABA WON';
    }
  } else {
    payoutMessage = `${winningSide.toUpperCase()} wins! Payout: 1:1 on winning bets 🎉`;
    winnerDisplay = `${winningSide.toUpperCase()} WON`;
  }
  
  console.log(`🏆 GAME COMPLETED: ${winnerDisplay} - ${payoutMessage}`);
  
  // STEP 6: Update game session in database and reset for next game
  try {
    await storage.updateGameSession(gameState.gameId, {
      phase: 'complete',
      current_round: gameState.currentRound,
      winner: winningSide,
      winning_card: winningCard,
      status: 'completed',
      updated_at: new Date()
    });
    
    console.log('✅ Game session marked as completed in database');
  } catch (error) {
    console.error('⚠️ Error updating game session in database:', error);
  }
  
  // STEP 7: Reset game state for next game
  gameState.reset();
  
  console.log('🔄 Game state reset for next game');
}

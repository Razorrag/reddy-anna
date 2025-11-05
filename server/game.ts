
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
  
  // ✅ FIX: Log if no players bet, but continue with game completion
  if (uniquePlayers === 0) {
    console.log('⚠️ No players bet in this game, but game history will still be saved');
  }
  
  // OPTIMIZATION: Calculate all payouts and send optimistic WebSocket updates FIRST
  const payoutNotifications: Array<{
    userId: string;
    payout: number;
    newBalance?: number;
    betAmount?: number;
    result: 'win' | 'loss' | 'no_bet';
  }> = [];
  
  // Calculate individual payouts for each user (proper Andar Bahar rules)
  for (const [userId, userBets] of Array.from(gameState.userBets.entries())) {
    // Get user's total bets for this game
    const totalUserBets = 
      userBets.round1.andar + 
      userBets.round1.bahar + 
      userBets.round2.andar + 
      userBets.round2.bahar;
    
    if (totalUserBets === 0) continue; // Skip users with no bets
    
    let payout = 0;
    
    // ✅ FIX: Apply proper Andar Bahar rules for payout calculation
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
        // ✅ FIX: Andar wins 1:1 on ALL Andar bets (Round 1 + Round 2)
        payout = (userBets.round1.andar + userBets.round2.andar) * 2; // 1:1 on all Andar bets
      } else { // winningSide === 'bahar'
        // ✅ FIX: Bahar wins 1:1 on Round 1 bets, 1:0 (refund) on Round 2 bets
        payout = (userBets.round1.bahar * 2) + userBets.round2.bahar; // 1:1 on R1 + 1:0 on R2
      }
    } else {
      // Round 3 (Continuous Draw): Both sides win 1:1 on total combined bets
      // ✅ FIX: Round 3 - both sides get 1:1 payout on all their bets
      const totalBetsOnWinningSide = userBets.round1[winningSide] + userBets.round2[winningSide];
      payout = totalBetsOnWinningSide * 2; // 1:1 on all winning bets
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
  // ✅ CRITICAL FIX: Decouple payout processing from game history saving
  // Game history MUST be saved even if payouts fail
  let payoutSuccess = false;
  let fallbackUsed = false;
  let payoutError: any = null;
  
  try {
    await storage.applyPayoutsAndupdateBets(
      payoutArray.map(p => ({ userId: p.userId, amount: p.amount })),
      winningBetIds,
      losingBetIds
    );
    console.log(`✅ Database updated: ${payoutArray.length} payout records, ${winningBetIds.length} winning bets, ${losingBetIds.length} losing bets`);
    payoutSuccess = true;
    
    // ✅ FIX: Update user game statistics for each player after successful payout
    for (const [userId, userBets] of Array.from(gameState.userBets.entries())) {
      const totalUserBets = 
        userBets.round1.andar + 
        userBets.round1.bahar + 
        userBets.round2.andar + 
        userBets.round2.bahar;
      
      if (totalUserBets > 0) {
        const userPayout = payouts[userId] || 0;
        const won = userPayout > 0;
        
        try {
          await storage.updateUserGameStats(userId, won, totalUserBets, userPayout);
          console.log(`✅ Updated stats for user ${userId}: won=${won}, bet=${totalUserBets}, payout=${userPayout}`);
        } catch (statsError) {
          console.error(`⚠️ Failed to update stats for user ${userId}:`, statsError);
          // Don't fail the entire operation if stats update fails
        }
      }
    }
  } catch (error) {
    payoutError = error;
    console.error('❌ CRITICAL ERROR updating database with payouts:', error);
    console.error('⚠️ Attempting fallback to individual updates...');
    fallbackUsed = true;
    
    // ✅ FIX: Fallback to individual updates if RPC fails
    try {
      console.log('🔄 Fallback: Processing payouts individually...');
      
      // ✅ OPTIMIZATION: Fetch all bets once instead of per user
      const allBetsForGame = await storage.getBetsForGame(gameState.gameId);
      
      // ✅ FIX: Process payouts in batches to reduce transaction overhead
      const batchSize = 10;
      const payoutBatches: Array<typeof payoutNotifications> = [];
      
      for (let i = 0; i < payoutNotifications.length; i += batchSize) {
        payoutBatches.push(payoutNotifications.slice(i, i + batchSize));
      }
      
      // Process each batch sequentially
      for (const batch of payoutBatches) {
        await Promise.all(
          batch.map(async (notification) => {
            try {
              if (notification.payout > 0) {
                // Add balance atomically
                await storage.addBalanceAtomic(notification.userId, notification.payout);
                console.log(`✅ Fallback: Added balance for user ${notification.userId}: ₹${notification.payout}`);
              }
              
              // Update bet statuses for this user (using pre-fetched bets)
              for (const bet of allBetsForGame) {
                const betUserId = (bet as any).user_id || (bet as any).userId;
                if (betUserId === notification.userId) {
                  if (bet.side === winningSide && notification.payout > 0) {
                    await storage.updateBetStatus(bet.id, 'won');
                  } else {
                    await storage.updateBetStatus(bet.id, 'lost');
                  }
                }
              }
              
              console.log(`✅ Fallback: Processed payout for user ${notification.userId}: ₹${notification.payout}`);
            } catch (userError) {
              console.error(`⚠️ Error processing payout for user ${notification.userId}:`, userError);
              // Continue with other users even if one fails
            }
          })
        );
      }
      
      payoutSuccess = true;
      console.log('✅ Fallback: Individual payout processing completed');
    } catch (fallbackError) {
      console.error('❌ CRITICAL: Fallback payout processing also failed:', fallbackError);
      // Still continue to save game history even if all payouts fail
    }
    
    // Broadcast error to admins only
    broadcastToRole({
      type: 'error',
      data: { 
        message: payoutSuccess 
          ? 'WARNING: Payout processing required fallback method. Game history will be saved.'
          : 'CRITICAL ERROR: Payout processing failed. Game history will still be saved.',
        code: 'PAYOUT_DB_ERROR',
        error: payoutError instanceof Error ? payoutError.message : String(payoutError),
        fallbackUsed: fallbackUsed
      }
    }, 'admin');
    
    // ✅ CRITICAL: DO NOT RETURN - continue to save game history even if payouts fail
    // The return statement was preventing game history from being saved
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
  
  // ✅ FIX: STEP 3: Broadcast game completion to ALL clients (not just admins)
  // Use broadcast instead of broadcastToRole to ensure all clients receive the message
  if (typeof (global as any).broadcast === 'function') {
    (global as any).broadcast({
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
  } else {
    // Fallback to broadcastToRole if broadcast not available
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
    }, 'admin'); // This will only go to admins, but better than nothing
    console.warn('⚠️ broadcast function not available, using broadcastToRole as fallback');
  }
  
  // STEP 4: Save game history to database with comprehensive analytics
  // ✅ CRITICAL: This MUST run even if payouts failed - game history is more important
  if (gameState.gameId && gameState.gameId !== 'default-game') {
    // ✅ FIX: Add retry logic for game history save
    const maxRetries = 3;
    let historySaveSuccess = false;
    let lastHistoryError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Calculate total cards dealt
        const totalCards = gameState.andarCards.length + gameState.baharCards.length;
        
        // ✅ FIX: Validate all required data before saving
        if (!gameState.openingCard || !winningSide || !winningCard) {
          throw new Error(`Missing required game data: openingCard=${!!gameState.openingCard}, winner=${!!winningSide}, winningCard=${!!winningCard}`);
        }
        
        // Prepare history data
        const historyData = {
          gameId: gameState.gameId,
          openingCard: gameState.openingCard,
          winner: winningSide,
          winningCard: winningCard,
          totalCards: totalCards,
          winningRound: gameState.currentRound, // ✅ FIX: Use correct field name
          totalBets: totalBetsAmount,
          totalPayouts: totalPayoutsAmount,
          createdAt: new Date().toISOString()
        };
        
        await storage.saveGameHistory(historyData as any);
        console.log(`✅ Game history saved successfully for gameId: ${gameState.gameId} (attempt ${attempt})`);
        
        // ✅ FIX: Complete session immediately after history save (in same transaction context)
        try {
          await storage.completeGameSession(gameState.gameId, winningSide, winningCard);
          console.log(`✅ Game session completed in database: ${gameState.gameId}`);
        } catch (completeError) {
          // ✅ FIX: If completion fails, log critical error and retry
          console.error(`❌ CRITICAL: Failed to complete game session after history save:`, completeError);
          throw new Error(`Game history saved but session completion failed: ${completeError instanceof Error ? completeError.message : String(completeError)}`);
        }
        
        historySaveSuccess = true;
        
        // ✅ FIX: Save game statistics after history is saved
        try {
          await storage.saveGameStatistics({
            gameId: gameState.gameId,
            totalPlayers: uniquePlayers,
            totalBets: totalBetsAmount,
            totalWinnings: totalPayoutsAmount,
            houseEarnings: companyProfitLoss,
            andarBetsCount: allBets.filter(b => b.side === 'andar').length,
            baharBetsCount: allBets.filter(b => b.side === 'bahar').length,
            andarTotalBet: gameState.round1Bets.andar + gameState.round2Bets.andar,
            baharTotalBet: gameState.round1Bets.bahar + gameState.round2Bets.bahar,
            profitLoss: companyProfitLoss,
            profitLossPercentage: profitLossPercentage,
            housePayout: totalPayoutsAmount,
            gameDuration: 0,
            uniquePlayers: uniquePlayers
          });
          console.log(`✅ Game statistics saved for gameId: ${gameState.gameId}`);
        } catch (statsError) {
          console.error(`⚠️ Failed to save game statistics:`, statsError);
          // Don't fail the entire operation if statistics save fails
        }
        
        // ✅ ADDITIONAL FIX: Persist game state one more time to ensure completion status is saved
        if (typeof (global as any).persistGameState === 'function') {
          await (global as any).persistGameState();
          console.log(`✅ Final game state persisted for gameId: ${gameState.gameId}`);
        }
        
        break; // Success, exit retry loop
      } catch (error) {
        lastHistoryError = error;
        console.error(`❌ Game history save attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          console.log(`🔄 Retrying game history save (attempt ${attempt + 1}/${maxRetries})...`);
        } else {
          // Final attempt failed
          console.error('❌ CRITICAL ERROR: All game history save attempts failed');
          console.error('Game details:', {
            gameId: gameState.gameId,
            winner: winningSide,
            winningCard: winningCard,
            round: gameState.currentRound
          });
          
          // ✅ CRITICAL: Broadcast error to admins
          broadcastToRole({
            type: 'error',
            data: { 
              message: 'CRITICAL: Game history save failed after all retries. Game data may be lost.',
              code: 'HISTORY_SAVE_ERROR',
              error: error instanceof Error ? error.message : String(error),
              attempts: maxRetries
            }
          }, 'admin');
        }
      }
    }
    
    if (!historySaveSuccess) {
      console.error(`❌ CRITICAL: Failed to save game history after ${maxRetries} attempts`);
      console.error('Last error:', lastHistoryError);
    }
  } else {
    console.error(`❌ CRITICAL: Cannot save game history - gameId is null/undefined`);
    
    // ✅ CRITICAL: Broadcast error even if gameId is invalid
    broadcastToRole({
      type: 'error',
      data: { 
        message: 'CRITICAL: Cannot save game history - invalid gameId',
        code: 'INVALID_GAME_ID',
        gameId: gameState.gameId
      }
    }, 'admin');
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
      winner: winningSide,
      winningCard: winningCard,
      status: 'completed'
    } as any); // Cast to any since storage layer handles snake_case conversion
    
    console.log('✅ Game session marked as completed in database');
  } catch (error) {
    console.error('⚠️ Error updating game session in database:', error);
  }
  
  // STEP 7: Reset game state for next game
  gameState.reset();
  
  console.log('🔄 Game state reset for next game');
}

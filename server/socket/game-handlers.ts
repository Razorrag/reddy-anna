/**
 * WEBSOCKET GAME HANDLERS
 *
 * Extracts WebSocket event handlers from server/index.ts
 * Handles all game-related socket events with validation
 */

import { WebSocket } from 'ws';
import { completeGame } from '../game';

// WSClient interface to match the main routes.ts file
interface WSClient {
  ws: WebSocket;
  userId: string;
  role: 'player' | 'admin';
  wallet: number;
}

/**
 * Register all game-related socket handlers
 * This function is now integrated with the main WebSocket connection in routes.ts
 */
export function registerGameHandlers() {
  console.log('Game handlers registered - integrated with main WebSocket server');
}

/**
 * Handle player bet
 */
export async function handlePlayerBet(client: WSClient, data: any) {
  const { ws, userId, role } = client;

  // Validate authentication
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('Client not connected');
    return;
  }

  // Validate role (only players can bet)
  if (role === 'admin') {
    sendError(ws, 'Admins cannot place bets');
    return;
  }

  // Validate input data
  if (!data || typeof data !== 'object') {
    sendError(ws, 'Invalid bet data');
    return;
  }

  const { gameId, side, amount, round } = data;

  // ✅ FIX: Validate gameId early - server is single source of truth
  const currentGameState = (global as any).currentGameState;
  if (!currentGameState || !currentGameState.gameId) {
    sendError(ws, 'No active game session. Please wait for admin to start the game.');
    return;
  }

  // ✅ FIX: Reject invalid gameIds from client
  if (gameId && (gameId === 'default-game' || gameId === '')) {
    sendError(ws, 'Invalid game ID. Please refresh the page.');
    return;
  }

  // ✅ FIX: If client sends gameId, verify it matches server's gameId
  if (gameId && gameId !== currentGameState.gameId) {
    console.warn(`⚠️ Client sent stale gameId: ${gameId}, server has: ${currentGameState.gameId}`);
    sendError(ws, 'Game session mismatch. Please refresh the page.');
    return;
  }

  // Validate required fields
  if (!side || !amount || !round) {
    sendError(ws, 'Missing required fields: side, amount, round');
    return;
  }

  if (side !== 'andar' && side !== 'bahar') {
    sendError(ws, 'side must be "andar" or "bahar"');
    return;
  }

  if (typeof amount !== 'number' || amount <= 0) {
    sendError(ws, 'amount must be a positive number');
    return;
  }

  // ✅ FIX: Validate round is a number
  if (typeof round !== 'number' || round < 1 || round > 2) {
    sendError(ws, 'round must be a number (1 or 2)');
    return;
  }

  // ✅ FIX: Validate bet amount against MIN_BET and MAX_BET limits
  const { storage } = await import('../storage-supabase');
  let minBet = 1000; // Default
  let maxBet = 100000; // Default
  
  try {
    const minBetSetting = await storage.getGameSetting('min_bet_amount') || '1000';
    const maxBetSetting = await storage.getGameSetting('max_bet_amount') || '100000';
    minBet = parseInt(minBetSetting) || 1000;
    maxBet = parseInt(maxBetSetting) || 100000;
  } catch (error) {
    console.warn('Could not fetch bet limits, using defaults:', error);
  }
  
  if (amount < minBet) {
    sendError(ws, `Minimum bet amount is ₹${minBet}`);
    return;
  }
  
  if (amount > maxBet) {
    sendError(ws, `Maximum bet amount is ₹${maxBet}`);
    return;
  }

  try {
    // Use the actual game logic from routes.ts - import required dependencies
    console.log(`📝 BET REQUEST: User ${userId} wants to bet ₹${amount} on ${side} for round ${round}`);

    // NEW: Enhanced phase and timing validation
    const currentGameState = (global as any).currentGameState;
    
    // Check if game exists
    if (!currentGameState) {
      sendError(ws, 'No active game session');
      return;
    }
    
    // Check game phase
    if (currentGameState.phase !== 'betting') {
      sendError(ws, `Betting is not open. Current phase: ${currentGameState.phase}`);
      return;
    }

    // Check if betting is locked
    if (currentGameState.bettingLocked) {
      sendError(ws, 'Betting period has ended');
      return;
    }

    // Check timer if applicable
    if (currentGameState.timer <= 0) {
      sendError(ws, 'Betting time has expired');
      // Update betting locked in case timer ran out but wasn't properly updated
      currentGameState.bettingLocked = true;
      return;
    }

    // ✅ FIX: Validate round matches currentRound (both numbers now)
    if (round !== currentGameState.currentRound) {
      sendError(ws, `Invalid round. Expected: ${currentGameState.currentRound}, got: ${round}`);
      return;
    }

    // ✅ FIX: Users can bet multiple times on same side in same round
    // Users are allowed to:
    // - Bet multiple times on the same side in the same round
    // - Bet on both sides in the same round
    // Only validation needed is: sufficient balance and game phase

    // Atomically deduct balance - prevents race conditions
    const { storage } = await import('../storage-supabase');
    
    // ✅ FIX: Check timer again before processing bet (race condition prevention)
    if (currentGameState.timer <= 0 || currentGameState.bettingLocked) {
      sendError(ws, 'Betting time has expired. Please wait for the next round.');
      return;
    }
    
    let newBalance: number;
    try {
      newBalance = await storage.deductBalanceAtomic(userId, amount);
    } catch (error: any) {
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Failed to place bet';
      
      if (error.message?.includes('temporarily unavailable')) {
        errorMessage = 'Service temporarily unavailable. The system is experiencing high load. Please try again in a few moments.';
      } else if (error.message?.includes('Insufficient balance')) {
        errorMessage = error.message; // Keep the detailed balance message
      } else if (error.message?.includes('connection failed') || error.message?.includes('network')) {
        errorMessage = 'Database connection failed. Please check your internet connection and try again. If the problem persists, contact support.';
      } else if (error.message?.includes('Database')) {
        errorMessage = 'Database error. Please try again. If the problem persists, contact support.';
      }
      
      sendError(ws, errorMessage);
      return;
    }

    // ✅ Track wagering for bonus unlock
    try {
      await storage.trackWagering(userId, amount);
      
      // Check if wagering requirement met and unlock bonus
      const bonusUnlocked = await storage.checkAndUnlockBonus(userId);
      
      if (bonusUnlocked && bonusUnlocked.unlocked) {
        // Notify user that bonus is now unlocked!
        ws.send(JSON.stringify({
          type: 'bonus_unlocked',
          data: {
            message: `🎉 Bonus unlocked! ₹${bonusUnlocked.amount.toLocaleString()} added to your balance.`,
            amount: bonusUnlocked.amount,
            timestamp: Date.now()
          }
        }));
      }
    } catch (wageringError) {
      // Don't fail bet if wagering tracking fails
      console.error('⚠️ Error tracking wagering:', wageringError);
    }

    // ✅ FIX: Add bet to current game state using proper methods (only after successful balance deduction)
    if (round === 1) {
      if ((global as any).currentGameState?.userBets?.get) {
        // Log BEFORE for debugging
        const beforeTotal = (global as any).currentGameState.round1Bets[side];
        console.log(`🔍 BEFORE BET - Round 1 ${side}:`, { globalTotal: beforeTotal, betToAdd: amount });
        
        if (!(global as any).currentGameState.userBets.has(userId)) {
          (global as any).currentGameState.setUserBets(userId, { round1: { andar: 0, bahar: 0 }, round2: { andar: 0, bahar: 0 } });
        }
        const userBets = (global as any).currentGameState.getUserBets(userId);
        userBets.round1[side] += amount;
        (global as any).currentGameState.addRound1Bet(side, amount);
        
        // Log AFTER for debugging
        const afterTotal = (global as any).currentGameState.round1Bets[side];
        console.log(`✅ AFTER BET - Round 1 ${side}:`, { globalTotal: afterTotal, added: amount, calculation: `${beforeTotal} + ${amount} = ${afterTotal}` });
      }
    } else if (round === 2) {
      if ((global as any).currentGameState?.userBets?.get) {
        // Log BEFORE for debugging
        const beforeTotal = (global as any).currentGameState.round2Bets[side];
        console.log(`🔍 BEFORE BET - Round 2 ${side}:`, { globalTotal: beforeTotal, betToAdd: amount });
        
        if (!(global as any).currentGameState.userBets.has(userId)) {
          (global as any).currentGameState.setUserBets(userId, { round1: { andar: 0, bahar: 0 }, round2: { andar: 0, bahar: 0 } });
        }
        const userBets = (global as any).currentGameState.getUserBets(userId);
        userBets.round2[side] += amount;
        (global as any).currentGameState.addRound2Bet(side, amount);
        
        // Log AFTER for debugging
        const afterTotal = (global as any).currentGameState.round2Bets[side];
        console.log(`✅ AFTER BET - Round 2 ${side}:`, { globalTotal: afterTotal, added: amount, calculation: `${beforeTotal} + ${amount} = ${afterTotal}` });
      }
    }

    // ✅ FIX: Store bet in database with proper transaction handling
    // ✅ CRITICAL: Use ONLY server's gameId, never trust client
    const gameIdToUse = (global as any).currentGameState?.gameId;
    if (!gameIdToUse || gameIdToUse === 'default-game') {
      // This should never happen due to earlier validation, but safety check
      console.error('❌ CRITICAL: Invalid gameId at bet storage time');
      sendError(ws, 'Invalid game session. Please refresh the page.');
      // Refund the deducted balance
      try {
        await storage.addBalanceAtomic(userId, amount);
      } catch (refundError) {
        console.error('❌ Failed to refund balance:', refundError);
      }
      return;
    }
    
    // Declare newBalance outside try block for use in bet confirmation
    let finalBalance = newBalance;
    
    try {
      await storage.createBet({
        userId: userId,
        gameId: gameIdToUse,
        side,
        amount: amount,
        round: round.toString(), // ✅ Convert to string only at DB boundary (DB uses varchar)
        status: 'pending'
      });
      console.log(`📊 Bet recorded: ${userId} - ${amount} on ${side} for game ${gameIdToUse}`);
      
      // ✅ NEW: Track wagering for deposit bonuses
      try {
        await storage.updateDepositBonusWagering(userId, amount);
        console.log(`📊 Wagering tracked: ${userId} - ₹${amount} towards bonus unlock`);
      } catch (wageringError) {
        console.error('⚠️ Error tracking wagering:', wageringError);
        // Don't fail bet if wagering tracking fails
      }
    } catch (error) {
        console.error('❌ CRITICAL: Error storing bet in database:', error);
        
        // ✅ FIX: Rollback balance AND game state if bet storage fails
        try {
          // Rollback game state bet
          if (round === 1) {
            (global as any).currentGameState.addRound1Bet(side, -amount); // Subtract the bet
            const userBets = (global as any).currentGameState.getUserBets(userId);
            if (userBets) {
              userBets.round1[side] -= amount;
            }
          } else if (round === 2) {
            (global as any).currentGameState.addRound2Bet(side, -amount); // Subtract the bet
            const userBets = (global as any).currentGameState.getUserBets(userId);
            if (userBets) {
              userBets.round2[side] -= amount;
            }
          }
          
          // Refund the balance
          const newBalance = await storage.addBalanceAtomic(userId, amount);
          console.log(`💰 Refunded ${amount} to ${userId} and rolled back game state due to bet storage failure`);
          
          // ✅ FIX: Create transaction record for refund
          try {
            await storage.addTransaction({
              userId: userId,
              transactionType: 'refund',
              amount: amount,
              balanceBefore: newBalance - amount,
              balanceAfter: newBalance,
              referenceId: `bet-refund-${Date.now()}`,
              description: 'Bet refunded due to storage error'
            });
            console.log(`✅ Refund transaction recorded for ${userId}`);
          } catch (txError) {
            console.error('⚠️ Failed to record refund transaction:', txError);
            // Don't fail the refund if transaction record fails
          }
          
          // ✅ FIX: Broadcast bet cancellation to notify other clients
          if (typeof (global as any).broadcast !== 'undefined') {
            (global as any).broadcast({
              type: 'bet_cancelled',
              data: {
                userId,
                side,
                amount,
                round,
                reason: 'Storage error - bet cancelled and refunded'
              }
            });
          }
        } catch (refundError) {
          console.error('❌ CRITICAL: Error refunding bet amount and rolling back state:', refundError);
          // Even if refund fails, we need to notify the user
        }
        
        // Send error to client - don't send confirmation
        sendError(ws, 'Bet could not be processed due to system error. Your balance has been refunded. Please try again.');
        return; // Exit function without sending confirmation
    }

    // ✅ FIX: Generate bet ID before storage attempt for consistency
    const betId = `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const betConfirmedAt = Date.now();
    
    // ONLY send confirmation after successful database storage

    ws.send(JSON.stringify({
      type: 'bet_confirmed',
      data: {
        betId,
        userId,
        round,
        side,
        amount,
        newBalance,
        timestamp: betConfirmedAt
      }
    }));

    // Get user's specific bets (for display update) - background operation
    if (gameIdToUse && gameIdToUse !== 'default-game') {
      Promise.resolve().then(async () => {
        try {
          const allUserBets = await storage.getBetsForUser(userId, gameIdToUse);
          
          let userRound1Bets = { andar: [] as number[], bahar: [] as number[] };
          let userRound2Bets = { andar: [] as number[], bahar: [] as number[] };
          
          allUserBets.forEach((bet: any) => {
            const betAmount = parseFloat(bet.amount);
            if (bet.round === '1' || bet.round === 1) {
              if (bet.side === 'andar') {
                userRound1Bets.andar.push(betAmount);
              } else if (bet.side === 'bahar') {
                userRound1Bets.bahar.push(betAmount);
              }
            } else if (bet.round === '2' || bet.round === 2) {
              if (bet.side === 'andar') {
                userRound2Bets.andar.push(betAmount);
              } else if (bet.side === 'bahar') {
                userRound2Bets.bahar.push(betAmount);
              }
            }
          });
          
          ws.send(JSON.stringify({
            type: 'user_bets_update',
            data: {
              round1Bets: userRound1Bets,
              round2Bets: userRound2Bets
            }
          }));
        } catch (error) {
          console.error('Error fetching user bets:', error);
        }
      }).catch(error => {
        console.error('Error in background bet fetch:', error);
      });
    }

    // Note: user_bets_update is now sent after fetching from DB (see above Promise.all)

    // Broadcast bet update to admin panel (admin sees all bets)
    if (typeof (global as any).broadcast !== 'undefined') {
      const round1Bets = (global as any).currentGameState?.round1Bets || { andar: 0, bahar: 0 };
      const round2Bets = (global as any).currentGameState?.round2Bets || { andar: 0, bahar: 0 };
      const totalAndar = round1Bets.andar + round2Bets.andar;
      const totalBahar = round1Bets.bahar + round2Bets.bahar;
      
      // Broadcast to Admin-specific listeners (admins see all players' bets)
      (global as any).broadcastToRole({
        type: 'admin_bet_update',
        data: {
          userId,
          side,
          amount,
          round,
          // ✅ FIX: Include cumulative totals for admin dashboard
          totalAndar,
          totalBahar,
          round1Bets,
          round2Bets
        },
      }, 'admin');
      
      // ✅ FIX: Broadcast betting_stats to ALL users EXCEPT the one who placed the bet
      // The bettor already received bet_confirmed and user_bets_update, so they don't need betting_stats
      // This prevents duplicate notifications and redundant updates
      const allClients = (global as any).clients || [];
      allClients.forEach((client: any) => {
        if (client.userId !== userId && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'betting_stats',
            data: {
              andarTotal: totalAndar,
              baharTotal: totalBahar,
              round1Bets: round1Bets,
              round2Bets: round2Bets
            }
          }));
        }
      });
      
      // ✅ FIX: Broadcast analytics_update only to admins (not to players)
      // Analytics updates are for admin dashboard, not for players
      (global as any).broadcastToRole({
        type: 'analytics_update',
        data: {
          newBet: { userId, side, amount, round },
          andarTotal: totalAndar,
          baharTotal: totalBahar,
        }
      }, 'admin');
    }

    console.log(`✅ BET CONFIRMED: ${userId} bet ₹${amount} on ${side}, new balance: ₹${newBalance}`);
  } catch (error: any) {
    console.error('Bet error:', error);
    sendError(ws, error.message || 'Failed to place bet');
  }
}

/**
 * Handle admin starting a game
 */
export async function handleStartGame(client: WSClient, data: any) {
  const { ws, userId, role } = client;

  // Validate authentication
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('Client not connected');
    return;
  }

  if (role !== 'admin') {
    sendError(ws, 'Unauthorized: Only admins can start games');
    return;
  }

  // Validate input
  if (!data || !data.openingCard) {
    sendError(ws, 'Missing required field: openingCard');
    return;
  }

  console.log(`🎴 GAME START: Admin ${userId} starting game with opening card: ${data.openingCard}`);

  try {
    // Use the actual game state from routes.ts global variables
    if ((global as any).currentGameState) {
      // ✅ CRITICAL FIX: Check if previous game was completed and ensure it's properly reset
      const currentPhase = (global as any).currentGameState.phase;
      if (currentPhase === 'complete') {
        console.log('🔄 Previous game was completed, ensuring full reset before starting new game...');
        // Clear any pending operations
        if ((global as any).lastPayoutPromise) {
          try {
            await (global as any).lastPayoutPromise;
          } catch (error) {
            console.warn('⚠️ Error waiting for previous payout operation:', error);
          }
          (global as any).lastPayoutPromise = null;
        }
      }
      
      // Start a new game (generates new game ID and resets state)
      // This will generate a new gameId and reset all state
      (global as any).currentGameState.startNewGame();
      
      // ✅ FIX: Ensure all game state is properly reset using proper methods
      (global as any).currentGameState.winner = null;
      (global as any).currentGameState.winningCard = null;
      (global as any).currentGameState.clearCards();
      (global as any).currentGameState.resetRound1Bets();
      (global as any).currentGameState.resetRound2Bets();
      (global as any).currentGameState.clearUserBets();
      
      // ✅ FIX: Set opening card (this will generate game ID if not already generated)
      (global as any).currentGameState.openingCard = data.openingCard;
      
      // ✅ FIX: Ensure game ID is properly set BEFORE any database operations
      const newGameId = (global as any).currentGameState.gameId;
      if (!newGameId || newGameId === 'default-game' || typeof newGameId !== 'string') {
        // Generate new gameId if invalid
        (global as any).currentGameState.gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.warn(`⚠️ GameId was invalid, generated new: ${(global as any).currentGameState.gameId}`);
      }
      
      const finalGameId = (global as any).currentGameState.gameId;
      console.log(`🎮 Game ID for new game: ${finalGameId}`);
      
      // Initialize game state
      (global as any).currentGameState.phase = 'betting';
      (global as any).currentGameState.currentRound = 1;
      (global as any).currentGameState.bettingLocked = false;
      (global as any).currentGameState.timer = 0;

      // ✅ FIX: Store in database with validated gameId
      const { storage } = await import('../storage-supabase');
      const gameSession = await storage.createGameSession({
        gameId: finalGameId, // Use validated gameId
        openingCard: data.openingCard,
        phase: 'betting'
      });

      // ✅ FIX: Verify gameId matches after creation - CRITICAL for data consistency
      const dbGameId = (gameSession as any).game_id || gameSession.gameId;
      if (dbGameId !== finalGameId) {
        console.error(`❌ CRITICAL: Game ID mismatch! Memory: ${finalGameId}, Database: ${dbGameId}`);
        // Update memory to match database (fallback) - this ensures all future operations use correct ID
        (global as any).currentGameState.gameId = dbGameId;
        console.warn(`⚠️ Updated memory gameId to match database: ${dbGameId}`);
        
        // ✅ FIX: Broadcast warning to admins about gameId mismatch
        if (typeof (global as any).broadcastToRole === 'function') {
          (global as any).broadcastToRole({
            type: 'error',
            data: {
              message: 'Game ID mismatch detected and corrected. Game will continue normally.',
              code: 'GAME_ID_MISMATCH',
              memoryGameId: finalGameId,
              databaseGameId: dbGameId
            }
          }, 'admin');
        }
      } else {
        console.log(`✅ Game session created with matching gameId: ${finalGameId}`);
      }
      
      // ✅ FIX: Persist game state after creation with error handling
      if (typeof (global as any).persistGameState === 'function') {
        try {
          await (global as any).persistGameState();
          console.log(`✅ Game state persisted successfully for gameId: ${(global as any).currentGameState.gameId}`);
        } catch (err: any) {
          console.error('❌ Error persisting game state after start:', err);
          // Don't fail game start if persistence fails, but log it
          // State will be persisted on next operation
        }
      }

      // Get timer duration from data - check both timer and timerDuration fields
      // Also check game settings if not provided
      let timerDuration = data.timer || data.timerDuration || 30;
      
      // If still default, try to get from game settings
      if (timerDuration === 30) {
        try {
          const { storage } = await import('../storage-supabase');
          const timerSetting = await storage.getGameSetting('betting_timer_duration') || '30';
          timerDuration = parseInt(timerSetting) || 30;
        } catch (error) {
          console.warn('Could not fetch timer setting, using default:', error);
        }
      }

      // Broadcast game start to all clients
      if (typeof (global as any).broadcast !== 'undefined') {
        (global as any).broadcast({
          type: 'opening_card_confirmed',
          data: {
            gameId: (global as any).currentGameState.gameId,  // ✅ FIX: Include gameId
            openingCard: data.openingCard,
            phase: 'betting',
            round: 1,
            timer: timerDuration
          }
        });
      }

      // ✅ FIX: Start betting timer using global startTimer
      // Timer callback in routes.ts already handles phase change and broadcasting
      // No need to duplicate logic here
      if (typeof (global as any).startTimer === 'function') {
        (global as any).startTimer(timerDuration, () => {
          // Timer callback in routes.ts already handles everything
          // This callback is just for logging
          console.log('🎯 Betting time expired, moving to dealing phase');
        });
      }

      // Send confirmation to admin
      ws.send(JSON.stringify({
        type: 'game_started',
        data: {
          gameId: (global as any).currentGameState.gameId,
          openingCard: data.openingCard,
          phase: 'betting',
          timer: timerDuration
        }
      }));

      console.log(`✅ GAME STARTED: Game ${(global as any).currentGameState.gameId} started by admin ${userId}`);
    } else {
      sendError(ws, 'Game state not available');
    }
  } catch (error: any) {
    console.error('Start game error:', error);
    sendError(ws, error.message || 'Failed to start game');
  }
}

/**
 * Handle admin dealing a card
 */
export async function handleDealCard(client: WSClient, data: any) {
  const { ws, userId, role } = client;

  // Validate authentication
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('Client not connected');
    return;
  }

  // Validate role (only admins can deal cards)
  if (role !== 'admin') {
    sendError(ws, 'Unauthorized: Only admins can deal cards');
    return;
  }

  // Validate input
  if (!data || !data.card || !data.side) {
    sendError(ws, 'Missing required fields: card, side');
    return;
  }

  if (data.side !== 'andar' && data.side !== 'bahar') {
    sendError(ws, 'side must be "andar" or "bahar"');
    return;
  }

  console.log(`🃏 DEAL CARD: Admin ${userId} dealing ${data.card} on ${data.side}`);

  try {
    // Use actual game logic from routes.ts
    if (!(global as any).currentGameState) {
      sendError(ws, 'Game state not available');
      return;
    }

    // Allow dealing in 'dealing' phase OR if we're in 'complete' phase but game hasn't reset yet
    // (This handles cases where admin is dealing during transition)
    if ((global as any).currentGameState.phase !== 'dealing' && 
        (global as any).currentGameState.phase !== 'betting') {
      sendError(ws, `Not in dealing/betting phase. Current phase: ${(global as any).currentGameState.phase}`);
      return;
    }

    // ✅ FIX: Strictly validate dealing sequence in dealing phase
    if ((global as any).currentGameState.phase === 'dealing') {
      const expectedSide = (global as any).currentGameState.getNextExpectedSide();
      
      if (expectedSide === null) {
        sendError(ws, 'Current round is complete. Please progress to next round or reset the game.');
        return;
      } else if (data.side !== expectedSide) {
        // ✅ FIX: Enforce strict sequence validation
        sendError(ws, `Invalid dealing sequence. Expected ${expectedSide.toUpperCase()} card next, but received ${data.side.toUpperCase()}. Please deal cards in the correct order.`);
        return;
      }
    } else if ((global as any).currentGameState.phase === 'betting' && (global as any).currentGameState.currentRound === 2) {
      // Allow dealing during Round 2 betting phase (for dealing Round 2 cards)
      const expectedSide = (global as any).currentGameState.getNextExpectedSide();
      
      if (expectedSide === null) {
        sendError(ws, 'Current round is complete. Please progress to next round.');
        return;
      } else if (data.side !== expectedSide) {
        sendError(ws, `Invalid dealing sequence. Expected ${expectedSide.toUpperCase()} card next, but received ${data.side.toUpperCase()}.`);
        return;
      }
    }

    // Determine if this is a winner based on the opening card logic
    let isWinningCard = false;
    if ((global as any).currentGameState.openingCard) {
      const openingRank = (global as any).currentGameState.openingCard.replace(/[♠♥♦♣]/g, '');
      const dealtRank = data.card.replace(/[♠♥♦♣]/g, '');
      isWinningCard = openingRank === dealtRank;
    }

    // Calculate position BEFORE adding card to state
    const currentPosition = (global as any).currentGameState.andarCards.length + 
                            (global as any).currentGameState.baharCards.length + 1;

    // Add card to the appropriate list (only after validation passes)
    if (data.side === 'andar') {
      (global as any).currentGameState.addAndarCard(data.card);
    } else {
      (global as any).currentGameState.addBaharCard(data.card);
    }

    console.log(`♠️ Dealt ${data.card} on ${data.side}: total andar=${(global as any).currentGameState.andarCards.length}, bahar=${(global as any).currentGameState.baharCards.length}`);

    // Save card to database with correct position (calculated BEFORE card was added)
    const gameId = (global as any).currentGameState.gameId;
    if (gameId && gameId !== 'default-game') {
      // ✅ FIX: Add retry logic for card storage
      let cardSaved = false;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { storage } = await import('../storage-supabase');
          await storage.dealCard({
            gameId: gameId,
            card: data.card,
            side: data.side,
            position: currentPosition,
            isWinningCard: isWinningCard
          });
          console.log(`✅ Card saved to database: ${data.card} on ${data.side} at position ${currentPosition} (attempt ${attempt})`);
          cardSaved = true;
          break;
        } catch (error) {
          console.error(`⚠️ Error saving card to database (attempt ${attempt}/${maxRetries}):`, error);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
          } else {
            // ✅ FIX: Critical error - card not saved after all retries
            console.error(`❌ CRITICAL: Failed to save card after ${maxRetries} attempts. Game may be incomplete.`);
            // Broadcast error to admins
            if (typeof (global as any).broadcastToRole === 'function') {
              (global as any).broadcastToRole({
                type: 'error',
                data: {
                  message: `CRITICAL: Card ${data.card} could not be saved to database after ${maxRetries} attempts. Game may be incomplete.`,
                  code: 'CARD_SAVE_ERROR',
                  card: data.card,
                  side: data.side,
                  position: currentPosition
                }
              }, 'admin');
            }
          }
        }
      }
      
      if (!cardSaved) {
        // ✅ FIX: Don't prevent game from continuing, but log critical error
        console.error(`❌ CRITICAL: Card ${data.card} not saved to database. Game history will be incomplete.`);
      }
    }

    // Broadcast the dealt card to all clients with correct position
    if (typeof (global as any).broadcast !== 'undefined') {
      (global as any).broadcast({
        type: 'card_dealt',
        data: {
          card: data.card,
          side: data.side,
          position: currentPosition, // Use pre-calculated position
          isWinningCard: isWinningCard
        }
      });
    }
    
    // Persist state after card dealt
    if (typeof (global as any).persistGameState === 'function') {
      (global as any).persistGameState().catch((err: any) => 
        console.error('Error persisting game state after card dealt:', err)
      );
    }

    // ✅ CRITICAL FIX: Use total card count to determine round transition
    // This ensures the 5th card (first card of Round 3) uses Round 3 payout logic
    const currentRound = (global as any).currentGameState.currentRound;
    const andarCount = (global as any).currentGameState.andarCards.length;
    const baharCount = (global as any).currentGameState.baharCards.length;
    const totalCards = andarCount + baharCount;
    
    console.log(`📊 Card dealt: Round ${currentRound}, Total cards: ${totalCards} (Andar: ${andarCount}, Bahar: ${baharCount})`);
    
    // Round 2 complete when exactly 4 cards dealt (2 Andar + 2 Bahar)
    // Round 3 starts on 5th card and continues until winner
    if (totalCards === 4 && currentRound === 2) {
      console.log('🔄 TRANSITIONING TO ROUND 3 AFTER 4TH CARD');
      (global as any).currentGameState.currentRound = 3;
      (global as any).currentGameState.phase = 'dealing';
      (global as any).currentGameState.bettingLocked = true;
      
      // Persist round 3 transition
      if (typeof (global as any).persistGameState === 'function') {
        (global as any).persistGameState().catch((err: any) => 
          console.error('Error persisting round 3 transition:', err)
        );
      }
      
      // Broadcast round 3 start
      if (typeof (global as any).broadcast !== 'undefined') {
        (global as any).broadcast({
          type: 'start_final_draw',
          data: {
            gameId: (global as any).currentGameState.gameId,
            round: 3,
            round1Bets: (global as any).currentGameState.round1Bets,
            round2Bets: (global as any).currentGameState.round2Bets,
            message: 'Round 3: Continuous draw started!'
          }
        });
      }
      
      console.log('✅ MOVED TO ROUND 3 (BEFORE WINNER CHECK)');
    } else if (totalCards >= 5 && currentRound !== 3) {
      // Safety check: If we somehow have 5+ cards but not in Round 3, force transition
      console.error(`❌ CRITICAL: ${totalCards} cards dealt but still in Round ${currentRound}! Force transition to Round 3.`);
      (global as any).currentGameState.currentRound = 3;
      (global as any).currentGameState.phase = 'dealing';
      (global as any).currentGameState.bettingLocked = true;
      
      // Broadcast emergency round 3 transition
      if (typeof (global as any).broadcast !== 'undefined') {
        (global as any).broadcast({
          type: 'start_final_draw',
          data: {
            gameId: (global as any).currentGameState.gameId,
            round: 3,
            round1Bets: (global as any).currentGameState.round1Bets,
            round2Bets: (global as any).currentGameState.round2Bets,
            message: 'Round 3: Continuous draw started! (Emergency transition)'
          }
        });
      }
    }
    
    // Re-read currentRound after potential transition
    const finalRound = (global as any).currentGameState.currentRound;
    
    console.log(`🎯 Card dealt - Round: ${finalRound}, Total: ${totalCards}, Winner: ${isWinningCard}`);
    
    if (isWinningCard) {
      // ✅ FIX: Game ends with winner regardless of round
      (global as any).currentGameState.winner = data.side === 'andar' ? 'andar' : 'bahar';
      (global as any).currentGameState.winningCard = data.card;
      (global as any).currentGameState.phase = 'complete';
      
      // ✅ FIX: Don't persist here - completeGame will handle persistence
      // Persisting here causes race condition with completeGame
      // State will be persisted after completion finishes

      // ✅ FIX: Complete the game with payouts and transition to new game
      // Use the global completeGame function which includes transition logic
      // CRITICAL: Must await to prevent race conditions and ensure completion before reset
      try {
        const globalCompleteGame = (global as any).completeGame;
        if (globalCompleteGame && typeof globalCompleteGame === 'function') {
          // ✅ FIX: Await completion to ensure all operations finish
          await globalCompleteGame(data.side === 'andar' ? 'andar' : 'bahar', data.card);
          console.log(`🏆 GAME COMPLETE: Winner is ${data.side} with card ${data.card}`);
        } else {
          console.error('❌ Global completeGame function not available, falling back to local function');
          // ✅ FIX: Await local function as well
          await completeGame((global as any).currentGameState, data.side === 'andar' ? 'andar' : 'bahar', data.card);
          console.log(`🏆 GAME COMPLETE: Winner is ${data.side} with card ${data.card}`);
        }
      } catch (error: any) {
        console.error('❌ CRITICAL: Error completing game:', error);
        // ✅ FIX: Send error notification to admin
        sendError(ws, `Error completing game: ${error.message || 'Unknown error'}`);
        // ✅ FIX: Still try to persist state even if completion fails
        if (typeof (global as any).persistGameState === 'function') {
          try {
            await (global as any).persistGameState();
          } catch (persistError) {
            console.error('❌ CRITICAL: Error persisting state after completion failure:', persistError);
          }
        }
        // Don't throw - game should still be marked as complete
        return;
      }
    } else if (isRoundComplete && currentRound < 3) {
      // ✅ FIX: Round 1 or 2 complete without winner - move to next round
      if (currentRound === 1) {
        // Go to round 2
        (global as any).currentGameState.currentRound = 2;
        (global as any).currentGameState.phase = 'betting';
        (global as any).currentGameState.bettingLocked = false;

        // ✅ FIX: Persist round transition before starting timer
        if (typeof (global as any).persistGameState === 'function') {
          (global as any).persistGameState().catch((err: any) => 
            console.error('Error persisting round 2 transition:', err)
          );
        }

        if (typeof (global as any).broadcast !== 'undefined') {
          (global as any).broadcast({
            type: 'phase_change',
            data: {
              phase: 'betting',
              round: 2,
              bettingLocked: false, // ✅ FIX: Betting is open for round 2
              message: 'Round 1 complete! Round 2 betting is now open.',
              timer: 0 // Will be set by timer
            }
          });
        }

        // ✅ FIX: Start timer for round 2 betting - use same timer duration as round 1
        const { storage } = await import('../storage-supabase');
        const timerSetting = await storage.getGameSetting('betting_timer_duration') || '30';
        const timerDuration = parseInt(timerSetting) || 30;
        
        if (typeof (global as any).startTimer === 'function') {
          (global as any).startTimer(timerDuration, () => {
            (global as any).currentGameState.phase = 'dealing';
            (global as any).currentGameState.bettingLocked = true;

            // ✅ FIX: Persist phase change
            if (typeof (global as any).persistGameState === 'function') {
              (global as any).persistGameState().catch((err: any) => 
                console.error('Error persisting phase change to dealing:', err)
              );
            }

            if (typeof (global as any).broadcast !== 'undefined') {
              (global as any).broadcast({
                type: 'phase_change',
                data: {
                  phase: 'dealing',
                  round: 2,
                  bettingLocked: true, // ✅ FIX: Betting locked during dealing
                  message: 'Round 2 betting closed. Admin can deal second cards.'
                }
              });
            }
          });
        } else {
          console.error('⚠️ startTimer function not available');
        }

        console.log('🔄 MOVED TO ROUND 2');
      } else if (currentRound === 2) {
        // ✅ FIX: Move to Round 3 (Continuous Draw) if no winner in 2 rounds
        (global as any).currentGameState.currentRound = 3;
        (global as any).currentGameState.phase = 'dealing';
        (global as any).currentGameState.bettingLocked = true;

        // ✅ FIX: Persist round 3 transition
        if (typeof (global as any).persistGameState === 'function') {
          (global as any).persistGameState().catch((err: any) => 
            console.error('Error persisting round 3 transition:', err)
          );
        }

        if (typeof (global as any).broadcast !== 'undefined') {
          (global as any).broadcast({
            type: 'start_final_draw',
            data: {
              gameId: (global as any).currentGameState.gameId,
              round: 3,
              round1Bets: (global as any).currentGameState.round1Bets,
              round2Bets: (global as any).currentGameState.round2Bets,
              message: 'Round 3: Continuous draw started!'
            }
          });
        }

        console.log('🔄 MOVED TO ROUND 3 (CONTINUOUS DRAW)');
      }
    } else if (currentRound === 3) {
      // Round 3 (Continuous Draw) - continue dealing until winner found
      console.log('⚡ Round 3: Continuing continuous draw...');
      // No action needed - just continue dealing in Round 3
    }

    // Confirm to admin without duplicating broadcast event type
    ws.send(JSON.stringify({
      type: 'card_dealt_ack',
      data: {
        card: data.card,
        side: data.side,
        position: currentPosition, // ✅ FIX: Use pre-calculated position (calculated BEFORE card was added)
        isWinningCard: isWinningCard,
        gamePhase: (global as any).currentGameState.phase,
        currentRound: (global as any).currentGameState.currentRound
      }
    }));

    console.log(`✅ CARD DEALT: ${data.card} on ${data.side} by admin ${userId}`);
  } catch (error: any) {
    console.error('Deal card error:', error);
    sendError(ws, error.message || 'Failed to deal card');
  }
}

/**
 * Handle game subscription
 */
export async function handleGameSubscribe(client: WSClient, data: any) {
  const { ws, userId } = client;

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('Client not connected');
    return;
  }

  try {
    // Use getCurrentGameStateForUser function from routes.ts
    const gameStateFn = (global as any).getCurrentGameStateForUser;
    if (typeof gameStateFn === 'function') {
      const gameState = await gameStateFn(userId);

      ws.send(JSON.stringify({
        type: 'game_state',
        data: gameState
      }));
    } else {
      // Fallback with basic info - CRITICAL: Get user-specific bets, NOT total bets
      // Get user's bets from database
      let playerRound1Bets = { andar: [] as number[], bahar: [] as number[] };
      let playerRound2Bets = { andar: [] as number[], bahar: [] as number[] };
      
      try {
        const { storage } = await import('../storage-supabase');
        const gameId = (global as any).currentGameState?.gameId;
        if (gameId && gameId !== 'default-game') {
          const userBets = await storage.getBetsForUser(userId, gameId);
          userBets.forEach((bet: any) => {
            const amount = parseFloat(bet.amount);
            if (bet.round === '1' || bet.round === 1) {
              if (bet.side === 'andar') {
                playerRound1Bets.andar.push(amount);
              } else if (bet.side === 'bahar') {
                playerRound1Bets.bahar.push(amount);
              }
            } else if (bet.round === '2' || bet.round === 2) {
              if (bet.side === 'andar') {
                playerRound2Bets.andar.push(amount);
              } else if (bet.side === 'bahar') {
                playerRound2Bets.bahar.push(amount);
              }
            }
          });
        }
      } catch (error) {
        console.error('Error fetching user bets in fallback:', error);
      }
      
      const currentState = {
        gameId: (global as any).currentGameState?.gameId || null,  // ✅ FIX: Include gameId
        phase: (global as any).currentGameState?.phase || 'idle',
        currentRound: (global as any).currentGameState?.currentRound || 1,
        timer: (global as any).currentGameState?.timer || 0,
        openingCard: (global as any).currentGameState?.openingCard || null,
        andarCards: (global as any).currentGameState?.andarCards || [],
        baharCards: (global as any).currentGameState?.baharCards || [],
        // DO NOT send total bets - only send user's own bets
        playerRound1Bets: playerRound1Bets, // User's own bets only
        playerRound2Bets: playerRound2Bets  // User's own bets only
      };

      ws.send(JSON.stringify({
        type: 'game:state',
        data: currentState
      }));
    }

    console.log(`✅ Game state sent to ${userId}`);
  } catch (error: any) {
    console.error('Subscribe error:', error);
    sendError(ws, error.message || 'Failed to get game state');
  }
}

/**
 * Send error message to client
 */
export function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message }
    }));
  }
}

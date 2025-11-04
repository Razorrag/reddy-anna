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

  if (typeof round !== 'string') {
    sendError(ws, 'round must be a string');
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

    // Validate round
    const roundNum = parseInt(round);
    if (roundNum !== currentGameState.currentRound) {
      sendError(ws, `Invalid round. Expected: ${currentGameState.currentRound}, got: ${roundNum}`);
      return;
    }

    // Atomically deduct balance - prevents race conditions
    const { storage } = await import('../storage-supabase');
    
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

    // Add bet to current game state (only after successful balance deduction)
    if (roundNum === 1) {
      if ((global as any).currentGameState?.userBets?.get) {
        if (!(global as any).currentGameState.userBets.has(userId)) {
          (global as any).currentGameState.userBets.set(userId, { round1: { andar: 0, bahar: 0 }, round2: { andar: 0, bahar: 0 } });
        }
        const userBets = (global as any).currentGameState.userBets.get(userId);
        userBets.round1[side] += amount;
        (global as any).currentGameState.round1Bets[side] += amount;
      }
    } else if (roundNum === 2) {
      if ((global as any).currentGameState?.userBets?.get) {
        if (!(global as any).currentGameState.userBets.has(userId)) {
          (global as any).currentGameState.userBets.set(userId, { round1: { andar: 0, bahar: 0 }, round2: { andar: 0, bahar: 0 } });
        }
        const userBets = (global as any).currentGameState.userBets.get(userId);
        userBets.round2[side] += amount;
        (global as any).currentGameState.round2Bets[side] += amount;
      }
    }

    // Store bet in database FIRST before sending confirmation
    const gameIdToUse = gameId || (global as any).currentGameState?.gameId;
    if (gameIdToUse && gameIdToUse !== 'default-game') {
      try {
        await storage.createBet({
          userId: userId,
          gameId: gameIdToUse,
          side,
          amount: amount,
          round: round.toString(),
          status: 'pending'
        });
        console.log(`📊 Bet recorded: ${userId} - ${amount} on ${side} for game ${gameIdToUse}`);
      } catch (error) {
        console.error('❌ Error storing bet:', error);
        // Rollback balance if bet storage fails
        try {
          await storage.addBalanceAtomic(userId, amount); // Refund the amount
          console.log(`💰 Refunded ${amount} to ${userId} due to bet storage failure`);
        } catch (refundError) {
          console.error('❌ Error refunding bet amount:', refundError);
        }
        // Send error to client instead of confirmation
        sendError(ws, 'Bet could not be processed due to system error. Your balance has been refunded.');
        return; // Exit function without sending confirmation
      }
    }

    // ONLY send confirmation after successful database storage
    const betId = `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const betConfirmedAt = Date.now();

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
      // Start a new game (generates new game ID and resets state)
      (global as any).currentGameState.startNewGame();
      
      // Set opening card (this will generate game ID if not already generated)
      (global as any).currentGameState.openingCard = data.openingCard;
      
      // Ensure game ID is properly set (it should be generated by startNewGame or setter)
      const newGameId = (global as any).currentGameState.gameId;
      console.log(`🎮 Game ID for new game: ${newGameId}`);
      
      // Initialize game state
      (global as any).currentGameState.phase = 'betting';
      (global as any).currentGameState.currentRound = 1;
      (global as any).currentGameState.bettingLocked = false;

      // Store in database
      const { storage } = await import('../storage-supabase');
      const gameIdBeforeCreate = (global as any).currentGameState.gameId;
      const gameSession = await storage.createGameSession({
        gameId: gameIdBeforeCreate,
        openingCard: data.openingCard,
        phase: 'betting'
      });

      // ✅ Verify gameId matches after creation
      if (gameSession.game_id !== gameIdBeforeCreate) {
        console.error(`❌ CRITICAL: Game ID mismatch! Memory: ${gameIdBeforeCreate}, Database: ${gameSession.game_id}`);
        // Update memory to match database (fallback)
        (global as any).currentGameState.gameId = gameSession.game_id;
        console.warn(`⚠️ Updated memory gameId to match database: ${gameSession.game_id}`);
      } else {
        console.log(`✅ Game session created with matching gameId: ${gameIdBeforeCreate}`);
      }
      
      // Persist game state after creation
      if (typeof (global as any).persistGameState === 'function') {
        (global as any).persistGameState().catch((err: any) => 
          console.error('Error persisting game state after start:', err)
        );
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
            openingCard: data.openingCard,
            phase: 'betting',
            round: 1,
            timer: timerDuration
          }
        });
      }

      // Start betting timer using global startTimer
      if (typeof (global as any).startTimer === 'function') {
        (global as any).startTimer(timerDuration, () => {
          console.log('🎯 Betting time expired, moving to dealing phase');
          (global as any).currentGameState.phase = 'dealing';
          (global as any).currentGameState.bettingLocked = true;

          // Persist the phase change
          if (typeof (global as any).persistGameState === 'function') {
            (global as any).persistGameState().catch((err: any) => 
              console.error('Error persisting phase change to dealing:', err)
            );
          }

          // Broadcast phase change
          if (typeof (global as any).broadcast !== 'undefined') {
            (global as any).broadcast({
              type: 'phase_change',
              data: {
                phase: 'dealing',
                round: 1,
                message: 'Betting closed. Admin can now deal cards.'
              }
            });
          }
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

    // Only validate dealing sequence in dealing phase, not in betting (for round 2)
    if ((global as any).currentGameState.phase === 'dealing') {
      const expectedSide = (global as any).currentGameState.getNextExpectedSide();
      
      if (expectedSide === null) {
        console.log('Current round appears complete, allowing card deal for next round');
        // Don't return here - we may be transitioning to next round
      } else if (data.side !== expectedSide) {
        // Be more lenient with sequence validation to allow for potential race conditions
        console.warn(`⚠️ WARNING: Expected ${expectedSide.toUpperCase()} but received ${data.side.toUpperCase()}. Continuing anyway.`);
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
      try {
        const { storage } = await import('../storage-supabase');
        await storage.dealCard({
          gameId: gameId,
          card: data.card,
          side: data.side,
          position: currentPosition, // Use calculated position BEFORE card was added
          isWinningCard: isWinningCard
        });
        console.log(`✅ Card saved to database: ${data.card} on ${data.side} at position ${currentPosition}`);
      } catch (error) {
        console.error('⚠️ Error saving card to database:', error);
        // Don't fail the card dealing if DB save fails
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

    // Check if round should end after this card
    const currentRound = (global as any).currentGameState.currentRound;
    const isRoundComplete = (global as any).currentGameState.isRoundComplete();
    
    console.log(`🎯 Card dealt - Round: ${currentRound}, Complete: ${isRoundComplete}, Winner: ${isWinningCard}`);
    
    if (isWinningCard) {
      // Game ends with winner regardless of round
      (global as any).currentGameState.winner = data.side === 'andar' ? 'andar' : 'bahar';
      (global as any).currentGameState.winningCard = data.card;
      (global as any).currentGameState.phase = 'complete';
      
      // Persist game completion
      if (typeof (global as any).persistGameState === 'function') {
        (global as any).persistGameState().catch((err: any) => 
          console.error('Error persisting game completion:', err)
        );
      }

      // Complete the game with payouts
      completeGame((global as any).currentGameState, data.side === 'andar' ? 'andar' : 'bahar', data.card);

      console.log(`🏆 GAME COMPLETE: Winner is ${data.side} with card ${data.card}`);
    } else if (isRoundComplete && currentRound < 3) {
      // Round 1 or 2 complete without winner - move to next round
      if (currentRound === 1) {
        // Go to round 2
        (global as any).currentGameState.currentRound = 2;
        (global as any).currentGameState.phase = 'betting';
        (global as any).currentGameState.bettingLocked = false;

        if (typeof (global as any).broadcast !== 'undefined') {
          (global as any).broadcast({
            type: 'phase_change',
            data: {
              phase: 'betting',
              round: 2,
              message: 'Round 1 complete! Round 2 betting is now open.'
            }
          });
        }

        // Start timer for round 2 betting - use same timer duration as round 1
        // Try to get timer duration from settings or default to 30
        const { storage } = await import('../storage-supabase');
        const timerSetting = await storage.getGameSetting('betting_timer_duration') || '30';
        const timerDuration = parseInt(timerSetting) || 30;
        
        if (typeof (global as any).startTimer === 'function') {
          (global as any).startTimer(timerDuration, () => {
            (global as any).currentGameState.phase = 'dealing';
            (global as any).currentGameState.bettingLocked = true;

            if (typeof (global as any).broadcast !== 'undefined') {
              (global as any).broadcast({
                type: 'phase_change',
                data: {
                  phase: 'dealing',
                  round: 2,
                  message: 'Round 2 betting closed. Admin can deal second cards.'
                }
              });
            }
          });
        }

        console.log('🔄 MOVED TO ROUND 2');
      } else if (currentRound === 2) {
        // Move to Round 3 (Continuous Draw) if no winner in 2 rounds
        (global as any).currentGameState.currentRound = 3;
        (global as any).currentGameState.phase = 'dealing';
        (global as any).currentGameState.bettingLocked = true;

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

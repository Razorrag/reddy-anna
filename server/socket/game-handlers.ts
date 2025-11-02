/**
 * WEBSOCKET GAME HANDLERS
 *
 * Extracts WebSocket event handlers from server/index.ts
 * Handles all game-related socket events with validation
 */

import { WebSocket } from 'ws';

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

    // Validate game state (using global currentGameState)
    if ((global as any).currentGameState?.phase !== 'betting') {
      sendError(ws, 'Betting is not open');
      return;
    }

    if ((global as any).currentGameState?.bettingLocked) {
      sendError(ws, 'Betting period has ended');
      return;
    }

    // Atomically deduct balance - prevents race conditions
    const { storage } = await import('../storage-supabase');
    
    let newBalance: number;
    try {
      newBalance = await storage.deductBalanceAtomic(userId, amount);
    } catch (error: any) {
      sendError(ws, error.message || 'Failed to place bet');
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
    const roundNum = parseInt(round);
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

    // Store bet in database
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
        console.error('Error storing bet:', error);
      }
    }

    // Send bet confirmation back to the user
    ws.send(JSON.stringify({
      type: 'bet_confirmed',
      data: {
        betId: `bet-${Date.now()}`,
        userId,
        round,
        side,
        amount,
        newBalance,
        timestamp: Date.now()
      }
    }));

    // Broadcast bet update to admin panel
    if (typeof (global as any).broadcast !== 'undefined') {
      const round1Bets = (global as any).currentGameState?.round1Bets || { andar: 0, bahar: 0 };
      const round2Bets = (global as any).currentGameState?.round2Bets || { andar: 0, bahar: 0 };
      const totalAndar = round1Bets.andar + round2Bets.andar;
      const totalBahar = round1Bets.bahar + round2Bets.bahar;

      // Broadcast user bets update
      (global as any).broadcast({
        type: 'user_bets_update',
        data: {
          round1Bets: round1Bets,
          round2Bets: round2Bets
        }
      });
      
      // Broadcast to Admin-specific listeners
      (global as any).broadcast({
        type: 'admin_bet_update',
        data: {
          userId,
          side,
          amount,
          round,
        },
      });
      
      // Broadcast complete betting stats with round-specific totals
      (global as any).broadcast({
        type: 'betting_stats',
        data: {
          andarTotal: totalAndar,
          baharTotal: totalBahar,
          round1Bets: round1Bets,
          round2Bets: round2Bets
        }
      });
      
      (global as any).broadcast({
        type: 'analytics_update',
        data: {
          newBet: { userId, side, amount, round },
          andarTotal: totalAndar,
          baharTotal: totalBahar,
        }
      });
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
      // Set opening card and initialize game
      (global as any).currentGameState.reset();
      (global as any).currentGameState.gameId = `game-${Date.now()}`;
      (global as any).currentGameState.openingCard = data.openingCard;
      (global as any).currentGameState.phase = 'betting';
      (global as any).currentGameState.currentRound = 1;
      (global as any).currentGameState.bettingLocked = false;

      // Store in database
      const { storage } = await import('../storage-supabase');
      const gameSession = await storage.createGameSession({
        gameId: (global as any).currentGameState.gameId,
        openingCard: data.openingCard,
        phase: 'betting'
      });

      console.log(`✅ Game session created: ${(global as any).currentGameState.gameId}`);

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
  if (!data || !data.card || !data.side || typeof data.position !== 'number') {
    sendError(ws, 'Missing required fields: card, side, position');
    return;
  }

  if (data.side !== 'andar' && data.side !== 'bahar') {
    sendError(ws, 'side must be "andar" or "bahar"');
    return;
  }

  console.log(`🃏 DEAL CARD: Admin ${userId} dealing ${data.card} on ${data.side} at position ${data.position}`);

  try {
    // Use actual game logic from routes.ts
    if (!(global as any).currentGameState) {
      sendError(ws, 'Game state not available');
      return;
    }

    if ((global as any).currentGameState.phase !== 'dealing') {
      sendError(ws, 'Not in dealing phase');
      return;
    }

    // CRITICAL: Validate dealing sequence BEFORE adding card
    const expectedSide = (global as any).currentGameState.getNextExpectedSide();
    
    if (expectedSide === null) {
      sendError(ws, 'Current round is complete. Please progress to next round.');
      return;
    }

    if (data.side !== expectedSide) {
      sendError(ws, `Invalid dealing sequence. Expected ${expectedSide.toUpperCase()} card next. Attempted: ${data.side.toUpperCase()}`);
      return;
    }

    // Determine if this is a winner based on the opening card logic
    let isWinningCard = false;
    if ((global as any).currentGameState.openingCard) {
      const openingRank = (global as any).currentGameState.openingCard.replace(/[♠♥♦♣]/g, '');
      const dealtRank = data.card.replace(/[♠♥♦♣]/g, '');
      isWinningCard = openingRank === dealtRank;
    }

    // Add card to the appropriate list (only after validation passes)
    if (data.side === 'andar') {
      (global as any).currentGameState.addAndarCard(data.card);
    } else {
      (global as any).currentGameState.addBaharCard(data.card);
    }

    console.log(`♠️ Dealt ${data.card} on ${data.side}: total andar=${(global as any).currentGameState.andarCards.length}, bahar=${(global as any).currentGameState.baharCards.length}`);

    // Save card to database
    const gameId = (global as any).currentGameState.gameId;
    if (gameId && gameId !== 'default-game') {
      try {
        const { storage } = await import('../storage-supabase');
        await storage.dealCard({
          gameId: gameId,
          card: data.card,
          side: data.side,
          position: data.position,
          isWinningCard: isWinningCard
        });
        console.log(`✅ Card saved to database: ${data.card} on ${data.side}`);
      } catch (error) {
        console.error('⚠️ Error saving card to database:', error);
        // Don't fail the card dealing if DB save fails
      }
    }

    // Broadcast the dealt card to all clients
    if (typeof (global as any).broadcast !== 'undefined') {
      (global as any).broadcast({
        type: 'card_dealt',
        data: {
          card: data.card,
          side: data.side,
          position: data.position,
          isWinningCard: isWinningCard
        }
      });
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

      // Complete the game with payouts using global completeGame if available
      if (typeof (global as any).completeGame === 'function') {
        (global as any).completeGame(data.side === 'andar' ? 'andar' : 'bahar', data.card);
      }

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
        position: data.position,
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
      // Fallback with basic info
      const currentState = {
        phase: (global as any).currentGameState?.phase || 'idle',
        currentRound: (global as any).currentGameState?.currentRound || 1,
        timer: (global as any).currentGameState?.timer || 0,
        openingCard: (global as any).currentGameState?.openingCard || null,
        andarCards: (global as any).currentGameState?.andarCards || [],
        baharCards: (global as any).currentGameState?.baharCards || [],
        round1Bets: (global as any).currentGameState?.round1Bets || { andar: 0, bahar: 0 },
        round2Bets: (global as any).currentGameState?.round2Bets || { andar: 0, bahar: 0 }
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

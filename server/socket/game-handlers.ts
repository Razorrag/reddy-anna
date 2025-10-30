/**
 * WEBSOCKET GAME HANDLERS
 * 
 * Extracts WebSocket event handlers from server/index.ts
 * Handles all game-related socket events with validation
 */

import { WebSocket } from 'ws';
import { gameService } from '../services/GameService';

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
  if (!gameId || !side || !amount || !round) {
    sendError(ws, 'Missing required fields: gameId, side, amount, round');
    return;
  }

  // Validate types
  if (typeof gameId !== 'string') {
    sendError(ws, 'gameId must be a string');
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
    // Place bet using game service (with full validation)
    const result = await gameService.placeBet({
      userId,
      gameId,
      side,
      amount,
      round,
    });

    // Send success response
    ws.send(JSON.stringify({
      type: 'bet:success',
      data: result,
    }));

    // Broadcast bet to all clients via the main routes.ts broadcast function
    // We'll use the global broadcast function from the routes.ts file
    if (typeof (global as any).broadcast !== 'undefined') {
      (global as any).broadcast({
        type: 'game:bet-placed',
        data: {
          userId,
          side,
          amount,
          round,
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback: log that global broadcast is not available
      console.log('Global broadcast function not available, bet placed for user:', userId);
    }

    console.log(`✅ Bet processed: ${userId} bet ₹${amount} on ${side}`);
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

  // Validate role (only admins can start games)
  if (role !== 'admin') {
    sendError(ws, 'Unauthorized: Only admins can start games');
    return;
  }

  // Validate input
  if (!data || !data.openingCard) {
    sendError(ws, 'Missing required field: openingCard');
    return;
  }

  try {
    const gameState = await gameService.startGame(data.openingCard, userId);

    // Send success response
    ws.send(JSON.stringify({
      type: 'game:started',
      data: gameState,
    }));

    // Broadcast to all clients via the main routes.ts broadcast function
    if (typeof (global as any).broadcast !== 'undefined') {
      (global as any).broadcast({
        type: 'game_start',
        data: gameState,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback: log that global broadcast is not available
      console.log('Global broadcast function not available, game started by admin:', userId);
    }

    console.log(`✅ Game started by admin ${userId}`);
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
  if (!data || !data.gameId || !data.card || !data.side || typeof data.position !== 'number') {
    sendError(ws, 'Missing required fields: gameId, card, side, position');
    return;
  }

  try {
    const gameState = await gameService.dealCard(
      data.gameId,
      data.card,
      data.side,
      data.position,
      userId
    );

    // Send success response
    ws.send(JSON.stringify({
      type: 'card:dealt',
      data: gameState,
    }));

    // Broadcast to all clients via the main routes.ts broadcast function
    if (typeof (global as any).broadcast !== 'undefined') {
      (global as any).broadcast({
        type: 'card_dealt',
        data: {
          card: data.card,
          side: data.side,
          position: data.position,
          isWinningCard: false  // We'll determine this appropriately
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback: log that global broadcast is not available
      console.log('Global broadcast function not available, card dealt by admin:', userId);
    }

    console.log(`✅ Card dealt by admin ${userId}: ${data.card} on ${data.side}`);
  } catch (error: any) {
    console.error('Deal card error:', error);
    sendError(ws, error.message || 'Failed to deal card');
  }
}

/**
 * Handle game subscription
 */
export async function handleGameSubscribe(client: WSClient, data: any) {
  const { ws } = client;

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('Client not connected');
    return;
  }

  try {
    const gameState = await gameService.getCurrentGame();

    ws.send(JSON.stringify({
      type: 'game:state',
      data: gameState,
    }));
  } catch (error: any) {
    console.error('Subscribe error:', error);
    sendError(ws, 'Failed to get game state');
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

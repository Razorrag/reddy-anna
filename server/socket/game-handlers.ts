/**
 * WEBSOCKET GAME HANDLERS
 * 
 * Extracts WebSocket event handlers from server/index.ts
 * Handles all game-related socket events with validation
 */

import { WebSocket } from 'ws';
import { gameService } from '../services/GameService';

interface SocketClient {
  ws: WebSocket;
  userId: string;
  role: 'admin' | 'player';
  authenticated: boolean;
}

/**
 * Register all game-related socket handlers
 */
export function registerGameHandlers(client: SocketClient) {
  const { ws, userId, role } = client;

  // Player places a bet
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'player:bet':
          await handlePlayerBet(client, message.data);
          break;

        case 'admin:start-game':
          await handleStartGame(client, message.data);
          break;

        case 'admin:deal-card':
          await handleDealCard(client, message.data);
          break;

        case 'game:subscribe':
          await handleGameSubscribe(client, message.data);
          break;

        default:
          // Unknown message type
          break;
      }
    } catch (error) {
      console.error('Socket message error:', error);
      sendError(ws, 'Failed to process message');
    }
  });
}

/**
 * Handle player bet
 */
async function handlePlayerBet(client: SocketClient, data: any) {
  const { ws, userId, role } = client;

  // Validate authentication
  if (!client.authenticated) {
    sendError(ws, 'Authentication required');
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

    // Broadcast bet to all clients
    broadcastGameUpdate(gameId, {
      type: 'game:bet-placed',
      data: {
        userId,
        side,
        amount,
        round,
      },
    });

    console.log(`✅ Bet processed: ${userId} bet ₹${amount} on ${side}`);
  } catch (error: any) {
    console.error('Bet error:', error);
    sendError(ws, error.message || 'Failed to place bet');
  }
}

/**
 * Handle admin starting a game
 */
async function handleStartGame(client: SocketClient, data: any) {
  const { ws, userId, role } = client;

  // Validate authentication
  if (!client.authenticated) {
    sendError(ws, 'Authentication required');
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

    // Broadcast to all clients
    broadcastToAll({
      type: 'game:started',
      data: gameState,
    });

    console.log(`✅ Game started by admin ${userId}`);
  } catch (error: any) {
    console.error('Start game error:', error);
    sendError(ws, error.message || 'Failed to start game');
  }
}

/**
 * Handle admin dealing a card
 */
async function handleDealCard(client: SocketClient, data: any) {
  const { ws, userId, role } = client;

  // Validate authentication
  if (!client.authenticated) {
    sendError(ws, 'Authentication required');
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

    // Broadcast to all clients
    broadcastGameUpdate(data.gameId, {
      type: 'game:card-dealt',
      data: {
        card: data.card,
        side: data.side,
        position: data.position,
        gameState,
      },
    });

    console.log(`✅ Card dealt by admin ${userId}: ${data.card} on ${data.side}`);
  } catch (error: any) {
    console.error('Deal card error:', error);
    sendError(ws, error.message || 'Failed to deal card');
  }
}

/**
 * Handle game subscription
 */
async function handleGameSubscribe(client: SocketClient, data: any) {
  const { ws } = client;

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
function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      message,
    }));
  }
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToAll(message: any) {
  // This would be implemented in your main WebSocket server
  // You'd need to maintain a list of all connected clients
  console.log('Broadcasting to all clients:', message.type);
}

/**
 * Broadcast game update to all clients watching a specific game
 */
function broadcastGameUpdate(gameId: string, message: any) {
  // This would be implemented in your main WebSocket server
  // You'd filter clients subscribed to this specific game
  console.log(`Broadcasting game update for ${gameId}:`, message.type);
}

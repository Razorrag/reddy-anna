// WebSocket module for game communication
let wss = null;
const clients = new Map();

import { WebSocketServer } from 'ws';
import { query } from './db.js';

// Initialize WebSocket server
export function initializeWebSocket(server) {
  wss = new WebSocketServer({ server });
  
  // WebSocket connection handler
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    // Generate a unique client ID
    const clientId = Math.random().toString(36).substring(2, 15);
    clients.set(clientId, { ws, userId: null, gameId: null });
    
    // Send client ID to the connected client
    ws.send(JSON.stringify({
      type: 'connection',
      data: { clientId }
    }));
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleWebSocketMessage(clientId, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  console.log('WebSocket server initialized');
}

// Broadcast message to all clients subscribed to a game
export function broadcastToGame(gameId, message) {
  clients.forEach((client) => {
    if (client.gameId === gameId && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// Sync game state from database to client
async function syncGameState(client, gameId) {
  try {
    if (!gameId) {
      gameId = 'default-game';
    }
    
    // Get current game session
    const gameSession = await query('game_sessions', 'select', {
      where: { column: 'game_id', value: gameId }
    });
    
    // Get dealt cards for this game
    const dealtCards = await query('dealt_cards', 'select', {
      where: { column: 'game_id', value: gameId },
      orderBy: { column: 'position', direction: 'asc' }
    });
    
    // Get betting statistics
    const bettingStats = await getBettingStats(gameId);
    
    // Get opening card from settings
    const openingCardSetting = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'opening_card' }
    });
    
    let openingCard = null;
    if (openingCardSetting.length > 0) {
      const cardValue = openingCardSetting[0].setting_value;
      if (cardValue && cardValue.length >= 2) {
        openingCard = {
          rank: cardValue[0],
          suit: cardValue[1]
        };
      }
    }
    
    // Build game state object
    const gameState = {
      phase: 'waiting',
      openingCard: openingCard,
      andarCards: [],
      baharCards: [],
      currentTimer: 30,
      winner: null,
      winningCard: null,
      bettingStats: bettingStats
    };
    
    // Update game state from session if exists
    if (gameSession.length > 0) {
      const session = gameSession[0];
      gameState.phase = session.phase || 'waiting';
      gameState.currentTimer = session.current_timer || 30;
      gameState.winner = session.winner;
      gameState.winningCard = session.winning_card ? {
        rank: session.winning_card[0],
        suit: session.winning_card[1]
      } : null;
    }
    
    // Process dealt cards
    dealtCards.forEach(card => {
      const cardObj = {
        rank: card.card[0],
        suit: card.card[1]
      };
      
      if (card.side === 'andar') {
        gameState.andarCards.push(cardObj);
      } else if (card.side === 'bahar') {
        gameState.baharCards.push(cardObj);
      }
    });
    
    // Send game state to client
    client.ws.send(JSON.stringify({
      type: 'sync_game_state',
      data: {
        gameState: gameState
      }
    }));
    
  } catch (error) {
    console.error('Error syncing game state:', error);
    
    // Send error state
    client.ws.send(JSON.stringify({
      type: 'sync_game_state',
      data: {
        gameState: {
          phase: 'waiting',
          openingCard: null,
          andarCards: [],
          baharCards: [],
          currentTimer: 30,
          winner: null,
          winningCard: null,
          bettingStats: { andarBets: 0, baharBets: 0, totalBets: 0 }
        }
      }
    }));
  }
}

// Get betting statistics for a game
async function getBettingStats(gameId) {
  try {
    // Get total bets for each side
    const andarBetsResult = await query('player_bets', 'select', {
      where: {
        column: 'game_id',
        value: gameId,
        additionalConditions: [
          { column: 'side', value: 'andar' },
          { column: 'status', value: 'active' }
        ]
      }
    });
    
    const baharBetsResult = await query('player_bets', 'select', {
      where: {
        column: 'game_id',
        value: gameId,
        additionalConditions: [
          { column: 'side', value: 'bahar' },
          { column: 'status', value: 'active' }
        ]
      }
    });
    
    // Calculate totals
    const andarTotal = andarBetsResult.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    const baharTotal = baharBetsResult.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    
    return {
      andarBets: andarTotal,
      baharBets: baharTotal,
      totalBets: andarTotal + baharTotal
    };
  } catch (error) {
    console.error('Error getting betting stats:', error);
    return {
      andarBets: 0,
      baharBets: 0,
      totalBets: 0
    };
  }
}

// Broadcast timer update to all clients in a game
export function broadcastTimerUpdate(gameId, timer, phase) {
  console.log(`Broadcasting timer update: ${timer}s for game ${gameId}, phase: ${phase}`);
  broadcastToGame(gameId, {
    type: 'timer_update',
    data: {
      timer: timer,
      phase: phase
    }
  });
}

// Broadcast card dealt to all clients in a game
export function broadcastCardDealt(gameId, card, side, position) {
  broadcastToGame(gameId, {
    type: 'card_dealt',
    data: {
      card: { rank: card[0], suit: card[1] },
      side: side,
      position: position
    }
  });
}

// Broadcast betting stats to all clients in a game
export function broadcastBettingStats(gameId, andarBets, baharBets) {
  broadcastToGame(gameId, {
    type: 'betting_stats',
    data: {
      andarBets: andarBets,
      baharBets: baharBets,
      totalBets: andarBets + baharBets
    }
  });
}

// Broadcast game complete to all clients in a game
export function broadcastGameComplete(gameId, winner, winningCard, totalCards) {
  broadcastToGame(gameId, {
    type: 'game_complete',
    data: {
      winner: winner,
      winningCard: { rank: winningCard[0], suit: winningCard[1] },
      totalCards: totalCards
    }
  });
}

// Broadcast phase change to all clients in a game
export function broadcastPhaseChange(gameId, phase, message) {
  broadcastToGame(gameId, {
    type: 'phase_change',
    data: {
      phase: phase,
      message: message
    }
  });
}

// Broadcast complete game state to all clients in a game
export function broadcastGameState(gameId, gameState) {
  broadcastToGame(gameId, {
    type: 'game_state_update',
    data: {
      gameState: gameState
    }
  });
}

// Broadcast opening card to all clients in a game
export function broadcastOpeningCard(gameId, card) {
  broadcastToGame(gameId, {
    type: 'opening_card_set',
    data: {
      openingCard: {
        rank: card[0],
        suit: card[1]
      }
    }
  });
}

// Handle WebSocket messages from clients
function handleWebSocketMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch (message.type) {
    case 'authenticate':
      // Authenticate user
      client.userId = message.data.userId;
      client.ws.send(JSON.stringify({
        type: 'authenticated',
        data: { userId: message.data.userId }
      }));
      break;
      
    case 'subscribe_game':
      // Subscribe to game updates
      client.gameId = message.data.gameId;
      client.ws.send(JSON.stringify({
        type: 'subscribed',
        data: { gameId: message.data.gameId }
      }));
      break;
      
    case 'sync_request':
      // Handle sync request - fetch current game state from database
      syncGameState(client, message.data.gameId);
      break;
      
    case 'game_state_update':
      // Admin is broadcasting game state update
      if (message.data.gameState && client.userId === 'admin') {
        broadcastToGame(client.gameId, message);
      }
      break;
      
    case 'timer_update':
      // Admin is broadcasting timer update
      if (message.data.timer !== undefined && client.userId === 'admin') {
        broadcastToGame(client.gameId, message);
      }
      break;
      
    case 'card_dealt':
      // Admin is broadcasting card deal
      if (message.data.card && client.userId === 'admin') {
        broadcastToGame(client.gameId, message);
      }
      break;
      
    case 'phase_change':
      // Admin is broadcasting phase change
      if (message.data.phase && client.userId === 'admin') {
        broadcastToGame(client.gameId, message);
      }
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
}
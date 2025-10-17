import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBetSchema, insertGameHistorySchema } from "@shared/schema";
import { z } from "zod";

// WebSocket client tracking
interface WSClient {
  ws: WebSocket;
  userId: string;
  role: 'player' | 'admin';
}

const clients = new Set<WSClient>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    
    let client: WSClient | null = null;
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message.type);
        
        switch (message.type) {
          case 'authenticate':
            // Register client
            client = {
              ws,
              userId: message.data.userId,
              role: message.data.role || 'player'
            };
            clients.add(client);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'authenticated',
              data: { userId: client.userId, role: client.role }
            }));
            
            // Send current game state if it exists
            const currentGame = await storage.getCurrentGameSession();
            if (currentGame) {
              const dealtCards = await storage.getDealtCards(currentGame.gameId);
              const stats = await storage.getBettingStats(currentGame.gameId);
              
              ws.send(JSON.stringify({
                type: 'sync_game_state',
                data: {
                  gameId: currentGame.gameId,
                  openingCard: currentGame.openingCard,
                  phase: currentGame.phase,
                  currentTimer: currentGame.currentTimer,
                  round: currentGame.round,
                  dealtCards,
                  andarBets: stats.andarTotal,
                  baharBets: stats.baharTotal,
                  winner: currentGame.winner,
                  winningCard: currentGame.winningCard,
                }
              }));
            }
            break;
          
          case 'game_start':
            // Create new game session
            const newGame = await storage.createGameSession({
              openingCard: message.data.openingCard,
              phase: 'betting',
              currentTimer: 30,
              round: message.data.round || 1,
            });
            
            // Broadcast to all clients
            broadcast({
              type: 'sync_game_state',
              data: {
                gameId: newGame.gameId,
                openingCard: newGame.openingCard,
                phase: newGame.phase,
                currentTimer: newGame.currentTimer,
                round: newGame.round,
                dealtCards: [],
                andarBets: 0,
                baharBets: 0,
                winner: null,
                winningCard: null,
              }
            });
            break;
          
          case 'timer_update':
            // Update game timer
            const game = await storage.getCurrentGameSession();
            if (game) {
              await storage.updateGameSession(game.gameId, {
                currentTimer: message.data.seconds,
                phase: message.data.phase
              });
            }
            
            // Broadcast timer update to all clients
            broadcast({
              type: 'timer_update',
              data: message.data
            });
            break;
          
          case 'place_bet':
            try {
              // Validate bet
              const betData = insertBetSchema.parse(message.data);
              
              // Check if betting is allowed
              const gameSession = await storage.getCurrentGameSession();
              if (!gameSession || gameSession.phase !== 'betting') {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'Betting is closed' }
                }));
                break;
              }
              
              // Place bet
              const bet = await storage.placeBet(betData);
              
              // Get updated betting stats
              const updatedStats = await storage.getBettingStats(betData.gameId);
              
              // Broadcast betting stats update
              broadcast({
                type: 'betting_stats',
                data: updatedStats
              });
              
              // Send confirmation to player
              ws.send(JSON.stringify({
                type: 'bet_placed',
                data: bet
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: error instanceof Error ? error.message : 'Invalid bet' }
              }));
            }
            break;
          
          case 'card_dealt':
            // Record dealt card
            const gameForCard = await storage.getCurrentGameSession();
            if (gameForCard) {
              const dealtCard = await storage.dealCard({
                gameId: message.data.gameId,
                card: message.data.card,
                side: message.data.side,
                position: message.data.position,
                isWinningCard: message.data.isWinningCard
              });
              
              // Broadcast to all clients
              broadcast({
                type: 'card_dealt',
                data: dealtCard
              });
            }
            break;
          
          case 'game_complete':
            const completedGame = await storage.getCurrentGameSession();
            if (completedGame) {
              // Complete game session
              await storage.completeGameSession(
                message.data.gameId,
                message.data.winner,
                message.data.winningCard
              );
              
              // Add to game history
              await storage.addGameHistory({
                gameId: message.data.gameId,
                openingCard: completedGame.openingCard!,
                winner: message.data.winner,
                winningCard: message.data.winningCard,
                totalCards: message.data.totalCards,
                round: message.data.round,
              });
              
              // Get all bets for this game
              const gameBets = await storage.getBetsForGame(message.data.gameId);
              
              // Update bet statuses and user balances
              for (const bet of gameBets) {
                const won = bet.side === message.data.winner;
                await storage.updateBetStatus(bet.id, won ? 'won' : 'lost');
                
                // Update user balance if won (1:1 payout + original bet)
                if (won) {
                  const user = await storage.getUser(bet.userId);
                  if (user) {
                    const payout = bet.amount * 2;
                    await storage.updateUserBalance(bet.userId, user.balance + payout);
                  }
                }
              }
              
              // Broadcast game complete
              broadcast({
                type: 'game_complete',
                data: message.data
              });
            }
            break;
          
          case 'phase_change':
            const phaseGame = await storage.getCurrentGameSession();
            if (phaseGame) {
              await storage.updateGameSession(phaseGame.gameId, {
                phase: message.data.phase
              });
            }
            
            // Broadcast phase change
            broadcast({
              type: 'phase_change',
              data: message.data
            });
            break;
          
          case 'game_reset':
            // Broadcast reset to all clients
            broadcast({
              type: 'game_reset',
              data: message.data
            });
            break;
          
          case 'settings_update':
            await storage.updateGameSettings(message.data);
            
            // Broadcast settings update
            broadcast({
              type: 'settings_update',
              data: message.data
            });
            break;
          
          case 'stream_status_update':
            // Broadcast stream status update
            broadcast({
              type: 'stream_status_update',
              data: message.data
            });
            break;
          
          case 'sync_request':
            // Send current game state to requesting client
            const syncGame = await storage.getCurrentGameSession();
            if (syncGame) {
              const syncCards = await storage.getDealtCards(syncGame.gameId);
              const syncStats = await storage.getBettingStats(syncGame.gameId);
              
              ws.send(JSON.stringify({
                type: 'sync_game_state',
                data: {
                  gameId: syncGame.gameId,
                  openingCard: syncGame.openingCard,
                  phase: syncGame.phase,
                  currentTimer: syncGame.currentTimer,
                  round: syncGame.round,
                  dealtCards: syncCards,
                  andarBets: syncStats.andarTotal,
                  baharBets: syncStats.baharTotal,
                  winner: syncGame.winner,
                  winningCard: syncGame.winningCard,
                }
              }));
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Server error' }
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket disconnected');
      if (client) {
        clients.delete(client);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Broadcast helper function
  function broadcast(message: any, excludeWs?: WebSocket) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }
  
  // REST API endpoints
  
  // Get game history
  app.get('/api/game-history', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await storage.getGameHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch game history' });
    }
  });
  
  // Get current game state
  app.get('/api/game/current', async (req, res) => {
    try {
      const game = await storage.getCurrentGameSession();
      if (!game) {
        return res.status(404).json({ error: 'No active game' });
      }
      
      const dealtCards = await storage.getDealtCards(game.gameId);
      const stats = await storage.getBettingStats(game.gameId);
      
      res.json({
        gameId: game.gameId,
        openingCard: game.openingCard,
        phase: game.phase,
        currentTimer: game.currentTimer,
        round: game.round,
        dealtCards,
        andarBets: stats.andarTotal,
        baharBets: stats.baharTotal,
        winner: game.winner,
        winningCard: game.winningCard,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch game state' });
    }
  });
  
  // Get game settings
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getGameSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });
  
  // Update game settings
  app.post('/api/settings', async (req, res) => {
    try {
      await storage.updateGameSettings(req.body);
      const settings = await storage.getGameSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });
  
  // Get user bets
  app.get('/api/bets/user/:userId', async (req, res) => {
    try {
      const game = await storage.getCurrentGameSession();
      if (!game) {
        return res.json([]);
      }
      
      const bets = await storage.getBetsForUser(req.params.userId, game.gameId);
      res.json(bets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bets' });
    }
  });
  
  // Get betting statistics
  app.get('/api/bets/stats/:gameId', async (req, res) => {
    try {
      const stats = await storage.getBettingStats(req.params.gameId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch betting stats' });
    }
  });

  return httpServer;
}

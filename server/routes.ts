import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage"; // Using in-memory storage for development
import { insertBetSchema, insertGameHistorySchema } from "@shared/schema";
import { z } from "zod";
import { hashPassword, comparePassword, validatePassword, validateUsername } from "./lib/auth";
import { authLimiter, betLimiter, apiLimiter } from "./middleware/rateLimiter";

// WebSocket client tracking
interface WSClient {
  ws: WebSocket;
  userId: string;
  role: 'player' | 'admin';
  wallet: number;
}

const clients = new Set<WSClient>();

// Standardized game phases - matches frontend exactly
type GamePhase = 'idle' | 'betting' | 'dealing' | 'complete';

// Broadcast to all connected clients
function broadcast(message: any, excludeClient?: WSClient) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client !== excludeClient && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// Broadcast to specific role
function broadcastToRole(message: any, role: 'player' | 'admin') {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.role === role && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// Game state management with user bet tracking
interface UserBets {
  round1: { andar: number; bahar: number };
  round2: { andar: number; bahar: number };
}

let currentGameState = {
  gameId: 'default-game',
  openingCard: null as string | null,
  phase: 'idle' as GamePhase,
  currentRound: 1 as 1 | 2 | 3,
  timer: 0,
  andarCards: [] as string[],
  baharCards: [] as string[],
  winner: null as string | null,
  winningCard: null as string | null,
  round1Bets: { andar: 0, bahar: 0 },
  round2Bets: { andar: 0, bahar: 0 },
  userBets: new Map<string, UserBets>(), // Track individual user bets
  timerInterval: null as NodeJS.Timeout | null,
  bettingLocked: false // Prevent bets after timer expires
};

// Timer management - backend as source of truth
function startTimer(duration: number, onComplete: () => void) {
  if (currentGameState.timerInterval) {
    clearInterval(currentGameState.timerInterval);
  }
  
  currentGameState.timer = duration;
  currentGameState.bettingLocked = false; // Unlock betting when timer starts
  
  // Broadcast initial timer value immediately for instant sync
  broadcast({
    type: 'timer_update',
    data: {
      seconds: currentGameState.timer,
      phase: currentGameState.phase,
      round: currentGameState.currentRound
    }
  });
  
  currentGameState.timerInterval = setInterval(() => {
    currentGameState.timer--;
    
    // Broadcast timer update to all clients
    broadcast({
      type: 'timer_update',
      data: {
        seconds: currentGameState.timer,
        phase: currentGameState.phase,
        round: currentGameState.currentRound
      }
    });
    
    if (currentGameState.timer <= 0) {
      if (currentGameState.timerInterval) {
        clearInterval(currentGameState.timerInterval);
        currentGameState.timerInterval = null;
      }
      
      // Lock betting when timer expires
      currentGameState.bettingLocked = true;
      
      // Execute completion callback
      onComplete();
    }
  }, 1000);
}

// Check for winner
function checkWinner(card: string): boolean {
  if (!currentGameState.openingCard) return false;
  
  // Extract rank from card (e.g., "7♥" → "7")
  const cardRank = card.replace(/[♠♥♦♣]/g, '');
  const openingRank = currentGameState.openingCard.replace(/[♠♥♦♣]/g, '');
  
  return cardRank === openingRank;
}

// Calculate payouts based on round - matches exact game requirements
function calculatePayout(
  round: number,
  winner: 'andar' | 'bahar',
  playerBets: { round1: { andar: number; bahar: number }, round2: { andar: number; bahar: number } }
): number {
  if (round === 1) {
    // Round 1: Andar wins = 1:1 (double money), Bahar wins = 1:0 (refund only)
    if (winner === 'andar') {
      return playerBets.round1.andar * 2; // 1:1 payout (stake + winnings)
    } else {
      return playerBets.round1.bahar; // Refund only (stake back)
    }
  } else if (round === 2) {
    // Round 2: Andar wins = ALL bets (R1+R2) paid 1:1
    //          Bahar wins = R1 bets paid 1:1, R2 bets refunded
    if (winner === 'andar') {
      const totalAndar = playerBets.round1.andar + playerBets.round2.andar;
      return totalAndar * 2; // ALL bets paid 1:1
    } else {
      const round1Payout = playerBets.round1.bahar * 2; // R1 paid 1:1
      const round2Refund = playerBets.round2.bahar; // R2 refund only
      return round1Payout + round2Refund;
    }
  } else {
    // Round 3 (Continuous Draw): BOTH sides paid 1:1 on total invested (R1+R2)
    const totalBet = playerBets.round1[winner] + playerBets.round2[winner];
    return totalBet * 2; // 1:1 payout on total
  }
}

// Auto-transition to Round 2
async function transitionToRound2() {
  console.log('Auto-transitioning to Round 2...');
  
  currentGameState.currentRound = 2;
  currentGameState.phase = 'betting';
  currentGameState.bettingLocked = false; // Unlock betting for Round 2
  
  // Update database
  await storage.updateGameSession(currentGameState.gameId, {
    phase: 'betting',
    round: 2,
    currentTimer: 30
  });
  
  // Broadcast Round 2 start with locked R1 bets
  broadcast({
    type: 'start_round_2',
    data: {
      gameId: currentGameState.gameId,
      timer: 30,
      round: 2,
      round1Bets: currentGameState.round1Bets, // Show locked R1 bets
      message: 'Round 2 betting open! Add more bets.'
    }
  });
  
  // Start Round 2 timer (30 seconds)
  startTimer(30, async () => {
    currentGameState.phase = 'dealing';
    currentGameState.bettingLocked = true;
    
    // Update database
    await storage.updateGameSession(currentGameState.gameId, {
      phase: 'dealing',
      round: 2
    });
    
    broadcast({
      type: 'phase_change',
      data: { 
        phase: 'dealing', 
        round: 2,
        message: 'Round 2 betting closed. Admin will deal cards.' 
      }
    });
  });
}

// Auto-transition to Round 3 (Continuous Draw)
async function transitionToRound3() {
  console.log('Auto-transitioning to Round 3 (Continuous Draw)...');
  
  currentGameState.currentRound = 3;
  currentGameState.phase = 'dealing';
  currentGameState.bettingLocked = true; // Lock all betting permanently
  currentGameState.timer = 0; // No timer in Round 3
  
  // Update database
  await storage.updateGameSession(currentGameState.gameId, {
    phase: 'dealing',
    round: 3,
    currentTimer: 0
  });
  
  // Broadcast Round 3 start with all locked bets
  broadcast({
    type: 'start_final_draw',
    data: {
      gameId: currentGameState.gameId,
      round: 3,
      round1Bets: currentGameState.round1Bets,
      round2Bets: currentGameState.round2Bets,
      message: 'Round 3: Continuous Draw! All bets locked. Dealing until match found.'
    }
  });
}

// Complete game and distribute payouts
async function completeGame(winner: 'andar' | 'bahar', winningCard: string) {
  console.log(`Game complete! Winner: ${winner}, Card: ${winningCard}, Round: ${currentGameState.currentRound}`);
  
  currentGameState.winner = winner;
  currentGameState.winningCard = winningCard;
  currentGameState.phase = 'complete';
  currentGameState.bettingLocked = true;
  
  // Clear timer if running
  if (currentGameState.timerInterval) {
    clearInterval(currentGameState.timerInterval);
    currentGameState.timerInterval = null;
  }
  
  // Update database
  await storage.updateGameSession(currentGameState.gameId, {
    phase: 'complete',
    winner,
    winningCard,
    winningRound: currentGameState.currentRound,
    status: 'completed'
  });
  
  // Calculate and distribute payouts using in-memory userBets
  const payouts: Record<string, number> = {};
  
  for (const [userId, bets] of Array.from(currentGameState.userBets.entries())) {
    const payout = calculatePayout(currentGameState.currentRound, winner, bets);
    payouts[userId] = payout;
    
    // Update user balance
    if (payout > 0) {
      await storage.updateUserBalance(userId, payout);
      
      // Update bet status to won
      await storage.updateBetStatusByGameUser(currentGameState.gameId, userId, winner, 'won');
    } else {
      // Update bet status to lost
      const loserSide = winner === 'andar' ? 'bahar' : 'andar';
      await storage.updateBetStatusByGameUser(currentGameState.gameId, userId, loserSide, 'lost');
    }
    
    // Send updated balance to each player
    const updatedUser = await storage.getUserById(userId);
    if (updatedUser) {
      // Find client and send balance update
      clients.forEach(client => {
        if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'balance_update',
            data: { balance: updatedUser.balance }
          }));
          
          // Send payout details
          client.ws.send(JSON.stringify({
            type: 'payout_received',
            data: {
              amount: payout,
              winner,
              round: currentGameState.currentRound,
              yourBets: bets
            }
          }));
        }
      });
    }
  }
  
  // Broadcast game complete to all
  broadcast({
    type: 'game_complete',
    data: {
      winner,
      winningCard,
      round: currentGameState.currentRound,
      payouts,
      round1Bets: currentGameState.round1Bets,
      round2Bets: currentGameState.round2Bets
    }
  });
  
  // Save to game history
  await storage.saveGameHistory({
    gameId: currentGameState.gameId,
    openingCard: currentGameState.openingCard!,
    winner,
    winningCard,
    totalCards: currentGameState.andarCards.length + currentGameState.baharCards.length,
    round: currentGameState.currentRound
  });
}

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
        console.log('Received WebSocket message:', message.type);
        
        switch (message.type) {
          case 'authenticate':
          case 'connection':
            // Register client
            client = {
              ws,
              userId: message.data?.userId || 'anonymous',
              role: message.data?.role || 'player',
              wallet: message.data?.wallet || 0,
            };
            clients.add(client);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'authenticated',
              data: { userId: client.userId, role: client.role, wallet: client.wallet }
            }));
            
            // Get user-specific bets if they exist
            const userBets = currentGameState.userBets.get(client.userId) || {
              round1: { andar: 0, bahar: 0 },
              round2: { andar: 0, bahar: 0 }
            };
            
            // Send current game state with user-specific data
            ws.send(JSON.stringify({
              type: 'sync_game_state',
              data: {
                gameId: currentGameState.gameId,
                openingCard: currentGameState.openingCard,
                phase: currentGameState.phase,
                currentRound: currentGameState.currentRound,
                countdown: currentGameState.timer,
                andarCards: currentGameState.andarCards,
                baharCards: currentGameState.baharCards,
                winner: currentGameState.winner,
                winningCard: currentGameState.winningCard,
                andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
                baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
                round1Bets: currentGameState.round1Bets,
                round2Bets: currentGameState.round2Bets,
                userRound1Bets: userBets.round1,
                userRound2Bets: userBets.round2,
                bettingLocked: currentGameState.bettingLocked
              }
            }));
            break;
          
          case 'opening_card_set':
          case 'opening_card_confirmed':
          case 'game_start':
            // Validate admin role
            if (!client || client.role !== 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Admin privileges required' }
              }));
              break;
            }
            
            // Set opening card and start Round 1
            currentGameState.openingCard = message.data.openingCard?.display || message.data.openingCard;
            currentGameState.phase = 'betting';
            currentGameState.currentRound = 1;
            currentGameState.andarCards = [];
            currentGameState.baharCards = [];
            currentGameState.winner = null;
            currentGameState.winningCard = null;
            currentGameState.round1Bets = { andar: 0, bahar: 0 };
            currentGameState.round2Bets = { andar: 0, bahar: 0 };
            currentGameState.userBets = new Map<string, UserBets>(); // Reset user bets
            currentGameState.bettingLocked = false; // Unlock betting for new game
            
            // Save to database
            const newGame = await storage.createGameSession({
              openingCard: currentGameState.openingCard,
              phase: 'betting',
              round: 1,
              currentTimer: message.data.timer || 30
            });
            currentGameState.gameId = newGame.gameId;
            
            // Broadcast to all clients
            broadcast({
              type: 'opening_card_confirmed',
              data: {
                openingCard: currentGameState.openingCard,
                phase: 'betting',
                round: 1,
                gameId: currentGameState.gameId
              }
            });
            
            // Start Round 1 timer
            const timerDuration = message.data.timer || 30;
            startTimer(timerDuration, async () => {
              currentGameState.phase = 'dealing';
              currentGameState.bettingLocked = true;
              
              // Update database
              await storage.updateGameSession(currentGameState.gameId, {
                phase: 'dealing',
                round: 1
              });
              
              broadcast({
                type: 'phase_change',
                data: { 
                  phase: 'dealing', 
                  round: 1,
                  message: 'Round 1 betting closed. Admin will deal cards.' 
                }
              });
            });
            
            broadcast({
              type: 'timer_start',
              data: { seconds: timerDuration, phase: 'betting', round: 1 }
            });
            break;
          
          case 'bet_placed':
          case 'place_bet':
            if (!client) break;
            
            const betAmount = message.data.amount;
            const betSide = message.data.side;
            const betRound = currentGameState.currentRound;
            
            // Validate bet amount (schema limits: 1000-50000)
            if (!betAmount || betAmount < 1000 || betAmount > 50000) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: `Invalid bet amount. Must be between ₹1,000 and ₹50,000` }
              }));
              break;
            }
            
            // Validate bet side
            if (betSide !== 'andar' && betSide !== 'bahar') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Invalid bet side. Must be andar or bahar' }
              }));
              break;
            }
            
            // Validate betting phase
            if (currentGameState.phase !== 'betting') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Betting is closed' }
              }));
              break;
            }
            
            // Validate betting not locked
            if (currentGameState.bettingLocked) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Betting time has expired' }
              }));
              break;
            }
            
            // Validate round 3 cannot accept bets
            if (betRound === 3) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'No betting allowed in Round 3' }
              }));
              break;
            }
            
            // Check user has sufficient balance
            const currentUser = await storage.getUserById(client.userId);
            if (!currentUser || currentUser.balance < betAmount) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Insufficient balance' }
              }));
              break;
            }
            
            // Initialize user bets if not exists
            if (!currentGameState.userBets.has(client.userId)) {
              currentGameState.userBets.set(client.userId, {
                round1: { andar: 0, bahar: 0 },
                round2: { andar: 0, bahar: 0 }
              });
            }
            
            // Save bet to database
            await storage.createBet({
              userId: client.userId,
              gameId: currentGameState.gameId,
              round: betRound,
              side: betSide,
              amount: betAmount,
              status: 'pending'
            });
            
            // Update user-specific bet tracking
            const userBet = currentGameState.userBets.get(client.userId)!;
            if (betRound === 1) {
              userBet.round1[betSide as 'andar' | 'bahar'] += betAmount;
              currentGameState.round1Bets[betSide as 'andar' | 'bahar'] += betAmount;
            } else if (betRound === 2) {
              userBet.round2[betSide as 'andar' | 'bahar'] += betAmount;
              currentGameState.round2Bets[betSide as 'andar' | 'bahar'] += betAmount;
            }
            
            // Deduct from user balance
            await storage.updateUserBalance(client.userId, -betAmount);
            
            // Get updated balance and send to client
            const updatedUser = await storage.getUserById(client.userId);
            if (updatedUser) {
              ws.send(JSON.stringify({
                type: 'balance_update',
                data: { balance: updatedUser.balance }
              }));
              
              // Send user's locked bets from previous rounds
              ws.send(JSON.stringify({
                type: 'user_bets_update',
                data: {
                  round1Bets: userBet.round1,
                  round2Bets: userBet.round2,
                  currentRound: betRound
                }
              }));
            }
            
            // Broadcast updated betting stats to all
            broadcast({
              type: 'betting_stats',
              data: {
                andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
                baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
                round1Bets: currentGameState.round1Bets,
                round2Bets: currentGameState.round2Bets,
                round: betRound
              }
            });
            break;
          
          case 'card_dealt':
          case 'deal_card':
            // Validate admin role
            if (!client || client.role !== 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Admin privileges required to deal cards' }
              }));
              break;
            }
            
            const card = message.data.card?.display || message.data.card;
            const side = message.data.side;
            const position = message.data.position || (side === 'bahar' ? currentGameState.baharCards.length + 1 : currentGameState.andarCards.length + 1);
            
            // Add card to appropriate side
            if (side === 'andar') {
              currentGameState.andarCards.push(card);
            } else {
              currentGameState.baharCards.push(card);
            }
            
            // Save to database
            await storage.createDealtCard({
              gameId: currentGameState.gameId,
              card,
              side,
              position,
              isWinningCard: false
            });
            
            // Check for winner
            const isWinner = checkWinner(card);
            
            // Broadcast card dealt
            broadcast({
              type: 'card_dealt',
              data: {
                card: { display: card, value: card.replace(/[♠♥♦♣]/g, ''), suit: card.match(/[♠♥♦♣]/)?.[0] || '' },
                side,
                position,
                isWinningCard: isWinner
              }
            });
            
            if (isWinner) {
              // Winner found!
              await completeGame(side as 'andar' | 'bahar', card);
            } else {
              // Check if round is complete
              const roundComplete = (currentGameState.currentRound === 1 && currentGameState.andarCards.length === 1 && currentGameState.baharCards.length === 1) ||
                                   (currentGameState.currentRound === 2 && currentGameState.andarCards.length === 2 && currentGameState.baharCards.length === 2);
              
              if (roundComplete) {
                // Auto-transition to next round
                if (currentGameState.currentRound === 1) {
                  setTimeout(() => transitionToRound2(), 2000);
                } else if (currentGameState.currentRound === 2) {
                  setTimeout(() => transitionToRound3(), 2000);
                }
              }
            }
            break;
          
          case 'start_round_2':
            // Validate admin role
            if (!client || client.role !== 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Admin privileges required' }
              }));
              break;
            }
            await transitionToRound2();
            break;
          
          case 'start_final_draw':
            // Validate admin role
            if (!client || client.role !== 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Admin privileges required' }
              }));
              break;
            }
            await transitionToRound3();
            break;
          
          case 'game_reset':
            // Validate admin role
            if (!client || client.role !== 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Admin privileges required to reset game' }
              }));
              break;
            }
            // Clear timer
            if (currentGameState.timerInterval) {
              clearInterval(currentGameState.timerInterval);
              currentGameState.timerInterval = null;
            }
            
            // Reset game state
            currentGameState = {
              gameId: `game-${Date.now()}`,
              openingCard: null,
              phase: 'idle' as GamePhase,
              currentRound: 1 as 1 | 2 | 3,
              timer: 0,
              andarCards: [],
              baharCards: [],
              winner: null,
              winningCard: null,
              round1Bets: { andar: 0, bahar: 0 },
              round2Bets: { andar: 0, bahar: 0 },
              userBets: new Map<string, UserBets>(),
              timerInterval: null,
              bettingLocked: false
            };
            
            // Broadcast reset
            broadcast({
              type: 'game_reset',
              data: { round: 1 }
            });
            break;
          
          case 'timer_update':
            // Ignore - this is sent by server, not received from clients
            break;
          
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        if (client) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Failed to process message' }
          }));
        }
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      if (client) {
        clients.delete(client);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (client) {
        clients.delete(client);
      }
    });
  });
  
  // REST API Routes
  
  // Auth routes
  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Validate inputs
      const usernameError = validateUsername(username);
      if (usernameError) {
        return res.status(400).json({ error: usernameError });
      }
      
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
      
      // Check if user exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });
      
      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      (req.session as any).balance = user.balance;
      
      res.json({
        id: user.id,
        username: user.username,
        balance: user.balance,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });
  
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      (req.session as any).balance = user.balance;
      
      res.json({
        id: user.id,
        username: user.username,
        balance: user.balance,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });
  
  app.get("/api/auth/me", (req, res) => {
    const session = req.session as any;
    if (!session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    res.json({
      id: session.userId,
      username: session.username,
      balance: session.balance,
    });
  });
  
  // Game routes
  app.get("/api/game/current", async (req, res) => {
    try {
      res.json({
        gameId: currentGameState.gameId,
        openingCard: currentGameState.openingCard,
        phase: currentGameState.phase,
        currentRound: currentGameState.currentRound,
        timer: currentGameState.timer,
        andarCards: currentGameState.andarCards,
        baharCards: currentGameState.baharCards,
        winner: currentGameState.winner,
        winningCard: currentGameState.winningCard,
        round1Bets: currentGameState.round1Bets,
        round2Bets: currentGameState.round2Bets
      });
    } catch (error) {
      console.error("Get current game error:", error);
      res.status(500).json({ error: "Failed to get game state" });
    }
  });
  
  app.get("/api/game/history", async (req, res) => {
    try {
      const history = await storage.getGameHistory(50);
      res.json(history);
    } catch (error) {
      console.error("Get game history error:", error);
      res.status(500).json({ error: "Failed to get game history" });
    }
  });
  
  app.get("/api/user/balance", async (req, res) => {
    try {
      const session = req.session as any;
      if (!session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserById(session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ balance: user.balance });
    } catch (error) {
      console.error("Get balance error:", error);
      res.status(500).json({ error: "Failed to get balance" });
    }
  });
  
  return httpServer;
}

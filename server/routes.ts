// Enhanced Server Routes with Complete Backend Integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage-supabase";
import { 
  registerUser, 
  loginUser, 
  loginAdmin,
  generateToken,
  verifyToken
} from './auth';
import { processPayment, getTransactionHistory } from './payment';
import { 
  updateSiteContent, 
  getSiteContent, 
  updateSystemSettings, 
  getSystemSettings 
} from './content-management';
import { 
  updateUserProfile, 
  getUserDetails, 
  getUserGameHistory, 
  getAllUsers, 
  updateUserStatus, 
  updateUserBalance,
  getUserStatistics,
  getReferredUsers,
  bulkUpdateUserStatus,
  exportUserData
} from './user-management';
import { 
  authLimiter, 
  generalLimiter, 
  apiLimiter,
  paymentLimiter,
  gameLimiter,
  securityMiddleware,
  validateAdminAccess,
  validateInput,
  auditLogger
} from './security';
import { validateUserData } from './validation';

// WebSocket client tracking
interface WSClient {
  ws: WebSocket;
  userId: string;
  role: 'player' | 'admin';
  wallet: number;
}

const clients = new Set<WSClient>();

// WebSocket bet rate limiting
interface BetRateLimit {
  count: number;
  resetTime: number;
}
const userBetRateLimits = new Map<string, BetRateLimit>();

// Game phases
type GamePhase = 'idle' | 'betting' | 'dealing' | 'complete';

// User bets tracking
interface UserBets {
  round1: { andar: number; bahar: number };
  round2: { andar: number; bahar: number };
}

// Game state management
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
  userBets: new Map<string, UserBets>(),
  timerInterval: null as NodeJS.Timeout | null,
  bettingLocked: false
};

// WebSocket broadcast functions
function broadcast(message: any, excludeClient?: WSClient) {
  const messageStr = JSON.stringify({...message, timestamp: Date.now()});
  clients.forEach(client => {
    if (client !== excludeClient && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

function broadcastToRole(message: any, role: 'player' | 'admin') {
  const messageStr = JSON.stringify({...message, timestamp: Date.now()});
  clients.forEach(client => {
    if (client.role === role && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// Timer management
function startTimer(duration: number, onComplete: () => void) {
  if (currentGameState.timerInterval) {
    clearInterval(currentGameState.timerInterval);
  }
  
  currentGameState.timer = duration;
  currentGameState.bettingLocked = false;
  
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
      
      currentGameState.bettingLocked = true;
      onComplete();
    }
  }, 1000);
}

// Game logic functions
function checkWinner(card: string): boolean {
  if (!currentGameState.openingCard) return false;
  
  const cardRank = card.replace(/[♠♥♦♣]/g, '');
  const openingRank = currentGameState.openingCard.replace(/[♠♥♦♣]/g, '');
  
  return cardRank === openingRank;
}

function calculatePayout(
  round: number,
  winner: 'andar' | 'bahar',
  playerBets: { round1: { andar: number; bahar: number }, round2: { andar: number; bahar: number } }
): number {
  if (round === 1) {
    // Round 1: Andar wins 1:1 (double), Bahar wins 1:0 (refund only)
    if (winner === 'andar') {
      return playerBets.round1.andar * 2; // 1:1 payout (stake + profit)
    } else {
      return playerBets.round1.bahar; // 1:0 payout (refund only)
    }
  } else if (round === 2) {
    // Round 2: Andar wins 1:1 on all Andar bets, Bahar wins mixed (1:1 on R1, 1:0 on R2)
    if (winner === 'andar') {
      const totalAndar = playerBets.round1.andar + playerBets.round2.andar;
      return totalAndar * 2; // 1:1 on all Andar bets
    } else {
      const round1Payout = playerBets.round1.bahar * 2; // 1:1 on Round 1 Bahar
      const round2Refund = playerBets.round2.bahar; // 1:0 on Round 2 Bahar
      return round1Payout + round2Refund;
    }
  } else {
    // Round 3 (Continuous Draw): Both sides win 1:1 on total combined bets
    const totalBet = playerBets.round1[winner] + playerBets.round2[winner];
    return totalBet * 2; // 1:1 payout on total investment
  }
}

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Apply security middleware
  app.use(securityMiddleware);
  
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
            client = {
              ws,
              userId: message.data?.userId || 'anonymous',
              role: message.data?.role || 'player',
              wallet: message.data?.wallet || 0,
            };
            clients.add(client);
            
            ws.send(JSON.stringify({
              type: 'authenticated',
              data: { userId: client.userId, role: client.role, wallet: client.wallet }
            }));
            
            const userBets = currentGameState.userBets.get(client.userId) || {
              round1: { andar: 0, bahar: 0 },
              round2: { andar: 0, bahar: 0 }
            };
            
            const openingCardForSync = currentGameState.openingCard ? {
              id: currentGameState.openingCard,
              display: currentGameState.openingCard,
              value: currentGameState.openingCard?.replace(/[♠♥♦♣]/g, '') || '',
              suit: currentGameState.openingCard?.match(/[♠♥♦♣]/)?.[0] || '',
              color: (currentGameState.openingCard?.match(/[♥♦]/) ? 'red' : 'black') as 'red' | 'black',
              rank: currentGameState.openingCard?.replace(/[♠♥♦♣]/g, '') || ''
            } : null;

            ws.send(JSON.stringify({
              type: 'sync_game_state',
              data: {
                gameId: currentGameState.gameId,
                openingCard: openingCardForSync,
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
            // Admin privileges removed for development - anyone can control the game
            
            currentGameState.openingCard = message.data.openingCard?.display || message.data.openingCard;
            currentGameState.phase = 'betting';
            currentGameState.currentRound = 1;
            currentGameState.andarCards = [];
            currentGameState.baharCards = [];
            currentGameState.winner = null;
            currentGameState.winningCard = null;
            currentGameState.round1Bets = { andar: 0, bahar: 0 };
            currentGameState.round2Bets = { andar: 0, bahar: 0 };
            currentGameState.userBets = new Map<string, UserBets>();
            currentGameState.bettingLocked = false;
            
            const timerDuration = message.data.timer || 30;
            
            const newGame = await storage.createGameSession({
              openingCard: currentGameState.openingCard,
              phase: 'betting',
              round: 1,
              currentTimer: timerDuration
            });
            currentGameState.gameId = newGame.gameId;
            
            broadcast({ 
              type: 'opening_card_confirmed',
              data: { 
                openingCard: {
                  id: currentGameState.openingCard,
                  display: currentGameState.openingCard,
                  value: currentGameState.openingCard?.replace(/[♠♥♦♣]/g, '') || '',
                  suit: currentGameState.openingCard?.match(/[♠♥♦♣]/)?.[0] || '',
                  color: (currentGameState.openingCard?.match(/[♥♦]/) ? 'red' : 'black') as 'red' | 'black',
                  rank: currentGameState.openingCard?.replace(/[♠♥♦♣]/g, '') || ''
                },
                phase: 'betting',
                round: 1,
                timer: timerDuration,
                gameId: currentGameState.gameId
              }
            });
            startTimer(timerDuration, async () => {
              currentGameState.phase = 'dealing';
              currentGameState.bettingLocked = true;
              
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
            
            // Rate limiting
            const now = Date.now();
            const userLimit = userBetRateLimits.get(client.userId);
            
            if (userLimit && now < userLimit.resetTime) {
              if (userLimit.count >= 30) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'Too many bets. Please slow down (max 30 bets per minute).' }
                }));
                break;
              }
              userLimit.count++;
            } else {
              userBetRateLimits.set(client.userId, { 
                count: 1, 
                resetTime: now + 60000
              });
            }
            
            // Validation
            if (!betAmount || betAmount < 1000 || betAmount > 50000) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: `Invalid bet amount. Must be between ₹1,000 and ₹50,000` }
              }));
              break;
            }
            
            if (betSide !== 'andar' && betSide !== 'bahar') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Invalid bet side. Must be andar or bahar' }
              }));
              break;
            }
            
            if (currentGameState.phase !== 'betting' || currentGameState.bettingLocked) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Betting is closed' }
              }));
              break;
            }
            
            if (betRound === 3) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'No betting allowed in Round 3' }
              }));
              break;
            }
            
            const currentUser = await storage.getUserById(client.userId);
            if (!currentUser || currentUser.balance < betAmount) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Insufficient balance' }
              }));
              break;
            }
            
            if (!currentGameState.userBets.has(client.userId)) {
              currentGameState.userBets.set(client.userId, {
                round1: { andar: 0, bahar: 0 },
                round2: { andar: 0, bahar: 0 }
              });
            }
            
            await storage.createBet({
              userId: client.userId,
              gameId: currentGameState.gameId,
              round: betRound,
              side: betSide,
              amount: betAmount,
              status: 'pending'
            });
            
            const userBet = currentGameState.userBets.get(client.userId)!;
            if (betRound === 1) {
              userBet.round1[betSide as 'andar' | 'bahar'] += betAmount;
              currentGameState.round1Bets[betSide as 'andar' | 'bahar'] += betAmount;
            } else if (betRound === 2) {
              userBet.round2[betSide as 'andar' | 'bahar'] += betAmount;
              currentGameState.round2Bets[betSide as 'andar' | 'bahar'] += betAmount;
            }
            
            await storage.updateUserBalance(client.userId, -betAmount);
            
            const updatedUser = await storage.getUserById(client.userId);
            if (updatedUser) {
              ws.send(JSON.stringify({
                type: 'balance_update',
                data: { balance: updatedUser.balance }
              }));
              
              ws.send(JSON.stringify({
                type: 'user_bets_update',
                data: {
                  round1Bets: userBet.round1,
                  round2Bets: userBet.round2,
                  currentRound: betRound
                }
              }));
            }
            
            broadcast({ 
              type: 'betting_stats',
              data: {
                andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
                baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
                round1Bets: currentGameState.round1Bets,
                round2Bets: currentGameState.round2Bets
              }
            });
            break;
          
          case 'card_dealt':
          case 'deal_card':
            // Admin privileges removed for development - anyone can deal cards
            
            const card = message.data.card?.display || message.data.card;
            const side = message.data.side;
            const position = message.data.position || (side === 'bahar' ? currentGameState.baharCards.length + 1 : currentGameState.andarCards.length + 1);
            
            if (side === 'andar') {
              currentGameState.andarCards.push(card);
            } else {
              currentGameState.baharCards.push(card);
            }
            
            await storage.createDealtCard({
              gameId: currentGameState.gameId,
              card,
              side,
              position,
              isWinningCard: false
            });
            
            const isWinner = checkWinner(card);
            
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
              await completeGame(side as 'andar' | 'bahar', card);
            } else {
              const roundComplete = (currentGameState.currentRound === 1 && currentGameState.andarCards.length === 1 && currentGameState.baharCards.length === 1) ||
                                   (currentGameState.currentRound === 2 && currentGameState.andarCards.length === 2 && currentGameState.baharCards.length === 2);
              
              if (roundComplete) {
                if (currentGameState.currentRound === 1) {
                  setTimeout(() => transitionToRound2(), 2000);
                } else if (currentGameState.currentRound === 2) {
                  setTimeout(() => transitionToRound3(), 2000);
                }
              }
            }
            break;
          
          case 'game_reset':
            // Admin privileges removed for development - anyone can reset the game
            
            if (currentGameState.timerInterval) {
              clearInterval(currentGameState.timerInterval);
              currentGameState.timerInterval = null;
            }
            
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
            
            broadcast({
              type: 'game_reset',
              data: {
                message: 'Game has been reset. New game starting...'
              }
            });
            break;
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
  
  // Authentication Routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const validation = validateUserData(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }
      
      const result = await registerUser(req.body);
      if (result.success) {
        auditLogger('user_registration', result.user?.id, { ip: req.ip });
        res.status(201).json({
          success: true,
          user: result.user,
          token: result.token
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
  
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }
      
      const result = await loginUser(email, password);
      if (result.success) {
        auditLogger('user_login', result.user?.id, { ip: req.ip });
        res.json({
          success: true,
          user: result.user,
          token: result.token
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
  
  app.post("/api/auth/admin/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }
      
      const result = await loginAdmin(email, password);
      if (result.success) {
        auditLogger('admin_login', result.admin?.id, { ip: req.ip });
        res.json({
          success: true,
          admin: result.admin,
          token: result.token
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
  
  // Protected Routes (require authentication)
  app.use("/api/*", authenticateToken);
  
  // Payment Routes
  app.post("/api/payment/process", paymentLimiter, async (req, res) => {
    try {
      const { userId, amount, method, type } = req.body;
      
      if (!userId || !amount || !method || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment parameters'
        });
      }
      
      // Verify user has permission
      if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const result = await processPayment({ userId, amount, method, type });
      auditLogger('payment_processed', userId, { amount, type, method: method.type });
      
      res.json(result);
    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment processing failed'
      });
    }
  });
  
  app.get("/api/payment/history/:userId", apiLimiter, async (req, res) => {
    try {
      const { userId } = req.params;
      const { type, status, fromDate, toDate } = req.query;
      
      if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const filters: any = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (fromDate) filters.fromDate = new Date(fromDate as string);
      if (toDate) filters.toDate = new Date(toDate as string);
      
      const result = await getTransactionHistory(userId, filters);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Transaction history error:', error);
      res.status(500).json({
        success: false,
        error: 'Transaction history retrieval failed'
      });
    }
  });
  
  // Content Management Routes
  app.get("/api/content", generalLimiter, async (req, res) => {
    try {
      const result = await getSiteContent();
      res.json(result);
    } catch (error) {
      console.error('Content retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Content retrieval failed'
      });
    }
  });
  
  app.put("/api/admin/content", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const result = await updateSiteContent(req.body, req.user!.id);
      auditLogger('content_update', req.user!.id, { updates: Object.keys(req.body) });
      res.json(result);
    } catch (error) {
      console.error('Content update error:', error);
      res.status(500).json({
        success: false,
        error: 'Content update failed'
      });
    }
  });
  
  app.get("/api/admin/settings", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const result = await getSystemSettings();
      res.json(result);
    } catch (error) {
      console.error('Settings retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Settings retrieval failed'
      });
    }
  });
  
  app.put("/api/admin/settings", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const result = await updateSystemSettings(req.body, req.user!.id);
      auditLogger('settings_update', req.user!.id, { settings: Object.keys(req.body) });
      res.json(result);
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({
        success: false,
        error: 'Settings update failed'
      });
    }
  });
  
  // User Management Routes
  app.get("/api/user/profile", generalLimiter, async (req, res) => {
    try {
      const result = await getUserDetails(req.user!.id);
      res.json(result);
    } catch (error) {
      console.error('User details error:', error);
      res.status(500).json({
        success: false,
        error: 'User details retrieval failed'
      });
    }
  });
  
  app.put("/api/user/profile", generalLimiter, async (req, res) => {
    try {
      const result = await updateUserProfile(req.user!.id, req.body);
      auditLogger('profile_update', req.user!.id, { updates: Object.keys(req.body) });
      res.json(result);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        error: 'Profile update failed'
      });
    }
  });
  
  app.get("/api/user/game-history", generalLimiter, async (req, res) => {
    try {
      const { fromDate, toDate, limit, offset, type, result } = req.query;
      
      const filters: any = {};
      if (fromDate) filters.fromDate = new Date(fromDate as string);
      if (toDate) filters.toDate = new Date(toDate as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);
      if (type) filters.type = type;
      if (result) filters.result = result;
      
      const result_data = await getUserGameHistory(req.user!.id, filters);
      res.json(result_data);
    } catch (error) {
      console.error('Game history error:', error);
      res.status(500).json({
        success: false,
        error: 'Game history retrieval failed'
      });
    }
  });
  
  // Admin User Management Routes
  app.get("/api/admin/users", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { status, search, limit, offset, sortBy, sortOrder } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (search) filters.search = search as string;
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);
      if (sortBy) filters.sortBy = sortBy as string;
      if (sortOrder) filters.sortOrder = sortOrder as string;
      
      const result = await getAllUsers(filters);
      res.json(result);
    } catch (error) {
      console.error('Users retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Users retrieval failed'
      });
    }
  });
  
  app.get("/api/admin/users/:userId", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await getUserDetails(userId);
      res.json(result);
    } catch (error) {
      console.error('User details error:', error);
      res.status(500).json({
        success: false,
        error: 'User details retrieval failed'
      });
    }
  });
  
  app.patch("/api/admin/users/:userId/status", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;
      
      const result = await updateUserStatus(userId, status, req.user!.id, reason);
      auditLogger('user_status_update', req.user!.id, { userId, status, reason });
      res.json(result);
    } catch (error) {
      console.error('User status update error:', error);
      res.status(500).json({
        success: false,
        error: 'User status update failed'
      });
    }
  });
  
  app.patch("/api/admin/users/:userId/balance", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, reason, type } = req.body;
      
      const result = await updateUserBalance(userId, amount, req.user!.id, reason, type);
      auditLogger('user_balance_update', req.user!.id, { userId, amount, reason, type });
      res.json(result);
    } catch (error) {
      console.error('User balance update error:', error);
      res.status(500).json({
        success: false,
        error: 'User balance update failed'
      });
    }
  });
  
  app.get("/api/admin/statistics", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { userId } = req.query;
      const result = await getUserStatistics(userId as string);
      res.json(result);
    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Statistics retrieval failed'
      });
    }
  });
  
  app.get("/api/admin/users/:userId/referrals", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await getReferredUsers(userId);
      res.json(result);
    } catch (error) {
      console.error('Referred users error:', error);
      res.status(500).json({
        success: false,
        error: 'Referred users retrieval failed'
      });
    }
  });
  
  app.post("/api/admin/users/bulk-status", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { userIds, status, reason } = req.body;
      
      const result = await bulkUpdateUserStatus(userIds, status, req.user!.id, reason);
      auditLogger('bulk_status_update', req.user!.id, { userIds, status, reason });
      res.json(result);
    } catch (error) {
      console.error('Bulk status update error:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk status update failed'
      });
    }
  });
  
  app.get("/api/admin/users/export", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { status, search, joinDateFrom, joinDateTo, balanceMin, balanceMax } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (search) filters.search = search as string;
      if (joinDateFrom) filters.joinDateFrom = new Date(joinDateFrom as string);
      if (joinDateTo) filters.joinDateTo = new Date(joinDateTo as string);
      if (balanceMin) filters.balanceMin = parseFloat(balanceMin as string);
      if (balanceMax) filters.balanceMax = parseFloat(balanceMax as string);
      
      const result = await exportUserData(filters);
      auditLogger('user_export', req.user!.id, { filters });
      res.json(result);
    } catch (error) {
      console.error('User export error:', error);
      res.status(500).json({
        success: false,
        error: 'User export failed'
      });
    }
  });
  
  // Game Routes (existing functionality)
  app.get("/api/game/current", gameLimiter, async (req, res) => {
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
      const user = await storage.getUserById(req.user!.id);
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

// Helper functions for game transitions
async function transitionToRound2() {
  console.log('Auto-transitioning to Round 2...');
  
  currentGameState.currentRound = 2;
  currentGameState.phase = 'betting';
  currentGameState.bettingLocked = false;
  
  await storage.updateGameSession(currentGameState.gameId, {
    phase: 'betting',
    round: 2,
    currentTimer: 30
  });
  
  broadcast({
    type: 'start_round_2',
    data: {
      gameId: currentGameState.gameId,
      round: 2,
      timer: 30,
      round1Bets: currentGameState.round1Bets,
      message: 'Round 2 betting started!'
    }
  });
  
  startTimer(30, async () => {
    currentGameState.phase = 'dealing';
    currentGameState.bettingLocked = true;
    
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

async function transitionToRound3() {
  console.log('Auto-transitioning to Round 3 (Continuous Draw)...');
  
  currentGameState.currentRound = 3;
  currentGameState.phase = 'dealing';
  currentGameState.bettingLocked = true;
  currentGameState.timer = 0;
  
  await storage.updateGameSession(currentGameState.gameId, {
    phase: 'dealing',
    round: 3,
    currentTimer: 0
  });
  
  broadcast({
    type: 'start_final_draw',
    data: {
      gameId: currentGameState.gameId,
      round: 3,
      round1Bets: currentGameState.round1Bets,
      round2Bets: currentGameState.round2Bets,
      message: 'Round 3: Continuous draw started!'
    }
  });
}

async function completeGame(winner: 'andar' | 'bahar', winningCard: string) {
  console.log(`Game complete! Winner: ${winner}, Card: ${winningCard}, Round: ${currentGameState.currentRound}`);
  
  currentGameState.winner = winner;
  currentGameState.winningCard = winningCard;
  currentGameState.phase = 'complete';
  currentGameState.bettingLocked = true;
  
  if (currentGameState.timerInterval) {
    clearInterval(currentGameState.timerInterval);
    currentGameState.timerInterval = null;
  }
  
  await storage.updateGameSession(currentGameState.gameId, {
    phase: 'complete',
    winner,
    winningCard,
    winningRound: currentGameState.currentRound,
    status: 'completed'
  });
  
  const payouts: Record<string, number> = {};
  
  for (const [userId, bets] of Array.from(currentGameState.userBets.entries())) {
    const payout = calculatePayout(currentGameState.currentRound, winner, bets);
    payouts[userId] = payout;
    
    if (payout > 0) {
      await storage.updateUserBalance(userId, payout);
      await storage.updateBetStatusByGameUser(currentGameState.gameId, userId, winner, 'won');
    } else {
      const loserSide = winner === 'andar' ? 'bahar' : 'andar';
      await storage.updateBetStatusByGameUser(currentGameState.gameId, userId, loserSide, 'lost');
    }
    
    const updatedUser = await storage.getUserById(userId);
    if (updatedUser) {
      clients.forEach(client => {
        if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'balance_update',
            data: { balance: updatedUser.balance }
          }));
          
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
  
  broadcast({
    type: 'game_complete',
    data: {
      winner: currentGameState.winner,
      winningCard: currentGameState.winningCard,
      andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
      baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
      message: `Game completed! ${currentGameState.winner} wins!`
    }
  });
  
  await storage.saveGameHistory({
    gameId: currentGameState.gameId,
    openingCard: currentGameState.openingCard!,
    winner,
    winningCard,
    totalCards: currentGameState.andarCards.length + currentGameState.baharCards.length,
    round: currentGameState.currentRound
  });
}

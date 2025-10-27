// Enhanced Server Routes with Complete Backend Integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage-supabase";
import {
  registerUser,
  loginUser,
  loginAdmin
} from './auth';
import { processPayment, getTransactionHistory, applyDepositBonus, applyReferralBonus, checkConditionalBonus, applyAvailableBonus } from './payment';
import { 
  updateSiteContent, 
  getSiteContent, 
  updateSystemSettings, 
  getSystemSettings,
  getGameSettings,
  updateGameSettings
} from './content-management';

// Extend Express Request and Session interfaces
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone?: string;
        username?: string;
        role?: string;
      };
    }
    interface SessionData {
      user?: {
        id: string;
        phone?: string;
        username?: string;
        role?: string;
      };
      userId?: string;
      adminId?: string;
      isLoggedIn?: boolean;
    }
  }
}
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
  exportUserData,
  createUserManually
} from './user-management';
import {
  sendWhatsAppRequest,
  getUserRequestHistory,
  getPendingAdminRequests,
  updateRequestStatus
} from './whatsapp-service';
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
import streamRoutes from './stream-routes';
import { streamStorage } from './stream-storage';

// WebSocket client tracking
interface WSClient {
  ws: WebSocket;
  userId: string;
  role: 'player' | 'admin';
  wallet: number;
}

const clients = new Set<WSClient>();

// Async error handler wrapper
function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Async handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  };
}

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

// Game state management with mutex for thread safety
class GameState {
  private state = {
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
    bettingLocked: false,
    // NEW: Track last dealt side for proper game flow
    lastDealtSide: null as 'bahar' | 'andar' | null,
    // NEW: Track round completion status
    roundCompletionStatus: {
      round1: { baharComplete: false, andarComplete: false },
      round2: { baharComplete: false, andarComplete: false }
    }
  };
  
  private updateLock = false;
  
  async withLock<T>(fn: () => Promise<T> | T): Promise<T> {
    // Simple spinlock - wait for lock to be released
    while (this.updateLock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.updateLock = true;
    try {
      return await fn();
    } finally {
      this.updateLock = false;
    }
  }
  
  get gameId() { return this.state.gameId; }
  set gameId(value: string) { this.state.gameId = value; }
  
  get openingCard() { return this.state.openingCard; }
  set openingCard(value: string | null) { this.state.openingCard = value; }
  
  get phase() { return this.state.phase; }
  set phase(value: GamePhase) { this.state.phase = value; }
  
  get currentRound() { return this.state.currentRound; }
  set currentRound(value: 1 | 2 | 3) { this.state.currentRound = value; }
  
  get timer() { return this.state.timer; }
  set timer(value: number) { this.state.timer = value; }
  
  get andarCards() { return this.state.andarCards; }
  get baharCards() { return this.state.baharCards; }
  
  clearCards() {
    this.state.andarCards = [];
    this.state.baharCards = [];
  }
  
  get winner() { return this.state.winner; }
  set winner(value: string | null) { this.state.winner = value; }
  
  get winningCard() { return this.state.winningCard; }
  set winningCard(value: string | null) { this.state.winningCard = value; }
  
  get round1Bets() { return this.state.round1Bets; }
  get round2Bets() { return this.state.round2Bets; }
  
  get userBets() { return this.state.userBets; }
  
  get timerInterval() { return this.state.timerInterval; }
  set timerInterval(value: NodeJS.Timeout | null) { this.state.timerInterval = value; }
  
  get bettingLocked() { return this.state.bettingLocked; }
  set bettingLocked(value: boolean) { this.state.bettingLocked = value; }
  
  get lastDealtSide() { return this.state.lastDealtSide; }
  set lastDealtSide(value: 'bahar' | 'andar' | null) { this.state.lastDealtSide = value; }
  
  get roundCompletionStatus() { return this.state.roundCompletionStatus; }
  
  // NEW: Method to update round completion status
  updateRoundCompletion(side: 'bahar' | 'andar') {
    const currentRound = this.state.currentRound;
    if (currentRound === 1) {
      if (side === 'bahar') {
        this.state.roundCompletionStatus.round1.baharComplete = true;
      } else {
        this.state.roundCompletionStatus.round1.andarComplete = true;
      }
    } else if (currentRound === 2) {
      if (side === 'bahar') {
        this.state.roundCompletionStatus.round2.baharComplete = true;
      } else {
        this.state.roundCompletionStatus.round2.andarComplete = true;
      }
    }
  }
  
  // NEW: Method to check if specific round side is complete
  isSideComplete(round: number, side: 'bahar' | 'andar'): boolean {
    if (round === 1) {
      return this.state.roundCompletionStatus.round1[side === 'bahar' ? 'baharComplete' : 'andarComplete'];
    } else if (round === 2) {
      return this.state.roundCompletionStatus.round2[side === 'bahar' ? 'baharComplete' : 'andarComplete'];
    }
    return false;
  }
  
  // NEW: Enhanced card adding methods with side tracking
  addAndarCard(card: string) {
    this.state.andarCards.push(card);
    this.state.lastDealtSide = 'andar';
    this.updateRoundCompletion('andar');
  }
  addBaharCard(card: string) {
    this.state.baharCards.push(card);
    this.state.lastDealtSide = 'bahar';
    this.updateRoundCompletion('bahar');
  }
  
  // NEW: Method to get next expected side based on current state
  getNextExpectedSide(): 'bahar' | 'andar' | null {
    const round = this.state.currentRound;
    const andarCount = this.state.andarCards.length;
    const baharCount = this.state.baharCards.length;
    
    return getNextExpectedSide(round, andarCount, baharCount);
  }
  
  // NEW: Method to check if round is complete
  isRoundComplete(): boolean {
    const round = this.state.currentRound;
    const andarCount = this.state.andarCards.length;
    const baharCount = this.state.baharCards.length;
    
    return isRoundComplete(round, andarCount, baharCount);
  }
   
  reset() {
    this.state = {
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
      bettingLocked: false,
      lastDealtSide: null,
      roundCompletionStatus: {
        round1: { baharComplete: false, andarComplete: false },
        round2: { baharComplete: false, andarComplete: false }
      }
    };
  }
}

const currentGameState = new GameState();

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

// Helper function to count bets for a specific side
function getBetCountForSide(side: 'andar' | 'bahar'): number {
  let count = 0;
  for (const [userId, bets] of Array.from(currentGameState.userBets.entries())) {
    if (side === 'andar') {
      count += bets.round1.andar > 0 ? 1 : 0;
      count += bets.round2.andar > 0 ? 1 : 0;
    } else {
      count += bets.round1.bahar > 0 ? 1 : 0;
      count += bets.round2.bahar > 0 ? 1 : 0;
    }
  }
  return count;
}

// NEW: Helper function to check if current round is complete
function isRoundComplete(currentRound: number, andarCount: number, baharCount: number): boolean {
  switch (currentRound) {
    case 1:
      // Round 1 complete when both sides have 1 card each
      return andarCount === 1 && baharCount === 1;
    case 2:
      // Round 2 complete when both sides have 2 cards each
      return andarCount === 2 && baharCount === 2;
    case 3:
      // Round 3 never completes until winner is found
      return false;
    default:
      return false;
  }
}

// NEW: Helper function to determine next expected side for proper game flow
function getNextExpectedSide(currentRound: number, andarCount: number, baharCount: number): 'bahar' | 'andar' | null {
  switch (currentRound) {
    case 1:
      // Round 1: Bahar first, then Andar
      if (baharCount === 0) return 'bahar';
      if (baharCount === 1 && andarCount === 0) return 'andar';
      return null; // Round complete
    
    case 2:
      // Round 2: Bahar first, then Andar (after Round 1 completion)
      if (baharCount === 1 && andarCount === 1) return 'bahar'; // Second Bahar
      if (baharCount === 2 && andarCount === 1) return 'andar'; // Second Andar
      return null; // Round complete or invalid state
    
    case 3:
      // Round 3: Alternate starting with Bahar
      if ((baharCount + andarCount) % 2 === 0) return 'bahar'; // Even total = Bahar's turn
      return 'andar'; // Odd total = Andar's turn
    
    default:
      return null;
  }
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

// Import unified authentication middleware from auth.ts
import { requireAuth } from './auth';

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
            // 🔐 SECURITY: Validate token - NO FALLBACK TO ANONYMOUS
            let authenticatedUser = null;
            
            if (message.data?.token) {
              try {
                const { verifyToken } = await import('./auth');
                authenticatedUser = verifyToken(message.data.token);
                console.log('✅ WebSocket token validated:', { 
                  id: authenticatedUser.id, 
                  role: authenticatedUser.role 
                });
              } catch (error) {
                console.error('❌ Invalid WebSocket token:', error);
                ws.send(JSON.stringify({
                  type: 'auth_error',
                  data: { 
                    message: 'Invalid or expired token. Please login again.',
                    error: 'TOKEN_INVALID'
                  }
                }));
                return; // Don't authenticate with invalid token
              }
            }
            
            // 🔐 SECURITY: Require valid authentication - NO ANONYMOUS ACCESS
            if (!authenticatedUser) {
              console.warn('⚠️ WebSocket authentication failed - no valid token provided');
              ws.send(JSON.stringify({
                type: 'auth_error',
                data: { 
                  message: 'Authentication required. Please login first.',
                  error: 'AUTH_REQUIRED'
                }
              }));
              
              // SECURITY: Close connection immediately - no anonymous access
              ws.close(4001, 'Authentication required');
              return;
            }
            
            // ✅ Valid authentication - create authenticated client
            client = {
              ws,
              userId: authenticatedUser.id,
              role: authenticatedUser.role,
              wallet: authenticatedUser.wallet || 0,
            };
            clients.add(client);

            ws.send(JSON.stringify({
              type: 'authenticated',
              data: { 
                userId: client.userId, 
                role: client.role, 
                wallet: client.wallet,
                authenticated: true
              }
            }));
            
            console.log(`🔌 Client authenticated: ${client.role.toUpperCase()} ${client.userId}`);

            // Send current game state to new client
            const openingCardForSync = currentGameState.openingCard ? {
              id: currentGameState.openingCard,
              display: currentGameState.openingCard,
              value: currentGameState.openingCard?.replace(/[♠♥♦♣]/g, '') || '',
              suit: currentGameState.openingCard?.match(/[♠♥♦♣]/)?.[0] || '',
              color: (currentGameState.openingCard?.match(/[♥♦]/) ? 'red' : 'black') as 'red' | 'black',
              rank: currentGameState.openingCard?.replace(/[♠♥♦♣]/g, '') || ''
            } : null;

            const userBets = currentGameState.userBets.get(client.userId) || {
              round1: { andar: 0, bahar: 0 },
              round2: { andar: 0, bahar: 0 }
            };

            ws.send(JSON.stringify({
              type: 'sync_game_state',
              data: {
                gameId: currentGameState.gameId,
                openingCard: openingCardForSync,
                phase: currentGameState.phase,
                currentRound: currentGameState.currentRound,
                countdown: currentGameState.timer,
                andarCards: currentGameState.andarCards.map(card => ({
                  id: card,
                  display: card,
                  value: card?.replace(/[♠♥♦♣]/g, '') || '',
                  suit: card?.match(/[♠♥♦♣]/)?.[0] || '',
                  color: (card?.match(/[♥♦]/) ? 'red' : 'black') as 'red' | 'black',
                  rank: card?.replace(/[♠♥♦♣]/g, '') || ''
                })),
                baharCards: currentGameState.baharCards.map(card => ({
                  id: card,
                  display: card,
                  value: card?.replace(/[♠♥♦♣]/g, '') || '',
                  suit: card?.match(/[♠♥♦♣]/)?.[0] || '',
                  color: (card?.match(/[♥♦]/) ? 'red' : 'black') as 'red' | 'black',
                  rank: card?.replace(/[♠♥♦♣]/g, '') || ''
                })),
                winner: currentGameState.winner,
                winningCard: currentGameState.winningCard,
                andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
                baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
                round1Bets: currentGameState.round1Bets,
                round2Bets: currentGameState.round2Bets,
                bettingLocked: currentGameState.bettingLocked
              }
            }));
            break;
          
          case 'opening_card_set':
          case 'opening_card_confirmed':
          case 'game_start':
            // CRITICAL: Only admin can start the game
            if (!client || client.role !== 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Only admin can start the game' }
              }));
              console.log('⚠️ Non-admin attempted to start game - blocked');
              break;
            }
            
            currentGameState.openingCard = message.data.openingCard?.display || message.data.openingCard;
            currentGameState.phase = 'betting';
            currentGameState.currentRound = 1;
            currentGameState.clearCards();
            currentGameState.winner = null;
            currentGameState.winningCard = null;
            currentGameState.round1Bets.andar = 0;
            currentGameState.round1Bets.bahar = 0;
            currentGameState.round2Bets.andar = 0;
            currentGameState.round2Bets.bahar = 0;
            currentGameState.userBets.clear();
            currentGameState.bettingLocked = false;
            
            // Use environment variable for default timer duration
            const defaultTimerDuration = parseInt(process.env.DEFAULT_TIMER_DURATION || '30', 10);
            const timerDuration = message.data.timer || defaultTimerDuration;
            
            try {
              const newGame = await storage.createGameSession({
                gameId: currentGameState.gameId,
                openingCard: currentGameState.openingCard,
                phase: 'betting',
                currentTimer: timerDuration
              });
              // Supabase returns snake_case, but TypeScript type uses camelCase
              currentGameState.gameId = (newGame as any).game_id || newGame.gameId;
              console.log('✅ Game session created with ID:', currentGameState.gameId);
            } catch (error: any) {
              console.error('⚠️ Error creating game session in database:', {
                message: error.message,
                code: error.code,
                hint: error.hint,
                details: error.details,
              });
              console.warn('⚠️ Using fallback in-memory game ID - game will not persist to database');
              currentGameState.gameId = `game-${Date.now()}`;
            }
            
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
              
              try {
                if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
                  await storage.updateGameSession(currentGameState.gameId, {
                    phase: 'dealing'
                  });
                }
              } catch (error) {
                console.error('\u26a0\ufe0f Error updating game session:', error);
              }
              
              broadcast({
                type: 'phase_change',
                data: { 
                  phase: 'dealing', 
                  round: 1,
                  message: 'Round 1 betting closed. Revealing cards in 2 seconds...' 
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
            
            // CRITICAL: Block admin from placing bets
            if (client.role === 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Admins cannot place bets. Admin role is for game control only.' }
              }));
              console.log('⚠️ Admin attempted to place bet - blocked');
              break;
            }
            
            // Block anonymous users in production
            const isAnonymous = client.userId === 'anonymous';
            if (isAnonymous && process.env.NODE_ENV === 'production') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Please login to place bets' }
              }));
              break;
            }
            
            // Rate limiting
            const now = Date.now();
            const userLimit = userBetRateLimits.get(client.userId);
            
            // Rate limiting - use environment variables
            const maxBetsPerMinute = parseInt(process.env.MAX_BETS_PER_MINUTE || '30', 10);
            const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
            
            if (userLimit && now < userLimit.resetTime) {
              if (userLimit.count >= maxBetsPerMinute) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: `Too many bets. Please slow down (max ${maxBetsPerMinute} bets per minute).` }
                }));
                break;
              }
              userLimit.count++;
            } else {
              userBetRateLimits.set(client.userId, { 
                count: 1, 
                resetTime: now + rateLimitWindow
              });
            }
            
            // Validation - use environment variables for limits
            const minBet = parseInt(process.env.MIN_BET || '1000', 10);
            const maxBet = parseInt(process.env.MAX_BET || '100000', 10);
            
            if (!betAmount || betAmount < minBet || betAmount > maxBet) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: `Invalid bet amount. Must be between ₹${minBet.toLocaleString()} and ₹${maxBet.toLocaleString()}` }
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
            
            // Balance check (skip for anonymous in development only)
            if (!isAnonymous) {
              const currentUser = await storage.getUserById(client.userId);
              if (!currentUser) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'User not found' }
                }));
                break;
              }
              
              const userBalance = parseFloat(currentUser.balance);
              if (userBalance < betAmount) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'Insufficient balance' }
                }));
                break;
              }
            }
            
            if (!currentGameState.userBets.has(client.userId)) {
              currentGameState.userBets.set(client.userId, {
                round1: { andar: 0, bahar: 0 },
                round2: { andar: 0, bahar: 0 }
              });
            }
            
            // Only save to database for non-anonymous users
            if (!isAnonymous) {
              await storage.createBet({
                userId: client.userId,
                gameId: currentGameState.gameId,
                round: betRound.toString(),
                side: betSide,
                amount: betAmount.toString(),
                status: 'pending'
              });
              
              await storage.updateUserBalance(client.userId, -betAmount);
            }
            
            const userBet = currentGameState.userBets.get(client.userId)!;
            if (betRound === 1) {
              userBet.round1[betSide as 'andar' | 'bahar'] += betAmount;
              currentGameState.round1Bets[betSide as 'andar' | 'bahar'] += betAmount;
            } else if (betRound === 2) {
              userBet.round2[betSide as 'andar' | 'bahar'] += betAmount;
              currentGameState.round2Bets[betSide as 'andar' | 'bahar'] += betAmount;
            }
            
            let updatedBalance = betAmount; // For anonymous
            if (!isAnonymous) {
              const updatedUser = await storage.getUserById(client.userId);
              if (updatedUser) {
                updatedBalance = updatedUser.balance;
                ws.send(JSON.stringify({
                  type: 'balance_update',
                  data: { balance: updatedUser.balance }
                }));
              }
            }
              
            ws.send(JSON.stringify({
              type: 'user_bets_update',
              data: {
                round1Bets: userBet.round1,
                round2Bets: userBet.round2,
                currentRound: betRound
              }
            }));
            
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
          
          case 'reveal_cards':
            // ⚠️ DEPRECATED: This case is deprecated in favor of individual card dealing
            // Admin manually reveals cards after timer expired (no pre-selection)
            if (currentGameState.phase !== 'dealing') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Can only reveal cards in dealing phase' }
              }));
              break;
            }
            
            console.log('⚠️ Deprecated reveal_cards case used. Please use individual card dealing instead.');
            
            // For backward compatibility, handle as individual cards
            const revealBaharCard = message.data.baharCard;
            const revealAndarCard = message.data.andarCard;
            
            if (revealBaharCard) {
              // Deal Bahar card first using individual dealing logic
              const revealBaharDisplay = revealBaharCard.display || revealBaharCard;
              currentGameState.addBaharCard(revealBaharDisplay);
              
              broadcast({
                type: 'card_dealt',
                data: {
                  card: revealBaharCard,
                  side: 'bahar',
                  position: currentGameState.baharCards.length,
                  isWinningCard: false
                }
              });
              
              const baharWinner = checkWinner(revealBaharDisplay);
              if (baharWinner) {
                await completeGame('bahar', revealBaharDisplay);
                break;
              }
            }
            
            if (revealAndarCard) {
              // Wait 800ms then deal Andar card using individual dealing logic
              setTimeout(async () => {
                const revealAndarDisplay = revealAndarCard.display || revealAndarCard;
                currentGameState.addAndarCard(revealAndarDisplay);
                
                broadcast({
                  type: 'card_dealt',
                  data: {
                    card: revealAndarCard,
                    side: 'andar',
                    position: currentGameState.andarCards.length,
                    isWinningCard: false
                  }
                });
                
                const andarWinner = checkWinner(revealAndarDisplay);
                if (andarWinner) {
                  await completeGame('andar', revealAndarDisplay);
                } else {
                  // No winner, check for round completion
                  const roundComplete = currentGameState.isRoundComplete();
                  if (roundComplete) {
                    console.log(`🔄 Round ${currentGameState.currentRound} complete! No winner found.`);
                    
                    const roundMessages = {
                      1: `Round 1 complete! No winner after 1 Bahar + 1 Andar card. Starting Round 2 in 2 seconds...`,
                      2: `Round 2 complete! No winner after 2 Bahar + 2 Andar cards. Starting Round 3 (Continuous Draw) in 2 seconds...`
                    };
                    
                    broadcast({
                      type: 'notification',
                      data: {
                        message: roundMessages[currentGameState.currentRound as keyof typeof roundMessages] || `No winner in Round ${currentGameState.currentRound}. Starting Round ${currentGameState.currentRound + 1} in 2 seconds...`,
                        type: 'info'
                      }
                    });
                    
                    if (currentGameState.currentRound === 1) {
                      setTimeout(() => transitionToRound2(), 2000);
                    } else if (currentGameState.currentRound === 2) {
                      setTimeout(() => transitionToRound3(), 2000);
                    }
                  }
                }
              }, 800);
            }
            break;
          
          case 'deal_single_card':
            // Round 3 only - continuous dealing one card at a time
            if (currentGameState.currentRound !== 3) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Single card dealing only allowed in Round 3' }
              }));
              break;
            }
            
            const singleCard = message.data.card;
            const singleSide = message.data.side;
            const singleCardDisplay = singleCard.display || singleCard;
            
            console.log(`🎴 Round 3: Dealing ${singleCardDisplay} to ${singleSide}`);
            
            if (singleSide === 'bahar') {
              currentGameState.addBaharCard(singleCardDisplay);
            } else {
              currentGameState.addAndarCard(singleCardDisplay);
            }
            
            broadcast({
              type: 'card_dealt',
              data: {
                card: singleCard,
                side: singleSide,
                position: singleSide === 'bahar' ? currentGameState.baharCards.length : currentGameState.andarCards.length,
                isWinningCard: false
              }
            });
            
            // Check for winner
            const singleIsWinner = checkWinner(singleCardDisplay);
            if (singleIsWinner) {
              console.log(`✅ Round 3 winner found: ${singleSide}`);
              await completeGame(singleSide as 'andar' | 'bahar', singleCardDisplay);
            }
            break;
          
          case 'card_dealt':
          case 'deal_card':
            // CRITICAL: Only admin can deal cards
            if (!client || client.role !== 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Only admin can deal cards' }
              }));
              console.log('⚠️ Non-admin attempted to deal card - blocked');
              break;
            }
            
            const cardData = message.data.card;
            const cardDisplay = cardData?.display || cardData; // For database (string)
            const side = message.data.side;
            const position = message.data.position || (side === 'bahar' ? currentGameState.baharCards.length + 1 : currentGameState.andarCards.length + 1);
            
            // NEW: Individual card dealing logic for proper game flow
            console.log(`🎴 Individual card dealing: ${cardDisplay} to ${side} (Round ${currentGameState.currentRound})`);
            
            // Store the display string in state for winner checking
            if (side === 'andar') {
              currentGameState.addAndarCard(cardDisplay);
            } else {
              currentGameState.addBaharCard(cardDisplay);
            }
            
            // Only save to database if gameId exists (skip for testing)
            if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
              try {
                console.log(`💾 Saving dealt card to DB: gameId=${currentGameState.gameId}, card=${cardDisplay}, side=${side}`);
                await storage.createDealtCard({
                  gameId: currentGameState.gameId,
                  card: cardDisplay,
                  side,
                  position,
                  isWinningCard: false
                });
                console.log('✅ Dealt card saved successfully');
              } catch (error) {
                console.error('❌ Error saving dealt card:', error);
                console.log('⚠️ Continuing game without database save');
              }
            } else {
              console.log(`⚠️ Skipping dealt card database save (gameId: ${currentGameState.gameId})`);
            }
            
            const isWinner = checkWinner(cardDisplay);
            
            // Broadcast the FULL card object back (as received from admin)
            broadcast({
              type: 'card_dealt',
              data: {
                card: cardData, // Send full Card object, not reconstructed
                side,
                position,
                isWinningCard: isWinner
              }
            });
            
            if (isWinner) {
              console.log(`✅ Winner found! ${side.toUpperCase()} wins with ${cardDisplay}`);
              try {
                await completeGame(side as 'andar' | 'bahar', cardDisplay);
              } catch (error) {
                console.error('❌ Error completing game:', error);
                broadcast({
                  type: 'error',
                  data: {
                    message: 'Error completing game. Please contact admin.',
                    error: error instanceof Error ? error.message : 'Unknown error'
                  }
                });
              }
            } else {
              console.log(`🃏 No winner yet. Andar: ${currentGameState.andarCards.length}, Bahar: ${currentGameState.baharCards.length}, Round: ${currentGameState.currentRound}`);
              
              // NEW: Check for round completion with proper individual card dealing logic
              const roundComplete = isRoundComplete(currentGameState.currentRound, currentGameState.andarCards.length, currentGameState.baharCards.length);
              
              if (roundComplete) {
                console.log(`🔄 Round ${currentGameState.currentRound} complete! No winner found. Auto-transitioning in 2 seconds...`);
                
                // NEW: Enhanced notification with round completion details
                const roundMessages = {
                  1: `Round 1 complete! No winner after 1 Bahar + 1 Andar card. Starting Round 2 in 2 seconds...`,
                  2: `Round 2 complete! No winner after 2 Bahar + 2 Andar cards. Starting Round 3 (Continuous Draw) in 2 seconds...`
                };
                
                broadcast({
                  type: 'notification',
                  data: {
                    message: roundMessages[currentGameState.currentRound as keyof typeof roundMessages] || `No winner in Round ${currentGameState.currentRound}. Starting Round ${currentGameState.currentRound + 1} in 2 seconds...`,
                    type: 'info'
                  }
                });
                
                // NEW: Proper round transitions
                if (currentGameState.currentRound === 1) {
                  setTimeout(() => transitionToRound2(), 2000);
                } else if (currentGameState.currentRound === 2) {
                  setTimeout(() => transitionToRound3(), 2000);
                }
              } else {
                // NEW: Inform admin about next expected side for proper game flow
                const nextSide = getNextExpectedSide(currentGameState.currentRound, currentGameState.andarCards.length, currentGameState.baharCards.length);
                if (nextSide) {
                  broadcast({
                    type: 'notification',
                    data: {
                      message: `Next card should go to ${nextSide.toUpperCase()} side`,
                      type: 'success'
                    }
                  });
                }
              }
            }
            break;
          
          case 'game_reset':
            // CRITICAL: Only admin can reset the game
            if (!client || client.role !== 'admin') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Only admin can reset the game' }
              }));
              console.log('⚠️ Non-admin attempted to reset game - blocked');
              break;
            }
            
            if (currentGameState.timerInterval) {
              clearInterval(currentGameState.timerInterval);
              currentGameState.timerInterval = null;
            }
            
            currentGameState.reset();
            
            broadcast({
              type: 'game_reset',
              data: {
                message: 'Game has been reset. New game starting...',
                gameState: {
                  gameId: currentGameState.gameId,
                  phase: 'idle',
                  currentRound: 1,
                  timer: 0,
                  openingCard: null,
                  andarCards: [],
                  baharCards: [],
                  winner: null,
                  winningCard: null
                }
              }
            });
            break;
          
          // WebRTC Signaling for Screen Share Streaming
          case 'webrtc_offer':
            // Handle WebRTC offer from admin
            if (client?.role === 'admin') {
              console.log('📡 Admin sending WebRTC offer');
              
              // Broadcast offer to all players
              broadcast({
                type: 'webrtc_offer',
                data: {
                  offer: message.data.offer,
                  adminId: client.userId
                }
              }, client);
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Only admin can send WebRTC offers' }
              }));
            }
            break;

          case 'webrtc_answer':
            // Handle WebRTC answer from player
            console.log('📡 Player sending WebRTC answer');
            
            // Send answer back to admin
            clients.forEach((adminClient) => {
              if (adminClient.role === 'admin' && adminClient.ws.readyState === WebSocket.OPEN) {
                adminClient.ws.send(JSON.stringify({
                  type: 'webrtc_answer',
                  data: {
                    answer: message.data.answer,
                    playerId: client?.userId
                  }
                }));
              }
            });
            break;

          case 'webrtc_ice_candidate':
            // Handle ICE candidates
            console.log('🧊 ICE candidate received');
            
            if (client?.role === 'admin') {
              // Broadcast to all players
              broadcast({
                type: 'webrtc_ice_candidate',
                data: {
                  candidate: message.data.candidate,
                  fromAdmin: true
                }
              }, client);
            } else {
              // Send to admin only
              clients.forEach((adminClient) => {
                if (adminClient.role === 'admin' && adminClient.ws.readyState === WebSocket.OPEN) {
                  adminClient.ws.send(JSON.stringify({
                    type: 'webrtc_ice_candidate',
                    data: {
                      candidate: message.data.candidate,
                      fromPlayer: client?.userId
                    }
                  }));
                }
              });
            }
            break;

          case 'stream_start':
            // Admin starting stream
            if (client?.role === 'admin') {
              console.log('🎥 Stream starting:', message.data.method);
              
              // Start stream session tracking
              const sessionId = await streamStorage.startStreamSession(message.data.method, client.userId);
              
              // Broadcast to all players
              broadcast({
                type: 'stream_status',
                data: {
                  status: 'connecting',
                  method: message.data.method,
                  sessionId: sessionId || undefined
                }
              });
              
              // Update database
              await streamStorage.updateStreamStatus(message.data.method, 'connecting');
            }
            break;

          case 'stream_stop':
            // Admin stopping stream
            if (client?.role === 'admin') {
              console.log('🛑 Stream stopping');
              
              // End stream session if we have a session ID
              if (message.data?.sessionId) {
                await streamStorage.endStreamSession(message.data.sessionId);
              } else {
                // Fallback: update status directly
                const config = await streamStorage.getStreamConfig();
                if (config) {
                  await streamStorage.updateStreamStatus(config.activeMethod, 'offline');
                }
              }
              
              // Broadcast to all players
              broadcast({
                type: 'stream_status',
                data: {
                  status: 'offline'
                }
              });
            }
            break;
          
          case 'stream_viewer_join':
            // Player joined stream
            console.log('👁️ Viewer joined stream');
            
            // Update viewer count
            const config = await streamStorage.getStreamConfig();
            if (config) {
              await streamStorage.updateViewerCount(config.viewerCount + 1);
              
              // Notify admin of viewer count change
              broadcastToRole({
                type: 'viewer_count_update',
                data: {
                  count: config.viewerCount + 1
                }
              }, 'admin');
            }
            break;
            
          case 'stream_viewer_leave':
            // Player left stream
            console.log('👁️ Viewer left stream');
            
            const config2 = await streamStorage.getStreamConfig();
            if (config2 && config2.viewerCount > 0) {
              await streamStorage.updateViewerCount(config2.viewerCount - 1);
              
              // Notify admin of viewer count change
              broadcastToRole({
                type: 'viewer_count_update',
                data: {
                  count: config2.viewerCount - 1
                }
              }, 'admin');
            }
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
        console.log(`Client ${client.userId} removed. Active clients: ${clients.size}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (client) {
        clients.delete(client);
        console.log(`Client ${client.userId} removed due to error. Active clients: ${clients.size}`);
      }
    });
    
    // Set up ping/pong to detect dead connections
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
        if (client) {
          clients.delete(client);
          console.log(`Client ${client.userId} removed (dead connection). Active clients: ${clients.size}`);
        }
      }
    }, 30000); // Ping every 30 seconds
    
    ws.on('pong', () => {
      // Connection is alive
    });
  });
  
  // REST API Routes
  
  // Apply unified authentication middleware to all API routes except public auth endpoints
  app.use("/api/*", (req, res, next) => {
    const publicPaths = [
      '/api/auth/login',
      '/api/auth/admin-login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout' // Logout should be public
    ];
    
    if (publicPaths.some(path => req.path === path)) {
      console.log(`🔓 Public endpoint: ${req.path}`);
      return next();
    }
    
    return requireAuth(req, res, next);
  });
  
  // Authentication Routes (Public)
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      console.log('📝 Registration request received:', { 
        name: req.body.name, 
        phone: req.body.phone, 
        hasPassword: !!req.body.password,
        hasConfirmPassword: !!req.body.confirmPassword
      });
      
      const { validateUserRegistrationData } = await import('./auth');
      const validation = validateUserRegistrationData(req.body);
      if (!validation.isValid) {
        console.log('❌ Registration validation failed:', validation.errors);
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
          user: result.user
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
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({
          success: false,
          error: 'Phone number and password are required'
        });
      }
      
      const result = await loginUser(phone, password);
      if (result.success && result.user) {
        // Set user in session for proper authentication
        if (req.session) {
          (req.session as any).user = {
            id: result.user.id,
            phone: result.user.phone,
            role: result.user.role,
            username: result.user.phone // Using phone as username
          };
          (req.session as any).userId = result.user.id;
          (req.session as any).isLoggedIn = true;
        }
        
        // Also set on request object for immediate use
        (req as any).user = (req.session as any).user;
        
        auditLogger('user_login', result.user.id, { ip: req.ip });
        res.json({
          success: true,
          user: result.user
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
  
  app.post("/api/auth/admin-login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }
      
      const result = await loginAdmin(username, password);
      if (result.success && result.admin) {
        // Set user in session for proper authentication
        if (req.session) {
          (req.session as any).user = {
            id: result.admin.id,
            username: result.admin.username,
            role: result.admin.role,
            phone: result.admin.username // Using username which is typically the phone for admin
          };
          (req.session as any).adminId = result.admin.id;
          (req.session as any).isLoggedIn = true;
        }
        
        // Also set on request object for immediate use
        (req as any).user = (req.session as any).user;
        
        auditLogger('admin_login', result.admin.id, { ip: req.ip });
        res.json({
          success: true,
          admin: result.admin,
          token: result.admin.token, // Include token for WebSocket authentication
          refreshToken: result.admin.refreshToken
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error || 'Invalid credentials'
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
  
  // Token refresh endpoint (doesn't need authentication but needs rate limiting)
  app.post("/api/auth/refresh", authLimiter, async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const { verifyToken } = await import('./auth');
      let decoded;
      try {
        decoded = verifyToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      // Ensure this is a refresh token, not an access token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token type for refresh'
        });
      }

      // In a real implementation, you would check if the refresh token exists in your database
      // For now, we'll just generate new tokens based on the user's information
      const { generateTokens } = await import('./auth');
      
      // Get user information (in a real implementation, you'd fetch from database)
      const { storage } = await import('./storage-supabase');
      let user;
      if (decoded.phone) {
        user = await storage.getUserByPhone(decoded.phone);
      } else if (decoded.username) {
        const admin = await storage.getAdminByUsername(decoded.username);
        user = { id: admin.id, phone: admin.username, role: admin.role }; // Normalize for token generation
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      // Generate new access and refresh tokens
      const newTokens = generateTokens({
        id: user.id,
        phone: user.phone,
        role: user.role || 'player'
      });

      res.json({
        success: true,
        token: newTokens.accessToken, // Keep same field name for compatibility
        refreshToken: newTokens.refreshToken
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed'
      });
    }
  });

  // Logout endpoint (now public, handled by middleware above)
  app.post("/api/auth/logout", (req, res) => {
    // Clear session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
    }
    
    // Clear user from request
    (req as any).user = null;
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
  
  // Stream Routes - Dual streaming (RTMP and WebRTC)
  app.use("/api/stream", streamRoutes);
  
  // Payment Routes
  app.post("/api/payment/process", paymentLimiter, async (req, res) => {
    try {
      const { userId, amount, method, type } = req.body;
      
      // Validate required fields
      if (!userId || !amount || !method || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment parameters'
        });
      }
      
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a positive number'
        });
      }
      
      // Validate amount range based on payment type - use environment variables
      const minDeposit = parseFloat(process.env.MIN_DEPOSIT || '100');
      const maxDeposit = parseFloat(process.env.MAX_DEPOSIT || '1000000');
      const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL || '500');
      const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL || '500000');
      
      const minAmount = type === 'deposit' ? minDeposit : minWithdrawal;
      const maxAmount = type === 'deposit' ? maxDeposit : maxWithdrawal;
      
      if (numAmount < minAmount || numAmount > maxAmount) {
        return res.status(400).json({
          success: false,
          error: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} amount must be between ₹${minAmount.toLocaleString()} and ₹${maxAmount.toLocaleString()}`
        });
      }
      
      // Validate type
      if (!['deposit', 'withdrawal'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment type. Must be deposit or withdrawal'
        });
      }
      
      // Verify user has permission
      if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const result = await processPayment({ userId, amount: numAmount, method, type });
      auditLogger('payment_processed', userId, { amount: numAmount, type, method: method.type });
      
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
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const result = await getUserDetails(req.user.id);
      res.json(result);
    } catch (error) {
      console.error('User details error:', error);
      res.status(500).json({
        success: false,
        error: 'User details retrieval failed'
      });
    }
  });

  // User Analytics Route
  app.get("/api/user/analytics", generalLimiter, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const userId = req.user.id;
      
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user's bets and game history
      const userBets = await storage.getUserBets(userId);
      const gameHistory = await storage.getUserGameHistory(userId);

      // Calculate analytics
      const totalDeposits = 0; // Would come from transactions table
      const totalWithdrawals = 0; // Would come from transactions table
      const gamesPlayed = userBets?.length || 0;
      const totalWinnings = gameHistory?.reduce((sum, game) => sum + (game.payout || 0), 0) || 0;
      const totalLosses = userBets?.reduce((sum, bet) => sum + parseFloat(bet.amount), 0) || 0;
      const wins = gameHistory?.filter(game => game.result === 'win').length || 0;
      const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
      const biggestWin = gameHistory?.reduce((max, game) => Math.max(max, game.payout || 0), 0) || 0;
      const averageBet = gamesPlayed > 0 ? totalLosses / gamesPlayed : 0;

      // Calculate profit/loss for different time periods
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const todayGames = gameHistory?.filter(game => new Date(game.createdAt) >= todayStart) || [];
      const weekGames = gameHistory?.filter(game => new Date(game.createdAt) >= weekStart) || [];
      const monthGames = gameHistory?.filter(game => new Date(game.createdAt) >= monthStart) || [];

      const todayProfit = todayGames.reduce((sum, game) => sum + (game.payout || 0) - (game.betAmount || 0), 0);
      const weeklyProfit = weekGames.reduce((sum, game) => sum + (game.payout || 0) - (game.betAmount || 0), 0);
      const monthlyProfit = monthGames.reduce((sum, game) => sum + (game.payout || 0) - (game.betAmount || 0), 0);

      const analytics = {
        currentBalance: user.balance,
        totalDeposits,
        totalWithdrawals,
        gamesPlayed,
        totalWinnings,
        totalLosses,
        winRate,
        biggestWin,
        averageBet,
        todayProfit,
        weeklyProfit,
        monthlyProfit
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'User analytics retrieval failed'
      });
    }
  });

  // User Transactions Route
  app.get("/api/user/transactions", generalLimiter, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const userId = req.user.id;
      const { limit = 20, offset = 0, type = 'all' } = req.query;
      
      // Mock transaction data - in real implementation, this would come from transactions table
      const mockTransactions = [
        {
          id: 'txn_1',
          type: 'deposit',
          amount: 10000,
          status: 'completed',
          paymentMethod: 'UPI',
          description: 'Deposit via UPI',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'txn_2',
          type: 'win',
          amount: 5000,
          status: 'completed',
          description: 'Andar Bahar win',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'txn_3',
          type: 'loss',
          amount: 2000,
          status: 'completed',
          description: 'Andar Bahar loss',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ];

      const filteredTransactions = type === 'all'
        ? mockTransactions
        : mockTransactions.filter(txn => txn.type === type);

      const paginatedTransactions = filteredTransactions.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          transactions: paginatedTransactions,
          total: filteredTransactions.length,
          hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredTransactions.length
        }
      });
    } catch (error) {
      console.error('Transaction history error:', error);
      res.status(500).json({
        success: false,
        error: 'Transaction history retrieval failed'
      });
    }
  });

  // Bonus Information Route
  app.get("/api/user/bonus-info", generalLimiter, async (req, res) => {
    try {
      // Check authentication first - use session or JWT token
      let userId = null;
      
      if (req.session && req.session.user && req.session.user.id) {
        userId = req.session.user.id;
      } else if (req.user && req.user.id) {
        userId = req.user.id;
      }
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const bonusInfo = await storage.getUserBonusInfo(userId);
      
      res.json({
        success: true,
        data: bonusInfo
      });
    } catch (error) {
      console.error('Bonus info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bonus information'
      });
    }
  });

  // Claim Bonus Route
  app.post("/api/user/claim-bonus", generalLimiter, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const userId = req.user.id;
      const result = await applyAvailableBonus(userId);
      
      if (result) {
        auditLogger('bonus_claimed', userId, { timestamp: new Date().toISOString() });
        res.json({
          success: true,
          message: 'Bonus successfully claimed and added to your balance'
        });
      } else {
        res.json({
          success: false,
          error: 'No bonus available to claim'
        });
      }
    } catch (error) {
      console.error('Claim bonus error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to claim bonus'
      });
    }
  });

  // Enhanced User Game History Route
  app.get("/api/user/game-history", generalLimiter, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const userId = req.user.id;
      const { limit = 20, offset = 0, result = 'all' } = req.query;
      
      // Get user's game history with bet details
      const gameHistory = await storage.getUserGameHistory(userId);
      const userBets = await storage.getUserBets(userId);

      // Combine game history with user bets
      const enhancedGameHistory = gameHistory?.map(game => {
        const userBet = userBets?.find(bet => bet.gameId === game.gameId);
        return {
          id: game.id,
          gameId: game.gameId,
          openingCard: game.openingCard,
          winner: game.winner,
          yourBet: userBet ? {
            side: userBet.side,
            amount: userBet.amount,
            round: userBet.round
          } : null,
          result: userBet ? (userBet.side === game.winner ? 'win' : 'loss') : 'no_bet',
          payout: userBet && userBet.side === game.winner ? parseFloat(userBet.amount) * 2 : 0,
          totalCards: game.totalCards,
          round: game.round,
          createdAt: game.createdAt
        };
      }) || [];

      // Filter by result if specified
      const filteredHistory = result === 'all'
        ? enhancedGameHistory
        : enhancedGameHistory.filter(game => game.result === result);

      // Apply pagination
      const paginatedHistory = filteredHistory.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          games: paginatedHistory,
          total: filteredHistory.length,
          hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredHistory.length
        }
      });
    } catch (error) {
      console.error('Enhanced game history error:', error);
      res.status(500).json({
        success: false,
        error: 'Game history retrieval failed'
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
  
  app.get("/api/user/game-history-detailed", generalLimiter, async (req, res) => {
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

  // Admin User Creation Endpoint
  app.post("/api/admin/users/create", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { phone, name, password, initialBalance, role, status } = req.body;
      
      if (!phone || !name) {
        return res.status(400).json({
          success: false,
          error: 'Phone and name are required'
        });
      }
      
      const result = await createUserManually(req.user!.id, {
        phone,
        name,
        password,
        initialBalance,
        role,
        status
      });
      
      if (result.success) {
        auditLogger('user_created', req.user!.id, { phone, name, initialBalance, hasCustomPassword: !!password });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: 'User creation failed'
      });
    }
  });

  // WhatsApp Integration Endpoints
  app.post("/api/whatsapp/send-request", generalLimiter, async (req, res) => {
    try {
      const { userId, userPhone, requestType, message, amount, isUrgent, metadata } = req.body;
      
      if (!userId || !userPhone || !requestType || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      
      const result = await sendWhatsAppRequest({
        userId,
        userPhone,
        requestType,
        message,
        amount,
        isUrgent,
        metadata
      });
      
      res.json(result);
    } catch (error) {
      console.error('Send WhatsApp request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send WhatsApp request'
      });
    }
  });

  app.get("/api/whatsapp/request-history", generalLimiter, async (req, res) => {
    try {
      const { userId, limit } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await getUserRequestHistory(
        userId as string,
        limit ? parseInt(limit as string) : 20
      );
      
      res.json(result);
    } catch (error) {
      console.error('Get request history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get request history'
      });
    }
  });

  app.get("/api/admin/whatsapp/pending-requests", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const result = await getPendingAdminRequests();
      res.json(result);
    } catch (error) {
      console.error('Get pending requests error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending requests'
      });
    }
  });

  app.patch("/api/admin/whatsapp/requests/:id", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, responseMessage } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }
      
      const result = await updateRequestStatus(
        id,
        status,
        responseMessage,
        req.user!.id
      );
      
      if (result.success) {
        auditLogger('whatsapp_request_updated', req.user!.id, { requestId: id, status });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Update request status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update request status'
      });
    }
  });

  // Admin Bonus Management Endpoints
  app.get("/api/admin/bonus-analytics", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { period = 'daily' } = req.query;
      
      // Get bonus analytics from storage
      const bonusAnalytics = await storage.getBonusAnalytics(period as string);
      
      res.json({
        success: true,
        data: bonusAnalytics
      });
    } catch (error) {
      console.error('Bonus analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bonus analytics'
      });
    }
  });

  app.get("/api/admin/referral-analytics", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { period = 'daily' } = req.query;
      
      // Get referral analytics from storage
      const referralAnalytics = await storage.getReferralAnalytics(period as string);
      
      res.json({
        success: true,
        data: referralAnalytics
      });
    } catch (error) {
      console.error('Referral analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve referral analytics'
      });
    }
  });

  app.post("/api/admin/apply-bonus", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { userId, bonusType, amount, reason } = req.body;
      
      if (!userId || !bonusType || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, bonusType, amount'
        });
      }
      
      if (!['deposit_bonus', 'referral_bonus', 'manual_bonus'].includes(bonusType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid bonus type. Must be deposit_bonus, referral_bonus, or manual_bonus'
        });
      }
      
      // Apply bonus to user
      await storage.addUserBonus(userId, amount, bonusType, 0);
      
      // Add transaction record
      await storage.addTransaction({
        userId,
        transactionType: 'bonus',
        amount,
        balanceBefore: 0, // Will be calculated in storage
        balanceAfter: 0,   // Will be calculated in storage
        referenceId: `admin_bonus_${Date.now()}`,
        description: reason || `Manual ${bonusType} applied by admin`
      });
      
      auditLogger('admin_bonus_applied', req.user!.id, {
        userId,
        bonusType,
        amount,
        reason
      });
      
      res.json({
        success: true,
        message: `Bonus of ₹${amount} applied successfully to user ${userId}`
      });
    } catch (error) {
      console.error('Apply bonus error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply bonus'
      });
    }
  });

  app.get("/api/admin/bonus-settings", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      // Get bonus-related game settings
      const settings = await storage.getGameSettings();
      
      const bonusSettings = {
        depositBonusPercent: settings.default_deposit_bonus_percent || '5',
        referralBonusPercent: settings.referral_bonus_percent || '1',
        conditionalBonusThreshold: settings.conditional_bonus_threshold || '30'
      };
      
      res.json({
        success: true,
        data: bonusSettings
      });
    } catch (error) {
      console.error('Get bonus settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bonus settings'
      });
    }
  });

  app.put("/api/admin/bonus-settings", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { depositBonusPercent, referralBonusPercent, conditionalBonusThreshold } = req.body;
      
      // Update game settings
      const updates: any = {};
      if (depositBonusPercent !== undefined) {
        updates.default_deposit_bonus_percent = depositBonusPercent.toString();
      }
      if (referralBonusPercent !== undefined) {
        updates.referral_bonus_percent = referralBonusPercent.toString();
      }
      if (conditionalBonusThreshold !== undefined) {
        updates.conditional_bonus_threshold = conditionalBonusThreshold.toString();
      }
      
      const result = await updateGameSettings(updates, req.user!.id);
      
      if (result.success) {
        auditLogger('bonus_settings_updated', req.user!.id, updates);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Update bonus settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update bonus settings'
      });
    }
  });

  // Game Settings Endpoints
  app.get("/api/admin/game-settings", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const result = await getGameSettings();
      res.json(result);
    } catch (error) {
      console.error('Get game settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get game settings'
      });
    }
  });

  app.put("/api/admin/game-settings", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const settings = req.body;
      const result = await updateGameSettings(settings, req.user!.id);
      
      if (result.success) {
        auditLogger('game_settings_updated', req.user!.id, settings);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Update game settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update game settings'
      });
    }
  });

  // Bet Management Endpoints
  app.get("/api/admin/games/:gameId/bets", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { gameId } = req.params;
      const bets = await storage.getActiveBetsForGame(gameId);
      
      // Join with user details
      const betsWithUserDetails = bets.map(bet => ({
        id: bet.id,
        userId: bet.userId,
        userPhone: (bet as any).user?.phone,
        userName: (bet as any).user?.full_name,
        gameId: bet.gameId,
        round: bet.round,
        side: bet.side,
        amount: parseFloat(bet.amount),
        status: bet.status,
        createdAt: bet.createdAt
      }));
      
      res.json({ success: true, data: betsWithUserDetails });
    } catch (error) {
      console.error('Get game bets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get game bets'
      });
    }
  });

  app.patch("/api/admin/bets/:betId", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { betId } = req.params;
      const { side, amount, round } = req.body;
      
      // Validate inputs
      if (!side || !['andar', 'bahar'].includes(side)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid side. Must be "andar" or "bahar"'
        });
      }
      
      if (!amount || amount < 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a positive number'
        });
      }
      
      if (!round || !['1', '2', 'round1', 'round2'].includes(round.toString())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid round. Must be 1 or 2'
        });
      }
      
      // Get current bet to find user info
      const currentBet = await storage.getBetById(betId);
      if (!currentBet) {
        return res.status(404).json({
          success: false,
          error: 'Bet not found'
        });
      }
      
      // 🔒 SECURITY: Only allow bet modification during betting phase
      const game = await storage.getGameSession(currentBet.gameId);
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game session not found'
        });
      }
      
      if (game.phase !== 'betting') {
        return res.status(400).json({
          success: false,
          error: `Cannot modify bets after betting phase. Current phase: ${game.phase}`
        });
      }
      
      // Update the bet in database
      await storage.updateBetDetails(betId, {
        side,
        amount: amount.toString(),
        round: round.toString()
      });
      
      // Update the current game state in memory
      const userId = currentBet.userId;
      if (currentGameState.userBets.has(userId)) {
        const userBets = currentGameState.userBets.get(userId)!;
        
        // Adjust total bets for the old side
        const oldSide = currentBet.side as 'andar' | 'bahar';
        const oldRound = parseInt(currentBet.round);
        const oldAmount = parseFloat(currentBet.amount);
        
        if (oldRound === 1) {
          userBets.round1[oldSide] -= oldAmount;
          currentGameState.round1Bets[oldSide] -= oldAmount;
        } else {
          userBets.round2[oldSide] -= oldAmount;
          currentGameState.round2Bets[oldSide] -= oldAmount;
        }
        
        // Add to new side
        const newSide = side as 'andar' | 'bahar';
        const newRound = parseInt(round.toString());
        const newAmount = parseFloat(amount);
        
        if (newRound === 1) {
          userBets.round1[newSide] += newAmount;
          currentGameState.round1Bets[newSide] += newAmount;
        } else {
          userBets.round2[newSide] += newAmount;
          currentGameState.round2Bets[newSide] += newAmount;
        }
      }
      
      // Broadcast update to all clients
      broadcast({
        type: 'admin_bet_update',
        data: {
          betId,
          userId,
          oldSide: currentBet.side,
          newSide: side,
          oldAmount: parseFloat(currentBet.amount),
          newAmount: amount,
          round: round.toString(),
          updatedBy: req.user!.id
        }
      });
      
      res.json({
        success: true,
        message: 'Bet updated successfully',
        data: {
          betId,
          userId,
          oldSide: currentBet.side,
          newSide: side,
          oldAmount: parseFloat(currentBet.amount),
          newAmount: amount,
          round: round.toString()
        }
      });
    } catch (error) {
      console.error('Update bet error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update bet'
      });
    }
  });

  // Add search endpoint by phone number
  app.get("/api/admin/search-bets", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { phone, gameId } = req.query;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }
      
      // Find user by phone number
      const user = await storage.getUserByPhone(phone as string);
      if (!user) {
        return res.json({
          success: true,
          data: [],
          message: 'No user found with this phone number'
        });
      }
      
      // Get user's bets for the specified game
      const bets = gameId
        ? await storage.getBetsForUser(user.id, gameId as string)
        : await storage.getUserBets(user.id);
      
      // Join with game details if needed
      const betsWithDetails = bets.map(bet => ({
        id: bet.id,
        userId: bet.userId,
        userPhone: user.phone,
        userName: user.full_name,
        gameId: bet.gameId,
        round: bet.round,
        side: bet.side,
        amount: parseFloat(bet.amount),
        status: bet.status,
        createdAt: bet.createdAt
      }));
      
      res.json({
        success: true,
        data: betsWithDetails
      });
    } catch (error) {
      console.error('Search bets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search bets'
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
      // For development, temporarily allow access
      // In production, add proper auth checking
      const userStr = req.headers.authorization?.replace('Bearer ', '');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // Set req.user for consistency with other routes
          req.user = {
            id: user.id || 'test-user',
            phone: user.phone,
            username: user.username,
            role: user.role || 'player'
          };
          res.json({ balance: user.balance || 100000.00 });
        } catch (e) {
          // Set a default user for fallback
          req.user = {
            id: 'default-user',
            phone: 'default',
            username: 'default',
            role: 'player'
          };
          res.json({ balance: 100000.00 }); // Default to ₹100,000
        }
      } else {
        // For now, allow without auth for testing
        // Set a default user for consistency
        req.user = {
          id: 'anonymous-user',
          phone: 'anonymous',
          username: 'anonymous',
          role: 'player'
        };
        res.json({ balance: 100000.00 }); // Default to ₹100,000
      }
    } catch (error) {
      console.error("Get balance error:", error);
      res.status(500).json({ error: "Failed to get balance" });
    }
  });

  // Stream Status Check Endpoint - Redirects to unified stream config
  app.get("/api/game/stream-status-check", async (req, res) => {
    try {
      // Use the unified stream configuration instead of the old system
      const streamConfig = await streamStorage.getStreamConfig();
      
      if (!streamConfig) {
        return res.json({
          status: 'offline',
          lastCheck: null,
          isStale: false,
          viewers: 0,
          bitrate: 0
        });
      }

      res.json({
        status: streamConfig.streamStatus,
        lastCheck: streamConfig.rtmpLastCheck || streamConfig.webrtcLastCheck || null,
        isStale: false, // Determined by the unified stream system now
        viewers: streamConfig.viewerCount,
        bitrate: streamConfig.webrtcBitrate
      });
    } catch (error) {
      console.error('Error checking stream status:', error);
      res.status(500).json({ error: 'Failed to check stream status' });
    }
  });

  // Analytics API Endpoints
  app.get("/api/admin/analytics", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { period = 'daily' } = req.query;
      
      if (period === 'daily') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const stats = await storage.getDailyStats(today);
        res.json({ success: true, data: stats });
      } else if (period === 'monthly') {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const stats = await storage.getMonthlyStats(currentMonth);
        res.json({ success: true, data: stats });
      } else if (period === 'yearly') {
        const currentYear = new Date().getFullYear();
        const stats = await storage.getYearlyStats(currentYear);
        res.json({ success: true, data: stats });
      } else {
        res.status(400).json({ success: false, error: 'Invalid period' });
      }
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve analytics' });
    }
  });

  // Real-time admin stats endpoint
  app.get("/api/admin/realtime-stats", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const realtimeStats = {
        currentGame: {
          id: currentGameState.gameId,
          phase: currentGameState.phase,
          currentRound: currentGameState.currentRound,
          timer: currentGameState.timer,
          andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
          baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
          bettingLocked: currentGameState.bettingLocked,
          totalPlayers: currentGameState.userBets.size
        },
        todayStats: await storage.getTodayStats(),
        todayGameCount: await storage.getTodayGameCount(),
        todayBetTotal: await storage.getTodayBetsTotal(),
        todayPlayers: await storage.getTodayUniquePlayers()
      };
      res.json({ success: true, data: realtimeStats });
    } catch (error) {
      console.error('Real-time stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve real-time stats' });
    }
  });

  // Game history endpoint for admin
  app.get("/api/admin/game-history", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        minProfit,
        maxProfit,
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;
      
      const startDate = dateFrom ? new Date(dateFrom as string) : new Date(0);
      const endDate = dateTo ? new Date(dateTo as string) : new Date();
      
      // Get game statistics with filters
      let gameStats = await storage.getGameStatisticsByDateRange(startDate, endDate);
      
      // Apply profit filters if specified
      if (minProfit !== undefined) {
        gameStats = gameStats.filter(stat => stat.profitLoss >= parseFloat(minProfit as string));
      }
      if (maxProfit !== undefined) {
        gameStats = gameStats.filter(stat => stat.profitLoss <= parseFloat(maxProfit as string));
      }
      
      // Sort results
      const sortField = sortBy as string;
      const ascending = sortOrder === 'asc';
      gameStats.sort((a, b) => {
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];
        
        if (ascending) {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedStats = gameStats.slice(startIndex, startIndex + limitNum);
      
      res.json({
        success: true,
        data: {
          games: paginatedStats,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: gameStats.length,
            pages: Math.ceil(gameStats.length / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Game history error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve game history' });
    }
  });

  return httpServer;
}
async function transitionToRound2() {
  console.log('Auto-transitioning to Round 2...');
  
  currentGameState.currentRound = 2;
  currentGameState.phase = 'betting';
  currentGameState.bettingLocked = false;
  
  // Only update database if not in test mode
  if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
    try {
      await storage.updateGameSession(currentGameState.gameId, {
        phase: 'betting',
        currentTimer: 30
      });
    } catch (error) {
      console.error('⚠️ Error updating game session for Round 2:', error);
    }
  }
  
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
    
    // Only update database if not in test mode
    if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
      try {
        await storage.updateGameSession(currentGameState.gameId, {
          phase: 'dealing'
        });
      } catch (error) {
        console.error('⚠️ Error updating game session for Round 2 dealing:', error);
      }
    }
    
    broadcast({
      type: 'phase_change',
      data: { 
        phase: 'dealing', 
        round: 2,
        message: 'Round 2 betting closed. Admin can now deal cards.' 
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
  
  // Only update database if not in test mode
  if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
    try {
      await storage.updateGameSession(currentGameState.gameId, {
        phase: 'dealing',
        currentTimer: 0
      });
    } catch (error) {
      console.error('⚠️ Error updating game session for Round 3:', error);
    }
  }
  
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
  
  // Only update database if not in test mode
  if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
    try {
      await storage.updateGameSession(currentGameState.gameId, {
        phase: 'complete',
        winner,
        winningCard,
        status: 'completed'
      });
    } catch (error) {
      console.error('⚠️ Error updating game session:', error);
    }
  }
  
  // Calculate payouts and analytics
  const payouts: Record<string, number> = {};
  let totalBetsAmount = 0;
  let totalPayoutsAmount = 0;
  let uniquePlayers = 0;
  
  // Calculate total bets for this game
  totalBetsAmount = (
    currentGameState.round1Bets.andar +
    currentGameState.round1Bets.bahar +
    currentGameState.round2Bets.andar +
    currentGameState.round2Bets.bahar
  );
  
  uniquePlayers = currentGameState.userBets.size;
  
  for (const [userId, bets] of Array.from(currentGameState.userBets.entries())) {
    const payout = calculatePayout(currentGameState.currentRound, winner, bets);
    payouts[userId] = payout;
    totalPayoutsAmount += payout;
    
    // Only update database if not in test mode
    if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
      try {
        if (payout > 0) {
          await storage.updateUserBalance(userId, payout);
          await storage.updateBetStatusByGameUser(currentGameState.gameId, userId, winner, 'won');
        } else {
          const loserSide = winner === 'andar' ? 'bahar' : 'andar';
          await storage.updateBetStatusByGameUser(currentGameState.gameId, userId, loserSide, 'lost');
        }
      } catch (error) {
        console.error(`⚠️ Error updating bet status for user ${userId}:`, error);
      }
    }
    
    // Send payout notifications to clients
    try {
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
    } catch (error) {
      console.error(`⚠️ Error sending payout notification to user ${userId}:`, error);
    }
  }
  
  // Calculate company profit/loss for this game
  const companyProfitLoss = totalBetsAmount - totalPayoutsAmount;
  const profitLossPercentage = totalBetsAmount > 0 ? (companyProfitLoss / totalBetsAmount) * 100 : 0;
  
  // Store game statistics
  if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
    try {
      await storage.saveGameStatistics({
        gameId: currentGameState.gameId,
        totalPlayers: uniquePlayers,
        totalBets: totalBetsAmount,
        totalWinnings: totalPayoutsAmount,
        houseEarnings: companyProfitLoss,
        profitLoss: companyProfitLoss,
        profitLossPercentage: profitLossPercentage,
        housePayout: totalPayoutsAmount,
        andarBetsCount: getBetCountForSide('andar'),
        baharBetsCount: getBetCountForSide('bahar'),
        andarTotalBet: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
        baharTotalBet: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
        uniquePlayers: uniquePlayers,
        gameDuration: 0 // Default to 0 for now, could be calculated later
      });
      
      // Update daily statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await storage.incrementDailyStats(today, {
        totalGames: 1,
        totalBets: totalBetsAmount,
        totalPayouts: totalPayoutsAmount,
        totalRevenue: companyProfitLoss,
        profitLoss: companyProfitLoss,
        uniquePlayers: uniquePlayers
      });
      
      // Update monthly stats
      const monthYear = today.toISOString().slice(0, 7); // YYYY-MM
      await storage.incrementMonthlyStats(monthYear, {
        totalGames: 1,
        totalBets: totalBetsAmount,
        totalPayouts: totalPayoutsAmount,
        totalRevenue: companyProfitLoss,
        profitLoss: companyProfitLoss,
        uniquePlayers: uniquePlayers
      });
      
      // Update yearly stats
      const year = today.getFullYear();
      await storage.incrementYearlyStats(year, {
        totalGames: 1,
        totalBets: totalBetsAmount,
        totalPayouts: totalPayoutsAmount,
        totalRevenue: companyProfitLoss,
        profitLoss: companyProfitLoss,
        uniquePlayers: uniquePlayers
      });
    } catch (error) {
      console.error('⚠️ Error saving game statistics:', error);
    }
  }
  
  // Determine payout message and winner display based on winner and round
  let payoutMessage = '';
  let winnerDisplay = '';
  
  if (currentGameState.currentRound === 1) {
    if (winner === 'andar') {
      payoutMessage = 'Andar wins! Payout: 1:1 (Double money) 💰';
      winnerDisplay = 'ANDAR WON';
    } else {
      payoutMessage = 'Baba wins! Payout: 1:0 (Refund only) 💵';
      winnerDisplay = 'BABA WON'; // Round 1 Bahar = Baba Won
    }
  } else if (currentGameState.currentRound === 2) {
    if (winner === 'andar') {
      payoutMessage = 'Andar wins! Payout: 1:1 on ALL bets (R1+R2) 💰💰';
      winnerDisplay = 'ANDAR WON';
    } else {
      payoutMessage = 'Shoot wins! R1 bets: 1:1, R2 bets: 1:0 (Refund) 💵';
      winnerDisplay = 'SHOOT WON'; // Round 2 Bahar = Shoot Won
    }
  } else {
    // Round 3
    if (winner === 'andar') {
      payoutMessage = 'Andar wins! Payout: 1:1 on ALL bets 💰💰💰';
      winnerDisplay = 'ANDAR WON';
    } else {
      payoutMessage = 'Bahar wins! Payout: 1:1 on ALL bets 💰💰💰';
      winnerDisplay = 'BAHAR WON'; // Round 3 Bahar = Bahar Won
    }
  }
  
  broadcast({
    type: 'game_complete',
    data: {
      winner: currentGameState.winner,
      winningCard: currentGameState.winningCard,
      round: currentGameState.currentRound,
      andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
      baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
      payoutMessage,
      winnerDisplay, // Custom display text for UI
      message: `🎉 Game Complete! ${winnerDisplay} with ${winningCard}!`
    }
  });
  
  // Only save to database if not in test mode
  if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
    try {
      await storage.saveGameHistory({
        gameId: currentGameState.gameId,
        openingCard: currentGameState.openingCard!,
        winner,
        winningCard,
        totalCards: currentGameState.andarCards.length + currentGameState.baharCards.length
      });
    } catch (error) {
      console.error('⚠️ Error saving game history:', error);
    }
  }
  
  // Auto-restart: Reset to idle after 5 seconds
  console.log('⏰ Auto-restarting game in 5 seconds...');
  setTimeout(() => {
    console.log('🔄 Auto-restart: Resetting game to idle state');
    
    // Reset game state
    currentGameState.phase = 'idle';
    currentGameState.currentRound = 1;
    currentGameState.openingCard = null;
    currentGameState.clearCards();
    currentGameState.winner = null;
    currentGameState.winningCard = null;
    currentGameState.round1Bets.andar = 0;
    currentGameState.round1Bets.bahar = 0;
    currentGameState.round2Bets.andar = 0;
    currentGameState.round2Bets.bahar = 0;
    currentGameState.userBets.clear();
    currentGameState.bettingLocked = false;
    currentGameState.timer = 0;
    
    // Broadcast reset to all clients
    broadcast({
      type: 'game_reset',
      data: {
        message: '🔄 Game reset. Ready for new game!',
        gameState: {
          gameId: currentGameState.gameId,
          phase: 'idle',
          currentRound: 1,
          timer: 0,
          openingCard: null,
          andarCards: [],
          baharCards: [],
          winner: null,
          winningCard: null
        }
      }
    });
    
    console.log('✅ Game auto-restarted successfully');
  }, 5000);
}

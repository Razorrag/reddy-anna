// Enhanced Server Routes with Complete Backend Integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage-supabase";
import { registerUser, loginUser, loginAdmin } from './auth';
import { processPayment, getTransactionHistory, applyDepositBonus, applyReferralBonus, checkConditionalBonus, applyAvailableBonus } from './payment';
import { 
  updateSiteContent, 
  getSiteContent, 
  updateSystemSettings, 
  getSystemSettings,
  getGameSettings,
  updateGameSettings
} from './content-management';
import { 
  WebSocketMessage, 
  StreamStatusMessage, 
  WebRTCOfferMessage, 
  WebRTCAnswerMessage, 
  WebRTCIceCandidateMessage 
} from '../shared/src/types/webSocket';

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
import { AdminRequestsSupabaseAPI } from './admin-requests-supabase';
import adminUserRoutes from './routes/admin';
import userRoutes from './routes/user';

// WebSocket client tracking
interface WSClient {
  ws: WebSocket;
  userId: string;
  role: 'player' | 'admin';
  wallet: number;
}

const clients = new Set<WSClient>();

// Make broadcast functions available globally for game handlers
declare global {
  var broadcast: (message: any, excludeClient?: WSClient) => void;
  var broadcastToRole: (message: any, role: 'player' | 'admin') => void;
  var clients: Set<WSClient>;
}

// Initialize global variables
global.broadcast = broadcast;
global.broadcastToRole = broadcastToRole;
global.clients = clients;

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
    let isAuthenticated = false;
    
    // Handle WebSocket messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        console.log('Received WebSocket message:', message.type);
        
        switch (message.type) {
          case 'authenticate': {
            const { token } = (message as any).data;
            
            if (!token) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Authentication token required' }
              }));
              return;
            }
            
            try {
              // Verify JWT token
              const { verifyToken } = await import('./auth');
              console.log('Verifying WebSocket token:', token);
              const decoded = verifyToken(token);
              console.log('Token decoded successfully:', decoded.id);
              
              // Store client information - this updates the outer scope client variable
              client = {
                ws,
                userId: decoded.id,
                role: decoded.role || 'player',
                wallet: 0 // Will be updated when needed
              };
              
              clients.add(client);
              isAuthenticated = true;
              console.log(`[WS] Client ${client.userId} added to active clients. Total: ${clients.size}`);
               
              // Send authentication success
              ws.send(JSON.stringify({
                type: 'authenticated',
                data: {
                  userId: decoded.id,
                  role: decoded.role || 'player',
                  message: 'Authentication successful'
                }
              }));
              console.log(`✅ WebSocket authenticated: ${decoded.id} (${decoded.role || 'player'})`);
            } catch (error) {
              console.error('WebSocket authentication error:', error);
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Invalid authentication token' }
              }));
              ws.close();
            }
            break;
          }
          
          // WebRTC Signaling for Screen Share Streaming
          case 'webrtc_offer':
            if (client?.role === 'admin') {
              clients.forEach((targetClient: WSClient) => {
                if (targetClient.userId !== client?.userId && targetClient.ws.readyState === WebSocket.OPEN) {
                  targetClient.ws.send(JSON.stringify({ 
                    type: 'webrtc_offer', 
                    data: (message as WebRTCOfferMessage).data
                  } as WebRTCOfferMessage));
                }
              });
            }
            break;

          case 'webrtc_answer':
            if (client?.role === 'player') {
              clients.forEach((adminClient: WSClient) => {
                if (adminClient.role === 'admin' && adminClient.ws.readyState === WebSocket.OPEN) {
                  adminClient.ws.send(JSON.stringify({ 
                    type: 'webrtc_answer', 
                    data: (message as WebRTCAnswerMessage).data 
                  } as WebRTCOfferMessage));
                }
              });
            }
            break;

          case 'webrtc_ice_candidate':
            if (client?.role === 'admin') {
              // broadcast function needs to be properly implemented here
              clients.forEach((targetClient: WSClient) => {
                if (targetClient.userId !== client?.userId && targetClient.ws.readyState === WebSocket.OPEN) {
                  targetClient.ws.send(JSON.stringify({ 
                    type: 'webrtc_ice_candidate', 
                    data: (message as WebRTCIceCandidateMessage).data
                  } as WebRTCIceCandidateMessage));
                }
              });
            } else {
              clients.forEach((adminClient: WSClient) => {
                if (adminClient.role === 'admin' && adminClient.ws.readyState === WebSocket.OPEN) {
                  adminClient.ws.send(JSON.stringify({ 
                    type: 'webrtc_ice_candidate', 
                    data: (message as WebRTCIceCandidateMessage).data
                  } as WebRTCIceCandidateMessage));
                }
              });
            }
            break;

          case 'stream_status':
            if (client?.role === 'admin') {
              clients.forEach((targetClient: WSClient) => {
                if (targetClient.ws.readyState === WebSocket.OPEN) {
                  targetClient.ws.send(JSON.stringify({ 
                    type: 'stream_status', 
                    data: (message as StreamStatusMessage).data
                  } as StreamStatusMessage));
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Failed to process message' }
          }));
        }
      }
    });    
    
    // Handle connection close
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      if (client && clients.has(client)) {
        clients.delete(client);
        console.log(`Client ${client.userId} removed. Active clients: ${clients.size}`);
      }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      // Don't remove the client immediately - let the close event handle it
    });
    
    // Set up ping/pong to detect dead connections (Keep-alive)
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Only send ping if the connection is still open
        ws.ping();
      } else {
        // Connection is no longer open, clear the interval
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds for better connection keeping
    
    // Handle pong responses to maintain connection
    ws.on('pong', () => {
      // Connection is alive - continue normal operation
    });
    
    // Handle ping requests from client (bidirectional keep-alive)
    ws.on('ping', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.pong(); // Respond to client pings
      }
    });
  });
  
  // REST API Routes
  
  // Apply unified authentication middleware to all API routes except public auth endpoints
  app.use("/api/*", (req, res, next) => {
    // Define public API paths that should NOT require authentication
    // These paths will bypass the requireAuth middleware
    const publicPaths = [
      '/api/auth/login',
      '/api/auth/admin-login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/stream/config'  // Stream config should be accessible to all users
    ];
    
    // Log all API requests for debugging
    console.log(`🔍 API Request: ${req.method} ${req.originalUrl || req.url}`);
    
    // Get the clean path without query parameters for comparison
    // Using multiple methods to ensure we get the correct path
    let cleanPath;
    
    if (req.originalUrl) {
      cleanPath = req.originalUrl.split('?')[0];
    } else if (req.url) {
      cleanPath = req.url.split('?')[0];
    } else if (req.path) {
      cleanPath = req.path;
    } else {
      // Fallback - get from full URL
      const fullUrl = req.url || '';
      cleanPath = fullUrl.split('?')[0] || fullUrl;
    }
    
    // Log detailed information for debugging
    console.log(`🔍 Auth check - Method: ${req.method}, Raw URL: "${req.url}", Clean Path: "${cleanPath}"`);
    
    // Check if this is a public path that should not require authentication
    let isPublicEndpoint = false;
    
    for (const publicPath of publicPaths) {
      if (cleanPath === publicPath) {
        isPublicEndpoint = true;
        console.log(`✅ Public endpoint identified: "${cleanPath}" matches "${publicPath}"`);
        break;
      }
    }
    
    // Allow public endpoints to continue without authentication
    if (isPublicEndpoint) {
      console.log(`🔓 Allowing public endpoint: "${cleanPath}"`);
      return next();
    }
    
    // For all other endpoints, require authentication
    console.log(`🔐 Requiring authentication for: "${cleanPath}"`);
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
        console.log('✅ Registration successful, returning token');
        res.status(201).json({
          success: true,
          user: result.user,
          token: result.user?.token // Ensure token is returned
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
        auditLogger('user_login', result.user.id, { ip: req.ip });
        console.log('✅ Login successful, returning token');
        res.json({
          success: true,
          user: result.user,
          token: result.user.token // Ensure token is returned
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
        auditLogger('admin_login', result.admin.id, { ip: req.ip });
        console.log('✅ Admin login successful, returning token');
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

  // Logout endpoint (JWT-only - client clears token from localStorage)
  app.post("/api/auth/logout", (req, res) => {
    // With JWT, logout is handled client-side by removing token from localStorage
    // Server doesn't need to do anything (stateless)
    console.log('✅ Logout request received (client will clear token)');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });  

  // Stream Routes - Dual streaming (RTMP and WebRTC)
  app.use("/api/stream", streamRoutes);
  
  // Admin Routes
  app.use("/api/admin", adminUserRoutes);
  app.use("/api/user", userRoutes);

  app.get("/api/game-settings", async (req, res) => {
    try {
      const settings = await storage.getGameSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/game-settings", requireAuth, validateAdminAccess, async (req, res) => {
    try {
      const settings = req.body;
      for (const key in settings) {
        await storage.updateGameSetting(key, settings[key]);
      }
      res.json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });
  
  // Payment Routes - ADMIN ONLY APPROVAL SYSTEM
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
      
      // 🔒 CRITICAL: ONLY ADMINS CAN PROCESS DIRECT PAYMENTS NOW
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only admins can process direct payments'
        });
      }
      
      // For admin direct processing, use the balance update endpoint instead
      const result = await processPayment({ userId, amount: numAmount, method, type });
      
      // If payment was successful, get updated user balance for response
      if (result.success) {
        const updatedUser = await storage.getUser(userId);
        if (updatedUser) {
          console.log(`💰 Admin processed payment: ${userId} -> ${parseFloat(updatedUser.balance)} (${type})`);
          
          // Add updated balance to the result for API consumers
          const responseWithUser = {
            ...result,
            user: {
              id: userId,
              balance: parseFloat(updatedUser.balance)
            }
          };
          res.json(responseWithUser);
          return;
        }
      }
      
      auditLogger('admin_payment_processed', userId, { amount: numAmount, type, method: method.type, processedBy: req.user.id });
      
      res.json(result);
    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment processing failed'
      });
    }
  });
  
  // Payment Request Routes (New: Request → Approval Workflow) - REQUIRED FOR ALL USER PAYMENTS
  app.post("/api/payment-requests", paymentLimiter, async (req, res) => {
    try {
      const { amount, paymentMethod, requestType } = req.body;
      
      // Validate required fields
      if (!amount || !paymentMethod || !requestType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment request parameters'
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
      
      // Validate request type
      if (!['deposit', 'withdrawal'].includes(requestType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request type. Must be deposit or withdrawal'
        });
      }
      
      // Verify user is authenticated
      if (!req.user) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      // Validate amount range based on request type
      const minDeposit = parseFloat(process.env.MIN_DEPOSIT || '100');
      const maxDeposit = parseFloat(process.env.MAX_DEPOSIT || '1000000');
      const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL || '500');
      const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL || '500000');
      
      const minAmount = requestType === 'deposit' ? minDeposit : minWithdrawal;
      const maxAmount = requestType === 'deposit' ? maxDeposit : maxWithdrawal;
      
      if (numAmount < minAmount || numAmount > maxAmount) {
        return res.status(400).json({
          success: false,
          error: `${requestType === 'deposit' ? 'Deposit' : 'Withdrawal'} amount must be between ₹${minAmount.toLocaleString()} and ₹${maxAmount.toLocaleString()}`
        });
      }
      
      // 🔒 WITHDRAWAL VALIDATION: Check if user has sufficient balance for withdrawal requests
      if (requestType === 'withdrawal') {
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        
        const currentBalance = parseFloat(user.balance) || 0;
        if (currentBalance < numAmount) {
          return res.status(400).json({
            success: false,
            error: `Insufficient balance for withdrawal. Current balance: ₹${currentBalance.toLocaleString()}, Requested: ₹${numAmount.toLocaleString()}`
          });
        }
      }
      
      // Create payment request (status: 'pending')
      const result = await storage.createPaymentRequest({
        userId: req.user.id,
        type: requestType,
        amount: numAmount,
        paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : JSON.stringify(paymentMethod),
        status: 'pending'
      });
      
      // Send WhatsApp notification to admin
      try {
        const { sendWhatsAppRequest } = await import('./whatsapp-service');
        await sendWhatsAppRequest({
          userId: req.user!.id,
          userPhone: req.user!.phone || req.user!.username || 'unknown',
          requestType: requestType.toUpperCase(),
          message: `🚨 NEW ${requestType.toUpperCase()} REQUEST: ₹${numAmount.toLocaleString('en-IN')} from ${req.user!.phone || req.user!.username || 'unknown'}`,
          amount: numAmount,
          isUrgent: true, // Mark as urgent for immediate admin attention
          metadata: { requestId: result.id }
        });
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp notification:', whatsappError);
        // Don't fail the request if WhatsApp notification fails
      }
      
      // Audit log
      auditLogger('payment_request_created', req.user.id, {
        requestId: result.id,
        type: requestType,
        amount: numAmount
      });
      
      res.json({
        success: true,
        message: `${requestType} request submitted successfully. Awaiting admin approval.`,
        requestId: result.id,
        data: result
      });
    } catch (error) {
      console.error('Payment request creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment request creation failed'
      });
    }
  });
  
  // Get user's payment requests
  app.get("/api/payment-requests", apiLimiter, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const requests = await storage.getPaymentRequestsByUser(req.user.id);
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Payment requests retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment requests retrieval failed'
      });
    }
  });
  
  // Admin: Get pending payment requests
  app.get("/api/admin/payment-requests/pending", apiLimiter, validateAdminAccess, async (req, res) => {
    try {
      const requests = await storage.getPendingPaymentRequests();
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Pending payment requests retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Pending payment requests retrieval failed'
      });
    }
  });
  
  // Admin: Approve payment request
  app.patch("/api/admin/payment-requests/:id/approve", apiLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the request to verify it exists and is pending
      const request = await storage.getPaymentRequest(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Payment request not found'
        });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Request is not in pending status'
        });
      }
      
      // Approve the payment request (atomic operation)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      await storage.approvePaymentRequest(id, request.user_id, request.amount, req.user.id);
      
      // FIXED: Remove balance updates from WebSocket entirely
      // All balance updates should now come from REST API polling
      console.log(`💰 Payment request approved via REST API: ${request.user_id} -> ${request.amount} (${request.request_type})`);
      
      // Audit log
      if (req.user) {
        auditLogger('payment_request_approved', req.user.id, {
          requestId: id,
          userId: request.user_id,
          amount: request.amount
        });
      }
      
      res.json({
        success: true,
        message: 'Payment request approved successfully'
      });
    } catch (error) {
      console.error('Payment request approval error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment request approval failed'
      });
    }
  });
  
  // Admin: Reject payment request
  app.patch("/api/admin/payment-requests/:id/reject", apiLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the request to verify it exists and is pending
      const request = await storage.getPaymentRequest(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Payment request not found'
        });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Request is not in pending status'
        });
      }
      
      // Update the payment request status to rejected
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      await storage.updatePaymentRequest(id, 'rejected', req.user.id);
      
      // Audit log
      if (req.user) {
        auditLogger('payment_request_rejected', req.user.id, {
          requestId: id,
          userId: request.user_id,
          amount: request.amount
        });
      }
      
      res.json({
        success: true,
        message: 'Payment request rejected successfully'
      });
    } catch (error) {
      console.error('Payment request rejection error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment request rejection failed'
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
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      const result = await getUserDetails(req.user.id);
      if (result.success) {
        res.json(result);
      } else {
        // If user not found, return 404, otherwise return the error
        const statusCode = result.error?.includes('not found') ? 404 : 400;
        res.status(statusCode).json(result);
      }
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
      // The unified requireAuth middleware should have set req.user
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const userId = req.user.id;
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

  // Referral Data Route - NEW ENDPOINT
  app.get("/api/user/referral-data", generalLimiter, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      const userId = req.user.id;
      
      // Get user's referral code and statistics
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user's referred users
      const referredUsers = await storage.getUserReferrals(userId);
      
      // Calculate referral statistics
      const totalReferrals = referredUsers.length;
      const totalDepositsFromReferrals = referredUsers.reduce((sum, referral) =>
        sum + (parseFloat(referral.depositAmount || '0') || 0), 0
      );
      const totalBonusEarned = referredUsers.reduce((sum, referral) =>
        sum + (parseFloat(referral.bonusAmount || '0') || 0), 0
      );
      const activeReferrals = referredUsers.filter(referral =>
        referral.bonusApplied
      ).length;

      const referralData = {
        referralCode: user.referral_code_generated,
        totalReferrals,
        activeReferrals,
        totalDepositsFromReferrals,
        totalBonusEarned,
        referredUsers: referredUsers.map(referral => ({
          id: referral.referredUserId,
          phone: '', // Would need to fetch user details separately
          fullName: '', // Would need to fetch user details separately
          depositAmount: parseFloat(referral.depositAmount || '0') || 0,
          bonusAmount: parseFloat(referral.bonusAmount || '0') || 0,
          bonusApplied: referral.bonusApplied,
          createdAt: referral.createdAt
        }))
      };

      res.json({
        success: true,
        data: referralData
      });
    } catch (error) {
      console.error('Get referral data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve referral data'
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

  // Helper function to send error messages to WebSocket clients
  function sendError(ws: WebSocket, message: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message }
      }));
    }
  }
  
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
      
      if (result.success) {
        // Broadcast status update to all WebSocket clients for this user
        try {
          clients.forEach(client => {
            if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'status_update',
                data: {
                  userId,
                  status: status,
                  reason: reason || 'Status updated by admin',
                  timestamp: Date.now()
                }
              }));
            }
          });
          
          console.log(`🔄 Status update broadcast to user ${userId}: ${status}`);
        } catch (broadcastError) {
          console.error('Failed to broadcast status update:', broadcastError);
          // Don't fail the update if broadcast fails
        }
      }
      
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
      
      // Validate required fields
      if (amount === undefined || amount === null) {
        return res.status(400).json({
          success: false,
          error: 'Amount is required'
        });
      }
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Reason is required'
        });
      }
      
      // Validate amount is a valid number
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a valid number'
        });
      }
      
      // 🔒 CRITICAL: Admin can set any balance (positive or negative for adjustments)
      // No validation of user's current balance - admin has full control
      
      // First, update the user's balance in the database
      const result = await updateUserBalance(userId, numAmount, req.user!.id, reason, type);
      
      if (result.success) {
        // Get the updated user details to get the new balance
        const updatedUser = await storage.getUser(userId);
        if (updatedUser) {
          // Broadcast balance update to all WebSocket clients for this user
          try {
            clients.forEach(client => {
              if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                  type: 'balance_update',
                  data: {
                    userId,
                    balance: parseFloat(updatedUser.balance),
                    type: type || 'admin_adjustment',
                    amount: numAmount,
                    reason: reason,
                    timestamp: Date.now()
                  }
                }));
              }
            });
            
            console.log(`💰 Admin balance update: User ${userId} -> ₹${parseFloat(updatedUser.balance)} (Change: ₹${numAmount}, Reason: ${reason})`);
          } catch (broadcastError) {
            console.error('Failed to broadcast balance update:', broadcastError);
            // Don't fail the update if broadcast fails
          }
        }
      }
      
      auditLogger('admin_balance_adjustment', req.user!.id, {
        userId,
        amount: numAmount,
        reason,
        type: type || 'admin_adjustment',
        previousBalance: result.previousBalance,
        newBalance: result.newBalance
      });
      
      res.json({
        ...result,
        message: `Balance ${type || 'adjusted'} by admin. ${reason}`
      });
    } catch (error) {
      console.error('Admin balance update error:', error);
      res.status(500).json({
        success: false,
        error: 'Admin balance update failed'
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
        role: role || 'player', // Default to player if not specified
        status: status || 'active' // Default to active if not specified
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

  // Admin Direct Payment Request Creation - BYPASS USER REQUEST SYSTEM
  app.post("/api/admin/payment-requests/create", generalLimiter, validateAdminAccess, async (req, res) => {
    try {
      const { userId, amount, paymentMethod, requestType, reason } = req.body;
      
      // Validate required fields
      if (!userId || !amount || !requestType || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, amount, requestType, reason'
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
      
      // Validate request type
      if (!['deposit', 'withdrawal'].includes(requestType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request type. Must be deposit or withdrawal'
        });
      }
      
      // Validate reason
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Reason is required'
        });
      }
      
      // 🔒 WITHDRAWAL VALIDATION: Check if user has sufficient balance
      if (requestType === 'withdrawal') {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        
        const currentBalance = parseFloat(user.balance) || 0;
        if (currentBalance < numAmount) {
          return res.status(400).json({
            success: false,
            error: `Insufficient balance for withdrawal. Current balance: ₹${currentBalance.toLocaleString()}, Requested: ₹${numAmount.toLocaleString()}`
          });
        }
      }
      
      // Create payment request with immediate approval for admin-created requests
      const result = await storage.createPaymentRequest({
        userId: userId,
        type: requestType,
        amount: numAmount,
        paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : JSON.stringify(paymentMethod),
        status: 'approved', // Admin requests are auto-approved
        adminNotes: `Admin created: ${reason}`
      });
      
      // Immediately process the approved request to update balance
      try {
        await storage.approvePaymentRequest(result.id, userId, numAmount, req.user!.id);
        console.log(`✅ Admin auto-approved ${requestType}: User ${userId} -> ₹${numAmount} (Reason: ${reason})`);
      } catch (processError) {
        console.error('Failed to auto-process admin request:', processError);
        // Don't fail the creation if processing fails - admin can manually process
      }
      
      // Send notification to user
      try {
        // This would send a WebSocket notification to the user
        clients.forEach(client => {
          if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
              type: 'admin_payment_notification',
              data: {
                message: `Admin ${requestType === 'deposit' ? 'added' : 'withdrew'} ₹${numAmount.toLocaleString()} to your account`,
                reason: reason,
                timestamp: Date.now()
              }
            }));
          }
        });
      } catch (notificationError) {
        console.error('Failed to send user notification:', notificationError);
        // Don't fail the request if notification fails
      }
      
      // Audit log
      auditLogger('admin_direct_payment_created', req.user!.id, {
        userId,
        requestId: result.id,
        type: requestType,
        amount: numAmount,
        reason: reason
      });
      
      res.json({
        success: true,
        message: `${requestType} request created and approved successfully`,
        requestId: result.id,
        data: {
          ...result,
          reason: reason,
          processed: true
        }
      });
    } catch (error) {
      console.error('Admin direct payment creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Admin direct payment creation failed'
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
      // The unified requireAuth middleware should have set req.user
      if (!req.user || !req.user.id) {
        console.log("Balance endpoint - No authenticated user found");
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const userId = req.user.id;
      console.log(`Balance endpoint - Fetching balance for user: ${userId}`);
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log(`Balance endpoint - User not found: ${userId}`);
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Balance is already a number from getUser() - no need to parse
      const balance = Number(user.balance) || 0;
      console.log(`Balance endpoint - Retrieved balance for ${userId}: ${balance}`);
      
      res.json({
        success: true,
        balance: balance
      });
    } catch (error) {
      console.error("Get balance error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get balance"
      });
    }
  });

  // Balance notification endpoint for WebSocket updates
  app.post("/api/user/balance-notify", async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const { userId, balance, transactionType, amount } = req.body;
      
      // Only allow users to notify their own balance updates
      if (userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      // Broadcast balance update to all WebSocket clients for this user
      try {
        clients.forEach(client => {
          if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
              type: 'balance_update',
              data: {
                userId,
                balance: parseFloat(balance),
                transactionType: transactionType || 'unknown',
                amount: parseFloat(amount) || 0,
                timestamp: Date.now()
              }
            }));
          }
        });
        
        console.log(`💰 Balance notification sent: ${userId} -> ${parseFloat(balance)} (${transactionType})`);
      } catch (broadcastError) {
        console.error('Failed to broadcast balance notification:', broadcastError);
      }
      
      res.json({
        success: true,
        message: 'Balance notification sent successfully'
      });
    } catch (error) {
      console.error('Balance notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Balance notification failed'
      });
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
    
    // Calculate total bet amount for this user
    const userTotalBet = bets.round1.andar + bets.round1.bahar + bets.round2.andar + bets.round2.bahar;
    const userWon = payout > userTotalBet; // User won if payout > their total bet
    
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
        
        // CRITICAL FIX: Update user game statistics (total_winnings, total_losses, games_played, games_won)
        await storage.updateUserGameStats(userId, userWon, userTotalBet, payout);
        
        // Check conditional bonus threshold (auto-apply if ±30% from original deposit)
        try {
          const bonusApplied = await storage.applyConditionalBonus(userId);
          if (bonusApplied) {
            console.log(`✅ Conditional bonus auto-applied for user ${userId} after game completion`);
            // Notify user about bonus
            clients.forEach(c => {
              if (c.userId === userId && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify({
                  type: 'conditional_bonus_applied',
                  data: {
                    message: 'Bonus automatically added to your balance!',
                    timestamp: Date.now()
                  }
                }));
              }
            });
          }
        } catch (bonusError) {
          console.error(`⚠️ Error checking conditional bonus for user ${userId}:`, bonusError);
          // Don't fail payout if bonus check fails
        }
      } catch (error) {
        console.error(`⚠️ Error updating bet status for user ${userId}:`, error);
      }
    }
    
    // FIXED: Simplify WebSocket notifications - only send game result notifications
    // Balance updates should come from REST API polling
    try {
      clients.forEach(client => {
        if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
          // Only send payout notification, not balance update
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

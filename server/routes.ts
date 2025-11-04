// Enhanced Server Routes with Complete Backend Integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage-supabase";
import { registerUser, loginUser, loginAdmin, requireAuth } from './auth';
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
import { webrtcSignaling } from './webrtc-signaling';
import { AdminRequestsAPI } from './admin-requests-api';
import pg from 'pg';
const { Pool } = pg;

// Extend WebSocketMessage type for our custom messages
type ExtendedWebSocketMessage = WebSocketMessage | {
  type: 'token_refresh';
  data: { refreshToken: string };
} | {
  type: 'token_refreshed';
  data: { token: string; refreshToken: string; expiresIn: number };
} | {
  type: 'token_refresh_error';
  data: { message: string; code: string };
} | {
  type: 'activity_ping';
  data?: any;
} | {
  type: 'activity_pong';
  data: { timestamp: number; tokenExpiry?: number };
} | {
  type: 'token_expiry_warning';
  data: { expiresIn: number; message: string };
} | {
  type: 'token_expired';
  data: { message: string };
} | {
  type: 'inactivity_warning';
  data: { inactiveFor: number; message: string };
} | {
  type: 'bet_error';
  data: {
    message: string;
    code: string;
    field?: string;
    currentBalance?: number;
    required?: number;
    minAmount?: number;
    maxAmount?: number;
    timeToWait?: number;
    maxBets?: number;
    windowSeconds?: number;
    phase?: string;
    locked?: boolean;
    currentRound?: number;
    status?: string;
    error?: string;
  };
} | {
  type: 'bet_confirmed';
  data: {
    betId: string;
    userId: string;
    round: number;
    side: string;
    amount: number;
    newBalance: number;
    timestamp: number;
  };
} | {
  type: 'place_bet';
  data: { gameId: string; side: string; amount: number; round: number };
} | {
  type: 'start_game';
  data: { openingCard: string };
} | {
  type: 'deal_card';
  data: { gameId: string; card: string; side: string; position: number };
} | {
  type: 'game_subscribe';
  data?: any;
};

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
// WhatsApp service removed - functionality handled by admin-requests-supabase.ts
// import {
//   sendWhatsAppRequest,
//   getUserRequestHistory,
//   getPendingAdminRequests,
//   updateRequestStatus
// } from './whatsapp-service';
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
import {
  handlePlayerBet,
  handleStartGame,
  handleDealCard,
  handleGameSubscribe,
  sendError
} from './socket/game-handlers';

// WebSocket client tracking
interface WSClient {
  ws: WebSocket;
  userId: string;
  role: 'player' | 'admin';
  wallet: number;
  authenticatedAt?: number;
  lastActivity?: number;
  tokenExpiry?: number;
}

// Make broadcast functions available globally for game handlers
declare global {
  var broadcast: (message: any, excludeClient?: WSClient) => void;
  var broadcastToRole: (message: any, role: 'player' | 'admin') => void;
  var clients: Set<WSClient>;
}

// Initialize clients Set before using it
export const clients = new Set<WSClient>();

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
export class GameState {
  private state = {
    gameId: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID on initialization
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
  set openingCard(value: string | null) {
    // Generate new game ID when opening card is first set, but only if game ID is invalid/default
    if (value && !this.state.openingCard) {
      // Only generate new ID if current ID is invalid or default
      if (!this.state.gameId || 
          typeof this.state.gameId !== 'string' || 
          this.state.gameId.trim() === '' ||
          this.state.gameId === 'default-game' ||
          this.state.gameId.startsWith('game-') === false) {
        this.state.gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🎮 New game ID generated for opening card: ${this.state.gameId}`);
      } else {
        console.log(`🎮 Using existing game ID for opening card: ${this.state.gameId}`);
      }
    }
    this.state.openingCard = value;
  }
  
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
    // Clean up timer before resetting to prevent memory leaks
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      console.log('🔄 Timer cleared during game reset');
    }
    
    // Preserve the current game ID for the current game session
    const currentGameId = this.state.gameId;
    
    this.state = {
      gameId: currentGameId, // Keep the same game ID for current session
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

  // New game should generate a completely new game ID
  startNewGame() {
    this.state.gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.reset();
  }
}

const currentGameState = new GameState();

// Function to persist game state to database
async function persistGameState() {
  try {
    const existingSession = await storage.getGameSession(currentGameState.gameId);
    
    const updateData: any = {
      phase: currentGameState.phase,
      current_round: currentGameState.currentRound,
      current_timer: currentGameState.timer,
      opening_card: currentGameState.openingCard,
      andar_cards: currentGameState.andarCards,
      bahar_cards: currentGameState.baharCards,
      winner: currentGameState.winner,
      winning_card: currentGameState.winningCard,
      total_andar_bets: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
      total_bahar_bets: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
      status: currentGameState.phase === 'complete' ? 'completed' : 'active',
    };

    if (existingSession) {
      await storage.updateGameSession(currentGameState.gameId, updateData);
    } else if (currentGameState.phase !== 'idle') {
      // Create new session if game is active and session doesn't exist
      // ✅ FIX: Use gameId (camelCase) to match InsertGameSession interface
      await storage.createGameSession({
        gameId: currentGameState.gameId, // ✅ FIX: Use gameId instead of game_id
        openingCard: currentGameState.openingCard || undefined,
        phase: currentGameState.phase,
        currentTimer: currentGameState.timer,
        round: currentGameState.currentRound,
      } as any);
      
      // Then update it with all the details
      await storage.updateGameSession(currentGameState.gameId, updateData);
    }
  } catch (error) {
    console.error('Error persisting game state:', error);
  }
}

// Function to restore active game state from database on server startup
async function restoreActiveGameState() {
  try {
    const activeSession = await storage.getActiveGameSession();
    if (activeSession && activeSession.status === 'active') {
      console.log('🔄 Restoring active game state from database...');
      
      // Restore game state from database
      currentGameState.gameId = activeSession.game_id;
      currentGameState.phase = activeSession.phase as GamePhase;
      currentGameState.currentRound = (activeSession.current_round || 1) as 1 | 2 | 3;
      currentGameState.timer = activeSession.current_timer || 0;
      currentGameState.openingCard = activeSession.opening_card;
      currentGameState.andarCards = activeSession.andar_cards || [];
      currentGameState.baharCards = activeSession.bahar_cards || [];
      currentGameState.winner = activeSession.winner;
      currentGameState.winningCard = activeSession.winning_card;
      
      // Restore bets from database
      const bets = await storage.getBetsForGame(activeSession.game_id);
      const round1Bets = { andar: 0, bahar: 0 };
      const round2Bets = { andar: 0, bahar: 0 };
      
      bets.forEach((bet: any) => {
        const amount = parseFloat(bet.amount || '0');
        if (bet.round === '1' || bet.round === 1) {
          round1Bets[bet.side as 'andar' | 'bahar'] += amount;
        } else if (bet.round === '2' || bet.round === 2) {
          round2Bets[bet.side as 'andar' | 'bahar'] += amount;
        }
      });
      
      currentGameState.round1Bets = round1Bets;
      currentGameState.round2Bets = round2Bets;
      
      console.log('✅ Active game state restored:', {
        gameId: currentGameState.gameId,
        phase: currentGameState.phase,
        round: currentGameState.currentRound,
        timer: currentGameState.timer
      });
    }
  } catch (error) {
    console.error('Error restoring game state:', error);
  }
}

// Helper function to get current game state for new connections
const getCurrentGameStateForUser = async (userId: string) => {
  try {
    // Get user information - handle both players and admins
    let user = await storage.getUser(userId);
    let userBalance = 0;
    
    if (!user) {
      // Check if this is an admin user (admins don't exist in users table)
      console.log('User not found in users table, checking if admin:', userId);
      // For admins, create a minimal user object
      user = {
        id: userId,
        balance: 0,
        role: 'admin'
      } as any;
      userBalance = 0;
    } else {
      userBalance = parseFloat(user.balance) || 0;
    }

    // Get user's current bets from database (only for non-admin users)
    // CRITICAL FIX: Use getBetsForUser instead of getBetsForGame to only get current user's bets
    const userBets = user.role === 'admin' ? [] : await storage.getBetsForUser(userId, currentGameState.gameId);
    
    // Store individual bets as arrays (not cumulative totals)
    const round1Bets = { andar: [] as number[], bahar: [] as number[] };
    const round2Bets = { andar: [] as number[], bahar: [] as number[] };
    
    // Group individual bets by round and side
    userBets.forEach((bet: any) => {
      const amount = parseFloat(bet.amount);
      if (bet.round === '1' || bet.round === 1) {
        if (bet.side === 'andar') {
          round1Bets.andar.push(amount);
        } else if (bet.side === 'bahar') {
          round1Bets.bahar.push(amount);
        }
      } else if (bet.round === '2' || bet.round === 2) {
        if (bet.side === 'andar') {
          round2Bets.andar.push(amount);
        } else if (bet.side === 'bahar') {
          round2Bets.bahar.push(amount);
        }
      }
    });

    // Enhanced game state with proper synchronization
    // CRITICAL: Only include user-specific bets, NOT total bets from all players
    const gameStateForUser = {
      gameId: currentGameState.gameId,
      phase: currentGameState.phase,
      currentRound: currentGameState.currentRound,
      timer: currentGameState.timer,
      countdownTimer: currentGameState.timer, // Add countdownTimer for compatibility
      openingCard: currentGameState.openingCard,
      andarCards: currentGameState.andarCards,
      baharCards: currentGameState.baharCards,
      winner: currentGameState.winner,
      winningCard: currentGameState.winningCard,
      // DO NOT send round1Bets/round2Bets (total bets) to players - only admins see total bets
      // round1Bets: currentGameState.round1Bets, // REMOVED - total bets from all players
      // round2Bets: currentGameState.round2Bets, // REMOVED - total bets from all players
      // User-specific data only
      userBalance: userBalance,
      userBets: {
        round1: round1Bets,
        round2: round2Bets
      },
      playerRound1Bets: round1Bets, // User's own bets only
      playerRound2Bets: round2Bets, // User's own bets only
      // Game flow information
      canJoin: true, // Users can always join to watch
      canBet: currentGameState.phase === 'betting' && !currentGameState.bettingLocked,
      isGameActive: currentGameState.phase !== 'idle',
      bettingLocked: currentGameState.bettingLocked,
      // Enhanced game flow information
      message: getJoinMessage(currentGameState.phase, currentGameState.currentRound),
      // Additional state for proper UI synchronization
      status: currentGameState.phase === 'idle' ? 'waiting' :
              currentGameState.phase === 'betting' ? 'betting' :
              currentGameState.phase === 'dealing' ? 'dealing' : 'completed',
      // Card information in proper format
      selectedOpeningCard: currentGameState.openingCard ? {
        rank: currentGameState.openingCard.slice(0, -1),
        suit: currentGameState.openingCard.slice(-1),
        id: `opening-${Date.now()}`
      } : null,
      // Dealt cards with proper format
      dealtCards: [
        ...currentGameState.andarCards.map((card, index) => ({
          id: `andar-${index}`,
          card: { rank: card.slice(0, -1), suit: card.slice(-1) },
          side: 'andar',
          position: index + 1
        })),
        ...currentGameState.baharCards.map((card, index) => ({
          id: `bahar-${index}`,
          card: { rank: card.slice(0, -1), suit: card.slice(-1) },
          side: 'bahar',
          position: index + 1
        }))
      ],
      // Game history placeholder
      history: [] // Would be populated from database
    };

    console.log(`[GAME_STATE] Synchronized state for user ${userId}:`, {
      phase: gameStateForUser.phase,
      currentRound: gameStateForUser.currentRound,
      canBet: gameStateForUser.canBet,
      userBalance: gameStateForUser.userBalance
    });

    return gameStateForUser;
  } catch (error) {
    console.error('Error getting game state for user:', error);
    return null;
  }
};

// Make getCurrentGameStateForUser globally available for WebSocket handlers
(global as any).getCurrentGameStateForUser = getCurrentGameStateForUser;

// Helper function to get appropriate join message
const getJoinMessage = (phase: string, currentRound: number): string => {
  switch (phase) {
    case 'idle':
      return 'Waiting for game to start...';
    case 'betting':
      if (currentRound === 1) {
        return 'Round 1 betting is open! Place your bets now.';
      } else if (currentRound === 2) {
        return 'Round 2 betting is open! Place your additional bets.';
      }
      return 'Betting is open!';
    case 'dealing':
      if (currentRound === 1) {
        return 'Round 1 is in progress. Watch the cards being dealt.';
      } else if (currentRound === 2) {
        return 'Round 2 is in progress. More cards to be revealed.';
      } else {
        return 'Final round in progress. Who will win?';
      }
    case 'complete':
      return 'Game completed! Waiting for next game to start...';
    default:
      return 'Joining game...';
  }
};

// WebSocket broadcast functions
function broadcast(message: any, excludeClient?: WSClient) {
  const messageStr = JSON.stringify({...message, timestamp: Date.now()});
  
  // Buffer important game events for replay on reconnection
  const gameId = (global as any).currentGameState?.gameId;
  if (gameId && shouldBufferEvent(message.type)) {
    try {
      const { eventBuffer } = require('./socket/event-buffer');
      eventBuffer.addEvent(gameId, message.type, message.data);
    } catch (error) {
      // Event buffer not available - continue without buffering
      console.warn('Event buffer not available:', error);
    }
  }
  
  clients.forEach(client => {
    if (client !== excludeClient && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

/**
 * Determine if an event type should be buffered for replay
 */
function shouldBufferEvent(eventType: string): boolean {
  const bufferableEvents = [
    'game_start',
    'phase_change',
    'card_dealt',
    'round_start',
    'timer_update',
    // 'bet_confirmed' - DO NOT BUFFER - user-specific event, should not be replayed to other users
    // 'user_bets_update' - DO NOT BUFFER - user-specific event, should not be replayed to other users
    'payout_received',
    'game_complete',
    'game_reset',
    'start_round_2',
    'start_final_draw'
  ];
  return bufferableEvents.includes(eventType);
}

export function broadcastToRole(message: any, role: 'player' | 'admin') {
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
  currentGameState.bettingLocked = false; // Betting open at timer start
  
  // Persist timer start
  persistGameState().catch(err => console.error('Error persisting timer start:', err));
  
  broadcast({
    type: 'timer_update',
    data: {
      seconds: currentGameState.timer,
      phase: currentGameState.phase,
      round: currentGameState.currentRound,
      bettingLocked: false // Betting is open
    }
  });
  
  let lastPersistTime = Date.now();
  currentGameState.timerInterval = setInterval(() => {
    currentGameState.timer--;
    
    // Update betting locked status based on timer
    if (currentGameState.timer <= 0) {
      currentGameState.bettingLocked = true;
    }
    
    broadcast({
      type: 'timer_update',
      data: {
        seconds: currentGameState.timer,
        phase: currentGameState.phase,
        round: currentGameState.currentRound,
        bettingLocked: currentGameState.timer <= 0
      }
    });
    
    // Persist state every 5 seconds during timer countdown
    const now = Date.now();
    if (now - lastPersistTime >= 5000) {
      persistGameState().catch(err => console.error('Error persisting timer update:', err));
      lastPersistTime = now;
    }
    
    if (currentGameState.timer <= 0) {
      if (currentGameState.timerInterval) {
        clearInterval(currentGameState.timerInterval);
        currentGameState.timerInterval = null;
      }
      
      currentGameState.bettingLocked = true;
      
      // Persist final timer state
      persistGameState().catch(err => console.error('Error persisting timer end:', err));
      
      // Update phase to dealing
      currentGameState.phase = 'dealing';
      
      // Broadcast phase change
      broadcast({
        type: 'phase_change',
        data: {
          phase: 'dealing',
          round: currentGameState.currentRound,
          bettingLocked: true,
          message: 'Betting closed. Admin can now deal cards.'
        }
      });
      
      // Persist phase change
      persistGameState().catch(err => console.error('Error persisting phase change:', err));
      
      onComplete(); // Execute the completion callback
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Apply security middleware
  app.use(securityMiddleware);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  // Expose wss so other routers/services can push real-time notifications
  app.set('wss', wss);

  // Initialize and mount Admin Requests API under /api/admin
  // Prefer Supabase if configured; otherwise fall back to Postgres
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const adminRequestsSupabaseApi = new AdminRequestsSupabaseAPI();
      app.use('/api/admin', adminRequestsSupabaseApi.getRouter());
      console.log('🐾 Admin Requests API enabled (Supabase)');
    } catch (e) {
      console.warn('🐾 Failed to initialize Supabase Admin Requests API, falling back to Postgres if available.', e);
      const pgConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
      if (pgConnectionString) {
        const pgPool = new Pool({
          connectionString: pgConnectionString,
          ssl: (process.env.PGSSL?.toLowerCase() === 'true') ? { rejectUnauthorized: false } : undefined,
        });
        try {
          await pgPool.query('SELECT 1');
          const adminRequestsApi = new AdminRequestsAPI(pgPool);
          app.use('/api/admin', adminRequestsApi.getRouter());
          console.log('🐾 Admin Requests API enabled (Postgres fallback)');
        } catch (err) {
          console.warn('🐾 Admin Requests API disabled: Postgres database unreachable. Set DATABASE_URL/POSTGRES_URL and ensure DB is running.');
        }
      } else {
        console.warn('🐾 Admin Requests API disabled: No Supabase or Postgres configuration found');
      }
    }
  } else {
    // No Supabase credentials; try Postgres
    const pgConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
    if (pgConnectionString) {
      const pgPool = new Pool({
        connectionString: pgConnectionString,
        ssl: (process.env.PGSSL?.toLowerCase() === 'true') ? { rejectUnauthorized: false } : undefined,
      });
      try {
        await pgPool.query('SELECT 1');
        const adminRequestsApi = new AdminRequestsAPI(pgPool);
        app.use('/api/admin', adminRequestsApi.getRouter());
        console.log('🐾 Admin Requests API enabled (Postgres)');
      } catch (e) {
        console.warn('🐾 Admin Requests API disabled: database unreachable. Set DATABASE_URL/POSTGRES_URL and ensure DB is running.');
      }
    } else {
      console.warn('🐾 Admin Requests API disabled: Neither Supabase nor Postgres env vars are set');
    }
  }
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    
    let client: WSClient | null = null;
    let isAuthenticated = false;
    let webrtcClientId: string | null = null;
    
    // Handle WebSocket messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ExtendedWebSocketMessage;
        console.log('Received WebSocket message:', message.type);
        
        switch (message.type) {
          case 'authenticate': {
            const { token } = (message as any).data;
            
            if (!token) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Authentication token required' }
              }));
              ws.close(4008, 'Authentication token required');
              return;
            }
            
            try {
              // Verify JWT token
              const { verifyToken } = await import('./auth');
              console.log('Verifying WebSocket token:', token);
            const decoded = verifyToken(token);
            console.log('Token decoded successfully:', decoded.id, `(role: ${decoded.role})`);

            // Ensure this is an access token, not a refresh token
            if (decoded.type !== 'access') {
              throw new Error(`Invalid token type. Expected 'access', got '${decoded.type}'`);
            }

            // Enhanced token expiration check with buffer
            const now = Math.floor(Date.now() / 1000);
            const expirationBuffer = 60; // 60 seconds buffer

            if (decoded.exp && decoded.exp < (now + expirationBuffer)) {
              throw new Error('Token expired or about to expire');
            }

            let user = null;

            // Handle admin users - they don't exist in regular users table
            if (decoded.role === 'admin' || decoded.role === 'super_admin') {
              // For admin users, create a proxy user object
              user = {
                id: decoded.id,
                phone: decoded.username,
                username: decoded.username,
                role: decoded.role,
                balance: 0,
                status: 'active',
                full_name: `Admin ${decoded.username}`,
                isAdmin: true
              };
              console.log('Using admin user object for WebSocket auth');
            } else {
              // For regular users, validate in database
              user = await storage.getUser(decoded.id);
              if (!user) {
                throw new Error('User not found');
              }

              // Check user account status
              if (user.status !== 'active') {
                throw new Error(`Account is ${user.status}`);
              }
            }
              
              // Enhanced client object with additional properties
              const nowMs = Date.now();
              const newClient: WSClient = {
                ws,
                userId: decoded.id,
                role: decoded.role || 'player',
                wallet: parseFloat(user.balance as string) || 0,
                authenticatedAt: nowMs,
                lastActivity: nowMs,
                tokenExpiry: decoded.exp || (now + 3600)
              };
              
              client = newClient;
              clients.add(client);
              isAuthenticated = true;
              
              // Register with WebRTC signaling server
              webrtcClientId = `ws-${decoded.id}-${Date.now()}`;
              webrtcSignaling.registerClient(ws, webrtcClientId, decoded.role || 'player');
              
              console.log(`[WS] Client ${client.userId} added to active clients. Total: ${clients.size}`);
              console.log(`[WebRTC] Client registered with signaling: ${webrtcClientId}`);
               
              // Get current game state for this user
              const gameStateForUser = await getCurrentGameStateForUser(client.userId);
              
              // Get buffered events for replay on reconnection
              let bufferedEvents: any[] = [];
              const gameId = (global as any).currentGameState?.gameId;
              if (gameId) {
                try {
                  const { eventBuffer } = require('./socket/event-buffer');
                  // Get recent events from last 30 seconds
                  const sinceTimestamp = Date.now() - 30000;
                  bufferedEvents = eventBuffer.getEventsSince(gameId, sinceTimestamp);
                  
                  // Limit to last 10 events to avoid overwhelming client
                  if (bufferedEvents.length > 10) {
                    bufferedEvents = bufferedEvents.slice(-10);
                  }
                } catch (error) {
                  // Event buffer not available - continue without replay
                  console.warn('Event buffer not available for replay:', error);
                }
              }
               
              // Send authentication success with game state and buffered events
              ws.send(JSON.stringify({
                type: 'authenticated',
                data: {
                  userId: decoded.id,
                  expiresIn: decoded.exp ? decoded.exp - now : 3600,
                  gameState: gameStateForUser,
                  bufferedEvents: bufferedEvents.length > 0 ? bufferedEvents : undefined
                }
              }));
              
              // Send buffered events separately if there are many
              if (bufferedEvents.length > 10) {
                bufferedEvents.forEach(event => {
                  ws.send(JSON.stringify({
                    type: 'buffered_event',
                    data: event
                  }));
                });
              }
              
              console.log(`✅ WebSocket authenticated: ${decoded.id} (${decoded.role || 'player'})${bufferedEvents.length > 0 ? ` - Replayed ${bufferedEvents.length} events` : ''}`);
            } catch (error) {
              console.error('WebSocket authentication error:', error instanceof Error ? error.message : String(error));
              
              // Enhanced error handling with specific codes
              let errorCode = 1000; // Default close code
              let errorMessage = 'Authentication failed';
              let clientMessage = 'Authentication failed';
              const errorMsg = error instanceof Error ? error.message : String(error);
              
              if (errorMsg.includes('expired')) {
                errorCode = 4008; // Policy violation - token expired
                errorMessage = 'Token expired';
                clientMessage = 'Your session has expired. Please log in again.';
              } else if (errorMsg.includes('not found')) {
                errorCode = 4004; // Not found
                errorMessage = 'User not found';
                clientMessage = 'User account not found. Please register.';
              } else if (errorMsg.includes('suspended')) {
                errorCode = 4003; // Forbidden
                errorMessage = 'Account suspended';
                clientMessage = 'Your account has been suspended. Please contact support.';
              } else if (errorMsg.includes('inactive')) {
                errorCode = 4003; // Forbidden
                errorMessage = 'Account inactive';
                clientMessage = 'Your account is inactive. Please contact support.';
              }
              
              ws.send(JSON.stringify({
                type: 'auth_error',
                data: {
                  message: clientMessage,
                  code: errorMessage.replace(/\s+/g, '_').toUpperCase()
                }
              }));
              ws.close(errorCode, errorMessage);
            }
            break;
          }
          
          case 'token_refresh': {
            // Handle token refresh for WebSocket connections
            if (!client || !isAuthenticated) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Authentication required for token refresh' }
              }));
              return;
            }
            
            const { refreshToken } = (message as any).data;
            
            if (!refreshToken) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Refresh token required' }
              }));
              return;
            }
            
            try {
              // Verify refresh token
              const { verifyToken, generateTokens } = await import('./auth');
              const decoded = verifyToken(refreshToken);
              
              // Ensure this is a refresh token
              if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type for refresh');
              }
              
              // Get user information
              const user = await storage.getUser(decoded.id);
              if (!user || user.status !== 'active') {
                throw new Error('User not found or inactive');
              }
              
              // Generate new tokens
              const newTokens = generateTokens({
                id: user.id,
                phone: user.phone,
                role: user.role || 'player'
              });
              
              // Update client token expiry
              const now = Math.floor(Date.now() / 1000);
              const tokenExpiryTime = now + 3600; // Default 1 hour
              client.tokenExpiry = tokenExpiryTime;
              client.lastActivity = Date.now();
              
              ws.send(JSON.stringify({
                type: 'token_refreshed',
                data: {
                  token: newTokens.accessToken,
                  refreshToken: newTokens.refreshToken,
                  expiresIn: tokenExpiryTime - now
                }
              }));
              
              console.log(`✅ WebSocket token refreshed: ${client.userId}`);
            } catch (error) {
              console.error('WebSocket token refresh error:', error instanceof Error ? error.message : String(error));
              ws.send(JSON.stringify({
                type: 'token_refresh_error',
                data: {
                  message: 'Token refresh failed',
                  code: 'REFRESH_FAILED'
                }
              }));
            }
            break;
          }
          
          case 'activity_ping': {
            // Handle client activity ping to keep connection alive and detect stale connections
            if (!client || !isAuthenticated) {
              return;
            }
            
            const now = Date.now();
            client.lastActivity = now;
            
            // Check if connection is stale (no activity for 5 minutes)
            const timeSinceLastActivity = now - (client.lastActivity || client.authenticatedAt || now);
            if (timeSinceLastActivity > 300000) { // 5 minutes
              console.warn(`⚠️ Stale connection detected for ${client.userId} - last activity: ${timeSinceLastActivity}ms ago`);
            }
            
            ws.send(JSON.stringify({
              type: 'activity_pong',
              data: {
                timestamp: now,
                tokenExpiry: client.tokenExpiry,
                serverTime: now
              }
            }));
            break;
          }
          
          // FIXED: WebRTC Signaling - Handle unified 'webrtc:signal' messages from client
          case 'webrtc:signal': {
            if (!client || !isAuthenticated || !webrtcClientId) {
              console.log('⚠️ WebRTC signal received but client not properly initialized');
              return;
            }
            
            const signalData = (message as any).data;
            console.log(`📡 WebRTC signal from ${client.role} ${client.userId}:`, signalData.type);
            
            // Route based on the nested signal type
            switch (signalData.type) {
              case 'stream-start':
                console.log('🎬 Stream start signal from admin');
                webrtcSignaling.handleMessage(webrtcClientId, {
                  type: 'stream-start',
                  from: webrtcClientId,
                  streamId: signalData.streamId || `stream-${Date.now()}`
                });
                break;
                
              case 'stream-stop':
                console.log('🛑 Stream stop signal from admin');
                webrtcSignaling.handleMessage(webrtcClientId, {
                  type: 'stream-stop',
                  from: webrtcClientId,
                  streamId: signalData.streamId
                });
                break;
                
              case 'stream-pause':
                console.log('⏸️ Stream pause signal from admin');
                // Broadcast pause status to all players
                clients.forEach((targetClient: WSClient) => {
                  if (targetClient.role === 'player' && targetClient.ws.readyState === WebSocket.OPEN) {
                    targetClient.ws.send(JSON.stringify({
                      type: 'webrtc:signal',
                      data: {
                        type: 'stream-pause',
                        from: client!.userId
                      }
                    }));
                  }
                });
                break;
                
              case 'stream-resume':
                console.log('▶️ Stream resume signal from admin');
                // Broadcast resume status to all players
                clients.forEach((targetClient: WSClient) => {
                  if (targetClient.role === 'player' && targetClient.ws.readyState === WebSocket.OPEN) {
                    targetClient.ws.send(JSON.stringify({
                      type: 'webrtc:signal',
                      data: {
                        type: 'stream-resume',
                        from: client!.userId
                      }
                    }));
                  }
                });
                break;
                
              case 'offer':
                console.log('📤 WebRTC offer from admin');
                if (client.role === 'admin') {
                  webrtcSignaling.handleMessage(webrtcClientId, {
                    type: 'offer',
                    from: webrtcClientId,
                    sdp: signalData.sdp,
                    streamId: signalData.streamId
                  });
                }
                break;
                
              case 'answer':
                console.log('📥 WebRTC answer from player');
                if (client.role === 'player') {
                  webrtcSignaling.handleMessage(webrtcClientId, {
                    type: 'answer',
                    from: webrtcClientId,
                    to: signalData.to || undefined,
                    sdp: signalData.sdp
                  });
                }
                break;
                
              case 'ice-candidate':
                console.log('🧊 ICE candidate');
                webrtcSignaling.handleMessage(webrtcClientId, {
                  type: 'ice-candidate',
                  from: webrtcClientId,
                  to: signalData.to || undefined,
                  candidate: signalData.candidate
                });
                break;
                
              default:
                console.warn('⚠️ Unknown WebRTC signal type:', signalData.type);
            }
            break;
          }

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
            
          // Handle bet placement using game handler
          case 'place_bet': {
            if (!client || !isAuthenticated) {
              sendError(ws, 'Authentication required to place bets');
              return;
            }

            try {
              await handlePlayerBet(client, (message as any).data);
            } catch (error: any) {
              console.error('Bet handler error:', error);
              sendError(ws, error.message || 'Failed to place bet');
            }
            break;
          }

          // Handle admin game start
          case 'start_game': {
            // Remove authentication check for testing
            if (!client) {
              sendError(ws, 'Client not initialized');
              break;
            }
            try {
              await handleStartGame(client, (message as any).data);
            } catch (error: any) {
              console.error('Start game handler error:', error);
              sendError(ws, error.message || 'Failed to start game');
            }
            break;
          }

          // Handle admin-initiated game reset
          case 'game_reset': {
            if (!client) {
              sendError(ws, 'Client not initialized');
              break;
            }
            try {
              // Only allow admin to reset game
              if (client.role !== 'admin') {
                sendError(ws, 'Unauthorized: Only admins can reset game');
                break;
              }

              // Reset server-side game state
              if ((global as any).currentGameState?.reset) {
                (global as any).currentGameState.reset();
              } else {
                // Fallback to manual reset if reset() not available
                (global as any).currentGameState.phase = 'idle';
                (global as any).currentGameState.currentRound = 1;
                (global as any).currentGameState.openingCard = null;
                (global as any).currentGameState.clearCards?.();
                (global as any).currentGameState.winner = null;
                (global as any).currentGameState.winningCard = null;
                (global as any).currentGameState.round1Bets = { andar: 0, bahar: 0 };
                (global as any).currentGameState.round2Bets = { andar: 0, bahar: 0 };
                (global as any).currentGameState.userBets?.clear?.();
                (global as any).currentGameState.bettingLocked = false;
                (global as any).currentGameState.timer = 0;
              }

              // Broadcast reset to all clients
              broadcast({
                type: 'game_reset',
                data: {
                  message: (message as any).data?.message || '🔄 Game reset. Ready for new game!',
                  gameState: {
                    gameId: (global as any).currentGameState?.gameId,
                    phase: 'idle',
                    currentRound: 1,
                    timer: 0,
                    openingCard: null,
                    andarCards: [],
                    baharCards: [],
                    winner: null,
                    winningCard: null,
                  },
                },
              });

              ws.send(JSON.stringify({
                type: 'game_reset_ack',
                data: { ok: true }
              }));
            } catch (error: any) {
              console.error('Game reset handler error:', error);
              sendError(ws, error.message || 'Failed to reset game');
            }
            break;
          }

          // Handle admin card dealing
          case 'deal_card': {
            // Remove authentication check for testing
            if (!client) {
              sendError(ws, 'Client not initialized');
              break;
            }
            try {
              await handleDealCard(client, (message as any).data);
            } catch (error: any) {
              console.error('Deal card handler error:', error);
              sendError(ws, error.message || 'Failed to deal card');
            }
            break;
          }

          // Handle game subscription for current state
          case 'game_subscribe': {
            if (!client || !isAuthenticated) {
              sendError(ws, 'Authentication required to subscribe to game');
              return;
            }

            try {
              await handleGameSubscribe(client, (message as any).data);
            } catch (error: any) {
              console.error('Game subscribe handler error:', error);
              sendError(ws, error.message || 'Failed to subscribe to game');
            }
            break;
          }

          // Handle stream viewer join
          case 'stream_viewer_join': {
            if (!client || !isAuthenticated) {
              sendError(ws, 'Authentication required to join stream');
              return;
            }

            const { roomId } = (message as any).data;
            console.log(`[STREAM] Player ${client.userId} joining room ${roomId}`);
            
            // Handle through WebRTC signaling server
            if (webrtcClientId) {
              webrtcSignaling.handleStreamViewerJoin(webrtcClientId, roomId);
            }
            break;
          }

          // Handle new WebRTC message types
          case 'request_stream': {
            if (!client || !isAuthenticated) {
              sendError(ws, 'Authentication required to request stream');
              return;
            }

            const { roomId } = (message as any).data;
            console.log(`[STREAM] Player ${client.userId} requesting stream for room ${roomId}`);
            
            const activeStreams = webrtcSignaling.getActiveStreams();
            if (activeStreams.length > 0) {
              const streamInfo = activeStreams[0];
              
              // Get stored offer if available
              const storedOffer = webrtcSignaling.getStoredOffer(streamInfo.streamId);
              
              if (storedOffer) {
                // Send offer directly so player can create answer immediately
                ws.send(JSON.stringify({
                  type: 'webrtc:signal',
                  data: {
                    type: 'offer',
                    from: streamInfo.adminUserId,
                    streamId: streamInfo.streamId,
                    sdp: storedOffer
                  }
                }));
                console.log(`[STREAM] ✅ Sent stored offer to player ${client.userId}`);
              } else {
                // Fallback: send stream-start notification
                ws.send(JSON.stringify({
                  type: 'webrtc:signal',
                  data: {
                    type: 'stream-start',
                    from: streamInfo.adminUserId,
                    streamId: streamInfo.streamId
                  }
                }));
                console.log(`[STREAM] ⚠️ No stored offer available, sent stream-start to ${client.userId}`);
              }
            } else {
              console.log(`[STREAM] No active streams for player ${client.userId}`);
            }
            break;
          }

          case 'webrtc_offer': {
            if (!client || !isAuthenticated || !webrtcClientId) {
              console.log('⚠️ WebRTC offer received but client not properly initialized');
              return;
            }

            const offerData = (message as any).data;
            console.log(`📡 WebRTC offer from ${client.role} ${client.userId}`);
            
            if (client.role === 'admin') {
              webrtcSignaling.handleMessage(webrtcClientId, {
                type: 'offer',
                from: webrtcClientId,
                sdp: offerData.offer,
                streamId: offerData.streamId,
                roomId: offerData.roomId
              });
            }
            break;
          }

          case 'webrtc_answer': {
            if (!client || !isAuthenticated || !webrtcClientId) {
              console.log('⚠️ WebRTC answer received but client not properly initialized');
              return;
            }

            const answerData = (message as any).data;
            console.log(`📡 WebRTC answer from ${client.role} ${client.userId}`);
            
            if (client.role === 'player') {
              webrtcSignaling.handleMessage(webrtcClientId, {
                type: 'answer',
                from: webrtcClientId,
                sdp: answerData.answer,
                roomId: answerData.roomId
              });
            }
            break;
          }

          case 'webrtc_ice_candidate': {
            if (!client || !isAuthenticated || !webrtcClientId) {
              console.log('⚠️ WebRTC ICE candidate received but client not properly initialized');
              return;
            }

            const candidateData = (message as any).data;
            console.log(`🧊 WebRTC ICE candidate from ${client.role} ${client.userId}`);
            
            webrtcSignaling.handleMessage(webrtcClientId, {
              type: 'ice-candidate',
              from: webrtcClientId,
              candidate: candidateData.candidate,
              roomId: candidateData.roomId
            });
            break;
          }

          // Handle stream viewer leave
          case 'stream_viewer_leave': {
            if (!client || !isAuthenticated) {
              return; // No error needed for leave
            }

            const { roomId } = (message as any).data;
            console.log(`[STREAM] Player ${client.userId} leaving room ${roomId}`);
            
            // Handle through WebRTC signaling server
            if (webrtcClientId) {
              webrtcSignaling.handleStreamViewerLeave(webrtcClientId, roomId);
            }
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Failed to process message' }
          }));
        }
      }
    });
    
    // Activity monitoring for authenticated clients
    const activityInterval = setInterval(() => {
      const now = Date.now();
      const activityThreshold = 5 * 60 * 1000; // 5 minutes
      const tokenExpiryThreshold = 2 * 60 * 1000; // 2 minutes before expiry
      
      clients.forEach(client => {
        if (!client.authenticatedAt || !client.lastActivity || !client.tokenExpiry) {
          return; // Skip clients that haven't completed authentication
        }
        
        const tokenExpiryTime = client.tokenExpiry * 1000; // Convert to milliseconds
        const timeSinceLastActivity = now - client.lastActivity;
        const timeUntilTokenExpiry = tokenExpiryTime - now;
        
        // Check if token is about to expire
        if (timeUntilTokenExpiry <= tokenExpiryThreshold && timeUntilTokenExpiry > 0) {
          client.ws.send(JSON.stringify({
            type: 'token_expiry_warning',
            data: {
              expiresIn: Math.floor(timeUntilTokenExpiry / 1000),
              message: 'Your session will expire soon. Please refresh your token.'
            }
          }));
        }
        
        // Check if token has expired
        if (timeUntilTokenExpiry <= 0) {
          client.ws.send(JSON.stringify({
            type: 'token_expired',
            data: {
              message: 'Your session has expired. Please log in again.'
            }
          }));
          client.ws.close(4008, 'Token expired');
          return;
        }
        
        // Check for inactivity
        if (timeSinceLastActivity > activityThreshold) {
          client.ws.send(JSON.stringify({
            type: 'inactivity_warning',
            data: {
              inactiveFor: Math.floor(timeSinceLastActivity / 1000),
              message: 'You have been inactive for a while. Your session may be terminated.'
            }
          }));
        }
      });
    }, 60000); // Check every minute
    
    // Handle connection close
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      // Cleanup activity monitor
      try { clearInterval(activityInterval); } catch {}
      if (client && clients.has(client)) {
        clients.delete(client);
        console.log(`Client ${client.userId} removed. Active clients: ${clients.size}`);
      }
      
      // Unregister from WebRTC signaling server
      if (webrtcClientId) {
        webrtcSignaling.unregisterClient(webrtcClientId);
        console.log(`[WebRTC] Client unregistered from signaling: ${webrtcClientId}`);
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
      '/api/stream/config'
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
      if (cleanPath.startsWith(publicPath)) {
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
          token: result.user?.token, // Ensure token is returned
          refreshToken: result.user?.refreshToken // Include refresh token
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
          token: result.user.token, // Ensure token is returned
          refreshToken: result.user.refreshToken // Include refresh token
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

  app.post("/api/game-settings", async (req, res) => {
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
      
      // Send WebSocket notification to admins for real-time alerts
      try {
        broadcastToRole({
          type: 'admin_notification',
          event: 'payment_request_created',
          data: {
            request: {
              id: result.id,
              userId: req.user.id,
              requestType: requestType,
              request_type: requestType, // Also include snake_case for compatibility
              amount: numAmount,
              status: 'pending',
              paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : JSON.stringify(paymentMethod),
              createdAt: result.created_at || new Date().toISOString()
            }
          },
          timestamp: new Date().toISOString()
        }, 'admin');
        console.log(`📢 Admin notification sent for new ${requestType} request: ₹${numAmount}`);
      } catch (notificationError) {
        console.error('Failed to send admin notification (non-critical):', notificationError);
        // Don't fail the request if notification fails
      }
      
      // WhatsApp notification handled by admin-requests-supabase API
      // Request is created via AdminRequestsSupabaseAPI which handles notifications
      
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
  app.get("/api/admin/payment-requests/pending", apiLimiter, async (req, res) => {
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
  app.patch("/api/admin/payment-requests/:id/approve", apiLimiter, async (req, res) => {
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
      
      // OPTIMIZED: Use atomic RPC function for deposit approval
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      let approvalResult;
      try {
        if (request.request_type === 'deposit') {
          // Use atomic function for deposits (includes bonus in single transaction)
          approvalResult = await storage.approvePaymentRequestAtomic(
            id,
            request.user_id,
            request.amount,
            req.user.id
          );
          
          // Check if bonus threshold reached for auto-credit (if applicable)
          try {
            const { checkAndAutoCreditBonus } = await import('./payment');
            const autoCredited = await checkAndAutoCreditBonus(request.user_id);
            if (autoCredited) {
              console.log(`✅ Bonus auto-credited for user ${request.user_id} after deposit approval (threshold reached)`);
              // Notify user about auto-credit
              clients.forEach(c => {
                if (c.userId === request.user_id && c.ws.readyState === WebSocket.OPEN) {
                  c.ws.send(JSON.stringify({
                    type: 'bonus_update',
                    data: {
                      message: 'Bonus automatically credited to your balance!',
                      timestamp: Date.now()
                    }
                  }));
                }
              });
            }
          } catch (bonusError) {
            console.error(`⚠️ Error checking bonus threshold after deposit:`, bonusError);
            // Don't fail approval if bonus check fails
          }
        } else {
          // For withdrawals, use regular approval (no bonus)
          await storage.approvePaymentRequest(id, request.user_id, request.amount, req.user.id);
          const updatedUser = await storage.getUser(request.user_id);
          approvalResult = {
            balance: updatedUser ? parseFloat(updatedUser.balance) : 0,
            bonusAmount: 0,
            wageringRequirement: 0
          };
        }
      } catch (approvalError: any) {
        console.error('Payment request approval error:', approvalError);
        throw approvalError;
      }
      
      // Send WebSocket notifications IMMEDIATELY (optimistic - already updated in DB via atomic function)
      const newBalance = approvalResult.balance;
      try {
        clients.forEach(client => {
          if (client.userId === request.user_id && client.ws.readyState === WebSocket.OPEN) {
            // Payment notification
            client.ws.send(JSON.stringify({
              type: 'admin_payment_notification',
              data: {
                message: `Your ${request.request_type} request of ₹${request.amount.toLocaleString('en-IN')} has been approved. New balance: ₹${newBalance.toLocaleString('en-IN')}`,
                reason: `Admin approved ${request.request_type}`,
                timestamp: Date.now(),
                requestType: request.request_type,
                amount: request.amount,
                newBalance: newBalance
              }
            }));
            
            // Balance update (optimistic - already updated in DB)
            client.ws.send(JSON.stringify({
              type: 'balance_update',
              data: {
                balance: newBalance,
                amount: request.request_type === 'deposit' ? request.amount : -request.amount,
                type: request.request_type,
                timestamp: Date.now()
              }
            }));
          }
        });
        console.log(`💰 Payment request approved and notification sent: ${request.user_id} -> ₹${request.amount} (${request.request_type})`);
      } catch (notificationError) {
        console.error('Failed to send payment notification:', notificationError);
        // Don't fail the request if notification fails
      }
      
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
        message: 'Payment request approved successfully',
        data: {
          newBalance,
          bonusAmount: approvalResult.bonusAmount,
          wageringRequirement: approvalResult.wageringRequirement
        }
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
  app.patch("/api/admin/payment-requests/:id/reject", apiLimiter, async (req, res) => {
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
  
  app.put("/api/admin/content", generalLimiter, async (req, res) => {
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
  
  app.get("/api/admin/settings", generalLimiter, async (req, res) => {
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
  
  app.put("/api/admin/settings", generalLimiter, async (req, res) => {
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
      // Pull recent transactions to compute deposits/withdrawals totals
      const { transactions: recentTxns } = await storage.getUserTransactions(userId, {
        limit: 1000,
        offset: 0,
        type: 'all'
      });
      const totalDeposits = recentTxns
        .filter(t => t.transaction_type === 'deposit')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalWithdrawals = recentTxns
        .filter(t => t.transaction_type === 'withdrawal')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
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

  // User Transactions Route (DB-backed)
  app.get("/api/user/transactions", generalLimiter, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      const userId = req.user.id;
      const { limit = 20, offset = 0, type = 'all' } = req.query as any;

      const { transactions, total } = await storage.getUserTransactions(userId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        type: (type as string) || 'all'
      });

      // Map DB shape to client shape
      const mapped = transactions.map(t => ({
        id: t.id,
        type: t.transaction_type,
        amount: t.amount,
        status: 'completed',
        description: t.description || '',
        createdAt: new Date(t.created_at)
      }));

      res.json({
        success: true,
        data: {
          transactions: mapped,
          total,
          hasMore: (parseInt(offset as string) + parseInt(limit as string)) < total
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
      
      // Get user's game history with bet details (already grouped by game)
      const gameHistory = await storage.getUserGameHistory(userId);

      // Transform to match expected format, using the already grouped data
      const enhancedGameHistory = gameHistory?.map(game => {
        return {
          id: game.id,
          gameId: game.gameId,
          openingCard: game.openingCard,
          winner: game.winner,
          winningCard: game.winningCard,
          // Use yourBet from getUserGameHistory (null if multiple bets, otherwise single bet)
          yourBet: game.yourBet || (game.yourBets && game.yourBets.length > 0 ? {
            side: game.yourBets[0].side,
            amount: game.yourTotalBet || game.yourBets[0].amount,
            round: game.yourBets[0].round
          } : null),
          // Include all bets for reference
          yourBets: game.yourBets || [],
          yourTotalBet: game.yourTotalBet || 0,
          yourTotalPayout: game.yourTotalPayout || game.payout || 0,
          yourNetProfit: game.yourNetProfit || 0,
          result: game.result || 'no_bet',
          payout: game.payout || game.yourTotalPayout || 0,
          totalCards: game.totalCards,
          round: game.round || game.winningRound || 1,
          dealtCards: game.dealtCards || [],
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
  app.get("/api/admin/users", generalLimiter, async (req, res) => {
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
  
  app.get("/api/admin/users/:userId", generalLimiter, async (req, res) => {
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
  
  app.patch("/api/admin/users/:userId/status", generalLimiter, async (req, res) => {
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
  
  app.patch("/api/admin/users/:userId/balance", generalLimiter, async (req, res) => {
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
      
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a valid number'
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
      
      // 🔒 CRITICAL: ONLY ADMINS CAN PROCESS DIRECT PAYMENTS NOW
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only admins can process direct payments'
        });
      }
      
      // For admin direct processing, use the balance update endpoint instead
      const result = await updateUserBalance(userId, numAmount, req.user!.id, reason, type);
      
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
  
  app.get("/api/admin/statistics", generalLimiter, async (req, res) => {
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
  
  app.get("/api/admin/users/:userId/referrals", generalLimiter, async (req, res) => {
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
  
  app.post("/api/admin/users/bulk-status", generalLimiter, async (req, res) => {
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
  
  app.get("/api/admin/users/export", generalLimiter, async (req, res) => {
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
  app.post("/api/admin/users/create", generalLimiter, async (req, res) => {
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
  app.post("/api/admin/payment-requests/create", generalLimiter, async (req, res) => {
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
  // WhatsApp Integration Endpoints - Moved to admin-requests-supabase.ts
  // These endpoints are now handled by AdminRequestsSupabaseAPI mounted at /api/admin
  // See admin-requests-supabase.ts for the new implementation

  // Admin Bonus Management Endpoints
  app.get("/api/admin/bonus-analytics", generalLimiter, async (req, res) => {
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

  app.get("/api/admin/referral-analytics", generalLimiter, async (req, res) => {
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

  app.post("/api/admin/apply-bonus", generalLimiter, async (req, res) => {
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

  app.get("/api/admin/bonus-settings", generalLimiter, async (req, res) => {
    try {
      // Get bonus-related game settings
      const settings = await storage.getGameSettings();
      
      const bonusSettings = {
        depositBonusPercent: settings.default_deposit_bonus_percent || '5',
        referralBonusPercent: settings.referral_bonus_percent || '1',
        conditionalBonusThreshold: settings.conditional_bonus_threshold || '30',
        bonusClaimThreshold: (settings as any).bonus_claim_threshold || '500'
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

  app.put("/api/admin/bonus-settings", generalLimiter, async (req, res) => {
    try {
      const { depositBonusPercent, referralBonusPercent, conditionalBonusThreshold, bonusClaimThreshold } = req.body;
      
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
      if (bonusClaimThreshold !== undefined) {
        updates.bonus_claim_threshold = bonusClaimThreshold.toString();
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

  // Get All Bonus Transactions Endpoint
  app.get("/api/admin/bonus-transactions", generalLimiter, async (req, res) => {
    try {
      const { status, type, limit = 100, offset = 0 } = req.query;
      
      // Get all bonus transactions using storage method
      const transactions = await storage.getAllBonusTransactions({
        status: status as string,
        type: type as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: transactions,
        total: transactions.length
      });
    } catch (error) {
      console.error('Get bonus transactions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bonus transactions'
      });
    }
  });

  // Get All Referral Data Endpoint
  app.get("/api/admin/referral-data", generalLimiter, async (req, res) => {
    try {
      const { status, limit = 100, offset = 0 } = req.query;
      
      // Get all referral data using storage method
      const referralData = await storage.getAllReferralData({
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: referralData,
        total: referralData.length
      });
    } catch (error) {
      console.error('Get referral data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve referral data'
      });
    }
  });

  // Get Player Bonus Analytics Endpoint - Per-player bonus analytics
  app.get("/api/admin/player-bonus-analytics", generalLimiter, async (req, res) => {
    try {
      const { userId, limit = 1000, offset = 0 } = req.query;
      
      // Get player bonus analytics from storage
      const playerAnalytics = await storage.getPlayerBonusAnalytics({
        userId: userId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: playerAnalytics,
        total: playerAnalytics.length
      });
    } catch (error) {
      console.error('Get player bonus analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve player bonus analytics'
      });
    }
  });

  // Game Settings Endpoints
  app.get("/api/admin/game-settings", generalLimiter, async (req, res) => {
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

  app.put("/api/admin/game-settings", generalLimiter, async (req, res) => {
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
  app.get("/api/admin/games/:gameId/bets", generalLimiter, async (req, res) => {
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

  // Get all active/recent bets endpoint (for bet monitoring)
  app.get("/api/admin/bets/all", generalLimiter, async (req, res) => {
    try {
      const { limit = 100, status, gameId } = req.query;
      
      // If gameId is provided, get bets for that game
      if (gameId) {
        const bets = await storage.getBetsForGame(gameId as string);
        
        // Join with user details
        const betsWithUserDetails = await Promise.all(bets.map(async (bet) => {
          const user = await storage.getUser(bet.userId);
          return {
            id: bet.id,
            userId: bet.userId,
            userPhone: user?.phone,
            userName: user?.full_name,
            gameId: bet.gameId,
            round: bet.round,
            side: bet.side,
            amount: parseFloat(bet.amount),
            status: bet.status,
            createdAt: bet.createdAt
          };
        }));
        
        // Filter by status if provided
        const filteredBets = status 
          ? betsWithUserDetails.filter(b => b.status === status)
          : betsWithUserDetails;
        
        // Limit results
        const limitedBets = filteredBets.slice(0, parseInt(limit as string));
        
        return res.json({ success: true, data: limitedBets });
      }
      
      // Get all active/recent bets from current game if available
      if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
        const bets = await storage.getBetsForGame(currentGameState.gameId);
        
        // Join with user details
        const betsWithUserDetails = await Promise.all(bets.map(async (bet) => {
          const user = await storage.getUser(bet.userId);
          return {
            id: bet.id,
            userId: bet.userId,
            userPhone: user?.phone,
            userName: user?.full_name,
            gameId: bet.gameId,
            round: bet.round,
            side: bet.side,
            amount: parseFloat(bet.amount),
            status: bet.status,
            createdAt: bet.createdAt
          };
        }));
        
        // Filter by status if provided
        const filteredBets = status 
          ? betsWithUserDetails.filter(b => b.status === status)
          : betsWithUserDetails;
        
        // Sort by created_at descending (most recent first)
        filteredBets.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        
        // Limit results
        const limitedBets = filteredBets.slice(0, parseInt(limit as string));
        
        return res.json({ success: true, data: limitedBets });
      }
      
      // If no current game, get recent bets from Supabase directly
      const { supabaseServer } = await import('./lib/supabaseServer');
      let query = supabaseServer
        .from('player_bets')
        .select(`
          *,
          user:users(phone, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit as string));
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data: bets, error } = await query;
      
      if (error) {
        throw error;
      }
      
      const betsWithUserDetails = (bets || []).map((bet: any) => ({
        id: bet.id,
        userId: bet.user_id,
        userPhone: bet.user?.phone,
        userName: bet.user?.full_name,
        gameId: bet.game_id,
        round: bet.round,
        side: bet.side,
        amount: parseFloat(bet.amount),
        status: bet.status,
        createdAt: bet.created_at
      }));
      
      res.json({ success: true, data: betsWithUserDetails });
    } catch (error) {
      console.error('Get all bets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get all bets'
      });
    }
  });

  app.patch("/api/admin/bets/:betId", generalLimiter, async (req, res) => {
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

  // Player-facing undo last bet endpoint
  app.delete("/api/user/undo-last-bet", generalLimiter, async (req, res) => {
    try {
      // Require authentication
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.id;
      
      // Get current game session
      const currentGame = await storage.getCurrentGameSession();
      if (!currentGame) {
        return res.status(404).json({
          success: false,
          error: 'No active game session found'
        });
      }

      // 🔒 SECURITY: Only allow bet cancellation during betting phase
      if (currentGame.phase !== 'betting') {
        return res.status(400).json({
          success: false,
          error: `Cannot undo bets after betting phase. Current phase: ${currentGame.phase}`
        });
      }

      // Get user's bets for current game
      const userBets = await storage.getBetsForUser(userId, currentGame.game_id);
      
      // Filter active bets (not cancelled)
      const activeBets = userBets.filter(bet => bet.status !== 'cancelled');
      
      if (activeBets.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No active bets found to undo'
        });
      }

      // Find the most recent bet (sort by created_at descending)
      activeBets.sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });

      const lastBet = activeBets[0];
      const betId = lastBet.id;
      const betAmount = parseFloat(lastBet.amount);

      // Refund the bet amount to user's balance
      const newBalance = await storage.addBalanceAtomic(userId, betAmount);

      // Update bet status to cancelled in database
      await storage.updateBetDetails(betId, {
        status: 'cancelled'
      });

      // Update the current game state in memory
      if (currentGameState.userBets.has(userId)) {
        const userBetsState = currentGameState.userBets.get(userId)!;
        const side = lastBet.side as 'andar' | 'bahar';
        const round = parseInt(lastBet.round);
        
        if (round === 1) {
          userBetsState.round1[side] -= betAmount;
          currentGameState.round1Bets[side] -= betAmount;
        } else {
          userBetsState.round2[side] -= betAmount;
          currentGameState.round2Bets[side] -= betAmount;
        }
      }

      // Broadcast cancellation to all clients
      broadcast({
        type: 'bet_cancelled',
        data: {
          betId,
          userId,
          side: lastBet.side,
          amount: betAmount,
          round: lastBet.round,
          cancelledBy: userId, // Player cancelled their own bet
          newBalance: newBalance // Include new balance after refund
        }
      });

      res.json({
        success: true,
        message: 'Bet undone successfully. Amount refunded to your balance.',
        data: {
          betId,
          refundedAmount: betAmount,
          newBalance,
          side: lastBet.side,
          round: lastBet.round
        }
      });
    } catch (error) {
      console.error('Undo bet error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to undo bet'
      });
    }
  });

  // Delete/Cancel bet endpoint (Admin only)
  app.delete("/api/admin/bets/:betId", generalLimiter, async (req, res) => {
    try {
      const { betId } = req.params;
      
      // Get current bet to find user info
      const currentBet = await storage.getBetById(betId);
      if (!currentBet) {
        return res.status(404).json({
          success: false,
          error: 'Bet not found'
        });
      }
      
      // 🔒 SECURITY: Only allow bet cancellation during betting phase
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
          error: `Cannot cancel bets after betting phase. Current phase: ${game.phase}`
        });
      }
      
      const userId = currentBet.userId;
      const betAmount = parseFloat(currentBet.amount);
      
      // Refund the bet amount to user's balance
      await storage.addBalanceAtomic(userId, betAmount);
      
      // Update bet status to cancelled in database
      await storage.updateBetDetails(betId, {
        status: 'cancelled'
      });
      
      // Update the current game state in memory
      if (currentGameState.userBets.has(userId)) {
        const userBets = currentGameState.userBets.get(userId)!;
        const side = currentBet.side as 'andar' | 'bahar';
        const round = parseInt(currentBet.round);
        
        if (round === 1) {
          userBets.round1[side] -= betAmount;
          currentGameState.round1Bets[side] -= betAmount;
        } else {
          userBets.round2[side] -= betAmount;
          currentGameState.round2Bets[side] -= betAmount;
        }
      }
      
      // Broadcast cancellation to all clients
      broadcast({
        type: 'bet_cancelled',
        data: {
          betId,
          userId,
          side: currentBet.side,
          amount: betAmount,
          round: currentBet.round,
          cancelledBy: req.user!.id
        }
      });
      
      // Get updated user balance for response
      const user = await storage.getUser(userId);
      const newBalance = parseFloat(user?.balance as string) || 0;
      
      res.json({
        success: true,
        message: 'Bet cancelled successfully. Amount refunded to user.',
        data: {
          betId,
          userId,
          refundedAmount: betAmount,
          newBalance
        }
      });
    } catch (error) {
      console.error('Cancel bet error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel bet'
      });
    }
  });

  // Add search endpoint by phone number
  app.get("/api/admin/search-bets", generalLimiter, async (req, res) => {
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
      const { limit = 50 } = req.query;
      const limitNum = parseInt(limit as string) || 50;
      const history = await storage.getGameHistory(limitNum);
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
      console.log(`Balance endpoint - Fetching balance for user: ${userId} (role: ${req.user.role})`);

      // Handle admin users differently - they don't have game balance
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        console.log(`Balance endpoint - Admin user ${userId} requested balance, returning 0`);
        return res.json({
          success: true,
          balance: 0,
          message: 'Admin users do not have game balance'
        });
      }

      // Lookup user in database for regular users
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
  app.get("/api/admin/analytics", generalLimiter, async (req, res) => {
    try {
      const { period = 'daily', month, year } = req.query;
      
      if (period === 'daily') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const stats = await storage.getDailyStats(today);
        res.json({ success: true, data: stats });
      } else if (period === 'monthly') {
        const monthYear = month ? month as string : new Date().toISOString().slice(0, 7); // YYYY-MM
        const stats = await storage.getMonthlyStats(monthYear);
        res.json({ success: true, data: stats });
      } else if (period === 'yearly') {
        const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
        const stats = await storage.getYearlyStats(yearNum);
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
  app.get("/api/admin/realtime-stats", generalLimiter, async (req, res) => {
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
  app.get("/api/admin/game-history", generalLimiter, async (req, res) => {
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
      
      // Import supabaseServer
      const { supabaseServer } = await import('./lib/supabaseServer');
      
      // Get game history with card information (from game_history table)
      const { data: historyData, error: historyError } = await supabaseServer
        .from('game_history')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (historyError) {
        console.error('Error getting game history:', historyError);
        return res.status(500).json({ success: false, error: 'Failed to retrieve game history' });
      }
      
      if (!historyData || historyData.length === 0) {
        return res.json({
          success: true,
          data: {
            games: [],
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total: 0,
              pages: 0
            }
          }
        });
      }
      
      // Get game statistics for each game to combine the data
      const gameIds = historyData.map((h: any) => h.game_id);
      const { data: statsData, error: statsError } = await supabaseServer
        .from('game_statistics')
        .select('*')
        .in('game_id', gameIds);
      
      if (statsError) {
        console.error('Error getting game statistics:', statsError);
      }
      
      // Get dealt cards for all games (CRITICAL: Include all cards dealt in each game)
      const { data: cardsData, error: cardsError } = await supabaseServer
        .from('dealt_cards')
        .select('*')
        .in('game_id', gameIds)
        .order('position', { ascending: true });
      
      if (cardsError) {
        console.error('Error getting dealt cards for admin history:', cardsError);
      }
      
      // Create a map of game_id to statistics
      const statsMap = new Map();
      if (statsData) {
        statsData.forEach((stat: any) => {
          statsMap.set(stat.game_id, stat);
        });
      }
      
      // Create cards map by game_id
      const cardsMap = new Map();
      if (cardsData) {
        cardsData.forEach((card: any) => {
          if (!cardsMap.has(card.game_id)) {
            cardsMap.set(card.game_id, []);
          }
          cardsMap.get(card.game_id).push(card);
        });
      }
      
      // Combine history with statistics and cards - similar to getGameHistory()
      let gameStats = historyData.map((history: any) => {
        const stats = statsMap.get(history.game_id);
        const cards = cardsMap.get(history.game_id) || [];
        
        return {
          id: history.id,
          gameId: history.game_id,
          openingCard: history.opening_card,
          winner: history.winner,
          winningCard: history.winning_card,
          round: history.winning_round || history.round || 1,
          totalCards: history.total_cards || cards.length || 0,
          createdAt: history.created_at,
          // Include dealt cards - ALL CARDS DEALT IN THIS GAME
          dealtCards: cards.map((c: any) => ({
            id: c.id,
            card: c.card,
            side: c.side,
            position: c.position,
            isWinningCard: c.is_winning_card,
            createdAt: c.created_at
          })),
          // Statistics data (with defaults if not available)
          totalPlayers: stats ? (stats.total_players || 0) : 0,
          totalBets: stats ? parseFloat(stats.total_bets || '0') : (parseFloat(history.total_bets || '0') || 0),
          andarBetsCount: stats ? (stats.andar_bets_count || 0) : 0,
          baharBetsCount: stats ? (stats.bahar_bets_count || 0) : 0,
          andarTotalBet: stats ? parseFloat(stats.andar_total_bet || '0') : 0,
          baharTotalBet: stats ? parseFloat(stats.bahar_total_bet || '0') : 0,
          totalWinnings: stats ? parseFloat(stats.total_winnings || '0') : (parseFloat(history.total_payouts || '0') || 0),
          houseEarnings: stats ? parseFloat(stats.house_earnings || '0') : 0,
          profitLoss: stats ? parseFloat(stats.profit_loss || '0') : 0,
          profitLossPercentage: stats ? parseFloat(stats.profit_loss_percentage || '0') : 0,
          housePayout: stats ? parseFloat(stats.house_payout || '0') : (parseFloat(history.total_payouts || '0') || 0),
          gameDuration: stats ? (stats.game_duration || 0) : 0,
          uniquePlayers: stats ? (stats.unique_players || 0) : 0,
        };
      });
      
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
        let aValue: any = (a as any)[sortField];
        let bValue: any = (b as any)[sortField];
        
        // Handle date sorting
        if (sortField === 'created_at' || sortField === 'createdAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        // Handle snake_case to camelCase conversion for sorting
        if (sortField === 'profit_loss') aValue = a.profitLoss;
        if (sortField === 'profit_loss') bValue = b.profitLoss;
        if (sortField === 'total_bets') aValue = a.totalBets;
        if (sortField === 'total_bets') bValue = b.totalBets;
        if (sortField === 'total_players') aValue = a.totalPlayers;
        if (sortField === 'total_players') bValue = b.totalPlayers;
        
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

  // Restore active game state on server startup
  await restoreActiveGameState();
  
  return httpServer;
}
async function transitionToRound2() {
  console.log('Auto-transitioning to Round 2...');
  
  currentGameState.currentRound = 2;
  currentGameState.phase = 'betting';
  currentGameState.bettingLocked = false;
  
  // Persist state change
  await persistGameState();
  
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
    
    // Persist state change
    await persistGameState();
    
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
  
  // Persist state change
  await persistGameState();
  
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
  console.log(`Game complete! Winner: ${winner}, Card: ${currentGameState.winningCard}, Round: ${currentGameState.currentRound}`);
  
  // ✅ CRITICAL FIX: Ensure valid game ID FIRST, before any database operations
  // This fixes the issue where gameId was 'default-game' or invalid, causing operations to be skipped
  if (!currentGameState.gameId || 
      typeof currentGameState.gameId !== 'string' || 
      currentGameState.gameId.trim() === '' ||
      currentGameState.gameId === 'default-game') {
    currentGameState.gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.warn(`⚠️ Game ID was invalid or missing, generated new ID: ${currentGameState.gameId}`);
  }
  
  // ✅ FIX: Ensure opening card exists, use fallback if missing
  if (!currentGameState.openingCard) {
    currentGameState.openingCard = 'UNKNOWN';
    console.warn(`⚠️ Opening card was missing, using fallback: UNKNOWN`);
  }
  
  currentGameState.winner = winner;
  currentGameState.winningCard = winningCard;
  currentGameState.phase = 'complete';
  currentGameState.bettingLocked = true;
  
  if (currentGameState.timerInterval) {
    clearInterval(currentGameState.timerInterval);
    currentGameState.timerInterval = null;
  }
  
  // ✅ CRITICAL FIX: Save game state FIRST before any other operations
  // This ensures the game is marked as complete in the database
  await persistGameState();
  
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
  
  // OPTIMIZATION: Calculate all payouts and send optimistic WebSocket updates FIRST
  const payoutNotifications: Array<{
    userId: string;
    payout: number;
    calculatedBalance: number;
    bets: { round1: { andar: number; bahar: number }, round2: { andar: number; bahar: number } };
    userTotalBet: number;
    userWon: boolean;
  }> = [];
  
  // ✅ FIX #2: Fetch bets from database FIRST to ensure accuracy (prevents race conditions)
  let dbBets: any[] = [];
  if (currentGameState.gameId && currentGameState.gameId !== 'default-game') {
    try {
      dbBets = await storage.getBetsForGame(currentGameState.gameId);
      console.log(`📊 Fetched ${dbBets.length} bets from database for payout calculation`);
    } catch (error) {
      console.error('⚠️ Error fetching bets from DB, using in-memory state:', error);
      // Fallback to in-memory state if DB fetch fails
    }
  }

  // Step 1: Calculate payouts from DB bets (more accurate) or in-memory state (fallback)
  // Use DB bets if available, otherwise fall back to in-memory state
  const userBetsMap = new Map<string, { round1: { andar: number; bahar: number }, round2: { andar: number; bahar: number } }>();
  
  if (dbBets.length > 0) {
    // Process DB bets - group by userId
    for (const bet of dbBets) {
      const userId = bet.user_id || bet.userId;
      if (!userBetsMap.has(userId)) {
        userBetsMap.set(userId, {
          round1: { andar: 0, bahar: 0 },
          round2: { andar: 0, bahar: 0 }
        });
      }
      const userBets = userBetsMap.get(userId)!;
      const round = bet.round === '1' || bet.round === 1 ? 'round1' : 'round2';
      const side = bet.side === 'andar' ? 'andar' : 'bahar';
      userBets[round][side] += parseFloat(bet.amount || '0');
    }
  } else {
    // Fallback to in-memory state
    for (const [userId, bets] of currentGameState.userBets.entries()) {
      userBetsMap.set(userId, bets);
    }
  }

  // Calculate payouts and send optimistic WebSocket updates IMMEDIATELY
  for (const [userId, bets] of userBetsMap.entries()) {
    const payout = calculatePayout(currentGameState.currentRound, winner, bets);
    payouts[userId] = payout;
    totalPayoutsAmount += payout;
    
    const userTotalBet = bets.round1.andar + bets.round1.bahar + bets.round2.andar + bets.round2.bahar;
    const userWon = payout > userTotalBet;
    
    // Get current balance from memory/cache (fast - optimized)
    let currentBalance = 0;
    try {
      currentBalance = await storage.getUserBalance(userId);
    } catch (error) {
      console.error(`Error getting balance for ${userId}:`, error);
      // Fallback: try to get full user object
      try {
        const user = await storage.getUser(userId);
        currentBalance = user ? parseFloat(user.balance) : 0;
      } catch (fallbackError) {
        console.error(`Fallback error getting balance for ${userId}:`, fallbackError);
        currentBalance = 0;
      }
    }
    
    const calculatedBalance = currentBalance + payout;
    
    // Send WebSocket update IMMEDIATELY (optimistic update - before DB commit)
    const client = clients.find(c => c.userId === userId && c.ws.readyState === WebSocket.OPEN);
    if (client) {
      try {
        // Send payout notification with optimistic balance
        client.ws.send(JSON.stringify({
          type: 'payout_received',
          data: {
            amount: payout,
            balance: calculatedBalance, // Optimistic balance
            winner,
            round: currentGameState.currentRound,
            yourBets: bets,
            timestamp: Date.now()
          }
        }));
        
        // Send balance update
        client.ws.send(JSON.stringify({
          type: 'balance_update',
          data: {
            balance: calculatedBalance, // Optimistic balance
            amount: payout,
            type: payout > 0 ? 'win' : 'loss',
            timestamp: Date.now()
          }
        }));
      } catch (wsError) {
        console.error(`Error sending WebSocket update to ${userId}:`, wsError);
      }
    }
    
    // Queue for database update (background)
    payoutNotifications.push({
      userId,
      payout,
      calculatedBalance,
      bets,
      userTotalBet,
      userWon
    });
  }
  
  // ✅ FIX #3: Use database transaction for payout updates (atomic operation)
  // Step 2: Update database using transaction (atomic operation)
  if (currentGameState.gameId && payoutNotifications.length > 0) {
    // Store payout promise so we can wait for it before resetting
    const payoutPromise = (async () => {
      try {
        // Prepare payout data for transaction
        const payoutArray: Array<{ userId: string; amount: number }> = [];
        const winningBets: string[] = [];
        const losingBets: string[] = [];
        
        // Get all bets for this game to update their status
        const allBets = dbBets.length > 0 ? dbBets : await storage.getBetsForGame(currentGameState.gameId);
        
        for (const notification of payoutNotifications) {
          if (notification.payout > 0) {
            payoutArray.push({ userId: notification.userId, amount: notification.payout });
          }
        }
        
        // Group bets by status (winning vs losing)
        for (const bet of allBets) {
          const userId = bet.user_id || bet.userId;
          const notification = payoutNotifications.find(n => n.userId === userId);
          const payout = notification?.payout || 0;
          
          if (bet.side === winner && payout > 0) {
            winningBets.push(bet.id);
          } else {
            losingBets.push(bet.id);
          }
        }
        
        // Use atomic transaction function if available
        if (payoutArray.length > 0 || winningBets.length > 0 || losingBets.length > 0) {
          try {
            await storage.applyPayoutsAndupdateBets(payoutArray, winningBets, losingBets);
            console.log(`✅ Applied payouts for ${payoutArray.length} users via transaction`);
          } catch (transactionError) {
            console.error('⚠️ Transaction failed, falling back to individual updates:', transactionError);
            // Fallback to individual updates
            await Promise.all(
              payoutNotifications.map(async ({ userId, payout, userTotalBet, userWon }) => {
                try {
                  if (payout > 0) {
                    await storage.addBalanceAtomic(userId, payout);
                    await storage.updateBetStatusByGameUser(currentGameState.gameId!, userId, winner, 'won');
                  } else {
                    const loserSide = winner === 'andar' ? 'bahar' : 'andar';
                    await storage.updateBetStatusByGameUser(currentGameState.gameId!, userId, loserSide, 'lost');
                  }
                  await storage.updateUserGameStats(userId, userWon, userTotalBet, payout);
                } catch (error) {
                  console.error(`⚠️ Error updating payout for user ${userId}:`, error);
                }
              })
            );
          }
        }
        
        // Verify balances and send corrections if needed
        for (const notification of payoutNotifications) {
          if (notification.payout > 0) {
            try {
              const actualBalance = await storage.getUserBalance(notification.userId);
              if (Math.abs(actualBalance - notification.calculatedBalance) > 0.01) {
                console.warn(`⚠️ Balance mismatch for ${notification.userId}: expected ${notification.calculatedBalance}, got ${actualBalance}`);
                const client = clients.find(c => c.userId === notification.userId && c.ws.readyState === WebSocket.OPEN);
                if (client) {
                  client.ws.send(JSON.stringify({
                    type: 'balance_correction',
                    data: {
                      balance: actualBalance,
                      reason: 'Balance correction after verification',
                      timestamp: Date.now()
                    }
                  }));
                }
              }
            } catch (error) {
              console.error(`⚠️ Error verifying balance for ${notification.userId}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in payout processing:', error);
        // Send error notifications to affected users
        for (const notification of payoutNotifications) {
          const client = clients.find(c => c.userId === notification.userId && c.ws.readyState === WebSocket.OPEN);
          if (client) {
            client.ws.send(JSON.stringify({
              type: 'payout_error',
              data: {
                message: 'Failed to process payout. Please contact support.',
                timestamp: Date.now()
              }
            }));
          }
        }
      }
    })();
    
    // Store promise for waiting before reset
    (global as any).lastPayoutPromise = payoutPromise;
  }
  
  // Calculate company profit/loss for this game
  const companyProfitLoss = totalBetsAmount - totalPayoutsAmount;
  const profitLossPercentage = totalBetsAmount > 0 ? (companyProfitLoss / totalBetsAmount) * 100 : 0;
  
  // Store game statistics
  // ✅ FIX: Game ID is now validated at the start, so this check is redundant but kept for safety
  if (currentGameState.gameId) {
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
  
  // Broadcast analytics updates to all admin clients after game completion
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get updated analytics data
    const updatedDailyStats = await storage.getDailyStats(today);
    const monthYear = today.toISOString().slice(0, 7);
    const updatedMonthlyStats = await storage.getMonthlyStats(monthYear);
    const year = today.getFullYear();
    const updatedYearlyStats = await storage.getYearlyStats(year);
    const todayStats = await storage.getTodayStats();
    const todayGameCount = await storage.getTodayGameCount();
    const todayBetTotal = await storage.getTodayBetsTotal();
    const todayPlayers = await storage.getTodayUniquePlayers();
    
    // Broadcast real-time stats update (frontend will convert to 'realtime-analytics-update' event)
    broadcastToRole({
      type: 'analytics_update',
      data: {
        currentGame: {
          id: currentGameState.gameId,
          phase: 'complete',
          currentRound: currentGameState.currentRound,
          timer: 0,
          andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
          baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
          bettingLocked: true,
          totalPlayers: uniquePlayers
        },
        todayStats,
        todayGameCount,
        todayBetTotal,
        todayPlayers
      }
    }, 'admin');
    
    // Broadcast daily analytics update
    if (updatedDailyStats) {
      broadcastToRole({
        type: 'analytics_update',
        data: {
          type: 'daily',
          data: updatedDailyStats
        }
      }, 'admin');
    }
    
    // Broadcast monthly analytics update
    if (updatedMonthlyStats) {
      broadcastToRole({
        type: 'analytics_update',
        data: {
          type: 'monthly',
          data: updatedMonthlyStats
        }
      }, 'admin');
    }
    
    // Broadcast yearly analytics update
    if (updatedYearlyStats) {
      broadcastToRole({
        type: 'analytics_update',
        data: {
          type: 'yearly',
          data: updatedYearlyStats
        }
      }, 'admin');
    }
    
    // Broadcast game history update to ALL users (basic data only)
    broadcast({
      type: 'game_history_update',
      data: {
        gameId: currentGameState.gameId,
        openingCard: currentGameState.openingCard,
        winner,
        winningCard,
        round: currentGameState.currentRound,
        totalCards: currentGameState.andarCards.length + currentGameState.baharCards.length,
        createdAt: new Date().toISOString()
      }
    });

    // Broadcast detailed analytics to admins only (with financial data) - separate event type
    broadcastToRole({
      type: 'game_history_update_admin',
      data: {
        gameId: currentGameState.gameId,
        openingCard: currentGameState.openingCard,
        winner,
        winningCard,
        totalBets: totalBetsAmount,
        totalPayouts: totalPayoutsAmount,
        andarTotalBet: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
        baharTotalBet: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
        totalPlayers: uniquePlayers,
        totalCards: currentGameState.andarCards.length + currentGameState.baharCards.length,
        round: currentGameState.currentRound,
        createdAt: new Date().toISOString()
      }
    }, 'admin');
    
    console.log('✅ Analytics updates broadcasted to admin clients');
  } catch (error) {
    console.error('⚠️ Error broadcasting analytics updates:', error);
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
  
  // ✅ CRITICAL FIX: Save game history and complete game session BEFORE auto-restart
  // This ensures the game is properly saved even if auto-restart happens
  // Store game data in variables BEFORE reset to avoid losing data
  const completedGameId = currentGameState.gameId;
  const completedOpeningCard = currentGameState.openingCard || 'UNKNOWN';
  const completedWinner = winner;
  const completedWinningCard = winningCard;
  const completedRound = currentGameState.currentRound;
  const completedTotalCards = currentGameState.andarCards.length + currentGameState.baharCards.length;
  
  if (completedGameId) {
    try {
      const historyData = {
        gameId: completedGameId,
        openingCard: completedOpeningCard,
        winner: completedWinner,
        winningCard: completedWinningCard,
        totalCards: completedTotalCards,
        ...(completedRound && { round: completedRound } as any),
        ...(totalBetsAmount && { totalBets: totalBetsAmount } as any),
        ...(totalPayoutsAmount && { totalPayouts: totalPayoutsAmount } as any)
      };
      
      console.log(`💾 Saving game history for gameId: ${completedGameId}`, {
        winner: completedWinner,
        winningCard: completedWinningCard,
        totalCards: historyData.totalCards,
        round: completedRound,
        totalBets: totalBetsAmount,
        totalPayouts: totalPayoutsAmount
      });
      
      // ✅ CRITICAL: Save game history FIRST - this is the most important save
      await storage.saveGameHistory(historyData as any);
      console.log(`✅ Game history saved successfully for gameId: ${completedGameId}`);
      
      // ✅ CRITICAL: Mark game session as completed - ensure status is saved
      await storage.completeGameSession(completedGameId, completedWinner, completedWinningCard);
      console.log(`✅ Game session completed in database: ${completedGameId}`);
      
      // ✅ CRITICAL: Final persist to ensure all data is saved
      await persistGameState();
      console.log(`✅ Final game state persisted for gameId: ${completedGameId}`);
    } catch (error) {
      console.error('❌ ERROR saving game history:', error);
      console.error('Game details:', {
        gameId: completedGameId,
        winner: completedWinner,
        winningCard: completedWinningCard,
        round: completedRound
      });
      // Don't throw - continue with game completion even if save fails
    }
  } else {
    console.error(`❌ CRITICAL: Cannot save game history - gameId is null/undefined`);
  }
  
  // ✅ FIX #1: Wait for all operations to complete before resetting
  // Auto-restart: Wait for all operations to complete before resetting
  console.log('⏰ Auto-restarting game after DB operations complete...');
  
  // Wait for all payout updates to complete before resetting
  const waitForPayouts = async () => {
    try {
      // Wait for payout promise if it exists
      const payoutPromise = (global as any).lastPayoutPromise;
      if (payoutPromise) {
        await payoutPromise;
        console.log('✅ Payout operations completed');
      }
      
      // Give extra time for any remaining DB operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // ✅ REMOVED: Game session completion is already saved above before waitForPayouts
      // No need to verify again here as it's already completed
      
      return true;
    } catch (error) {
      console.error('⚠️ Error waiting for payouts:', error);
      return false;
    }
  };

  // Execute reset after waiting for all operations
  waitForPayouts().then(() => {
    console.log('🔄 Auto-restart: Starting new game setup');
    
    // Reset game state
    currentGameState.startNewGame();
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
    
    // Clear payout promise
    (global as any).lastPayoutPromise = null;
    
    // Broadcast return to opening card panel
    broadcast({
      type: 'game_return_to_opening',
      data: {
        message: 'Game completed. Starting new game setup...',
        gameState: {
          phase: 'idle',
          currentRound: 1,
          openingCard: null,
          andarCards: [],
          baharCards: [],
          winner: null,
          winningCard: null,
          gameId: currentGameState.gameId
        }
      }
    });
    
    // Also broadcast reset message
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
  }).catch(error => {
    console.error('❌ Error during game reset:', error);
    // Still reset game state even if there was an error
    currentGameState.startNewGame();
    currentGameState.clearCards();
  });
}

// Make game state and functions globally available
// NOTE: These assignments must happen AFTER all function definitions
(global as any).currentGameState = currentGameState;
(global as any).broadcast = broadcast;
(global as any).broadcastToRole = broadcastToRole;
(global as any).startTimer = startTimer;
(global as any).completeGame = completeGame;
(global as any).transitionToRound2 = transitionToRound2;
(global as any).transitionToRound3 = transitionToRound3;
(global as any).getCurrentGameStateForUser = getCurrentGameStateForUser;

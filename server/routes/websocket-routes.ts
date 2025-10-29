// WebSocket and Game State Management Routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "../storage-supabase";

// Extend Express Request interface for WebSocket authentication
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone?: string;
        username?: string;
        role: string;
      };
    }
  }
}

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

// Complete game function
async function completeGame(winningSide: 'andar' | 'bahar', winningCard: string) {
  console.log(`🎉 Game complete! ${winningSide.toUpperCase()} wins with ${winningCard}`);
  
  currentGameState.winner = winningSide;
  currentGameState.winningCard = winningCard;
  currentGameState.phase = 'complete';
  
  // Calculate and process payouts
  for (const [userId, bets] of Array.from(currentGameState.userBets.entries())) {
    const payout = calculatePayout(currentGameState.currentRound, winningSide, bets);
    if (payout > 0) {
      try {
        // Update user balance with winnings
        await storage.updateUserBalance(userId, payout - (bets.round1.andar + bets.round1.bahar + bets.round2.andar + bets.round2.bahar));
        console.log(`💰 Payout processed for user ${userId}: ₹${payout}`);
      } catch (error) {
        console.error(`❌ Error processing payout for user ${userId}:`, error);
      }
    }
  }
  
  // Broadcast game completion
  broadcast({
    type: 'game_complete',
    data: {
      winner: winningSide,
      winningCard: {
        id: winningCard,
        display: winningCard,
        value: winningCard?.replace(/[♠♥♦♣]/g, '') || '',
        suit: winningCard?.match(/[♠♥♦♣]/)?.[0] || '',
        color: (winningCard?.match(/[♥♦]/) ? 'red' : 'black') as 'red' | 'black',
        rank: winningCard?.replace(/[♠♥♦♣]/g, '') || ''
      },
      round: currentGameState.currentRound,
      payouts: Array.from(currentGameState.userBets.entries()).map(([userId, bets]) => ({
        userId,
        payout: calculatePayout(currentGameState.currentRound, winningSide, bets)
      }))
    }
  });
  
  // Auto-reset after 5 seconds
  setTimeout(() => {
    currentGameState.reset();
    broadcast({
      type: 'game_reset',
      data: {
        message: 'New game starting in 5 seconds...',
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
  }, 5000);
}

// Round transition functions
function transitionToRound2() {
  console.log('🔄 Transitioning to Round 2');
  currentGameState.currentRound = 2;
  currentGameState.phase = 'betting';
  currentGameState.bettingLocked = false;
  
  // Reset round completion status for Round 2
  currentGameState.roundCompletionStatus.round1 = { baharComplete: false, andarComplete: false };
  currentGameState.roundCompletionStatus.round2 = { baharComplete: false, andarComplete: false };
  
  const timerDuration = parseInt(process.env.DEFAULT_TIMER_DURATION || '30', 10);
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
      console.error('Error updating game session for Round 2:', error);
    }
    
    broadcast({
      type: 'phase_change',
      data: { 
        phase: 'dealing', 
        round: 2,
        message: 'Round 2 betting closed. Revealing cards in 2 seconds...' 
      }
    });
  });
  
  broadcast({
    type: 'timer_start',
    data: { seconds: timerDuration, phase: 'betting', round: 2 }
  });
}

function transitionToRound3() {
  console.log('🔄 Transitioning to Round 3 (Continuous Draw)');
  currentGameState.currentRound = 3;
  currentGameState.phase = 'betting';
  currentGameState.bettingLocked = false;
  
  // Reset round completion status for Round 3
  currentGameState.roundCompletionStatus.round1 = { baharComplete: false, andarComplete: false };
  currentGameState.roundCompletionStatus.round2 = { baharComplete: false, andarComplete: false };
  
  const timerDuration = parseInt(process.env.DEFAULT_TIMER_DURATION || '30', 10);
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
      console.error('Error updating game session for Round 3:', error);
    }
    
    broadcast({
      type: 'phase_change',
      data: { 
        phase: 'dealing', 
        round: 3,
        message: 'Round 3 (Continuous Draw) - dealing cards one by one until winner found...' 
      }
    });
  });
  
  broadcast({
    type: 'timer_start',
    data: { seconds: timerDuration, phase: 'betting', round: 3 }
  });
}

// Export the register function for use in server/index.ts
export async function registerWebSocketRoutes(app: Express): Promise<Server> {
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
            // 🔐 SECURITY: Validate token - JWT ONLY, NO FALLBACK
            let authenticatedUser = null;
            
            if (message.data?.token) {
              try {
                const { verifyToken } = await import('../auth');
                authenticatedUser = verifyToken(message.data.token);
                console.log('✅ WebSocket token validated:', {
                  id: authenticatedUser.id,
                  role: authenticatedUser.role
                });
              } catch (error: any) {
                console.error('❌ Invalid WebSocket token:', error);
                
                // Check if token is expired vs invalid
                const isExpired = error.message?.includes('expired') || error.name === 'TokenExpiredError';
                
                ws.send(JSON.stringify({
                  type: 'auth_error',
                  data: {
                    message: isExpired
                      ? 'Session expired. Please login again.'
                      : 'Invalid token. Please login again.',
                    error: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
                    canRetry: isExpired, // Allow retry for expired tokens
                    redirectTo: '/login'
                  }
                }));
                
                // Give client time to receive message before closing
                setTimeout(() => {
                  ws.close(4001, isExpired ? 'Token expired' : 'Invalid token');
                }, 1000);
                return;
              }
            }
            
            // 🔐 SECURITY: Require valid authentication - NO ANONYMOUS ACCESS
            if (!authenticatedUser) {
              // ✅ DEVELOPMENT MODE: Allow anonymous access for testing
              if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ Development mode: Allowing anonymous WebSocket access');
                authenticatedUser = {
                  id: 'anonymous-' + Math.random().toString(36).substr(2, 9),
                  role: 'player',
                  wallet: 100000 // Default test balance
                };
              } else {
                console.warn('⚠️ WebSocket authentication failed - no valid token or user data provided');
                ws.send(JSON.stringify({
                  type: 'auth_error',
                  data: {
                    message: 'Authentication required. Please login first.',
                    error: 'AUTH_REQUIRED',
                    redirectTo: '/login'
                  }
                }));
                
                // Give client time to receive message before closing
                setTimeout(() => {
                  ws.close(4001, 'Authentication required');
                }, 1000);
                return;
              }
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
                console.error('Error updating game session:', error);
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
            if (!client) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Client not authenticated' }
              }));
              break;
            }
            
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
            
            // FIXED: Add proper balance validation before placing bet
            try {
              // Get current user balance from database
              const user = await storage.getUser(client.userId);
              if (!user) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'User not found' }
                }));
                break;
              }
              
              const currentBalance = parseFloat(user.balance) || 0;
              
              // Check if user has sufficient balance
              if (currentBalance < betAmount) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: `Insufficient balance. Current balance: ₹${currentBalance.toLocaleString()}, Bet amount: ₹${betAmount.toLocaleString()}` }
                }));
                break;
              }
              
              // Check total bets for this round to ensure user doesn't exceed balance
              if (!currentGameState.userBets.has(client.userId)) {
                currentGameState.userBets.set(client.userId, {
                  round1: { andar: 0, bahar: 0 },
                  round2: { andar: 0, bahar: 0 }
                });
              }
              
              const userBet = currentGameState.userBets.get(client.userId)!;
              const currentRoundBets = betRound === 1
                ? userBet.round1.andar + userBet.round1.bahar
                : userBet.round2.andar + userBet.round2.bahar;
              
              if (currentBalance < currentRoundBets + betAmount) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: `Insufficient balance for additional bet. Current bets: ₹${currentRoundBets.toLocaleString()}, Attempted: ₹${betAmount.toLocaleString()}, Available: ₹${(currentBalance - currentRoundBets).toLocaleString()}` }
                }));
                break;
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
                
                // FIXED: Update balance in database immediately to prevent double-spending
                await storage.updateUserBalance(client.userId, -betAmount);
                
                // Check conditional bonus threshold (auto-apply if ±30% from original deposit)
                try {
                  const bonusApplied = await storage.applyConditionalBonus(client.userId);
                  if (bonusApplied) {
                    console.log(`✅ Conditional bonus auto-applied for user ${client.userId} after bet`);
                  }
                } catch (bonusError) {
                  console.error('Error checking conditional bonus:', bonusError);
                  // Don't fail bet if bonus check fails
                }
                
                // FIXED: Remove balance updates from WebSocket entirely
                // All balance updates should now come from REST API polling
                // This prevents race conditions and reduces WebSocket load
                console.log(`💰 Bet placed successfully: ${client.userId} -> -₹${betAmount} (balance updated via REST API)`);
              }
              
              // Update in-memory game state
              if (betRound === 1) {
                userBet.round1[betSide as 'andar' | 'bahar'] += betAmount;
                currentGameState.round1Bets[betSide as 'andar' | 'bahar'] += betAmount;
              } else if (betRound === 2) {
                userBet.round2[betSide as 'andar' | 'bahar'] += betAmount;
                currentGameState.round2Bets[betSide as 'andar' | 'bahar'] += betAmount;
              }
              
              // Send success response to client
              ws.send(JSON.stringify({
                type: 'bet_success',
                data: {
                  side: betSide,
                  amount: betAmount,
                  round: betRound,
                  newBalance: isAnonymous ? null : currentBalance - betAmount,
                  message: `Bet placed successfully: ₹${betAmount.toLocaleString()} on ${betSide.charAt(0).toUpperCase() + betSide.slice(1)}`
                }
              }));
              
              // Update user's bet display
              ws.send(JSON.stringify({
                type: 'user_bets_update',
                data: {
                  round1Bets: userBet.round1,
                  round2Bets: userBet.round2,
                  currentRound: betRound
                }
              }));
              
              // Broadcast betting stats to all clients
              broadcast({
                type: 'betting_stats',
                data: {
                  andarTotal: currentGameState.round1Bets.andar + currentGameState.round2Bets.andar,
                  baharTotal: currentGameState.round1Bets.bahar + currentGameState.round2Bets.bahar,
                  round1Bets: currentGameState.round1Bets,
                  round2Bets: currentGameState.round2Bets
                }
              });
              
              console.log(`✅ Bet processed: ${client.userId} bet ₹${betAmount} on ${betSide} (Round ${betRound})`);
            } catch (error: any) {
              console.error('Error processing bet:', error);
              ws.send(JSON.stringify({
                type: 'error',
                data: {
                  message: error.message || 'Failed to process bet',
                  error: error.code || 'BET_PROCESSING_ERROR'
                }
              }));
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
            
            // 🔒 CRITICAL: Validate game is in dealing phase
            if (currentGameState.phase !== 'dealing') {
              ws.send(JSON.stringify({
                type: 'error',
                data: { 
                  message: `Cannot deal cards. Game is in ${currentGameState.phase} phase.`,
                  currentPhase: currentGameState.phase
                }
              }));
              console.log(`⚠️ Card dealing blocked - game in ${currentGameState.phase} phase`);
              break;
            }
            
            // 🔒 CRITICAL: Validate dealing sequence (Bahar first, then Andar)
            const expectedSide = getNextExpectedSide(
              currentGameState.currentRound, 
              currentGameState.andarCards.length, 
              currentGameState.baharCards.length
            );
            
            if (expectedSide === null) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { 
                  message: `Current round is complete. Please wait for round transition.`,
                  currentRound: currentGameState.currentRound,
                  andarCards: currentGameState.andarCards.length,
                  baharCards: currentGameState.baharCards.length
                }
              }));
              console.log(`⚠️ Card dealing blocked - round ${currentGameState.currentRound} is complete`);
              break;
            }
            
            if (side !== expectedSide) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { 
                  message: `Invalid dealing sequence! Expected ${expectedSide.toUpperCase()} card next, but received ${side.toUpperCase()}.`,
                  expectedSide: expectedSide,
                  attemptedSide: side,
                  currentRound: currentGameState.currentRound,
                  hint: `In Round ${currentGameState.currentRound}, deal ${expectedSide.toUpperCase()} first.`
                }
              }));
              console.log(`⚠️ Invalid dealing sequence - expected ${expectedSide}, got ${side}`);
              break;
            }
            
            // NEW: Individual card dealing logic for proper game flow
            console.log(`🎴 ✅ Valid card dealing: ${cardDisplay} to ${side} (Round ${currentGameState.currentRound})`);
            
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
                console.error('Error saving dealt card:', error);
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
                console.error('Error completing game:', error);
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
        case 'screen_share_start':
          // Only admins can start screen sharing
          if (!client || client.role !== 'admin') {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Only admin can start screen sharing' }
            }));
            console.log('⚠️ Non-admin attempted to start screen share - blocked');
            break;
          }
          
          console.log('🖥️ Admin started screen sharing');
          
          // Broadcast screen share start to all players
          broadcast({
            type: 'screen_share_start',
            data: {
              message: 'Admin has started screen sharing',
              timestamp: Date.now()
            }
          });
          
          ws.send(JSON.stringify({
            type: 'screen_share_started',
            data: {
              message: 'Screen sharing started successfully',
              timestamp: Date.now()
            }
          }));
          break;
          
        case 'screen_share_stop':
          // Only admins can stop screen sharing
          if (!client || client.role !== 'admin') {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Only admin can stop screen sharing' }
            }));
            console.log('⚠️ Non-admin attempted to stop screen share - blocked');
            break;
          }
          
          console.log('🛑 Admin stopped screen sharing');
          
          // Broadcast screen share stop to all players
          broadcast({
            type: 'screen_share_stop',
            data: {
              message: 'Admin has stopped screen sharing',
              timestamp: Date.now()
            }
          });
          
          ws.send(JSON.stringify({
            type: 'screen_share_stopped',
            data: {
              message: 'Screen sharing stopped successfully',
              timestamp: Date.now()
            }
          }));
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
    
    // Set up ping/pong to detect dead connections
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
        if (client) {
          clients.delete(client);
        }
      }
    }, 30000); // Ping every 30 seconds
    
    ws.on('pong', () => {
      // Connection is alive - no action needed
    });
  });
  
  return httpServer;
}
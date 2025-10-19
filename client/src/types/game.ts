/**
 * Shared Game Types
 * Single source of truth for all game-related types
 */

// Game phases - standardized across all components
export type GamePhase = 
  | 'idle'           // No game active
  | 'opening'        // Admin selecting opening card
  | 'betting'        // Players can place bets
  | 'dealing'        // Admin dealing cards
  | 'complete';      // Game finished

// Game rounds
export type GameRound = 1 | 2 | 3;

// Card interface
export interface Card {
  suit: string;
  value: string;
  display: string;
}

// Dealt card with metadata
export interface DealtCard {
  card: Card;
  side: 'andar' | 'bahar';
  position: number;
  isWinningCard?: boolean;
  timestamp?: number;
}

// Bet side
export type BetSide = 'andar' | 'bahar';

// Game winner
export type GameWinner = 'andar' | 'bahar' | null;

// Round-specific bets
export interface RoundBets {
  andar: number;
  bahar: number;
}

// Player bet record
export interface PlayerBet {
  id: string;
  userId: string;
  gameId: string;
  round: GameRound;
  side: BetSide;
  amount: number;
  status: 'pending' | 'won' | 'lost';
  timestamp: number;
}

// Game settings
export interface GameSettings {
  maxBetAmount: number;
  minBetAmount: number;
  timer: number;
  openingCard: string | null;
}

// Stream settings
export interface StreamSettings {
  streamType: 'video' | 'embed' | 'rtmp';
  streamUrl: string;
  rtmpUrl?: string;
  rtmpStreamKey?: string;
  streamTitle: string;
  streamStatus: 'live' | 'offline' | 'maintenance';
  streamDescription: string;
  streamQuality: 'auto' | '1080p' | '720p' | '480p' | '360p';
  streamDelay: number; // in seconds
  backupStreamUrl: string;
  embedCode: string;
}

// Stream statistics
export interface StreamStatistics {
  currentViewers: number;
  totalViewsToday: number;
  streamUptime: string; // formatted as "HH:MM:SS"
  averageLatency: number; // in milliseconds
  bitrate: number; // in kbps
  framerate: number; // in fps
}

// Live simulation settings
export interface LiveSimulationSettings {
  viewers: {
    min: number;
    max: number;
    current: number;
  };
  betAmount: {
    min: number;
    max: number;
    current: number;
  };
  winAmount: {
    min: number;
    max: number;
    current: number;
  };
}

// Round completion popup data
export interface RoundCompletionData {
  round: number;
  cardsDealt: number;
  nextRoundTimer: number;
  message: string;
}

// Winner popup data
export interface WinnerPopupData {
  winner: 'andar' | 'bahar';
  winningCard: string;
  round: number;
  earnings: {
    andar: number;
    bahar: number;
    total: number;
  };
  breakdown: {
    round1: string;
    round2?: string;
    round3?: string;
  };
}

// Complete game state interface
export interface GameState {
  // Game identification
  gameId: string;
  
  // Card state
  selectedOpeningCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  dealtCards: DealtCard[];
  
  // Game flow
  phase: GamePhase;
  currentRound: GameRound;
  countdownTimer: number;
  isGameActive: boolean;
  
  // Winner state
  gameWinner: GameWinner;
  winningCard: Card | null;
  
  // Betting state - total from all players
  andarTotalBet: number;
  baharTotalBet: number;
  
  // Round-specific total bets
  round1Bets: RoundBets;
  round2Bets: RoundBets;
  
  // User-specific data
  userId: string | null;
  username: string | null;
  userRole: 'player' | 'admin';
  playerWallet: number;
  
  // Player's individual bets per round
  playerRound1Bets: RoundBets;
  playerRound2Bets: RoundBets;
}

// Game history entry
export interface GameHistoryEntry {
  id: string;
  gameId: string;
  openingCard: string;
  winner: BetSide;
  winningCard: string;
  totalCards: number;
  round: GameRound;
  createdAt: Date;
}

// Notification types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
}

// WebSocket message types
export type WebSocketMessageType =
  // Game control
  | 'game_start'
  | 'game_reset'
  | 'game_complete'
  
  // Card actions
  | 'opening_card_set'
  | 'opening_card_confirmed'
  | 'card_dealt'
  | 'deal_card'
  
  // Timer
  | 'timer_start'
  | 'timer_update'
  | 'timer_stop'
  
  // Betting
  | 'bet_placed'
  | 'betting_stats'
  | 'balance_update'
  | 'user_bets_update'
  | 'payout_received'
  
  // Round control
  | 'start_round_2'
  | 'start_final_draw'
  | 'round_complete'
  
  // Sync
  | 'sync_game_state'
  | 'phase_change'
  
  // Stream
  | 'stream_status_update'
  
  // Settings
  | 'settings_update'
  
  // Connection
  | 'connection'
  | 'authenticated'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp?: number;
}

// Connection state
export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

// Payout calculation result
export interface PayoutResult {
  totalPayout: number;
  round1Payout: number;
  round2Payout: number;
  multiplier: number;
  breakdown: string;
}

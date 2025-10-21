// Game-related type definitions

export interface Card {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  value: number;
  color: 'red' | 'black';
  display: string;
}

export interface RoundBets {
  andar: number;
  bahar: number;
}

export interface UserBets {
  round1: RoundBets;
  round2: RoundBets;
}

export interface DealtCard {
  id: string;
  card: Card;
  side: BetSide;
  position: number;
  isWinningCard: boolean;
  timestamp: Date;
}

export type GamePhase = 'idle' | 'opening' | 'betting' | 'dealing' | 'complete';
export type GameRound = 1 | 2 | 3;
export type GameWinner = 'andar' | 'bahar' | null;

export interface GameState {
  id: string;
  status: 'waiting' | 'betting' | 'dealing' | 'revealing' | 'completed';
  currentRound: number;
  timeRemaining: number;
  andarCard?: Card;
  baharCard?: Card;
  winningSide?: 'andar' | 'bahar';
  bets: Bet[];
  history: GameHistoryEntry[];
}

export interface Bet {
  id: string;
  userId: string;
  side: 'andar' | 'bahar';
  amount: number;
  round: number;
  timestamp: Date;
  status: 'pending' | 'won' | 'lost';
}

export interface GameHistoryEntry {
  id: string;
  round: number;
  winningSide: 'andar' | 'bahar';
  andarCard: Card;
  baharCard: Card;
  timestamp: Date;
  totalBets: number;
  andarBets: number;
  baharBets: number;
}

export interface WebSocketMessage {
  type: 'gameState' | 'betPlaced' | 'gameResult' | 'timerUpdate' | 'error' | 'connection' | 'authenticated' | 'sync_game_state' | 'opening_card_set' | 'opening_card_confirmed' | 'card_dealt' | 'timer_start' | 'timer_update' | 'timer_stop' | 'betting_stats' | 'start_round_2' | 'start_final_draw' | 'game_complete' | 'game_reset' | 'phase_change' | 'balance_update' | 'user_bets_update' | 'payout_received' | 'game_start' | 'deal_card' | 'bet_placed' | 'betting_locked' | 'round_complete' | 'card_animation' | 'confetti_trigger' | 'haptic_feedback' | 'accessibility_update' | 'notification';
  data: any;
  timestamp?: Date;
}

export interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;
  error?: string;
  lastMessage?: WebSocketMessage;
  isConnected?: boolean;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
}

export type BetSide = 'andar' | 'bahar';

export interface GameStats {
  totalGames: number;
  andarWins: number;
  baharWins: number;
  totalBets: number;
  totalWinnings: number;
  averageBet: number;
}

export interface Player {
  id: string;
  username: string;
  balance: number;
  isOnline: boolean;
  lastActive: Date;
}

export interface GameSettings {
  minBet: number;
  maxBet: number;
  betTimeLimit: number;
  revealTime: number;
  autoStart: boolean;
}

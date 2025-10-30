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

// Analytics interfaces
export interface GameAnalytics {
  id: string;
  gameId: string;
  winner?: 'andar' | 'bahar'; // Added winner property
  totalPlayers: number;
  totalBets: number;
  totalWinnings: number;
  houseEarnings: number;
  profitLoss: number;
  profitLossPercentage: number;
  housePayout: number;
  andarBetsCount: number;
  baharBetsCount: number;
  andarTotalBet: number;
  baharTotalBet: number;
  gameDuration: number;
  uniquePlayers: number;
  createdAt: Date;
}

export interface DailyAnalytics {
  date: Date;
  totalGames: number;
  totalBets: number;
  totalPayouts: number;
  totalRevenue: number;
  profitLoss: number;
  profitLossPercentage: number;
  uniquePlayers: number;
  peakBetsHour: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyAnalytics {
  monthYear: string; // Format: YYYY-MM
  totalGames: number;
  totalBets: number;
  totalPayouts: number;
  totalRevenue: number;
  profitLoss: number;
  profitLossPercentage: number;
  uniquePlayers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface YearlyAnalytics {
  year: number;
  totalGames: number;
  totalBets: number;
  totalPayouts: number;
  totalRevenue: number;
  profitLoss: number;
  profitLossPercentage: number;
  uniquePlayers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RealtimeStats {
  currentGame: {
    id: string;
    phase: string;
    currentRound: number;
    timer: number;
    andarTotal: number;
    baharTotal: number;
    bettingLocked: boolean;
    totalPlayers: number;
  };
  todayStats: DailyAnalytics | null;
  todayGameCount: number;
  todayBetTotal: number;
  todayPlayers: number;
}

// User Management Type Definitions
export interface UserBalanceUpdate {
  amount: number;
  type: 'add' | 'subtract';
  reason: string;
}

export interface UserStatusUpdate {
  status: 'active' | 'suspended' | 'banned';
  reason: string;
}

export interface UserAdminFilters {
  status?: 'active' | 'suspended' | 'banned';
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserCreateData {
  phone: string;
  name: string;
  initialBalance?: number;
  role?: string;
  status?: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  fullName: string;
  role: string;
  status: 'active' | 'suspended' | 'banned';
  balance: number;
  totalWinnings: number;
  totalLosses: number;
  gamesPlayed: number;
  gamesWon: number;
  phoneVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  success: boolean;
  users: AdminUser[];
  total: number;
  error?: string;
}

export interface UserResponse {
  success: boolean;
  user?: AdminUser;
  error?: string;
  message?: string;
}

export interface UserStatisticsResponse {
  success: boolean;
  user?: any;
  error?: string;
}

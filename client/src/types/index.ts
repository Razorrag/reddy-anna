// Import shared types from schema
export {
  Card,
  GamePhase,
  Side,
  WebSocketMessage,
  GameState,
  BettingStats,
  User,
  GameSession,
  PlayerBet,
  DealtCard,
  GameHistoryEntry,
  StreamSettings,
  SUITS,
  RANKS
} from '../../../shared/schema';

// Re-export GamePhase for use in other types
import { GamePhase } from '../../../shared/schema';
export type { GamePhase as GamePhaseType };

// Additional frontend-specific types
export interface CardUI {
  suit: string;
  value: string;
  display: string;
  isSelected?: boolean;
  isDisabled?: boolean;
}

export interface GameSettings {
  maxBetAmount: number;
  minBetAmount: number;
  timer: number;
  openingCard: string | null;
}

export interface StreamSettingsUI {
  streamType: 'video' | 'embed' | 'rtmp';
  streamUrl: string;
  rtmpUrl?: string;
  rtmpStreamKey?: string;
  streamTitle: string;
  streamStatus: 'live' | 'offline' | 'maintenance';
  streamDescription: string;
}

export interface NotificationData {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
}

export interface GameStats {
  totalUsers: number;
  activeGames: number;
  totalRevenue: number;
  todayRevenue: number;
}

export interface UserActivity {
  id: string;
  type: 'user_registration' | 'game_completed' | 'bet_placed' | 'system_event';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GameStartResponse {
  success: boolean;
  gameId: string;
  message?: string;
}

export interface CardDealResponse {
  success: boolean;
  data: {
    card: string;
    side: 'andar' | 'bahar';
    position: number;
    isWinningCard: boolean;
  };
  gameStatus?: 'betting' | 'dealing' | 'complete';
}

// Component Props types
export interface BettingStatsProps {
  maxBetMultiplier?: number;
}

export interface CountdownTimerProps {
  timeLeft?: number;
  duration?: number;
  onTimeout?: () => void;
  showProgress?: boolean;
}

export interface GameHeaderProps {
  onSettingsClick: () => void;
}

export interface SettingsModalProps {
  onClose: () => void;
}

export interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  role?: 'admin' | 'user';
  redirectTo?: string;
  children?: React.ReactNode;
}

// Error types
export interface ErrorInfo {
  componentStack: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Event types
export type GameEvent = 
  | { type: 'GAME_START'; payload: { openingCard: string; round: number } }
  | { type: 'CARD_DEALT'; payload: { card: string; side: 'andar' | 'bahar'; position: number } }
  | { type: 'GAME_COMPLETE'; payload: { winner: 'andar' | 'bahar'; winningCard: string } }
  | { type: 'TIMER_UPDATE'; payload: { seconds: number; phase: GamePhase } }
  | { type: 'GAME_RESET'; payload: { round: number } }
  | { type: 'SETTINGS_UPDATE'; payload: GameSettings }
  | { type: 'STREAM_STATUS_UPDATE'; payload: StreamSettingsUI };
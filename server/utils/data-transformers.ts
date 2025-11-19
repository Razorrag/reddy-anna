/**
 * Data transformation utilities for converting between snake_case and camelCase
 * This ensures consistent data formatting across the application
 */

/**
 * Convert snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Transform object keys from snake_case to camelCase
 */
export function transformKeysToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformKeysToCamel(item)) as any;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = transformKeysToCamel(value);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item => 
        typeof item === 'object' ? transformKeysToCamel(item) : item
      );
    } else {
      result[camelKey] = value;
    }
  }
  
  return result as T;
}

/**
 * Transform object keys from camelCase to snake_case
 */
export function transformKeysToSnake<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformKeysToSnake(item)) as any;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = transformKeysToSnake(value);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item => 
        typeof item === 'object' ? transformKeysToSnake(item) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  
  return result as T;
}

/**
 * Transform statistics data from database (snake_case) to API format (camelCase)
 */
export interface StatisticsData {
  totalGames: number;
  totalBets: number;
  totalPayouts: number;
  totalRevenue: number;
  profitLoss: number;
  profitLossPercentage: number;
  uniquePlayers: number;
}

export function transformStatistics(dbData: any): StatisticsData {
  if (!dbData) {
    return {
      totalGames: 0,
      totalBets: 0,
      totalPayouts: 0,
      totalRevenue: 0,
      profitLoss: 0,
      profitLossPercentage: 0,
      uniquePlayers: 0,
    };
  }

  const totalBets = Number(dbData.total_bets || 0);
  const totalPayouts = Number(dbData.total_payouts || 0);
  const totalRevenue = Number(dbData.total_revenue || 0);
  
  // Calculate profit/loss percentage
  const profitLossPercentage = totalBets > 0 
    ? ((totalRevenue / totalBets) * 100) 
    : 0;

  return {
    totalGames: Number(dbData.total_games || 0),
    totalBets,
    totalPayouts,
    totalRevenue,
    profitLoss: totalRevenue, // Revenue IS profit/loss (bets - payouts)
    profitLossPercentage: Number(profitLossPercentage.toFixed(2)),
    uniquePlayers: Number(dbData.unique_players || 0),
  };
}

/**
 * Transform realtime game statistics
 */
export interface RealtimeGameStats {
  currentGame: {
    id: string;
    phase: string;
    currentRound: number;
    totalPlayers: number;
    andarTotal: number;
    baharTotal: number;
    timer: number;
  } | null;
  connected: boolean;
}

export function transformRealtimeStats(dbData: any): RealtimeGameStats {
  if (!dbData || !dbData.currentGame) {
    return {
      currentGame: null,
      connected: false,
    };
  }

  return {
    currentGame: {
      id: dbData.currentGame.id || '',
      phase: dbData.currentGame.phase || 'idle',
      currentRound: Number(dbData.currentGame.currentRound || 0),
      totalPlayers: Number(dbData.currentGame.totalPlayers || 0),
      andarTotal: Number(dbData.currentGame.andarTotal || 0),
      baharTotal: Number(dbData.currentGame.baharTotal || 0),
      timer: Number(dbData.currentGame.timer || 0),
    },
    connected: true,
  };
}

/**
 * Transform referral data from database format to API format
 */
export interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  referredUsers: Array<{
    username: string;
    status: string;
    earnedAmount: number;
    joinedAt: string;
  }>;
}

export function transformReferralData(dbData: any): ReferralData {
  if (!dbData) {
    return {
      referralCode: '',
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      referredUsers: [],
    };
  }

  return {
    referralCode: dbData.referral_code || dbData.referralCode || '',
    totalReferrals: Number(dbData.total_referrals || dbData.totalReferrals || 0),
    activeReferrals: Number(dbData.active_referrals || dbData.activeReferrals || 0),
    totalEarnings: Number(dbData.total_earnings || dbData.totalEarnings || 0),
    pendingEarnings: Number(dbData.pending_earnings || dbData.pendingEarnings || 0),
    referredUsers: (dbData.referred_users || dbData.referredUsers || []).map((user: any) => ({
      username: user.username || '',
      status: user.status || 'pending',
      earnedAmount: Number(user.earned_amount || user.earnedAmount || 0),
      joinedAt: user.joined_at || user.joinedAt || '',
    })),
  };
}
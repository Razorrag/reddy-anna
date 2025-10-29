import {
  type User,
  type InsertUser,
  type GameSession,
  type InsertGameSession,
  type PlayerBet,
  type InsertBet,
  type DealtCard,
  type InsertDealtCard,
  type GameHistoryEntry,
  type InsertGameHistory,
  type GamePhase,
  type StreamSettings,
  type UserReferral,
} from "@shared/schema";

// Analytics interfaces
export interface GameStatistics {
  id: string;
  gameId: string;
  totalPlayers: number;
  totalBets: number;
  totalWinnings: number;
  houseEarnings: number;
  andarBetsCount: number;
  baharBetsCount: number;
  andarTotalBet: number;
  baharTotalBet: number;
  profitLoss: number;
  profitLossPercentage: number;
  housePayout: number;
  gameDuration: number;
  uniquePlayers: number;
  createdAt: Date;
}

export interface DailyGameStatistics {
  id: string;
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

export interface MonthlyGameStatistics {
  id: string;
  monthYear: string;
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

export interface YearlyGameStatistics {
  id: string;
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

// Bet update interface
export interface UpdateBet {
  round?: string;
  side?: string;
  amount?: string;
  status?: string;
}
import { randomUUID } from "crypto";
import { supabaseServer } from "./lib/supabaseServer";
import { parseBalance } from "../shared/utils/balanceUtils";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>; // New method for phone-based lookup
  getUserByReferralCode(referralCode: string): Promise<User | undefined>; // New method for referral code lookup
  getAdminByUsername(username: string): Promise<any | undefined>; // New method for admin authentication
  getUserById(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>; // Get all users
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: string, amountChange: number): Promise<void>;
  updateUser(userId: string, updates: any): Promise<User>;
  updateUserGameStats(userId: string, won: boolean, betAmount: number, payoutAmount: number): Promise<void>;
  
  // Game session operations
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getCurrentGameSession(): Promise<GameSession | undefined>;
  getGameSession(gameId: string): Promise<GameSession | undefined>;
  updateGameSession(gameId: string, updates: Partial<GameSession>): Promise<void>;
  completeGameSession(gameId: string, winner: string, winningCard: string): Promise<void>;
  
  // Betting operations
  placeBet(bet: InsertBet): Promise<PlayerBet>;
  createBet(bet: InsertBet): Promise<PlayerBet>;
  getBetsForGame(gameId: string): Promise<PlayerBet[]>;
  getBetsForUser(userId: string, gameId: string): Promise<PlayerBet[]>;
  updateBetStatus(betId: string, status: string): Promise<void>;
  updateBetStatusByGameUser(gameId: string, userId: string, side: string, status: string): Promise<void>;
  updateBetDetails(betId: string, updates: Partial<UpdateBet>): Promise<void>;
  updateUserBetInGame(userId: string, gameId: string, round: string, oldSide: string, newSide: string, newAmount: number): Promise<void>;
  getActiveBetsForGame(gameId: string): Promise<PlayerBet[]>;
  getBetById(betId: string): Promise<PlayerBet | null>;
  getBettingStats(gameId: string): Promise<{ andarTotal: number; baharTotal: number; andarCount: number; baharCount: number }>;
  getUserBets(userId: string, limit?: number, offset?: number): Promise<PlayerBet[]>;
  getUserGameHistory(userId: string): Promise<any[]>;
  
  // Card operations
  dealCard(card: InsertDealtCard): Promise<DealtCard>;
  createDealtCard(card: InsertDealtCard): Promise<DealtCard>;
  getDealtCards(gameId: string): Promise<DealtCard[]>;
  updateDealtCard(cardId: string, updates: Partial<DealtCard>): Promise<void>;
  updateDealtCardForGame(gameId: string, cardId: string, updates: Partial<DealtCard>): Promise<void>;
  
  // Game history operations
  addGameHistory(history: InsertGameHistory): Promise<GameHistoryEntry>;
  saveGameHistory(history: InsertGameHistory): Promise<GameHistoryEntry>;
  getGameHistory(limit?: number): Promise<GameHistoryEntry[]>;
  
  // Settings operations
  getGameSettings(): Promise<{ 
    minBet: number; 
    maxBet: number; 
    timerDuration: number;
    default_deposit_bonus_percent: number;
    referral_bonus_percent: number;
    conditional_bonus_threshold: number;
  }>;
  updateGameSettings(settings: { minBet?: number; maxBet?: number; timerDuration?: number }): Promise<void>;
  getGameSetting(key: string): Promise<string | undefined>;
  updateGameSetting(key: string, value: string): Promise<void>;
  
  // Stream settings operations
  getStreamSettings(): Promise<StreamSettings[]>;
  updateStreamSetting(key: string, value: string): Promise<void>;
  getStreamConfig(): Promise<any>; // Legacy method for compatibility
  
  // Analytics methods
  saveGameStatistics(stats: Omit<GameStatistics, 'id' | 'createdAt'>): Promise<GameStatistics>;
  getGameStatistics(gameId: string): Promise<GameStatistics | null>;
  getGameStatisticsByDateRange(startDate: Date, endDate: Date): Promise<GameStatistics[]>;
  
  // Daily statistics
  getDailyStats(date: Date): Promise<DailyGameStatistics | null>;
  getDailyStatsByRange(startDate: Date, endDate: Date): Promise<DailyGameStatistics[]>;
  updateDailyStats(date: Date, updates: Partial<DailyGameStatistics>): Promise<void>;
  createDailyStats(stats: Omit<DailyGameStatistics, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  incrementDailyStats(date: Date, increments: Partial<DailyGameStatistics>): Promise<void>;
  
  // Monthly statistics
  getMonthlyStats(monthYear: string): Promise<MonthlyGameStatistics | null>;
  getMonthlyStatsByRange(startMonth: string, endMonth: string): Promise<MonthlyGameStatistics[]>;
  createMonthlyStats(stats: Omit<MonthlyGameStatistics, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  incrementMonthlyStats(monthYear: string, increments: Partial<MonthlyGameStatistics>): Promise<void>;
  
  // Yearly statistics
  getYearlyStats(year: number): Promise<YearlyGameStatistics | null>;
  getYearlyStatsByRange(startYear: number, endYear: number): Promise<YearlyGameStatistics[]>;
  createYearlyStats(stats: Omit<YearlyGameStatistics, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  incrementYearlyStats(year: number, increments: Partial<YearlyGameStatistics>): Promise<void>;
  
  // Aggregation methods
  getTodayStats(): Promise<DailyGameStatistics | null>;
  getMonthToDateStats(monthYear: string): Promise<MonthlyGameStatistics | null>;
  getYearToDateStats(year: number): Promise<YearlyGameStatistics | null>;
  getTodayGameCount(): Promise<number>;
  getTodayBetsTotal(): Promise<number>;
  getTodayUniquePlayers(): Promise<number>;
  
  // Bonus and referral methods
  addUserBonus(userId: string, bonusAmount: number, bonusType: string, referenceAmount?: number): Promise<void>;
  getUserBonusInfo(userId: string): Promise<{ depositBonus: number; referralBonus: number; totalBonus: number }>;
  resetUserBonus(userId: string): Promise<void>;
  updateUserOriginalDeposit(userId: string, depositAmount: number): Promise<void>;
  trackUserReferral(referrerId: string, referredId: string, depositAmount: number, bonusAmount: number): Promise<void>;
  getUserReferrals(userId: string): Promise<UserReferral[]>;
  checkAndApplyReferralBonus(userId: string, depositAmount: number): Promise<void>;
  applyConditionalBonus(userId: string): Promise<boolean>;
  addTransaction(transaction: {
    userId: string;
    transactionType: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceId?: string;
    description?: string;
  }): Promise<void>;
  
  // Payment request methods
  createPaymentRequest(request: {
    userId: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    paymentMethod: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
  }): Promise<any>;
  getPaymentRequest(requestId: string): Promise<any | null>;
  getPaymentRequestsByUser(userId: string): Promise<any[]>;
  getPendingPaymentRequests(): Promise<any[]>;
  updatePaymentRequest(requestId: string, status: string, adminId?: string): Promise<void>;
  approvePaymentRequest(requestId: string, userId: string, amount: number, adminId: string): Promise<void>;
  
  // Bonus analytics methods
  getBonusAnalytics(period: string): Promise<any>;
  getReferralAnalytics(period: string): Promise<any>;
}

export class SupabaseStorage implements IStorage {
  // Helper function to convert decimal balance to number - now using shared utility
  private parseBalance(balance: any): number {
    return parseBalance(balance);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return undefined;
          }
          throw error;
        }

        // Convert balance to number to fix type inconsistency
        if (data && data.balance) {
          data.balance = this.parseBalance(data.balance) as any;
        }
        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get user ${id}:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting user after all retries:', lastError);
    return undefined;
  }

  async getUserByUsername(identifier: string): Promise<User | undefined> {
    // For backward compatibility, search by phone number
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('users')
          .select('*')
          .eq('phone', identifier)  // Search by phone field
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return undefined;
          }
          throw error;
        }

        // Convert balance to number
        if (data && data.balance) {
          data.balance = this.parseBalance(data.balance) as any;
        }
        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get user by identifier ${identifier}:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting user by identifier after all retries:', lastError);
    console.log('Searching for identifier:', identifier);
    return undefined;
  }

  // New method for phone-based user lookup
  async getUserByPhone(phone: string): Promise<User | undefined> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('users')
          .select('*')
          .eq('phone', phone)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return undefined;
          }
          throw error;
        }

        // Convert balance to number
        if (data && data.balance) {
          data.balance = this.parseBalance(data.balance) as any;
        }
        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get user by phone ${phone}:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting user by phone after all retries:', lastError);
    return undefined;
  }

  // New method for referral code-based user lookup
  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('users')
          .select('*')
          .eq('referral_code_generated', referralCode)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return undefined;
          }
          throw error;
        }

        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get user by referral code ${referralCode}:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting user by referral code after all retries:', lastError);
    return undefined;
  }

  // New method for admin authentication
  async getAdminByUsername(username: string): Promise<any | undefined> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('admin_credentials')
          .select('*')
          .eq('username', username)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return undefined;
          }
          throw error;
        }

        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get admin by username ${username}:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting admin by username after all retries:', lastError);
    return undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return undefined;
          }
          throw error;
        }

        // Convert balance to number
        if (data && data.balance) {
          data.balance = this.parseBalance(data.balance) as any;
        }
        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get user by ID ${id}:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting user by ID after all retries:', lastError);
    return undefined;
  }

  async getAllUsers(): Promise<User[]> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Convert balance to number for all users
        if (data && Array.isArray(data)) {
          data.forEach(user => {
            if (user.balance) {
              user.balance = this.parseBalance(user.balance) as any;
            }
          });
        }
        return data || [];
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get all users:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting all users after all retries:', lastError);
    return [];
  }

  // Update createUser to use phone as ID with configurable default balance
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = (insertUser as any).phone || 'anonymous'; // Use phone number as ID
    
    // Get default balance from environment - use 0.00 if not set
    const defaultBalance = process.env.DEFAULT_BALANCE || "0.00";
    
    const user = {
      id,
      phone: insertUser.phone,
      password_hash: insertUser.password_hash,
      full_name: insertUser.full_name || (insertUser as any).name || insertUser.phone,
      role: insertUser.role || (insertUser as any).role || 'player',
      status: insertUser.status || (insertUser as any).status || 'active',
      balance: insertUser.balance ? insertUser.balance.toString() : defaultBalance,
      total_winnings: insertUser.total_winnings ? insertUser.total_winnings.toString() : "0.00",
      total_losses: insertUser.total_losses ? insertUser.total_losses.toString() : "0.00",
      games_played: insertUser.games_played || 0,
      games_won: insertUser.games_won || 0,
      phone_verified: insertUser.phone_verified || false,
      referral_code: insertUser.referral_code || (insertUser as any).referral_code || null,
      referral_code_generated: null, // Will be generated later
      original_deposit_amount: insertUser.original_deposit_amount ? insertUser.original_deposit_amount.toString() : defaultBalance,
      deposit_bonus_available: insertUser.deposit_bonus_available ? insertUser.deposit_bonus_available.toString() : "0.00",
      referral_bonus_available: insertUser.referral_bonus_available ? insertUser.referral_bonus_available.toString() : "0.00",
      total_bonus_earned: insertUser.total_bonus_earned ? insertUser.total_bonus_earned.toString() : "0.00",
      last_login: insertUser.last_login || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseServer
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      // Check for specific error types
      if (error.code === '23505') { // Unique violation
        throw new Error('User with this phone number already exists');
      }
      throw error;
    }

    // After creating the user, generate a referral code for them
    try {
      const { data: genResult } = await supabaseServer.rpc('generate_referral_code', {
        p_user_id: data.id
      });
      console.log(`Generated referral code for user ${data.id}:`, genResult);
    } catch (referralError) {
      console.error('Error generating referral code:', referralError);
      // Don't fail the entire operation for referral code generation
    }

    return data;
  }

  async updateUserBalance(userId: string, amountChange: number): Promise<void> {
    // Skip database update for anonymous users
    if (userId === 'anonymous') {
      console.log('⚠️ Skipping balance update for anonymous user');
      return;
    }
    
    // 🔒 SECURITY FIX: Use atomic balance update to prevent race conditions
    try {
      const { data, error } = await supabaseServer.rpc('update_balance_atomic', {
        p_user_id: userId,
        p_amount_change: amountChange
      });

      if (error) {
        console.error('❌ Atomic balance update failed:', error);
        
        // Check for specific error types
        if (error.message?.includes('User not found')) {
          throw new Error('User not found');
        }
        if (error.message?.includes('Insufficient balance')) {
          throw new Error('Insufficient balance');
        }
        
        throw new Error('Failed to update user balance');
      }

      // Log successful update
      if (data !== null) {
        console.log(`✅ Balance updated atomically for user ${userId}: ${data.new_balance}`);
      }
    } catch (error: any) {
      console.error('Error in updateUserBalance:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: any): Promise<User> {
    const { data, error} = await supabaseServer
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }

    return data;
  }

  async updateUserGameStats(userId: string, won: boolean, betAmount: number, payoutAmount: number): Promise<void> {
    try {
      // Get current user stats
      const user = await this.getUser(userId);
      if (!user) {
        console.error(`User ${userId} not found for stats update`);
        return;
      }

      // Calculate new values
      const gamesPlayed = (user.games_played || 0) + 1;
      const gamesWon = won ? (user.games_won || 0) + 1 : (user.games_won || 0);
      
      // For winnings/losses: track the profit/loss, not the payout
      const profitLoss = payoutAmount - betAmount;
      const totalWinnings = profitLoss > 0 
        ? (parseFloat(user.total_winnings as any) || 0) + profitLoss 
        : (parseFloat(user.total_winnings as any) || 0);
      const totalLosses = profitLoss < 0 
        ? (parseFloat(user.total_losses as any) || 0) + Math.abs(profitLoss)
        : (parseFloat(user.total_losses as any) || 0);

      // Update user statistics
      const { error } = await supabaseServer
        .from('users')
        .update({
          games_played: gamesPlayed,
          games_won: gamesWon,
          total_winnings: totalWinnings.toString(),
          total_losses: totalLosses.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error(`Error updating game stats for user ${userId}:`, error);
        throw error;
      }

      console.log(`✅ Updated game stats for user ${userId}: Games ${gamesPlayed}, Won ${gamesWon}, Winnings ${totalWinnings}, Losses ${totalLosses}`);
    } catch (error) {
      console.error('Error in updateUserGameStats:', error);
      // Don't throw - we don't want to break the game flow if stats update fails
    }
  }

  // Game session operations
  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const gameId = randomUUID();
    const now = new Date();
    // Use snake_case column names to match database schema exactly
    const gameSession = {
      game_id: gameId,
      opening_card: session.openingCard || null,
      phase: session.phase || 'idle',
      current_timer: session.currentTimer || 30,
      current_round: (session as any).round || 1,
      andar_cards: [],
      bahar_cards: [],
      status: 'active',
      winner: null,
      winning_card: null,
      winning_round: null,
      total_andar_bets: 0,
      total_bahar_bets: 0,
      total_payouts: 0,
      started_at: now,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabaseServer
        .from('game_sessions')
        .insert(gameSession)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error creating game session:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details,
        });
        throw error;
      }

      return data;
    } catch (error: any) {
      // Network or connection errors
      if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.error('🔴 Network error connecting to Supabase:', {
          message: error.message,
          code: error.code,
          cause: error.cause?.message,
        });
        console.warn('⚠️ Cannot reach Supabase database - check your internet connection');
        console.warn('⚠️ Ensure Supabase URL is accessible:', process.env.SUPABASE_URL);
      }
      throw error;
    }
  }

  async getCurrentGameSession(): Promise<GameSession | undefined> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('game_sessions')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return undefined;
          }
          throw error;
        }

        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get current game session:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting current game session after all retries:', lastError);
    return undefined;
  }

  async getGameSession(gameId: string): Promise<GameSession | undefined> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('game_sessions')
          .select('*')
          .eq('game_id', gameId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return undefined;
          }
          throw error;
        }

        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get game session ${gameId}:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting game session after all retries:', lastError);
    return undefined;
  }

  async updateGameSession(gameId: string, updates: Partial<GameSession>): Promise<void> {
    // Use snake_case to match database schema exactly
    const dbUpdates: any = {
      updated_at: new Date()
    };
    
    if (updates.phase) dbUpdates.phase = updates.phase;
    if ((updates as any).round !== undefined) dbUpdates.current_round = (updates as any).round;
    if (updates.currentTimer !== undefined) dbUpdates.current_timer = updates.currentTimer;
    if (updates.openingCard !== undefined) dbUpdates.opening_card = updates.openingCard;
    if (updates.winner !== undefined) dbUpdates.winner = updates.winner;
    if (updates.winningCard !== undefined) dbUpdates.winning_card = updates.winningCard;
    if ((updates as any).winningRound !== undefined) dbUpdates.winning_round = (updates as any).winningRound;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabaseServer
      .from('game_sessions')
      .update(dbUpdates)
      .eq('game_id', gameId);

    if (error) {
      console.error('Error updating game session:', error);
      throw error;
    }
  }

  async completeGameSession(gameId: string, winner: string, winningCard: string): Promise<void> {
    const { error } = await supabaseServer
      .from('game_sessions')
      .update({
        status: 'completed',
        phase: 'complete',
        winner,
        winning_card: winningCard,
        updated_at: new Date()
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error completing game session:', error);
      throw error;
    }
  }

  // Betting operations
  async placeBet(bet: InsertBet): Promise<PlayerBet> {
    const id = randomUUID();
    const now = new Date();
    const playerBet = {
      id,
      user_id: bet.userId,
      game_id: bet.gameId,
      round: bet.round,
      side: bet.side,
      amount: bet.amount,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabaseServer
      .from('player_bets')
      .insert(playerBet)
      .select()
      .single();

    if (error) {
      console.error('Error placing bet:', error);
      throw error;
    }

    return data;
  }

  async createBet(bet: InsertBet): Promise<PlayerBet> {
    const { data, error } = await supabaseServer
      .from('player_bets')
      .insert({
        id: randomUUID(),
        ...bet,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bet:', error);
      throw new Error('Failed to create bet');
    }

    return data;
  }

  async getBetsForGame(gameId: string): Promise<PlayerBet[]> {
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select('*')
      .eq('game_id', gameId);

    if (error) {
      console.error('Error getting bets for game:', error);
      return [];
    }

    return data || [];
  }

  async getBetsForUser(userId: string, gameId: string): Promise<PlayerBet[]> {
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId);

    if (error) {
      console.error('Error getting bets for user:', error);
      return [];
    }

    return data || [];
  }

  async updateBetStatus(betId: string, status: string): Promise<void> {
    const { error } = await supabaseServer
      .from('player_bets')
      .update({ status, updated_at: new Date() })
      .eq('id', betId);

    if (error) {
      console.error('Error updating bet status:', error);
      throw error;
    }
  }

  async updateBetStatusByGameUser(gameId: string, userId: string, side: string, status: string): Promise<void> {
    // Skip database update for anonymous users
    if (userId === 'anonymous') {
      console.log('⚠️ Skipping bet status update for anonymous user');
      return;
    }
    
    const { error } = await supabaseServer
      .from('player_bets')
      .update({ status, updated_at: new Date() }) // Use snake_case
      .eq('game_id', gameId) // Use snake_case
      .eq('user_id', userId) // Use snake_case
      .eq('side', side);

    if (error) {
      console.error('Error updating bet status:', error);
      throw new Error('Failed to update bet status');
    }
  }

  async updateBetDetails(betId: string, updates: Partial<UpdateBet>): Promise<void> {
    const { error } = await supabaseServer
      .from('player_bets')
      .update({
        ...updates,
        updated_at: new Date()
      })
      .eq('id', betId);

    if (error) {
      console.error('Error updating bet details:', error);
      throw error;
    }
  }

  async updateUserBetInGame(userId: string, gameId: string, round: string, oldSide: string, newSide: string, newAmount: number): Promise<void> {
    // Skip database update for anonymous users
    if (userId === 'anonymous') {
      console.log('⚠️ Skipping bet update for anonymous user');
      return;
    }
    
    // Update the specific bet
    const { error } = await supabaseServer
      .from('player_bets')
      .update({
        side: newSide,
        amount: newAmount.toString(),
        updated_at: new Date()
      })
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('round', round)
      .eq('side', oldSide);

    if (error) {
      console.error('Error updating user bet in game:', error);
      throw error;
    }
  }

  async getActiveBetsForGame(gameId: string): Promise<PlayerBet[]> {
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select(`
        *,
        user:users(phone, full_name)
      `)
      .eq('game_id', gameId)
      .in('status', ['active', 'pending']); // Only active/pending bets

    if (error) {
      console.error('Error getting active bets for game:', error);
      return [];
    }

    return data || [];
  }

  async getBetById(betId: string): Promise<PlayerBet | null> {
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select('*')
      .eq('id', betId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found is ok
        console.error('Error getting bet by id:', error);
      }
      return null;
    }

    return data;
  }

  async getBettingStats(gameId: string): Promise<{ andarTotal: number; baharTotal: number; andarCount: number; baharCount: number }> {
    const bets = await this.getBetsForGame(gameId);
    const andarBets = bets.filter(b => b.side === 'andar');
    const baharBets = bets.filter(b => b.side === 'bahar');
    
    return {
      andarTotal: andarBets.reduce((sum, b) => sum + parseFloat(b.amount), 0),
      baharTotal: baharBets.reduce((sum, b) => sum + parseFloat(b.amount), 0),
      andarCount: andarBets.length,
      baharCount: baharBets.length,
    };
  }

  // Card operations
  async dealCard(card: InsertDealtCard): Promise<DealtCard> {
    const id = randomUUID();
    const dealtCard = {
      id,
      game_id: card.gameId,
      card: card.card,
      side: card.side,
      position: card.position,
      is_winning_card: card.isWinningCard || false,
      created_at: new Date(),
    };

    const { data, error } = await supabaseServer
      .from('dealt_cards')
      .insert(dealtCard)
      .select()
      .single();

    if (error) {
      console.error('Error dealing card:', error);
      throw error;
    }

    return data;
  }

  async createDealtCard(card: InsertDealtCard): Promise<DealtCard> {
    const { data, error } = await supabaseServer
      .from('dealt_cards')
      .insert({
        id: randomUUID(),
        game_id: card.gameId,
        card: card.card,
        side: card.side,
        position: card.position,
        is_winning_card: card.isWinningCard || false,
        dealt_at: new Date(),
        created_at: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating dealt card:', error);
      throw new Error('Failed to create dealt card');
    }

    return data;
  }

  async getDealtCards(gameId: string): Promise<DealtCard[]> {
    const { data, error } = await supabaseServer
      .from('dealt_cards')
      .select('*')
      .eq('game_id', gameId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error getting dealt cards:', error);
      return [];
    }

    return data || [];
  }

  async updateDealtCard(cardId: string, updates: Partial<DealtCard>): Promise<void> {
    const { error } = await supabaseServer
      .from('dealt_cards')
      .update(updates)
      .eq('id', cardId);

    if (error) {
      console.error('Error updating dealt card:', error);
      throw error;
    }
  }

  async updateDealtCardForGame(gameId: string, cardId: string, updates: Partial<DealtCard>): Promise<void> {
    const { error } = await supabaseServer
      .from('dealt_cards')
      .update(updates)
      .eq('id', cardId)
      .eq('game_id', gameId);

    if (error) {
      console.error('Error updating dealt card for game:', error);
      throw error;
    }
  }

  // Game history operations
  async addGameHistory(history: InsertGameHistory): Promise<GameHistoryEntry> {
    const id = randomUUID();
    const entry = {
      id,
      game_id: history.gameId,
      opening_card: history.openingCard,
      winner: history.winner,
      winning_card: history.winningCard,
      total_cards: history.totalCards,
      round: (history as any).round,
      created_at: new Date(),
    };

    const { data, error } = await supabaseServer
      .from('game_history')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('Error adding game history:', error);
      throw error;
    }

    return data;
  }

  async saveGameHistory(history: InsertGameHistory): Promise<GameHistoryEntry> {
    // Convert camelCase to snake_case for Supabase
    const { data, error } = await supabaseServer
      .from('game_history')
      .insert({
        id: randomUUID(),
        game_id: history.gameId,
        opening_card: history.openingCard,
        winner: history.winner,
        winning_card: history.winningCard,
        total_cards: history.totalCards,
        round: (history as any).round,
        created_at: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving game history:', error);
      throw new Error('Failed to save game history');
    }

    return data;
  }

  async getGameHistory(limit: number = 50): Promise<GameHistoryEntry[]> {
    const { data, error } = await supabaseServer
      .from('game_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting game history:', error);
      return [];
    }

    return data || [];
  }

  async getUserBets(userId: string, limit: number = 50, offset: number = 0): Promise<PlayerBet[]> {
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1); // Supabase uses inclusive range

    if (error) {
      console.error('Error getting user bets:', error);
      return [];
    }

    return data || [];
  }

  async getUserGameHistory(userId: string): Promise<any[]> {
    // Use the user_game_history_view to get complete game history with total_cards
    const { data, error } = await supabaseServer
      .from('user_game_history_view')
      .select('*')
      .eq('user_id', userId)
      .order('bet_created_at', { ascending: false });

    if (error) {
      console.error('Error getting user game history:', error);
      return [];
    }

    // Transform the data to match the expected format
    return (data || []).map((bet: any) => ({
      id: bet.bet_id,
      gameId: bet.game_id,
      openingCard: bet.opening_card,
      winner: bet.winner,
      yourBet: {
        side: bet.bet_side,
        amount: bet.bet_amount,
        round: bet.bet_round
      },
      result: bet.winner === bet.bet_side ? 'win' : 'loss',
      payout: bet.winner === bet.bet_side ? parseFloat(bet.bet_amount) * 2 : 0,
      totalCards: bet.total_cards || 0, // Now correctly gets total_cards from game_history
      round: bet.game_round || 1,
      createdAt: bet.bet_created_at
    }));
  }
  
  // Settings operations
  async getGameSettings(): Promise<{
    minBet: number;
    maxBet: number;
    timerDuration: number;
    default_deposit_bonus_percent: number;
    referral_bonus_percent: number;
    conditional_bonus_threshold: number;
  }> {
    // Get bonus settings from game_settings table
    const defaultDepositBonusPercent = await this.getGameSetting('default_deposit_bonus_percent');
    const referralBonusPercent = await this.getGameSetting('referral_bonus_percent');
    const conditionalBonusThreshold = await this.getGameSetting('conditional_bonus_threshold');
    
    return {
      minBet: 1000,
      maxBet: 100000,
      timerDuration: 30,
      default_deposit_bonus_percent: parseFloat(defaultDepositBonusPercent || '5'),
      referral_bonus_percent: parseFloat(referralBonusPercent || '1'),
      conditional_bonus_threshold: parseFloat(conditionalBonusThreshold || '30')
    };
  }

  async updateGameSettings(settings: { minBet?: number; maxBet?: number; timerDuration?: number }): Promise<void> {
    // For simplicity, just update the defaults
    // In practice, you'd store these in a settings table
    console.log('Game settings updated:', settings);
  }

  async getGameSetting(key: string): Promise<string | undefined> {
    const { data, error } = await supabaseServer
      .from('game_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single();

    if (error) {
      console.error('Error getting game setting:', error);
      return undefined;
    }

    return data?.setting_value;
  }

  async updateGameSetting(key: string, value: string): Promise<void> {
    const { error } = await supabaseServer
      .from('game_settings')
      .upsert({ setting_key: key, setting_value: value });

    if (error) {
      console.error('Error updating game setting:', error);
      throw error;
    }
  }

  // Stream settings operations
  async getStreamSettings(): Promise<StreamSettings[]> {
    const { data, error } = await supabaseServer
      .from('stream_settings')
      .select('*');

    if (error) {
      console.error('Error getting stream settings:', error);
      return [];
    }

    // Convert snake_case from database to camelCase for TypeScript interface
    return (data || []).map((setting: any) => ({
      settingKey: setting.setting_key,
      settingValue: setting.setting_value,
      description: setting.description
    }));
  }

  async updateStreamSetting(key: string, value: string): Promise<void> {
    console.log(`🔄 Updating stream setting: ${key} = ${value}`);
    
    const { error } = await supabaseServer
      .from('stream_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('❌ Error updating stream setting:', error);
      throw error;
    } else {
      console.log(`✅ Successfully saved to database: ${key} = ${value}`);
    }
  }

  // Legacy method for compatibility - returns unified stream configuration
  async getStreamConfig(): Promise<any> {
    try {
      const streamSettings = await this.getStreamSettings();
      
      // Build configuration from settings with defaults
      const settingsMap = new Map(streamSettings.map(s => [s.settingKey, s.settingValue]));
      
      return {
        activeMethod: settingsMap.get('active_method') || 'none',
        streamStatus: settingsMap.get('stream_status') || 'offline',
        streamTitle: settingsMap.get('stream_title') || 'Andar Bahar Live',
        rtmpServerUrl: settingsMap.get('rtmp_server_url') || '',
        rtmpStreamKey: settingsMap.get('rtmp_stream_key') || '',
        webrtcResolution: settingsMap.get('webrtc_resolution') || '1280x720',
        webrtcFps: parseInt(settingsMap.get('webrtc_fps') || '30'),
        webrtcBitrate: parseInt(settingsMap.get('webrtc_bitrate') || '2500'),
        streamWidth: parseInt(settingsMap.get('stream_width') || '1280'),
        streamHeight: parseInt(settingsMap.get('stream_height') || '720'),
        showStream: settingsMap.get('show_stream') === 'true',
        viewerCount: parseInt(settingsMap.get('viewer_count') || '0'),
        rtmpLastCheck: settingsMap.get('rtmp_last_check') || null,
        webrtcLastCheck: settingsMap.get('webrtc_last_check') || null,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting stream config:', error);
      return null;
    }
  }

  // Analytics methods implementation
  async saveGameStatistics(stats: Omit<GameStatistics, 'id' | 'createdAt'>): Promise<GameStatistics> {
    const { data, error } = await supabaseServer
      .from('game_statistics')
      .insert({
        game_id: stats.gameId,
        total_players: stats.totalPlayers,
        total_bets: stats.totalBets,
        total_winnings: stats.totalWinnings,
        house_earnings: stats.houseEarnings,
        andar_bets_count: stats.andarBetsCount,
        bahar_bets_count: stats.baharBetsCount,
        andar_total_bet: stats.andarTotalBet,
        bahar_total_bet: stats.baharTotalBet,
        profit_loss: stats.profitLoss,
        profit_loss_percentage: stats.profitLossPercentage,
        house_payout: stats.housePayout,
        game_duration: stats.gameDuration || 0,
        unique_players: stats.uniquePlayers || 0,
        created_at: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving game statistics:', error);
      throw new Error('Failed to save game statistics');
    }

    return data as GameStatistics;
  }

  async getGameStatistics(gameId: string): Promise<GameStatistics | null> {
    const { data, error } = await supabaseServer
      .from('game_statistics')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting game statistics:', error);
      return null;
    }

    return data as GameStatistics;
  }

  async getGameStatisticsByDateRange(startDate: Date, endDate: Date): Promise<GameStatistics[]> {
    const { data, error } = await supabaseServer
      .from('game_statistics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting game statistics by date range:', error);
      return [];
    }

    return data as GameStatistics[] || [];
  }

  // Daily statistics methods
  async getDailyStats(date: Date): Promise<DailyGameStatistics | null> {
    const dateStr = date.toISOString().split('T')[0];
    const { data, error } = await supabaseServer
      .from('daily_game_statistics')
      .select('*')
      .eq('date', dateStr)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting daily stats:', error);
      return null;
    }

    return data as DailyGameStatistics;
  }

  async getDailyStatsByRange(startDate: Date, endDate: Date): Promise<DailyGameStatistics[]> {
    const { data, error } = await supabaseServer
      .from('daily_game_statistics')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error getting daily stats by range:', error);
      return [];
    }

    return data as DailyGameStatistics[] || [];
  }

  async createDailyStats(stats: Omit<DailyGameStatistics, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const { error } = await supabaseServer
      .from('daily_game_statistics')
      .insert({
        date: stats.date,
        total_games: stats.totalGames,
        total_bets: stats.totalBets,
        total_payouts: stats.totalPayouts,
        total_revenue: stats.totalRevenue,
        profit_loss: stats.profitLoss,
        profit_loss_percentage: stats.profitLossPercentage,
        unique_players: stats.uniquePlayers,
        peak_bets_hour: stats.peakBetsHour,
        created_at: new Date(),
        updated_at: new Date()
      });

    if (error) {
      console.error('Error creating daily stats:', error);
      throw error;
    }
  }

  async updateDailyStats(date: Date, updates: Partial<DailyGameStatistics>): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];
    const { error } = await supabaseServer
      .from('daily_game_statistics')
      .update({
        ...updates,
        updated_at: new Date()
      })
      .eq('date', dateStr);

    if (error) {
      console.error('Error updating daily stats:', error);
      throw error;
    }
  }

  async incrementDailyStats(date: Date, increments: Partial<DailyGameStatistics>): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if record exists
    let existing = await this.getDailyStats(date);
    
    if (existing) {
      // Update existing record
      const { error } = await supabaseServer
        .from('daily_game_statistics')
        .update({
          total_games: existing.totalGames + (increments.totalGames || 0),
          total_bets: existing.totalBets + (increments.totalBets || 0),
          total_payouts: existing.totalPayouts + (increments.totalPayouts || 0),
          total_revenue: existing.totalRevenue + (increments.totalRevenue || 0),
          profit_loss: existing.profitLoss + (increments.profitLoss || 0),
          unique_players: existing.uniquePlayers + (increments.uniquePlayers || 0),
          updated_at: new Date()
        })
        .eq('date', dateStr);
      
      if (error) {
        console.error('Error updating daily stats:', error);
        throw error;
      }
    } else {
      // Create new record
      await this.createDailyStats({
        date,
        totalGames: increments.totalGames || 0,
        totalBets: increments.totalBets || 0,
        totalPayouts: increments.totalPayouts || 0,
        totalRevenue: increments.totalRevenue || 0,
        profitLoss: increments.profitLoss || 0,
        profitLossPercentage: increments.profitLossPercentage || 0,
        uniquePlayers: increments.uniquePlayers || 0,
        peakBetsHour: increments.peakBetsHour || 0
      });
    }
  }

  // Monthly statistics methods
  async getMonthlyStats(monthYear: string): Promise<MonthlyGameStatistics | null> {
    const { data, error } = await supabaseServer
      .from('monthly_game_statistics')
      .select('*')
      .eq('month_year', monthYear)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting monthly stats:', error);
      return null;
    }

    return data as MonthlyGameStatistics;
  }

  async getMonthlyStatsByRange(startMonth: string, endMonth: string): Promise<MonthlyGameStatistics[]> {
    const { data, error } = await supabaseServer
      .from('monthly_game_statistics')
      .select('*')
      .gte('month_year', startMonth)
      .lte('month_year', endMonth)
      .order('month_year', { ascending: false });

    if (error) {
      console.error('Error getting monthly stats by range:', error);
      return [];
    }

    return data as MonthlyGameStatistics[] || [];
  }

  async createMonthlyStats(stats: Omit<MonthlyGameStatistics, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const { error } = await supabaseServer
      .from('monthly_game_statistics')
      .insert({
        month_year: stats.monthYear,
        total_games: stats.totalGames,
        total_bets: stats.totalBets,
        total_payouts: stats.totalPayouts,
        total_revenue: stats.totalRevenue,
        profit_loss: stats.profitLoss,
        profit_loss_percentage: stats.profitLossPercentage,
        unique_players: stats.uniquePlayers,
        created_at: new Date(),
        updated_at: new Date()
      });

    if (error) {
      console.error('Error creating monthly stats:', error);
      throw error;
    }
  }

  async incrementMonthlyStats(monthYear: string, increments: Partial<MonthlyGameStatistics>): Promise<void> {
    // Check if record exists
    let existing = await this.getMonthlyStats(monthYear);
    
    if (existing) {
      // Update existing record
      const { error } = await supabaseServer
        .from('monthly_game_statistics')
        .update({
          total_games: existing.totalGames + (increments.totalGames || 0),
          total_bets: existing.totalBets + (increments.totalBets || 0),
          total_payouts: existing.totalPayouts + (increments.totalPayouts || 0),
          total_revenue: existing.totalRevenue + (increments.totalRevenue || 0),
          profit_loss: existing.profitLoss + (increments.profitLoss || 0),
          unique_players: existing.uniquePlayers + (increments.uniquePlayers || 0),
          updated_at: new Date()
        })
        .eq('month_year', monthYear);
      
      if (error) {
        console.error('Error updating monthly stats:', error);
        throw error;
      }
    } else {
      // Create new record
      await this.createMonthlyStats({
        monthYear,
        totalGames: increments.totalGames || 0,
        totalBets: increments.totalBets || 0,
        totalPayouts: increments.totalPayouts || 0,
        totalRevenue: increments.totalRevenue || 0,
        profitLoss: increments.profitLoss || 0,
        profitLossPercentage: increments.profitLossPercentage || 0,
        uniquePlayers: increments.uniquePlayers || 0
      });
    }
  }

  // Yearly statistics methods
  async getYearlyStats(year: number): Promise<YearlyGameStatistics | null> {
    const { data, error } = await supabaseServer
      .from('yearly_game_statistics')
      .select('*')
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting yearly stats:', error);
      return null;
    }

    return data as YearlyGameStatistics;
  }

  async getYearlyStatsByRange(startYear: number, endYear: number): Promise<YearlyGameStatistics[]> {
    const { data, error } = await supabaseServer
      .from('yearly_game_statistics')
      .select('*')
      .gte('year', startYear)
      .lte('year', endYear)
      .order('year', { ascending: false });

    if (error) {
      console.error('Error getting yearly stats by range:', error);
      return [];
    }

    return data as YearlyGameStatistics[] || [];
  }

  async createYearlyStats(stats: Omit<YearlyGameStatistics, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const { error } = await supabaseServer
      .from('yearly_game_statistics')
      .insert({
        year: stats.year,
        total_games: stats.totalGames,
        total_bets: stats.totalBets,
        total_payouts: stats.totalPayouts,
        total_revenue: stats.totalRevenue,
        profit_loss: stats.profitLoss,
        profit_loss_percentage: stats.profitLossPercentage,
        unique_players: stats.uniquePlayers,
        created_at: new Date(),
        updated_at: new Date()
      });

    if (error) {
      console.error('Error creating yearly stats:', error);
      throw error;
    }
  }

  async incrementYearlyStats(year: number, increments: Partial<YearlyGameStatistics>): Promise<void> {
    // Check if record exists
    let existing = await this.getYearlyStats(year);
    
    if (existing) {
      // Update existing record
      const { error } = await supabaseServer
        .from('yearly_game_statistics')
        .update({
          total_games: existing.totalGames + (increments.totalGames || 0),
          total_bets: existing.totalBets + (increments.totalBets || 0),
          total_payouts: existing.totalPayouts + (increments.totalPayouts || 0),
          total_revenue: existing.totalRevenue + (increments.totalRevenue || 0),
          profit_loss: existing.profitLoss + (increments.profitLoss || 0),
          unique_players: existing.uniquePlayers + (increments.uniquePlayers || 0),
          updated_at: new Date()
        })
        .eq('year', year);
      
      if (error) {
        console.error('Error updating yearly stats:', error);
        throw error;
      }
    } else {
      // Create new record
      await this.createYearlyStats({
        year,
        totalGames: increments.totalGames || 0,
        totalBets: increments.totalBets || 0,
        totalPayouts: increments.totalPayouts || 0,
        totalRevenue: increments.totalRevenue || 0,
        profitLoss: increments.profitLoss || 0,
        profitLossPercentage: increments.profitLossPercentage || 0,
        uniquePlayers: increments.uniquePlayers || 0
      });
    }
  }

  // Aggregation methods
  async getTodayStats(): Promise<DailyGameStatistics | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await this.getDailyStats(today);
  }

  async getMonthToDateStats(monthYear: string): Promise<MonthlyGameStatistics | null> {
    return await this.getMonthlyStats(monthYear);
  }

  async getYearToDateStats(year: number): Promise<YearlyGameStatistics | null> {
    return await this.getYearlyStats(year);
  }

  async getTodayGameCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseServer
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', today)
      .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());
    
    if (error) {
      console.error('Error getting today\'s game count:', error);
      return 0;
    }
    
    return data?.length || 0;
  }

  async getTodayBetsTotal(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select('amount')
      .gte('created_at', today)
      .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());
    
    if (error) {
      console.error('Error getting today\'s bets total:', error);
      return 0;
    }
    
    return data?.reduce((sum, bet) => sum + parseFloat(bet.amount), 0) || 0;
  }

  async getTodayUniquePlayers(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select('user_id')
      .gte('created_at', today)
      .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());
    
    if (error) {
      console.error('Error getting today\'s unique players:', error);
      return 0;
    }
    
    // Get unique user IDs
    const uniqueUsers = new Set(data?.map(bet => bet.user_id) || []);
    return uniqueUsers.size;
  }

  // Bonus and referral methods implementation
  async addUserBonus(userId: string, bonusAmount: number, bonusType: string, referenceAmount?: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const bonusField = bonusType === 'deposit_bonus' ? 'deposit_bonus_available' : 'referral_bonus_available';
    
    const { error } = await supabaseServer
      .from('users')
      .update({
        [bonusField]: (parseFloat(user[bonusField as keyof typeof user] as string) || 0) + bonusAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error adding user bonus:', error);
      throw new Error('Failed to add user bonus');
    }
  }

  async getUserBonusInfo(userId: string): Promise<{ depositBonus: number; referralBonus: number; totalBonus: number }> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('users')
          .select('deposit_bonus_available, referral_bonus_available')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return { depositBonus: 0, referralBonus: 0, totalBonus: 0 };
          }
          throw error;
        }

        const depositBonus = parseFloat(data?.deposit_bonus_available || '0');
        const referralBonus = parseFloat(data?.referral_bonus_available || '0');
        
        return {
          depositBonus,
          referralBonus,
          totalBonus: depositBonus + referralBonus
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} failed to get user bonus info for ${userId}:`, error);
        
        // If it's a fetch failure, network error, or timeout, try again after a delay
        if (error.message?.includes('fetch failed') || 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError') {
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        } else {
          // If it's not a network error, don't retry
          break;
        }
      }
    }
    
    console.error('Error getting user bonus info after all retries:', lastError);
    return { depositBonus: 0, referralBonus: 0, totalBonus: 0 };
  }

  async resetUserBonus(userId: string): Promise<void> {
    const { error } = await supabaseServer
      .from('users')
      .update({
        deposit_bonus_available: 0,
        referral_bonus_available: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error resetting user bonus:', error);
      throw new Error('Failed to reset user bonus');
    }
  }

  async updateUserOriginalDeposit(userId: string, depositAmount: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Only set original deposit if it's not already set or if this is the first deposit
    const currentOriginal = parseFloat(user.original_deposit_amount || '0');
    if (currentOriginal === 0) {
      const { error } = await supabaseServer
        .from('users')
        .update({
          original_deposit_amount: depositAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating original deposit:', error);
        throw new Error('Failed to update original deposit');
      }
    }
  }

  async trackUserReferral(referrerId: string, referredId: string, depositAmount: number, bonusAmount: number): Promise<void> {
    const { error } = await supabaseServer
      .from('user_referrals')
      .upsert({
        referrer_user_id: referrerId,
        referred_user_id: referredId,
        deposit_amount: depositAmount,
        bonus_amount: bonusAmount,
        bonus_applied: true,
        bonus_applied_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'referred_user_id'
      });

    if (error) {
      console.error('Error tracking user referral:', error);
      throw new Error('Failed to track user referral');
    }
  }

  async getUserReferrals(userId: string): Promise<UserReferral[]> {
    const { data, error } = await supabaseServer
      .from('user_referrals')
      .select(`
        id,
        referrer_user_id,
        referred_user_id,
        deposit_amount,
        bonus_amount,
        bonus_applied,
        bonus_applied_at,
        created_at,
        updated_at
      `)
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user referrals:', error);
      return [];
    }

    // Manually fetch referred user details to avoid embedding conflicts
    const referrals = data || [];
    const referralsWithUserInfo = await Promise.all(
      referrals.map(async (referral) => {
        try {
          const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('id, phone, full_name, created_at')
            .eq('id', referral.referred_user_id)
            .single();

          return {
            ...referral,
            referred_user: userData || null
          };
        } catch (error) {
          console.error('Error fetching referred user details:', error);
          return {
            ...referral,
            referred_user: null
          };
        }
      })
    );

    return referralsWithUserInfo as UserReferral[] || [];
  }

  async checkAndApplyReferralBonus(userId: string, depositAmount: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user || !user.referral_code) {
      return; // No referral code used
    }

    // Find referrer
    const { data: referrerData, error: referrerError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('referral_code_generated', user.referral_code)
      .single();

    if (referrerError || !referrerData) {
      console.log('Referrer not found for code:', user.referral_code);
      return;
    }

    // Check if referral bonus already applied
    const { data: existingReferral } = await supabaseServer
      .from('user_referrals')
      .select('*')
      .eq('referred_user_id', userId)
      .single();

    if (existingReferral) {
      return; // Bonus already applied
    }

    // Get referral bonus percentage
    const referralBonusPercent = await this.getGameSetting('referral_bonus_percent') || '1';
    const bonusPercentage = parseFloat(referralBonusPercent);
    const bonusAmount = (depositAmount * bonusPercentage) / 100;

    // Add bonus to referrer
    await this.addUserBonus(referrerData.id, bonusAmount, 'referral_bonus', depositAmount);

    // Track referral relationship
    await this.trackUserReferral(referrerData.id, userId, depositAmount, bonusAmount);

    // Add transaction record for referrer
    await this.addTransaction({
      userId: referrerData.id,
      transactionType: 'bonus',
      amount: bonusAmount,
      balanceBefore: 0, // Will be calculated in addTransaction
      balanceAfter: 0,   // Will be calculated in addTransaction
      referenceId: `referral_bonus_${Date.now()}`,
      description: `Referral bonus for user ${userId} deposit of ₹${depositAmount}`
    });

    console.log(`Referral bonus of ₹${bonusAmount} applied to referrer ${referrerData.id}`);
  }

  async applyConditionalBonus(userId: string): Promise<boolean> {
    try {
      // Get user data
      const user = await this.getUserById(userId);
      if (!user) {
        console.log(`User ${userId} not found for conditional bonus check`);
        return false;
      }

      // Get conditional bonus threshold setting (default 30%)
      const thresholdSetting = await this.getGameSetting('conditional_bonus_threshold');
      const threshold = parseFloat(thresholdSetting || '30');

      // Get original deposit amount
      const originalDeposit = parseFloat(user.original_deposit_amount || '0');
      if (originalDeposit === 0) {
        console.log(`User ${userId} has no original deposit set`);
        return false;
      }

      // Get current balance
      const currentBalance = parseFloat(user.balance);

      // Calculate percentage change from original deposit
      const percentageChange = ((currentBalance - originalDeposit) / originalDeposit) * 100;
      
      console.log(`Conditional bonus check for user ${userId}:`, {
        originalDeposit,
        currentBalance,
        percentageChange: percentageChange.toFixed(2) + '%',
        threshold: `±${threshold}%`
      });

      // Check if balance has changed by ±threshold%
      const thresholdReached = Math.abs(percentageChange) >= threshold;
      
      if (!thresholdReached) {
        console.log(`Threshold not reached for user ${userId}`);
        return false;
      }

      // Get available bonus
      const bonusInfo = await this.getUserBonusInfo(userId);
      if (bonusInfo.totalBonus === 0) {
        console.log(`No bonus available for user ${userId}`);
        return false;
      }

      console.log(`✅ Conditional bonus threshold reached! Auto-applying ₹${bonusInfo.totalBonus} for user ${userId}`);

      // Auto-apply bonus to main balance
      const balanceBefore = currentBalance;
      await this.updateUserBalance(userId, bonusInfo.totalBonus);
      
      // Reset bonus amounts
      await this.resetUserBonus(userId);
      
      // Log the transaction
      await this.addTransaction({
        userId,
        transactionType: 'conditional_bonus_applied',
        amount: bonusInfo.totalBonus,
        balanceBefore,
        balanceAfter: balanceBefore + bonusInfo.totalBonus,
        referenceId: `conditional_bonus_${Date.now()}`,
        description: `Conditional bonus auto-applied (${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}% from original deposit)`
      });

      console.log(`✅ Conditional bonus of ₹${bonusInfo.totalBonus} applied to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error in applyConditionalBonus:', error);
      return false;
    }
  }

  async addTransaction(transaction: {
    userId: string;
    transactionType: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceId?: string;
    description?: string;
  }): Promise<void> {
    // Get current balance if not provided
    if (transaction.balanceBefore === 0 && transaction.balanceAfter === 0) {
      const user = await this.getUserById(transaction.userId);
      if (!user) {
        throw new Error('User not found');
      }
      transaction.balanceBefore = parseFloat(user.balance);
      transaction.balanceAfter = transaction.balanceBefore + transaction.amount;
    }

    const { error } = await supabaseServer
      .from('user_transactions')
      .insert({
        user_id: transaction.userId,
        transaction_type: transaction.transactionType,
        amount: transaction.amount,
        balance_before: transaction.balanceBefore,
        balance_after: transaction.balanceAfter,
        reference_id: transaction.referenceId,
        description: transaction.description,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error adding transaction:', error);
      throw new Error('Failed to add transaction');
    }
  }

  // Bonus analytics methods
  async getBonusAnalytics(period: string): Promise<any> {
    try {
      let startDate: Date;
      const endDate = new Date();
      
      switch (period) {
        case 'daily':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Get bonus transactions from user_transactions table
      const { data, error } = await supabaseServer
        .from('user_transactions')
        .select('*')
        .eq('transaction_type', 'bonus')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) {
        console.error('Error getting bonus analytics:', error);
        return {
          totalBonusGiven: 0,
          depositBonusGiven: 0,
          referralBonusGiven: 0,
          manualBonusGiven: 0,
          totalUsersReceivedBonus: 0,
          period
        };
      }
      
      // Calculate analytics
      const totalBonusGiven = data?.reduce((sum, txn) => sum + parseFloat(txn.amount), 0) || 0;
      const depositBonusGiven = data?.filter(txn => txn.description?.includes('Deposit bonus')).reduce((sum, txn) => sum + parseFloat(txn.amount), 0) || 0;
      const referralBonusGiven = data?.filter(txn => txn.description?.includes('Referral bonus')).reduce((sum, txn) => sum + parseFloat(txn.amount), 0) || 0;
      const manualBonusGiven = data?.filter(txn => txn.description?.includes('Manual')).reduce((sum, txn) => sum + parseFloat(txn.amount), 0) || 0;
      const totalUsersReceivedBonus = new Set(data?.map(txn => txn.user_id) || []).size;
      
      return {
        totalBonusGiven,
        depositBonusGiven,
        referralBonusGiven,
        manualBonusGiven,
        totalUsersReceivedBonus,
        period
      };
    } catch (error) {
      console.error('Error in getBonusAnalytics:', error);
      return {
        totalBonusGiven: 0,
        depositBonusGiven: 0,
        referralBonusGiven: 0,
        manualBonusGiven: 0,
        totalUsersReceivedBonus: 0,
        period
      };
    }
  }

  async getReferralAnalytics(period: string): Promise<any> {
    try {
      let startDate: Date;
      const endDate = new Date();
      
      switch (period) {
        case 'daily':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Get referral data from user_referrals table
      const { data, error } = await supabaseServer
        .from('user_referrals')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) {
        console.error('Error getting referral analytics:', error);
        return {
          totalReferrals: 0,
          totalReferralBonusGiven: 0,
          totalDepositsFromReferrals: 0,
          conversionRate: 0,
          period
        };
      }
      
      // Calculate analytics
      const totalReferrals = data?.length || 0;
      const totalReferralBonusGiven = data?.reduce((sum, referral) => sum + parseFloat(referral.bonus_amount || '0'), 0) || 0;
      const totalDepositsFromReferrals = data?.reduce((sum, referral) => sum + parseFloat(referral.deposit_amount || '0'), 0) || 0;
      
      return {
        totalReferrals,
        totalReferralBonusGiven,
        totalDepositsFromReferrals,
        conversionRate: totalReferrals > 0 ? (totalDepositsFromReferrals / totalReferrals) : 0,
        period
      };
    } catch (error) {
      console.error('Error in getReferralAnalytics:', error);
      return {
        totalReferrals: 0,
        totalReferralBonusGiven: 0,
        totalDepositsFromReferrals: 0,
        conversionRate: 0,
        period
      };
    }
  }

  // Payment request methods implementation
  async createPaymentRequest(request: {
    userId: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    paymentMethod: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
  }): Promise<any> {
    const { data, error } = await supabaseServer
      .from('payment_requests')
      .insert({
        user_id: request.userId,
        request_type: request.type,
        amount: request.amount,
        payment_method: request.paymentMethod,
        status: request.status,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment request:', error);
      throw new Error('Failed to create payment request');
    }

    return data;
  }

  async getPaymentRequest(requestId: string): Promise<any | null> {
    const { data, error } = await supabaseServer
      .from('payment_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found is ok
        console.error('Error getting payment request:', error);
      }
      return null;
    }

    return data;
  }

  async getPaymentRequestsByUser(userId: string): Promise<any[]> {
    const { data, error } = await supabaseServer
      .from('payment_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting payment requests for user:', error);
      return [];
    }

    return data || [];
  }

  async getPendingPaymentRequests(): Promise<any[]> {
    const { data, error } = await supabaseServer
      .from('payment_requests')
      .select(`
        *,
        user:users(phone, full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting pending payment requests:', error);
      return [];
    }

    return data || [];
  }

  async updatePaymentRequest(requestId: string, status: string, adminId?: string): Promise<void> {
    const updates: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    
    if (adminId) {
      updates.admin_id = adminId;
    }

    const { error } = await supabaseServer
      .from('payment_requests')
      .update(updates)
      .eq('id', requestId);

    if (error) {
      console.error('Error updating payment request:', error);
      throw new Error('Failed to update payment request');
    }
  }

  async approvePaymentRequest(requestId: string, userId: string, amount: number, adminId: string): Promise<void> {
    // Use database transaction to ensure atomic operation
    // Note: We'll assume the database has a stored procedure for atomic approval
    // In a real implementation, this would require a more complex atomic operation
    try {
      // Update the payment request status
      await this.updatePaymentRequest(requestId, 'approved', adminId);

      // For deposits: add to user balance
      if (amount > 0) {
        await this.updateUserBalance(userId, amount);
        
        // CRITICAL FIX: Apply deposit bonus when admin approves deposit
        try {
          const { applyDepositBonus } = await import('./payment');
          await applyDepositBonus(userId, amount);
          console.log(`✅ Deposit bonus applied for user ${userId} on admin-approved deposit of ₹${amount}`);
        } catch (bonusError) {
          console.error('⚠️ Failed to apply deposit bonus on approval:', bonusError);
          // Don't fail the approval if bonus fails
        }
      } 
      // For withdrawals: subtract from user balance (though this would be unusual for approval)
      else if (amount < 0) {
        await this.updateUserBalance(userId, amount);
      }
    } catch (error) {
      console.error('Error approving payment request:', error);
      throw new Error('Failed to approve payment request');
    }
  }
}

// Export a singleton instance for use throughout the application
export const storage: IStorage = new SupabaseStorage();

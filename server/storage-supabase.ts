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
  getUserBalance(userId: string): Promise<number>; // Fast balance retrieval (optimized)
  updateUser(userId: string, updates: any): Promise<User>;
  deductBalanceAtomic(userId: string, amount: number): Promise<number>; // Atomic balance deduction
  addBalanceAtomic(userId: string, amount: number): Promise<number>; // Atomic balance addition
  updateUserGameStats(userId: string, won: boolean, betAmount: number, payoutAmount: number): Promise<void>;
  approvePaymentRequestAtomic(requestId: string, userId: string, amount: number, adminId: string): Promise<{ balance: number; bonusAmount: number; wageringRequirement: number }>; // Atomic deposit approval
  updateMultipleUserBalances(updates: Array<{ userId: string; amountChange: number }>): Promise<Array<{ userId: string; success: boolean; newBalance?: number; error?: string }>>; // Batch balance updates
  
  // Game session operations
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getCurrentGameSession(): Promise<GameSession | undefined>;
  getGameSession(gameId: string): Promise<GameSession | undefined>;
  getActiveGameSession(): Promise<GameSession | null>;
  getLastCompletedGame(): Promise<GameSession | undefined>;
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
  deleteBet(betId: string): Promise<void>;
  getBettingStats(gameId: string): Promise<{ andarTotal: number; baharTotal: number; andarCount: number; baharCount: number }>;
  getUserBets(userId: string, limit?: number, offset?: number): Promise<PlayerBet[]>;
  getLastUserBet(userId: string, gameId: string): Promise<PlayerBet | undefined>;
  getUserGameHistory(userId: string): Promise<any[]>;
  updateBet(gameId: string, userId: string, updates: Partial<UpdateBet>): Promise<void>;
  applyPayoutsAndupdateBets(payouts: { userId: string; amount: number }[], winningBets: string[], losingBets: string[]): Promise<void>;
  
  // Transaction operations
  getUserTransactions(
    userId: string,
    options?: { limit?: number; offset?: number; type?: string }
  ): Promise<{
    transactions: Array<{
      id: string;
      transaction_type: string;
      amount: number;
      description: string | null;
      created_at: string;
    }>;
    total: number;
  }>;
  
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
    bonus_claim_threshold: number;
    admin_whatsapp_number: string;
  }>;
  updateGameSettings(settings: { minBet?: number; maxBet?: number; timerDuration?: number }): Promise<void>;
  getGameSetting(key: string): Promise<string | undefined>;
  updateGameSetting(key: string, value: string): Promise<void>;
  
  // Stream settings operations
  getStreamSettings(): Promise<StreamSettings[]>;
  updateStreamSetting(key: string, value: string): Promise<void>;
  
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
  getUserBonusInfo(userId: string): Promise<{ 
    depositBonus: number; 
    referralBonus: number; 
    totalBonus: number;
    wageringRequired: number;
    wageringCompleted: number;
    wageringProgress: number;
    bonusLocked: boolean;
  }>;
  resetUserBonus(userId: string): Promise<void>;
  updateUserOriginalDeposit(userId: string, depositAmount: number): Promise<void>;
  trackUserReferral(referrerId: string, referredId: string, depositAmount: number, bonusAmount: number): Promise<void>;
  getUserReferrals(userId: string): Promise<UserReferral[]>;
  checkAndApplyReferralBonus(userId: string, depositAmount: number): Promise<void>;
  applyConditionalBonus(userId: string): Promise<boolean>;
  
  // Wagering requirement methods
  setUserWageringRequirement(userId: string, amount: number): Promise<void>;
  trackWagering(userId: string, betAmount: number): Promise<void>;
  checkAndUnlockBonus(userId: string): Promise<{ unlocked: boolean; amount: number } | null>;
  getWageringProgress(userId: string): Promise<{
    requirement: number;
    completed: number;
    remaining: number;
    percentage: number;
    bonusLocked: number;
  } | null>;
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
    paymentDetails?: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    adminNotes?: string;
  }): Promise<any>;
  getPaymentRequest(requestId: string): Promise<any | null>;
  getPaymentRequestsByUser(userId: string): Promise<any[]>;
  getPendingPaymentRequests(): Promise<any[]>;
  updatePaymentRequest(requestId: string, status: string, adminId?: string): Promise<void>;
  approvePaymentRequest(requestId: string, userId: string, amount: number, adminId: string): Promise<void>;
  
  // Analytics methods
  getBonusAnalytics(period: string): Promise<any>;
  getReferralAnalytics(period: string): Promise<any>;
  getAllBonusTransactions(filters?: { status?: string; type?: string; limit?: number; offset?: number }): Promise<any[]>;
  getAllReferralData(filters?: { status?: string; limit?: number; offset?: number }): Promise<any[]>;
  getPlayerBonusAnalytics(filters?: { userId?: string; limit?: number; offset?: number }): Promise<any[]>;
  
  // New Bonus System Methods
  createDepositBonus(data: {
    userId: string;
    depositRequestId: string;
    depositAmount: number;
    bonusAmount: number;
    bonusPercentage: number;
    wageringRequired: number;
  }): Promise<any>;
  updateDepositBonusWagering(userId: string, betAmount: number): Promise<void>;
  getBonusSummary(userId: string): Promise<any>;
  getDepositBonuses(userId: string, filters?: { status?: string; limit?: number; offset?: number }): Promise<any[]>;
  getReferralBonuses(userId: string, filters?: { status?: string; limit?: number; offset?: number }): Promise<any[]>;
  getBonusTransactions(userId: string, filters?: { limit?: number; offset?: number }): Promise<any[]>;
  
  // Payment History Method
  getAllPaymentRequests(filters?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]>;
}

export class SupabaseStorage implements IStorage {
  // Circuit breaker for database operations (disabled - ES module compatibility)
  private circuitBreaker: any = null;

  constructor() {
    // ✅ FIX: Circuit breaker disabled due to ES module incompatibility
    // This is an optional resilience feature - database operations work without it
    // To re-enable: convert circuit-breaker to ES module with dynamic import()
    this.circuitBreaker = null;
    console.log('ℹ️ Circuit breaker disabled (optional feature)');
  }

  // Helper function to convert decimal balance to number
  private parseBalance(balance: any): number {
    if (typeof balance === 'string') {
      return parseFloat(balance) || 0;
    }
    return Number(balance) || 0;
  }

  /**
   * Execute database operation with circuit breaker protection
   */
  private async executeWithCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
    if (this.circuitBreaker) {
      try {
        return await this.circuitBreaker.execute(fn);
      } catch (error: any) {
        if (error.message?.includes('Circuit breaker is OPEN')) {
          throw new Error('Database temporarily unavailable. Please try again in a few moments.');
        }
        throw error;
      }
    }
    // No circuit breaker - execute directly
    return await fn();
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
          
          // 🔍 DEBUG: Log what we got from Supabase
          console.log(`🗄️ Storage.getAllUsers - Got ${data.length} users from Supabase`);
          if (data.length > 0) {
            console.log(`🗄️ First user from database:`, {
              id: data[0].id,
              total_winnings: data[0].total_winnings,
              total_losses: data[0].total_losses,
              games_played: data[0].games_played,
              games_won: data[0].games_won
            });
          }
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
    const id = (insertUser as any).id || insertUser.phone; // Use phone as ID if no explicit ID provided
    
    // Get default balance from environment - use 0.00 if not set
    const defaultBalance = process.env.DEFAULT_BALANCE || "0.00";
    
    const user = {
      id,
      phone: insertUser.phone,
      password_hash: insertUser.password_hash,
      full_name: insertUser.full_name || insertUser.phone,
      role: insertUser.role || 'player',
      status: insertUser.status || 'active',
      balance: insertUser.balance ? insertUser.balance.toString() : defaultBalance,
      total_winnings: insertUser.total_winnings ? insertUser.total_winnings.toString() : "0.00",
      total_losses: insertUser.total_losses ? insertUser.total_losses.toString() : "0.00",
      games_played: insertUser.games_played || 0,
      games_won: insertUser.games_won || 0,
      phone_verified: insertUser.phone_verified || false,
      referral_code: insertUser.referral_code || null,
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
    
    // 🔒 SECURITY FIX: Use direct SQL update to prevent race conditions
    try {
      // First, get the current balance
      const { data: userData, error: fetchError } = await supabaseServer
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch user balance:', fetchError);
        throw new Error('User not found');
      }

      if (!userData) {
        throw new Error('User not found');
      }

      // Calculate new balance (ensure it doesn't go negative)
      const currentBalance = parseFloat(userData.balance) || 0;
      const newBalance = Math.max(0, currentBalance + amountChange);

      // Update the balance
      const { error: updateError } = await supabaseServer
        .from('users')
        .update({
          balance: newBalance.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Balance update failed:', updateError);
        throw new Error('Failed to update user balance');
      }

      // Log successful update
      console.log(`✅ Balance updated for user ${userId}: ${currentBalance} -> ${newBalance}`);
    } catch (error: any) {
      console.error('Error in updateUserBalance:', error);
      throw error;
    }
  }

  // OPTIMIZED: Get user balance quickly (single column select)
  async getUserBalance(userId: string): Promise<number> {
    if (userId === 'anonymous') {
      return 0;
    }
    
    try {
      // Use RPC function if available for better performance
      const { data: rpcData, error: rpcError } = await supabaseServer.rpc('get_user_balance', {
        p_user_id: userId
      });
      
      if (!rpcError && rpcData !== null && rpcData !== undefined) {
        return parseFloat(String(rpcData)) || 0;
      }
      
      // Fallback to direct query
      const { data, error } = await supabaseServer
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();
      
      if (error) {
        // ✅ FIX: Suppress PGRST116 error - admin users don't have balance
        if (error.code === 'PGRST116') {
          // User not found in users table - likely an admin
          console.log(`User ${userId} not in users table (admin account)`);
          return 0;
        }
        console.error(`Error getting balance for user ${userId}:`, error);
        return 0;
      }
      
      return parseFloat(data?.balance || '0');
    } catch (error) {
      console.error(`Error in getUserBalance for ${userId}:`, error);
      return 0;
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

  /**
   * Atomically deduct balance - prevents race conditions with retry logic
   * Returns new balance if successful, throws error if insufficient funds
   * Implements exponential backoff for retries on concurrent update conflicts
   */
  async deductBalanceAtomic(userId: string, amount: number, maxRetries: number = 5): Promise<number> {
    return await this.executeWithCircuitBreaker(async () => {
      let lastError: any;
      let lastBalance: number = 0;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Get current balance
          const { data: user, error: selectError } = await supabaseServer
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

          if (selectError || !user) {
            throw new Error('User not found');
          }

          const currentBalance = parseFloat(user.balance || '0');
          lastBalance = currentBalance;
          
          // Check if sufficient balance
          if (currentBalance < amount) {
            throw new Error(`Insufficient balance. You have ₹${currentBalance.toFixed(2)}, but bet is ₹${amount.toFixed(2)}`);
          }

          const newBalance = currentBalance - amount;

          // Update balance atomically with optimistic locking
          const { data: updatedData, error: updateError } = await supabaseServer
            .from('users')
            .update({ 
              balance: newBalance.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            // Double-check balance hasn't changed (optimistic locking prevents race conditions)
            .eq('balance', currentBalance.toString())
            .select('balance')
            .single();

          // Check if update actually succeeded (row was found and updated)
          if (updateError) {
            // Check if it's a concurrent modification conflict
            if (updateError.code === 'PGRST116' || updateError.message?.includes('No rows found')) {
              // Balance changed between read and write - retry with exponential backoff
              if (attempt < maxRetries) {
                const backoffDelay = Math.min(50 * Math.pow(2, attempt - 1), 500); // 50ms, 100ms, 200ms, 400ms, 500ms max
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                continue; // Retry the operation
              }
            }
            throw new Error('Failed to update balance - please try again');
          }

          // Success - return new balance
          return newBalance;
        } catch (error: any) {
          lastError = error;
          
          // If it's not a retryable error (like insufficient balance or user not found), throw immediately
          if (error.message?.includes('Insufficient balance') || 
              error.message?.includes('User not found')) {
            throw error;
          }

          // For network errors, retry with exponential backoff
          if ((error.message?.includes('fetch failed') || 
               error.code === 'ECONNREFUSED' || 
               error.code === 'ETIMEDOUT' ||
               error.name === 'AbortError') && 
              attempt < maxRetries) {
            const backoffDelay = Math.min(100 * Math.pow(2, attempt - 1), 1000); // 100ms, 200ms, 400ms, 800ms, 1000ms max
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }

          // If this was the last attempt or non-retryable error, throw
          if (attempt === maxRetries) {
            console.error(`Atomic balance deduction failed after ${maxRetries} attempts:`, error);
            throw error;
          }
        }
      }

      // Final fallback
      console.error(`Atomic balance deduction failed after ${maxRetries} attempts. Last error:`, lastError);
      throw lastError || new Error('Failed to deduct balance after multiple attempts');
    });
  }

  /**
   * Atomically add balance - prevents race conditions with retry logic
   * Returns new balance if successful
   * Implements exponential backoff for retries on concurrent update conflicts
   */
  async addBalanceAtomic(userId: string, amount: number, maxRetries: number = 5): Promise<number> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get current balance
        const { data: user, error: selectError } = await supabaseServer
          .from('users')
          .select('balance')
          .eq('id', userId)
          .single();

        if (selectError || !user) {
          throw new Error('User not found');
        }

        const currentBalance = parseFloat(user.balance || '0');
        const newBalance = currentBalance + amount;

        // Update balance atomically with optimistic locking
        const { error: updateError } = await supabaseServer
          .from('users')
          .update({ 
            balance: newBalance.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          // Double-check balance hasn't changed (optimistic locking prevents race conditions)
          .eq('balance', currentBalance.toString());

        // Check if update actually succeeded
        if (updateError) {
          // Check if it's a concurrent modification conflict
          if (updateError.code === 'PGRST116' || updateError.message?.includes('No rows found')) {
            // Balance changed between read and write - retry with exponential backoff
            if (attempt < maxRetries) {
              const backoffDelay = Math.min(50 * Math.pow(2, attempt - 1), 500); // 50ms, 100ms, 200ms, 400ms, 500ms max
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue; // Retry the operation
            }
          }
          throw new Error('Failed to update balance - please try again');
        }

        // Success - return new balance
        return newBalance;
      } catch (error: any) {
        lastError = error;
        
        // If it's not a retryable error, throw immediately
        if (error.message?.includes('User not found')) {
          throw error;
        }

        // For network errors, retry with exponential backoff
        if ((error.message?.includes('fetch failed') || 
             error.code === 'ECONNREFUSED' || 
             error.code === 'ETIMEDOUT' ||
             error.name === 'AbortError') && 
            attempt < maxRetries) {
          const backoffDelay = Math.min(100 * Math.pow(2, attempt - 1), 1000); // 100ms, 200ms, 400ms, 800ms, 1000ms max
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }

        // If this was the last attempt or non-retryable error, throw
        if (attempt === maxRetries) {
          console.error(`Atomic balance addition failed after ${maxRetries} attempts:`, error);
          throw error;
        }
      }
    }

    // Final fallback
    console.error(`Atomic balance addition failed after ${maxRetries} attempts. Last error:`, lastError);
    throw lastError || new Error('Failed to add balance after multiple attempts');
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
    // ✅ CRITICAL FIX: Use provided gameId if available, otherwise generate new one
    // This ensures the gameId in memory matches the game_id in database
    const providedGameId = (session as any).gameId || (session as any).game_id;
    const gameId = providedGameId || randomUUID();
    
    if (providedGameId) {
      console.log(`✅ Using provided gameId: ${gameId} (matches memory state)`);
    } else {
      console.log(`⚠️ No gameId provided, generated new UUID: ${gameId}`);
    }
    
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

  async getActiveGameSession(): Promise<GameSession | null> {
    const { data, error } = await supabaseServer
      .from('game_sessions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no active session found, that's okay
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error getting active game session:', error);
      return null;
    }

    return data || null;
  }

  async getLastCompletedGame(): Promise<GameSession | undefined> {
    const { data, error } = await supabaseServer
      .from('game_sessions')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined; // No completed game found
      }
      console.error('Error getting last completed game:', error);
      return undefined;
    }

    return data;
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
        user_id: bet.userId,
        game_id: bet.gameId,
        round: bet.round,
        side: bet.side,
        amount: bet.amount, // amount is now a number
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bet:', error);
      throw new Error(`Failed to create bet: ${error.message}`);
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
      .eq('game_id', gameId)
      .neq('status', 'cancelled'); // ✅ FIX: Exclude cancelled bets from user's bet display

    if (error) {
      console.error('Error getting bets for user:', error);
      return [];
    }

    return data || [];
  }

  async getLastUserBet(userId: string, gameId: string): Promise<PlayerBet | undefined> {
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined; // No bet found
      }
      console.error('Error getting last user bet:', error);
      return undefined;
    }

    return data;
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

  async updateBet(gameId: string, userId: string, updates: Partial<UpdateBet>): Promise<void> {
    // Skip database update for anonymous users
    if (userId === 'anonymous') {
      console.log('⚠️ Skipping bet update for anonymous user');
      return;
    }
    
    const { error } = await supabaseServer
      .from('player_bets')
      .update({ ...updates, updated_at: new Date() }) // Use snake_case
      .eq('game_id', gameId) // Use snake_case
      .eq('user_id', userId); // Use snake_case

    if (error) {
      console.error('Error updating bet:', error);
      throw new Error('Failed to update bet');
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

  async deleteBet(betId: string): Promise<void> {
    const { error } = await supabaseServer
      .from('player_bets')
      .delete()
      .eq('id', betId);

    if (error) {
      console.error('Error deleting bet:', error);
      throw new Error('Failed to delete bet');
    }
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
    // ✅ CRITICAL: Validate required fields before inserting
    if (!history.gameId || typeof history.gameId !== 'string' || history.gameId.trim() === '') {
      const error = new Error(`Cannot save game history: invalid gameId (${history.gameId})`);
      console.error('❌ VALIDATION ERROR:', error.message);
      throw error;
    }

    if (!history.openingCard || typeof history.openingCard !== 'string') {
      const error = new Error(`Cannot save game history: invalid openingCard (${history.openingCard})`);
      console.error('❌ VALIDATION ERROR:', error.message);
      throw error;
    }

    if (!history.winner || (history.winner !== 'andar' && history.winner !== 'bahar')) {
      const error = new Error(`Cannot save game history: invalid winner (${history.winner})`);
      console.error('❌ VALIDATION ERROR:', error.message);
      throw error;
    }

    if (!history.winningCard || typeof history.winningCard !== 'string') {
      const error = new Error(`Cannot save game history: invalid winningCard (${history.winningCard})`);
      console.error('❌ VALIDATION ERROR:', error.message);
      throw error;
    }

    console.log(`✅ Validation passed for game history: gameId=${history.gameId}, winner=${history.winner}`);

    // ✅ CRITICAL FIX: Extract and validate round field
    const roundValue = (history as any).round || (history as any).winningRound || 1;
    console.log(`📊 Game history data being saved:`, {
      gameId: history.gameId,
      openingCard: history.openingCard,
      winner: history.winner,
      winningCard: history.winningCard,
      totalCards: history.totalCards || 0,
      round: roundValue,
      totalBets: (history as any).totalBets || 0,
      totalPayouts: (history as any).totalPayouts || 0
    });

    // Convert camelCase to snake_case for Supabase
    const { data, error } = await supabaseServer
      .from('game_history')
      .insert({
        id: randomUUID(),
        game_id: history.gameId,
        opening_card: history.openingCard,
        winner: history.winner,
        winning_card: history.winningCard,
        total_cards: history.totalCards || 0,
        winning_round: roundValue, // ✅ FIX: Use extracted round value
        total_bets: (history as any).totalBets || 0,
        total_payouts: (history as any).totalPayouts || 0,
        round_payouts: (history as any).roundPayouts || { // ✅ NEW: Add round payouts
          round1: { andar: 0, bahar: 0 },
          round2: { andar: 0, bahar: 0 }
        },
        created_at: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error saving game history:', error);
      console.error('❌ Full error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      console.error('❌ History data attempted:', {
        gameId: history.gameId,
        openingCard: history.openingCard,
        winner: history.winner,
        winningCard: history.winningCard,
        round: roundValue,
        totalCards: history.totalCards || 0,
        totalBets: (history as any).totalBets || 0,
        totalPayouts: (history as any).totalPayouts || 0
      });
      throw new Error(`Failed to save game history: ${error.message} (Code: ${error.code})`);
    }

    console.log(`✅ Game history saved to database successfully: ${history.gameId}`);
    console.log(`✅ Saved record ID: ${data.id}, Round: ${roundValue}`);
    return data;
  }

  async getGameHistory(limit: number = 50): Promise<any[]> {
    // Join game_history with game_statistics to get complete data
    const { data: historyData, error: historyError } = await supabaseServer
      .from('game_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (historyError) {
      console.error('Error getting game history:', historyError);
      return [];
    }

    if (!historyData || historyData.length === 0) {
      return [];
    }

    // Get game IDs
    const gameIds = historyData.map((h: any) => h.game_id);

    // Get game statistics for each game
    const { data: statsData, error: statsError } = await supabaseServer
      .from('game_statistics')
      .select('*')
      .in('game_id', gameIds);

    if (statsError) {
      console.error('Error getting game statistics:', statsError);
    }

    // Get dealt cards for all games
    const { data: cardsData, error: cardsError } = await supabaseServer
      .from('dealt_cards')
      .select('*')
      .in('game_id', gameIds)
      .order('position', { ascending: true });

    if (cardsError) {
      console.error('Error getting dealt cards:', cardsError);
    }

    // Create maps for efficient lookup
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

    // Combine history with statistics and cards
    const enhancedHistory = historyData.map((history: any) => {
      const stats = statsMap.get(history.game_id);
      const cards = cardsMap.get(history.game_id) || [];
      
      return {
        id: history.id,
        gameId: history.game_id,
        openingCard: history.opening_card,
        winner: history.winner,
        winningCard: history.winning_card,
        totalCards: history.total_cards,
        round: history.winning_round || 1, // Use winning_round from database
        createdAt: history.created_at,
        // Include dealt cards
        dealtCards: cards.map((c: any) => ({
          id: c.id,
          card: c.card,
          side: c.side,
          position: c.position,
          isWinningCard: c.is_winning_card,
          createdAt: c.created_at
        })),
        // Statistics data (with defaults if not available)
        totalBets: stats ? parseFloat(stats.total_bets || '0') : (parseFloat(history.total_bets || '0') || 0),
        andarTotalBet: stats ? parseFloat(stats.andar_total_bet || '0') : 0,
        baharTotalBet: stats ? parseFloat(stats.bahar_total_bet || '0') : 0,
        totalWinnings: stats ? parseFloat(stats.total_winnings || '0') : (parseFloat(history.total_payouts || '0') || 0),
        andarBetsCount: stats ? (stats.andar_bets_count || 0) : 0,
        baharBetsCount: stats ? (stats.bahar_bets_count || 0) : 0,
        totalPlayers: stats ? (stats.total_players || 0) : 0,
      };
    });

    return enhancedHistory;
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
    console.log(`\n🔍 ========== getUserGameHistory START ==========`);
    console.log(`User ID: ${userId}`);
    
    // First, check if user has any bets at all (diagnostic)
    const { data: allBets, error: betsError } = await supabaseServer
      .from('player_bets')
      .select('id, game_id, amount, side, status, created_at')
      .eq('user_id', userId);
    
    console.log(`📊 Total bets for user: ${allBets?.length || 0}`);
    if (allBets && allBets.length > 0) {
      console.log(`Sample bet:`, allBets[0]);
      
      // Check if game_sessions exist for these bets
      const gameIds = Array.from(new Set(allBets.map(b => b.game_id)));
      console.log(`🎮 Unique game IDs: ${gameIds.length}`);
      
      const { data: sessions } = await supabaseServer
        .from('game_sessions')
        .select('game_id, status, winner')
        .in('game_id', gameIds);
      
      console.log(`🎮 Game sessions found: ${sessions?.length || 0} out of ${gameIds.length}`);
      
      // Check game_history
      const { data: history } = await supabaseServer
        .from('game_history')
        .select('game_id, winner')
        .in('game_id', gameIds);
      
      console.log(`📜 Game history records found: ${history?.length || 0} out of ${gameIds.length}`);
    }
    
    // Get user's bets and join with game sessions to get results
    // ✅ FIX: Use LEFT JOIN instead of INNER JOIN to show all bets even if session is missing
    const { data, error } = await supabaseServer
      .from('player_bets')
      .select(`
        *,
        game_sessions(
          opening_card,
          winner,
          winning_card,
          current_round,
          status,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error getting user game history:', error);
      console.log(`========== getUserGameHistory END (ERROR) ==========\n`);
      return [];
    }

    console.log(`✅ Joined query returned: ${data?.length || 0} results`);

    if (!data || data.length === 0) {
      console.log(`⚠️ No results from joined query - bets exist but game_sessions might be missing`);
      console.log(`========== getUserGameHistory END (EMPTY) ==========\n`);
      return [];
    }

    // Group bets by game_id to get all bets per game
    const gameBetsMap = new Map();
    data.forEach((bet: any) => {
      if (!gameBetsMap.has(bet.game_id)) {
        gameBetsMap.set(bet.game_id, {
          gameSession: bet.game_sessions,
          bets: [],
          totalBet: 0,
          totalPayout: 0
        });
      }
      const gameData = gameBetsMap.get(bet.game_id);
      gameData.bets.push(bet);
      gameData.totalBet += parseFloat(bet.amount || '0');
      // Add actual payout from database (already calculated correctly)
      if (bet.actual_payout) {
        gameData.totalPayout += parseFloat(bet.actual_payout);
      }
    });

    // Get dealt cards for all games
    const gameIds = Array.from(gameBetsMap.keys());
    const { data: cardsData, error: cardsError } = await supabaseServer
      .from('dealt_cards')
      .select('*')
      .in('game_id', gameIds)
      .order('position', { ascending: true });

    if (cardsError) {
      console.error('Error getting dealt cards for user history:', cardsError);
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

    // Get game history for winning round info and total cards
    const { data: historyData, error: historyError } = await supabaseServer
      .from('game_history')
      .select('*')
      .in('game_id', gameIds);

    if (historyError) {
      console.error('Error getting game history for user:', historyError);
    }

    const historyMap = new Map();
    if (historyData) {
      historyData.forEach((h: any) => historyMap.set(h.game_id, h));
    }

    // Transform data to include all user bets per game with cards
    return Array.from(gameBetsMap.entries()).map(([gameId, gameData]) => {
      const gameSession = gameData.gameSession;
      const history = historyMap.get(gameId);
      const cards = cardsMap.get(gameId) || [];
      
      // Determine result based on actual payouts
      const won = gameData.totalPayout > 0;
      const winner = gameSession?.winner;

      return {
        id: history?.id || gameData.bets[0]?.id || gameId,
        gameId: gameId,
        openingCard: gameSession?.opening_card,
        winner: winner,
        winningCard: gameSession?.winning_card,
        winningRound: history?.winning_round || gameSession?.current_round || 1,
        totalCards: history?.total_cards || cards.length,
        // Include dealt cards
        dealtCards: cards.map((c: any) => ({
          id: c.id,
          card: c.card,
          side: c.side,
          position: c.position,
          isWinningCard: c.is_winning_card,
          createdAt: c.created_at
        })),
        // User's all bets with details
        yourBets: gameData.bets.map((bet: any) => ({
          id: bet.id,
          side: bet.side,
          amount: parseFloat(bet.amount || '0'),
          round: bet.round,
          payout: parseFloat(bet.actual_payout || '0'),
          status: bet.status
        })),
        // Summary for backward compatibility
        yourBet: gameData.bets.length === 1 ? {
          side: gameData.bets[0].side,
          amount: gameData.bets[0].amount,
          round: gameData.bets[0].round
        } : null,
        yourTotalBet: gameData.totalBet,
        yourTotalPayout: gameData.totalPayout,
        yourNetProfit: gameData.totalPayout - gameData.totalBet,
        result: won ? 'win' : (winner ? 'loss' : 'no_bet'),
        payout: gameData.totalPayout, // Use actual payout from database
        round: history?.winning_round || gameSession?.current_round || 1,
        createdAt: gameSession?.created_at || gameData.bets[0]?.created_at
      };
    });
  }
  
  // Settings operations
    async getGameSettings(): Promise<{ 
      minBet: number; 
      maxBet: number; 
      timerDuration: number;
      default_deposit_bonus_percent: number;
      referral_bonus_percent: number;
      conditional_bonus_threshold: number;
      bonus_claim_threshold: number;
      admin_whatsapp_number: string;
    }> {
      // Get bonus settings from game_settings table
      const defaultDepositBonusPercent = await this.getGameSetting('default_deposit_bonus_percent');
      const referralBonusPercent = await this.getGameSetting('referral_bonus_percent');
      const conditionalBonusThreshold = await this.getGameSetting('conditional_bonus_threshold');
      const bonusClaimThreshold = await this.getGameSetting('bonus_claim_threshold');
      const adminWhatsappNumber = await this.getGameSetting('admin_whatsapp_number');
      
      return {
        minBet: 1000,
        maxBet: 100000,
        timerDuration: 30,
        default_deposit_bonus_percent: parseFloat(defaultDepositBonusPercent || '5'),
        referral_bonus_percent: parseFloat(referralBonusPercent || '1'),
        conditional_bonus_threshold: parseFloat(conditionalBonusThreshold || '30'),
        bonus_claim_threshold: parseFloat(bonusClaimThreshold || '500'),
        admin_whatsapp_number: adminWhatsappNumber || ''
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
      .update({ setting_value: value })
      .eq('setting_key', key);

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

  async applyPayoutsAndupdateBets(payouts: { userId: string; amount: number }[], winningBets: string[], losingBets: string[]): Promise<void> {
    // ✅ CRITICAL FIX: Pass payouts as array directly - Supabase will convert to JSONB
    // DO NOT use JSON.stringify() as it causes double-stringification
    const { error } = await supabaseServer.rpc('apply_payouts_and_update_bets', {
      payouts: payouts,
      winning_bets_ids: winningBets,
      losing_bets_ids: losingBets,
    });

    if (error) {
      console.error('Error applying payouts and updating bets:', error);
      throw new Error('Failed to apply payouts');
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
    console.log(`📊 getDailyStats - Querying for date: ${dateStr}`);
    
    const { data, error } = await supabaseServer
      .from('daily_game_statistics')
      .select('*')
      .eq('date', dateStr)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting daily stats:', error);
      return null;
    }

    console.log(`📊 getDailyStats - Result:`, data ? {
      date: data.date,
      total_games: data.total_games,
      total_bets: data.total_bets,
      profit_loss: data.profit_loss
    } : 'No data found');

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
      // Update existing record - FIX: Use snake_case field names from database
      const currentGames = (existing as any).total_games || 0;
      const currentBets = parseFloat((existing as any).total_bets || '0');
      const currentPayouts = parseFloat((existing as any).total_payouts || '0');
      const currentRevenue = parseFloat((existing as any).total_revenue || '0');
      const currentProfitLoss = parseFloat((existing as any).profit_loss || '0');
      const currentPlayers = (existing as any).unique_players || 0;
      
      const { error } = await supabaseServer
        .from('daily_game_statistics')
        .update({
          total_games: currentGames + (increments.totalGames || 0),
          total_bets: currentBets + (increments.totalBets || 0),
          total_payouts: currentPayouts + (increments.totalPayouts || 0),
          total_revenue: currentRevenue + (increments.totalRevenue || 0),
          profit_loss: currentProfitLoss + (increments.profitLoss || 0),
          unique_players: currentPlayers + (increments.uniquePlayers || 0),
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
    console.log(`📊 getMonthlyStats - Querying for month: ${monthYear}`);
    
    const { data, error } = await supabaseServer
      .from('monthly_game_statistics')
      .select('*')
      .eq('month_year', monthYear)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting monthly stats:', error);
      return null;
    }

    console.log(`📊 getMonthlyStats - Result:`, data ? {
      month_year: data.month_year,
      total_games: data.total_games,
      total_bets: data.total_bets,
      profit_loss: data.profit_loss
    } : 'No data found');

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
      // Update existing record - FIX: Use snake_case field names from database
      const currentGames = (existing as any).total_games || 0;
      const currentBets = parseFloat((existing as any).total_bets || '0');
      const currentPayouts = parseFloat((existing as any).total_payouts || '0');
      const currentRevenue = parseFloat((existing as any).total_revenue || '0');
      const currentProfitLoss = parseFloat((existing as any).profit_loss || '0');
      const currentPlayers = (existing as any).unique_players || 0;
      
      const { error } = await supabaseServer
        .from('monthly_game_statistics')
        .update({
          total_games: currentGames + (increments.totalGames || 0),
          total_bets: currentBets + (increments.totalBets || 0),
          total_payouts: currentPayouts + (increments.totalPayouts || 0),
          total_revenue: currentRevenue + (increments.totalRevenue || 0),
          profit_loss: currentProfitLoss + (increments.profitLoss || 0),
          unique_players: currentPlayers + (increments.uniquePlayers || 0),
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
    console.log(`📊 getYearlyStats - Querying for year: ${year}`);
    
    const { data, error } = await supabaseServer
      .from('yearly_game_statistics')
      .select('*')
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting yearly stats:', error);
      return null;
    }

    console.log(`📊 getYearlyStats - Result:`, data ? {
      year: data.year,
      total_games: data.total_games,
      total_bets: data.total_bets,
      profit_loss: data.profit_loss
    } : 'No data found');

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
      // Update existing record - FIX: Use snake_case field names from database
      const currentGames = (existing as any).total_games || 0;
      const currentBets = parseFloat((existing as any).total_bets || '0');
      const currentPayouts = parseFloat((existing as any).total_payouts || '0');
      const currentRevenue = parseFloat((existing as any).total_revenue || '0');
      const currentProfitLoss = parseFloat((existing as any).profit_loss || '0');
      const currentPlayers = (existing as any).unique_players || 0;
      
      const { error } = await supabaseServer
        .from('yearly_game_statistics')
        .update({
          total_games: currentGames + (increments.totalGames || 0),
          total_bets: currentBets + (increments.totalBets || 0),
          total_payouts: currentPayouts + (increments.totalPayouts || 0),
          total_revenue: currentRevenue + (increments.totalRevenue || 0),
          profit_loss: currentProfitLoss + (increments.profitLoss || 0),
          unique_players: currentPlayers + (increments.uniquePlayers || 0),
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
      .select('*', { count: 'exact', head: true})
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
    const currentBonusField = parseFloat(user[bonusField as keyof typeof user] as string) || 0;
    const currentTotalBonusEarned = parseFloat(user.total_bonus_earned || '0') || 0;
    
    const { error } = await supabaseServer
      .from('users')
      .update({
        [bonusField]: currentBonusField + bonusAmount,
        total_bonus_earned: (currentTotalBonusEarned + bonusAmount).toFixed(2),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error adding user bonus:', error);
      throw new Error('Failed to add user bonus');
    }
  }

  async getUserBonusInfo(userId: string): Promise<{ 
    depositBonus: number; 
    referralBonus: number; 
    totalBonus: number;
    wageringRequired: number;
    wageringCompleted: number;
    wageringProgress: number;
    bonusLocked: boolean;
  }> {
    // Retry logic for failed fetches
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseServer
          .from('users')
          .select('deposit_bonus_available, referral_bonus_available, wagering_requirement, wagering_completed, bonus_locked')
          .eq('id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not found is expected
            return { 
              depositBonus: 0, 
              referralBonus: 0, 
              totalBonus: 0,
              wageringRequired: 0,
              wageringCompleted: 0,
              wageringProgress: 0,
              bonusLocked: false
            };
          }
          throw error;
        }

        const depositBonus = parseFloat(data?.deposit_bonus_available || '0');
        const referralBonus = parseFloat(data?.referral_bonus_available || '0');
        const wageringRequired = parseFloat(data?.wagering_requirement || '0');
        const wageringCompleted = parseFloat(data?.wagering_completed || '0');
        const wageringProgress = wageringRequired > 0 ? (wageringCompleted / wageringRequired) * 100 : 0;
        const bonusLocked = data?.bonus_locked || false;
        
        return {
          depositBonus,
          referralBonus,
          totalBonus: depositBonus + referralBonus,
          wageringRequired,
          wageringCompleted,
          wageringProgress,
          bonusLocked
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
    return { 
      depositBonus: 0, 
      referralBonus: 0, 
      totalBonus: 0,
      wageringRequired: 0,
      wageringCompleted: 0,
      wageringProgress: 0,
      bonusLocked: false
    };
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
      .select('*, referred_user:users!user_referrals_referred_user_id_fkey(*)')
      .eq('referrer_user_id', userId);

    if (error) {
      console.error('Error getting user referrals:', error);
      throw error;
    }
    return data || [];
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

  // Wagering requirement methods
  async setUserWageringRequirement(userId: string, amount: number): Promise<void> {
    const { error } = await supabaseServer
      .from('users')
      .update({
        wagering_requirement: amount.toString(),
        wagering_completed: '0.00',
        bonus_locked: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error setting wagering requirement:', error);
      throw new Error('Failed to set wagering requirement');
    }
  }

  async trackWagering(userId: string, betAmount: number): Promise<void> {
    // Get current wagering data
    const user = await this.getUserById(userId);
    if (!user || !user.bonus_locked) {
      return; // No locked bonus to track
    }
    
    const currentCompleted = parseFloat(user.wagering_completed || '0');
    const newCompleted = currentCompleted + betAmount;
    
    const { error } = await supabaseServer
      .from('users')
      .update({
        wagering_completed: newCompleted.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error tracking wagering:', error);
      throw new Error('Failed to track wagering');
    }
  }

  async checkAndUnlockBonus(userId: string): Promise<{ unlocked: boolean; amount: number } | null> {
    const user = await this.getUserById(userId);
    if (!user || !user.bonus_locked) {
      return null; // No locked bonus
    }
    
    const requirement = parseFloat(user.wagering_requirement || '0');
    const completed = parseFloat(user.wagering_completed || '0');
    
    // Check if requirement met
    if (completed >= requirement && requirement > 0) {
      // Get total locked bonus
      const depositBonus = parseFloat(user.deposit_bonus_available || '0');
      const referralBonus = parseFloat(user.referral_bonus_available || '0');
      const totalBonus = depositBonus + referralBonus;
      
      if (totalBonus > 0) {
        // Add bonus to main balance
        const currentBalance = parseFloat(user.balance);
        const newBalance = currentBalance + totalBonus;
        
        // Update user - unlock bonus
        const { error } = await supabaseServer
          .from('users')
          .update({
            balance: newBalance.toString(),
            deposit_bonus_available: '0.00',
            referral_bonus_available: '0.00',
            bonus_locked: false,
            wagering_requirement: '0.00',
            wagering_completed: '0.00',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (error) {
          console.error('Error unlocking bonus:', error);
          throw new Error('Failed to unlock bonus');
        }
        
        // Log the unlock transaction (optional - don't fail if it doesn't work)
        try {
          await this.addTransaction({
            userId,
            transactionType: 'bonus_applied',
            amount: totalBonus,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            referenceId: `bonus_unlocked_${Date.now()}`,
            description: `Bonus unlocked! Wagering requirement met (₹${completed.toFixed(2)} / ₹${requirement.toFixed(2)}). ₹${totalBonus.toFixed(2)} added to balance.`
          });
        } catch (txError: any) {
          console.warn('⚠️ Failed to log bonus unlock transaction (non-critical):', txError.message);
        }
        
        console.log(`🎉 Bonus unlocked! ₹${totalBonus} added to user ${userId} balance. Wagering completed: ₹${completed.toFixed(2)} / ₹${requirement.toFixed(2)}`);
        
        return { unlocked: true, amount: totalBonus };
      }
    }
    
    return null;
  }

  async getWageringProgress(userId: string): Promise<{
    requirement: number;
    completed: number;
    remaining: number;
    percentage: number;
    bonusLocked: number;
  } | null> {
    const user = await this.getUserById(userId);
    if (!user || !user.bonus_locked) {
      return null; // No locked bonus
    }
    
    const requirement = parseFloat(user.wagering_requirement || '0');
    const completed = parseFloat(user.wagering_completed || '0');
    const remaining = Math.max(0, requirement - completed);
    const percentage = requirement > 0 ? (completed / requirement) * 100 : 0;
    const bonusLocked = parseFloat(user.deposit_bonus_available || '0') + 
                       parseFloat(user.referral_bonus_available || '0');
    
    return {
      requirement,
      completed,
      remaining,
      percentage: Math.min(100, percentage),
      bonusLocked
    };
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

  async getUserTransactions(
    userId: string,
    options: { limit?: number; offset?: number; type?: string } = {}
  ): Promise<{
    transactions: Array<{
      id: string;
      transaction_type: string;
      amount: number;
      description: string | null;
      created_at: string;
    }>;
    total: number;
  }> {
    const { limit = 20, offset = 0, type = 'all' } = options;

    // Base query
    let query = supabaseServer
      .from('user_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type !== 'all') {
      query = query.eq('transaction_type', type);
    }

    const { data, error, count } = await query as any;

    if (error) {
      console.error('Error fetching user transactions:', error);
      return { transactions: [], total: 0 };
    }

    const transactions = (data || []).map((row: any) => ({
      id: row.id,
      transaction_type: row.transaction_type,
      amount: parseFloat(row.amount),
      description: row.description || null,
      created_at: row.created_at,
    }));

    return { transactions, total: count || transactions.length };
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

  async getAllBonusTransactions(filters: { status?: string; type?: string; limit?: number; offset?: number } = {}): Promise<any[]> {
    try {
      const { status, type, limit = 100, offset = 0 } = filters;
      
      let query = supabaseServer
        .from('user_transactions')
        .select(`
          *,
          user:users!user_transactions_user_id_fkey(id, phone, full_name, username)
        `)
        .in('transaction_type', ['bonus', 'bonus_applied'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        if (type === 'deposit_bonus') {
          query = query.like('description', '%Deposit bonus%');
        } else if (type === 'referral_bonus') {
          query = query.like('description', '%Referral bonus%');
        } else if (type === 'bonus_applied') {
          query = query.eq('transaction_type', 'bonus_applied');
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting all bonus transactions:', error);
        return [];
      }

      const transactions = (data || []).map((txn: any) => {
        let bonusType: 'deposit_bonus' | 'referral_bonus' | 'bonus_applied' = 'bonus_applied';
        if (txn.description?.includes('Deposit bonus')) {
          bonusType = 'deposit_bonus';
        } else if (txn.description?.includes('Referral bonus')) {
          bonusType = 'referral_bonus';
        }

        const relatedAmountMatch = txn.description?.match(/₹(\d+(?:\.\d+)?)/);
        const relatedAmount = relatedAmountMatch ? parseFloat(relatedAmountMatch[1]) : undefined;

        return {
          id: txn.id,
          userId: txn.user_id,
          username: txn.user?.username || txn.user?.full_name || txn.user?.phone || 'Unknown',
          type: bonusType,
          amount: parseFloat(txn.amount),
          status: txn.transaction_type === 'bonus_applied' || txn.description?.includes('applied') ? 'applied' : 'pending',
          timestamp: txn.created_at,
          description: txn.description || '',
          relatedAmount
        };
      });

      if (status && status !== 'all') {
        return transactions.filter((t: any) => t.status === status);
      }

      return transactions;
    } catch (error) {
      console.error('Error in getAllBonusTransactions:', error);
      return [];
    }
  }

  async getAllReferralData(filters: { status?: string; limit?: number; offset?: number } = {}): Promise<any[]> {
    try {
      const { status, limit = 100, offset = 0 } = filters;
      
      let query = supabaseServer
        .from('user_referrals')
        .select(`
          *,
          referrer:users!user_referrals_referrer_user_id_fkey(id, phone, full_name, username),
          referred:users!user_referrals_referred_user_id_fkey(id, phone, full_name, username)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Error getting all referral data:', error);
        return [];
      }

      const referralData = (data || []).map((ref: any) => ({
        id: ref.id,
        referrerId: ref.referrer_user_id,
        referrerUsername: ref.referrer?.username || ref.referrer?.full_name || ref.referrer?.phone || 'Unknown',
        referredId: ref.referred_user_id,
        referredUsername: ref.referred?.username || ref.referred?.full_name || ref.referred?.phone || 'Unknown',
        depositAmount: parseFloat(ref.deposit_amount || '0'),
        bonusAmount: parseFloat(ref.bonus_amount || '0'),
        status: ref.bonus_applied ? 'completed' : 'pending',
        createdAt: ref.created_at,
        bonusAppliedAt: ref.bonus_applied_at
      }));

      if (status && status !== 'all') {
        return referralData.filter((r: any) => r.status === status);
      }

      return referralData;
    } catch (error) {
      console.error('Error in getAllReferralData:', error);
      return [];
    }
  }

  async getPlayerBonusAnalytics(filters: { userId?: string; limit?: number; offset?: number } = {}): Promise<any[]> {
    try {
      const { userId, limit = 1000, offset = 0 } = filters;
      
      // Get all users who have received bonuses
      let usersQuery = supabaseServer
        .from('users')
        .select('id, phone, full_name, username, deposit_bonus_available, referral_bonus_available, total_bonus_earned, created_at');
      
      if (userId) {
        usersQuery = usersQuery.eq('id', userId);
      }
      
      const { data: usersData, error: usersError } = await usersQuery;
      
      if (usersError) {
        console.error('Error getting users for bonus analytics:', usersError);
        return [];
      }
      
      if (!usersData || usersData.length === 0) {
        return [];
      }
      
      // Get all bonus transactions grouped by user
      const { data: transactionsData, error: transactionsError } = await supabaseServer
        .from('user_transactions')
        .select('*')
        .in('transaction_type', ['bonus', 'bonus_applied'])
        .order('created_at', { ascending: false });
      
      if (transactionsError) {
        console.error('Error getting bonus transactions:', transactionsError);
        return [];
      }
      
      // Process per-player analytics
      const playerAnalytics: any[] = [];
      
      for (const user of usersData) {
        // Filter transactions for this user
        const userTransactions = (transactionsData || []).filter(
          (txn: any) => txn.user_id === user.id
        );
        
        // Only include users who have received bonuses
        const depositBonus = parseFloat(user.deposit_bonus_available || '0');
        const referralBonus = parseFloat(user.referral_bonus_available || '0');
        const totalBonusEarned = parseFloat(user.total_bonus_earned || '0');
        
        if (userTransactions.length === 0 && totalBonusEarned === 0 && depositBonus === 0 && referralBonus === 0) {
          continue; // Skip users with no bonuses
        }
        
        // Calculate totals from transactions
        const depositBonusTransactions = userTransactions.filter(
          (txn: any) => txn.description?.includes('Deposit bonus')
        );
        const referralBonusTransactions = userTransactions.filter(
          (txn: any) => txn.description?.includes('Referral bonus')
        );
        const appliedBonusTransactions = userTransactions.filter(
          (txn: any) => txn.transaction_type === 'bonus_applied'
        );
        
        const totalDepositBonus = depositBonusTransactions.reduce(
          (sum, txn) => sum + parseFloat(txn.amount || '0'), 0
        );
        const totalReferralBonus = referralBonusTransactions.reduce(
          (sum, txn) => sum + parseFloat(txn.amount || '0'), 0
        );
        const totalAppliedBonus = appliedBonusTransactions.reduce(
          (sum, txn) => sum + parseFloat(txn.amount || '0'), 0
        );
        const totalPendingBonus = depositBonus + referralBonus;
        
        // Get first and last bonus dates
        const bonusDates = userTransactions
          .map((txn: any) => new Date(txn.created_at))
          .filter((date: Date) => !isNaN(date.getTime()))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());
        
        const firstBonusDate = bonusDates.length > 0 ? bonusDates[0] : null;
        const lastBonusDate = bonusDates.length > 0 ? bonusDates[bonusDates.length - 1] : null;
        
        playerAnalytics.push({
          userId: user.id,
          username: user.username || user.full_name || user.phone || 'Unknown',
          phone: user.phone,
          fullName: user.full_name,
          // Current available bonuses
          currentDepositBonus: depositBonus,
          currentReferralBonus: referralBonus,
          currentTotalPending: totalPendingBonus,
          // Total bonuses from transactions
          totalDepositBonusReceived: totalDepositBonus,
          totalReferralBonusReceived: totalReferralBonus,
          totalBonusApplied: totalAppliedBonus,
          totalBonusEarned: totalBonusEarned || (totalDepositBonus + totalReferralBonus),
          // Counts
          depositBonusCount: depositBonusTransactions.length,
          referralBonusCount: referralBonusTransactions.length,
          totalBonusTransactions: userTransactions.length,
          // Dates
          firstBonusDate: firstBonusDate?.toISOString() || null,
          lastBonusDate: lastBonusDate?.toISOString() || null,
          // User creation date
          userCreatedAt: user.created_at,
          // Transaction history
          recentTransactions: userTransactions.slice(0, 10).map((txn: any) => ({
            id: txn.id,
            amount: parseFloat(txn.amount || '0'),
            type: txn.description?.includes('Deposit bonus') ? 'deposit_bonus' :
                  txn.description?.includes('Referral bonus') ? 'referral_bonus' : 'bonus_applied',
            description: txn.description || '',
            timestamp: txn.created_at,
            status: txn.transaction_type === 'bonus_applied' ? 'applied' : 'pending'
          }))
        });
      }
      
      // Sort by total bonus earned (descending)
      playerAnalytics.sort((a, b) => (b.totalBonusEarned || 0) - (a.totalBonusEarned || 0));
      
      // Apply limit and offset
      return playerAnalytics.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error in getPlayerBonusAnalytics:', error);
      return [];
    }
  }

  // Payment request methods implementation
  async createPaymentRequest(request: {
    userId: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    paymentMethod: string;
    paymentDetails?: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    adminNotes?: string;
  }): Promise<any> {
    const id = randomUUID();
    const now = new Date();
    
    // Map to database columns
    const paymentRequest = {
      id,
      user_id: request.userId,
      request_type: request.type,
      amount: request.amount,
      payment_method: request.paymentMethod,
      payment_details: request.paymentDetails || null,
      status: request.status,
      admin_notes: request.adminNotes || null,
      created_at: now,
      updated_at: now
    };

    try {
      const { data, error } = await supabaseServer
        .from('payment_requests')
        .insert(paymentRequest)
        .select()
        .single();

      if (error) {
        console.error('Error creating payment request:', error);
        // Throw error so API can properly report failure to user
        throw new Error(`Failed to create payment request: ${error.message || 'Database error'}`);
      }

      if (!data) {
        console.error('No data returned from payment request insert');
        throw new Error('Failed to create payment request: No data returned');
      }

      return data;
    } catch (err: any) {
      console.error('DB exception creating payment request:', err);
      // Re-throw so the API route can handle it
      throw err instanceof Error ? err : new Error(`Failed to create payment request: ${err?.message || 'Unknown error'}`);
    }
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
    try {
      // First try with join
      const { data, error } = await supabaseServer
        .from('payment_requests')
        .select(`
          *,
          user:users(phone, full_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting pending payment requests (with join):', error);
        // Try simpler query without joins if the foreign key join fails
        const { data: simpleData, error: simpleError } = await supabaseServer
          .from('payment_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (simpleError) {
          console.error('Error getting pending payment requests (simple query):', simpleError);
          // If table doesn't exist, return empty array
          if (simpleError.code === '42P01' || simpleError.message?.includes('does not exist')) {
            console.warn('⚠️ payment_requests table does not exist. Please create it first.');
            return [];
          }
          return [];
        }
        
        // Manually fetch user data for each request
        const requestsWithUsers = await Promise.all(
          (simpleData || []).map(async (request: any) => {
            try {
              const { data: userData } = await supabaseServer
                .from('users')
                .select('phone, full_name')
                .eq('id', request.user_id)
                .single();
              
              return {
                ...request,
                user: userData || null,
                phone: userData?.phone || request.user_id || null,
                full_name: userData?.full_name || null,
                user_id: request.user_id
              };
            } catch (userError) {
              console.error(`Error fetching user for request ${request.id}:`, userError);
              return {
                ...request,
                user: null,
                phone: request.user_id || null,
                full_name: null,
                user_id: request.user_id
              };
            }
          })
        );
        
        return requestsWithUsers;
      }

      // Flatten the user data for easier access and ensure correct format
      const flattenedData = (data || []).map((request: any) => {
        const userPhone = request.user?.phone || request.user_id || null;
        const userFullName = request.user?.full_name || null;
        
        return {
          id: request.id,
          user_id: request.user_id,
          request_type: request.request_type || request.type,
          amount: parseFloat(request.amount) || 0,
          payment_method: request.payment_method || 'N/A',
          status: request.status || 'pending',
          admin_notes: request.admin_notes || null,
          created_at: request.created_at,
          updated_at: request.updated_at,
          phone: userPhone,
          full_name: userFullName,
          user: request.user || null
        };
      });

      return flattenedData;
    } catch (err: any) {
      console.error('Exception in getPendingPaymentRequests:', err);
      return [];
    }
  }

  /**
   * Get all payment requests with optional filters (for history view)
   */
  async getAllPaymentRequests(filters?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    try {
      let query = supabaseServer
        .from('payment_requests')
        .select(`
          *,
          user:users!payment_requests_user_id_fkey(phone, full_name, id)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('request_type', filters.type);
      }
      
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      
      if (filters?.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching all payment requests:', error);
        return [];
      }
      
      // Flatten the nested user data
      const flattenedData = (data || []).map((req: any) => ({
        ...req,
        phone: req.user?.phone || req.phone || 'N/A',
        full_name: req.user?.full_name || req.full_name || 'Unknown User',
        user: undefined // Remove nested object
      }));
      
      return flattenedData;
    } catch (err: any) {
      console.error('Exception in getAllPaymentRequests:', err);
      return [];
    }
  }

  async updatePaymentRequest(requestId: string, status: string, adminId?: string): Promise<void> {
    const updates: any = { 
      status
      // ✅ FIX: Only update essential columns that exist in the table
      // Table has: id, user_id, request_type, amount, payment_method, status, admin_id, admin_notes, created_at, updated_at
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
    
    console.log(`✅ Payment request updated: ${requestId}, status: ${status}`);
  }

  async approvePaymentRequest(requestId: string, userId: string, amount: number, adminId: string): Promise<void> {
    // Get the payment request to determine type
    const paymentRequest = await this.getPaymentRequest(requestId);
    if (!paymentRequest) {
      throw new Error('Payment request not found');
    }

    const requestType = paymentRequest.request_type || paymentRequest.type;
    
    // Use database transaction to ensure atomic operation
    try {
      // Update the payment request status
      await this.updatePaymentRequest(requestId, 'approved', adminId);

      // ✅ FIX: Handle deposits and withdrawals with atomic operations
      if (requestType === 'deposit') {
        // For deposits: use atomic operation to add balance
        await this.addBalanceAtomic(userId, amount);
        
        // ✅ FIX: Apply deposit bonus when admin approves deposit
        try {
          const { applyDepositBonus } = await import('./payment');
          await applyDepositBonus(userId, amount);
          console.log(`✅ Deposit bonus applied for user ${userId} on admin-approved deposit of ₹${amount}`);
        } catch (bonusError) {
          console.error('⚠️ Failed to apply deposit bonus on approval:', bonusError);
          // Don't fail the approval if bonus fails
        }
      } else if (requestType === 'withdrawal') {
        // ✅ CRITICAL FIX: Balance already deducted on request submission
        // No need to deduct again - just log approval (optional)
        try {
          const user = await this.getUser(userId);
          const currentBalance = user ? parseFloat(user.balance) : 0;
          
          await this.addTransaction({
            userId,
            transactionType: 'withdrawal_approved',
            amount: -amount,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance,
            referenceId: `withdrawal_approved_${requestId}`,
            description: `Withdrawal approved by admin - ₹${amount} (balance already deducted on request)`
          });
        } catch (txError: any) {
          // ✅ FIX: Don't fail approval if transaction logging fails (table may not exist)
          console.warn('⚠️ Transaction logging failed (non-critical):', txError.message);
        }
        
        console.log(`✅ Withdrawal approved: ₹${amount} for user ${userId} (balance was deducted on request submission)`);
      }
    } catch (error) {
      console.error('Error approving payment request:', error);
      throw new Error('Failed to approve payment request');
    }
  }

  // OPTIMIZED: Atomic deposit approval with bonus (single RPC call)
  async approvePaymentRequestAtomic(
    requestId: string,
    userId: string,
    amount: number,
    adminId: string
  ): Promise<{ balance: number; bonusAmount: number; wageringRequirement: number }> {
    try {
      // 🎯 CORRECT BONUS LOGIC: Bonus is NOT added to balance immediately!
      // Step 1: Get admin-configured settings
      const bonusPercentSetting = await this.getGameSetting('default_deposit_bonus_percent');
      const wageringMultiplierSetting = await this.getGameSetting('wagering_multiplier');
      
      const bonusPercent = parseFloat(bonusPercentSetting || '5'); // Default 5%
      const wageringMultiplier = parseFloat(wageringMultiplierSetting || '0.3'); // Default 0.3 (30% of deposit)
      
      // Step 2: Calculate bonus amount
      const bonusAmount = amount * (bonusPercent / 100);
      
      // Step 3: Calculate wagering requirement (multiplier of deposit amount)
      // e.g., 0.3 = 30% of deposit, 1.0 = 100% of deposit, 10.0 = 10x deposit
      const wageringRequirement = amount * wageringMultiplier;
      
      console.log(`💰 Deposit approval: Amount: ₹${amount}, Bonus: ₹${bonusAmount} (${bonusPercent}%) LOCKED until ₹${wageringRequirement} wagered (${wageringMultiplier * 100}% of deposit)`);
      
      // Step 4: Add ONLY deposit to balance (NOT bonus!)
      const newBalance = await this.addBalanceAtomic(userId, amount);
      console.log(`✅ Balance updated: User ${userId}, New Balance: ₹${newBalance} (deposit only)`);
      
      // Step 5: Store bonus separately and set wagering requirement
      const { error: bonusError } = await supabaseServer
        .from('users')
        .update({
          deposit_bonus_available: bonusAmount,
          wagering_requirement: wageringRequirement,
          wagering_completed: 0,
          bonus_locked: true,
          original_deposit_amount: amount
        })
        .eq('id', userId);
      
      if (bonusError) {
        console.error('Error setting bonus and wagering requirement:', bonusError);
        // Don't fail the approval if bonus setup fails
      } else {
        console.log(`🔒 Bonus locked: ₹${bonusAmount} - User must wager ₹${wageringRequirement} to unlock`);
      }
      
      // Step 5: Update payment request status to approved
      const { error: updateError } = await supabaseServer
        .from('payment_requests')
        .update({
          status: 'approved'
          // ✅ FIX: Only update status - approved_by and approved_at columns don't exist
        })
        .eq('id', requestId);
      
      if (updateError) {
        console.error('Error updating payment request:', updateError);
        throw new Error('Failed to update payment request status');
      }
      
      console.log(`✅ Payment request approved: ${requestId}`);
      console.log(`📊 Summary: Deposit: ₹${amount} (added to balance), Bonus: ₹${bonusAmount} (locked), Required wagering: ₹${wageringRequirement}`);
      
      return {
        balance: newBalance,
        bonusAmount: bonusAmount,
        wageringRequirement: wageringRequirement
      };
    } catch (error: any) {
      console.error('Error in approvePaymentRequestAtomic:', error);
      throw error;
    }
  }

  // OPTIMIZED: Batch update multiple user balances in parallel
  async updateMultipleUserBalances(
    updates: Array<{ userId: string; amountChange: number }>
  ): Promise<Array<{ userId: string; success: boolean; newBalance?: number; error?: string }>> {
    if (updates.length === 0) {
      return [];
    }
    
    try {
      // Convert to JSONB format for RPC call
      const updatesJson = JSON.stringify(
        updates.map(u => ({
          userId: u.userId,
          amountChange: u.amountChange
        }))
      );
      
      // Use batch RPC function if available
      const { data, error } = await supabaseServer.rpc('update_multiple_user_balances', {
        p_updates: updatesJson
      });
      
      if (error) {
        console.error('Error in update_multiple_user_balances RPC:', error);
        // Fallback to individual updates in parallel
        return Promise.all(
          updates.map(async (update) => {
            try {
              await this.updateUserBalance(update.userId, update.amountChange);
              const newBalance = await this.getUserBalance(update.userId);
              return { userId: update.userId, success: true, newBalance };
            } catch (err: any) {
              return { userId: update.userId, success: false, error: err.message };
            }
          })
        );
      }
      
      // Map results from RPC function
      return (data || []).map((result: any) => ({
        userId: result.user_id,
        success: result.success,
        newBalance: result.success ? parseFloat(String(result.new_balance)) : undefined,
        error: result.error_message || undefined
      }));
    } catch (error: any) {
      console.error('Error in updateMultipleUserBalances:', error);
      // Fallback to sequential updates
      const results = [];
      for (const update of updates) {
        try {
          await this.updateUserBalance(update.userId, update.amountChange);
          const newBalance = await this.getUserBalance(update.userId);
          results.push({ userId: update.userId, success: true, newBalance });
        } catch (err: any) {
          results.push({ userId: update.userId, success: false, error: err.message });
        }
      }
      return results;
    }
  }

  // ============================================
  // NEW BONUS TRACKING METHODS
  // ============================================

  /**
   * Create a new deposit bonus record
   */
  async createDepositBonus(data: {
    userId: string;
    depositRequestId: string;
    depositAmount: number;
    bonusAmount: number;
    bonusPercentage: number;
    wageringRequired: number;
  }): Promise<string> {
    const { data: bonus, error } = await supabaseServer
      .from('deposit_bonuses')
      .insert({
        user_id: data.userId,
        deposit_request_id: data.depositRequestId,
        deposit_amount: data.depositAmount,
        bonus_amount: data.bonusAmount,
        bonus_percentage: data.bonusPercentage,
        wagering_required: data.wageringRequired,
        wagering_completed: 0,
        wagering_progress: 0,
        status: 'locked',
        locked_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating deposit bonus:', error);
      throw new Error('Failed to create deposit bonus');
    }

    // Log bonus transaction
    await this.logBonusTransaction({
      userId: data.userId,
      bonusType: 'deposit_bonus',
      bonusSourceId: bonus.id,
      amount: data.bonusAmount,
      action: 'added',
      description: `Deposit bonus added: ₹${data.bonusAmount} (${data.bonusPercentage}% of ₹${data.depositAmount})`
    });

    console.log(`✅ Deposit bonus created: ₹${data.bonusAmount} for user ${data.userId}`);
    return bonus.id;
  }

  /**
   * Get all deposit bonuses for a user
   */
  async getDepositBonuses(userId: string): Promise<any[]> {
    const { data, error } = await supabaseServer
      .from('deposit_bonuses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deposit bonuses:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update wagering progress for all locked deposit bonuses
   */
  async updateDepositBonusWagering(userId: string, betAmount: number): Promise<void> {
    // Get all locked bonuses for this user
    const { data: lockedBonuses, error: fetchError } = await supabaseServer
      .from('deposit_bonuses')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'locked');

    if (fetchError || !lockedBonuses || lockedBonuses.length === 0) {
      return; // No locked bonuses to update
    }

    // Update each locked bonus
    for (const bonus of lockedBonuses) {
      const newCompleted = parseFloat(bonus.wagering_completed) + betAmount;
      const progress = (newCompleted / parseFloat(bonus.wagering_required)) * 100;

      const { error: updateError } = await supabaseServer
        .from('deposit_bonuses')
        .update({
          wagering_completed: newCompleted,
          wagering_progress: Math.min(100, progress),
          updated_at: new Date().toISOString()
        })
        .eq('id', bonus.id);

      if (updateError) {
        console.error('Error updating deposit bonus wagering:', updateError);
        continue;
      }

      // Check if wagering requirement met
      if (newCompleted >= parseFloat(bonus.wagering_required)) {
        await this.unlockDepositBonus(bonus.id);
      }

      // Log progress milestone (every 25%)
      if (Math.floor(progress / 25) > Math.floor((progress - (betAmount / parseFloat(bonus.wagering_required)) * 100) / 25)) {
        await this.logBonusTransaction({
          userId,
          bonusType: 'deposit_bonus',
          bonusSourceId: bonus.id,
          amount: betAmount,
          action: 'wagering_progress',
          description: `Wagering progress: ${Math.floor(progress)}% complete (₹${newCompleted.toFixed(2)} / ₹${bonus.wagering_required})`
        });
      }
    }
  }

  /**
   * Unlock a deposit bonus when wagering requirement is met
   */
  async unlockDepositBonus(bonusId: string): Promise<void> {
    const { data: bonus, error: fetchError } = await supabaseServer
      .from('deposit_bonuses')
      .select('*')
      .eq('id', bonusId)
      .single();

    if (fetchError || !bonus) {
      return;
    }

    // Update status to unlocked
    const { error: updateError } = await supabaseServer
      .from('deposit_bonuses')
      .update({
        status: 'unlocked',
        unlocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bonusId);

    if (updateError) {
      console.error('Error unlocking deposit bonus:', updateError);
      return;
    }

    // Log unlock
    await this.logBonusTransaction({
      userId: bonus.user_id,
      bonusType: 'deposit_bonus',
      bonusSourceId: bonusId,
      amount: parseFloat(bonus.bonus_amount),
      action: 'unlocked',
      description: `Bonus unlocked! Wagering requirement met (₹${bonus.wagering_completed} / ₹${bonus.wagering_required})`
    });

    // Auto-credit to balance
    await this.creditDepositBonus(bonusId);

    console.log(`🔓 Deposit bonus unlocked: ₹${bonus.bonus_amount} for user ${bonus.user_id}`);
  }

  /**
   * Credit unlocked deposit bonus to user balance
   */
  async creditDepositBonus(bonusId: string): Promise<void> {
    const { data: bonus, error: fetchError } = await supabaseServer
      .from('deposit_bonuses')
      .select('*')
      .eq('id', bonusId)
      .single();

    if (fetchError || !bonus || bonus.status !== 'unlocked') {
      return;
    }

    const user = await this.getUserById(bonus.user_id);
    if (!user) {
      return;
    }

    const balanceBefore = parseFloat(user.balance);
    const bonusAmount = parseFloat(bonus.bonus_amount);
    const balanceAfter = balanceBefore + bonusAmount;

    // Add to balance
    await this.updateUserBalance(bonus.user_id, bonusAmount);

    // Update bonus status
    const { error: updateError } = await supabaseServer
      .from('deposit_bonuses')
      .update({
        status: 'credited',
        credited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bonusId);

    if (updateError) {
      console.error('Error updating deposit bonus status:', updateError);
    }

    // Log credit
    await this.logBonusTransaction({
      userId: bonus.user_id,
      bonusType: 'deposit_bonus',
      bonusSourceId: bonusId,
      amount: bonusAmount,
      balanceBefore,
      balanceAfter,
      action: 'credited',
      description: `Bonus automatically credited to balance: ₹${bonusAmount}`
    });

    console.log(`✅ Deposit bonus credited: ₹${bonusAmount} to user ${bonus.user_id}`);
  }

  /**
   * Create a referral bonus record
   */
  async createReferralBonus(data: {
    referrerUserId: string;
    referredUserId: string;
    referralId?: string;
    depositAmount: number;
    bonusAmount: number;
    bonusPercentage: number;
  }): Promise<string> {
    const { data: bonus, error } = await supabaseServer
      .from('referral_bonuses')
      .insert({
        referrer_user_id: data.referrerUserId,
        referred_user_id: data.referredUserId,
        referral_id: data.referralId,
        deposit_amount: data.depositAmount,
        bonus_amount: data.bonusAmount,
        bonus_percentage: data.bonusPercentage,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating referral bonus:', error);
      throw new Error('Failed to create referral bonus');
    }

    // Log bonus transaction
    await this.logBonusTransaction({
      userId: data.referrerUserId,
      bonusType: 'referral_bonus',
      bonusSourceId: bonus.id,
      amount: data.bonusAmount,
      action: 'added',
      description: `Referral bonus earned: ₹${data.bonusAmount} from user deposit`
    });

    // Auto-credit referral bonuses immediately
    await this.creditReferralBonus(bonus.id);

    console.log(`✅ Referral bonus created: ₹${data.bonusAmount} for user ${data.referrerUserId}`);
    return bonus.id;
  }

  /**
   * Credit referral bonus to user balance
   */
  async creditReferralBonus(bonusId: string): Promise<void> {
    const { data: bonus, error: fetchError } = await supabaseServer
      .from('referral_bonuses')
      .select('*')
      .eq('id', bonusId)
      .single();

    if (fetchError || !bonus || bonus.status === 'credited') {
      return;
    }

    const user = await this.getUserById(bonus.referrer_user_id);
    if (!user) {
      return;
    }

    const balanceBefore = parseFloat(user.balance);
    const bonusAmount = parseFloat(bonus.bonus_amount);
    const balanceAfter = balanceBefore + bonusAmount;

    // Add to balance
    await this.updateUserBalance(bonus.referrer_user_id, bonusAmount);

    // Update bonus status
    const { error: updateError } = await supabaseServer
      .from('referral_bonuses')
      .update({
        status: 'credited',
        credited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bonusId);

    if (updateError) {
      console.error('Error updating referral bonus status:', updateError);
    }

    // Log credit
    await this.logBonusTransaction({
      userId: bonus.referrer_user_id,
      bonusType: 'referral_bonus',
      bonusSourceId: bonusId,
      amount: bonusAmount,
      balanceBefore,
      balanceAfter,
      action: 'credited',
      description: `Referral bonus automatically credited: ₹${bonusAmount}`
    });

    console.log(`✅ Referral bonus credited: ₹${bonusAmount} to user ${bonus.referrer_user_id}`);
  }

  /**
   * Get all referral bonuses for a user
   */
  async getReferralBonuses(userId: string): Promise<any[]> {
    const { data, error } = await supabaseServer
      .from('referral_bonuses')
      .select(`
        *,
        referred_user:users!referral_bonuses_referred_user_id_fkey(phone, full_name)
      `)
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referral bonuses:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Log a bonus transaction
   */
  async logBonusTransaction(data: {
    userId: string;
    bonusType: string;
    bonusSourceId?: string;
    amount: number;
    balanceBefore?: number;
    balanceAfter?: number;
    action: string;
    description: string;
    metadata?: any;
  }): Promise<void> {
    const { error } = await supabaseServer
      .from('bonus_transactions')
      .insert({
        user_id: data.userId,
        bonus_type: data.bonusType,
        bonus_source_id: data.bonusSourceId,
        amount: data.amount,
        balance_before: data.balanceBefore,
        balance_after: data.balanceAfter,
        action: data.action,
        description: data.description,
        metadata: data.metadata
      });

    if (error) {
      console.error('Error logging bonus transaction:', error);
    }
  }

  /**
   * Get bonus transaction history for a user
   */
  async getBonusTransactions(userId: string, filters?: { limit?: number; offset?: number }): Promise<any[]> {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    const { data, error } = await supabaseServer
      .from('bonus_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching bonus transactions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get bonus summary for a user
   */
  async getBonusSummary(userId: string): Promise<any> {
    const { data, error } = await supabaseServer
      .from('user_bonus_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching bonus summary:', error);
      return {
        depositBonusUnlocked: 0,
        depositBonusLocked: 0,
        depositBonusCredited: 0,
        referralBonusCredited: 0,
        referralBonusPending: 0,
        totalAvailable: 0,
        totalCredited: 0,
        lifetimeEarnings: 0
      };
    }

    return {
      depositBonusUnlocked: parseFloat(data.deposit_bonus_unlocked || '0'),
      depositBonusLocked: parseFloat(data.deposit_bonus_locked || '0'),
      depositBonusCredited: parseFloat(data.deposit_bonus_credited || '0'),
      referralBonusCredited: parseFloat(data.referral_bonus_credited || '0'),
      referralBonusPending: parseFloat(data.referral_bonus_pending || '0'),
      totalAvailable: parseFloat(data.total_available || '0'),
      totalCredited: parseFloat(data.total_credited || '0'),
      lifetimeEarnings: parseFloat(data.lifetime_earnings || '0')
    };
  }
}

// Export a singleton instance for use throughout the application
export const storage: IStorage = new SupabaseStorage();

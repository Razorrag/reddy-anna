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
} from "@shared/schema";
import { randomUUID } from "crypto";
import { supabaseServer } from "./lib/supabaseServer";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: string, amountChange: number): Promise<void>;
  
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
  getBettingStats(gameId: string): Promise<{ andarTotal: number; baharTotal: number; andarCount: number; baharCount: number }>;
  
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
  getGameSettings(): Promise<{ minBet: number; maxBet: number; timerDuration: number }>;
  updateGameSettings(settings: { minBet?: number; maxBet?: number; timerDuration?: number }): Promise<void>;
  getGameSetting(key: string): Promise<string | undefined>;
  updateGameSetting(key: string, value: string): Promise<void>;
  
  // Stream settings operations
  getStreamSettings(): Promise<StreamSettings[]>;
  updateStreamSetting(key: string, value: string): Promise<void>;
}

export class SupabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting user:', error);
      return undefined;
    }

    return data;
  }

  async getUserByUsername(identifier: string): Promise<User | undefined> {
    const { data, error } = await supabaseServer
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},username.eq.${identifier}`)  // Search in both fields
      .single();

    if (error) {
      console.error('Error getting user by identifier:', error);
      // Log more details for debugging:
      console.log('Searching for identifier:', identifier);
      return undefined;
    }

    return data;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { data, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }

    return data;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    
    // Create user object ensuring email field is properly set
    const user = {
      id,
      username: insertUser.username,
      password_hash: insertUser.password, // Map password to password_hash
      email: (insertUser as any).email || insertUser.username, // Use email if provided, else username
      full_name: (insertUser as any).name || insertUser.username,
      phone: (insertUser as any).mobile || '', // Use mobile from registration
      role: 'player',
      status: 'active',
      balance: 1000000, // Default balance
      total_winnings: 0,
      total_losses: 0,
      games_played: 0,
      games_won: 0,
      email_verified: false,
      phone_verified: false,
      two_factor_enabled: false,
      referral_code: null,
      referred_by: null,
      avatar_url: null,
      last_login: null,
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
      throw error;
    }

    return data;
  }

  async updateUserBalance(userId: string, amountChange: number): Promise<void> {
    // Skip database update for anonymous users
    if (userId === 'anonymous') {
      console.log('⚠️ Skipping balance update for anonymous user');
      return;
    }
    
    // Get current balance
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = user.balance + amountChange;

    const { error } = await supabaseServer
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user balance:', error);
      throw new Error('Failed to update user balance');
    }
  }

  async updateUser(userId: string, updates: any): Promise<User> {
    const { data, error } = await supabaseServer
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
      current_round: session.round || 1,
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
    const { data, error } = await supabaseServer
      .from('game_sessions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error getting current game session:', error);
      return undefined;
    }

    return data;
  }

  async getGameSession(gameId: string): Promise<GameSession | undefined> {
    const { data, error } = await supabaseServer
      .from('game_sessions')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (error) {
      console.error('Error getting game session:', error);
      return undefined;
    }

    return data;
  }

  async updateGameSession(gameId: string, updates: Partial<GameSession>): Promise<void> {
    // Use snake_case to match database schema exactly
    const dbUpdates: any = {
      updated_at: new Date()
    };
    
    if (updates.phase) dbUpdates.phase = updates.phase;
    if (updates.round !== undefined) dbUpdates.current_round = updates.round;
    if (updates.currentTimer !== undefined) dbUpdates.current_timer = updates.currentTimer;
    if (updates.openingCard !== undefined) dbUpdates.opening_card = updates.openingCard;
    if (updates.winner !== undefined) dbUpdates.winner = updates.winner;
    if (updates.winningCard !== undefined) dbUpdates.winning_card = updates.winningCard;
    if (updates.winningRound !== undefined) dbUpdates.winning_round = updates.winningRound;
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

  async getBettingStats(gameId: string): Promise<{ andarTotal: number; baharTotal: number; andarCount: number; baharCount: number }> {
    const bets = await this.getBetsForGame(gameId);
    const andarBets = bets.filter(b => b.side === 'andar');
    const baharBets = bets.filter(b => b.side === 'bahar');
    
    return {
      andarTotal: andarBets.reduce((sum, b) => sum + b.amount, 0),
      baharTotal: baharBets.reduce((sum, b) => sum + b.amount, 0),
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
      round: history.round,
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
        round: history.round,
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

  // Settings operations
  async getGameSettings(): Promise<{ minBet: number; maxBet: number; timerDuration: number }> {
    // Default values - you might want to store these in a settings table
    return {
      minBet: 1000,
      maxBet: 100000,
      timerDuration: 30
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
}

export const storage = new SupabaseStorage();

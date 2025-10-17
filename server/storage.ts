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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: string, newBalance: number): Promise<void>;
  
  // Game session operations
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getCurrentGameSession(): Promise<GameSession | undefined>;
  updateGameSession(gameId: string, updates: Partial<GameSession>): Promise<void>;
  completeGameSession(gameId: string, winner: string, winningCard: string): Promise<void>;
  
  // Betting operations
  placeBet(bet: InsertBet): Promise<PlayerBet>;
  getBetsForGame(gameId: string): Promise<PlayerBet[]>;
  getBetsForUser(userId: string, gameId: string): Promise<PlayerBet[]>;
  updateBetStatus(betId: string, status: string): Promise<void>;
  getBettingStats(gameId: string): Promise<{ andarTotal: number; baharTotal: number; andarCount: number; baharCount: number }>;
  
  // Card operations
  dealCard(card: InsertDealtCard): Promise<DealtCard>;
  getDealtCards(gameId: string): Promise<DealtCard[]>;
  
  // Game history operations
  addGameHistory(history: InsertGameHistory): Promise<GameHistoryEntry>;
  getGameHistory(limit?: number): Promise<GameHistoryEntry[]>;
  
  // Settings operations
  getGameSettings(): Promise<{ minBet: number; maxBet: number; timerDuration: number }>;
  updateGameSettings(settings: { minBet?: number; maxBet?: number; timerDuration?: number }): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private gameSessions: Map<string, GameSession>;
  private bets: Map<string, PlayerBet>;
  private dealtCards: Map<string, DealtCard[]>;
  private gameHistory: GameHistoryEntry[];
  private currentGameId: string | null;
  private gameSettings: { minBet: number; maxBet: number; timerDuration: number };

  constructor() {
    this.users = new Map();
    this.gameSessions = new Map();
    this.bets = new Map();
    this.dealtCards = new Map();
    this.gameHistory = [];
    this.currentGameId = null;
    this.gameSettings = {
      minBet: 1000,
      maxBet: 50000,
      timerDuration: 30,
    };
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, balance: 1000000 }; // Default balance
    this.users.set(id, user);
    return user;
  }

  async updateUserBalance(userId: string, newBalance: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.balance = newBalance;
    }
  }

  // Game session operations
  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const gameId = randomUUID();
    const now = new Date();
    const gameSession: GameSession = {
      gameId,
      openingCard: session.openingCard || null,
      phase: session.phase || 'idle',
      currentTimer: session.currentTimer || 30,
      status: 'active',
      winner: null,
      winningCard: null,
      round: session.round || 1,
      createdAt: now,
      updatedAt: now,
    };
    this.gameSessions.set(gameId, gameSession);
    this.currentGameId = gameId;
    this.dealtCards.set(gameId, []);
    return gameSession;
  }

  async getCurrentGameSession(): Promise<GameSession | undefined> {
    if (!this.currentGameId) return undefined;
    return this.gameSessions.get(this.currentGameId);
  }

  async updateGameSession(gameId: string, updates: Partial<GameSession>): Promise<void> {
    const session = this.gameSessions.get(gameId);
    if (session) {
      Object.assign(session, updates, { updatedAt: new Date() });
    }
  }

  async completeGameSession(gameId: string, winner: string, winningCard: string): Promise<void> {
    const session = this.gameSessions.get(gameId);
    if (session) {
      session.status = 'completed';
      session.phase = 'complete';
      session.winner = winner;
      session.winningCard = winningCard;
      session.updatedAt = new Date();
    }
  }

  // Betting operations
  async placeBet(bet: InsertBet): Promise<PlayerBet> {
    const id = randomUUID();
    const now = new Date();
    const playerBet: PlayerBet = {
      id,
      userId: bet.userId,
      gameId: bet.gameId,
      round: bet.round,
      side: bet.side,
      amount: bet.amount,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.bets.set(id, playerBet);
    return playerBet;
  }

  async getBetsForGame(gameId: string): Promise<PlayerBet[]> {
    return Array.from(this.bets.values()).filter(bet => bet.gameId === gameId);
  }

  async getBetsForUser(userId: string, gameId: string): Promise<PlayerBet[]> {
    return Array.from(this.bets.values()).filter(
      bet => bet.userId === userId && bet.gameId === gameId
    );
  }

  async updateBetStatus(betId: string, status: string): Promise<void> {
    const bet = this.bets.get(betId);
    if (bet) {
      bet.status = status;
      bet.updatedAt = new Date();
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
    const dealtCard: DealtCard = {
      id,
      gameId: card.gameId,
      card: card.card,
      side: card.side,
      position: card.position,
      isWinningCard: card.isWinningCard || false,
      createdAt: new Date(),
    };
    
    const cards = this.dealtCards.get(card.gameId) || [];
    cards.push(dealtCard);
    this.dealtCards.set(card.gameId, cards);
    
    return dealtCard;
  }

  async getDealtCards(gameId: string): Promise<DealtCard[]> {
    return this.dealtCards.get(gameId) || [];
  }

  // Game history operations
  async addGameHistory(history: InsertGameHistory): Promise<GameHistoryEntry> {
    const id = randomUUID();
    const entry: GameHistoryEntry = {
      id,
      gameId: history.gameId,
      openingCard: history.openingCard,
      winner: history.winner,
      winningCard: history.winningCard,
      totalCards: history.totalCards,
      round: history.round,
      createdAt: new Date(),
    };
    this.gameHistory.push(entry);
    return entry;
  }

  async getGameHistory(limit: number = 50): Promise<GameHistoryEntry[]> {
    return this.gameHistory.slice(-limit).reverse();
  }

  // Settings operations
  async getGameSettings(): Promise<{ minBet: number; maxBet: number; timerDuration: number }> {
    return { ...this.gameSettings };
  }

  async updateGameSettings(settings: { minBet?: number; maxBet?: number; timerDuration?: number }): Promise<void> {
    if (settings.minBet !== undefined) this.gameSettings.minBet = settings.minBet;
    if (settings.maxBet !== undefined) this.gameSettings.maxBet = settings.maxBet;
    if (settings.timerDuration !== undefined) this.gameSettings.timerDuration = settings.timerDuration;
  }
}

export const storage = new MemStorage();

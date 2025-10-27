/**
 * STATE MANAGER - Abstraction layer for game state storage
 * 
 * This module provides a unified interface for storing game state.
 * In development: Uses in-memory storage (fast, but not scalable)
 * In production: Uses Redis (scalable, persistent, supports multiple servers)
 * 
 * CRITICAL: This fixes the in-memory state issue identified in the audit.
 */

import { createClient, RedisClientType } from 'redis';

// Game state interface
export interface GameState {
  gameId: string;
  phase: 'idle' | 'betting' | 'dealing' | 'complete';
  openingCard?: string;
  andarCards: string[];
  baharCards: string[];
  currentRound: number;
  countdown: number;
  totalAndarBets: number;
  totalBaharBets: number;
  winner?: 'andar' | 'bahar';
  activeBets: Record<string, any>;
  connectedPlayers: Set<string>;
}

// Bet interface
export interface PlayerBet {
  userId: string;
  gameId: string;
  side: 'andar' | 'bahar';
  amount: number;
  round: string;
  timestamp: number;
}

/**
 * Abstract State Manager Interface
 */
export interface IStateManager {
  // Game state operations
  getGameState(gameId: string): Promise<GameState | null>;
  setGameState(gameId: string, state: GameState): Promise<void>;
  deleteGameState(gameId: string): Promise<void>;
  
  // Bet operations
  addBet(betId: string, bet: PlayerBet): Promise<void>;
  getBet(betId: string): Promise<PlayerBet | null>;
  getAllBets(gameId: string): Promise<PlayerBet[]>;
  deleteBet(betId: string): Promise<void>;
  
  // Player tracking
  addPlayer(gameId: string, playerId: string): Promise<void>;
  removePlayer(gameId: string, playerId: string): Promise<void>;
  getPlayers(gameId: string): Promise<string[]>;
  
  // Cleanup
  cleanup(): Promise<void>;
}

/**
 * IN-MEMORY STATE MANAGER (Development Only)
 * ⚠️ WARNING: All state is lost on server restart
 * ⚠️ WARNING: Cannot scale beyond single server instance
 */
class InMemoryStateManager implements IStateManager {
  private gameStates: Map<string, GameState> = new Map();
  private bets: Map<string, PlayerBet> = new Map();
  private players: Map<string, Set<string>> = new Map();

  async getGameState(gameId: string): Promise<GameState | null> {
    return this.gameStates.get(gameId) || null;
  }

  async setGameState(gameId: string, state: GameState): Promise<void> {
    this.gameStates.set(gameId, state);
  }

  async deleteGameState(gameId: string): Promise<void> {
    this.gameStates.delete(gameId);
  }

  async addBet(betId: string, bet: PlayerBet): Promise<void> {
    this.bets.set(betId, bet);
  }

  async getBet(betId: string): Promise<PlayerBet | null> {
    return this.bets.get(betId) || null;
  }

  async getAllBets(gameId: string): Promise<PlayerBet[]> {
    return Array.from(this.bets.values()).filter(bet => bet.gameId === gameId);
  }

  async deleteBet(betId: string): Promise<void> {
    this.bets.delete(betId);
  }

  async addPlayer(gameId: string, playerId: string): Promise<void> {
    if (!this.players.has(gameId)) {
      this.players.set(gameId, new Set());
    }
    this.players.get(gameId)!.add(playerId);
  }

  async removePlayer(gameId: string, playerId: string): Promise<void> {
    this.players.get(gameId)?.delete(playerId);
  }

  async getPlayers(gameId: string): Promise<string[]> {
    return Array.from(this.players.get(gameId) || []);
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for in-memory
  }
}

/**
 * REDIS STATE MANAGER (Production)
 * ✅ Persistent: State survives server restarts
 * ✅ Scalable: Supports multiple server instances
 * ✅ Fast: Redis is optimized for real-time operations
 */
class RedisStateManager implements IStateManager {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
    
    this.client.on('error', (err: Error) => {
      console.error('❌ Redis Client Error:', err);
      this.connected = false;
    });
    
    this.client.on('connect', () => {
      console.log('✅ Redis Client Connected');
      this.connected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  private getGameKey(gameId: string): string {
    return `game:${gameId}`;
  }

  private getBetKey(betId: string): string {
    return `bet:${betId}`;
  }

  private getGameBetsKey(gameId: string): string {
    return `game:${gameId}:bets`;
  }

  private getPlayersKey(gameId: string): string {
    return `game:${gameId}:players`;
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    await this.connect();
    const data = await this.client.get(this.getGameKey(gameId));
    return data ? JSON.parse(data) : null;
  }

  async setGameState(gameId: string, state: GameState): Promise<void> {
    await this.connect();
    await this.client.set(
      this.getGameKey(gameId),
      JSON.stringify(state),
      { EX: 3600 } // Expire after 1 hour
    );
  }

  async deleteGameState(gameId: string): Promise<void> {
    await this.connect();
    await this.client.del(this.getGameKey(gameId));
  }

  async addBet(betId: string, bet: PlayerBet): Promise<void> {
    await this.connect();
    // Store bet data
    await this.client.set(
      this.getBetKey(betId),
      JSON.stringify(bet),
      { EX: 3600 }
    );
    // Add to game's bet set
    await this.client.sAdd(this.getGameBetsKey(bet.gameId), betId);
  }

  async getBet(betId: string): Promise<PlayerBet | null> {
    await this.connect();
    const data = await this.client.get(this.getBetKey(betId));
    return data ? JSON.parse(data) : null;
  }

  async getAllBets(gameId: string): Promise<PlayerBet[]> {
    await this.connect();
    const betIds = await this.client.sMembers(this.getGameBetsKey(gameId));
    const bets: PlayerBet[] = [];
    
    for (const betId of betIds) {
      const bet = await this.getBet(betId);
      if (bet) bets.push(bet);
    }
    
    return bets;
  }

  async deleteBet(betId: string): Promise<void> {
    await this.connect();
    const bet = await this.getBet(betId);
    if (bet) {
      await this.client.sRem(this.getGameBetsKey(bet.gameId), betId);
    }
    await this.client.del(this.getBetKey(betId));
  }

  async addPlayer(gameId: string, playerId: string): Promise<void> {
    await this.connect();
    await this.client.sAdd(this.getPlayersKey(gameId), playerId);
  }

  async removePlayer(gameId: string, playerId: string): Promise<void> {
    await this.connect();
    await this.client.sRem(this.getPlayersKey(gameId), playerId);
  }

  async getPlayers(gameId: string): Promise<string[]> {
    await this.connect();
    return await this.client.sMembers(this.getPlayersKey(gameId));
  }

  async cleanup(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

/**
 * STATE MANAGER FACTORY
 * Automatically selects the appropriate state manager based on environment
 */
export function createStateManager(): IStateManager {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl && process.env.NODE_ENV === 'production') {
    console.log('✅ Using Redis State Manager (Production)');
    return new RedisStateManager(redisUrl);
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  WARNING: Using in-memory state in production!');
      console.warn('⚠️  Set REDIS_URL environment variable for production deployment');
    } else {
      console.log('✅ Using In-Memory State Manager (Development)');
    }
    return new InMemoryStateManager();
  }
}

// Export singleton instance
export const stateManager = createStateManager();

import { WebSocket } from 'ws';
import { storage } from './storage';
import { insertBetSchema, insertDealtCardSchema } from '@shared/schema';
import { z } from 'zod';

// Game session state tracking
interface GameSessionState {
  gameId: string;
  openingCard: string | null;
  phase: 'IDLE' | 'BETTING_R1' | 'DEALING_R1' | 'CHECK_R1' | 'BETTING_R2' | 'DEALING_R2' | 'CHECK_R2' | 'CONTINUOUS_DRAW' | 'COMPLETE';
  currentRound: 1 | 2 | 3;
  andarCards: { card: string; position: number }[];
  baharCards: { card: string; position: number }[];
  timer: number;
  winner: 'andar' | 'bahar' | null;
  winningCard: string | null;
  winningRound: 1 | 2 | 3 | null;
  round1Bets: { userId: string; side: 'andar' | 'bahar'; amount: number }[];
  round2Bets: { userId: string; side: 'andar' | 'bahar'; amount: number }[];
  continuousDrawBets: { userId: string; side: 'andar' | 'bahar'; amount: number }[];
  timerInterval: NodeJS.Timeout | null;
}

class GameLoopService {
  private gameSessions: Map<string, GameSessionState> = new Map();
  private static instance: GameLoopService;
  
  private constructor() {}
  
  public static getInstance(): GameLoopService {
    if (!GameLoopService.instance) {
      GameLoopService.instance = new GameLoopService();
    }
    return GameLoopService.instance;
  }
  
  // Create a new game session
  public createGameSession(): GameSessionState {
    const gameId = `game-${Date.now()}`;
    
    const gameState: GameSessionState = {
      gameId,
      openingCard: null,
      phase: 'IDLE',
      currentRound: 1,
      andarCards: [],
      baharCards: [],
      timer: 0,
      winner: null,
      winningCard: null,
      winningRound: null,
      round1Bets: [],
      round2Bets: [],
      continuousDrawBets: [],
      timerInterval: null
    };
    
    this.gameSessions.set(gameId, gameState);
    return gameState;
  }
  
  // Start Round 1 betting
  public async startRound1Betting(gameId: string, openingCard: string): Promise<GameSessionState> {
    let gameState = this.gameSessions.get(gameId);
    if (!gameState) {
      gameState = this.createGameSession();
      gameId = gameState.gameId;
    }
    
    gameState.openingCard = openingCard;
    gameState.phase = 'BETTING_R1';
    gameState.currentRound = 1;
    gameState.timer = 30;
    
    // Store in database
    await storage.updateGameSession(gameId, {
      openingCard,
      phase: 'betting',
      currentTimer: 30,
      round: 1
    });
    
    // Start 30-second timer
    this.startTimer(gameId, 30, () => {
      this.onRound1TimerEnd(gameId);
    });
    
    return gameState;
  }
  
  // Start Round 2 betting
  public async startRound2Betting(gameId: string): Promise<GameSessionState> {
    let gameState = this.gameSessions.get(gameId);
    if (!gameState) {
      throw new Error(`Game session ${gameId} not found`);
    }
    
    gameState.phase = 'BETTING_R2';
    gameState.currentRound = 2;
    gameState.timer = 30;
    
    // Store in database
    await storage.updateGameSession(gameId, {
      phase: 'betting',
      currentTimer: 30,
      round: 2
    });
    
    // Start 30-second timer
    this.startTimer(gameId, 30, () => {
      this.onRound2TimerEnd(gameId);
    });
    
    return gameState;
  }
  
  // Start continuous draw
  public async startContinuousDraw(gameId: string): Promise<GameSessionState> {
    let gameState = this.gameSessions.get(gameId);
    if (!gameState) {
      throw new Error(`Game session ${gameId} not found`);
    }
    
    gameState.phase = 'CONTINUOUS_DRAW';
    gameState.currentRound = 3;
    
    // Store in database
    await storage.updateGameSession(gameId, {
      phase: 'dealing',
      round: 3
    });
    
    return gameState;
  }
  
  // Place a bet in the current round
  public async placeBet(gameId: string, userId: string, side: 'andar' | 'bahar', amount: number): Promise<boolean> {
    const gameState = this.gameSessions.get(gameId);
    if (!gameState) {
      return false;
    }
    
    // Check if betting is allowed in current phase
    const canBet = ['BETTING_R1', 'BETTING_R2'].includes(gameState.phase);
    if (!canBet) {
      return false;
    }
    
    // Check if user has sufficient balance
    const user = await storage.getUser(userId);
    if (!user || user.balance < amount) {
      return false;
    }
    
    // Add bet based on current round
    if (gameState.currentRound === 1) {
      gameState.round1Bets.push({ userId, side, amount });
    } else if (gameState.currentRound === 2) {
      gameState.round2Bets.push({ userId, side, amount });
    }
    
    // Deduct bet amount from user balance
    await storage.updateUserBalance(userId, user.balance - amount);
    
    return true;
  }
  
  // Deal a card
  public async dealCard(gameId: string, card: string, side: 'andar' | 'bahar', position: number): Promise<GameSessionState> {
    const gameState = this.gameSessions.get(gameId);
    if (!gameState) {
      throw new Error(`Game session ${gameId} not found`);
    }
    
    // Add to game state
    if (side === 'andar') {
      gameState.andarCards.push({ card, position });
    } else {
      gameState.baharCards.push({ card, position });
    }
    
    // Check if this card matches the opening card (winning condition)
    let isWinningCard = false;
    if (gameState.openingCard && gameState.openingCard.length >= 1 && card.length >= 1) {
      // Check if rank matches (first character of card string)
      const openingRank = gameState.openingCard.charAt(0);
      const dealtRank = card.charAt(0);
      isWinningCard = openingRank === dealtRank;
    }
    
    if (isWinningCard) {
      // Set winner and winning card in game state
      gameState.winner = side;
      gameState.winningCard = card;
      gameState.winningRound = gameState.currentRound;
      gameState.phase = 'COMPLETE';
      
      // Stop timer if running
      if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
      }
      
      // Complete game session in database
      await storage.completeGameSession(gameId, side, card);
      
      // Add to game history with winning round
      await storage.addGameHistory({
        gameId: gameId,
        openingCard: gameState.openingCard!,
        winner: side,
        winningCard: card,
        totalCards: gameState.andarCards.length + gameState.baharCards.length,
        round: gameState.winningRound
      });
      
      // Calculate and distribute winnings
      await this.calculateAndDistributeWinnings(gameId, side, card, gameState);
      
    } else {
      // Card is not winning, so we need to progress the game flow
      if (gameState.phase === 'DEALING_R1') {
        // After Round 1 dealing, no winner found, proceed to Round 2
        gameState.phase = 'BETTING_R2';
        gameState.currentRound = 2;
        
        // Update game session in storage
        await storage.updateGameSession(gameId, {
          phase: 'betting',
          round: 2
        });
        
      } else if (gameState.phase === 'DEALING_R2') {
        // After Round 2 dealing, no winner found, start continuous draw
        gameState.phase = 'CONTINUOUS_DRAW';
        gameState.currentRound = 3;
        
        // Update game session in storage
        await storage.updateGameSession(gameId, {
          phase: 'dealing',
          round: 3
        });
      }
    }
    
    return gameState;
  }
  
  // Private methods
  private startTimer(gameId: string, seconds: number, callback: () => void): void {
    const gameState = this.gameSessions.get(gameId);
    if (!gameState) return;
    
    // Clear existing timer
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
    }
    
    let remainingSeconds = seconds;
    
    gameState.timer = remainingSeconds;
    
    gameState.timerInterval = setInterval(() => {
      gameState.timer = remainingSeconds;
      remainingSeconds--;
      
      if (remainingSeconds < 0) {
        if (gameState.timerInterval) {
          clearInterval(gameState.timerInterval);
        }
        gameState.timerInterval = null;
        callback();
      }
    }, 1000);
  }
  
  private async onRound1TimerEnd(gameId: string): Promise<void> {
    const gameState = this.gameSessions.get(gameId);
    if (!gameState) return;
    
    // Round 1 betting is over, move to dealing phase
    gameState.phase = 'DEALING_R1';
    
    // Update database
    await storage.updateGameSession(gameId, {
      phase: 'dealing',
      currentTimer: 0,
      round: 1
    });
  }
  
  private async onRound2TimerEnd(gameId: string): Promise<void> {
    const gameState = this.gameSessions.get(gameId);
    if (!gameState) return;
    
    // Round 2 betting is over, move to dealing phase
    gameState.phase = 'DEALING_R2';
    
    // Update database
    await storage.updateGameSession(gameId, {
      phase: 'dealing',
      currentTimer: 0,
      round: 2
    });
  }
  
  // Calculate and distribute winnings based on complex payout rules
  private async calculateAndDistributeWinnings(gameId: string, winningSide: 'andar' | 'bahar', winningCard: string, gameState: GameSessionState): Promise<void> {
    if (gameState.winningRound === 1) {
      // Round 1 winner
      const winningBets = gameState.round1Bets.filter(bet => bet.side === winningSide);
      for (const bet of winningBets) {
        const user = await storage.getUser(bet.userId);
        if (user) {
          // 1:1 payout for Andar winner, 1:0 for Bahar winner
          const payout = winningSide === 'andar' ? 2 * bet.amount : bet.amount;
          await storage.updateUserBalance(bet.userId, user.balance + payout);
        }
      }
    } else if (gameState.winningRound === 2) {
      // Round 2 winner - different payouts for R1 vs R2 bets
      // R1 bets get 1:1 payout (original + profit)
      const round1Winners = gameState.round1Bets.filter(bet => bet.side === winningSide);
      for (const bet of round1Winners) {
        const user = await storage.getUser(bet.userId);
        if (user) {
          // 1:1 payout = original bet + same amount as profit = 2x bet
          await storage.updateUserBalance(bet.userId, user.balance + 2 * bet.amount);
        }
      }
      
      // R2 bets get 1:0 payout (refund only)
      const round2Winners = gameState.round2Bets.filter(bet => bet.side === winningSide);
      for (const bet of round2Winners) {
        const user = await storage.getUser(bet.userId);
        if (user) {
          // 1:0 payout = return original bet
          await storage.updateUserBalance(bet.userId, user.balance + bet.amount);
        }
      }
    } else {
      // Round 3 winner - 1:1 on total investment for winning side
      const allWinningBets = [
        ...gameState.round1Bets.filter(bet => bet.side === winningSide),
        ...gameState.round2Bets.filter(bet => bet.side === winningSide),
        ...gameState.continuousDrawBets.filter(bet => bet.side === winningSide)
      ];
      
      for (const bet of allWinningBets) {
        const user = await storage.getUser(bet.userId);
        if (user) {
          // 1:1 payout = original bet + same amount as profit = 2x bet
          await storage.updateUserBalance(bet.userId, user.balance + 2 * bet.amount);
        }
      }
    }
    
    // Update bet statuses for all bets
    const allBets = [
      ...gameState.round1Bets,
      ...gameState.round2Bets,
      ...gameState.continuousDrawBets
    ];
    
    for (const bet of allBets) {
      const won = bet.side === winningSide;
      await storage.updateBetStatus(bet.userId, won ? 'won' : 'lost');
    }
  }
  
  // Get game state
  public getGameState(gameId: string): GameSessionState | undefined {
    return this.gameSessions.get(gameId);
  }
  
  // Reset game
  public resetGame(gameId: string): void {
    const gameState = this.gameSessions.get(gameId);
    if (gameState && gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
    }
    this.gameSessions.delete(gameId);
  }
}

export const gameLoopService = GameLoopService.getInstance();
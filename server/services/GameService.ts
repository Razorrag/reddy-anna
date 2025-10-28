/**
 * GAME SERVICE
 * 
 * Extracts game business logic from server/index.ts
 * Handles all game-related operations with proper validation
 */

import { storage } from '../storage-supabase';
import { stateManager } from '../state-manager';

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
}

export interface BetData {
  userId: string;
  gameId: string;
  side: 'andar' | 'bahar';
  amount: number;
  round: string;
}

export class GameService {
  private readonly MIN_BET = parseInt(process.env.MIN_BET || '1000');
  private readonly MAX_BET = parseInt(process.env.MAX_BET || '100000');

  /**
   * Start a new game
   */
  async startGame(openingCard: string, adminId: string): Promise<GameState> {
    // Validate admin permission
    const admin = await storage.getUser(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can start games');
    }

    // Validate opening card
    if (!this.isValidCard(openingCard)) {
      throw new Error('Invalid opening card');
    }

    // Create game in database
    const gameId = `game-${Date.now()}`;
    const game = await storage.createGameSession({
      game_id: gameId,
      opening_card: openingCard,
      phase: 'betting',
      status: 'active',
      current_round: 1,
      current_timer: 30,
      andar_cards: [],
      bahar_cards: [],
    });

    // Initialize game state
    const gameState: GameState = {
      gameId: game.gameId || gameId,
      phase: 'betting',
      openingCard,
      andarCards: [],
      baharCards: [],
      currentRound: 1,
      countdown: 30,
      totalAndarBets: 0,
      totalBaharBets: 0,
    };

    await stateManager.setGameState(gameId, gameState);

    console.log(`✅ Game started: ${gameId} by admin ${adminId}`);
    return gameState;
  }

  /**
   * Place a bet with full server-side validation
   */
  async placeBet(betData: BetData): Promise<{ success: boolean; message: string }> {
    const { userId, gameId, side, amount, round } = betData;

    // 1. Validate user exists
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 2. Validate game exists and is in betting phase
    const gameState = await stateManager.getGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    if (gameState.phase !== 'betting') {
      throw new Error('Betting is closed for this round');
    }

    // 3. Validate bet side
    if (side !== 'andar' && side !== 'bahar') {
      throw new Error('Invalid bet side. Must be "andar" or "bahar"');
    }

    // 4. Validate bet amount
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid bet amount');
    }

    if (amount < this.MIN_BET) {
      throw new Error(`Minimum bet is ₹${this.MIN_BET}`);
    }

    if (amount > this.MAX_BET) {
      throw new Error(`Maximum bet is ₹${this.MAX_BET}`);
    }

    // 5. Check for duplicate bets in same round (before balance check)
    const existingBets = await stateManager.getAllBets(gameId);
    const userBetsThisRound = existingBets.filter(
      bet => bet.userId === userId && bet.round === round && bet.side === side
    );

    if (userBetsThisRound.length > 0) {
      throw new Error('You have already placed a bet on this side for this round');
    }

    // 6. Deduct balance atomically (prevents race conditions)
    try {
      await storage.updateUserBalance(userId, -amount);
    } catch (error: any) {
      if (error.message?.includes('Insufficient balance')) {
        const currentBalance = parseFloat(user.balance);
        throw new Error(`Insufficient balance. You have ₹${currentBalance}, but bet is ₹${amount}`);
      }
      throw error;
    }

    // 8. Record bet in database
    const bet = await storage.createBet({
      user_id: userId,
      game_id: gameId,
      round,
      side,
      amount: amount.toString(),
      status: 'pending',
    });

    // 9. Store bet in state manager
    await stateManager.addBet(bet.id, {
      userId,
      gameId,
      side,
      amount,
      round,
      timestamp: Date.now(),
    });

    // 10. Update game state totals
    if (side === 'andar') {
      gameState.totalAndarBets += amount;
    } else {
      gameState.totalBaharBets += amount;
    }
    await stateManager.setGameState(gameId, gameState);

    console.log(`✅ Bet placed: ${userId} bet ₹${amount} on ${side} (Game: ${gameId})`);

    return {
      success: true,
      message: `Bet of ₹${amount} placed on ${side}`,
    };
  }

  /**
   * Deal a card
   */
  async dealCard(
    gameId: string,
    card: string,
    side: 'andar' | 'bahar',
    position: number,
    adminId: string
  ): Promise<GameState> {
    // Validate admin permission
    const admin = await storage.getUser(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can deal cards');
    }

    // Validate card
    if (!this.isValidCard(card)) {
      throw new Error('Invalid card');
    }

    // Get game state
    const gameState = await stateManager.getGameState(gameId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    if (gameState.phase !== 'dealing') {
      throw new Error('Game is not in dealing phase');
    }

    // Add card to appropriate side
    if (side === 'andar') {
      gameState.andarCards.push(card);
    } else {
      gameState.baharCards.push(card);
    }

    // Record in database
    await storage.createDealtCard({
      game_id: gameId,
      card,
      side,
      position,
      is_winning_card: false,
    });

    // Check for winner
    const winner = this.checkWinner(card, gameState.openingCard!, side);
    if (winner) {
      gameState.winner = winner;
      gameState.phase = 'complete';
      await this.processWinnings(gameId, winner);
    }

    await stateManager.setGameState(gameId, gameState);

    console.log(`✅ Card dealt: ${card} on ${side} (Game: ${gameId})`);
    return gameState;
  }

  /**
   * Process winnings for completed game
   */
  private async processWinnings(gameId: string, winningSide: 'andar' | 'bahar'): Promise<void> {
    const bets = await stateManager.getAllBets(gameId);

    for (const bet of bets) {
      if (bet.side === winningSide) {
        // Calculate payout (2x for simplicity, adjust based on your rules)
        const payout = bet.amount * 2;

        // Update user balance
        const user = await storage.getUser(bet.userId);
        if (user) {
          const newBalance = parseFloat(user.balance) + payout;
          await storage.updateUser(bet.userId, { balance: newBalance.toFixed(2) });

          // Update bet status
          await storage.updateBet(gameId, bet.userId, {
            status: 'completed',
            actual_payout: payout.toString(),
          });

          console.log(`💰 Payout: ${bet.userId} won ₹${payout}`);
        }
      } else {
        // Losing bet
        await storage.updateBet(gameId, bet.userId, {
          status: 'completed',
          actual_payout: '0',
        });
      }
    }
  }

  /**
   * Get current game state
   */
  async getCurrentGame(): Promise<GameState | null> {
    // In a real implementation, you'd track the current active game
    // For now, return the most recent game from state manager
    const streams = stateManager.getActiveStreams();
    if (streams.length > 0) {
      return await stateManager.getGameState(streams[0].streamId);
    }
    return null;
  }

  /**
   * Validate card format (e.g., "A♠", "K♥", "10♦")
   */
  private isValidCard(card: string): boolean {
    const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const validSuits = ['♠', '♥', '♦', '♣'];

    const rank = card.slice(0, -1);
    const suit = card.slice(-1);

    return validRanks.includes(rank) && validSuits.includes(suit);
  }

  /**
   * Check if card matches opening card (same rank)
   * Returns the side where the matching card was dealt
   */
  private checkWinner(dealtCard: string, openingCard: string, side: 'andar' | 'bahar'): 'andar' | 'bahar' | null {
    const dealtRank = dealtCard.slice(0, -1);
    const openingRank = openingCard.slice(0, -1);

    // If ranks match, the side where the card was dealt wins
    if (dealtRank === openingRank) {
      return side;
    }

    return null;
  }
}

// Export singleton instance
export const gameService = new GameService();

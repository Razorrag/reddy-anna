/**
 * ============================================
 * ANDAR BAHAR GAME - STATE MACHINE
 * ============================================
 * 
 * This state machine manages game phases and round transitions.
 * It ensures that:
 * 1. Games follow the correct phase sequence
 * 2. Round transitions happen at the right times
 * 3. Betting windows open/close correctly
 * 4. Invalid state transitions are prevented
 * 
 * Phase Flow:
 * idle -> betting (round 1) -> dealing -> betting (round 2) -> dealing -> dealing (round 3) -> complete
 */

import { storage } from '../storage-supabase';
import type { GamePhase } from '@shared/schema';

/**
 * Game events that trigger state transitions
 */
export type GameEvent =
  | { type: 'OPENING_CARD_SET'; data: { card: string } }
  | { type: 'TIMER_EXPIRED'; data: { phase: GamePhase; round: number } }
  | { type: 'CARD_DEALT'; data: { card: string; side: 'andar' | 'bahar'; andarCount: number; baharCount: number; winner?: 'andar' | 'bahar' } }
  | { type: 'GAME_COMPLETE'; data: { winner: 'andar' | 'bahar'; winningCard: string; round: number } }
  | { type: 'GAME_RESET'; data: {} };

/**
 * State machine state
 */
export interface GameState {
  phase: GamePhase;
  round: 1 | 2 | 3;
  canBet: boolean;
  canDeal: boolean;
  isComplete: boolean;
}

/**
 * Game State Machine
 * Manages game phases and round transitions
 */
export class GameStateMachine {
  private gameId: string;
  private state: GameState;

  constructor(gameId: string, initialPhase: GamePhase = 'idle', initialRound: 1 | 2 | 3 = 1) {
    this.gameId = gameId;
    this.state = {
      phase: initialPhase,
      round: initialRound,
      canBet: initialPhase === 'betting',
      canDeal: initialPhase === 'dealing',
      isComplete: initialPhase === 'complete'
    };
  }

  /**
   * Get current state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Process a game event and transition state if needed
   */
  async transition(event: GameEvent): Promise<GameState> {
    const oldState = { ...this.state };
    
    console.log(`🎮 State Machine: Processing ${event.type} in phase=${this.state.phase}, round=${this.state.round}`);

    switch (event.type) {
      case 'OPENING_CARD_SET':
        await this.handleOpeningCardSet(event.data);
        break;

      case 'TIMER_EXPIRED':
        await this.handleTimerExpired(event.data);
        break;

      case 'CARD_DEALT':
        await this.handleCardDealt(event.data);
        break;

      case 'GAME_COMPLETE':
        await this.handleGameComplete(event.data);
        break;

      case 'GAME_RESET':
        await this.handleGameReset();
        break;

      default:
        console.warn(`⚠️ Unknown event type: ${(event as any).type}`);
    }

    // Persist state change to database if changed
    if (
      oldState.phase !== this.state.phase ||
      oldState.round !== this.state.round
    ) {
      await this.persist();
      console.log(`✅ State transition: ${oldState.phase}(R${oldState.round}) -> ${this.state.phase}(R${this.state.round})`);
    }

    return this.getState();
  }

  /**
   * Handle opening card being set
   * Transition: idle -> betting (round 1)
   */
  private async handleOpeningCardSet(data: { card: string }): Promise<void> {
    if (this.state.phase !== 'idle') {
      console.warn(`⚠️ Opening card set in phase ${this.state.phase}, expected idle`);
      return;
    }

    this.state.phase = 'betting';
    this.state.round = 1;
    this.state.canBet = true;
    this.state.canDeal = false;
    this.state.isComplete = false;

    console.log(`🎴 Opening card set: ${data.card}, entering betting phase (Round 1)`);
  }

  /**
   * Handle timer expiration
   * Transition: betting -> dealing
   */
  private async handleTimerExpired(data: { phase: GamePhase; round: number }): Promise<void> {
    if (this.state.phase !== 'betting') {
      console.warn(`⚠️ Timer expired in phase ${this.state.phase}, expected betting`);
      return;
    }

    this.state.phase = 'dealing';
    this.state.canBet = false;
    this.state.canDeal = true;

    console.log(`⏰ Timer expired in Round ${this.state.round}, entering dealing phase`);
  }

  /**
   * Handle card being dealt
   * Manages round transitions based on card counts
   */
  private async handleCardDealt(data: {
    card: string;
    side: 'andar' | 'bahar';
    andarCount: number;
    baharCount: number;
    winner?: 'andar' | 'bahar';
  }): Promise<void> {
    const totalCards = data.andarCount + data.baharCount;

    console.log(`🎴 Card dealt: ${data.card} on ${data.side} (Total cards: ${totalCards}, Winner: ${data.winner || 'none'})`);

    // If winner found, game is complete
    if (data.winner) {
      this.state.phase = 'complete';
      this.state.canBet = false;
      this.state.canDeal = false;
      this.state.isComplete = true;
      console.log(`🏆 Winner found: ${data.winner}, game complete`);
      return;
    }

    // Round 1: After 2 cards dealt (1 andar + 1 bahar), open round 2 betting
    if (this.state.round === 1 && totalCards === 2) {
      this.state.phase = 'betting';
      this.state.round = 2;
      this.state.canBet = true;
      this.state.canDeal = false;
      console.log(`🔄 Round 1 complete (2 cards), opening Round 2 betting`);
      return;
    }

    // Round 2: After 4 cards total (2 andar + 2 bahar), continue dealing (round 3)
    if (this.state.round === 2 && totalCards === 4) {
      this.state.phase = 'dealing';
      this.state.round = 3;
      this.state.canBet = false;
      this.state.canDeal = true;
      console.log(`🔄 Round 2 complete (4 cards total), continuing to Round 3 (no betting)`);
      return;
    }

    // Otherwise, stay in dealing phase
    if (this.state.phase !== 'dealing') {
      this.state.phase = 'dealing';
      this.state.canBet = false;
      this.state.canDeal = true;
    }
  }

  /**
   * Handle game completion
   */
  private async handleGameComplete(data: {
    winner: 'andar' | 'bahar';
    winningCard: string;
    round: number;
  }): Promise<void> {
    this.state.phase = 'complete';
    this.state.canBet = false;
    this.state.canDeal = false;
    this.state.isComplete = true;

    console.log(`🎉 Game complete: ${data.winner} wins with ${data.winningCard} in Round ${data.round}`);
  }

  /**
   * Handle game reset
   */
  private async handleGameReset(): Promise<void> {
    this.state.phase = 'idle';
    this.state.round = 1;
    this.state.canBet = false;
    this.state.canDeal = false;
    this.state.isComplete = false;

    console.log(`🔄 Game reset to idle state`);
  }

  /**
   * Persist state to database
   */
  private async persist(): Promise<void> {
    try {
      // Validate state before persisting
      const isValid = await this.validate();
      if (!isValid) {
        console.error(`❌ Invalid state, not persisting: ${JSON.stringify(this.state)}`);
        return;
      }

      await storage.updateGameSession(this.gameId, {
        phase: this.state.phase,
        round: this.state.round as any,
        updated_at: new Date()
      } as any);

      console.log(`💾 State persisted to database: phase=${this.state.phase}, round=${this.state.round}`);
    } catch (error) {
      console.error(`❌ Failed to persist state:`, error);
      throw error;
    }
  }

  /**
   * Validate current state
   */
  private async validate(): Promise<boolean> {
    // Check valid phase
    if (!['idle', 'betting', 'dealing', 'complete'].includes(this.state.phase)) {
      console.error(`❌ Invalid phase: ${this.state.phase}`);
      return false;
    }

    // Check valid round
    if (![1, 2, 3].includes(this.state.round)) {
      console.error(`❌ Invalid round: ${this.state.round}`);
      return false;
    }

    // Check phase-round consistency
    if (this.state.phase === 'idle' && this.state.round !== 1) {
      console.error(`❌ Idle phase should have round 1, got round ${this.state.round}`);
      return false;
    }

    if (this.state.phase === 'complete' && this.state.round === 1) {
      console.error(`❌ Complete phase cannot be in round 1`);
      return false;
    }

    return true;
  }

  /**
   * Check if betting is currently allowed
   */
  canPlaceBet(): boolean {
    return this.state.canBet && this.state.phase === 'betting' && !this.state.isComplete;
  }

  /**
   * Check if dealing is currently allowed
   */
  canDealCard(): boolean {
    return this.state.canDeal && this.state.phase === 'dealing' && !this.state.isComplete;
  }

  /**
   * Check if game is complete
   */
  isGameComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * Get current round
   */
  getCurrentRound(): 1 | 2 | 3 {
    return this.state.round;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): GamePhase {
    return this.state.phase;
  }
}

/**
 * Factory function to create or restore state machine from database
 */
export async function createStateMachine(gameId: string): Promise<GameStateMachine> {
  try {
    // Try to get existing game state from database
    const gameSession = await storage.getGameSession(gameId);
    
    if (gameSession) {
      const phase = (gameSession.phase || 'idle') as GamePhase;
      const round = ((gameSession as any).current_round || 1) as 1 | 2 | 3;
      console.log(`🔄 Restoring state machine from database: phase=${phase}, round=${round}`);
      return new GameStateMachine(gameId, phase, round);
    }

    // Create new state machine in idle state
    console.log(`🆕 Creating new state machine in idle state`);
    return new GameStateMachine(gameId, 'idle', 1);
  } catch (error) {
    console.error(`❌ Error creating state machine:`, error);
    // Fallback to new state machine
    return new GameStateMachine(gameId, 'idle', 1);
  }
}

import { useCallback } from 'react';

export interface Card {
  value: string;
  suit: string;
  display: string;
}

export interface GameState {
  phase: 'idle' | 'betting' | 'dealing' | 'completed';
  currentRound: number;
  openingCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
  countdown: number;
  winner: 'andar' | 'bahar' | null;
  round1Bets: { andar: number; bahar: number };
  round2Bets: { andar: number; bahar: number };
  totalBets: { andar: number; bahar: number };
}

export interface PlayerBets {
  round1: { andar: number; bahar: number };
  round2: { andar: number; bahar: number };
  currentBet: number;
}

export const initializeGameState = (): GameState => ({
  phase: 'idle',
  currentRound: 0,
  openingCard: null,
  andarCards: [],
  baharCards: [],
  countdown: 0,
  winner: null,
  round1Bets: { andar: 0, bahar: 0 },
  round2Bets: { andar: 0, bahar: 0 },
  totalBets: { andar: 0, bahar: 0 },
});

export const isValidCard = (card: any): card is Card => {
  return (
    typeof card === 'object' &&
    typeof card.value === 'string' &&
    typeof card.suit === 'string' &&
    typeof card.display === 'string' &&
    ['♠', '♥', '♦', '♣'].includes(card.suit) &&
    card.value.length > 0
  );
};

export const getCardValue = (card: Card): number => {
  const valueMap: { [key: string]: number } = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13
  };
  
  return valueMap[card.value] || 0;
};

export const isWinningCard = (card: Card, openingCard: Card): boolean => {
  return getCardValue(card) === getCardValue(openingCard);
};

export const calculateWinner = (gameState: GameState): 'andar' | 'bahar' | null => {
  if (!gameState.openingCard) return null;
  
  // Check if last card on andar side matches opening card
  if (gameState.andarCards.length > 0) {
    const lastAndarCard = gameState.andarCards[gameState.andarCards.length - 1];
    if (isWinningCard(lastAndarCard, gameState.openingCard)) {
      return 'andar';
    }
  }
  
  // Check if last card on bahar side matches opening card
  if (gameState.baharCards.length > 0) {
    const lastBaharCard = gameState.baharCards[gameState.baharCards.length - 1];
    if (isWinningCard(lastBaharCard, gameState.openingCard)) {
      return 'bahar';
    }
  }
  
  return null;
};

export const getWinnerSideCards = (gameState: GameState): Card[] => {
  if (!gameState.winner) return [];
  
  return gameState.winner === 'andar' 
    ? gameState.andarCards 
    : gameState.baharCards;
};

export const calculatePayout = (betAmount: number, side: 'andar' | 'bahar', winner: 'andar' | 'bahar' | null, gameState: GameState): number => {
  if (!winner) return 0;
  if (side !== winner) return 0;
  
  // In Andar Bahar, winning side typically gets 1:1 payout minus commission
  // For the 5th card special case: 4:1 payout before commission
  const winningCards = getWinnerSideCards(gameState);
  
  if (winningCards.length === 5) {
    // Special payout for 5th card: 4:1 (before commission)
    return betAmount * 4; // This would typically be 4:1 before commission
  }
  
  // Regular payout: 1:1 minus commission (typically 5-10%)
  const commission = 0.05; // 5% commission
  return betAmount * (1 - commission);
};

export const getRoundPhase = (round: number): 'idle' | 'betting' | 'dealing' => {
  return round === 0 ? 'idle' : round === 1 || round === 2 ? 'betting' : 'dealing';
};

export const generateRandomCard = (): Card => {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const randomSuit = suits[Math.floor(Math.random() * suits.length)];
  const randomValue = values[Math.floor(Math.random() * values.length)];
  return { 
    display: `${randomValue}${randomSuit}`, 
    value: randomValue, 
    suit: randomSuit 
  };
};

export const dealCardToSide = (gameState: GameState, side: 'andar' | 'bahar'): GameState => {
  const newCard = generateRandomCard();
  const updatedGame = { ...gameState };
  
  if (side === 'andar') {
    updatedGame.andarCards = [...updatedGame.andarCards, newCard];
  } else {
    updatedGame.baharCards = [...updatedGame.baharCards, newCard];
  }
  
  // Check if this card wins the game
  if (gameState.openingCard && isWinningCard(newCard, gameState.openingCard)) {
    updatedGame.winner = side;
    updatedGame.phase = 'completed';
    updatedGame.countdown = 0;
  }
  
  return updatedGame;
};

// Custom hook to encapsulate game logic and prevent duplication
export const useGameLogic = () => {
  const calculateTotalBets = useCallback((round1Bets: { andar: number; bahar: number }, round2Bets: { andar: number; bahar: number }) => {
    return {
      andar: round1Bets.andar + round2Bets.andar,
      bahar: round1Bets.bahar + round2Bets.bahar
    };
  }, []);

  const updateGameStateWithBet = useCallback((state: GameState, side: 'andar' | 'bahar', amount: number, round: number): GameState => {
    const newState = { ...state };
    
    if (round === 1) {
      newState.round1Bets = {
        ...newState.round1Bets,
        [side]: newState.round1Bets[side] + amount
      };
    } else if (round === 2) {
      newState.round2Bets = {
        ...newState.round2Bets,
        [side]: newState.round2Bets[side] + amount
      };
    }
    
    // Update total bets
    newState.totalBets = calculateTotalBets(newState.round1Bets, newState.round2Bets);
    
    return newState;
  }, [calculateTotalBets]);

  const addCardToGame = useCallback((state: GameState, side: 'andar' | 'bahar', card: Card): GameState => {
    const newState = { ...state };
    
    if (side === 'andar') {
      newState.andarCards = [...newState.andarCards, card];
    } else {
      newState.baharCards = [...newState.baharCards, card];
    }
    
    // Check if this is a winning card
    if (newState.openingCard) {
      const winner = calculateWinner(newState);
      
      if (winner) {
        newState.winner = winner;
        newState.phase = 'completed';
      }
    }
    
    return newState;
  }, []);

  const resetGame = useCallback((preserveBets: boolean = false): GameState => {
    const newState = initializeGameState();
    
    if (preserveBets) {
      // Preserve betting state for next round
      newState.round1Bets = { andar: 0, bahar: 0 };
      newState.round2Bets = { andar: 0, bahar: 0 };
      newState.totalBets = { andar: 0, bahar: 0 };
    }
    
    return newState;
  }, []);

  const validateGameState = useCallback((state: GameState): boolean => {
    // Basic validation
    if (!state.openingCard && state.phase !== 'idle') {
      return false;
    }
    
    if (state.phase === 'completed' && !state.winner) {
      return false;
    }
    
    if (state.andarCards.length !== state.baharCards.length && 
        state.andarCards.length !== state.baharCards.length + 1) {
      return false;
    }
    
    return true;
  }, []);

  const getGameStatistics = useCallback((state: GameState) => {
    return {
      totalCards: state.andarCards.length + state.baharCards.length,
      andarCards: state.andarCards.length,
      baharCards: state.baharCards.length,
      totalBets: state.totalBets.andar + state.totalBets.bahar,
      phase: state.phase,
      round: state.currentRound,
      hasWinner: !!state.winner,
      winner: state.winner
    };
  }, []);

  return {
    // Core game functions
    calculateTotalBets,
    updateGameStateWithBet,
    addCardToGame,
    resetGame,
    validateGameState,
    getGameStatistics,
    
    // Utility functions
    generateRandomCard,
    getCardValue,
    isWinningCard,
    calculateWinner,
    getWinnerSideCards,
    calculatePayout,
    getRoundPhase,
    isValidCard,
    
    // Initializer
    initializeGameState
  };
};

/**
 * Player Game Page - Main Player Interface
 * 
 * This is the main game interface for players participating in Andar Bahar.
 * Uses the new MobileGameLayout for a unified mobile-first design.
 */

import React, { useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { useNotification } from '../contexts/NotificationContext';
import MobileGameLayout from '../components/MobileGameLayout/MobileGameLayout';
import { GameHistoryModal } from '../components/GameHistoryModal';
import type { BetSide } from '../types/game';

const PlayerGame: React.FC = () => {
  const { showNotification } = useNotification();
  const { gameState, placeBet } = useGame();

  // Mock user data
  const user = { id: 'player-1', username: 'Player' };
  
  // Local state
  const [selectedBetAmount, setSelectedBetAmount] = useState(1000);
  const [selectedPosition, setSelectedPosition] = useState<BetSide | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [userBalance, setUserBalance] = useState(50000); // Mock balance
  const [showChipSelector, setShowChipSelector] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Available bet amounts
  const betAmounts = [1000, 5000, 10000, 20000, 50000];

  // Place bet handler
  const handlePlaceBet = useCallback(async (position: BetSide) => {
    if (selectedBetAmount === 0) {
      showNotification('Please select a chip first', 'error');
      return;
    }

    if (selectedBetAmount > userBalance) {
      showNotification('Insufficient balance', 'error');
      return;
    }

    if (gameState.phase !== 'betting') {
      showNotification('Betting is not open', 'error');
      return;
    }

    setIsPlacingBet(true);

    try {
      // Use the game context placeBet function
      placeBet(position, selectedBetAmount);

      // Update local balance (optimistic)
      setUserBalance(prev => prev - selectedBetAmount);

      showNotification(`Bet placed: ₹${selectedBetAmount} on ${position}`, 'success');
    } catch (error) {
      showNotification('Failed to place bet', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  }, [selectedBetAmount, userBalance, gameState, placeBet, showNotification]);

  // Handle bet position selection
  const handlePositionSelect = useCallback((position: BetSide) => {
    if (gameState.phase !== 'betting') {
      showNotification('Betting is not open', 'error');
      return;
    }
    setSelectedPosition(position);
  }, [gameState.phase, showNotification]);

  // Handle chip selection
  const handleChipSelect = useCallback((amount: number) => {
    setSelectedBetAmount(amount);
    setShowChipSelector(false);
  }, []);

  // Handle undo bet
  const handleUndoBet = useCallback(() => {
    // Implementation for undoing last bet
    showNotification('Last bet cancelled', 'info');
  }, [showNotification]);

  // Handle rebet
  const handleRebet = useCallback(() => {
    // Implementation for rebetting previous round
    showNotification('Rebet placed', 'success');
  }, [showNotification]);

  // Handle wallet click
  const handleWalletClick = useCallback(() => {
    showNotification('Wallet feature coming soon', 'info');
  }, [showNotification]);

  // Handle history click
  const handleHistoryClick = useCallback(() => {
    setShowHistoryModal(true);
  }, []);

  // Mock history data
  const mockHistory = [
    { 
      id: '1', 
      gameId: 'game-1', 
      openingCard: '6♣', 
      winner: 'andar', 
      winningCard: '6♣', 
      totalCards: 3, 
      round: 1, 
      createdAt: new Date() 
    },
    { 
      id: '2', 
      gameId: 'game-1', 
      openingCard: 'Q♥', 
      winner: 'bahar', 
      winningCard: 'Q♥', 
      totalCards: 5, 
      round: 2, 
      createdAt: new Date() 
    },
    { 
      id: '3', 
      gameId: 'game-1', 
      openingCard: 'K♠', 
      winner: 'andar', 
      winningCard: 'K♠', 
      totalCards: 2, 
      round: 3, 
      createdAt: new Date() 
    },
    { 
      id: '4', 
      gameId: 'game-1', 
      openingCard: 'A♦', 
      winner: 'andar', 
      winningCard: 'A♦', 
      totalCards: 4, 
      round: 4, 
      createdAt: new Date() 
    },
    { 
      id: '5', 
      gameId: 'game-1', 
      openingCard: '7♣', 
      winner: 'bahar', 
      winningCard: '7♣', 
      totalCards: 6, 
      round: 5, 
      createdAt: new Date() 
    },
  ];

  return (
    <>
      <MobileGameLayout
        gameState={gameState}
        user={user}
        userBalance={userBalance}
        selectedBetAmount={selectedBetAmount}
        selectedPosition={selectedPosition}
        betAmounts={betAmounts}
        onPositionSelect={handlePositionSelect}
        onPlaceBet={handlePlaceBet}
        onChipSelect={handleChipSelect}
        onUndoBet={handleUndoBet}
        onRebet={handleRebet}
        onWalletClick={handleWalletClick}
        onHistoryClick={handleHistoryClick}
        onShowChipSelector={() => setShowChipSelector(true)}
        showChipSelector={showChipSelector}
        isPlacingBet={isPlacingBet}
      />

      {/* Game History Modal */}
      <GameHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={mockHistory}
      />
    </>
  );
};

export default PlayerGame;

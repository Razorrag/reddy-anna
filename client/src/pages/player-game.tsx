/**
 * Player Game Page - Main Player Interface
 * 
 * This is the main game interface for players participating in Andar Bahar.
 * Uses the new MobileGameLayout for a unified mobile-first design.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotification } from '../contexts/NotificationContext';
import MobileGameLayout from '../components/MobileGameLayout/MobileGameLayout';
import { GameHistoryModal } from '../components/GameHistoryModal';
import type { BetSide } from '../types/game';

const PlayerGame: React.FC = () => {
  const { showNotification } = useNotification();
  const { gameState, placeBet, updatePlayerWallet } = useGameState();
  const { placeBet: placeBetWebSocket } = useWebSocket();

  // Mock user data
  const user = { id: 'player-1', username: 'Player' };
  
  // Local state
  const [selectedBetAmount, setSelectedBetAmount] = useState(2500);
  const [selectedPosition, setSelectedPosition] = useState<BetSide | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [userBalance, setUserBalance] = useState(50000); // Mock balance
  const [showChipSelector, setShowChipSelector] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [userBets, setUserBets] = useState({
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 }
  });

  // Available bet amounts - matching available coin images
  const betAmounts = [2500, 5000, 10000, 20000, 30000, 40000, 50000, 100000];

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
      showNotification(`Betting is not open - Current phase: ${gameState.phase}`, 'error');
      return;
    }

    // Check if betting is locked (timer ended but waiting for admin to deal)
    if (gameState.bettingLocked) {
      showNotification('Betting period has ended. Waiting for cards to be dealt.', 'error');
      return;
    }

    setIsPlacingBet(true);

    try {
      // Use WebSocket to place bet (this will sync with backend)
      await placeBetWebSocket(position, selectedBetAmount);

      // Update local balance (optimistic)
      setUserBalance(prev => prev - selectedBetAmount);

      // Update local user bets
      const currentRound = gameState.currentRound;
      setUserBets(prev => ({
        ...prev,
        [`round${currentRound}`]: {
          ...prev[`round${currentRound}` as keyof typeof prev],
          [position]: prev[`round${currentRound}` as keyof typeof prev][position] + selectedBetAmount
        }
      }));

      showNotification(`Round ${currentRound} bet placed: ₹${selectedBetAmount} on ${position}`, 'success');
    } catch (error) {
      showNotification('Failed to place bet', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  }, [selectedBetAmount, userBalance, gameState, placeBetWebSocket, showNotification]);

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
    // Close the selector when a chip is selected
    setShowChipSelector(false);
  }, []);

  // Handle show chip selector toggle
  const handleShowChipSelector = useCallback(() => {
    setShowChipSelector(!showChipSelector);
  }, [showChipSelector]);

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

  // Listen for game state changes to update local state
  useEffect(() => {
    // Update user balance when game state changes (handled by WebSocket context)
    if (gameState.playerWallet !== undefined) {
      setUserBalance(gameState.playerWallet);
    }
    
    // Update user bets when round bets change
    if (gameState.round1Bets) {
      setUserBets(prev => ({ ...prev, round1: gameState.round1Bets }));
    }
    if (gameState.round2Bets) {
      setUserBets(prev => ({ ...prev, round2: gameState.round2Bets }));
    }
  }, [gameState.playerWallet, gameState.round1Bets, gameState.round2Bets]);

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
        onShowChipSelector={handleShowChipSelector}
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

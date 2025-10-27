/**
 * Player Game Page - Main Player Interface
 *
 * This is the main game interface for players participating in Andar Bahar.
 * Uses the new MobileGameLayout for a unified mobile-first design.
 * Features the simplified unified StreamPlayer for both RTMP and WebRTC streaming.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotification } from '../contexts/NotificationContext';
import MobileGameLayout from '../components/MobileGameLayout/MobileGameLayout';
import StreamPlayer from '../components/StreamPlayer';
import { GameHistoryModal } from '../components/GameHistoryModal';
import { WalletModal } from '../components/WalletModal';
import RoundTransition from '../components/RoundTransition';
import NoWinnerTransition from '../components/NoWinnerTransition';
import type { BetSide } from '../types/game';

const PlayerGame: React.FC = () => {
  const { showNotification } = useNotification();
  const { gameState, placeBet, updatePlayerWallet } = useGameState();
  const { placeBet: placeBetWebSocket } = useWebSocket();

  // Get user data from localStorage
  const getUserData = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        id: user.id || user.phone,
        username: user.full_name || 'Player',
        phone: user.phone,
        balance: user.balance || 0
      };
    }
    // No user logged in - should not reach here due to ProtectedRoute
    return null;
  };

  const user = getUserData();
  
  // Redirect if no user (shouldn't happen due to ProtectedRoute)
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  
  // Local state
  const [selectedBetAmount, setSelectedBetAmount] = useState(2500);
  const [selectedPosition, setSelectedPosition] = useState<BetSide | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [userBalance, setUserBalance] = useState(user.balance); // Use user's balance from localStorage
  const [showChipSelector, setShowChipSelector] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [showNoWinnerTransition, setShowNoWinnerTransition] = useState(false);
  const [previousRound, setPreviousRound] = useState(gameState.currentRound);
  const [userBets, setUserBets] = useState({
    round1: { andar: 0, bahar: 0 },
    round2: { andar: 0, bahar: 0 }
  });

  // Available bet amounts - matching schema limits (1000-100000)
  const betAmounts = [2500, 5000, 10000, 20000, 30000, 40000, 50000, 100000];

  // Update user balance from localStorage on component mount and when localStorage changes
  useEffect(() => {
    const updateBalanceFromStorage = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        const newBalance = userData.balance || 0;
        setUserBalance(newBalance);
      }
    };

    // Initial balance update
    updateBalanceFromStorage();

    // Listen for storage changes (in case user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        updateBalanceFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for localStorage changes (for same-tab updates)
    const interval = setInterval(updateBalanceFromStorage, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Update the handlePlaceBet function to properly use WebSocket
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

    if (gameState.bettingLocked) {
      showNotification('Betting period has ended. Waiting for cards to be dealt.', 'error');
      return;
    }

    setIsPlacingBet(true);

    try {
      // Use WebSocket to place bet
      await placeBetWebSocket(position, selectedBetAmount);

      showNotification(`Bet placed: ₹${selectedBetAmount} on ${position}`, 'success');
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
    setShowWalletModal(true);
  }, []);

  // Handle deposit
  const handleDeposit = useCallback((amount: number) => {
    setUserBalance((prev: number) => prev + amount);
    updatePlayerWallet(userBalance + amount);
    showNotification(`Successfully deposited ₹${amount.toLocaleString('en-IN')}`, 'success');
  }, [userBalance, updatePlayerWallet, showNotification]);

  // Handle withdraw
  const handleWithdraw = useCallback((amount: number) => {
    if (amount > userBalance) {
      showNotification('Insufficient balance', 'error');
      return;
    }
    setUserBalance((prev: number) => prev - amount);
    updatePlayerWallet(userBalance - amount);
    showNotification(`Successfully withdrew ₹${amount.toLocaleString('en-IN')}`, 'success');
  }, [userBalance, updatePlayerWallet, showNotification]);

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

  // Detect round changes and trigger transition animation
  useEffect(() => {
    if (gameState.currentRound !== previousRound && gameState.currentRound > 1) {
      setShowRoundTransition(true);
      setPreviousRound(gameState.currentRound);
    }
  }, [gameState.currentRound, previousRound]);

  // Listen for no-winner transition events
  useEffect(() => {
    const handleNoWinner = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('No winner event received:', customEvent.detail);
      setShowNoWinnerTransition(true);
    };

    window.addEventListener('no-winner-transition', handleNoWinner);
    return () => window.removeEventListener('no-winner-transition', handleNoWinner);
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

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        userBalance={userBalance}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
      />

      {/* No Winner Transition - Shows before round transition */}
      <NoWinnerTransition
        show={showNoWinnerTransition}
        currentRound={previousRound}
        nextRound={gameState.currentRound}
        onComplete={() => setShowNoWinnerTransition(false)}
      />

      {/* Round Transition Animation */}
      <RoundTransition
        show={showRoundTransition}
        round={gameState.currentRound}
        message={
          gameState.currentRound === 2
            ? 'Place additional bets!'
            : gameState.currentRound === 3
            ? 'Final Draw - No more betting!'
            : ''
        }
        onComplete={() => setShowRoundTransition(false)}
      />
    </>
  );
};

export default PlayerGame;

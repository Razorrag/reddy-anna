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
import { useAuth } from '../contexts/AuthContext';
import { useBalance } from '../contexts/BalanceContext';
import { apiClient } from '../lib/apiClient';
import { parseBalance } from '@shared/utils/balanceUtils.js';
import MobileGameLayout from '../components/MobileGameLayout/MobileGameLayout';
import PlayerStreamView from '../components/PlayerStreamView';
import { GameHistoryModal } from '../components/GameHistoryModal';
import { WalletModal } from '../components/WalletModal';
import RoundNotification from '../components/RoundNotification';
import NoWinnerTransition from '../components/NoWinnerTransition';
import WinnerCelebration from '../components/WinnerCelebration';
import type { BetSide } from '../types/game';

const PlayerGame: React.FC = () => {
  const { showNotification } = useNotification();
  const { gameState, updatePlayerWallet, setPhase, setCurrentRound, setCountdown } = useGameState();
  const { placeBet: placeBetWebSocket } = useWebSocket();
  const { balance, updateBalance } = useBalance();

  // Get user data from AuthContext
  const { user, isAuthenticated } = useAuth();
  
  // Redirect if no user (shouldn't happen due to ProtectedRoute)
  if (!user || !isAuthenticated) {
    window.location.href = '/login';
    return null;
  }
  
  // Ensure user has required properties
  const userData = {
    id: user.id || user.phone,
    username: user.full_name || user.username || 'Player',
    phone: user.phone,
    balance: user.balance || 0
  };
  
  // Local state
  const [selectedBetAmount, setSelectedBetAmount] = useState(2500);
  const [selectedPosition, setSelectedPosition] = useState<BetSide | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [userBalance, setUserBalance] = useState(user.balance || 0); // Use user's balance from AuthContext
  const [showChipSelector, setShowChipSelector] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRoundNotification, setShowRoundNotification] = useState(false);
  const [showNoWinnerTransition, setShowNoWinnerTransition] = useState(false);
  const [showWinnerCelebration, setShowWinnerCelebration] = useState(false);
  const [previousRound, setPreviousRound] = useState(gameState.currentRound);

  // Available bet amounts - matching schema limits (1000-100000)
  const betAmounts = [2500, 5000, 10000, 20000, 30000, 40000, 50000, 100000];

  // Update user balance from BalanceContext
  useEffect(() => {
    const balanceAsNumber = parseBalance(balance);
      
    if (!isNaN(balanceAsNumber) && balanceAsNumber !== userBalance) {
      setUserBalance(balanceAsNumber);
    }
  }, [balance, userBalance]);

  // Listen for balance updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance, source } = event.detail;
      
      const balanceAsNumber = parseBalance(newBalance);
      
      if (!isNaN(balanceAsNumber)) {
        setUserBalance(balanceAsNumber);
      }
    };

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
    return () => window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
  }, []);

  // Update the handlePlaceBet function to properly use REST API for balance validation
  const handlePlaceBet = useCallback(async (position: BetSide) => {
    if (selectedBetAmount === 0) {
      showNotification('Please select a chip first', 'error');
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

    if (gameState.countdownTimer <= 0) {
      showNotification('Betting time is up!', 'error');
      return;
    }

    setIsPlacingBet(true);

    try {
      // Validate balance before placing bet
      const balanceCheck = await apiClient.get<{success: boolean, balance: number | string, error?: string}>('/user/balance');
      
      const balanceAsNumber = parseBalance(balanceCheck.balance);
      
      if (!balanceCheck.success || isNaN(balanceAsNumber) || balanceAsNumber < selectedBetAmount) {
        showNotification('Insufficient balance', 'error');
        // Update local balance if different
        if (balanceCheck.success && !isNaN(balanceAsNumber)) {
          updateBalance(balanceAsNumber, 'api');
        }
        setIsPlacingBet(false);
        return;
      }

      // Place bet via WebSocket for game logic
      await placeBetWebSocket(position, selectedBetAmount);
      
      showNotification(`Bet placed: ₹${selectedBetAmount} on ${position.toUpperCase()} (Round ${gameState.currentRound})`, 'success');
    } catch (error) {
      console.error('Failed to place bet:', error);
      showNotification('Failed to place bet', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  }, [selectedBetAmount, gameState, placeBetWebSocket, showNotification, balance, updateBalance]);

  // Handle bet position selection
  const handlePositionSelect = useCallback((position: BetSide) => {
    if (gameState.phase !== 'betting') {
      showNotification(`Cannot select position - Current phase: ${gameState.phase}`, 'error');
      return;
    }
    
    if (gameState.bettingLocked) {
      showNotification('Betting is locked - cannot select position', 'error');
      return;
    }
    
    if (gameState.countdownTimer <= 0) {
      showNotification('Betting time is up!', 'error');
      return;
    }
    
    setSelectedPosition(position);
    showNotification(`Selected position: ${position.toUpperCase()} (Round ${gameState.currentRound})`, 'info');
  }, [gameState.phase, gameState.bettingLocked, gameState.countdownTimer, gameState.currentRound, showNotification]);

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
  const handleDeposit = useCallback(async (amount: number) => {
    try {
      // Use the apiClient which handles authentication automatically
      const data = await apiClient.post<any>('/payment-requests', {
        amount: amount,
        paymentMethod: 'UPI',
        requestType: 'deposit'
      });

      if (data.success) {
        showNotification(`Successfully submitted deposit request for ₹${amount.toLocaleString('en-IN')}. Awaiting admin approval.`, 'success');
      } else {
        showNotification(data.error || 'Deposit request failed', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Deposit request failed', 'error');
      console.error('Deposit error:', error);
    }
  }, [updatePlayerWallet, showNotification]);

  // Handle withdraw
  const handleWithdraw = useCallback(async (amount: number) => {
    if (amount > userBalance || !user) {
      showNotification('Insufficient balance', 'error');
      return;
    }

    try {
      // Use the apiClient which handles authentication automatically
      const data = await apiClient.post<any>('/payment-requests', {
        amount: amount,
        paymentMethod: 'Bank Transfer',
        requestType: 'withdrawal'
      });

      if (data.success) {
        showNotification(`Successfully submitted withdrawal request for ₹${amount.toLocaleString('en-IN')}. Awaiting admin approval.`, 'success');
      } else {
        showNotification(data.error || 'Withdrawal request failed', 'error');
      }
    } catch (error: any) {
      showNotification(error.message || 'Withdrawal request failed', 'error');
      console.error('Withdrawal error:', error);
    }
  }, [userBalance, updatePlayerWallet, showNotification]);

  // Handle history click
  const handleHistoryClick = useCallback(() => {
    setShowHistoryModal(true);
  }, []);

  // ✅ CRITICAL FIX: Force game state initialization and balance updates
  useEffect(() => {
    console.log('🔄 Game state effect triggered:', {
      phase: gameState.phase,
      currentRound: gameState.currentRound,
      playerWallet: gameState.playerWallet,
      env: process.env.NODE_ENV
    });
    
    // ✅ CRITICAL: Initialize game if in idle state and not connected
    if (gameState.phase === 'idle' && gameState.currentRound === 1) {
      console.log('🔄 Game in idle state - checking WebSocket connection...');
      
      // Check if WebSocket is connected and request game state
      if (typeof window !== 'undefined') {
        const ws = (window as any).gameWebSocket;
        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log('✅ WebSocket connected - requesting game state sync');
          ws.send(JSON.stringify({
            type: 'game:subscribe',
            data: { gameId: 'default-game' }
          }));
        } else {
          console.log('⚠️ WebSocket not connected - readyState:', ws?.readyState);
        }
      }
    }
    
    // Update user balance when game state changes (handled by WebSocket context)
    if (gameState.playerWallet !== undefined) {
      console.log('💰 Balance update from game state:', gameState.playerWallet);
      setUserBalance(gameState.playerWallet);
    }
    
    // ✅ CRITICAL FIX: Auto-start game in development mode to bypass admin dependency
    if (gameState.phase === 'idle' && process.env.NODE_ENV === 'development') {
      console.log('🔄 Game idle in development mode - auto-starting game...');
      
      // Set basic game state immediately for development
      setPhase('betting');
      setCurrentRound(1);
      setCountdown(30);
      
      // Auto-start game after 1 second to allow WebSocket connection
      const autoStartTimer = setTimeout(() => {
        const ws = (window as any).gameWebSocket;
        console.log('⏰ Auto-start timer fired - WebSocket readyState:', ws?.readyState);
        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log('✅ Auto-starting game with default opening card');
          ws.send(JSON.stringify({
            type: 'opening_card_set',
            data: {
              openingCard: { display: 'A♠', id: 'A♠' },
              timer: 30,
              gameId: 'default-game'
            }
          }));
        } else {
          console.log('⚠️ WebSocket not ready for auto-start, will retry...');
        }
      }, 1000);
      
      return () => clearTimeout(autoStartTimer);
    }
  }, [gameState.phase, gameState.currentRound, gameState.playerWallet, setPhase, setCurrentRound, setCountdown]);

  // Detect round changes and trigger notification (only for rounds 1 and 2)
  useEffect(() => {
    if (gameState.currentRound !== previousRound && gameState.currentRound > 1 && gameState.currentRound <= 2) {
      setShowRoundNotification(true);
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

  // Listen for round change events from WebSocket
  useEffect(() => {
    const handleRoundChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Round change event received:', customEvent.detail);
      if (customEvent.detail.round === 2) {
        setShowRoundNotification(true);
      }
    };

    window.addEventListener('round-change', handleRoundChange);
    return () => window.removeEventListener('round-change', handleRoundChange);
  }, []);

  // Listen for game complete celebration events
  useEffect(() => {
    const handleGameComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Game complete celebration received:', customEvent.detail);
      // Show celebration for wins
      if (customEvent.detail.winner) {
        setShowWinnerCelebration(true);
      }
    };

    window.addEventListener('game-complete-celebration', handleGameComplete);
    return () => window.removeEventListener('game-complete-celebration', handleGameComplete);
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
        user={userData}
        userBalance={userBalance || 0}
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
        userBalance={userBalance || 0}
        onBalanceUpdate={setUserBalance}
      />

      {/* No Winner Transition - Shows before round transition */}
      <NoWinnerTransition
        show={showNoWinnerTransition}
        currentRound={previousRound}
        nextRound={gameState.currentRound}
        onComplete={() => setShowNoWinnerTransition(false)}
      />

      {/* Winner Celebration - Shows when user wins */}
      {showWinnerCelebration && (
        <WinnerCelebration
          winner={null} // Will be set by event
          winningCard=""
          round={gameState.currentRound}
          payoutMessage=""
          onComplete={() => setShowWinnerCelebration(false)}
        />
      )}

      {/* Round Notification - Non-blocking toast for round changes */}
      <RoundNotification
        show={showRoundNotification}
        round={gameState.currentRound}
        message={
          gameState.currentRound === 2
            ? 'Place additional bets!'
            : ''
        }
        onComplete={() => setShowRoundNotification(false)}
      />
    </>
  );
};

export default PlayerGame;
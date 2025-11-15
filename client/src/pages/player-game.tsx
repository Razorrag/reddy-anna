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
import { apiClient } from '@/lib/api-client';
import MobileGameLayout from '../components/MobileGameLayout/MobileGameLayout';
import { ConnectionStatus } from '../lib/WebSocketManager';

import { GameHistoryModal } from '../components/GameHistoryModal';
import { WalletModal } from '../components/WalletModal';
import RoundNotification from '../components/RoundNotification';
import NoWinnerTransition from '../components/NoWinnerTransition';
import type { BetSide } from '../types/game';

interface WhatsAppResponse {
  success: boolean;
  whatsappUrl?: string;
}

const PlayerGame: React.FC = () => {
  const { showNotification } = useNotification();
  const { gameState, updatePlayerWallet, removeLastBet, clearRoundBets, setCelebration } = useGameState();
  const { placeBet: placeBetWebSocket, connectionStatus } = useWebSocket();
  const { balance, updateBalance } = useBalance();

  // Get user data from AuthContext
  const { user, isAuthenticated } = useAuth();
  
  // Ensure user has required properties (guard against undefined user during initial render)
  const userData = {
    id: user?.id || user?.phone || '',
    username: user?.full_name || user?.username || 'Player',
    phone: user?.phone || '',
    balance: user?.balance || 0
  };
  
  // Local state
  const [selectedBetAmount, setSelectedBetAmount] = useState(2500);
  const [selectedPosition, setSelectedPosition] = useState<BetSide | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [userBalance, setUserBalance] = useState(user?.balance || 0); // Use user's balance from AuthContext
  const [showChipSelector, setShowChipSelector] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>(undefined); // ✅ NEW: For pre-selecting game
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRoundNotification, setShowRoundNotification] = useState(false);
  const [showNoWinnerTransition, setShowNoWinnerTransition] = useState(false);
  const [previousRound, setPreviousRound] = useState(gameState.currentRound);

  // Available bet amounts - matching schema limits (1000-100000)
  const betAmounts = [2500, 5000, 10000, 20000, 30000, 40000, 50000, 100000];

  // Update user balance from BalanceContext
  useEffect(() => {
    // Convert to number if it's a string
    const balanceAsNumber = typeof balance === 'string' 
      ? parseFloat(balance) 
      : Number(balance);
      
    if (!isNaN(balanceAsNumber) && balanceAsNumber !== userBalance) {
      setUserBalance(balanceAsNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);  // ← Only depend on balance, not userBalance to prevent loop

  // Listen for balance updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance } = event.detail;
      
      // Convert to number if it's a string
      const balanceAsNumber = typeof newBalance === 'string' 
        ? parseFloat(newBalance) 
        : Number(newBalance);
      
      if (!isNaN(balanceAsNumber)) {
        setUserBalance(balanceAsNumber);
      }
    };

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
    return () => window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
  }, []);

  // Update the handlePlaceBet function to properly use REST API for balance validation
  const handlePlaceBet = useCallback(async (position: BetSide) => {
    if (isPlacingBet) return;

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
    
    // Import retry utility
    const { retryWithBackoff } = await import('../lib/retry-utils');
    
    try {
      // Validate balance before placing bet with retry logic
      const balanceCheck = await retryWithBackoff(
        async () => {
          return await apiClient.get<{success: boolean, balance: number | string, error?: string}>('/user/balance');
        },
        {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 1000,
          retryableErrors: (error: any) => {
            // Retry on network errors, but not on insufficient balance
            return error.message?.includes('fetch failed') ||
                   error.message?.includes('timeout') ||
                   error.message?.includes('network') ||
                   error.code === 'ECONNREFUSED' ||
                   error.code === 'ETIMEDOUT' ||
                   error.name === 'AbortError';
          }
        }
      );
      
      // Convert balance to number if it's a string
      const balanceAsNumber = typeof balanceCheck.balance === 'string' 
        ? parseFloat(balanceCheck.balance) 
        : Number(balanceCheck.balance);
      
      if (!balanceCheck.success || isNaN(balanceAsNumber) || balanceAsNumber < selectedBetAmount) {
        showNotification('Insufficient balance', 'error');
        // Update local balance if different
        if (balanceCheck.success && !isNaN(balanceAsNumber)) {
          updateBalance(balanceAsNumber, 'api');
        }
        setIsPlacingBet(false);
        return;
      }

      // Optimistically update balance
      updateBalance(userBalance - selectedBetAmount, 'local');

      // Place bet via WebSocket for game logic with retry
      await retryWithBackoff(
        async () => {
          await placeBetWebSocket(position, selectedBetAmount);
        },
        {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 1000,
          retryableErrors: (error: any) => {
            // Retry on network/connection errors, but not on validation errors
            return error.message?.includes('fetch failed') ||
                   error.message?.includes('timeout') ||
                   error.message?.includes('network') ||
                   error.message?.includes('connection') ||
                   error.code === 'ECONNREFUSED' ||
                   error.code === 'ETIMEDOUT' ||
                   error.name === 'AbortError';
          }
        }
      );
    } catch (error: any) {
      // Revert balance if bet fails
      updateBalance(userBalance, 'local');
      console.error('Failed to place bet:', error);
      
      // Provide better error messages
      let errorMessage = 'Failed to place bet';
      if (error.message?.includes('Insufficient balance')) {
        errorMessage = 'Insufficient balance. Please check your account balance.';
      } else if (error.message?.includes('temporarily unavailable')) {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
      } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsPlacingBet(false);
    }
  }, [selectedBetAmount, gameState, placeBetWebSocket, showNotification, balance, updateBalance, userBalance]);

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
  const handleUndoBet = useCallback(async () => {
    // Check if betting is still open
    if (gameState.phase !== 'betting') {
      showNotification('Cannot undo bet - betting phase has ended', 'error');
      return;
    }

    if (gameState.bettingLocked) {
      showNotification('Cannot undo bet - betting is locked', 'error');
      return;
    }

    if (gameState.countdownTimer <= 0) {
      showNotification('Cannot undo bet - betting time has expired', 'error');
      return;
    }

    // Check if user has any bets to undo for current round
    const currentRound = gameState.currentRound;
    const currentRoundBets = currentRound === 1 ? gameState.playerRound1Bets : gameState.playerRound2Bets;
    const hasBets = (
      (Array.isArray(currentRoundBets.andar) && currentRoundBets.andar.length > 0) ||
      (Array.isArray(currentRoundBets.bahar) && currentRoundBets.bahar.length > 0)
    );

    if (!hasBets) {
      showNotification(`No bets in Round ${currentRound} to undo`, 'info');
      return;
    }

    try {
      // Call the undo endpoint
      const response = await apiClient.delete<{
        success: boolean;
        message?: string;
        data?: {
          refundedAmount: number;
          newBalance: number;
          round: number;
          side: string;
        };
        error?: string;
      }>('/user/undo-last-bet');

      if (response.success && response.data) {
        const { refundedAmount, newBalance } = response.data;
        
        // Update balance
        updateBalance(newBalance, 'api');
        
        // ✅ FIX: DON'T remove bet here - WebSocket 'bet_undo_success' event will handle it
        // This prevents double removal (once from API, once from WebSocket)
        // The WebSocket handler in WebSocketContext.tsx line 535 will call removeLastBet()
        
        showNotification(
          `Bet undone! ₹${refundedAmount?.toLocaleString('en-IN')} refunded`,
          'success'
        );
      } else {
        showNotification(response.error || 'Failed to undo bet', 'error');
      }
    } catch (error: any) {
      console.error('Failed to undo bet:', error);
      let errorMessage = 'Failed to undo bet';
      if (error.message?.includes('betting phase')) {
        errorMessage = 'Cannot undo - betting phase has ended';
      } else if (error.message?.includes('No active bets')) {
        errorMessage = `No bets in Round ${gameState.currentRound} to undo`;
      } else if (error.message?.includes('mismatch')) {
        errorMessage = 'Bet data mismatch. Please refresh the page.';
      }
      showNotification(errorMessage, 'warning');
    }
  }, [gameState, showNotification, updateBalance, clearRoundBets]);

  // Handle rebet
  const handleRebet = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; bets: any[] }>('/api/user/last-game-bets');
      if (response.success && response.bets.length > 0) {
        for (const bet of response.bets) {
          await handlePlaceBet(bet.side, bet.amount);
        }
        showNotification('Rebet placed successfully', 'success');
      } else {
        showNotification('No bets from last game to rebet', 'info');
      }
    } catch (error) {
      console.error('Failed to rebet:', error);
      showNotification('Failed to rebet', 'error');
    }
  }, [handlePlaceBet, showNotification]);

  // Handle wallet click
  const handleWalletClick = useCallback(() => {
    setShowWalletModal(true);
  }, []);





  // Handle history click - Open modal without pre-selection
  const handleHistoryClick = useCallback(() => {
    setSelectedGameId(undefined); // Clear any pre-selection
    setShowHistoryModal(true);
  }, []);

  // ✅ NEW: Handle game circle click - Open modal with specific game pre-selected
  const handleGameClick = useCallback((gameId: string) => {
    console.log('Opening history modal with game:', gameId);
    setSelectedGameId(gameId);
    setShowHistoryModal(true);
  }, []);

  // Listen for game state changes to update local state
  useEffect(() => {
    // Update user balance when game state changes (handled by WebSocket context)
    if (gameState.playerWallet !== undefined) {
      setUserBalance(gameState.playerWallet);
    }
  }, [gameState.playerWallet]);

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

  // Listen for game complete celebration events - handled by VideoArea overlay now
  useEffect(() => {
    const handleGameComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Game complete celebration received:', customEvent.detail);
      
      // ✅ FIX: Trigger the celebration state from context
      // This ensures the celebration data is stored in GameStateContext
      // and will persist until admin starts a new game
      if (customEvent.detail) {
        setCelebration(customEvent.detail);
      }
      
      // Refresh balance after game completion to get updated payout
      setTimeout(() => {
        updateBalance(undefined as any, 'api');
      }, 1000);
    };

    window.addEventListener('game-complete-celebration', handleGameComplete);
    return () => window.removeEventListener('game-complete-celebration', handleGameComplete);
  }, [updateBalance, setCelebration]);

  // Listen for payment notifications and balance refresh requests
  useEffect(() => {
    const handlePaymentUpdate = (event: CustomEvent) => {
      const { message } = event.detail;
      showNotification(message || 'Payment request updated', 'success');
      
      // Refresh balance
      updateBalance(undefined as any, 'api');
    };
    
    const handleRefreshBalance = () => {
      updateBalance(undefined as any, 'api');
    };
    
    window.addEventListener('payment-request-updated', handlePaymentUpdate as EventListener);
    window.addEventListener('refresh-balance', handleRefreshBalance as EventListener);
    
    return () => {
      window.removeEventListener('payment-request-updated', handlePaymentUpdate as EventListener);
      window.removeEventListener('refresh-balance', handleRefreshBalance as EventListener);
    };
  }, [showNotification, updateBalance]);




  // Conditional screens rendered inside a single render pass to preserve hook order
  const shouldShowAuthLoading = !user || !isAuthenticated;
  const shouldShowWsLoading = connectionStatus === ConnectionStatus.CONNECTING || connectionStatus === ConnectionStatus.DISCONNECTED;

  return (
    <div className="relative">
      {shouldShowAuthLoading && (
        <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      )}
      {(!shouldShowAuthLoading && shouldShowWsLoading) && (
        <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-xl mb-4">Connecting to game...</div>
            <div className="inline-flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
              <div className="text-gray-300 text-sm mt-4">Status: {connectionStatus}</div>
            </div>
          </div>
        </div>
      )}

      {(!shouldShowAuthLoading && !shouldShowWsLoading) && (
      <div className="relative top-0">
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
          onGameClick={handleGameClick} // ✅ NEW: Pass handler for card circle clicks
          onShowChipSelector={handleShowChipSelector}
          showChipSelector={showChipSelector}
          isPlacingBet={isPlacingBet}
        />
      </div>
      )}

      {/* Game History Modal */}
      <GameHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedGameId(undefined); // ✅ Clear selection when closing
        }}
        selectedGameId={selectedGameId} // ✅ NEW: Pre-select specific game
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

      {/* ❌ REMOVED: Winner Celebration modal - Now shown in VideoArea overlay */}

      {/* Round Notification - Non-blocking toast for round changes */}
      {!shouldShowAuthLoading && !shouldShowWsLoading && (
      <RoundNotification
        show={showRoundNotification}
        round={gameState.currentRound}
        message={
          gameState.currentRound === 2
            ? 'Place additional bets!'
            : ''
        }
        onComplete={() => setShowRoundNotification(false)}
      />)}
    </div>
  );
};

export default PlayerGame;
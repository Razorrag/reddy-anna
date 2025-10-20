/**
 * Player Game Page - Main Player Interface
 * 
 * This is the main game interface for players participating in Andar Bahar.
 * It uses Tailwind CSS for styling and integrates with the game state context.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';
import { useNotification } from '../contexts/NotificationContext';
import LiveStreamSimulation from '../components/LiveStreamSimulation';
import CardGrid from '../components/CardGrid';
import { CircularTimer } from '../components/CircularTimer';
import { PlayingCard } from '../components/PlayingCard';
import BettingStats from '../components/BettingStats';
import { LoadingButton, LoadingOverlay } from '../components/LoadingSpinner';
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

  // Available bet amounts
  const betAmounts = [1000, 5000, 10000, 20000, 50000];

  // Timer countdown effect
  useEffect(() => {
    if (gameState.countdown > 0 && gameState.phase === 'betting') {
      const timer = setTimeout(() => {
        // Timer is managed by backend, this is just for UI updates
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.countdown, gameState.phase]);

  // Place bet handler
  const handlePlaceBet = useCallback(async () => {
    if (!selectedPosition) {
      showNotification('Please select Andar or Bahar', 'error');
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
      placeBet(selectedPosition, selectedBetAmount);

      // Update local balance (optimistic)
      setUserBalance(prev => prev - selectedBetAmount);

      // Clear selection
      setSelectedPosition(null);

      showNotification(`Bet placed: ₹${selectedBetAmount} on ${selectedPosition}`, 'success');
    } catch (error) {
      showNotification('Failed to place bet', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  }, [selectedPosition, selectedBetAmount, userBalance, gameState, placeBet, showNotification, user]);

  // Handle bet position selection
  const handlePositionSelect = useCallback((position: BetSide) => {
    if (gameState.phase !== 'betting') {
      showNotification('Betting is not open', 'error');
      return;
    }
    setSelectedPosition(position);
  }, [gameState.phase, showNotification]);

  return (
    <LoadingOverlay isLoading={isPlacingBet} message="Placing bet...">
      <div className="game-body min-h-screen bg-gradient-to-br from-black via-purple-950 to-black text-white">
        {/* Header */}
        <header className="bg-black/80 backdrop-blur-md border-b border-gold/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gold">Andar Bahar</h1>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Round:</span>
                  <span className="text-xl font-bold text-gold">{gameState.currentRound}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* User Balance */}
                <div className="text-right">
                  <div className="text-sm text-gray-400">Balance</div>
                  <div className="text-xl font-bold text-gold">₹{userBalance.toLocaleString('en-IN')}</div>
                </div>
                
                {/* User Info */}
                <div className="text-right">
                  <div className="text-sm text-gray-400">Player</div>
                  <div className="font-semibold">{user?.username || 'Guest'}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Main Game Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Side - Live Stream */}
            <div className="lg:col-span-2">
              <div className="bg-black/60 backdrop-blur-sm rounded-xl border border-gold/20 overflow-hidden">
                <LiveStreamSimulation />
                
                {/* Timer Overlay */}
                {gameState.phase === 'betting' && (
                  <div className="absolute top-4 right-4">
                    <CircularTimer 
                      seconds={gameState.countdown}
                      totalSeconds={30}
                      phase={gameState.phase}
                      isVisible={true}
                    />
                  </div>
                )}
                
                {/* Opening Card Display */}
                {gameState.openingCard && (
                  <div className="absolute top-4 left-4">
                    <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gold/30">
                      <div className="text-xs text-gold mb-1">Opening Card</div>
                      <PlayingCard 
                        card={gameState.openingCard}
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Betting Area */}
              {gameState.phase === 'betting' && (
                <div className="mt-6 bg-black/60 backdrop-blur-sm rounded-xl border border-gold/20 p-6">
                  <h2 className="text-xl font-bold text-gold mb-4 text-center">Place Your Bet</h2>
                  
                  {/* Position Selection */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => handlePositionSelect('andar')}
                      className={`py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                        selectedPosition === 'andar'
                          ? 'bg-andar text-white border-2 border-white shadow-lg'
                          : 'bg-andar/20 text-andar border-2 border-andar/50 hover:bg-andar/30'
                      }`}
                    >
                      ANDAR
                    </button>
                    <button
                      onClick={() => handlePositionSelect('bahar')}
                      className={`py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                        selectedPosition === 'bahar'
                          ? 'bg-bahar text-white border-2 border-white shadow-lg'
                          : 'bg-bahar/20 text-blue-400 border-2 border-blue-400/50 hover:bg-bahar/30'
                      }`}
                    >
                      BAHAR
                    </button>
                  </div>

                  {/* Bet Amount Selection */}
                  <div className="mb-6">
                    <div className="text-sm text-gray-400 mb-2">Select Bet Amount:</div>
                    <div className="grid grid-cols-5 gap-2">
                      {betAmounts.map(amount => (
                        <button
                          key={amount}
                          onClick={() => setSelectedBetAmount(amount)}
                          disabled={amount > userBalance}
                          className={`py-2 px-3 rounded-lg font-semibold transition-all ${
                            selectedBetAmount === amount
                              ? 'bg-gold text-black'
                              : amount > userBalance
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-700 text-gold hover:bg-gray-600'
                          }`}
                        >
                          ₹{amount.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Place Bet Button */}
                  <LoadingButton
                    onClick={handlePlaceBet}
                    disabled={!selectedPosition || isPlacingBet}
                    isLoading={isPlacingBet}
                    className="w-full py-4 bg-gradient-to-r from-gold to-yellow-500 text-black font-bold text-lg rounded-lg hover:from-yellow-400 hover:to-gold transition-all"
                  >
                    {isPlacingBet ? 'Placing Bet...' : `Place ₹${selectedBetAmount.toLocaleString('en-IN')} Bet on ${selectedPosition || '...'}`}
                  </LoadingButton>
                </div>
              )}

              {/* Card Dealing Area */}
              {(gameState.phase === 'dealing' || gameState.phase === 'completed') && (
                <div className="mt-6 bg-black/60 backdrop-blur-sm rounded-xl border border-gold/20 p-6">
                  <h2 className="text-xl font-bold text-gold mb-4 text-center">
                    {gameState.phase === 'dealing' ? 'Cards Being Dealt' : 'Game Complete'}
                  </h2>
                  
                  <CardGrid 
                    andarCards={gameState.andarCards}
                    baharCards={gameState.baharCards}
                    winningSide={gameState.winner}
                  />
                  
                  {gameState.phase === 'completed' && gameState.winner && (
                    <div className="mt-6 text-center">
                      <div className="text-2xl font-bold text-gold mb-2">
                        {gameState.winner.toUpperCase()} WINS! 
                      </div>
                      <div className="text-lg text-gray-300">
                        Game completed in {gameState.andarCards.length + gameState.baharCards.length} cards
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side - Stats and Info */}
            <div className="space-y-6">
              {/* Game Status */}
              <div className="bg-black/60 backdrop-blur-sm rounded-xl border border-gold/20 p-6">
                <h3 className="text-lg font-bold text-gold mb-4">Game Status</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Phase:</span>
                    <span className="font-semibold capitalize">{gameState.phase}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timer:</span>
                    <span className={`font-bold ${gameState.countdown <= 10 ? 'text-red-500' : 'text-gold'}`}>
                      {gameState.countdown}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Bets:</span>
                    <span className="font-semibold text-gold">
                      ₹{(gameState.totalBets.andar + gameState.totalBets.bahar).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Betting Statistics */}
              <BettingStats
                andarTotal={gameState.totalBets.andar}
                baharTotal={gameState.totalBets.bahar}
                userBets={{}}
                currentRound={gameState.currentRound}
              />

              {/* Recent Bets */}
              <div className="bg-black/60 backdrop-blur-sm rounded-xl border border-gold/20 p-6">
                <h3 className="text-lg font-bold text-gold mb-4">Your Bets</h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameState.round1Bets.andar > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold text-gold">Round 1 - Andar</div>
                      <div className="text-gray-400 ml-2">
                        ₹{gameState.round1Bets.andar.toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}
                  {gameState.round1Bets.bahar > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold text-gold">Round 1 - Bahar</div>
                      <div className="text-gray-400 ml-2">
                        ₹{gameState.round1Bets.bahar.toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}
                  {gameState.round2Bets.andar > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold text-gold">Round 2 - Andar</div>
                      <div className="text-gray-400 ml-2">
                        ₹{gameState.round2Bets.andar.toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}
                  {gameState.round2Bets.bahar > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold text-gold">Round 2 - Bahar</div>
                      <div className="text-gray-400 ml-2">
                        ₹{gameState.round2Bets.bahar.toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}
                  {gameState.round1Bets.andar === 0 && 
                   gameState.round1Bets.bahar === 0 && 
                   gameState.round2Bets.andar === 0 && 
                   gameState.round2Bets.bahar === 0 && (
                    <div className="text-gray-500 text-center">No bets placed yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LoadingOverlay>
  );
};

export default PlayerGame;

/**
 * PersistentSidePanel - Always-visible side panel for timer, round info, and betting stats
 * 
 * This panel NEVER disappears and shows relevant information for all game phases:
 * - idle: Waiting for game
 * - opening: Opening card selection
 * - betting: Timer countdown + betting stats
 * - dealing: Cards being dealt
 * - complete: Winner announcement
 */

import React from 'react';
import { useGameState } from '../contexts/GameStateContext';

interface PersistentSidePanelProps {
  className?: string;
}

const PersistentSidePanel: React.FC<PersistentSidePanelProps> = ({ className = '' }) => {
  const { gameState } = useGameState();

  // Calculate betting percentages for current round
  const currentRoundBets = gameState.currentRound === 1 ? gameState.round1Bets : gameState.round2Bets;
  const totalCurrentBets = currentRoundBets.andar + currentRoundBets.bahar;
  const currentAndarPercentage = totalCurrentBets > 0 ? (currentRoundBets.andar / totalCurrentBets) * 100 : 50;
  const currentBaharPercentage = totalCurrentBets > 0 ? (currentRoundBets.bahar / totalCurrentBets) * 100 : 50;

  // Calculate total cumulative bets
  const totalCumulativeAndar = gameState.round1Bets.andar + gameState.round2Bets.andar;
  const totalCumulativeBahar = gameState.round1Bets.bahar + gameState.round2Bets.bahar;

  // Get phase-specific display text
  const getPhaseDisplay = () => {
    switch (gameState.phase) {
      case 'idle':
        return { text: 'Waiting', color: 'text-gray-400', bg: 'bg-gray-800/50' };
      case 'opening':
        return { text: 'Opening Card', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
      case 'betting':
        return { text: 'Betting Time', color: 'text-red-400', bg: 'bg-red-900/30' };
      case 'dealing':
        return { text: 'Dealing Cards', color: 'text-green-400', bg: 'bg-green-900/30' };
      case 'complete':
        return { text: 'Game Complete', color: 'text-purple-400', bg: 'bg-purple-900/30' };
      default:
        return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-800/50' };
    }
  };

  const phaseDisplay = getPhaseDisplay();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Timer Display - ALWAYS VISIBLE */}
      <div className={`rounded-lg border-2 p-5 text-center transition-all duration-300 ${
        gameState.phase === 'betting' && gameState.countdownTimer <= 5
          ? 'border-red-500 bg-red-900/30 animate-pulse'
          : gameState.phase === 'betting'
          ? 'border-red-500 bg-red-900/30'
          : 'border-gray-600 bg-gray-800/50'
      }`}>
        <div className="text-sm text-gray-400 mb-2">{phaseDisplay.text}</div>
        <div className={`text-6xl font-bold transition-colors duration-300 ${
          gameState.phase === 'betting' && gameState.countdownTimer > 0
            ? gameState.countdownTimer <= 5 ? 'text-red-400' : 'text-yellow-400'
            : gameState.phase === 'dealing'
            ? 'text-green-400'
            : gameState.phase === 'complete'
            ? 'text-purple-400'
            : 'text-gray-500'
        }`}>
          {gameState.phase === 'betting' && gameState.countdownTimer > 0
            ? `${gameState.countdownTimer}s`
            : gameState.phase === 'idle'
            ? '--'
            : gameState.phase === 'opening'
            ? '⏳'
            : gameState.phase === 'dealing'
            ? '🎴'
            : gameState.phase === 'complete'
            ? '✓'
            : '--'
          }
        </div>
        <div className="text-xs text-gray-400 mt-2">Round {gameState.currentRound}</div>
      </div>

      {/* Opening Card - ALWAYS VISIBLE */}
      <div className="bg-gradient-to-br from-gold/20 to-yellow-600/20 rounded-lg p-5 border-2 border-gold/50 text-center">
        <div className="text-sm text-gray-400 mb-2">Opening Card</div>
        <div className="text-5xl font-bold text-white">
          {gameState.selectedOpeningCard?.display || '--'}
        </div>
        {!gameState.selectedOpeningCard && (
          <div className="text-xs text-gray-500 mt-2">Not selected yet</div>
        )}
      </div>

      {/* Betting Stats - ALWAYS VISIBLE */}
      <div className="space-y-3">
        {/* ANDAR BETS */}
        <div className="bg-red-900/30 rounded-lg p-4 border-2 border-red-500/50 transition-all duration-300 hover:border-red-400">
          <div className="text-sm text-gray-400 mb-1">ANDAR BETS</div>
          <div className="text-2xl font-bold text-red-400">
            ₹{currentRoundBets.andar.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Round {gameState.currentRound}: {currentAndarPercentage.toFixed(1)}%
          </div>
          {gameState.currentRound >= 2 && (
            <div className="text-xs text-gray-600 mt-1 pt-1 border-t border-gray-700">
              Total: ₹{totalCumulativeAndar.toLocaleString('en-IN')}
            </div>
          )}
        </div>
        
        {/* BAHAR BETS */}
        <div className="bg-blue-900/30 rounded-lg p-4 border-2 border-blue-500/50 transition-all duration-300 hover:border-blue-400">
          <div className="text-sm text-gray-400 mb-1">BAHAR BETS</div>
          <div className="text-2xl font-bold text-blue-400">
            ₹{currentRoundBets.bahar.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Round {gameState.currentRound}: {currentBaharPercentage.toFixed(1)}%
          </div>
          {gameState.currentRound >= 2 && (
            <div className="text-xs text-gray-600 mt-1 pt-1 border-t border-gray-700">
              Total: ₹{totalCumulativeBahar.toLocaleString('en-IN')}
            </div>
          )}
        </div>
        
        {/* Round 1 Stats (show when in Round 2+) */}
        {gameState.currentRound >= 2 && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
            <div className="text-xs text-gray-400 mb-2">📊 Round 1 Stats</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-red-400">Andar:</span>
                <span className="text-white ml-1">₹{gameState.round1Bets.andar.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-blue-400">Bahar:</span>
                <span className="text-white ml-1">₹{gameState.round1Bets.bahar.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cards Dealt Summary - ALWAYS VISIBLE */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
          <div className="text-xs text-gray-400 mb-1">BAHAR</div>
          <div className="text-2xl font-bold text-blue-400">
            {gameState.baharCards.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {gameState.baharCards.length > 0 ? 'cards' : 'no cards'}
          </div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
          <div className="text-xs text-gray-400 mb-1">ANDAR</div>
          <div className="text-2xl font-bold text-red-400">
            {gameState.andarCards.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {gameState.andarCards.length > 0 ? 'cards' : 'no cards'}
          </div>
        </div>
      </div>

      {/* Winner Display - Only when complete */}
      {gameState.phase === 'complete' && gameState.gameWinner && (
        <div className={`rounded-lg border-2 p-4 text-center animate-bounce ${
          gameState.gameWinner === 'andar'
            ? 'bg-red-900/30 border-red-500'
            : 'bg-blue-900/30 border-blue-500'
        }`}>
          <div className="text-3xl mb-2">🎉</div>
          <div className={`text-2xl font-bold ${
            gameState.gameWinner === 'andar' ? 'text-red-400' : 'text-blue-400'
          }`}>
            {gameState.gameWinner.toUpperCase()} WINS!
          </div>
          {gameState.winningCard && (
            <div className="text-sm text-gray-300 mt-2">
              {gameState.winningCard.display}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PersistentSidePanel;

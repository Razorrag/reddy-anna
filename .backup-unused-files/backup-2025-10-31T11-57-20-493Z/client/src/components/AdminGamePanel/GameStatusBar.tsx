import React from 'react';
import type { Card, GamePhase, GameRound, GameWinner } from '@/types/game';

interface GameStatusBarProps {
  phase: GamePhase;
  round: GameRound;
  timer: number;
  openingCard: Card | null;
  winner: GameWinner;
  winningCard: Card | null;
}

const GameStatusBar: React.FC<GameStatusBarProps> = ({
  phase,
  round,
  timer,
  openingCard,
  winner,
  winningCard
}) => {
  const getPhaseDisplay = () => {
    switch (phase) {
      case 'idle':
      case 'opening':
        return { label: 'Waiting', color: 'text-gray-400', bg: 'bg-gray-700/50', icon: '⏳' };
      case 'betting':
        return { label: 'Betting Open', color: 'text-green-400', bg: 'bg-green-900/50', icon: '💰' };
      case 'dealing':
        return { label: 'Dealing Cards', color: 'text-blue-400', bg: 'bg-blue-900/50', icon: '🎴' };
      case 'complete':
        return { label: 'Complete', color: 'text-gold', bg: 'bg-gold/20', icon: '✅' };
      default:
        return { label: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-700/50', icon: '❓' };
    }
  };

  const phaseInfo = getPhaseDisplay();
  const timerColor = timer <= 10 ? 'text-red-500 animate-pulse' : timer <= 20 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gold/30 shadow-2xl">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Phase Status */}
        <div className="text-center p-4 bg-black/30 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">Phase</div>
          <div className={`text-2xl mb-1`}>{phaseInfo.icon}</div>
          <div className={`text-lg font-bold ${phaseInfo.color}`}>{phaseInfo.label}</div>
        </div>
        
        {/* Current Round */}
        <div className="text-center p-4 bg-black/30 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">Round</div>
          <div className="text-4xl font-bold text-gold">{round}</div>
          <div className="text-xs text-gray-500 mt-1">of 3</div>
        </div>
        
        {/* Timer */}
        <div className="text-center p-4 bg-black/30 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">Timer</div>
          <div className={`text-4xl font-bold ${timerColor}`}>
            {phase === 'betting' ? `${timer}s` : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {phase === 'betting' ? 'Betting' : 'N/A'}
          </div>
        </div>
        
        {/* Opening Card */}
        <div className="text-center p-4 bg-black/30 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">Opening Card</div>
          <div className={`text-3xl font-bold ${openingCard ? 'text-white' : 'text-gray-600'}`}>
            {openingCard?.display || '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {openingCard ? 'Set' : 'Not Set'}
          </div>
        </div>
        
        {/* Winner */}
        <div className="text-center p-4 bg-black/30 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">Winner</div>
          <div className={`text-2xl font-bold uppercase ${
            winner === 'andar' ? 'text-red-500' : winner === 'bahar' ? 'text-blue-500' : 'text-gray-600'
          }`}>
            {winner || '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {winningCard?.display || 'TBD'}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default GameStatusBar;

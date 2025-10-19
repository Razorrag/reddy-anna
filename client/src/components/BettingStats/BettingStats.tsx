import React from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { BettingStats as BettingStatsType } from '@shared/schema';
import './BettingStats.css';

interface BettingStatsProps {
  maxBetMultiplier?: number;
}

const BettingStats: React.FC<BettingStatsProps> = ({ maxBetMultiplier = 2 }) => {
  const { gameState } = useGameState();

  // Use actual game state data with proper round tracking
  const andarTotal = (gameState.round1Bets?.andar || 0) + (gameState.round2Bets?.andar || 0);
  const baharTotal = (gameState.round1Bets?.bahar || 0) + (gameState.round2Bets?.bahar || 0);
  
  const bettingData: BettingStatsType = {
    andarTotal,
    baharTotal,
    andarCount: 0, // TODO: Track player count per side
    baharCount: 0,
  };

  const totalBets = bettingData.andarTotal + bettingData.baharTotal;
  const totalPlayers = bettingData.andarCount + bettingData.baharCount;

  const andarPercentage = totalBets > 0 
    ? Math.round((bettingData.andarTotal / totalBets) * 100)
    : 0;

  const baharPercentage = totalBets > 0
    ? Math.round((bettingData.baharTotal / totalBets) * 100)
    : 0;

  return (
    <div className="betting-stats">
      <div className="bet-stat-card andar-stat">
        <div className="bet-stat-label">Andar Bets</div>
        <div className="bet-stat-amount">₹{bettingData.andarTotal.toLocaleString()}</div>
        <div className="bet-stat-percentage">{andarPercentage}%</div>
        <div className="bet-stat-players">{bettingData.andarCount} players</div>
      </div>
      
      <div className="bet-stat-card bahar-stat">
        <div className="bet-stat-label">Bahar Bets</div>
        <div className="bet-stat-amount">₹{bettingData.baharTotal.toLocaleString()}</div>
        <div className="bet-stat-percentage">{baharPercentage}%</div>
        <div className="bet-stat-players">{bettingData.baharCount} players</div>
      </div>
      
      <div className="bet-stat-card total-stat">
        <div className="bet-stat-label">Total Bets</div>
        <div className="bet-stat-amount">₹{totalBets.toLocaleString()}</div>
        <div className="bet-stat-percentage">100%</div>
        <div className="bet-stat-players">{totalPlayers} players</div>
      </div>
    </div>
  );
};

export default BettingStats;
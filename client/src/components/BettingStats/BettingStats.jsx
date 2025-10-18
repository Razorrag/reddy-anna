import React from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import './BettingStats.css';

const BettingStats = () => {
  const { gameState } = useGameState();

  // Mock betting data - in a real app this would come from the backend
  const bettingData = {
    andarBets: 12500,
    baharBets: 8750,
    totalBets: 21250,
    andarPlayers: 8,
    baharPlayers: 5,
    totalPlayers: 13
  };

  const andarPercentage = bettingData.totalBets > 0 
    ? Math.round((bettingData.andarBets / bettingData.totalBets) * 100)
    : 0;

  const baharPercentage = bettingData.totalBets > 0
    ? Math.round((bettingData.baharBets / bettingData.totalBets) * 100)
    : 0;

  return (
    <div className="betting-stats">
      <div className="bet-stat-card andar-stat">
        <div className="bet-stat-label">Andar Bets</div>
        <div className="bet-stat-amount">₹{bettingData.andarBets.toLocaleString()}</div>
        <div className="bet-stat-percentage">{andarPercentage}%</div>
        <div className="bet-stat-players">{bettingData.andarPlayers} players</div>
      </div>
      
      <div className="bet-stat-card bahar-stat">
        <div className="bet-stat-label">Bahar Bets</div>
        <div className="bet-stat-amount">₹{bettingData.baharBets.toLocaleString()}</div>
        <div className="bet-stat-percentage">{baharPercentage}%</div>
        <div className="bet-stat-players">{bettingData.baharPlayers} players</div>
      </div>
      
      <div className="bet-stat-card total-stat">
        <div className="bet-stat-label">Total Bets</div>
        <div className="bet-stat-amount">₹{bettingData.totalBets.toLocaleString()}</div>
        <div className="bet-stat-percentage">100%</div>
        <div className="bet-stat-players">{bettingData.totalPlayers} players</div>
      </div>
    </div>
  );
};

export default BettingStats;
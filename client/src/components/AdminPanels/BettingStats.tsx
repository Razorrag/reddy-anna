import React from 'react';
import { useGameState } from '../../contexts/GameStateContext';

const BettingStats = () => {
  const { gameState } = useGameState();

  // Calculate lowest bet
  const totalAndar = (gameState.round1Bets?.andar || 0) + (gameState.round2Bets?.andar || 0);
  const totalBahar = (gameState.round1Bets?.bahar || 0) + (gameState.round2Bets?.bahar || 0);
  const lowestBet = Math.min(totalAndar, totalBahar);
  const lowestBetSide = totalAndar <= totalBahar ? 'Andar' : 'Bahar';

  return (
    <div className="betting-stats bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-bold mb-3">Admin Betting Report</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="bg-red-800 p-3 rounded">
          <h4 className="font-semibold">Round 1 Stats</h4>
          <p>Andar: ₹{(gameState.round1Bets?.andar || 0).toLocaleString()}</p>
          <p>Bahar: ₹{(gameState.round1Bets?.bahar || 0).toLocaleString()}</p>
        </div>
        
        <div className="bg-blue-800 p-3 rounded">
          <h4 className="font-semibold">Round 2 Stats</h4>
          <p>Andar: ₹{(gameState.round2Bets?.andar || 0).toLocaleString()}</p>
          <p>Bahar: ₹{(gameState.round2Bets?.bahar || 0).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="bg-green-800 p-3 rounded">
          <h4 className="font-semibold">Total Stats</h4>
          <p>Andar Total: ₹{totalAndar.toLocaleString()}</p>
          <p>Bahar Total: ₹{totalBahar.toLocaleString()}</p>
        </div>
        
        <div className="bg-yellow-800 p-3 rounded">
          <h4 className="font-semibold">Lowest Bet</h4>
          <p>Side: {lowestBetSide}</p>
          <p>Amount: ₹{lowestBet.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default BettingStats;
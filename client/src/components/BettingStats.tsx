import React from 'react';
import { TrendingUp, Users, IndianRupee } from 'lucide-react';

interface BettingStatsProps {
  andarTotal: number;
  baharTotal: number;
  userBets: Record<string, Array<{ amount: number; position: string }>>;
  currentRound: number;
}

const BettingStats: React.FC<BettingStatsProps> = ({ 
  andarTotal, 
  baharTotal, 
  userBets, 
  currentRound 
}) => {
  const totalBets = andarTotal + baharTotal;
  const andarPercentage = totalBets > 0 ? (andarTotal / totalBets) * 100 : 0;
  const baharPercentage = totalBets > 0 ? (baharTotal / totalBets) * 100 : 0;

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-xl border border-gold/20 p-6">
      <h3 className="text-lg font-bold text-gold mb-4 flex items-center gap-2">
        <TrendingUp size={20} />
        Betting Statistics
      </h3>
      
      {/* Total Bets */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Total Pool</span>
          <span className="text-xl font-bold text-gold flex items-center gap-1">
            <IndianRupee size={16} />
            {totalBets.toLocaleString('en-IN')}
          </span>
        </div>
        
        {/* Progress bars */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-andar">Andar</span>
              <span className="text-andar">{andarPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-andar h-2 rounded-full transition-all duration-500"
                style={{ width: `${andarPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-400">Bahar</span>
              <span className="text-blue-400">{baharPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${baharPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Totals */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-andar/20 rounded-lg p-3 border border-andar/30">
          <div className="text-xs text-andar mb-1">Andar Bets</div>
          <div className="text-lg font-bold text-andar flex items-center gap-1">
            <IndianRupee size={14} />
            {andarTotal.toLocaleString('en-IN')}
          </div>
        </div>
        
        <div className="bg-blue-400/20 rounded-lg p-3 border border-blue-400/30">
          <div className="text-xs text-blue-400 mb-1">Bahar Bets</div>
          <div className="text-lg font-bold text-blue-400 flex items-center gap-1">
            <IndianRupee size={14} />
            {baharTotal.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Round Info */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Users size={16} />
            <span className="text-sm">Active Players</span>
          </div>
          <span className="font-semibold text-gold">
            {Object.keys(userBets).length}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-400">Current Round</span>
          <span className="font-semibold text-gold">
            {currentRound}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BettingStats;

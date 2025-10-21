import React from 'react';
import type { GameRound } from '@/types/game';

interface BettingAnalyticsProps {
  andarTotal: number;
  baharTotal: number;
  andarPercentage: number;
  baharPercentage: number;
  lesserSide: 'andar' | 'bahar';
  difference: number;
  round: GameRound;
}

const BettingAnalytics: React.FC<BettingAnalyticsProps> = ({
  andarTotal,
  baharTotal,
  andarPercentage,
  baharPercentage,
  lesserSide,
  difference,
  round
}) => {
  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gold/30 shadow-2xl">
      <h2 className="text-2xl font-bold text-gold mb-6 flex items-center gap-3">
        💰 Live Betting Analytics - Round {round}
      </h2>
      
      {/* Betting Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Andar Side */}
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 rounded-xl p-6 border-2 border-red-500/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
              🎴 ANDAR
            </h3>
            {lesserSide === 'andar' && (
              <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full animate-pulse">
                ⚠️ LESS BETS
              </span>
            )}
          </div>
          
          <div className="text-4xl font-bold text-white mb-2">
            ₹{andarTotal.toLocaleString('en-IN')}
          </div>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 bg-black/40 rounded-full h-6 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-red-600 to-red-500 h-full transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${andarPercentage}%` }}
              >
                {andarPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            {baharTotal > andarTotal && (
              <span className="text-yellow-400">
                ↓ ₹{difference.toLocaleString('en-IN')} behind Bahar
              </span>
            )}
            {andarTotal > baharTotal && (
              <span className="text-green-400">
                ↑ ₹{difference.toLocaleString('en-IN')} ahead
              </span>
            )}
            {andarTotal === baharTotal && (
              <span className="text-gray-400">⚖️ Equal with Bahar</span>
            )}
          </div>
        </div>
        
        {/* Bahar Side */}
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 rounded-xl p-6 border-2 border-blue-500/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              🎴 BAHAR
            </h3>
            {lesserSide === 'bahar' && (
              <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full animate-pulse">
                ⚠️ LESS BETS
              </span>
            )}
          </div>
          
          <div className="text-4xl font-bold text-white mb-2">
            ₹{baharTotal.toLocaleString('en-IN')}
          </div>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 bg-black/40 rounded-full h-6 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-500 h-full transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${baharPercentage}%` }}
              >
                {baharPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            {andarTotal > baharTotal && (
              <span className="text-yellow-400">
                ↓ ₹{difference.toLocaleString('en-IN')} behind Andar
              </span>
            )}
            {baharTotal > andarTotal && (
              <span className="text-green-400">
                ↑ ₹{difference.toLocaleString('en-IN')} ahead
              </span>
            )}
            {andarTotal === baharTotal && (
              <span className="text-gray-400">⚖️ Equal with Andar</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Total Pool */}
      <div className="bg-gradient-to-r from-gold/20 to-yellow-600/20 rounded-xl p-6 border border-gold/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-gray-400 text-sm mb-1">Total Betting Pool</div>
            <div className="text-3xl font-bold text-gold">
              ₹{(andarTotal + baharTotal).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-5xl">💎</div>
        </div>
      </div>
      
      {/* Risk Assessment */}
      {Math.abs(andarPercentage - baharPercentage) > 30 && (
        <div className="mt-4 bg-orange-900/30 border border-orange-500/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-bold text-orange-400">Unbalanced Betting Detected</div>
              <div className="text-sm text-gray-400">
                {lesserSide === 'andar' ? 'Andar' : 'Bahar'} has significantly fewer bets. 
                House risk is {Math.abs(andarPercentage - baharPercentage).toFixed(1)}% imbalanced.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BettingAnalytics;

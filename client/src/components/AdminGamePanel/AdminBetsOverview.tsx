/**
 * AdminBetsOverview - Large betting totals display for admin hedge/steering decisions
 * 
 * Features:
 * - Two large panels showing Andar (Red) and Bahar (Blue) cumulative game betting totals
 * - Shows cumulative bets (Round 1 + Round 2) with round breakdown
 * - LOW BET indicator to highlight which side has less total betting (based on cumulative)
 * - Real-time sync via WebSocket admin events
 * - Admin-only data (never exposes to players)
 * 
 * Data Sources (Admin-Only):
 * - round1Bets, round2Bets from GameStateContext
 * - Updated via: betting_stats, admin_bet_update, game_state_sync events
 */

import React, { useState, useEffect } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import { AlertTriangle } from 'lucide-react';

const AdminBetsOverview: React.FC = () => {
  const { gameState, updateRoundBets } = useGameState();
  const [, forceUpdate] = useState({});

  // Listen for admin bet update events to force re-render
  useEffect(() => {
    const handleAdminBetUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const betData = customEvent.detail;
      
      console.log('📨 AdminBetsOverview: Received admin_bet_update event:', betData);
      
      // Update round bets if provided
      if (betData?.round1Bets) {
        updateRoundBets(1, {
          andar: betData.round1Bets.andar || 0,
          bahar: betData.round1Bets.bahar || 0
        });
      }
      if (betData?.round2Bets) {
        updateRoundBets(2, {
          andar: betData.round2Bets.andar || 0,
          bahar: betData.round2Bets.bahar || 0
        });
      }
      
      // Force re-render
      forceUpdate({});
    };
    
    const handleGameStateUpdate = () => {
      console.log('🔄 AdminBetsOverview: GameState updated, forcing re-render');
      forceUpdate({});
    };
    
    window.addEventListener('admin_bet_update', handleAdminBetUpdate);
    window.addEventListener('gameStateUpdated', handleGameStateUpdate);
    
    return () => {
      window.removeEventListener('admin_bet_update', handleAdminBetUpdate);
      window.removeEventListener('gameStateUpdated', handleGameStateUpdate);
    };
  }, [updateRoundBets]);

  // Calculate cumulative bets across all rounds (Round 1 + Round 2)
  const round1Andar = typeof gameState.round1Bets.andar === 'number' ? gameState.round1Bets.andar : 0;
  const round1Bahar = typeof gameState.round1Bets.bahar === 'number' ? gameState.round1Bets.bahar : 0;
  const round2Andar = typeof gameState.round2Bets.andar === 'number' ? gameState.round2Bets.andar : 0;
  const round2Bahar = typeof gameState.round2Bets.bahar === 'number' ? gameState.round2Bets.bahar : 0;
  const cumulativeAndar = round1Andar + round2Andar;
  const cumulativeBahar = round1Bahar + round2Bahar;

  // Determine which side has lower total bet (for hedge/steering) - using cumulative totals
  const totalCumulativeBets = cumulativeAndar + cumulativeBahar;
  const hasLowBetAndar = totalCumulativeBets > 0 && cumulativeAndar < cumulativeBahar;
  const hasLowBetBahar = totalCumulativeBets > 0 && cumulativeBahar < cumulativeAndar;

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 shadow-2xl p-8">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gold mb-2">📊 Betting Overview - Admin Only</h2>
        <p className="text-gray-400">Monitor betting totals for hedge/steering decisions</p>
        <div className="text-sm text-gray-500 mt-2">
          Round {gameState.currentRound} • Phase: {gameState.phase}
        </div>
      </div>

      {/* Two Large Betting Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ANDAR (RED) Panel */}
        <div className={`relative bg-gradient-to-br from-red-900/50 to-red-800/50 rounded-2xl border-4 p-8 transition-all duration-300 ${
          hasLowBetAndar ? 'border-yellow-500 shadow-2xl shadow-yellow-500/50' : 'border-red-500/70'
        }`}>
          {/* Title */}
          <div className="text-center mb-6">
            <h3 className="text-4xl font-black text-red-300 uppercase tracking-wider mb-2">
              ANDAR (RED)
            </h3>
            <div className="h-1 w-32 bg-red-500 mx-auto rounded-full"></div>
          </div>

          {/* Cumulative Total (Main Display) */}
          <div className="mb-6 text-center">
            <div className="text-sm text-red-200 uppercase tracking-wide mb-2">
              Total Game Bets (All Rounds)
            </div>
            <div className="text-7xl font-black text-red-300 mb-2">
              ₹{cumulativeAndar.toLocaleString('en-IN')}
            </div>
            {totalCumulativeBets > 0 && (
              <div className="text-xl text-red-100">
                {((cumulativeAndar / totalCumulativeBets) * 100).toFixed(1)}% of total game
              </div>
            )}
          </div>

          {/* Round Breakdown */}
          <div className="text-center pt-6 border-t-2 border-red-500/40">
            <div className="text-sm text-red-200/80 uppercase tracking-wide mb-2">
              Round Breakdown
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-red-300/70">Round 1</div>
                <div className="text-xl font-bold text-red-200">₹{round1Andar.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-red-300/70">Round 2</div>
                <div className="text-xl font-bold text-red-200">₹{round2Andar.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* LOW BET Indicator */}
          {hasLowBetAndar && (
            <div className="absolute top-4 right-4">
              <div className="bg-yellow-500/30 border-2 border-yellow-500 rounded-lg px-4 py-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-300" />
                  <span className="text-yellow-300 font-bold uppercase text-sm">
                    LOW BET SIDE
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BAHAR (BLUE) Panel */}
        <div className={`relative bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-2xl border-4 p-8 transition-all duration-300 ${
          hasLowBetBahar ? 'border-yellow-500 shadow-2xl shadow-yellow-500/50' : 'border-blue-500/70'
        }`}>
          {/* Title */}
          <div className="text-center mb-6">
            <h3 className="text-4xl font-black text-blue-300 uppercase tracking-wider mb-2">
              BAHAR (BLUE)
            </h3>
            <div className="h-1 w-32 bg-blue-500 mx-auto rounded-full"></div>
          </div>

          {/* Cumulative Total (Main Display) */}
          <div className="mb-6 text-center">
            <div className="text-sm text-blue-200 uppercase tracking-wide mb-2">
              Total Game Bets (All Rounds)
            </div>
            <div className="text-7xl font-black text-blue-300 mb-2">
              ₹{cumulativeBahar.toLocaleString('en-IN')}
            </div>
            {totalCumulativeBets > 0 && (
              <div className="text-xl text-blue-100">
                {((cumulativeBahar / totalCumulativeBets) * 100).toFixed(1)}% of total game
              </div>
            )}
          </div>

          {/* Round Breakdown */}
          <div className="text-center pt-6 border-t-2 border-blue-500/40">
            <div className="text-sm text-blue-200/80 uppercase tracking-wide mb-2">
              Round Breakdown
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-blue-300/70">Round 1</div>
                <div className="text-xl font-bold text-blue-200">₹{round1Bahar.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-blue-300/70">Round 2</div>
                <div className="text-xl font-bold text-blue-200">₹{round2Bahar.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* LOW BET Indicator */}
          {hasLowBetBahar && (
            <div className="absolute top-4 right-4">
              <div className="bg-yellow-500/30 border-2 border-yellow-500 rounded-lg px-4 py-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-300" />
                  <span className="text-yellow-300 font-bold uppercase text-sm">
                    LOW BET SIDE
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/30 rounded-lg p-4 border border-gray-600/30">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Game Bets</div>
          <div className="text-2xl font-bold text-white">
            ₹{(cumulativeAndar + cumulativeBahar).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-4 border border-gray-600/30">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Bet Difference</div>
          <div className="text-2xl font-bold text-white">
            ₹{Math.abs(cumulativeAndar - cumulativeBahar).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-4 border border-gray-600/30">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Round</div>
          <div className="text-2xl font-bold text-white">
            Round {gameState.currentRound}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>💡 The LOW BET indicator shows which side has less total betting for strategic hedging.</p>
        <p className="mt-1">Data updates in real-time via WebSocket (admin-only, not visible to players).</p>
      </div>
    </div>
  );
};

export default AdminBetsOverview;
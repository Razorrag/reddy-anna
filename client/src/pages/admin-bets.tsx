import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGameState } from '@/contexts/GameStateContext';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

export default function AdminBetsPage() {
  const { gameState, updateRoundBets } = useGameState();
  const [, setLocation] = useLocation();
  const [, forceUpdate] = useState({});
  const [isStreamPaused, setIsStreamPaused] = useState(false);

  // Listen for bet updates (same logic as AdminBetsOverview)
  useEffect(() => {
    const handleAdminBetUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const betData = customEvent.detail;
      
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
      
      forceUpdate({});
    };
    
    const handleGameStateUpdate = () => {
      forceUpdate({});
    };
    
    window.addEventListener('admin_bet_update', handleAdminBetUpdate);
    window.addEventListener('gameStateUpdated', handleGameStateUpdate);
    
    return () => {
      window.removeEventListener('admin_bet_update', handleAdminBetUpdate);
      window.removeEventListener('gameStateUpdated', handleGameStateUpdate);
    };
  }, [updateRoundBets]);

  // Listen for global stream pause state (same as VideoArea)
  useEffect(() => {
    // Initial load from backend config
    const loadStreamConfig = async () => {
      try {
        const response = await fetch('/api/stream/simple-config');
        const data = await response.json();
        if (data?.success && data?.data) {
          setIsStreamPaused(!!data.data.isPaused);
        }
      } catch (error) {
        console.error('Failed to load stream pause state for admin bets page:', error);
      }
    };

    loadStreamConfig();

    // Live updates via WebSocket
    const { ws } = (window as any).__wsContext || {};
    if (!ws) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string);
        if (message.type === 'stream_pause_state') {
          const { isPaused } = message.data || {};
          setIsStreamPaused(!!isPaused);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, []);

  // Calculate current round bets
  const currentRoundBets = gameState.currentRound === 1 ? gameState.round1Bets : gameState.round2Bets;
  const currentAndar = typeof currentRoundBets.andar === 'number' ? currentRoundBets.andar : 0;
  const currentBahar = typeof currentRoundBets.bahar === 'number' ? currentRoundBets.bahar : 0;

  // Determine LOW BET side
  const totalCurrentBets = currentAndar + currentBahar;
  const lowSide = 
    totalCurrentBets === 0 ? null :
    currentAndar < currentBahar ? 'andar' :
    currentBahar < currentAndar ? 'bahar' :
    'equal';

  const lowBetAmount = lowSide === 'andar' ? currentAndar : lowSide === 'bahar' ? currentBahar : 0;
  const betDifference = Math.abs(currentAndar - currentBahar);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header with only Back Button */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 shadow-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setLocation('/admin/game')}
                className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>

          {/* Stream Paused banner (moved from player video overlay) */}
          {isStreamPaused && (
            <div className="mb-4 flex justify-center">
              <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-2xl border-2 border-amber-500/60 shadow-2xl flex items-center gap-3">
                <div className="text-3xl animate-pulse">⏸️</div>
                <div>
                  <p className="text-white font-bold text-lg">Stream Paused</p>
                  <p className="text-gray-300 text-xs">Admin will resume shortly</p>
                </div>
              </div>
            </div>
          )}

          {/* Single LOW BET Box */}
          <div className="mb-6">
            {lowSide === null || totalCurrentBets === 0 ? (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-gray-600/50 p-12 text-center">
                <div className="mb-4 flex items-center justify-center gap-3 text-xs text-gray-400 uppercase tracking-wide">
                  <span className="px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold font-semibold">
                    Round {gameState.currentRound}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-200 font-medium">
                    {gameState.phase}
                  </span>
                </div>
                <div className="text-6xl mb-4">⚖️</div>
                <div className="text-2xl font-bold text-gray-300">
                  No bets placed yet
                </div>
                <div className="text-gray-400 mt-2">
                  Waiting for players to place bets...
                </div>
              </div>
            ) : lowSide === 'equal' ? (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-yellow-500/50 p-12 text-center">
                <div className="mb-4 flex items-center justify-center gap-3 text-xs text-gray-400 uppercase tracking-wide">
                  <span className="px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold font-semibold">
                    Round {gameState.currentRound}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-200 font-medium">
                    {gameState.phase}
                  </span>
                </div>
                <div className="text-6xl mb-4">⚖️</div>
                <div className="text-2xl font-bold text-yellow-300">
                  Both sides have equal bets
                </div>
                <div className="text-gray-300 mt-2">
                  ₹{currentAndar.toLocaleString('en-IN')} each
                </div>
              </div>
            ) : (
              <div className={`relative bg-gradient-to-br rounded-2xl border-4 border-yellow-500 shadow-2xl shadow-yellow-500/50 p-10 ${
                lowSide === 'andar' 
                  ? 'from-red-900/60 to-red-800/60' 
                  : 'from-blue-900/60 to-blue-800/60'
              }`}>
                {/* LOW BET Badge */}
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

                {/* Title + Round info */}
                <div className="text-center mb-8">
                  <div className="mb-4 flex items-center justify-center gap-3 text-xs text-gray-300 uppercase tracking-wide">
                    <span className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-white font-semibold">
                      Round {gameState.currentRound}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-600/40 border border-purple-400/60 text-purple-100 font-medium">
                      {gameState.phase}
                    </span>
                  </div>
                  <h2 className={`text-5xl font-black uppercase tracking-wider mb-3 ${
                    lowSide === 'andar' ? 'text-red-300' : 'text-blue-300'
                  }`}>
                    {lowSide === 'andar' ? 'ANDAR (RED)' : 'BAHAR (BLUE)'}
                  </h2>
                  <div className={`h-1.5 w-40 mx-auto rounded-full ${
                    lowSide === 'andar' ? 'bg-red-500' : 'bg-blue-500'
                  }`}></div>
                </div>

                {/* Amount */}
                <div className="text-center">
                  <div className={`text-sm uppercase tracking-wide mb-3 ${
                    lowSide === 'andar' ? 'text-red-200' : 'text-blue-200'
                  }`}>
                    Current Round {gameState.currentRound} Bet
                  </div>
                  <div className={`text-8xl font-black mb-4 ${
                    lowSide === 'andar' ? 'text-red-300' : 'text-blue-300'
                  }`}>
                    ₹{lowBetAmount.toLocaleString('en-IN')}
                  </div>
                  <div className={`text-2xl ${
                    lowSide === 'andar' ? 'text-red-100' : 'text-blue-100'
                  }`}>
                    {((lowBetAmount / totalCurrentBets) * 100).toFixed(1)}% of current round
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-red-500/30 p-6 text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Total Andar Bet
              </div>
              <div className="text-4xl font-bold text-red-300">
                ₹{currentAndar.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6 text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Total Bahar Bet
              </div>
              <div className="text-4xl font-bold text-blue-300">
                ₹{currentBahar.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 p-6 text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Bet Difference
              </div>
              <div className="text-4xl font-bold text-gold">
                ₹{betDifference.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                (High - Low)
              </div>
            </div>
          </div>

          {/* Info Text */}
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>💡 Shows the side with lower betting for strategic decisions</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
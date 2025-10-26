/**
 * LiveAnalyticsTicker - Running news-style analytics banner
 * 
 * Shows real-time statistics across all admin pages:
 * - Today's profit/loss
 * - Active bets
 * - Current game status
 * - Player count
 * - Recent wins/losses
 */

import { useState, useEffect } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Trophy } from 'lucide-react';

interface AnalyticsData {
  todayProfit: number;
  todayLoss: number;
  netProfit: number;
  activeBets: number;
  totalBetsAmount: number;
  activeUsers: number;
  currentGameRound: number;
  currentGamePhase: string;
  andarBets: number;
  baharBets: number;
  lastWinner: string | null;
  lastWinAmount: number;
}

export default function LiveAnalyticsTicker() {
  const { gameState } = useGameState();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    todayProfit: 0,
    todayLoss: 0,
    netProfit: 0,
    activeBets: 0,
    totalBetsAmount: 0,
    activeUsers: 0,
    currentGameRound: 1,
    currentGamePhase: 'idle',
    andarBets: 0,
    baharBets: 0,
    lastWinner: null,
    lastWinAmount: 0
  });

  // Update analytics from game state
  useEffect(() => {
    const andarTotal = (gameState.round1Bets?.andar || 0) + (gameState.round2Bets?.andar || 0);
    const baharTotal = (gameState.round1Bets?.bahar || 0) + (gameState.round2Bets?.bahar || 0);
    const totalBets = andarTotal + baharTotal;
    
    setAnalytics(prev => ({
      ...prev,
      currentGameRound: gameState.currentRound,
      currentGamePhase: gameState.phase,
      andarBets: andarTotal,
      baharBets: baharTotal,
      totalBetsAmount: totalBets,
      activeBets: totalBets > 0 ? 1 : 0
    }));
  }, [gameState]);

  // Simulate real-time updates (replace with actual API calls)
  useEffect(() => {
    const interval = setInterval(() => {
      // Fetch real-time analytics from backend
      // For now, using mock data
      setAnalytics(prev => ({
        ...prev,
        todayProfit: 125000 + Math.random() * 10000,
        todayLoss: 98000 + Math.random() * 5000,
        netProfit: 27000 + Math.random() * 5000,
        activeUsers: 15 + Math.floor(Math.random() * 10)
      }));
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'betting': return 'text-yellow-400';
      case 'dealing': return 'text-blue-400';
      case 'complete': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'betting': return '⏰';
      case 'dealing': return '🎴';
      case 'complete': return '✅';
      default: return '⏸️';
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-md border-y border-purple-500/30 shadow-lg overflow-hidden">
      <div className="animate-scroll-left">
        <div className="flex items-center gap-8 py-3 px-4 whitespace-nowrap">
          {/* Today's Profit/Loss */}
          <div className="flex items-center gap-2">
            {analytics.netProfit >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm font-semibold text-gray-300">Today's Net:</span>
            <span className={`text-lg font-bold ${analytics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(analytics.netProfit)}
            </span>
          </div>

          <div className="h-6 w-px bg-purple-500/30" />

          {/* Profit */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">Profit:</span>
            <span className="text-base font-bold text-green-400">
              {formatCurrency(analytics.todayProfit)}
            </span>
          </div>

          <div className="h-6 w-px bg-purple-500/30" />

          {/* Loss */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-300">Loss:</span>
            <span className="text-base font-bold text-red-400">
              {formatCurrency(analytics.todayLoss)}
            </span>
          </div>

          <div className="h-6 w-px bg-purple-500/30" />

          {/* Current Game Status */}
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-300">Game:</span>
            <span className={`text-base font-bold ${getPhaseColor(analytics.currentGamePhase)}`}>
              {getPhaseIcon(analytics.currentGamePhase)} Round {analytics.currentGameRound} - {analytics.currentGamePhase.toUpperCase()}
            </span>
          </div>

          <div className="h-6 w-px bg-purple-500/30" />

          {/* Active Bets */}
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-300">Total Bets:</span>
            <span className="text-base font-bold text-yellow-400">
              {formatCurrency(analytics.totalBetsAmount)}
            </span>
          </div>

          <div className="h-6 w-px bg-purple-500/30" />

          {/* Andar vs Bahar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-sm text-red-300">Andar:</span>
              <span className="text-base font-bold text-red-400">
                {formatCurrency(analytics.andarBets)}
              </span>
            </div>
            <span className="text-gray-500">vs</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-blue-300">Bahar:</span>
              <span className="text-base font-bold text-blue-400">
                {formatCurrency(analytics.baharBets)}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-purple-500/30" />

          {/* Active Users */}
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-300">Active Players:</span>
            <span className="text-base font-bold text-blue-400">
              {analytics.activeUsers}
            </span>
          </div>

          <div className="h-6 w-px bg-purple-500/30" />

          {/* Last Winner */}
          {analytics.lastWinner && (
            <>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-300">Last Winner:</span>
                <span className="text-base font-bold text-yellow-400">
                  {analytics.lastWinner.toUpperCase()}
                </span>
                <span className="text-sm text-green-400">
                  (+{formatCurrency(analytics.lastWinAmount)})
                </span>
              </div>
              <div className="h-6 w-px bg-purple-500/30" />
            </>
          )}

          {/* Repeat for continuous scroll */}
          <div className="flex items-center gap-2">
            {analytics.netProfit >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm font-semibold text-gray-300">Today's Net:</span>
            <span className={`text-lg font-bold ${analytics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(analytics.netProfit)}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-left {
          display: inline-block;
          animation: scroll-left 30s linear infinite;
        }

        .animate-scroll-left:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

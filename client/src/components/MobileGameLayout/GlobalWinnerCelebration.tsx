/**
 * GlobalWinnerCelebration - Unified celebration showing winner AND payout
 *
 * Event-driven celebration system that listens to game-complete-celebration
 * and displays winner text (ANDAR/BABA/BAHAR WON) with payout details.
 *
 * Mounted once in MobileGameLayout, overlays the entire game area.
 *
 * - Players: See winner text + their payout amounts
 * - Admins: See only winner announcement (no monetary details)
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useGameState } from '@/contexts/GameStateContext';

interface CelebrationData {
  winner: 'andar' | 'bahar';
  winningCard: any;
  round: number;
  winnerDisplay?: string; // NEW: Server-computed winner text (ANDAR WON / BABA WON / BAHAR WON)
  payoutAmount: number;
  totalBetAmount: number;
  netProfit: number;
  playerBets?: {
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
  };
  result: 'no_bet' | 'refund' | 'mixed' | 'win' | 'loss';
  dataSource?: 'game_complete_direct' | 'payout_received_websocket' | 'local_calculation' | 'none';
}

const GlobalWinnerCelebration: React.FC = () => {
  const { user } = useAuth();
  const { gameState, hideCelebration } = useGameState();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const data = gameState.lastCelebration as CelebrationData | null;
  const visible = !!gameState.showCelebration && !!data;

  useEffect(() => {
    if (!visible || !data) {
      console.log('👻 GlobalWinnerCelebration: Not rendering (visible:', visible, 'data:', !!data, ')');
      return;
    }

    console.group('🎉 GlobalWinnerCelebration: Game Complete');
    console.log('📊 Celebration Data:', {
      winner: data.winner,
      winningCard: data.winningCard,
      round: data.round,
      winnerDisplay: data.winnerDisplay || 'not provided',
      result: data.result,
      dataSource: data.dataSource || 'unknown'
    });
    console.log('💰 Payout Details:', {
      payoutAmount: data.payoutAmount,
      totalBetAmount: data.totalBetAmount,
      netProfit: data.netProfit,
      playerBets: data.playerBets
    });

    if (data.winnerDisplay) {
      console.log('✅ WINNER TEXT: Server (Authoritative)');
    } else {
      console.warn('⚠️ WINNER TEXT: Client Fallback (Server did not provide)');
    }

    if (data.dataSource === 'game_complete_direct') {
      console.log('✅ PAYOUT SOURCE: Server game_complete (Authoritative)');
    } else if (data.dataSource === 'payout_received_websocket') {
      console.warn('⚠️ PAYOUT SOURCE: payout_received Backup');
    } else if (data.dataSource === 'local_calculation') {
      console.error('❌ PAYOUT SOURCE: Local Calculation (Fallback - may be inaccurate)');
    } else {
      console.warn('❓ PAYOUT SOURCE: Unknown');
    }

    console.log('👤 User Info:', {
      isAdmin,
      userId: user?.id,
      userRole: user?.role
    });
    console.groupEnd();

    const duration = 8000; // Fixed duration so players can always read payout, even in fallback
    console.log(`⏱️ GlobalWinnerCelebration: Will auto-hide after ${duration}ms`);

    const hideTimer = setTimeout(() => {
      console.log('⏱️ GlobalWinnerCelebration: Auto-hiding celebration');
      hideCelebration();
    }, duration);

    return () => {
      clearTimeout(hideTimer);
    };
  }, [visible, data, hideCelebration, isAdmin, user?.id, user?.role]);

  if (!visible || !data) {
    return null;
  }

  console.log('🎨 GlobalWinnerCelebration: Rendering celebration overlay');

  // ✅ ENHANCED: Prefer server's winnerDisplay, fallback to local calculation
  const getWinnerText = () => {
    // 1️⃣ PRIMARY: Use server's pre-computed winner text
    if (data.winnerDisplay) {
      return data.winnerDisplay;
    }
    
    // 2️⃣ FALLBACK: Compute locally (only if server didn't provide it)
    console.warn('⚠️ winnerDisplay missing from server, computing locally');
    if (data.winner === 'andar') {
      return 'ANDAR WON';
    } else {
      // Bahar naming: R1-R2 = "BABA WON", R3+ = "BAHAR WON"
      return data.round >= 3 ? 'BAHAR WON' : 'BABA WON';
    }
  };

  const winningCardDisplay = typeof data.winningCard === 'string'
    ? data.winningCard
    : data.winningCard?.display || 'Unknown';

  // Admin sees simplified celebration (winner only, no monetary details)
  if (isAdmin) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ pointerEvents: 'auto' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative z-10 max-w-sm w-full mx-4"
          >
            <div className="bg-gradient-to-br from-purple-800/90 via-purple-700/90 to-purple-800/90 rounded-2xl p-6 border-4 border-purple-400 shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring" }}
                className="text-center"
              >
                <div className="text-6xl mb-4">🎴</div>
                <div className="text-4xl font-black text-white mb-3">{getWinnerText()}</div>
                <div className="text-2xl text-purple-200 mb-2">{winningCardDisplay}</div>
                <div className="text-sm font-semibold text-white/70">Round {data.round} Completed</div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Players see unified celebration: Winner text + Payout information
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }}
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative z-10 max-w-md w-full mx-4"
        >
          {/* Unified Card - Same layout for all result types */}
          <div className={`rounded-2xl p-6 border-4 shadow-2xl ${
            data.result === 'win' 
              ? 'bg-gradient-to-br from-yellow-600/90 via-yellow-700/90 to-yellow-800/90 border-yellow-400'
              : data.result === 'refund'
              ? 'bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-blue-800/90 border-blue-400'
              : data.result === 'mixed'
              ? data.netProfit > 0
                ? 'bg-gradient-to-br from-green-600/90 via-green-700/90 to-green-800/90 border-green-400'
                : 'bg-gradient-to-br from-orange-600/90 via-orange-700/90 to-orange-800/90 border-orange-400'
              : data.result === 'loss'
              ? 'bg-gradient-to-br from-gray-800/90 via-gray-700/90 to-gray-800/90 border-gray-500'
              : 'bg-gradient-to-br from-purple-800/90 via-purple-700/90 to-purple-800/90 border-purple-400'
          }`}>
            
            {/* Winner Text Header - Always shown */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-4"
            >
              <div className="text-4xl font-black text-white mb-2">{getWinnerText()}</div>
              <div className="text-lg text-gray-200">{winningCardDisplay} • Round {data.round}</div>
            </motion.div>

            {/* Payout Information - Always shown when there's any bet or payout */}
            {(data.totalBetAmount > 0 || data.payoutAmount > 0) ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-black/50 rounded-xl p-5 border-2 border-white/30"
              >
                {/* Net Profit/Loss - Most Prominent */}
                <div className="text-center mb-4">
                  {data.netProfit > 0 ? (
                    <>
                      <div className="text-sm font-semibold text-green-300 mb-1 uppercase tracking-wider">You Won</div>
                      <div className="text-6xl font-black text-green-400 mb-2 drop-shadow-[0_0_20px_rgba(74,222,128,0.6)]">
                        +₹{data.netProfit.toLocaleString('en-IN')}
                      </div>
                      <div className="text-sm text-green-200/80 font-semibold">Net Profit</div>
                    </>
                  ) : data.netProfit === 0 ? (
                    <>
                      <div className="text-sm font-semibold text-yellow-300 mb-1 uppercase tracking-wider">Bet Refunded</div>
                      <div className="text-5xl font-black text-yellow-400 mb-2">
                        ₹{data.payoutAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-sm text-yellow-200/80 font-semibold">No profit, no loss</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-red-300 mb-1 uppercase tracking-wider">Better Luck Next Time</div>
                      <div className="text-5xl font-black text-red-400 mb-2">😊</div>
                      <div className="text-sm text-red-200/80 font-semibold">Don't worry, it's all part of the game!</div>
                    </>
                  )}
                </div>

                {/* Payout Breakdown */}
                <div className="space-y-2 pt-3 border-t border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Total Payout:</span>
                    <span className="text-base font-bold text-white">₹{data.payoutAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Your Bet:</span>
                    <span className="text-base font-bold text-red-300">-₹{data.totalBetAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <span className="text-base font-bold text-yellow-200">Net {data.netProfit >= 0 ? 'Profit' : 'Loss'}:</span>
                    <span className={`text-lg font-black ${
                      data.netProfit > 0 ? 'text-green-400' : data.netProfit === 0 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {data.netProfit > 0 ? '+' : ''}₹{data.netProfit.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              // No bet placed (no payout and no bet recorded)
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-black/50 rounded-xl p-5 border-2 border-white/30 text-center"
              >
                <div className="text-2xl font-semibold text-gray-400 mb-2">No Bet Placed</div>
                <div className="text-sm text-gray-500">You did not place any bets this round</div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalWinnerCelebration;
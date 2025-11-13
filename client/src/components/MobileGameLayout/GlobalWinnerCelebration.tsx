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

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface CelebrationData {
  winner: 'andar' | 'bahar';
  winningCard: any;
  round: number;
  payoutAmount: number;
  totalBetAmount: number;
  netProfit: number;
  playerBets?: {
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
  };
  result: 'no_bet' | 'refund' | 'mixed' | 'win' | 'loss';
}

const GlobalWinnerCelebration: React.FC = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<CelebrationData | null>(null);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    const handleCelebration = (event: Event) => {
      const customEvent = event as CustomEvent<CelebrationData>;
      const detail = customEvent.detail;

      if (!detail || !detail.winner) {
        console.warn('⚠️ GlobalWinnerCelebration: Invalid celebration data received', detail);
        return;
      }

      // ✅ ENHANCED DEBUG LOGGING
      console.group('🎉 GlobalWinnerCelebration: Game Complete');
      console.log('📊 Celebration Data:', {
        winner: detail.winner,
        winningCard: detail.winningCard,
        round: detail.round,
        result: detail.result
      });
      console.log('💰 Payout Details:', {
        payoutAmount: detail.payoutAmount,
        totalBetAmount: detail.totalBetAmount,
        netProfit: detail.netProfit,
        playerBets: detail.playerBets
      });
      console.log('👤 User Info:', {
        isAdmin,
        userId: user?.id,
        userRole: user?.role
      });
      console.groupEnd();
      
      // ✅ VALIDATION: Ensure all numeric values are valid
      const validatedData: CelebrationData = {
        ...detail,
        payoutAmount: typeof detail.payoutAmount === 'number' && !isNaN(detail.payoutAmount) ? detail.payoutAmount : 0,
        totalBetAmount: typeof detail.totalBetAmount === 'number' && !isNaN(detail.totalBetAmount) ? detail.totalBetAmount : 0,
        netProfit: typeof detail.netProfit === 'number' && !isNaN(detail.netProfit) ? detail.netProfit : 0,
      };
      
      setData(validatedData);
      setVisible(true);

      // Auto-hide based on result type
      const duration = validatedData.result === 'no_bet' ? 3000 : 8000;
      
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => setData(null), 500);
      }, duration);
    };

    console.log('✅ GlobalWinnerCelebration: Event listener registered');
    window.addEventListener('game-complete-celebration', handleCelebration as EventListener);
    return () => {
      console.log('🔌 GlobalWinnerCelebration: Event listener removed');
      window.removeEventListener('game-complete-celebration', handleCelebration as EventListener);
    };
  }, [isAdmin, user?.id, user?.role]);

  if (!visible || !data) {
    return null;
  }

  // Determine winner text based on round and side
  const getWinnerText = () => {
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

            {/* Payout Information - Always shown when there's a bet */}
            {data.totalBetAmount > 0 ? (
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
                      <div className="text-sm font-semibold text-red-300 mb-1 uppercase tracking-wider">You Lost</div>
                      <div className="text-6xl font-black text-red-400 mb-2">
                        -₹{Math.abs(data.netProfit).toLocaleString('en-IN')}
                      </div>
                      <div className="text-sm text-red-200/80 font-semibold">Net Loss</div>
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
              // No bet placed
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
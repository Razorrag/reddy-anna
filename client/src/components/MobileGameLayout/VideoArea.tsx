/**
 * VideoArea - Enhanced video stream area with circular countdown timer overlay
 *
 * Features:
 * - Embedded iFrame video stream (runs independently)
 * - Circular countdown timer with yellow stroke
 * - Round number display
 * - Pulse effect when <5 seconds
 * - Phase-specific colors (betting/dealing)
 * - Smooth timer animations
 * - Video stream never interrupted by game state or operations
 */

import React, { useEffect, useState } from 'react';
import { useGameState } from '@/contexts/GameStateContext';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoAreaProps {
  className?: string;
  isScreenSharing?: boolean; // No longer used, kept for backward compatibility
}

interface GameCompleteResult {
  winner: 'andar' | 'bahar' | null;
  winningCard: any;
  payoutAmount: number;
  totalBetAmount: number;
  result: 'win' | 'loss' | 'no_bet' | 'refund' | 'mixed';
  round: number;
  // Detailed bet breakdown for mixed scenarios
  playerBets?: {
    round1: { andar: number; bahar: number };
    round2: { andar: number; bahar: number };
  };
  // Profit/loss details
  netProfit?: number;
  isRefundOnly?: boolean;
}

const VideoArea: React.FC<VideoAreaProps> = React.memo(({ className = '' }) => {
  const { gameState } = useGameState();
  
  // Use the gameState.timer directly
  const localTimer = gameState.countdownTimer;
  const [isPulsing, setIsPulsing] = useState(false);
  const [gameResult, setGameResult] = useState<GameCompleteResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Embedded stream URL - runs independently, never interrupted
  const STREAM_URL = 'https://screen-sharing-web.onrender.com/viewer.html';

  // Log component mount
  useEffect(() => {
    console.log('🎥 VideoArea: Mounted with embedded stream');
  }, []);

  // Handle pulse effect when less than 5 seconds
  useEffect(() => {
    if (localTimer <= 5 && localTimer > 0) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [localTimer]);

  // Listen for game complete celebration events
  useEffect(() => {
    const handleGameComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      if (detail?.winner && gameState.phase === 'complete') {
        const payoutAmount = detail.localWinAmount || 0;
        const totalBetAmount = detail.totalBetAmount || 0;
        const netProfit = payoutAmount - totalBetAmount;
        
        // Determine detailed result type
        let resultType: 'win' | 'loss' | 'no_bet' | 'refund' | 'mixed' = detail.result || 'no_bet';
        let isRefundOnly = false;
        
        // Check if this is a refund scenario (payout equals bet, no profit)
        if (totalBetAmount > 0 && payoutAmount === totalBetAmount) {
          resultType = 'refund';
          isRefundOnly = true;
        }
        // Check for mixed bets (bet on both sides)
        else if (detail.playerBets) {
          const { round1, round2 } = detail.playerBets;
          const hasAndarBets = (round1.andar + round2.andar) > 0;
          const hasBaharBets = (round1.bahar + round2.bahar) > 0;
          if (hasAndarBets && hasBaharBets) {
            resultType = 'mixed';
          }
        }
        
        setGameResult({
          winner: detail.winner,
          winningCard: detail.winningCard || gameState.winningCard,
          payoutAmount,
          totalBetAmount,
          result: resultType,
          round: detail.round || gameState.currentRound,
          playerBets: detail.playerBets,
          netProfit,
          isRefundOnly
        });
        setShowResult(true);
        
        // Auto-hide after appropriate duration
        const duration = resultType === 'no_bet' ? 2500 : 5000;
        setTimeout(() => {
          setShowResult(false);
          setTimeout(() => setGameResult(null), 500);
        }, duration);
      }
    };

    window.addEventListener('game-complete-celebration', handleGameComplete as EventListener);
    return () => window.removeEventListener('game-complete-celebration', handleGameComplete as EventListener);
  }, [gameState.phase, gameState.winningCard, gameState.currentRound]);

  // Hide result when phase changes away from complete
  useEffect(() => {
    if (gameState.phase !== 'complete') {
      setShowResult(false);
      setTimeout(() => setGameResult(null), 500);
    }
  }, [gameState.phase]);

  // Get timer color based on phase
  const getTimerColor = () => {
    switch (gameState.phase) {
      case 'betting':
        return localTimer <= 5 ? '#EF4444' : '#FFD100'; // Red when urgent, yellow normally
      case 'dealing':
        return '#10B981'; // Green for dealing
      case 'complete':
        return '#8B5CF6'; // Purple for complete
      default:
        return '#6B7280'; // Gray for idle
    }
  };

  // Calculate timer progress for circular display
  const getTimerProgress = () => {
    if (gameState.phase !== 'betting') return 0;
    const maxTime = 30; // 30 seconds for betting
    return Math.max(0, (maxTime - localTimer) / maxTime);
  };

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      {/* Embedded Video Stream - Runs independently in background, never interrupted */}
      <div className="absolute inset-0">
        <iframe
          src={STREAM_URL}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            top: '-80px',
            left: 0,
            width: '100%',
            height: 'calc(100% + 160px)',
            border: 'none',
            zIndex: 1,
            transform: 'scale(1.2)',
            transformOrigin: 'center center'
          }}
          title="Live Game Stream"
        />

        {/* Overlay Gradient for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" style={{ zIndex: 2 }} />
      </div>

      {/* Circular Timer Overlay - CENTERED - ONLY VISIBLE DURING BETTING */}
      {gameState.phase === 'betting' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className={`relative transition-all duration-300 ${
            gameState.phase === 'betting' && isPulsing ? 'animate-pulse scale-110' : 'scale-100'
          }`}>
            {/* Large Circular Timer */}
            <div className="relative w-36 h-36 md:w-40 md:h-40 flex items-center justify-center">
              <svg 
                className="transform -rotate-90 w-full h-full absolute inset-0" 
                viewBox="0 0 128 128" 
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Background circle - Dark grey with transparency */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(75, 85, 99, 0.8)"
                  strokeWidth="10"
                  fill="rgba(31, 41, 55, 0.9)"
                  className="transition-all duration-300"
                />
                {/* Progress circle - Yellow arc, only show during betting */}
                {gameState.phase === 'betting' && localTimer > 0 && (
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={getTimerColor()}
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - getTimerProgress())}`}
                    className="transition-all duration-1000 ease-linear"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(255, 209, 0, 0.5))' }}
                  />
                )}
              </svg>
              {/* Timer text and icon container */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                {/* Icon above number - Screen/Monitor icon */}
                <div className="mb-0.5 opacity-90">
                  <svg 
                    className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="2" y="4" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </div>
                {/* Timer number */}
                <div className="text-white font-bold text-5xl md:text-6xl tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                  {localTimer > 0 ? localTimer : '--'}
                </div>
                {/* Betting Time text */}
                <div className="text-gold text-sm md:text-base font-semibold mt-1.5 tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  Betting Time
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Result Overlay - ONLY VISIBLE DURING COMPLETE PHASE */}
      <AnimatePresence>
        {gameState.phase === 'complete' && showResult && gameResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            
            {/* Result Card */}
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative z-10 max-w-sm w-full mx-4"
            >
              {gameResult.result === 'win' || gameResult.result === 'refund' || gameResult.result === 'mixed' ? (
                // WIN / REFUND / MIXED - Celebration with detailed breakdown
                <div className={`rounded-2xl p-6 border-4 shadow-2xl ${
                  gameResult.result === 'refund' 
                    ? 'bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-blue-800/90 border-blue-400'
                    : gameResult.result === 'mixed'
                    ? (gameResult.netProfit && gameResult.netProfit > 0
                      ? 'bg-gradient-to-br from-green-600/90 via-green-700/90 to-green-800/90 border-green-400'
                      : 'bg-gradient-to-br from-orange-600/90 via-orange-700/90 to-orange-800/90 border-orange-400')
                    : 'bg-gradient-to-br from-yellow-600/90 via-yellow-700/90 to-yellow-800/90 border-yellow-400'
                }`}>
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-center mb-4"
                  >
                    <div className="text-6xl">
                      {gameResult.result === 'refund' ? '💰' : gameResult.result === 'mixed' ? '🎲' : '🏆'}
                    </div>
                  </motion.div>
                  
                  {/* Winner Text */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mb-4"
                  >
                    <div className="text-3xl font-black text-white mb-2">
                      {gameResult.winner === 'andar' 
                        ? 'ANDAR WON!' 
                        : (gameResult.round === 1 || gameResult.round === 2 ? 'BABA WON!' : 'BAHAR WON!')}
                    </div>
                    <div className="text-xl font-bold text-yellow-200">
                      {typeof gameResult.winningCard === 'string' 
                        ? gameResult.winningCard 
                        : gameResult.winningCard?.display || 'Winning Card'}
                    </div>
                    {/* Round Info */}
                    <div className="text-sm font-semibold text-white/80 mt-1">
                      Round {gameResult.round}
                    </div>
                  </motion.div>
                  
                  {/* Payout Details */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="bg-black/50 rounded-xl p-4 mb-2 border-2 border-white/30"
                  >
                    <div className="text-center">
                      {gameResult.result === 'refund' ? (
                        // REFUND ONLY (Bahar R1 win)
                        <>
                          <div className="text-lg font-bold text-blue-300 mb-1">Bet Refunded</div>
                          <div className="text-3xl font-black text-white">
                            ₹{gameResult.payoutAmount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-sm text-blue-200 mt-2">
                            {gameResult.round === 1 ? 'Bahar Round 1: 1:0 (Refund Only)' : 'Bet Returned'}
                          </div>
                        </>
                      ) : gameResult.result === 'mixed' ? (
                        // MIXED BETS (Bet on both sides)
                        <>
                          <div className="text-lg font-bold text-white/90 mb-1">
                            {gameResult.netProfit && gameResult.netProfit > 0 ? 'Net Profit' : 'Net Loss'}
                          </div>
                          <div className={`text-4xl font-black ${
                            gameResult.netProfit && gameResult.netProfit > 0 ? 'text-green-300' : 'text-orange-300'
                          }`}>
                            {gameResult.netProfit && gameResult.netProfit > 0 ? '+' : ''}
                            ₹{Math.abs(gameResult.netProfit || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-sm text-white/70 mt-2">
                            Payout: ₹{gameResult.payoutAmount.toLocaleString('en-IN')} | Bet: ₹{gameResult.totalBetAmount.toLocaleString('en-IN')}
                          </div>
                        </>
                      ) : (
                        // PURE WIN
                        <>
                          <div className="text-lg font-bold text-yellow-300 mb-1">You Won</div>
                          <div className="text-4xl font-black text-white">
                            ₹{gameResult.payoutAmount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-sm text-yellow-200 mt-2">
                            Net Profit: +₹{(gameResult.netProfit || 0).toLocaleString('en-IN')}
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                  
                  {/* Confetti Effect - Only for pure wins */}
                  {gameResult.result === 'win' && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{
                            x: '50%',
                            y: '50%',
                            scale: 0,
                            rotate: 0
                          }}
                          animate={{
                            x: Math.random() * 100 + '%',
                            y: Math.random() * 100 + '%',
                            scale: [0, 1, 0],
                            rotate: Math.random() * 360
                          }}
                          transition={{
                            duration: 2 + Math.random(),
                            delay: Math.random() * 0.5,
                            repeat: Infinity
                          }}
                          className="absolute w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: ['#ffd700', '#ff6b6b', '#4ecdc4'][Math.floor(Math.random() * 3)]
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : gameResult.result === 'loss' ? (
                // LOSS - Better luck next time
                <div className="bg-gradient-to-br from-gray-800/90 via-gray-700/90 to-gray-800/90 rounded-2xl p-6 border-4 border-gray-500 shadow-2xl">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="text-center"
                  >
                    <div className="text-5xl mb-4">😔</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {gameResult.winner === 'andar' 
                        ? 'ANDAR WON' 
                        : (gameResult.round === 1 || gameResult.round === 2 ? 'BABA WON' : 'BAHAR WON')}
                    </div>
                    <div className="text-xl font-semibold text-gray-300 mb-3">
                      Better Luck Next Round!
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      {typeof gameResult.winningCard === 'string' 
                        ? gameResult.winningCard 
                        : gameResult.winningCard?.display || 'Winning Card'}
                    </div>
                    {/* Loss Amount */}
                    <div className="bg-black/50 rounded-lg p-3 border border-red-500/30">
                      <div className="text-sm text-red-400 mb-1">Lost</div>
                      <div className="text-2xl font-bold text-red-300">
                        -₹{gameResult.totalBetAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </motion.div>
                </div>
              ) : (
                // NO BET - Just show winner
                <div className="bg-gradient-to-br from-purple-800/90 via-purple-700/90 to-purple-800/90 rounded-2xl p-6 border-4 border-purple-400 shadow-2xl">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring" }}
                    className="text-center"
                  >
                    <div className="text-4xl mb-3">🎴</div>
                    <div className="text-3xl font-black text-white mb-2">
                      {gameResult.winner === 'andar' 
                        ? 'ANDAR WON!' 
                        : (gameResult.round === 1 || gameResult.round === 2 ? 'BABA WON!' : 'BAHAR WON!')}
                    </div>
                    <div className="text-lg text-purple-200">
                      {typeof gameResult.winningCard === 'string' 
                        ? gameResult.winningCard 
                        : gameResult.winningCard?.display || 'Winning Card'}
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean video surface during dealing: no overlays */}

    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if isScreenSharing changes or className changes
  return (
    prevProps.isScreenSharing === nextProps.isScreenSharing &&
    prevProps.className === nextProps.className
  );
});

VideoArea.displayName = 'VideoArea';

export default VideoArea;

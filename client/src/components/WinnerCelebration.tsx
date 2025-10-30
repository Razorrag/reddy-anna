import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WinnerCelebrationProps {
  winner: 'andar' | 'bahar' | null;
  winningCard: any;
  payoutMessage: string;
  round: number;
  onComplete: () => void;
}

const WinnerCelebration: React.FC<WinnerCelebrationProps> = ({
  winner,
  winningCard,
  payoutMessage,
  round,
  onComplete
}) => {
  const [countdown, setCountdown] = useState(5);
  const [showConfetti, setShowConfetti] = useState(true);
  const [localWinAmount, setLocalWinAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!winner) return;

    // Countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Stop confetti after 3 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(confettiTimer);
    };
  }, [winner, onComplete]);

  // Listen for celebration event to capture per-user win amount
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.localWinAmount != null) {
        setLocalWinAmount(Number(e.detail.localWinAmount) || 0);
      }
    };
    window.addEventListener('game-complete-celebration', handler as EventListener);
    return () => window.removeEventListener('game-complete-celebration', handler as EventListener);
  }, []);

  if (!winner) return null;

  const winnerColor = winner === 'andar' ? '#10b981' : '#3b82f6';
  const winnerGradient = winner === 'andar' 
    ? 'from-green-500 to-emerald-600' 
    : 'from-blue-500 to-cyan-600';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  scale: 0
                }}
                animate={{
                  y: window.innerHeight + 20,
                  rotate: Math.random() * 720,
                  scale: [0, 1, 1, 0.5]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  ease: "easeOut",
                  delay: Math.random() * 0.5
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        )}

        {/* Winner Card */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8, bounce: 0.5 }}
          className="relative max-w-2xl w-full mx-4"
        >
          {/* Glow Effect */}
          <div 
            className="absolute inset-0 blur-3xl opacity-50 rounded-3xl"
            style={{ backgroundColor: winnerColor }}
          />

          {/* Main Card */}
          <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 border-4 shadow-2xl"
               style={{ borderColor: winnerColor }}>
            
            {/* Trophy Icon */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-6"
            >
              <div className="text-8xl">🏆</div>
            </motion.div>

            {/* Winner Announcement */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mb-6"
            >
              <h1 className={`text-6xl font-black mb-4 bg-gradient-to-r ${winnerGradient} bg-clip-text text-transparent`}>
                {winner === 'andar' 
                  ? 'ANDAR WON!' 
                  : round === 1 
                  ? 'BABA WON!' 
                  : round === 2 
                  ? 'SHOOT WON!' 
                  : 'BAHAR WON!'}
              </h1>
              <div className="text-4xl font-bold text-white mb-2">
                {typeof winningCard === 'string' ? winningCard : winningCard?.display}
              </div>
              <div className="text-xl text-gray-400">
                Round {round}
              </div>
            </motion.div>

            {/* Payout Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-black/40 rounded-xl p-6 mb-6 border border-gray-700"
            >
            {localWinAmount != null ? (
              <div className="text-center">
                {localWinAmount > 0 ? (
                  <div>
                    <div className="text-3xl font-extrabold text-gold mb-1">You won</div>
                    <div className="text-5xl font-black text-white">₹{localWinAmount.toLocaleString('en-IN')}</div>
                  </div>
                ) : (
                  <div className="text-2xl font-semibold text-gray-300">No winnings this round</div>
                )}
              </div>
            ) : (
              <div className="text-center text-2xl font-semibold text-yellow-400">
                {payoutMessage}
              </div>
            )}
            </motion.div>

            {/* Countdown */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9 }}
              className="text-center"
            >
              <div className="text-gray-400 text-lg mb-2">
                New game starting in
              </div>
              <motion.div
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-6xl font-black text-white"
              >
                {countdown}
              </motion.div>
            </motion.div>

            {/* Sparkle Effects */}
            <div className="absolute top-4 right-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl"
              >
                ✨
              </motion.div>
            </div>
            <div className="absolute bottom-4 left-4">
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl"
              >
                ✨
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Fireworks Effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`firework-${i}`}
                initial={{
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                  scale: 0
                }}
                animate={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  scale: [0, 2, 0]
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.2,
                  ease: "easeOut"
                }}
                className="absolute w-4 h-4 rounded-full"
                style={{ backgroundColor: winnerColor }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default WinnerCelebration;

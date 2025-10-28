/**
 * NoWinnerTransition - Shows "No Winner" message between rounds
 * 
 * Displays when a round completes without a winner, before transitioning
 * to the next round. Shows for 2 seconds with animation.
 */

import React, { useEffect, useState } from 'react';

interface NoWinnerTransitionProps {
  show: boolean;
  currentRound: number;
  nextRound: number;
  onComplete?: () => void;
}

const NoWinnerTransition: React.FC<NoWinnerTransitionProps> = ({ 
  show, 
  currentRound,
  nextRound,
  onComplete 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 300); // Wait for fade out
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className={`text-center transform transition-all duration-500 ${
        isAnimating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      }`}>
        {/* No Winner Icon */}
        <div className="mb-6 animate-bounce">
          <div className="text-9xl">🎴</div>
        </div>

        {/* No Winner Message */}
        <div className="mb-6">
          <div className="text-5xl font-bold text-yellow-400 mb-4 animate-pulse">
            NO WINNER
          </div>
          <div className="text-2xl text-gray-300 mb-2">
            Round {currentRound} Complete
          </div>
          <div className="text-lg text-gray-400">
            No matching card found
          </div>
        </div>

        {/* Next Round Info */}
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg border-2 border-yellow-400/50">
          <div className="text-xl text-yellow-400 mb-2">
            ⏳ Starting Round {nextRound}
          </div>
          <div className="text-sm text-gray-300">
            {nextRound === 2 && 'Place additional bets now!'}
            {nextRound === 3 && 'Final draw - No more betting!'}
          </div>
        </div>

        {/* Countdown Dots */}
        <div className="flex justify-center gap-3 mt-6">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
};

export default NoWinnerTransition;

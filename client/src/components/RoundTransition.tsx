/**
 * RoundTransition - Animated round transition overlay
 * 
 * Shows a full-screen animated overlay when transitioning between rounds
 * with proper visual feedback and animations.
 */

import React, { useEffect, useState } from 'react';

interface RoundTransitionProps {
  show: boolean;
  round: number;
  message?: string;
  onComplete?: () => void;
}

const RoundTransition: React.FC<RoundTransitionProps> = ({ 
  show, 
  round, 
  message,
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
        isAnimating ? 'scale-100 rotate-0' : 'scale-50 rotate-12'
      }`}>
        {/* Round Number */}
        <div className="mb-6">
          <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-gold to-yellow-600 animate-pulse">
            ROUND {round}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="text-2xl text-white font-semibold mb-4 animate-fade-in">
            {message}
          </div>
        )}

        {/* Decorative elements */}
        <div className="flex justify-center gap-4 mt-6">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Round-specific icons */}
        <div className="mt-8 text-6xl animate-bounce">
          {round === 1 && '🎴'}
          {round === 2 && '🎯'}
          {round === 3 && '⚡'}
        </div>
      </div>
    </div>
  );
};

export default RoundTransition;

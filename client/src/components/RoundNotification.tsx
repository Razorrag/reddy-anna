/**
 * RoundNotification - Subtle non-blocking round change notification
 * 
 * Shows a toast-style notification for round changes without blocking the UI
 * Allows users to continue betting while being informed of round changes
 */

import React, { useEffect, useState } from 'react';

interface RoundNotificationProps {
  show: boolean;
  round: number;
  message?: string;
  onComplete?: () => void;
}

const RoundNotification: React.FC<RoundNotificationProps> = ({ 
  show, 
  round, 
  message,
  onComplete 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Don't show notification for round 3
    if (show && round !== 3) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 300); // Wait for fade out
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, round, onComplete]);

  if (!isVisible || round === 3) return null;

  return (
    <div className="fixed top-20 right-4 z-30 max-w-sm">
      <div className={`
        bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg shadow-lg 
        transform transition-all duration-300 ease-in-out
        ${isAnimating ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
      `}>
        <div className="p-4">
          {/* Round Number Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 rounded-full px-3 py-1">
              <span className="text-sm font-bold">ROUND {round}</span>
            </div>
            <div className="text-2xl">
              {round === 1 && '🎴'}
              {round === 2 && '🎯'}
              {round === 3 && '⚡'}
            </div>
          </div>
          
          {/* Message */}
          {message && (
            <div className="text-sm font-medium">
              {message}
            </div>
          )}
          
          {/* Round-specific info */}
          <div className="mt-2 text-xs opacity-90">
            {round === 1 && "Place your initial bets!"}
            {round === 2 && "Place additional bets!"}
            {round === 3 && "Final draw - No more betting!"}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="h-1 bg-white/30 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-white rounded-b-lg transition-all duration-3000 ease-linear"
            style={{ 
              width: isAnimating ? '100%' : '0%',
              transitionDuration: '3000ms'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default RoundNotification;
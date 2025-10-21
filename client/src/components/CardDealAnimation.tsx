/**
 * CardDealAnimation - Animated card dealing effect
 * 
 * Shows a card flying from the deck to either Andar or Bahar position
 * with smooth animation and visual effects.
 */

import React, { useEffect, useState } from 'react';
import type { Card } from '../types/game';

interface CardDealAnimationProps {
  card: Card | null;
  targetSide: 'andar' | 'bahar' | null;
  onComplete?: () => void;
}

const CardDealAnimation: React.FC<CardDealAnimationProps> = ({ 
  card, 
  targetSide,
  onComplete 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (card && targetSide) {
      setIsAnimating(true);
      setShowCard(true);
      
      // Complete animation after 800ms
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setShowCard(false);
        onComplete?.();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [card, targetSide, onComplete]);

  if (!showCard || !card) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Card element */}
      <div 
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out ${
          isAnimating 
            ? targetSide === 'andar' 
              ? 'translate-x-32 translate-y-16 rotate-12' 
              : '-translate-x-32 translate-y-16 -rotate-12'
            : 'translate-x-0 translate-y-0 rotate-0'
        }`}
      >
        <div className={`w-24 h-36 rounded-lg border-4 flex items-center justify-center text-4xl font-bold shadow-2xl transform transition-all duration-700 ${
          card.color === 'red' 
            ? 'bg-white border-red-500 text-red-600' 
            : 'bg-white border-black text-black'
        } ${isAnimating ? 'scale-150 rotate-[360deg]' : 'scale-100'}`}>
          {card.display}
        </div>
        
        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-lg blur-xl transition-opacity duration-700 ${
          targetSide === 'andar' ? 'bg-red-500/50' : 'bg-blue-500/50'
        } ${isAnimating ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* Target indicator */}
      {isAnimating && (
        <div className={`absolute top-2/3 ${
          targetSide === 'andar' ? 'right-1/4' : 'left-1/4'
        } transform -translate-x-1/2 -translate-y-1/2`}>
          <div className={`text-6xl font-bold animate-pulse ${
            targetSide === 'andar' ? 'text-red-500' : 'text-blue-500'
          }`}>
            {targetSide === 'andar' ? '→ ANDAR' : 'BAHAR ←'}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardDealAnimation;

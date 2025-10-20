import React from 'react';
import { PlayingCard } from './PlayingCard';
import type { Card, BetSide } from '@/types/game';

interface CardGridProps {
  andarCards: Card[];
  baharCards: Card[];
  winningSide?: BetSide | null;
}

const CardGrid: React.FC<CardGridProps> = ({ andarCards, baharCards, winningSide }) => {
  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Andar Side */}
      <div className="text-center">
        <h3 className={`text-xl font-bold mb-4 ${winningSide === 'andar' ? 'text-gold animate-pulse' : 'text-gray-400'}`}>
          🎴 ANDAR {winningSide === 'andar' && '🏆'}
        </h3>
        <div className="flex flex-wrap gap-2 justify-center min-h-[100px] p-4 bg-black/30 rounded-lg border-2 border-dashed border-gray-600">
          {andarCards.length > 0 ? (
            andarCards.map((card, index) => (
              <div key={`andar-${index}`} className="transform hover:scale-105 transition-transform">
                <PlayingCard 
                  card={card}
                  size="md"
                  isWinning={winningSide === 'andar' && index === andarCards.length - 1}
                />
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-sm">No cards dealt yet</div>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-400">
          {andarCards.length} card{andarCards.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Bahar Side */}
      <div className="text-center">
        <h3 className={`text-xl font-bold mb-4 ${winningSide === 'bahar' ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`}>
          🎴 BAHAR {winningSide === 'bahar' && '🏆'}
        </h3>
        <div className="flex flex-wrap gap-2 justify-center min-h-[100px] p-4 bg-black/30 rounded-lg border-2 border-dashed border-gray-600">
          {baharCards.length > 0 ? (
            baharCards.map((card, index) => (
              <div key={`bahar-${index}`} className="transform hover:scale-105 transition-transform">
                <PlayingCard 
                  card={card}
                  size="md"
                  isWinning={winningSide === 'bahar' && index === baharCards.length - 1}
                />
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-sm">No cards dealt yet</div>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-400">
          {baharCards.length} card{baharCards.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default CardGrid;

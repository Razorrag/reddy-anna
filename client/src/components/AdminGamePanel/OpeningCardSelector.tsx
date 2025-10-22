import React, { useState, useEffect } from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import type { Card } from '@/types/game';

const OpeningCardSelector: React.FC = () => {
  const { gameState, setSelectedOpeningCard, setPhase, setCurrentRound, setCountdown } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  
  const [selectedCard, setSelectedCard] = useState<Card | null>(gameState.selectedOpeningCard);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [timerDuration, setTimerDuration] = useState(30);

  // Sync local state with game state (important for reset functionality)
  useEffect(() => {
    if (gameState.selectedOpeningCard === null && selectedCard !== null) {
      // Game was reset, clear local selection
      setSelectedCard(null);
      setShowConfirmModal(false);
    }
  }, [gameState.selectedOpeningCard, selectedCard]);

  // Generate all 52 cards
  const suits = [
    { symbol: '♠', name: 'spades', color: 'black' },
    { symbol: '♥', name: 'hearts', color: 'red' },
    { symbol: '♦', name: 'diamonds', color: 'red' },
    { symbol: '♣', name: 'clubs', color: 'black' }
  ];
  
  const ranks = [
    { display: 'A', value: 1 },
    { display: '2', value: 2 },
    { display: '3', value: 3 },
    { display: '4', value: 4 },
    { display: '5', value: 5 },
    { display: '6', value: 6 },
    { display: '7', value: 7 },
    { display: '8', value: 8 },
    { display: '9', value: 9 },
    { display: '10', value: 10 },
    { display: 'J', value: 11 },
    { display: 'Q', value: 12 },
    { display: 'K', value: 13 }
  ];

  const allCards: Card[] = suits.flatMap(suit =>
    ranks.map(rank => ({
      id: `${rank.display}-${suit.name}`,
      suit: suit.name as 'spades' | 'hearts' | 'diamonds' | 'clubs',
      rank: rank.display,
      value: rank.value,
      color: suit.color as 'red' | 'black',
      display: `${rank.display}${suit.symbol}`
    }))
  );

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card);
    setSelectedOpeningCard(card);
    showNotification(`Selected: ${card.display}`, 'info');
  };

  const handleStartGame = () => {
    if (!selectedCard) return;
    
    // Update local state
    setPhase('betting');
    setCurrentRound(1);
    setCountdown(timerDuration);
    
    // Broadcast to all players
    sendWebSocketMessage({
      type: 'game_start',
      data: {
        gameId: gameState.gameId,
        openingCard: selectedCard.display,
        round: 1,
        timer: timerDuration
      }
    });
    
    setShowConfirmModal(false);
    showNotification(`🎲 Round 1 started! Opening card: ${selectedCard.display}`, 'success');
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-lg p-5 border-2 border-gold/30">
      <h2 className="text-xl font-bold text-gold mb-3">
        🎴 Select Opening Card
      </h2>
      
      {/* Selected Card Display */}
      {selectedCard && (
        <div className="bg-gradient-to-r from-gold/20 to-yellow-600/20 border-2 border-gold rounded-lg p-4 mb-3 text-center">
          <div className="text-sm text-gray-400 mb-1">Selected Opening Card</div>
          <div className={`text-5xl font-bold ${selectedCard.color === 'red' ? 'text-red-500' : 'text-white'}`}>
            {selectedCard.display}
          </div>
        </div>
      )}
      
      {/* Card Grid */}
      <div className="bg-black/30 rounded-lg p-3">
        {/* Cards organized by suit - 13 cards per row */}
        {suits.map(suit => (
          <div key={suit.name} className="mb-2 last:mb-0">
            <div className="text-sm font-semibold mb-1 flex items-center gap-2">
              <span className={`text-lg ${suit.color === 'red' ? 'text-red-500' : 'text-yellow-400'}`}>
                {suit.symbol}
              </span>
              <span className="text-gray-400 uppercase text-xs">{suit.name}</span>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {allCards
                .filter(card => card.suit === suit.name)
                .map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleCardSelect(card)}
                    className={`
                      w-[calc(100%/13-0.25rem)] min-w-[45px] h-[55px] rounded text-sm font-bold transition-all
                      ${selectedCard?.id === card.id
                        ? 'bg-gradient-to-br from-gold to-yellow-500 text-black border-2 border-white scale-105 relative z-10'
                        : 'bg-black hover:bg-gray-900 border-2 border-gold/50 hover:border-gold'
                      }
                      ${selectedCard?.id === card.id 
                        ? '' 
                        : (card.color === 'red' ? 'text-red-400' : 'text-yellow-400')
                      }
                    `}
                    title={`${card.rank} of ${card.suit}`}
                  >
                    {card.display}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setSelectedCard(null)}
          disabled={!selectedCard}
          className="flex-1 px-5 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all"
        >
          🗑️ Clear Selection
        </button>
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={!selectedCard}
          className="flex-[2] px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 text-white rounded-lg text-lg font-bold transition-all"
        >
          ✅ Start Round 1
        </button>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmModal && selectedCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-md w-full border-2 border-gold shadow-2xl">
            <h3 className="text-2xl font-bold text-gold mb-6 text-center">
              🎲 Start Game Confirmation
            </h3>
            
            <div className="bg-black/40 rounded-xl p-6 mb-6 text-center">
              <div className="text-gray-400 text-sm mb-2">Opening Card</div>
              <div className={`text-6xl font-bold mb-2 ${selectedCard.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                {selectedCard.display}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">
                Round 1 Betting Timer (seconds)
              </label>
              <input
                type="number"
                value={timerDuration}
                onChange={(e) => setTimerDuration(Math.max(10, Math.min(300, parseInt(e.target.value) || 30)))}
                min="10"
                max="300"
                className="w-full px-4 py-3 bg-black/40 border border-gold/30 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-gold"
              />
              <div className="text-gray-500 text-xs mt-1 text-center">Range: 10-300 seconds</div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleStartGame}
                className="flex-[2] px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition-all shadow-xl"
              >
                🚀 Start Game!
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 215, 0, 0.7);
        }
      `}</style>
    </div>
  );
};

export default OpeningCardSelector;

import React, { useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import type { Card, GamePhase, GameRound } from '@/types/game';

interface CardDealingPanelProps {
  round: GameRound;
  phase: GamePhase;
  openingCard: Card | null;
  andarCards: Card[];
  baharCards: Card[];
}

const CardDealingPanel: React.FC<CardDealingPanelProps> = ({
  round,
  phase,
  andarCards,
  baharCards
}) => {
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();
  
  const [selectedBaharCard, setSelectedBaharCard] = useState<Card | null>(null);
  const [selectedAndarCard, setSelectedAndarCard] = useState<Card | null>(null);
  const [dealingInProgress, setDealingInProgress] = useState(false);
  const [previousRound, setPreviousRound] = useState(round);

  // Clear selections when round changes
  React.useEffect(() => {
    if (round !== previousRound) {
      console.log(`🔄 Round changed from ${previousRound} to ${round} - clearing card selections`);
      setSelectedBaharCard(null);
      setSelectedAndarCard(null);
      setDealingInProgress(false);
      setPreviousRound(round);
    }
  }, [round, previousRound]);

  // Generate card deck
  const suits = [
    { symbol: '♠', name: 'spades', color: 'black' },
    { symbol: '♥', name: 'hearts', color: 'red' },
    { symbol: '♦', name: 'diamonds', color: 'red' },
    { symbol: '♣', name: 'clubs', color: 'black' }
  ];
  
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const allCards: Card[] = suits.flatMap(suit =>
    ranks.map((rank, index) => ({
      id: `${rank}-${suit.name}`,
      suit: suit.name as 'spades' | 'hearts' | 'diamonds' | 'clubs',
      rank,
      value: index + 1,
      color: suit.color as 'red' | 'black',
      display: `${rank}${suit.symbol}`
    }))
  );

  const handleQuickCardSelect = (card: Card) => {
    if (dealingInProgress) return;
    
    if (!selectedBaharCard) {
      setSelectedBaharCard(card);
      showNotification(`Bahar: ${card.display}`, 'info');
    } else if (!selectedAndarCard) {
      setSelectedAndarCard(card);
      showNotification(`Andar: ${card.display}`, 'info');
    } else {
      // Reset and start over
      setSelectedBaharCard(card);
      setSelectedAndarCard(null);
      showNotification(`Bahar: ${card.display}`, 'info');
    }
  };

  const handleSaveCards = async () => {
    if (!selectedBaharCard || !selectedAndarCard) {
      showNotification('Please select both Bahar and Andar cards!', 'error');
      return;
    }

    setDealingInProgress(true);

    try {
      // Send save_cards message to backend
      sendWebSocketMessage({
        type: 'save_cards',
        data: {
          baharCard: selectedBaharCard,
          andarCard: selectedAndarCard
        }
      });
      
      showNotification('✅ Cards saved! Will reveal when timer expires.', 'success');
      
      // Keep selections visible but disable further changes
      setDealingInProgress(false);
      
    } catch (error) {
      showNotification('Failed to save cards', 'error');
      setDealingInProgress(false);
    }
  };

  const handleRevealCards = async () => {
    if (!selectedBaharCard || !selectedAndarCard) {
      showNotification('Please select both Bahar and Andar cards!', 'error');
      return;
    }

    setDealingInProgress(true);

    try {
      // Send reveal_cards message to backend
      sendWebSocketMessage({
        type: 'reveal_cards',
        data: {
          baharCard: selectedBaharCard,
          andarCard: selectedAndarCard
        }
      });
      
      showNotification('🎬 Revealing cards to players...', 'success');
      
      // Clear selections after reveal
      setTimeout(() => {
        setSelectedBaharCard(null);
        setSelectedAndarCard(null);
        setDealingInProgress(false);
      }, 1000);
      
    } catch (error) {
      showNotification('Failed to reveal cards', 'error');
      setDealingInProgress(false);
    }
  };

  const handleDealSingleCard = async (card: Card, side: 'andar' | 'bahar') => {
    if (round !== 3) {
      showNotification('Single card dealing only in Round 3!', 'error');
      return;
    }

    try {
      sendWebSocketMessage({
        type: 'deal_single_card',
        data: {
          card,
          side
        }
      });
      
      showNotification(`Dealt ${card.display} to ${side}`, 'info');
    } catch (error) {
      showNotification('Failed to deal card', 'error');
    }
  };

  const handleUndo = () => {
    if (selectedAndarCard) {
      setSelectedAndarCard(null);
      showNotification('Andar selection cleared', 'info');
    } else if (selectedBaharCard) {
      setSelectedBaharCard(null);
      showNotification('Bahar selection cleared', 'info');
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-lg p-5 border-2 border-gold/30">
      {/* Dealing Instructions */}
      <div className="bg-blue-900/30 border-2 border-blue-500/50 rounded-lg p-3 mb-3">
        <div className="text-sm text-gray-300 text-center font-medium">
          1️⃣ Select BAHAR card → 2️⃣ Select ANDAR card → 3️⃣ Click Deal
        </div>
      </div>
      
      {/* Current Selection */}
      {(selectedBaharCard || selectedAndarCard) && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-blue-900/30 rounded-lg p-3 border-2 border-blue-500/50 text-center">
            <div className="text-sm text-gray-400 mb-1">Bahar</div>
            <div className={`text-3xl font-bold ${selectedBaharCard ? (selectedBaharCard.color === 'red' ? 'text-red-500' : 'text-white') : 'text-gray-600'}`}>
              {selectedBaharCard?.display || '--'}
            </div>
          </div>
          <div className="bg-red-900/30 rounded-lg p-3 border-2 border-red-500/50 text-center">
            <div className="text-sm text-gray-400 mb-1">Andar</div>
            <div className={`text-3xl font-bold ${selectedAndarCard ? (selectedAndarCard.color === 'red' ? 'text-red-500' : 'text-white') : 'text-gray-600'}`}>
              {selectedAndarCard?.display || '--'}
            </div>
          </div>
        </div>
      )}
      
      {/* Card Selector Grid */}
      <div className="bg-black/30 rounded-lg p-3 mb-3">
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
                .map(card => {
                  const isSelected = selectedBaharCard?.id === card.id || selectedAndarCard?.id === card.id;
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleQuickCardSelect(card)}
                      disabled={dealingInProgress}
                      className={`
                        w-[calc(100%/13-0.25rem)] min-w-[45px] h-[55px] rounded text-sm font-bold transition-all
                        ${isSelected
                          ? 'bg-gradient-to-br from-gold to-yellow-500 text-black border-2 border-white scale-105 relative z-10'
                          : 'bg-black hover:bg-gray-900 border-2 border-gold/50 hover:border-gold'
                        }
                        ${isSelected 
                          ? '' 
                          : (card.color === 'red' ? 'text-red-400' : 'text-yellow-400')
                        }
                        ${dealingInProgress ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      title={`${card.rank} of ${card.suit}`}
                    >
                      {card.display}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Action Buttons - Phase Aware */}
      <div className="flex gap-3">
        <button
          onClick={handleUndo}
          disabled={!selectedBaharCard && !selectedAndarCard || dealingInProgress}
          className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-semibold"
        >
          ↩️ Clear
        </button>
        
        {phase === 'betting' && round < 3 && (
          <button
            onClick={handleSaveCards}
            disabled={!selectedBaharCard || !selectedAndarCard || dealingInProgress}
            className="flex-[2] px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg text-base font-bold"
          >
            {dealingInProgress ? '⏳ Saving...' : '💾 Save & Wait for Timer'}
          </button>
        )}
        
        {phase === 'dealing' && round < 3 && (
          <button
            onClick={handleRevealCards}
            disabled={!selectedBaharCard || !selectedAndarCard || dealingInProgress}
            className="flex-[2] px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg text-base font-bold"
          >
            {dealingInProgress ? '⏳ Revealing...' : '🎬 Show Cards to Players'}
          </button>
        )}
        
        {round === 3 && (
          <div className="flex-[2] text-center text-sm text-gray-400">
            Click cards below to deal one at a time (alternating Bahar → Andar)
          </div>
        )}
      </div>
      
      {/* Dealt Cards Display */}
      {(andarCards.length > 0 || baharCards.length > 0) && (
        <div className="mt-6 bg-black/30 rounded-xl p-4">
          <div className="text-sm font-semibold text-gray-400 mb-3">Recently Dealt Cards</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-blue-400 mb-2">Bahar ({baharCards.length})</div>
              <div className="flex flex-wrap gap-2">
                {baharCards.slice(-5).map((card, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-1 bg-white rounded text-sm font-bold ${
                      card.color === 'red' ? 'text-red-600' : 'text-black'
                    }`}
                  >
                    {card.display}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-red-400 mb-2">Andar ({andarCards.length})</div>
              <div className="flex flex-wrap gap-2">
                {andarCards.slice(-5).map((card, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-1 bg-white rounded text-sm font-bold ${
                      card.color === 'red' ? 'text-red-600' : 'text-black'
                    }`}
                  >
                    {card.display}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.5);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default CardDealingPanel;

import React, { useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useGameState } from '../../contexts/GameStateContext';
import type { Card, GamePhase, GameRound } from '@/types/game';

interface CardDealingPanelProps {
  round: GameRound;
  phase: GamePhase;
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
  const { gameState } = useGameState();
  
  const [selectedBaharCard, setSelectedBaharCard] = useState<Card | null>(null);
  const [selectedAndarCard, setSelectedAndarCard] = useState<Card | null>(null);
  const [dealingInProgress, setDealingInProgress] = useState(false);
  const [previousRound, setPreviousRound] = useState(round);
  
  // Round 3 specific state - tracks which side gets next card
  const [round3NextSide, setRound3NextSide] = useState<'bahar' | 'andar'>('bahar');

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

  const handleQuickCardSelect = async (card: Card) => {
    // CRITICAL: Only allow card selection when betting phase is complete
    if (phase === 'betting') {
      showNotification('⏳ Wait for betting timer to complete!', 'warning');
      return;
    }
    
    if (dealingInProgress) return;
    
    // Round 3: Immediate card drop (no confirmation needed)
    if (round === 3) {
      setDealingInProgress(true);
      
      try {
        // Send card immediately to all players
        sendWebSocketMessage({
          type: 'deal_single_card',
          data: {
            card,
            side: round3NextSide
          }
        });
        
        showNotification(`🎴 ${card.display} → ${round3NextSide.toUpperCase()}`, 'success');
        
        // Alternate sides for next card
        setRound3NextSide(round3NextSide === 'bahar' ? 'andar' : 'bahar');
        
        setTimeout(() => {
          setDealingInProgress(false);
        }, 500);
      } catch (error) {
        showNotification('Failed to deal card', 'error');
        setDealingInProgress(false);
      }
      return;
    }
    
    // Rounds 1 & 2: Pair selection (only in dealing phase)
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

  const handleDealCards = async () => {
    if (!selectedBaharCard || !selectedAndarCard) {
      showNotification('Please select both Bahar and Andar cards!', 'error');
      return;
    }

    setDealingInProgress(true);

    try {
      // Deal Bahar card first
      sendWebSocketMessage({
        type: 'deal_card',
        data: {
          card: selectedBaharCard,
          side: 'bahar'
        }
      });
      
      // Wait 800ms then deal Andar card
      setTimeout(() => {
        sendWebSocketMessage({
          type: 'deal_card',
          data: {
            card: selectedAndarCard,
            side: 'andar'
          }
        });
      }, 800);
      
      showNotification('🎬 Dealing cards to players...', 'success');
      
      // Clear selections after dealing
      setTimeout(() => {
        setSelectedBaharCard(null);
        setSelectedAndarCard(null);
        setDealingInProgress(false);
      }, 1500);
      
    } catch (error) {
      showNotification('Failed to deal cards', 'error');
      setDealingInProgress(false);
    }
  };

  // REMOVED: handleDealSingleCard and handleShowRound3Card
  // Round 3 cards now drop immediately when selected (no confirmation needed)

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
          {phase === 'betting' ? (
            <span className="text-yellow-400">⏳ Betting in progress - Cards locked until timer ends</span>
          ) : round === 3 ? (
            <span>🔥 Round 3: Click card → Drops immediately to {round3NextSide === 'bahar' ? 'BAHAR' : 'ANDAR'} → Auto-alternates</span>
          ) : (
            <span>1️⃣ Select BAHAR card → 2️⃣ Select ANDAR card → 3️⃣ Click Deal</span>
          )}
        </div>
      </div>
      
      {/* Current Selection (Rounds 1 & 2) */}
      {round < 3 && (selectedBaharCard || selectedAndarCard) && (
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
                  // Round 3: No selection highlight (cards drop immediately)
                  // Rounds 1 & 2: Highlight selected cards
                  const isSelected = round < 3 && (selectedBaharCard?.id === card.id || selectedAndarCard?.id === card.id);
                  const isUsed = gameState.usedCards.some(usedCard => usedCard.id === card.id);
                  const isDisabled = dealingInProgress || isUsed || phase === 'betting';
                  
                  return (
                    <button
                      key={card.id}
                      onClick={() => !isUsed && handleQuickCardSelect(card)}
                      disabled={isDisabled}
                      className={`
                        w-[calc(100%/13-0.25rem)] min-w-[45px] h-[55px] rounded text-sm font-bold transition-all duration-300
                        ${isSelected
                          ? 'bg-gradient-to-br from-gold to-yellow-500 text-black border-2 border-white scale-105 relative z-10 shadow-lg shadow-gold/50 animate-pulse-subtle'
                          : isUsed
                          ? 'bg-gray-800/50 border-2 border-gray-600 opacity-40 cursor-not-allowed line-through'
                          : 'bg-black hover:bg-gray-900 border-2 border-gold/50 hover:border-gold hover:scale-105'
                        }
                        ${isSelected 
                          ? '' 
                          : isUsed
                          ? 'text-gray-600'
                          : (card.color === 'red' ? 'text-red-400' : 'text-yellow-400')
                        }
                        ${dealingInProgress && !isUsed ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      title={
                        isUsed 
                          ? '❌ Card already used in this game' 
                          : dealingInProgress 
                          ? 'Dealing in progress' 
                          : `${card.rank} of ${card.suit}`
                      }
                    >
                      {isUsed ? (
                        <span className="relative">
                          {card.display}
                          <span className="absolute inset-0 flex items-center justify-center text-red-500 text-xs">✗</span>
                        </span>
                      ) : (
                        card.display
                      )}
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
        
        {/* Only show Deal button when phase is 'dealing' and rounds 1 & 2 */}
        {phase === 'dealing' && round < 3 && (
          <button
            onClick={handleDealCards}
            disabled={!selectedBaharCard || !selectedAndarCard || dealingInProgress}
            className="flex-[2] px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg text-base font-bold shadow-lg"
          >
            {dealingInProgress ? '⏳ Dealing...' : '🎬 Deal Cards to Players'}
          </button>
        )}
        
        {/* Round 3: No button needed - cards drop immediately when selected */}
        {round === 3 && phase === 'dealing' && (
          <div className="flex-[2] px-6 py-2.5 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-500/50 text-purple-300 rounded-lg text-base font-bold text-center">
            🎴 Click any card to deal immediately
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
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        
        .line-through {
          position: relative;
        }
        
        .line-through::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 10%;
          right: 10%;
          height: 2px;
          background: rgba(239, 68, 68, 0.6);
          transform: translateY(-50%) rotate(-15deg);
        }
      `}</style>
    </div>
  );
};

export default CardDealingPanel;

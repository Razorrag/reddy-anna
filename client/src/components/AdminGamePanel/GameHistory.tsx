import React from 'react';

interface GameHistoryProps {
  onClose: () => void;
}

const GameHistory: React.FC<GameHistoryProps> = ({ onClose }) => {
  // Placeholder - will be connected to backend later
  const mockHistory = [
    {
      id: '1',
      gameId: 'GAME-001',
      openingCard: 'K♠',
      winner: 'andar',
      winningCard: 'K♥',
      round: 1,
      totalBets: 150000,
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      gameId: 'GAME-002',
      openingCard: '7♦',
      winner: 'bahar',
      winningCard: '7♣',
      round: 2,
      totalBets: 230000,
      timestamp: new Date(Date.now() - 7200000)
    },
    {
      id: '3',
      gameId: 'GAME-003',
      openingCard: 'A♥',
      winner: 'andar',
      winningCard: 'A♠',
      round: 3,
      totalBets: 410000,
      timestamp: new Date(Date.now() - 10800000)
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden border-2 border-gold shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gold/20 to-yellow-600/20 border-b border-gold/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gold flex items-center gap-3">
              📊 Game History
            </h2>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)] custom-scrollbar">
          {mockHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <div className="text-xl text-gray-400">No game history yet</div>
            </div>
          ) : (
            <div className="space-y-4">
              {mockHistory.map((game) => (
                <div
                  key={game.id}
                  className="bg-black/40 rounded-xl p-6 border border-gray-700 hover:border-gold/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Game ID</div>
                      <div className="text-lg font-bold text-white">{game.gameId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Completed</div>
                      <div className="text-sm text-gray-300">
                        {game.timestamp.toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Opening Card</div>
                      <div className="text-2xl font-bold text-white">{game.openingCard}</div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Winner</div>
                      <div className={`text-lg font-bold uppercase ${
                        game.winner === 'andar' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {game.winner}
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Winning Card</div>
                      <div className="text-2xl font-bold text-white">{game.winningCard}</div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Round</div>
                      <div className="text-2xl font-bold text-gold">{game.round}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">Total Bets</div>
                      <div className="text-lg font-bold text-green-400">
                        ₹{game.totalBets.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

export default GameHistory;

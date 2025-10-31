import React from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useNotification } from '../../contexts/NotificationContext';
import type { GamePhase, GameRound } from '@/types/game';

interface RoundControllerProps {
  currentRound: GameRound;
  phase: GamePhase;
  bettingLocked: boolean;
  timer: number;
}

const RoundController: React.FC<RoundControllerProps> = ({
  currentRound,
  phase,
  bettingLocked
}) => {
  const { setCurrentRound, setPhase, setCountdown } = useGameState();
  const { sendWebSocketMessage } = useWebSocket();
  const { showNotification } = useNotification();

  const handleStartRound2 = () => {
    if (currentRound !== 1) {
      showNotification('Can only start Round 2 from Round 1', 'error');
      return;
    }

    if (!window.confirm('Start Round 2 betting (30 seconds)?')) {
      return;
    }

    setCurrentRound(2);
    setPhase('betting');
    setCountdown(30);

    sendWebSocketMessage({
      type: 'phase_change',
      data: {
        phase: 'betting',
        round: 2,
        message: 'Starting Round 2 betting phase'
      }
    });

    showNotification('🎲 Round 2 betting started!', 'success');
  };

  const handleStartRound3 = () => {
    if (currentRound !== 2) {
      showNotification('Can only start Round 3 from Round 2', 'error');
      return;
    }

    if (!window.confirm('Start Round 3 (Continuous Draw - No betting)?')) {
      return;
    }

    setCurrentRound(3);
    setPhase('dealing');
    setCountdown(0);

    sendWebSocketMessage({
      type: 'phase_change',
      data: {
        phase: 'dealing',
        round: 3,
        message: 'Starting Round 3 continuous draw phase'
      }
    });

    showNotification('🔥 Round 3 (Continuous Draw) started!', 'success');
  };

  const canStartRound2 = currentRound === 1 && phase === 'dealing';
  const canStartRound3 = currentRound === 2 && phase === 'dealing';

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gold/30">
      <h3 className="text-sm font-bold text-gold mb-2">
        🎮 Round Control
      </h3>

      {/* Current Round Status */}
      <div className="bg-black/30 rounded-lg p-3 mb-3 text-center">
        <div className="text-xs text-gray-400 mb-1">Current Round</div>
        <div className="text-4xl font-bold text-gold">{currentRound}</div>
        <div className="text-xs text-gray-400">of 3</div>
      </div>

      {/* Round Control Buttons */}
      <div className="space-y-2 mb-3">
        <button
          onClick={handleStartRound2}
          disabled={!canStartRound2}
          className={`
            w-full px-3 py-2 rounded text-sm font-semibold
            ${canStartRound2
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-700 text-gray-500'
            }
          `}
        >
          {currentRound === 1 ? '🎲 Start R2' : '🔒 Round 2'}
        </button>

        <button
          onClick={handleStartRound3}
          disabled={!canStartRound3}
          className={`
            w-full px-3 py-2 rounded text-sm font-semibold
            ${canStartRound3
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 text-gray-500'
            }
          `}
        >
          {currentRound === 2 ? '🔥 Start R3' : '🔒 Round 3'}
        </button>
      </div>

      {/* Phase Status */}
      <div className="bg-black/30 rounded-lg p-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Phase:</span>
          <span className="text-white uppercase font-semibold">{phase}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-400">Betting:</span>
          <span className={`font-semibold ${bettingLocked ? 'text-red-500' : 'text-green-500'}`}>
            {bettingLocked ? '🔒 LOCKED' : '✅ OPEN'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoundController;

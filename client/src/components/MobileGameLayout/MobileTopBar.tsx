/**
 * MobileTopBar - Enhanced top bar with round information and game details
 * 
 * Features:
 * - Current round display (Round 1/2/3)
 * - Game ID from backend
 * - Real-time viewer count
 * - Phase indicator
 * - Connection status
 */

import React from 'react';
import { useLocation } from 'wouter';
import { User, Gift } from 'lucide-react';
import { useGameState } from '@/contexts/GameStateContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useNotification } from '@/contexts/NotificationContext';

interface MobileTopBarProps {
  className?: string;
  onWalletClick?: () => void;
  userBalance?: number;
  gameState?: any;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ 
  className = '', 
  onWalletClick,
  userBalance = 0,
  gameState: propsGameState
}) => {
  const { gameState: contextGameState } = useGameState();
  const [, setLocation] = useLocation();
  const { state: profileState, fetchBonusInfo } = useUserProfile();
  const { showNotification } = useNotification();
  
  // Fetch unified bonus summary/info once; WebSocket + context keep it in sync
  React.useEffect(() => {
    fetchBonusInfo();
  }, [fetchBonusInfo]);
  
  // Use props gameState if provided, otherwise use context
  const gameState = propsGameState || contextGameState;

  // Ensure balance is always a valid number and visible
  const displayBalance = typeof userBalance === 'number' ? userBalance : 0;
  
  // Use unified cumulative bonus from context:
  // - bonusSummary.totals.available already represents total available bonus across deposits/referrals.
  // - bonusInfo (derived) kept for compatibility but not used for amount to avoid "latest-only" bug.
  const bonusSummary = (profileState as any).bonusSummary;
  const availableBonus = bonusSummary?.totals?.available || 0;

  const bonusInfo = profileState.bonusInfo; // contains derived flags like bonusLocked/wageringProgress when provided
  const hasBonus = availableBonus > 0;

  const handleProfileClick = () => {
    setLocation('/profile');
  };

  // ✅ Bonuses are auto-credited - show info instead of claim button
  const handleBonusInfo = () => {
    if (bonusInfo?.bonusLocked) {
      const progress = bonusInfo.wageringProgress || 0;
      showNotification(
        `Bonus locked: ${progress.toFixed(0)}% wagering complete. Keep playing to unlock!`,
        'info'
      );
    } else {
      showNotification(
        `Total earned: ₹${availableBonus.toLocaleString('en-IN')}. Bonuses are auto-credited to your balance!`,
        'success'
      );
    }
  };

  return (
    <div className={`bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 ${className}`}>
      <div className="px-4 py-3">
        {/* Main Top Bar Layout */}
        <div className="flex justify-between items-center">
          {/* Left Side - Game ID, Title and Round */}
          <div className="flex flex-col">
            {/* Game ID - HIDDEN */}
            <div className="text-white text-xs font-mono mb-1" style={{ display: 'none' }}>
              {gameState.gameId || '1308544430'}
            </div>
            {/* Game Title and Round */}
            <div className="flex items-center gap-2">
              {/* Game Title - HIDDEN */}
              <div className="text-white text-sm font-bold" style={{ display: 'none' }}>
                Andar Bahar Live Game
              </div>
              {/* Round Indicator */}
              <div className={`
                px-2 py-1 rounded-full text-xs font-bold
                ${gameState.currentRound === 1 ? 'bg-green-600 text-white' : ''}
                ${gameState.currentRound === 2 ? 'bg-blue-600 text-white' : ''}
                ${gameState.currentRound === 3 ? 'bg-red-600 text-white' : ''}
              `}>
                R{gameState.currentRound || 1}
              </div>
            </div>
          </div>

          {/* Right Side - Profile, Bonus, Wallet */}
          <div className="flex items-center gap-2">
            {/* Profile Button */}
            <button
              onClick={handleProfileClick}
              className="flex items-center justify-center w-9 h-9 bg-gray-800/80 border-2 border-gray-600 rounded-full hover:bg-gray-700/80 hover:border-gray-500 transition-all active:scale-95"
              aria-label="Profile"
            >
              <User className="w-5 h-5 text-gray-300" />
            </button>

            {/* Bonus Chip - Shows total earned (auto-credited) */}
            {hasBonus && (
              <button
                onClick={handleBonusInfo}
                className={`flex items-center space-x-1.5 rounded-full px-3 py-1.5 transition-all active:scale-95 shadow-lg ${
                  bonusInfo?.bonusLocked
                    ? 'bg-gradient-to-r from-yellow-500/30 to-orange-600/30 border-2 border-yellow-400 hover:from-yellow-500/40 hover:to-orange-600/40 hover:border-yellow-300 shadow-yellow-500/20'
                    : 'bg-gradient-to-r from-green-500/30 to-green-600/30 border-2 border-green-400 hover:from-green-500/40 hover:to-green-600/40 hover:border-green-300 shadow-green-500/20'
                }`}
                title={
                  bonusInfo?.bonusLocked && bonusInfo.wageringProgress !== undefined
                    ? `Locked: ${bonusInfo.wageringProgress.toFixed(0)}% wagering complete`
                    : 'Total bonus earned (auto-credited)'
                }
              >
                {bonusInfo?.bonusLocked ? (
                  <>
                    <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-yellow-300 font-bold text-sm">
                      ₹{availableBonus.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 text-green-300" />
                    <span className="text-green-300 font-bold text-sm">
                      ₹{availableBonus.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Wallet Chip - Always Visible Balance */}
            <button
              onClick={onWalletClick}
              className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-400 rounded-xl px-4 py-2 hover:from-yellow-500/40 hover:to-yellow-600/40 hover:border-yellow-300 transition-all active:scale-95 shadow-lg shadow-yellow-500/20"
            >
              {/* Wallet Icon */}
              <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
              </svg>
              <div className="flex flex-col leading-tight -space-y-0.5">
                <span className="text-yellow-300 font-bold text-base tracking-wide">
                  ₹{displayBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTopBar;

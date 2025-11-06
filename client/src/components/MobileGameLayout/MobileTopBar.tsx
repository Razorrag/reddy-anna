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
  const { state: profileState, claimBonus, fetchBonusInfo } = useUserProfile();
  const { showNotification } = useNotification();
  const [isClaiming, setIsClaiming] = React.useState(false);
  
  // ✅ FIX: Auto-fetch bonus info on mount and when balance changes
  React.useEffect(() => {
    fetchBonusInfo();
  }, [userBalance]); // Refresh bonus when balance changes
  
  // Use props gameState if provided, otherwise use context
  const gameState = propsGameState || contextGameState;

  // Ensure balance is always a valid number and visible
  const displayBalance = typeof userBalance === 'number' ? userBalance : 0;
  
  // Get bonus info
  const bonusInfo = profileState.bonusInfo;
  const totalBonus = (bonusInfo?.depositBonus || 0) + (bonusInfo?.referralBonus || 0);
  const hasBonus = totalBonus > 0;

  const handleProfileClick = () => {
    setLocation('/profile');
  };

  const handleClaimBonus = async () => {
    if (isClaiming) return;
    
    // ✅ Check if bonus is locked (wagering requirement not met)
    if (bonusInfo?.bonusLocked) {
      const progress = bonusInfo.wageringProgress || 0;
      showNotification(
        `Bonus is locked! Complete ${(100 - progress).toFixed(0)}% more wagering to unlock (${progress.toFixed(0)}% done)`,
        'error'
      );
      return;
    }
    
    setIsClaiming(true);
    try {
      const result = await claimBonus();
      if (result.success) {
        showNotification(`Bonus claimed! ₹${totalBonus.toLocaleString('en-IN')} added to your balance`, 'success');
        await fetchBonusInfo(); // Refresh bonus info
      } else {
        showNotification(result.error || 'Failed to claim bonus', 'error');
      }
    } catch (error) {
      showNotification('Failed to claim bonus', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className={`bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 ${className}`}>
      <div className="px-4 py-3">
        {/* Main Top Bar Layout */}
        <div className="flex justify-between items-center">
          {/* Left Side - Game ID, Title and Round */}
          <div className="flex flex-col">
            {/* Game ID */}
            <div className="text-white text-xs font-mono mb-1">
              {gameState.gameId || '1308544430'}
            </div>
            {/* Game Title and Round */}
            <div className="flex items-center gap-2">
              <div className="text-white text-sm font-bold">
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

            {/* Bonus Chip - Show if bonus available */}
            {hasBonus && (
              <button
                onClick={handleClaimBonus}
                disabled={isClaiming}
                className={`flex items-center space-x-1.5 rounded-full px-3 py-1.5 transition-all active:scale-95 shadow-lg ${
                  bonusInfo?.bonusLocked
                    ? 'bg-gradient-to-r from-yellow-500/30 to-orange-600/30 border-2 border-yellow-400 hover:from-yellow-500/40 hover:to-orange-600/40 hover:border-yellow-300 shadow-yellow-500/20'
                    : 'bg-gradient-to-r from-green-500/30 to-green-600/30 border-2 border-green-400 hover:from-green-500/40 hover:to-green-600/40 hover:border-green-300 shadow-green-500/20 animate-pulse'
                }`}
                title={bonusInfo?.bonusLocked ? `Locked: ${bonusInfo.wageringProgress.toFixed(0)}% wagering complete` : 'Click to claim bonus'}
              >
                {bonusInfo?.bonusLocked ? (
                  <>
                    <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-300 font-bold text-sm">
                      ₹{totalBonus.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 text-green-300" />
                    <span className="text-green-300 font-bold text-sm">
                      ₹{totalBonus.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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

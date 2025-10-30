/**
 * MobileGameLayout - Main Game Layout Component
 * 
 * Mobile-first layout that works seamlessly across all devices
 * with the same portrait-oriented design.
 */

import React from 'react';
import MobileTopBar from './MobileTopBar.tsx';
import VideoArea from './VideoArea.tsx';
import BettingStrip from './BettingStrip.tsx';
import ControlsRow from './ControlsRow.tsx';
import CardHistory from './CardHistory.tsx';
import HorizontalChipSelector from './HorizontalChipSelector.tsx';
import ProgressBar from './ProgressBar.tsx';
import type { GameState } from '../../types/game';
import type { BetSide } from '../../types/game';

interface MobileGameLayoutProps {
  gameState: GameState;
  user: { id: string; username: string };
  userBalance: number;
  selectedBetAmount: number;
  selectedPosition: BetSide | null;
  betAmounts: number[];
  onPositionSelect: (position: BetSide) => void;
  onPlaceBet: (position: BetSide) => void;
  onChipSelect: (amount: number) => void;
  onUndoBet: () => void;
  onRebet: () => void;
  onWalletClick: () => void;
  onHistoryClick: () => void;
  onShowChipSelector: () => void;
  showChipSelector: boolean;
  isPlacingBet: boolean;
  isScreenSharing: boolean;
}

const MobileGameLayout: React.FC<MobileGameLayoutProps> = ({
  gameState,
  // user,
  userBalance,
  selectedBetAmount,
  selectedPosition,
  betAmounts,
  onPositionSelect,
  onPlaceBet,
  onChipSelect,
  onUndoBet,
  onRebet,
  onWalletClick,
  onHistoryClick,
  onShowChipSelector,
  showChipSelector,
  isPlacingBet,
  isScreenSharing
}) => {
  return (
    <div className="game-container min-h-screen bg-black text-white overflow-hidden">
      {/* Main game container with responsive sizing */}
      <div className="max-w-md mx-auto h-screen flex flex-col relative">
        
        {/* Top Bar - Game ID, Wallet, Viewers */}
        <MobileTopBar 
          onWalletClick={onWalletClick}
          userBalance={userBalance}
          gameState={gameState}
        />

        {/* Video Area - 65-70% screen height with overlays */}
        <VideoArea 
          className="flex-1 relative"
          isScreenSharing={isScreenSharing}
        />

        {/* Betting Strip - Andar/Opening Card/Bahar */}
        <BettingStrip
          selectedPosition={selectedPosition}
          selectedBetAmount={selectedBetAmount}
          onPositionSelect={onPositionSelect}
          onPlaceBet={onPlaceBet}
          isPlacingBet={isPlacingBet}
          className="px-4 py-2"
        />

        {/* Horizontal Chip Selector - Toggleable swipeable chip selection */}
        {showChipSelector && (
          <HorizontalChipSelector
            betAmounts={betAmounts}
            selectedAmount={selectedBetAmount}
            userBalance={userBalance}
            onChipSelect={onChipSelect}
            isVisible={true}
          />
        )}

        {/* Controls Row - History, Undo, Select Chip, Rebet */}
        <ControlsRow
          selectedBetAmount={selectedBetAmount}
          isPlacingBet={isPlacingBet}
          onUndoBet={onUndoBet}
          onRebet={onRebet}
          onHistoryClick={onHistoryClick}
          onShowChipSelector={onShowChipSelector}
          className="px-4 py-2"
        />

        {/* Card History Row - Recent results */}
        <CardHistory
          gameState={gameState}
          onHistoryClick={onHistoryClick}
          className="px-4 py-1"
        />

        {/* Progress Bar - Bottom indicator */}
        <ProgressBar
          gameState={gameState}
          className="h-1"
        />
      </div>
    </div>
  );
};

export default MobileGameLayout;

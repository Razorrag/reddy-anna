/**
 * ChipSelector - Bottom sheet for chip selection
 * 
 * Displays available chip denominations in a bottom sheet
 * that slides up from the bottom of the screen.
 */

import React from 'react';

interface ChipSelectorProps {
  betAmounts: number[];
  selectedAmount: number;
  userBalance: number;
  onChipSelect: (amount: number) => void;
  onClose: () => void;
}

const ChipSelector: React.FC<ChipSelectorProps> = ({
  betAmounts,
  selectedAmount,
  userBalance,
  onChipSelect,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="relative bg-gray-900 rounded-t-2xl p-6 w-full max-h-[50vh] overflow-y-auto animate-slide-up">
        {/* Handle */}
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
        
        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          Select Chip Amount
        </h3>
        
        {/* Chip Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {betAmounts.map((amount) => {
            const canAfford = amount <= userBalance;
            const isSelected = amount === selectedAmount;
            
            return (
              <button
                key={amount}
                onClick={() => onChipSelect(amount)}
                disabled={!canAfford}
                className={`
                  relative transition-all duration-200 transform
                  ${isSelected 
                    ? 'scale-110 shadow-lg shadow-yellow-500/50' 
                    : canAfford 
                      ? 'hover:scale-105 hover:shadow-lg'
                      : 'opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="relative">
                  <img
                    src={`/coins/${amount}.png`}
                    alt={`₹${amount}`}
                    className={`
                      w-full h-auto rounded-full
                      ${!canAfford ? 'grayscale' : ''}
                    `}
                    onError={(e) => {
                      // Fallback to styled div if image not found
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  {/* Fallback styled chip */}
                  <div className={`
                    hidden rounded-full p-4 items-center justify-center
                    ${isSelected 
                      ? 'bg-yellow-500 text-black' 
                      : canAfford 
                        ? 'bg-gradient-to-br from-yellow-600 to-yellow-700 text-white'
                        : 'bg-gray-700 text-gray-500'
                    }
                  `}>
                    <div className="text-lg font-bold">
                      ₹{amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Custom Amount Input */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block">
            Custom Amount
          </label>
          <input
            type="number"
            placeholder="Enter custom amount"
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-yellow-500 focus:outline-none"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const value = parseInt(e.currentTarget.value);
                if (value > 0 && value <= userBalance) {
                  onChipSelect(value);
                }
              }
            }}
          />
        </div>
        
        {/* Balance Display */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your Balance</span>
            <span className="text-xl font-bold text-yellow-400">
              ₹{userBalance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChipSelector;

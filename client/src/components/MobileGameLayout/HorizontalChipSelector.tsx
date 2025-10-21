/**
 * HorizontalChipSelector - Swipeable horizontal chip selector
 * 
 * Displays available chip denominations in a horizontal scrollable strip
 * that appears between the betting strip and control buttons.
 * Supports touch/swipe gestures for mobile devices.
 */

import React, { useRef, useEffect, useState } from 'react';

interface HorizontalChipSelectorProps {
  betAmounts: number[];
  selectedAmount: number;
  userBalance: number;
  onChipSelect: (amount: number) => void;
  isVisible: boolean;
}

const HorizontalChipSelector: React.FC<HorizontalChipSelectorProps> = ({
  betAmounts,
  selectedAmount,
  userBalance,
  onChipSelect,
  isVisible
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Auto-scroll to selected chip when component becomes visible
  useEffect(() => {
    if (isVisible && scrollContainerRef.current) {
      const selectedIndex = betAmounts.indexOf(selectedAmount);
      if (selectedIndex !== -1) {
        const container = scrollContainerRef.current;
        const chipElements = container.children;
        if (chipElements[selectedIndex]) {
          const chipElement = chipElements[selectedIndex] as HTMLElement;
          const containerWidth = container.offsetWidth;
          const chipWidth = chipElement.offsetWidth;
          const chipLeft = chipElement.offsetLeft;
          
          // Center the selected chip
          const scrollPosition = chipLeft - (containerWidth / 2) + (chipWidth / 2);
          container.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [isVisible, selectedAmount, betAmounts]);

  // Mouse/Touch drag handlers for swipe functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; // Scroll speed
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; // Scroll speed
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border-t border-b border-gray-800 py-2">
      <div className="px-3">
        {/* Scroll hint */}
        <div className="text-center text-xs text-gray-500 mb-1">
          Swipe to select chip →
        </div>
        
        {/* Horizontal scrollable chip container */}
        <div
          ref={scrollContainerRef}
          className={`
            flex gap-2 overflow-x-auto scrollbar-hide
            scroll-smooth cursor-grab active:cursor-grabbing
            ${isDragging ? 'scroll-behavior-auto' : 'scroll-behavior-smooth'}
          `}
          style={{
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE and Edge
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {betAmounts.map((amount) => {
            const canAfford = amount <= userBalance;
            const isSelected = amount === selectedAmount;
            
            return (
              <button
                key={amount}
                onClick={() => canAfford && onChipSelect(amount)}
                disabled={!canAfford}
                className={`
                  flex-shrink-0 transition-all duration-200 transform
                  ${isSelected 
                    ? 'scale-110 shadow-lg shadow-yellow-500/50 ring-2 ring-yellow-400' 
                    : canAfford 
                      ? 'hover:scale-105 hover:shadow-lg'
                      : 'opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="relative w-12 h-12 sm:w-14 sm:h-14">
                  <img
                    src={`/coins/${amount}.png`}
                    alt={`₹${amount}`}
                    className={`
                      w-full h-full rounded-full object-cover
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
                    hidden absolute inset-0 rounded-full items-center justify-center
                    ${isSelected 
                      ? 'bg-yellow-500 text-black' 
                      : canAfford 
                        ? 'bg-gradient-to-br from-yellow-600 to-yellow-700 text-white'
                        : 'bg-gray-700 text-gray-500'
                    }
                  `}>
                    <div className="text-xs font-bold text-center">
                      ₹{amount >= 1000 ? `${amount/1000}k` : amount}
                    </div>
                  </div>
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </div>
                {/* Amount label */}
                <div className="text-xs text-center mt-0.5 text-gray-400">
                  ₹{amount.toLocaleString('en-IN')}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Selected chip display */}
        <div className="text-center mt-2">
          <span className="text-xs text-gray-400">Selected: </span>
          <span className="text-xs font-bold text-yellow-400">
            ₹{selectedAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
      
      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default HorizontalChipSelector;

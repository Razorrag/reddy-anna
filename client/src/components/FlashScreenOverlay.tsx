import { useEffect } from 'react';

interface FlashScreenOverlayProps {
  show: boolean;
  onComplete?: () => void;
  duration?: number;
}

/**
 * Reusable Flash Screen Overlay Component
 * Shows a full-screen loading animation with the flash screen image
 */
export default function FlashScreenOverlay({ 
  show, 
  onComplete, 
  duration = 2500 
}: FlashScreenOverlayProps) {
  
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete, duration]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black flex items-center justify-center z-[9999] animate-fade-in">
      {/* Flash Screen Image - Full Screen */}
      <img
        src="/flash_screen.jpeg"
        alt="Loading Game"
        className="w-full h-full object-cover"
      />
      
      {/* Buffering/Loading Overlay */}
      <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
        {/* Circular Spinner */}
        <div className="relative w-24 h-24 mb-6">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 border-4 border-gold/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-gold rounded-full animate-spin"></div>
          
          {/* Inner pulsing circle */}
          <div className="absolute inset-3 bg-gold/20 rounded-full animate-pulse"></div>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-gold" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
          </div>
        </div>
        
        {/* Loading Text */}
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold text-gold tracking-wide">
            Loading Game...
          </h3>
          
          {/* Animated dots */}
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-gold rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          {/* Progress bar */}
          <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-gradient-to-r from-gold via-yellow-400 to-gold animate-shimmer bg-[length:200%_100%]"></div>
          </div>
          
          <p className="text-sm text-gray-300 mt-2">
            Preparing your gaming experience
          </p>
        </div>
      </div>
    </div>
  );
}
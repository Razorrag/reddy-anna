import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function FlashScreen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Auto-redirect to game page after 2.5 seconds
    const timer = setTimeout(() => {
      setLocation('/game');
    }, 2500);

    // Cleanup timer on unmount
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
      {/* Flash Screen Image - Full Screen */}
      <img
        src="/flash_screen.jpeg"
        alt="Loading"
        className="w-full h-full object-cover animate-fade-in"
      />

      {/* Optional: Loading indicator at bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-gold rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-gold rounded-full animate-bounce delay-100"></div>
          <div className="w-3 h-3 bg-gold rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
}
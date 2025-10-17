import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CircularTimerProps {
  seconds: number;
  totalSeconds: number;
  phase: string;
  isVisible?: boolean;
}

export function CircularTimer({ seconds, totalSeconds, phase, isVisible = true }: CircularTimerProps) {
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    setProgress((seconds / totalSeconds) * 100);
  }, [seconds, totalSeconds]);
  
  // Warning state when less than 10 seconds
  const isWarning = seconds <= 10 && seconds > 0;
  
  if (!isVisible) return null;
  
  const circumference = 2 * Math.PI * 90; // radius = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div 
      className={cn(
        "fixed z-50 transform -translate-x-1/2 -translate-y-1/2",
        "transition-all duration-300",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-0"
      )}
      style={{ 
        top: '45%', 
        left: '50%'
      }}
      data-testid="circular-timer"
    >
      <div className={cn(
        "relative w-48 h-48 md:w-64 md:h-64 rounded-full flex items-center justify-center",
        "bg-gradient-radial from-black/95 to-black/80",
        "border-8 shadow-2xl",
        isWarning ? "border-casino-warning animate-pulse" : "border-gold",
        isWarning && "shadow-casino-warning/50"
      )}>
        {/* SVG Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 200 200"
        >
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(255, 215, 0, 0.2)"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={isWarning ? "hsl(38 92% 50%)" : "hsl(45 100% 51%)"}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        
        {/* Timer Content */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className={cn(
            "text-6xl md:text-8xl font-bold tabular-nums",
            isWarning ? "text-casino-warning" : "text-gold",
            isWarning && "animate-pulse"
          )}>
            {seconds}
          </div>
          <div className="text-sm md:text-base font-medium text-gold-muted uppercase tracking-wider mt-2">
            {phase === 'betting' ? 'Place Bets' : phase === 'dealing' ? 'Dealing' : 'Round ' + (seconds || 1)}
          </div>
        </div>
      </div>
    </div>
  );
}

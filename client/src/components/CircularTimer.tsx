import { cn } from "@/lib/utils";

interface CircularTimerProps {
  seconds: number;
  totalSeconds: number;
  phase: 'idle' | 'betting' | 'dealing' | 'complete';
  isVisible?: boolean;
}

export function CircularTimer({ 
  seconds, 
  totalSeconds, 
  phase,
  isVisible = true 
}: CircularTimerProps) {
  if (!isVisible || phase !== 'betting') {
    return null;
  }

  // Calculate percentage for the circular progress
  const percentage = (seconds / totalSeconds) * 100;
  const strokeDasharray = 2 * Math.PI * 90; // Circumference for r=90
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  // Phase-specific text
  const phaseText = phase === 'betting' ? `Betting Time` : phase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className={cn(
        "w-48 h-48 md:w-56 md:h-56 rounded-full border-8 border-gold flex flex-col items-center justify-center transition-all duration-500",
        "bg-gradient-to-b from-black/80 to-black/95 shadow-2xl shadow-gold/30",
        "animate-pulse"
      )}>
        <div className="text-6xl md:text-7xl font-bold text-white tabular-nums">
          {seconds}
        </div>
        <div className="text-lg md:text-xl text-gold font-medium mt-1">
          {phaseText}
        </div>
      </div>
    </div>
  );
}

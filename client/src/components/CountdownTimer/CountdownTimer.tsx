import React from 'react';
import { cn } from '../../lib/utils';

interface CountdownTimerProps {
  seconds: number;
  phase: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ seconds, phase }) => {
  const progress = seconds > 0 ? (seconds / 60) * 100 : 0; // Assuming 60s max for calculation
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="text-gray-700 stroke-current"
            strokeWidth="8"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            className="text-yellow-500 stroke-current"
            strokeWidth="8"
            strokeLinecap="round"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            strokeDasharray="251.2" // 2 * Math.PI * r
            strokeDashoffset={251.2 - (251.2 * progress) / 100}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "text-2xl font-bold",
            seconds <= 10 ? "text-red-500 animate-pulse" : "text-white"
          )}>
            {seconds}
          </span>
        </div>
      </div>
      <div className="mt-2 text-white font-semibold">
        {phase === 'betting' ? 'Betting Time' : 'Dealing Phase'}
      </div>
    </div>
  );
};

export default CountdownTimer;

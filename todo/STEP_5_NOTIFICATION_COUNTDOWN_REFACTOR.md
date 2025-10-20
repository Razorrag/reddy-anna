# Step 5: Notification System and Countdown Timer Refactoring

## Goal
Refactor remaining components that need Tailwind CSS conversion and WebSocket context integration.

## Current State
- Notification system component uses legacy CSS
- Countdown timer component uses legacy CSS
- Need to ensure all UI components use Tailwind and proper WebSocket integration

## Target State
- Notification system component uses Tailwind CSS
- Countdown timer component uses Tailwind CSS
- All components properly connected to WebSocket context
- Professional, polished UI with no CSS issues

## Files to Modify
- `client/src/components/NotificationSystem/NotificationSystem.tsx`
- `client/src/components/CountdownTimer/CountdownTimer.tsx`

## Detailed Changes

### 1. Refactor Notification System Component

#### Remove legacy CSS import in `client/src/components/NotificationSystem/NotificationSystem.tsx`
Remove: `import './NotificationSystem.css';`

#### Replace with Tailwind implementation:
```tsx
// client/src/components/NotificationSystem/NotificationSystem.tsx
import React from 'react';
import { Toast } from '@/components/ui/toast';
import { useGameState } from '../../contexts/WebSocketContext';

const NotificationSystem: React.FC = () => {
  const { notifications } = useGameState();
  
  return (
    <div className="fixed top-4 right-4 z-1000 space-y-2">
      {notifications.map((notification, index) => (
        <div 
          key={index}
          className={`
            p-4 rounded-lg shadow-lg max-w-sm w-full transform transition-all duration-300
            ${notification.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${notification.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 text-black' : ''}
            ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
          `}
        >
          <div className="font-semibold">{notification.message}</div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
```

### 2. Refactor Countdown Timer Component

#### Remove legacy CSS import in `client/src/components/CountdownTimer/CountdownTimer.tsx`
Remove: `import './CountdownTimer.css';`

#### Replace with Tailwind implementation:
```tsx
// client/src/components/CountdownTimer/CountdownTimer.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { useGameState } from '../../contexts/WebSocketContext';

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
            className="text-gold stroke-current"
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
```

## Verification Steps
1. Remove legacy CSS import from NotificationSystem component
2. Update NotificationSystem component with Tailwind implementation
3. Remove legacy CSS import from CountdownTimer component
4. Update CountdownTimer component with Tailwind implementation
5. Test that both components are properly connected to WebSocket context
6. Verify all styling appears correctly with Tailwind classes
7. Test notification system shows different types of notifications (success, error, warning, info)
8. Verify countdown timer displays correctly and shows appropriate phase messaging
import { type Card } from "@/types/game";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  card: Card | string;
  size?: "sm" | "md" | "lg" | "xl";
  isWinning?: boolean;
  className?: string;
}

export function PlayingCard({ card, size = "md", isWinning, className }: PlayingCardProps) {
  // Extract rank and suit - handle both string and object formats
  const rank = typeof card === 'string' ? card.slice(0, -1) : card.value;
  const suit = typeof card === 'string' ? card.slice(-1) : card.suit;

  // Use gold color for both rank and suit for better visibility on stream
  const suitColor = 'text-gold';
  
  // Size variants - Matches Legacy Sizing
  const sizeClasses = {
    sm: 'w-10 h-14',
    md: 'w-14 h-20', // Legacy size
    lg: 'w-20 h-32',
    xl: 'w-24 h-36',
  };
  
  const rankSizes = {
    sm: 'text-lg',
    md: 'text-2xl', // Legacy size
    lg: 'text-4xl',
    xl: 'text-5xl',
  };
  
  const suitSizes = {
    sm: 'text-sm',
    md: 'text-lg', // Legacy size
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div
      className={cn(
        "relative rounded-lg bg-white border-2 flex flex-col items-center justify-center shadow-lg transition-all duration-300",
        "border-gray-300", // Default border
        sizeClasses[size],
        isWinning && "ring-4 ring-gold shadow-2xl shadow-gold/50", // Subtle winning effect without blink
        className
      )}
      data-testid={`card-${card}`}
    >
      <div className={cn("font-bold", rankSizes[size], suitColor)}>
        {rank}
      </div>
      <div className={cn("font-bold", suitSizes[size], suitColor)}>
        {suit}
      </div>
    </div>
  );
}

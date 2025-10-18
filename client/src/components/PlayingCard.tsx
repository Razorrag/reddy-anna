import { type Card } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  card: Card;
  size?: "sm" | "md" | "lg" | "xl";
  isWinning?: boolean;
  className?: string;
}

export function PlayingCard({ card, size = "md", isWinning, className }: PlayingCardProps) {
  // Extract rank and suit
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  
  // Determine suit color
  const suitColor = (suit === '♥' || suit === '♦') ? 'text-red-600' : 'text-gray-900';
  
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
        sizeClasses[size],
        isWinning && "ring-4 ring-gold animate-pulse shadow-2xl shadow-gold/50",
        !isWinning && "border-gray-300",
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

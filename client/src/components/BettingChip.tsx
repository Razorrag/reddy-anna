import { cn } from "@/lib/utils";

interface BettingChipProps {
  amount: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export function BettingChip({ amount, isSelected, onClick }: BettingChipProps) {
  // Format amount for display (e.g., 100000 -> ₹100k, 2500 -> ₹2.5k)
  const formatAmount = (amt: number) => {
    if (amt >= 100000) return `₹${amt / 1000}k`;
    if (amt >= 1000) return `₹${amt / 1000}k`;
    return `₹${amt}`;
  };
  
  // Color scheme based on amount
  const getChipColor = () => {
    if (amount >= 100000) return 'from-purple-600 to-purple-800';
    if (amount >= 50000) return 'from-red-600 to-red-800';
    if (amount >= 25000) return 'from-green-600 to-green-800';
    if (amount >= 10000) return 'from-blue-600 to-blue-800';
    if (amount >= 5000) return 'from-yellow-600 to-yellow-800';
    return 'from-gray-600 to-gray-800';
  };
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 shrink-0",
        "transition-all duration-200",
        "hover:scale-110 active:scale-95",
        isSelected && "scale-110"
      )}
      data-testid={`chip-${amount}`}
    >
      {/* Chip Circle */}
      <div className={cn(
        "w-16 h-16 md:w-20 md:h-20 rounded-full",
        "bg-gradient-to-br shadow-lg",
        "flex items-center justify-center",
        "border-4 border-white/30",
        "relative overflow-hidden",
        getChipColor(),
        isSelected && "ring-4 ring-gold shadow-gold/50 shadow-2xl"
      )}>
        {/* Inner circle design */}
        <div className="absolute inset-2 rounded-full border-2 border-white/20" />
        <div className="absolute inset-4 rounded-full border border-white/10" />
        
        {/* Amount text */}
        <span className="relative z-10 text-white font-bold text-sm md:text-base">
          {formatAmount(amount)}
        </span>
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
      </div>
      
      {/* Label */}
      <span className="text-xs md:text-sm font-medium text-gold">
        {formatAmount(amount)}
      </span>
    </button>
  );
}

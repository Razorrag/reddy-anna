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

  // Map amount to image path - Matches Legacy Coins
  const getChipImage = (amount: number) => {
    switch (amount) {
      case 50000: return "/coins/50000.png";
      case 40000: return "/coins/40000.png";
      case 30000: return "/coins/30000.png";
      case 20000: return "/coins/20000.png";
      case 10000: return "/coins/10000.png";
      case 5000: return "/coins/5000.png";
      case 2500: return "/coins/2500.png";
      case 1000: return "/coins/1000.png";
      default: return "/coins/1000.png"; // Default to smallest chip
    }
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
      {/* Chip Image */}
      <div className={cn(
        "w-16 h-16 md:w-20 md:h-20 rounded-full",
        "flex items-center justify-center",
        "border-4 border-white/30",
        "relative overflow-hidden",
        isSelected && "ring-4 ring-gold shadow-gold/50 shadow-2xl",
        "bg-white" // Ensure background for image
      )}>
        <img 
          src={getChipImage(amount)} 
          alt={`₹${formatAmount(amount)}`}
          className="w-full h-full object-contain p-1"
          onError={(e) => {
            // Fallback to a simple circle with text if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.parentElement?.querySelector('.chip-fallback');
            if (fallback) {
              fallback.classList.remove('hidden');
            }
          }}
        />
        <div className={cn(
          "w-full h-full rounded-full flex items-center justify-center",
          "chip-fallback hidden"
        )}>
          <span className="text-white font-bold text-sm md:text-base">
            {formatAmount(amount)}
          </span>
        </div>
      </div>

      {/* Label - Matches Legacy Style */}
      <span className="text-xs md:text-sm font-medium text-gold">
        {formatAmount(amount)}
      </span>
    </button>
  );
}

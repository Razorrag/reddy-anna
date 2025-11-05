import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BetInfo {
  amount: number;
  betId: string;
  timestamp: number;
}

interface UserBetsDisplayProps {
  round1Bets: {
    andar: BetInfo[];
    bahar: BetInfo[];
  };
  round2Bets: {
    andar: BetInfo[];
    bahar: BetInfo[];
  };
  currentRound: number;
}

export function UserBetsDisplay({ round1Bets, round2Bets, currentRound }: UserBetsDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotal = (bets: BetInfo[]) => {
    return bets.reduce((sum, bet) => sum + bet.amount, 0);
  };

  const round1AndarTotal = calculateTotal(round1Bets.andar);
  const round1BaharTotal = calculateTotal(round1Bets.bahar);
  const round2AndarTotal = calculateTotal(round2Bets.andar);
  const round2BaharTotal = calculateTotal(round2Bets.bahar);

  const totalBets = round1AndarTotal + round1BaharTotal + round2AndarTotal + round2BaharTotal;

  if (totalBets === 0) {
    return null; // Don't show if no bets placed
  }

  return (
    <Card className="bg-black/50 border-gold/30 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-gold flex items-center justify-between">
          <span>Your Bets</span>
          <span className="text-sm font-normal text-white/80">
            Total: {formatCurrency(totalBets)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Round 1 Bets */}
        {(round1AndarTotal > 0 || round1BaharTotal > 0) && (
          <div className="bg-black/30 rounded-lg p-3 border border-gold/10">
            <div className="text-xs text-gold mb-2 font-semibold">Round 1</div>
            <div className="grid grid-cols-2 gap-2">
              {round1AndarTotal > 0 && (
                <div className="bg-[#A52A2A]/20 rounded p-2 border border-[#A52A2A]/50">
                  <div className="text-xs text-white/60 mb-1">Andar</div>
                  <div className="text-sm font-bold text-[#A52A2A]">
                    {formatCurrency(round1AndarTotal)}
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {round1Bets.andar.length} bet{round1Bets.andar.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
              {round1BaharTotal > 0 && (
                <div className="bg-[#01073b]/20 rounded p-2 border border-[#01073b]/50">
                  <div className="text-xs text-white/60 mb-1">Bahar</div>
                  <div className="text-sm font-bold text-[#01073b]">
                    {formatCurrency(round1BaharTotal)}
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {round1Bets.bahar.length} bet{round1Bets.bahar.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Round 2 Bets */}
        {(round2AndarTotal > 0 || round2BaharTotal > 0) && (
          <div className="bg-black/30 rounded-lg p-3 border border-gold/10">
            <div className="text-xs text-gold mb-2 font-semibold">Round 2</div>
            <div className="grid grid-cols-2 gap-2">
              {round2AndarTotal > 0 && (
                <div className="bg-[#A52A2A]/20 rounded p-2 border border-[#A52A2A]/50">
                  <div className="text-xs text-white/60 mb-1">Andar</div>
                  <div className="text-sm font-bold text-[#A52A2A]">
                    {formatCurrency(round2AndarTotal)}
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {round2Bets.andar.length} bet{round2Bets.andar.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
              {round2BaharTotal > 0 && (
                <div className="bg-[#01073b]/20 rounded p-2 border border-[#01073b]/50">
                  <div className="text-xs text-white/60 mb-1">Bahar</div>
                  <div className="text-sm font-bold text-[#01073b]">
                    {formatCurrency(round2BaharTotal)}
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {round2Bets.bahar.length} bet{round2Bets.bahar.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Individual Bet Details (expandable) */}
        {(round1Bets.andar.length + round1Bets.bahar.length + 
          round2Bets.andar.length + round2Bets.bahar.length > 1) && (
          <details className="text-xs text-white/60">
            <summary className="cursor-pointer hover:text-white/80 select-none">
              View individual bets
            </summary>
            <div className="mt-2 space-y-1 pl-2">
              {round1Bets.andar.map((bet, idx) => (
                <div key={bet.betId} className="flex justify-between">
                  <span>R1 Andar #{idx + 1}</span>
                  <span className="text-[#A52A2A]">{formatCurrency(bet.amount)}</span>
                </div>
              ))}
              {round1Bets.bahar.map((bet, idx) => (
                <div key={bet.betId} className="flex justify-between">
                  <span>R1 Bahar #{idx + 1}</span>
                  <span className="text-[#01073b]">{formatCurrency(bet.amount)}</span>
                </div>
              ))}
              {round2Bets.andar.map((bet, idx) => (
                <div key={bet.betId} className="flex justify-between">
                  <span>R2 Andar #{idx + 1}</span>
                  <span className="text-[#A52A2A]">{formatCurrency(bet.amount)}</span>
                </div>
              ))}
              {round2Bets.bahar.map((bet, idx) => (
                <div key={bet.betId} className="flex justify-between">
                  <span>R2 Bahar #{idx + 1}</span>
                  <span className="text-[#01073b]">{formatCurrency(bet.amount)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

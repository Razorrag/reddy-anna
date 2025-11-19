/**
 * BonusWallet - Dedicated component to display all bonus information
 * Shows deposit bonuses, referral bonuses, and wagering progress
 */

import React from 'react';
import { Gift, TrendingUp, Users, Lock, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BonusWalletProps {
  bonusSummary: {
    totalDepositBonus: number;
    totalReferralBonus: number;
    totalPendingBonus: number;
    totalCreditedBonus: number;
    depositBonusCount: number;
    referralBonusCount: number;
  } | null;
  depositBonuses: any[];
  referralBonuses: any[];
  loading?: boolean;
}

export const BonusWallet: React.FC<BonusWalletProps> = ({
  bonusSummary,
  depositBonuses,
  referralBonuses,
  loading = false
}) => {
  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = amount ?? 0;
    return `₹${safeAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <Card className="bg-black/50 border-gold/30">
        <CardHeader>
          <CardTitle className="text-gold flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Bonus Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-white/60">
            <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-3">Loading bonus data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBonus = (bonusSummary?.totalDepositBonus || 0) + (bonusSummary?.totalReferralBonus || 0);
  const pendingBonus = bonusSummary?.totalPendingBonus || 0;
  const creditedBonus = bonusSummary?.totalCreditedBonus || 0;

  return (
    <div className="space-y-6">
      {/* Bonus Summary Card */}
      <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-gold/30">
        <CardHeader>
          <CardTitle className="text-gold flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Bonus Wallet
          </CardTitle>
          <CardDescription className="text-white/80">
            Track your deposit and referral bonuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Bonus */}
            <div className="p-4 bg-black/30 rounded-lg border border-gold/20">
              <div className="text-sm text-white/60 mb-1">Total Bonus Earned</div>
              <div className="text-2xl font-bold text-gold">{formatCurrency(totalBonus)}</div>
              <div className="text-xs text-white/40 mt-1">
                {bonusSummary?.depositBonusCount || 0} deposit + {bonusSummary?.referralBonusCount || 0} referral
              </div>
            </div>

            {/* Pending Bonus */}
            <div className="p-4 bg-black/30 rounded-lg border border-yellow-500/20">
              <div className="text-sm text-white/60 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Locked (Wagering)
              </div>
              <div className="text-2xl font-bold text-yellow-400">{formatCurrency(pendingBonus)}</div>
              <div className="text-xs text-white/40 mt-1">
                Play to unlock
              </div>
            </div>

            {/* Credited Bonus */}
            <div className="p-4 bg-black/30 rounded-lg border border-green-500/20">
              <div className="text-sm text-white/60 mb-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Credited
              </div>
              <div className="text-2xl font-bold text-green-400">{formatCurrency(creditedBonus)}</div>
              <div className="text-xs text-white/40 mt-1">
                Added to balance
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <strong>How bonuses work:</strong> Deposit bonuses are locked until you reach wagering thresholds (±30% of deposit). 
                Referral bonuses are credited automatically when your referred friend's deposit bonus unlocks.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Bonuses Section */}
      {depositBonuses.length > 0 && (
        <Card className="bg-black/50 border-gold/30">
          <CardHeader>
            <CardTitle className="text-gold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Deposit Bonuses ({depositBonuses.length})
            </CardTitle>
            <CardDescription className="text-white/60">
              5% bonus on deposits - unlocks when you play
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {depositBonuses.map((bonus) => {
                const progress = Math.min(100, (bonus.wageringProgress || 0));
                const isLocked = bonus.status === 'locked';
                const isCredited = bonus.status === 'credited';

                return (
                  <div
                    key={bonus.id}
                    className="p-4 bg-black/40 rounded-lg border border-gold/10 hover:border-gold/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-white font-semibold">
                          Deposit: {formatCurrency(bonus.depositAmount)}
                        </div>
                        <div className="text-sm text-white/60">
                          Bonus: {formatCurrency(bonus.bonusAmount)} ({bonus.bonusPercentage}%)
                        </div>
                      </div>
                      <Badge
                        className={`${
                          isCredited
                            ? 'bg-green-500/20 text-green-400 border-green-500'
                            : isLocked
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500'
                        } border`}
                      >
                        {isCredited ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Credited</>
                        ) : isLocked ? (
                          <><Lock className="w-3 h-3 mr-1" /> Locked</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /> {bonus.status}</>
                        )}
                      </Badge>
                    </div>

                    {isLocked && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/60">
                          <span>Wagering Progress</span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-white/40">
                          Play to reach ±30% of deposit amount to unlock
                        </div>
                      </div>
                    )}

                    {isCredited && bonus.creditedAt && (
                      <div className="text-xs text-green-400 mt-2">
                        ✅ Credited on {new Date(bonus.creditedAt).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Bonuses Section */}
      {referralBonuses.length > 0 && (
        <Card className="bg-black/50 border-gold/30">
          <CardHeader>
            <CardTitle className="text-gold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Referral Bonuses ({referralBonuses.length})
            </CardTitle>
            <CardDescription className="text-white/60">
              1% bonus when your referrals unlock their deposit bonus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referralBonuses.map((bonus) => {
                const isCredited = bonus.status === 'credited';

                return (
                  <div
                    key={bonus.id}
                    className="p-4 bg-black/40 rounded-lg border border-gold/10 hover:border-gold/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {bonus.referredUsername}
                          </div>
                          <div className="text-sm text-white/60">
                            Deposited: {formatCurrency(bonus.depositAmount)}
                          </div>
                          <div className="text-xs text-white/40 mt-1">
                            {new Date(bonus.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400">
                          +{formatCurrency(bonus.bonusAmount)}
                        </div>
                        <Badge
                          className={`${
                            isCredited
                              ? 'bg-green-500/20 text-green-400 border-green-500'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                          } border mt-1`}
                        >
                          {isCredited ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Credited</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                        {isCredited && bonus.creditedAt && (
                          <div className="text-xs text-white/40 mt-1">
                            {new Date(bonus.creditedAt).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {depositBonuses.length === 0 && referralBonuses.length === 0 && (
        <Card className="bg-black/50 border-gold/30">
          <CardContent className="py-12">
            <div className="text-center text-white/60">
              <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">No Bonuses Yet</p>
              <p className="text-sm">
                Make a deposit to earn 5% bonus, or refer friends to earn 1% of their bonuses!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BonusWallet;

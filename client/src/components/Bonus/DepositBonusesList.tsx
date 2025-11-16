/**
 * DepositBonusesList - Shows all deposit bonuses with progress bars
 * Each deposit bonus is tracked separately with wagering progress
 */

import React from 'react';
import { Lock, Unlock, CheckCircle, Clock, Gift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface DepositBonus {
  id: string;
  depositAmount: number;
  bonusAmount: number;
  bonusPercentage: number;
  wageringRequired: number;
  wageringCompleted: number;
  wageringProgress: number;
  status: 'locked' | 'unlocked' | 'credited' | 'expired';
  lockedAt: string;
  unlockedAt?: string;
  creditedAt?: string;
  createdAt: string;
}

interface DepositBonusesListProps {
  bonuses: DepositBonus[];
  onRefresh?: () => void;
}

const DepositBonusesList: React.FC<DepositBonusesListProps> = ({ bonuses, onRefresh }) => {

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'locked':
        return {
          icon: Lock,
          label: 'Locked',
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
          description: 'Keep playing to unlock'
        };
      case 'unlocked':
        return {
          icon: Unlock,
          label: 'Unlocked',
          color: 'bg-green-500/20 text-green-400 border-green-500',
          description: 'Will auto-credit soon'
        };
      case 'credited':
        return {
          icon: CheckCircle,
          label: 'Credited',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500',
          description: 'Added to balance'
        };
      case 'expired':
        return {
          icon: Clock,
          label: 'Expired',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500',
          description: 'Time limit exceeded'
        };
      default:
        return {
          icon: Lock,
          label: status,
          color: 'bg-gray-500/20 text-gray-400 border-gray-500',
          description: ''
        };
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-blue-500';
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (bonuses.length === 0) {
    return (
      <Card className="bg-black/50 border-gold/30">
        <CardHeader>
          <CardTitle className="text-gold">Deposit Bonuses</CardTitle>
          <CardDescription className="text-white/60">
            Track each deposit bonus separately
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-white/60">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No deposit bonuses yet</p>
            <p className="text-sm mt-1">Make a deposit to earn 5% bonus!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/50 border-gold/30">
      <CardHeader>
        <CardTitle className="text-gold">Deposit Bonuses ({bonuses.length})</CardTitle>
        <CardDescription className="text-white/60">
          Track each deposit bonus separately with wagering progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bonuses.map((bonus) => {
            const statusConfig = getStatusConfig(bonus.status);
            const StatusIcon = statusConfig.icon;
            const progressColor = getProgressColor(bonus.wageringProgress);

            return (
              <div
                key={bonus.id}
                className="p-4 bg-black/40 rounded-lg border border-gold/10 hover:border-gold/30 transition-all"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm text-white/60">Deposit Amount</div>
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(bonus.depositAmount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/60">Bonus ({bonus.bonusPercentage}%)</div>
                    <div className="text-xl font-bold text-green-400">
                      {formatCurrency(bonus.bonusAmount)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Wagering Progress</span>
                    <span className="text-white font-bold">
                      {Math.min(bonus.wageringProgress, 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={`h-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${Math.min(bonus.wageringProgress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-white/50">
                      Wagered: {formatCurrency(bonus.wageringCompleted)}
                    </span>
                    <span className="text-white/50">
                      Required: {formatCurrency(bonus.wageringRequired)}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex justify-between items-center">
                  <Badge className={`${statusConfig.color} border flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </Badge>
                  <span className="text-xs text-white/40">
                    {formatDate(bonus.createdAt)}
                  </span>
                </div>

                {/* Status Description */}
                <div className="mt-2 text-xs text-white/50">
                  {statusConfig.description}
                  {bonus.status === 'credited' && bonus.creditedAt && (
                    <span className="text-blue-400 ml-1">
                      • Credited on {formatDate(bonus.creditedAt)}
                    </span>
                  )}
                  {bonus.status === 'unlocked' && bonus.unlockedAt && (
                    <span className="text-green-400 ml-1">
                      • Unlocked on {formatDate(bonus.unlockedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DepositBonusesList;

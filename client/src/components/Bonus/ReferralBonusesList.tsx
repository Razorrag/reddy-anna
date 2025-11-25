/**
 * ReferralBonusesList - Shows all referral bonuses
 * Referral bonuses require wagering to unlock (3x bonus amount)
 */

import React from 'react';
import { Users, CheckCircle, Clock, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ReferralBonus {
  id: string;
  referredUsername: string;
  depositAmount: number;
  bonusAmount: number;
  bonusPercentage: number;
  status: 'pending' | 'locked' | 'unlocked' | 'credited' | 'expired';
  wageringRequired?: number;
  wageringCompleted?: number;
  wageringProgress?: number;
  creditedAt?: string;
  createdAt: string;
}

interface ReferralBonusesListProps {
  bonuses: ReferralBonus[];
}

const ReferralBonusesList: React.FC<ReferralBonusesListProps> = ({ bonuses }) => {
  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = amount ?? 0;
    return `₹${safeAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'credited':
        return {
          icon: CheckCircle,
          label: 'Credited',
          color: 'bg-green-500/20 text-green-400 border-green-500'
        };
      case 'unlocked':
        return {
          icon: Unlock,
          label: 'Unlocked',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500'
        };
      case 'locked':
        return {
          icon: Lock,
          label: 'Locked',
          color: 'bg-orange-500/20 text-orange-400 border-orange-500'
        };
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
        };
      case 'expired':
        return {
          icon: Clock,
          label: 'Expired',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500'
        };
      default:
        return {
          icon: Clock,
          label: status,
          color: 'bg-gray-500/20 text-gray-400 border-gray-500'
        };
    }
  };

  if (bonuses.length === 0) {
    return (
      <Card className="bg-black/50 border-gold/30">
        <CardHeader>
          <CardTitle className="text-gold">Referral Bonuses</CardTitle>
          <CardDescription className="text-white/60">
            Earn 5% when your referrals deposit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-white/60">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No referral bonuses yet</p>
            <p className="text-sm mt-1">Share your referral code to earn!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEarned = bonuses
    .filter(b => b.status === 'credited')
    .reduce((sum, b) => sum + b.bonusAmount, 0);

  return (
    <Card className="bg-black/50 border-gold/30">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-gold">Referral Bonuses ({bonuses.length})</CardTitle>
            <CardDescription className="text-white/60">
              Earn 5% when your referrals deposit
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60">Total Earned</div>
            <div className="text-lg font-bold text-green-400">
              {formatCurrency(totalEarned)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bonuses.map((bonus) => {
            const statusConfig = getStatusConfig(bonus.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={bonus.id}
                className="p-4 bg-black/40 rounded-lg border border-gold/10 hover:border-gold/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  {/* User Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white mb-1">
                        {bonus.referredUsername}
                      </div>
                      <div className="text-sm text-white/60">
                        Deposited: {formatCurrency(bonus.depositAmount)}
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        {formatDate(bonus.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Bonus Amount & Status */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400 mb-2">
                      +{formatCurrency(bonus.bonusAmount)}
                    </div>
                    <Badge className={`${statusConfig.color} border flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </Badge>
                    {bonus.status === 'credited' && bonus.creditedAt && (
                      <div className="text-xs text-white/40 mt-1">
                        {formatDate(bonus.creditedAt)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Wagering Progress for locked bonuses */}
                {bonus.status === 'locked' && bonus.wageringRequired && bonus.wageringRequired > 0 && (
                  <div className="mt-3 pt-3 border-t border-gold/10">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>Wagering Progress</span>
                      <span>{formatCurrency(bonus.wageringCompleted || 0)} / {formatCurrency(bonus.wageringRequired)}</span>
                    </div>
                    <Progress 
                      value={bonus.wageringProgress || 0} 
                      className="h-2 bg-gray-700"
                    />
                    <div className="text-xs text-white/40 mt-1">
                      Play games to unlock this bonus
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralBonusesList;

/**
 * BonusOverviewCard - Shows summary of all bonus types
 * Displays: Available, Locked, Credited, and Lifetime earnings
 */

import React from 'react';
import { Gift, Lock, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BonusOverviewCardProps {
  totalAvailable: number;
  totalLocked: number;
  totalCredited: number;
  lifetimeEarnings: number;
}

const BonusOverviewCard: React.FC<BonusOverviewCardProps> = ({
  totalAvailable,
  totalLocked,
  totalCredited,
  lifetimeEarnings
}) => {
  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = amount ?? 0;
    return `₹${safeAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const stats = [
    {
      label: 'Available',
      value: totalAvailable,
      icon: Gift,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      description: 'Ready to unlock'
    },
    {
      label: 'Locked',
      value: totalLocked,
      icon: Lock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      description: 'Complete wagering'
    },
    {
      label: 'Credited',
      value: totalCredited,
      icon: CheckCircle,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description: 'Added to balance'
    },
    {
      label: 'Lifetime',
      value: lifetimeEarnings,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      description: 'Total earned'
    }
  ];

  return (
    <Card className="bg-black/50 border-gold/30">
      <CardHeader>
        <CardTitle className="text-gold flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Bonus Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`${stat.bgColor} ${stat.borderColor} border-2 rounded-lg p-4 text-center transition-all hover:scale-105`}
              >
                <div className="flex justify-center mb-2">
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                  {formatCurrency(stat.value)}
                </div>
                <div className="text-white/80 text-sm font-semibold mb-1">
                  {stat.label}
                </div>
                <div className="text-white/50 text-xs">
                  {stat.description}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BonusOverviewCard;

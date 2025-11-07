/**
 * BonusHistoryTimeline - Shows complete history of all bonus events
 * Timeline view with all actions: added, unlocked, credited, progress
 */

import React, { useState } from 'react';
import { History, Plus, Unlock, CheckCircle, TrendingUp, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BonusTransaction {
  id: string;
  bonusType: 'deposit_bonus' | 'referral_bonus' | 'conditional_bonus' | 'promotional_bonus';
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  action: 'added' | 'locked' | 'unlocked' | 'credited' | 'expired' | 'forfeited' | 'wagering_progress';
  description: string;
  createdAt: string;
}

interface BonusHistoryTimelineProps {
  transactions: BonusTransaction[];
  hasMore: boolean;
  onLoadMore?: () => void;
  loading?: boolean;
}

const BonusHistoryTimeline: React.FC<BonusHistoryTimelineProps> = ({
  transactions,
  hasMore,
  onLoadMore,
  loading = false
}) => {
  const [expanded, setExpanded] = useState(true);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'added':
        return {
          icon: Plus,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500',
          label: 'Bonus Added'
        };
      case 'unlocked':
        return {
          icon: Unlock,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500',
          label: 'Unlocked'
        };
      case 'credited':
        return {
          icon: CheckCircle,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-500',
          label: 'Credited'
        };
      case 'wagering_progress':
        return {
          icon: TrendingUp,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500',
          label: 'Progress'
        };
      case 'expired':
        return {
          icon: Clock,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500',
          label: 'Expired'
        };
      default:
        return {
          icon: History,
          color: 'text-white/60',
          bgColor: 'bg-white/10',
          borderColor: 'border-white/20',
          label: action
        };
    }
  };

  const getBonusTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit_bonus':
        return 'Deposit Bonus';
      case 'referral_bonus':
        return 'Referral Bonus';
      case 'conditional_bonus':
        return 'Conditional Bonus';
      case 'promotional_bonus':
        return 'Promotional Bonus';
      default:
        return type;
    }
  };

  if (transactions.length === 0) {
    return (
      <Card className="bg-black/50 border-gold/30">
        <CardHeader>
          <CardTitle className="text-gold">Bonus History</CardTitle>
          <CardDescription className="text-white/60">
            Track all your bonus events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-white/60">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No bonus history yet</p>
            <p className="text-sm mt-1">Your bonus events will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/50 border-gold/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-gold">Bonus History</CardTitle>
            <CardDescription className="text-white/60">
              Last {transactions.length} events
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-white/60 hover:text-white"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold/50 via-gold/20 to-transparent" />

              {/* Events */}
              <div className="space-y-4">
                {transactions.map((transaction, index) => {
                  const actionConfig = getActionConfig(transaction.action);
                  const ActionIcon = actionConfig.icon;
                  const isBalanceChange = transaction.balanceBefore !== undefined && transaction.balanceAfter !== undefined;

                  return (
                    <div key={transaction.id} className="relative pl-14">
                      {/* Icon circle */}
                      <div className={`absolute left-0 w-12 h-12 rounded-full ${actionConfig.bgColor} border-2 ${actionConfig.borderColor} flex items-center justify-center`}>
                        <ActionIcon className={`w-5 h-5 ${actionConfig.color}`} />
                      </div>

                      {/* Content */}
                      <div className="bg-black/40 rounded-lg p-4 border border-gold/10 hover:border-gold/30 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className={`font-semibold ${actionConfig.color}`}>
                              {actionConfig.label}
                            </div>
                            <div className="text-xs text-white/40 mt-0.5">
                              {getBonusTypeLabel(transaction.bonusType)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              transaction.action === 'credited' ? 'text-green-400' :
                              transaction.action === 'added' ? 'text-blue-400' :
                              'text-white'
                            }`}>
                              {transaction.action === 'credited' || transaction.action === 'added' ? '+' : ''}
                              {formatCurrency(transaction.amount)}
                            </div>
                            <div className="text-xs text-white/40">
                              {formatDate(transaction.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="text-sm text-white/70 mb-2">
                          {transaction.description}
                        </div>

                        {/* Balance change */}
                        {isBalanceChange && (
                          <div className="flex items-center gap-2 text-xs text-white/50 pt-2 border-t border-white/10">
                            <span>Balance:</span>
                            <span>{formatCurrency(transaction.balanceBefore!)}</span>
                            <span>→</span>
                            <span className="text-green-400 font-semibold">
                              {formatCurrency(transaction.balanceAfter!)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  onClick={onLoadMore}
                  disabled={loading}
                  variant="outline"
                  className="border-gold/30 text-gold hover:bg-gold/10"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default BonusHistoryTimeline;

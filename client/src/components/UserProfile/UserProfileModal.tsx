import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Gamepad2, History, CreditCard, UserPlus, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { WalletModal } from '@/components/WalletModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { state: profileState, fetchAnalytics, withdraw } = useUserProfile();
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    if (isOpen && !profileState.analytics) {
      fetchAnalytics();
    }
  }, [isOpen, fetchAnalytics, profileState.analytics]);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleWithdraw = (amount: number) => {
    withdraw(amount, 'bank_transfer');
    setShowWalletModal(false);
  };

  const openWalletModal = (mode: 'deposit' | 'withdraw') => {
    // Redirect to admin WhatsApp with a prefilled message instead of internal modal
    const adminWhatsApp = (import.meta as any)?.env?.VITE_ADMIN_WHATSAPP || '';
    const base = 'https://wa.me/';
    const number = adminWhatsApp.replace(/\D/g, '');
    const text = `Request: ${mode.toUpperCase()}\nPlease assist.`;
    const url = number ? `${base}${number}?text=${encodeURIComponent(text)}` : `${base}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  const analytics = profileState.analytics;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-gradient-to-br from-black to-gray-900 border border-gold/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-gold/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gold/20">
            <h2 className="text-2xl font-bold text-gold">Account Overview</h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="text-gold hover:text-gold-light hover:bg-gold/10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Balance Card */}
            <Card className="bg-gradient-to-r from-gold/10 to-yellow-600/10 border-gold/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-gold flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gold mb-2">
                  {analytics ? formatCurrency(analytics.currentBalance) : 'Loading...'}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-white/60">Today's P&L</div>
                    <div className={`font-semibold ${analytics?.todayProfit !== undefined && analytics.todayProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {analytics ? (analytics.todayProfit >= 0 ? '+' : '') + formatCurrency(analytics.todayProfit) : 'Loading...'}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60">Weekly P&L</div>
                    <div className={`font-semibold ${analytics?.weeklyProfit !== undefined && analytics.weeklyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {analytics ? (analytics.weeklyProfit >= 0 ? '+' : '') + formatCurrency(analytics.weeklyProfit) : 'Loading...'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Deposits */}
              <Card className="bg-black/50 border-gold/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/80 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    Total Deposits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-400">
                    {analytics ? formatCurrency(analytics.totalDeposits) : 'Loading...'}
                  </div>
                </CardContent>
              </Card>

              {/* Total Withdrawals */}
              <Card className="bg-black/50 border-gold/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/80 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    Total Withdrawals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-red-400">
                    {analytics ? formatCurrency(analytics.totalWithdrawals) : 'Loading...'}
                  </div>
                </CardContent>
              </Card>

              {/* Games Played */}
              <Card className="bg-black/50 border-gold/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/80 flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-blue-400" />
                    Games Played
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-400">
                    {analytics ? analytics.gamesPlayed.toLocaleString() : 'Loading...'}
                  </div>
                </CardContent>
              </Card>

              {/* Win Rate */}
              <Card className="bg-black/50 border-gold/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white/80">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-gold">
                      {analytics ? analytics.winRate.toFixed(1) + '%' : 'Loading...'}
                    </div>
                    {analytics && (
                      <Progress 
                        value={analytics.winRate} 
                        className="h-2"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-black/50 border-gold/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white/80">Biggest Win</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-green-400">
                      {formatCurrency(analytics.biggestWin)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/50 border-gold/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white/80">Average Bet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(analytics.averageBet)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/50 border-gold/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white/80">Monthly P&L</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-lg font-bold ${analytics.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(analytics.monthlyProfit >= 0 ? '+' : '') + formatCurrency(analytics.monthlyProfit)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  onClick={() => openWalletModal('withdraw')}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Withdraw
                </Button>

                <Button
                  variant="outline"
                  className="border-gold/30 text-gold hover:bg-gold/10 flex items-center gap-2"
                  onClick={() => {
                    // Navigate to transactions
                    window.location.href = '/profile?tab=transactions';
                  }}
                >
                  <History className="w-4 h-4" />
                  Transactions
                </Button>

                <Button
                  variant="outline"
                  className="border-gold/30 text-gold hover:bg-gold/10 flex items-center gap-2"
                  onClick={() => {
                    // Navigate to game history
                    window.location.href = '/profile?tab=game-history';
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Game History
                </Button>
              </div>
            </div>

            {/* Recent Activity Preview */}
            {profileState.transactions.length > 0 && (
              <Card className="bg-black/50 border-gold/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gold">Recent Transactions</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gold hover:text-gold-light"
                      onClick={() => {
                        window.location.href = '/profile?tab=transactions';
                      }}
                    >
                      View All
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profileState.transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            transaction.type === 'deposit' ? 'bg-green-400' :
                            transaction.type === 'withdrawal' ? 'bg-red-400' :
                            transaction.type === 'win' ? 'bg-blue-400' :
                            'bg-gray-400'
                          }`} />
                          <div>
                            <div className="text-white font-medium capitalize">{transaction.type}</div>
                            <div className="text-white/60 text-sm">{transaction.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            transaction.type === 'deposit' || transaction.type === 'win' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        userBalance={analytics?.currentBalance || 0}
        onWithdraw={handleWithdraw}
      />
    </>
  );
};

export default UserProfileModal;
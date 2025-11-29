import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, TrendingDown, Download, Clock } from "lucide-react";
import { useState } from "react";
import WithdrawalModal from "./WithdrawalModal";

interface WalletCardProps {
  walletBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  minWithdrawal: number;
  earningsToday: number;
  earningsThisMonth: number;
  onWithdrawalSuccess?: () => void;
}

export default function WalletCard({
  walletBalance,
  totalEarned,
  totalWithdrawn,
  minWithdrawal,
  earningsToday,
  earningsThisMonth,
  onWithdrawalSuccess,
}: WalletCardProps) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const canWithdraw = walletBalance >= minWithdrawal;
  
  return (
    <>
      <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-300 flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Partner Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Balance */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">Available Balance</p>
            <p className="text-4xl font-bold text-white mt-1">{formatCurrency(walletBalance)}</p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-black/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <p className="text-gray-400 text-xs">Total Earned</p>
              <p className="text-lg font-semibold text-green-400">{formatCurrency(totalEarned)}</p>
            </div>
            <div className="text-center p-3 bg-black/30 rounded-lg">
              <TrendingDown className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <p className="text-gray-400 text-xs">Total Withdrawn</p>
              <p className="text-lg font-semibold text-blue-400">{formatCurrency(totalWithdrawn)}</p>
            </div>
          </div>
          
          {/* Period Earnings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-purple-900/30 rounded border border-purple-500/20">
              <Clock className="h-4 w-4 text-purple-400 mx-auto mb-1" />
              <p className="text-gray-400 text-xs">Today</p>
              <p className="text-sm font-semibold text-purple-300">{formatCurrency(earningsToday)}</p>
            </div>
            <div className="text-center p-2 bg-blue-900/30 rounded border border-blue-500/20">
              <Clock className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <p className="text-gray-400 text-xs">This Month</p>
              <p className="text-sm font-semibold text-blue-300">{formatCurrency(earningsThisMonth)}</p>
            </div>
          </div>
          
          {/* Withdrawal Button */}
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowWithdrawModal(true)}
            disabled={!canWithdraw}
          >
            <Download className="h-4 w-4 mr-2" />
            Request Withdrawal
          </Button>
          
          {/* Min Withdrawal Warning */}
          {!canWithdraw && (
            <p className="text-xs text-yellow-400 text-center">
              Minimum withdrawal: {formatCurrency(minWithdrawal)}
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Withdrawal Modal */}
      <WithdrawalModal 
        open={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        maxAmount={walletBalance}
        minAmount={minWithdrawal}
        onSuccess={() => {
          setShowWithdrawModal(false);
          onWithdrawalSuccess?.();
        }}
      />
    </>
  );
}
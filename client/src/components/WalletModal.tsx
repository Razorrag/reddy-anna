import { X, Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
}

export function WalletModal({ 
  isOpen, 
  onClose, 
  userBalance,
  onDeposit,
  onWithdraw 
}: WalletModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  if (!isOpen) return null;

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleSubmit = () => {
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    if (activeTab === 'deposit') {
      onDeposit(numAmount);
    } else {
      if (numAmount > userBalance) {
        return;
      }
      onWithdraw(numAmount);
    }

    setAmount("");
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="wallet-modal"
    >
      <div 
        className="legacy-panel rounded-xl max-w-md w-full overflow-hidden shadow-2xl shadow-gold/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gold/30 bg-gradient-to-r from-black/80 to-black/90">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-gold" />
            <h2 className="text-2xl font-bold text-gold">
              Wallet
            </h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-gold hover:text-gold-light"
            data-testid="button-close-wallet"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Balance Display */}
        <div className="p-6 border-b border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
          <div className="text-center">
            <div className="text-sm text-white/60 mb-2">Current Balance</div>
            <div className="text-4xl font-bold text-gold">
              ₹{userBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gold/30">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'deposit'
                ? 'bg-green-500/20 text-green-400 border-b-2 border-green-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowDownToLine className="w-5 h-5" />
              Deposit
            </div>
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'withdraw'
                ? 'bg-red-500/20 text-red-400 border-b-2 border-red-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowUpFromLine className="w-5 h-5" />
              Withdraw
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-sm text-white/80 mb-2">
              Enter Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-bold text-lg">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-black/50 border border-gold/30 rounded-lg pl-10 pr-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-gold/60 transition-colors"
                min="0"
              />
            </div>
            {activeTab === 'withdraw' && amount && parseInt(amount) > userBalance && (
              <div className="text-red-400 text-sm mt-2">
                Insufficient balance
              </div>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm text-white/80 mb-3">
              Quick Select
            </label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  onClick={() => handleQuickAmount(value)}
                  className="bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg py-2 px-3 text-gold font-semibold text-sm transition-colors"
                >
                  ₹{(value / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseInt(amount) <= 0 || (activeTab === 'withdraw' && parseInt(amount) > userBalance)}
            className={`w-full py-6 text-lg font-bold rounded-lg transition-all ${
              activeTab === 'deposit'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {activeTab === 'deposit' ? (
              <>
                <ArrowDownToLine className="w-5 h-5 mr-2" />
                Deposit ₹{amount || '0'}
              </>
            ) : (
              <>
                <ArrowUpFromLine className="w-5 h-5 mr-2" />
                Withdraw ₹{amount || '0'}
              </>
            )}
          </Button>

          {/* Info Text */}
          <div className="text-center text-xs text-white/50">
            {activeTab === 'deposit' 
              ? 'Deposits are instant and secure'
              : 'Withdrawals are processed within 24 hours'
            }
          </div>
        </div>
      </div>
    </div>
  );
}

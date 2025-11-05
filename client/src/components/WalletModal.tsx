import { X, Wallet, ArrowDownToLine, ArrowUpFromLine, Gift, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { apiClient } from "@/lib/api-client";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  onBalanceUpdate?: (newBalance: number) => void; // Optional callback for balance updates
}

export function WalletModal({
  isOpen,
  onClose,
  userBalance,
  onBalanceUpdate
}: WalletModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [isLoading, setIsLoading] = useState(false);
  const { state: userProfileState, claimBonus, fetchBonusInfo } = useUserProfile();

  // Fetch bonus info when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBonusInfo();
    }
  }, [isOpen, fetchBonusInfo]);

  // Listen for bonus updates
  useEffect(() => {
    const handleBonusUpdate = () => {
      fetchBonusInfo();
    };

    window.addEventListener('bonus_update', handleBonusUpdate);
    return () => {
      window.removeEventListener('bonus_update', handleBonusUpdate);
    };
  }, [fetchBonusInfo]);

  if (!isOpen) return null;

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleSubmit = async () => {
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      // Create payment request instead of direct balance update
      const response = await apiClient.post('/payment-requests', {
        amount: numAmount,
        paymentMethod: activeTab === 'deposit' ? 'UPI' : 'Bank Transfer', // Default method
        requestType: activeTab === 'deposit' ? 'deposit' : 'withdrawal' // ✅ FIX: Map 'withdraw' to 'withdrawal'
      });

      if (response.success) {
        // Refresh bonus info after deposit request (will be applied when admin approves)
        if (activeTab === 'deposit') {
          // Fetch bonus info after a short delay to allow backend processing
          setTimeout(() => {
            fetchBonusInfo();
          }, 2000);
        }
        
        // ✅ IMPROVED: Clear messaging about processing
        const successMessage = activeTab === 'deposit'
          ? `Deposit request submitted successfully!\n\nYour balance will be credited after admin approval.\nYou'll receive 5% bonus on approval!\n\nOpening WhatsApp to contact admin...`
          : `Withdrawal request submitted successfully!\n\nYour balance will be deducted after admin approval.\nThis prevents errors and ensures security.\n\nOpening WhatsApp to contact admin...`;
        
        alert(successMessage);
        
        // CRITICAL FIX: Auto-open WhatsApp with pre-filled message
        try {
          const whatsappResponse = await apiClient.post('/whatsapp/send-request', {
            userId: response.data.userId || 'unknown',
            userPhone: response.data.userPhone || 'unknown',
            requestType: activeTab.toUpperCase(),
            message: `New ${activeTab} request for ₹${numAmount.toLocaleString('en-IN')}. Request ID: ${response.requestId}`,
            amount: numAmount,
            isUrgent: false,
            metadata: { requestId: response.requestId }
          });

          if (whatsappResponse.success && whatsappResponse.whatsappUrl) {
            // Open WhatsApp in new tab
            window.open(whatsappResponse.whatsappUrl, '_blank');
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification failed (non-critical):', whatsappError);
          // Don't fail the request if WhatsApp fails
        }
        
        setAmount("");
        onClose();
      } else {
        alert(`Failed to submit ${activeTab} request: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error(`${activeTab} request failed:`, error);
      alert(`Failed to submit ${activeTab} request: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
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

        {/* Bonus Information */}
        {userProfileState.bonusInfo && userProfileState.bonusInfo.totalBonus > 0 && (
          <div className="p-4 border-b border-gold/30 bg-gradient-to-br from-green-500/10 to-blue-500/10">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-white/60 mb-1">
                  <Gift className="w-3 h-3" />
                  Deposit Bonus
                </div>
                <div className="text-lg font-bold text-green-400">
                  ₹{userProfileState.bonusInfo.depositBonus.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-white/60 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Referral Bonus
                </div>
                <div className="text-lg font-bold text-blue-400">
                  ₹{userProfileState.bonusInfo.referralBonus.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            
            {/* Claim Bonus Button */}
            <div className="mt-3 text-center">
              <Button
                onClick={async () => {
                  const result = await claimBonus();
                  if (result.success) {
                    // Success feedback could be added here
                    console.log('Bonus claimed successfully');
                  } else {
                    // Error feedback could be added here
                    console.error('Failed to claim bonus:', result.error);
                  }
                }}
                disabled={userProfileState.loading || userProfileState.bonusInfo.totalBonus === 0}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Gift className="w-4 h-4 mr-2" />
                Claim ₹{userProfileState.bonusInfo.totalBonus.toLocaleString('en-IN')} Bonus
              </Button>
            </div>
          </div>
        )}

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
            disabled={isLoading || !amount || parseInt(amount) <= 0 || (activeTab === 'withdraw' && parseInt(amount) > userBalance)}
            className={`w-full py-6 text-lg font-bold rounded-lg transition-all ${
              activeTab === 'deposit'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                {activeTab === 'deposit' ? (
                  <>
                    <ArrowDownToLine className="w-5 h-5 mr-2" />
                    Request Deposit ₹{amount || '0'}
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="w-5 h-5 mr-2" />
                    Request Withdraw ₹{amount || '0'}
                  </>
                )}
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

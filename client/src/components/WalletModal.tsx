import { X, Wallet, ArrowDownToLine, ArrowUpFromLine, Gift, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useBalance } from "@/contexts/BalanceContext";
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
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [upiId, setUpiId] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>(''); // ✅ FIX 2: Add mobile number state
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const { state: userProfileState, claimBonus, fetchBonusInfo } = useUserProfile();
  
  // ✅ FIX: Use BalanceContext directly to avoid showing 0
  const { balance: contextBalance, refreshBalance } = useBalance();
  const displayBalance = contextBalance || userBalance || 0;

  // Fetch bonus info and refresh balance when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBonusInfo();
      // ✅ FIX: Refresh balance to ensure we have latest value
      refreshBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);  // ← Only depend on isOpen to prevent loop

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
      // ✅ FIX 4: Updated validation logic - accept mobile number OR UPI ID
      if (activeTab === 'withdraw') {
        if ((paymentMethod === 'UPI' || paymentMethod === 'PhonePe' || paymentMethod === 'GPay' || paymentMethod === 'Paytm') 
            && !upiId.trim() && !mobileNumber.trim()) {
          alert('Please enter your UPI ID or Mobile Number');
          setIsLoading(false);
          return;
        }
        if (paymentMethod === 'Bank Transfer' && (!accountNumber.trim() || !ifscCode.trim() || !accountName.trim())) {
          alert('Please fill in all bank details');
          setIsLoading(false);
          return;
        }
      }

      // ✅ FIX 5: Include mobile number in payment details
      const paymentDetails: any = {};
      if (activeTab === 'withdraw') {
        if (paymentMethod === 'UPI' || paymentMethod === 'PhonePe' || paymentMethod === 'GPay' || paymentMethod === 'Paytm') {
          if (mobileNumber.trim()) {
            paymentDetails.mobileNumber = mobileNumber;
          }
          if (upiId.trim()) {
            paymentDetails.upiId = upiId;
          }
        } else if (paymentMethod === 'Bank Transfer') {
          paymentDetails.accountNumber = accountNumber;
          paymentDetails.ifscCode = ifscCode;
          paymentDetails.accountName = accountName;
        }
      }

      // Create payment request instead of direct balance update
      const response = await apiClient.post('/payment-requests', {
        amount: numAmount,
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetails,
        requestType: activeTab === 'deposit' ? 'deposit' : 'withdrawal' // ✅ FIX: Map 'withdraw' to 'withdrawal'
      }) as any;

      // ✅ FIX 6: Direct WhatsApp integration (no backend API)
      if (response.success) {
        // Refresh bonus info after deposit request
        if (activeTab === 'deposit') {
          setTimeout(() => {
            fetchBonusInfo();
          }, 2000);
        }
        
        // ✅ FIX: Construct WhatsApp deep link to open admin chat directly
        // Get admin WhatsApp number from env or use default
        const adminWhatsApp = (import.meta as any)?.env?.VITE_ADMIN_WHATSAPP || '918686886632'; // Default admin number
        const adminNumber = adminWhatsApp.replace(/\D/g, ''); // Remove all non-digits
        
        let whatsappMessage = '';
        
        if (activeTab === 'deposit') {
          // Simple deposit message
          whatsappMessage = `Hello! I want to deposit ₹${numAmount.toLocaleString('en-IN')} to my account.`;
        } else {
          // Detailed withdrawal message
          whatsappMessage = `Hello! I want to withdraw ₹${numAmount.toLocaleString('en-IN')}.\n\n`;
          whatsappMessage += `Payment Details:\n`;
          whatsappMessage += `Mode: ${paymentMethod}\n`;
          
          if (paymentMethod === 'UPI' || paymentMethod === 'PhonePe' || paymentMethod === 'GPay' || paymentMethod === 'Paytm') {
            if (mobileNumber.trim()) {
              whatsappMessage += `Mobile: ${mobileNumber}\n`;
            }
            if (upiId.trim()) {
              whatsappMessage += `UPI ID: ${upiId}\n`;
            }
          } else if (paymentMethod === 'Bank Transfer') {
            whatsappMessage += `Account: ${accountNumber}\n`;
            whatsappMessage += `IFSC: ${ifscCode}\n`;
            whatsappMessage += `Name: ${accountName}\n`;
          }
          
          whatsappMessage += `\nRequest ID: ${response.requestId}`;
        }
        
        // ✅ CRITICAL FIX: Properly encode the message for WhatsApp URL
        // Use encodeURIComponent for proper URL encoding
        const encodedMessage = encodeURIComponent(whatsappMessage);
        
        // Construct WhatsApp deep link - this will open the specific admin chat
        const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodedMessage}`;
        
        console.log('📱 Opening WhatsApp:', {
          adminNumber,
          messageLength: whatsappMessage.length,
          url: whatsappUrl
        });
        
        // Show success message
        const successMessage = activeTab === 'deposit'
          ? `✅ Deposit request submitted!\n\n💰 Amount: ₹${numAmount.toLocaleString('en-IN')}\n🎁 You'll receive 5% bonus on approval!\n\nOpening WhatsApp to complete your request...` 
          : `✅ Withdrawal request submitted!\n\n💰 Amount: ₹${numAmount.toLocaleString('en-IN')}\n⏳ Processing within 24 hours\n\nOpening WhatsApp to send payment details...`;
        
        alert(successMessage);
        
        // ✅ FIX: Open WhatsApp with pre-filled message
        // Try multiple methods to ensure it works on all devices
        try {
          // Method 1: Direct window.open (works on most browsers)
          const opened = window.open(whatsappUrl, '_blank');
          
          // Method 2: If popup blocked, try location.href
          if (!opened || opened.closed || typeof opened.closed === 'undefined') {
            console.log('⚠️ Popup blocked, trying location.href');
            window.location.href = whatsappUrl;
          }
        } catch (error) {
          console.error('❌ Error opening WhatsApp:', error);
          // Fallback: Try location.href
          window.location.href = whatsappUrl;
        }
        
        // Clear form and close modal
        setAmount("");
        setUpiId('');
        setMobileNumber('');
        setAccountNumber('');
        setIfscCode('');
        setAccountName('');
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="wallet-modal"
    >
      <div 
        className="legacy-panel rounded-xl max-w-md w-full shadow-2xl shadow-gold/20 my-8 max-h-[90vh] flex flex-col"
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
              ₹{displayBalance.toLocaleString('en-IN')}
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

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1">
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
            {activeTab === 'withdraw' && amount && parseInt(amount) > displayBalance && (
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

          {/* ✅ FIX 1: Payment Method Selection - WITHDRAWAL ONLY */}
          {activeTab === 'withdraw' && (
            <div>
              <label className="block text-sm text-white/80 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-black/50 border border-gold/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold/60 transition-colors"
              >
                <option value="UPI">UPI</option>
                <option value="PhonePe">PhonePe</option>
                <option value="GPay">Google Pay</option>
                <option value="Paytm">Paytm</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          )}

          {/* Payment Details (Withdrawal Only) */}
          {activeTab === 'withdraw' && (
            <div className="space-y-4 border border-gold/20 rounded-lg p-4 bg-black/30">
              <div className="text-sm text-gold font-semibold mb-3">
                Payment Details
              </div>
              
              {/* ✅ FIX 3: Add mobile number input field */}
              {(paymentMethod === 'UPI' || paymentMethod === 'PhonePe' || paymentMethod === 'GPay' || paymentMethod === 'Paytm') && (
                <>
                  <div>
                    <label className="block text-sm text-white/80 mb-2">
                      Mobile Number (for PhonePe/GPay/Paytm)
                    </label>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      maxLength={10}
                      className="w-full bg-black/50 border border-gold/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/80 mb-2">
                      UPI ID (Alternative)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      className="w-full bg-black/50 border border-gold/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold/60 transition-colors"
                    />
                    <p className="text-xs text-white/40 mt-1">
                      Enter either mobile number OR UPI ID
                    </p>
                  </div>
                </>
              )}

              {paymentMethod === 'Bank Transfer' && (
                <>
                  <div>
                    <label className="block text-sm text-white/80 mb-2">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="1234567890"
                      className="w-full bg-black/50 border border-gold/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/80 mb-2">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                      className="w-full bg-black/50 border border-gold/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/80 mb-2">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-black/50 border border-gold/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold/60 transition-colors"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !amount || parseInt(amount) <= 0 || (activeTab === 'withdraw' && parseInt(amount) > displayBalance)}
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
    </div>
  );
}

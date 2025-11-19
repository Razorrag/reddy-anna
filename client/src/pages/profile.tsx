import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Copy,
  Filter,
  RefreshCw,
  Download,
  ChevronLeft,
  Gift,
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Share2,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { getPaymentWhatsAppNumber, getPaymentWhatsAppNumberAsync, createWhatsAppUrl } from '@/lib/whatsapp-helper';
import { copyToClipboard } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useBalance } from '@/contexts/BalanceContext';
import { WalletModal } from '@/components/WalletModal';
import { apiClient } from '@/lib/api-client';
import { useNotification } from '@/contexts/NotificationContext';
import {
  BonusOverviewCard,
  DepositBonusesList,
  ReferralBonusesList,
  BonusHistoryTimeline,
  BonusWallet
} from '@/components/Bonus';

const Profile: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const {
    state: profileState,
    fetchTransactions,
    fetchGameHistory,
    updateProfile,
    fetchReferralData,
    fetchUserProfile  // ✅ ADDED: Profile data fetcher
  } = useUserProfile();
  const { balance, refreshBalance } = useBalance();
  const { showNotification } = useNotification();
  
  // Payment requests state
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Deposit/Withdrawal form state
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [paymentMethodSelected, setPaymentMethodSelected] = useState('UPI');
  const [upiId, setUpiId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submittingTransaction, setSubmittingTransaction] = useState(false);
  
  // WhatsApp deeplink helper
  const openWhatsAppRequest = async (requestType: 'deposit' | 'withdraw') => {
    const phone = (user && (user.phone || user.id)) || '';
    const adminNumber = await getPaymentWhatsAppNumberAsync();
    const text = `Request: ${requestType.toUpperCase()}\nUser: ${phone}\nPlease assist.`;
    const url = createWhatsAppUrl(adminNumber, text);
    window.open(url, '_blank');
  };

  const [activeTab, setActiveTab] = useState('profile');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  
  // Bonus data state
  const [bonusSummary, setBonusSummary] = useState<any>(null);
  const [depositBonuses, setDepositBonuses] = useState<any[]>([]);
  const [referralBonuses, setReferralBonuses] = useState<any[]>([]);
  const [bonusTransactions, setBonusTransactions] = useState<any[]>([]);
  const [loadingBonuses, setLoadingBonuses] = useState(false);
  const [bonusHasMore, setBonusHasMore] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    mobile: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: ''
  });

  // ✅ FIX: Fetch profile data on page mount (cached for 1 hour)
  useEffect(() => {
    if (user && !profileState.user && !profileState.loading) {
      console.log('📥 Profile page: Fetching user profile data');
      fetchUserProfile();
    }
  }, [user, profileState.user, profileState.loading]); // ✅ FIX: Removed fetchUserProfile from dependencies to prevent infinite loops

  // Parse URL parameters for tab selection
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const tab = params.get('tab');
    if (tab) {
      // Redirect old 'overview' links to 'profile'
      setActiveTab(tab === 'overview' ? 'profile' : tab);
    }
  }, [location]);

  // ✅ FIX: Fetch referral data when referral tab is active (cached for 24 hours)
  useEffect(() => {
    if (activeTab === 'referral' && user) {
      // Only fetch if not already loaded (cache will be checked inside fetchReferralData)
      if (!profileState.referralData) {
        fetchReferralData();
      }
    }
  }, [activeTab, user]); // ✅ FIX: Removed fetchReferralData from dependencies to prevent infinite loops

  // Fetch transactions when transactions tab is active
  useEffect(() => {
    if (activeTab === 'transactions' && user) {
      if (profileState.transactions.length === 0) {
        fetchTransactions(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user, profileState.transactions.length]);  // ← Remove fetchTransactions to prevent loop

  // Fetch game history when game-history tab is active
  useEffect(() => {
    if (activeTab === 'game-history' && user) {
      if (profileState.gameHistory.length === 0) {
        fetchGameHistory(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user, profileState.gameHistory.length]);  // ← Remove fetchGameHistory to prevent loop

  // Fetch bonus data when bonuses tab is active
  useEffect(() => {
    const fetchBonusData = async () => {
      if (activeTab === 'bonuses' && user) {
        setLoadingBonuses(true);
        try {
          // Fetch all bonus data in parallel
          const [summaryRes, depositRes, referralRes, transactionsRes] = await Promise.all([
            apiClient.get('/api/user/bonus-summary'),
            apiClient.get('/api/user/deposit-bonuses'),
            apiClient.get('/api/user/referral-bonuses'),
            apiClient.get('/api/user/bonus-transactions?limit=20&offset=0')
          ]);

          // Extract data from API response
          const summaryData = (summaryRes as any)?.data || (summaryRes as any);
          const depositData = (depositRes as any)?.data || (depositRes as any);
          const referralData = (referralRes as any)?.data || (referralRes as any);
          
          console.log('✅ Bonus data received:', {
            summary: summaryData,
            deposits: depositData,
            referrals: referralData
          });

          setBonusSummary(summaryData);
          setDepositBonuses(Array.isArray(depositData) ? depositData : []);
          setReferralBonuses(Array.isArray(referralData) ? referralData : []);
          
          // ✅ FIX: Handle both wrapped and unwrapped API responses
          const transactionsArray = Array.isArray(transactionsRes)
            ? transactionsRes
            : Array.isArray((transactionsRes as any).data)
              ? (transactionsRes as any).data
              : [];
          
          setBonusTransactions(transactionsArray);
          setBonusHasMore(
            (transactionsRes as any).hasMore ??
            (transactionsRes as any).data?.hasMore ??
            false
          );
        } catch (error) {
          console.error('Failed to fetch bonus data:', error);
          showNotification('Failed to load bonus data', 'error');
        } finally {
          setLoadingBonuses(false);
        }
      }
    };

    fetchBonusData();
  }, [activeTab, user, showNotification]);

  // Listen for real-time bonus updates
  useEffect(() => {
    const handleBonusUpdate = (event: Event) => {
      console.log('Bonus update received, refreshing data...');
      if (activeTab === 'bonuses' && user) {
        // Refresh bonus data when update received
        const fetchBonusData = async () => {
          setLoadingBonuses(true);
          try {
            const [summaryRes, depositRes, referralRes, transactionsRes] = await Promise.all([
              apiClient.get('/api/user/bonus-summary'),
              apiClient.get('/api/user/deposit-bonuses'),
              apiClient.get('/api/user/referral-bonuses'),
              apiClient.get('/api/user/bonus-transactions?limit=20&offset=0')
            ]);

            setBonusSummary((summaryRes as any).data || summaryRes);
            setDepositBonuses((depositRes as any).data || depositRes);
            setReferralBonuses((referralRes as any).data || referralRes);
            
            const transactionsArray = Array.isArray(transactionsRes)
              ? transactionsRes
              : Array.isArray((transactionsRes as any).data)
                ? (transactionsRes as any).data
                : [];
            
            setBonusTransactions(transactionsArray);
          } catch (error) {
            console.error('Failed to refresh bonus data:', error);
          } finally {
            setLoadingBonuses(false);
          }
        };
        fetchBonusData();
      }
    };
    
    window.addEventListener('bonus_update', handleBonusUpdate);
    return () => window.removeEventListener('bonus_update', handleBonusUpdate);
  }, [activeTab, user]);

  // Fetch payment requests when transactions tab is active
  const fetchPaymentRequests = async () => {
    if (!user) return;
    
    try {
      setLoadingPaymentRequests(true);
      const response = await apiClient.get('/api/payment-requests') as any;
      if (response.success && response.data) {
        setPaymentRequests(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment requests:', error);
    } finally {
      setLoadingPaymentRequests(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions' && user) {
      fetchPaymentRequests();
    }
  }, [activeTab, user]);

  // Initialize profile form when user data is available
  useEffect(() => {
    if (profileState.user) {
      setProfileForm({
        fullName: profileState.user.fullName || '',
        mobile: profileState.user.mobile || '',
        dateOfBirth: profileState.user.dateOfBirth ? new Date(profileState.user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: profileState.user.gender || '',
        address: profileState.user.address || '',
        city: profileState.user.city || '',
        state: profileState.user.state || '',
        pincode: profileState.user.pincode || '',
        country: profileState.user.country || ''
      });
    }
  }, [profileState.user]);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleProfileUpdate = async () => {
    try {
      const profileData = {
        ...profileForm,
        dateOfBirth: profileForm.dateOfBirth ? new Date(profileForm.dateOfBirth) : undefined
      };
      await updateProfile(profileData);
      setEditingProfile(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };


  const openWalletModal = () => {
    setShowWalletModal(true);
  };

  const handleCopyToClipboard = async (text: string) => {
    // ✅ FIX: Use shared utility with proper HTTPS/secure context checks
    const success = await copyToClipboard(text);
    if (success) {
      showNotification('Referral code copied to clipboard!', 'success');
    } else {
      // ✅ FIX: Show specific error for non-HTTPS contexts
      if (!window.isSecureContext) {
        showNotification('Clipboard access requires HTTPS. Please use a secure connection.', 'error');
      } else {
        showNotification('Failed to copy referral code. Please try again.', 'error');
      }
    }
  };

  const loadMoreTransactions = () => {
    if (profileState.pagination.transactions.hasMore) {
      fetchTransactions(true);
    }
  };

  const loadMoreGameHistory = () => {
    if (profileState.pagination.gameHistory.hasMore) {
      fetchGameHistory(true);
    }
  };

  // ✅ Listen for payment request updates
  useEffect(() => {
    const handlePaymentUpdate = (event: CustomEvent) => {
      // Refresh payment requests
      if (activeTab === 'transactions') {
        fetchPaymentRequests();
      }
      
      // Refresh balance
      refreshBalance();
      
      // Refresh transactions
      fetchTransactions(false);
      
      // Show notification
      const { message } = event.detail;
      if (message) {
        showNotification(message, 'success');
      }
    };
    
    window.addEventListener('payment-request-updated', handlePaymentUpdate as EventListener);
    return () => {
      window.removeEventListener('payment-request-updated', handlePaymentUpdate as EventListener);
    };
  }, [activeTab, fetchPaymentRequests, refreshBalance, fetchTransactions, showNotification]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Redirecting to login...</div>
      </div>
    );
  }

  const analytics = profileState.analytics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900">
      {/* Header - Mobile Optimized */}
      <div className="bg-black/50 border-b border-gold/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Avatar className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
              <AvatarImage src={profileState.user?.profilePicture} alt={user?.username || 'User'} />
              <AvatarFallback className="bg-gold/20 text-gold text-lg sm:text-xl font-semibold">
                {user?.username?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gold truncate">{user?.full_name || user?.phone}</h1>
              <p className="text-sm sm:text-base text-white/80 truncate">{user?.phone}</p>
            </div>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              size="sm"
              className="border-gold/30 text-gold hover:bg-gold/10 flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Mobile: Scrollable horizontal tabs with indicators */}
          <div className="relative overflow-x-auto -mx-4 sm:mx-0">
            {/* Left scroll indicator */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-violet-900 to-transparent pointer-events-none sm:hidden z-10" />
            
            <TabsList className="inline-flex sm:grid w-auto sm:w-full min-w-full sm:min-w-0 grid-cols-5 bg-black/50 border-gold/30 px-4 sm:px-0">
              {/* Right scroll indicator */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-violet-900 to-transparent pointer-events-none sm:hidden z-10" />
              <TabsTrigger value="profile" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                Profile
              </TabsTrigger>
              <TabsTrigger value="transactions" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="game-history" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                Game History
              </TabsTrigger>
              <TabsTrigger value="bonuses" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                <Gift className="w-3 h-3 sm:w-4 sm:h-4 mr-1 inline" />
                <span className="hidden xs:inline">Bonuses</span>
                <span className="xs:hidden">Bonus</span>
              </TabsTrigger>
              <TabsTrigger value="referral" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                Referral
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Profile Tab - Simplified */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-black/50 border-gold/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gold">Personal Information</CardTitle>
                  <Button
                    onClick={() => setEditingProfile(!editingProfile)}
                    variant={editingProfile ? "default" : "outline"}
                    className={editingProfile ? "bg-green-600 hover:bg-green-700" : "border-gold/30 text-gold hover:bg-gold/10"}
                  >
                    {editingProfile ? 'Save Changes' : 'Edit Profile'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-gold">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      disabled={!editingProfile}
                      className="bg-black/50 border-gold/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile" className="text-gold">Mobile Number</Label>
                    <Input
                      id="mobile"
                      value={profileForm.mobile || user.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, mobile: e.target.value }))}
                      disabled={!editingProfile}
                      className="bg-black/50 border-gold/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-gold">Reset Password</Label>
                    <Button
                      onClick={() => {
                        // Add password reset logic here
                        alert('Password reset functionality to be implemented');
                      }}
                      variant="outline"
                      className="w-full border-gold/30 text-gold hover:bg-gold/10 mt-2"
                    >
                      Change Password
                    </Button>
                  </div>
                </div>

                {editingProfile && (
                  <div className="flex gap-4 pt-4 border-t border-gold/20 max-w-md mx-auto">
                    <Button
                      onClick={handleProfileUpdate}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Save Changes
                    </Button>
                    <Button
                      onClick={() => setEditingProfile(false)}
                      variant="outline"
                      className="flex-1 border-gold/30 text-gold hover:bg-gold/10"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-gold/20 my-6 max-w-md mx-auto"></div>

                {/* Account Actions */}
                <div className="max-w-md mx-auto space-y-4">
                  <h3 className="text-gold font-semibold text-lg">Account Actions</h3>
                  
                  <Button
                    onClick={() => {
                      logout(); // This will clear auth and redirect to landing page
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Sign Out
                  </Button>
                  
                  <Button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                        // Add delete account logic here
                        alert('Delete account functionality to be implemented');
                      }
                    }}
                    variant="outline"
                    className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Quick Actions - Deposit & Withdraw */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30 hover:border-green-500/50 transition-all cursor-pointer"
                onClick={() => {
                  setShowDepositForm(true);
                  setShowWithdrawForm(false);
                  setTransactionAmount('');
                }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <ArrowDownToLine className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-green-400 mb-1">Deposit Money</h3>
                      <p className="text-white/60 text-xs sm:text-sm">Add funds to your wallet instantly</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30 hover:border-red-500/50 transition-all cursor-pointer"
                onClick={() => {
                  setShowWithdrawForm(true);
                  setShowDepositForm(false);
                  setTransactionAmount('');
                }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <ArrowUpFromLine className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-red-400 mb-1">Withdraw Money</h3>
                      <p className="text-white/60 text-xs sm:text-sm">Transfer funds to your account</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Deposit Form */}
            {showDepositForm && (
              <Card className="bg-black/50 border-green-500/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-green-400 flex items-center gap-2">
                      <ArrowDownToLine className="w-5 h-5" />
                      Deposit Money
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowDepositForm(false);
                        setTransactionAmount('');
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Amount Input */}
                  <div>
                    <Label className="text-white/80 mb-2">Enter Amount</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-bold text-lg">₹</span>
                      <Input
                        type="number"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        placeholder="0"
                        className="bg-black/50 border-green-500/30 text-white text-lg font-semibold pl-10 focus:border-green-500/60"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div>
                    <Label className="text-white/80 mb-3">Quick Select</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[1000, 5000, 10000, 25000, 50000, 100000].map((value) => (
                        <Button
                          key={value}
                          onClick={() => setTransactionAmount(value.toString())}
                          variant="outline"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/20"
                        >
                          ₹{(value / 1000).toFixed(0)}K
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <Label className="text-white/80 mb-2">Payment Method</Label>
                    <Select value={paymentMethodSelected} onValueChange={setPaymentMethodSelected}>
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-white focus:border-green-500/60">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-green-500/30 z-[9999]">
                        <SelectItem value="UPI" className="text-white hover:bg-green-500/20 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            UPI
                          </div>
                        </SelectItem>
                        <SelectItem value="Paytm" className="text-white hover:bg-green-500/20 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Paytm
                          </div>
                        </SelectItem>
                        <SelectItem value="PhonePe" className="text-white hover:bg-green-500/20 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            PhonePe
                          </div>
                        </SelectItem>
                        <SelectItem value="Bank Transfer" className="text-white hover:bg-green-500/20 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Bank Transfer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Deposit Info */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Gift className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-white/80">
                        <p className="font-semibold text-green-400 mb-1">🎁 Get 5% Bonus!</p>
                        <p className="text-white/60">You'll receive a 5% deposit bonus on approval. Bonus can be claimed after meeting wagering requirements.</p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={async () => {
                      const numAmount = parseInt(transactionAmount);
                      if (isNaN(numAmount) || numAmount <= 0) {
                        showNotification('Please enter a valid amount', 'error');
                        return;
                      }

                      setSubmittingTransaction(true);
                      try {
                        const response = await apiClient.post('/api/payment-requests', {
                          amount: numAmount,
                          paymentMethod: paymentMethodSelected,
                          paymentDetails: {},
                          requestType: 'deposit'
                        }) as any;

                        if (response.success) {
                          const adminNumber = await getPaymentWhatsAppNumberAsync();
                          const whatsappMessage = `Hello! I want to deposit ₹${numAmount.toLocaleString('en-IN')} using ${paymentMethodSelected}.`;
                          const whatsappUrl = createWhatsAppUrl(adminNumber, whatsappMessage);

                          showNotification(`✅ Deposit request submitted! Amount: ₹${numAmount.toLocaleString('en-IN')}`, 'success');
                          
                          try {
                            const opened = window.open(whatsappUrl, '_blank');
                            if (!opened || opened.closed || typeof opened.closed === 'undefined') {
                              window.location.href = whatsappUrl;
                            }
                          } catch (error) {
                            window.location.href = whatsappUrl;
                          }

                          setTransactionAmount('');
                          setShowDepositForm(false);
                          fetchPaymentRequests();
                        } else {
                          showNotification(`Failed to submit deposit request: ${response.error || 'Unknown error'}`, 'error');
                        }
                      } catch (error: any) {
                        console.error('Deposit request failed:', error);
                        showNotification(`Failed to submit deposit request: ${error.message || 'Unknown error'}`, 'error');
                      } finally {
                        setSubmittingTransaction(false);
                      }
                    }}
                    disabled={submittingTransaction || !transactionAmount || parseInt(transactionAmount) <= 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold"
                  >
                    {submittingTransaction ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="w-5 h-5 mr-2" />
                        Request Deposit ₹{transactionAmount || '0'}
                      </>
                    )}
                  </Button>

                  <div className="text-center text-xs text-white/50">
                    Deposits are instant and secure. You'll be redirected to WhatsApp to complete your request.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Withdraw Form */}
            {showWithdrawForm && (
              <Card className="bg-black/50 border-red-500/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-red-400 flex items-center gap-2">
                      <ArrowUpFromLine className="w-5 h-5" />
                      Withdraw Money
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowWithdrawForm(false);
                        setTransactionAmount('');
                        setUpiId('');
                        setMobileNumber('');
                        setAccountNumber('');
                        setIfscCode('');
                        setAccountName('');
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Balance Display */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-sm text-white/60 mb-1">Available Balance</div>
                      <div className="text-3xl font-bold text-red-400">₹{balance.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <Label className="text-white/80 mb-2">Enter Amount</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 font-bold text-lg">₹</span>
                      <Input
                        type="number"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        placeholder="0"
                        className="bg-black/50 border-red-500/30 text-white text-lg font-semibold pl-10 focus:border-red-500/60"
                        min="0"
                      />
                    </div>
                    {transactionAmount && parseInt(transactionAmount) > balance && (
                      <div className="text-red-400 text-sm mt-2 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Insufficient balance
                      </div>
                    )}
                  </div>

                  {/* Quick Amount Buttons */}
                  <div>
                    <Label className="text-white/80 mb-3">Quick Select</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[1000, 5000, 10000, 25000, 50000, 100000].map((value) => (
                        <Button
                          key={value}
                          onClick={() => setTransactionAmount(value.toString())}
                          variant="outline"
                          disabled={value > balance}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-30"
                        >
                          ₹{(value / 1000).toFixed(0)}K
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <Label className="text-white/80 mb-2">Payment Method</Label>
                    <Select value={paymentMethodSelected} onValueChange={setPaymentMethodSelected}>
                      <SelectTrigger className="bg-black/50 border-red-500/30 text-white focus:border-red-500/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-red-500/30">
                        <SelectItem value="UPI" className="text-white hover:bg-red-500/20">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            UPI
                          </div>
                        </SelectItem>
                        <SelectItem value="PhonePe" className="text-white hover:bg-red-500/20">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            PhonePe
                          </div>
                        </SelectItem>
                        <SelectItem value="GPay" className="text-white hover:bg-red-500/20">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Google Pay
                          </div>
                        </SelectItem>
                        <SelectItem value="Paytm" className="text-white hover:bg-red-500/20">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Paytm
                          </div>
                        </SelectItem>
                        <SelectItem value="Bank Transfer" className="text-white hover:bg-red-500/20">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Bank Transfer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Details */}
                  <div className="border border-red-500/20 rounded-lg p-4 bg-black/30 space-y-4">
                    <div className="text-sm text-red-400 font-semibold mb-3">Payment Details</div>
                    
                    {/* UPI: Show only UPI ID field */}
                    {paymentMethodSelected === 'UPI' && (
                      <div>
                        <Label className="text-white/80 mb-2">UPI ID *</Label>
                        <Input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@upi"
                          className="bg-black/50 border-red-500/30 text-white focus:border-red-500/60"
                        />
                      </div>
                    )}

                    {/* PhonePe/GPay/Paytm: Show only Mobile Number field */}
                    {(paymentMethodSelected === 'PhonePe' || paymentMethodSelected === 'GPay' || paymentMethodSelected === 'Paytm') && (
                      <div>
                        <Label className="text-white/80 mb-2">Mobile Number *</Label>
                        <Input
                          type="tel"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          maxLength={10}
                          className="bg-black/50 border-red-500/30 text-white focus:border-red-500/60"
                        />
                      </div>
                    )}

                    {paymentMethodSelected === 'Bank Transfer' && (
                      <>
                        <div>
                          <Label className="text-white/80 mb-2">Account Number *</Label>
                          <Input
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="1234567890"
                            className="bg-black/50 border-red-500/30 text-white focus:border-red-500/60"
                          />
                        </div>
                        <div>
                          <Label className="text-white/80 mb-2">IFSC Code *</Label>
                          <Input
                            type="text"
                            value={ifscCode}
                            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                            placeholder="SBIN0001234"
                            className="bg-black/50 border-red-500/30 text-white focus:border-red-500/60"
                          />
                        </div>
                        <div>
                          <Label className="text-white/80 mb-2">Account Holder Name *</Label>
                          <Input
                            type="text"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="John Doe"
                            className="bg-black/50 border-red-500/30 text-white focus:border-red-500/60"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={async () => {
                      const numAmount = parseInt(transactionAmount);
                      if (isNaN(numAmount) || numAmount <= 0) {
                        showNotification('Please enter a valid amount', 'error');
                        return;
                      }

                      if (numAmount > balance) {
                        showNotification('Insufficient balance', 'error');
                        return;
                      }

                      // Validate payment details based on method
                      if (paymentMethodSelected === 'UPI' && !upiId.trim()) {
                        showNotification('Please enter your UPI ID', 'error');
                        return;
                      }
                      if ((paymentMethodSelected === 'PhonePe' || paymentMethodSelected === 'GPay' || paymentMethodSelected === 'Paytm') && !mobileNumber.trim()) {
                        showNotification('Please enter your Mobile Number', 'error');
                        return;
                      }
                      if (paymentMethodSelected === 'Bank Transfer' && (!accountNumber.trim() || !ifscCode.trim() || !accountName.trim())) {
                        showNotification('Please fill in all bank details', 'error');
                        return;
                      }

                      setSubmittingTransaction(true);
                      try {
                        // Build payment details based on method
                        const paymentDetails: any = {};
                        if (paymentMethodSelected === 'UPI') {
                          paymentDetails.upiId = upiId;
                        } else if (paymentMethodSelected === 'PhonePe' || paymentMethodSelected === 'GPay' || paymentMethodSelected === 'Paytm') {
                          paymentDetails.mobileNumber = mobileNumber;
                        } else if (paymentMethodSelected === 'Bank Transfer') {
                          paymentDetails.accountNumber = accountNumber;
                          paymentDetails.ifscCode = ifscCode;
                          paymentDetails.accountName = accountName;
                        }

                        const response = await apiClient.post('/api/payment-requests', {
                          amount: numAmount,
                          paymentMethod: paymentMethodSelected,
                          paymentDetails: paymentDetails,
                          requestType: 'withdrawal'
                        }) as any;

                        if (response.success) {
                          const adminNumber = await getPaymentWhatsAppNumberAsync();
                          
                          let whatsappMessage = `Hello! I want to withdraw ₹${numAmount.toLocaleString('en-IN')}.\n\n`;
                          whatsappMessage += `Payment Details:\n`;
                          whatsappMessage += `Mode: ${paymentMethodSelected}\n`;
                          
                          if (paymentMethodSelected === 'UPI') {
                            whatsappMessage += `UPI ID: ${upiId}\n`;
                          } else if (paymentMethodSelected === 'PhonePe' || paymentMethodSelected === 'GPay' || paymentMethodSelected === 'Paytm') {
                            whatsappMessage += `Mobile: ${mobileNumber}\n`;
                          } else if (paymentMethodSelected === 'Bank Transfer') {
                            whatsappMessage += `Account: ${accountNumber}\n`;
                            whatsappMessage += `IFSC: ${ifscCode}\n`;
                            whatsappMessage += `Name: ${accountName}\n`;
                          }
                          
                          whatsappMessage += `\nRequest ID: ${response.requestId}`;
                          
                          const whatsappUrl = createWhatsAppUrl(adminNumber, whatsappMessage);

                          showNotification(`✅ Withdrawal request submitted! Amount: ₹${numAmount.toLocaleString('en-IN')}`, 'success');
                          
                          try {
                            const opened = window.open(whatsappUrl, '_blank');
                            if (!opened || opened.closed || typeof opened.closed === 'undefined') {
                              window.location.href = whatsappUrl;
                            }
                          } catch (error) {
                            window.location.href = whatsappUrl;
                          }

                          setTransactionAmount('');
                          setUpiId('');
                          setMobileNumber('');
                          setAccountNumber('');
                          setIfscCode('');
                          setAccountName('');
                          setShowWithdrawForm(false);
                          fetchPaymentRequests();
                        } else {
                          showNotification(`Failed to submit withdrawal request: ${response.error || 'Unknown error'}`, 'error');
                        }
                      } catch (error: any) {
                        console.error('Withdrawal request failed:', error);
                        showNotification(`Failed to submit withdrawal request: ${error.message || 'Unknown error'}`, 'error');
                      } finally {
                        setSubmittingTransaction(false);
                      }
                    }}
                    disabled={submittingTransaction || !transactionAmount || parseInt(transactionAmount) <= 0 || parseInt(transactionAmount) > balance}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold"
                  >
                    {submittingTransaction ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-5 h-5 mr-2" />
                        Request Withdraw ₹{transactionAmount || '0'}
                      </>
                    )}
                  </Button>

                  <div className="text-center text-xs text-white/50">
                    Withdrawals are processed within 24 hours. You'll be redirected to WhatsApp to send payment details.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            <Card className="bg-black/50 border-gold/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gold">Transaction History</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {profileState.loading ? (
                  <div className="text-center py-8 text-white">Loading transactions...</div>
                ) : profileState.transactions.length === 0 ? (
                  <div className="text-center py-8 text-white/60">No transactions found</div>
                ) : (
                  <div className="space-y-3">
                    {profileState.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-black/30 rounded-lg border border-gold/10 gap-3 sm:gap-0">
                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                            transaction.type === 'deposit' ? 'bg-green-400' :
                            transaction.type === 'withdrawal' ? 'bg-red-400' :
                            transaction.type === 'win' ? 'bg-blue-400' :
                            'bg-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium capitalize text-sm sm:text-base">{transaction.type}</div>
                            <div className="text-white/60 text-xs sm:text-sm truncate">{transaction.description}</div>
                            <div className="text-white/40 text-xs">{formatDate(transaction.createdAt)}</div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto">
                          <div className={`font-bold text-base sm:text-lg ${
                            transaction.type === 'deposit' || transaction.type === 'win' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {profileState.pagination.transactions.hasMore && (
                      <div className="text-center pt-4">
                        <Button
                          onClick={loadMoreTransactions}
                          variant="outline"
                          className="border-gold/30 text-gold hover:bg-gold/10"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Load More
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Requests Card - ENHANCED */}
            <Card className="bg-black/50 border-gold/30 mt-6">
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gold">💰 Deposits & Withdrawals</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchPaymentRequests}
                      disabled={loadingPaymentRequests}
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loadingPaymentRequests ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  
                  {/* Filters - Mobile Optimized with Touch Targets */}
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={paymentFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentFilter('all')}
                        className={`min-h-[44px] px-4 text-sm sm:text-base ${paymentFilter === 'all' ? 'bg-gold text-black' : 'border-gold/30 text-gold hover:bg-gold/10'}`}
                      >
                        All
                      </Button>
                      <Button
                        variant={paymentFilter === 'deposit' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentFilter('deposit')}
                        className={`min-h-[44px] px-4 text-sm sm:text-base ${paymentFilter === 'deposit' ? 'bg-green-600 text-white' : 'border-green-400/30 text-green-400 hover:bg-green-400/10'}`}
                      >
                        Deposits
                      </Button>
                      <Button
                        variant={paymentFilter === 'withdrawal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentFilter('withdrawal')}
                        className={`min-h-[44px] px-4 text-sm sm:text-base ${paymentFilter === 'withdrawal' ? 'bg-red-600 text-white' : 'border-red-400/30 text-red-400 hover:bg-red-400/10'}`}
                      >
                        Withdrawals
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                        className={`min-h-[44px] px-4 text-sm sm:text-base ${statusFilter === 'all' ? 'bg-gold text-black' : 'border-gold/30 text-gold hover:bg-gold/10'}`}
                      >
                        All Status
                      </Button>
                      <Button
                        variant={statusFilter === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('pending')}
                        className={`min-h-[44px] px-4 text-sm sm:text-base ${statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10'}`}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={statusFilter === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('approved')}
                        className={`min-h-[44px] px-4 text-sm sm:text-base ${statusFilter === 'approved' ? 'bg-green-600 text-white' : 'border-green-400/30 text-green-400 hover:bg-green-400/10'}`}
                      >
                        Approved
                      </Button>
                      <Button
                        variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('rejected')}
                        className={`min-h-[44px] px-4 text-sm sm:text-base ${statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'border-red-400/30 text-red-400 hover:bg-red-400/10'}`}
                      >
                        Rejected
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPaymentRequests ? (
                  <div className="text-center py-8 text-white/60">Loading payment requests...</div>
                ) : (() => {
                  // Apply filters
                  const filteredRequests = paymentRequests.filter(request => {
                    const typeMatch = paymentFilter === 'all' || (request.request_type || request.type) === paymentFilter;
                    const statusMatch = statusFilter === 'all' || request.status === statusFilter;
                    return typeMatch && statusMatch;
                  });
                  
                  if (filteredRequests.length === 0) {
                    return <div className="text-center py-8 text-white/60">No payment requests found</div>;
                  }
                  
                  // Group by type with null safety
                  const deposits = filteredRequests.filter(r => (r.request_type || r.type) === 'deposit');
                  const withdrawals = filteredRequests.filter(r => (r.request_type || r.type) === 'withdrawal');
                  
                  // Helper to safely parse amount
                  const safeParseAmount = (amount: any) => {
                    const parsed = parseFloat(amount);
                    return isNaN(parsed) ? 0 : parsed;
                  };
                  
                  return (
                    <div className="space-y-6">
                      {/* Summary Cards - Mobile Optimized */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 sm:p-5 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="text-green-400 text-sm sm:text-base mb-2">Total Deposits</div>
                          <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-400">
                            {formatCurrency(deposits.filter(d => d.status === 'approved' || d.status === 'completed').reduce((sum, d) => sum + safeParseAmount(d.amount), 0))}
                          </div>
                          <div className="text-green-400/60 text-xs sm:text-sm mt-1">{deposits.filter(d => d.status === 'approved' || d.status === 'completed').length} approved</div>
                        </div>
                        
                        <div className="p-4 sm:p-5 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="text-red-400 text-sm sm:text-base mb-2">Total Withdrawals</div>
                          <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-400">
                            {formatCurrency(withdrawals.filter(w => w.status === 'approved' || w.status === 'completed').reduce((sum, w) => sum + safeParseAmount(w.amount), 0))}
                          </div>
                          <div className="text-red-400/60 text-xs sm:text-sm mt-1">{withdrawals.filter(w => w.status === 'approved' || w.status === 'completed').length} approved</div>
                        </div>
                        
                        <div className="p-4 sm:p-5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="text-yellow-400 text-sm sm:text-base mb-2">Pending Requests</div>
                          <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-400">
                            {filteredRequests.filter(r => r.status === 'pending').length}
                          </div>
                          <div className="text-yellow-400/60 text-xs sm:text-sm mt-1">{formatCurrency(filteredRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + safeParseAmount(r.amount), 0))}</div>
                        </div>
                      </div>
                      
                      {/* Requests List */}
                      <div className="space-y-3">
                        {filteredRequests.map((request: any) => {
                          const isDeposit = (request.request_type || request.type) === 'deposit';
                          const isPending = request.status === 'pending';
                          const isApproved = request.status === 'approved' || request.status === 'completed';
                          const isRejected = request.status === 'rejected';
                          
                          return (
                            <div key={request.id} className={`p-3 sm:p-4 rounded-lg border ${
                              isDeposit ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                            }`}>
                              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                                <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                                  {/* Icon */}
                                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isDeposit ? 'bg-green-500/20' : 'bg-red-500/20'
                                  }`}>
                                    {isDeposit ? (
                                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                                    ) : (
                                      <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                                    )}
                                  </div>
                                  
                                  {/* Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                                      <h4 className={`text-base sm:text-lg font-semibold ${
                                        isDeposit ? 'text-green-400' : 'text-red-400'
                                      }`}>
                                        {isDeposit ? '📥 Deposit' : '📤 Withdrawal'}
                                      </h4>
                                      <Badge className={`${
                                        isPending ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                                        isApproved ? 'bg-green-500/20 border-green-500 text-green-400' :
                                        'bg-red-500/20 border-red-500 text-red-400'
                                      }`}>
                                        {isPending && '⏳ '}
                                        {isApproved && '✅ '}
                                        {isRejected && '❌ '}
                                        {request.status.toUpperCase()}
                                      </Badge>
                                    </div>
                                    
                                    <div className="text-white/90 text-xs sm:text-sm space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-white/40 flex-shrink-0" />
                                        <span className="text-white/60">Amount:</span>
                                        <span className="font-bold text-white">{formatCurrency(safeParseAmount(request.amount))}</span>
                                      </div>
                                      
                                      {request.payment_method && (
                                        <div className="text-white/60 text-xs">
                                          Method: {request.payment_method}
                                        </div>
                                      )}
                                      
                                      <div className="text-white/40 text-xs">
                                        📅 Requested: {formatDate(new Date(request.created_at || request.createdAt))}
                                      </div>
                                      
                                      {request.updated_at && request.updated_at !== request.created_at && (
                                        <div className="text-white/40 text-xs">
                                          🔄 Updated: {formatDate(new Date(request.updated_at || request.updatedAt))}
                                        </div>
                                      )}
                                      
                                      {request.admin_notes && (
                                        <div className="text-white/60 text-xs mt-2 p-2 bg-black/30 rounded">
                                          💬 Admin Note: {request.admin_notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Amount Badge */}
                                <div className="text-right sm:ml-4 w-full sm:w-auto">
                                  <div className={`text-xl sm:text-2xl font-bold ${
                                    isDeposit ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {isDeposit ? '+' : '-'}{formatCurrency(safeParseAmount(request.amount))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Game History Tab */}
          <TabsContent value="game-history" className="space-y-6">
            <Card className="bg-black/50 border-gold/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gold">Game History</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {profileState.loading ? (
                  <div className="text-center py-8 text-white">Loading game history...</div>
                ) : profileState.gameHistory.length === 0 ? (
                  <div className="text-center py-8 text-white/60">No games found</div>
                ) : (
                  <div className="space-y-3">
                    {profileState.gameHistory.map((game) => (
                      <div key={game.id} className="p-3 sm:p-4 bg-black/30 rounded-lg border border-gold/10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                              game.result === 'win' ? 'bg-green-400' : game.result === 'loss' ? 'bg-red-400' : 'bg-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium text-sm sm:text-base">
                                Game #{game.gameId.slice(-6)} - {game.winner ? game.winner.toUpperCase() : 'IN PROGRESS'} {game.winner ? 'Won' : ''}
                              </div>
                              <div className="text-white/60 text-xs sm:text-sm">
                                Opening Card: {game.openingCard || 'N/A'} | Your Bet: {game.yourBet ? `${game.yourBet.side?.toUpperCase() || 'N/A'} ₹${game.yourBet.amount}` : game.yourTotalBet > 0 ? `Total: ₹${game.yourTotalBet}` : 'No bet'}
                              </div>
                              <div className="text-white/40 text-xs">{formatDate(game.createdAt)}</div>
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            {game.result === 'win' ? (
                              <>
                                <div className="text-green-400 font-bold text-base sm:text-lg">
                                  +{formatCurrency(game.yourNetProfit)}
                                </div>
                                <div className="text-green-400/70 text-xs sm:text-sm">
                                  Won: {formatCurrency(game.yourTotalPayout)}
                                </div>
                                <div className="text-white/50 text-xs">
                                  Bet: {formatCurrency(game.yourTotalBet)}
                                </div>
                                <div className="text-green-400 text-xs font-semibold mt-1">
                                  💰 Net Profit
                                </div>
                              </>
                            ) : game.result === 'loss' ? (
                              <>
                                <div className="text-red-400 font-bold text-base sm:text-lg">
                                  -{formatCurrency(game.yourTotalBet)}
                                </div>
                                <div className="text-red-400/70 text-xs sm:text-sm">
                                  Lost: {formatCurrency(game.yourTotalBet)}
                                </div>
                                <div className="text-white/50 text-xs">
                                  Payout: {formatCurrency(0)}
                                </div>
                                <div className="text-red-400 text-xs font-semibold mt-1">
                                  📉 Net Loss
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-gray-400 font-bold text-base sm:text-lg">
                                  {formatCurrency(0)}
                                </div>
                                <div className="text-gray-400/70 text-xs sm:text-sm">
                                  No Result
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {profileState.pagination.gameHistory.hasMore && (
                      <div className="text-center pt-4">
                        <Button
                          onClick={loadMoreGameHistory}
                          variant="outline"
                          className="border-gold/30 text-gold hover:bg-gold/10"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Load More
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bonuses Tab */}
          <TabsContent value="bonuses" className="space-y-6">
            {/* ✅ NEW: Dedicated Bonus Wallet Component */}
            <BonusWallet
              bonusSummary={bonusSummary}
              depositBonuses={depositBonuses}
              referralBonuses={referralBonuses}
              loading={loadingBonuses}
            />

            {/* Bonus History Timeline */}
            {!loadingBonuses && bonusTransactions.length > 0 && (
              <BonusHistoryTimeline
                transactions={bonusTransactions}
                hasMore={bonusHasMore}
                loading={loadingBonuses}
                onLoadMore={async () => {
                  try {
                    const offset = bonusTransactions.length;
                    const res = await apiClient.get(`/api/user/bonus-transactions?limit=20&offset=${offset}`) as any;
                    
                    const moreTransactions = Array.isArray(res)
                      ? res
                      : Array.isArray(res.data)
                        ? res.data
                        : [];
                    
                    setBonusTransactions([...bonusTransactions, ...moreTransactions]);
                    setBonusHasMore(
                      res.hasMore ??
                      (res.data?.hasMore) ??
                      false
                    );
                  } catch (error) {
                    console.error('Failed to load more transactions:', error);
                  }
                }}
              />
            )}
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/50 border-gold/30">
                <CardHeader>
                  <CardTitle className="text-gold">Share & Earn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Referral Code */}
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Your Referral Code</Label>
                    <div className="p-4 bg-gold/10 rounded-lg border border-gold/30">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gold mb-3">
                          {profileState.user?.referralCodeGenerated ||
                            profileState.referralData?.referralCode ||
                            'NO REFERRAL CODE YET'}
                        </div>
                        <Button
                          onClick={() => {
                            const codeToCopy =
                              profileState.user?.referralCodeGenerated ||
                              profileState.referralData?.referralCode ||
                              '';
                            if (!codeToCopy) {
                              showNotification('Referral code not available yet. Please contact support.', 'error');
                              return;
                            }
                            void handleCopyToClipboard(codeToCopy);
                          }}
                          variant="outline"
                          className="border-gold/30 text-gold hover:bg-gold/10"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Code
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Referral Link */}
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">Your Referral Link</Label>
                    <div className="p-4 bg-gold/10 rounded-lg border border-gold/30">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-black/30 rounded-lg border border-gold/20">
                          <LinkIcon className="w-4 h-4 text-gold flex-shrink-0" />
                          <div className="flex-1 text-white/80 text-sm truncate">
                            {(() => {
                              const referralCode = profileState.user?.referralCodeGenerated ||
                                profileState.referralData?.referralCode;
                              return referralCode
                                ? `${window.location.origin}/signup?ref=${referralCode}`
                                : 'No referral link available';
                            })()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const referralCode =
                                profileState.user?.referralCodeGenerated ||
                                profileState.referralData?.referralCode ||
                                '';
                              if (!referralCode) {
                                showNotification('Referral code not available yet. Please contact support.', 'error');
                                return;
                              }
                              const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
                              void handleCopyToClipboard(referralLink);
                            }}
                            variant="outline"
                            className="flex-1 border-gold/30 text-gold hover:bg-gold/10"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </Button>
                          <Button
                            onClick={() => {
                              const referralCode =
                                profileState.user?.referralCodeGenerated ||
                                profileState.referralData?.referralCode ||
                                '';
                              if (!referralCode) {
                                showNotification('Referral code not available yet. Please contact support.', 'error');
                                return;
                              }
                              const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
                              const message = `🎰 Join me on Andar Bahar and get 5% bonus on your first deposit! Use my referral link: ${referralLink}`;
                              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                            variant="outline"
                            className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share via WhatsApp
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Info */}
                  <div className="text-sm text-white/80">
                    <p className="mb-2 font-semibold text-gold">How it works:</p>
                    <ul className="list-disc list-inside space-y-1 text-white/60">
                      <li>Friend gets 5% bonus on their first deposit (locked until they play)</li>
                      <li>You get 1% of their deposit amount when their bonus unlocks</li>
                      <li>Referral bonus is automatically credited when they reach wagering threshold</li>
                      <li>Example: Friend deposits ₹1000 → You get ₹10 when they unlock their ₹50 bonus</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-gold/30">
                <CardHeader>
                  <CardTitle className="text-gold">Referral Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-black/30 rounded-lg">
                      <div className="text-2xl font-bold text-gold">
                        {profileState.referralData?.totalReferrals || 0}
                      </div>
                      <div className="text-white/60 text-sm">Total Referrals</div>
                    </div>
                    <div className="text-center p-4 bg-black/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">
                        {formatCurrency(profileState.referralData?.totalReferralEarnings || 0)}
                      </div>
                      <div className="text-white/60 text-sm">Referral Earnings</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-black/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">
                        {formatCurrency(profileState.bonusInfo?.referralBonus || 0)}
                      </div>
                      <div className="text-white/60 text-sm">Total Referral Bonus Earned</div>
                    </div>
                    <div className="text-center p-4 bg-black/30 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">
                        {formatCurrency(profileState.bonusInfo?.depositBonus || 0)}
                      </div>
                      <div className="text-white/60 text-sm">Total Deposit Bonus Earned</div>
                    </div>
                  </div>
                  {/* ✅ Auto-Credit Info Banner */}
                  {(profileState.bonusInfo?.referralBonus && profileState.bonusInfo.referralBonus > 0 || profileState.bonusInfo?.depositBonus && profileState.bonusInfo.depositBonus > 0) && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-white/80">
                          <p className="font-semibold text-green-400 mb-1">✅ Bonuses Auto-Credited</p>
                          <p className="text-white/60">All bonuses are automatically added to your main balance. No manual claim needed!</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Referred Users List */}
            {profileState.referralData?.referredUsers && profileState.referralData.referredUsers.length > 0 && (
              <Card className="bg-black/50 border-gold/30">
                <CardHeader>
                  <CardTitle className="text-gold">Referred Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profileState.referralData.referredUsers.map((referral, index) => {
                      const displayName = referral.fullName || referral.phone || 'User';
                      const initials = displayName.slice(0, 2).toUpperCase();
                      return (
                      <div key={index} className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-gold/10">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gold/20 text-gold text-sm font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-white">{displayName}</div>
                            <div className="text-white/60 text-sm">Joined: {formatDate(referral.createdAt)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">
                            +{formatCurrency(referral.bonusEarned || 0)}
                          </div>
                          <div className="text-white/60 text-sm">
                            {referral.hasDeposited ? 'Deposited' : 'Pending Deposit'}
                          </div>
                        </div>
                      </div>
                    );})}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        userBalance={balance}
        onBalanceUpdate={(newBalance) => refreshBalance()}
      />
    </div>
  );
};

export default Profile;

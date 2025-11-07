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
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useBalance } from '@/contexts/BalanceContext';
import { WalletModal } from '@/components/WalletModal';
import { apiClient } from '@/lib/api-client';
import { useNotification } from '@/contexts/NotificationContext';
import {
  BonusOverviewCard,
  DepositBonusesList,
  ReferralBonusesList,
  BonusHistoryTimeline
} from '@/components/Bonus';

const Profile: React.FC = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const {
    state: profileState,
    fetchTransactions,
    fetchGameHistory,
    updateProfile,
    fetchReferralData,
    claimBonus
  } = useUserProfile();
  const { balance, refreshBalance } = useBalance();
  const { showNotification } = useNotification();
  
  // Payment requests state
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // WhatsApp deeplink helper
  const adminWhatsApp = (import.meta as any)?.env?.VITE_ADMIN_WHATSAPP || '';
  const openWhatsAppRequest = (requestType: 'deposit' | 'withdraw') => {
    const phone = (user && (user.phone || user.id)) || '';
    const base = 'https://wa.me/';
    const number = adminWhatsApp.replace(/\D/g, '');
    const text = `Request: ${requestType.toUpperCase()}\nUser: ${phone}\nPlease assist.`;
    const url = number ? `${base}${number}?text=${encodeURIComponent(text)}` : `${base}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const [activeTab, setActiveTab] = useState('profile');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  
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

  // Parse URL parameters for tab selection
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const tab = params.get('tab');
    if (tab) {
      // Redirect old 'overview' links to 'profile'
      setActiveTab(tab === 'overview' ? 'profile' : tab);
    }
  }, [location]);

  // Fetch referral data when referral tab is active
  useEffect(() => {
    if (activeTab === 'referral' && user) {
      fetchReferralData();
    }
  }, [activeTab, user, fetchReferralData]);

  // Fetch transactions when transactions tab is active
  useEffect(() => {
    if (activeTab === 'transactions' && user) {
      if (profileState.transactions.length === 0) {
        fetchTransactions(false);
      }
    }
  }, [activeTab, user, fetchTransactions, profileState.transactions.length]);

  // Fetch game history when game-history tab is active
  useEffect(() => {
    if (activeTab === 'game-history' && user) {
      if (profileState.gameHistory.length === 0) {
        fetchGameHistory(false);
      }
    }
  }, [activeTab, user, fetchGameHistory, profileState.gameHistory.length]);

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

          setBonusSummary(summaryRes.data || summaryRes);
          setDepositBonuses(depositRes.data || depositRes);
          setReferralBonuses(referralRes.data || referralRes);
          setBonusTransactions(transactionsRes.data || transactionsRes.data || []);
          setBonusHasMore(transactionsRes.hasMore || false);
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

  // Fetch payment requests when transactions tab is active
  const fetchPaymentRequests = async () => {
    if (!user) return;
    
    try {
      setLoadingPaymentRequests(true);
      const response = await apiClient.get('/payment-requests') as any;
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


  const handleClaimBonus = async () => {
    try {
      setClaimingBonus(true);
      await claimBonus();
    } catch (error) {
      console.error('Failed to claim bonus:', error);
    } finally {
      setClaimingBonus(false);
    }
  };

  const openWalletModal = () => {
    setShowWalletModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Please login to view your profile</div>
      </div>
    );
  }

  const analytics = profileState.analytics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/50 border-b border-gold/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profileState.user?.profilePicture} alt={user?.username || 'User'} />
              <AvatarFallback className="bg-gold/20 text-gold text-xl font-semibold">
                {user?.username?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gold">{user?.full_name || user?.phone}</h1>
              <p className="text-white/80">{user?.phone}</p>
            </div>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 bg-black/50 border-gold/30">
            <TabsTrigger value="profile" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Profile
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="game-history" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Game History
            </TabsTrigger>
            <TabsTrigger value="bonuses" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              <Gift className="w-4 h-4 mr-1 inline" />
              Bonuses
            </TabsTrigger>
            <TabsTrigger value="referral" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Referral
            </TabsTrigger>
          </TabsList>

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
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-gold/10">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            transaction.type === 'deposit' ? 'bg-green-400' :
                            transaction.type === 'withdrawal' ? 'bg-red-400' :
                            transaction.type === 'win' ? 'bg-blue-400' :
                            'bg-gray-400'
                          }`} />
                          <div>
                            <div className="text-white font-medium capitalize">{transaction.type}</div>
                            <div className="text-white/60 text-sm">{transaction.description}</div>
                            <div className="text-white/40 text-xs">{formatDate(transaction.createdAt)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${
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
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex gap-2">
                      <Button
                        variant={paymentFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentFilter('all')}
                        className={paymentFilter === 'all' ? 'bg-gold text-black' : 'border-gold/30 text-gold hover:bg-gold/10'}
                      >
                        All
                      </Button>
                      <Button
                        variant={paymentFilter === 'deposit' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentFilter('deposit')}
                        className={paymentFilter === 'deposit' ? 'bg-green-600 text-white' : 'border-green-400/30 text-green-400 hover:bg-green-400/10'}
                      >
                        Deposits
                      </Button>
                      <Button
                        variant={paymentFilter === 'withdrawal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentFilter('withdrawal')}
                        className={paymentFilter === 'withdrawal' ? 'bg-red-600 text-white' : 'border-red-400/30 text-red-400 hover:bg-red-400/10'}
                      >
                        Withdrawals
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                        className={statusFilter === 'all' ? 'bg-gold text-black' : 'border-gold/30 text-gold hover:bg-gold/10'}
                      >
                        All Status
                      </Button>
                      <Button
                        variant={statusFilter === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('pending')}
                        className={statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10'}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={statusFilter === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('approved')}
                        className={statusFilter === 'approved' ? 'bg-green-600 text-white' : 'border-green-400/30 text-green-400 hover:bg-green-400/10'}
                      >
                        Approved
                      </Button>
                      <Button
                        variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('rejected')}
                        className={statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'border-red-400/30 text-red-400 hover:bg-red-400/10'}
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
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="text-green-400 text-sm mb-1">Total Deposits</div>
                          <div className="text-2xl font-bold text-green-400">
                            {formatCurrency(deposits.filter(d => d.status === 'approved' || d.status === 'completed').reduce((sum, d) => sum + safeParseAmount(d.amount), 0))}
                          </div>
                          <div className="text-green-400/60 text-xs mt-1">{deposits.filter(d => d.status === 'approved' || d.status === 'completed').length} approved</div>
                        </div>
                        
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="text-red-400 text-sm mb-1">Total Withdrawals</div>
                          <div className="text-2xl font-bold text-red-400">
                            {formatCurrency(withdrawals.filter(w => w.status === 'approved' || w.status === 'completed').reduce((sum, w) => sum + safeParseAmount(w.amount), 0))}
                          </div>
                          <div className="text-red-400/60 text-xs mt-1">{withdrawals.filter(w => w.status === 'approved' || w.status === 'completed').length} approved</div>
                        </div>
                        
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="text-yellow-400 text-sm mb-1">Pending Requests</div>
                          <div className="text-2xl font-bold text-yellow-400">
                            {filteredRequests.filter(r => r.status === 'pending').length}
                          </div>
                          <div className="text-yellow-400/60 text-xs mt-1">{formatCurrency(filteredRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + safeParseAmount(r.amount), 0))}</div>
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
                            <div key={request.id} className={`p-4 rounded-lg border ${
                              isDeposit ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                            }`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                  {/* Icon */}
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    isDeposit ? 'bg-green-500/20' : 'bg-red-500/20'
                                  }`}>
                                    {isDeposit ? (
                                      <TrendingUp className="w-6 h-6 text-green-400" />
                                    ) : (
                                      <TrendingDown className="w-6 h-6 text-red-400" />
                                    )}
                                  </div>
                                  
                                  {/* Details */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h4 className={`text-lg font-semibold ${
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
                                    
                                    <div className="text-white/90 text-sm space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-white/40" />
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
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${
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
                      <div key={game.id} className="p-4 bg-black/30 rounded-lg border border-gold/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${
                              game.result === 'win' ? 'bg-green-400' : game.result === 'loss' ? 'bg-red-400' : 'bg-gray-400'
                            }`} />
                            <div>
                              <div className="text-white font-medium">
                                Game #{game.gameId.slice(-6)} - {game.winner ? game.winner.toUpperCase() : 'IN PROGRESS'} {game.winner ? 'Won' : ''}
                              </div>
                              <div className="text-white/60 text-sm">
                                Opening Card: {game.openingCard || 'N/A'} | Your Bet: {game.yourBet ? `${game.yourBet.side?.toUpperCase() || 'N/A'} ₹${game.yourBet.amount}` : game.yourTotalBet > 0 ? `Total: ₹${game.yourTotalBet}` : 'No bet'}
                              </div>
                              <div className="text-white/40 text-xs">{formatDate(game.createdAt)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            {game.result === 'win' ? (
                              <>
                                <div className="text-green-400 font-bold text-lg">
                                  +{formatCurrency(game.yourNetProfit)}
                                </div>
                                <div className="text-green-400/70 text-sm">
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
                                <div className="text-red-400 font-bold text-lg">
                                  -{formatCurrency(game.yourTotalBet)}
                                </div>
                                <div className="text-red-400/70 text-sm">
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
                                <div className="text-gray-400 font-bold text-lg">
                                  {formatCurrency(0)}
                                </div>
                                <div className="text-gray-400/70 text-sm">
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
            {loadingBonuses ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
                <p className="text-white/60 mt-4">Loading bonus data...</p>
              </div>
            ) : (
              <>
                {/* Bonus Overview */}
                {bonusSummary && (
                  <BonusOverviewCard
                    totalAvailable={bonusSummary.totals?.available || 0}
                    totalLocked={bonusSummary.depositBonuses?.locked || 0}
                    totalCredited={bonusSummary.totals?.credited || 0}
                    lifetimeEarnings={bonusSummary.totals?.lifetime || 0}
                  />
                )}

                {/* Deposit Bonuses */}
                <DepositBonusesList bonuses={depositBonuses} />

                {/* Referral Bonuses */}
                <ReferralBonusesList bonuses={referralBonuses} />

                {/* Bonus History */}
                <BonusHistoryTimeline
                  transactions={bonusTransactions}
                  hasMore={bonusHasMore}
                  loading={loadingBonuses}
                  onLoadMore={async () => {
                    try {
                      const offset = bonusTransactions.length;
                      const res = await apiClient.get(`/api/user/bonus-transactions?limit=20&offset=${offset}`);
                      setBonusTransactions([...bonusTransactions, ...(res.data || [])]);
                      setBonusHasMore(res.hasMore || false);
                    } catch (error) {
                      console.error('Failed to load more transactions:', error);
                    }
                  }}
                />
              </>
            )}
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/50 border-gold/30">
                <CardHeader>
                  <CardTitle className="text-gold">Your Referral Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gold/10 rounded-lg border border-gold/30">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gold mb-2">
                        {profileState.user?.referralCode || 'RAJUGARIKOSSU' + user.id.slice(-6).toUpperCase()}
                      </div>
                      <Button
                        onClick={() => copyToClipboard(profileState.user?.referralCode || 'RAJUGARIKOSSU' + user.id.slice(-6).toUpperCase())}
                        variant="outline"
                        className="border-gold/30 text-gold hover:bg-gold/10"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-white/80">
                    <p className="mb-2">Share your referral code with friends and earn bonuses when they sign up and play!</p>
                    <ul className="list-disc list-inside space-y-1 text-white/60">
                      <li>Friend gets 5% bonus on their first deposit</li>
                      <li>You get 1% bonus when they make their first deposit</li>
                      <li>Bonus is automatically credited to your account</li>
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
                      <div className="text-white/60 text-sm">Available Referral Bonus</div>
                    </div>
                    <div className="text-center p-4 bg-black/30 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">
                        {formatCurrency(profileState.bonusInfo?.depositBonus || 0)}
                      </div>
                      <div className="text-white/60 text-sm">Available Deposit Bonus</div>
                    </div>
                  </div>
                  {(profileState.bonusInfo?.referralBonus && profileState.bonusInfo.referralBonus > 0 || profileState.bonusInfo?.depositBonus && profileState.bonusInfo.depositBonus > 0) && (
                    <div className="text-center pt-2">
                      <Button
                        onClick={handleClaimBonus}
                        disabled={claimingBonus}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {claimingBonus ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Claim Available Bonus ({formatCurrency((profileState.bonusInfo?.referralBonus || 0) + (profileState.bonusInfo?.depositBonus || 0))})
                          </>
                        )}
                      </Button>
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
                    {profileState.referralData.referredUsers.map((referral, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-gold/10">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gold/20 text-gold text-sm font-semibold">
                              {referral.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-white font-medium">{referral.username}</div>
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
                    ))}
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
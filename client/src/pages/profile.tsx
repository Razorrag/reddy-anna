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
  ChevronLeft
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
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useBalance } from '@/contexts/BalanceContext';
import { WalletModal } from '@/components/WalletModal';
import { apiClient } from '@/lib/api-client';
import { useNotification } from '@/contexts/NotificationContext';

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

  const [activeTab, setActiveTab] = useState('overview');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
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
      setActiveTab(tab);
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
            <TabsTrigger value="overview" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Overview
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Profile
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="game-history" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Game History
            </TabsTrigger>
            <TabsTrigger value="referral" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Referral
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Simplified with just sign out and delete account */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-black/50 border-gold/30">
              <CardHeader>
                <CardTitle className="text-gold">Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </TabsContent>

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

            {/* Payment Requests Card */}
            <Card className="bg-black/50 border-gold/30 mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gold">Payment Requests</CardTitle>
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
              </CardHeader>
              <CardContent>
                {loadingPaymentRequests ? (
                  <div className="text-center py-8 text-white/60">Loading payment requests...</div>
                ) : paymentRequests.length === 0 ? (
                  <div className="text-center py-8 text-white/60">No payment requests found</div>
                ) : (
                  <div className="space-y-3">
                    {paymentRequests.map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-gold/10">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            request.status === 'pending' ? 'bg-yellow-400' :
                            request.status === 'approved' || request.status === 'completed' ? 'bg-green-400' :
                            'bg-red-400'
                          }`} />
                          <div>
                            <div className="text-white font-medium capitalize">{request.request_type || request.type}</div>
                            <div className="text-white/60 text-sm">Amount: {formatCurrency(request.amount)}</div>
                            <div className="text-white/40 text-xs">Requested: {formatDate(new Date(request.created_at || request.createdAt))}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={`text-xs ${
                            request.status === 'approved' || request.status === 'completed' ? 'border-green-400 text-green-400' :
                            request.status === 'rejected' ? 'border-red-400 text-red-400' :
                            'border-yellow-400 text-yellow-400'
                          }`}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                              game.result === 'win' ? 'bg-green-400' : 'bg-red-400'
                            }`} />
                            <div>
                              <div className="text-white font-medium">
                                Game #{game.gameId.slice(-6)} - {game.winner.toUpperCase()} Won
                              </div>
                              <div className="text-white/60 text-sm">
                                Opening Card: {game.openingCard} | Your Bet: {game.yourBet.side.toUpperCase()} ₹{game.yourBet.amount}
                              </div>
                              <div className="text-white/40 text-xs">{formatDate(game.createdAt)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold text-lg ${
                              game.result === 'win' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {game.result === 'win' ? '+' : '-'}
                              {formatCurrency(game.yourBet.amount)}
                            </div>
                            {game.result === 'win' && (
                              <div className="text-green-400 text-sm">
                                Payout: {formatCurrency(game.payout)}
                              </div>
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
      />
    </div>
  );

  // Listen for balance updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance: newBalance, source } = event.detail;
      console.log('Profile page received balance update:', newBalance, 'from', source);
    };

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);
    return () => window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
  }, []);

  // Listen for payment request updates
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
};

export default Profile;
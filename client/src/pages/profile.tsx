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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AppContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { UserProfileModal } from '@/components/UserProfile/UserProfileModal';
import { WalletModal } from '@/components/WalletModal';

const Profile: React.FC = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  const {
    state: profileState,
    fetchTransactions,
    fetchGameHistory,
    updateProfile,
    deposit,
    withdraw,
    fetchReferralData,
    claimBonus
  } = useUserProfile();

  const [activeTab, setActiveTab] = useState('overview');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletMode, setWalletMode] = useState<'deposit' | 'withdraw'>('deposit');
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

  const handleDeposit = (amount: number) => {
    deposit(amount, 'upi');
    setShowWalletModal(false);
  };

  const handleWithdraw = (amount: number) => {
    withdraw(amount, 'bank_transfer');
    setShowWalletModal(false);
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

  const openWalletModal = (mode: 'deposit' | 'withdraw') => {
    setWalletMode(mode);
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
              <AvatarImage src={profileState.user?.profilePicture} alt={user.username} />
              <AvatarFallback className="bg-gold/20 text-gold text-xl font-semibold">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gold">{user.username}</h1>
              <p className="text-white/80">{user.email}</p>
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 bg-black/50 border-gold/30">
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
            <TabsTrigger value="settings" className="text-white hover:text-gold data-[state=active]:text-gold data-[state=active]:bg-gold/10">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Balance Card */}
              <Card className="lg:col-span-2 bg-gradient-to-r from-gold/10 to-yellow-600/10 border-gold/30">
                <CardHeader>
                  <CardTitle className="text-gold flex items-center gap-2 text-xl">
                    <Wallet className="w-6 h-6" />
                    Account Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="text-white/80 text-sm mb-2">Current Balance</div>
                    <div className="text-4xl font-bold text-gold">
                      {analytics ? formatCurrency(analytics.currentBalance) : 'Loading...'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-white/60 text-xs">Today</div>
                      <div className={`text-lg font-semibold ${analytics?.todayProfit !== undefined && analytics.todayProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {analytics ? (analytics.todayProfit >= 0 ? '+' : '') + formatCurrency(analytics.todayProfit) : 'Loading...'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Weekly</div>
                      <div className={`text-lg font-semibold ${analytics?.weeklyProfit !== undefined && analytics.weeklyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {analytics ? (analytics.weeklyProfit >= 0 ? '+' : '') + formatCurrency(analytics.weeklyProfit) : 'Loading...'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Monthly</div>
                      <div className={`text-lg font-semibold ${analytics?.monthlyProfit !== undefined && analytics.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {analytics ? (analytics.monthlyProfit >= 0 ? '+' : '') + formatCurrency(analytics.monthlyProfit) : 'Loading...'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => openWalletModal('deposit')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Add Funds
                    </Button>
                    <Button
                      onClick={() => openWalletModal('withdraw')}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card className="bg-black/50 border-gold/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gold text-lg">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Games Played</span>
                      <span className="text-white font-bold">{analytics ? analytics.gamesPlayed.toLocaleString() : 'Loading...'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Win Rate</span>
                      <span className="text-gold font-bold">{analytics ? analytics.winRate.toFixed(1) + '%' : 'Loading...'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Biggest Win</span>
                      <span className="text-green-400 font-bold">{analytics ? formatCurrency(analytics.biggestWin) : 'Loading...'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Average Bet</span>
                      <span className="text-white font-bold">{analytics ? formatCurrency(analytics.averageBet) : 'Loading...'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/50 border-gold/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gold text-lg">Totals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Total Deposits</span>
                      <span className="text-green-400 font-bold">{analytics ? formatCurrency(analytics.totalDeposits) : 'Loading...'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Total Withdrawals</span>
                      <span className="text-red-400 font-bold">{analytics ? formatCurrency(analytics.totalWithdrawals) : 'Loading...'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Total Winnings</span>
                      <span className="text-blue-400 font-bold">{analytics ? formatCurrency(analytics.totalWinnings) : 'Loading...'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Total Losses</span>
                      <span className="text-red-400 font-bold">{analytics ? formatCurrency(analytics.totalLosses) : 'Loading...'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Profile Tab */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                      <Label htmlFor="email" className="text-gold">Email</Label>
                      <Input
                        id="email"
                        value={user.email}
                        disabled
                        className="bg-black/30 border-gold/20 text-white/60"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mobile" className="text-gold">Mobile Number</Label>
                      <Input
                        id="mobile"
                        value={profileForm.mobile}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, mobile: e.target.value }))}
                        disabled={!editingProfile}
                        className="bg-black/50 border-gold/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth" className="text-gold">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profileForm.dateOfBirth}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        disabled={!editingProfile}
                        className="bg-black/50 border-gold/30 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="gender" className="text-gold">Gender</Label>
                      <Select
                        value={profileForm.gender}
                        onValueChange={(value) => setProfileForm(prev => ({ ...prev, gender: value }))}
                        disabled={!editingProfile}
                      >
                        <SelectTrigger className="bg-black/50 border-gold/30 text-white">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-gold/30">
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="address" className="text-gold">Address</Label>
                      <Input
                        id="address"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                        disabled={!editingProfile}
                        className="bg-black/50 border-gold/30 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-gold">City</Label>
                        <Input
                          id="city"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                          disabled={!editingProfile}
                          className="bg-black/50 border-gold/30 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-gold">State</Label>
                        <Input
                          id="state"
                          value={profileForm.state}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, state: e.target.value }))}
                          disabled={!editingProfile}
                          className="bg-black/50 border-gold/30 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pincode" className="text-gold">Pincode</Label>
                        <Input
                          id="pincode"
                          value={profileForm.pincode}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, pincode: e.target.value }))}
                          disabled={!editingProfile}
                          className="bg-black/50 border-gold/30 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country" className="text-gold">Country</Label>
                        <Input
                          id="country"
                          value={profileForm.country}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                          disabled={!editingProfile}
                          className="bg-black/50 border-gold/30 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {editingProfile && (
                  <div className="flex gap-4 pt-4 border-t border-gold/20">
                    <Button
                      onClick={handleProfileUpdate}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Save Changes
                    </Button>
                    <Button
                      onClick={() => setEditingProfile(false)}
                      variant="outline"
                      className="border-gold/30 text-gold hover:bg-gold/10"
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
                        {profileState.user?.referralCode || 'REDDY' + user.id.slice(-6).toUpperCase()}
                      </div>
                      <Button
                        onClick={() => copyToClipboard(profileState.user?.referralCode || 'REDDY' + user.id.slice(-6).toUpperCase())}
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

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-black/50 border-gold/30">
              <CardHeader>
                <CardTitle className="text-gold">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gold">Security</h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 text-gold hover:bg-gold/10"
                    >
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 text-gold hover:bg-gold/10"
                    >
                      Enable Two-Factor Authentication
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gold">Preferences</h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 text-gold hover:bg-gold/10"
                    >
                      Notification Settings
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 text-gold hover:bg-gold/10"
                    >
                      Language Preferences
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 text-gold hover:bg-gold/10"
                    >
                      Theme Settings
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gold">Data & Privacy</h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 text-gold hover:bg-gold/10"
                    >
                      Download My Data
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-red-30 text-red-400 hover:bg-red-500/10"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        userBalance={analytics?.currentBalance || 0}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
      />
    </div>
  );
};

export default Profile;
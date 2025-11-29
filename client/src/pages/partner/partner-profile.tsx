// 🤝 PARTNER PROFILE - Similar to player profile with tabs for history
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePartnerAuth } from "@/contexts/PartnerAuthContext";
import {
  ChevronLeft,
  Wallet,
  DollarSign,
  FileText,
  History,
  RefreshCw,
  LogOut,
  BarChart3,
  TrendingUp
} from "lucide-react";
import WalletCard from "./components/WalletCard";
import EarningsTable from "./components/EarningsTable";
import WithdrawalRequestsTable from "./components/WithdrawalRequestsTable";

export default function PartnerProfile() {
  const { partner, logout } = usePartnerAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('wallet');
  
  const token = localStorage.getItem('partner_token');
  
  // Wallet & Earnings State
  const [walletData, setWalletData] = useState({
    wallet_balance: "0",
    total_earned: "0",
    total_withdrawn: "0",
    min_withdrawal_amount: "5000",
    commission_rate: "10",
    share_percentage: "50"
  });
  
  const [dashboardStats, setDashboardStats] = useState({
    total_games: 0,
    total_earnings: "0",
    current_balance: "0",
    total_withdrawn: "0",
    pending_withdrawals: "0",
    earnings_this_month: "0",
    earnings_today: "0",
    avg_earning_per_game: "0",
    last_earning_date: null
  });
  
  const [earnings, setEarnings] = useState([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Fetch wallet data
  const fetchWalletData = async () => {
    try {
      const response = await fetch('/api/partner/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWalletData(data.data);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    }
  };
  
  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/partner/wallet/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDashboardStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };
  
  // Fetch earnings history
  const fetchEarnings = async () => {
    setEarningsLoading(true);
    try {
      const response = await fetch('/api/partner/wallet/earnings?page=1&limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEarnings(data.data.earnings);
      }
    } catch (err) {
      console.error('Error fetching earnings:', err);
    } finally {
      setEarningsLoading(false);
    }
  };
  
  // Fetch withdrawal requests
  const fetchWithdrawalRequests = async () => {
    setWithdrawalsLoading(true);
    try {
      const response = await fetch('/api/partner/wallet/withdrawals?page=1&limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWithdrawalRequests(data.data.requests);
      }
    } catch (err) {
      console.error('Error fetching withdrawal requests:', err);
    } finally {
      setWithdrawalsLoading(false);
    }
  };
  
  // Refresh all data
  const refreshAllData = () => {
    fetchWalletData();
    fetchDashboardStats();
    fetchEarnings();
    fetchWithdrawalRequests();
  };

  useEffect(() => {
    fetchWalletData();
    fetchDashboardStats();
  }, [token]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'earnings') {
      fetchEarnings();
    } else if (activeTab === 'withdrawals') {
      fetchWithdrawalRequests();
    }
  }, [activeTab, token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header - Similar to Player Profile */}
      <div className="bg-black/50 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Avatar className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
              <AvatarFallback className="bg-purple-500/20 text-purple-400 text-lg sm:text-xl font-semibold">
                {partner?.full_name?.slice(0, 2).toUpperCase() || 'PA'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-purple-400 truncate">{partner?.full_name}</h1>
              <p className="text-sm sm:text-base text-white/80 truncate">{partner?.email || partner?.phone}</p>
            </div>
            <Button
              onClick={() => setLocation('/partner/dashboard')}
              variant="outline"
              size="sm"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Tabs Navigation */}
          <div className="relative overflow-x-auto -mx-4 sm:mx-0">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none sm:hidden z-10" />
            
            <TabsList className="inline-flex sm:grid w-auto sm:w-full min-w-full sm:min-w-0 grid-cols-4 bg-black/50 border-purple-500/30 px-4 sm:px-0">
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none sm:hidden z-10" />
              
              <TabsTrigger value="wallet" className="text-white hover:text-purple-400 data-[state=active]:text-purple-400 data-[state=active]:bg-purple-500/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                <Wallet className="w-4 h-4 mr-2" />
                Wallet
              </TabsTrigger>
              <TabsTrigger value="earnings" className="text-white hover:text-purple-400 data-[state=active]:text-purple-400 data-[state=active]:bg-purple-500/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                <DollarSign className="w-4 h-4 mr-2" />
                Earnings
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="text-white hover:text-purple-400 data-[state=active]:text-purple-400 data-[state=active]:bg-purple-500/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                <FileText className="w-4 h-4 mr-2" />
                Withdrawals
              </TabsTrigger>
              <TabsTrigger value="account" className="text-white hover:text-purple-400 data-[state=active]:text-purple-400 data-[state=active]:bg-purple-500/10 whitespace-nowrap text-base sm:text-base px-4 sm:px-4 min-h-[44px]">
                <History className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Wallet Card */}
              <WalletCard
                walletBalance={parseFloat(walletData.wallet_balance)}
                totalEarned={parseFloat(walletData.total_earned)}
                totalWithdrawn={parseFloat(walletData.total_withdrawn)}
                minWithdrawal={parseFloat(walletData.min_withdrawal_amount)}
                earningsToday={parseFloat(dashboardStats.earnings_today)}
                earningsThisMonth={parseFloat(dashboardStats.earnings_this_month)}
                onWithdrawalSuccess={refreshAllData}
              />
              
              {/* Stats Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-black/40 border-purple-500/30">
                  <CardContent className="pt-6 text-center">
                    <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Total Games</p>
                    <p className="text-2xl font-bold text-white">{dashboardStats.total_games}</p>
                  </CardContent>
                </Card>
                <Card className="bg-black/40 border-blue-500/30">
                  <CardContent className="pt-6 text-center">
                    <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Avg Per Game</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(parseFloat(dashboardStats.avg_earning_per_game))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-black/40 border-yellow-500/30">
                  <CardContent className="pt-6 text-center">
                    <DollarSign className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Pending Withdrawals</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {formatCurrency(parseFloat(dashboardStats.pending_withdrawals))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-black/40 border-green-500/30">
                  <CardContent className="pt-6 text-center">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Commission Rate</p>
                    <p className="text-2xl font-bold text-green-400">
                      {parseFloat(walletData.commission_rate).toFixed(0)}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <EarningsTable earnings={earnings} loading={earningsLoading} />
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-6">
            <WithdrawalRequestsTable requests={withdrawalRequests} loading={withdrawalsLoading} />
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card className="bg-black/50 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-400">Partner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-4 bg-black/30 rounded-lg border border-purple-500/20">
                    <p className="text-gray-400 text-sm">Full Name</p>
                    <p className="text-white font-semibold">{partner?.full_name}</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-lg border border-purple-500/20">
                    <p className="text-gray-400 text-sm">Partner ID</p>
                    <p className="text-white font-semibold font-mono">{partner?.id?.slice(0, 8)}</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-lg border border-purple-500/20">
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white font-semibold">{partner?.email}</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-lg border border-purple-500/20">
                    <p className="text-gray-400 text-sm">Phone</p>
                    <p className="text-white font-semibold">{partner?.phone}</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-lg border border-purple-500/20">
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className={`font-semibold ${partner?.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {partner?.status?.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="border-t border-purple-500/20 pt-6">
                  <div className="max-w-md mx-auto space-y-4">
                    <h3 className="text-purple-400 font-semibold text-lg">Account Actions</h3>
                    
                    <Button
                      onClick={() => {
                        logout();
                        setLocation('/partner/login');
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
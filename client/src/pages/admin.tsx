import { useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Gift,
  BarChart3,
  History,
  CreditCard,
  Settings,
  GamepadIcon,
  TrendingUp,
  MessageSquare,
  Video,
  RefreshCw,
  TrendingDown,
  UserCheck,
  UserX,
  Ban,
  Activity,
  DollarSign
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import BetMonitoringDashboard from "@/components/BetMonitoringDashboard";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { useAdminStats } from "@/hooks/useAdminStats";

export default function Admin() {
  const { stats, loading, error, refetch } = useAdminStats();

  // Listen for real-time updates from WebSocket
  useEffect(() => {
    // Listen for game history updates
    const handleGameHistoryUpdate = () => {
      console.log('📊 Game history update received, refreshing admin stats...');
      refetch();
    };
    
    // Listen for analytics updates
    const handleAnalyticsUpdate = (event: CustomEvent) => {
      console.log('📈 Analytics update received on admin page:', event.detail);
      // Stats will be updated by AnalyticsDashboard component
      // But we can refresh main stats too
      refetch();
    };
    
    window.addEventListener('game_history_update', handleGameHistoryUpdate as EventListener);
    window.addEventListener('analytics-update', handleAnalyticsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('game_history_update', handleGameHistoryUpdate as EventListener);
      window.removeEventListener('analytics-update', handleAnalyticsUpdate as EventListener);
    };
  }, [refetch]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent drop-shadow-lg mb-2">
                🎰 Admin Dashboard
              </h1>
              <p className="text-gray-400">Central management hub for your gaming platform</p>
            </div>
            <Button
              onClick={refetch}
              disabled={loading}
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </Button>
          </div>
        </div>

        {/* Error Display */}
        <div className="max-w-7xl mx-auto mb-8">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* User Statistics */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">👥 User Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-black/40 border-blue-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-400">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">
                  {loading ? '...' : (stats?.totalUsers || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">All registered users</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-green-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-400">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  {loading ? '...' : (stats?.activeUsers || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Currently active</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-yellow-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-400">Suspended Users</CardTitle>
                <UserX className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-400">
                  {loading ? '...' : (stats?.suspendedUsers || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Temporarily suspended</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-red-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-400">Banned Users</CardTitle>
                <Ban className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-400">
                  {loading ? '...' : (stats?.bannedUsers || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Permanently banned</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Game Statistics */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">🎮 Game Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-400">Active Games</CardTitle>
                <Activity className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-400">
                  {loading ? '...' : (stats?.activeGames || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">Currently running</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-indigo-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-400">Games Today</CardTitle>
                <GamepadIcon className="h-4 w-4 text-indigo-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-400">
                  {loading ? '...' : (stats?.totalGamesToday || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Completed today</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-cyan-400">Active Players</CardTitle>
                <Users className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-400">
                  {loading ? '...' : (stats?.activePlayers || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Playing right now</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Bet Monitoring */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">🧭 Live Bet Monitoring</h2>
          <div className="bg-black/40 border-gold/30 backdrop-blur-sm rounded-lg p-4">
            <BetMonitoringDashboard />
          </div>
        </div>

        {/* Financial Overview */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">💰 Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-black/40 border-green-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-400">Total Winnings</CardTitle>
                <Gift className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  {loading ? '...' : formatCurrency(stats?.totalWinnings || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">All users combined</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-red-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-400">Total Losses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-400">
                  {loading ? '...' : formatCurrency(stats?.totalLosses || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">All users combined</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gold">Net House Profit</CardTitle>
                <CreditCard className="h-4 w-4 text-gold" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${
                  (stats?.netHouseProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {loading ? '...' : formatCurrency(stats?.netHouseProfit || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">House earnings (losses - winnings)</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-emerald-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-400">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-400">
                  {loading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">All-time revenue</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Today's Financial Stats */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">📅 Today's Financial Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-black/40 border-blue-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-400">Today's Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">
                  {loading ? '...' : formatCurrency(stats?.todayRevenue || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">Revenue today</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-orange-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-400">Today's Bets</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-400">
                  {loading ? '...' : formatCurrency(stats?.todayBets || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">Total bets placed</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-pink-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-pink-400">Today's Payouts</CardTitle>
                <TrendingDown className="h-4 w-4 text-pink-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-400">
                  {loading ? '...' : formatCurrency(stats?.todayPayouts || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">Total payouts</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-teal-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-teal-400">Today's Profit/Loss</CardTitle>
                <BarChart3 className="h-4 w-4 text-teal-400" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${
                  (stats?.todayProfitLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {loading ? '...' : formatCurrency(stats?.todayProfitLoss || 0)}
                </div>
                <p className="text-xs text-gray-400 mt-1">Net profit/loss today</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment Requests */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">💳 Payment Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-black/40 border-green-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-400">Pending Deposits</CardTitle>
                <CreditCard className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  {loading ? '...' : (stats?.pendingDeposits || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-orange-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-400">Pending Withdrawals</CardTitle>
                <CreditCard className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-400">
                  {loading ? '...' : (stats?.pendingWithdrawals || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Financial Analytics */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">📈 Financial Analytics</h2>
          <div className="bg-black/40 border-gold/30 backdrop-blur-sm rounded-lg p-4">
            <AnalyticsDashboard />
          </div>
        </div>

        {/* Management Cards */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gold mb-6">📊 Management Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Stream Settings */}
            <Link href="/admin/stream-settings">
              <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-center text-gold text-xl mb-2">Stream Settings</CardTitle>
                  <CardDescription className="text-center text-gray-400">
                    Configure WebRTC & RTMP streaming
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            {/* Game Control */}
            <Link href="/admin/game">
              <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <GamepadIcon className="w-8 h-8 text-black" />
                  </div>
                  <CardTitle className="text-white text-center text-xl">Game Control</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    Control live games, deal cards, manage rounds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm text-gray-400">
                    Click to access game control panel
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* User Management */}
            <Link href="/admin/users">
              <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Users className="w-8 h-8 text-black" />
                  </div>
                  <CardTitle className="text-white text-center text-xl">User Management</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    Manage users, balances, and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm text-gray-400">
                    Search, filter, update user accounts
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Bonus & Referral */}
            <Link href="/admin/bonus">
              <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Gift className="w-8 h-8 text-black" />
                  </div>
                  <CardTitle className="text-white text-center text-xl">Bonus & Referral</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    Manage bonuses, referrals, and rewards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm text-gray-400">
                    Configure bonus settings and track referrals
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Analytics */}
            <Link href="/admin/analytics">
              <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <BarChart3 className="w-8 h-8 text-black" />
                  </div>
                  <CardTitle className="text-white text-center text-xl">Analytics</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    View statistics, reports, and insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm text-gray-400">
                    Today's win/lose and performance metrics
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Game History */}
            <Link href="/admin/game-history">
              <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <History className="w-8 h-8 text-black" />
                  </div>
                  <CardTitle className="text-white text-center text-xl">Game History</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    View complete game records and logs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm text-gray-400">
                    Filter by date, winner, and round
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Payments */}
            <Link href="/admin/payments">
              <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CreditCard className="w-8 h-8 text-black" />
                  </div>
                  <CardTitle className="text-white text-center text-xl">Payments D/W</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    Manage deposits and withdrawals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm text-gray-400">
                    Process payment requests and transactions
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Backend Settings */}
            <Link href="/admin/backend-settings">
              <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Settings className="w-8 h-8 text-black" />
                  </div>
                  <CardTitle className="text-white text-center text-xl">Backend Settings</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    Configure system and game settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm text-gray-400">
                    Advanced configuration options
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* WhatsApp Settings */}
            <Link href="/admin/whatsapp-settings">
              <Card className="bg-black/40 border-green-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-center text-xl">WhatsApp Settings</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    Configure WhatsApp contact number
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm text-gray-400">
                    Set where user requests are sent
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

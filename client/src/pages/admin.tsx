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
  Activity
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import BetMonitoringDashboard from "@/components/BetMonitoringDashboard";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useNotification } from "@/contexts/NotificationContext";

export default function Admin() {
  const { stats, loading, error, refetch } = useAdminStats();
  const { showNotification } = useNotification();

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
      refetch();
    };
    
    // Listen for payment request notifications
    const handlePaymentRequestNotification = (event: CustomEvent) => {
      const notification = event.detail;
      // Handle payment request created notification
      if (notification.type === 'admin_notification' && notification.event === 'payment_request_created') {
        const { request } = notification.data;
        const requestType = request.requestType || request.request_type || 'payment';
        const requestTypeLabel = requestType === 'deposit' ? 'Deposit' : requestType === 'withdrawal' ? 'Withdrawal' : 'Payment';
        showNotification(
          `🔔 New ${requestTypeLabel} Request: ₹${request.amount.toLocaleString('en-IN')} from User ${request.userId}`,
          'info'
        );
        // Refresh stats to show updated pending requests count
        refetch();
      }
    };
    
    window.addEventListener('game_history_update', handleGameHistoryUpdate as EventListener);
    window.addEventListener('analytics-update', handleAnalyticsUpdate as EventListener);
    window.addEventListener('admin_notification', handlePaymentRequestNotification as EventListener);
    
    return () => {
      window.removeEventListener('game_history_update', handleGameHistoryUpdate as EventListener);
      window.removeEventListener('analytics-update', handleAnalyticsUpdate as EventListener);
      window.removeEventListener('admin_notification', handlePaymentRequestNotification as EventListener);
    };
  }, [refetch, showNotification]);

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

  // Calculate net profit and net loss
  const netProfit = (stats?.netHouseProfit || 0) >= 0 ? (stats?.netHouseProfit || 0) : 0;
  const netLoss = (stats?.netHouseProfit || 0) < 0 ? Math.abs(stats?.netHouseProfit || 0) : 0;

  // 📊 DEBUG: Log calculated profit/loss
  if (stats) {
    console.log('📊 Admin Dashboard Display:', {
      netHouseProfit: stats.netHouseProfit,
      totalWinnings: stats.totalWinnings,
      totalLosses: stats.totalLosses,
      netProfit,
      netLoss,
      formatted: {
        profit: formatCurrency(netProfit),
        loss: formatCurrency(netLoss)
      }
    });
  }

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

        {/* Key Metrics - Simplified */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">📊 Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Net Profit */}
            <Card className="bg-black/40 border-green-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-400">Net Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  {loading ? '...' : formatCurrency(netProfit)}
                </div>
                <p className="text-xs text-gray-400 mt-1">House profit</p>
              </CardContent>
            </Card>

            {/* Net Loss */}
            <Card className="bg-black/40 border-red-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-400">Net Loss</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-400">
                  {loading ? '...' : formatCurrency(netLoss)}
                </div>
                <p className="text-xs text-gray-400 mt-1">House loss</p>
              </CardContent>
            </Card>

            {/* Total Games Played */}
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-400">Total Games Played</CardTitle>
                <GamepadIcon className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-400">
                  {loading ? '...' : (stats?.totalGamesToday || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Games completed today</p>
              </CardContent>
            </Card>

            {/* Deposit Requests */}
            <Card className="bg-black/40 border-blue-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-400">Deposit Requests</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">
                  {loading ? '...' : (stats?.pendingDeposits || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Pending approval</p>
              </CardContent>
            </Card>

            {/* Withdrawal Requests */}
            <Card className="bg-black/40 border-orange-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-400">Withdrawal Requests</CardTitle>
                <CreditCard className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-400">
                  {loading ? '...' : (stats?.pendingWithdrawals || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">Pending approval</p>
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

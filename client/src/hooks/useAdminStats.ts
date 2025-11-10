import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  activeGames: number;
  totalGamesToday: number;
  totalRevenue: number;
  todayRevenue: number;
  totalBets: number;
  todayBets: number;
  totalPayouts: number;
  todayPayouts: number;
  profitLoss: number;
  todayProfitLoss: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  activePlayers: number; // Players currently playing in the game
  totalWinnings: number; // Total winnings across all users
  totalLosses: number; // Total losses across all users
  netHouseProfit: number; // Net house profit (losses - winnings)
  approvedDepositsToday: number; // Total deposits approved today
  approvedWithdrawalsToday: number; // Total withdrawals approved today
  approvedDepositsCount: number; // Count of deposits approved today
  approvedWithdrawalsCount: number; // Count of withdrawals approved today
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch multiple endpoints in parallel
      const [
        usersResponse,
        dailyAnalyticsResponse,
        allTimeAnalyticsResponse,
        realtimeResponse,
        paymentsResponse,
        paymentsSummaryResponse
      ] = await Promise.all([
        apiClient.get('/admin/statistics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('❌ Failed to fetch user statistics:', err);
          return { success: false, data: null };
        }),
        
        apiClient.get('/admin/analytics?period=daily', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('❌ Failed to fetch daily analytics:', err);
          return { success: false, data: null };
        }),
        
        apiClient.get('/admin/analytics/all-time', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('❌ Failed to fetch all-time analytics:', err);
          return { success: false, data: null };
        }),
        
        apiClient.get('/admin/realtime-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('❌ Failed to fetch realtime stats:', err);
          return { success: false, data: null };
        }),
        
        apiClient.get('/admin/payment-requests/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('❌ Failed to fetch payment requests:', err);
          return { success: false, data: [] };
        }),
        
        apiClient.get('/admin/payments/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('❌ Failed to fetch payments summary:', err);
          return { success: false, data: null };
        })
      ]);

      // Log which calls succeeded/failed
      const failures: string[] = [];
      if (!(usersResponse as any).success) failures.push('user statistics');
      if (!(dailyAnalyticsResponse as any).success) failures.push('daily analytics');
      if (!(allTimeAnalyticsResponse as any).success) failures.push('all-time analytics');
      if (!(realtimeResponse as any).success) failures.push('realtime stats');
      if (!(paymentsResponse as any).success) failures.push('payment requests');
      if (!(paymentsSummaryResponse as any).success) failures.push('payments summary');

      if (failures.length > 0) {
        console.warn(`⚠️ Some admin stats failed to load: ${failures.join(', ')}`);
      }

      const userStats = (usersResponse as any).success ? (usersResponse as any).data : null;
      const dailyAnalytics = (dailyAnalyticsResponse as any).success ? (dailyAnalyticsResponse as any).data : null;
      const allTimeAnalytics = (allTimeAnalyticsResponse as any).success ? (allTimeAnalyticsResponse as any).data : null;
      const realtimeStats = (realtimeResponse as any).success ? (realtimeResponse as any).data : null;
      const paymentRequests = (paymentsResponse as any).success ? (paymentsResponse as any).data : [];
      const paymentsSummary = (paymentsSummaryResponse as any).success ? (paymentsSummaryResponse as any).data : null;

      const pendingDeposits = Array.isArray(paymentRequests) 
        ? paymentRequests.filter((r: any) => r.request_type === 'deposit' && r.status === 'pending').length
        : 0;
      const pendingWithdrawals = Array.isArray(paymentRequests)
        ? paymentRequests.filter((r: any) => r.request_type === 'withdrawal' && r.status === 'pending').length
        : 0;

      // ✅ FIX: Use backend-calculated financial stats from getUserStatistics
      const totalWinnings = userStats?.totalWinnings || 0;
      const totalLosses = userStats?.totalLosses || 0;
      const netHouseProfit = userStats?.netHouseProfit || (totalLosses - totalWinnings);
      
      console.log('💰 Admin Stats - Financial Data:', {
        source: 'Multiple APIs',
        userStats: {
          totalWinnings,
          totalLosses,
          netHouseProfit
        },
        allTimeAnalytics: {
          totalGames: allTimeAnalytics?.totalGames || 0,
          totalBets: allTimeAnalytics?.totalBets || 0,
          totalPayouts: allTimeAnalytics?.totalPayouts || 0,
          profitLoss: allTimeAnalytics?.profitLoss || 0
        },
        dailyAnalytics: {
          totalGames: dailyAnalytics?.totalGames || 0,
          totalBets: dailyAnalytics?.totalBets || 0,
          profitLoss: dailyAnalytics?.profitLoss || 0
        }
      });

      // ✅ TODAY-FOCUSED DASHBOARD CONTRACT (Option A)
      // - totalGamesToday and netHouseProfit are driven by DAILY analytics
      // - Net Profit / Net Loss cards on /admin use these values:
      //     netProfit = max(netHouseProfit, 0)
      //     netLoss = abs(min(netHouseProfit, 0))
      const todayGames = dailyAnalytics?.totalGames || realtimeStats?.todayGameCount || 0;
      const todayProfitLoss = dailyAnalytics?.profitLoss || 0;

      const combinedStats: AdminStats = {
        totalUsers: userStats?.totalUsers || 0,
        activeUsers: userStats?.activeUsers || 0,
        suspendedUsers: userStats?.suspendedUsers || 0,
        bannedUsers: userStats?.bannedUsers || 0,

        // Active game info from realtime endpoint
        activeGames: realtimeStats?.currentGame ? 1 : 0,

        // TODAY stats for dashboard header
        totalGamesToday: todayGames,

        // All-time vs today breakdown using analytics endpoints
        totalRevenue: allTimeAnalytics?.totalBets || 0,
        todayRevenue: dailyAnalytics?.totalBets || 0,
        totalBets: allTimeAnalytics?.totalBets || 0,
        todayBets: dailyAnalytics?.totalBets || 0,
        totalPayouts: allTimeAnalytics?.totalPayouts || 0,
        todayPayouts: dailyAnalytics?.totalPayouts || 0,
        profitLoss: allTimeAnalytics?.profitLoss || 0,
        todayProfitLoss,

        // Pending requests from payment-requests/pending
        pendingDeposits,
        pendingWithdrawals,

        // Realtime active players (fallback to todayPlayers if provided)
        activePlayers: realtimeStats?.currentGame?.totalPlayers || realtimeStats?.todayPlayers || 0,

        // Player aggregate metrics (from userStats)
        totalWinnings,
        totalLosses,

        // ✅ CRITICAL: Use TODAY's profit/loss for dashboard Net Profit/Net Loss
        // This value is consumed directly by admin.tsx:
        //   netProfit = max(stats.netHouseProfit, 0)
        //   netLoss = abs(min(stats.netHouseProfit, 0))
        netHouseProfit: todayProfitLoss,

        // ✅ NEW: Approved payments today from payments summary endpoint
        approvedDepositsToday: paymentsSummary?.approvedDepositsToday || 0,
        approvedWithdrawalsToday: paymentsSummary?.approvedWithdrawalsToday || 0,
        approvedDepositsCount: paymentsSummary?.approvedDepositsCount || 0,
        approvedWithdrawalsCount: paymentsSummary?.approvedWithdrawalsCount || 0
      };

      setStats(combinedStats);
    } catch (err: any) {
      console.error('Failed to fetch admin stats:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [token]);

  return { stats, loading, error, refetch: fetchStats };
}


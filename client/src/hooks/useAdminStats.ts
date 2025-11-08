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
        paymentsResponse
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
        })
      ]);

      // Log which calls succeeded/failed
      const failures: string[] = [];
      if (!(usersResponse as any).success) failures.push('user statistics');
      if (!(dailyAnalyticsResponse as any).success) failures.push('daily analytics');
      if (!(allTimeAnalyticsResponse as any).success) failures.push('all-time analytics');
      if (!(realtimeResponse as any).success) failures.push('realtime stats');
      if (!(paymentsResponse as any).success) failures.push('payment requests');

      if (failures.length > 0) {
        console.warn(`⚠️ Some admin stats failed to load: ${failures.join(', ')}`);
      }

      const userStats = (usersResponse as any).success ? (usersResponse as any).data : null;
      const dailyAnalytics = (dailyAnalyticsResponse as any).success ? (dailyAnalyticsResponse as any).data : null;
      const allTimeAnalytics = (allTimeAnalyticsResponse as any).success ? (allTimeAnalyticsResponse as any).data : null;
      const realtimeStats = (realtimeResponse as any).success ? (realtimeResponse as any).data : null;
      const paymentRequests = (paymentsResponse as any).success ? (paymentsResponse as any).data : [];

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

      const combinedStats: AdminStats = {
        totalUsers: userStats?.totalUsers || 0,
        activeUsers: userStats?.activeUsers || 0,
        suspendedUsers: userStats?.suspendedUsers || 0,
        bannedUsers: userStats?.bannedUsers || 0,
        activeGames: realtimeStats?.currentGame ? 1 : 0,
        totalGamesToday: realtimeStats?.todayGameCount || dailyAnalytics?.totalGames || 0,
        
        // ✅ FIX: Use ALL TIME stats for totals, daily stats for today
        totalRevenue: allTimeAnalytics?.totalBets || 0,           // ALL TIME
        todayRevenue: dailyAnalytics?.totalBets || 0,             // TODAY
        totalBets: allTimeAnalytics?.totalBets || 0,              // ALL TIME
        todayBets: dailyAnalytics?.totalBets || 0,                // TODAY
        totalPayouts: allTimeAnalytics?.totalPayouts || 0,        // ALL TIME
        todayPayouts: dailyAnalytics?.totalPayouts || 0,          // TODAY
        profitLoss: allTimeAnalytics?.profitLoss || 0,            // ALL TIME
        todayProfitLoss: dailyAnalytics?.profitLoss || 0,         // TODAY
        
        pendingDeposits,
        pendingWithdrawals,
        activePlayers: realtimeStats?.currentGame?.totalPlayers || realtimeStats?.todayPlayers || 0,
        totalWinnings,
        totalLosses,
        netHouseProfit
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


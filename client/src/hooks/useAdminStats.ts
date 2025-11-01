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
  pendingDepositsAmount: number; // Total amount of pending deposits
  pendingWithdrawalsAmount: number; // Total amount of pending withdrawals
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
        analyticsResponse,
        realtimeResponse,
        paymentsResponse,
        allUsersResponse
      ] = await Promise.all([
        apiClient.get('/admin/statistics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('Failed to fetch user statistics:', err);
          return { success: false, data: null };
        }),
        
        apiClient.get('/admin/analytics?period=daily', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('Failed to fetch analytics:', err);
          return { success: false, data: null };
        }),
        
        apiClient.get('/admin/realtime-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('Failed to fetch realtime stats:', err);
          return { success: false, data: null };
        }),
        
        apiClient.get('/admin/payment-requests/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('Failed to fetch payment requests:', err);
          return { success: false, data: [] };
        }),
        
        apiClient.get('/admin/users?limit=1000', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('Failed to fetch users:', err);
          return { success: false, data: { users: [] } };
        })
      ]);

      // Parse responses - handle both {success, data} and {success, user} structures
      let userStats = null;
      if ((usersResponse as any)?.success) {
        // getUserStatistics returns { success: true, user: statistics }
        userStats = (usersResponse as any).user || (usersResponse as any).data || null;
      } else if ((usersResponse as any)?.totalUsers !== undefined) {
        userStats = usersResponse as any;
      }

      let dailyAnalytics = null;
      if ((analyticsResponse as any)?.success) {
        dailyAnalytics = (analyticsResponse as any).data || null;
      } else if ((analyticsResponse as any)?.totalBets !== undefined) {
        dailyAnalytics = analyticsResponse as any;
      }

      let realtimeStats = null;
      if ((realtimeResponse as any)?.success) {
        realtimeStats = (realtimeResponse as any).data || null;
      } else if ((realtimeResponse as any)?.currentGame !== undefined || (realtimeResponse as any)?.todayGameCount !== undefined) {
        realtimeStats = realtimeResponse as any;
      }

      let paymentRequests: any[] = [];
      if ((paymentsResponse as any)?.success) {
        paymentRequests = Array.isArray((paymentsResponse as any).data) 
          ? (paymentsResponse as any).data 
          : Array.isArray(paymentsResponse) 
            ? paymentsResponse as any[] 
            : [];
      } else if (Array.isArray(paymentsResponse)) {
        paymentRequests = paymentsResponse as any[];
      }

      let allUsers: any[] = [];
      if ((allUsersResponse as any)?.success) {
        allUsers = Array.isArray((allUsersResponse as any).data?.users) 
          ? (allUsersResponse as any).data.users 
          : Array.isArray((allUsersResponse as any).data) 
            ? (allUsersResponse as any).data 
            : Array.isArray((allUsersResponse as any).users) 
              ? (allUsersResponse as any).users 
              : [];
      } else if (Array.isArray((allUsersResponse as any)?.users)) {
        allUsers = (allUsersResponse as any).users;
      } else if (Array.isArray((allUsersResponse as any)?.data)) {
        allUsers = (allUsersResponse as any).data;
      }

      console.log('📊 Admin Stats Debug:', {
        userStats,
        dailyAnalytics,
        realtimeStats: realtimeStats ? { 
          todayGameCount: realtimeStats.todayGameCount,
          todayBetTotal: realtimeStats.todayBetTotal,
          hasCurrentGame: !!realtimeStats.currentGame
        } : null,
        paymentRequestsCount: paymentRequests.length,
        allUsersCount: allUsers.length,
        sampleUser: allUsers[0] ? {
          id: allUsers[0].id,
          totalWinnings: allUsers[0].totalWinnings,
          totalLosses: allUsers[0].totalLosses
        } : null
      });

      const pendingDepositRequests = Array.isArray(paymentRequests) 
        ? paymentRequests.filter((r: any) => {
            const requestType = r.request_type || r.requestType || r.type;
            const status = r.status;
            return requestType === 'deposit' && status === 'pending';
          })
        : [];
      const pendingWithdrawalRequests = Array.isArray(paymentRequests)
        ? paymentRequests.filter((r: any) => {
            const requestType = r.request_type || r.requestType || r.type;
            const status = r.status;
            return requestType === 'withdrawal' && status === 'pending';
          })
        : [];
      
      const pendingDeposits = pendingDepositRequests.length;
      const pendingWithdrawals = pendingWithdrawalRequests.length;
      
      // Calculate total amounts
      const pendingDepositsAmount = pendingDepositRequests.reduce(
        (sum: number, r: any) => sum + (parseFloat(r.amount || '0') || 0), 
        0
      );
      const pendingWithdrawalsAmount = pendingWithdrawalRequests.reduce(
        (sum: number, r: any) => sum + (parseFloat(r.amount || '0') || 0), 
        0
      );

      // Calculate financial statistics from all users
      // Handle different field name variations
      const totalWinnings = allUsers.reduce((sum: number, u: any) => {
        const winnings = u.totalWinnings || u.total_winnings || u.totalWinnings || 0;
        return sum + (typeof winnings === 'string' ? parseFloat(winnings) || 0 : (winnings || 0));
      }, 0);
      const totalLosses = allUsers.reduce((sum: number, u: any) => {
        const losses = u.totalLosses || u.total_losses || u.totalLosses || 0;
        return sum + (typeof losses === 'string' ? parseFloat(losses) || 0 : (losses || 0));
      }, 0);
      const netHouseProfit = totalLosses - totalWinnings;

      // Use realtime stats as fallback for today's data if daily analytics is empty
      const todayBets = dailyAnalytics?.totalBets || realtimeStats?.todayBetTotal || 0;
      const todayPayouts = dailyAnalytics?.totalPayouts || 0;
      const todayProfitLoss = dailyAnalytics?.profitLoss || 
        (dailyAnalytics?.totalBets && dailyAnalytics?.totalPayouts 
          ? dailyAnalytics.totalBets - dailyAnalytics.totalPayouts 
          : 0);

      const combinedStats: AdminStats = {
        totalUsers: userStats?.totalUsers || 0,
        activeUsers: userStats?.activeUsers || 0,
        suspendedUsers: userStats?.suspendedUsers || 0,
        bannedUsers: userStats?.bannedUsers || 0,
        activeGames: realtimeStats?.currentGame ? 1 : 0,
        totalGamesToday: realtimeStats?.todayGameCount || dailyAnalytics?.totalGames || 0,
        totalRevenue: dailyAnalytics?.totalRevenue || todayBets || 0,
        todayRevenue: todayProfitLoss || 0,
        totalBets: dailyAnalytics?.totalBets || todayBets || 0,
        todayBets: todayBets,
        totalPayouts: dailyAnalytics?.totalPayouts || todayPayouts || 0,
        todayPayouts: todayPayouts,
        profitLoss: dailyAnalytics?.profitLoss || todayProfitLoss || 0,
        todayProfitLoss: todayProfitLoss,
        pendingDeposits,
        pendingWithdrawals,
        pendingDepositsAmount,
        pendingWithdrawalsAmount,
        activePlayers: realtimeStats?.currentGame?.totalPlayers || realtimeStats?.todayPlayers || 0,
        totalWinnings,
        totalLosses,
        netHouseProfit
      };

      console.log('✅ Combined Stats:', combinedStats);
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
    // Refresh every 15 seconds for live monitoring
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [token]);

  return { stats, loading, error, refetch: fetchStats };
}


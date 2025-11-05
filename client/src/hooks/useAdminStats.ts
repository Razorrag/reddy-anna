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
        analyticsResponse,
        realtimeResponse,
        paymentsResponse,
        allUsersResponse
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
        
        apiClient.get('/admin/users?limit=1000', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch((err) => {
          console.error('❌ Failed to fetch users:', err);
          return { success: false, data: { users: [] } };
        })
      ]);

      // Log which calls succeeded/failed
      const failures: string[] = [];
      if (!(usersResponse as any).success) failures.push('user statistics');
      if (!(analyticsResponse as any).success) failures.push('daily analytics');
      if (!(realtimeResponse as any).success) failures.push('realtime stats');
      if (!(paymentsResponse as any).success) failures.push('payment requests');
      if (!(allUsersResponse as any).success) failures.push('users list');

      if (failures.length > 0) {
        console.warn(`⚠️ Some admin stats failed to load: ${failures.join(', ')}`);
      }

      const userStats = (usersResponse as any).success ? (usersResponse as any).data : null;
      const dailyAnalytics = (analyticsResponse as any).success ? (analyticsResponse as any).data : null;
      const realtimeStats = (realtimeResponse as any).success ? (realtimeResponse as any).data : null;
      const paymentRequests = (paymentsResponse as any).success ? (paymentsResponse as any).data : [];
      const allUsers = (allUsersResponse as any).success && (allUsersResponse as any).data?.users 
        ? (allUsersResponse as any).data.users 
        : [];

      const pendingDeposits = Array.isArray(paymentRequests) 
        ? paymentRequests.filter((r: any) => r.request_type === 'deposit' && r.status === 'pending').length
        : 0;
      const pendingWithdrawals = Array.isArray(paymentRequests)
        ? paymentRequests.filter((r: any) => r.request_type === 'withdrawal' && r.status === 'pending').length
        : 0;

      // Calculate financial statistics from all users
      // ✅ FIX: Use snake_case field names from database
      const totalWinnings = allUsers.reduce((sum: number, u: any) => {
        const winnings = u.total_winnings || u.totalWinnings || 0;
        return sum + (typeof winnings === 'string' ? parseFloat(winnings) : winnings);
      }, 0);
      const totalLosses = allUsers.reduce((sum: number, u: any) => {
        const losses = u.total_losses || u.totalLosses || 0;
        return sum + (typeof losses === 'string' ? parseFloat(losses) : losses);
      }, 0);
      const netHouseProfit = totalLosses - totalWinnings;

      // 📊 DEBUG: Log profit/loss calculation
      console.log('💰 Admin Stats - Financial Calculation:', {
        totalUsers: allUsers.length,
        totalWinnings,
        totalLosses,
        netHouseProfit,
        sampleUser: allUsers[0] ? {
          id: allUsers[0].id?.slice(0, 8),
          total_winnings: allUsers[0].total_winnings,
          total_losses: allUsers[0].total_losses
        } : 'No users'
      });

      const combinedStats: AdminStats = {
        totalUsers: userStats?.totalUsers || 0,
        activeUsers: userStats?.activeUsers || 0,
        suspendedUsers: userStats?.suspendedUsers || 0,
        bannedUsers: userStats?.bannedUsers || 0,
        activeGames: realtimeStats?.currentGame ? 1 : 0,
        totalGamesToday: realtimeStats?.todayGameCount || dailyAnalytics?.totalGames || 0,
        totalRevenue: dailyAnalytics?.totalBets || 0,
        todayRevenue: dailyAnalytics?.profitLoss || 0,
        totalBets: dailyAnalytics?.totalBets || 0,
        todayBets: dailyAnalytics?.totalBets || 0,
        totalPayouts: dailyAnalytics?.totalPayouts || 0,
        todayPayouts: dailyAnalytics?.totalPayouts || 0,
        profitLoss: dailyAnalytics?.profitLoss || 0,
        todayProfitLoss: dailyAnalytics?.profitLoss || 0,
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


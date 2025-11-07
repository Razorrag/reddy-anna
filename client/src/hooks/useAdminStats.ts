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
      let allUsers: any[] = [];
      if ((allUsersResponse as any).success) {
        const responseBody = allUsersResponse as any;
        if (Array.isArray(responseBody.users)) {
          allUsers = responseBody.users;
        } else if (responseBody.data?.users && Array.isArray(responseBody.data.users)) {
          allUsers = responseBody.data.users;
        } else if (Array.isArray(responseBody.data)) {
          allUsers = responseBody.data;
        }
      }

      console.log('🧮 Users array selected for calculation:', {
        length: allUsers.length,
        keys: allUsers.length > 0 ? Object.keys(allUsers[0]) : [],
        rawResponseKeys: Object.keys(allUsersResponse as any ?? {})
      });

      const pendingDeposits = Array.isArray(paymentRequests) 
        ? paymentRequests.filter((r: any) => r.request_type === 'deposit' && r.status === 'pending').length
        : 0;
      const pendingWithdrawals = Array.isArray(paymentRequests)
        ? paymentRequests.filter((r: any) => r.request_type === 'withdrawal' && r.status === 'pending').length
        : 0;

      // 🔍 DEBUG: Log RAW user data received from backend
      console.log('📥 Frontend received ALL users from backend:', {
        totalUsers: allUsers.length,
        allUsersData: allUsers.map((u: any) => ({
          id: u.id,
          totalWinnings: u.totalWinnings || u.total_winnings || 0,
          totalLosses: u.totalLosses || u.total_losses || 0,
          gamesPlayed: u.gamesPlayed || u.games_played || 0
        }))
      });

      // Calculate financial statistics from all users
      // ✅ FIX: Use snake_case field names from database
      const totalWinnings = allUsers.reduce((sum: number, u: any) => {
        // Try multiple field name formats
        const winnings = u.totalWinnings ?? u.total_winnings ?? 0;
        const parsedWinnings = typeof winnings === 'string' ? parseFloat(winnings) : (typeof winnings === 'number' ? winnings : 0);
        const finalWinnings = isNaN(parsedWinnings) ? 0 : parsedWinnings;
        console.log(`  User ${u.id}: adding ${finalWinnings} winnings (raw: ${winnings}, type: ${typeof winnings})`);
        return sum + finalWinnings;
      }, 0);
      
      const totalLosses = allUsers.reduce((sum: number, u: any) => {
        // Try multiple field name formats
        const losses = u.totalLosses ?? u.total_losses ?? 0;
        const parsedLosses = typeof losses === 'string' ? parseFloat(losses) : (typeof losses === 'number' ? losses : 0);
        const finalLosses = isNaN(parsedLosses) ? 0 : parsedLosses;
        console.log(`  User ${u.id}: adding ${finalLosses} losses (raw: ${losses}, type: ${typeof losses})`);
        return sum + finalLosses;
      }, 0);
      
      const netHouseProfit = totalLosses - totalWinnings;
      
      console.log('🔢 Calculation breakdown:', {
        totalWinningsCalculated: totalWinnings,
        totalLossesCalculated: totalLosses,
        formula: `${totalLosses} - ${totalWinnings} = ${netHouseProfit}`,
        netHouseProfit
      });

      // 📊 DEBUG: Log profit/loss calculation
      console.log('💰 Admin Stats - Financial Calculation RESULT:', {
        totalUsers: allUsers.length,
        totalWinnings,
        totalLosses,
        netHouseProfit
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


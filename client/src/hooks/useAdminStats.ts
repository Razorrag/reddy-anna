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
        paymentsResponse
      ] = await Promise.all([
        apiClient.get('/admin/statistics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ success: false, data: null })),
        
        apiClient.get('/admin/analytics?period=daily', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ success: false, data: null })),
        
        apiClient.get('/admin/realtime-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ success: false, data: null })),
        
        apiClient.get('/admin/payment-requests/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ success: false, data: [] }))
      ]);

      const userStats = (usersResponse as any).success ? (usersResponse as any).data : null;
      const dailyAnalytics = (analyticsResponse as any).success ? (analyticsResponse as any).data : null;
      const realtimeStats = (realtimeResponse as any).success ? (realtimeResponse as any).data : null;
      const paymentRequests = (paymentsResponse as any).success ? (paymentsResponse as any).data : [];

      const pendingDeposits = Array.isArray(paymentRequests) 
        ? paymentRequests.filter((r: any) => r.request_type === 'deposit' && r.status === 'pending').length
        : 0;
      const pendingWithdrawals = Array.isArray(paymentRequests)
        ? paymentRequests.filter((r: any) => r.request_type === 'withdrawal' && r.status === 'pending').length
        : 0;

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
        pendingWithdrawals
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


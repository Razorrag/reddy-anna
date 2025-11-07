import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Calendar,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import { DailyAnalytics, MonthlyAnalytics, YearlyAnalytics, RealtimeStats } from '@/types/game';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

interface AnalyticsDashboardProps {
  showBelowControls?: boolean;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ showBelowControls = false }) => {
  const [realtimeData, setRealtimeData] = useState<RealtimeStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyAnalytics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0.00';
    }
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };


  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real-time stats
      try {
        const realtimeResult = await apiClient.get('/admin/realtime-stats') as any;
        if (realtimeResult.success && realtimeResult.data) {
          setRealtimeData(realtimeResult.data);
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        console.error('Failed to fetch realtime stats:', error);
        setConnectionStatus('disconnected');
      }
      
      // Fetch daily stats
      try {
        const dailyResult = await apiClient.get('/admin/analytics?period=daily') as any;
        if (dailyResult.success && dailyResult.data) {
          setDailyData(dailyResult.data);
        }
      } catch (error) {
        console.error('Failed to fetch daily stats:', error);
      }
      
      // Fetch monthly stats
      try {
        const monthlyResult = await apiClient.get(`/admin/analytics?period=monthly&month=${selectedMonth}`) as any;
        console.log('📊 Monthly Analytics Response:', monthlyResult);
        if (monthlyResult.success && monthlyResult.data) {
          console.log('📊 Monthly Data Received:', monthlyResult.data);
          setMonthlyData(monthlyResult.data);
        } else {
          console.log('❌ Monthly data missing or unsuccessful');
        }
      } catch (error) {
        console.error('Failed to fetch monthly stats:', error);
      }
      
      // Fetch yearly stats
      try {
        const yearlyResult = await apiClient.get(`/admin/analytics?period=yearly&year=${selectedYear}`) as any;
        if (yearlyResult.success && yearlyResult.data) {
          setYearlyData(yearlyResult.data);
        }
      } catch (error) {
        console.error('Failed to fetch yearly stats:', error);
      }
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to fetch analytics data');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time WebSocket updates
  const handleRealtimeUpdate = useCallback((event: CustomEvent) => {
    console.log('📊 Real-time analytics update received:', event.detail);
    setRealtimeData(event.detail);
    setConnectionStatus('connected');
  }, []);

  const handleAnalyticsUpdate = useCallback((event: CustomEvent) => {
    console.log('📈 Analytics update received:', event.detail);
    // Update relevant analytics data based on the update type
    if (event.detail.type === 'daily') {
      setDailyData(event.detail.data);
    } else if (event.detail.type === 'monthly') {
      setMonthlyData(event.detail.data);
    } else if (event.detail.type === 'yearly') {
      setYearlyData(event.detail.data);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    
    // Set up polling for real-time updates (every 30 seconds)
    const intervalId = setInterval(fetchAnalytics, 30000);
    
    // Set up event listeners for WebSocket updates
    window.addEventListener('realtime-analytics-update', handleRealtimeUpdate as EventListener);
    window.addEventListener('analytics-update', handleAnalyticsUpdate as EventListener);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('realtime-analytics-update', handleRealtimeUpdate as EventListener);
      window.removeEventListener('analytics-update', handleAnalyticsUpdate as EventListener);
    };
  }, [selectedMonth, selectedYear, handleRealtimeUpdate, handleAnalyticsUpdate]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
  }> = ({ title, value, change, icon, trend = 'neutral' }) => (
    <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-300 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {change !== undefined && (
              <p className={`text-sm mt-1 ${
                trend === 'up' ? 'text-green-400' : 
                trend === 'down' ? 'text-red-400' : 
                'text-purple-300'
              }`}>
                {trend === 'up' && <TrendingUp className="inline h-3 w-3 mr-1" />}
                {trend === 'down' && <TrendingDown className="inline h-3 w-3 mr-1" />}
                {change > 0 ? '+' : ''}{change}%
              </p>
            )}
          </div>
          <div className="text-purple-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className={`analytics-dashboard ${showBelowControls ? 'below-controls' : ''}`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="animate-spin h-6 w-6 text-purple-400 mr-3" />
          <span className="text-purple-200">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`analytics-dashboard ${showBelowControls ? 'below-controls' : ''}`}>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchAnalytics} className="mt-2 bg-red-600 hover:bg-red-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-dashboard ${showBelowControls ? 'below-controls' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Real-Time Analytics</h3>
          <p className="text-purple-200">Live game statistics and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected' 
              ? 'bg-green-900/30 text-green-400 border border-green-400/30' 
              : 'bg-red-900/30 text-red-400 border border-red-400/30'
          }`}>
            {connectionStatus === 'connected' ? (
              <><Wifi className="h-4 w-4" /> Live</>
            ) : (
              <><WifiOff className="h-4 w-4" /> Offline</>
            )}
          </div>
          <Button onClick={fetchAnalytics} variant="outline" size="sm" 
            className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Game Stats */}
      {realtimeData?.currentGame && (
        <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Current Game
            </CardTitle>
            <CardDescription className="text-purple-200">
              Live statistics from the ongoing game
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-purple-300 text-sm">Game ID</p>
                <p className="text-white font-mono text-sm">
                  {realtimeData.currentGame.id.slice(0, 8)}...
                </p>
              </div>
              <div>
                <p className="text-purple-300 text-sm">Phase</p>
                <p className="text-white capitalize">{realtimeData.currentGame.phase}</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm">Round</p>
                <p className="text-white">{realtimeData.currentGame.currentRound}</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm">Players</p>
                <p className="text-white">{realtimeData.currentGame.totalPlayers}</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm">Andar Bets</p>
                <p className="text-red-400 font-semibold">
                  {formatCurrency(realtimeData.currentGame.andarTotal)}
                </p>
              </div>
              <div>
                <p className="text-purple-300 text-sm">Bahar Bets</p>
                <p className="text-blue-400 font-semibold">
                  {formatCurrency(realtimeData.currentGame.baharTotal)}
                </p>
              </div>
              <div>
                <p className="text-purple-300 text-sm">Total Bets</p>
                <p className="text-white font-semibold">
                  {formatCurrency(realtimeData.currentGame.andarTotal + realtimeData.currentGame.baharTotal)}
                </p>
              </div>
              <div>
                <p className="text-purple-300 text-sm">Timer</p>
                <p className="text-white">{realtimeData.currentGame.timer}s</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Summary */}
      {dailyData && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Today's Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Games"
              value={dailyData.totalGames || 0}
              icon={<Activity className="h-6 w-6" />}
            />
            <MetricCard
              title="Total Bets"
              value={formatCurrency(dailyData.totalBets || 0)}
              icon={<DollarSign className="h-6 w-6" />}
            />
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(dailyData.totalRevenue || 0)}
              icon={<TrendingUp className="h-6 w-6" />}
            />
            <MetricCard
              title="Payouts"
              value={formatCurrency(dailyData.totalPayouts || 0)}
              icon={<TrendingDown className="h-6 w-6" />}
            />
            <MetricCard
              title="Profit/Loss"
              value={formatCurrency(dailyData.profitLoss || 0)}
              change={dailyData.profitLossPercentage || 0}
              trend={(dailyData.profitLoss || 0) >= 0 ? 'up' : 'down'}
              icon={(dailyData.profitLoss || 0) >= 0 ? 
                <TrendingUp className="h-6 w-6" /> : 
                <TrendingDown className="h-6 w-6" />
              }
            />
            <MetricCard
              title="Unique Players"
              value={dailyData.uniquePlayers || 0}
              icon={<Users className="h-6 w-6" />}
            />
            <MetricCard
              title="Peak Bets Hour"
              value={dailyData.peakBetsHour !== undefined && dailyData.peakBetsHour !== null 
                ? `${dailyData.peakBetsHour}:00` 
                : 'N/A'}
              icon={<Activity className="h-6 w-6" />}
            />
          </div>
        </div>
      )}

      {/* Monthly Analytics */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Monthly Analytics</h4>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40 bg-purple-900/50 border-purple-400/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthYear = date.toISOString().slice(0, 7);
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <SelectItem key={monthYear} value={monthYear}>
                    {monthName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        
        {monthlyData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Games"
              value={monthlyData.totalGames || 0}
              icon={<Activity className="h-6 w-6" />}
            />
            <MetricCard
              title="Total Bets"
              value={formatCurrency(monthlyData.totalBets || 0)}
              icon={<DollarSign className="h-6 w-6" />}
            />
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(monthlyData.totalRevenue || 0)}
              icon={<TrendingUp className="h-6 w-6" />}
            />
            <MetricCard
              title="Payouts"
              value={formatCurrency(monthlyData.totalPayouts || 0)}
              icon={<TrendingDown className="h-6 w-6" />}
            />
            <MetricCard
              title="Profit/Loss"
              value={formatCurrency(monthlyData.profitLoss || 0)}
              change={monthlyData.profitLossPercentage || 0}
              trend={(monthlyData.profitLoss || 0) >= 0 ? 'up' : 'down'}
              icon={(monthlyData.profitLoss || 0) >= 0 ? 
                <TrendingUp className="h-6 w-6" /> : 
                <TrendingDown className="h-6 w-6" />
              }
            />
            <MetricCard
              title="Unique Players"
              value={monthlyData.uniquePlayers || 0}
              icon={<Users className="h-6 w-6" />}
            />
          </div>
        )}
      </div>

      {/* Yearly Analytics */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Yearly Analytics</h4>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32 bg-purple-900/50 border-purple-400/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        
        {yearlyData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Games"
              value={yearlyData.totalGames || 0}
              icon={<Activity className="h-6 w-6" />}
            />
            <MetricCard
              title="Total Bets"
              value={formatCurrency(yearlyData.totalBets || 0)}
              icon={<DollarSign className="h-6 w-6" />}
            />
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(yearlyData.totalRevenue || 0)}
              icon={<TrendingUp className="h-6 w-6" />}
            />
            <MetricCard
              title="Payouts"
              value={formatCurrency(yearlyData.totalPayouts || 0)}
              icon={<TrendingDown className="h-6 w-6" />}
            />
            <MetricCard
              title="Profit/Loss"
              value={formatCurrency(yearlyData.profitLoss || 0)}
              change={yearlyData.profitLossPercentage || 0}
              trend={(yearlyData.profitLoss || 0) >= 0 ? 'up' : 'down'}
              icon={(yearlyData.profitLoss || 0) >= 0 ? 
                <TrendingUp className="h-6 w-6" /> : 
                <TrendingDown className="h-6 w-6" />
              }
            />
            <MetricCard
              title="Unique Players"
              value={yearlyData.uniquePlayers || 0}
              icon={<Users className="h-6 w-6" />}
            />
          </div>
        )}
      </div>

      {/* Detailed Breakdown */}
      <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Detailed Breakdown</CardTitle>
          <CardDescription className="text-purple-200">
            Comprehensive analytics breakdown across different time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <h5 className="text-purple-300 text-sm font-medium mb-2">Total Bets (Today)</h5>
              <p className="text-xl font-bold text-white">
                {formatCurrency(dailyData?.totalBets || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <h5 className="text-purple-300 text-sm font-medium mb-2">Total Revenue (Today)</h5>
              <p className="text-xl font-bold text-white">
                {formatCurrency(dailyData?.totalRevenue || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <h5 className="text-purple-300 text-sm font-medium mb-2">Total Payouts (Today)</h5>
              <p className="text-xl font-bold text-white">
                {formatCurrency(dailyData?.totalPayouts || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <h5 className="text-purple-300 text-sm font-medium mb-2">Net Profit (Today)</h5>
              <p className={`text-xl font-bold ${
                (dailyData?.profitLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(dailyData?.profitLoss || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <h5 className="text-purple-300 text-sm font-medium mb-2">Profit % (Today)</h5>
              <p className={`text-xl font-bold ${
                (dailyData?.profitLossPercentage || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(dailyData?.profitLossPercentage || 0).toFixed(2)}%
              </p>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <h5 className="text-purple-300 text-sm font-medium mb-2">Unique Players (Today)</h5>
              <p className="text-xl font-bold text-white">
                {dailyData?.uniquePlayers || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <h5 className="text-purple-300 text-sm font-medium mb-2">Peak Bets Hour</h5>
              <p className="text-xl font-bold text-white">
                {dailyData?.peakBetsHour !== undefined && dailyData?.peakBetsHour !== null 
                  ? `${dailyData.peakBetsHour}:00` 
                  : 'N/A'}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <h5 className="text-purple-300 text-sm font-medium mb-2">Games (Today)</h5>
              <p className="text-xl font-bold text-white">
                {dailyData?.totalGames || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
import React, { useState, useEffect } from 'react';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { GameAnalytics } from '@/types/game';

const GameHistoryPage: React.FC = () => {
  const { token } = useAuth();
  const [history, setHistory] = useState<GameAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    minProfit: '',
    maxProfit: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, value.toString());
      });
      params.set('limit', filters.limit.toString());
      params.set('offset', ((filters.page - 1) * filters.limit).toString());
      
      const response = await fetch(`/api/admin/game-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data.data.games || []);
        setPagination(data.data.pagination || pagination);
      } else {
        throw new Error('Failed to fetch game history');
      }
    } catch (error) {
      console.error('Error fetching game history:', error);
      setError('Failed to fetch game history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const exportToCSV = () => {
    const headers = [
      'Game ID', 'Date', 'Winner', 'Andar Bets', 'Bahar Bets', 
      'Total Bets', 'Payout', 'Profit/Loss', '%'
    ];
    
    const csvContent = [
      headers.join(','),
      ...history.map(game => [
        game.gameId.slice(0, 8) + '...',
        formatDate(game.createdAt.toString()),
        game.winner?.toUpperCase() || 'N/A',
        formatCurrency(game.andarTotalBet),
        formatCurrency(game.baharTotalBet),
        formatCurrency(game.totalBets),
        formatCurrency(game.housePayout),
        formatCurrency(game.profitLoss),
        `${(game.profitLossPercentage || 0).toFixed(2)}%`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
            <span className="ml-4 text-purple-200">Loading game history...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <h3 className="text-red-400 text-lg font-semibold mb-2">Error</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <Button onClick={fetchHistory} className="bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Game History</h1>
              <p className="text-purple-200">Complete game history with detailed analytics</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
            <CardDescription className="text-purple-200">
              Filter game history by date, profit range, and sorting options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-purple-200 text-sm font-medium mb-1 block">From Date</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="bg-purple-900/50 border-purple-400/30 text-white"
                />
              </div>
              <div>
                <label className="text-purple-200 text-sm font-medium mb-1 block">To Date</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="bg-purple-900/50 border-purple-400/30 text-white"
                />
              </div>
              <div>
                <label className="text-purple-200 text-sm font-medium mb-1 block">Min Profit</label>
                <Input
                  type="number"
                  placeholder="Minimum profit"
                  value={filters.minProfit}
                  onChange={(e) => handleFilterChange('minProfit', e.target.value)}
                  className="bg-purple-900/50 border-purple-400/30 text-white"
                />
              </div>
              <div>
                <label className="text-purple-200 text-sm font-medium mb-1 block">Max Profit</label>
                <Input
                  type="number"
                  placeholder="Maximum profit"
                  value={filters.maxProfit}
                  onChange={(e) => handleFilterChange('maxProfit', e.target.value)}
                  className="bg-purple-900/50 border-purple-400/30 text-white"
                />
              </div>
              <div>
                <label className="text-purple-200 text-sm font-medium mb-1 block">Sort By</label>
                <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                  <SelectTrigger className="bg-purple-900/50 border-purple-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date</SelectItem>
                    <SelectItem value="profit_loss">Profit/Loss</SelectItem>
                    <SelectItem value="total_bets">Total Bets</SelectItem>
                    <SelectItem value="total_players">Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-purple-200 text-sm font-medium mb-1 block">Sort Order</label>
                <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
                  <SelectTrigger className="bg-purple-900/50 border-purple-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-purple-200 text-sm font-medium mb-1 block">Results per page</label>
                <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', value)}>
                  <SelectTrigger className="bg-purple-900/50 border-purple-400/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchHistory} className="bg-purple-600 hover:bg-purple-700">
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Summary */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-purple-300 text-sm">Total Games</p>
                <p className="text-2xl font-bold text-white">{pagination.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-purple-300 text-sm">Total Bets</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(history.reduce((sum, game) => sum + (game.totalBets || 0), 0))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-purple-300 text-sm">Total Payouts</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(history.reduce((sum, game) => sum + (game.housePayout || 0), 0))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-purple-300 text-sm">Net Profit/Loss</p>
                <p className={`text-2xl font-bold ${
                  history.reduce((sum, game) => sum + (game.profitLoss || 0), 0) >= 0 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {formatCurrency(history.reduce((sum, game) => sum + (game.profitLoss || 0), 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game History Table */}
      <div className="max-w-7xl mx-auto">
        <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Game History</CardTitle>
            <CardDescription className="text-purple-200">
              Showing {history.length} of {pagination.total} games
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-purple-400/30">
                    <th className="text-left p-3 text-purple-200 font-medium">Game ID</th>
                    <th className="text-left p-3 text-purple-200 font-medium">Date</th>
                    <th className="text-left p-3 text-purple-200 font-medium">Winner</th>
                    <th className="text-right p-3 text-purple-200 font-medium">Andar Bets</th>
                    <th className="text-right p-3 text-purple-200 font-medium">Bahar Bets</th>
                    <th className="text-right p-3 text-purple-200 font-medium">Total Bets</th>
                    <th className="text-right p-3 text-purple-200 font-medium">Payout</th>
                    <th className="text-right p-3 text-purple-200 font-medium">Profit/Loss</th>
                    <th className="text-right p-3 text-purple-200 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((game, index) => (
                    <tr key={game.id} className={`border-b border-purple-400/20 ${index % 2 === 0 ? 'bg-purple-900/20' : ''}`}>
                      <td className="p-3">
                        <span className="font-mono text-sm text-purple-300">
                          {game.gameId.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-purple-200">
                          {formatDate(game.createdAt.toString())}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-semibold ${
                          game.winner === 'andar' ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {game.winner?.toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-red-400">
                          {formatCurrency(game.andarTotalBet || 0)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-blue-400">
                          {formatCurrency(game.baharTotalBet || 0)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-white">
                          {formatCurrency(game.totalBets || 0)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-purple-200">
                          {formatCurrency(game.housePayout || 0)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${
                          (game.profitLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(game.profitLoss || 0)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${
                          (game.profitLossPercentage || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {(game.profitLossPercentage || 0).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-purple-400/30">
                <div className="text-purple-200 text-sm">
                  Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
                  {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page <= 1}
                    className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-purple-200 px-3">
                    Page {filters.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={filters.page >= pagination.pages}
                    className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GameHistoryPage;
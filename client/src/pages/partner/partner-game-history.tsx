// 🤝 PARTNER GAME HISTORY - Main view after login (like player game page)
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePartnerAuth } from "@/contexts/PartnerAuthContext";
import {
  History,
  User,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3
} from "lucide-react";

interface GameHistoryItem {
  id: string;
  gameId: string;
  createdAt: string;
  openingCard: string | null;
  winner: string | null;
  winningCard: string | null;
  totalPlayers: number;
  totalBets: number;
  totalWinnings: number;
  houseEarnings: number;
  andarBetsCount: number;
  baharBetsCount: number;
  andarTotalBet: number;
  baharTotalBet: number;
  profitLoss: number;
  housePayout: number;
}

export default function PartnerGameHistory() {
  const { partner, token } = usePartnerAuth();
  const [, setLocation] = useLocation();
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wallet balance for top bar
  const [walletBalance, setWalletBalance] = useState("0");
  
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const fetchGameHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', filters.page.toString());
      params.set('limit', filters.limit.toString());
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const response = await fetch(`/api/partner/game-history?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setGameHistory(data.data.games);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching game history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const response = await fetch('/api/partner/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWalletBalance(data.data.wallet_balance);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    }
  };

  useEffect(() => {
    fetchWalletBalance();
    fetchGameHistory();
  }, [token, filters.page, filters.dateFrom, filters.dateTo, filters.sortBy, filters.sortOrder]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Opening Card', 'Winner', 'Winning Card', 'Profit/Loss'];
    const csvContent = [
      headers.join(','),
      ...gameHistory.map(game => [
        formatDate(game.createdAt),
        game.openingCard || 'N/A',
        game.winner?.toUpperCase() || 'N/A',
        game.winningCard || 'N/A',
        game.profitLoss
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-game-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Summary stats
  const totalBetsOnPage = gameHistory.reduce((sum, g) => sum + g.totalBets, 0);
  const totalPayoutsOnPage = gameHistory.reduce((sum, g) => sum + g.housePayout, 0);
  const totalProfitOnPage = gameHistory.reduce((sum, g) => sum + g.profitLoss, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Top Bar - Similar to Player Game */}
      <div className="bg-black/40 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Left - Title */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-purple-400">Partner Dashboard</h1>
              <p className="text-sm text-gray-400">{partner?.full_name}</p>
            </div>
            
            {/* Right - Wallet & Profile Buttons */}
            <div className="flex items-center gap-2">
              {/* Partner Wallet Button */}
              <button
                onClick={() => setLocation('/partner/wallet')}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600/30 to-blue-600/30 border-2 border-purple-400 rounded-xl px-4 py-2 hover:from-purple-600/40 hover:to-blue-600/40 hover:border-purple-300 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
              >
                <Wallet className="w-5 h-5 text-purple-300" />
                <div className="flex flex-col leading-tight -space-y-0.5">
                  <span className="text-purple-300/70 text-[9px] uppercase tracking-wide font-semibold">
                    Wallet
                  </span>
                  <span className="text-purple-300 font-bold text-sm">
                    {formatCurrency(parseFloat(walletBalance))}
                  </span>
                </div>
              </button>

              {/* Profile Button */}
              <button
                onClick={() => setLocation('/partner/profile')}
                className="flex items-center justify-center w-10 h-10 bg-gray-800/80 border-2 border-purple-500/30 rounded-full hover:bg-gray-700/80 hover:border-purple-400 transition-all active:scale-95"
                aria-label="Profile"
              >
                <User className="w-5 h-5 text-purple-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="pt-6 text-center">
              <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Total Games</p>
              <p className="text-2xl font-bold text-white">{pagination.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Total Bets (Page)</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalBetsOnPage)}</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="pt-6 text-center">
              <TrendingDown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Total Payouts (Page)</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalPayoutsOnPage)}</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="pt-6 text-center">
              {totalProfitOnPage >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-400 mx-auto mb-2" />
              )}
              <p className="text-gray-400 text-sm">Profit/Loss (Page)</p>
              <p className={`text-2xl font-bold ${totalProfitOnPage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(totalProfitOnPage)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-black/40 border-purple-500/30 mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">From Date</label>
                <Input type="date" value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="bg-black/30 border-purple-500/30 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">To Date</label>
                <Input type="date" value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="bg-black/30 border-purple-500/30 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Sort By</label>
                <Select value={filters.sortBy} onValueChange={(v) => handleFilterChange('sortBy', v)}>
                  <SelectTrigger className="bg-black/30 border-purple-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date</SelectItem>
                    <SelectItem value="total_bets">Total Bets</SelectItem>
                    <SelectItem value="profit_loss">Profit/Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Order</label>
                <Select value={filters.sortOrder} onValueChange={(v) => handleFilterChange('sortOrder', v)}>
                  <SelectTrigger className="bg-black/30 border-purple-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button className="bg-purple-600 hover:bg-purple-700 flex-1" onClick={fetchGameHistory}>
                  <Search className="h-4 w-4 mr-1" /> Search
                </Button>
                <Button variant="outline" className="border-purple-500/30 text-purple-300" onClick={exportToCSV}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game History Table */}
        <Card className="bg-black/40 border-purple-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-purple-400 flex items-center gap-2">
                  <History className="h-5 w-5" /> Game History
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Showing {gameHistory.length} of {pagination.total} games
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-300" onClick={fetchGameHistory}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading...</p>
              </div>
            ) : gameHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No game history found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-white text-sm">
                    <thead>
                      <tr className="border-b border-purple-500/30">
                        <th className="text-left p-3 text-purple-300">Date</th>
                        <th className="text-center p-3 text-purple-300">Opening Card</th>
                        <th className="text-center p-3 text-purple-300">Winner</th>
                        <th className="text-center p-3 text-purple-300">Winning Card</th>
                        <th className="text-right p-3 text-purple-300">Profit/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameHistory.map((game, index) => (
                        <tr key={game.id} className={`border-b border-purple-500/20 ${index % 2 === 0 ? 'bg-purple-900/10' : ''}`}>
                          <td className="p-3 text-gray-300">{formatDate(game.createdAt)}</td>
                          <td className="p-3 text-center">
                            <span className="text-xl font-bold text-white">{game.openingCard || 'N/A'}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-semibold ${game.winner === 'andar' ? 'text-red-400' : 'text-blue-400'}`}>
                              {game.winner?.toUpperCase() || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-xl font-bold text-white">{game.winningCard || 'N/A'}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`font-semibold ${game.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(game.profitLoss)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-500/30">
                    <div className="text-gray-400 text-sm">Page {filters.page} of {pagination.pages}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={filters.page <= 1}
                        className="border-purple-500/30 text-purple-300"
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={filters.page >= pagination.pages}
                        className="border-purple-500/30 text-purple-300"
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
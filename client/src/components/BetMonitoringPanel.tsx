/**
 * BetMonitoringPanel - Real-time bet monitoring with manipulation capabilities
 * 
 * Features:
 * - Real-time bet tracking from actual game state
 * - Edit/Cancel bets with backend integration
 * - User search by phone number
 * - Profit/Loss projections
 * - Bet statistics and analytics
 */

import { useState, useEffect, useCallback } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Users,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface BetDetails {
  id: string;
  user_id: string;
  username: string;
  phone: string;
  side: 'andar' | 'bahar';
  amount: number;
  round: number;
  created_at: string;
  status: 'active' | 'won' | 'lost' | 'cancelled';
  potential_win: number;
}

export default function BetMonitoringPanel() {
  const { gameState } = useGameState();
  const { token } = useAuth();
  const [bets, setBets] = useState<BetDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSide, setFilterSide] = useState<'all' | 'andar' | 'bahar'>('all');
  const [filterRound, setFilterRound] = useState<'all' | '1' | '2'>('all');
  const [editingBet, setEditingBet] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editSide, setEditSide] = useState<'andar' | 'bahar'>('andar');
  const [editReason, setEditReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const fetchBets = useCallback(async () => {
    if (!gameState.gameId) {
      console.log('No active game');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/admin/games/${gameState.gameId}/bets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }) as { success: boolean; data: any[] };
      
      if (response.success && response.data) {
        setBets(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch bets:', error);
      setError(error.message || 'Failed to load bets');
    } finally {
      setLoading(false);
    }
  }, [gameState.gameId, token]);

  useEffect(() => {
    fetchBets();
    // Refresh bets every 5 seconds
    const interval = setInterval(fetchBets, 5000);
    return () => clearInterval(interval);
  }, [fetchBets]);

  // Listen for real-time bet updates
  useEffect(() => {
    const handleBetUpdate = () => {
      fetchBets();
    };

    window.addEventListener('bet_placed', handleBetUpdate as EventListener);
    window.addEventListener('admin_bet_update', handleBetUpdate as EventListener);

    return () => {
      window.removeEventListener('bet_placed', handleBetUpdate as EventListener);
      window.removeEventListener('admin_bet_update', handleBetUpdate as EventListener);
    };
  }, [fetchBets]);

  const calculateTotals = () => {
    const activeBets = bets.filter(b => b.status === 'active');
    const round1Bets = activeBets.filter(b => b.round === 1);
    const round2Bets = activeBets.filter(b => b.round === 2);
    
    const totalAndarR1 = round1Bets.filter(b => b.side === 'andar').reduce((sum, b) => sum + b.amount, 0);
    const totalBaharR1 = round1Bets.filter(b => b.side === 'bahar').reduce((sum, b) => sum + b.amount, 0);
    const totalAndarR2 = round2Bets.filter(b => b.side === 'andar').reduce((sum, b) => sum + b.amount, 0);
    const totalBaharR2 = round2Bets.filter(b => b.side === 'bahar').reduce((sum, b) => sum + b.amount, 0);
    
    const totalAndar = totalAndarR1 + totalAndarR2;
    const totalBahar = totalBaharR1 + totalBaharR2;
    const totalAmount = totalAndar + totalBahar;
    
    return { 
      totalAndar, 
      totalBahar, 
      totalAmount, 
      count: activeBets.length,
      round1: { andar: totalAndarR1, bahar: totalBaharR1 },
      round2: { andar: totalAndarR2, bahar: totalBaharR2 }
    };
  };

  const handleEditBet = (betId: string, currentAmount: number, currentSide: 'andar' | 'bahar') => {
    setEditingBet(betId);
    setEditAmount(currentAmount);
    setEditSide(currentSide);
    setEditReason('');
  };

  const handleSaveEdit = async (betId: string, bet: BetDetails) => {
    if (!editReason.trim()) {
      alert('Please provide a reason for the bet update');
      return;
    }

    // Check if side changed
    const sideChanged = editSide !== bet.side;
    const amountChanged = editAmount !== bet.amount;

    if (!sideChanged && !amountChanged) {
      alert('No changes made to the bet');
      setEditingBet(null);
      return;
    }

    // Confirmation if side is being changed
    if (sideChanged) {
      const confirmMsg = `⚠️ Change bet from ${bet.side.toUpperCase()} to ${editSide.toUpperCase()}?\n\nUser: ${bet.username}\nAmount: ₹${editAmount.toLocaleString('en-IN')}\nReason: ${editReason}\n\nThis action will be logged for audit.`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    try {
      await apiClient.patch(`/admin/bets/${betId}`, {
        side: editSide,
        amount: editAmount,
        round: bet.round,
        reason: editReason
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const changeDescription = [];
      if (sideChanged) changeDescription.push(`Side: ${bet.side} → ${editSide}`);
      if (amountChanged) changeDescription.push(`Amount: ₹${bet.amount} → ₹${editAmount}`);
      
      alert(`✅ Bet updated successfully!\n\n${changeDescription.join('\n')}`);

      setEditingBet(null);
      setEditReason('');
      await fetchBets();
    } catch (error: any) {
      console.error('Failed to update bet:', error);
      alert('Failed to update bet: ' + (error.message || 'Unknown error'));
    }
  };

  const handleCancelBet = async (betId: string) => {
    if (!window.confirm('Cancel this bet? The amount will be refunded to the user.')) {
      return;
    }

    try {
      await apiClient.patch(`/admin/bets/${betId}`, {
        status: 'cancelled',
        reason: 'Admin cancelled bet'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      await fetchBets();
    } catch (error: any) {
      console.error('Failed to cancel bet:', error);
      alert('Failed to cancel bet: ' + (error.message || 'Unknown error'));
    }
  };

  const filteredBets = bets.filter(bet => {
    const matchesSearch = bet.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bet.phone?.includes(searchTerm);
    const matchesSide = filterSide === 'all' || bet.side === filterSide;
    const matchesRound = filterRound === 'all' || bet.round.toString() === filterRound;
    return matchesSearch && matchesSide && matchesRound;
  });

  const totals = calculateTotals();

  const profitLossAndar = totals.totalAmount - (totals.totalAndar * 2);
  const profitLossBaharR1 = totals.totalAmount - totals.round1.bahar;
  const profitLossBaharR2 = totals.totalAmount - (totals.round2.bahar * 3);

  if (!gameState.gameId) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-gold/30 p-12 text-center">
        <AlertCircle className="w-16 h-16 text-gold/50 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">No Active Game</h3>
        <p className="text-gray-400">Start a game to monitor bets</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-200 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Bets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totals.count}</div>
            <div className="text-sm text-purple-300 mt-1">{formatCurrency(totals.totalAmount)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-200">Andar Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-300">{formatCurrency(totals.totalAndar)}</div>
            <div className="text-sm text-red-400 mt-1">
              {totals.totalAmount > 0 ? Math.round((totals.totalAndar / totals.totalAmount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-200">Bahar Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-300">{formatCurrency(totals.totalBahar)}</div>
            <div className="text-sm text-blue-400 mt-1">
              {totals.totalAmount > 0 ? Math.round((totals.totalBahar / totals.totalAmount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-200">Game ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-300 font-mono">
              {gameState.gameId.substring(0, 8)}...
            </div>
            <div className="text-sm text-green-400 mt-1">Round {gameState.currentRound}</div>
          </CardContent>
        </Card>
      </div>

      {/* Profit/Loss Projections */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-purple-900/50 border-purple-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Profit/Loss Projections
          </CardTitle>
          <CardDescription className="text-gray-300">
            Projected outcomes based on current bets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                profitLossAndar >= 0 
                  ? 'bg-green-900/30 border-green-500/30' 
                  : 'bg-red-900/30 border-red-500/30'
              }`}>
                <div>
                  <div className="text-sm text-gray-300 mb-1">If Andar Wins</div>
                  <div className={`text-2xl font-bold ${
                    profitLossAndar >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(profitLossAndar)}
                  </div>
                </div>
                {profitLossAndar >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400" />
                )}
              </div>
              <div className="text-xs text-gray-400">
                Payout: {formatCurrency(totals.totalAndar * 2)} • Collected: {formatCurrency(totals.totalAmount)}
              </div>
            </div>

            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                profitLossBaharR1 >= 0 
                  ? 'bg-green-900/30 border-green-500/30' 
                  : 'bg-red-900/30 border-red-500/30'
              }`}>
                <div>
                  <div className="text-sm text-gray-300 mb-1">If Bahar Wins R1</div>
                  <div className={`text-2xl font-bold ${
                    profitLossBaharR1 >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(profitLossBaharR1)}
                  </div>
                </div>
                {profitLossBaharR1 >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400" />
                )}
              </div>
              <div className="text-xs text-gray-400">
                Payout: {formatCurrency(totals.round1.bahar)} (refund) • Collected: {formatCurrency(totals.totalAmount)}
              </div>
            </div>

            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                profitLossBaharR2 >= 0 
                  ? 'bg-green-900/30 border-green-500/30' 
                  : 'bg-red-900/30 border-red-500/30'
              }`}>
                <div>
                  <div className="text-sm text-gray-300 mb-1">If Bahar Wins R2</div>
                  <div className={`text-2xl font-bold ${
                    profitLossBaharR2 >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(profitLossBaharR2)}
                  </div>
                </div>
                {profitLossBaharR2 >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400" />
                )}
              </div>
              <div className="text-xs text-gray-400">
                Payout: {formatCurrency(totals.round2.bahar * 3)} • Collected: {formatCurrency(totals.totalAmount)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by username or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-600/50 text-white"
              />
            </div>
            <select
              value={filterSide}
              onChange={(e) => setFilterSide(e.target.value as any)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-white"
            >
              <option value="all">All Sides</option>
              <option value="andar">Andar Only</option>
              <option value="bahar">Bahar Only</option>
            </select>
            <select
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value as any)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-white"
            >
              <option value="all">All Rounds</option>
              <option value="1">Round 1</option>
              <option value="2">Round 2</option>
            </select>
            <Button
              onClick={fetchBets}
              disabled={loading}
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bets Table */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Active Bets ({filteredBets.length})</CardTitle>
          <CardDescription className="text-gray-400">
            Monitor and manage all player bets in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {loading && bets.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="animate-spin h-8 w-8 text-gold mx-auto mb-4" />
                <p className="text-gray-400">Loading bets...</p>
              </div>
            ) : filteredBets.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No bets found matching your criteria
              </div>
            ) : (
              filteredBets.map((bet) => (
                <div
                  key={bet.id}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{bet.username || 'Unknown'}</span>
                          <Badge className={bet.side === 'andar' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}>
                            {bet.side.toUpperCase()}
                          </Badge>
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                            R{bet.round}
                          </Badge>
                          <Badge className={
                            bet.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            bet.status === 'won' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                            bet.status === 'lost' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                            'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }>
                            {bet.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-400">
                          📱 {bet.phone || 'N/A'}
                        </div>
                      </div>

                      {/* Bet Amount & Side */}
                      <div className="text-right">
                        {editingBet === bet.id ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <select
                                value={editSide}
                                onChange={(e) => setEditSide(e.target.value as 'andar' | 'bahar')}
                                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                              >
                                <option value="andar">Andar</option>
                                <option value="bahar">Bahar</option>
                              </select>
                              <Input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(Number(e.target.value))}
                                className="w-32 bg-slate-700 border-slate-600 text-white"
                                placeholder="Amount"
                              />
                            </div>
                            <Input
                              type="text"
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              className="w-full bg-slate-700 border-slate-600 text-white"
                              placeholder="Reason for edit (required)"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(bet.id, bet)}
                                className="bg-green-600 hover:bg-green-700"
                                title="Save changes"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingBet(null)}
                                className="border-gray-600"
                                title="Cancel editing"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xl font-bold text-white">
                              {formatCurrency(bet.amount)}
                            </div>
                            <div className="text-sm text-gray-400">
                              Win: {formatCurrency(bet.potential_win)}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {bet.status === 'active' && editingBet !== bet.id && gameState.phase === 'betting' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditBet(bet.id, bet.amount, bet.side)}
                            className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                            title="Edit bet amount or side"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelBet(bet.id)}
                            className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                            title="Cancel bet and refund"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


/**
 * EnhancedBetMonitoring - Advanced bet monitoring with editing capabilities
 * 
 * Features:
 * - Real-time bet tracking
 * - Edit/Cancel bets
 * - Bet history
 * - Profit/Loss calculations
 * - User bet details
 */

import { useState, useEffect } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
  DollarSign
} from 'lucide-react';

interface BetDetails {
  id: string;
  userId: string;
  username: string;
  phone: string;
  side: 'andar' | 'bahar';
  amount: number;
  round: number;
  timestamp: string;
  status: 'active' | 'won' | 'lost' | 'cancelled';
  potentialWin: number;
}

export default function EnhancedBetMonitoring() {
  const { gameState } = useGameState();
  const [bets, setBets] = useState<BetDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSide, setFilterSide] = useState<'all' | 'andar' | 'bahar'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'won' | 'lost'>('all');
  const [editingBet, setEditingBet] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);

  // Mock data - Replace with actual API calls
  useEffect(() => {
    const mockBets: BetDetails[] = [
      {
        id: 'bet1',
        userId: 'user1',
        username: 'Player123',
        phone: '9876543210',
        side: 'andar',
        amount: 5000,
        round: 1,
        timestamp: new Date().toISOString(),
        status: 'active',
        potentialWin: 10000
      },
      {
        id: 'bet2',
        userId: 'user2',
        username: 'LuckyOne',
        phone: '9876543211',
        side: 'bahar',
        amount: 10000,
        round: 1,
        timestamp: new Date().toISOString(),
        status: 'active',
        potentialWin: 10000
      },
      {
        id: 'bet3',
        userId: 'user3',
        username: 'Gamer456',
        phone: '9876543212',
        side: 'andar',
        amount: 20000,
        round: 2,
        timestamp: new Date().toISOString(),
        status: 'active',
        potentialWin: 40000
      }
    ];
    setBets(mockBets);
  }, [gameState]);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const calculateTotals = () => {
    const activeBets = bets.filter(b => b.status === 'active');
    const totalAndar = activeBets.filter(b => b.side === 'andar').reduce((sum, b) => sum + b.amount, 0);
    const totalBahar = activeBets.filter(b => b.side === 'bahar').reduce((sum, b) => sum + b.amount, 0);
    const totalAmount = totalAndar + totalBahar;
    
    return { totalAndar, totalBahar, totalAmount, count: activeBets.length };
  };

  const handleEditBet = (betId: string, currentAmount: number) => {
    setEditingBet(betId);
    setEditAmount(currentAmount);
  };

  const handleSaveEdit = (betId: string) => {
    setBets(prev => prev.map(bet => 
      bet.id === betId 
        ? { ...bet, amount: editAmount, potentialWin: editAmount * (bet.side === 'andar' ? 2 : 1) }
        : bet
    ));
    setEditingBet(null);
    // TODO: Send update to backend
  };

  const handleCancelBet = (betId: string) => {
    if (window.confirm('Cancel this bet? The amount will be refunded to the user.')) {
      setBets(prev => prev.map(bet => 
        bet.id === betId ? { ...bet, status: 'cancelled' as const } : bet
      ));
      // TODO: Send cancellation to backend
    }
  };

  const filteredBets = bets.filter(bet => {
    const matchesSearch = bet.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bet.phone.includes(searchTerm);
    const matchesSide = filterSide === 'all' || bet.side === filterSide;
    const matchesStatus = filterStatus === 'all' || bet.status === filterStatus;
    return matchesSearch && matchesSide && matchesStatus;
  });

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-200">Total Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totals.count}</div>
            <div className="text-sm text-purple-300">{formatCurrency(totals.totalAmount)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-200">Andar Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-300">{formatCurrency(totals.totalAndar)}</div>
            <div className="text-sm text-red-400">
              {totals.totalAmount > 0 ? Math.round((totals.totalAndar / totals.totalAmount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-200">Bahar Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-300">{formatCurrency(totals.totalBahar)}</div>
            <div className="text-sm text-blue-400">
              {totals.totalAmount > 0 ? Math.round((totals.totalBahar / totals.totalAmount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-200">Potential Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-300">
              {formatCurrency(Math.max(totals.totalAndar * 2, totals.totalBahar))}
            </div>
            <div className="text-sm text-green-400">Max exposure</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bets Table */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Active Bets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredBets.map((bet) => (
              <div
                key={bet.id}
                className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{bet.username}</span>
                        <Badge className={bet.side === 'andar' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}>
                          {bet.side.toUpperCase()}
                        </Badge>
                        <Badge className={
                          bet.status === 'active' ? 'bg-green-500/20 text-green-300' :
                          bet.status === 'won' ? 'bg-yellow-500/20 text-yellow-300' :
                          bet.status === 'lost' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-500/20 text-gray-300'
                        }>
                          {bet.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400">
                        {bet.phone} • Round {bet.round}
                      </div>
                    </div>

                    {/* Bet Amount */}
                    <div className="text-right">
                      {editingBet === bet.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(Number(e.target.value))}
                            className="w-32 bg-slate-700 border-slate-600 text-white"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(bet.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBet(null)}
                            className="border-gray-600"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="text-lg font-bold text-white">
                            {formatCurrency(bet.amount)}
                          </div>
                          <div className="text-sm text-gray-400">
                            Win: {formatCurrency(bet.potentialWin)}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {bet.status === 'active' && editingBet !== bet.id && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditBet(bet.id, bet.amount)}
                          className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelBet(bet.id)}
                          className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredBets.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No bets found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profit/Loss Projection */}
      <Card className="bg-gradient-to-br from-slate-900/50 to-purple-900/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Profit/Loss Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-red-900/30 rounded-lg border border-red-500/30">
                <div>
                  <div className="text-sm text-red-300 mb-1">If Andar Wins</div>
                  <div className="text-2xl font-bold text-red-400">
                    {formatCurrency(totals.totalAndar * 2 - totals.totalAmount)}
                  </div>
                </div>
                <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-sm text-gray-400">
                Payout: {formatCurrency(totals.totalAndar * 2)} | Collected: {formatCurrency(totals.totalAmount)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
                <div>
                  <div className="text-sm text-blue-300 mb-1">If Bahar Wins (R1)</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {formatCurrency(totals.totalAmount - totals.totalBahar)}
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-sm text-gray-400">
                Payout: {formatCurrency(totals.totalBahar)} (refund) | Collected: {formatCurrency(totals.totalAmount)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

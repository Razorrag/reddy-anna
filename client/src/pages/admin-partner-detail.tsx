// 🔧 ADMIN PARTNER DETAIL PAGE - Complete Financial Management
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  IndianRupee,
  Calendar,
  Award,
  AlertCircle
} from "lucide-react";

interface PartnerDetails {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  status: string;
  sharePercentage: number;
  walletBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  createdAt: string;
}

interface Earning {
  id: string;
  game_id: string;
  game_profit: number;
  shown_profit: number;
  earning_amount: number;
  commission_rate: number;
  credited: boolean;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  utr_number: string | null;
  rejection_reason: string | null;
  created_at: string;
  processed_at: string | null;
  partner_phone: string;
  partner_whatsapp: string;
}

interface Transaction {
  id: string;
  transaction_type: 'earning' | 'withdrawal' | 'adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface Stats {
  total_games: number;
  total_earnings: number;
  current_balance: number;
  total_withdrawn: number;
  pending_withdrawals: number;
  earnings_this_month: number;
  earnings_today: number;
  avg_earning_per_game: number;
}

export default function AdminPartnerDetail() {
  const { token } = useAuth();
  const [, params] = useRoute("/admin/partner/:id");
  const [, setLocation] = useLocation();
  const partnerId = params?.id;

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerDetails | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [activeTab, setActiveTab] = useState<'earnings' | 'withdrawals' | 'transactions'>('earnings');
  
  // Withdrawal approval modal states
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (partnerId && token) {
      fetchPartnerData();
    }
  }, [partnerId, token]);

  const fetchPartnerData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPartnerInfo(),
        fetchStats(),
        fetchEarnings(),
        fetchWithdrawals(),
        fetchTransactions()
      ]);
    } catch (err) {
      console.error('Error fetching partner data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerInfo = async () => {
    try {
      // Get basic partner info by ID
      const response = await fetch(`/api/admin/partners/${partnerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        const partnerData = data.data;
        
        // Get wallet info
        const walletRes = await fetch(`/api/admin/partners/${partnerId}/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const walletData = await walletRes.json();
        
        if (walletData.success) {
          setPartner({
            ...partnerData,
            walletBalance: parseFloat(walletData.data.wallet_balance || '0'),
            totalEarned: parseFloat(walletData.data.total_earned || '0'),
            totalWithdrawn: parseFloat(walletData.data.total_withdrawn || '0'),
            pendingWithdrawals: parseFloat(walletData.data.pending_withdrawals || '0')
          });
        } else {
          // Set partner even if wallet fetch fails
          setPartner({
            ...partnerData,
            walletBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            pendingWithdrawals: 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching partner info:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/earnings?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEarnings(data.data.earnings);
      }
    } catch (err) {
      console.error('Error fetching earnings:', err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/withdrawals?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.data.withdrawals);
      }
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/transactions?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data.transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !utrNumber.trim()) {
      alert('Please enter UTR number for approval');
      return;
    }
    
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please enter rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/withdrawals/${withdrawalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          utrNumber: action === 'approve' ? utrNumber : undefined,
          rejectionReason: action === 'reject' ? rejectionReason : undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        setProcessingWithdrawal(null);
        setUtrNumber('');
        setRejectionReason('');
        // Refresh data
        await fetchPartnerData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error processing withdrawal:', err);
      alert('Failed to process withdrawal');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-gold animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Loading partner details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!partner) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
          <Card className="bg-black/40 border-red-500/30">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white text-lg mb-4">Partner not found</p>
              <Button onClick={() => setLocation('/admin/partners')} variant="outline" className="border-gold/30 text-gold">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Partners
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => setLocation('/admin')} variant="outline" className="border-gold/30 text-gold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <Button onClick={() => setLocation('/admin/partners')} variant="outline" className="border-gold/30 text-gold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Partners
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gold">{partner.fullName}</h1>
            <p className="text-gray-400">{partner.phone} • Share: {partner.sharePercentage}%</p>
          </div>
          <Button onClick={fetchPartnerData} variant="outline" className="border-gold/30 text-gold">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Financial Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-black/40 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-8 h-8 text-green-400" />
                <p className="text-2xl font-bold text-green-400">₹{partner.walletBalance.toFixed(2)}</p>
              </div>
              <p className="text-gray-400 text-sm">Current Balance</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-blue-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-400" />
                <p className="text-2xl font-bold text-blue-400">₹{partner.totalEarned.toFixed(2)}</p>
              </div>
              <p className="text-gray-400 text-sm">Total Earned</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-purple-400" />
                <p className="text-2xl font-bold text-purple-400">₹{partner.totalWithdrawn.toFixed(2)}</p>
              </div>
              <p className="text-gray-400 text-sm">Total Withdrawn</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-400" />
                <p className="text-2xl font-bold text-yellow-400">₹{partner.pendingWithdrawals.toFixed(2)}</p>
              </div>
              <p className="text-gray-400 text-sm">Pending Withdrawals</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-black/40 border-gold/30">
              <CardContent className="pt-4 text-center">
                <Award className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xl font-bold text-white">{stats.total_games}</p>
                <p className="text-gray-400 text-xs">Total Games</p>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-gold/30">
              <CardContent className="pt-4 text-center">
                <Calendar className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xl font-bold text-white">₹{stats.earnings_this_month.toFixed(0)}</p>
                <p className="text-gray-400 text-xs">This Month</p>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-gold/30">
              <CardContent className="pt-4 text-center">
                <IndianRupee className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xl font-bold text-white">₹{stats.earnings_today.toFixed(0)}</p>
                <p className="text-gray-400 text-xs">Today</p>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-gold/30">
              <CardContent className="pt-4 text-center">
                <TrendingUp className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xl font-bold text-white">₹{stats.avg_earning_per_game.toFixed(0)}</p>
                <p className="text-gray-400 text-xs">Avg Per Game</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => setActiveTab('earnings')}
            variant={activeTab === 'earnings' ? 'default' : 'outline'}
            className={activeTab === 'earnings' ? 'bg-gold text-black' : 'border-gold/30 text-gold'}
          >
            Earnings History ({earnings.length})
          </Button>
          <Button
            onClick={() => setActiveTab('withdrawals')}
            variant={activeTab === 'withdrawals' ? 'default' : 'outline'}
            className={activeTab === 'withdrawals' ? 'bg-gold text-black' : 'border-gold/30 text-gold'}
          >
            Withdrawals ({withdrawals.length})
          </Button>
          <Button
            onClick={() => setActiveTab('transactions')}
            variant={activeTab === 'transactions' ? 'default' : 'outline'}
            className={activeTab === 'transactions' ? 'bg-gold text-black' : 'border-gold/30 text-gold'}
          >
            Transactions ({transactions.length})
          </Button>
        </div>

        {/* Content based on active tab */}
        <Card className="bg-black/40 border-gold/30">
          <CardHeader>
            <CardTitle className="text-gold">
              {activeTab === 'earnings' && 'Earnings History'}
              {activeTab === 'withdrawals' && 'Withdrawal Requests'}
              {activeTab === 'transactions' && 'Transaction History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Earnings Tab */}
            {activeTab === 'earnings' && (
              <div className="overflow-x-auto">
                {earnings.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No earnings yet</p>
                ) : (
                  <table className="w-full text-white text-sm">
                    <thead>
                      <tr className="border-b border-gold/30">
                        <th className="text-left p-3 text-gold font-medium">Date</th>
                        <th className="text-left p-3 text-gold font-medium">Game ID</th>
                        <th className="text-right p-3 text-gold font-medium">Game Profit</th>
                        <th className="text-right p-3 text-gold font-medium">Shown Profit</th>
                        <th className="text-right p-3 text-gold font-medium">Earning</th>
                        <th className="text-center p-3 text-gold font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((earning, idx) => (
                        <tr key={earning.id} className={`border-b border-gold/20 ${idx % 2 === 0 ? 'bg-black/20' : ''}`}>
                          <td className="p-3 text-gray-400">{formatDate(earning.created_at)}</td>
                          <td className="p-3 font-mono text-xs">{earning.game_id.substring(0, 12)}...</td>
                          <td className="p-3 text-right text-blue-400">₹{parseFloat(earning.game_profit).toFixed(2)}</td>
                          <td className="p-3 text-right text-purple-400">₹{parseFloat(earning.shown_profit).toFixed(2)}</td>
                          <td className="p-3 text-right text-green-400 font-semibold">₹{parseFloat(earning.earning_amount).toFixed(2)}</td>
                          <td className="p-3 text-center text-gray-400">{parseFloat(earning.commission_rate).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Withdrawals Tab */}
            {activeTab === 'withdrawals' && (
              <div className="space-y-4">
                {withdrawals.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No withdrawal requests</p>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <Card key={withdrawal.id} className="bg-black/20 border-gold/20">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Amount</p>
                            <p className="text-2xl font-bold text-green-400">₹{parseFloat(withdrawal.amount).toFixed(2)}</p>
                            <p className="text-xs text-gray-500 mt-1">Requested: {formatDate(withdrawal.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-2">Status</p>
                            {getStatusBadge(withdrawal.status)}
                            {withdrawal.processed_at && (
                              <p className="text-xs text-gray-500 mt-1">Processed: {formatDate(withdrawal.processed_at)}</p>
                            )}
                          </div>
                          {withdrawal.status === 'completed' && withdrawal.utr_number && (
                            <div className="col-span-2">
                              <p className="text-sm text-gray-400">UTR Number</p>
                              <p className="text-white font-mono">{withdrawal.utr_number}</p>
                            </div>
                          )}
                          {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
                            <div className="col-span-2">
                              <p className="text-sm text-red-400">Rejection Reason</p>
                              <p className="text-white">{withdrawal.rejection_reason}</p>
                            </div>
                          )}
                          {withdrawal.status === 'pending' && (
                            <div className="col-span-2 flex gap-2">
                              {processingWithdrawal === withdrawal.id ? (
                                <div className="space-y-3 flex-1">
                                  <div>
                                    <label className="text-sm text-green-400 block mb-1">UTR Number (for approval)</label>
                                    <Input
                                      value={utrNumber}
                                      onChange={(e) => setUtrNumber(e.target.value)}
                                      placeholder="Enter UTR number"
                                      className="bg-black/30 border-green-500/30 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm text-red-400 block mb-1">Rejection Reason (for rejection)</label>
                                    <Textarea
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      placeholder="Enter rejection reason"
                                      className="bg-black/30 border-red-500/30 text-white"
                                      rows={2}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleWithdrawalAction(withdrawal.id, 'approve')}
                                      disabled={actionLoading}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      {actionLoading ? 'Processing...' : 'Approve'}
                                    </Button>
                                    <Button
                                      onClick={() => handleWithdrawalAction(withdrawal.id, 'reject')}
                                      disabled={actionLoading}
                                      variant="destructive"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      {actionLoading ? 'Processing...' : 'Reject'}
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setProcessingWithdrawal(null);
                                        setUtrNumber('');
                                        setRejectionReason('');
                                      }}
                                      variant="outline"
                                      className="border-gray-500"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                  <div className="text-xs text-gray-400 space-y-1">
                                    <p>Partner Phone: {withdrawal.partner_phone}</p>
                                    <p>WhatsApp: {withdrawal.partner_whatsapp}</p>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => setProcessingWithdrawal(withdrawal.id)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Process Request
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="overflow-x-auto">
                {transactions.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No transactions yet</p>
                ) : (
                  <table className="w-full text-white text-sm">
                    <thead>
                      <tr className="border-b border-gold/30">
                        <th className="text-left p-3 text-gold font-medium">Date</th>
                        <th className="text-left p-3 text-gold font-medium">Type</th>
                        <th className="text-right p-3 text-gold font-medium">Amount</th>
                        <th className="text-right p-3 text-gold font-medium">Before</th>
                        <th className="text-right p-3 text-gold font-medium">After</th>
                        <th className="text-left p-3 text-gold font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn, idx) => (
                        <tr key={txn.id} className={`border-b border-gold/20 ${idx % 2 === 0 ? 'bg-black/20' : ''}`}>
                          <td className="p-3 text-gray-400">{formatDate(txn.created_at)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              txn.transaction_type === 'earning' ? 'bg-green-500/20 text-green-400' :
                              txn.transaction_type === 'withdrawal' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {txn.transaction_type.toUpperCase()}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-semibold ${
                            txn.transaction_type === 'earning' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {txn.transaction_type === 'earning' ? '+' : '-'}₹{parseFloat(txn.amount).toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-gray-400">₹{parseFloat(txn.balance_before).toFixed(2)}</td>
                          <td className="p-3 text-right text-white font-semibold">₹{parseFloat(txn.balance_after).toFixed(2)}</td>
                          <td className="p-3 text-gray-400 text-xs">{txn.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
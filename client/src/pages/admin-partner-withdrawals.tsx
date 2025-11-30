// 🔧 ADMIN CENTRALIZED PARTNER WITHDRAWALS PAGE
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import {
  ArrowLeft,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  AlertCircle,
  IndianRupee,
  Phone
} from "lucide-react";

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  partner_id: string;
  partner_name: string;
  partner_phone: string;
  partner_whatsapp: string;
  partner_wallet_balance: number;
  created_at: string;
  processed_at: string | null;
  utr_number: string | null;
  rejection_reason: string | null;
}

export default function AdminPartnerWithdrawals() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  
  // Processing states
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchWithdrawals();
    }
  }, [token, statusFilter, pagination.page]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const response = await fetch(`/api/admin/partners/withdrawals/all?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setWithdrawals(data.data.withdrawals);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, partnerId: string, action: 'approve' | 'reject') => {
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
        fetchWithdrawals();
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

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => setLocation('/admin/partners')} variant="outline" className="border-gold/30 text-gold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Partners
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gold">All Partner Withdrawal Requests</h1>
            <p className="text-gray-400">Manage withdrawal requests from all partners</p>
          </div>
          <Button onClick={fetchWithdrawals} variant="outline" className="border-gold/30 text-gold">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Filter */}
        <Card className="bg-black/40 border-gold/30 mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <label className="text-gold font-semibold">Status:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-black/30 border-gold/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1"></div>
              <div className="text-gray-400 text-sm">
                Total: {pagination.total} requests
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawals List */}
        <Card className="bg-black/40 border-gold/30">
          <CardHeader>
            <CardTitle className="text-gold">Withdrawal Requests ({withdrawals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-gold animate-spin mx-auto mb-2" />
                <p className="text-gray-400">Loading withdrawals...</p>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No withdrawal requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="bg-black/20 border-gold/20">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Partner Info */}
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Partner</p>
                          <p className="text-lg font-bold text-white">{withdrawal.partner_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <p className="text-sm text-gray-400">{withdrawal.partner_phone}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Balance: ₹{parseFloat(String(withdrawal.partner_wallet_balance || '0')).toFixed(2)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 border-blue-500/30 text-blue-400 h-7 px-2"
                            onClick={() => setLocation(`/admin/partner/${withdrawal.partner_id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> View Details
                          </Button>
                        </div>

                        {/* Amount & Status */}
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Amount</p>
                          <div className="flex items-center gap-2">
                            <IndianRupee className="w-5 h-5 text-green-400" />
                            <p className="text-2xl font-bold text-green-400">
                              {parseFloat(String(withdrawal.amount)).toFixed(2)}
                            </p>
                          </div>
                          <div className="mt-2">
                            {getStatusBadge(withdrawal.status)}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Requested: {formatDate(withdrawal.created_at)}
                          </p>
                          {withdrawal.processed_at && (
                            <p className="text-xs text-gray-500">
                              Processed: {formatDate(withdrawal.processed_at)}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div>
                          {withdrawal.status === 'completed' && withdrawal.utr_number && (
                            <div>
                              <p className="text-sm text-gray-400">UTR Number</p>
                              <p className="text-white font-mono text-sm">{withdrawal.utr_number}</p>
                            </div>
                          )}
                          
                          {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
                            <div>
                              <p className="text-sm text-red-400">Rejection Reason</p>
                              <p className="text-white text-sm">{withdrawal.rejection_reason}</p>
                            </div>
                          )}
                          
                          {withdrawal.status === 'pending' && (
                            <div className="space-y-2">
                              {processingWithdrawal === withdrawal.id ? (
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm text-green-400 block mb-1">UTR Number</label>
                                    <Input
                                      value={utrNumber}
                                      onChange={(e) => setUtrNumber(e.target.value)}
                                      placeholder="Enter UTR"
                                      className="bg-black/30 border-green-500/30 text-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm text-red-400 block mb-1">Rejection Reason</label>
                                    <Textarea
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      placeholder="Enter reason"
                                      className="bg-black/30 border-red-500/30 text-white text-sm"
                                      rows={2}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleWithdrawalAction(withdrawal.id, withdrawal.partner_id, 'approve')}
                                      disabled={actionLoading}
                                      className="bg-green-600 hover:bg-green-700 text-xs h-8"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {actionLoading ? 'Processing...' : 'Approve'}
                                    </Button>
                                    <Button
                                      onClick={() => handleWithdrawalAction(withdrawal.id, withdrawal.partner_id, 'reject')}
                                      disabled={actionLoading}
                                      variant="destructive"
                                      className="text-xs h-8"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      {actionLoading ? 'Processing...' : 'Reject'}
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setProcessingWithdrawal(null);
                                        setUtrNumber('');
                                        setRejectionReason('');
                                      }}
                                      variant="outline"
                                      className="border-gray-500 text-xs h-8"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    WhatsApp: {withdrawal.partner_whatsapp || withdrawal.partner_phone}
                                  </p>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => setProcessingWithdrawal(withdrawal.id)}
                                  className="bg-blue-600 hover:bg-blue-700 w-full"
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Process Request
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gold/30">
                <div className="text-gray-400 text-sm">
                  Page {pagination.page} of {pagination.pages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    className="border-gold/30 text-gold"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    className="border-gold/30 text-gold"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
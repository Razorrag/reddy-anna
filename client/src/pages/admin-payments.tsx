import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import AdminLayout from "@/components/AdminLayout";

interface PaymentRequest {
  id: string;
  user_id: string;
  phone: string;
  full_name: string;
  request_type: 'deposit' | 'withdrawal';
  amount: number;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  updated_at?: string;
}

export default function AdminPayments() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [justUpdated, setJustUpdated] = useState(false);
  const [statsData, setStatsData] = useState({ totalDeposits: 0, totalWithdrawals: 0 });
  
  const now = new Date();

  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);
      setError(null); // Clear previous errors
      const response = await apiClient.get('/admin/payment-requests/pending') as { success?: boolean; data?: PaymentRequest[] };
      
      // Handle both response formats
      if (response.success !== false) {
        const requests = response.data || [];
        // Ensure each request has required fields
        const formattedRequests = requests.map((req: any) => ({
          id: req.id,
          user_id: req.user_id,
          phone: req.phone || req.user_id || 'N/A',
          full_name: req.full_name || req.phone || 'Unknown User',
          request_type: req.request_type || req.type || 'deposit',
          amount: parseFloat(req.amount) || 0,
          payment_method: req.payment_method || 'N/A',
          status: req.status || 'pending',
          created_at: req.created_at || new Date().toISOString(),
          updated_at: req.updated_at
        }));
        setPaymentRequests(formattedRequests);
      } else {
        setError('Failed to load payment requests');
        setPaymentRequests([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch payment requests:', error);
      
      // Set user-friendly error message
      if (error.message?.includes('table') || error.message?.includes('does not exist')) {
        setError('Database table missing. Please contact system administrator.');
      } else if (error.message?.includes('Network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load payment requests. Please try again.');
      }
      
      setPaymentRequests([]);
    } finally {
      setLoadingRequests(false);
      setIsLoaded(true);
    }
  };

  const fetchHistory = async () => {
    try {
      console.log('🔍 fetchHistory called');
      console.log('📊 Current filters:', { statusFilter, typeFilter });
      
      setLoadingRequests(true);
      setError(null); // Clear previous errors
      const params = new URLSearchParams({
        status: statusFilter,
        type: typeFilter,
        limit: '100',
        offset: '0'
      });
      
      console.log('🚀 Fetching history from API:', `/admin/payment-requests/history?${params}`);
      const response = await apiClient.get(`/admin/payment-requests/history?${params}`) as { success?: boolean; data?: PaymentRequest[] };
      console.log('📊 API Response:', { success: response.success, dataLength: response.data?.length });
      
      if (response.success !== false) {
        const requests = response.data || [];
        console.log(`✅ Received ${requests.length} requests from API`);
        
        if (requests.length > 0) {
          console.log('📊 Sample request (first):', {
            id: requests[0].id,
            status: requests[0].status,
            amount: requests[0].amount,
            phone: requests[0].phone,
            full_name: requests[0].full_name
          });
        } else {
          console.warn('⚠️ API returned empty array');
        }
        
        const formattedRequests = requests.map((req: any) => ({
          id: req.id,
          user_id: req.user_id,
          phone: req.phone || req.user_id || 'N/A',
          full_name: req.full_name || req.phone || 'Unknown User',
          request_type: req.request_type || req.type || 'deposit',
          amount: parseFloat(req.amount) || 0,
          payment_method: req.payment_method || 'N/A',
          status: req.status || 'pending',
          created_at: req.created_at || new Date().toISOString(),
          updated_at: req.updated_at,
          admin_id: req.admin_id,
          admin_notes: req.admin_notes
        }));
        
        console.log(`✅ Formatted ${formattedRequests.length} requests`);
        setPaymentRequests(formattedRequests);
      } else {
        console.error('❌ API returned success=false');
        setPaymentRequests([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch payment history:', error);
      
      // Set user-friendly error message
      if (error.message?.includes('table') || error.message?.includes('does not exist')) {
        setError('Database table missing. Please contact system administrator.');
      } else if (error.message?.includes('Network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load payment history. Please try again.');
      }
      
      setPaymentRequests([]);
    } finally {
      setLoadingRequests(false);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingRequests();
    } else {
      fetchHistory();
    }
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      if (activeTab === 'pending') {
        fetchPendingRequests();
      } else {
        fetchHistory();
      }
      // Also refresh stats and pending count
      fetchStats();
      fetchPendingCount();
    }, 10000);
    
    // Real-time refresh on admin notifications
    const handleAdminNotification = (evt: Event) => {
      const msg: any = (evt as CustomEvent).detail;
      if (!msg || msg.type !== 'admin_notification') return;
      if (msg.event === 'new_request' || msg.event === 'payment_request_created' || msg.event === 'request_status_update' || msg.event === 'request_processed') {
        // Show visual feedback
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2000);
        
        if (activeTab === 'pending') {
          fetchPendingRequests();
        } else {
          fetchHistory();
        }
        // Also refresh stats and pending count
        fetchStats();
        fetchPendingCount();
      }
    };
    window.addEventListener('admin_notification', handleAdminNotification as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('admin_notification', handleAdminNotification as EventListener);
    };
  }, [activeTab, statusFilter, typeFilter]);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'deposit' ?
      <ArrowDownLeft className="w-4 h-4 text-green-400" /> :
      <ArrowUpRight className="w-4 h-4 text-red-400" />;
  };

  const handleApprove = async (requestId: string, requestType: string, amount: number, userName: string) => {
    const confirmMessage = `Approve ${requestType} request of ₹${amount.toLocaleString('en-IN')} for ${userName}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setProcessingId(requestId);
      await apiClient.patch(`/admin/payment-requests/${requestId}/approve`);
      
      // Show success message
      alert(`✅ ${requestType} approved successfully. New balance will be reflected immediately.`);
      
      // Refresh the request list and stats
      if (activeTab === 'pending') {
        await fetchPendingRequests();
      } else {
        await fetchHistory();
      }
      await fetchStats();
      await fetchPendingCount();
    } catch (error: any) {
      console.error('Failed to approve request:', error);
      alert(`❌ Failed to approve: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string, requestType: string, amount: number, userName: string) => {
    const reason = window.prompt(`Reject ${requestType} of ₹${amount.toLocaleString('en-IN')} for ${userName}?\n\nPlease provide a reason:`);
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      setProcessingId(requestId);
      await apiClient.patch(`/admin/payment-requests/${requestId}/reject`, {
        reason: reason.trim()
      });
      
      // Show success message
      alert(`✅ ${requestType} rejected successfully.`);
      
      // Refresh the request list and stats
      if (activeTab === 'pending') {
        await fetchPendingRequests();
      } else {
        await fetchHistory();
      }
      await fetchStats();
      await fetchPendingCount();
    } catch (error: any) {
      console.error('Failed to reject request:', error);
      alert(`❌ Failed to reject: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = paymentRequests.filter(request => {
    const username = request.full_name || request.phone;
    const matchesSearch = username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.payment_method.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.request_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  
  // Debug logging for filtering
  React.useEffect(() => {
    console.log('🔍 Filtering results:', {
      totalRequests: paymentRequests.length,
      filteredCount: filteredRequests.length,
      searchTerm,
      statusFilter,
      typeFilter
    });
  }, [paymentRequests, filteredRequests, searchTerm, statusFilter, typeFilter]);

  // ✅ FIX: Fetch stats separately from ALL approved requests (not just current tab)
  const fetchStats = async () => {
    try {
      // Fetch ALL approved requests for today's stats
      const response = await apiClient.get('/admin/payment-requests/history?status=approved&limit=1000') as { success?: boolean; data?: PaymentRequest[] };
      
      if (response.success !== false && response.data) {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const allApprovedRequests = response.data;
        
        const totalDeposits = allApprovedRequests
          .filter(r => {
            const createdDate = new Date(r.created_at);
            return r.request_type === 'deposit' && createdDate >= todayStart;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        const totalWithdrawals = allApprovedRequests
          .filter(r => {
            const createdDate = new Date(r.created_at);
            return r.request_type === 'withdrawal' && createdDate >= todayStart;
          })
          .reduce((sum, r) => sum + r.amount, 0);
        
        setStatsData({ totalDeposits, totalWithdrawals });
        
        console.log('📊 Stats calculated:', {
          totalApprovedRequests: allApprovedRequests.length,
          todayDeposits: totalDeposits,
          todayWithdrawals: totalWithdrawals
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // ✅ FIX: Fetch pending count separately
  const fetchPendingCount = async () => {
    try {
      const response = await apiClient.get('/admin/payment-requests/pending') as { success?: boolean; data?: PaymentRequest[] };
      if (response.success !== false && response.data) {
        setPendingCount(response.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch pending count:', error);
    }
  };

  // ✅ FIX: Fetch stats on mount and when requests change
  useEffect(() => {
    fetchStats();
    fetchPendingCount();
  }, [activeTab]); // Refresh when tab changes

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Payment Requests</h1>
              <p className="text-purple-200">Manage deposit and withdrawal requests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
                onClick={() => activeTab === 'pending' ? fetchPendingRequests() : fetchHistory()}
                disabled={loadingRequests}
              >
                <Activity className={`w-4 h-4 mr-2 ${loadingRequests ? 'animate-spin' : ''}`} />
                {loadingRequests ? 'Refreshing...' : 'Refresh'}
              </Button>
              <div className="text-sm text-purple-300 bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-400/30">
                Auto-refreshes every 10s
              </div>
              {justUpdated && (
                <div className="text-sm text-green-400 bg-green-900/30 px-3 py-2 rounded-lg border border-green-400/30 animate-pulse">
                  ✓ Updated
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex gap-4">
            <Button
              variant={activeTab === 'pending' ? 'default' : 'outline'}
              onClick={() => setActiveTab('pending')}
              className={activeTab === 'pending' 
                ? 'bg-gold text-black hover:bg-gold/90' 
                : 'border-purple-400/30 text-purple-200 hover:bg-purple-400/10'}
            >
              <Clock className="w-4 h-4 mr-2" />
              Pending ({pendingCount})
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'outline'}
              onClick={() => setActiveTab('history')}
              className={activeTab === 'history' 
                ? 'bg-gold text-black hover:bg-gold/90' 
                : 'border-purple-400/30 text-purple-200 hover:bg-purple-400/10'}
            >
              <Activity className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-1000",
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-200">Total Deposits</CardTitle>
                <ArrowDownLeft className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="h-8 bg-purple-900/30 animate-pulse rounded"></div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-400">{formatCurrency(statsData.totalDeposits)}</div>
                    <p className="text-xs text-purple-300">
                      Approved today ({now.toLocaleDateString('en-IN')})
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-200">Total Withdrawals</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="h-8 bg-purple-900/30 animate-pulse rounded"></div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(statsData.totalWithdrawals)}</div>
                    <p className="text-xs text-purple-300">
                      Approved today ({now.toLocaleDateString('en-IN')})
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-200">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="h-8 bg-purple-900/30 animate-pulse rounded"></div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
                    <p className="text-xs text-purple-300">
                      Awaiting approval (live count)
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto mb-8">
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-200 w-4 h-4" />
                  <Input
                    placeholder="Search by username or payment method..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-purple-950/30 border-purple-400/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-purple-950/30 border border-purple-400/30 rounded-md text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="deposit">Deposits</option>
                    <option value="withdrawal">Withdrawals</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-purple-950/30 border border-purple-400/30 rounded-md text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Requests List */}
        <div className="max-w-7xl mx-auto">
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gold">Payment Requests</CardTitle>
              <CardDescription className="text-white/80">
                Approve or reject deposit and withdrawal requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">Error</span>
                  </div>
                  <p className="text-red-300 mt-2">{error}</p>
                  <Button 
                    size="sm"
                    variant="outline" 
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 mt-3"
                    onClick={() => activeTab === 'pending' ? fetchPendingRequests() : fetchHistory()}
                  >
                    Try Again
                  </Button>
                </div>
              )}
              <div className="space-y-4">
                {loadingRequests ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold mb-4"></div>
                    <p className="text-white/60">Loading payment requests...</p>
                  </div>
                ) : filteredRequests.map((request) => (
                  <div key={request.id} className="p-6 bg-black/30 rounded-lg border border-gold/20 hover:border-gold/40 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          request.request_type === 'deposit'
                            ? 'bg-green-500/20 border border-green-500/30'
                            : 'bg-red-500/20 border border-red-500/30'
                        }`}>
                          {getTypeIcon(request.request_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">{request.full_name || request.phone}</h3>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-white/60 text-sm">{request.payment_method}</p>
                          <p className="text-white/40 text-xs">{new Date(request.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xl font-bold mb-1 ${
                          request.request_type === 'deposit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {request.request_type === 'deposit' ? '+' : '-'}{formatCurrency(request.amount)}
                        </div>
                        <div className="text-sm text-white/60">
                          ID: {request.id.substring(0, 8)}
                        </div>
                      </div>
                    </div>

                    {/* Audit Trail for History View */}
                    {activeTab === 'history' && request.updated_at && (
                      <div className="mt-4 pt-4 border-t border-gold/10">
                        <div className="text-sm text-white/60 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Processed: {new Date(request.updated_at).toLocaleString('en-IN')}</span>
                          </div>
                          {(request as any).admin_id && (
                            <div className="flex items-center gap-2">
                              <Activity className="w-3 h-3" />
                              <span>Admin ID: {(request as any).admin_id.substring(0, 8)}...</span>
                            </div>
                          )}
                          {(request as any).admin_notes && (
                            <div className="flex items-start gap-2 mt-2">
                              <div className="text-white/80 bg-black/30 p-2 rounded border border-gold/10">
                                <span className="font-semibold">Notes: </span>
                                {(request as any).admin_notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t border-gold/20">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(
                              request.id, 
                              request.request_type, 
                              request.amount, 
                              request.full_name
                            )}
                            disabled={processingId === request.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {processingId === request.id ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => handleReject(
                              request.id, 
                              request.request_type, 
                              request.amount, 
                              request.full_name
                            )}
                            disabled={processingId === request.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {processingId === request.id ? 'Processing...' : 'Reject'}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gold/30 text-gold hover:bg-gold/10"
                        onClick={() => {
                          const details = `
Request ID: ${request.id}
User: ${request.full_name}
Phone: ${request.phone}
Type: ${request.request_type.toUpperCase()}
Amount: ₹${request.amount.toLocaleString('en-IN')}
Method: ${request.payment_method}
Status: ${request.status.toUpperCase()}
Created: ${new Date(request.created_at).toLocaleString('en-IN', { 
  dateStyle: 'medium', 
  timeStyle: 'short' 
})}
${request.updated_at ? `Updated: ${new Date(request.updated_at).toLocaleString('en-IN', { 
  dateStyle: 'medium', 
  timeStyle: 'short' 
})}` : ''}
                          `.trim();
                          alert(details);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {!loadingRequests && filteredRequests.length === 0 && (
                <div className="text-center py-12">
                  <CreditCard className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                  {paymentRequests.length === 0 ? (
                    <>
                      <p className="text-white/60 mb-2">No payment requests found</p>
                      <p className="text-white/40 text-sm">
                        {activeTab === 'pending' 
                          ? 'No pending requests at the moment' 
                          : 'No requests match your filters'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-white/60 mb-2">No requests match your filters</p>
                      <Button 
                        variant="outline" 
                        className="border-gold/30 text-gold hover:bg-gold/10 mt-4"
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setTypeFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

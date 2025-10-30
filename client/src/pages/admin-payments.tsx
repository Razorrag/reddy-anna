import { useState, useEffect } from "react";
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
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPaymentRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await apiClient.get('/admin/payment-requests/pending') as { data: PaymentRequest[] };
      setPaymentRequests(response.data || []);
    } catch (error) {
      console.error('Failed to fetch payment requests:', error);
    } finally {
      setLoadingRequests(false);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchPaymentRequests();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchPaymentRequests, 10000);
    
    // Real-time refresh on admin notifications
    const handleAdminNotification = (evt: Event) => {
      const msg: any = (evt as CustomEvent).detail;
      if (!msg || msg.type !== 'admin_notification') return;
      if (msg.event === 'new_request' || msg.event === 'request_status_update' || msg.event === 'request_processed') {
        fetchPaymentRequests();
      }
    };
    window.addEventListener('admin_notification', handleAdminNotification as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('admin_notification', handleAdminNotification as EventListener);
    };
  }, []);

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
      alert(`✅ ${requestType} approved successfully! User balance updated.`);
      
      // Refresh the request list
      await fetchPaymentRequests();
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
      
      // Refresh the request list
      await fetchPaymentRequests();
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

  const totalDeposits = paymentRequests
    .filter(r => r.request_type === 'deposit' && r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalWithdrawals = paymentRequests
    .filter(r => r.request_type === 'withdrawal' && r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingRequests = paymentRequests.filter(r => r.status === 'pending').length;

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
                onClick={fetchPaymentRequests}
                disabled={loadingRequests}
              >
                <Activity className={`w-4 h-4 mr-2 ${loadingRequests ? 'animate-spin' : ''}`} />
                {loadingRequests ? 'Refreshing...' : 'Refresh'}
              </Button>
              <div className="text-sm text-purple-300 bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-400/30">
                Auto-refreshes every 10s
              </div>
            </div>
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
                <div className="text-2xl font-bold text-green-400">{formatCurrency(totalDeposits)}</div>
                <p className="text-xs text-purple-300">
                  Approved today
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-200">Total Withdrawals</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">{formatCurrency(totalWithdrawals)}</div>
                <p className="text-xs text-purple-300">
                  Approved today
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-200">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">{pendingRequests}</div>
                <p className="text-xs text-purple-300">
                  Awaiting approval
                </p>
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
                  <p className="text-white/60">No payment requests found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

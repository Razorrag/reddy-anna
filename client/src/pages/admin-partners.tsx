// 🔧 ADMIN PARTNER MANAGEMENT PAGE
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Ban,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  X,
  Key,
  AlertTriangle,
  Wallet,
  Eye,
  TrendingUp,
  IndianRupee
} from "lucide-react";
import { useLocation } from "wouter";

interface Partner {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  status: 'pending' | 'active' | 'suspended' | 'banned';
  sharePercentage: number;
  commissionRate: number;
  lastLogin: string | null;
  createdAt: string;
  // Financial fields
  walletBalance?: number;
  totalEarned?: number;
  totalWithdrawn?: number;
}

export default function AdminPartners() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, suspended: 0, banned: 0 });
  
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [editingShare, setEditingShare] = useState<string | null>(null);
  const [newShare, setNewShare] = useState('');
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [newCommission, setNewCommission] = useState('');
  
  // Emergency password reset states
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState('');

  const handleEmergencyPasswordReset = async () => {
    if (!resetPhone || !newPassword) {
      setResetResult('Please enter both phone number and new password');
      return;
    }
    
    setResetLoading(true);
    setResetResult('');
    
    try {
      // First find partner by phone
      const findResponse = await fetch(`/api/admin/partners/phone/${resetPhone}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const findData = await findResponse.json();
      
      if (!findData.success) {
        setResetResult(`Partner not found: ${findData.error}`);
        return;
      }
      
      const partner = findData.data;
      
      // Reset password
      const resetResponse = await fetch(`/api/admin/partners/${partner.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });
      
      const resetData = await resetResponse.json();
      
      if (resetData.success) {
        setResetResult(`✅ Password reset successful for ${partner.fullName} (${partner.phone})`);
        setResetPhone('');
        setNewPassword('');
      } else {
        setResetResult(`❌ Failed to reset password: ${resetData.error}`);
      }
    } catch (error: any) {
      console.error('Emergency password reset error:', error);
      setResetResult('❌ Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const fetchPartners = async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', filters.page.toString());
      params.set('limit', filters.limit.toString());
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/admin/partners?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        // Fetch wallet data for each partner
        const partnersWithWallet = await Promise.all(
          data.data.partners.map(async (partner: Partner) => {
            try {
              const walletRes = await fetch(`/api/admin/partners/${partner.id}/wallet`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const walletData = await walletRes.json();
              if (walletData.success) {
                return {
                  ...partner,
                  walletBalance: parseFloat(walletData.data.wallet_balance || '0'),
                  totalEarned: parseFloat(walletData.data.total_earned || '0'),
                  totalWithdrawn: parseFloat(walletData.data.total_withdrawn || '0')
                };
              }
            } catch (err) {
              console.error(`Error fetching wallet for partner ${partner.id}:`, err);
            }
            return partner;
          })
        );
        
        setPartners(partnersWithWallet);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching partners:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/partners/stats/summary', {
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

  useEffect(() => {
    if (token) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchPartners(), fetchStats()]);
        setLoading(false);
      };
      loadData();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchPartners();
    }
  }, [token, filters.page, filters.status, filters.search]);

  const updatePartnerStatus = async (partnerId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        fetchPartners();
        fetchStats();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const updateSharePercentage = async (partnerId: string, sharePercentage: string) => {
    const percentage = parseFloat(sharePercentage);
    if (isNaN(percentage) || percentage < 1 || percentage > 100) {
      alert('Share percentage must be between 1 and 100');
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/share`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharePercentage: percentage })
      });
      const data = await response.json();
      if (data.success) {
        setEditingShare(null);
        setNewShare('');
        fetchPartners();
      } else {
        alert(data.error || 'Failed to update share percentage');
      }
    } catch (err) {
      console.error('Error updating share:', err);
      alert('Failed to update share percentage');
    }
  };

  const updateCommissionRate = async (partnerId: string, commissionRate: string) => {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert('Commission rate must be between 0 and 100');
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/commission`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: rate })
      });
      const data = await response.json();
      if (data.success) {
        setEditingCommission(null);
        setNewCommission('');
        fetchPartners();
      } else {
        alert(data.error || 'Failed to update commission rate');
      }
    } catch (err) {
      console.error('Error updating commission:', err);
      alert('Failed to update commission rate');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      banned: 'bg-red-500/20 text-red-400 border-red-500/30'
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
        {/* Emergency Password Reset */}
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency Partner Password Reset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-red-300 text-sm">
                Use this section to immediately reset a partner's password in emergency situations.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-red-400 font-semibold mb-2">Partner Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="9700033313"
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value)}
                    className="bg-black/30 border-red-500/30 text-white placeholder:text-red-300/50 focus:border-red-400 focus:ring-red-400"
                  />
                </div>
                
                <div>
                  <label className="block text-red-400 font-semibold mb-2">New Password</label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-black/30 border-red-500/30 text-white placeholder:text-red-300/50 focus:border-red-400 focus:ring-red-400"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={handleEmergencyPasswordReset}
                    disabled={resetLoading || !resetPhone || !newPassword}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    {resetLoading ? (
                      <div className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Resetting...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Key className="w-4 h-4 mr-2" />
                        Reset Password
                      </div>
                    )}
                  </Button>
                </div>
              </div>
              
              {resetResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  resetResult.includes('✅') ? 'bg-green-500/20 border border-green-500/30 text-green-300' : 
                  'bg-red-500/20 border border-red-500/30 text-red-300'
                }`}>
                  {resetResult}
                </div>
              )}
              
              <div className="text-xs text-red-300/70">
                <strong>Important:</strong> Password must be at least 8 characters with uppercase, lowercase, and number.
                This action is logged and cannot be undone.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gold">Partner Management</h1>
            <p className="text-gray-400">Manage partner accounts</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={() => setLocation('/admin/partner-withdrawals')}
            >
              <Wallet className="h-4 w-4 mr-2" />
              All Withdrawals
            </Button>
            <Button
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
              onClick={() => { fetchPartners(); fetchStats(); }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <Card className="bg-black/40 border-gold/30">
            <CardContent className="pt-4 text-center">
              <Users className="w-6 h-6 text-gold mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-gray-400 text-xs">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-yellow-500/30">
            <CardContent className="pt-4 text-center">
              <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-gray-400 text-xs">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-green-500/30">
            <CardContent className="pt-4 text-center">
              <UserCheck className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
              <p className="text-gray-400 text-xs">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-orange-500/30">
            <CardContent className="pt-4 text-center">
              <UserX className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-400">{stats.suspended}</p>
              <p className="text-gray-400 text-xs">Suspended</p>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-red-500/30">
            <CardContent className="pt-4 text-center">
              <Ban className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-400">{stats.banned}</p>
              <p className="text-gray-400 text-xs">Banned</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-black/40 border-gold/30 mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                    className="pl-10 bg-black/30 border-gold/30 text-white"
                  />
                </div>
              </div>
              <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v, page: 1 }))}>
                <SelectTrigger className="w-40 bg-black/30 border-gold/30 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Partners Table */}
        <Card className="bg-black/40 border-gold/30">
          <CardHeader>
            <CardTitle className="text-gold">Partners ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading...</p>
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No partners found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr className="border-b border-gold/30">
                        <th className="text-left p-3 text-gold font-medium">Partner</th>
                        <th className="text-left p-3 text-gold font-medium">Status</th>
                        <th className="text-center p-3 text-gold font-medium">Share %</th>
                        <th className="text-center p-3 text-gold font-medium">Commission %</th>
                        <th className="text-right p-3 text-gold font-medium">Wallet</th>
                        <th className="text-right p-3 text-gold font-medium">Earned</th>
                        <th className="text-right p-3 text-gold font-medium">Withdrawn</th>
                        <th className="text-center p-3 text-gold font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.map((partner, index) => (
                        <tr key={partner.id} className={`border-b border-gold/20 hover:bg-black/30 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-black/20' : ''}`}>
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-white">{partner.fullName}</p>
                              <p className="text-gray-400 text-sm">{partner.phone}</p>
                              {partner.email && <p className="text-gray-500 text-xs">{partner.email}</p>}
                            </div>
                          </td>
                          <td className="p-3">{getStatusBadge(partner.status)}</td>
                          <td className="p-3 text-center">
                            {editingShare === partner.id ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={newShare}
                                  onChange={(e) => setNewShare(e.target.value)}
                                  className="w-16 h-7 bg-black/30 border-purple-500/30 text-white text-center"
                                />
                                <Button size="sm" className="h-7 px-2 bg-green-600"
                                  onClick={() => updateSharePercentage(partner.id, newShare)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 border-gray-500"
                                  onClick={() => { setEditingShare(null); setNewShare(''); }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="text-purple-400 font-bold hover:text-purple-300"
                                onClick={() => { setEditingShare(partner.id); setNewShare(partner.sharePercentage.toString()); }}
                              >
                                {partner.sharePercentage}%
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {editingCommission === partner.id ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={newCommission}
                                  onChange={(e) => setNewCommission(e.target.value)}
                                  className="w-16 h-7 bg-black/30 border-orange-500/30 text-white text-center"
                                />
                                <Button size="sm" className="h-7 px-2 bg-green-600"
                                  onClick={() => updateCommissionRate(partner.id, newCommission)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 border-gray-500"
                                  onClick={() => { setEditingCommission(null); setNewCommission(''); }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="text-orange-400 font-bold hover:text-orange-300"
                                onClick={() => { setEditingCommission(partner.id); setNewCommission(partner.commissionRate.toString()); }}
                              >
                                {partner.commissionRate}%
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Wallet className="w-3 h-3 text-green-400" />
                              <span className="text-green-400 font-semibold">
                                ₹{(partner.walletBalance || 0).toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3 text-blue-400" />
                              <span className="text-blue-400 font-semibold">
                                ₹{(partner.totalEarned || 0).toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <IndianRupee className="w-3 h-3 text-purple-400" />
                              <span className="text-purple-400 font-semibold">
                                ₹{(partner.totalWithdrawn || 0).toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 justify-center flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-500/30 text-blue-400 h-7 px-2 hover:bg-blue-500/10"
                                onClick={() => setLocation(`/admin/partner/${partner.id}`)}
                              >
                                <Eye className="h-3 w-3 mr-1" /> Details
                              </Button>
                              {partner.status === 'pending' && (
                                <>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 px-2"
                                    onClick={() => updatePartnerStatus(partner.id, 'active')}>
                                    <Check className="h-3 w-3 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 px-2"
                                    onClick={() => updatePartnerStatus(partner.id, 'banned')}>
                                    <X className="h-3 w-3 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              {partner.status === 'active' && (
                                <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400 h-7 px-2"
                                  onClick={() => updatePartnerStatus(partner.id, 'suspended')}>
                                  Suspend
                                </Button>
                              )}
                              {partner.status === 'suspended' && (
                                <>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 px-2"
                                    onClick={() => updatePartnerStatus(partner.id, 'active')}>
                                    Activate
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 px-2"
                                    onClick={() => updatePartnerStatus(partner.id, 'banned')}>
                                    Ban
                                  </Button>
                                </>
                              )}
                              {partner.status === 'banned' && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 px-2"
                                  onClick={() => updatePartnerStatus(partner.id, 'active')}>
                                  Unban
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gold/30">
                    <div className="text-gray-400 text-sm">Page {filters.page} of {pagination.pages}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={filters.page <= 1}
                        className="border-gold/30 text-gold"
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={filters.page >= pagination.pages}
                        className="border-gold/30 text-gold"
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
    </AdminLayout>
  );
}

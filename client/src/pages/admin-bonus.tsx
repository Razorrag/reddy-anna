import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Gift,
  Users,
  Settings,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/AdminLayout";
import { apiClient } from "@/lib/api-client";
import { useNotification } from "@/contexts/NotificationContext";

interface BonusTransaction {
  id: string;
  userId: string;
  username: string;
  type: 'deposit_bonus' | 'referral_bonus' | 'bonus_applied';
  amount: number;
  status: 'pending' | 'applied' | 'failed';
  timestamp: string;
  description: string;
  relatedAmount?: number;
}

interface ReferralData {
  id: string;
  referrerId: string;
  referrerUsername: string;
  referredId: string;
  referredUsername: string;
  depositAmount: number;
  bonusAmount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  bonusAppliedAt?: string;
}

interface BonusSettings {
  depositBonusPercent: number;
  referralBonusPercent: number;
  conditionalBonusThreshold: number;
  bonusClaimThreshold: number;
  adminWhatsappNumber: string;
}

interface PlayerBonusAnalytics {
  userId: string;
  username: string;
  phone: string;
  fullName: string | null;
  currentDepositBonus: number;
  currentReferralBonus: number;
  currentTotalPending: number;
  totalDepositBonusReceived: number;
  totalReferralBonusReceived: number;
  totalBonusApplied: number;
  totalBonusEarned: number;
  depositBonusCount: number;
  referralBonusCount: number;
  totalBonusTransactions: number;
  firstBonusDate: string | null;
  lastBonusDate: string | null;
  userCreatedAt: string;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: 'deposit_bonus' | 'referral_bonus' | 'bonus_applied';
    description: string;
    timestamp: string;
    status: 'pending' | 'applied';
  }>;
}

export default function AdminBonus() {
  const { showNotification } = useNotification();
  const [bonusTransactions, setBonusTransactions] = useState<BonusTransaction[]>([]);
  const [referralData, setReferralData] = useState<ReferralData[]>([]);
  const [playerAnalytics, setPlayerAnalytics] = useState<PlayerBonusAnalytics[]>([]);
  const [bonusSettings, setBonusSettings] = useState<BonusSettings>({
    depositBonusPercent: 5,
    referralBonusPercent: 1,
    conditionalBonusThreshold: 30,
    bonusClaimThreshold: 500,
    adminWhatsappNumber: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBonusAnalytics | null>(null);

  // Fetch bonus transactions
  const fetchBonusTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<{ success: boolean; data: BonusTransaction[] }>(
        `/admin/bonus-transactions?status=${statusFilter}&type=${typeFilter}`
      );
      if (response.success && response.data) {
        setBonusTransactions(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch bonus transactions:', error);
      showNotification(error.message || 'Failed to fetch bonus transactions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch referral data
  const fetchReferralData = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<{ success: boolean; data: ReferralData[] }>(
        `/admin/referral-data?status=${statusFilter === 'all' ? '' : statusFilter}`
      );
      if (response.success && response.data) {
        setReferralData(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch referral data:', error);
      showNotification(error.message || 'Failed to fetch referral data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch bonus settings
  const fetchBonusSettings = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: BonusSettings }>('/admin/bonus-settings');
      if (response.success && response.data) {
        setBonusSettings({
          depositBonusPercent: parseFloat(response.data.depositBonusPercent?.toString() || '5'),
          referralBonusPercent: parseFloat(response.data.referralBonusPercent?.toString() || '1'),
          conditionalBonusThreshold: parseInt(response.data.conditionalBonusThreshold?.toString() || '30'),
          bonusClaimThreshold: parseFloat(response.data.bonusClaimThreshold?.toString() || '500'),
          adminWhatsappNumber: response.data.adminWhatsappNumber || ''
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch bonus settings:', error);
      showNotification(error.message || 'Failed to fetch bonus settings', 'error');
    }
  };

  // Fetch player bonus analytics
  const fetchPlayerAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<{ success: boolean; data: PlayerBonusAnalytics[] }>(
        '/admin/player-bonus-analytics'
      );
      if (response.success && response.data) {
        setPlayerAnalytics(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch player analytics:', error);
      showNotification(error.message || 'Failed to fetch player analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      await Promise.all([
        fetchBonusTransactions(),
        fetchReferralData(),
        fetchBonusSettings(),
        fetchPlayerAnalytics()
      ]);
      setIsLoaded(true);
    };
    loadData();
  }, []);

  // Refresh player analytics when tab changes
  useEffect(() => {
    if (activeTab === 'players' && isLoaded) {
      fetchPlayerAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Refresh data when filters change
  useEffect(() => {
    if (isLoaded) {
      fetchBonusTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  // Refresh referral data when filter changes
  useEffect(() => {
    if (isLoaded && activeTab === 'referrals') {
      fetchReferralData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, activeTab]);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Applied</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit_bonus':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Deposit Bonus</Badge>;
      case 'referral_bonus':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Referral Bonus</Badge>;
      case 'bonus_applied':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Applied</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredBonusTransactions = bonusTransactions.filter(transaction => {
    const matchesSearch = transaction.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalBonusPaid = bonusTransactions
    .filter(t => t.status === 'applied')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPendingBonus = bonusTransactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalReferralEarnings = referralData
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.bonusAmount, 0);

  const handleSaveSettings = async () => {
    try {
      const response = await apiClient.put<{ success: boolean; message?: string; error?: string }>(
        '/admin/bonus-settings',
        {
          depositBonusPercent: bonusSettings.depositBonusPercent,
          referralBonusPercent: bonusSettings.referralBonusPercent,
          conditionalBonusThreshold: bonusSettings.conditionalBonusThreshold,
          bonusClaimThreshold: bonusSettings.bonusClaimThreshold,
          adminWhatsappNumber: bonusSettings.adminWhatsappNumber
        }
      );
      if (response.success) {
        showNotification('Settings saved successfully', 'success');
      } else {
        showNotification(response.error || 'Failed to save settings', 'error');
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      showNotification(error.message || 'Failed to save settings', 'error');
    }
  };

  const handleRefresh = async () => {
    setIsLoaded(false);
    await Promise.all([
      fetchBonusTransactions(),
      fetchReferralData(),
      fetchBonusSettings(),
      fetchPlayerAnalytics()
    ]);
    setIsLoaded(true);
    showNotification('Data refreshed successfully', 'success');
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg mb-2">Bonus Management</h1>
              <p className="text-gray-300">Manage deposit bonuses, referral bonuses, and system settings</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button 
                variant="outline" 
                className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 bg-black/50 border-purple-400/30">
            <TabsTrigger value="overview" className="text-white hover:text-purple-200 data-[state=active]:text-purple-200 data-[state=active]:bg-purple-400/10">
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-white hover:text-purple-200 data-[state=active]:text-purple-200 data-[state=active]:bg-purple-400/10">
              Bonus Transactions
            </TabsTrigger>
            <TabsTrigger value="referrals" className="text-white hover:text-purple-200 data-[state=active]:text-purple-200 data-[state=active]:bg-purple-400/10">
              Referrals
            </TabsTrigger>
            <TabsTrigger value="players" className="text-white hover:text-purple-200 data-[state=active]:text-purple-200 data-[state=active]:bg-purple-400/10">
              Player Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className={cn(
              "grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-1000",
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}>
              <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-200">Total Bonus Paid</CardTitle>
                  <Gift className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{formatCurrency(totalBonusPaid)}</div>
                  <p className="text-xs text-purple-300">
                    All time bonuses
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-200">Pending Bonus</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">{formatCurrency(totalPendingBonus)}</div>
                  <p className="text-xs text-purple-300">
                    Awaiting application
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-200">Referral Earnings</CardTitle>
                  <Users className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">{formatCurrency(totalReferralEarnings)}</div>
                  <p className="text-xs text-purple-300">
                    Total referral bonuses
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bonus Settings */}
            <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Bonus Settings
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Configure bonus percentages and thresholds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="depositBonus" className="text-purple-200">Deposit Bonus (%)</Label>
                    <Input
                      id="depositBonus"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={bonusSettings.depositBonusPercent}
                      onChange={(e) => setBonusSettings(prev => ({ ...prev, depositBonusPercent: parseFloat(e.target.value) || 0 }))}
                      className="bg-purple-950/30 border-purple-400/30 text-white"
                    />
                    <p className="text-xs text-purple-300">Percentage of deposit amount awarded as bonus</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referralBonus" className="text-purple-200">Referral Bonus (%)</Label>
                    <Input
                      id="referralBonus"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={bonusSettings.referralBonusPercent}
                      onChange={(e) => setBonusSettings(prev => ({ ...prev, referralBonusPercent: parseFloat(e.target.value) || 0 }))}
                      className="bg-purple-950/30 border-purple-400/30 text-white"
                    />
                    <p className="text-xs text-purple-300">Percentage of referred user's deposit awarded to referrer</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conditionalThreshold" className="text-purple-200">Conditional Bonus Threshold (%)</Label>
                    <Input
                      id="conditionalThreshold"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={bonusSettings.conditionalBonusThreshold}
                      onChange={(e) => setBonusSettings(prev => ({ ...prev, conditionalBonusThreshold: parseInt(e.target.value) || 0 }))}
                      className="bg-purple-950/30 border-purple-400/30 text-white"
                    />
                    <p className="text-xs text-purple-300">Trigger bonus when balance deviates by this percentage</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bonusClaimThreshold" className="text-purple-200">Bonus Auto-Credit Threshold (₹)</Label>
                    <Input
                      id="bonusClaimThreshold"
                      type="number"
                      min="0"
                      step="1"
                      value={bonusSettings.bonusClaimThreshold}
                      onChange={(e) => setBonusSettings(prev => ({ ...prev, bonusClaimThreshold: parseFloat(e.target.value) || 0 }))}
                      className="bg-purple-950/30 border-purple-400/30 text-white"
                    />
                    <p className="text-xs text-purple-300">Auto-credit bonus when total reaches this amount (0 to disable)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminWhatsappNumber" className="text-purple-200">Admin WhatsApp Number</Label>
                    <Input
                      id="adminWhatsappNumber"
                      type="text"
                      value={bonusSettings.adminWhatsappNumber}
                      onChange={(e) => setBonusSettings(prev => ({ ...prev, adminWhatsappNumber: e.target.value }))}
                      className="bg-purple-950/30 border-purple-400/30 text-white"
                    />
                    <p className="text-xs text-purple-300">WhatsApp number for deposit/withdrawal requests</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveSettings}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bonus Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6 mt-6">
            {/* Filters */}
            <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-200 w-4 h-4" />
                    <Input
                      placeholder="Search by username or description..."
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
                      <option value="deposit_bonus">Deposit Bonus</option>
                      <option value="referral_bonus">Referral Bonus</option>
                      <option value="bonus_applied">Applied Bonus</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-purple-950/30 border border-purple-400/30 rounded-md text-white focus:border-purple-400 focus:outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="applied">Applied</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card className="bg-black/50 border-purple-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-200">Bonus Transactions</CardTitle>
                <CardDescription className="text-purple-300">
                  All bonus transactions in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredBonusTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-6 bg-black/30 rounded-lg border border-purple-400/20 hover:border-purple-400/40 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            transaction.type === 'deposit_bonus' ? 'bg-blue-500/20 border border-blue-500/30' :
                            transaction.type === 'referral_bonus' ? 'bg-purple-500/20 border border-purple-500/30' :
                            'bg-green-500/20 border border-green-500/30'
                          }`}>
                            <Gift className="w-6 h-6 text-purple-300" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-white">{transaction.username}</h3>
                              {getTypeBadge(transaction.type)}
                              {getStatusBadge(transaction.status)}
                            </div>
                            <p className="text-purple-300 text-sm">{transaction.description}</p>
                            <p className="text-purple-400 text-xs">
                              {transaction.timestamp ? new Date(transaction.timestamp).toLocaleString('en-IN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-bold text-green-400 mb-1">
                            +{formatCurrency(transaction.amount)}
                          </div>
                          {transaction.relatedAmount && (
                            <div className="text-sm text-purple-300">
                              Based on {formatCurrency(transaction.relatedAmount)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-purple-400/20">
                        {transaction.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Apply Bonus
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-400/30 text-purple-300 hover:bg-purple-400/10"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredBonusTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <Gift className="w-16 h-16 text-purple-300/30 mx-auto mb-4" />
                    <p className="text-purple-300">No bonus transactions found matching your criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6 mt-6">
            <Card className="bg-black/50 border-purple-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-200">Referral Relationships</CardTitle>
                <CardDescription className="text-purple-300">
                  Track all referral relationships and bonus distributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {referralData.map((referral) => (
                    <div key={referral.id} className="p-6 bg-black/30 rounded-lg border border-purple-400/20 hover:border-purple-400/40 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-300" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-white">{referral.referrerUsername}</h3>
                              <span className="text-purple-300">→</span>
                              <h3 className="text-lg font-semibold text-white">{referral.referredUsername}</h3>
                              {getStatusBadge(referral.status)}
                            </div>
                            <p className="text-purple-300 text-sm">
                              Referral created on {referral.createdAt ? new Date(referral.createdAt).toLocaleString('en-IN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              }) : 'N/A'}
                            </p>
                            {referral.bonusAppliedAt && (
                              <p className="text-green-400 text-sm">
                                Bonus applied on {new Date(referral.bonusAppliedAt).toLocaleString('en-IN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-purple-300 mb-1">Deposit Amount</div>
                          <div className="text-lg font-bold text-white mb-2">
                            {formatCurrency(referral.depositAmount)}
                          </div>
                          <div className="text-sm text-purple-300 mb-1">Bonus Earned</div>
                          <div className="text-lg font-bold text-green-400">
                            +{formatCurrency(referral.bonusAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-purple-400/20">
                        {referral.status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Process Bonus
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-400/30 text-purple-300 hover:bg-purple-400/10"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {referralData.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-purple-300/30 mx-auto mb-4" />
                    <p className="text-purple-300">No referral relationships found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Player Analytics Tab */}
          <TabsContent value="players" className="space-y-6 mt-6">
            {/* Search and Filters */}
            <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-200 w-4 h-4" />
                    <Input
                      placeholder="Search by username, phone, or name..."
                      value={playerSearchTerm}
                      onChange={(e) => setPlayerSearchTerm(e.target.value)}
                      className="pl-10 bg-purple-950/30 border-purple-400/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player Analytics List */}
            <Card className="bg-black/50 border-purple-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-200">Player Bonus Analytics</CardTitle>
                <CardDescription className="text-purple-300">
                  Comprehensive bonus analytics for each player - see how much bonus was given, when it was added, and complete transaction history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-16 h-16 text-purple-300/30 mx-auto mb-4 animate-spin" />
                    <p className="text-purple-300">Loading player analytics...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {playerAnalytics
                        .filter((player) => {
                          const searchLower = playerSearchTerm.toLowerCase();
                          return (
                            player.username.toLowerCase().includes(searchLower) ||
                            player.phone.includes(searchLower) ||
                            (player.fullName && player.fullName.toLowerCase().includes(searchLower))
                          );
                        })
                        .map((player) => (
                          <div
                            key={player.userId}
                            className="p-6 bg-black/30 rounded-lg border border-purple-400/20 hover:border-purple-400/40 transition-colors"
                          >
                            {/* Player Header */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                  <Users className="w-8 h-8 text-purple-300" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-semibold text-white">{player.username}</h3>
                                    {player.fullName && (
                                      <span className="text-purple-300 text-sm">({player.fullName})</span>
                                    )}
                                  </div>
                                  <p className="text-purple-400 text-sm">{player.phone}</p>
                                  <p className="text-purple-500 text-xs">
                                    Player since {new Date(player.userCreatedAt).toLocaleDateString('en-IN')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-purple-300 mb-1">Total Bonus Earned</div>
                                <div className="text-3xl font-bold text-green-400">
                                  {formatCurrency(player.totalBonusEarned)}
                                </div>
                              </div>
                            </div>

                            {/* Bonus Statistics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="p-4 bg-purple-950/30 rounded-lg border border-purple-400/20">
                                <div className="text-xs text-purple-300 mb-1">Current Deposit Bonus</div>
                                <div className="text-lg font-bold text-blue-400">
                                  {formatCurrency(player.currentDepositBonus)}
                                </div>
                              </div>
                              <div className="p-4 bg-purple-950/30 rounded-lg border border-purple-400/20">
                                <div className="text-xs text-purple-300 mb-1">Current Referral Bonus</div>
                                <div className="text-lg font-bold text-purple-400">
                                  {formatCurrency(player.currentReferralBonus)}
                                </div>
                              </div>
                              <div className="p-4 bg-purple-950/30 rounded-lg border border-purple-400/20">
                                <div className="text-xs text-purple-300 mb-1">Total Deposit Bonuses</div>
                                <div className="text-lg font-bold text-blue-300">
                                  {formatCurrency(player.totalDepositBonusReceived)}
                                </div>
                                <div className="text-xs text-purple-400 mt-1">
                                  {player.depositBonusCount} transaction{player.depositBonusCount !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <div className="p-4 bg-purple-950/30 rounded-lg border border-purple-400/20">
                                <div className="text-xs text-purple-300 mb-1">Total Referral Bonuses</div>
                                <div className="text-lg font-bold text-purple-300">
                                  {formatCurrency(player.totalReferralBonusReceived)}
                                </div>
                                <div className="text-xs text-purple-400 mt-1">
                                  {player.referralBonusCount} transaction{player.referralBonusCount !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>

                            {/* Bonus Timeline */}
                            <div className="mb-4 p-4 bg-purple-950/20 rounded-lg border border-purple-400/10">
                              <div className="flex items-center gap-4 text-sm">
                                {player.firstBonusDate && (
                                  <div>
                                    <span className="text-purple-300">First Bonus: </span>
                                    <span className="text-white font-semibold">
                                      {new Date(player.firstBonusDate).toLocaleString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                )}
                                {player.lastBonusDate && (
                                  <div>
                                    <span className="text-purple-300">Last Bonus: </span>
                                    <span className="text-white font-semibold">
                                      {new Date(player.lastBonusDate).toLocaleString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                )}
                                <div className="ml-auto">
                                  <span className="text-purple-300">Total Transactions: </span>
                                  <span className="text-white font-semibold">{player.totalBonusTransactions}</span>
                                </div>
                              </div>
                            </div>

                            {/* Recent Transactions */}
                            {player.recentTransactions.length > 0 && (
                              <div>
                                <h4 className="text-purple-200 font-semibold mb-3 flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  Recent Bonus Transactions
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {player.recentTransactions.map((txn) => (
                                    <div
                                      key={txn.id}
                                      className="p-3 bg-purple-950/20 rounded-lg border border-purple-400/10 flex items-center justify-between"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          {getTypeBadge(txn.type)}
                                          {getStatusBadge(txn.status)}
                                        </div>
                                        <p className="text-purple-300 text-sm">{txn.description}</p>
                                        <p className="text-purple-400 text-xs">
                                          {new Date(txn.timestamp).toLocaleString('en-IN', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                      <div className="text-right ml-4">
                                        <div className="text-lg font-bold text-green-400">
                                          +{formatCurrency(txn.amount)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* View Full History Button */}
                            <div className="flex justify-end gap-2 pt-4 border-t border-purple-400/20 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-purple-400/30 text-purple-300 hover:bg-purple-400/10"
                                onClick={() => setSelectedPlayer(selectedPlayer === player ? null : player)}
                              >
                                {selectedPlayer === player ? 'Hide' : 'View'} Full History
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>

                    {playerAnalytics.filter((player) => {
                      const searchLower = playerSearchTerm.toLowerCase();
                      return (
                        player.username.toLowerCase().includes(searchLower) ||
                        player.phone.includes(searchLower) ||
                        (player.fullName && player.fullName.toLowerCase().includes(searchLower))
                      );
                    }).length === 0 && (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 text-purple-300/30 mx-auto mb-4" />
                        <p className="text-purple-300">
                          {playerSearchTerm ? 'No players found matching your search.' : 'No player bonus analytics found.'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
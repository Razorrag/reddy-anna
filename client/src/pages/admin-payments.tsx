import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Breadcrumb from "@/components/Breadcrumb";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  details: string;
}

export default function AdminPayments() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading transactions data
    setTimeout(() => {
      setTransactions([
        {
          id: '1',
          userId: 'user1',
          username: 'player123',
          type: 'deposit',
          amount: 5000,
          method: 'UPI',
          status: 'completed',
          timestamp: '2024-01-20 14:30:00',
          details: 'Google Pay - player123@okaxis'
        },
        {
          id: '2',
          userId: 'user2',
          username: 'bettor789',
          type: 'withdraw',
          amount: 25000,
          method: 'Bank Transfer',
          status: 'pending',
          timestamp: '2024-01-20 13:45:00',
          details: 'HDFC Bank - XX1234'
        },
        {
          id: '3',
          userId: 'user3',
          username: 'luckyone',
          type: 'deposit',
          amount: 10000,
          method: 'UPI',
          status: 'processing',
          timestamp: '2024-01-20 12:15:00',
          details: 'PhonePe - luckyone@paytm'
        },
        {
          id: '4',
          userId: 'user4',
          username: 'gamer456',
          type: 'withdraw',
          amount: 15000,
          method: 'UPI',
          status: 'failed',
          timestamp: '2024-01-20 11:30:00',
          details: 'Paytm - gamer456@paytm'
        },
        {
          id: '5',
          userId: 'user5',
          username: 'testuser',
          type: 'deposit',
          amount: 2000,
          method: 'Wallet',
          status: 'completed',
          timestamp: '2024-01-20 10:45:00',
          details: 'Paytm Wallet'
        }
      ]);
      setIsLoaded(true);
    }, 1000);
  }, []);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
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

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdraw' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingRequests = transactions.filter(t => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      {/* No breadcrumbs - admin access is hidden */}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Today's Transactions</h1>
            <p className="text-purple-200">Manage deposits and withdrawals for today</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
              <Filter className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
              <Activity className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            {/* No navigation options - admin access is isolated */}
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
                Completed today
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
                Completed today
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
                  placeholder="Search by username or payment details..."
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
                  <option value="withdraw">Withdrawals</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-purple-950/30 border border-purple-400/30 rounded-md text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <div className="max-w-7xl mx-auto">
        <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-gold">Transaction History</CardTitle>
            <CardDescription className="text-white/80">
              All deposits and withdrawals for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-6 bg-black/30 rounded-lg border border-gold/20 hover:border-gold/40 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        transaction.type === 'deposit'
                          ? 'bg-green-500/20 border border-green-500/30'
                          : 'bg-red-500/20 border border-red-500/30'
                      }`}>
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">{transaction.username}</h3>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="text-white/60 text-sm">{transaction.details}</p>
                        <p className="text-white/40 text-xs">{transaction.timestamp}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xl font-bold mb-1 ${
                        transaction.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                      <div className="text-sm text-white/60">
                        {transaction.method}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gold/20">
                    {transaction.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
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
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                <p className="text-white/60">No transactions found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

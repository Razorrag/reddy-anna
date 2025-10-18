import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  MoreHorizontal,
  Ban,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Mail,
  Phone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  balance: number;
  status: 'active' | 'suspended' | 'banned';
  joinDate: string;
  lastActive: string;
  totalBets: number;
  totalWins: number;
}

export default function UserAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading users
    setTimeout(() => {
      setUsers([
        {
          id: '1',
          username: 'player123',
          email: 'player123@example.com',
          phone: '+91 9876543210',
          balance: 15420.50,
          status: 'active',
          joinDate: '2024-01-15',
          lastActive: '2024-01-20 14:30',
          totalBets: 245,
          totalWins: 134
        },
        {
          id: '2',
          username: 'gamer456',
          email: 'gamer456@example.com',
          phone: '+91 9876543211',
          balance: 0,
          status: 'suspended',
          joinDate: '2024-01-10',
          lastActive: '2024-01-18 09:15',
          totalBets: 89,
          totalWins: 45
        },
        {
          id: '3',
          username: 'bettor789',
          email: 'bettor789@example.com',
          phone: '+91 9876543212',
          balance: 45670.25,
          status: 'active',
          joinDate: '2024-01-12',
          lastActive: '2024-01-20 16:45',
          totalBets: 567,
          totalWins: 312
        },
        {
          id: '4',
          username: 'luckyone',
          email: 'lucky@example.com',
          phone: '+91 9876543213',
          balance: 2340.00,
          status: 'banned',
          joinDate: '2024-01-08',
          lastActive: '2024-01-17 11:20',
          totalBets: 123,
          totalWins: 67
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
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Banned</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-purple-900/20 to-red-900/20 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gold mb-2">User Management</h1>
            <p className="text-white/80">Manage user accounts and permissions</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
              <Filter className="w-4 h-4 mr-2" />
              Export Users
            </Button>
            <Button className="bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
              Add New User
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-4 gap-6 transition-all duration-1000",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Total Users</CardTitle>
              <UserCheck className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">{users.length}</div>
              <p className="text-xs text-white/60">
                Registered users
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {users.filter(u => u.status === 'active').length}
              </div>
              <p className="text-xs text-white/60">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Suspended</CardTitle>
              <XCircle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {users.filter(u => u.status === 'suspended').length}
              </div>
              <p className="text-xs text-white/60">
                Temporarily suspended
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Banned</CardTitle>
              <Ban className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {users.filter(u => u.status === 'banned').length}
              </div>
              <p className="text-xs text-white/60">
                Permanently banned
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gold w-4 h-4" />
                <Input
                  placeholder="Search users by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/30 border-gold/30 text-white placeholder:text-white/50 focus:border-gold"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-black/30 border border-gold/30 rounded-md text-white focus:border-gold focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <div className="max-w-7xl mx-auto">
        <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-gold">User Accounts</CardTitle>
            <CardDescription className="text-white/80">
              Manage user accounts, balances, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-6 bg-black/30 rounded-lg border border-gold/20 hover:border-gold/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center">
                        <span className="text-black font-bold text-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">{user.username}</h3>
                          {getStatusBadge(user.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {user.phone}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-gold mb-1">
                        {formatCurrency(user.balance)}
                      </div>
                      <div className="text-sm text-white/60">
                        Balance
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gold/20">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Join Date:</span>
                        <span className="text-white ml-2">{user.joinDate}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Last Active:</span>
                        <span className="text-white ml-2">{user.lastActive}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Total Bets:</span>
                        <span className="text-gold ml-2 font-semibold">{user.totalBets}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Win Rate:</span>
                        <span className="text-green-400 ml-2 font-semibold">
                          {user.totalBets > 0 ? Math.round((user.totalWins / user.totalBets) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gold/20 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Suspend
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Ban
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/60">No users found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

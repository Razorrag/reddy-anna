import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Ban,
  CheckCircle,
  XCircle,
  UserCheck,
  Mail,
  Phone,
  Trophy,
  CreditCard,
  Activity,
  Plus,
  RefreshCw,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchUsers,
  updateUserBalance,
  updateUserStatus,
  formatCurrency,
  getStatusBadgeClass,
  formatMobileNumber,
  validateMobileNumber,
  type UserAdminFilters,
  type UserBalanceUpdate,
  type UserStatusUpdate
} from "@/services/userAdminService";
import { type AdminUser } from "@/types/game";
import UserBalanceModal from "@/components/UserBalanceModal";
import UserDetailsModal from "@/components/UserDetailsModal";
import { useToast } from "@/hooks/use-toast";

export default function UserAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  // Load users from API
  const loadUsers = async (filters: UserAdminFilters = {}) => {
    setIsLoading(true);
    try {
      const response = await fetchUsers(filters);
      if (response.success) {
        setUsers(response.users);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load users",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Handle balance update
  const handleBalanceUpdate = async (userId: string, update: UserBalanceUpdate) => {
    try {
      const response = await updateUserBalance(userId, update);
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Balance updated successfully"
        });
        // Refresh users list
        loadUsers({ search: searchTerm, status: statusFilter as any });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update balance",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update balance",
        variant: "destructive"
      });
    }
  };

  // Handle status update
  const handleStatusUpdate = async (userId: string, status: 'active' | 'suspended' | 'banned', reason: string) => {
    try {
      const response = await updateUserStatus(userId, { status, reason });
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Status updated successfully"
        });
        // Refresh users list
        loadUsers({ search: searchTerm, status: statusFilter as any });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update status",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  // Enhanced search with mobile number support
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm) ||
      user.phone?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoaded) {
        loadUsers({ search: searchTerm, status: statusFilter as any });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      {/* No breadcrumbs - admin access is hidden */}
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
            <p className="text-purple-200">Manage realtime users currently in the game</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
              onClick={() => loadUsers({ search: searchTerm, status: statusFilter as any })}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh Users
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
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Total Users</CardTitle>
              <UserCheck className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{users.length}</div>
              <p className="text-xs text-purple-300">
                Registered users
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {users.filter(u => u.status === 'active').length}
              </div>
              <p className="text-xs text-purple-300">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Suspended</CardTitle>
              <XCircle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {users.filter(u => u.status === 'suspended').length}
              </div>
              <p className="text-xs text-purple-300">
                Temporarily suspended
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Banned</CardTitle>
              <Ban className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {users.filter(u => u.status === 'banned').length}
              </div>
              <p className="text-xs text-purple-300">
                Permanently banned
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-200 w-4 h-4" />
                <Input
                  placeholder="Search users by name, phone, or mobile number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-purple-950/30 border-purple-400/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-purple-950/30 border border-purple-400/30 rounded-md text-white focus:border-purple-400 focus:outline-none"
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
        <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">User Accounts</CardTitle>
            <CardDescription className="text-purple-200">
              Manage user accounts, balances, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-6 bg-purple-950/30 rounded-lg border border-purple-400/20 hover:border-purple-400/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">{user.fullName}</h3>
                          <Badge className={getStatusBadgeClass(user.status)}>
                            {user.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-purple-300">
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {formatMobileNumber(user.phone)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-white mb-1">
                        {formatCurrency(user.balance)}
                      </div>
                      <div className="text-sm text-purple-300">
                        Balance
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-purple-400/20">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-purple-300">Join Date:</span>
                        <span className="text-white ml-2">
                          {new Date(user.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-purple-300">Last Active:</span>
                        <span className="text-white ml-2">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN') : 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-purple-300">Games Played:</span>
                        <span className="text-white ml-2 font-semibold">{user.gamesPlayed}</span>
                      </div>
                      <div>
                        <span className="text-purple-300">Win Rate:</span>
                        <span className="text-green-400 ml-2 font-semibold">
                          {user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-purple-400/20 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
                      onClick={() => {
                        setSelectedUser(user);
                        setDetailsModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
                      onClick={() => {
                        setSelectedUser(user);
                        setBalanceModalOpen(true);
                      }}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Update Balance
                    </Button>
                    {user.status !== 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        onClick={() => handleStatusUpdate(user.id, 'active', 'Activated by admin')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    )}
                    {user.status !== 'suspended' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                        onClick={() => handleStatusUpdate(user.id, 'suspended', 'Suspended by admin')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                    {user.status !== 'banned' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleStatusUpdate(user.id, 'banned', 'Banned by admin')}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Ban
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-purple-300">No users found matching your criteria.</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-400" />
                <p className="text-purple-300 mt-4">Loading users...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Balance Modal */}
      {selectedUser && (
        <UserBalanceModal
          isOpen={balanceModalOpen}
          onClose={() => setBalanceModalOpen(false)}
          user={selectedUser}
          onUpdateBalance={handleBalanceUpdate}
        />
      )}

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}

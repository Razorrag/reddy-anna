// API service for user management
import { apiClient } from '@/lib/api-client';

// Type definitions for user management
export interface UserBalanceUpdate {
  amount: number;
  type: 'add' | 'subtract';
  reason: string;
}

export interface UserStatusUpdate {
  status: 'active' | 'suspended' | 'banned';
  reason: string;
}

export interface UserAdminFilters {
  status?: 'active' | 'suspended' | 'banned';
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserCreateData {
  phone: string;
  name: string;
  initialBalance?: number;
  role?: string;
  status?: string;
}

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: string;
  status: 'active' | 'suspended' | 'banned';
  balance: number;
  totalWinnings: number;
  totalLosses: number;
  gamesPlayed: number;
  gamesWon: number;
  phoneVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  success: boolean;
  users: User[];
  total: number;
  error?: string;
}

export interface UserResponse {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
}

export interface UserStatisticsResponse {
  success: boolean;
  user?: any;
  error?: string;
}

// API service functions
export const fetchUsers = async (filters: UserAdminFilters = {}): Promise<UsersResponse> => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    const response = await apiClient.get<UsersResponse>(`/admin/users?${params}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return { success: false, users: [], total: 0, error: 'Failed to fetch users' };
  }
};

export const getUserDetails = async (userId: string): Promise<UserResponse> => {
  try {
    const response = await apiClient.get<UserResponse>(`/admin/users/${userId}`);
    return response;
  } catch (error) {
    console.error('Failed to get user details:', error);
    return { success: false, error: 'Failed to get user details' };
  }
};

export const updateUserBalance = async (userId: string, update: UserBalanceUpdate): Promise<UserResponse> => {
  try {
    const response = await apiClient.patch<UserResponse>(`/admin/users/${userId}/balance`, update);
    return response;
  } catch (error) {
    console.error('Failed to update balance:', error);
    return { success: false, error: 'Failed to update balance' };
  }
};

export const updateUserStatus = async (userId: string, update: UserStatusUpdate): Promise<UserResponse> => {
  try {
    const response = await apiClient.patch<UserResponse>(`/admin/users/${userId}/status`, update);
    return response;
  } catch (error) {
    console.error('Failed to update status:', error);
    return { success: false, error: 'Failed to update status' };
  }
};

export const createUserManually = async (userData: UserCreateData): Promise<UserResponse> => {
  try {
    const response = await apiClient.post<UserResponse>('/admin/users/create', userData);
    return response;
  } catch (error) {
    console.error('Failed to create user:', error);
    return { success: false, error: 'Failed to create user' };
  }
};

export const getUserStatistics = async (userId?: string): Promise<UserStatisticsResponse> => {
  try {
    const params = userId ? `?userId=${userId}` : '';
    const response = await apiClient.get<UserStatisticsResponse>(`/admin/statistics${params}`);
    return response;
  } catch (error) {
    console.error('Failed to get user statistics:', error);
    return { success: false, error: 'Failed to get user statistics' };
  }
};

export const getUserReferrals = async (userId: string): Promise<UsersResponse> => {
  try {
    const response = await apiClient.get<UsersResponse>(`/admin/users/${userId}/referrals`);
    return response;
  } catch (error) {
    console.error('Failed to get user referrals:', error);
    return { success: false, users: [], total: 0, error: 'Failed to get user referrals' };
  }
};

export const bulkUpdateUserStatus = async (
  userIds: string[], 
  status: 'active' | 'suspended' | 'banned', 
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await apiClient.post<{ success: boolean; error?: string }>('/admin/users/bulk-status', {
      userIds,
      status,
      reason
    });
    return response;
  } catch (error) {
    console.error('Failed to bulk update user status:', error);
    return { success: false, error: 'Failed to bulk update user status' };
  }
};

export const exportUserData = async (filters: UserAdminFilters = {}): Promise<any> => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    const response = await apiClient.get(`/admin/users/export?${params}`);
    return response;
  } catch (error) {
    console.error('Failed to export user data:', error);
    return { success: false, error: 'Failed to export user data' };
  }
};

export const resetUserPassword = async (userId: string, newPassword: string): Promise<UserResponse> => {
  try {
    const response = await apiClient.patch<UserResponse>(`/admin/users/${userId}/password`, { newPassword });
    return response;
  } catch (error) {
    console.error('Failed to reset password:', error);
    return { success: false, error: 'Failed to reset password' };
  }
};

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper function to get status badge styling
export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'suspended':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'banned':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

// Helper function to validate mobile number
export const validateMobileNumber = (phone: string): boolean => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(phone.replace(/\D/g, ''));
};

// Helper function to format mobile number
export const formatMobileNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};
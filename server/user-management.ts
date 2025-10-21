// User Management System
import { storage } from './storage-supabase';
import { validateMobileNumber, validateEmail, sanitizeInput } from './validation';

export interface UserProfileUpdate {
  name?: string;
  email?: string;
  mobile?: string;
  profile?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    dateOfBirth?: Date;
    gender?: string;
    profilePicture?: string;
  };
}

export interface UserManagementResponse {
  success: boolean;
  user?: any;
  users?: any[];
  total?: number;
  error?: string;
  message?: string;
}

export interface UserFilters {
  status?: 'active' | 'suspended' | 'banned';
  search?: string;
  joinDateFrom?: Date;
  joinDateTo?: Date;
  balanceMin?: number;
  balanceMax?: number;
  referredBy?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'lastLogin' | 'balance' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export const updateUserProfile = async (userId: string, updates: UserProfileUpdate): Promise<UserManagementResponse> => {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // For Supabase, we can only update the username (which is email in our schema)
    if (updates.email) {
      const sanitizedEmail = sanitizeInput(updates.email).toLowerCase();
      if (!validateEmail(sanitizedEmail)) {
        return { success: false, error: 'Invalid email format' };
      }
      
      // Check if email is already taken by another user
      const existingUser = await storage.getUserByUsername(sanitizedEmail);
      if (existingUser && existingUser.id !== userId) {
        return { success: false, error: 'Email is already taken' };
      }
    }

    // Since we're not storing profile details in our current Supabase schema,
    // we'll only support updating the username for now
    if (updates.email) {
      // In the current Supabase schema, username is the same as email
      // We don't have a separate username field with profile details
      return { success: false, error: 'Profile updates not supported in current schema' };
    }

    // Return the user
    const userResponse = {
      id: user.id,
      username: user.username,
      balance: user.balance,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    return { success: true, user: userResponse };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error: 'Profile update failed' };
  }
};

export const getUserDetails = async (userId: string): Promise<UserManagementResponse> => {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Format response
    const userResponse = {
      id: user.id,
      username: user.username,
      balance: user.balance,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    return { success: true, user: userResponse };
  } catch (error) {
    console.error('User details error:', error);
    return { success: false, error: 'User details retrieval failed' };
  }
};

export const getUserGameHistory = async (userId: string, filters: {
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  type?: 'andar' | 'bahar';
  result?: 'win' | 'loss';
} = {}): Promise<UserManagementResponse> => {
  // For now, game history is stored in the game_history table which is accessed differently
  // This function would need to access bet history and game results from player_bets and game_history tables
  throw new Error('getUserGameHistory function not implemented in Supabase version');
};

export const getAllUsers = async (filters: UserFilters = {}): Promise<UserManagementResponse> => {
  // Supabase doesn't currently store additional user details like name, mobile, etc.
  // in our simplified schema, so this function is not directly implementable
  throw new Error('getAllUsers function not implemented in Supabase version');
};

export const updateUserStatus = async (
  userId: string, 
  status: 'active' | 'suspended' | 'banned', 
  adminId: string, 
  reason?: string
): Promise<UserManagementResponse> => {
  throw new Error('updateUserStatus function not implemented in Supabase version');
};

export const updateUserBalance = async (
  userId: string, 
  amount: number, 
  adminId: string, 
  reason: string,
  type: 'add' | 'subtract' = 'add'
): Promise<UserManagementResponse> => {
  try {
    // Use the storage function to update balance
    if (type === 'subtract') {
      await storage.updateUserBalance(userId, -amount);
    } else {
      await storage.updateUserBalance(userId, amount);
    }

    // Get updated user details
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Return updated user details
    const userResponse = {
      id: user.id,
      username: user.username,
      balance: user.balance,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    return { 
      success: true, 
      user: userResponse,
      message: `Balance ${type === 'add' ? 'added' : 'subtracted'}: ${amount}, reason: ${reason}`
    };
  } catch (error) {
    console.error('User balance update error:', error);
    return { success: false, error: 'User balance update failed' };
  }
};

export const getUserStatistics = async (userId?: string): Promise<UserManagementResponse> => {
  try {
    if (userId) {
      // Get statistics for a specific user
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // For now, return basic user stats since we don't have detailed game history in this version
      const statistics = {
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance,
          createdAt: user.created_at
        },
        gaming: {
          totalGames: 0, // Placeholder
          wins: 0,       // Placeholder
          losses: 0,     // Placeholder
          winRate: 0,    // Placeholder
          totalBetAmount: 0,
          totalPayout: 0,
          netProfit: 0
        }
      };

      return { success: true, user: statistics };
    } else {
      // For now, return basic platform stats
      const statistics = {
        totalUsers: 0,      // Placeholder
        activeUsers: 0,     // Placeholder
        suspendedUsers: 0,  // Placeholder
        bannedUsers: 0,     // Placeholder
        totalBalance: 0,    // Placeholder
        newUsersToday: 0,   // Placeholder
        newUsersThisMonth: 0, // Placeholder
        averageBalance: 0   // Placeholder
      };

      return { success: true, user: statistics };
    }
  } catch (error) {
    console.error('User statistics error:', error);
    return { success: false, error: 'User statistics retrieval failed' };
  }
};

export const getReferredUsers = async (userId: string): Promise<UserManagementResponse> => {
  // For now, this functionality is not available in the simplified Supabase schema
  // since we don't store referral relationships in our current implementation
  return { success: true, users: [] };
};

export const bulkUpdateUserStatus = async (
  userIds: string[],
  status: 'active' | 'suspended' | 'banned',
  adminId: string,
  reason?: string
): Promise<UserManagementResponse> => {
  // For now, this function is not available in the simplified Supabase schema
  return { 
    success: false, 
    error: 'Bulk user status updates not implemented in Supabase version'
  };
};

export const exportUserData = async (filters: UserFilters = {}): Promise<UserManagementResponse> => {
  return { 
    success: false, 
    error: 'User data export not implemented in Supabase version'
  };
};

export const validateUserProfileUpdate = (updates: UserProfileUpdate): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (updates.name !== undefined) {
    if (!updates.name || updates.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
  }

  if (updates.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.email)) {
      errors.push('Invalid email format');
    }
  }

  if (updates.mobile !== undefined) {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(updates.mobile)) {
      errors.push('Invalid 10-digit Indian mobile number');
    }
  }

  if (updates.profile?.dateOfBirth !== undefined) {
    const dob = new Date(updates.profile.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    if (age < 18 || age > 100) {
      errors.push('User must be between 18 and 100 years old');
    }
  }

  if (updates.profile?.gender !== undefined) {
    const validGenders = ['male', 'female', 'other'];
    if (!validGenders.includes(updates.profile.gender.toLowerCase())) {
      errors.push('Gender must be male, female, or other');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

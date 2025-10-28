// User Management System
import { storage } from './storage-supabase';
import { validateMobileNumber, validateEmail, sanitizeInput } from './validation';
import bcrypt from 'bcryptjs';

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
      username: user.phone, // Use phone as username since that's our identifier
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
      username: user.phone, // Use phone as username since that's our identifier
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
  try {
    // Get all users from storage
    const allUsers = await storage.getAllUsers();
    
    if (!allUsers || allUsers.length === 0) {
      return { success: true, users: [], total: 0 };
    }

    // Apply filters
    let filteredUsers = [...allUsers];

    // Status filter
    if (filters.status) {
      filteredUsers = filteredUsers.filter((u: any) => u.status === filters.status);
    }

    // Search filter (by phone or name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredUsers = filteredUsers.filter((u: any) => 
        u.phone?.toLowerCase().includes(searchLower) ||
        u.full_name?.toLowerCase().includes(searchLower) ||
        u.id?.toLowerCase().includes(searchLower)
      );
    }

    // Balance filters
    if (filters.balanceMin !== undefined) {
      filteredUsers = filteredUsers.filter((u: any) => parseFloat(u.balance) >= filters.balanceMin!);
    }
    if (filters.balanceMax !== undefined) {
      filteredUsers = filteredUsers.filter((u: any) => parseFloat(u.balance) <= filters.balanceMax!);
    }

    // Date filters
    if (filters.joinDateFrom) {
      filteredUsers = filteredUsers.filter((u: any) => u.created_at && new Date(u.created_at) >= filters.joinDateFrom!);
    }
    if (filters.joinDateTo) {
      filteredUsers = filteredUsers.filter((u: any) => u.created_at && new Date(u.created_at) <= filters.joinDateTo!);
    }

    // Sorting
    if (filters.sortBy) {
      filteredUsers.sort((a: any, b: any) => {
        let aVal: any, bVal: any;
        
        switch (filters.sortBy) {
          case 'balance':
            aVal = parseFloat(a.balance);
            bVal = parseFloat(b.balance);
            break;
          case 'createdAt':
            aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
            bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
            break;
          case 'lastLogin':
            aVal = a.last_login ? new Date(a.last_login).getTime() : 0;
            bVal = b.last_login ? new Date(b.last_login).getTime() : 0;
            break;
          case 'name':
            aVal = a.full_name || '';
            bVal = b.full_name || '';
            break;
          default:
            return 0;
        }
        
        const order = filters.sortOrder === 'desc' ? -1 : 1;
        return aVal > bVal ? order : aVal < bVal ? -order : 0;
      });
    }

    // Pagination
    const total = filteredUsers.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    // Format response
    const formattedUsers = paginatedUsers.map((u: any) => ({
      id: u.id,
      phone: u.phone,
      fullName: u.full_name,
      role: u.role,
      status: u.status,
      balance: parseFloat(u.balance),
      totalWinnings: parseFloat(u.total_winnings || '0'),
      totalLosses: parseFloat(u.total_losses || '0'),
      gamesPlayed: u.games_played || 0,
      gamesWon: u.games_won || 0,
      phoneVerified: u.phone_verified,
      lastLogin: u.last_login,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));

    return { success: true, users: formattedUsers, total };
  } catch (error) {
    console.error('Get all users error:', error);
    return { success: false, error: 'Failed to retrieve users' };
  }
};

export const createUserManually = async (
  adminId: string,
  userData: {
    phone: string;
    name: string;
    password?: string;  // Optional custom password
    initialBalance?: number;
    role?: string;
    status?: string;
    referralCode?: string;
  }
): Promise<UserManagementResponse> => {
  try {
    // Validate phone number
    if (!validateMobileNumber(userData.phone)) {
      return { success: false, error: 'Invalid phone number format. Must be a 10-digit Indian mobile number.' };
    }

    // Check if user already exists
    const existingUser = await storage.getUserByPhone(userData.phone);
    if (existingUser) {
      return { success: false, error: 'User with this phone number already exists' };
    }

    // Use provided password or default to phone number
    const passwordToUse = userData.password || userData.phone;
    const hashedPassword = await bcrypt.hash(passwordToUse, 10);

    // Create user
    const newUser = await storage.createUser({
      phone: userData.phone,
      password_hash: hashedPassword,
      full_name: userData.name,
      role: userData.role || 'player',
      status: userData.status || 'active',
      balance: userData.initialBalance !== undefined ? userData.initialBalance : 0, // Default to 0, not 100000
      total_winnings: 0,
      total_losses: 0,
      games_played: 0,
      games_won: 0,
      phone_verified: false,
      referral_code: userData.referralCode || null,
      original_deposit_amount: userData.initialBalance !== undefined ? userData.initialBalance : 0, // Default to 0, not 100000
      deposit_bonus_available: 0,
      referral_bonus_available: 0,
      total_bonus_earned: 0,
      last_login: null
    } as any);

    // Log the creation (we'll implement this when we add the database table)
    console.log(`Admin ${adminId} created user ${newUser.id} with phone ${userData.phone}`);

    return {
      success: true,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        fullName: newUser.full_name,
        role: newUser.role,
        status: newUser.status,
        balance: parseFloat(newUser.balance),
        createdAt: newUser.created_at
      },
      message: `User created successfully. ${userData.password ? 'Custom password set' : `Default password is: ${passwordToUse}`}`
    };
  } catch (error) {
    console.error('Create user manually error:', error);
    return { success: false, error: 'Failed to create user' };
  }
};

export const updateUserStatus = async (
  userId: string, 
  status: 'active' | 'suspended' | 'banned', 
  adminId: string, 
  reason?: string
): Promise<UserManagementResponse> => {
  try {
    const user = await storage.getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Update user status
    const updatedUser = await storage.updateUser(userId, { status });

    console.log(`Admin ${adminId} updated user ${userId} status to ${status}. Reason: ${reason || 'None'}`);

    return {
      success: true,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        fullName: updatedUser.full_name,
        status: updatedUser.status,
        balance: parseFloat(updatedUser.balance)
      },
      message: `User status updated to ${status}`
    };
  } catch (error) {
    console.error('Update user status error:', error);
    return { success: false, error: 'Failed to update user status' };
  }
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
      username: user.phone, // Use phone as username since that's our identifier
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
          username: user.phone, // Use phone as username since that's our identifier
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
  try {
    const referrals = await storage.getUserReferrals(userId);
    
    // Format response
    const formattedReferrals = referrals.map((referral: any) => ({
      id: referral.id,
      referredUserId: referral.referred_user_id,
      referredUser: {
        id: referral.referred_user?.id,
        phone: referral.referred_user?.phone,
        fullName: referral.referred_user?.full_name,
        createdAt: referral.referred_user?.created_at
      },
      depositAmount: parseFloat(referral.deposit_amount || '0'),
      bonusAmount: parseFloat(referral.bonus_amount || '0'),
      bonusApplied: referral.bonus_applied,
      bonusAppliedAt: referral.bonus_applied_at,
      createdAt: referral.created_at
    }));

    return { success: true, users: formattedReferrals };
  } catch (error) {
    console.error('Get referred users error:', error);
    return { success: false, error: 'Failed to retrieve referred users' };
  }
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

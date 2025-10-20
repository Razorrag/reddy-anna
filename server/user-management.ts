// User Management System
import { User, GameHistory } from './data';
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
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate email if provided
    if (updates.email) {
      const sanitizedEmail = sanitizeInput(updates.email).toLowerCase();
      if (!validateEmail(sanitizedEmail)) {
        return { success: false, error: 'Invalid email format' };
      }
      
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: sanitizedEmail, id: { $ne: userId } });
      if (existingUser) {
        return { success: false, error: 'Email is already taken' };
      }
      
      user.email = sanitizedEmail;
    }

    // Validate mobile if provided
    if (updates.mobile) {
      const sanitizedMobile = sanitizeInput(updates.mobile);
      if (!validateMobileNumber(sanitizedMobile)) {
        return { success: false, error: 'Invalid mobile number format' };
      }
      
      // Check if mobile is already taken by another user
      const existingUser = await User.findOne({ mobile: sanitizedMobile, id: { $ne: userId } });
      if (existingUser) {
        return { success: false, error: 'Mobile number is already taken' };
      }
      
      user.mobile = sanitizedMobile;
    }

    // Update user profile fields
    if (updates.name) {
      user.name = sanitizeInput(updates.name);
    }
    
    if (updates.profile) {
      user.profile = { ...user.profile, ...updates.profile };
    }

    user.updatedAt = new Date();
    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    return { success: true, user: userResponse };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error: 'Profile update failed' };
  }
};

export const getUserDetails = async (userId: string): Promise<UserManagementResponse> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

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
  try {
    const query: any = { userId };
    
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }
    
    if (filters.type) query.betSide = filters.type;
    if (filters.result) query.result = filters.result;
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const gameHistory = await GameHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
    
    // Get total count for pagination
    const total = await GameHistory.countDocuments(query);
    
    return { success: true, users: gameHistory, total };
  } catch (error) {
    console.error('Game history error:', error);
    return { success: false, error: 'Game history retrieval failed' };
  }
};

export const getAllUsers = async (filters: UserFilters = {}): Promise<UserManagementResponse> => {
  try {
    const query: any = {};
    
    // Build query based on filters
    if (filters.status) query.status = filters.status;
    
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
        { referralCode: searchRegex }
      ];
    }
    
    if (filters.joinDateFrom || filters.joinDateTo) {
      query.joinDate = {};
      if (filters.joinDateFrom) query.joinDate.$gte = filters.joinDateFrom;
      if (filters.joinDateTo) query.joinDate.$lte = filters.joinDateTo;
    }
    
    if (filters.balanceMin !== undefined || filters.balanceMax !== undefined) {
      query.balance = {};
      if (filters.balanceMin !== undefined) query.balance.$gte = filters.balanceMin;
      if (filters.balanceMax !== undefined) query.balance.$lte = filters.balanceMax;
    }
    
    if (filters.referredBy) query.referredBy = filters.referredBy;
    
    // Set default sort
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const users = await User.find(query)
      .sort(sort)
      .limit(limit)
      .skip(offset);
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Remove passwords from response
    const usersResponse = users.map(user => {
      const userObj = user.toJSON();
      delete userObj.password;
      return userObj;
    });
    
    return { success: true, users: usersResponse, total };
  } catch (error) {
    console.error('Users retrieval error:', error);
    return { success: false, error: 'Users retrieval failed' };
  }
};

export const updateUserStatus = async (
  userId: string, 
  status: 'active' | 'suspended' | 'banned', 
  adminId: string, 
  reason?: string
): Promise<UserManagementResponse> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Don't allow suspending/banning admin users
    if (user.role === 'admin' || user.role === 'superadmin') {
      return { success: false, error: 'Cannot change status of admin users' };
    }

    const previousStatus = user.status;
    user.status = status;
    user.updatedBy = adminId;
    user.updatedAt = new Date();
    
    if (reason) {
      user.statusReason = reason;
    }
    
    // If suspending or banning, log out all sessions
    if (status === 'suspended' || status === 'banned') {
      user.lastLogin = new Date(0); // Force logout
    }

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    return { 
      success: true, 
      user: userResponse,
      message: `User status changed from ${previousStatus} to ${status}`
    };
  } catch (error) {
    console.error('User status update error:', error);
    return { success: false, error: 'User status update failed' };
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
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Calculate new balance
    let newBalance: number;
    if (type === 'add') {
      newBalance = user.balance + amount;
    } else {
      newBalance = Math.max(0, user.balance - amount);
    }

    // Validate new balance
    if (newBalance < 0) {
      return { success: false, error: 'Balance cannot be negative' };
    }

    const previousBalance = user.balance;
    user.balance = newBalance;
    user.updatedBy = adminId;
    user.updatedAt = new Date();

    await user.save();

    // Log balance adjustment (in a real system, this would create a transaction record)
    console.log(`Balance adjustment for user ${userId}: ${type} ${amount}, reason: ${reason}`);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

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
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const gameHistory = await GameHistory.find({ userId });
      const totalGames = gameHistory.length;
      const wins = gameHistory.filter(game => game.result === 'win').length;
      const losses = gameHistory.filter(game => game.result === 'loss').length;
      const totalBetAmount = gameHistory.reduce((sum, game) => sum + game.betAmount, 0);
      const totalPayout = gameHistory.reduce((sum, game) => sum + game.payout, 0);
      const netProfit = totalPayout - totalBetAmount;

      const statistics = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          balance: user.balance,
          status: user.status,
          joinDate: user.joinDate,
          lastLogin: user.lastLogin
        },
        gaming: {
          totalGames,
          wins,
          losses,
          winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
          totalBetAmount,
          totalPayout,
          netProfit
        },
        referrals: {
          referralCode: user.referralCode,
          referredUsers: user.referredUsers.length,
          totalReferrals: user.referredUsers.length
        }
      };

      return { success: true, user: statistics };
    } else {
      // Get overall user statistics
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ status: 'active' });
      const suspendedUsers = await User.countDocuments({ status: 'suspended' });
      const bannedUsers = await User.countDocuments({ status: 'banned' });
      
      const totalBalance = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]);
      
      const newUsersToday = await User.countDocuments({
        joinDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });

      const newUsersThisMonth = await User.countDocuments({
        joinDate: {
          $gte: new Date(new Date().setDate(1))
        }
      });

      const statistics = {
        totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        totalBalance: totalBalance[0]?.total || 0,
        newUsersToday,
        newUsersThisMonth,
        averageBalance: totalUsers > 0 ? (totalBalance[0]?.total || 0) / totalUsers : 0
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
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const referredUsers = await User.find({ 
      referredBy: user.id 
    }).select('-password');

    return { success: true, users: referredUsers };
  } catch (error) {
    console.error('Referred users error:', error);
    return { success: false, error: 'Referred users retrieval failed' };
  }
};

export const bulkUpdateUserStatus = async (
  userIds: string[],
  status: 'active' | 'suspended' | 'banned',
  adminId: string,
  reason?: string
): Promise<UserManagementResponse> => {
  try {
    const result = await User.updateMany(
      { 
        id: { $in: userIds },
        role: { $nin: ['admin', 'superadmin'] } // Exclude admin users
      },
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          updatedBy: adminId,
          ...(reason && { statusReason: reason })
        }
      }
    );

    return { 
      success: true, 
      message: `Updated status for ${result.modifiedCount} users to ${status}`
    };
  } catch (error) {
    console.error('Bulk status update error:', error);
    return { success: false, error: 'Bulk status update failed' };
  }
};

export const exportUserData = async (filters: UserFilters = {}): Promise<UserManagementResponse> => {
  try {
    // Get users with extended filters
    const users = await getAllUsers({ ...filters, limit: 10000 });
    
    if (!users.success || !users.users) {
      return { success: false, error: 'Failed to retrieve users for export' };
    }

    // Transform data for export
    const exportData = users.users.map(user => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      Mobile: user.mobile,
      Balance: user.balance,
      Status: user.status,
      'Join Date': user.joinDate,
      'Last Login': user.lastLogin,
      'Referral Code': user.referralCode,
      'Referred Users Count': user.referredUsers?.length || 0,
      City: user.profile?.city || '',
      State: user.profile?.state || '',
      Country: user.profile?.country || ''
    }));

    return { success: true, users: exportData };
  } catch (error) {
    console.error('User export error:', error);
    return { success: false, error: 'User export failed' };
  }
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

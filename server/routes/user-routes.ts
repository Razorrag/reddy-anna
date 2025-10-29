// User Management Routes Module
import type { Express, Request, Response } from "express";
import {
  generalLimiter,
  apiLimiter,
  securityMiddleware,
  validateAdminAccess,
  auditLogger
} from '../security';
import { requireAuth } from '../auth';
import { storage } from '../storage-supabase';
import { parseBalance } from '../../shared/utils/balanceUtils';

export async function registerUserRoutes(app: Express): Promise<void> {
  // Apply security middleware to user routes
  app.use("/api/user/*", securityMiddleware);
  app.use("/api/admin/users/*", securityMiddleware);

  // Get user profile
  app.get("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Parse balance to number for consistency
      const balance = parseBalance(user.balance);
      
      res.json({
        success: true,
        data: {
          id: user.id,
          phone: user.phone,
          username: user.full_name,
          balance: balance,
          role: user.role,
          referralCode: user.referral_code_generated,
          createdAt: user.created_at,
          lastLogin: user.last_login
        }
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user profile"
      });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { username, phone } = req.body;
      
      // Validate input
      if (!username && !phone) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update provided'
        });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        username,
        phone
      });
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      auditLogger('user_profile_updated', userId, {
        username: updatedUser.full_name,
        phone: updatedUser.phone
      });
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          username: updatedUser.full_name,
          balance: parseBalance(updatedUser.balance),
          role: updatedUser.role
        }
      });
    } catch (error) {
      console.error("Update user profile error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user profile"
      });
    }
  });

  // Change password
  app.patch("/api/user/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }
      
      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long'
        });
      }
      
      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const bcrypt = await import('bcrypt');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }
      
      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password - need to use updateUser with password_hash field
      await storage.updateUser(userId, { password_hash: hashedPassword });
      
      auditLogger('user_password_changed', userId, { timestamp: new Date().toISOString() });
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to change password"
      });
    }
  });

  // Get user balance
  app.get("/api/user/balance", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Balance is already a number from getUser() - no need to parse
      const balance = Number(user.balance) || 0;
      
      res.json({
        success: true,
        balance: balance
      });
    } catch (error) {
      console.error("Get balance error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get balance"
      });
    }
  });

  // Balance notification endpoint for WebSocket updates
  app.post("/api/user/balance-notify", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { userId, balance, transactionType, amount } = req.body;
      
      // Only allow users to notify their own balance updates
      if (userId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      // FIXED: Remove balance updates from WebSocket entirely
      // All balance updates should now come from REST API polling
      console.log(`💰 Balance notification processed via REST API: ${userId} -> ${parseFloat(balance)} (${transactionType})`);
      
      res.json({
        success: true,
        message: 'Balance notification sent successfully'
      });
    } catch (error) {
      console.error('Balance notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Balance notification failed'
      });
    }
  });

  // Get all users (Admin only)
  app.get("/api/admin/users", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 50, search, role } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const filters: any = {};
      if (search) filters.search = search as string;
      if (role) filters.role = role as string;
      
      const users = await storage.getAllUsers();
      
      const totalUsers = users.length; // Simple count since we have all users
      const totalPages = Math.ceil(totalUsers / parseInt(limit as string));
      
      res.json({
        success: true,
        data: users.map(user => ({
          id: user.id,
          phone: user.phone,
          username: user.full_name,
          balance: parseBalance(user.balance),
          role: user.role,
          referralCode: user.referral_code_generated,
          createdAt: user.created_at,
          lastLogin: user.last_login
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalUsers,
          totalPages
        }
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get users"
      });
    }
  });

  // Get user by ID (Admin only)
  app.get("/api/admin/users/:userId", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: user.id,
          phone: user.phone,
          username: user.full_name,
          balance: parseBalance(user.balance),
          role: user.role,
          referralCode: user.referral_code_generated,
          createdAt: user.created_at,
          lastLogin: user.last_login
        }
      });
    } catch (error) {
      console.error("Get user by ID error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user"
      });
    }
  });

  // Update user (Admin only)
  app.patch("/api/admin/users/:userId", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { username, phone, role, balance } = req.body;
      
      // Validate input
      if (!username && !phone && !role && balance === undefined) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update provided'
        });
      }
      
      // Validate role if provided
      if (role && !['player', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be player or admin'
        });
      }
      
      // Validate balance if provided
      let parsedBalance = undefined;
      if (balance !== undefined) {
        parsedBalance = parseBalance(balance);
        if (isNaN(parsedBalance) || parsedBalance < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid balance. Must be a non-negative number'
          });
        }
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        username,
        phone,
        role,
        balance: parsedBalance !== undefined ? parsedBalance.toString() : undefined
      });
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      auditLogger('admin_user_updated', req.user!.id, {
        targetUserId: userId,
        username: updatedUser.full_name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        balance: parseBalance(updatedUser.balance)
      });
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          username: updatedUser.full_name,
          balance: parseBalance(updatedUser.balance),
          role: updatedUser.role
        }
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user"
      });
    }
  });

  // Delete user (Admin only)
  app.delete("/api/admin/users/:userId", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Prevent admin from deleting themselves
      if (userId === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own account'
        });
      }
      
      // Delete user - need to implement this method or use direct Supabase call
      const { error } = await (await import('../lib/supabaseServer')).supabaseServer
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        throw error;
      }
      
      auditLogger('admin_user_deleted', req.user!.id, {
        targetUserId: userId,
        username: user.full_name,
        role: user.role
      });
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete user"
      });
    }
  });

  // Get user statistics (Admin only)
  app.get("/api/admin/user-statistics", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      // Get user statistics manually since method doesn't exist
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      const totalPlayers = users.filter(u => u.role === 'player').length;
      const totalAdmins = users.length - totalPlayers;
      const totalBalance = users.reduce((sum, u) => sum + parseBalance(u.balance), 0);
      const averageBalance = totalUsers > 0 ? totalBalance / totalUsers : 0;
      
      // Get today's new users
      const today = new Date().toISOString().split('T')[0];
      const newUsersToday = users.filter(u =>
        u.created_at && new Date(u.created_at).toISOString().split('T')[0] === today
      ).length;
      
      // Get this week's new users
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newUsersThisWeek = users.filter(u =>
        u.created_at && new Date(u.created_at) >= weekAgo
      ).length;
      
      // Get this month's new users
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const newUsersThisMonth = users.filter(u =>
        u.created_at && new Date(u.created_at) >= monthAgo
      ).length;
      
      const statistics = {
        total_users: totalUsers,
        total_players: totalPlayers,
        total_admins: totalAdmins,
        total_balance: totalBalance.toString(),
        average_balance: averageBalance.toString(),
        new_users_today: newUsersToday,
        new_users_this_week: newUsersThisWeek,
        new_users_this_month: newUsersThisMonth
      };
      
      res.json({
        success: true,
        data: {
          totalUsers: statistics.total_users,
          totalPlayers: statistics.total_players,
          totalAdmins: statistics.total_admins,
          totalBalance: parseBalance(statistics.total_balance),
          averageBalance: parseBalance(statistics.average_balance),
          newUsersToday: statistics.new_users_today,
          newUsersThisWeek: statistics.new_users_this_week,
          newUsersThisMonth: statistics.new_users_this_month
        }
      });
    } catch (error) {
      console.error("Get user statistics error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user statistics"
      });
    }
  });

  // Get user activity logs (Admin only)
  app.get("/api/admin/users/:userId/activity", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Get user activity logs manually since method doesn't exist
      const activityLogs = []; // Placeholder - would need to implement activity logging
      
      const totalLogs = activityLogs.length;
      const totalPages = Math.ceil(totalLogs / parseInt(limit as string));
      
      res.json({
        success: true,
        data: activityLogs,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalLogs,
          totalPages
        }
      });
    } catch (error) {
      console.error("Get user activity logs error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user activity logs"
      });
    }
  });

  // Generate referral code
  app.post("/api/user/generate-referral", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Check if user already has a referral code
      const user = await storage.getUser(userId);
      if (user && user.referral_code_generated) {
        return res.json({
          success: true,
          message: 'Referral code already exists',
          data: {
            referralCode: user.referral_code_generated
          }
        });
      }
      
      // Generate new referral code
      // Generate referral code manually since method doesn't exist
      const { data, error } = await (await import('../lib/supabaseServer')).supabaseServer
        .rpc('generate_referral_code', {
          p_user_id: userId
        });
      
      if (error) {
        throw error;
      }
      
      const referralCode = data;
      
      auditLogger('referral_code_generated', userId, { 
        referralCode,
        timestamp: new Date().toISOString() 
      });
      
      res.json({
        success: true,
        message: 'Referral code generated successfully',
        data: {
          referralCode
        }
      });
    } catch (error) {
      console.error("Generate referral code error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate referral code"
      });
    }
  });

  // Get user's referred users
  app.get("/api/user/referred-users", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      const referredUsers = await storage.getUserReferrals(userId);
      
      res.json({
        success: true,
        data: referredUsers.map(referral => ({
          id: referral.referredUserId,
          phone: '', // Would need to fetch user details separately
          fullName: '', // Would need to fetch user details separately
          depositAmount: parseFloat(referral.depositAmount || '0') || 0,
          bonusAmount: parseFloat(referral.bonusAmount || '0') || 0,
          bonusApplied: referral.bonusApplied,
          createdAt: referral.createdAt
        }))
      });
    } catch (error) {
      console.error("Get referred users error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get referred users"
      });
    }
  });
// Update User Balance (Admin Only)
app.patch("/api/admin/users/:userId/balance", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, type, reason } = req.body;
    
    // Validate input
    if (!['add', 'subtract'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid balance update type. Must be "add" or "subtract"'
      });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid positive amount required'
      });
    }
    
    // Get current user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update balance
    const updateAmount = type === 'add' ? amount : -amount;
    const updatedUser = await storage.updateUserBalance(userId, updateAmount);
    
    auditLogger('admin_balance_updated', req.user!.id, {
      targetUserId: userId,
      amount: updateAmount,
      reason: reason || 'Admin balance adjustment',
      balanceBefore: parseFloat(user.balance),
      balanceAfter: parseFloat(updatedUser.balance)
    });
    
    res.json({
      success: true,
      message: `Balance ${type === 'add' ? 'added' : 'subtracted'} successfully`,
      data: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        fullName: updatedUser.full_name,
        balance: parseBalance(updatedUser.balance),
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Admin balance update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user balance'
    });
  }
});

// Create User (Admin Only)
app.post("/api/admin/users/create", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, name, initialBalance = 0, role = 'player', status = 'active' } = req.body;
    
    // Validate input
    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        error: 'Phone and name are required'
      });
    }
    
    // Validate phone format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Indian mobile number format'
      });
    }
    
    // Check if user already exists
    const existingUser = await storage.getUserByPhone(phone);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this phone number'
      });
    }
    
    // Create user with default password (phone number)
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(phone, 12);
    
    const newUser = await storage.createUser({
      phone,
      password_hash: hashedPassword,
      full_name: name,
      role,
      status,
      balance: initialBalance.toString(),
      total_winnings: "0",
      total_losses: "0",
      games_played: 0,
      games_won: 0,
      phone_verified: false,
      original_deposit_amount: initialBalance.toString(),
      deposit_bonus_available: "0",
      referral_bonus_available: "0",
      total_bonus_earned: "0",
      last_login: null
    });
    
    auditLogger('admin_user_created', req.user!.id, {
      newUserId: newUser.id,
      phone: newUser.phone,
      name: newUser.full_name,
      initialBalance,
      role
    });
    
    res.json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        phone: newUser.phone,
        fullName: newUser.full_name,
        role: newUser.role,
        status: newUser.status,
        balance: parseBalance(newUser.balance)
      }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// Get User Referrals (Admin Only)
app.get("/api/admin/users/:userId/referrals", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Get user to verify they exist
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get user referrals
    const referredUsers = await storage.getUserReferrals(userId);
    
    res.json({
      success: true,
      users: referredUsers.map(referral => ({
        id: referral.referredUserId,
        phone: '', // Would need to fetch user details separately
        fullName: '', // Would need to fetch user details separately
        depositAmount: parseFloat(referral.depositAmount || '0') || 0,
        bonusAmount: parseFloat(referral.bonusAmount || '0') || 0,
        bonusApplied: referral.bonusApplied,
        createdAt: referral.createdAt
      }))
    });
  } catch (error) {
    console.error('Admin get user referrals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user referrals'
    });
  }
});

// Bulk Update User Status (Admin Only)
app.post("/api/admin/users/bulk-status", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
  try {
    const { userIds, status, reason } = req.body;
    
    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid array of user IDs required'
      });
    }
    
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "active", "suspended", or "banned"'
      });
    }
    
    // Validate all users exist and collect audit data
    const auditData = [];
    for (const userId of userIds) {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: `User with ID ${userId} not found`
        });
      }
      auditData.push({
        userId,
        statusBefore: user.status,
        statusAfter: status
      });
    }
    
    // Update all users
    const updatedUsers = [];
    for (const userId of userIds) {
      const updatedUser = await storage.updateUser(userId, { status });
      updatedUsers.push({
        id: updatedUser.id,
        phone: updatedUser.phone,
        fullName: updatedUser.full_name,
        status: updatedUser.status,
        balance: parseBalance(updatedUser.balance)
      });
    }
    
    // Log audit for each user update
    auditData.forEach(data => {
      auditLogger('admin_user_status_updated', req.user!.id, {
        targetUserId: data.userId,
        statusBefore: data.statusBefore,
        statusAfter: data.statusAfter,
        reason: reason || 'Bulk status update'
      });
    });
    
    res.json({
      success: true,
      message: `${userIds.length} users updated successfully`,
      data: updatedUsers
    });
  } catch (error) {
    console.error('Admin bulk status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update user status'
    });
  }
});

// Export User Data (Admin Only)
app.get("/api/admin/users/export", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
  try {
    const { search, role, status } = req.query;
    
    // Get all users
    const users = await storage.getAllUsers();
    
    // Apply filters if provided
    let filteredUsers = users;
    if (search) {
      const searchStr = (search as string).toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.phone.toLowerCase().includes(searchStr) ||
        user.full_name.toLowerCase().includes(searchStr)
      );
    }
    
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }
    
    if (status) {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }
    
    // Prepare export data
    const exportData = filteredUsers.map(user => ({
      ID: user.id,
      Phone: user.phone,
      Name: user.full_name,
      Role: user.role,
      Status: user.status,
      Balance: parseBalance(user.balance),
      TotalWinnings: parseBalance(user.total_winnings),
      TotalLosses: parseBalance(user.total_losses),
      GamesPlayed: user.games_played,
      GamesWon: user.games_won,
      PhoneVerified: user.phone_verified,
      CreatedAt: user.created_at,
      LastLogin: user.last_login
    }));
    
    auditLogger('admin_user_data_exported', req.user!.id, {
      totalUsers: filteredUsers.length,
      filters: { search, role, status }
    });
    
    res.json({
      success: true,
      data: exportData,
      total: filteredUsers.length
    });
  } catch (error) {
    console.error('Admin user export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export user data'
    });
  }
});

// Get Admin Statistics (Admin Only)
app.get("/api/admin/statistics", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (userId) {
      // Get specific user statistics
      const user = await storage.getUser(userId as string);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
        
      const userStats = {
        id: user.id,
        phone: user.phone,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        balance: parseBalance(user.balance),
        totalWinnings: parseBalance(user.total_winnings),
        totalLosses: parseBalance(user.total_losses),
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        winRate: user.games_played > 0 ? (user.games_won / user.games_played) * 100 : 0,
        createdAt: user.created_at,
        lastLogin: user.last_login
      };
      
      res.json({
        success: true,
        user: userStats
      });
    } else {
      // Get overall admin statistics
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      const totalPlayers = users.filter(u => u.role === 'player').length;
      const totalAdmins = users.length - totalPlayers;
      const totalBalance = users.reduce((sum, u) => sum + parseBalance(u.balance), 0);
      const averageBalance = totalUsers > 0 ? totalBalance / totalUsers : 0;
      
      // Get today's new users
      const today = new Date().toISOString().split('T')[0];
      const newUsersToday = users.filter(u =>
        u.created_at && new Date(u.created_at).toISOString().split('T')[0] === today
      ).length;
      
      // Get this week's new users
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newUsersThisWeek = users.filter(u =>
        u.created_at && new Date(u.created_at) >= weekAgo
      ).length;
      
      // Get this month's new users
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const newUsersThisMonth = users.filter(u =>
        u.created_at && new Date(u.created_at) >= monthAgo
      ).length;
      
      const statistics = {
        totalUsers,
        totalPlayers,
        totalAdmins,
        totalBalance,
        averageBalance,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth
      };
      
      res.json({
        success: true,
        statistics
      });
    }
  } catch (error) {
    console.error('Admin statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

}
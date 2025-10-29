// Admin Routes Module
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

export async function registerAdminRoutes(app: Express): Promise<void> {
  // Apply security middleware to admin routes
  app.use("/api/admin/*", securityMiddleware);

  // Admin Dashboard Overview
  app.get("/api/admin/dashboard", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const adminId = req.user!.id;
      
      // Get admin details and permissions
      const admin = await storage.getAdminByUsername(req.user!.username || '');
      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      // Get system overview data
      const systemStats = await storage.getTodayStats();
      const recentActivity = await storage.getPaymentRequestsByUser(adminId);
      const pendingRequests = await storage.getPendingPaymentRequests();

      res.json({
        success: true,
        data: {
          admin: {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            permissions: admin.permissions
          },
          systemStats,
          recentActivity,
          pendingRequests
        }
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard'
      });
    }
  });

  // User Management Routes
  app.get("/api/admin/users", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { limit = 50, offset = 0, search = '', status = 'all' } = req.query;
      
      const allUsers = await storage.getAllUsers();
      const filteredUsers = allUsers.filter(user => {
        if (search && !user.phone?.includes(search as string)) return false;
        if (status !== 'all' && user.status !== status) return false;
        return true;
      });
      const paginatedUsers = filteredUsers.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );
      
      const users = {
        users: paginatedUsers,
        total: filteredUsers.length,
        hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredUsers.length
      };

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('User management error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load users'
      });
    }
  });

  // Update User Status
  app.patch("/api/admin/users/:userId/status", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!['active', 'suspended', 'banned'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        status,
        previousStatus: user.status
      });
      
      auditLogger('user_status_updated', req.user!.id, {
        targetUserId: userId,
        oldStatus: user.status,
        newStatus: status
      });

      res.json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }
  });

  // Game Management Routes
  app.get("/api/admin/games", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { limit = 50, offset = 0, status = 'all' } = req.query;
      
      const allGames = await storage.getGameHistory(parseInt(limit as string));
      const filteredGames = allGames.filter(game => {
        if (status !== 'all') return false; // Game history doesn't have status field
        return true;
      });
      const paginatedGames = filteredGames.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );
      
      const games = {
        games: paginatedGames,
        total: filteredGames.length,
        hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredGames.length
      };

      res.json({
        success: true,
        data: games
      });
    } catch (error) {
      console.error('Game management error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load games'
      });
    }
  });

  // Force Game Reset
  app.post("/api/admin/games/reset", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { gameId } = req.body;
      
      if (!gameId) {
        return res.status(400).json({
          success: false,
          error: 'Game ID required'
        });
      }

      const game = await storage.getGameSession(gameId);
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }
      
      // Reset game by updating its status
      await storage.updateGameSession(gameId, {
        status: 'idle',
        phase: 'idle',
        winner: null
      });
      
      const result = { gameId, status: 'reset' };
      
      auditLogger('game_reset', req.user!.id, {
        gameId,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Game reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset game'
      });
    }
  });

  // Payment Request Management
  app.get("/api/admin/payment-requests", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { limit = 50, offset = 0, status = 'pending' } = req.query;
      
      const allPaymentRequests = await storage.getPaymentRequestsByUser('');
      const filteredRequests = allPaymentRequests.filter(request => {
        if (status !== 'all' && request.status !== status) return false;
        return true;
      });
      const paginatedRequests = filteredRequests.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );
      
      const paymentRequests = {
        requests: paginatedRequests,
        total: filteredRequests.length,
        hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredRequests.length
      };

      res.json({
        success: true,
        data: paymentRequests
      });
    } catch (error) {
      console.error('Payment requests error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load payment requests'
      });
    }
  });

  // Update Payment Request Status
  app.patch("/api/admin/payment-requests/:requestId/status", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { status, adminNote } = req.body;

      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      await storage.updatePaymentRequest(requestId, status, req.user!.id);
      
      const result = { requestId, status, adminNote };
      
      auditLogger('payment_request_updated', req.user!.id, {
        requestId,
        status,
        adminNote
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Update payment request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update payment request'
      });
    }
  });

  // Bonus Management
  app.get("/api/admin/bonuses", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { limit = 50, offset = 0, status = 'active' } = req.query;
      
      const bonusAnalytics = await storage.getBonusAnalytics('monthly');
      
      const bonuses = {
        analytics: bonusAnalytics,
        total: bonusAnalytics.totalBonusGiven,
        hasMore: false
      };

      res.json({
        success: true,
        data: bonuses
      });
    } catch (error) {
      console.error('Bonus management error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load bonuses'
      });
    }
  });

  // Create Bonus
  app.post("/api/admin/bonuses", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { type, amount, conditions, expiryDate, maxUses } = req.body;

      // For now, just return a mock bonus creation
      // In a real implementation, you'd create bonus records
      const bonus = {
        id: `bonus_${Date.now()}`,
        type,
        amount,
        conditions,
        expiryDate,
        maxUses,
        createdAt: new Date().toISOString()
      };
      
      auditLogger('bonus_created', req.user!.id, {
        bonusId: bonus.id,
        type,
        amount
      });

      res.json({
        success: true,
        data: bonus
      });
    } catch (error) {
      console.error('Create bonus error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create bonus'
      });
    }
  });

  // Referral Management
  app.get("/api/admin/referrals", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const allReferrals = await storage.getUserReferrals(req.user!.id);
      
      const referrals = {
        referrals: allReferrals,
        total: allReferrals.length,
        hasMore: false
      };

      res.json({
        success: true,
        data: referrals
      });
    } catch (error) {
      console.error('Referral management error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load referrals'
      });
    }
  });

  // Stream Management
  app.get("/api/admin/stream-config", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const streamConfig = await storage.getStreamConfig();
      
      res.json({
        success: true,
        data: streamConfig
      });
    } catch (error) {
      console.error('Stream config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load stream config'
      });
    }
  });

  // Update Stream Configuration
  app.patch("/api/admin/stream-config", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const config = req.body;
      
      // Update each config setting individually
      for (const [key, value] of Object.entries(config)) {
        await storage.updateStreamSetting(key, String(value));
      }
      
      const updatedConfig = await storage.getStreamConfig();
      
      auditLogger('stream_config_updated', req.user!.id, {
        config: Object.keys(config)
      });

      res.json({
        success: true,
        data: updatedConfig
      });
    } catch (error) {
      console.error('Update stream config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update stream config'
      });
    }
  });

  // Admin Activity Log
  app.get("/api/admin/activity-log", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      
      const paymentRequests = await storage.getPaymentRequestsByUser(req.user!.id);
      const bonusAnalytics = await storage.getBonusAnalytics('monthly');
      
      const activityLog = {
        paymentRequests,
        bonusAnalytics,
        total: paymentRequests.length + 1, // +1 for bonus analytics
        hasMore: false
      };

      res.json({
        success: true,
        data: activityLog
      });
    } catch (error) {
      console.error('Activity log error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load activity log'
      });
    }
  });

  // System Health Check
  app.get("/api/admin/health", requireAuth, validateAdminAccess, apiLimiter, async (req: Request, res: Response) => {
    try {
      const todayStats = await storage.getTodayStats();
      const pendingRequests = await storage.getPendingPaymentRequests();
      
      const healthStatus = {
        database: 'connected',
        storage: 'healthy',
        games: todayStats ? 'active' : 'inactive',
        payments: pendingRequests.length > 0 ? 'pending' : 'clear',
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check system health'
      });
    }
  });
}
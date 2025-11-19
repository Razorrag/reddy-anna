import { Request, Response } from 'express';
import { storage } from '../storage-supabase';
import { transformRealtimeStats } from '../utils/data-transformers';

/**
 * GET /api/admin/statistics
 * Returns high-level statistics for admin dashboard
 */
export const getAdminStatistics = async (req: Request, res: Response) => {
  try {
    // Get total users count
    const totalUsers = await storage.getTotalUsersCount();
    const activeUsers = await storage.getActiveUsersCount();

    // Get all-time totals from daily statistics
    const allTimeStats = await storage.getAllTimeStatistics();

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalBetsAllTime: allTimeStats.totalBets,
        totalPayoutsAllTime: allTimeStats.totalPayouts,
        netHouseProfitAllTime: allTimeStats.totalRevenue,
        profitLossPercentage: allTimeStats.profitLossPercentage
      }
    });
  } catch (error: any) {
    console.error('Get admin statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
};

/**
 * GET /api/admin/analytics?period=daily|monthly|yearly
 * Returns analytics for specified period
 */
export const getAdminAnalytics = async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'daily';

    let stats;
    switch (period) {
      case 'daily':
        stats = await storage.getDailyStatistics();
        break;
      case 'monthly':
        stats = await storage.getMonthlyStatistics();
        break;
      case 'yearly':
        stats = await storage.getYearlyStatistics();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid period. Must be daily, monthly, or yearly'
        });
    }

    res.json({
      success: true,
      data: {
        totalGames: stats.totalGames,
        totalBets: stats.totalBets,
        totalPayouts: stats.totalPayouts,
        profitLoss: stats.profitLoss,
        profitLossPercentage: stats.profitLossPercentage,
        totalRevenue: stats.totalRevenue,
        uniquePlayers: stats.uniquePlayers
      }
    });
  } catch (error: any) {
    console.error('Get admin analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics'
    });
  }
};

/**
 * GET /api/admin/analytics/all-time
 * Returns all-time analytics
 */
export const getAdminAllTimeAnalytics = async (req: Request, res: Response) => {
  try {
    const stats = await storage.getAllTimeStatistics();

    res.json({
      success: true,
      data: {
        totalGames: stats.totalGames,
        totalBets: stats.totalBets,
        totalPayouts: stats.totalPayouts,
        profitLoss: stats.profitLoss,
        profitLossPercentage: stats.profitLossPercentage,
        totalRevenue: stats.totalRevenue,
        uniquePlayers: stats.uniquePlayers
      }
    });
  } catch (error: any) {
    console.error('Get admin all-time analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve all-time analytics'
    });
  }
};

/**
 * GET /api/admin/realtime-stats
 * Returns real-time game statistics
 */
export const getAdminRealtimeStats = async (req: Request, res: Response) => {
  try {
    const stats = await storage.getRealtimeGameStats();
    const transformed = transformRealtimeStats(stats);

    res.json({
      success: true,
      data: transformed
    });
  } catch (error: any) {
    console.error('Get admin realtime stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve realtime statistics',
      data: {
        currentGame: null,
        connected: false
      }
    });
  }
};

/**
 * GET /api/admin/bonus-transactions?status=...&type=...
 * Returns all bonus transactions with user details (with backend filtering)
 */
export const getAdminBonusTransactions = async (req: Request, res: Response) => {
  try {
    // ✅ FIX: Apply filters from query parameters
    const { status, type, limit = 100, offset = 0 } = req.query;
    
    const filters: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };
    
    if (status && status !== 'all') filters.status = status as string;
    if (type && type !== 'all') filters.type = type as string;
    
    const transactions = await storage.getAllBonusTransactions(filters);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Get admin bonus transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bonus transactions'
    });
  }
};

/**
 * GET /api/admin/referral-data?status=...
 * Returns referral data with user details (with backend filtering)
 */
export const getAdminReferralData = async (req: Request, res: Response) => {
  try {
    // ✅ FIX: Apply filters from query parameters
    const { status, limit = 100, offset = 0 } = req.query;
    
    const filters: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };
    
    if (status && status !== 'all') filters.status = status as string;
    
    const referrals = await storage.getAllReferralData(filters);

    res.json({
      success: true,
      data: referrals
    });
  } catch (error: any) {
    console.error('Get admin referral data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve referral data'
    });
  }
};

/**
 * GET /api/admin/player-bonus-analytics
 * Returns per-player bonus analytics
 */
export const getAdminPlayerBonusAnalytics = async (req: Request, res: Response) => {
  try {
    const analytics = await storage.getPlayerBonusAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    console.error('Get admin player bonus analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve player bonus analytics'
    });
  }
};

/**
 * GET /api/admin/bonus-settings
 * Returns bonus settings
 */
export const getAdminBonusSettings = async (req: Request, res: Response) => {
  try {
    const settings = await storage.getBonusSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    console.error('Get admin bonus settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bonus settings'
    });
  }
};

/**
 * PUT /api/admin/bonus-settings
 * Updates bonus settings
 */
export const updateAdminBonusSettings = async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    
    await storage.updateBonusSettings(settings);

    res.json({
      success: true,
      message: 'Bonus settings updated successfully'
    });
  } catch (error: any) {
    console.error('Update admin bonus settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bonus settings'
    });
  }
};

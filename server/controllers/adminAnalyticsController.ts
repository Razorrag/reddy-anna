import { Request, Response } from 'express';
import { storage } from '../storage-supabase';

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
        netHouseProfitAllTime: allTimeStats.netHouseProfit
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
        netHouseProfit: stats.netHouseProfit,
        totalPlayerWinnings: stats.totalPlayerWinnings,
        totalPlayerLosses: stats.totalPlayerLosses
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
        netHouseProfit: stats.netHouseProfit
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
 * GET /api/admin/bonus-transactions
 * Returns all bonus transactions with user details
 */
export const getAdminBonusTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await storage.getAllBonusTransactions();

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
 * GET /api/admin/referral-data
 * Returns referral data with user details
 */
export const getAdminReferralData = async (req: Request, res: Response) => {
  try {
    const referrals = await storage.getAllReferralData();

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

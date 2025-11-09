import { Request, Response } from 'express';
import { storage } from '../storage-supabase';

/**
 * GET /api/user/game-history
 * Returns user's game history with correct calculations
 */
export const getUserGameHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await storage.getUserGameHistory(req.user.id);
    
    // Apply pagination
    const paginatedHistory = history.slice(offset, offset + limit);
    const hasMore = history.length > offset + limit;

    res.json({
      success: true,
      data: paginatedHistory,
      pagination: {
        limit,
        offset,
        hasMore
      }
    });
  } catch (error: any) {
    console.error('Get user game history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve game history'
    });
  }
};

/**
 * GET /api/user/analytics
 * Returns user's net profit/loss and summary statistics
 */
export const getUserAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get transaction totals
    const transactionData = await storage.getUserTransactions(req.user.id, { limit: 1000 });
    
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    
    transactionData.transactions.forEach((tx: any) => {
      if (tx.transaction_type === 'deposit') {
        totalDeposits += parseFloat(tx.amount || '0');
      } else if (tx.transaction_type === 'withdrawal') {
        totalWithdrawals += parseFloat(tx.amount || '0');
      }
    });

    // Get user stats from users table
    const totalWinnings = parseFloat(String(user.total_winnings || '0'));
    const totalLosses = parseFloat(String(user.total_losses || '0'));
    const gamesPlayed = parseInt(String(user.games_played || '0'), 10);
    const gamesWon = parseInt(String(user.games_won || '0'), 10);
    
    const netProfit = totalWinnings - totalLosses;

    res.json({
      success: true,
      data: {
        totalDeposits,
        totalWithdrawals,
        totalWins: totalWinnings,
        totalLosses,
        netProfit,
        gamesPlayed,
        gamesWon
      }
    });
  } catch (error: any) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user analytics'
    });
  }
};

/**
 * GET /api/user/bonus-summary
 * Returns user's bonus summary
 */
export const getUserBonusSummary = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const depositBonusAvailable = parseFloat(user.deposit_bonus_available || '0');
    const referralBonusAvailable = parseFloat(user.referral_bonus_available || '0');
    const totalBonusEarned = parseFloat(user.total_bonus_earned || '0');

    // Get bonus breakdowns from bonus tables
    const depositBonuses = await storage.getDepositBonuses(req.user.id);
    const referralBonuses = await storage.getReferralBonuses(req.user.id);

    let depositLocked = 0;
    let depositCredited = 0;
    let referralLocked = 0;
    let referralCredited = 0;

    depositBonuses.forEach((bonus: any) => {
      const amount = parseFloat(bonus.bonus_amount || '0');
      if (bonus.status === 'locked' || bonus.status === 'unlocked') {
        depositLocked += amount;
      } else if (bonus.status === 'credited') {
        depositCredited += amount;
      }
    });

    referralBonuses.forEach((bonus: any) => {
      const amount = parseFloat(bonus.bonus_amount || '0');
      if (bonus.status === 'pending') {
        referralLocked += amount;
      } else if (bonus.status === 'credited') {
        referralCredited += amount;
      }
    });

    res.json({
      success: true,
      data: {
        totals: {
          available: depositBonusAvailable + referralBonusAvailable,
          credited: depositCredited + referralCredited,
          lifetime: totalBonusEarned
        },
        depositBonuses: {
          locked: depositLocked,
          credited: depositCredited
        },
        referralBonuses: {
          locked: referralLocked,
          credited: referralCredited
        }
      }
    });
  } catch (error: any) {
    console.error('Get user bonus summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bonus summary'
    });
  }
};

/**
 * GET /api/user/deposit-bonuses
 * Returns user's deposit bonuses
 */
export const getUserDepositBonuses = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const bonuses = await storage.getDepositBonuses(req.user.id);
    
    const formattedBonuses = bonuses.map((bonus: any) => ({
      id: bonus.id,
      depositAmount: parseFloat(bonus.deposit_amount || '0'),
      bonusAmount: parseFloat(bonus.bonus_amount || '0'),
      bonusPercentage: parseFloat(bonus.bonus_percentage || '0'),
      wageringRequired: parseFloat(bonus.wagering_required || '0'),
      wageringCompleted: parseFloat(bonus.wagering_completed || '0'),
      status: bonus.status,
      createdAt: bonus.created_at,
      unlockedAt: bonus.unlocked_at,
      creditedAt: bonus.credited_at
    }));

    res.json({
      success: true,
      data: formattedBonuses
    });
  } catch (error: any) {
    console.error('Get user deposit bonuses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve deposit bonuses'
    });
  }
};

/**
 * GET /api/user/referral-bonuses
 * Returns user's referral bonuses
 */
export const getUserReferralBonuses = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const bonuses = await storage.getReferralBonuses(req.user.id);
    
    const formattedBonuses = bonuses.map((bonus: any) => ({
      id: bonus.id,
      depositAmount: parseFloat(bonus.deposit_amount || '0'),
      bonusAmount: parseFloat(bonus.bonus_amount || '0'),
      status: bonus.status,
      createdAt: bonus.created_at,
      creditedAt: bonus.credited_at
    }));

    res.json({
      success: true,
      data: formattedBonuses
    });
  } catch (error: any) {
    console.error('Get user referral bonuses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve referral bonuses'
    });
  }
};

/**
 * GET /api/user/bonus-transactions
 * Returns user's bonus transaction history
 */
export const getUserBonusTransactions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const transactions = await storage.getBonusTransactions(req.user.id, { limit, offset });
    const hasMore = transactions.length === limit;

    res.json({
      success: true,
      data: transactions,
      hasMore
    });
  } catch (error: any) {
    console.error('Get user bonus transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bonus transactions'
    });
  }
};

/**
 * POST /api/user/claim-bonus
 * Claims available bonus and adds to main balance
 */
export const claimUserBonus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await (storage as any).claimBonus(req.user.id);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to claim bonus'
      });
    }

    res.json({
      success: true,
      data: {
        claimedAmount: result.claimedAmount,
        newBalance: result.newBalance
      }
    });
  } catch (error: any) {
    console.error('Claim user bonus error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim bonus'
    });
  }
};

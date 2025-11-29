// 🤝 PARTNER API ROUTES
// Completely separate from player routes
import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabaseServer';
import {
  registerPartner,
  loginPartner,
  requirePartnerAuth,
  refreshPartnerToken,
  getPartnerProfile,
} from '../partner-auth';
import {
  getPartnerWallet,
  getDashboardStats,
  getWalletTransactions,
  getEarningsHistory,
  requestWithdrawal,
  getWithdrawalRequests,
  cancelWithdrawalRequest,
} from '../controllers/partnerWalletController';

const router = Router();

// =====================================================
// PARTNER AUTHENTICATION ROUTES
// =====================================================

// POST /api/partner/auth/register
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, password, confirmPassword, email, whatsappNumber } = req.body;
    
    const result = await registerPartner({
      name,
      phone,
      password,
      confirmPassword,
      email,
      whatsappNumber,
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // If pending approval, return 202 Accepted
    if (result.partner?.status === 'pending') {
      return res.status(202).json({
        success: true,
        message: 'Partner registration submitted. Awaiting admin approval.',
        partner: result.partner,
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Partner account created successfully',
      partner: result.partner,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    console.error('Partner registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
    });
  }
});

// POST /api/partner/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and password are required',
      });
    }
    
    const result = await loginPartner({ phone, password });
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      partner: result.partner,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    console.error('Partner login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
    });
  }
});

// POST /api/partner/auth/refresh
router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }
    
    const result = await refreshPartnerToken(refreshToken);
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    return res.status(200).json({
      success: true,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    console.error('Partner token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

// =====================================================
// PARTNER PROFILE ROUTES (Protected)
// =====================================================

// GET /api/partner/profile
router.get('/profile', requirePartnerAuth, async (req: Request, res: Response) => {
  try {
    const partner = await getPartnerProfile(req.partner!.id);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error: any) {
    console.error('Get partner profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get profile',
    });
  }
});

// =====================================================
// PARTNER GAME HISTORY (Protected)
// =====================================================

// GET /api/partner/game-history
// Shows the SAME game history as admin - no modifications
router.get('/game-history', requirePartnerAuth, async (req: Request, res: Response) => {
  try {
    const partnerId = req.partner!.id;
    const { page = '1', limit = '20', dateFrom, dateTo, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    
    // Get partner's share percentage
    const { data: partnerData } = await supabaseServer
      .from('partners')
      .select('share_percentage')
      .eq('id', partnerId)
      .single();
    
    const sharePercentage = partnerData?.share_percentage || 50;
    const shareMultiplier = sharePercentage / 100;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    // Query game_statistics table (same as admin)
    let query = supabaseServer
      .from('game_statistics')
      .select('*', { count: 'exact' });
    
    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom as string);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo as string);
    }
    
    // Apply sorting
    const validSortColumns = ['created_at', 'total_bets', 'house_earnings', 'profit_loss'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy as string : 'created_at';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limitNum - 1);
    
    const { data: games, error, count } = await query;
    
    if (error) {
      console.error('Game history query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch game history',
      });
    }
    
    // Also get game session info for opening/winning cards
    const gameIds = games?.map(g => g.game_id) || [];
    const { data: sessions } = await supabaseServer
      .from('game_sessions')
      .select('game_id, opening_card, winner, winning_card')
      .in('game_id', gameIds);
    
    const sessionMap = new Map(sessions?.map(s => [s.game_id, s]) || []);
    
    // Transform data and apply share percentage to financial values
    const gameHistory = games?.map(game => {
      const session = sessionMap.get(game.game_id);
      
      // Apply share percentage to all financial values (hidden from partner)
      const totalBets = parseFloat(game.total_bets || '0') * shareMultiplier;
      const totalWinnings = parseFloat(game.total_winnings || '0') * shareMultiplier;
      const houseEarnings = parseFloat(game.house_earnings || '0') * shareMultiplier;
      const andarTotalBet = parseFloat(game.andar_total_bet || '0') * shareMultiplier;
      const baharTotalBet = parseFloat(game.bahar_total_bet || '0') * shareMultiplier;
      const profitLoss = parseFloat(game.profit_loss || game.house_earnings || '0') * shareMultiplier;
      const housePayout = parseFloat(game.house_payout || game.total_winnings || '0') * shareMultiplier;
      
      return {
        id: game.id,
        gameId: game.game_id,
        createdAt: game.created_at,
        // Cards unchanged - partners see actual game flow
        openingCard: session?.opening_card || null,
        winner: session?.winner || null,
        winningCard: session?.winning_card || null,
        // Counts unchanged
        totalPlayers: game.total_players || 0,
        andarBetsCount: game.andar_bets_count || 0,
        baharBetsCount: game.bahar_bets_count || 0,
        // Financial values multiplied by share percentage (partner doesn't know the percentage)
        totalBets: Math.round(totalBets * 100) / 100,
        totalWinnings: Math.round(totalWinnings * 100) / 100,
        houseEarnings: Math.round(houseEarnings * 100) / 100,
        andarTotalBet: Math.round(andarTotalBet * 100) / 100,
        baharTotalBet: Math.round(baharTotalBet * 100) / 100,
        profitLoss: Math.round(profitLoss * 100) / 100,
        housePayout: Math.round(housePayout * 100) / 100,
      };
    }) || [];
    
    return res.status(200).json({
      success: true,
      data: {
        games: gameHistory,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Get partner game history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get game history',
    });
  }
});

// =====================================================
// PARTNER WALLET ROUTES (Protected)
// =====================================================

// GET /api/partner/wallet - Get wallet balance and info
router.get('/wallet', requirePartnerAuth, getPartnerWallet);

// GET /api/partner/wallet/stats - Get comprehensive dashboard stats
router.get('/wallet/stats', requirePartnerAuth, getDashboardStats);

// GET /api/partner/wallet/transactions - Get wallet transaction history
router.get('/wallet/transactions', requirePartnerAuth, getWalletTransactions);

// GET /api/partner/wallet/earnings - Get earnings history (per game)
router.get('/wallet/earnings', requirePartnerAuth, getEarningsHistory);

// POST /api/partner/wallet/withdraw - Request withdrawal
router.post('/wallet/withdraw', requirePartnerAuth, requestWithdrawal);

// GET /api/partner/wallet/withdrawals - Get withdrawal requests
router.get('/wallet/withdrawals', requirePartnerAuth, getWithdrawalRequests);

// DELETE /api/partner/wallet/withdrawals/:requestId - Cancel withdrawal request
router.delete('/wallet/withdrawals/:requestId', requirePartnerAuth, cancelWithdrawalRequest);

export default router;

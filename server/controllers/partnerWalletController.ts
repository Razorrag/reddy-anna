// =====================================================
// PARTNER WALLET CONTROLLER
// =====================================================
// Handles all partner wallet operations including:
// - Wallet balance and stats
// - Transaction history
// - Earnings history
// - Withdrawal requests
// =====================================================

import { Request, Response } from 'express';
import { supabaseServer } from '../lib/supabaseServer';

// =====================================================
// GET WALLET BALANCE & STATS
// =====================================================

export async function getPartnerWallet(req: Request, res: Response) {
  try {
    const partnerId = req.partner!.id;
    
    // Get wallet info from partners table
    const { data: partner, error } = await supabaseServer
      .from('partners')
      .select('wallet_balance, total_earned, total_withdrawn, min_withdrawal_amount, commission_rate, share_percentage')
      .eq('id', partnerId)
      .single();
    
    if (error) throw error;
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }
    
    return res.json({
      success: true,
      data: partner,
    });
  } catch (error: any) {
    console.error('Get wallet error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet information',
    });
  }
}

// =====================================================
// GET DASHBOARD STATS (using SQL function)
// =====================================================

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const partnerId = req.partner!.id;
    
    // Call the SQL function for comprehensive stats
    const { data, error } = await supabaseServer
      .rpc('get_partner_dashboard_stats', { p_partner_id: partnerId });
    
    if (error) throw error;
    
    // Return first row or default values
    const stats = data && data.length > 0 ? data[0] : {
      total_games: 0,
      total_earnings: 0,
      current_balance: 0,
      total_withdrawn: 0,
      pending_withdrawals: 0,
      earnings_this_month: 0,
      earnings_today: 0,
      avg_earning_per_game: 0,
      last_earning_date: null,
    };
    
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
    });
  }
}

// =====================================================
// GET WALLET TRANSACTIONS HISTORY
// =====================================================

export async function getWalletTransactions(req: Request, res: Response) {
  try {
    const partnerId = req.partner!.id;
    const { 
      page = '1', 
      limit = '20', 
      type, 
      dateFrom, 
      dateTo 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseServer
      .from('partner_wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('partner_id', partnerId);
    
    // Filter by transaction type if specified
    if (type && ['earning', 'withdrawal', 'adjustment'].includes(type as string)) {
      query = query.eq('transaction_type', type as string);
    }
    
    // Filter by date range
    if (dateFrom) {
      query = query.gte('created_at', dateFrom as string);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo as string);
    }
    
    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return res.json({
      success: true,
      data: {
        transactions: data || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Get wallet transactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history',
    });
  }
}

// =====================================================
// GET EARNINGS HISTORY (per game)
// =====================================================

export async function getEarningsHistory(req: Request, res: Response) {
  try {
    const partnerId = req.partner!.id;
    const { 
      page = '1', 
      limit = '20', 
      dateFrom, 
      dateTo 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseServer
      .from('partner_game_earnings')
      .select('*', { count: 'exact' })
      .eq('partner_id', partnerId)
      .eq('credited', true);
    
    // Filter by date range
    if (dateFrom) {
      query = query.gte('created_at', dateFrom as string);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo as string);
    }
    
    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    const { data: earnings, error, count } = await query;
    
    if (error) throw error;
    
    return res.json({
      success: true,
      data: {
        earnings: earnings || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Get earnings history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch earnings history',
    });
  }
}

// =====================================================
// REQUEST WITHDRAWAL
// =====================================================

export async function requestWithdrawal(req: Request, res: Response) {
  try {
    const partnerId = req.partner!.id;
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid withdrawal amount',
      });
    }
    
    // Get partner details
    const { data: partner, error: partnerError } = await supabaseServer
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();
    
    if (partnerError || !partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }
    
    const walletBalance = parseFloat(partner.wallet_balance);
    const minWithdrawal = parseFloat(partner.min_withdrawal_amount);
    const requestAmount = parseFloat(amount);
    
    // Validate balance
    if (walletBalance < requestAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: ₹${walletBalance.toFixed(2)}`,
      });
    }
    
    // Validate minimum withdrawal
    if (requestAmount < minWithdrawal) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal amount is ₹${minWithdrawal.toFixed(2)}`,
      });
    }
    
    // Check for pending withdrawals
    const { data: pendingRequests } = await supabaseServer
      .from('partner_withdrawal_requests')
      .select('id, amount')
      .eq('partner_id', partnerId)
      .eq('status', 'pending');
    
    if (pendingRequests && pendingRequests.length > 0) {
      const pendingAmount = pendingRequests.reduce((sum, req) => sum + parseFloat(req.amount), 0);
      return res.status(400).json({
        success: false,
        error: `You have a pending withdrawal request of ₹${pendingAmount.toFixed(2)}. Please wait for admin approval.`,
      });
    }
    
    // Create withdrawal request
    const { data: request, error: requestError } = await supabaseServer
      .from('partner_withdrawal_requests')
      .insert({
        partner_id: partnerId,
        amount: requestAmount,
        status: 'pending',
        partner_phone: partner.phone,
        partner_whatsapp: partner.whatsapp_number,
        partner_name: partner.full_name,
      })
      .select()
      .single();
    
    if (requestError) throw requestError;
    
    // TODO: Send WhatsApp notification to admin
    // This would integrate with your WhatsApp service
    try {
      await supabaseServer
        .from('partner_whatsapp_messages')
        .insert({
          partner_id: partnerId,
          partner_phone: partner.phone,
          admin_phone: process.env.ADMIN_WHATSAPP_NUMBER || '',
          request_type: 'withdrawal',
          message: `Withdrawal request: ₹${requestAmount.toFixed(2)} from ${partner.full_name} (${partner.phone})`,
          status: 'pending',
          withdrawal_request_id: request.id,
          amount: requestAmount,
        });
    } catch (whatsappError) {
      console.error('WhatsApp notification error:', whatsappError);
      // Don't fail the request if WhatsApp fails
    }
    
    return res.json({
      success: true,
      message: 'Withdrawal request submitted successfully. Admin will process it soon.',
      data: request,
    });
  } catch (error: any) {
    console.error('Request withdrawal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create withdrawal request',
    });
  }
}

// =====================================================
// GET WITHDRAWAL REQUESTS
// =====================================================

export async function getWithdrawalRequests(req: Request, res: Response) {
  try {
    const partnerId = req.partner!.id;
    const { 
      page = '1', 
      limit = '10', 
      status 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseServer
      .from('partner_withdrawal_requests')
      .select('*', { count: 'exact' })
      .eq('partner_id', partnerId);
    
    // Filter by status if specified
    if (status && ['pending', 'approved', 'rejected', 'completed'].includes(status as string)) {
      query = query.eq('status', status as string);
    }
    
    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return res.json({
      success: true,
      data: {
        requests: data || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Get withdrawal requests error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal requests',
    });
  }
}

// =====================================================
// CANCEL WITHDRAWAL REQUEST (only pending requests)
// =====================================================

export async function cancelWithdrawalRequest(req: Request, res: Response) {
  try {
    const partnerId = req.partner!.id;
    const { requestId } = req.params;
    
    // Verify the request belongs to this partner and is pending
    const { data: request, error: fetchError } = await supabaseServer
      .from('partner_withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .eq('partner_id', partnerId)
      .eq('status', 'pending')
      .single();
    
    if (fetchError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal request not found or cannot be cancelled',
      });
    }
    
    // Update status to rejected with reason
    const { error: updateError } = await supabaseServer
      .from('partner_withdrawal_requests')
      .update({
        status: 'rejected',
        rejection_reason: 'Cancelled by partner',
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId);
    
    if (updateError) throw updateError;
    
    return res.json({
      success: true,
      message: 'Withdrawal request cancelled successfully',
    });
  } catch (error: any) {
    console.error('Cancel withdrawal request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel withdrawal request',
    });
  }
}
// 🔧 ADMIN PARTNER MANAGEMENT ROUTES
import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabaseServer';
import { requireAdmin } from '../auth';
import { hashPartnerPassword } from '../partner-auth';

const router = Router();

// GET /api/admin/partners/stats/summary - Get partner counts (MUST be before /:id routes)
router.get('/stats/summary', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data: partners } = await supabaseServer.from('partners').select('status');
    
    const stats = {
      total: partners?.length || 0,
      pending: partners?.filter(p => p.status === 'pending').length || 0,
      active: partners?.filter(p => p.status === 'active').length || 0,
      suspended: partners?.filter(p => p.status === 'suspended').length || 0,
      banned: partners?.filter(p => p.status === 'banned').length || 0,
    };
    
    return res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Get partner stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// GET /api/admin/partners - List all partners
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseServer.from('partners').select('*', { count: 'exact' });
    
    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }
    
    if (search) {
      query = query.or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    
    const validSortColumns = ['created_at', 'full_name', 'status'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy as string : 'created_at';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
    query = query.range(offset, offset + limitNum - 1);
    
    const { data: partners, error, count } = await query;
    
    if (error) {
      console.error('Partners query error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch partners' });
    }
    
    const formattedPartners = partners?.map(p => ({
      id: p.id,
      phone: p.phone,
      fullName: p.full_name,
      email: p.email,
      status: p.status,
      sharePercentage: parseFloat(p.share_percentage || '50'),
      commissionRate: parseFloat(p.commission_rate || '10'),
      lastLogin: p.last_login,
      createdAt: p.created_at,
    })) || [];
    
    return res.status(200).json({
      success: true,
      data: {
        partners: formattedPartners,
        pagination: { page: pageNum, limit: limitNum, total: count || 0, pages: Math.ceil((count || 0) / limitNum) },
      },
    });
  } catch (error: any) {
    console.error('Get partners error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get partners' });
  }
});

// GET /api/admin/partners/withdrawals/all - Get all withdrawal requests from all partners (MUST be before /:id routes)
router.get('/withdrawals/all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status = 'pending', page = '1', limit = '50' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseServer
      .from('partner_withdrawal_requests')
      .select(`
        *,
        partners!inner (
          id,
          full_name,
          phone,
          wallet_balance,
          whatsapp_number
        )
      `, { count: 'exact' });
    
    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Get all withdrawals error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch withdrawal requests' });
    }
    
    // Format the response
    const formattedWithdrawals = data?.map(w => ({
      id: w.id,
      amount: w.amount,
      status: w.status,
      partner_id: w.partner_id,
      partner_name: w.partners?.full_name,
      partner_phone: w.partners?.phone,
      partner_whatsapp: w.partners?.whatsapp_number,
      partner_wallet_balance: w.partners?.wallet_balance,
      created_at: w.created_at,
      processed_at: w.processed_at,
      processed_by: w.processed_by,
      utr_number: w.utr_number,
      rejection_reason: w.rejection_reason,
      admin_notes: w.admin_notes
    })) || [];
    
    return res.status(200).json({
      success: true,
      data: {
        withdrawals: formattedWithdrawals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum)
        }
      }
    });
  } catch (error: any) {
    console.error('Get all withdrawals error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch withdrawal requests' });
  }
});

// GET /api/admin/partners/:id - Get single partner by ID
router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: partner, error } = await supabaseServer
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    
    const formattedPartner = {
      id: partner.id,
      phone: partner.phone,
      fullName: partner.full_name,
      email: partner.email,
      status: partner.status,
      sharePercentage: parseFloat(partner.share_percentage || '50'),
      commissionRate: parseFloat(partner.commission_rate || '10'),
      lastLogin: partner.last_login,
      createdAt: partner.created_at,
    };
    
    return res.status(200).json({ success: true, data: formattedPartner });
  } catch (error: any) {
    console.error('Get partner by ID error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get partner' });
  }
});

// PUT /api/admin/partners/:id/status - Update partner status
router.put('/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user?.id;
    
    const validStatuses = ['pending', 'active', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const { data: partner } = await supabaseServer.from('partners').select('status').eq('id', id).single();
    
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    
    const updateData: any = { status };
    
    if (status === 'active' && partner.status === 'pending') {
      updateData.approved_by = adminId;
      updateData.approved_at = new Date().toISOString();
    }
    
    if (status === 'suspended' || status === 'banned') {
      updateData.rejection_reason = reason || null;
    }
    
    const { error } = await supabaseServer.from('partners').update(updateData).eq('id', id);
    
    if (error) {
      console.error('Update partner status error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update status' });
    }
    
    return res.status(200).json({ success: true, message: `Partner status updated to ${status}` });
  } catch (error: any) {
    console.error('Update partner status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// PUT /api/admin/partners/:id/share-percentage - Update partner share percentage
router.put('/:id/share-percentage', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sharePercentage } = req.body;
    
    const shareNum = parseFloat(sharePercentage);
    if (isNaN(shareNum) || shareNum < 1 || shareNum > 100) {
      return res.status(400).json({ success: false, error: 'Share percentage must be between 1 and 100' });
    }
    
    const { error } = await supabaseServer
      .from('partners')
      .update({ share_percentage: shareNum })
      .eq('id', id);
    
    if (error) {
      console.error('Update share percentage error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update share percentage' });
    }
    
    return res.status(200).json({ success: true, message: `Share percentage updated to ${shareNum}%` });
  } catch (error: any) {
    console.error('Update share percentage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update share percentage' });
  }
});

// PUT /api/admin/partners/:id/share - Update partner share percentage
router.put('/:id/share', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sharePercentage } = req.body;
    
    if (!sharePercentage || isNaN(sharePercentage) || sharePercentage < 1 || sharePercentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Share percentage must be between 1 and 100'
      });
    }
    
    const { data: partner, error } = await supabaseServer
      .from('partners')
      .update({ share_percentage: sharePercentage })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !partner) {
      console.error('Update share percentage error:', error);
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Share percentage updated successfully',
      data: { sharePercentage: partner.share_percentage }
    });
  } catch (error: any) {
    console.error('Update share percentage error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update share percentage'
    });
  }
});

// PUT /api/admin/partners/:id/commission - Update partner commission rate
router.put('/:id/commission', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;
    
    if (!commissionRate || isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({
        success: false,
        error: 'Commission rate must be between 0 and 100'
      });
    }
    
    const { data: partner, error } = await supabaseServer
      .from('partners')
      .update({ commission_rate: commissionRate })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !partner) {
      console.error('Update commission rate error:', error);
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Commission rate updated successfully',
      data: { commissionRate: partner.commission_rate }
    });
  } catch (error: any) {
    console.error('Update commission rate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update commission rate'
    });
  }
});

// PUT /api/admin/partners/:id/reset-password - Reset partner password
router.put('/:id/reset-password', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminId = req.user?.id;
    
    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters long' 
      });
    }
    
    // Password validation: 8+ chars with uppercase, lowercase, and number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must contain uppercase, lowercase, and number' 
      });
    }
    
    // Get partner to verify they exist
    const { data: partner, error: findError } = await supabaseServer
      .from('partners')
      .select('id, phone, full_name')
      .eq('id', id)
      .single();
    
    if (findError || !partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    
    // Hash the new password
    const hashedPassword = await hashPartnerPassword(newPassword);
    
    // Update password in database
    const { error: updateError } = await supabaseServer
      .from('partners')
      .update({ password_hash: hashedPassword })
      .eq('id', id);
    
    if (updateError) {
      console.error('Partner password reset error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
    
    console.log(`Admin ${adminId} reset password for partner ${partner.id} (${partner.phone})`);
    
    return res.status(200).json({
      success: true,
      message: `Password reset successfully for partner ${partner.full_name} (${partner.phone})`,
      data: {
        partnerId: partner.id,
        phone: partner.phone,
        fullName: partner.full_name
      }
    });
  } catch (error: any) {
    console.error('Partner password reset error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// GET /api/admin/partners/phone/:phone - Find partner by phone number
router.get('/phone/:phone', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    
    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');
    
    const { data: partner, error } = await supabaseServer
      .from('partners')
      .select('id, phone, full_name, email, status, created_at')
      .eq('phone', normalizedPhone)
      .single();
    
    if (error || !partner) {
      return res.status(404).json({ success: false, error: 'Partner not found with this phone number' });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        id: partner.id,
        phone: partner.phone,
        fullName: partner.full_name,
        email: partner.email,
        status: partner.status,
        createdAt: partner.created_at
      }
    });
  } catch (error: any) {
    console.error('Find partner by phone error:', error);
    return res.status(500).json({ success: false, error: 'Failed to find partner' });
  }
});

// =====================================================
// ADMIN FINANCIAL ENDPOINTS
// =====================================================

// GET /api/admin/partners/:id/wallet - Get partner wallet details
router.get('/:id/wallet', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: partner, error } = await supabaseServer
      .from('partners')
      .select('wallet_balance, total_earned, total_withdrawn, min_withdrawal_amount, commission_rate, share_percentage')
      .eq('id', id)
      .single();
    
    if (error || !partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    
    // Get pending withdrawals amount
    const { data: pendingWithdrawals } = await supabaseServer
      .from('partner_withdrawal_requests')
      .select('amount')
      .eq('partner_id', id)
      .eq('status', 'pending');
    
    const pendingAmount = pendingWithdrawals?.reduce((sum, req) => sum + parseFloat(req.amount), 0) || 0;
    
    return res.status(200).json({
      success: true,
      data: {
        ...partner,
        pending_withdrawals: pendingAmount
      }
    });
  } catch (error: any) {
    console.error('Get partner wallet error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch wallet data' });
  }
});

// GET /api/admin/partners/:id/earnings - Get partner earnings history
router.get('/:id/earnings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', dateFrom, dateTo } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseServer
      .from('partner_game_earnings')
      .select('*', { count: 'exact' })
      .eq('partner_id', id)
      .eq('credited', true);
    
    if (dateFrom) query = query.gte('created_at', dateFrom as string);
    if (dateTo) query = query.lte('created_at', dateTo as string);
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Map database column names to frontend expected names
    const mappedEarnings = (data || []).map(earning => ({
      ...earning,
      game_profit: earning.real_profit,  // Map real_profit to game_profit
      earning_amount: earning.earned_amount  // Map earned_amount to earning_amount
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        earnings: mappedEarnings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum)
        }
      }
    });
  } catch (error: any) {
    console.error('Get partner earnings error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch earnings' });
  }
});

// GET /api/admin/partners/:id/withdrawals - Get partner withdrawal requests
router.get('/:id/withdrawals', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', status } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseServer
      .from('partner_withdrawal_requests')
      .select('*', { count: 'exact' })
      .eq('partner_id', id);
    
    if (status && ['pending', 'approved', 'rejected', 'completed'].includes(status as string)) {
      query = query.eq('status', status as string);
    }
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return res.status(200).json({
      success: true,
      data: {
        withdrawals: data || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum)
        }
      }
    });
  } catch (error: any) {
    console.error('Get partner withdrawals error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// GET /api/admin/partners/:id/transactions - Get partner transaction history
router.get('/:id/transactions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', type, dateFrom, dateTo } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabaseServer
      .from('partner_wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('partner_id', id);
    
    if (type && ['earning', 'withdrawal', 'adjustment'].includes(type as string)) {
      query = query.eq('transaction_type', type as string);
    }
    
    if (dateFrom) query = query.gte('created_at', dateFrom as string);
    if (dateTo) query = query.lte('created_at', dateTo as string);
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return res.status(200).json({
      success: true,
      data: {
        transactions: data || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum)
        }
      }
    });
  } catch (error: any) {
    console.error('Get partner transactions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// PUT /api/admin/partners/:id/withdrawals/:withdrawalId - Approve/Reject withdrawal
router.put('/:id/withdrawals/:withdrawalId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, withdrawalId } = req.params;
    const { action, utrNumber, rejectionReason } = req.body;
    const adminId = req.user?.id;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    // Get withdrawal request
    const { data: withdrawal, error: fetchError } = await supabaseServer
      .from('partner_withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .eq('partner_id', id)
      .eq('status', 'pending')
      .single();
    
    if (fetchError || !withdrawal) {
      return res.status(404).json({ success: false, error: 'Withdrawal request not found or already processed' });
    }
    
    const amount = Number(withdrawal.amount);
    
    if (action === 'approve') {
      // Validate UTR number for approval (12-22 alphanumeric characters)
      const utrRegex = /^[A-Za-z0-9]{12,22}$/;
      if (!utrNumber || !utrRegex.test(utrNumber.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Valid UTR number required (12-22 alphanumeric characters)'
        });
      }
      
      // Get partner current balance
      const { data: partner } = await supabaseServer
        .from('partners')
        .select('wallet_balance')
        .eq('id', id)
        .single();
      
      if (!partner) {
        return res.status(404).json({ success: false, error: 'Partner not found' });
      }
      
      const currentBalance = parseFloat(partner.wallet_balance);
      
      if (currentBalance < amount) {
        return res.status(400).json({
          success: false,
          error: `Insufficient balance. Partner has ₹${currentBalance.toFixed(2)}, requested ₹${amount.toFixed(2)}`
        });
      }
      
      // Deduct from wallet balance and update totals
      const newBalance = currentBalance - amount;
      
      // Get current total_withdrawn
      const { data: partnerData } = await supabaseServer
        .from('partners')
        .select('total_withdrawn')
        .eq('id', id)
        .single();
      
      const currentTotalWithdrawn = parseFloat(partnerData?.total_withdrawn || '0');
      const newTotalWithdrawn = currentTotalWithdrawn + amount;
      
      const { error: updateError } = await supabaseServer
        .from('partners')
        .update({
          wallet_balance: newBalance,
          total_withdrawn: newTotalWithdrawn
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Create transaction record
      await supabaseServer
        .from('partner_wallet_transactions')
        .insert({
          partner_id: id,
          transaction_type: 'withdrawal',
          amount: amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: `Withdrawal approved - UTR: ${utrNumber}`,
          reference_id: withdrawalId
        });
      
      // Update withdrawal request
      const { error: withdrawalError } = await supabaseServer
        .from('partner_withdrawal_requests')
        .update({
          status: 'completed',
          utr_number: utrNumber,
          processed_at: new Date().toISOString(),
          processed_by: adminId
        })
        .eq('id', withdrawalId);
      
      if (withdrawalError) throw withdrawalError;
      
      return res.status(200).json({
        success: true,
        message: `Withdrawal of ₹${amount.toFixed(2)} approved successfully`,
        data: { newBalance, utrNumber }
      });
      
    } else {
      // Reject withdrawal
      const reason = rejectionReason || 'Rejected by admin';
      
      const { error: rejectError } = await supabaseServer
        .from('partner_withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString(),
          processed_by: adminId
        })
        .eq('id', withdrawalId);
      
      if (rejectError) throw rejectError;
      
      return res.status(200).json({
        success: true,
        message: `Withdrawal request rejected`,
        data: { reason }
      });
    }
  } catch (error: any) {
    console.error('Process withdrawal error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process withdrawal' });
  }
});

// GET /api/admin/partners/:id/stats - Get comprehensive partner statistics
router.get('/:id/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Call the SQL function for comprehensive stats
    const { data, error } = await supabaseServer
      .rpc('get_partner_dashboard_stats', { p_partner_id: id });
    
    if (error) throw error;
    
    const stats = data && data.length > 0 ? data[0] : {
      total_games: 0,
      total_earnings: 0,
      current_balance: 0,
      total_withdrawn: 0,
      pending_withdrawals: 0,
      earnings_this_month: 0,
      earnings_today: 0,
      avg_earning_per_game: 0,
      last_earning_date: null
    };
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get partner stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

export default router;

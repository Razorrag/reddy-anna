// 🔧 ADMIN PARTNER MANAGEMENT ROUTES
import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabaseServer';
import { requireAdmin } from '../auth';

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

export default router;

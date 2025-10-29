// Admin Requests API - Supabase Compatible Version
// Integrated with existing Supabase-based system

import express from 'express';
import { supabaseServer } from './lib/supabaseServer';
import { requireAuth } from './auth';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface AdminRequest {
    id: string;
    user_id?: string;
    user_phone: string;
    request_type: string;
    amount?: number;
    currency: string;
    payment_method?: string;
    utr_number?: string;
    status: string;
    priority: number;
    admin_notes?: string;
    admin_id?: string;
    whatsapp_message_id?: string;
    balance_updated: boolean;
    balance_update_amount?: number;
    created_at: string;
    updated_at: string;
    processed_at?: string;
}

class AdminRequestsSupabaseAPI {
    private router: express.Router;

    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Get all requests with pagination and filtering
        this.router.get('/requests', requireAuth, async (req, res) => {
            try {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 50;
                const offset = (page - 1) * limit;

                let query = supabaseServer
                    .from('admin_requests')
                    .select('*', { count: 'exact' });

                // Apply filters
                if (req.query.status) {
                    query = query.eq('status', req.query.status);
                }
                if (req.query.request_type) {
                    query = query.eq('request_type', req.query.request_type);
                }
                if (req.query.priority) {
                    query = query.eq('priority', parseInt(req.query.priority as string));
                }
                if (req.query.date_from) {
                    query = query.gte('created_at', req.query.date_from);
                }
                if (req.query.date_to) {
                    query = query.lte('created_at', req.query.date_to);
                }

                // Apply pagination and sorting
                query = query
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                const { data, error, count } = await query;

                if (error) throw error;

                res.json({
                    success: true,
                    data: {
                        requests: data || [],
                        total: count || 0,
                        page,
                        limit,
                        totalPages: Math.ceil((count || 0) / limit)
                    },
                    message: 'Requests retrieved successfully'
                } as ApiResponse);
            } catch (error) {
                console.error('Error getting requests:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve requests',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } as ApiResponse);
            }
        });

        // Get request by ID
        this.router.get('/requests/:id', requireAuth, async (req, res) => {
            try {
                const { id } = req.params;

                const { data: request, error } = await supabaseServer
                    .from('admin_requests')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (!request) {
                    res.status(404).json({
                        success: false,
                        error: 'Request not found'
                    } as ApiResponse);
                    return;
                }

                // Get audit trail
                const { data: auditTrail } = await supabaseServer
                    .from('request_audit')
                    .select('*')
                    .eq('request_id', id)
                    .order('created_at', { ascending: false });

                res.json({
                    success: true,
                    data: {
                        request,
                        audit_trail: auditTrail || []
                    },
                    message: 'Request retrieved successfully'
                } as ApiResponse);
            } catch (error) {
                console.error('Error getting request:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve request',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } as ApiResponse);
            }
        });

        // Update request status (without balance update)
        this.router.put('/requests/:id/status', requireAuth, async (req, res) => {
            try {
                const { id } = req.params;
                const { status, notes } = req.body;
                const adminId = req.user?.id || 'system';

                if (!status) {
                    res.status(400).json({
                        success: false,
                        error: 'Status is required'
                    } as ApiResponse);
                    return;
                }

                if (!['pending', 'approved', 'rejected', 'processing', 'completed'].includes(status)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid status value'
                    } as ApiResponse);
                    return;
                }

                // Call database function
                const { data, error } = await supabaseServer
                    .rpc('update_request_status', {
                        p_request_id: id,
                        p_admin_id: adminId,
                        p_new_status: status,
                        p_notes: notes || null
                    });

                if (error) throw error;

                res.json({
                    success: true,
                    data: data,
                    message: `Request status updated to ${status}`
                } as ApiResponse);
            } catch (error) {
                console.error('Error updating request status:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update request status',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } as ApiResponse);
            }
        });

        // Process request with balance update
        this.router.put('/requests/:id/process', requireAuth, async (req, res) => {
            try {
                const { id } = req.params;
                const { status, notes } = req.body;
                const adminId = req.user?.id || 'system';

                if (!status) {
                    res.status(400).json({
                        success: false,
                        error: 'Status is required'
                    } as ApiResponse);
                    return;
                }

                if (!['approved', 'rejected'].includes(status)) {
                    res.status(400).json({
                        success: false,
                        error: 'Only approved or rejected status allowed for processing'
                    } as ApiResponse);
                    return;
                }

                // Call database function that updates balance
                const { data, error } = await supabaseServer
                    .rpc('update_balance_with_request', {
                        p_request_id: id,
                        p_admin_id: adminId,
                        p_new_status: status,
                        p_notes: notes || null
                    });

                if (error) throw error;

                res.json({
                    success: true,
                    data: data,
                    message: `Request processed with status ${status}`
                } as ApiResponse);
            } catch (error) {
                console.error('Error processing request:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to process request',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } as ApiResponse);
            }
        });

        // Get requests by status
        this.router.get('/requests/status/:status', requireAuth, async (req, res) => {
            try {
                const { status } = req.params;
                const limit = parseInt(req.query.limit as string) || 50;

                if (!['pending', 'approved', 'rejected', 'processing', 'completed'].includes(status)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid status value'
                    } as ApiResponse);
                    return;
                }

                const { data, error } = await supabaseServer
                    .from('admin_requests')
                    .select('*')
                    .eq('status', status)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (error) throw error;

                res.json({
                    success: true,
                    data: data || [],
                    message: `Requests with status ${status} retrieved successfully`
                } as ApiResponse);
            } catch (error) {
                console.error('Error getting requests by status:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve requests by status',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } as ApiResponse);
            }
        });

        // Get request summary statistics
        this.router.get('/summary', requireAuth, async (req, res) => {
            try {
                const { data, error } = await supabaseServer
                    .from('admin_requests_summary')
                    .select('*')
                    .single();

                if (error) {
                    // If view doesn't exist, calculate manually
                    const { data: allRequests } = await supabaseServer
                        .from('admin_requests')
                        .select('*')
                        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

                    const summary = {
                        total_requests: allRequests?.length || 0,
                        pending_requests: allRequests?.filter(r => r.status === 'pending').length || 0,
                        high_priority_requests: allRequests?.filter(r => r.status === 'pending' && r.priority === 1).length || 0,
                        approved_requests: allRequests?.filter(r => r.status === 'approved').length || 0,
                        rejected_requests: allRequests?.filter(r => r.status === 'rejected').length || 0,
                        pending_amount: allRequests?.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
                        approved_amount: allRequests?.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.amount || 0), 0) || 0
                    };

                    res.json({
                        success: true,
                        data: summary,
                        message: 'Request summary retrieved successfully'
                    } as ApiResponse);
                    return;
                }

                res.json({
                    success: true,
                    data: data,
                    message: 'Request summary retrieved successfully'
                } as ApiResponse);
            } catch (error) {
                console.error('Error getting request summary:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve request summary',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } as ApiResponse);
            }
        });

        // Manual request creation (for testing and admin use)
        this.router.post('/requests/manual', requireAuth, async (req, res) => {
            try {
                const {
                    user_phone,
                    request_type,
                    amount,
                    currency = 'INR',
                    payment_method,
                    utr_number,
                    priority = 3
                } = req.body;

                if (!user_phone || !request_type) {
                    res.status(400).json({
                        success: false,
                        error: 'User phone and request type are required'
                    } as ApiResponse);
                    return;
                }

                if (!['deposit', 'withdrawal', 'support', 'balance'].includes(request_type)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid request type'
                    } as ApiResponse);
                    return;
                }

                // Get user_id from phone
                const { data: user } = await supabaseServer
                    .from('users')
                    .select('id')
                    .eq('phone', user_phone)
                    .single();

                const { data: request, error } = await supabaseServer
                    .from('admin_requests')
                    .insert({
                        user_id: user?.id,
                        user_phone,
                        request_type,
                        amount,
                        currency,
                        payment_method,
                        utr_number,
                        priority,
                        status: 'pending'
                    })
                    .select()
                    .single();

                if (error) throw error;

                res.json({
                    success: true,
                    data: request,
                    message: 'Manual request created successfully'
                } as ApiResponse);
            } catch (error) {
                console.error('Error creating manual request:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create manual request',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } as ApiResponse);
            }
        });

        // Health check endpoint
        this.router.get('/health', (req, res) => {
            res.json({
                success: true,
                data: {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    service: 'admin-requests-supabase-api'
                }
            } as ApiResponse);
        });
    }

    public getRouter(): express.Router {
        return this.router;
    }
}

export { AdminRequestsSupabaseAPI, ApiResponse };

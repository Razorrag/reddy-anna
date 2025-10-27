// Admin Requests API Endpoints
// REST API for managing admin requests and WhatsApp integration

import express from 'express';
import { EnhancedWhatsAppService, AdminRequest, DashboardSettings } from './whatsapp-service-enhanced';
import { Pool } from 'pg';
import { requireAuth } from './auth';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

class AdminRequestsAPI {
    private router: express.Router;
    private whatsappService: EnhancedWhatsAppService;

    constructor(pool: Pool) {
        this.router = express.Router();
        this.whatsappService = new EnhancedWhatsAppService(pool);
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Set up WebSocket server for real-time notifications
        this.router.use((req, res, next) => {
            if (req.app.get('wss')) {
                this.whatsappService.setWebSocketServer(req.app.get('wss'));
            }
            next();
        });

        // Get all requests with pagination and filtering
        this.router.get('/requests', requireAuth, async (req, res) => {
            try {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 50;
                const filters = {
                    status: req.query.status as string,
                    request_type: req.query.request_type as string,
                    priority: req.query.priority ? parseInt(req.query.priority as string) : undefined,
                    date_from: req.query.date_from as string,
                    date_to: req.query.date_to as string
                };

                const result = await this.whatsappService.getAllRequests(page, limit, filters);
                
                res.json({
                    success: true,
                    data: result,
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
                const requests = await this.whatsappService.getAllRequests(1, 1, { id });
                
                if (requests.requests.length === 0) {
                    res.status(404).json({
                        success: false,
                        error: 'Request not found'
                    } as ApiResponse);
                    return;
                }

                // Get audit trail
                const auditTrail = await this.whatsappService.getRequestAuditTrail(id);

                res.json({
                    success: true,
                    data: {
                        request: requests.requests[0],
                        audit_trail: auditTrail
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

        // Update request status
        this.router.put('/requests/:id/status', requireAuth, async (req, res) => {
            try {
                const { id } = req.params;
                const { status, notes } = req.body;
                const adminId = req.user?.id;

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

                const request = await this.whatsappService.updateRequestStatus(id, adminId || 'system', status, notes);

                res.json({
                    success: true,
                    data: request,
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

        // Update balance and process request
        this.router.put('/requests/:id/process', requireAuth, async (req, res) => {
            try {
                const { id } = req.params;
                const { status, notes } = req.body;
                const adminId = req.user?.id;

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

                const request = await this.whatsappService.updateBalanceAndProcessRequest(id, adminId || 'system', status, notes);

                res.json({
                    success: true,
                    data: request,
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

        // Get request summary statistics
        this.router.get('/requests/summary', requireAuth, async (req, res) => {
            try {
                const summary = await this.whatsappService.getRequestSummary();

                res.json({
                    success: true,
                    data: summary,
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

                const requests = await this.whatsappService.getRequestsByStatus(status, limit);

                res.json({
                    success: true,
                    data: requests,
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

        // Get dashboard settings
        this.router.get('/settings', requireAuth, async (req, res) => {
            try {
                const settings = this.whatsappService.getDashboardSettings();

                res.json({
                    success: true,
                    data: settings,
                    message: 'Dashboard settings retrieved successfully'
                } as ApiResponse);
            } catch (error) {
                console.error('Error getting dashboard settings:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve dashboard settings',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } as ApiResponse);
            }
        });

        // Update dashboard settings
        this.router.put('/settings', requireAuth, async (req, res) => {
            try {
                const settings: Partial<DashboardSettings> = req.body;
                await this.whatsappService.updateDashboardSettings(settings);

                res.json({
                    success: true,
                    message: 'Dashboard settings updated successfully'
                } as ApiResponse);
            } catch (error) {
                console.error('Error updating dashboard settings:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update dashboard settings',
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
                    currency,
                    payment_method,
                    utr_number,
                    priority
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

                // Create a mock WhatsApp message for the request
                const mockMessage = {
                    id: `manual_${Date.now()}`,
                    phone: user_phone,
                    message: `Manual request: ${request_type}${amount ? ` for ₹${amount}` : ''}`,
                    timestamp: new Date().toISOString(),
                    type: 'text'
                };

                const request = await this.whatsappService.processWhatsAppMessage(mockMessage);

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

        // Export requests data (for reporting)
        this.router.get('/requests/export', requireAuth, async (req, res) => {
            try {
                const { format = 'json', date_from, date_to } = req.query;
                
                const filters = {
                    date_from: date_from as string,
                    date_to: date_to as string
                };

                const result = await this.whatsappService.getAllRequests(1, 1000, filters);
                
                if (format === 'csv') {
                    // Convert to CSV format
                    const csv = this.convertToCSV(result.requests);
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', 'attachment; filename="admin-requests.csv"');
                    res.send(csv);
                } else {
                    res.json({
                        success: true,
                        data: result.requests,
                        message: 'Requests exported successfully'
                    } as ApiResponse);
                }
            } catch (error) {
                console.error('Error exporting requests:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to export requests',
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
                    service: 'admin-requests-api'
                }
            } as ApiResponse);
        });
    }

    private convertToCSV(requests: AdminRequest[]): string {
        if (requests.length === 0) {
            return 'No data available';
        }

        const headers = [
            'ID', 'User Phone', 'Request Type', 'Amount', 'Currency', 'Payment Method',
            'UTR Number', 'Status', 'Priority', 'Created At', 'Updated At', 'Processed At'
        ];

        const rows = requests.map(req => [
            req.id,
            req.user_phone,
            req.request_type,
            req.amount || '',
            req.currency,
            req.payment_method || '',
            req.utr_number || '',
            req.status,
            req.priority.toString(),
            req.created_at,
            req.updated_at,
            req.processed_at || ''
        ]);

        const csvContent = [headers, ...rows].map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        return csvContent;
    }

    public getRouter(): express.Router {
        return this.router;
    }
}

export { AdminRequestsAPI, ApiResponse };
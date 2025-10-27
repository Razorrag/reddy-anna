// Enhanced WhatsApp Service with Admin Request Management
// Comprehensive service for handling WhatsApp messages and admin requests

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage-supabase';
import { WebSocketServer } from 'ws';

interface WhatsAppMessage {
    id: string;
    phone: string;
    message: string;
    timestamp: string;
    type: string;
    media?: {
        id: string;
        type: string;
        url: string;
    };
}

interface AdminRequest {
    id: string;
    user_id: string;
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

interface RequestAudit {
    id: string;
    request_id: string;
    admin_id: string;
    action: string;
    old_status: string;
    new_status: string;
    notes?: string;
    created_at: string;
}

interface DashboardSettings {
    auto_refresh_interval: number;
    default_request_limit: number;
    enable_real_time_notifications: boolean;
    default_priority: number;
    require_admin_approval: boolean;
    notification_sound: boolean;
}

class EnhancedWhatsAppService {
    private pool: Pool;
    private wss: WebSocketServer | null = null;
    private settings: DashboardSettings = {
        auto_refresh_interval: 30,
        default_request_limit: 50,
        enable_real_time_notifications: true,
        default_priority: 3,
        require_admin_approval: true,
        notification_sound: true
    };

    constructor(pool: Pool) {
        this.pool = pool;
        this.initializeSettings();
    }

    // Initialize dashboard settings
    private async initializeSettings() {
        try {
            const result = await this.pool.query(`
                SELECT setting_key, setting_value FROM admin_dashboard_settings
            `);
            
            result.rows.forEach(row => {
                switch (row.setting_key) {
                    case 'auto_refresh_interval':
                        this.settings.auto_refresh_interval = parseInt(row.setting_value);
                        break;
                    case 'default_request_limit':
                        this.settings.default_request_limit = parseInt(row.setting_value);
                        break;
                    case 'enable_real_time_notifications':
                        this.settings.enable_real_time_notifications = row.setting_value === 'true';
                        break;
                    case 'default_priority':
                        this.settings.default_priority = parseInt(row.setting_value);
                        break;
                    case 'require_admin_approval':
                        this.settings.require_admin_approval = row.setting_value === 'true';
                        break;
                    case 'notification_sound':
                        this.settings.notification_sound = row.setting_value === 'true';
                        break;
                }
            });
        } catch (error) {
            console.error('Failed to load dashboard settings:', error);
        }
    }

    // Set WebSocket server for real-time notifications
    public setWebSocketServer(wss: WebSocketServer) {
        this.wss = wss;
    }

    // Process incoming WhatsApp message
    public async processWhatsAppMessage(message: WhatsAppMessage): Promise<AdminRequest | null> {
        try {
            console.log('Processing WhatsApp message:', message);

            // Extract request information from message
            const requestInfo = this.extractRequestInfo(message.message, message.phone);
            
            if (!requestInfo) {
                console.log('No valid request found in message');
                return null;
            }

            // Create WhatsApp message record
            const whatsappMessage = await this.createWhatsAppMessage(message);
            
            // Create admin request
            const adminRequest = await this.createAdminRequest({
                user_phone: message.phone,
                request_type: requestInfo.type,
                amount: requestInfo.amount,
                currency: 'INR',
                payment_method: requestInfo.payment_method,
                utr_number: requestInfo.utr_number,
                priority: requestInfo.priority,
                whatsapp_message_id: whatsappMessage.id
            });

            // Send real-time notification to admins
            this.sendRealTimeNotification('new_request', {
                request: adminRequest,
                message: whatsappMessage
            });

            return adminRequest;
        } catch (error) {
            console.error('Failed to process WhatsApp message:', error);
            throw error;
        }
    }

    // Extract request information from message text
    private extractRequestInfo(message: string, phone: string): any {
        const text = message.toLowerCase().trim();
        
        // Check for deposit request
        if (text.includes('deposit') || text.includes('add money') || text.includes('balance')) {
            const amount = this.extractAmount(text);
            const paymentMethod = this.extractPaymentMethod(text);
            const utrNumber = this.extractUTRNumber(text);
            
            return {
                type: 'deposit',
                amount: amount,
                payment_method: paymentMethod,
                utr_number: utrNumber,
                priority: amount && amount > 10000 ? 1 : 3 // High priority for large amounts
            };
        }
        
        // Check for withdrawal request
        if (text.includes('withdraw') || text.includes('withdrawal') || text.includes('cash out')) {
            const amount = this.extractAmount(text);
            
            return {
                type: 'withdrawal',
                amount: amount,
                priority: amount && amount > 5000 ? 1 : 2 // High priority for large withdrawals
            };
        }
        
        // Check for support request
        if (text.includes('help') || text.includes('support') || text.includes('problem')) {
            return {
                type: 'support',
                priority: 3
            };
        }

        return null;
    }

    // Extract amount from message text
    private extractAmount(text: string): number | null {
        const amountRegex = /(?:rs\.?|₹|inr|amount)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
        const match = text.match(amountRegex);
        
        if (match && match[1]) {
            return parseFloat(match[1].replace(',', ''));
        }
        
        // Try simpler number extraction
        const numberRegex = /([0-9]+(?:\.[0-9]{1,2})?)/g;
        const numbers = text.match(numberRegex);
        
        if (numbers && numbers.length > 0) {
            return parseFloat(numbers[0].replace(',', ''));
        }
        
        return null;
    }

    // Extract payment method from message text
    private extractPaymentMethod(text: string): string | null {
        if (text.includes('upi') || text.includes('phonepe') || text.includes('gpay') || text.includes('paytm')) {
            return 'UPI';
        }
        if (text.includes('bank') || text.includes('transfer') || text.includes('neft') || text.includes('rtgs')) {
            return 'Bank Transfer';
        }
        if (text.includes('cash') || text.includes('hand')) {
            return 'Cash';
        }
        return null;
    }

    // Extract UTR number from message text
    private extractUTRNumber(text: string): string | null {
        const utrRegex = /(?:utr|transaction|ref|reference)\s*[:\-]?\s*([A-Z0-9]{10,20})/i;
        const match = text.match(utrRegex);
        
        if (match && match[1]) {
            return match[1].toUpperCase();
        }
        
        // Look for common transaction ID patterns
        const txnRegex = /([A-Z0-9]{12,18})/g;
        const matches = text.match(txnRegex);
        
        if (matches) {
            // Return the most likely UTR number
            const found = matches.find(id =>
                id.length >= 12 &&
                (id.includes('UPI') || id.includes('BANK') || /^[A-Z0-9]+$/.test(id))
            );
            return found || null;
        }
        
        return null;
    }

    // Create WhatsApp message record
    private async createWhatsAppMessage(message: WhatsAppMessage): Promise<any> {
        const query = `
            INSERT INTO whatsapp_messages (id, phone, message, timestamp, type, media)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                message = EXCLUDED.message,
                updated_at = NOW()
            RETURNING *
        `;
        
        const values = [
            message.id,
            message.phone,
            message.message,
            message.timestamp,
            message.type,
            message.media ? JSON.stringify(message.media) : null
        ];
        
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    // Create admin request
    private async createAdminRequest(requestData: any): Promise<AdminRequest> {
        const query = `
            INSERT INTO admin_requests (
                user_phone, request_type, amount, currency, payment_method,
                utr_number, priority, whatsapp_message_id, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            RETURNING *
        `;
        
        const values = [
            requestData.user_phone,
            requestData.request_type,
            requestData.amount,
            requestData.currency,
            requestData.payment_method,
            requestData.utr_number,
            requestData.priority,
            requestData.whatsapp_message_id
        ];
        
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    // Update request status
    public async updateRequestStatus(
        requestId: string,
        adminId: string,
        status: string,
        notes?: string
    ): Promise<AdminRequest> {
        try {
            const query = `
                SELECT update_request_status($1, $2, $3, $4) AS request
            `;
            
            const result = await this.pool.query(query, [requestId, adminId, status, notes]);
            
            const request = result.rows[0].request;
            
            // Send real-time notification
            this.sendRealTimeNotification('request_status_update', {
                request: request,
                action: 'status_update'
            });
            
            return request;
        } catch (error) {
            console.error('Failed to update request status:', error);
            throw error;
        }
    }

    // Update balance and process request
    public async updateBalanceAndProcessRequest(
        requestId: string,
        adminId: string,
        status: string,
        notes?: string
    ): Promise<AdminRequest> {
        try {
            const query = `
                SELECT update_balance_with_request($1, $2, $3, $4) AS request
            `;
            
            const result = await this.pool.query(query, [requestId, adminId, status, notes]);
            
            const request = result.rows[0].request;
            
            // Send real-time notification
            this.sendRealTimeNotification('request_processed', {
                request: request,
                action: 'balance_update'
            });
            
            return request;
        } catch (error) {
            console.error('Failed to update balance and process request:', error);
            throw error;
        }
    }

    // Get requests by status
    public async getRequestsByStatus(status: string, limit: number = 50): Promise<AdminRequest[]> {
        const query = `
            SELECT * FROM admin_requests 
            WHERE status = $1 
            ORDER BY priority ASC, created_at DESC 
            LIMIT $2
        `;
        
        const result = await this.pool.query(query, [status, limit]);
        return result.rows;
    }

    // Get all requests with pagination
    public async getAllRequests(
        page: number = 1,
        limit: number = 50,
        filters: any = {}
    ): Promise<{ requests: AdminRequest[], total: number }> {
        let whereClause = 'WHERE 1=1';
        const values: any[] = [];
        let valueIndex = 1;
        
        if (filters.status) {
            whereClause += ` AND status = $${valueIndex++}`;
            values.push(filters.status);
        }
        
        if (filters.request_type) {
            whereClause += ` AND request_type = $${valueIndex++}`;
            values.push(filters.request_type);
        }
        
        if (filters.priority) {
            whereClause += ` AND priority = $${valueIndex++}`;
            values.push(filters.priority);
        }
        
        if (filters.date_from) {
            whereClause += ` AND created_at >= $${valueIndex++}`;
            values.push(filters.date_from);
        }
        
        if (filters.date_to) {
            whereClause += ` AND created_at <= $${valueIndex++}`;
            values.push(filters.date_to);
        }
        
        const offset = (page - 1) * limit;
        
        // Get requests
        const requestsQuery = `
            SELECT * FROM admin_requests 
            ${whereClause}
            ORDER BY priority ASC, created_at DESC 
            LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
        `;
        
        values.push(limit, offset);
        
        const requestsResult = await this.pool.query(requestsQuery, values);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total FROM admin_requests ${whereClause}
        `;
        
        const countResult = await this.pool.query(countQuery, values.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);
        
        return {
            requests: requestsResult.rows,
            total: total
        };
    }

    // Get request summary statistics
    public async getRequestSummary(): Promise<any> {
        const query = `SELECT * FROM admin_requests_summary`;
        const result = await this.pool.query(query);
        return result.rows[0];
    }

    // Get request audit trail
    public async getRequestAuditTrail(requestId: string): Promise<RequestAudit[]> {
        const query = `
            SELECT * FROM request_audit 
            WHERE request_id = $1 
            ORDER BY created_at DESC
        `;
        
        const result = await this.pool.query(query, [requestId]);
        return result.rows;
    }

    // Send real-time notification to connected admins
    private sendRealTimeNotification(event: string, data: any) {
        if (!this.wss || !this.settings.enable_real_time_notifications) {
            return;
        }
        
        const message = JSON.stringify({
            type: 'admin_notification',
            event: event,
            data: data,
            timestamp: new Date().toISOString()
        });
        
        // Broadcast to all connected admin clients
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // Get dashboard settings
    public getDashboardSettings(): DashboardSettings {
        return { ...this.settings };
    }

    // Update dashboard settings
    public async updateDashboardSettings(newSettings: Partial<DashboardSettings>): Promise<void> {
        const updatePromises = Object.entries(newSettings).map(async ([key, value]) => {
            const query = `
                INSERT INTO admin_dashboard_settings (setting_key, setting_value, description)
                VALUES ($1, $2, $3)
                ON CONFLICT (setting_key) DO UPDATE SET
                    setting_value = EXCLUDED.setting_value,
                    updated_at = NOW()
            `;
            
            let description = '';
            switch (key) {
                case 'auto_refresh_interval':
                    description = 'Auto-refresh interval in seconds for dashboard data';
                    break;
                case 'default_request_limit':
                    description = 'Default number of requests to show per page';
                    break;
                case 'enable_real_time_notifications':
                    description = 'Enable real-time WebSocket notifications';
                    break;
                case 'default_priority':
                    description = 'Default priority for new requests';
                    break;
                case 'require_admin_approval':
                    description = 'Require admin approval for balance updates';
                    break;
                case 'notification_sound':
                    description = 'Play sound for new high-priority requests';
                    break;
            }
            
            await this.pool.query(query, [key, value.toString(), description]);
            
            // Update local settings
            if (key === 'auto_refresh_interval') this.settings.auto_refresh_interval = value as number;
            if (key === 'default_request_limit') this.settings.default_request_limit = value as number;
            if (key === 'enable_real_time_notifications') this.settings.enable_real_time_notifications = value as boolean;
            if (key === 'default_priority') this.settings.default_priority = value as number;
            if (key === 'require_admin_approval') this.settings.require_admin_approval = value as boolean;
            if (key === 'notification_sound') this.settings.notification_sound = value as boolean;
        });
        
        await Promise.all(updatePromises);
    }
}

export { EnhancedWhatsAppService, WhatsAppMessage, AdminRequest, RequestAudit, DashboardSettings };
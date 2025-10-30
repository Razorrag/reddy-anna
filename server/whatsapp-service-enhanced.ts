// Enhanced WhatsApp Service with Retry Logic and Reliability Improvements
// Comprehensive service for handling WhatsApp messages and admin requests with improved reliability

import pg from 'pg';
const { Pool } = pg;
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
    retry_count: number;
    last_retry_at?: string;
    next_retry_at?: string;
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
    whatsapp_retry_enabled: boolean;
    whatsapp_retry_attempts: number;
    whatsapp_retry_delay: number; // in seconds
    whatsapp_max_retry_delay: number; // in seconds
    // Game/Finance configurable percentages
    bonus_percentage?: number; // e.g. 5 for 5%
    bonus_win_threshold?: number; // percent threshold to release on win
    bonus_loss_threshold?: number; // percent threshold to release on loss
}

interface RetryConfig {
    maxAttempts: number;
    baseDelay: number; // seconds
    maxDelay: number; // seconds
    backoffMultiplier: number;
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
        notification_sound: true,
        whatsapp_retry_enabled: true,
        whatsapp_retry_attempts: 3,
        whatsapp_retry_delay: 30,
        whatsapp_max_retry_delay: 300,
        bonus_percentage: 5,
        bonus_win_threshold: 20,
        bonus_loss_threshold: 20
    };

    private retryConfig: RetryConfig = {
        maxAttempts: 3,
        baseDelay: 30,
        maxDelay: 300,
        backoffMultiplier: 2
    };

    constructor(pool: Pool) {
        this.pool = pool;
        this.initializeSettings();
        this.startRetryWorker();
    }

    // Initialize dashboard settings
    private async initializeSettings() {
        // Skip DB access entirely if no DB configured
        if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
            this.settings.whatsapp_retry_enabled = false;
            return;
        }
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
                    case 'whatsapp_retry_enabled':
                        this.settings.whatsapp_retry_enabled = row.setting_value === 'true';
                        break;
                    case 'whatsapp_retry_attempts':
                        this.settings.whatsapp_retry_attempts = parseInt(row.setting_value);
                        break;
                    case 'whatsapp_retry_delay':
                        this.settings.whatsapp_retry_delay = parseInt(row.setting_value);
                        break;
                    case 'whatsapp_max_retry_delay':
                        this.settings.whatsapp_max_retry_delay = parseInt(row.setting_value);
                        break;
                    case 'bonus_percentage':
                        this.settings.bonus_percentage = parseFloat(row.setting_value);
                        break;
                    case 'bonus_win_threshold':
                        this.settings.bonus_win_threshold = parseFloat(row.setting_value);
                        break;
                    case 'bonus_loss_threshold':
                        this.settings.bonus_loss_threshold = parseFloat(row.setting_value);
                        break;
                }
            });

            // Update retry config based on settings
            this.retryConfig = {
                maxAttempts: this.settings.whatsapp_retry_attempts,
                baseDelay: this.settings.whatsapp_retry_delay,
                maxDelay: this.settings.whatsapp_max_retry_delay,
                backoffMultiplier: 2
            };
        } catch (error) {
            console.warn('Failed to load dashboard settings (DB unreachable). Admin requests will be disabled until DB is available.');
            // Disable retry worker if DB is unavailable to avoid repeated connection errors
            this.settings.whatsapp_retry_enabled = false;
        }
    }

    // Set WebSocket server for real-time notifications
    public setWebSocketServer(wss: WebSocketServer) {
        this.wss = wss;
    }

    // Process incoming WhatsApp message with retry logic
    public async processWhatsAppMessage(message: WhatsAppMessage): Promise<AdminRequest | null> {
        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt <= this.retryConfig.maxAttempts) {
            try {
                console.log(`Processing WhatsApp message (attempt ${attempt + 1}/${this.retryConfig.maxAttempts + 1}):`, message);

                // Extract request information from message
                const requestInfo = this.extractRequestInfo(message.message, message.phone);
                
                if (!requestInfo) {
                    console.log('No valid request found in message');
                    return null;
                }

                // Create WhatsApp message record
                const whatsappMessage = await this.createWhatsAppMessage(message);
                
                // Create admin request with retry tracking
                const adminRequest = await this.createAdminRequest({
                    user_phone: message.phone,
                    request_type: requestInfo.type,
                    amount: requestInfo.amount,
                    currency: 'INR',
                    payment_method: requestInfo.payment_method,
                    utr_number: requestInfo.utr_number,
                    priority: requestInfo.priority,
                    whatsapp_message_id: whatsappMessage.id,
                    retry_count: 0
                });

                // Send real-time notification to admins
                this.sendRealTimeNotification('new_request', {
                    request: adminRequest,
                    message: whatsappMessage
                });

                return adminRequest;
            } catch (error) {
                attempt++;
                lastError = error as Error;
                console.error(`WhatsApp message processing failed (attempt ${attempt}):`, error);

                if (attempt <= this.retryConfig.maxAttempts) {
                    const delay = this.calculateRetryDelay(attempt);
                    console.log(`Retrying in ${delay} seconds...`);
                    await this.delay(delay * 1000);
                }
            }
        }

        // All attempts failed, log the error and create a failed request record
        console.error('All attempts to process WhatsApp message failed:', lastError);
        if (lastError) {
            await this.logFailedWhatsAppMessage(message, lastError);
        }
        return null;
    }

    // Calculate retry delay with exponential backoff
    private calculateRetryDelay(attempt: number): number {
        const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        return delay + Math.random() * 10;
    }

    // Delay utility function
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Log failed WhatsApp message for monitoring
    private async logFailedWhatsAppMessage(message: WhatsAppMessage, error: Error): Promise<void> {
        try {
            await this.pool.query(`
                INSERT INTO whatsapp_message_failures (
                    phone, message, error_message, error_stack, attempt_count, 
                    created_at, failure_reason
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                message.phone,
                message.message,
                error.message,
                error.stack,
                this.retryConfig.maxAttempts + 1,
                new Date().toISOString(),
                'processing_failed'
            ]);
        } catch (logError) {
            console.error('Failed to log WhatsApp message failure:', logError);
        }
    }

    // Process retry queue for failed requests
    private async processRetryQueue(): Promise<void> {
        if (!this.settings.whatsapp_retry_enabled) {
            return;
        }

        try {
            const result = await this.pool.query(`
                SELECT * FROM admin_requests 
                WHERE status = 'failed' 
                AND retry_count < $1
                AND (next_retry_at IS NULL OR next_retry_at <= NOW())
                ORDER BY created_at ASC
                LIMIT 10
            `, [this.retryConfig.maxAttempts]);

            for (const request of result.rows) {
                await this.retryFailedRequest(request);
            }
        } catch (error) {
            console.error('Failed to process retry queue:', error);
        }
    }

    // Retry a failed request
    private async retryFailedRequest(request: any): Promise<void> {
        const attempt = request.retry_count + 1;
        const delay = this.calculateRetryDelay(attempt);

        try {
            console.log(`Retrying failed request ${request.id} (attempt ${attempt})`);

            // Implement your retry logic here based on request type
            // For now, we'll just update the retry count and schedule next retry
            await this.pool.query(`
                UPDATE admin_requests 
                SET retry_count = $1,
                    last_retry_at = NOW(),
                    next_retry_at = CASE 
                        WHEN $1 < $2 THEN NOW() + INTERVAL '${delay} seconds'
                        ELSE NULL 
                    END,
                    status = CASE 
                        WHEN $1 >= $2 THEN 'permanently_failed'
                        ELSE 'failed'
                    END
                WHERE id = $3
            `, [attempt, this.retryConfig.maxAttempts, request.id]);

            if (attempt < this.retryConfig.maxAttempts) {
                this.sendRealTimeNotification('request_retry_scheduled', {
                    request_id: request.id,
                    attempt,
                    next_retry_at: new Date(Date.now() + delay * 1000)
                });
            } else {
                this.sendRealTimeNotification('request_permanently_failed', {
                    request_id: request.id,
                    attempt
                });
            }
        } catch (error) {
            console.error(`Failed to retry request ${request.id}:`, error);
        }
    }

    // Start retry worker
    private startRetryWorker(): void {
        if (!this.settings.whatsapp_retry_enabled) {
            return;
        }
        // If no database URL is configured, do not start the worker
        if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
            return;
        }

        // Process retry queue every 30 seconds
        setInterval(async () => {
            try {
                await this.processRetryQueue();
            } catch (error) {
                console.error('Retry worker error:', error);
            }
        }, 30000);
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

    // Create WhatsApp message record with error handling
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

    // Create admin request with retry tracking
    private async createAdminRequest(requestData: any): Promise<AdminRequest> {
        const query = `
            INSERT INTO admin_requests (
                user_phone, request_type, amount, currency, payment_method,
                utr_number, priority, whatsapp_message_id, status, retry_count
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
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
            requestData.whatsapp_message_id,
            0 // initial retry count
        ];
        
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    // Update request status with retry logic
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
            
            // Log the failure for monitoring
            await this.logRequestStatusFailure(requestId, adminId, status, error as Error);
            
            throw error;
        }
    }

    // Log request status update failure
    private async logRequestStatusFailure(
        requestId: string,
        adminId: string,
        status: string,
        error: Error
    ): Promise<void> {
        try {
            await this.pool.query(`
                INSERT INTO request_status_failures (
                    request_id, admin_id, attempted_status, error_message, error_stack, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                requestId,
                adminId,
                status,
                error.message,
                error.stack,
                new Date().toISOString()
            ]);
        } catch (logError) {
            console.error('Failed to log request status failure:', logError);
        }
    }

    // Update balance and process request with retry logic
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
            
            // Log the failure for monitoring
            await this.logBalanceUpdateFailure(requestId, adminId, status, error as Error);
            
            throw error;
        }
    }

    // Log balance update failure
    private async logBalanceUpdateFailure(
        requestId: string,
        adminId: string,
        status: string,
        error: Error
    ): Promise<void> {
        try {
            await this.pool.query(`
                INSERT INTO balance_update_failures (
                    request_id, admin_id, attempted_status, error_message, error_stack, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                requestId,
                adminId,
                status,
                error.message,
                error.stack,
                new Date().toISOString()
            ]);
        } catch (logError) {
            console.error('Failed to log balance update failure:', logError);
        }
    }

    // Get requests by status with retry information
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

    // Get all requests with pagination and retry information
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
        
        if (filters.retry_count) {
            whereClause += ` AND retry_count >= $${valueIndex++}`;
            values.push(filters.retry_count);
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

    // Get retry statistics for monitoring
    public async getRetryStatistics(): Promise<any> {
        const query = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_requests,
                COUNT(CASE WHEN status = 'permanently_failed' THEN 1 END) as permanently_failed_requests,
                AVG(retry_count) as avg_retry_count,
                COUNT(CASE WHEN retry_count > 0 THEN 1 END) as retried_requests
            FROM admin_requests
        `;
        
        const result = await this.pool.query(query);
        return result.rows[0];
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

    // Update dashboard settings with retry configuration
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
                case 'whatsapp_retry_enabled':
                    description = 'Enable automatic retry for failed WhatsApp messages';
                    break;
                case 'whatsapp_retry_attempts':
                    description = 'Maximum number of retry attempts for failed messages';
                    break;
                case 'whatsapp_retry_delay':
                    description = 'Base delay between retry attempts in seconds';
                    break;
                case 'whatsapp_max_retry_delay':
                    description = 'Maximum delay between retry attempts in seconds';
                    break;
                case 'bonus_percentage':
                    description = 'Deposit bonus percentage awarded on admin fund add';
                    break;
                case 'bonus_win_threshold':
                    description = 'Winning performance threshold (%) to release bonus';
                    break;
                case 'bonus_loss_threshold':
                    description = 'Losing performance threshold (%) to release bonus';
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
            if (key === 'whatsapp_retry_enabled') {
                this.settings.whatsapp_retry_enabled = value as boolean;
                this.retryConfig.maxAttempts = this.settings.whatsapp_retry_attempts;
            }
            if (key === 'whatsapp_retry_attempts') {
                this.settings.whatsapp_retry_attempts = value as number;
                this.retryConfig.maxAttempts = value as number;
            }
            if (key === 'whatsapp_retry_delay') {
                this.settings.whatsapp_retry_delay = value as number;
                this.retryConfig.baseDelay = value as number;
            }
            if (key === 'whatsapp_max_retry_delay') {
                this.settings.whatsapp_max_retry_delay = value as number;
                this.retryConfig.maxDelay = value as number;
            }
            if (key === 'bonus_percentage') this.settings.bonus_percentage = Number(value);
            if (key === 'bonus_win_threshold') this.settings.bonus_win_threshold = Number(value);
            if (key === 'bonus_loss_threshold') this.settings.bonus_loss_threshold = Number(value);
        });
        
        await Promise.all(updatePromises);
    }
}

export { EnhancedWhatsAppService, WhatsAppMessage, AdminRequest, RequestAudit, DashboardSettings };
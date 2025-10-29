// Payment Routes Module
import type { Express, Request, Response } from "express";
import {
  generalLimiter,
  apiLimiter,
  paymentLimiter,
  securityMiddleware,
  validateAdminAccess,
  auditLogger
} from '../security';
import { requireAuth } from '../auth';
import { storage } from '../storage-supabase';
import { processPayment, getTransactionHistory, applyDepositBonus, applyReferralBonus, checkConditionalBonus, applyAvailableBonus } from '../payment';

export async function registerPaymentRoutes(app: Express): Promise<void> {
  // Apply security middleware to payment routes
  app.use("/api/payment/*", securityMiddleware);
  app.use("/api/payment-requests/*", securityMiddleware);

  // Payment Processing Routes
  app.post("/api/payment/process", paymentLimiter, async (req: Request, res: Response) => {
    try {
      const { userId, amount, method, type } = req.body;
      
      // Validate required fields
      if (!userId || !amount || !method || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment parameters'
        });
      }
      
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a positive number'
        });
      }
      
      // Validate amount range based on payment type - use environment variables
      const minDeposit = parseFloat(process.env.MIN_DEPOSIT || '100');
      const maxDeposit = parseFloat(process.env.MAX_DEPOSIT || '1000000');
      const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL || '500');
      const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL || '500000');
      
      const minAmount = type === 'deposit' ? minDeposit : minWithdrawal;
      const maxAmount = type === 'deposit' ? maxDeposit : maxWithdrawal;
      
      if (numAmount < minAmount || numAmount > maxAmount) {
        return res.status(400).json({
          success: false,
          error: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} amount must be between ₹${minAmount.toLocaleString()} and ₹${maxAmount.toLocaleString()}`
        });
      }
      
      // Validate amount range based on payment type
      if (!['deposit', 'withdrawal'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment type. Must be deposit or withdrawal'
        });
      }
      
      // Verify user has permission
      if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const result = await processPayment({ userId, amount: numAmount, method, type });
      
      // If payment was successful, get updated user balance for response
      if (result.success) {
        const updatedUser = await storage.getUser(userId);
        if (updatedUser) {
          // FIXED: Remove balance updates from WebSocket entirely
          // All balance updates should now come from REST API polling
          console.log(`💰 Balance updated via REST API: ${userId} -> ${parseFloat(updatedUser.balance)} (${type})`);
          
          // Add updated balance to the result for API consumers
          // Note: PaymentResponse doesn't have a user property, so we create a new response object
          const responseWithUser = {
            ...result,
            user: {
              id: req.user!.id,
              balance: parseFloat(updatedUser.balance)
            }
          };
          res.json(responseWithUser);
          return;
        }
      }
      
      auditLogger('payment_processed', userId, { amount: numAmount, type, method: method.type });
      
      res.json(result);
    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment processing failed'
      });
    }
  });

  // Payment Request Routes (New: Request → Approval Workflow)
  app.post("/api/payment-requests", paymentLimiter, async (req: Request, res: Response) => {
    try {
      const { amount, paymentMethod, requestType } = req.body;
      
      // Validate required fields
      if (!amount || !paymentMethod || !requestType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment request parameters'
        });
      }
      
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a positive number'
        });
      }
      
      // Validate request type
      if (!['deposit', 'withdrawal'].includes(requestType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request type. Must be deposit or withdrawal'
        });
      }
      
      // Verify user is authenticated
      if (!req.user) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      // Validate amount range based on request type
      const minDeposit = parseFloat(process.env.MIN_DEPOSIT || '100');
      const maxDeposit = parseFloat(process.env.MAX_DEPOSIT || '1000000');
      const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL || '500');
      const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL || '500000');
      
      const minAmount = requestType === 'deposit' ? minDeposit : minWithdrawal;
      const maxAmount = requestType === 'deposit' ? maxDeposit : maxWithdrawal;
      
      if (numAmount < minAmount || numAmount > maxAmount) {
        return res.status(400).json({
          success: false,
          error: `${requestType === 'deposit' ? 'Deposit' : 'Withdrawal'} amount must be between ₹${minAmount.toLocaleString()} and ₹${maxAmount.toLocaleString()}`
        });
      }
      
      // Create payment request (status: 'pending')
      const result = await storage.createPaymentRequest({
        userId: req.user.id,
        type: requestType,
        amount: numAmount,
        paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : JSON.stringify(paymentMethod),
        status: 'pending'
      });
      
      // Optionally send WhatsApp notification to admin
      try {
        const { sendWhatsAppRequest } = await import('../whatsapp-service');
        await sendWhatsAppRequest({
          userId: req.user!.id,
          userPhone: req.user!.phone || req.user!.username || 'unknown',
          requestType: requestType.toUpperCase(),
          message: `New ${requestType} request for ₹${numAmount.toLocaleString('en-IN')} from ${req.user!.phone || req.user!.username || 'unknown'}`,
          amount: numAmount,
          isUrgent: false,
          metadata: { requestId: result.id }
        });
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp notification:', whatsappError);
        // Don't fail the request if WhatsApp notification fails
      }
      
      // Audit log
      auditLogger('payment_request_created', req.user.id, { 
        requestId: result.id, 
        type: requestType, 
        amount: numAmount 
      });
      
      res.json({
        success: true,
        message: `${requestType} request submitted successfully. Awaiting admin approval.`,
        requestId: result.id,
        data: result
      });
    } catch (error) {
      console.error('Payment request creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment request creation failed'
      });
    }
  });

  // Get user's payment requests
  app.get("/api/payment-requests", apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const requests = await storage.getPaymentRequestsByUser(req.user.id);
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Payment requests retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment requests retrieval failed'
      });
    }
  });

  // Admin: Get pending payment requests
  app.get("/api/admin/payment-requests/pending", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getPendingPaymentRequests();
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Pending payment requests retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Pending payment requests retrieval failed'
      });
    }
  });

  // Admin: Approve payment request
  app.patch("/api/admin/payment-requests/:id/approve", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get the request to verify it exists and is pending
      const request = await storage.getPaymentRequest(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Payment request not found'
        });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Request is not in pending status'
        });
      }
      
      // Approve the payment request (atomic operation)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      await storage.approvePaymentRequest(id, request.user_id, request.amount, req.user.id);
      
      // FIXED: Remove balance updates from WebSocket entirely
      // All balance updates should now come from REST API polling
      console.log(`💰 Payment request approved via REST API: ${request.user_id} -> ${request.amount} (${request.request_type})`);
      
      // Audit log
      if (req.user) {
        auditLogger('payment_request_approved', req.user.id, {
          requestId: id,
          userId: request.user_id,
          amount: request.amount
        });
      }
      
      res.json({
        success: true,
        message: 'Payment request approved successfully'
      });
    } catch (error) {
      console.error('Payment request approval error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment request approval failed'
      });
    }
  });

  // Admin: Reject payment request
  app.patch("/api/admin/payment-requests/:id/reject", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get the request to verify it exists and is pending
      const request = await storage.getPaymentRequest(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Payment request not found'
        });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Request is not in pending status'
        });
      }
      
      // Update the payment request status to rejected
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      await storage.updatePaymentRequest(id, 'rejected', req.user.id);
      
      // Audit log
      if (req.user) {
        auditLogger('payment_request_rejected', req.user.id, {
          requestId: id,
          userId: request.user_id,
          amount: request.amount
        });
      }
      
      res.json({
        success: true,
        message: 'Payment request rejected successfully'
      });
    } catch (error) {
      console.error('Payment request rejection error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment request rejection failed'
      });
    }
  });

  // Payment History Route
  app.get("/api/payment/history/:userId", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { type, status, fromDate, toDate } = req.query;
      
      if (!req.user || (req.user.id !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const filters: any = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (fromDate) filters.fromDate = new Date(fromDate as string);
      if (toDate) filters.toDate = new Date(toDate as string);
      
      const result = await getTransactionHistory(userId, filters);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Transaction history error:', error);
      res.status(500).json({
        success: false,
        error: 'Transaction history retrieval failed'
      });
    }
  });

  // Bonus Information Route
  app.get("/api/user/bonus-info", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const bonusInfo = await storage.getUserBonusInfo(userId);
      
      res.json({
        success: true,
        data: bonusInfo
      });
    } catch (error) {
      console.error('Bonus info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bonus information'
      });
    }
  });

  // Claim Bonus Route
  app.post("/api/user/claim-bonus", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await applyAvailableBonus(userId);
      
      if (result) {
        auditLogger('bonus_claimed', userId, { timestamp: new Date().toISOString() });
        res.json({
          success: true,
          message: 'Bonus successfully claimed and added to your balance'
        });
      } else {
        res.json({
          success: false,
          error: 'No bonus available to claim'
        });
      }
    } catch (error) {
      console.error('Claim bonus error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to claim bonus'
      });
    }
  });

  // Referral Data Route
  app.get("/api/user/referral-data", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Get user's referral code and statistics
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Get user's referred users
      const referredUsers = await storage.getUserReferrals(userId);
      
      // Calculate referral statistics
      const totalReferrals = referredUsers.length;
      const totalDepositsFromReferrals = referredUsers.reduce((sum, referral) =>
        sum + (parseFloat(referral.depositAmount || '0') || 0), 0
      );
      const totalBonusEarned = referredUsers.reduce((sum, referral) =>
        sum + (parseFloat(referral.bonusAmount || '0') || 0), 0
      );
      const activeReferrals = referredUsers.filter(referral =>
        referral.bonusApplied
      ).length;

      const referralData = {
        referralCode: user.referral_code_generated,
        totalReferrals,
        activeReferrals,
        totalDepositsFromReferrals,
        totalBonusEarned,
        referredUsers: referredUsers.map(referral => ({
          id: referral.referredUserId,
          phone: '', // Would need to fetch user details separately
          fullName: '', // Would need to fetch user details separately
          depositAmount: parseFloat(referral.depositAmount || '0') || 0,
          bonusAmount: parseFloat(referral.bonusAmount || '0') || 0,
          bonusApplied: referral.bonusApplied,
          createdAt: referral.createdAt
        }))
      };

      res.json({
        success: true,
        data: referralData
      });
    } catch (error) {
      console.error('Get referral data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve referral data'
      });
    }
  });
}
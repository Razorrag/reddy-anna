import { Request, Response } from 'express';
import { storage } from '../storage-supabase';

export const getGameHistory = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = await storage.getGameHistory(limit);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPendingPaymentRequests = async (req: Request, res: Response) => {
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
      error: 'Failed to retrieve payment requests'
    });
  }
};

export const approvePaymentRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Get the request to verify it exists and is pending
    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Payment request not found'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot approve request with status: ${request.status}`
      });
    }
    
    // Approve the payment request
    if (request.request_type === 'deposit') {
      // Use atomic function for deposits (includes bonus)
      const result = await storage.approvePaymentRequestAtomic(
        requestId,
        request.user_id,
        parseFloat(request.amount),
        req.user.id
      );
      
      return res.json({
        success: true,
        message: 'Payment request approved successfully',
        balance: result.balance,
        bonusAmount: result.bonusAmount
      });
    } else {
      // For withdrawals, use regular approval
      await storage.approvePaymentRequest(
        requestId,
        request.user_id,
        parseFloat(request.amount),
        req.user.id
      );
      
      const updatedUser = await storage.getUser(request.user_id);
      
      return res.json({
        success: true,
        message: 'Withdrawal request approved successfully',
        balance: updatedUser?.balance || 0
      });
    }
  } catch (error: any) {
    console.error('Approve payment request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve payment request'
    });
  }
};

export const rejectPaymentRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Get the request to verify it exists
    const request = await storage.getPaymentRequest(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Payment request not found'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot reject request with status: ${request.status}`
      });
    }
    
    // Get user balance before refund (for transaction logging)
    const user = await storage.getUser(request.user_id);
    const balanceBefore = user ? parseFloat(user.balance) : 0;
    
    // If withdrawal, refund the amount
    if (request.request_type === 'withdrawal') {
      try {
        const amount = parseFloat(request.amount);
        const newBalance = await storage.addBalanceAtomic(request.user_id, amount);
        console.log(`💰 Refunded withdrawal amount: User ${request.user_id}, Amount: ₹${amount}`);
        
        // ✅ CRITICAL: Create transaction record with payment_request_id link
        try {
          await storage.addTransaction({
            userId: request.user_id,
            transactionType: 'refund',
            amount: amount,
            balanceBefore: balanceBefore,
            balanceAfter: newBalance,
            referenceId: `withdrawal_rejected_${requestId}`,
            description: `Withdrawal rejected - ₹${amount} refunded. Reason: ${reason || 'No reason provided'}`,
            paymentRequestId: requestId
          });
        } catch (txError: any) {
          // ✅ FIX: Don't fail rejection if transaction logging fails
          console.warn('⚠️ Transaction logging failed (non-critical):', txError.message);
        }
      } catch (refundError) {
        console.error('Failed to refund withdrawal amount:', refundError);
        return res.status(500).json({
          success: false,
          error: 'Failed to refund withdrawal amount'
        });
      }
    }
    
    // Update the request status to rejected (with audit trail)
    const previousStatus = request.status;
    await storage.updatePaymentRequest(requestId, 'rejected', req.user.id, previousStatus);
    
    res.json({
      success: true,
      message: 'Payment request rejected successfully'
    });
  } catch (error: any) {
    console.error('Reject payment request error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject payment request'
    });
  }
};
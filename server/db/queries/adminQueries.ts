
import { storage } from '../../storage-supabase';

export const getPendingPaymentRequests = async () => {
  return await storage.getPendingPaymentRequests();
};

export const approvePaymentRequest = async (requestId: string) => {
  const request = await storage.getPaymentRequest(requestId);
  if (!request) {
    return { success: false, error: 'Payment request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'Request is not pending' };
  }

  const requestType = request.request_type || (request as any).type;
  
  // Update payment request status
  await storage.updatePaymentRequest(requestId, 'approved');
  
  // Handle balance and bonus based on request type
  if (requestType === 'deposit') {
    // Add to balance
    await storage.updateUserBalance(request.user_id, request.amount);
    
    // Apply deposit bonus automatically
    try {
      const { applyDepositBonus } = await import('../../payment');
      await applyDepositBonus(request.user_id, request.amount);
      console.log(`✅ Deposit bonus applied for user ${request.user_id} on deposit of ₹${request.amount}`);
    } catch (bonusError) {
      console.error('⚠️ Failed to apply deposit bonus:', bonusError);
      // Don't fail approval if bonus fails
    }
  } else if (requestType === 'withdrawal') {
    // Subtract from balance (amount is positive)
    await storage.updateUserBalance(request.user_id, -request.amount);
  }

  return { success: true, message: 'Payment request approved', bonusApplied: requestType === 'deposit' };
};

export const rejectPaymentRequest = async (requestId: string) => {
  const request = await storage.getPaymentRequest(requestId);
  if (!request) {
    return { success: false, error: 'Payment request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'Request is not pending' };
  }

  // Update request status
  await storage.updatePaymentRequest(requestId, 'rejected');

  return { success: true, message: 'Payment request rejected' };
};

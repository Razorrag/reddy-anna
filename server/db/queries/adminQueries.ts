
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

  // Update user balance
  await storage.updateUserBalance(request.user_id, request.amount);

  // Update request status
  await storage.updatePaymentRequest(requestId, 'approved');

  return { success: true, message: 'Payment request approved' };
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

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
  // TODO: Implement this
  res.status(501).json({ success: false, error: 'Not implemented' });
};

export const approvePaymentRequest = async (req: Request, res: Response) => {
  // TODO: Implement this
  res.status(501).json({ success: false, error: 'Not implemented' });
};

export const rejectPaymentRequest = async (req: Request, res: Response) => {
  // TODO: Implement this
  res.status(501).json({ success: false, error: 'Not implemented' });
};
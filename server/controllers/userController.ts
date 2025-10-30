
import { Request, Response } from 'express';
import { storage } from '../storage-supabase';

export const getUserBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, balance: user.balance });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

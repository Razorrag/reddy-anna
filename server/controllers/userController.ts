import { Request, Response } from 'express';
import { storage } from '../storage-supabase';

export const getUserBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const balance = await storage.getUserBalance(userId);
    res.json({ success: true, balance });
  } catch (error) {
    console.error('Get user balance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getLastGameBets = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const lastGame = await storage.getLastCompletedGame();
    if (!lastGame) {
      return res.json({ success: true, bets: [] });
    }

    const bets = await storage.getBetsForUser(userId, lastGame.game_id);
    res.json({ success: true, bets });
  } catch (error) {
    console.error('Get last game bets error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
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

export const undoLastBet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get current game session
    const currentGame = await storage.getCurrentGameSession();
    if (!currentGame) {
      return res.status(404).json({
        success: false,
        error: 'No active game session found'
      });
    }

    // 🔒 SECURITY: Only allow bet cancellation during betting phase
    if (currentGame.phase !== 'betting') {
      return res.status(400).json({
        success: false,
        error: `Cannot undo bets after betting phase. Current phase: ${currentGame.phase}`
      });
    }

    // Get user's bets for current game
    const userBets = await storage.getBetsForUser(userId, currentGame.game_id);
    
    // Filter active bets (not cancelled)
    const activeBets = userBets.filter(bet => bet.status !== 'cancelled');
    
    if (activeBets.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active bets found to undo'
      });
    }

    // Find the most recent bet (sort by created_at descending)
    activeBets.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    const lastBet = activeBets[0];
    const betId = lastBet.id;
    const betAmount = parseFloat(lastBet.amount);

    // Refund the bet amount to user's balance
    const newBalance = await storage.addBalanceAtomic(userId, betAmount);

    // Update bet status to cancelled in database
    await storage.updateBetDetails(betId, {
      status: 'cancelled'
    });

    // Update the current game state in memory
    const currentGameState = (global as any).currentGameState;
    if (currentGameState && currentGameState.userBets && currentGameState.userBets.has(userId)) {
      const userBetsState = currentGameState.userBets.get(userId)!;
      const side = lastBet.side as 'andar' | 'bahar';
      const round = parseInt(lastBet.round);
      
      if (round === 1) {
        userBetsState.round1[side] -= betAmount;
        currentGameState.round1Bets[side] -= betAmount;
      } else {
        userBetsState.round2[side] -= betAmount;
        currentGameState.round2Bets[side] -= betAmount;
      }
    }

    // Broadcast cancellation to all clients
    const broadcast = (global as any).broadcast;
    if (typeof broadcast === 'function') {
      broadcast({
        type: 'bet_cancelled',
        data: {
          betId,
          userId,
          side: lastBet.side,
          amount: betAmount,
          round: lastBet.round,
          cancelledBy: userId,
          newBalance: newBalance
        }
      });
    }

    res.json({
      success: true,
      message: 'Bet undone successfully. Amount refunded to your balance.',
      data: {
        betId,
        refundedAmount: betAmount,
        newBalance,
        side: lastBet.side,
        round: lastBet.round
      }
    });
  } catch (error) {
    console.error('Undo bet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to undo bet'
    });
  }
};
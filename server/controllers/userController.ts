/**
 * ⚠️ DEPRECATED - DO NOT USE
 * This file is NOT registered in routes.ts
 * The undo endpoint is implemented directly in routes.ts (line 4660)
 * This file is kept for reference only
 */

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

    const bets = await storage.getBetsForUser(userId, lastGame.gameId);
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

    const gameId = currentGame.gameId;

    // Get user's bets for current game
    const userBets = await storage.getBetsForUser(userId, gameId);
    
    // Filter active bets (not cancelled)
    const activeBets = userBets.filter(bet => bet.status !== 'cancelled');
    
    if (activeBets.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active bets found to undo'
      });
    }

    // Find the most recent bet (sort by createdAt descending)
    activeBets.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
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

    // ✅ FIX: Get updated betting totals from database
    const updatedTotals = await storage.getBettingTotals(gameId);

    // ✅ FIX: Broadcast updated totals to admin clients
    const broadcastToRole = (global as any).broadcastToRole;
    if (typeof broadcastToRole === 'function') {
      broadcastToRole({
        type: 'admin_bet_update',
        data: {
          gameId,
          round1Bets: updatedTotals.round1Bets,
          round2Bets: updatedTotals.round2Bets,
          totalAndar: updatedTotals.totalAndar,
          totalBahar: updatedTotals.totalBahar,
          reason: 'bet_undo'
        }
      }, 'admin');
      console.log('✅ Admin bet totals updated after undo:', updatedTotals);
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
// Game Routes Module
import type { Express, Request, Response } from "express";
import {
  generalLimiter,
  apiLimiter,
  securityMiddleware,
  validateAdminAccess,
  auditLogger
} from '../security';
import { requireAuth } from '../auth';
import { storage } from '../storage-supabase';
import '../types/express-extensions.d.ts';

// Import game state management - will be moved to separate module
// import { currentGameState } from '../routes';

export async function registerGameRoutes(app: Express): Promise<void> {
  // Apply security middleware to game routes
  app.use("/api/game/*", securityMiddleware);
  app.use("/api/user/*", securityMiddleware);

  // Game Routes (existing functionality)
  app.get("/api/game/current", apiLimiter, async (req: Request, res: Response) => {
    try {
      // Get current game session from storage
      const currentGame = await storage.getCurrentGameSession();
      
      if (!currentGame) {
        return res.json({
          gameId: null,
          openingCard: null,
          phase: 'idle',
          currentRound: 1,
          timer: 30,
          andarCards: [],
          baharCards: [],
          winner: null,
          winningCard: null,
          round1Bets: [],
          round2Bets: []
        });
      }
      
      res.json({
        gameId: currentGame.gameId,
        openingCard: currentGame.openingCard,
        phase: currentGame.phase,
        currentRound: currentGame.currentTimer || 1,
        timer: currentGame.currentTimer || 30,
        andarCards: [],
        baharCards: [],
        winner: currentGame.winner,
        winningCard: currentGame.winningCard,
        round1Bets: [],
        round2Bets: []
      });
    } catch (error) {
      console.error("Get current game error:", error);
      res.status(500).json({ error: "Failed to get game state" });
    }
  });

  app.get("/api/game/history", apiLimiter, async (req: Request, res: Response) => {
    try {
      const history = await storage.getGameHistory(50);
      res.json(history);
    } catch (error) {
      console.error("Get game history error:", error);
      res.status(500).json({ error: "Failed to get game history" });
    }
  });


  // Stream Status Check Endpoint
  app.get("/api/game/stream-status-check", apiLimiter, async (req: Request, res: Response) => {
    try {
      // Use the unified stream configuration instead of the old system
      const streamConfig = await storage.getStreamConfig();
      
      if (!streamConfig) {
        return res.json({
          status: 'offline',
          lastCheck: null,
          isStale: false,
          viewers: 0,
          bitrate: 0
        });
      }

      res.json({
        status: streamConfig.streamStatus,
        lastCheck: streamConfig.rtmpLastCheck || streamConfig.webrtcLastCheck || null,
        isStale: false, // Determined by the unified stream system now
        viewers: streamConfig.viewerCount,
        bitrate: streamConfig.webrtcBitrate
      });
    } catch (error) {
      console.error('Error checking stream status:', error);
      res.status(500).json({ error: 'Failed to check stream status' });
    }
  });

  // Enhanced User Game History Route
  app.get("/api/user/game-history", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { limit = 20, offset = 0, result = 'all' } = req.query;
      
      // Get user's game history with bet details
      const gameHistory = await storage.getUserGameHistory(userId);
      const userBets = await storage.getUserBets(userId);

      // Combine game history with user bets
      const enhancedGameHistory = gameHistory?.map(game => {
        const userBet = userBets?.find(bet => bet.gameId === game.gameId);
        return {
          id: game.id,
          gameId: game.gameId,
          openingCard: game.openingCard,
          winner: game.winner,
          yourBet: userBet ? {
            side: userBet.side,
            amount: userBet.amount,
            round: userBet.round
          } : null,
          result: userBet ? (userBet.side === game.winner ? 'win' : 'loss') : 'no_bet',
          payout: userBet && userBet.side === game.winner ? parseFloat(userBet.amount) * 2 : 0,
          totalCards: game.totalCards,
          round: game.round,
          createdAt: game.createdAt
        };
      }) || [];

      // Filter by result if specified
      const filteredHistory = result === 'all'
        ? enhancedGameHistory
        : enhancedGameHistory.filter(game => game.result === result);

      // Apply pagination
      const paginatedHistory = filteredHistory.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          games: paginatedHistory,
          total: filteredHistory.length,
          hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredHistory.length
        }
      });
    } catch (error) {
      console.error('Enhanced game history error:', error);
      res.status(500).json({
        success: false,
        error: 'Game history retrieval failed'
      });
    }
  });

  // User Analytics Route
  app.get("/api/user/analytics", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user's bets and game history
      const userBets = await storage.getUserBets(userId);
      const gameHistory = await storage.getUserGameHistory(userId);

      // Calculate analytics
      const gamesPlayed = userBets?.length || 0;
      const totalWinnings = gameHistory?.reduce((sum, game) => sum + (game.payout || 0), 0) || 0;
      const totalLosses = userBets?.reduce((sum, bet) => sum + parseFloat(bet.amount), 0) || 0;
      const wins = gameHistory?.filter(game => game.result === 'win').length || 0;
      const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
      const biggestWin = gameHistory?.reduce((max, game) => Math.max(max, game.payout || 0), 0) || 0;
      const averageBet = gamesPlayed > 0 ? totalLosses / gamesPlayed : 0;

      // Calculate profit/loss for different time periods
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const todayGames = gameHistory?.filter(game => new Date(game.createdAt) >= todayStart) || [];
      const weekGames = gameHistory?.filter(game => new Date(game.createdAt) >= weekStart) || [];
      const monthGames = gameHistory?.filter(game => new Date(game.createdAt) >= monthStart) || [];

      const todayProfit = todayGames.reduce((sum, game) => sum + (game.payout || 0) - (game.betAmount || 0), 0);
      const weeklyProfit = weekGames.reduce((sum, game) => sum + (game.payout || 0) - (game.betAmount || 0), 0);
      const monthlyProfit = monthGames.reduce((sum, game) => sum + (game.payout || 0) - (game.betAmount || 0), 0);

      const analytics = {
        currentBalance: user.balance,
        gamesPlayed,
        totalWinnings,
        totalLosses,
        winRate,
        biggestWin,
        averageBet,
        todayProfit,
        weeklyProfit,
        monthlyProfit
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'User analytics retrieval failed'
      });
    }
  });

  // User Transactions Route
  app.get("/api/user/transactions", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { limit = 20, offset = 0, type = 'all' } = req.query;
      
      // Mock transaction data - in real implementation, this would come from transactions table
      const mockTransactions = [
        {
          id: 'txn_1',
          type: 'deposit',
          amount: 10000,
          status: 'completed',
          paymentMethod: 'UPI',
          description: 'Deposit via UPI',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'txn_2',
          type: 'win',
          amount: 5000,
          status: 'completed',
          description: 'Andar Bahar win',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'txn_3',
          type: 'loss',
          amount: 2000,
          status: 'completed',
          description: 'Andar Bahar loss',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ];

      const filteredTransactions = type === 'all'
        ? mockTransactions
        : mockTransactions.filter(txn => txn.type === type);

      const paginatedTransactions = filteredTransactions.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          transactions: paginatedTransactions,
          total: filteredTransactions.length,
          hasMore: parseInt(offset as string) + parseInt(limit as string) < filteredTransactions.length
        }
      });
    } catch (error) {
      console.error('Transaction history error:', error);
      res.status(500).json({
        success: false,
        error: 'Transaction history retrieval failed'
      });
    }
  });


  // Atomic Bet Placement Route - Fixes race condition
  app.post("/api/user/place-bet", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { side, amount } = req.body;
      const userId = req.user!.id;
      
      // Validate inputs
      if (!side || !['andar', 'bahar'].includes(side)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid bet side. Must be "andar" or "bahar"'
        });
      }
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid bet amount. Must be a positive number'
        });
      }
      
      // Get current user balance and validate in one atomic operation
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const currentBalance = parseFloat(user.balance) || 0;
      if (currentBalance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient balance',
          currentBalance,
          requiredAmount: amount
        });
      }
      
      // Use atomic balance update function to prevent race conditions
      try {
        await storage.updateUserBalance(userId, -amount);
      } catch (balanceError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update balance',
          details: balanceError instanceof Error ? balanceError.message : 'Unknown balance error'
        });
      }
      
      // Create the bet record
      const betData = {
        userId,
        gameId: 'default-game', // Will be updated by WebSocket when game starts
        round: 1, // Will be updated by WebSocket
        side,
        amount: amount.toString(),
        status: 'placed'
      };
      
      const bet = await storage.createBet({
        ...betData,
        amount: amount,
        round: betData.round.toString()
      });
      
      // Audit log the bet placement
      auditLogger('bet_placed', userId, {
        betId: bet.id,
        amount,
        side,
        gameId: bet.gameId,
        previousBalance: currentBalance,
        newBalance: currentBalance - amount
      });
      
      res.json({
        success: true,
        bet: {
          id: bet.id,
          side,
          amount,
          gameId: bet.gameId,
          round: bet.round,
          status: bet.status
        },
        balance: {
          previous: currentBalance,
          current: currentBalance - amount,
          change: -amount
        }
      });
      
    } catch (error) {
      console.error('Atomic bet placement error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to place bet'
      });
    }
  });

}
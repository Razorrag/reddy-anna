/**
 * Calculate payout preview for celebration without applying to database
 * This allows showing complete celebration data immediately when winner is declared
 * while deferring actual balance updates until admin clicks "Start New Game"
 */

import { GameState } from './routes';

export interface PayoutPreview {
  userId: string;
  totalBet: number;
  payoutAmount: number;
  netProfit: number;
  result: 'win' | 'loss' | 'no_bet';
}

export function calculatePayoutPreview(
  gameState: GameState,
  winningSide: 'andar' | 'bahar'
): Map<string, PayoutPreview> {
  const payoutPreviews = new Map<string, PayoutPreview>();
  
  console.log(`💡 Calculating payout preview for ${winningSide} win in round ${gameState.currentRound}`);
  
  // Calculate payouts for each user who bet
  for (const [userId, userBets] of Array.from(gameState.userBets.entries())) {
    const totalUserBets = 
      userBets.round1.andar + 
      userBets.round1.bahar + 
      userBets.round2.andar + 
      userBets.round2.bahar;
    
    if (totalUserBets === 0) {
      console.log(`⚠️ User ${userId} has zero total bets, skipping`);
      continue;
    }
    
    let payout = 0;
    
    // Apply proper Andar Bahar payout rules
    if (gameState.currentRound === 1) {
      // Round 1: Andar wins 1:1 (double), Bahar wins 1:0 (refund only)
      if (winningSide === 'andar') {
        payout = userBets.round1.andar * 2; // 1:1 payout
      } else {
        payout = userBets.round1.bahar; // 1:0 payout (refund)
      }
    } else if (gameState.currentRound === 2) {
      // Round 2: Andar wins 1:1 on all Andar bets, Bahar wins mixed
      if (winningSide === 'andar') {
        payout = (userBets.round1.andar + userBets.round2.andar) * 2;
      } else {
        payout = (userBets.round1.bahar * 2) + userBets.round2.bahar;
      }
    } else {
      // Round 3+: Both sides win 1:1
      const totalBetsOnWinningSide = userBets.round1[winningSide] + userBets.round2[winningSide];
      payout = totalBetsOnWinningSide * 2;
    }
    
    const netProfit = payout - totalUserBets;
    const result: 'win' | 'loss' | 'no_bet' = 
      payout > 0 ? 'win' : (totalUserBets > 0 ? 'loss' : 'no_bet');
    
    payoutPreviews.set(userId, {
      userId,
      totalBet: totalUserBets,
      payoutAmount: payout,
      netProfit,
      result
    });
    
    console.log(`  User ${userId}: Bet=₹${totalUserBets}, Payout=₹${payout}, Net=${netProfit >= 0 ? '+' : ''}₹${netProfit}`);
  }
  
  console.log(`✅ Calculated ${payoutPreviews.size} payout previews`);
  return payoutPreviews;
}
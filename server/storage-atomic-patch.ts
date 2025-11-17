/**
 * ============================================
 * STORAGE LAYER - ATOMIC OPERATIONS PATCH
 * ============================================
 * 
 * This file contains the new atomic operation methods to add to storage-supabase.ts
 * Add these methods to the SupabaseStorage class in storage-supabase.ts
 */

import { supabaseServer } from './lib/supabaseServer';

/**
 * Check if game has already been completed (idempotency check)
 */
async checkGameCompleted(gameId: string): Promise<boolean> {
  const { data, error } = await supabaseServer
    .rpc('check_game_completed', {
      p_game_id: gameId
    });
  
  if (error) {
    console.error('Error checking game completion:', error);
    return false;
  }
  
  return data === true;
}

/**
 * Get payout multiplier for a round (from database function)
 */
async getPayoutMultiplier(round: number): Promise<number> {
  const { data, error } = await supabaseServer
    .rpc('get_payout_multiplier', {
      p_round: round
    });
  
  if (error) {
    console.error('Error getting payout multiplier:', error);
    // Fallback to hardcoded values
    switch (round) {
      case 1: return 1.9;
      case 2: return 1.75;
      default: return 1.0;
    }
  }
  
  return parseFloat(data) || 1.0;
}

/**
 * Apply payouts atomically using database RPC function
 * Returns results for each payout
 */
async applyPayoutsAtomic(
  payouts: Array<{ userId: string; amount: number }>,
  winningBetIds: string[],
  losingBetIds: string[]
): Promise<Array<{
  user_id: string;
  old_balance: number;
  new_balance: number;
  payout_amount: number;
  success: boolean;
  error_message: string | null;
}>> {
  try {
    // Convert payouts to JSONB format
    const payoutsJson = payouts.map(p => ({
      userId: p.userId,
      amount: p.amount
    }));
    
    const { data, error } = await supabaseServer
      .rpc('apply_payouts_atomic', {
        p_payouts: payoutsJson,
        p_winning_bets: winningBetIds,
        p_losing_bets: losingBetIds
      });
    
    if (error) {
      console.error('Error in apply_payouts_atomic:', error);
      throw new Error(`Atomic payout failed: ${error.message}`);
    }
    
    // Map results
    return (data || []).map((row: any) => ({
      user_id: row.user_id,
      old_balance: parseFloat(row.old_balance || '0'),
      new_balance: parseFloat(row.new_balance || '0'),
      payout_amount: parseFloat(row.payout_amount || '0'),
      success: row.success === true,
      error_message: row.error_message || null
    }));
  } catch (error) {
    console.error('Exception in applyPayoutsAtomic:', error);
    throw error;
  }
}

/**
 * INSTRUCTIONS TO INTEGRATE:
 * 
 * 1. Open server/storage-supabase.ts
 * 2. Find the IStorage interface definition
 * 3. Add these method signatures to the interface:
 * 
 *    checkGameCompleted(gameId: string): Promise<boolean>;
 *    getPayoutMultiplier(round: number): Promise<number>;
 *    applyPayoutsAtomic(
 *      payouts: Array<{ userId: string; amount: number }>,
 *      winningBetIds: string[],
 *      losingBetIds: string[]
 *    ): Promise<Array<{
 *      user_id: string;
 *      old_balance: number;
 *      new_balance: number;
 *      payout_amount: number;
 *      success: boolean;
 *      error_message: string | null;
 *    }>>;
 * 
 * 4. Copy the three method implementations above into the SupabaseStorage class
 * 5. Run the database migration: scripts/MASTER_FIX_DATABASE.sql
 * 6. Test the implementation
 */

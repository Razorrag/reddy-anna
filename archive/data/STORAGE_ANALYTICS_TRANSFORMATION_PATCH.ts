/**
 * PATCH FOR server/storage-supabase.ts
 * 
 * This file contains the updated analytics methods with proper transformations.
 * Apply these changes to the existing methods in storage-supabase.ts
 */

// Add this import at the top of the file (around line 10-20)
import { transformStatistics, type StatisticsData } from './utils/data-transformers';

// ============================================================================
// REPLACE getAllTimeStatistics method (around line 5635)
// ============================================================================
async getAllTimeStatistics(): Promise<StatisticsData> {
  try {
    const { data, error } = await supabaseServer
      .from('daily_game_statistics')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching all-time statistics:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return transformStatistics(null);
    }

    // Aggregate all daily statistics for all-time totals
    const totals = data.reduce(
      (acc, row) => ({
        total_games: acc.total_games + (Number(row.total_games) || 0),
        total_bets: acc.total_bets + (Number(row.total_bets) || 0),
        total_payouts: acc.total_payouts + (Number(row.total_payouts) || 0),
        total_revenue: acc.total_revenue + (Number(row.total_revenue) || 0),
        unique_players: Math.max(acc.unique_players, Number(row.unique_players) || 0),
      }),
      { total_games: 0, total_bets: 0, total_payouts: 0, total_revenue: 0, unique_players: 0 }
    );

    return transformStatistics(totals);
  } catch (error) {
    console.error('Error in getAllTimeStatistics:', error);
    return transformStatistics(null);
  }
}

// ============================================================================
// REPLACE getDailyStatistics method (around line 5684)
// ============================================================================
async getDailyStatistics(): Promise<StatisticsData> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabaseServer
      .from('daily_game_statistics')
      .select('*')
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - that's ok, return zeros
      console.error('Error fetching daily statistics:', error);
      throw error;
    }

    return transformStatistics(data);
  } catch (error) {
    console.error('Error in getDailyStatistics:', error);
    return transformStatistics(null);
  }
}

// ============================================================================
// REPLACE getMonthlyStatistics method (around line 5719)
// ============================================================================
async getMonthlyStatistics(): Promise<StatisticsData> {
  try {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const { data, error } = await supabaseServer
      .from('monthly_game_statistics')
      .select('*')
      .eq('month_year', monthYear)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching monthly statistics:', error);
      throw error;
    }

    return transformStatistics(data);
  } catch (error) {
    console.error('Error in getMonthlyStatistics:', error);
    return transformStatistics(null);
  }
}

// ============================================================================
// REPLACE getYearlyStatistics method (around line 5757)
// ============================================================================
async getYearlyStatistics(): Promise<StatisticsData> {
  try {
    const year = new Date().getFullYear();
    
    const { data, error } = await supabaseServer
      .from('yearly_game_statistics')
      .select('*')
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching yearly statistics:', error);
      throw error;
    }

    return transformStatistics(data);
  } catch (error) {
    console.error('Error in getYearlyStatistics:', error);
    return transformStatistics(null);
  }
}

// ============================================================================
// ADD NEW METHOD: getRealtimeGameStats (add after getYearlyStatistics)
// ============================================================================
async getRealtimeGameStats(): Promise<any> {
  try {
    // Call the database function we created
    const { data, error } = await supabaseServer
      .rpc('get_realtime_game_stats');

    if (error) {
      console.error('Error fetching realtime game stats:', error);
      throw error;
    }

    return data || { currentGame: null };
  } catch (error) {
    console.error('Error in getRealtimeGameStats:', error);
    return { currentGame: null };
  }
}

// ============================================================================
// ADD NEW METHOD: getUserReferralData (add after getRealtimeGameStats)
// ============================================================================
async getUserReferralData(userId: number): Promise<any> {
  try {
    // Get user's referral code
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user referral code:', userError);
      throw userError;
    }

    const referralCode = userData?.referral_code;

    if (!referralCode) {
      return {
        referral_code: null,
        total_referrals: 0,
        active_referrals: 0,
        total_earnings: 0,
        pending_earnings: 0,
        referred_users: [],
      };
    }

    // Get referred users
    const { data: referredUsers, error: referredError } = await supabaseServer
      .from('users')
      .select('id, username, created_at')
      .eq('referred_by', referralCode);

    if (referredError) {
      console.error('Error fetching referred users:', referredError);
      throw referredError;
    }

    // Get referral bonuses
    const { data: bonuses, error: bonusError } = await supabaseServer
      .from('bonus_transactions')
      .select('amount, status')
      .eq('user_id', userId)
      .eq('transaction_type', 'referral_bonus');

    if (bonusError) {
      console.error('Error fetching referral bonuses:', bonusError);
    }

    const totalEarnings = bonuses
      ?.filter((b: any) => b.status === 'completed')
      .reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) || 0;

    const pendingEarnings = bonuses
      ?.filter((b: any) => b.status === 'pending')
      .reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) || 0;

    return {
      referral_code: referralCode,
      total_referrals: referredUsers?.length || 0,
      active_referrals: referredUsers?.length || 0,
      total_earnings: totalEarnings,
      pending_earnings: pendingEarnings,
      referred_users: (referredUsers || []).map((user: any) => ({
        username: user.username,
        status: 'active',
        earned_amount: 0, // Could calculate from bonuses if needed
        joined_at: user.created_at,
      })),
    };
  } catch (error) {
    console.error('Error in getUserReferralData:', error);
    return {
      referral_code: null,
      total_referrals: 0,
      active_referrals: 0,
      total_earnings: 0,
      pending_earnings: 0,
      referred_users: [],
    };
  }
}
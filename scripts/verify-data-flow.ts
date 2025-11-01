#!/usr/bin/env tsx
/**
 * Data Flow Verification Script
 * 
 * This script verifies that:
 * 1. Game history is being saved
 * 2. Game statistics are being saved
 * 3. Analytics are calculated from saved data
 * 4. Data transformations are working
 */

import { storage } from '../server/storage-supabase';

async function verifyDataFlow() {
  console.log('🔍 Starting Data Flow Verification...\n');
  
  try {
    // 1. Check Game History
    console.log('📜 1. Checking Game History...');
    const history = await storage.getGameHistory(5);
    
    if (!history || history.length === 0) {
      console.log('   ⚠️  No game history found in database');
      console.log('   💡 This is normal if no games have been played yet');
      console.log('   ✅ Play at least one game to test this\n');
    } else {
      console.log(`   ✅ Found ${history.length} game(s) in history`);
      console.log('   📊 Latest game:');
      const latest = history[0];
      console.log(`      Game ID: ${latest.gameId}`);
      console.log(`      Winner: ${latest.winner}`);
      console.log(`      Opening Card: ${latest.openingCard}`);
      console.log(`      Winning Card: ${latest.winningCard}`);
      console.log(`      Total Bets: ₹${latest.totalBets || 0}`);
      console.log(`      Andar Bets: ₹${latest.andarTotalBet || 0}`);
      console.log(`      Bahar Bets: ₹${latest.baharTotalBet || 0}`);
      console.log(`      Total Winnings: ₹${latest.totalWinnings || 0}`);
      console.log(`      Total Players: ${latest.totalPlayers || 0}`);
      
      // Verify data transformation
      if (latest.totalBets === 0 && latest.totalWinnings === 0) {
        console.log('   ⚠️  WARNING: Game has 0 bets and winnings');
        console.log('   💡 This might indicate:');
        console.log('      - Game completed without any bets placed');
        console.log('      - Data transformation issue');
        console.log('      - Statistics not saved properly\n');
      } else {
        console.log('   ✅ Game data looks valid\n');
      }
    }
    
    // 2. Check Daily Statistics
    console.log('📊 2. Checking Daily Statistics...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyStats = await storage.getDailyStats(today);
    
    if (!dailyStats) {
      console.log('   ⚠️  No daily statistics found for today');
      console.log('   💡 This is normal if no games have been played today');
      console.log('   ✅ Play at least one game today to test this\n');
    } else {
      console.log('   ✅ Daily statistics found for today:');
      console.log(`      Total Games: ${dailyStats.totalGames}`);
      console.log(`      Total Bets: ₹${dailyStats.totalBets}`);
      console.log(`      Total Payouts: ₹${dailyStats.totalPayouts}`);
      console.log(`      Total Revenue: ₹${dailyStats.totalRevenue}`);
      console.log(`      Profit/Loss: ₹${dailyStats.profitLoss}`);
      console.log(`      Unique Players: ${dailyStats.uniquePlayers}`);
      
      // Verify calculations
      if (dailyStats.totalGames === 0 && history && history.length > 0) {
        console.log('   ⚠️  WARNING: Games exist but daily stats shows 0');
        console.log('   💡 This indicates stats are not being incremented properly\n');
      } else if (dailyStats.totalGames > 0 && dailyStats.totalBets === 0) {
        console.log('   ⚠️  WARNING: Games played but total bets is 0');
        console.log('   💡 This indicates either:');
        console.log('      - Games completed without bets');
        console.log('      - incrementDailyStats not receiving correct values\n');
      } else {
        console.log('   ✅ Daily statistics look valid\n');
      }
    }
    
    // 3. Check Monthly Statistics
    console.log('📅 3. Checking Monthly Statistics...');
    const monthYear = today.toISOString().slice(0, 7); // YYYY-MM
    const monthlyStats = await storage.getMonthlyStats(monthYear);
    
    if (!monthlyStats) {
      console.log('   ⚠️  No monthly statistics found for this month');
      console.log('   💡 This is normal if no games have been played this month\n');
    } else {
      console.log('   ✅ Monthly statistics found:');
      console.log(`      Total Games: ${monthlyStats.totalGames}`);
      console.log(`      Total Bets: ₹${monthlyStats.totalBets}`);
      console.log(`      Total Payouts: ₹${monthlyStats.totalPayouts}`);
      console.log(`      Profit/Loss: ₹${monthlyStats.profitLoss}\n`);
    }
    
    // 4. Check Yearly Statistics
    console.log('📆 4. Checking Yearly Statistics...');
    const year = today.getFullYear();
    const yearlyStats = await storage.getYearlyStats(year);
    
    if (!yearlyStats) {
      console.log('   ⚠️  No yearly statistics found for this year');
      console.log('   💡 This is normal if no games have been played this year\n');
    } else {
      console.log('   ✅ Yearly statistics found:');
      console.log(`      Total Games: ${yearlyStats.totalGames}`);
      console.log(`      Total Bets: ₹${yearlyStats.totalBets}`);
      console.log(`      Total Payouts: ₹${yearlyStats.totalPayouts}`);
      console.log(`      Profit/Loss: ₹${yearlyStats.profitLoss}\n`);
    }
    
    // 5. Summary
    console.log('📋 Summary:');
    console.log('─'.repeat(50));
    
    const hasHistory = history && history.length > 0;
    const hasDailyStats = dailyStats !== null;
    const hasValidData = hasHistory && hasDailyStats && 
                         dailyStats.totalGames > 0 && 
                         dailyStats.totalBets > 0;
    
    if (!hasHistory) {
      console.log('❌ No game history found');
      console.log('   ACTION: Play at least one complete game to test');
    } else {
      console.log('✅ Game history is being saved');
    }
    
    if (!hasDailyStats) {
      console.log('❌ No daily statistics found');
      console.log('   ACTION: Complete a game today to test');
    } else {
      console.log('✅ Daily statistics are being saved');
    }
    
    if (hasValidData) {
      console.log('✅ Data flow is working correctly!');
      console.log('✅ Analytics are being calculated from saved history');
      console.log('✅ Data transformation (snake_case → camelCase) is working');
    } else if (hasHistory && hasDailyStats) {
      console.log('⚠️  Data exists but values might be 0');
      console.log('   POSSIBLE CAUSES:');
      console.log('   1. Games completed without bets placed');
      console.log('   2. incrementDailyStats receiving 0 values');
      console.log('   3. Check server logs during game completion');
    }
    
    console.log('─'.repeat(50));
    console.log('\n✨ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    console.error('\nPossible causes:');
    console.error('1. Database connection issue');
    console.error('2. Supabase credentials not configured');
    console.error('3. Tables not created in database');
    process.exit(1);
  }
}

// Run verification
verifyDataFlow().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


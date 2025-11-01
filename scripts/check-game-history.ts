#!/usr/bin/env tsx
/**
 * Check Game History in Database
 * 
 * This script checks if game history is actually being saved to the database
 */

import { storage } from '../server/storage-supabase';

async function checkGameHistory() {
  console.log('🔍 Checking Game History in Database...\n');
  
  try {
    // Check game history table directly
    console.log('📊 Fetching game history records...');
    const history = await storage.getGameHistory(50);
    
    console.log(`\n✅ Found ${history.length} game history record(s)\n`);
    
    if (history.length === 0) {
      console.log('⚠️  WARNING: No game history found in database!');
      console.log('\nPossible reasons:');
      console.log('1. No games have been completed yet');
      console.log('2. gameId is "default-game" (test mode - not saved)');
      console.log('3. gameId is null/undefined when game completes');
      console.log('4. Database connection issue');
      console.log('5. Error during saveGameHistory() call\n');
      
      console.log('💡 To test:');
      console.log('   - Complete a real game (not test mode)');
      console.log('   - Check server logs for "✅ Game history saved:" or "⚠️ Error saving game history:"');
      console.log('   - Verify gameId is NOT "default-game" when game completes\n');
    } else {
      console.log('📋 Recent Game History (last 10):');
      console.log('─'.repeat(80));
      
      history.slice(0, 10).forEach((game, index) => {
        console.log(`\nGame #${index + 1}:`);
        console.log(`  ID: ${game.id}`);
        console.log(`  Game ID: ${game.gameId}`);
        console.log(`  Winner: ${game.winner?.toUpperCase() || 'N/A'}`);
        console.log(`  Opening Card: ${game.openingCard || 'N/A'}`);
        console.log(`  Winning Card: ${game.winningCard || 'N/A'}`);
        console.log(`  Round: ${game.round || 'N/A'}`);
        console.log(`  Total Cards: ${game.totalCards || 'N/A'}`);
        console.log(`  Total Bets: ₹${game.totalBets || 0}`);
        console.log(`  Andar Bets: ₹${game.andarTotalBet || 0}`);
        console.log(`  Bahar Bets: ₹${game.baharTotalBet || 0}`);
        console.log(`  Total Players: ${game.totalPlayers || 0}`);
        console.log(`  Created At: ${game.createdAt || 'N/A'}`);
      });
      
      console.log('\n' + '─'.repeat(80));
    }
    
    // Check game_statistics table (should have matching records)
    console.log('\n📊 Checking game_statistics table...');
    const statsCheck = await storage.getGameStatisticsByDateRange(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      new Date()
    );
    
    console.log(`Found ${statsCheck.length} game statistics record(s) in last 7 days\n`);
    
    if (statsCheck.length === 0 && history.length > 0) {
      console.log('⚠️  WARNING: Game history exists but no statistics found!');
      console.log('   This might indicate statistics are not being saved properly.\n');
    } else if (statsCheck.length > 0 && history.length === 0) {
      console.log('⚠️  WARNING: Statistics exist but no history found!');
      console.log('   This might indicate history is not being saved properly.\n');
    } else if (statsCheck.length === history.length) {
      console.log('✅ History and statistics counts match - data looks consistent!\n');
    }
    
    // Summary
    console.log('📋 Summary:');
    console.log('─'.repeat(80));
    console.log(`Game History Records: ${history.length}`);
    console.log(`Game Statistics Records (7 days): ${statsCheck.length}`);
    
    if (history.length === 0) {
      console.log('\n❌ NO GAME HISTORY FOUND');
      console.log('   Action: Complete at least one real game (not test mode)');
      console.log('   Then run this script again to verify saving works.');
    } else {
      console.log('\n✅ Game history IS being saved!');
      console.log('   The issue might be:');
      console.log('   1. Frontend not fetching correctly');
      console.log('   2. API endpoint returning wrong format');
      console.log('   3. Frontend filtering out all results');
    }
    
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error('❌ Error checking game history:', error);
    console.error('\nPossible causes:');
    console.error('1. Database connection failed');
    console.error('2. game_history table does not exist');
    console.error('3. Permission issues');
    console.error('4. Supabase credentials not configured');
    process.exit(1);
  }
}

// Run check
checkGameHistory().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});











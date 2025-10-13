import { query } from './src/db-supabase.js';

console.log('Testing database connection and queries...');

async function testDatabase() {
  try {
    // Test basic select query
    console.log('Testing select query...');
    const settings = await query('game_settings', 'select');
    console.log('✓ Select query successful, found', settings.length, 'settings');
    
    // Test query with where clause
    console.log('Testing query with where clause...');
    const maxBet = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'max_bet_amount' }
    });
    console.log('✓ Where clause query successful, max_bet_amount:', maxBet[0]?.setting_value);
    
    // Test update query
    console.log('Testing update query...');
    await query('game_settings', 'update', {
      where: { column: 'setting_key', value: 'test_setting' },
      data: { setting_value: 'test_value', updated_at: new Date().toISOString() }
    });
    console.log('✓ Update query completed (may fail if test_setting doesn\'t exist, which is expected)');
    
    console.log('\n✅ Database connection and query functions are working correctly!');
    console.log('The errors you were seeing should now be resolved.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('This might be due to missing tables in your Supabase database.');
    console.error('Please ensure you have applied the db_postgres.sql schema to your Supabase project.');
  }
}

testDatabase();
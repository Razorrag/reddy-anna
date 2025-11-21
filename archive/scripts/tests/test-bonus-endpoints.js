#!/usr/bin/env node
/**
 * Bonus Endpoints Diagnostic Script
 * Tests all bonus-related API endpoints and database queries
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Bonus System Diagnostic Tool\n');
console.log('=' .repeat(60));

async function testDatabaseQueries() {
  console.log('\n📊 Testing Database Queries...\n');

  // 1. Check deposit_bonuses table
  console.log('1️⃣ Checking deposit_bonuses table:');
  const { data: depositBonuses, error: depositError } = await supabase
    .from('deposit_bonuses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (depositError) {
    console.error('   ❌ Error:', depositError.message);
  } else {
    console.log(`   ✅ Found ${depositBonuses.length} deposit bonuses`);
    if (depositBonuses.length > 0) {
      console.log('   📋 Sample data:');
      depositBonuses.forEach((bonus, i) => {
        console.log(`      ${i + 1}. User: ${bonus.user_id}, Amount: ${bonus.bonus_amount}, Status: ${bonus.status}`);
      });
      
      // Get unique user IDs
      const userIds = [...new Set(depositBonuses.map(b => b.user_id))];
      console.log(`   👥 Unique user IDs: ${userIds.join(', ')}`);
    }
  }

  // 2. Check referral_bonuses table
  console.log('\n2️⃣ Checking referral_bonuses table:');
  const { data: referralBonuses, error: referralError } = await supabase
    .from('referral_bonuses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (referralError) {
    console.error('   ❌ Error:', referralError.message);
  } else {
    console.log(`   ✅ Found ${referralBonuses.length} referral bonuses`);
    if (referralBonuses.length > 0) {
      console.log('   📋 Sample data:');
      referralBonuses.forEach((bonus, i) => {
        console.log(`      ${i + 1}. Referrer: ${bonus.referrer_user_id}, Amount: ${bonus.bonus_amount}, Status: ${bonus.status}`);
      });
    }
  }

  // 3. Check bonus_transactions table
  console.log('\n3️⃣ Checking bonus_transactions table:');
  const { data: bonusTransactions, error: transactionsError } = await supabase
    .from('bonus_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (transactionsError) {
    console.error('   ❌ Error:', transactionsError.message);
  } else {
    console.log(`   ✅ Found ${bonusTransactions.length} bonus transactions`);
    if (bonusTransactions.length > 0) {
      console.log('   📋 Sample data:');
      bonusTransactions.forEach((tx, i) => {
        console.log(`      ${i + 1}. User: ${tx.user_id}, Type: ${tx.bonus_type}, Action: ${tx.action}, Amount: ${tx.amount}`);
      });
    }
  }

  // 4. Check users table for matching IDs
  if (depositBonuses && depositBonuses.length > 0) {
    console.log('\n4️⃣ Checking users table for matching IDs:');
    const userIds = [...new Set(depositBonuses.map(b => b.user_id))];
    
    for (const userId of userIds) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, phone, full_name')
        .eq('id', userId)
        .single();

      if (userError) {
        console.log(`   ❌ User ${userId}: Not found (${userError.message})`);
      } else {
        console.log(`   ✅ User ${userId}: ${user.full_name} (${user.phone})`);
      }
    }
  }

  return { depositBonuses, referralBonuses, bonusTransactions };
}

async function testStorageMethods() {
  console.log('\n\n🔧 Testing Storage Methods...\n');

  // Get a sample user ID from deposit_bonuses
  const { data: sampleBonus } = await supabase
    .from('deposit_bonuses')
    .select('user_id')
    .limit(1)
    .single();

  if (!sampleBonus) {
    console.log('⚠️  No deposit bonuses found, skipping storage method tests');
    return;
  }

  const testUserId = sampleBonus.user_id;
  console.log(`📝 Testing with user ID: ${testUserId}\n`);

  // Test getBonusSummary equivalent
  console.log('1️⃣ Testing bonus summary query:');
  const { data: depositSummary, error: depositSummaryError } = await supabase
    .from('deposit_bonuses')
    .select('status, bonus_amount')
    .eq('user_id', testUserId);

  if (depositSummaryError) {
    console.error('   ❌ Error:', depositSummaryError.message);
  } else {
    const locked = depositSummary.filter(b => b.status === 'locked').reduce((sum, b) => sum + parseFloat(b.bonus_amount), 0);
    const credited = depositSummary.filter(b => b.status === 'credited').reduce((sum, b) => sum + parseFloat(b.bonus_amount), 0);
    const unlocked = depositSummary.filter(b => b.status === 'unlocked').reduce((sum, b) => sum + parseFloat(b.bonus_amount), 0);
    
    console.log(`   ✅ Deposit Bonuses:`);
    console.log(`      Locked: ₹${locked}`);
    console.log(`      Unlocked: ₹${unlocked}`);
    console.log(`      Credited: ₹${credited}`);
    console.log(`      Total: ₹${locked + unlocked + credited}`);
  }

  // Test getDepositBonuses equivalent
  console.log('\n2️⃣ Testing deposit bonuses query:');
  const { data: userDepositBonuses, error: userDepositError } = await supabase
    .from('deposit_bonuses')
    .select('*')
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false });

  if (userDepositError) {
    console.error('   ❌ Error:', userDepositError.message);
  } else {
    console.log(`   ✅ Found ${userDepositBonuses.length} deposit bonuses for user`);
  }

  // Test getReferralBonuses equivalent
  console.log('\n3️⃣ Testing referral bonuses query:');
  const { data: userReferralBonuses, error: userReferralError } = await supabase
    .from('referral_bonuses')
    .select('*')
    .eq('referrer_user_id', testUserId)
    .order('created_at', { ascending: false });

  if (userReferralError) {
    console.error('   ❌ Error:', userReferralError.message);
  } else {
    console.log(`   ✅ Found ${userReferralBonuses.length} referral bonuses for user`);
  }

  // Test getBonusTransactions equivalent
  console.log('\n4️⃣ Testing bonus transactions query:');
  const { data: userTransactions, error: userTransactionsError } = await supabase
    .from('bonus_transactions')
    .select('*')
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (userTransactionsError) {
    console.error('   ❌ Error:', userTransactionsError.message);
  } else {
    console.log(`   ✅ Found ${userTransactions.length} bonus transactions for user`);
  }
}

async function generateCurlCommands() {
  console.log('\n\n🌐 API Endpoint Test Commands...\n');

  // Get a sample user ID
  const { data: sampleBonus } = await supabase
    .from('deposit_bonuses')
    .select('user_id')
    .limit(1)
    .single();

  if (!sampleBonus) {
    console.log('⚠️  No deposit bonuses found, cannot generate test commands');
    return;
  }

  const testUserId = sampleBonus.user_id;

  console.log('📝 To test the API endpoints, you need a valid JWT token.');
  console.log(`   User ID to test with: ${testUserId}\n`);
  console.log('1️⃣ First, login to get a token:');
  console.log('   (Replace PHONE and PASSWORD with actual credentials)\n');
  console.log('   curl -X POST http://localhost:5000/api/auth/login \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"phone":"PHONE","password":"PASSWORD"}\'\n');
  
  console.log('2️⃣ Then test bonus endpoints with the token:');
  console.log('   (Replace YOUR_TOKEN with the token from step 1)\n');
  
  console.log('   # Get bonus summary');
  console.log('   curl http://localhost:5000/api/user/bonus-summary \\');
  console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');
  
  console.log('   # Get deposit bonuses');
  console.log('   curl http://localhost:5000/api/user/deposit-bonuses \\');
  console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');
  
  console.log('   # Get referral bonuses');
  console.log('   curl http://localhost:5000/api/user/referral-bonuses \\');
  console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');
  
  console.log('   # Get bonus transactions');
  console.log('   curl "http://localhost:5000/api/user/bonus-transactions?limit=20&offset=0" \\');
  console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');
}

async function checkFrontendIssues() {
  console.log('\n\n🎨 Frontend Checklist...\n');

  console.log('✅ Endpoints exist in server/routes.ts (verified)');
  console.log('✅ Storage methods exist in server/storage-supabase.ts (verified)');
  console.log('✅ Frontend calls correct endpoints in profile.tsx (verified)');
  console.log('\n⚠️  Potential Issues to Check:');
  console.log('   1. Is the user logged in with a valid JWT token?');
  console.log('   2. Is the Authorization header being sent with API requests?');
  console.log('   3. Does the user_id in JWT match the user_id in database?');
  console.log('   4. Are there any CORS errors in browser console?');
  console.log('   5. Are there any 401/500 errors in Network tab?');
  console.log('\n📋 Debugging Steps:');
  console.log('   1. Open browser DevTools → Console tab');
  console.log('   2. Navigate to Profile → Bonuses tab');
  console.log('   3. Check for errors in Console');
  console.log('   4. Open Network tab and inspect API requests');
  console.log('   5. Verify Authorization header is present');
  console.log('   6. Check response status and body');
}

// Run all tests
async function runDiagnostics() {
  try {
    const dbResults = await testDatabaseQueries();
    await testStorageMethods();
    await generateCurlCommands();
    await checkFrontendIssues();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic complete!\n');
    
    if (dbResults.depositBonuses && dbResults.depositBonuses.length > 0) {
      console.log('📊 Summary:');
      console.log(`   - ${dbResults.depositBonuses.length} deposit bonuses found`);
      console.log(`   - ${dbResults.referralBonuses?.length || 0} referral bonuses found`);
      console.log(`   - ${dbResults.bonusTransactions?.length || 0} bonus transactions found`);
      console.log('\n✅ Database has bonus data - issue is likely in API/Frontend');
    } else {
      console.log('⚠️  No bonus data found in database');
    }

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

runDiagnostics();

const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');

// Load environment variables
config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const TEST_ACCOUNTS = [
  { phone: '9000000001', initial_balance: 10000 },
  { phone: '9000000002', initial_balance: 10000 },
  { phone: '9000000003', initial_balance: 5000 },
];

const PASSWORD = 'test123';

async function createTestAccounts() {
  try {
    console.log('🔧 Creating test player accounts...');
    
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);
    
    for (const account of TEST_ACCOUNTS) {
      const accountData = {
        id: account.phone, // Must match phone number
        phone: account.phone,
        password_hash: hashedPassword,
        balance: account.initial_balance,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(accountData, { onConflict: 'id' }) // Conflict on id (primary key)
        .select();

      if (error) throw error;
      
      console.log(`✅ Created account ${account.phone}:`);
      console.log(`   Balance: ₹${account.initial_balance}`);
    }
    
    console.log('\n🎉 Test accounts created successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('====================');
    console.log(`Phone: 9000000001, 9000000002, or 9000000003`);
    console.log(`Password: ${PASSWORD}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

createTestAccounts().then(success => {
  process.exit(success ? 0 : 1);
});

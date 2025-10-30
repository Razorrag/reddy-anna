const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');

// Load environment variables from the root directory
const currentDir = __dirname;
config({ path: path.resolve(currentDir, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Use the same configuration as the working storage implementation
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const fetchOptions = {
        ...options,
        signal: controller.signal,
        // Add retry logic at the fetch level if needed
      };
      
      return fetch(url, fetchOptions).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  },
  auth: {
    // Add auth timeout
    persistSession: true,
    detectSessionInUrl: false,
  }
});

async function fixPlayerPasswords() {
  try {
    console.log('🔧 Fixing player account passwords with proper bcrypt hashes...');
    
    // Generate proper bcrypt hashes for the password "test"
    const password = 'test';
    console.log('Generating bcrypt hash for password:', password);
    const hashedPassword = await bcrypt.hash(password, 12);
    
    console.log('Generated hash:', hashedPassword);
    console.log('Hash length:', hashedPassword.length);
    
    // Update both player accounts with proper bcrypt hashes
    console.log('📝 Updating player accounts with proper password hashes...');
    
    // Update Player One (phone: 1111111111)
    const { data: data1, error: error1 } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('phone', '1111111111')
      .select('id, phone, password_hash');
    
    if (error1) {
      console.error('❌ Error updating Player One:', error1.message);
      return false;
    }
    
    console.log('✅ Player One password updated:');
    console.log('  ID:', data1[0].id);
    console.log('  Phone:', data1[0].phone);
    console.log('  Hash updated successfully');
    
    // Update Player Two (phone: 2222222222)
    const { data: data2, error: error2 } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('phone', '2222222222')
      .select('id, phone, password_hash');
    
    if (error2) {
      console.error('❌ Error updating Player Two:', error2.message);
      return false;
    }
    
    console.log('✅ Player Two password updated:');
    console.log('  ID:', data2[0].id);
    console.log('  Phone:', data2[0].phone);
    console.log('  Hash updated successfully');
    
    console.log('\n🎉 Both player account passwords have been fixed!');
    console.log('\n📝 Player Account Credentials (now working):');
    console.log('==============================================');
    console.log('Player One:');
    console.log('  Phone: 1111111111');
    console.log('  Password: test');
    console.log('  Balance: ₹10,000');
    console.log('');
    console.log('Player Two:');
    console.log('  Phone: 2222222222');
    console.log('  Password: test');
    console.log('  Balance: ₹10,000');
    console.log('');
    console.log('✅ Both accounts should now be able to login successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Run the password fix
fixPlayerPasswords().then(success => {
  process.exit(success ? 0 : 1);
});
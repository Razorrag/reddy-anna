const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminCredentials() {
  try {
    console.log('Checking admin_credentials table...');
    
    const { data: adminData, error: adminError } = await supabase
      .from('admin_credentials')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (adminError) {
      console.error('Error getting admin from admin_credentials:', adminError);
      
      // Try to create admin with correct password
      console.log('Attempting to create admin user...');
      const bcrypt = require('bcrypt');
      const password = 'Admin@123'; // From schema
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const { data: insertData, error: insertError } = await supabase
        .from('admin_credentials')
        .insert({
          username: 'admin',
          password_hash: hashedPassword,
          role: 'admin'
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating admin:', insertError);
      } else {
        console.log('Admin created successfully:', insertData);
      }
    } else {
      console.log('Admin found in admin_credentials:', {
        id: adminData.id,
        username: adminData.username,
        role: adminData.role,
        hasPasswordHash: !!adminData.password_hash,
        passwordHashPrefix: adminData.password_hash ? adminData.password_hash.substring(0, 20) + '...' : 'none'
      });
      
      // Test password validation
      const bcrypt = require('bcrypt');
      const testPasswords = ['admin123', 'Admin@123', 'admin'];
      
      for (const testPwd of testPasswords) {
        const isValid = await bcrypt.compare(testPwd, adminData.password_hash);
        console.log(`Password test "${testPwd}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAdminCredentials();
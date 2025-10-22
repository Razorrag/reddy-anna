import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAdminUser() {
  try {
    console.log('Debugging admin user...');
    
    // Get user by email
    const { data: emailData, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@example.com')
      .single();
    
    if (emailError) {
      console.error('Error getting user by email:', emailError);
    } else {
      console.log('User by email:', emailData);
    }
    
    // Get user by username
    const { data: usernameData, error: usernameError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin@example.com')
      .single();
    
    if (usernameError) {
      console.error('Error getting user by username:', usernameError);
    } else {
      console.log('User by username:', usernameData);
    }
    
    // Check if username field is different from email
    if (emailData && usernameData) {
      console.log('Email field:', emailData.email);
      console.log('Username field:', usernameData.username);
      console.log('Password hash field:', emailData.password_hash);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugAdminUser();

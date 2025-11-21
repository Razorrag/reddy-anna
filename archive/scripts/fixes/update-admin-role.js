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

async function updateAdminRole() {
  try {
    console.log('Updating admin user role...');
    
    // Update the admin user's role
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', 'admin@example.com')
      .select();
    
    if (error) {
      console.error('Error updating user role:', error);
      return;
    }
    
    console.log('Admin user updated successfully:', data);
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@example.com')
      .single();
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }
    
    console.log('Verification - User details:', verifyData);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

updateAdminRole();

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetAdminPassword() {
  try {
    const username = 'admin';
    const password = 'admin123'; // Change this to your desired password
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('🔐 Updating admin password...');
    
    // Update admin_credentials table
    const { data, error } = await supabase
      .from('admin_credentials')
      .update({ password_hash: hashedPassword })
      .eq('username', username)
      .select();
    
    if (error) {
      console.error('❌ Error updating password:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('Username:', username);
      console.log('Password:', password);
      console.log('Hash:', hashedPassword);
    } else {
      console.log('⚠️ No admin found, creating new admin...');
      
      // Create new admin
      const { data: newAdmin, error: createError } = await supabase
        .from('admin_credentials')
        .insert({
          username: username,
          password_hash: hashedPassword,
          role: 'admin'
        })
        .select();
      
      if (createError) {
        console.error('❌ Error creating admin:', createError);
        return;
      }
      
      console.log('✅ New admin created successfully!');
      console.log('Username:', username);
      console.log('Password:', password);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetAdminPassword();

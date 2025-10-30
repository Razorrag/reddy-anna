import { supabaseServer } from './server/lib/supabaseServer.js';

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password...');
    
    // The correct hash from database-setup.sql
    const correctHash = '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW';
    
    // Update the admin password
    const { data, error } = await supabaseServer
      .from('admin_credentials')
      .update({ password_hash: correctHash })
      .eq('username', 'admin')
      .select()
      .single();
    
    if (error) {
      console.log('❌ Error updating admin password:', error.message);
      return;
    }
    
    console.log('✅ Admin password updated successfully!');
    console.log('Admin ID:', data.id);
    console.log('Username:', data.username);
    console.log('Role:', data.role);
    
    // Test the new hash
    console.log('\n🔍 Testing the new password hash...');
    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.default.compare('admin123', data.password_hash);
    
    if (isValid) {
      console.log('✅ Password hash is valid! Admin login should now work with username "admin" and password "admin123"');
    } else {
      console.log('❌ Password hash is still invalid');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAdminPassword();
import { supabaseServer } from './server/lib/supabaseServer.js';
import bcrypt from 'bcrypt';

async function testAdminVerification() {
  try {
    console.log('🔍 Testing admin verification...\n');

    // Test the correct hash from database-setup.sql
    const correctHash = '$2b$12$Vc738883Bz.Rn6y4N5pP.eNl93jBQ.aJ5sXK3v3jVcQFpNQ7vZ5XW';
    console.log('Testing correct hash with "admin123":');
    const correctMatch = await bcrypt.compare('admin123', correctHash);
    console.log('✓ Correct hash match:', correctMatch);

    // Get current admin from database
    const { data: admin, error } = await supabaseServer
      .from('admin_credentials')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (error) {
      console.log('❌ Error fetching admin:', error.message);
      return;
    }

    if (!admin) {
      console.log('❌ No admin found in database');
      return;
    }

    console.log('\n📋 Current admin record:');
    console.log('- ID:', admin.id);
    console.log('- Username:', admin.username);
    console.log('- Role:', admin.role);
    console.log('- Password hash:', admin.password_hash);
    console.log('- Hash matches correct one:', admin.password_hash === correctHash);

    // Test current hash
    const currentMatch = await bcrypt.compare('admin123', admin.password_hash);
    console.log('- Current hash matches "admin123":', currentMatch);

    if (!currentMatch) {
      console.log('\n🔧 Fixing admin password hash...');
      const { data: updatedAdmin, error: updateError } = await supabaseServer
        .from('admin_credentials')
        .update({ password_hash: correctHash })
        .eq('username', 'admin')
        .select()
        .single();

      if (updateError) {
        console.log('❌ Error updating admin:', updateError.message);
        return;
      }

      console.log('✅ Admin password hash updated successfully');
      
      // Test the fix
      const fixedMatch = await bcrypt.compare('admin123', updatedAdmin.password_hash);
      console.log('✓ Fixed hash matches "admin123":', fixedMatch);
    } else {
      console.log('\n✅ Admin password is already correct');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAdminVerification();
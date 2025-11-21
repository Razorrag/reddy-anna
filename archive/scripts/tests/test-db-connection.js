import { createClient } from '@supabase/supabase-js';

// Test Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('📡 Testing connection to stream_settings table...');
    
    const { data, error } = await supabase
      .from('stream_settings')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error querying stream_settings:', error);
      return;
    }

    console.log('✅ Successfully connected to stream_settings');
    console.log('📊 Current settings:', data);

    // Test inserting a setting
    console.log('📝 Testing insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('stream_settings')
      .upsert({
        setting_key: 'test_connection',
        setting_value: 'working_' + Date.now(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting test setting:', insertError);
    } else {
      console.log('✅ Insert test successful:', insertData);
    }

    // Test querying the test setting
    const { data: testData, error: testError } = await supabase
      .from('stream_settings')
      .select('*')
      .eq('setting_key', 'test_connection')
      .single();

    if (testError) {
      console.error('❌ Error querying test setting:', testError);
    } else {
      console.log('✅ Query test successful:', testData);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection();

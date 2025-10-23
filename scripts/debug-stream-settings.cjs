const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugStreamSettings() {
  try {
    console.log('🔍 Debugging stream settings...');
    
    // Get raw data from database
    const { data, error } = await supabase
      .from('stream_settings')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching data:', error);
      return;
    }
    
    console.log('📊 Raw data from database:');
    console.log(JSON.stringify(data, null, 2));
    
    // Convert to expected format
    const settingsObj = {};
    (data || []).forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });
    
    console.log('\n🔄 Mapped settings object:');
    console.log(JSON.stringify(settingsObj, null, 2));
    
    // Check specific keys
    console.log('\n🔑 Checking specific keys:');
    console.log('restream_rtmp_url:', settingsObj.restream_rtmp_url);
    console.log('restream_stream_key:', settingsObj.restream_stream_key);
    console.log('stream_title:', settingsObj.stream_title);
    console.log('stream_status:', settingsObj.stream_status);
    
    // Simulate what the endpoint should return
    const response = {
      restreamRtmpUrl: settingsObj.restream_rtmp_url || '',
      restreamStreamKey: settingsObj.restream_stream_key || '',
      streamTitle: settingsObj.stream_title || 'Andar Bahar Live',
      streamStatus: settingsObj.stream_status || 'offline'
    };
    
    console.log('\n📤 Expected response:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugStreamSettings();

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateStreamSettings() {
  try {
    console.log('🔄 Updating stream settings with user credentials...');
    
    // Your specific RTMP credentials
    const settings = [
      {
        setting_key: 'restream_rtmp_url',
        setting_value: 'rtmp://live.restream.io/live'
      },
      {
        setting_key: 'restream_stream_key',
        setting_value: 're_10541509_eventd4960ba1734c49369fc0d114295801a0'
      },
      {
        setting_key: 'stream_title',
        setting_value: 'Andar Bahar Live Game'
      },
      {
        setting_key: 'stream_status',
        setting_value: 'offline'
      }
    ];

    for (const setting of settings) {
      console.log(`📝 Updating ${setting.setting_key}...`);
      
      const { data, error } = await supabase
        .from('stream_settings')
        .upsert({
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error(`❌ Error updating ${setting.setting_key}:`, error);
      } else {
        console.log(`✅ Successfully updated ${setting.setting_key}`);
      }
    }

    console.log('\n🎉 Stream settings update complete!');
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('stream_settings')
      .select('*')
      .in('setting_key', ['restream_rtmp_url', 'restream_stream_key', 'stream_title']);

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError);
    } else {
      console.log('✅ Current stream settings:');
      verifyData.forEach(setting => {
        console.log(`   ${setting.setting_key}: ${setting.setting_value}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateStreamSettings();

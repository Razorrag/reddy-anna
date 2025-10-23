/**
 * Configure Restream.io Live Stream Settings
 * 
 * This script updates the database with Restream credentials
 * RTMP URL: rtmp://live.restream.io/live
 * Stream Key: re_10541509_eventd4960ba1734c49369fc0d114295801a0
 */

import { supabaseServer } from '../server/lib/supabaseServer';

async function configureRestream() {
  console.log('🎥 Configuring Restream.io settings...\n');

  const settings = [
    { key: 'restream_rtmp_url', value: 'rtmp://live.restream.io/live' },
    { key: 'restream_stream_key', value: 're_10541509_eventd4960ba1734c49369fc0d114295801a0' },
    { key: 'stream_title', value: 'Andar Bahar Live' },
    { key: 'stream_status', value: 'live' },
  ];

  for (const setting of settings) {
    console.log(`📝 Setting ${setting.key}...`);
    
    const { error } = await supabaseServer
      .from('stream_settings')
      .upsert({
        setting_key: setting.key,
        setting_value: setting.value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error(`❌ Error setting ${setting.key}:`, error);
    } else {
      const displayValue = setting.key === 'restream_stream_key' 
        ? 're_10541509_event***' 
        : setting.value;
      console.log(`✅ ${setting.key} = ${displayValue}`);
    }
  }

  console.log('\n✅ Restream.io configured successfully!');
  console.log('🎥 RTMP URL: rtmp://live.restream.io/live');
  console.log('🔑 Stream Key: re_10541509_event***');
  console.log('📺 Player URL: https://player.restream.io?token=re_10541509_event...');
  console.log('\n🚀 Start streaming from OBS to see it on your frontend!');
}

configureRestream()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Configuration failed:', error);
    process.exit(1);
  });

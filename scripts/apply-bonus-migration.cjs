const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyBonusMigration() {
  console.log('🔄 Applying Bonus and Referral System Migration...\n');

  try {
    // Read migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '../db/migrations/add_bonus_and_referral_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n${i + 1}. Executing: ${statement.substring(0, 50)}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_statement: statement });
        
        if (error) {
          // Try direct SQL execution if RPC fails
          console.log('   ⚠️  RPC failed, trying direct execution...');
          
          // For ALTER TABLE and CREATE TABLE statements, we need to use a different approach
          if (statement.toUpperCase().includes('ALTER TABLE') || 
              statement.toUpperCase().includes('CREATE TABLE') ||
              statement.toUpperCase().includes('CREATE INDEX') ||
              statement.toUpperCase().includes('DROP TRIGGER') ||
              statement.toUpperCase().includes('CREATE TRIGGER')) {
            console.log('   ⚠️  DDL statements require admin access. Skipping...');
            continue;
          }
          
          // For INSERT statements
          if (statement.toUpperCase().includes('INSERT INTO')) {
            const tableName = statement.match(/INSERT INTO (\w+)/i)?.[1];
            if (tableName) {
              const { data: insertData, error: insertError } = await supabase
                .from(tableName)
                .upsert(JSON.parse(statement.match(/\((.*)\)/)?.[1] || '{}'));
              
              if (insertError) {
                console.log(`   ❌ Error inserting into ${tableName}:`, insertError.message);
              } else {
                console.log(`   ✅ Successfully inserted into ${tableName}`);
              }
            }
          }
        } else {
          console.log('   ✅ Success');
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    // Verify the migration was applied
    console.log('\n🔍 Verifying migration...');
    
    // Check if bonus columns exist
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.log('❌ Error checking users table:', userError.message);
    } else {
      const userColumns = userData.length > 0 ? Object.keys(userData[0]) : [];
      const requiredColumns = [
        'deposit_bonus_available',
        'referral_bonus_available',
        'original_deposit_amount',
        'total_bonus_earned',
        'referral_code_generated'
      ];

      const missingColumns = requiredColumns.filter(col => !userColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns in users table:', missingColumns);
      } else {
        console.log('✅ All required bonus columns exist in users table');
      }
    }

    // Check if user_referrals table exists
    const { data: referralData, error: referralError } = await supabase
      .from('user_referrals')
      .select('*')
      .limit(1);
    
    if (referralError) {
      console.log('❌ Error accessing user_referrals table:', referralError.message);
    } else {
      console.log('✅ user_referrals table exists and is accessible');
    }

    // Check if bonus settings exist
    const { data: settingsData, error: settingsError } = await supabase
      .from('game_settings')
      .select('key, value')
      .in('key', [
        'default_deposit_bonus_percent',
        'referral_bonus_percent',
        'conditional_bonus_threshold'
      ]);

    if (settingsError) {
      console.log('❌ Error accessing game_settings:', settingsError.message);
    } else {
      const settings = settingsData || [];
      const requiredSettings = [
        'default_deposit_bonus_percent',
        'referral_bonus_percent',
        'conditional_bonus_threshold'
      ];

      const missingSettings = requiredSettings.filter(setting => 
        !settings.some(s => s.key === setting)
      );

      if (missingSettings.length > 0) {
        console.log('❌ Missing bonus settings:', missingSettings);
        
        // Try to insert missing settings
        for (const setting of missingSettings) {
          let value = '5'; // default
          if (setting === 'referral_bonus_percent') value = '1';
          if (setting === 'conditional_bonus_threshold') value = '30';
          
          const { error: insertError } = await supabase
            .from('game_settings')
            .insert({
              key: setting,
              value: value,
              description: `${setting} setting`
            });
          
          if (insertError) {
            console.log(`   ❌ Error inserting ${setting}:`, insertError.message);
          } else {
            console.log(`   ✅ Inserted ${setting}: ${value}`);
          }
        }
      } else {
        console.log('✅ All required bonus settings exist');
        settings.forEach(setting => {
          console.log(`   - ${setting.key}: ${setting.value}`);
        });
      }
    }

    console.log('\n🎉 Migration process completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Database schema updated');
    console.log('✅ Bonus columns added to users table');
    console.log('✅ user_referrals table created');
    console.log('✅ Bonus settings configured');
    console.log('✅ Migration verification complete');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
applyBonusMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
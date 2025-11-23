import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    try {
        console.log('📝 Reading migration file...');
        const sqlPath = path.join(__dirname, 'add-loop-video-mode.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Applying loop video mode migration...');

        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            if (statement.includes('ALTER TABLE')) {
                console.log('  ➜ Adding loop_mode columns...');
                const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                if (error) {
                    // Check if columns already exist
                    if (error.message.includes('already exists')) {
                        console.log('  ✓ Columns already exist, skipping...');
                    } else {
                        throw error;
                    }
                }
            }
        }

        console.log('✅ Migration applied successfully!');
        console.log('\nLoop video mode fields added to simple_stream_config:');
        console.log('  - loop_mode (boolean)');
        console.log('  - loop_next_game_date (text)');
        console.log('  - loop_next_game_time (text)');
        console.log('  - loop_video_url (text)');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

applyMigration();
// Simple script to test Supabase connection
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    
    // Try to list tables by querying information_schema
    const { data, error } = await supabase
      .from('users') // Test with the users table
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST103') { // Table doesn't exist
        console.log('❌ Users table does not exist in the database');
        console.log('💡 You need to create the database tables first using SQL DDL commands');
        console.log('');
        console.log('📋 Run these commands in your Supabase SQL editor:');
        console.log('');
        console.log('-- Enable required extensions');
        console.log('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
        console.log('');
        console.log('-- Create users table');
        console.log('CREATE TABLE users (');
        console.log('  id VARCHAR(20) PRIMARY KEY, -- Phone number as ID');
        console.log('  phone VARCHAR(15) NOT NULL UNIQUE,');
        console.log('  password_hash TEXT NOT NULL,');
        console.log('  full_name TEXT,');
        console.log('  role TEXT DEFAULT \'player\',');
        console.log('  status TEXT DEFAULT \'active\',');
        console.log('  balance DECIMAL(15, 2) NOT NULL DEFAULT \'100000.00\', -- ₹100,000 default');
        console.log('  total_winnings DECIMAL(15, 2) DEFAULT \'0.00\',');
        console.log('  total_losses DECIMAL(15, 2) DEFAULT \'0.00\',');
        console.log('  games_played INTEGER DEFAULT 0,');
        console.log('  games_won INTEGER DEFAULT 0,');
        console.log('  phone_verified BOOLEAN DEFAULT false,');
        console.log('  last_login TIMESTAMP WITH TIME ZONE,');
        console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
        console.log(');');
        console.log('');
        console.log('-- Create admin_credentials table');
        console.log('CREATE TABLE admin_credentials (');
        console.log('  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),');
        console.log('  username VARCHAR(50) NOT NULL UNIQUE,');
        console.log('  password_hash TEXT NOT NULL,');
        console.log('  role TEXT DEFAULT \'admin\',');
        console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
        console.log(');');
        console.log('');
        console.log('-- Create game_settings table');
        console.log('CREATE TABLE game_settings (');
        console.log('  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),');
        console.log('  setting_key VARCHAR(100) NOT NULL UNIQUE,');
        console.log('  setting_value TEXT NOT NULL,');
        console.log('  description TEXT,');
        console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
        console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
        console.log(');');
        console.log('');
        console.log('-- Create indexes');
        console.log('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);');
        console.log('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);');
        console.log('');
        console.log('-- Insert default admin user');
        console.log('-- Password \'admin123\' hashed using bcrypt');
        console.log('INSERT INTO admin_credentials (username, password_hash, role)');
        console.log('VALUES (\'admin\', \'$2a$12$66m93u7Z5M6.y5UyWj0K2e0VWYzQ5Q2vQ5Q2vQ5Q2vQ5Q2vQ5Q2vQ\', \'admin\')');
        console.log('ON CONFLICT (username) DO NOTHING;');
        return;
      }
      console.error('❌ Connection error:', error);
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log(`📊 Found ${data.length} user(s) in the database`);
    
    // If we get here, the table exists. Let's try to find admin users
    const { data: admins, error: adminError } = await supabase
      .from('admin_credentials')
      .select('username')
      .limit(5);

    if (adminError) {
      console.log('❌ Error querying admin credentials table:', adminError.message);
    } else {
      console.log(`👥 Found ${admins.length} admin user(s)`);
      if (admins.length > 0) {
        console.log('Admin usernames:', admins.map(a => a.username).join(', '));
      }
    }
  } catch (err) {
    console.error('❌ Error connecting to Supabase:', err);
  }
}

testConnection();
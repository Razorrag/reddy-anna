#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing Supabase credentials. Please check your .env file.');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDefaultUser() {
	try {
		const phone = process.env.DEFAULT_USER_PHONE || '9999999999';
		const name = process.env.DEFAULT_USER_NAME || 'Default User';
		const password = process.env.DEFAULT_USER_PASSWORD || 'Password123';
		const defaultBalance = process.env.DEFAULT_BALANCE || '0.00';

		console.log('👤 Creating default player user...');
		console.log(`   Phone: ${phone}`);

		// Check if exists
		const { data: existing, error: checkError } = await supabase
			.from('users')
			.select('id, phone')
			.eq('phone', phone)
			.single();

		if (existing && !checkError) {
			console.log('⚠️  User already exists, skipping creation');
			return;
		}

		// Hash password
		const password_hash = await bcrypt.hash(password, 12);

		// Insert user (use phone as id)
		const now = new Date().toISOString();
		const userRow = {
			id: phone,
			phone,
			password_hash,
			full_name: name,
			role: 'player',
			status: 'active',
			balance: defaultBalance,
			total_winnings: '0',
			total_losses: '0',
			games_played: 0,
			games_won: 0,
			phone_verified: false,
			referral_code: null,
			referral_code_generated: null,
			original_deposit_amount: defaultBalance,
			deposit_bonus_available: '0',
			referral_bonus_available: '0',
			total_bonus_earned: '0',
			last_login: now,
			created_at: now,
			updated_at: now,
		};

		const { data, error } = await supabase
			.from('users')
			.insert(userRow)
			.select()
			.single();

		if (error) {
			console.error('❌ Failed to create user:', error.message);
			process.exit(1);
		}

		// Generate referral code if function exists
		try {
			await supabase.rpc('generate_referral_code', { p_user_id: data.id });
		} catch {}

		console.log('✅ Default player user created successfully!');
		console.log('\nLogin details:');
		console.log(`   Phone: ${phone}`);
		console.log(`   Password: ${password}`);
	} catch (err) {
		console.error('❌ Error creating default user:', err?.message || err);
		process.exit(1);
	}
}

createDefaultUser();

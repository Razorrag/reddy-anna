const bcrypt = require('bcrypt');

async function generateHash() {
  const password = process.argv[2] || 'Test@1234';
  
  console.log('\n=== Partner Password Hash Generator ===\n');
  console.log('Generating hash for password:', password);
  console.log('Using bcrypt rounds: 12\n');
  
  try {
    const hash = await bcrypt.hash(password, 12);
    
    console.log('✅ Hash generated successfully!\n');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\n📋 Copy this SQL to create a partner:\n');
    console.log(`INSERT INTO partners (
  id,
  phone,
  password_hash,
  full_name,
  email,
  whatsapp_number,
  status,
  share_percentage,
  created_at
) VALUES (
  gen_random_uuid()::text,
  '9155804834',
  '${hash}',
  'Test Partner',
  'partner@example.com',
  '9155804834',
  'active',
  50.00,
  NOW()
);\n`);
    
    console.log('💡 To update existing partner password:\n');
    console.log(`UPDATE partners 
SET password_hash = '${hash}' 
WHERE phone = '9155804834';\n`);
    
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
    process.exit(1);
  }
}

// Run the generator
generateHash().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
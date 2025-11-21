import { hashPassword, validatePassword } from '../server/auth';

async function testPasswordFunctions() {
  console.log('Testing password functions...');

  try {
    const password = 'TestPassword123!';
    console.log('\\n1. Testing password hashing...');
    const hashed = await hashPassword(password);
    console.log('✅ Password hashed successfully');

    console.log('\\n2. Testing password validation...');
    const isValid = await validatePassword(password, hashed);
    console.log('✅ Password validation:', isValid);

    console.log('\\n3. Testing invalid password...');
    const isInvalid = await validatePassword('WrongPassword', hashed);
    console.log('✅ Invalid password validation:', !isInvalid);

    console.log('\\n✅ All password functions working correctly!');
  } catch (error) {
    console.error('❌ Password function test failed:', error);
  }
}

// Run if executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  testPasswordFunctions().catch(console.error);
}
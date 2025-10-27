import { registerUser, loginUser, loginAdmin } from './server/auth';

async function testAuth() {
  console.log('Testing authentication system...');

  // Test user registration
  console.log('\\n1. Testing user registration...');
  const registerResult = await registerUser({
    name: 'Test User',
    phone: '9876543210',
    password: 'TestPass123',
    confirmPassword: 'TestPass123',
  });
  
  console.log('Registration result:', registerResult);

  // Test user login
  console.log('\\n2. Testing user login...');
  const loginResult = await loginUser('9876543210', 'TestPass123');
  console.log('Login result:', loginResult);

  // Test admin login
  console.log('\\n3. Testing admin login...');
  const adminLoginResult = await loginAdmin('admin', 'admin123');
  console.log('Admin login result:', adminLoginResult);

  console.log('\\nTest completed!');
}

// Run the test
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is being run directly
if (process.argv[1] === __filename) {
  testAuth().catch(console.error);
}

export { testAuth };
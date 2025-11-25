
import 'dotenv/config';
import { registerUser } from '../server/auth';

async function testRegistration() {
    console.log('🧪 Starting registration debug test...');

    const testUser = {
        name: 'Debug Player',
        phone: '9999999999',
        password: 'Test1234',
        confirmPassword: 'Test1234'
    };

    try {
        console.log('Calling registerUser with:', testUser);
        const result = await registerUser(testUser);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('🔥 CRITICAL ERROR:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }
    }
}

testRegistration();

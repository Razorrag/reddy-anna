import bcrypt from 'bcrypt';

const password = 'Admin123456';
const hash = '$2b$12$MlG2c68OZb.NyKs2vyAQf.4Vytg8kGA5.02TGf6b9P1eZ4VgS0/Hq';

async function testPassword() {
  try {
    console.log('Testing password comparison...');
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    const isValid = await bcrypt.compare(password, hash);
    console.log('Password valid:', isValid);
    
    // Test with wrong password
    const isInvalid = await bcrypt.compare('wrongpassword', hash);
    console.log('Wrong password valid:', isInvalid);
    
  } catch (error) {
    console.error('Error testing password:', error);
  }
}

testPassword();

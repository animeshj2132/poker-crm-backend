const fetch = require('node-fetch');

async function testLogin() {
  console.log('Testing login API...\n');
  
  // Test login
  const response = await fetch('https://poker-crm-backend.onrender.com/api/auth/player/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clubCode: '202024',
      email: 'approved@test.com',
      password: 'Test@123'
    })
  });
  
  const result = await response.json();
  
  console.log('Login Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n=========================');
  console.log('Club ID:', result.club?.id);
  console.log('Player ID:', result.player?.id);
  console.log('=========================\n');
}

testLogin().catch(console.error);

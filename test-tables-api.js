const fetch = require('node-fetch');

async function testTablesAPI() {
  console.log('Testing tables API with correct club ID...\n');
  
  const clubId = 'bfa6914b-cf01-45f9-b419-6f56f7651ca2';
  const playerId = '073929ce-fc99-46ef-9105-7ca6965c962c';
  
  console.log('Club ID:', clubId);
  console.log('Player ID:', playerId);
  console.log('\nCalling API...\n');
  
  const response = await fetch('https://poker-crm-backend.onrender.com/api/auth/player/tables', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-club-id': clubId,
      'x-player-id': playerId
    }
  });
  
  console.log('Status:', response.status);
  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));
}

testTablesAPI().catch(console.error);

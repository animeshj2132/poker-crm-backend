const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3333/api';
const TEST_CLUB_CODE = '999888';
const TEST_EMAIL = 'testplayer@pokerclub.com';
const TEST_PASSWORD = 'password123';

let testPlayerId = '';
let testClubId = '';
let authHeaders = {};

async function testAPI(name, method, endpoint, body, headers = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ SUCCESS (${response.status})`);
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      return { success: true, data, status: response.status };
    } else {
      console.log(`   ❌ FAILED (${response.status})`);
      console.log(`   Error:`, data);
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ ERROR:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE PLAYER APP TESTS\n');
  console.log('=' .repeat(60));
  
  // 1. Test Login
  console.log('\n📋 PHASE 1: AUTHENTICATION');
  console.log('=' .repeat(60));
  
  const loginResult = await testAPI(
    'Player Login',
    'POST',
    '/auth/player/login',
    { clubCode: TEST_CLUB_CODE, email: TEST_EMAIL, password: TEST_PASSWORD }
  );
  
  if (loginResult.success) {
    testPlayerId = loginResult.data.player?.id;
    testClubId = loginResult.data.club?.id;
    authHeaders = {
      'x-player-id': testPlayerId,
      'x-club-id': testClubId
    };
    console.log(`\n   📝 Player ID: ${testPlayerId}`);
    console.log(`   📝 Club ID: ${testClubId}`);
  } else {
    console.log('\n❌ Login failed - cannot continue tests');
    return;
  }
  
  // 2. Test Tables
  console.log('\n\n📋 PHASE 2: TABLES & WAITLIST');
  console.log('=' .repeat(60));
  
  await testAPI(
    'Get Available Tables',
    'GET',
    '/auth/player/tables',
    null,
    authHeaders
  );
  
  await testAPI(
    'Get Waitlist Status',
    'GET',
    '/auth/player/waitlist',
    null,
    authHeaders
  );
  
  // 3. Test Offers
  console.log('\n\n📋 PHASE 3: OFFERS & PROMOTIONS');
  console.log('=' .repeat(60));
  
  await testAPI(
    'Get Active Offers',
    'GET',
    `/player-offers/active?clubId=${testClubId}`,
    null,
    authHeaders
  );
  
  // 4. Test Tournaments
  console.log('\n\n📋 PHASE 4: TOURNAMENTS');
  console.log('=' .repeat(60));
  
  await testAPI(
    'Get Tournaments',
    'GET',
    `/player-tournaments/list?clubId=${testClubId}`,
    null,
    authHeaders
  );
  
  // 5. Test F&B
  console.log('\n\n📋 PHASE 5: FOOD & BEVERAGE');
  console.log('=' .repeat(60));
  
  await testAPI(
    'Get F&B Menu',
    'GET',
    `/clubs/${testClubId}/fnb/menu`,
    null,
    authHeaders
  );
  
  // 6. Test VIP Points
  console.log('\n\n📋 PHASE 6: VIP POINTS & REWARDS');
  console.log('=' .repeat(60));
  
  await testAPI(
    'Get VIP Points',
    'GET',
    `/player-vip/points?playerId=${testPlayerId}&clubId=${testClubId}`,
    null,
    authHeaders
  );
  
  await testAPI(
    'Get VIP Rewards',
    'GET',
    `/player-vip/rewards?clubId=${testClubId}`,
    null,
    authHeaders
  );
  
  // 7. Test Player Profile
  console.log('\n\n📋 PHASE 7: PLAYER PROFILE');
  console.log('=' .repeat(60));
  
  await testAPI(
    'Get Player Profile',
    'GET',
    '/auth/player/me',
    null,
    authHeaders
  );
  
  // 8. Test Balance
  console.log('\n\n📋 PHASE 8: BALANCE & TRANSACTIONS');
  console.log('=' .repeat(60));
  
  await testAPI(
    'Get Player Balance',
    'GET',
    `/auth/player/balance`,
    null,
    authHeaders
  );
  
  // 9. Test Feedback
  console.log('\n\n📋 PHASE 9: FEEDBACK & CHAT');
  console.log('=' .repeat(60));
  
  await testAPI(
    'Submit Feedback',
    'POST',
    '/player-feedback/submit',
    {
      playerId: testPlayerId,
      clubId: testClubId,
      rating: 5,
      comment: 'Test feedback from automated testing',
      category: 'general'
    },
    authHeaders
  );
  
  // Summary
  console.log('\n\n' + '=' .repeat(60));
  console.log('✅ TEST SUITE COMPLETED');
  console.log('=' .repeat(60));
  console.log('\n📊 Check results above for any failures');
  console.log('\n🎮 You can now test the player app manually at http://localhost:5173\n');
}

runAllTests().catch(console.error);


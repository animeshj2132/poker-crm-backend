const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ No DATABASE_URL or SUPABASE_DB_URL found in .env file');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixTestPlayerPassword() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Generating proper password hash for test player...\n');

    // Generate a proper bcrypt hash for "password123"
    const password = 'password123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Password hash generated');
    console.log(`   Password: ${password}`);
    console.log(`   Hash: ${passwordHash}\n`);

    // Update the test player with the proper password hash
    const result = await client.query(`
      UPDATE players 
      SET password_hash = $1, updated_at = NOW()
      WHERE email = 'testplayer@pokerclub.com'
      RETURNING id, email, name;
    `, [passwordHash]);

    if (result.rows.length > 0) {
      console.log('✅ Test player password updated successfully!');
      console.log(`   Player: ${result.rows[0].name}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   ID: ${result.rows[0].id}\n`);
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🎮 LOGIN CREDENTIALS:');
      console.log('   Email: testplayer@pokerclub.com');
      console.log('   Password: password123');
      console.log('   Club Code: 999888');
      console.log('═══════════════════════════════════════════════════════════\n');
    } else {
      console.log('⚠️  Test player not found. Run setup-player-test-data.js first.\n');
    }

  } catch (error) {
    console.error('❌ Error fixing password:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixTestPlayerPassword()
  .then(() => {
    console.log('✅ Password fix completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Password fix failed:', err);
    process.exit(1);
  });















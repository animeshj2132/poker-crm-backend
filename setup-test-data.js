const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ No DATABASE_URL or SUPABASE_DB_URL found in .env file');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false } // For Supabase
});

async function setupTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting test data setup...\n');

    // 1. Create a test club
    console.log('1️⃣  Creating test club...');
    const clubResult = await client.query(`
      INSERT INTO clubs (name, code, tenant_id)
      VALUES (
        'Poker Palace Test Club',
        'PP2024',
        (SELECT id FROM tenants LIMIT 1)
      )
      ON CONFLICT (code) DO UPDATE 
      SET name = EXCLUDED.name
      RETURNING id, name, code;
    `);
    const club = clubResult.rows[0];
    console.log(`   ✅ Club created: ${club.name}`);
    console.log(`   📋 Club Code: ${club.code}`);
    console.log(`   🆔 Club ID: ${club.id}\n`);

    // 2. Create 2 tables
    console.log('2️⃣  Creating 2 poker tables...');
    
    const table1 = await client.query(`
      INSERT INTO tables (
        club_id, 
        table_number, 
        table_type,
        min_buy_in, 
        max_buy_in, 
        max_seats, 
        status,
        notes
      )
      VALUES ($1, 1, 'HIGH_STAKES', 1000, 10000, 9, 'AVAILABLE', 'High Stakes VIP Table')
      ON CONFLICT (club_id, table_number) DO UPDATE 
      SET notes = EXCLUDED.notes
      RETURNING id, table_number, notes;
    `, [club.id]);
    
    const table2 = await client.query(`
      INSERT INTO tables (
        club_id, 
        table_number, 
        table_type,
        min_buy_in, 
        max_buy_in, 
        max_seats, 
        status,
        notes
      )
      VALUES ($1, 2, 'CASH', 100, 1000, 6, 'AVAILABLE', 'Beginners Friendly Table')
      ON CONFLICT (club_id, table_number) DO UPDATE 
      SET notes = EXCLUDED.notes
      RETURNING id, table_number, notes;
    `, [club.id]);
    
    console.log(`   ✅ Table 1: ${table1.rows[0].notes} (Table #${table1.rows[0].table_number})`);
    console.log(`   ✅ Table 2: ${table2.rows[0].notes} (Table #${table2.rows[0].table_number})\n`);

    // 3. Skip tournament (table doesn't exist yet)
    console.log('3️⃣  Skipping tournament creation (table not created yet)\n');

    // 4. Create a pre-approved player (KYC approved)
    console.log('4️⃣  Creating pre-approved player (KYC verified)...');
    
    const bcrypt = require('bcrypt');
    const password = 'Test@123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const approvedPlayer = await client.query(`
      INSERT INTO players (
        club_id,
        name,
        email,
        phone_number,
        password_hash,
        kyc_status,
        kyc_approved_at,
        kyc_documents,
        credit_enabled,
        credit_limit,
        status
      )
      VALUES (
        $1,
        'John Approved',
        'approved@test.com',
        '+1-555-0001',
        $2,
        'approved',
        NOW(),
        '{"id_document": "verified", "address_proof": "verified", "photo": "verified"}'::jsonb,
        true,
        10000,
        'Active'
      )
      ON CONFLICT (club_id, email) DO UPDATE 
      SET kyc_status = 'approved', 
          kyc_approved_at = NOW(),
          password_hash = EXCLUDED.password_hash,
          credit_enabled = true,
          credit_limit = 10000
      RETURNING id, name, email;
    `, [club.id, hashedPassword]);
    
    console.log(`   ✅ Player: ${approvedPlayer.rows[0].name}`);
    console.log(`   📧 Email: ${approvedPlayer.rows[0].email}`);
    console.log(`   🔑 Password: ${password}`);
    console.log(`   ✅ KYC Status: APPROVED`);
    console.log(`   💳 Credit Enabled: YES (₹10,000 limit)\n`);

    // 5. Add some sample balance for the approved player
    console.log('5️⃣  Adding sample balance for approved player...');
    
    await client.query(`
      INSERT INTO financial_transactions (
        club_id,
        player_id,
        player_name,
        type,
        amount,
        status,
        notes
      )
      VALUES (
        $1,
        $2,
        $3,
        'Deposit',
        5000,
        'Completed',
        'Initial test deposit'
      );
    `, [club.id, approvedPlayer.rows[0].id, approvedPlayer.rows[0].name]);
    
    console.log(`   ✅ Added ₹5,000 initial balance\n`);

    // 6. Skip sample offers (optional)
    console.log('6️⃣  Skipping sample offers (optional feature)\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎊 TEST DATA SETUP COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📋 CLUB INFORMATION:');
    console.log(`   Club Name: ${club.name}`);
    console.log(`   Club Code: ${club.code}`);
    console.log(`   Club ID: ${club.id}\n`);
    
    console.log('🎮 TABLES CREATED:');
    console.log(`   1. High Stakes VIP Table (Min: ₹1,000, Max: ₹10,000)`);
    console.log(`   2. Beginners Friendly Table (Min: ₹100, Max: ₹1,000)\n`);
    
    
    console.log('👤 PRE-APPROVED PLAYER (READY TO USE):');
    console.log('   ╔════════════════════════════════════════╗');
    console.log(`   ║  Email:    approved@test.com           ║`);
    console.log(`   ║  Password: Test@123                    ║`);
    console.log(`   ║  KYC:      ✅ APPROVED                 ║`);
    console.log(`   ║  Credit:   ✅ ENABLED (₹10,000 limit)  ║`);
    console.log(`   ║  Balance:  ₹5,000                      ║`);
    console.log('   ╚════════════════════════════════════════╝\n');
    
    console.log('📝 HOW TO TEST:\n');
    console.log('1️⃣  LOGIN AS APPROVED PLAYER:');
    console.log('   - Go to player portal: http://localhost:5000');
    console.log('   - Enter club code: PP2024');
    console.log('   - Login with: approved@test.com / Test@123');
    console.log('   - ✅ All features unlocked (KYC approved)\n');
    
    console.log('2️⃣  CREATE NEW PLAYER (KYC PENDING):');
    console.log('   - Go to player portal: http://localhost:5000');
    console.log('   - Enter club code: PP2024');
    console.log('   - Click "Sign Up"');
    console.log('   - Fill in details (use any email like: newplayer@test.com)');
    console.log('   - Password: YourPassword123');
    console.log('   - ⚠️  You will see KYC pending screen');
    console.log('   - 🔒 All features locked except Profile tab');
    console.log('   - 📤 Upload KYC documents to test approval flow\n');
    
    console.log('3️⃣  TEST FEATURES:');
    console.log('   ✓ Join waitlist for tables');
    console.log('   ✓ View balance and transactions');
    console.log('   ✓ Request credit (₹10,000 limit for approved player)');
    console.log('   ✓ Place FNB orders');
    console.log('   ✓ Register for tournament');
    console.log('   ✓ Check VIP points');
    console.log('   ✓ View offers');
    console.log('   ✓ Submit feedback\n');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ Ready to test the player portal! ✨');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupTestData().catch(console.error);

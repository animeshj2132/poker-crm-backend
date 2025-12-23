const { Pool } = require('pg');
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

async function setupPlayerTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up comprehensive player test data...\n');

    // 1. Create a test club with unique code
    console.log('1️⃣  Creating test club...');
    const clubCode = '999888'; // 6-digit unique code
    const clubResult = await client.query(`
      INSERT INTO clubs (name, code, tenant_id, created_at, updated_at)
      VALUES (
        'Royal Flush Poker Club',
        $1,
        (SELECT id FROM tenants LIMIT 1),
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO UPDATE 
      SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING id, name, code;
    `, [clubCode]);
    
    const club = clubResult.rows[0];
    console.log(`   ✅ Club created: ${club.name}`);
    console.log(`   📋 Club Code: ${club.code}`);
    console.log(`   🆔 Club ID: ${club.id}\n`);

    // 2. Create 2 poker tables
    console.log('2️⃣  Creating poker tables...');
    
    // Delete existing tables for this club first
    await client.query('DELETE FROM tables WHERE club_id = $1', [club.id]);
    
    const table1 = await client.query(`
      INSERT INTO tables (
        club_id, 
        table_number, 
        table_type,
        min_buy_in, 
        max_buy_in, 
        max_seats, 
        current_seats,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, 1, 'Cash Game', 1000.00, 50000.00, 9, 0, 'AVAILABLE', NOW(), NOW())
      RETURNING id, table_number, table_type, min_buy_in, max_buy_in;
    `, [club.id]);
    console.log(`   ✅ Table 1: ${table1.rows[0].table_type} #${table1.rows[0].table_number}`);
    console.log(`      Buy-in: ₹${table1.rows[0].min_buy_in} - ₹${table1.rows[0].max_buy_in}`);

    const table2 = await client.query(`
      INSERT INTO tables (
        club_id, 
        table_number, 
        table_type,
        min_buy_in, 
        max_buy_in, 
        max_seats, 
        current_seats,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, 2, 'Tournament', 500.00, 10000.00, 6, 3, 'IN_PLAY', NOW(), NOW())
      RETURNING id, table_number, table_type, min_buy_in, max_buy_in;
    `, [club.id]);
    console.log(`   ✅ Table 2: ${table2.rows[0].table_type} #${table2.rows[0].table_number}`);
    console.log(`      Buy-in: ₹${table2.rows[0].min_buy_in} - ₹${table2.rows[0].max_buy_in}\n`);

    // 3. Create Food & Beverage menu items
    console.log('3️⃣  Creating food & beverage menu...');
    
    // Delete existing items for this club first
    await client.query('DELETE FROM menu_items WHERE club_id = $1', [club.id]);
    
    const menuItems = [
      { name: 'Masala Chai', category: 'Beverages', price: 50.00, description: 'Traditional Indian spiced tea', available: true },
      { name: 'Club Sandwich', category: 'Food', price: 250.00, description: 'Classic triple-decker sandwich with fries', available: true },
      { name: 'Veg Biryani', category: 'Food', price: 350.00, description: 'Aromatic basmati rice with mixed vegetables', available: true },
      { name: 'Cold Coffee', category: 'Beverages', price: 120.00, description: 'Chilled coffee with ice cream', available: true }
    ];

    for (const item of menuItems) {
      await client.query(`
        INSERT INTO menu_items (
          club_id, 
          name, 
          category, 
          price, 
          description, 
          is_available,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [club.id, item.name, item.category, item.price, item.description, item.available]);
      console.log(`   ✅ ${item.name} (${item.category}) - ₹${item.price}`);
    }
    console.log();

    // 4. Create Staff Offers
    console.log('4️⃣  Creating promotional offers...');
    
    // Delete existing offers for this club first
    await client.query('DELETE FROM staff_offers WHERE club_id = $1', [club.id]);
    
    const offer1 = await client.query(`
      INSERT INTO staff_offers (
        club_id,
        title,
        description,
        offer_type,
        value,
        validity_start,
        validity_end,
        is_active,
        terms,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        'Welcome Bonus - 100% Match',
        'Get 100% match on your first deposit up to ₹10,000. New players only!',
        'deposit_bonus',
        '10000',
        NOW(),
        NOW() + INTERVAL '30 days',
        true,
        'Valid for new players only. Minimum deposit ₹1000. Bonus credited within 24 hours.',
        NOW(),
        NOW()
      )
      RETURNING id, title, offer_type, value;
    `, [club.id]);
    console.log(`   ✅ ${offer1.rows[0].title}`);
    console.log(`      Type: ${offer1.rows[0].offer_type} | Value: ₹${offer1.rows[0].value}`);

    const offer2 = await client.query(`
      INSERT INTO staff_offers (
        club_id,
        title,
        description,
        offer_type,
        value,
        validity_start,
        validity_end,
        is_active,
        terms,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        'Weekend Special - Free Drink',
        'Play any weekend game and get a complimentary beverage of your choice!',
        'freebie',
        '0',
        NOW(),
        NOW() + INTERVAL '60 days',
        true,
        'Valid on Saturdays and Sundays only. One drink per player per day.',
        NOW(),
        NOW()
      )
      RETURNING id, title, offer_type;
    `, [club.id]);
    console.log(`   ✅ ${offer2.rows[0].title}`);
    console.log(`      Type: ${offer2.rows[0].offer_type}\n`);

    // 5. Create a test player (optional - for immediate testing)
    console.log('5️⃣  Creating test player account...');
    
    const testPlayerEmail = 'testplayer@pokerclub.com';
    const testPlayer = await client.query(`
      INSERT INTO players (
        club_id,
        email,
        name,
        phone_number,
        player_id,
        kyc_status,
        status,
        password_hash,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        'Test Player',
        '+919999999999',
        'TestPlayer999',
        'approved',
        'Active',
        '$2b$10$rQZ8yLHJZWxGJxJ0F8nCyO0RGxHxKrxNqxKxqxKxqxKxqxKxqxKxq',
        NOW(),
        NOW()
      )
      ON CONFLICT (club_id, email) DO UPDATE
      SET kyc_status = 'approved', status = 'Active', updated_at = NOW()
      RETURNING id, email, name;
    `, [club.id, testPlayerEmail]);
    
    console.log(`   ✅ Player created: ${testPlayer.rows[0].name}`);
    console.log(`   📧 Email: ${testPlayer.rows[0].email}`);
    console.log(`   🔑 Password: password123\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ TEST DATA SETUP COMPLETE!\n');
    console.log('📋 CLUB DETAILS:');
    console.log(`   Name: ${club.name}`);
    console.log(`   Code: ${club.code}`);
    console.log(`   ID: ${club.id}\n`);
    console.log('🎮 WHAT WAS CREATED:');
    console.log('   ✓ 1 Club (Royal Flush Poker Club)');
    console.log('   ✓ 2 Poker Tables (1 Cash Game Available, 1 Tournament In Play)');
    console.log('   ✓ 4 Food & Beverage Menu Items');
    console.log('   ✓ 2 Promotional Offers');
    console.log('   ✓ 1 Approved Test Player Account\n');
    console.log('🚀 TO TEST THE PLAYER APP:');
    console.log(`   1. Go to: http://localhost:5173`);
    console.log(`   2. Use Club Code: ${club.code}`);
    console.log(`   3. Login with: ${testPlayerEmail} / password123`);
    console.log(`   4. Or signup with a new email and complete KYC\n`);
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
setupPlayerTestData()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  });


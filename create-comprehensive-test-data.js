const { Client } = require('pg');
const bcrypt = require('bcrypt');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:new-poker-password@db.mvxqemhzciocszdjcmqs.supabase.co:5432/postgres';

async function createComprehensiveTestData() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Find or create test club
    const clubResult = await client.query(`
      SELECT id, code FROM clubs WHERE code = '999888' LIMIT 1
    `);

    let clubId;
    let clubCode;

    if (clubResult.rows.length > 0) {
      clubId = clubResult.rows[0].id;
      clubCode = clubResult.rows[0].code;
      console.log(`✅ Using existing club: ${clubCode} (${clubId})`);
    } else {
      const newClubResult = await client.query(`
        INSERT INTO clubs (name, code, address, city, state, country, phone, email, status)
        VALUES ('Royal Flush Poker Club', '999888', '123 Casino Street', 'Mumbai', 'Maharashtra', 'India', '+91-9876543210', 'contact@royalflush.com', 'active')
        RETURNING id, code
      `);
      clubId = newClubResult.rows[0].id;
      clubCode = newClubResult.rows[0].code;
      console.log(`✅ Created new club: ${clubCode} (${clubId})`);
    }

    // 2. Create/Update test player
    const playerEmail = 'testplayer@pokerclub.com';
    const playerPassword = 'password123';
    const passwordHash = await bcrypt.hash(playerPassword, 10);

    const playerResult = await client.query(`
      INSERT INTO players (
        club_id, email, name, nickname, phone_number, password_hash, 
        kyc_status, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (club_id, email) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        kyc_status = EXCLUDED.kyc_status,
        status = EXCLUDED.status
      RETURNING id, email, name
    `, [
      clubId, 
      playerEmail, 
      'Test Player', 
      'TestKing', 
      '+91-9999999999', 
      passwordHash,
      'approved',
      'active'
    ]);

    const playerId = playerResult.rows[0].id;
    console.log(`✅ Created/Updated test player: ${playerResult.rows[0].email} (${playerId})`);

    // 3. Create tables if they don't exist
    const tableCheck = await client.query(`
      SELECT COUNT(*) as count FROM tables WHERE club_id = $1
    `, [clubId]);

    if (parseInt(tableCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO tables (club_id, table_number, table_type, max_seats, current_seats, status, min_buy_in, max_buy_in)
        VALUES 
          ($1, 1, 'cash_game', 9, 0, 'available', 1000, 10000),
          ($1, 2, 'tournament', 9, 0, 'available', 5000, 50000)
      `, [clubId]);
      console.log('✅ Created 2 poker tables');
    } else {
      console.log(`✅ Tables already exist (${tableCheck.rows[0].count} tables)`);
    }

    // 4. Create Staff Offers
    console.log('\n📢 Creating promotional offers...');
    
    const offers = [
      {
        title: 'Welcome Bonus - 100% Match',
        description: 'Get 100% match on your first deposit up to ₹10,000! Perfect for new players.',
        offer_type: 'deposit_bonus',
        value: '100% up to ₹10,000',
        validity_start: new Date(),
        validity_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        terms: 'Valid for first deposit only. Minimum deposit ₹1,000. Wagering requirement: 5x.',
        target_audience: 'new_players'
      },
      {
        title: 'Weekend Special - 50% Cashback',
        description: 'Play on weekends and get 50% cashback on all losses up to ₹5,000!',
        offer_type: 'cashback',
        value: '50% up to ₹5,000',
        validity_start: new Date(),
        validity_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        terms: 'Valid on Saturday and Sunday only. Cashback credited on Monday.',
        target_audience: 'all'
      },
      {
        title: 'VIP Loyalty Bonus',
        description: 'Exclusive for VIP members! Get ₹2,000 bonus chips every week.',
        offer_type: 'loyalty',
        value: '₹2,000 weekly',
        validity_start: new Date(),
        validity_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        terms: 'VIP members only. Minimum 10 hours of play per week required.',
        target_audience: 'vip'
      },
      {
        title: 'Refer a Friend - ₹1,000 Each',
        description: 'Refer your friends and both of you get ₹1,000 bonus! Unlimited referrals.',
        offer_type: 'referral',
        value: '₹1,000 per referral',
        validity_start: new Date(),
        validity_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        terms: 'Friend must deposit minimum ₹2,000. Bonus credited after friend plays 5 sessions.',
        target_audience: 'all'
      },
      {
        title: 'Diwali Festival Special',
        description: 'Celebrate Diwali with us! Triple your deposit up to ₹15,000!',
        offer_type: 'seasonal',
        value: '300% up to ₹15,000',
        validity_start: new Date(),
        validity_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        terms: 'Limited time festival offer. Valid during Diwali week only.',
        target_audience: 'all'
      }
    ];

    for (const offer of offers) {
      await client.query(`
        INSERT INTO staff_offers (
          club_id, title, description, offer_type, value, 
          validity_start, validity_end, is_active, terms, target_audience
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
        ON CONFLICT DO NOTHING
      `, [
        clubId,
        offer.title,
        offer.description,
        offer.offer_type,
        offer.value,
        offer.validity_start,
        offer.validity_end,
        offer.terms,
        offer.target_audience
      ]);
      console.log(`  ✅ ${offer.title}`);
    }

    // 5. Create Tournaments
    console.log('\n🏆 Creating tournaments...');
    
    // Check if tournaments table exists
    const tournamentsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tournaments'
      );
    `);

    if (tournamentsTableCheck.rows[0].exists) {
      const tournaments = [
        {
          name: 'Friday Night Showdown',
          description: 'Weekly tournament with guaranteed prize pool of ₹50,000!',
          buy_in: 2000,
          prize_pool: 50000,
          max_players: 100,
          start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          status: 'upcoming'
        },
        {
          name: 'Sunday Million',
          description: 'The biggest tournament of the week! ₹1,00,000 guaranteed prize pool.',
          buy_in: 5000,
          prize_pool: 100000,
          max_players: 150,
          start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          status: 'upcoming'
        },
        {
          name: 'Freeroll Tournament',
          description: 'Free entry tournament! Win real money with zero risk.',
          buy_in: 0,
          prize_pool: 10000,
          max_players: 200,
          start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
          status: 'upcoming'
        }
      ];

      for (const tournament of tournaments) {
        await client.query(`
          INSERT INTO tournaments (
            club_id, name, description, buy_in, prize_pool, 
            max_players, current_players, start_time, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)
          ON CONFLICT DO NOTHING
        `, [
          clubId,
          tournament.name,
          tournament.description,
          tournament.buy_in,
          tournament.prize_pool,
          tournament.max_players,
          tournament.start_time,
          tournament.status
        ]);
        console.log(`  ✅ ${tournament.name}`);
      }
    } else {
      console.log('  ⚠️ Tournaments table does not exist, skipping...');
    }

    // 6. Create FNB Menu Items
    console.log('\n🍔 Creating F&B menu items...');
    
    const fnbCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'fnb_menu'
      );
    `);

    if (fnbCheck.rows[0].exists) {
      const menuItems = [
        { name: 'Masala Chai', category: 'beverages', price: 50, available: true },
        { name: 'Cold Coffee', category: 'beverages', price: 120, available: true },
        { name: 'Fresh Lime Soda', category: 'beverages', price: 80, available: true },
        { name: 'Club Sandwich', category: 'food', price: 250, available: true },
        { name: 'Veg Biryani', category: 'food', price: 300, available: true },
        { name: 'Chicken Tikka', category: 'food', price: 350, available: true },
        { name: 'French Fries', category: 'snacks', price: 150, available: true },
        { name: 'Nachos with Cheese', category: 'snacks', price: 200, available: true }
      ];

      for (const item of menuItems) {
        await client.query(`
          INSERT INTO fnb_menu (club_id, name, category, price, is_available)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [clubId, item.name, item.category, item.price, item.available]);
        console.log(`  ✅ ${item.name} - ₹${item.price}`);
      }
    } else {
      console.log('  ⚠️ FNB menu table does not exist, skipping...');
    }

    console.log('\n✅ ✅ ✅ COMPREHENSIVE TEST DATA CREATED SUCCESSFULLY! ✅ ✅ ✅\n');
    console.log('📋 TEST CREDENTIALS:');
    console.log(`   Club Code: ${clubCode}`);
    console.log(`   Email: ${playerEmail}`);
    console.log(`   Password: ${playerPassword}`);
    console.log(`   Club ID: ${clubId}`);
    console.log(`   Player ID: ${playerId}`);
    console.log('\n🎮 You can now test the player app with full functionality!\n');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createComprehensiveTestData().catch(console.error);


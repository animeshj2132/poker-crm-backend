const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:new-poker-password@db.mvxqemhzciocszdjcmqs.supabase.co:5432/postgres';
const CLUB_ID = '3811c58d-f79e-4efa-b90b-1a04602dbc9e';

async function checkOffers() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check offers
    const offersResult = await client.query(`
      SELECT id, title, is_active, validity_start, validity_end, created_at
      FROM staff_offers
      WHERE club_id = $1
      ORDER BY created_at DESC
    `, [CLUB_ID]);

    console.log(`📢 Found ${offersResult.rows.length} offers in database:`);
    offersResult.rows.forEach((offer, i) => {
      console.log(`\n${i + 1}. ${offer.title}`);
      console.log(`   Active: ${offer.is_active}`);
      console.log(`   Valid from: ${offer.validity_start}`);
      console.log(`   Valid until: ${offer.validity_end}`);
      console.log(`   Created: ${offer.created_at}`);
    });

    // Check what the query returns
    console.log('\n\n🔍 Testing the actual query used by backend:');
    const backendQuery = `
      SELECT 
        id,
        club_id,
        title,
        description,
        offer_type,
        value,
        validity_start,
        validity_end,
        is_active,
        created_at,
        updated_at,
        image_url,
        terms,
        target_audience,
        created_by
      FROM staff_offers
      WHERE club_id = $1
        AND is_active = true
        AND validity_start <= NOW()
        AND validity_end > NOW()
      ORDER BY created_at DESC
    `;

    const backendResult = await client.query(backendQuery, [CLUB_ID]);
    console.log(`\n✅ Backend query returned ${backendResult.rows.length} offers`);
    
    if (backendResult.rows.length === 0) {
      console.log('\n⚠️ No offers match the backend criteria!');
      console.log('   Checking each condition:');
      
      // Check each condition
      const activeCheck = await client.query(`
        SELECT COUNT(*) FROM staff_offers WHERE club_id = $1 AND is_active = true
      `, [CLUB_ID]);
      console.log(`   - Active offers: ${activeCheck.rows[0].count}`);
      
      const validityCheck = await client.query(`
        SELECT COUNT(*) FROM staff_offers 
        WHERE club_id = $1 AND validity_start <= NOW()
      `, [CLUB_ID]);
      console.log(`   - Offers with valid start: ${validityCheck.rows[0].count}`);
      
      const endCheck = await client.query(`
        SELECT COUNT(*) FROM staff_offers 
        WHERE club_id = $1 AND validity_end > NOW()
      `, [CLUB_ID]);
      console.log(`   - Offers not expired: ${endCheck.rows[0].count}`);
    } else {
      console.log('\n✅ Offers data:');
      backendResult.rows.forEach((offer, i) => {
        console.log(`\n${i + 1}. ${offer.title}`);
        console.log(`   Type: ${offer.offer_type}`);
        console.log(`   Value: ${offer.value}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkOffers().catch(console.error);














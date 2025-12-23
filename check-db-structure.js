const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDB() {
  const client = await pool.connect();
  
  try {
    console.log('=== CHECKING CLUBS TABLE ===\n');
    
    const clubs = await client.query(`
      SELECT id, name, code, tenant_id 
      FROM clubs 
      LIMIT 5
    `);
    console.log('Clubs in DB:');
    clubs.rows.forEach(club => {
      console.log(`  - ID: ${club.id}`);
      console.log(`    Name: ${club.name}`);
      console.log(`    Code: ${club.code}`);
      console.log(`    Tenant: ${club.tenant_id}\n`);
    });
    
    console.log('\n=== CHECKING TABLES TABLE ===\n');
    
    const tables = await client.query(`
      SELECT id, club_id, table_number, table_type, status, max_seats, min_buy_in, max_buy_in
      FROM tables
      WHERE club_id = 'bfa6914b-cf01-45f9-b419-6f56f7651ca2'
    `);
    
    console.log(`Tables for club bfa6914b-cf01-45f9-b419-6f56f7651ca2:`);
    if (tables.rows.length === 0) {
      console.log('  ❌ NO TABLES FOUND!');
    } else {
      tables.rows.forEach(table => {
        console.log(`  - Table ${table.table_number} (${table.table_type})`);
        console.log(`    Status: ${table.status}`);
        console.log(`    Seats: ${table.max_seats}`);
        console.log(`    Buy-in: $${table.min_buy_in} - $${table.max_buy_in}\n`);
      });
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkDB().catch(console.error);

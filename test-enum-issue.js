const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function testTableStatus() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, table_number, status::text as status_text 
      FROM tables
      WHERE club_id = 'bfa6914b-cf01-45f9-b419-6f56f7651ca2'
    `);
    
    console.log('Tables and their status values:');
    result.rows.forEach(row => {
      console.log(`  Table ${row.table_number}: status = "${row.status_text}"`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

testTableStatus().catch(console.error);

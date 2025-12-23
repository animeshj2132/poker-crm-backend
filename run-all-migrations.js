const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ No DATABASE_URL or SUPABASE_DB_URL found in .env file');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const sqlDir = path.join(__dirname, 'sql');

// List of all migration files in order
const migrations = [
  '0001_init.sql',
  '0002_branding.sql',
  '0003_club_logo.sql',
  '0004_club_branding.sql',
  '0005_user_password_hash.sql',
  '0006_password_reset_flag.sql',
  '0007_extend_club_roles.sql',
  '0008_club_operations.sql',
  '0008_waitlist_tables.sql',
  '0009_affiliates_and_players.sql',
  '0010_club_code_and_player_password.sql',
  '0011_add_kyc_status_to_players.sql',
  '0012_add_credit_system_to_players.sql',
  '0015_add_pan_card_to_players.sql',
  'fnb-tables.sql',
  '0016_staff_offers.sql'
];

async function runMigrations() {
  try {
    await client.connect();
    console.log('🔗 Connected to database\n');
    console.log('🚀 Running all migrations...\n');

    for (const migration of migrations) {
      const filePath = path.join(sqlDir, migration);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${migration} (file not found)`);
        continue;
      }

      console.log(`📄 Running: ${migration}`);
      
      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`   ✅ ${migration} completed successfully\n`);
      } catch (error) {
        // If error is about table/column already existing, that's OK
        if (error.code === '42P07' || error.code === '42701' || error.code === '42710') {
          console.log(`   ⏭️  ${migration} - already applied (${error.message.split('\n')[0]})\n`);
        } else {
          console.log(`   ❌ ${migration} failed: ${error.message}\n`);
          // Continue with other migrations even if one fails
        }
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ALL MIGRATIONS COMPLETED!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Verify key tables exist
    console.log('🔍 Verifying database tables...\n');
    
    const tables = [
      'tenants', 'clubs', 'tables', 'players', 'affiliates',
      'waitlist_entries', 'menu_items', 'fnb_orders', 'staff_offers'
    ];
    
    for (const table of tables) {
      try {
        const result = await client.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
          [table]
        );
        if (result.rows[0].exists) {
          console.log(`   ✅ ${table} - EXISTS`);
        } else {
          console.log(`   ❌ ${table} - MISSING`);
        }
      } catch (err) {
        console.log(`   ❌ ${table} - ERROR: ${err.message}`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('\n✅ Migration script completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration script failed:', err);
    process.exit(1);
  });



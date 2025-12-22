#!/usr/bin/env node

/**
 * Database Migration Runner (Node.js version)
 * Run all SQL migrations in order
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SQL_DIR = path.join(__dirname, '..', 'sql');

// Migration files in order
const MIGRATIONS = [
  '0001_init.sql',
  '0002_branding.sql',
  '0003_club_logo.sql',
  '0004_club_branding.sql',
  '0005_user_password_hash.sql',
  '0006_password_reset_flag.sql',
  '0007_extend_club_roles.sql',
  '0008_waitlist_tables.sql',
  '0008_club_operations.sql',
];

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    console.error('Please set it in your .env file or export it:');
    console.error('export DATABASE_URL=postgresql://user:password@host:5432/dbname');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    console.log('');

    for (const migration of MIGRATIONS) {
      const filePath = path.join(SQL_DIR, migration);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Warning: ${migration} not found, skipping...`);
        continue;
      }

      console.log(`🔄 Running ${migration}...`);
      
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`✅ ${migration} completed successfully`);
      } catch (error) {
        console.error(`❌ ${migration} failed:`);
        console.error(error.message);
        throw error;
      }
      
      console.log('');
    }

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();


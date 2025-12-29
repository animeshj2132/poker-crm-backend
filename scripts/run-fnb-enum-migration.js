#!/usr/bin/env node

/**
 * Quick script to add FNB to club_role enum
 * Run this: node scripts/run-fnb-enum-migration.js
 */

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
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationPath = path.join(__dirname, '..', 'migrations', '0039_add_fnb_to_club_role_enum.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migration: 0039_add_fnb_to_club_role_enum.sql\n');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');
    console.log('   FNB has been added to the club_role enum.\n');
  } catch (error) {
    if (error.message.includes('already exists') || error.code === '42710') {
      console.log('ℹ️  FNB already exists in club_role enum (migration already applied)\n');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();







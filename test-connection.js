require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('Testing connection...');
console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password

const client = new Client({ connectionString });

client.connect()
  .then(() => {
    console.log('✅ Connection successful!');
    return client.query('SELECT NOW()');
  })
  .then((result) => {
    console.log('✅ Database query successful!');
    console.log('Current time:', result.rows[0].now);
    client.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if password is correct in Supabase Dashboard');
    console.error('2. Make sure you\'re using Session Pooler (not Direct connection)');
    console.error('3. Verify the connection string format');
    client.end();
    process.exit(1);
  });


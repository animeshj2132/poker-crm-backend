require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

async function createMasterAdmin() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const email = 'master_admin@poker.com';
    const password = 'Master@123!';
    const displayName = 'Master Admin';

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, email FROM users_v1 WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists. Updating to master admin...');
      
      // Hash the password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update user to be master admin
      await client.query(
        `UPDATE users_v1 
         SET password_hash = $1, 
             is_master_admin = true, 
             must_reset_password = false,
             display_name = $2,
             updated_at = now()
         WHERE email = $3`,
        [passwordHash, displayName, email]
      );

      console.log('✅ Master Admin updated successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Display Name: ${displayName}`);
    } else {
      // Hash the password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create new master admin user
      const result = await client.query(
        `INSERT INTO users_v1 (email, display_name, password_hash, is_master_admin, must_reset_password, created_at, updated_at)
         VALUES ($1, $2, $3, true, false, now(), now())
         RETURNING id, email, display_name, is_master_admin`,
        [email, displayName, passwordHash]
      );

      console.log('✅ Master Admin created successfully!');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Display Name: ${displayName}`);
      console.log(`   Is Master Admin: ${result.rows[0].is_master_admin}`);
    }

  } catch (err) {
    console.error('❌ Error creating master admin:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createMasterAdmin();


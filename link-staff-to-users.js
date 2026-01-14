const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.mvxqemhzciocszdjcmqs:new-poker-password@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function linkStaffToUsers() {
  const client = new Client({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Link staff entries to user accounts based on email
    console.log('Linking staff entries to user accounts...\n');
    
    const result = await client.query(`
      UPDATE staff s
      SET user_id = u.id
      FROM users_v1 u
      WHERE LOWER(s.email) = LOWER(u.email)
        AND s.user_id IS NULL
      RETURNING s.id, s.name, s.email, s.user_id
    `);

    console.log(`✅ Updated ${result.rowCount} staff entries:\n`);
    console.table(result.rows);

    // Verify the HR staff entry is now linked
    console.log('\nVerifying HR staff entry:');
    const hrResult = await client.query(`
      SELECT s.id, s.name, s.email, s.user_id, u.id as user_account_id, u.display_name
      FROM staff s
      LEFT JOIN users_v1 u ON s.user_id = u.id
      WHERE s.email = 'hr@hr.com'
    `);
    console.table(hrResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

linkStaffToUsers();

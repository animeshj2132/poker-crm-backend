const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.mvxqemhzciocszdjcmqs:new-poker-password@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function checkHRUser() {
  const client = new Client({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Find HR user account
    console.log('HR USER ACCOUNT:');
    const hrUserResult = await client.query(`
      SELECT id, email, display_name FROM users_v1 WHERE email = 'hr@hr.com'
    `);
    console.table(hrUserResult.rows);

    // Find HR staff entry
    console.log('\nHR STAFF ENTRY:');
    const hrStaffResult = await client.query(`
      SELECT id, name, email, user_id, club_id FROM staff WHERE email = 'hr@hr.com'
    `);
    console.table(hrStaffResult.rows);

    // Find testing/Super Admin user
    console.log('\nSUPER ADMIN (testing) USER:');
    const superAdminResult = await client.query(`
      SELECT id, email, display_name, is_master_admin FROM users_v1 WHERE email = 'testing@testin.com'
    `);
    console.table(superAdminResult.rows);

    // Find testing staff entry
    console.log('\nSUPER ADMIN STAFF ENTRY:');
    const testingStaffResult = await client.query(`
      SELECT id, name, email, user_id, club_id FROM staff WHERE email = 'testing@testin.com'
    `);
    console.table(testingStaffResult.rows);

    // Check the specific chat session with full details
    console.log('\nCHAT SESSION FULL DETAILS:');
    const sessionResult = await client.query(`
      SELECT 
        cs.*,
        si.name as init_name,
        si.email as init_email,
        si.user_id as init_user_id,
        sr.name as recip_name,
        sr.email as recip_email,
        sr.user_id as recip_user_id
      FROM chat_sessions cs
      LEFT JOIN staff si ON cs.staff_initiator_id = si.id
      LEFT JOIN staff sr ON cs.staff_recipient_id = sr.id
      WHERE cs.id = '8b616e70-90b7-4965-9e82-8fe21c7938a0'
    `);
    console.table(sessionResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkHRUser();

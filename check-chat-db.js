const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.mvxqemhzciocszdjcmqs:new-poker-password@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function checkChatDatabase() {
  const client = new Client({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check users table
    console.log('='.repeat(80));
    console.log('USERS TABLE');
    console.log('='.repeat(80));
    const usersResult = await client.query(`
      SELECT id, email, display_name, is_master_admin 
      FROM users_v1 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(usersResult.rows);

    // Check staff table structure and data
    console.log('\n' + '='.repeat(80));
    console.log('STAFF TABLE');
    console.log('='.repeat(80));
    const staffResult = await client.query(`
      SELECT id, name, email, role, status, user_id, club_id
      FROM staff 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(staffResult.rows);

    // Check chat sessions
    console.log('\n' + '='.repeat(80));
    console.log('CHAT SESSIONS');
    console.log('='.repeat(80));
    const sessionsResult = await client.query(`
      SELECT 
        cs.id,
        cs.session_type,
        cs.staff_initiator_id,
        si.name as initiator_name,
        si.email as initiator_email,
        si.user_id as initiator_user_id,
        cs.staff_recipient_id,
        sr.name as recipient_name,
        sr.email as recipient_email,
        sr.user_id as recipient_user_id,
        cs.created_at
      FROM chat_sessions cs
      LEFT JOIN staff si ON cs.staff_initiator_id = si.id
      LEFT JOIN staff sr ON cs.staff_recipient_id = sr.id
      WHERE cs.session_type = 'staff'
      ORDER BY cs.created_at DESC
      LIMIT 5
    `);
    console.table(sessionsResult.rows);

    // Check user_club_roles
    console.log('\n' + '='.repeat(80));
    console.log('USER CLUB ROLES');
    console.log('='.repeat(80));
    const rolesResult = await client.query(`
      SELECT 
        ucr.user_id,
        u.email,
        u.display_name,
        ucr.role,
        ucr.club_id
      FROM user_club_roles ucr
      JOIN users_v1 u ON ucr.user_id = u.id
      ORDER BY ucr.created_at DESC
      LIMIT 10
    `);
    console.table(rolesResult.rows);

    // Find staff by user email
    console.log('\n' + '='.repeat(80));
    console.log('STAFF-USER EMAIL MATCHES');
    console.log('='.repeat(80));
    const matchResult = await client.query(`
      SELECT 
        s.id as staff_id,
        s.name as staff_name,
        s.email as staff_email,
        s.user_id as staff_user_id,
        u.id as user_id,
        u.email as user_email,
        u.display_name
      FROM staff s
      LEFT JOIN users_v1 u ON s.email = u.email
      WHERE u.id IS NOT NULL
      ORDER BY s.created_at DESC
      LIMIT 10
    `);
    console.table(matchResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkChatDatabase();
